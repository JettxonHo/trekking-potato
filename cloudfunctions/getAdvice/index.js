/**
 * 徒步薯 - 核心云函数 getAdvice（P5 咽喉切片）
 *
 * 流程（分步加载 P5.3）：
 *   mode='prepare': resolveLocation → Promise.all([fetchWeather, calcSunEvents]) → base phase（~3-5s）
 *   mode='advice': 按 openid + queryId 恢复 TripContext 可信快照 → callLLM → schema 校验 → 降级（~30-40s，独立超时窗口）
 *   mode='base': prepare 的迁移别名；缺失或未知 mode 返回 invalid_mode
 *
 * 关键设计：
 * - Promise.all 并行天气+天文（省2-5s）
 * - AI 输出经 I06 纯投影白名单化，不能覆盖确定性装备或风险
 * - 降级不隐藏（degraded:true + 完整确定性装备和风险）
 * - 分步加载（base 秒回天气，advice 独立跑 GLM，规避 SDK 20s 硬超时）
 */

const https = require('https')
const cloud = require('wx-server-sdk')
cloud.init(/** @type {any} */ ({ env: cloud.DYNAMIC_CURRENT_ENV }))
const { resolveLocation, gcj02ToWgs84 } = require('./geocode')
const { fetchElevation } = require('./geocode')
const { findBuiltinRouteByCandidateId } = require('./data/routes')
const { fetchWeather, isValidIsoDate, parseTripDaysInput } = require('./weather')
const { calcSunEvents } = require('./sun-events')
const { getGearRules } = require('./gear-rules')
const { buildMessages } = require('./prompt')
const { projectSafetyAdvice } = require('./safety-advice')
const { isKnownRouteType } = require('./route-type')
const { createTripContextStore } = require('./trip-context')
const {
  errorResponse,
  confirmationResponse,
  routeTypeRequiredResponse,
  baseResponse,
  adviceResponse,
} = require('./response-contract')

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
    req.on('error', (e) => reject(new Error('LLM网络错误: ' + e.message)))
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('LLM 请求超时'))
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

class LlmParseError extends Error {}

/**
 * 解析 DeepSeek 返回内容（提取 JSON）。请求已成功收到但 envelope/content 不可解析时，
 * 以私有错误类型交给 advice 编排标记为 ai_output_invalid。
 */
function parseLLMContent(rawData) {
  let parsed
  try {
    parsed = JSON.parse(rawData)
  } catch (error) {
    throw new LlmParseError('LLM response envelope is not JSON')
  }

  const content = parsed
    && Array.isArray(parsed.choices)
    && parsed.choices[0]
    && parsed.choices[0].message
    && parsed.choices[0].message.content
  if (typeof content !== 'string') throw new LlmParseError('LLM response content is missing')

  // 尝试直接解析
  try {
    return JSON.parse(content)
  } catch (e) {
    // 尝试从 markdown code block 提取
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      try {
        return JSON.parse(match[1])
      } catch (parseError) {
        throw new LlmParseError('LLM response code block is not JSON')
      }
    }
    throw new LlmParseError('LLM response content is not JSON')
  }
}

/**
 * TP-P0-003 REVIEW_FIX：区分地理解析失败中的内置数据完整性错误。
 * invalid_route_type（内置路线类型数据异常）必须原样传播，
 * 不得改写为 location_failed，也不得携带 needsRouteType 进入手动坐标兜底；
 * not_found / amap_failed 等既有解析失败仍映射为 location_failed。
 */
function mapLocationResolutionFailure(locResult) {
  if (locResult && locResult.error === 'invalid_route_type') {
    return errorResponse('invalid_route_type', locResult.message || '内置路线类型数据异常')
  }

  return errorResponse('location_failed', (locResult && locResult.message) || '未找到位置')
}

/**
* 云函数主入口
 */
