/**
 * 徒步薯 - 核心云函数 getAdvice（P5 咽喉切片）
 *
 * 流程（分步加载 P5.3）：
 *   mode='base': resolveLocation → Promise.all([fetchWeather, calcSunEvents]) → 返回（~3-5s）
 *   mode='advice': 接收 base 数据 → callLLM → schema 校验 → 降级（~30-40s，独立超时窗口）
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

// LLM API 配置（DeepSeek，OpenAI 兼容格式）
// 切换原因：智谱 GLM 对微信云函数 IP 服务端限流（DNS/TCP/TLS 正常但服务端挂着不响应）
// DeepSeek 国内服务器 + OpenAI 兼容格式，response_format 支持 JSON 输出
const LLM_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const LLM_MODEL = 'deepseek-chat'
const LLM_TIMEOUT = 20000  // DeepSeek 响应较快，给 20s（云函数总超时 60s，留足余量）

/**
 * HTTPS POST 封装（调 GLM）
 */
function httpsPost(url, body, headers, timeout) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const u = new URL(url)
    const t0 = Date.now()
    const req = https.request({
      method: 'POST',
      hostname: u.hostname,
      path: u.pathname,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'TrekkingPotato/1.0',
        'Accept': 'application/json',
      },
      timeout,
    }, (res) => {
      let d = ''
      res.on('data', (chunk) => { d += chunk })
      res.on('end', () => resolve({ status: res.statusCode, data: d }))
    })
    // socket 连接建立时记录（区分 DNS/连接阶段卡住 vs 服务端不响应）
    req.on('socket', (socket) => {
      socket.on('connect', () => {
        console.log('[GLM] TCP连接建立 ' + (Date.now() - t0) + 'ms')
      })
      socket.on('secureConnect', () => {
        console.log('[GLM] TLS握手完成 ' + (Date.now() - t0) + 'ms')
      })
      socket.on('lookup', (err, address) => {
        console.log('[GLM] DNS解析 ' + (err ? '失败:' + err.message : address) + ' ' + (Date.now() - t0) + 'ms')
      })
    })
    req.on('error', (e) => reject(new Error('GLM网络错误: ' + e.message)))
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('GLM 请求超时(' + timeout + 'ms, 已连接:' + (req.socket && req.socket.connecting === false ? '是' : '否') + ')'))
    })
    req.write(data)
    req.end()
  })
}

/**
 * 调用 DeepSeek 生成建议
 */
async function callLLM(messages) {
  const LLM_KEY = process.env.LLM_KEY
  if (!LLM_KEY) throw new Error('LLM_KEY 未配置（请在云函数环境变量配置 LLM_KEY）')

  const body = {
    model: LLM_MODEL,
    messages,
    temperature: 0.3,
  }

  body.response_format = { type: 'json_object' }

  const res = await httpsPost(
    LLM_API_URL,
    body,
    { 'Authorization': `Bearer ${LLM_KEY}` },
    LLM_TIMEOUT,
  )

  if (res.status !== 200) {
    throw new Error('DeepSeek 返回 ' + res.status + ': ' + res.data.substring(0, 150))
  }

  return parseLLMContent(res.data)
}

/**
 * 解析 DeepSeek 返回内容（提取 JSON）
 */
function parseLLMContent(rawData) {
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
    throw new Error('DeepSeek 返回非 JSON: ' + content.substring(0, 100))
  }
}

/**
 * JSON Schema 校验（分层：核心字段缺失→降级，非核心→默认值）
 */
