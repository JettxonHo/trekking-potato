/**
 * 徒步薯 getAdvice I21 public handler.
 *
 * The handler owns authentication, request validation, resolver dispatch and
 * TripContext persistence.  `trip-base.js` owns the single trusted snapshot
 * composition used by both the base response and asynchronous advice.
 */
const https = require('https')
const cloud = require('wx-server-sdk')
cloud.init(/** @type {any} */ ({ env: cloud.DYNAMIC_CURRENT_ENV }))
const { resolveLocation, fetchElevation, gcj02ToWgs84 } = require('./geocode')
const { fetchWeather, fetchRouteWeather, isValidIsoDate, parseTripDaysInput } = require('./weather')
const { getGearRules } = require('./gear-rules')
const { buildMessages } = require('./prompt')
const { createAdviceContext } = require('./advice-context')
const { projectSafetyAdvice } = require('./safety-advice')
const { isKnownRouteType } = require('./route-type')
const { createTripContextStore } = require('./trip-context')
const {
  resolveRouteQuery,
  resolveRouteCandidateId,
  resolveRouteSourceSummaries,
} = require('./domain/catalog-resolver')
const { createTripBaseBuilder } = require('./trip-base')
const {
  errorResponse,
  confirmationResponse,
  routeTypeRequiredResponse,
  baseResponse,
  adviceResponse,
} = require('./response-contract')

const LLM_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const LLM_MODEL = 'deepseek-chat'
const LLM_TIMEOUT = 20000
const LEVELS = new Set(['小白', '中级', '老手'])
const CLIMB_SUPPORTS = new Set(['solo_or_unsure', 'experienced_team', 'professional_guide'])
let nowProvider = () => new Date()

function httpsPost(url, body, headers, timeout) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const u = new URL(url)
    const req = https.request({
      method: 'POST', hostname: u.hostname, path: u.pathname,
      headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), 'User-Agent': 'TrekkingPotato/1.0', Accept: 'application/json' },
      timeout,
    }, (res) => {
      let responseData = ''
      res.on('data', (chunk) => { responseData += chunk })
      res.on('end', () => resolve({ status: res.statusCode, data: responseData }))
    })
    req.on('error', (error) => reject(new Error('LLM网络错误: ' + error.message)))
    req.on('timeout', () => { req.destroy(); reject(new Error('LLM 请求超时')) })
    req.write(data)
    req.end()
  })
}

async function callLLM(messages) {
  const key = process.env.LLM_KEY
  if (!key) throw new Error('LLM_KEY 未配置（请在云函数环境变量配置 LLM_KEY）')
  const response = await httpsPost(LLM_API_URL, {
    model: LLM_MODEL, messages, temperature: 0.3, response_format: { type: 'json_object' },
  }, { Authorization: `Bearer ${key}` }, LLM_TIMEOUT)
  if (response.status !== 200) throw new Error('DeepSeek 返回 ' + response.status)
  let parsed
  try { parsed = JSON.parse(response.data) } catch (_error) { throw new LlmParseError('LLM response envelope is not JSON') }
  const content = parsed && parsed.choices && parsed.choices[0] && parsed.choices[0].message && parsed.choices[0].message.content
  if (typeof content !== 'string') throw new LlmParseError('LLM response content is missing')
  try { return JSON.parse(content) } catch (_error) {
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (!match) throw new LlmParseError('LLM response content is not JSON')
    try { return JSON.parse(match[1]) } catch (_parseError) { throw new LlmParseError('LLM response code block is not JSON') }
  }
}

class LlmParseError extends Error {}

function mapLocationResolutionFailure(locResult) {
  if (locResult && locResult.error === 'invalid_route_type') {
    return errorResponse('invalid_route_type', locResult.message || '内置路线类型数据异常')
  }
  return errorResponse('location_failed', (locResult && locResult.message) || '位置服务暂时不可用，请重试')
}

function currentNow() {
  const value = nowProvider()
  return value instanceof Date ? new Date(value.getTime()) : new Date(value)
}

// Test-only seam. Production keeps the wall-clock provider above; contract
// tests can pin "today" without changing date validation semantics.
function setNowForTests(provider) {
  if (provider === null || provider === undefined) {
    nowProvider = () => new Date()
    return
  }
  if (typeof provider !== 'function') throw new TypeError('test clock provider must be a function')
  nowProvider = provider
}