async function main(event, context) {
  const startTime = Date.now()
  const { mode } = event

  // 鉴权：所有调用都必须携带合法 openid
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) {
    return errorResponse('no_auth', '无法获取用户身份')
  }

  // I04：生产首请求固定为 prepare；base 仅作为兼容别名，缺失或未知 mode 不再回退全链路。
  if (mode !== 'prepare' && mode !== 'base' && mode !== 'confirm' && mode !== 'advice') {
    return errorResponse('invalid_mode', '请求模式无效')
  }

  // I18：advice 仅使用当前身份绑定的 queryId；不得读取客户端旧路线或 BaseData 字段。
  if (mode === 'advice') {
    return await handleAdvice({
      openid,
      queryId: event.queryId,
      startTime,
    })
  }

  let route = event.route
  const { date, level, days, candidateId } = event

  // I05a：confirm 只以 candidateId 恢复内置路线；客户端附带的路线、坐标、类型和
  // baseData 不参与解析。候选已失效时在天气、规则和 AI 前结束。
  if (mode === 'confirm') {
    if (!candidateId || !date || !level) {
      return errorResponse('missing_params', '缺少必要参数（candidateId/date/level）')
    }
    const confirmedRoute = findBuiltinRouteByCandidateId(candidateId)
    if (!confirmedRoute) {
      return errorResponse('candidate_not_found', '候选路线已失效，请重新查询')
    }
    route = confirmedRoute.name
  } else if (!route || !date || !level) {
    return errorResponse('missing_params', '缺少必要参数（route/date/level）')
  }

  // TP-P0-002：tripDays 严格归一化——未提供默认 1；提供时只接受数字 1–7 整数或单字符 "1"–"7"，
  // 拒绝布尔、数组、对象及带空格/前导零/小数/指数/符号等字符串；不对任意类型做 Number() 强制转换
  const tripDays = parseTripDaysInput(days)
  if (tripDays === null) {
    return errorResponse('invalid_trip_days', '行程天数必须为 1 至 7 天')
  }

  // TP-P0-002：在地理编码和天气请求前验证出发日期格式（复用 weather.js 的校验函数）
  if (!isValidIsoDate(date)) {
    return errorResponse('invalid_date', '出发日期格式无效')
  }

  // 2. 地理编码：手动坐标优先，否则走 resolveLocation
  let loc
  if (mode !== 'confirm' && event.manualLat && event.manualLon) {
    // TP-P0-003：手动坐标必须由用户明确选择路线类型，不得硬编码 trek
    if (!isKnownRouteType(event.routeType)) {
      return errorResponse('invalid_route_type', '请选择有效的路线类型')
    }
    // 用户手动输入坐标兜底（搜不到路线名时）
    let elev = event.manualElevation
    // 海拔没填的话查 Open-Meteo elevation API
    if (!elev || elev <= 0) {
      try {
        elev = await fetchElevation(parseFloat(event.manualLat), parseFloat(event.manualLon))
      } catch (e) { elev = null }
    }
    loc = {
      name: route,
      lat: parseFloat(event.manualLat),
      lon: parseFloat(event.manualLon),
      elevation: elev != null ? Math.round(elev) : null,
      location: route,
      type: event.routeType,
      typeSource: 'user',
    }
  } else {
    const locResult = await resolveLocation(route)
    if (!locResult.ok) {
      // TP-P0-003 REVIEW_FIX：内置类型数据异常保持 invalid_route_type，不被改写为 location_failed
      return mapLocationResolutionFailure(locResult)
    }
    loc = locResult.data
  }

  // I05a：模糊、前缀和歧义 alias 只返回服务器内置候选，不暴露坐标等路线事实。
  if (loc.needsConfirm && Array.isArray(loc.candidates)) {
    return confirmationResponse(
      `请确认你要查询的路线：${route}`,
      loc.candidates,
    )
  }

  // TP-P0-003：类型未知（外部地理编码/旧 UGC 记录）不得进入规则层，
  // 必须返回明确状态要求用户选择路线类型；不得默认成 trek 继续查询
  if (!isKnownRouteType(loc.type)) {
    return routeTypeRequiredResponse({
      name: loc.name,
      lat: loc.lat,
      lon: loc.lon,
      elevation: loc.elevation,
      location: loc.location,
    })
  }

  // 3. 坐标转换（GCJ-02 → WGS84，用于天气和天文查询）
  const wgs84 = gcj02ToWgs84(loc.lon, loc.lat)

  // 4. 装备规则（grounding，本地计算，无网络）
  // TP-P0-003：只传可信类型 loc.type，删除 `loc.type || 'trek'` 静默默认
  const dateObj = new Date(date + 'T12:00:00')
  const month = dateObj.getMonth() + 1
  let gearRules
  try {
    gearRules = getGearRules({
      month,
      elevation: loc.elevation,
      days: tripDays,
      lat: loc.lat,
      routeType: loc.type,
    })
  } catch (e) {
    if (e && e.code === 'invalid_route_type') {
      return errorResponse('invalid_route_type', '路线类型无效，请重新选择')
    }
    throw e
  }

  // 5. 并行查询天气+天文（Promise.all）
  const [weatherResult, sunEvents] = await Promise.all([
    fetchWeather(wgs84.lat, wgs84.lng, loc.elevation, date, tripDays).catch((e) => ({ ok: false, error: e.message })),
    Promise.resolve(calcSunEvents(wgs84.lat, wgs84.lng, date)),
  ])

  // TP-P0-002：确定性契约错误必须原样传播，不得降级为 weather = null 后继续生成建议；
  // 可附带请求窗口，但不暴露 Open-Meteo 原始 reason。网络超时等非契约错误保持既有降级行为。
  const DETERMINISTIC_WEATHER_ERRORS = ['invalid_date', 'invalid_trip_days', 'out_of_range', 'weather_data_invalid']
  if (!weatherResult.ok && DETERMINISTIC_WEATHER_ERRORS.includes(weatherResult.error)) {
    const weatherErrorFields = {}
    if (weatherResult.requestedStartDate) weatherErrorFields.requestedStartDate = weatherResult.requestedStartDate
    if (weatherResult.requestedEndDate) weatherErrorFields.requestedEndDate = weatherResult.requestedEndDate
    return errorResponse(weatherResult.error, weatherResult.message, weatherErrorFields)
  }

  const weather = weatherResult.ok ? weatherResult.data : null

  const legacyBaseData = {
    route: loc.name,
    date,
    level,
    days: tripDays,
    elevation: loc.elevation,
    location: loc.location,
    coords: { lat: loc.lat, lon: loc.lon },
    // TP-P0-003：base response 显式携带可信路线类型与来源，
    // 不能只依赖 gearRules.routeType
    routeType: loc.type,
    routeTypeSource: loc.typeSource,
    weather,
    sunEvents,
    gearRules,
    meta: { elapsed: Date.now() - startTime, source: 'base' },
  }

  // 此时只可能是 prepare、兼容别名 base 或有效 confirm；所有既有服务端事实完成后才写入。
  const tripContextStore = createTripContextStore({
    collection: cloud.database().collection('trip_contexts'),
  })
  const created = await tripContextStore.create({ openid, legacyBaseData })
  if (created.kind !== 'created') {
    return errorResponse('context_unavailable', '暂时无法保存本次查询，请重试')
  }

  return baseResponse(created.snapshot, {
    queryId: created.queryId,
    expiresAt: created.expiresAt,
  })
}

