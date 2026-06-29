/**
 * 徒步薯 - 核心云函数 getAdvice（P5 咽喉切片）
 *
 * 流程（分步加载 P5.3）：
 *   mode='base': resolveLocation → Promise.all([fetchWeather, calcSunEvents]) → 返回（~3-5s）
 *   mode='advice': 接收 base 数据 → callGLM → schema 校验 → 降级（~30-40s，独立超时窗口）
 *   无 mode（兼容）: 全链路一次跑完
 *
 * 关键设计：
 * - Promise.all 并行天气+天文（省2-5s）
 * - JSON schema 校验（核心字段缺失→降级，非核心→默认值填充）
 * - 降级不隐藏（degraded:true + 风险栏空）
 * - 分步加载（base 秒回天气，advice 独立跑 GLM，规避 SDK 20s 硬超时）
 */

const https = require('https')
const { resolveLocation, gcj02ToWgs84 } = require('./geocode')
const { fetchWeather } = require('./weather')
const { calcSunEvents } = require('./sun-events')
const { getGearRules } = require('./gear-rules')
const { buildMessages, buildDegradedResponse } = require('./prompt')

// GLM API 配置
const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const GLM_MODEL = 'glm-4.7'
// GLM-4.7 带 response_format 实测延迟 27-44s，需留足超时余量
// 云函数总超时 60s，geo+weather 约 5s，故 GLM 单次超时设 50s
const GLM_TIMEOUT = 50000 // 单次 GLM 调用超时

/**
 * HTTPS POST 封装（调 GLM）
 */
function httpsPost(url, body, headers, timeout) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const u = new URL(url)
    const req = https.request({
      method: 'POST',
      hostname: u.hostname,
      path: u.pathname,
      headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      timeout,
    }, (res) => {
      let d = ''
      res.on('data', (chunk) => { d += chunk })
      res.on('end', () => resolve({ status: res.statusCode, data: d }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('GLM 请求超时')) })
    req.write(data)
    req.end()
  })
}

/**
 * 调用 GLM-4-Flash 生成建议
 */
async function callGLM(messages) {
  const GLM_KEY = process.env.GLM_KEY
  if (!GLM_KEY) throw new Error('GLM_KEY 未配置')

  const body = {
    model: GLM_MODEL,
    messages,
    temperature: 0.3,
  }

  // P0-pre 调研结论：如果 Flash 支持 response_format 则启用
  // 预备性启用，实测后如不支持则移除
  body.response_format = { type: 'json_object' }

  const res = await httpsPost(
    GLM_API_URL,
    body,
    { 'Authorization': `Bearer ${GLM_KEY}` },
    GLM_TIMEOUT,
  )

  if (res.status !== 200) {
    // 如果 response_format 不被支持，去掉重试一次
    if (res.data.includes('response_format') || res.status === 400) {
      const retryBody = { ...body }
      delete retryBody.response_format
      const retryRes = await httpsPost(
        GLM_API_URL,
        retryBody,
        { 'Authorization': `Bearer ${GLM_KEY}` },
        GLM_TIMEOUT,
      )
      if (retryRes.status !== 200) {
        throw new Error('GLM 返回 ' + retryRes.status + ': ' + retryRes.data.substring(0, 200))
      }
      return parseGLMContent(retryRes.data)
    }
    throw new Error('GLM 返回 ' + res.status + ': ' + res.data.substring(0, 200))
  }

  return parseGLMContent(res.data)
}

/**
 * 解析 GLM 返回内容（提取 JSON）
 */
function parseGLMContent(rawData) {
  const parsed = JSON.parse(rawData)
  const content = parsed.choices[0].message.content

  // 尝试直接解析
  try {
    return JSON.parse(content)
  } catch (e) {
    // 尝试从 markdown code block 提取
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      return JSON.parse(match[1])
    }
    throw new Error('GLM 返回非 JSON: ' + content.substring(0, 100))
  }
}

/**
 * JSON Schema 校验（分层：核心字段缺失→降级，非核心→默认值）
 */
