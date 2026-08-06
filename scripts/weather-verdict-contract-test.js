/**
 * I15 TP-VERDICT-1 weather-only contract (offline only).
 *
 * Every input snapshot crosses I14's injected fetchRouteWeather seam before
 * entering the pure I15 evaluator. The test never constructs a second
 * production weather-snapshot shape or makes a network request.
 */
const assert = require('node:assert/strict')
const { createRouteCatalog } = require('../cloudfunctions/getAdvice/domain/route-catalog')
const { fetchRouteWeather } = require('../cloudfunctions/getAdvice/hourly-weather')
const { clone, makeCatalogInput, makeHourlyResponse } = require('./fixtures/open-meteo-hourly')
const { evaluateWeatherVerdict } = require('../cloudfunctions/getAdvice/weather-verdict')

const FIXED_NOW = new Date('2026-08-06T00:00:00.000Z')
const SAMPLE_ID_BY_ELEVATION = {
  1810: 'sample-a',
  2200: 'sample-b',
  2600: 'sample-c',
}
const MESSAGE_BY_CODE = {
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

function getParam(url, name) {
  return new URL(url).searchParams.get(name)
}

function nextHour(localTime) {
  const value = new Date(`${localTime}:00Z`)
  value.setUTCHours(value.getUTCHours() + 1)
  return value.toISOString().slice(0, 16)
}

function sampleIdForUrl(url) {
  return SAMPLE_ID_BY_ELEVATION[Number(getParam(url, 'elevation'))]
}

function makeVariant(configure) {
  const input = makeCatalogInput()
  if (configure) configure(input.variants[0])
  return createRouteCatalog(input).getById('variant:hourly-fixture')
}

function setBucket(response, bucketStartLocal, values) {
  const startIndex = response.hourly.time.indexOf(bucketStartLocal)
  const endIndex = response.hourly.time.indexOf(nextHour(bucketStartLocal))
  assert.notEqual(startIndex, -1, `fixture must contain ${bucketStartLocal}`)
  assert.notEqual(endIndex, -1, `fixture must contain ${nextHour(bucketStartLocal)}`)
  const startFields = {
    apparentTemperatureC: 'apparent_temperature',
    weatherCode: 'weather_code',
    visibilityM: 'visibility',
  }
  const endFields = {
    precipitationProbabilityPct: 'precipitation_probability',
    precipitationMm: 'precipitation',
    snowfallCm: 'snowfall',
    windGustMs: 'wind_gusts_10m',
  }
  for (const [field, upstream] of Object.entries(startFields)) {
    if (Object.hasOwn(values, field)) response.hourly[upstream][startIndex] = values[field]
  }
  for (const [field, upstream] of Object.entries(endFields)) {
    if (Object.hasOwn(values, field)) response.hourly[upstream][endIndex] = values[field]
  }
}

function setAll(response, upstreamField, value) {
  response.hourly[upstreamField].fill(value)
}

async function completeSnapshot({ variant = makeVariant(), date = '2026-08-06', startTimeLocal = '07:30', mutate } = {}) {
  const result = await fetchRouteWeather(
    { variant, date, startTimeLocal },
    {
      now: FIXED_NOW,
      requestJson: async (url) => {
        const response = makeHourlyResponse({
          startDate: getParam(url, 'start_date'),
          endDate: getParam(url, 'end_date'),
        })
        if (mutate) mutate(response, sampleIdForUrl(url))
        return response
      },
    },
  )
  assert.equal(result.ok, true)
  assert.equal(result.dataStatus, 'complete')
  return result
}

function assertMessages(result) {
  for (const reason of result.reasons) {
    assert.equal(reason.message, MESSAGE_BY_CODE[reason.code], `${reason.code} uses its frozen message`)
  }
}

function resultFor(snapshot) {
  const result = evaluateWeatherVerdict(snapshot)
  assert.equal(result.dataStatus, 'complete')
  assertMessages(result)
  return result
}

function codes(result) {
  return result.reasons.map((reason) => reason.code)
}

function reason(result, code) {
  const found = result.reasons.find((item) => item.code === code)
  assert(found, `expected reason ${code}; got ${codes(result).join(', ')}`)
  return found
}

async function testSafeAndNonCompleteBoundary() {
  const snapshot = await completeSnapshot()
  const before = clone(snapshot)
  const first = resultFor(snapshot)
  const second = resultFor(snapshot)
  assert.deepEqual(first, { verdict: 'go', dataStatus: 'complete', reasons: [] })
  assert.deepEqual(second, first, 'repeated calls are deterministic')
  assert.deepEqual(snapshot, before, 'I15 must not mutate the I14 snapshot')

  const probabilityOnly = await completeSnapshot({
    mutate(response, sampleId) {
      if (sampleId === 'sample-b') setBucket(response, '2026-08-06T07:00', { precipitationProbabilityPct: 100 })
    },
  })
  assert.equal(resultFor(probabilityOnly).verdict, 'go', 'probability alone does not change a verdict')

  assert.throws(
    () => evaluateWeatherVerdict({ ok: true, dataStatus: 'insufficient' }),
    new TypeError('complete weather snapshot required'),
  )
}

async function testWindTemperatureAndVisibilityBoundaries() {
  const windCases = [
    [13.399, 'go', []],
    [13.4, 'caution', ['strong_wind_gust']],
    [21.999, 'caution', ['strong_wind_gust']],
    [22, 'no_go', ['extreme_wind_gust']],
  ]
  for (const [windGustMs, verdict, expectedCodes] of windCases) {
    const snapshot = await completeSnapshot({
      mutate(response, sampleId) {
        if (sampleId === 'sample-b') setBucket(response, '2026-08-06T07:00', { windGustMs })
      },
    })
    const result = resultFor(snapshot)
    assert.equal(result.verdict, verdict, `gust ${windGustMs}`)
    assert.deepEqual(codes(result), expectedCodes)
    if (expectedCodes.length) {
      assert.deepEqual(reason(result, expectedCodes[0]).observed, windGustMs === 22
        ? { windGustMs, thresholdMs: 22 }
        : { windGustMs, lowerMs: 13.4, upperMs: 22 })
      if (windGustMs === 22) {
        assert.deepEqual(reason(result, 'extreme_wind_gust').at, {
          day: 1,
          date: '2026-08-06',
          samplePointId: 'sample-b',
          startLocal: '2026-08-06T07:00',
          endLocalExclusive: '2026-08-06T08:00',
        }, 'single-bucket scalar reasons retain their bucket span')
      }
    }
  }

  const temperatureCases = [
    [31.999, 'go', null],
    [32, 'caution', 'apparent_heat'],
    [40.999, 'caution', 'apparent_heat'],
    [41, 'no_go', 'extreme_heat'],
    [-29.001, 'no_go', 'extreme_cold'],
    [-29, 'no_go', 'extreme_cold'],
    [-28.999, 'caution', 'apparent_cold'],
    [0, 'caution', 'apparent_cold'],
  ]
  for (const [apparentTemperatureC, verdict, expectedCode] of temperatureCases) {
    const snapshot = await completeSnapshot({
      mutate(response, sampleId) {
        if (sampleId === 'sample-b') setBucket(response, '2026-08-06T07:00', { apparentTemperatureC })
      },
    })
    const result = resultFor(snapshot)
    assert.equal(result.verdict, verdict, `apparent temperature ${apparentTemperatureC}`)
    assert.equal(expectedCode ? reason(result, expectedCode).observed.apparentTemperatureC : result.reasons.length, expectedCode ? apparentTemperatureC : 0)
  }

  for (const [visibilityM, verdict, expectedCodes] of [
    [50.001, 'go', []],
    [50, 'caution', ['low_visibility']],
  ]) {
    const snapshot = await completeSnapshot({
      mutate(response, sampleId) {
        if (sampleId === 'sample-b') setBucket(response, '2026-08-06T07:00', { visibilityM })
      },
    })
    const result = resultFor(snapshot)
    assert.equal(result.verdict, verdict, `visibility ${visibilityM}`)
    assert.deepEqual(codes(result), expectedCodes)
  }
}

async function testWmoAndHeavySnowRules() {
  for (const weatherCode of [95, 96, 99]) {
    const snapshot = await completeSnapshot({
      mutate(response, sampleId) {
        if (sampleId === 'sample-b') setBucket(response, '2026-08-06T07:00', { weatherCode })
      },
    })
    const result = resultFor(snapshot)
    assert.equal(result.verdict, 'no_go')
    assert.deepEqual(codes(result), ['thunderstorm'])
    assert.deepEqual(reason(result, 'thunderstorm').observed, { weatherCode })
  }

  for (const weatherCode of [56, 57, 66, 67]) {
    const snapshot = await completeSnapshot({
      mutate(response, sampleId) {
        if (sampleId === 'sample-b') setBucket(response, '2026-08-06T07:00', { weatherCode })
      },
    })
    const result = resultFor(snapshot)
    assert.equal(result.verdict, 'no_go')
    assert.deepEqual(codes(result), ['freezing_rain'])
  }

  for (const weatherCode of [51, 53, 55, 61, 63, 65, 71, 73, 75, 77, 80, 81, 82, 85, 86]) {
    const snapshot = await completeSnapshot({
      mutate(response, sampleId) {
        if (sampleId === 'sample-b') setBucket(response, '2026-08-06T07:00', { weatherCode })
      },
    })
    const result = resultFor(snapshot)
    assert.equal(result.verdict, 'caution')
    assert.deepEqual(codes(result), ['rain_or_snow'])
  }

  const withWind = resultFor(await completeSnapshot({
    mutate(response, sampleId) {
      if (sampleId === 'sample-b') setBucket(response, '2026-08-06T07:00', { weatherCode: 73, windGustMs: 13.4 })
    },
  }))
  assert.equal(withWind.verdict, 'no_go')
  assert(codes(withWind).includes('heavy_snow_with_wind'))
  assert(codes(withWind).includes('strong_wind_gust'), 'wind is still its own caution fact')
  assert.equal(codes(withWind).includes('rain_or_snow'), false, 'heavy snow combination suppresses generic snow in its bucket')

  const withLowVisibility = resultFor(await completeSnapshot({
    mutate(response, sampleId) {
      if (sampleId === 'sample-b') setBucket(response, '2026-08-06T07:00', { weatherCode: 73, visibilityM: 50 })
    },
  }))
  assert.equal(withLowVisibility.verdict, 'no_go')
  assert.deepEqual(codes(withLowVisibility), ['heavy_snow_with_low_visibility'])
  assert.deepEqual(reason(withLowVisibility, 'heavy_snow_with_low_visibility').observed, {
    weatherCode: 73,
    visibilityM: 50,
    thresholdM: 50,
  })
}

async function testConsecutiveRain() {
  async function rainResult(hoursBySample, { variant, startTimeLocal } = {}) {
    return resultFor(await completeSnapshot({
      variant,
      startTimeLocal,
      mutate(response, sampleId) {
        for (const localTime of hoursBySample[sampleId] || []) setBucket(response, localTime, { weatherCode: 65 })
      },
    }))
  }

  const two = await rainResult({ 'sample-b': ['2026-08-06T07:00', '2026-08-06T08:00'] })
  assert.equal(codes(two).includes('heavy_rain_three_hours'), false)

  const three = await rainResult({ 'sample-b': ['2026-08-06T07:00', '2026-08-06T08:00', '2026-08-06T09:00'] })
  const heavy = reason(three, 'heavy_rain_three_hours')
  assert.deepEqual(heavy.observed, { weatherCodes: [65, 65, 65], consecutiveBuckets: 3 })
  assert.deepEqual(heavy.at, {
    day: 1,
    date: '2026-08-06',
    samplePointId: 'sample-b',
    startLocal: '2026-08-06T07:00',
    endLocalExclusive: '2026-08-06T10:00',
  })

  const interrupted = await rainResult({ 'sample-b': ['2026-08-06T07:00', '2026-08-06T09:00', '2026-08-06T10:00'] })
  assert.equal(codes(interrupted).includes('heavy_rain_three_hours'), false)

  const acrossSamples = await rainResult({
    'sample-b': ['2026-08-06T07:00', '2026-08-06T08:00'],
    'sample-a': ['2026-08-06T09:00'],
  })
  assert.equal(codes(acrossSamples).includes('heavy_rain_three_hours'), false)

  const acrossStages = await rainResult({
    'sample-b': ['2026-08-06T10:00', '2026-08-06T11:00', '2026-08-07T07:00'],
  })
  assert.equal(codes(acrossStages).includes('heavy_rain_three_hours'), false, 'separate route stages never form one rain run')

  const crossMidnightVariant = makeVariant((variant) => {
    variant.fixedDays = 1
    variant.stages = [clone(variant.stages[0])]
    variant.stages[0].durationHours = { min: 1, max: 3 }
    variant.stages[0].weatherSamplePointIds = ['sample-b']
  })
  const crossMidnight = await rainResult({
    'sample-b': ['2026-08-06T23:00', '2026-08-07T00:00', '2026-08-07T01:00'],
  }, { variant: crossMidnightVariant, startTimeLocal: '23:30' })
  assert.deepEqual(reason(crossMidnight, 'heavy_rain_three_hours').at, {
    day: 1,
    date: '2026-08-06',
    samplePointId: 'sample-b',
    startLocal: '2026-08-06T23:00',
    endLocalExclusive: '2026-08-07T02:00',
  }, 'one stage may retain a heavy-rain run across midnight')
}

async function testActivityWindowAccumulations() {
  async function totalResult({ precipitationMm, snowfallCm, variant, startTimeLocal = '07:30' }) {
    return resultFor(await completeSnapshot({
      variant,
      startTimeLocal,
      mutate(response, sampleId) {
        if (sampleId !== 'sample-b') return
        setAll(response, 'precipitation', 0)
        setAll(response, 'snowfall', 0)
        setBucket(response, startTimeLocal === '23:30' ? '2026-08-06T23:00' : '2026-08-06T07:00', {
          precipitationMm,
          snowfallCm,
        })
      },
    }))
  }

  const noPrecipitationWarning = await totalResult({ precipitationMm: 39.999, snowfallCm: 0 })
  assert.equal(codes(noPrecipitationWarning).includes('activity_window_precipitation'), false)
  const precipitationWarning = await totalResult({ precipitationMm: 40, snowfallCm: 0 })
  const precipitationReason = reason(precipitationWarning, 'activity_window_precipitation')
  assert.deepEqual(precipitationReason.observed, {
    precipitationMm: 40,
    thresholdMm: 40,
    bucketCount: 5,
  })
  assert.deepEqual(precipitationReason.at, {
    day: 1,
    date: '2026-08-06',
    samplePointId: 'sample-b',
    startLocal: '2026-08-06T07:30',
    endLocalExclusive: '2026-08-06T11:30',
  }, 'accumulation reasons retain their owning window span')

  const noSnowBlock = await totalResult({ precipitationMm: 0, snowfallCm: 14.999 })
  assert.equal(codes(noSnowBlock).includes('activity_window_snowfall'), false)
  const snowBlock = await totalResult({ precipitationMm: 0, snowfallCm: 15 })
  assert.deepEqual(reason(snowBlock, 'activity_window_snowfall').observed, {
    snowfallCm: 15,
    thresholdCm: 15,
    bucketCount: 5,
  })

  const crossMidnightVariant = makeVariant((variant) => {
    variant.fixedDays = 1
    variant.stages = [clone(variant.stages[0])]
    variant.stages[0].durationHours = { min: 1, max: 3 }
    variant.stages[0].weatherSamplePointIds = ['sample-b']
  })
  const crossMidnight = resultFor(await completeSnapshot({
    variant: crossMidnightVariant,
    startTimeLocal: '23:30',
    mutate(response, sampleId) {
      if (sampleId !== 'sample-b') return
      setAll(response, 'snowfall', 0)
      for (const localTime of ['2026-08-06T23:00', '2026-08-07T00:00', '2026-08-07T01:00']) {
        setBucket(response, localTime, { snowfallCm: 5 })
      }
    },
  }))
  assert.equal(crossMidnight.verdict, 'no_go')
  assert.deepEqual(reason(crossMidnight, 'activity_window_snowfall').observed, {
    snowfallCm: 15,
    thresholdCm: 15,
    bucketCount: 4,
  })

  const splitAcrossSamples = resultFor(await completeSnapshot({
    mutate(response, sampleId) {
      setAll(response, 'snowfall', 0)
      if (sampleId === 'sample-b' || sampleId === 'sample-a') {
        setBucket(response, '2026-08-06T07:00', { snowfallCm: 8 })
      }
    },
  }))
  assert.equal(codes(splitAcrossSamples).includes('activity_window_snowfall'), false)

  const splitAcrossStages = resultFor(await completeSnapshot({
    mutate(response, sampleId) {
      if (sampleId !== 'sample-b') return
      setAll(response, 'snowfall', 0)
      setBucket(response, '2026-08-06T07:00', { snowfallCm: 8 })
      setBucket(response, '2026-08-07T07:00', { snowfallCm: 8 })
    },
  }))
  assert.equal(codes(splitAcrossStages).includes('activity_window_snowfall'), false)
}

async function testDedupSelectionAndSorting() {
  const snapshot = await completeSnapshot({
    mutate(response, sampleId) {
      if (sampleId === 'sample-b') {
        setBucket(response, '2026-08-06T07:00', { weatherCode: 95, windGustMs: 22, apparentTemperatureC: 41, visibilityM: 50 })
        setBucket(response, '2026-08-07T07:00', { weatherCode: 95 })
      }
      if (sampleId === 'sample-a') setBucket(response, '2026-08-06T08:00', { windGustMs: 25 })
    },
  })
  const result = resultFor(snapshot)
  assert.equal(result.verdict, 'no_go')
  assert.deepEqual(codes(result), [
    'thunderstorm',
    'extreme_heat',
    'extreme_wind_gust',
    'thunderstorm',
    'low_visibility',
  ], 'no_go reasons sort before caution, then by day/time/sample/frozen code order')
  const winds = result.reasons.filter((item) => item.code === 'extreme_wind_gust')
  assert.equal(winds.length, 1, 'same-day numeric codes deduplicate')
  assert.equal(winds[0].at.samplePointId, 'sample-a', 'more dangerous same-day gust retains its own location')
  assert.deepEqual(winds[0].observed, { windGustMs: 25, thresholdMs: 22 })
  assert.deepEqual(winds[0].at, {
    day: 1,
    date: '2026-08-06',
    samplePointId: 'sample-a',
    startLocal: '2026-08-06T08:00',
    endLocalExclusive: '2026-08-06T09:00',
  }, 'numeric representative keeps observed and at from the same candidate')
  assert.equal(result.reasons.filter((item) => item.code === 'thunderstorm').length, 2, 'cross-day WMO reasons are retained')
}

async function main() {
  await testSafeAndNonCompleteBoundary()
  await testWindTemperatureAndVisibilityBoundaries()
  await testWmoAndHeavySnowRules()
  await testConsecutiveRain()
  await testActivityWindowAccumulations()
  await testDedupSelectionAndSorting()
  console.log('PASS: I15 weather verdict contract')
}

main().catch((error) => {
  console.error('FAIL: ' + error.message)
  process.exitCode = 1
})