function isTrustedResolverCandidate(candidate) {
  return candidate && typeof candidate === 'object'
    && typeof candidate.candidateId === 'string'
    && !candidate.candidateId.startsWith('builtin-route:')
    && (candidate.entityKind === 'route_variant' || candidate.entityKind === 'place')
    && (candidate.capability === 'full' || candidate.capability === 'place_only')
    && typeof candidate.canonicalName === 'string'
    && typeof candidate.region === 'string'
    && (candidate.routeType === null || isKnownRouteType(candidate.routeType))
    && (candidate.fixedDays === null || (Number.isInteger(candidate.fixedDays) && candidate.fixedDays >= 1))
}

function isLegacyBuiltinLocation(loc) {
  return !!loc && (loc.source === '内置路线表' || loc.typeSource === 'builtin')
}

function isValidStartTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function todayInShanghai(now = currentNow()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function commonInputError(event, requireRoute) {
  if (requireRoute && (typeof event.route !== 'string' || event.route.trim().length === 0)) return errorResponse('missing_params', '缺少必要参数（route）')
  if (typeof event.date !== 'string' || !isValidIsoDate(event.date) || event.date < todayInShanghai()) return errorResponse('invalid_date', '出发日期格式无效或早于今天')
  if (!isValidStartTime(event.startTimeLocal)) return errorResponse('invalid_start_time', '出发时间必须为 HH:mm')
  if (!LEVELS.has(event.level)) return errorResponse('invalid_level', '能力等级无效')
  return null
}

function hasManualField(event) {
  return ['manualLat', 'manualLon', 'manualElevation'].some((field) => Object.prototype.hasOwnProperty.call(event, field))
}

function validCoordinate(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function invalidRouteTypeInput(event) {
  const value = event.routeType
  if (value === undefined || value === null || value === '') return null
  return isKnownRouteType(value) ? null : errorResponse('invalid_route_type', '请选择有效的路线类型')
}

function manualInputError(event) {
  if (!hasManualField(event)) return null
  const hasLat = event.manualLat !== undefined && event.manualLat !== null
  const hasLon = event.manualLon !== undefined && event.manualLon !== null
  const validElevation = event.manualElevation === undefined || event.manualElevation === null || validCoordinate(event.manualElevation, -500, 9000)
  if (!hasLat || !hasLon || !validCoordinate(event.manualLat, -90, 90) || !validCoordinate(event.manualLon, -180, 180) || !validElevation) {
    return errorResponse('invalid_manual_place', '手动地点坐标或海拔无效')
  }
  // A valid manual coordinate submission without a type must enter the same
  // explicit route-type follow-up as catalog/AMap places.  A non-empty,
  // malformed type is still an input error rather than an implicit default.
  return invalidRouteTypeInput(event)
}

function inputSnapshot(event, days) {
  return {
    date: event.date,
    startTimeLocal: event.startTimeLocal,
    level: event.level,
    days,
    climbSupport: CLIMB_SUPPORTS.has(event.climbSupport) ? event.climbSupport : null,
  }
}

function targetFromResolution(resolution) {
  if (!resolution || resolution.kind !== 'direct' || !resolution.target) return null
  return { ...resolution.target, routeVariant: resolution.target.routeVariant, route: resolution.target.route, place: resolution.target.place }
}

function catalogRouteTypeRequest(target, input) {
  return { resolutionKind: 'catalog_place', candidateId: target.candidateId, name: target.canonicalName, region: target.region, input }
}

function amapRouteTypeRequest(route, loc, input) {
  return { resolutionKind: 'amap_place', route, name: loc.name, location: loc.location, input }
}

function manualRouteTypeRequest(route, event, input) {
  return {
    resolutionKind: 'manual_place', route, name: route || '手动地点', location: route || '手动地点',
    lat: event.manualLat, lon: event.manualLon, elevation: event.manualElevation === undefined ? null : event.manualElevation, input,
  }
}

function createReferenceWeather(request, options = {}) {
  const coordinate = request.coordinate
  const wgs84 = coordinate.coordinateSystem === 'GCJ-02' ? gcj02ToWgs84(coordinate.lon, coordinate.lat) : { lat: coordinate.lat, lng: coordinate.lon }
  const elevationPromise = Number.isFinite(request.elevationM) ? Promise.resolve(request.elevationM) : fetchElevation(wgs84.lat, wgs84.lng).catch(() => null)
  return elevationPromise.then((elevationM) => {
    if (!Number.isFinite(elevationM)) {
      return {
        status: 'unavailable', scope: 'reference_point', source: 'Open-Meteo',
        error: 'elevation_unavailable', retryable: true, elevationM: null,
      }
    }
    return fetchWeather(wgs84.lat, wgs84.lng, elevationM, request.date, request.days, { now: options.now instanceof Date ? options.now : new Date() })
      .then((result) => result && result.ok === true
        ? { ...result, elevationM }
        : {
            status: 'unavailable', scope: 'reference_point', source: 'Open-Meteo',
            error: result && result.error ? result.error : 'weather_unavailable',
            retryable: result ? result.retryable !== false : true, elevationM,
          })
      .catch(() => ({
        status: 'unavailable', scope: 'reference_point', source: 'Open-Meteo',
        error: 'weather_unavailable', retryable: true, elevationM,
      }))
  })
}

const tripBaseBuilder = createTripBaseBuilder({
  fetchRouteWeather: (request, options) => fetchRouteWeather(request, options),
  fetchReferenceWeather: createReferenceWeather,
  getGearRules,
  resolveRouteSourceSummaries,
  now: () => currentNow(),
})

function mapBuilderError(result) {
  if (result.code === 'missing_climb_support') return errorResponse(result.code, '技术攀登必须选择队伍支持方式')
  if (result.code === 'invalid_manual_place') return errorResponse(result.code, '手动地点坐标或海拔无效')
  if (result.code === 'invalid_route_type') return errorResponse(result.code, '请选择有效的路线类型')
  return errorResponse('internal_error', result.message || '服务暂时不可用')
}

async function persistBuiltBase(openid, built) {
  const store = createTripContextStore({ collection: cloud.database().collection('trip_contexts') })
  const created = await store.create({ openid, trustedBaseData: built.trustedBaseData })
  if (created.kind !== 'created') return errorResponse('context_unavailable', '暂时无法保存本次查询，请重试')
  return baseResponse(created.snapshot, { queryId: created.queryId, expiresAt: created.expiresAt })
}

async function main(event, context) {
  const startTime = Date.now()
  const mode = event.mode
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) return errorResponse('no_auth', '无法获取用户身份')
  if (!['prepare', 'confirm', 'advice'].includes(mode)) return errorResponse('invalid_mode', '请求模式无效')
  if (mode === 'advice') return handleAdvice({ openid, queryId: event.queryId, startTime })

  const commonError = commonInputError(event, mode === 'prepare')
  if (commonError) return commonError
  if (mode === 'prepare') {
    const manualError = manualInputError(event)
    if (manualError) return manualError
  }

  let target
  if (mode === 'confirm') {
    if (event.candidateId === undefined || event.candidateId === null || event.candidateId === '') return errorResponse('missing_params', '缺少必要参数（candidateId）')
    if (typeof event.candidateId !== 'string') return errorResponse('route_not_found', '候选路线已失效，请重新搜索')
    const resolution = resolveRouteCandidateId(event.candidateId)
    if (resolution.kind === 'not_found') return errorResponse('route_not_found', '候选路线已失效，请重新搜索')
    target = targetFromResolution(resolution)
  } else if (hasManualField(event)) {
    const days = parseTripDaysInput(event.days)
    if (days === null) return errorResponse('invalid_trip_days', '行程天数必须为 1 至 7 天')
    const invalidType = invalidRouteTypeInput(event)
    if (invalidType) return invalidType
    if (!isKnownRouteType(event.routeType)) return routeTypeRequiredResponse(manualRouteTypeRequest(event.route, event, inputSnapshot(event, days)))
    target = {
      entityKind: 'place', capability: 'place_only', origin: 'manual', name: event.route.trim() || '手动地点', location: event.route.trim() || '手动地点',
      referenceCoordinate: { lat: event.manualLat, lon: event.manualLon, coordinateSystem: 'GCJ-02' },
      referenceElevationM: event.manualElevation === undefined ? null : event.manualElevation, sourceIds: [],
    }
  } else {
    const resolution = resolveRouteQuery(event.route.trim())
    if (resolution.kind === 'confirmation') return confirmationResponse(`请确认你要查询的路线：${event.route}`, resolution.candidates)
    if (resolution.kind === 'direct') {
      target = targetFromResolution(resolution)
    } else {
      let locResult
      try { locResult = await resolveLocation(event.route.trim()) } catch (_error) { return errorResponse('location_failed', '位置服务暂时不可用，请重试') }
      if (!locResult.ok) {
        if (locResult.error === 'not_found') return errorResponse('route_not_found', '未找到可用路线，请修改搜索词')
        return mapLocationResolutionFailure(locResult)
      }
      const loc = locResult.data
      // I13 is authoritative for route candidates.  The historical geocode
      // table may still return four-field builtin-route candidates after I13
      // says not_found; never expose those as a confirmation response.
      if (isLegacyBuiltinLocation(loc)) return errorResponse('route_not_found', '未找到可用路线，请修改搜索词')
      if (loc.needsConfirm && Array.isArray(loc.candidates)) {
        if (loc.candidates.length === 0 || !loc.candidates.every(isTrustedResolverCandidate)) {
          return errorResponse('route_not_found', '未找到可用路线，请修改搜索词')
        }
        return confirmationResponse(`请确认你要查询的路线：${event.route}`, loc.candidates)
      }
      const days = parseTripDaysInput(event.days)
      if (days === null) return errorResponse('invalid_trip_days', '行程天数必须为 1 至 7 天')
      const invalidType = invalidRouteTypeInput(event)
      if (invalidType) return invalidType
      if (!isKnownRouteType(event.routeType)) return routeTypeRequiredResponse(amapRouteTypeRequest(event.route, loc, inputSnapshot(event, days)))
      target = {
        entityKind: 'place', capability: 'place_only', origin: 'amap', name: loc.name, location: loc.location, region: loc.location,
        referenceCoordinate: { lat: loc.lat, lon: loc.lon, coordinateSystem: 'GCJ-02' }, referenceElevationM: Number.isFinite(loc.elevation) ? loc.elevation : null, sourceIds: [],
      }
    }
  }

  if (!target) return errorResponse('route_not_found', '路线已失效，请重新搜索')
  if (target.capability === 'place_only') {
    const days = parseTripDaysInput(event.days)
    if (days === null) return errorResponse('invalid_trip_days', '行程天数必须为 1 至 7 天')
    const invalidType = invalidRouteTypeInput(event)
    if (invalidType) return invalidType
    if (!isKnownRouteType(event.routeType)) {
      if (mode === 'confirm') return routeTypeRequiredResponse(catalogRouteTypeRequest(target, inputSnapshot(event, days)))
      return routeTypeRequiredResponse(catalogRouteTypeRequest(target, inputSnapshot(event, days)))
    }
    target = { ...target, origin: target.origin || 'catalog', name: target.name || target.canonicalName, location: target.location || target.region }
    const built = await tripBaseBuilder.build({ target, request: { ...event, days } })
    return built.kind === 'built' ? persistBuiltBase(openid, built) : mapBuilderError(built)
  }

  const built = await tripBaseBuilder.build({ target, request: event })
  return built.kind === 'built' ? persistBuiltBase(openid, built) : mapBuilderError(built)
}

async function handleAdvice({ openid, queryId, startTime }) {
  const store = createTripContextStore({ collection: cloud.database().collection('trip_contexts') })
  const contextResult = await store.read({ openid, queryId })
  if (contextResult.kind === 'store_unavailable') return errorResponse('context_unavailable', '暂时无法读取本次查询，请重试')
  if (contextResult.kind !== 'found') return errorResponse('query_context_unavailable', '本次查询已失效，请重新查询')
  const baseData = contextResult.snapshot
  let adviceContext
  try {
    adviceContext = createAdviceContext(baseData)
  } catch (_error) {
    return errorResponse('query_context_unavailable', '本次查询已失效，请重新查询')
  }
  const meta = { generatedAt: new Date().toISOString(), llmModel: LLM_MODEL, elapsed: 0 }
  let aiOutcome
  try {
    aiOutcome = { status: 'available', value: await callLLM(buildMessages(adviceContext)) }
  } catch (error) {
    console.error('[getAdvice:advice] DeepSeek 调用失败:', error && error.message)
    aiOutcome = error instanceof LlmParseError ? { status: 'invalid' } : { status: 'unavailable' }
  }
  const projection = projectSafetyAdvice({
    minimumGear: adviceContext.minimumGear,
    deterministicSafety: adviceContext.deterministicSafety,
    aiOutcome,
  })
  meta.elapsed = Date.now() - startTime
  if (projection.degraded) meta.degradedReason = projection.degradedReason
  return adviceResponse({ ...projection.data, meta }, projection.degraded)
}

exports.main = async (event, context) => {
  try { return await main(event || {}, context) } catch (error) {
    console.error('[getAdvice] 未处理错误:', error && error.message)
    return errorResponse('internal_error', '服务暂时不可用')
  }
}

exports._mapLocationResolutionFailure = mapLocationResolutionFailure
exports._setNowForTests = setNowForTests