function validateAndFill(advice) {
  const errors = []

  // 核心字段校验（缺失或类型错 → 触发降级）
  if (!advice.weatherWindow) errors.push('weatherWindow 缺失')
  if (!advice.gear) {
    errors.push('gear 缺失')
  } else {
    if (!Array.isArray(advice.gear.essential)) errors.push('gear.essential 非数组')
    if (!Array.isArray(advice.gear.recommended)) errors.push('gear.recommended 非数组')
    if (!Array.isArray(advice.gear.optional)) errors.push('gear.optional 非数组')
  }
  if (!Array.isArray(advice.risks)) errors.push('risks 非数组')

  // 非核心字段（缺失 → 默认值填充，不降级）
  if (!advice.notes) advice.notes = ['无额外注意事项']
  if (!advice.photoTiming) advice.photoTiming = { sunrise: null, sunset: null, goldenHour: null, blueHour: null }
  if (!advice.microclimate) advice.microclimate = null
  if (!advice.disclaimer) {
    advice.disclaimer = '本建议由 AI 生成，仅供参考；天气数据来自 Open-Meteo；出行前请核实官方气象与路线信息；户外活动有风险，责任自负。'
  }

  return { valid: errors.length === 0, errors, advice }
}

/**
 * 云函数主入口
 */
exports.main = async (event, context) => {
  const startTime = Date.now()
  const { route, date, level, days, mode } = event

  // 1. 输入校验
  if (!route || !date || !level) {
    return { ok: false, error: 'missing_params', message: '缺少必要参数（route/date/level）' }
  }
  const tripDays = days || 1

  // ========== 分步加载：mode='advice' 时跳过 geo/weather，直接用前端传来的数据跑 GLM ==========
  if (mode === 'advice') {
    return await handleAdvice(event, startTime)
  }

  // 2. 地理编码（路线 → 经纬度+海拔）
  const locResult = await resolveLocation(route)
  if (!locResult.ok) {
    return { ok: false, error: 'location_failed', message: locResult.message || '未找到位置' }
  }
  const loc = locResult.data

  // 如果需要用户确认（编辑距离匹配），返回确认请求
  if (loc.needsConfirm && loc.matchType === 'editDistance') {
    return {
      ok: true,
      needsConfirm: true,
      message: `你输入的"${route}"可能是指"${loc.name}"（${loc.location}），请确认`,
      data: { name: loc.name, lat: loc.lat, lon: loc.lon, elevation: loc.elevation },
    }
  }

  // 3. 坐标转换（GCJ-02 → WGS84，用于天气和天文查询）
  const wgs84 = gcj02ToWgs84(loc.lon, loc.lat)

  // 4. 装备规则（grounding，本地计算，无网络）
  const dateObj = new Date(date + 'T12:00:00')
  const month = dateObj.getMonth() + 1
  const gearRules = getGearRules({
    month,
    elevation: loc.elevation,
    days: tripDays,
    lat: loc.lat,
  })

  // 5. 并行查询天气+天文（Promise.all）
  const [weatherResult, sunEvents] = await Promise.all([
    fetchWeather(wgs84.lat, wgs84.lng, loc.elevation, date).catch((e) => ({ ok: false, error: e.message })),
    Promise.resolve(calcSunEvents(wgs84.lat, wgs84.lng, date)),
  ])

 const weather = weatherResult.ok ? weatherResult.data : null

 // ========== 分步加载：mode='base' 时到此为止，秒回天气数据 ==========
 if (mode === 'base') {
   return {
     ok: true,
     phase: 'base',
     data: {
       route: loc.name,
       date,
       level,
       days: tripDays,
       elevation: loc.elevation,
       location: loc.location,
       coords: { lat: loc.lat, lon: loc.lon },
       weather,
       sunEvents,
       gearRules,
       meta: { elapsed: Date.now() - startTime, source: 'base' },
     },
   }
 }

 // 6. 调 GLM 生成建议
 const meta = {
    generatedAt: new Date().toISOString(),
    weatherSource: 'Open-Meteo',
    llmModel: GLM_MODEL,
    elevation: loc.elevation,
    coords: { lat: loc.lat, lon: loc.lon },
    location: loc.location,
    elapsed: 0,
  }

  let advice
  let degraded = false
  let degradedReason = ''

  try {
    const messages = buildMessages({
      route: loc.name,
      date,
      level,
      days: tripDays,
      weather,
      gearRules,
      sunEvents,
      microclimate: weather ? { humidity: null, windMs: weather.days[0] && weather.days[0].windMs, dewPointSpread: null } : null,
    })

    console.log('[getAdvice] 调用 GLM-4.7, prompt messages:', messages.length)
    advice = await callGLM(messages)
    console.log('[getAdvice] GLM 返回成功, keys:', Object.keys(advice).join(','))

    // Schema 校验
    const validation = validateAndFill(advice)
    if (!validation.valid) {
      console.warn('[getAdvice] Schema 校验失败:', validation.errors.join(', '))
      console.warn('[getAdvice] GLM 原始返回:', JSON.stringify(advice).substring(0, 500))
      degraded = true
      degradedReason = 'Schema校验失败: ' + validation.errors.join(', ')
    }
    advice = validation.advice
  } catch (e) {
    console.error('[getAdvice] GLM 调用失败:', e.message)
    degraded = true
    degradedReason = 'GLM调用异常: ' + e.message
  }

  // 7. 降级处理
  if (degraded) {
    const degradedResponse = buildDegradedResponse(weather, sunEvents, meta)
    degradedResponse.data.meta.elapsed = Date.now() - startTime
    degradedResponse.data.meta.degradedReason = degradedReason
    // 在 notes 里也加入失败原因，让用户在真机上能看到
    degradedResponse.data.notes = ['AI 生成失败：' + degradedReason, '请查阅专业路书或咨询有经验的驴友']
    return degradedResponse
  }

  // 8. 正常返回
  // photoTiming 用 suncalc 确定性计算覆盖 LLM 复述（时刻更准，且保证含 terrainCaveat）
  if (sunEvents) {
    advice.photoTiming = Object.assign({}, advice.photoTiming, sunEvents)
  }
  meta.elapsed = Date.now() - startTime

  return {
    ok: true,
    degraded: false,
    data: {
      ...advice,
      meta,
    },
  }
}