/**
 * 分步加载第二阶段：只由当前 openid 的 queryId 恢复服务端可信快照。
 */
async function handleAdvice({ openid, queryId, startTime }) {
  const tripContextStore = createTripContextStore({
    collection: cloud.database().collection('trip_contexts'),
  })
  const contextResult = await tripContextStore.read({ openid, queryId })
  if (contextResult.kind === 'store_unavailable') {
    return errorResponse('context_unavailable', '暂时无法读取本次查询，请重试')
  }
  if (contextResult.kind !== 'found') {
    return errorResponse('query_context_unavailable', '本次查询已失效，请重新查询')
  }

  const baseData = contextResult.snapshot
  const { weather, sunEvents, gearRules } = baseData
  const elevation = baseData.elevation || null
  const locationName = baseData.route

  const meta = {
    generatedAt: new Date().toISOString(),
    weatherSource: 'Open-Meteo',
    llmModel: LLM_MODEL,
    elevation,
    coords: baseData && baseData.coords ? baseData.coords : null,
    location: baseData && baseData.location ? baseData.location : locationName,
    elapsed: 0,
  }

  let aiOutcome

  try {
    const messages = buildMessages(baseData)

    console.log('[getAdvice:advice] 调用 DeepSeek')
    aiOutcome = { status: 'available', value: await callLLM(messages) }
    console.log('[getAdvice:advice] DeepSeek 返回成功')
  } catch (e) {
    console.error('[getAdvice:advice] DeepSeek 调用失败:', e.message)
    aiOutcome = e instanceof LlmParseError ? { status: 'invalid' } : { status: 'unavailable' }
  }

  const projection = projectSafetyAdvice({ gearRules, weather, sunEvents, aiOutcome })
  meta.elapsed = Date.now() - startTime
  if (projection.degraded) meta.degradedReason = projection.degradedReason

  return adviceResponse({ ...projection.data, meta }, projection.degraded)
}

exports.main = async (event, context) => {
  try {
    return await main(event || {}, context)
  } catch (error) {
    console.error('[getAdvice] 未处理错误:', error && error.message)
    return errorResponse('internal_error', '服务暂时不可用')
  }
}

// 测试专用导出：地理解析失败映射纯函数（TP-P0-003 REVIEW_FIX）
exports._mapLocationResolutionFailure = mapLocationResolutionFailure
