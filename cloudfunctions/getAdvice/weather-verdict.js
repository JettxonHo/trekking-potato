/**
 * I15 TP-VERDICT-1 weather-only rule engine.
 *
 * I14 owns hourly projection and data completeness. This module deliberately
 * consumes only a complete snapshot and contains no transport, time, route,
 * AI, or public-response behavior.
 */
const CODE_ORDER = [
  'thunderstorm',
  'freezing_rain',
  'extreme_wind_gust',
  'heavy_snow_with_wind',
  'heavy_snow_with_low_visibility',
  'activity_window_snowfall',
  'extreme_heat',
  'extreme_cold',
  'strong_wind_gust',
  'low_visibility',
  'heavy_rain_three_hours',
  'activity_window_precipitation',
  'apparent_heat',
  'apparent_cold',
  'rain_or_snow',
]

const MESSAGES = {
  thunderstorm: '活动时段存在雷暴',
  freezing_rain: '活动时段存在冻雨或冻毛毛雨',
  extreme_wind_gust: '活动时段阵风达到危险等级',
  heavy_snow_with_wind: '活动时段中大雪伴随强阵风',
  heavy_snow_with_low_visibility: '活动时段中大雪伴随极低能见度',
  activity_window_snowfall: '活动窗口累计新雪达到危险阈值',
  extreme_heat: '活动时段体感温度达到极端高温',
  extreme_cold: '活动时段体感温度达到极端低温',
  strong_wind_gust: '活动时段阵风较强',
  low_visibility: '活动时段能见度极低',
  heavy_rain_three_hours: '活动时段出现连续重雨',
  activity_window_precipitation: '活动窗口累计降水达到警示阈值',
  apparent_heat: '活动时段体感温度偏高',
  apparent_cold: '活动时段体感温度偏低',
  rain_or_snow: '活动时段存在雨雪天气',
}

const THUNDERSTORM_CODES = new Set([95, 96, 99])
const FREEZING_RAIN_CODES = new Set([56, 57, 66, 67])
const HEAVY_SNOW_CODES = new Set([73, 75, 85, 86])
const RAIN_OR_SNOW_CODES = new Set([51, 53, 55, 61, 63, 65, 71, 73, 75, 77, 80, 81, 82, 85, 86])
const HEAVY_RAIN_CODES = new Set([65, 82])
const CODE_INDEX = new Map(CODE_ORDER.map((code, index) => [code, index]))

function bucketAt(window, sample, hour) {
  return {
    day: window.day,
    date: window.date,
    samplePointId: sample.samplePointId,
    startLocal: hour.bucketStartLocal,
    endLocalExclusive: hour.bucketEndLocal,
  }
}

function windowAt(window, sample) {
  return {
    day: window.day,
    date: window.date,
    samplePointId: sample.samplePointId,
    startLocal: window.startLocal,
    endLocalExclusive: window.endLocalExclusive,
  }
}

function isAdjacentHour(previous, next) {
  return Date.parse(`${next.bucketStartLocal}:00Z`) - Date.parse(`${previous.bucketStartLocal}:00Z`) === 3600000
}

function isMoreHazardous(candidate, current) {
  if (!candidate.comparison) return false
  return candidate.comparison === 'max'
    ? candidate.comparisonValue > current.comparisonValue
    : candidate.comparisonValue < current.comparisonValue
}

function compareReasons(left, right) {
  const severity = (left.severity === 'no_go' ? 0 : 1) - (right.severity === 'no_go' ? 0 : 1)
  if (severity !== 0) return severity
  if (left.at.day !== right.at.day) return left.at.day - right.at.day
  const start = left.at.startLocal.localeCompare(right.at.startLocal)
  if (start !== 0) return start
  if (left.order.sampleIndex !== right.order.sampleIndex) return left.order.sampleIndex - right.order.sampleIndex
  return CODE_INDEX.get(left.code) - CODE_INDEX.get(right.code)
}

function reasonCandidate({
  code,
  severity,
  at,
  observed,
  order,
  comparison = undefined,
  comparisonValue = undefined,
}) {
  return {
    code,
    severity,
    at,
    observed,
    order,
    comparison,
    comparisonValue,
    message: MESSAGES[code],
  }
}