/**
 * 分步加载第二阶段：接收 base 数据，只跑 GLM
 * 前端调 getAdvice({mode:'advice', baseData, route, date, level, days})
 */
async function handleAdvice(event, startTime) {
  const { route, date, level, days, baseData } = event
  const tripDays = days || 1

  // 从 baseData 恢复上下文（避免重复查 geo/weather）
  const weather = baseData && baseData.weather ? baseData.weather : null
  const sunEvents = baseData && baseData.sunEvents ? baseData.sunEvents : null
  const gearRules = baseData && baseData.gearRules ? baseData.gearRules : null
  const elevation = baseData && baseData.elevation ? baseData.elevation : null
  const locationName = baseData && baseData.route ? baseData.route : route

  const meta = {
    generatedAt: new Date().toISOString(),
    weatherSource: 'Open-Meteo',
    llmModel: GLM_MODEL,
    elevation,
    coords: baseData && baseData.coords ? baseData.coords : null,
    location: baseData && baseData.location ? baseData.location : locationName,
    elapsed: 0,
  }

  let advice
  let degraded = false
  let degradedReason = ''

  try {
    const messages = buildMessages({
      route: locationName,
      date,
      level,
      days: tripDays,
      weather,
      gearRules,
      sunEvents,
      microclimate: weather ? { humidity: null, windMs: weather.days && weather.days[0] && weather.days[0].windMs, dewPointSpread: null } : null,
    })

    console.log('[getAdvice:advice] 调用 GLM-4.7')
    advice = await callGLM(messages)
    console.log('[getAdvice:advice] GLM 返回成功, keys:', Object.keys(advice).join(','))

    const validation = validateAndFill(advice)
    if (!validation.valid) {
      console.warn('[getAdvice:advice] Schema 校验失败:', validation.errors.join(', '))
      degraded = true
      degradedReason = 'Schema校验失败: ' + validation.errors.join(', ')
    }
    advice = validation.advice
  } catch (e) {
    console.error('[getAdvice:advice] GLM 调用失败:', e.message)
    degraded = true
    degradedReason = 'GLM调用异常: ' + e.message
  }

  if (degraded) {
    const degradedResponse = buildDegradedResponse(weather, sunEvents, meta)
    degradedResponse.data.meta.elapsed = Date.now() - startTime
    degradedResponse.data.meta.degradedReason = degradedReason
    degradedResponse.data.notes = ['AI 生成失败：' + degradedReason, '请查阅专业路书或咨询有经验的驴友']
    return degradedResponse
  }

  // photoTiming 用 suncalc 确定性计算覆盖 LLM 复述
  if (sunEvents) {
    advice.photoTiming = Object.assign({}, advice.photoTiming, sunEvents)
  }
  meta.elapsed = Date.now() - startTime

  return {
    ok: true,
    phase: 'advice',
    degraded: false,
    data: {
      ...advice,
      weather,   // 回传天气（前端需要合并）
      sunEvents,
      meta,
    },
  }
}
