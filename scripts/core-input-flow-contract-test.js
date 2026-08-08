const assert = require('assert')
const { createTripBaseBuilder } = require('../cloudfunctions/getAdvice/trip-base')
const { evaluateTripVerdict } = require('../cloudfunctions/getAdvice/trip-verdict')
const { getGearRules } = require('../cloudfunctions/getAdvice/gear-rules')
const { createProductionRouteCatalog } = require('../cloudfunctions/getAdvice/data/catalog/runtime-catalog')

assert.strictEqual(typeof createTripBaseBuilder, 'function', 'trip-base must export createTripBaseBuilder')

function makeWeather(dataStatus = 'complete') {
  return {
    ok: true,
    source: 'Open-Meteo',
    fetchedAt: '2026-08-08T00:00:00.000Z',
    timezone: 'Asia/Shanghai',
    dataStatus,
    ...(dataStatus === 'complete' ? {
      evaluatedWindows: [{ day: 1, date: '2026-08-09', startLocal: '2026-08-09T08:00', endLocalExclusive: '2026-08-09T10:00', durationHoursMax: 2, samples: [{ samplePointId: 'sample', requestCoordinate: { lat: 30, lon: 100, coordinateSystem: 'WGS84' }, hours: [{ temperatureC: 12.2, precipitationProbabilityPct: 10, windSpeedMs: 3.4 }] }] }],
    } : {
      insufficientReasons: [{ code: 'weather_data_invalid', retryable: true }], evaluatedWindows: [],
    }),
  }
}