function evaluateWeatherVerdict(snapshot) {
  if (!snapshot || snapshot.ok !== true || snapshot.dataStatus !== 'complete') {
    throw new TypeError('complete weather snapshot required')
  }

  const selectedByDayAndCode = new Map()
  const select = (candidate) => {
    const key = `${candidate.at.day}:${candidate.code}`
    const current = selectedByDayAndCode.get(key)
    if (!current || isMoreHazardous(candidate, current)) selectedByDayAndCode.set(key, candidate)
  }

  for (const [windowIndex, window] of snapshot.evaluatedWindows.entries()) {
    for (const [sampleIndex, sample] of window.samples.entries()) {
      const order = { windowIndex, sampleIndex }
      const hours = sample.hours

      for (const hour of hours) {
        const at = bucketAt(window, sample, hour)
        const snowWithWind = HEAVY_SNOW_CODES.has(hour.weatherCode) && hour.windGustMs >= 13.4
        const snowWithLowVisibility = HEAVY_SNOW_CODES.has(hour.weatherCode) && hour.visibilityM <= 50

        if (THUNDERSTORM_CODES.has(hour.weatherCode)) {
          select(reasonCandidate({
            code: 'thunderstorm', severity: 'no_go', at,
            observed: { weatherCode: hour.weatherCode }, order,
          }))
        }
        if (FREEZING_RAIN_CODES.has(hour.weatherCode)) {
          select(reasonCandidate({
            code: 'freezing_rain', severity: 'no_go', at,
            observed: { weatherCode: hour.weatherCode }, order,
          }))
        }
        if (hour.windGustMs >= 22) {
          select(reasonCandidate({
            code: 'extreme_wind_gust', severity: 'no_go', at,
            observed: { windGustMs: hour.windGustMs, thresholdMs: 22 }, order,
            comparison: 'max', comparisonValue: hour.windGustMs,
          }))
        } else if (hour.windGustMs >= 13.4) {
          select(reasonCandidate({
            code: 'strong_wind_gust', severity: 'caution', at,
            observed: { windGustMs: hour.windGustMs, lowerMs: 13.4, upperMs: 22 }, order,
            comparison: 'max', comparisonValue: hour.windGustMs,
          }))
        }
        if (snowWithWind) {
          select(reasonCandidate({
            code: 'heavy_snow_with_wind', severity: 'no_go', at,
            observed: { weatherCode: hour.weatherCode, windGustMs: hour.windGustMs, thresholdMs: 13.4 }, order,
          }))
        }
        if (snowWithLowVisibility) {
          select(reasonCandidate({
            code: 'heavy_snow_with_low_visibility', severity: 'no_go', at,
            observed: { weatherCode: hour.weatherCode, visibilityM: hour.visibilityM, thresholdM: 50 }, order,
          }))
        }
        if (hour.apparentTemperatureC >= 41) {
          select(reasonCandidate({
            code: 'extreme_heat', severity: 'no_go', at,
            observed: { apparentTemperatureC: hour.apparentTemperatureC, thresholdC: 41 }, order,
            comparison: 'max', comparisonValue: hour.apparentTemperatureC,
          }))
        } else if (hour.apparentTemperatureC >= 32) {
          select(reasonCandidate({
            code: 'apparent_heat', severity: 'caution', at,
            observed: { apparentTemperatureC: hour.apparentTemperatureC, lowerC: 32, upperC: 41 }, order,
            comparison: 'max', comparisonValue: hour.apparentTemperatureC,
          }))
        } else if (hour.apparentTemperatureC <= -29) {
          select(reasonCandidate({
            code: 'extreme_cold', severity: 'no_go', at,
            observed: { apparentTemperatureC: hour.apparentTemperatureC, thresholdC: -29 }, order,
            comparison: 'min', comparisonValue: hour.apparentTemperatureC,
          }))
        } else if (hour.apparentTemperatureC <= 0) {
          select(reasonCandidate({
            code: 'apparent_cold', severity: 'caution', at,
            observed: { apparentTemperatureC: hour.apparentTemperatureC, lowerC: -29, upperC: 0 }, order,
            comparison: 'min', comparisonValue: hour.apparentTemperatureC,
          }))
        }
        if (hour.visibilityM <= 50 && !snowWithLowVisibility) {
          select(reasonCandidate({
            code: 'low_visibility', severity: 'caution', at,
            observed: { visibilityM: hour.visibilityM, thresholdM: 50 }, order,
            comparison: 'min', comparisonValue: hour.visibilityM,
          }))
        }
        if (RAIN_OR_SNOW_CODES.has(hour.weatherCode) && !snowWithWind && !snowWithLowVisibility) {
          select(reasonCandidate({
            code: 'rain_or_snow', severity: 'caution', at,
            observed: { weatherCode: hour.weatherCode }, order,
          }))
        }
      }

      let consecutiveRain = []
      for (const hour of hours) {
        if (!HEAVY_RAIN_CODES.has(hour.weatherCode)) {
          consecutiveRain = []
          continue
        }
        consecutiveRain = consecutiveRain.length > 0 && isAdjacentHour(consecutiveRain.at(-1), hour)
          ? [...consecutiveRain, hour]
          : [hour]
        if (consecutiveRain.length === 3) {
          const first = consecutiveRain[0]
          const third = consecutiveRain[2]
          select(reasonCandidate({
            code: 'heavy_rain_three_hours', severity: 'caution',
            at: { ...bucketAt(window, sample, first), endLocalExclusive: third.bucketEndLocal },
            observed: { weatherCodes: consecutiveRain.map((item) => item.weatherCode), consecutiveBuckets: 3 },
            order,
          }))
          break
        }
      }

      const precipitationMm = hours.reduce((sum, hour) => sum + hour.precipitationMm, 0)
      if (precipitationMm >= 40) {
        select(reasonCandidate({
          code: 'activity_window_precipitation', severity: 'caution', at: windowAt(window, sample),
          observed: { precipitationMm, thresholdMm: 40, bucketCount: hours.length }, order,
          comparison: 'max', comparisonValue: precipitationMm,
        }))
      }
      const snowfallCm = hours.reduce((sum, hour) => sum + hour.snowfallCm, 0)
      if (snowfallCm >= 15) {
        select(reasonCandidate({
          code: 'activity_window_snowfall', severity: 'no_go', at: windowAt(window, sample),
          observed: { snowfallCm, thresholdCm: 15, bucketCount: hours.length }, order,
          comparison: 'max', comparisonValue: snowfallCm,
        }))
      }
    }
  }

  const reasons = [...selectedByDayAndCode.values()]
    .sort(compareReasons)
    .map(({ order, comparison, comparisonValue, ...reason }) => reason)
  const verdict = reasons.some((item) => item.severity === 'no_go')
    ? 'no_go'
    : reasons.some((item) => item.severity === 'caution') ? 'caution' : 'go'
  return { verdict, dataStatus: 'complete', reasons }
}

module.exports = { evaluateWeatherVerdict }
