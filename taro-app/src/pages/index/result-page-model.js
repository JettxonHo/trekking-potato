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

const ROUTE_PREVIEW_COORDINATE_SYSTEMS = new Set(['GCJ-02', 'WGS84'])
const ROUTE_PREVIEW_KEYS = new Set(['coordinateSystem', 'bounds', 'segments'])
const ROUTE_PREVIEW_BOUND_KEYS = new Set(['minLat', 'maxLat', 'minLon', 'maxLon'])
const ROUTE_PREVIEW_POINT_KEYS = new Set(['lat', 'lon'])
const GCJ02_AXIS = 6378245.0
const GCJ02_ECCENTRICITY = 0.00669342162296594323
const ROUTE_PREVIEW_REGION_MAINLAND = 'mainland'
const ROUTE_PREVIEW_REGION_NON_MAINLAND = 'non_mainland'
const ROUTE_PREVIEW_REGION_UNKNOWN = 'unknown'
const MAINLAND_REGION_CANONICAL_FORMS = Object.freeze([
  '中国大陆',
  '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江',
  '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南',
  '广东', '广西', '海南', '重庆', '四川', '贵州', '云南', '西藏', '陕西', '甘肃',
  '青海', '宁夏', '新疆',
])
const MAINLAND_REGION_ADMIN_PREFIXES = Object.freeze([
  '北京市', '天津市', '河北省', '山西省', '内蒙古自治区', '辽宁省', '吉林省', '黑龙江省',
  '上海市', '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省', '河南省', '湖北省', '湖南省',
  '广东省', '广西壮族自治区', '海南省', '重庆市', '四川省', '贵州省', '云南省', '西藏自治区',
  '陕西省', '甘肃省', '青海省', '宁夏回族自治区', '新疆维吾尔自治区',
])
const NON_MAINLAND_REGION_FORMS = Object.freeze([
  '香港', 'hongkong', '澳门', 'macau', '台湾', 'taiwan', '尼泊尔', 'nepal',
  '蒙古国', 'mongolia', '乌兰巴托', 'ulaanbaatar',
])
const REGION_COMPONENT_SEPARATORS = Object.freeze(['·', '/', '-', '|'])

function hasOnlyKeys(value, allowed) {
  return Object.keys(value).every((key) => allowed.has(key))
}

function isFiniteCoordinate(value, min, max) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function normalizeRouteRegion(value) {
  if (typeof value !== 'string') return ''
  return value.trim().toLocaleLowerCase().replace(/\s+/g, '')
}

function classifyRoutePreviewRegion(value) {
  const region = normalizeRouteRegion(value)
  if (!region) return ROUTE_PREVIEW_REGION_UNKNOWN
  const mainlandMatch = MAINLAND_REGION_CANONICAL_FORMS.some((form) => region === form
    || REGION_COMPONENT_SEPARATORS.some((separator) => region.startsWith(`${form}${separator}`) || region.includes(`${separator}${form}`)))
    || MAINLAND_REGION_ADMIN_PREFIXES.some((prefix) => region.startsWith(prefix)
      || REGION_COMPONENT_SEPARATORS.some((separator) => region.includes(`${separator}${prefix}`)))
  const nonMainlandMatch = NON_MAINLAND_REGION_FORMS.some((form) => region === form
    || region.startsWith(form)
    || REGION_COMPONENT_SEPARATORS.some((separator) => region.includes(`${separator}${form}`)))
  if (mainlandMatch && nonMainlandMatch) return ROUTE_PREVIEW_REGION_UNKNOWN
  if (mainlandMatch) return ROUTE_PREVIEW_REGION_MAINLAND
  if (nonMainlandMatch) return ROUTE_PREVIEW_REGION_NON_MAINLAND
  return ROUTE_PREVIEW_REGION_UNKNOWN
}

