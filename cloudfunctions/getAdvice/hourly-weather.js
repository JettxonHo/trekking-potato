/**
 * I14 route-hourly weather planning and projection.
 *
 * This module intentionally has no CloudBase dependency. It consumes an I07
 * verified/full Variant and projects Open-Meteo's mixed valid-time fields into
 * explicit local hourly buckets for later I15/I16 orchestration.
 */
const { gcj02ToWgs84 } = require('./coordinates')

const TIMEZONE = 'Asia/Shanghai'
const HOURLY_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation_probability',
  'precipitation',
  'snowfall',
  'weather_code',
  'visibility',
  'wind_speed_10m',
  'wind_gusts_10m',
  'freezing_level_height',
]
const HOURLY_UNITS = {
  time: 'iso8601',
  temperature_2m: '°C',
  apparent_temperature: '°C',
  precipitation_probability: '%',
  precipitation: 'mm',
  snowfall: 'cm',
  weather_code: 'wmo code',
  visibility: 'm',
  wind_speed_10m: 'm/s',
  wind_gusts_10m: 'm/s',
  freezing_level_height: 'm',
}
const NORMALIZED_UNITS = {
  temperatureC: '°C',
  apparentTemperatureC: '°C',
  precipitationProbabilityPct: '%',
  precipitationMm: 'mm',
  snowfallCm: 'cm',
  weatherCode: 'wmo code',
  visibilityM: 'm',
  windSpeedMs: 'm/s',
  windGustMs: 'm/s',
  freezingLevelHeightM: 'm',
}
const WMO_CODES = new Set([
  0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67,
  71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99,
])

function isValidIsoDate(value) {
  if (typeof value !== 'string') return false
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return date.getUTCFullYear() === Number(match[1])
    && date.getUTCMonth() === Number(match[2]) - 1
    && date.getUTCDate() === Number(match[3])
}

function addIsoDays(date, amount) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + amount))
  return value.toISOString().slice(0, 10)
}