function validateAndFill(advice) {
  const errors = []

  // 核心字段校验（缺失或类型错 → 触发降级）
  // weatherWindow 由后端注入（GLM 不再生成），不校验
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
 * 规则兜底：双模型都失败时，用本地 gearRules 构建确定性建议（不依赖 LLM）
 * 保证用户至少看到基于海拔/季节的装备和风险清单，而非空降级
 */
function buildRuleBasedAdvice(gearRules, weather) {
  // 把 gearRules.essential/recommended/optional 转成 advice 格式
  // gearRules 的 item 已含 reason，直接用
  const risks = []
  if (gearRules.fatalRisks && gearRules.fatalRisks.length > 0) {
    for (const riskName of gearRules.fatalRisks) {
      risks.push({ risk: riskName + '风险', level: '致命', advice: '本风险由海拔/季节规则判定，请查阅专业路书获取具体应对措施' })
    }
  }
  return {
    gear: {
      essential: gearRules.essential || [],
      recommended: gearRules.recommended || [],
      optional: gearRules.optional || [],
    },
    risks: risks,
    notes: ['本建议由本地规则引擎生成（AI 双模型均不可用），仅含基于海拔/季节的通用装备与风险。请结合实际路况判断。'],
    microclimate: { humidity: null, windMs: weather && weather.days && weather.days[0] ? weather.days[0].windMs : null, dewPointSpread: null },
    disclaimer: 'AI 模型暂时不可用，以下为基于海拔和季节的确定性规则建议。装备清单完整，风险提示基于规则。出行前请核实官方信息。户外有风险，责任自负。',
    degraded: true,  // 标记降级（前端显示横幅），但内容不为空
    degradedReason: 'AI 双模型超时，使用本地规则兜底',
  }
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
    llmModel: LLM_MODEL,
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

    console.log('[getAdvice] 调用 DeepSeek, prompt messages:', messages.length)
    advice = await callLLM(messages)
    meta.llmModel = LLM_MODEL
    console.log('[getAdvice] DeepSeek 返回成功, keys:', Object.keys(advice).join(','))

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
    console.error('[getAdvice] DeepSeek 调用失败:', e.message)
    degraded = true
    degradedReason = 'GLM调用异常: ' + e.message
  }

  // 7. 降级处理
  if (degraded) {
    // 双模型都失败时，用本地规则兜底（装备/风险非空，比空降级更有用）
    const ruleAdvice = buildRuleBasedAdvice(gearRules, weather)
    const degradedResponse = buildDegradedResponse(weather, sunEvents, meta)
    degradedResponse.data.gear = ruleAdvice.gear
    degradedResponse.data.risks = ruleAdvice.risks
    degradedResponse.data.notes = ruleAdvice.notes
    degradedResponse.data.degradedReason = ruleAdvice.degradedReason
    degradedResponse.data.meta.elapsed = Date.now() - startTime
    degradedResponse.data.meta.degradedReason = degradedReason
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
    llmModel: LLM_MODEL,
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

    console.log('[getAdvice:advice] 调用 DeepSeek')
    advice = await callLLM(messages)
    meta.llmModel = LLM_MODEL
    console.log('[getAdvice:advice] DeepSeek 返回成功, keys:', Object.keys(advice).join(','))

    const validation = validateAndFill(advice)
    if (!validation.valid) {
      console.warn('[getAdvice:advice] Schema 校验失败:', validation.errors.join(', '))
      degraded = true
      degradedReason = 'Schema校验失败: ' + validation.errors.join(', ')
    }
    advice = validation.advice
  } catch (e) {
    console.error('[getAdvice:advice] DeepSeek 调用失败:', e.message)
    degraded = true
    degradedReason = 'GLM调用异常: ' + e.message
  }

  if (degraded) {
    const ruleAdvice = buildRuleBasedAdvice(gearRules || {}, weather)
    const degradedResponse = buildDegradedResponse(weather, sunEvents, meta)
    degradedResponse.data.gear = ruleAdvice.gear
    degradedResponse.data.risks = ruleAdvice.risks
    degradedResponse.data.notes = ruleAdvice.notes
    degradedResponse.data.degradedReason = ruleAdvice.degradedReason
    degradedResponse.data.meta.elapsed = Date.now() - startTime
    degradedResponse.data.meta.degradedReason = degradedReason
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