function transformLatitude(x, y) {
  let value = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  value += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3
  value += (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3
  value += (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3
  return value
}

function transformLongitude(x, y) {
  let value = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  value += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3
  value += (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3
  value += (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x * Math.PI / 30)) * 2 / 3
  return value
}

function convertWgs84ToGcj02(point) {
  if (!isRecord(point)
    || !isFiniteCoordinate(point.lat, -90, 90)
    || !isFiniteCoordinate(point.lon, -180, 180)) return { lat: point && point.lat, lon: point && point.lon }
  const x = point.lon - 105
  const y = point.lat - 35
  const latitudeRadians = point.lat / 180 * Math.PI
  let magic = Math.sin(latitudeRadians)
  magic = 1 - GCJ02_ECCENTRICITY * magic * magic
  const squareRootMagic = Math.sqrt(magic)
  const deltaLat = transformLatitude(x, y) * 180 / ((GCJ02_AXIS * (1 - GCJ02_ECCENTRICITY)) / (magic * squareRootMagic) * Math.PI)
  const deltaLon = transformLongitude(x, y) * 180 / (GCJ02_AXIS / squareRootMagic * Math.cos(latitudeRadians) * Math.PI)
  return { lat: point.lat + deltaLat, lon: point.lon + deltaLon }
}

function convertRoutePreviewPointForMap(point, coordinateSystem, routeRegion) {
  if (!isRecord(point)
    || !ROUTE_PREVIEW_COORDINATE_SYSTEMS.has(coordinateSystem)
    || !isFiniteCoordinate(point.lat, -90, 90)
    || !isFiniteCoordinate(point.lon, -180, 180)) return null
  const regionClass = classifyRoutePreviewRegion(routeRegion)
  if (regionClass === ROUTE_PREVIEW_REGION_UNKNOWN) return null
  const converted = coordinateSystem === 'WGS84' && regionClass === ROUTE_PREVIEW_REGION_MAINLAND
    ? convertWgs84ToGcj02(point)
    : { lat: point.lat, lon: point.lon }
  if (!isFiniteCoordinate(converted.lat, -90, 90) || !isFiniteCoordinate(converted.lon, -180, 180)) return null
  return { latitude: converted.lat, longitude: converted.lon }
}

function buildRoutePreviewMapGeometry(preview, routeRegion) {
  if (!isRecord(preview) || !Array.isArray(preview.segments)) return null
  if (classifyRoutePreviewRegion(routeRegion) === ROUTE_PREVIEW_REGION_UNKNOWN) return null
  const sourceSegments = preview.segments.map((segment) => Array.isArray(segment.points) ? segment.points : [])
  const points = sourceSegments.reduce((all, segment) => all.concat(segment.map((point) => convertRoutePreviewPointForMap(point, preview.coordinateSystem, routeRegion))), [])
  if (points.length === 0 || points.some((point) => !point)) return null
  const polylines = sourceSegments.map((segment, index) => ({
    points: segment.map((point) => convertRoutePreviewPointForMap(point, preview.coordinateSystem, routeRegion)),
    color: ['#1d1d1f', '#5e5ce6', '#34c759', '#ff9500', '#ff375f', '#64d2ff', '#af52de'][index % 7],
    width: 4,
    dottedLine: false,
  }))
  const start = points[0]
  const end = points[points.length - 1]
  return {
    points,
    polylines,
    center: {
      latitude: points.reduce((sum, point) => sum + point.latitude, 0) / points.length,
      longitude: points.reduce((sum, point) => sum + point.longitude, 0) / points.length,
    },
    indicators: [
      { latitude: start.latitude, longitude: start.longitude, radius: 36, color: '#1d1d1f', fillColor: '#1d1d1f66', strokeWidth: 3 },
      { latitude: end.latitude, longitude: end.longitude, radius: 36, color: '#34c759', fillColor: '#34c75966', strokeWidth: 3 },
    ],
  }
}

function projectRoutePreview(value, capability, fixedDays) {
  if (capability !== 'full' || !isRecord(value) || !hasOnlyKeys(value, ROUTE_PREVIEW_KEYS)) return null
  if (!ROUTE_PREVIEW_COORDINATE_SYSTEMS.has(value.coordinateSystem)) return null
  if (!isRecord(value.bounds) || !hasOnlyKeys(value.bounds, ROUTE_PREVIEW_BOUND_KEYS)) return null
  const bounds = value.bounds
  if (!isFiniteCoordinate(bounds.minLat, -90, 90)
    || !isFiniteCoordinate(bounds.maxLat, -90, 90)
    || !isFiniteCoordinate(bounds.minLon, -180, 180)
    || !isFiniteCoordinate(bounds.maxLon, -180, 180)
    || bounds.minLat > bounds.maxLat
    || bounds.minLon > bounds.maxLon) return null
  if (!Array.isArray(value.segments) || value.segments.length < 1 || value.segments.length > 7) return null

  const segments = []
  let pointCount = 0
  let previousDay = 0
  let actualBounds = null
  for (const segment of value.segments) {
    if (!isRecord(segment) || !hasOnlyKeys(segment, new Set(['day', 'points']))
      || !Number.isInteger(segment.day) || segment.day <= previousDay
      || (Number.isInteger(fixedDays) && segment.day > fixedDays)
      || !Array.isArray(segment.points) || segment.points.length < 2) return null
    previousDay = segment.day
    pointCount += segment.points.length
    if (pointCount > 500) return null
    const points = []
    for (const point of segment.points) {
      if (!isRecord(point) || !hasOnlyKeys(point, ROUTE_PREVIEW_POINT_KEYS)
        || !isFiniteCoordinate(point.lat, -90, 90)
        || !isFiniteCoordinate(point.lon, -180, 180)) return null
      const normalized = { lat: point.lat, lon: point.lon }
      points.push(normalized)
      actualBounds = actualBounds || {
        minLat: normalized.lat, maxLat: normalized.lat, minLon: normalized.lon, maxLon: normalized.lon,
      }
      actualBounds.minLat = Math.min(actualBounds.minLat, normalized.lat)
      actualBounds.maxLat = Math.max(actualBounds.maxLat, normalized.lat)
      actualBounds.minLon = Math.min(actualBounds.minLon, normalized.lon)
      actualBounds.maxLon = Math.max(actualBounds.maxLon, normalized.lon)
    }
    segments.push({ day: segment.day, points })
  }
  if (!actualBounds
    || bounds.minLat !== actualBounds.minLat
    || bounds.maxLat !== actualBounds.maxLat
    || bounds.minLon !== actualBounds.minLon
    || bounds.maxLon !== actualBounds.maxLon) return null
  return {
    coordinateSystem: value.coordinateSystem,
    bounds: { ...bounds },
    segments,
  }
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
    routePreview: projectRoutePreview(snapshot.routePreview, capability, snapshot.fixedDays),
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
    refreshing: flowStatus === 'preparing' && result !== null && result !== undefined,
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
    && isRecord(result.deterministicSafety)
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
  const route = isRecord(source.routeSnapshot) ? source.routeSnapshot : {}
  const metadata = isRecord(source.sourceMetadata) ? source.sourceMetadata : {}
  const capability = route.capability
  const isPlaceOnly = capability === 'place_only'
  const isFull = capability === 'full'
  const elevation = isFull
    ? finiteOrNull(route.routeHighestPointElevationM)
    : isPlaceOnly ? finiteOrNull(route.referenceElevationM) : null
  const coords = isPlaceOnly && isRecord(route.referenceCoordinate)
    ? clone(route.referenceCoordinate)
    : null
  return {
    elevation,
    location: typeof route.region === 'string' ? route.region : null,
    coords,
    routeType: route.routeType || null,
    routeTypeSource: metadata.routeTypeSource || null,
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

function buildHistorySavePayload({ params, historyContext, resultData, saveAttemptId } = {}) {
  const input = isRecord(params) ? params : {}
  const context = isRecord(historyContext)
    && ['elevation', 'location', 'coords', 'routeType', 'routeTypeSource'].every((key) => hasOwn(historyContext, key))
    ? {
      elevation: historyContext.elevation,
      location: historyContext.location,
      coords: clone(historyContext.coords),
      routeType: historyContext.routeType,
      routeTypeSource: historyContext.routeTypeSource,
    }
    : captureHistoryContext(historyContext)
  const result = isRecord(resultData) ? resultData : {}
  const risks = Array.isArray(result.risks) ? result.risks : []
  const summary = risks.length > 0
    ? risks[0].risk + (risks.length > 1 ? ' 等' + risks.length + '项风险' : '')
    : (result.degraded ? 'AI 降级·基础参考' : '无重大风险')
  const payload = {
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
  if (typeof saveAttemptId === 'string' && saveAttemptId.length > 0) payload.saveAttemptId = saveAttemptId
  return payload
}

module.exports = {
  DATA_ISSUE_LABELS,
  RESULT_CACHE_KEY,
  RESULT_CACHE_VERSION,
  ROUTE_TYPE_LABELS,
  VERDICT_LABELS,
  WMO_GROUPS,
  applyChecklistLifecycleEvent,
  buildRoutePreviewMapGeometry,
  buildHistorySavePayload,
  buildResultPageModel,
  captureHistoryContext,
  checklistKey,
  classifyRoutePreviewRegion,
  createChecklistLifecycle,
  conditionForWeatherCode,
  createChecklistState,
  historyResultForAdviceOutcome,
  isStructuredResult,
  mergeAdviceResult,
  normalizeCachedResult,
  convertRoutePreviewPointForMap,
  toggleChecklist,
}