async function main() {
  const catalog = createProductionRouteCatalog()
  const variant = catalog.variants.find((item) => item.capability === 'full')
  const route = catalog.routes.find((item) => item.id === variant.routeId)
  const place = catalog.places.find((item) => item.id === route.placeId)
  const calls = { routeWeather: 0, referenceWeather: 0, verdict: 0, gear: 0, sunset: 0 }
  const builder = createTripBaseBuilder({
    fetchRouteWeather: async () => { calls.routeWeather++; return makeWeather('complete') },
    fetchReferenceWeather: async () => { calls.referenceWeather++; return { ok: true, elevationM: 1234, data: { days: [{ date: '2026-08-09', tempMin: 8, tempMax: 20, precipProb: 12, windMs: 4 }], source: 'Open-Meteo' } } },
    getReferenceSunEvents: async () => { calls.sunset++; return { sunrise: '06:00', sunset: '18:30' } },
    evaluateTripVerdict: (input) => { calls.verdict++; return evaluateTripVerdict(input) },
    getGearRules: (input) => { calls.gear++; return getGearRules(input) },
    now: () => new Date('2026-08-08T00:00:00.000Z'),
  })

  const full = await builder.build({ target: { ...variant, entityKind: 'route_variant', capability: 'full', routeVariant: variant, route, place, candidateId: variant.id }, request: { date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 99 } })
  assert.equal(full.kind, 'built')
  assert.equal(full.trustedBaseData.requestSummary.days, variant.fixedDays, 'full 必须忽略客户端 days')
  assert.equal(full.trustedBaseData.routeSnapshot.routeVariantId, variant.id)
  assert.equal(full.trustedBaseData.deterministicResult.dataStatus, 'complete')
  assert.equal(full.trustedBaseData.elevation, variant.routeHighestPointElevationM)
  assert.deepEqual(full.trustedBaseData.minimumGear, {
    essential: full.trustedBaseData.gearRules.essential,
    recommended: full.trustedBaseData.gearRules.recommended,
    optional: full.trustedBaseData.gearRules.optional,
  })

  const climb = catalog.variants.find((item) => {
    const routeItem = catalog.routes.find((candidate) => candidate.id === item.routeId)
    return item.capability === 'full' && routeItem.routeType === 'climb'
  })
  const climbRoute = catalog.routes.find((item) => item.id === climb.routeId)
  const climbPlace = catalog.places.find((item) => item.id === climbRoute.placeId)
  for (const support of ['solo_or_unsure', 'experienced_team', 'professional_guide']) {
    const supportedClimb = await builder.build({ target: { ...climb, entityKind: 'route_variant', capability: 'full', routeVariant: climb, route: climbRoute, place: climbPlace, candidateId: climb.id }, request: { date: '2026-08-09', startTimeLocal: '08:00', level: '中级', climbSupport: support } })
    assert.equal(supportedClimb.kind, 'built')
  }

  const insufficientBuilder = createTripBaseBuilder({
    fetchRouteWeather: async () => ({ ok: true, source: 'Open-Meteo', fetchedAt: '2026-08-08T00:00:00.000Z', timezone: 'Asia/Shanghai', dataStatus: 'insufficient', insufficientReasons: [{ code: 'out_of_range', retryable: false }], evaluatedWindows: [] }),
    getGearRules: (input) => getGearRules(input),
    evaluateTripVerdict,
    now: () => new Date('2026-08-08T00:00:00.000Z'),
  })
  const insufficient = await insufficientBuilder.build({ target: { ...variant, entityKind: 'route_variant', capability: 'full', routeVariant: variant, route, place, candidateId: variant.id }, request: { date: '2026-08-09', startTimeLocal: '08:00', level: '中级' } })
  assert.equal(insufficient.kind, 'built')
  assert.equal(insufficient.trustedBaseData.weatherSnapshot.dataStatus, 'insufficient')
  assert.equal(insufficient.trustedBaseData.deterministicResult.verdict, null)
  assert.equal(insufficient.trustedBaseData.weather, null)

  const placeOnly = await builder.build({ target: { entityKind: 'place', capability: 'place_only', origin: 'catalog', place, name: place.canonicalName, location: place.region, referenceCoordinate: place.referenceCoordinate, sourceIds: place.sourceIds }, request: { date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 2, routeType: 'trek' } })
  assert.equal(placeOnly.kind, 'built')
  assert.equal(placeOnly.trustedBaseData.routeSnapshot.capability, 'place_only')
  assert.equal(placeOnly.trustedBaseData.deterministicResult.verdict, null)
  assert.equal(calls.referenceWeather, 1)

  const blockedVariant = catalog.variants.find((item) => item.capability === 'blocked')
  const blockedRoute = catalog.routes.find((item) => item.id === blockedVariant.routeId)
  const blockedPlace = catalog.places.find((item) => item.id === blockedRoute.placeId)
  const beforeBlocked = { ...calls }
  const blocked = await builder.build({ target: { ...blockedVariant, entityKind: 'route_variant', capability: 'blocked', routeVariant: blockedVariant, route: blockedRoute, place: blockedPlace, candidateId: blockedVariant.id }, request: { date: '2026-08-09', startTimeLocal: '08:00', level: '小白', days: 99, climbSupport: 'invalid' } })
  assert.equal(blocked.kind, 'built')
  assert.equal(blocked.trustedBaseData.deterministicResult.verdict, 'no_go')
  assert.equal(blocked.trustedBaseData.weatherSnapshot, null)
  assert.deepEqual(blocked.trustedBaseData.minimumGear, { essential: [], recommended: [], optional: [] })
  assert.equal(calls.routeWeather, beforeBlocked.routeWeather)
  assert.equal(calls.referenceWeather, beforeBlocked.referenceWeather)
  assert.equal(calls.gear, beforeBlocked.gear)

  const invalidClimb = await builder.build({ target: { ...climb, entityKind: 'route_variant', capability: 'full', routeVariant: climb, route: climbRoute, place: climbPlace }, request: { date: '2026-08-09', startTimeLocal: '08:00', level: '小白' } })
  assert.deepEqual(invalidClimb, { kind: 'invalid', code: 'missing_climb_support', message: '技术攀登必须选择队伍支持方式' })

  console.log('PASS: I21 core input-flow BaseData 编排契约')
}

main().catch((error) => { console.error('FAIL: ' + error.message); process.exitCode = 1 })
