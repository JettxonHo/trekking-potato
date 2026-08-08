/**
 * I24a pure adapter from the trusted beta_base_v2 snapshot to the bounded
 * context consumed by Prompt and the AI-facing orchestration.
 *
 * This module intentionally has no I/O and never exposes the raw hourly
 * weather payload, route-source DTOs, sun events, or compatibility aliases.
 */
const { getRouteTypeLabel, isKnownRouteType, isKnownRouteTypeSource } = require('./route-type')

const BASE_KEYS = Object.freeze([
  'schemaVersion',
  'requestSummary',
  'routeSnapshot',
  'weatherSnapshot',
  'deterministicResult',
  'minimumGear',
  'deterministicSafety',
  'sourceMetadata',
])

const TRANSITIONAL_ALIASES = Object.freeze([
  'route', 'date', 'level', 'days', 'elevation', 'location', 'coords',
  'routeType', 'routeTypeSource', 'weather', 'sunEvents', 'gearRules', 'meta',
])

function copy(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function sameKeys(value, expected) {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort())
}

function assertBaseV2(baseData) {
  if (!isPlainObject(baseData) || baseData.schemaVersion !== 'beta_base_v2' || !sameKeys(baseData, BASE_KEYS)) {
    throw new TypeError('beta_base_v2 advice context required')
  }
  if (!isPlainObject(baseData.requestSummary)
    || !isPlainObject(baseData.routeSnapshot)
    || !isPlainObject(baseData.deterministicResult)
    || !isPlainObject(baseData.minimumGear)
    || !isPlainObject(baseData.deterministicSafety)
    || !isPlainObject(baseData.sourceMetadata)) {
    throw new TypeError('beta_base_v2 advice context required')
  }
  if (!Array.isArray(baseData.minimumGear.essential)
    || !Array.isArray(baseData.minimumGear.recommended)
    || !Array.isArray(baseData.minimumGear.optional)
    || !Array.isArray(baseData.deterministicSafety.fatalRisks)
    || !Array.isArray(baseData.deterministicSafety.ruleNotes)) {
    throw new TypeError('beta_base_v2 advice context required')
  }
  return baseData
}

function normalizeGear(minimumGear) {
  return {
    essential: Array.isArray(minimumGear.essential) ? copy(minimumGear.essential) : [],
    recommended: Array.isArray(minimumGear.recommended) ? copy(minimumGear.recommended) : [],
    optional: Array.isArray(minimumGear.optional) ? copy(minimumGear.optional) : [],
  }
}

function normalizeSafety(deterministicSafety) {
  return {
    fatalRisks: Array.isArray(deterministicSafety.fatalRisks) ? copy(deterministicSafety.fatalRisks) : [],
    ruleNotes: Array.isArray(deterministicSafety.ruleNotes) ? copy(deterministicSafety.ruleNotes) : [],
  }
}

function dailyFromWindows(weatherSnapshot, deterministicResult) {
  const windows = Array.isArray(weatherSnapshot.evaluatedWindows) ? weatherSnapshot.evaluatedWindows : []
  return windows.map((window) => {
    const hours = (Array.isArray(window.samples) ? window.samples : [])
      .flatMap((sample) => Array.isArray(sample.hours) ? sample.hours : [])
      .filter((hour) => hour && finite(hour.temperatureC))
    if (hours.length === 0) return null
    const referenceDay = Array.isArray(deterministicResult.reasons)
      && deterministicResult.reasons.some((reason) => reason && reason.code === 'forecast_lead_time' && reason.at && reason.at.day === window.day)
    return {
      date: typeof window.date === 'string' ? window.date : null,
      tempMin: Math.floor(Math.min(...hours.map((hour) => hour.temperatureC))),
      tempMax: Math.ceil(Math.max(...hours.map((hour) => hour.temperatureC))),
      precipProb: Math.max(...hours.map((hour) => finite(hour.precipitationProbabilityPct) ? hour.precipitationProbabilityPct : 0)),
      windMs: Math.max(...hours.map((hour) => finite(hour.windSpeedMs) ? hour.windSpeedMs : 0)),
      confidence: referenceDay ? '参考' : '正常',
    }
  }).filter((day) => day && day.date)
}

