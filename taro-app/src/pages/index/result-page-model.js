/**
 * I22b structured result-page projection.
 *
 * The page receives one immutable trusted BaseData snapshot. Advice is
 * accepted only under `result.ai`; it never becomes a source for route facts,
 * weather, deterministic verdicts, minimum gear or source cards.
 */

const ROUTE_TYPE_LABELS = Object.freeze({ trek: '徒步', climb: '攀登', tour: '游览' })

const VERDICT_LABELS = Object.freeze({
  go: { label: '建议出发', tone: 'positive' },
  caution: { label: '谨慎出发', tone: 'caution' },
  no_go: { label: '暂不建议', tone: 'no-go' },
  null: { label: '暂无法判断', tone: 'unavailable' },
})

const WMO_GROUPS = Object.freeze([
  { codes: [0], label: '晴' },
  { codes: [1, 2, 3], label: '多云' },
  { codes: [45, 48], label: '雾' },
  { codes: [51, 52, 53, 54, 55], label: '毛毛雨' },
  { codes: [56, 57], label: '冻毛毛雨' },
  { codes: [61, 62, 63, 64, 65], label: '雨' },
  { codes: [66, 67], label: '冻雨' },
  { codes: [71, 72, 73, 74, 75, 76, 77], label: '雪' },
  { codes: [80, 81, 82], label: '阵雨' },
  { codes: [85, 86], label: '阵雪' },
  { codes: [95, 96, 97, 98, 99], label: '雷暴' },
])

const DATA_ISSUE_LABELS = Object.freeze({
  out_of_range: '天气预报超出可用范围',
  weather_unavailable: '天气暂不可用',
  weather_data_invalid: '天气数据异常',
  sunset_reference_unavailable: '日落参考暂不可用',
  place_only_route: '仅提供地点参考，非完整路线',
})

const RESULT_CACHE_KEY = 'trekking_last_result_v2'
const RESULT_CACHE_VERSION = 'structured-v1'

function clone(value) {
  if (value === undefined) return undefined
  return JSON.parse(JSON.stringify(value))
}

function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function hasOwn(value, key) {
  return isRecord(value) && Object.prototype.hasOwnProperty.call(value, key)
}