function parseStartTime(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

function formatLocal(date, totalMinutes) {
  const dayOffset = Math.floor(totalMinutes / 1440)
  const minuteOfDay = totalMinutes - dayOffset * 1440
  const hour = Math.floor(minuteOfDay / 60)
  const minute = minuteOfDay % 60
  return `${addIsoDays(date, dayOffset)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function buildStageWindow(stage, date, startMinutes) {
  const durationHoursMax = stage.durationHours.max
  const endMinutes = startMinutes + durationHoursMax * 60
  const firstBucketStart = Math.floor(startMinutes / 60) * 60
  const lastBucketStart = Math.ceil(endMinutes / 60) * 60 - 60
  const buckets = []
  for (let bucketStart = firstBucketStart; bucketStart <= lastBucketStart; bucketStart += 60) {
    buckets.push({
      bucketStartLocal: formatLocal(date, bucketStart),
      bucketEndLocal: formatLocal(date, bucketStart + 60),
    })
  }
  return {
    day: stage.day,
    date,
    startLocal: formatLocal(date, startMinutes),
    endLocalExclusive: formatLocal(date, endMinutes),
    durationHoursMax,
    samplePointIds: stage.weatherSamplePointIds.slice(),
    buckets,
  }
}

function toWgs84(coordinate) {
  if (coordinate.coordinateSystem === 'GCJ-02') {
    const converted = gcj02ToWgs84(coordinate.lon, coordinate.lat)
    return { lat: converted.lat, lon: converted.lng, coordinateSystem: 'WGS84' }
  }
  return { lat: coordinate.lat, lon: coordinate.lon, coordinateSystem: 'WGS84' }
}

function buildRequestUrl(sample, startDate, endDate) {
  const coordinate = toWgs84(sample.coordinate)
  const params = new URLSearchParams({
    latitude: String(coordinate.lat),
    longitude: String(coordinate.lon),
    elevation: String(sample.elevationM),
    hourly: HOURLY_FIELDS.join(','),
    timezone: TIMEZONE,
    temperature_unit: 'celsius',
    precipitation_unit: 'mm',
    wind_speed_unit: 'ms',
    timeformat: 'iso8601',
    start_date: startDate,
    end_date: endDate,
  })
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`
}

function isExplicitOutOfRange(response) {
  return response
    && response.error === true
    && typeof response.reason === 'string'
    && /out of allowed range/i.test(response.reason)
    && /start_date|end_date/i.test(response.reason)
}

function hasExpectedUnits(units) {
  if (!units || typeof units !== 'object') return false
  return Object.entries(HOURLY_UNITS).every(([field, expected]) => units[field] === expected)
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function hasValidMeasurements(values) {
  if (!isFiniteNumber(values.temperatureC)
    || !isFiniteNumber(values.apparentTemperatureC)
    || !isFiniteNumber(values.freezingLevelHeightM)) return false
  if (!Number.isInteger(values.weatherCode) || !WMO_CODES.has(values.weatherCode)) return false
  if (!isFiniteNumber(values.precipitationProbabilityPct)
    || values.precipitationProbabilityPct < 0
    || values.precipitationProbabilityPct > 100) return false
  return [
    values.precipitationMm,
    values.snowfallCm,
    values.visibilityM,
    values.windSpeedMs,
    values.windGustMs,
  ].every((value) => isFiniteNumber(value) && value >= 0)
}

function readSampleHours(response, plan) {
  if (isExplicitOutOfRange(response)) {
    return { ok: false, reason: { samplePointId: plan.sample.id, code: 'out_of_range', retryable: false } }
  }
  if (!response || response.error === true || response.timezone !== TIMEZONE || !hasExpectedUnits(response.hourly_units)) {
    return { ok: false, reason: { samplePointId: plan.sample.id, code: 'weather_data_invalid', retryable: true } }
  }
  const hourly = response.hourly
  if (!hourly || typeof hourly !== 'object' || !Array.isArray(hourly.time)) {
    return { ok: false, reason: { samplePointId: plan.sample.id, code: 'weather_data_invalid', retryable: true } }
  }
  const arrays = [hourly.time, ...HOURLY_FIELDS.map((field) => hourly[field])]
  if (arrays.some((value) => !Array.isArray(value)) || arrays.some((value) => value.length !== hourly.time.length)) {
    return { ok: false, reason: { samplePointId: plan.sample.id, code: 'weather_data_invalid', retryable: true } }
  }

  const indexByTime = new Map()
  for (const [index, localTime] of hourly.time.entries()) {
    if (typeof localTime !== 'string' || indexByTime.has(localTime)) {
      return { ok: false, reason: { samplePointId: plan.sample.id, code: 'weather_data_invalid', retryable: true } }
    }
    indexByTime.set(localTime, index)
  }

  const hours = []
  for (const bucket of plan.buckets) {
    const startIndex = indexByTime.get(bucket.bucketStartLocal)
    const endIndex = indexByTime.get(bucket.bucketEndLocal)
    if (startIndex === undefined || endIndex === undefined) {
      return { ok: false, reason: { samplePointId: plan.sample.id, code: 'weather_data_invalid', retryable: true } }
    }
    const values = {
      temperatureC: hourly.temperature_2m[startIndex],
      apparentTemperatureC: hourly.apparent_temperature[startIndex],
      precipitationProbabilityPct: hourly.precipitation_probability[endIndex],
      precipitationMm: hourly.precipitation[endIndex],
      snowfallCm: hourly.snowfall[endIndex],
      weatherCode: hourly.weather_code[startIndex],
      visibilityM: hourly.visibility[startIndex],
      windSpeedMs: hourly.wind_speed_10m[startIndex],
      windGustMs: hourly.wind_gusts_10m[endIndex],
      freezingLevelHeightM: hourly.freezing_level_height[startIndex],
    }
    if (!hasValidMeasurements(values)) {
      return { ok: false, reason: { samplePointId: plan.sample.id, code: 'weather_data_invalid', retryable: true } }
    }
    hours.push({ ...bucket, ...values })
  }
  return { ok: true, hours }
}

function makeAuditWindow(window) {
  return {
    day: window.day,
    date: window.date,
    startLocal: window.startLocal,
    endLocalExclusive: window.endLocalExclusive,
    durationHoursMax: window.durationHoursMax,
    samplePointIds: window.samplePointIds.slice(),
  }
}

function isAcceptedVariant(variant) {
  return variant
    && typeof variant === 'object'
    && variant.recordStatus === 'verified'
    && variant.capability === 'full'
}

/**
 * @param {{ variant?: any, date?: any, startTimeLocal?: any }} [request]
 * @param {{ now?: Date, requestJson?: (url: string) => Promise<any> | any }} [options]
 */
async function fetchRouteWeather(request, options = {}) {
  const { variant, date, startTimeLocal } = request || {}
  const startMinutes = parseStartTime(startTimeLocal)
  if (!isAcceptedVariant(variant) || !isValidIsoDate(date) || startMinutes === null) {
    return { ok: false, error: 'invalid_route_weather_request', message: '路线小时天气请求无效' }
  }

  const now = options.now instanceof Date ? options.now : new Date()
  const windows = variant.stages.map((stage) => buildStageWindow(stage, addIsoDays(date, stage.day - 1), startMinutes))
  const auditWindows = windows.map(makeAuditWindow)
  const samplesById = new Map(variant.weatherSamplePoints.map((sample) => [sample.id, sample]))
  const plansById = new Map()
  for (const window of windows) {
    for (const samplePointId of window.samplePointIds) {
      if (!plansById.has(samplePointId)) {
        plansById.set(samplePointId, { sample: samplesById.get(samplePointId), buckets: [] })
      }
      plansById.get(samplePointId).buckets.push(...window.buckets)
    }
  }
  const requestJson = typeof options.requestJson === 'function'
    ? options.requestJson
    : require('./weather').requestHourlyWeather
  const plans = [...plansById.values()].map((plan) => {
    const startDate = plan.buckets[0].bucketStartLocal.slice(0, 10)
    const endDate = plan.buckets[plan.buckets.length - 1].bucketEndLocal.slice(0, 10)
    return {
      ...plan,
      requestCoordinate: toWgs84(plan.sample.coordinate),
      url: buildRequestUrl(plan.sample, startDate, endDate),
    }
  })

  const sampleResults = await Promise.all(plans.map(async (plan) => {
    try {
      return { plan, ...readSampleHours(await requestJson(plan.url), plan) }
    } catch (_error) {
      return {
        plan,
        ok: false,
        reason: { samplePointId: plan.sample.id, code: 'weather_unavailable', retryable: true },
      }
    }
  }))
  const reasons = sampleResults.filter((result) => !result.ok).map((result) => result.reason)
  const common = {
    ok: true,
    source: 'Open-Meteo',
    fetchedAt: now.toISOString(),
    timezone: TIMEZONE,
  }
  if (reasons.length > 0) {
    return {
      ...common,
      dataStatus: 'insufficient',
      insufficientReasons: reasons,
      retryable: reasons.some((reason) => reason.retryable),
      evaluatedWindows: auditWindows,
    }
  }

  const resultById = new Map(sampleResults.map((result) => [result.plan.sample.id, result]))
  return {
    ...common,
    dataStatus: 'complete',
    units: { ...NORMALIZED_UNITS },
    evaluatedWindows: windows.map((window) => ({
      day: window.day,
      date: window.date,
      startLocal: window.startLocal,
      endLocalExclusive: window.endLocalExclusive,
      durationHoursMax: window.durationHoursMax,
      samples: window.samplePointIds.map((samplePointId) => {
        const result = resultById.get(samplePointId)
        const bucketStarts = new Set(window.buckets.map((bucket) => bucket.bucketStartLocal))
        return {
          samplePointId,
          samplePointName: result.plan.sample.name,
          elevationM: result.plan.sample.elevationM,
          requestCoordinate: { ...result.plan.requestCoordinate },
          hours: result.hours
            .filter((hour) => bucketStarts.has(hour.bucketStartLocal))
            .map((hour) => ({ ...hour })),
        }
      }),
    })),
  }
}

module.exports = { fetchRouteWeather }