function dailyFromReferenceData(data) {
  if (!isPlainObject(data)) return []
  if (Array.isArray(data.days)) {
    return data.days.map((day) => ({
      date: typeof day.date === 'string' ? day.date : null,
      tempMin: finite(day.tempMin) ? day.tempMin : null,
      tempMax: finite(day.tempMax) ? day.tempMax : null,
      precipProb: finite(day.precipProb) ? day.precipProb : 0,
      windMs: finite(day.windMs) ? day.windMs : 0,
      confidence: typeof day.confidence === 'string' ? day.confidence : '正常',
    })).filter((day) => day.date)
  }
  const daily = isPlainObject(data.daily) ? data.daily : null
  if (!daily || !Array.isArray(daily.time)) return []
  return daily.time.map((date, index) => ({
    date,
    tempMin: finite(daily.temperature_2m_min && daily.temperature_2m_min[index]) ? daily.temperature_2m_min[index] : null,
    tempMax: finite(daily.temperature_2m_max && daily.temperature_2m_max[index]) ? daily.temperature_2m_max[index] : null,
    precipProb: finite(daily.precipitation_probability_max && daily.precipitation_probability_max[index]) ? daily.precipitation_probability_max[index] : 0,
    windMs: finite(daily.wind_speed_10m_max && daily.wind_speed_10m_max[index]) ? daily.wind_speed_10m_max[index] : 0,
    confidence: '正常',
  }))
}

function summarizeWeather(weatherSnapshot, deterministicResult) {
  if (weatherSnapshot === null) return null
  if (!isPlainObject(weatherSnapshot)) return { status: 'unavailable', dataStatus: 'unavailable', days: [] }

  if (weatherSnapshot.ok === true) {
    return {
      status: weatherSnapshot.dataStatus === 'complete' ? 'complete' : 'insufficient',
      dataStatus: weatherSnapshot.dataStatus || 'insufficient',
      source: typeof weatherSnapshot.source === 'string' ? weatherSnapshot.source : null,
      timezone: typeof weatherSnapshot.timezone === 'string' ? weatherSnapshot.timezone : 'Asia/Shanghai',
      fetchedAt: typeof weatherSnapshot.fetchedAt === 'string' ? weatherSnapshot.fetchedAt : null,
      days: weatherSnapshot.dataStatus === 'complete' ? dailyFromWindows(weatherSnapshot, deterministicResult) : [],
    }
  }

  if (weatherSnapshot.status === 'available') {
    const data = weatherSnapshot.data
    return {
      status: 'available',
      dataStatus: 'reference',
      source: typeof weatherSnapshot.source === 'string' ? weatherSnapshot.source : (data && data.source) || null,
      timezone: typeof weatherSnapshot.timezone === 'string' ? weatherSnapshot.timezone : 'Asia/Shanghai',
      fetchedAt: typeof weatherSnapshot.fetchedAt === 'string' ? weatherSnapshot.fetchedAt : (data && data.fetchedAt) || null,
      days: dailyFromReferenceData(data),
    }
  }

  return {
    status: 'unavailable',
    dataStatus: 'unavailable',
    source: typeof weatherSnapshot.source === 'string' ? weatherSnapshot.source : null,
    timezone: typeof weatherSnapshot.timezone === 'string' ? weatherSnapshot.timezone : 'Asia/Shanghai',
    fetchedAt: typeof weatherSnapshot.fetchedAt === 'string' ? weatherSnapshot.fetchedAt : null,
    days: [],
  }
}

/**
 * @param {object} baseData exact beta_base_v2 trusted snapshot
 * @returns {object} bounded Prompt/AI context
 */
function createAdviceContext(baseData) {
  const source = assertBaseV2(baseData)
  const route = source.routeSnapshot
  const request = source.requestSummary
  const metadata = source.sourceMetadata
  const routeType = isKnownRouteType(route.routeType) ? route.routeType : null
  const routeTypeSource = isKnownRouteTypeSource(metadata.routeTypeSource) ? metadata.routeTypeSource : null
  return {
    routeLabel: typeof route.canonicalName === 'string' ? route.canonicalName : '',
    routeRegion: typeof route.region === 'string' ? route.region : '',
    routeType,
    routeTypeLabel: routeType ? getRouteTypeLabel(routeType) : null,
    routeTypeSource,
    requestSummary: {
      date: request.date,
      startTimeLocal: request.startTimeLocal,
      level: request.level,
      days: request.days,
      climbSupport: request.climbSupport,
    },
    weatherSummary: summarizeWeather(source.weatherSnapshot, source.deterministicResult),
    minimumGear: normalizeGear(source.minimumGear),
    deterministicSafety: normalizeSafety(source.deterministicSafety),
  }
}

module.exports = {
  BASE_KEYS,
  TRANSITIONAL_ALIASES,
  assertBaseV2,
  createAdviceContext,
  summarizeWeather,
}
