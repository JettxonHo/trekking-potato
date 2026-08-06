/**
 * I14 route hourly-weather contract (offline only).
 *
 * The fixture crosses the public I07 catalog seam before calling the frozen
 * internal fetchRouteWeather interface. requestJson is the Open-Meteo system
 * boundary; no live request is made by this script.
 */
const assert = require('node:assert/strict')
const { createRouteCatalog } = require('../cloudfunctions/getAdvice/domain/route-catalog')
const {
  HOURLY_FIELDS,
  clone,
  makeCatalogInput,
  makeHourlyResponse,
} = require('./fixtures/open-meteo-hourly')
const { fetchRouteWeather } = require('../cloudfunctions/getAdvice/hourly-weather')
const { fetchRouteWeather: fetchRouteWeatherFromWeather } = require('../cloudfunctions/getAdvice/weather')

const HOURLY_PARAMETER = HOURLY_FIELDS.join(',')
const FIXED_NOW = new Date('2026-08-06T00:00:00.000Z')
const EXPECTED_UNITS = {
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
const INSUFFICIENT_WINDOW_KEYS = [
  'date',
  'day',
  'durationHoursMax',
  'endLocalExclusive',
  'samplePointIds',
  'startLocal',
]

function getFixtureVariant() {
  const input = makeCatalogInput()
  const snapshot = clone(input)
  const catalog = createRouteCatalog(input)
  assert.deepEqual(input, snapshot, 'synthetic I07 catalog input must not be modified')
  return catalog.getById('variant:hourly-fixture')
}

function getParam(url, name) {
  return new URL(url).searchParams.get(name)
}

function responseFor(url) {
  return makeHourlyResponse({
    startDate: getParam(url, 'start_date'),
    endDate: getParam(url, 'end_date'),
  })
}

function responseIndex(response, localTime) {
  return response.hourly.time.indexOf(localTime)
}

function requestByElevation(handlers, calls, responses) {
  return async (url) => {
    calls.push(url)
    const elevation = getParam(url, 'elevation')
    const response = handlers[elevation]
      ? handlers[elevation](url)
      : responseFor(url)
    if (response && typeof response.then !== 'function') responses.push(response)
    return response
  }
}

function assertInsufficient(result, expectedReasons) {
  assert.equal(result.ok, true)
  assert.equal(result.dataStatus, 'insufficient')
  assert.equal(result.source, 'Open-Meteo')
  assert.equal(result.timezone, 'Asia/Shanghai')
  assert.deepEqual(result.insufficientReasons, expectedReasons)
  assert.equal(result.retryable, expectedReasons.some((reason) => reason.retryable))
  assert.equal(Object.hasOwn(result, 'units'), false, 'insufficient must not expose normalized weather units')
  for (const window of result.evaluatedWindows) {
    assert.deepEqual(Object.keys(window).sort(), INSUFFICIENT_WINDOW_KEYS)
    assert.equal(Object.hasOwn(window, 'samples'), false)
    assert.equal(Object.hasOwn(window, 'hours'), false)
    assert.equal(Object.hasOwn(window, 'requestCoordinate'), false)
  }
  assert.equal(JSON.stringify(result).includes('temperatureC'), false, 'insufficient must not leak partial readings')
}

async function testCompleteSnapshotAndRequests() {
  const variant = getFixtureVariant()
  const variantBefore = clone(variant)
  const calls = []
  const responses = []
  const responseSnapshots = []
  const requestJson = async (url) => {
    calls.push(url)
    const response = responseFor(url)
    responses.push(response)
    responseSnapshots.push(clone(response))
    return response
  }

  const result = await fetchRouteWeather(
    { variant, date: '2026-08-06', startTimeLocal: '07:30' },
    { now: FIXED_NOW, requestJson },
  )

  assert.deepEqual(variant, variantBefore, 'route weather must not mutate catalog output')
  assert.deepEqual(responses, responseSnapshots, 'route weather must not mutate upstream responses')
  assert.equal(result.ok, true)
  assert.equal(result.dataStatus, 'complete')
  assert.equal(result.source, 'Open-Meteo')
  assert.equal(result.fetchedAt, FIXED_NOW.toISOString())
  assert.equal(result.timezone, 'Asia/Shanghai')
  assert.deepEqual(result.units, EXPECTED_UNITS)
  assert.equal(Object.hasOwn(result, 'verdict'), false, 'I14 must not calculate a verdict')

  assert.equal(calls.length, 3, 'three unique referenced samples make exactly three requests')
  assert.equal(calls.filter((url) => getParam(url, 'elevation') === '2200').length, 1, 'shared B sample is requested once')
  for (const url of calls) {
    const parsed = new URL(url)
    assert.equal(parsed.origin + parsed.pathname, 'https://api.open-meteo.com/v1/forecast')
    assert.equal(parsed.searchParams.get('hourly'), HOURLY_PARAMETER)
    assert.equal(parsed.searchParams.get('timezone'), 'Asia/Shanghai')
    assert.equal(parsed.searchParams.get('temperature_unit'), 'celsius')
    assert.equal(parsed.searchParams.get('precipitation_unit'), 'mm')
    assert.equal(parsed.searchParams.get('wind_speed_unit'), 'ms')
    assert.equal(parsed.searchParams.get('timeformat'), 'iso8601')
    assert.equal(parsed.searchParams.has('daily'), false)
  }

  const callByElevation = new Map(calls.map((url) => [getParam(url, 'elevation'), url]))
  assert.equal(getParam(callByElevation.get('2200'), 'latitude'), '30', 'WGS84 latitude is used unchanged')
  assert.equal(getParam(callByElevation.get('2200'), 'longitude'), '100', 'WGS84 longitude is used unchanged')
  assert.equal(getParam(callByElevation.get('2200'), 'start_date'), '2026-08-06')
  assert.equal(getParam(callByElevation.get('2200'), 'end_date'), '2026-08-07')
  assert.equal(getParam(callByElevation.get('1810'), 'start_date'), '2026-08-06')
  assert.equal(getParam(callByElevation.get('1810'), 'end_date'), '2026-08-06')
  assert.equal(getParam(callByElevation.get('2600'), 'start_date'), '2026-08-07')
  assert.equal(getParam(callByElevation.get('2600'), 'end_date'), '2026-08-07')
  assert(Math.abs(Number(getParam(callByElevation.get('1810'), 'latitude')) - 39.91359571849836) < 1e-9, 'GCJ-02 latitude uses known WGS84 conversion')
  assert(Math.abs(Number(getParam(callByElevation.get('1810'), 'longitude')) - 116.39775550083061) < 1e-9, 'GCJ-02 longitude uses known WGS84 conversion')

  assert.deepEqual(result.evaluatedWindows.map((window) => window.day), [1, 2], 'windows retain stage-day order')
  assert.deepEqual(result.evaluatedWindows[0].samples.map((sample) => sample.samplePointId), ['sample-b', 'sample-a'], 'D1 samples retain stage order')
  assert.deepEqual(result.evaluatedWindows[1].samples.map((sample) => sample.samplePointId), ['sample-c', 'sample-b'], 'D2 samples retain stage order')
  assert.deepEqual(result.evaluatedWindows[0].samples[0].requestCoordinate, { lat: 30, lon: 100, coordinateSystem: 'WGS84' })
  assert.equal(result.evaluatedWindows[0].startLocal, '2026-08-06T07:30')
  assert.equal(result.evaluatedWindows[0].endLocalExclusive, '2026-08-06T11:30')
  assert.equal(result.evaluatedWindows[0].durationHoursMax, 4)
  assert.deepEqual(result.evaluatedWindows[0].samples[0].hours.map((hour) => hour.bucketStartLocal), [
    '2026-08-06T07:00',
    '2026-08-06T08:00',
    '2026-08-06T09:00',
    '2026-08-06T10:00',
    '2026-08-06T11:00',
  ], 'non-whole-hour activity window includes every intersecting bucket and no night data')

  const firstBucket = result.evaluatedWindows[0].samples[0].hours[0]
  assert.deepEqual(firstBucket, {
    bucketStartLocal: '2026-08-06T07:00',
    bucketEndLocal: '2026-08-06T08:00',
    temperatureC: 17,
    apparentTemperatureC: 12,
    precipitationProbabilityPct: 8,
    precipitationMm: 0.8,
    snowfallCm: 0.08,
    weatherCode: 3,
    visibilityM: 1007,
    windSpeedMs: 2.7,
    windGustMs: 4.8,
    freezingLevelHeightM: 2507,
  }, 'bucket reads instantaneous fields at its start and previous-hour fields at its end')
}

async function testExactEndAndCrossMidnight() {
  const variant = getFixtureVariant()
  variant.stages = [clone(variant.stages[0])]
  variant.fixedDays = 1
  variant.stages[0].durationHours = { min: 1, max: 5 }
  variant.stages[0].weatherSamplePointIds = ['sample-b']
  const exactCalls = []
  const exactEnd = await fetchRouteWeather(
    { variant, date: '2026-08-06', startTimeLocal: '07:00' },
    { now: FIXED_NOW, requestJson: async (url) => { exactCalls.push(url); return responseFor(url) } },
  )
  assert.equal(exactCalls.length, 1, 'a stage requests only its referenced sample')
  assert.equal(exactCalls.some((url) => ['1810', '2600'].includes(getParam(url, 'elevation'))), false, 'unreferenced samples make zero requests')
  assert.deepEqual(exactEnd.evaluatedWindows[0].samples[0].hours.map((hour) => hour.bucketStartLocal), [
    '2026-08-06T07:00',
    '2026-08-06T08:00',
    '2026-08-06T09:00',
    '2026-08-06T10:00',
    '2026-08-06T11:00',
  ], 'exact activity end does not include the following bucket')

  variant.stages[0].durationHours = { min: 1, max: 2 }
  const calls = []
  const midnight = await fetchRouteWeather(
    { variant, date: '2026-08-06', startTimeLocal: '23:30' },
    { now: FIXED_NOW, requestJson: async (url) => { calls.push(url); return responseFor(url) } },
  )
  assert.equal(getParam(calls[0], 'start_date'), '2026-08-06')
  assert.equal(getParam(calls[0], 'end_date'), '2026-08-07', 'request covers start and end valid-time labels across midnight')
  assert.equal(midnight.evaluatedWindows[0].date, '2026-08-06', 'cross-midnight window remains owned by original stage day')
  assert.equal(midnight.evaluatedWindows[0].endLocalExclusive, '2026-08-07T01:30')
  assert.deepEqual(midnight.evaluatedWindows[0].samples[0].hours.map((hour) => hour.bucketStartLocal), [
    '2026-08-06T23:00',
    '2026-08-07T00:00',
    '2026-08-07T01:00',
  ])
}

async function testFractionalDurationUsesConservativeMinuteProjection() {
  const input = makeCatalogInput()
  const fixtureVariant = input.variants[0]
  fixtureVariant.fixedDays = 1
  fixtureVariant.stages = [clone(fixtureVariant.stages[0])]
  fixtureVariant.stages[0].durationHours = { min: 2, max: 4.125 }
  fixtureVariant.stages[0].weatherSamplePointIds = ['sample-b']
  const variant = createRouteCatalog(input).getById('variant:hourly-fixture')

  const result = await fetchRouteWeather(
    { variant, date: '2026-08-06', startTimeLocal: '07:30' },
    { now: FIXED_NOW, requestJson: async (url) => responseFor(url) },
  )

  assert.equal(result.dataStatus, 'complete')
  assert.equal(result.evaluatedWindows[0].durationHoursMax, 4.125, 'audit retains the I07 duration value')
  assert.equal(result.evaluatedWindows[0].endLocalExclusive, '2026-08-06T11:38', 'fractional I07 duration is conservatively normalized to a full local minute')
  assert.deepEqual(result.evaluatedWindows[0].samples[0].hours.map((hour) => hour.bucketStartLocal), [
    '2026-08-06T07:00',
    '2026-08-06T08:00',
    '2026-08-06T09:00',
    '2026-08-06T10:00',
    '2026-08-06T11:00',
  ], 'fractional-duration window retains all and only intersecting whole-hour buckets')
}

async function testExternalFailuresAreAtomic() {
  const variant = getFixtureVariant()
  const singleSampleVariant = clone(variant)
  singleSampleVariant.stages = [clone(singleSampleVariant.stages[0])]
  singleSampleVariant.fixedDays = 1
  singleSampleVariant.stages[0].weatherSamplePointIds = ['sample-b']

  const failureCases = [
    {
      name: 'wrong unit',
      mutate(response) { response.hourly_units.visibility = 'km' },
    },
    {
      name: 'array misalignment',
      mutate(response) { response.hourly.temperature_2m.pop() },
    },
    {
      name: 'required bucket missing',
      mutate(response) {
        const index = responseIndex(response, '2026-08-06T07:00')
        for (const field of ['time', ...HOURLY_FIELDS]) response.hourly[field].splice(index, 1)
      },
    },
    {
      name: 'non-numeric required value',
      mutate(response) { response.hourly.temperature_2m[responseIndex(response, '2026-08-06T07:00')] = 'not-a-number' },
    },
    {
      name: 'invalid WMO weather code',
      mutate(response) { response.hourly.weather_code[responseIndex(response, '2026-08-06T07:00')] = 999 },
    },
    {
      name: 'out-of-domain precipitation probability',
      mutate(response) { response.hourly.precipitation_probability[responseIndex(response, '2026-08-06T08:00')] = 101 },
    },
  ]

  for (const failureCase of failureCases) {
    const result = await fetchRouteWeather(
      { variant: singleSampleVariant, date: '2026-08-06', startTimeLocal: '07:30' },
      {
        now: FIXED_NOW,
        requestJson: async (url) => {
          const response = responseFor(url)
          failureCase.mutate(response)
          return response
        },
      },
    )
    assertInsufficient(result, [{ samplePointId: 'sample-b', code: 'weather_data_invalid', retryable: true }])
  }

  const calls = []
  const responses = []
  const unavailable = await fetchRouteWeather(
    { variant, date: '2026-08-06', startTimeLocal: '07:30' },
    {
      now: FIXED_NOW,
      requestJson: requestByElevation({
        '1810': () => Promise.reject(new Error('offline fixture network failure')),
      }, calls, responses),
    },
  )
  assert.equal(calls.length, 3, 'a necessary sample failure does not skip the other requested samples')
  assertInsufficient(unavailable, [{ samplePointId: 'sample-a', code: 'weather_unavailable', retryable: true }])

  const serviceFailure = await fetchRouteWeather(
    { variant: singleSampleVariant, date: '2026-08-06', startTimeLocal: '07:30' },
    {
      now: FIXED_NOW,
      requestJson: async () => ({ error: true, reason: 'Service temporarily unavailable' }),
    },
  )
  assertInsufficient(serviceFailure, [{ samplePointId: 'sample-b', code: 'weather_unavailable', retryable: true }])
  assert.equal(JSON.stringify(serviceFailure).includes('Service temporarily unavailable'), false, 'service reason is not exposed')

  const mixedCalls = []
  const mixedResponses = []
  const mixed = await fetchRouteWeather(
    { variant, date: '2026-08-06', startTimeLocal: '07:30' },
    {
      now: FIXED_NOW,
      requestJson: requestByElevation({
        '1810': () => ({ error: true, reason: 'start_date is out of allowed range' }),
        '2600': () => Promise.reject(new Error('offline fixture network failure')),
      }, mixedCalls, mixedResponses),
    },
  )
  assertInsufficient(mixed, [
    { samplePointId: 'sample-a', code: 'out_of_range', retryable: false },
    { samplePointId: 'sample-c', code: 'weather_unavailable', retryable: true },
  ])
}

async function testRequestBoundaryAndNoCloudBaseLoad() {
  const hourlyPath = require.resolve('../cloudfunctions/getAdvice/hourly-weather')
  const geocodePath = require.resolve('../cloudfunctions/getAdvice/geocode')
  assert.equal(require.cache[hourlyPath] !== undefined, true, 'hourly module is directly importable')
  assert.equal(require.cache[geocodePath], undefined, 'direct hourly import must not load CloudBase geocode module')

  const variant = getFixtureVariant()
  let calls = 0
  for (const input of [
    { variant, date: '2026-02-30', startTimeLocal: '07:30' },
    { variant, date: '2026-08-06', startTimeLocal: '7:30' },
    { variant: { ...variant, recordStatus: 'blocked', capability: 'blocked' }, date: '2026-08-06', startTimeLocal: '07:30' },
  ]) {
    const result = await fetchRouteWeather(input, {
      now: FIXED_NOW,
      requestJson: async () => { calls++; return responseFor('https://example.test/?start_date=2026-08-06&end_date=2026-08-06') },
    })
    assert.deepEqual(Object.keys(result).sort(), ['error', 'message', 'ok'])
    assert.equal(result.ok, false)
    assert.equal(result.error, 'invalid_route_weather_request')
  }
  assert.equal(calls, 0, 'invalid route-weather requests make no upstream request')
}

async function testWeatherModuleInternalEntry() {
  const variant = getFixtureVariant()
  const calls = []
  const result = await fetchRouteWeatherFromWeather(
    { variant, date: '2026-08-06', startTimeLocal: '07:30' },
    {
      now: FIXED_NOW,
      requestJson: async (url) => { calls.push(url); return responseFor(url) },
    },
  )
  assert.equal(result.dataStatus, 'complete', 'weather.js internal entry delegates injected adapter to the frozen hourly union')
  assert.equal(calls.length, 3, 'weather.js entry preserves the unique-sample request boundary')
}

async function main() {
  await testCompleteSnapshotAndRequests()
  await testExactEndAndCrossMidnight()
  await testFractionalDurationUsesConservativeMinuteProjection()
  await testExternalFailuresAreAtomic()
  await testRequestBoundaryAndNoCloudBaseLoad()
  await testWeatherModuleInternalEntry()
  console.log('PASS: I14 hourly-weather contract')
}

main().catch((error) => {
  console.error('FAIL: ' + error.message)
  process.exitCode = 1
})