function finiteOrNull(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function conditionForWeatherCode(code) {
  for (const group of WMO_GROUPS) {
    if (group.codes.includes(code)) return group.label
  }
  return '天气现象待确认'
}

function verdictCode(value) {
  return Object.prototype.hasOwnProperty.call(VERDICT_LABELS, value) ? value : null
}

function normalizeMinimumGear(value) {
  const source = isRecord(value) ? value : {}
  return {
    essential: Array.isArray(source.essential) ? clone(source.essential) : [],
    recommended: Array.isArray(source.recommended) ? clone(source.recommended) : [],
    optional: Array.isArray(source.optional) ? clone(source.optional) : [],
  }
}

function itemName(item) {
  if (typeof item === 'string') return item.trim()
  if (!isRecord(item)) return ''
  if (typeof item.item === 'string') return item.item.trim()
  if (typeof item.name === 'string') return item.name.trim()
  return ''
}

function gearNames(items) {
  return new Set((Array.isArray(items) ? items : []).map(itemName).filter(Boolean))
}

function additionsForAdvice(adviceGear, minimumGear) {
  const advice = isRecord(adviceGear) ? adviceGear : {}
  const minimumNames = new Set([
    ...gearNames(minimumGear.essential),
    ...gearNames(minimumGear.recommended),
    ...gearNames(minimumGear.optional),
  ])
  const additions = { recommended: [], optional: [] }
  const seen = new Set()
  for (const category of ['recommended', 'optional']) {
    for (const entry of Array.isArray(advice[category]) ? advice[category] : []) {
      const name = itemName(entry)
      if (!name || minimumNames.has(name) || seen.has(name)) continue
      seen.add(name)
      additions[category].push({
        ...(isRecord(entry) ? clone(entry) : { item: entry }),
        item: name,
        label: 'AI 补充（非最低要求）',
        aiOnly: true,
      })
    }
  }
  return additions
}

function dataIssueKey(issue) {
  if (!isRecord(issue)) return String(issue)
  return [issue.code, issue.day, issue.date, issue.samplePointId, issue.retryable].join('|')
}

function dataIssueLabel(issue) {
  const code = isRecord(issue) ? issue.code : null
  return DATA_ISSUE_LABELS[code] || '天气数据不足，暂无法判断'
}

function normalizeDataIssues(deterministicResult, weatherSnapshot, capability) {
  const candidates = []
  if (deterministicResult && Array.isArray(deterministicResult.dataIssues)) candidates.push(...deterministicResult.dataIssues)
  if (capability === 'full' && weatherSnapshot && Array.isArray(weatherSnapshot.insufficientReasons)) {
    candidates.push(...weatherSnapshot.insufficientReasons)
  }
  if (capability === 'full' && weatherSnapshot && weatherSnapshot.status === 'unavailable' && candidates.length === 0) {
    candidates.push({ code: weatherSnapshot.error || 'weather_unavailable', retryable: weatherSnapshot.retryable !== false })
  }
  const seen = new Set()
  return candidates.filter((issue) => {
    const key = dataIssueKey(issue)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).map((issue) => ({
    ...(isRecord(issue) ? clone(issue) : { code: 'weather_data_invalid' }),
    label: dataIssueLabel(issue),
  }))
}

function normalizeHour(hour) {
  const source = isRecord(hour) ? clone(hour) : {}
  const localTime = source.bucketStartLocal || source.localTime || source.time || null
  const endLocal = source.bucketEndLocal || source.endLocal || null
  const averageWindMs = hasOwn(source, 'windSpeedMs') ? source.windSpeedMs : source.averageWindMs
  return {
    ...source,
    localTime,
    endLocal,
    temperatureC: source.temperatureC,
    apparentTemperatureC: source.apparentTemperatureC,
    precipitationProbabilityPct: source.precipitationProbabilityPct,
    precipitationMm: source.precipitationMm,
    snowfallCm: source.snowfallCm,
    windSpeedMs: averageWindMs,
    averageWindMs,
    windGustMs: source.windGustMs,
    visibilityM: source.visibilityM,
    weatherCode: source.weatherCode,
    condition: conditionForWeatherCode(source.weatherCode),
  }
}

function normalizeHourlyDays(weatherSnapshot) {
  const windows = weatherSnapshot && Array.isArray(weatherSnapshot.evaluatedWindows)
    ? weatherSnapshot.evaluatedWindows : []
  return windows.map((window) => ({
    day: window.day,
    date: window.date,
    activityWindow: {
      startLocal: window.startLocal || null,
      endLocalExclusive: window.endLocalExclusive || null,
    },
    startLocal: window.startLocal || null,
    endLocalExclusive: window.endLocalExclusive || null,
    samples: (Array.isArray(window.samples) ? window.samples : []).map((sample) => ({
      samplePointId: sample.samplePointId,
      name: sample.samplePointName || sample.name || null,
      samplePointName: sample.samplePointName || sample.name || null,
      elevationM: finiteOrNull(sample.elevationM),
      requestCoordinate: clone(sample.requestCoordinate),
      hours: (Array.isArray(sample.hours) ? sample.hours : []).map(normalizeHour),
    })),
  }))
}

function normalizeReferenceDays(snapshot) {
  const data = snapshot && isRecord(snapshot.data) ? snapshot.data : {}
  if (Array.isArray(data.days)) return clone(data.days)
  const daily = isRecord(data.daily) ? data.daily : null
  if (!daily || !Array.isArray(daily.time)) return []
  return daily.time.map((date, index) => ({
    date,
    tempMin: daily.temperature_2m_min ? daily.temperature_2m_min[index] : null,
    tempMax: daily.temperature_2m_max ? daily.temperature_2m_max[index] : null,
    precipProb: daily.precipitation_probability_max ? daily.precipitation_probability_max[index] : 0,
    windMs: daily.wind_speed_10m_max ? daily.wind_speed_10m_max[index] : 0,
  }))
}

function weatherSourceFor(snapshot, sourceMetadata) {
  if (sourceMetadata && typeof sourceMetadata.weatherSource === 'string') return sourceMetadata.weatherSource
  if (snapshot && typeof snapshot.source === 'string') return snapshot.source
  if (snapshot && isRecord(snapshot.data) && typeof snapshot.data.source === 'string') return snapshot.data.source
  return null
}

function weatherFetchedAtFor(snapshot) {
  if (snapshot && typeof snapshot.fetchedAt === 'string') return snapshot.fetchedAt
  if (snapshot && isRecord(snapshot.data) && typeof snapshot.data.fetchedAt === 'string') return snapshot.data.fetchedAt
  return null
}

function buildWeather({ capability, weatherSnapshot, sourceMetadata, dataIssues }) {
  const source = weatherSourceFor(weatherSnapshot, sourceMetadata)
  const fetchedAt = weatherFetchedAtFor(weatherSnapshot)
  if (capability === 'blocked') {
    return {
      kind: 'not_applicable',
      scope: 'blocked_route',
      status: 'not_requested',
      dataStatus: 'not_applicable',
      source: null,
      fetchedAt: null,
      days: [],
      notice: '官方禁行，本次未请求天气',
    }
  }

  if (capability === 'place_only') {
    const available = weatherSnapshot && weatherSnapshot.status === 'available'
    return available
      ? {
        kind: 'reference',
        scope: 'reference_point',
        status: 'available',
        dataStatus: 'reference',
        source,
        fetchedAt,
        days: normalizeReferenceDays(weatherSnapshot),
        notice: '地点参考天气，不代表完整路线天气',
      }
      : {
        kind: 'unavailable',
        scope: 'reference_point',
        status: 'unavailable',
        dataStatus: 'unavailable',
        source,
        fetchedAt,
        days: [],
        notice: '地点参考天气暂不可用，仅展示地点信息',
        dataIssues: dataIssues.slice(),
      }
  }

  const complete = weatherSnapshot && weatherSnapshot.ok === true && weatherSnapshot.dataStatus === 'complete'
  if (complete) {
    return {
      kind: 'hourly',
      scope: 'activity_window',
      status: 'complete',
      dataStatus: 'complete',
      source,
      fetchedAt,
      timezone: weatherSnapshot.timezone || 'Asia/Shanghai',
      units: clone(weatherSnapshot.units),
      days: normalizeHourlyDays(weatherSnapshot),
      notice: null,
    }
  }
  return {
    kind: 'unavailable',
    scope: 'activity_window',
    status: 'insufficient',
    dataStatus: 'insufficient',
    source,
    fetchedAt,
    timezone: weatherSnapshot && weatherSnapshot.timezone ? weatherSnapshot.timezone : 'Asia/Shanghai',
    days: [],
    notice: '天气数据不足，未展示部分小时读数',
    dataIssues: dataIssues.slice(),
  }
}

function buildRoute(routeSnapshot, requestSummary) {
  const snapshot = isRecord(routeSnapshot) ? routeSnapshot : {}
  const capability = snapshot.capability || null
  const routeType = ROUTE_TYPE_LABELS[snapshot.routeType] ? snapshot.routeType : null
  const highestPointElevationM = capability === 'place_only'
    ? finiteOrNull(snapshot.referenceElevationM)
    : finiteOrNull(snapshot.routeHighestPointElevationM)
  const operationalStatus = snapshot.operationalStatus || null
  const operationalStatusLabel = operationalStatus === 'unknown'
    ? '开放状态待出发前核验'
    : operationalStatus === 'open'
      ? '开放'
      : operationalStatus === 'blocked'
        ? '官方禁行'
        : null
  return {
    entityKind: snapshot.entityKind || null,
    capability,
    scope: capability === 'full'
      ? '完整路线'
      : capability === 'place_only'
        ? '地点参考（非完整路线）'
        : capability === 'blocked' ? '官方禁行路线' : '路线范围待确认',
    canonicalName: snapshot.canonicalName || null,
    name: snapshot.canonicalName || null,
    region: snapshot.region || null,
    routeType,
    routeTypeLabel: routeType ? ROUTE_TYPE_LABELS[routeType] : '类型待确认',
    fixedDays: hasOwn(snapshot, 'fixedDays') ? snapshot.fixedDays : null,
    highestPointElevationM,
    verificationLevel: snapshot.verificationLevel || null,
    operationalStatus,
    operationalStatusLabel,
    sourceCheckedAt: snapshot.sourceCheckedAt || null,
    stages: capability === 'full' && Array.isArray(snapshot.stages) ? clone(snapshot.stages) : [],
    restriction: snapshot.restriction ? clone(snapshot.restriction) : null,
    request: clone(requestSummary || {}),
  }
}

function buildSources(sourceMetadata, weather) {
  const metadata = isRecord(sourceMetadata) ? sourceMetadata : {}
  const routeSources = (Array.isArray(metadata.routeSources) ? metadata.routeSources : []).map((source) => {
    const value = isRecord(source) ? source : {}
    return {
      id: typeof value.id === 'string' ? value.id : null,
      tier: value.tier || null,
      kind: value.kind || null,
      title: value.title || null,
      publisher: value.publisher || null,
      url: hasOwn(value, 'url') && value.url !== undefined ? value.url : null,
      checkedAt: value.checkedAt || null,
    }
  })
  return {
    route: routeSources,
    routeSources,
    weather: {
      source: weather.source || null,
      fetchedAt: weather.fetchedAt || null,
      timezone: weather.timezone || null,
    },
    weatherSource: weather.source || null,
    weatherFetchedAt: weather.fetchedAt || null,
    checkedAt: metadata.checkedAt || null,
  }
}

function buildAi({ result, minimumGear, flowStatus, flowError }) {
  const source = isRecord(result && result.ai) ? result.ai : {}
  let status = ['loading', 'ready', 'unavailable', 'context_expired'].includes(source.status)
    ? source.status
    : null
  if (!status) {
    if (flowError && flowError.code === 'query_context_unavailable') status = 'context_expired'
    else if (flowStatus === 'base_ready' || flowStatus === 'advice_loading') status = 'loading'
    else if (flowStatus === 'degraded') status = 'unavailable'
    else if (flowStatus === 'complete') status = 'ready'
    else status = 'unavailable'
  }
  if (flowError && flowError.code === 'query_context_unavailable') status = 'context_expired'
  const gear = additionsForAdvice(source.gear, minimumGear)
  return {
    status,
    additions: [...gear.recommended, ...gear.optional],
    gear,
    risks: Array.isArray(source.risks) ? clone(source.risks) : [],
    notes: Array.isArray(source.notes) ? clone(source.notes) : [],
    disclaimer: typeof source.disclaimer === 'string' ? source.disclaimer : null,
    degradedReason: typeof source.degradedReason === 'string' ? source.degradedReason : null,
  }
}

function buildResultPageModel({ result, flowStatus, flowError } = {}) {
  const source = isRecord(result) ? result : {}
  const routeSnapshot = isRecord(source.routeSnapshot) ? source.routeSnapshot : {}
  const requestSummary = isRecord(source.requestSummary) ? source.requestSummary : {}
  const deterministicResult = isRecord(source.deterministicResult) ? source.deterministicResult : {}
  const capability = routeSnapshot.capability || null
  const minimumGear = normalizeMinimumGear(source.minimumGear)
  const dataIssues = normalizeDataIssues(deterministicResult, source.weatherSnapshot, capability)
  const code = verdictCode(deterministicResult.verdict)
  const verdictMeta = VERDICT_LABELS[code === null ? 'null' : code]
  const weather = buildWeather({
    capability,
    weatherSnapshot: source.weatherSnapshot,
    sourceMetadata: source.sourceMetadata,
    dataIssues,
  })
  return {
    route: buildRoute(routeSnapshot, requestSummary),
    verdict: {
      code,
      value: code,
      label: verdictMeta.label,
      tone: verdictMeta.tone,
      dataStatus: deterministicResult.dataStatus || null,
    },
    verdictCode: code,
    dataStatus: deterministicResult.dataStatus || null,
    reasons: Array.isArray(deterministicResult.reasons) ? clone(deterministicResult.reasons) : [],
    dataIssues,
    weather,
    minimumGear,
    sources: buildSources(source.sourceMetadata, weather),
    ai: buildAi({ result: source, minimumGear, flowStatus, flowError }),
    requestSummary: clone(requestSummary),
  }
}

function isStructuredResult(result) {
  return isRecord(result)
    && isRecord(result.requestSummary)
    && isRecord(result.routeSnapshot)
    && hasOwn(result, 'weatherSnapshot')
    && isRecord(result.deterministicResult)
    && isRecord(result.minimumGear)
    && isRecord(result.sourceMetadata)
}

function normalizeCachedResult(result) {
  if (!isStructuredResult(result)) return null
  const restored = clone(result)
  const status = restored.ai && restored.ai.status
  if (!restored.ai || status === 'loading') {
    restored.ai = { ...(restored.ai || {}), status: 'unavailable' }
  }
  return restored
}

function captureHistoryContext(base) {
  const source = isRecord(base) ? base : {}
  return {
    elevation: hasOwn(source, 'elevation') ? source.elevation : null,
    location: hasOwn(source, 'location') ? source.location : null,
    coords: hasOwn(source, 'coords') ? clone(source.coords) : null,
    routeType: hasOwn(source, 'routeType') ? source.routeType : null,
    routeTypeSource: hasOwn(source, 'routeTypeSource') ? source.routeTypeSource : null,
  }
}

function mergeAdviceResult(baseResult, adviceData, degraded) {
  const base = isRecord(baseResult) ? baseResult : {}
  const advice = isRecord(adviceData) ? adviceData : {}
  return {
    ...base,
    ai: {
      status: degraded === true ? 'unavailable' : 'ready',
      gear: isRecord(advice.gear) ? clone(advice.gear) : {},
      risks: Array.isArray(advice.risks) ? clone(advice.risks) : [],
      notes: Array.isArray(advice.notes) ? clone(advice.notes) : [],
      disclaimer: typeof advice.disclaimer === 'string' ? advice.disclaimer : null,
    },
  }
}

function createChecklistState() {
  return {}
}

function checklistKey(category, index) {
  return `${category}:${index}`
}

function toggleChecklist(state, category, index) {
  const current = isRecord(state) ? state : {}
  const key = checklistKey(category, index)
  return { ...current, [key]: current[key] !== true }
}

/**
 * Small page-local lifecycle seam. Trip-flow remains the authority for query
 * states; this projection only decides whether the checklist survives a
 * result/advice event and remembers the current base identity without hashing.
 */
function createChecklistLifecycle() {
  return { queryId: null, baseRef: null, checked: {} }
}

function applyChecklistLifecycleEvent(state, event = {}) {
  const current = isRecord(state) ? state : createChecklistLifecycle()
  const type = event && event.type
  if (type === 'base_received') {
    const sameBase = current.queryId === event.queryId && current.baseRef === event.baseRef
    return {
      queryId: event.queryId === undefined ? null : event.queryId,
      baseRef: event.baseRef === undefined ? null : event.baseRef,
      checked: sameBase ? clone(current.checked) : {},
    }
  }
  if (type === 'return_to_search' || type === 'cache_restore') {
    return createChecklistLifecycle()
  }
  return {
    queryId: current.queryId === undefined ? null : current.queryId,
    baseRef: current.baseRef === undefined ? null : current.baseRef,
    checked: clone(current.checked) || {},
  }
}

function historyResultForAdviceOutcome(outcome, { adviceData, baseRisks, degraded } = {}) {
  if (outcome === 'context_unavailable') return null
  if (outcome === 'success') {
    return {
      risks: adviceData && Array.isArray(adviceData.risks) ? clone(adviceData.risks) : [],
      degraded: degraded === true,
    }
  }
  if (outcome === 'degraded') {
    return {
      risks: Array.isArray(baseRisks) ? clone(baseRisks) : [],
      degraded: true,
    }
  }
  return null
}

function buildHistorySavePayload({ params, historyContext, resultData } = {}) {
  const input = isRecord(params) ? params : {}
  const context = captureHistoryContext(historyContext)
  const result = isRecord(resultData) ? resultData : {}
  const risks = Array.isArray(result.risks) ? result.risks : []
  const summary = risks.length > 0
    ? risks[0].risk + (risks.length > 1 ? ' 等' + risks.length + '项风险' : '')
    : (result.degraded ? 'AI 降级·基础参考' : '无重大风险')
  return {
    mode: 'save',
    route: input.route,
    date: input.date,
    days: input.days,
    level: input.level,
    elevation: context.elevation,
    location: context.location,
    coords: context.coords,
    routeType: context.routeType,
    routeTypeSource: context.routeTypeSource,
    summary,
    degraded: result.degraded === true,
  }
}

module.exports = {
  DATA_ISSUE_LABELS,
  RESULT_CACHE_KEY,
  RESULT_CACHE_VERSION,
  ROUTE_TYPE_LABELS,
  VERDICT_LABELS,
  WMO_GROUPS,
  applyChecklistLifecycleEvent,
  buildHistorySavePayload,
  buildResultPageModel,
  captureHistoryContext,
  checklistKey,
  createChecklistLifecycle,
  conditionForWeatherCode,
  createChecklistState,
  historyResultForAdviceOutcome,
  isStructuredResult,
  mergeAdviceResult,
  normalizeCachedResult,
  toggleChecklist,
}
