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
      evaluatedWindows: [1, 2].map((day) => ({ day, date: `2026-08-${String(day + 8).padStart(2, '0')}`, startLocal: `2026-08-${String(day + 8).padStart(2, '0')}T08:00`, endLocalExclusive: `2026-08-${String(day + 8).padStart(2, '0')}T10:00`, durationHoursMax: 2, samples: [{ samplePointId: 'sample', requestCoordinate: { lat: 30, lon: 100, coordinateSystem: 'WGS84' }, hours: [{ temperatureC: 12.2 + day, precipitationProbabilityPct: 10 + day, windSpeedMs: 3.4 + day }] }] })),
    } : {
      insufficientReasons: [{ code: 'weather_data_invalid', retryable: true }], evaluatedWindows: [],
    }),
  }
}

function assertGearProjection(base, label) {
  for (const category of ['essential', 'recommended', 'optional']) {
    assert.deepEqual(base.minimumGear[category], base.gearRules[category], `${label} ${category} 必须与兼容 gearRules 完全一致`)
  }
}

function fakeSourceSummaries(sourceIds) {
  return sourceIds.map((id) => ({
    id, tier: 'B', kind: 'fixture', title: `Source ${id}`, publisher: '测试来源', url: null, checkedAt: '2026-08-08',
  }))
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
    resolveRouteSourceSummaries: fakeSourceSummaries,
    now: () => new Date('2026-08-08T00:00:00.000Z'),
  })

  const placeWithIdentityEvidence = { ...place, sourceIds: ['source:place-identity'] }
  const full = await builder.build({ target: { ...variant, entityKind: 'route_variant', capability: 'full', routeVariant: variant, route, place: placeWithIdentityEvidence, candidateId: variant.id }, request: { date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 99 } })
  assert.equal(full.kind, 'built')
  assert.equal(full.trustedBaseData.requestSummary.days, variant.fixedDays, 'full 必须忽略客户端 days')
  assert.equal(full.trustedBaseData.routeSnapshot.routeVariantId, variant.id)
  assert.equal(full.trustedBaseData.deterministicResult.dataStatus, 'complete')
  assert.equal(full.trustedBaseData.elevation, variant.routeHighestPointElevationM)
  assert.equal(full.trustedBaseData.routeSnapshot.routeHighestPointElevationM, variant.routeHighestPointElevationM)
  assert.equal(full.trustedBaseData.routeSnapshot.verificationLevel, variant.verificationLevel)
  assert.equal(full.trustedBaseData.routeSnapshot.operationalStatus, variant.operationalStatus)
  assert.equal(full.trustedBaseData.routeSnapshot.sourceCheckedAt, variant.sourceCheckedAt)
  assert.deepEqual(full.trustedBaseData.sourceMetadata.routeSources.map((source) => source.id), full.trustedBaseData.sourceMetadata.routeSourceIds)
  assert.equal(full.trustedBaseData.sourceMetadata.routeSourceIds.includes('source:place-identity'), false, 'Place identity evidence must not enter route sources')
  assert.ok(full.trustedBaseData.weather && Array.isArray(full.trustedBaseData.weather.days), '完整路线兼容天气必须提供 weather.days')
  assert.equal(full.trustedBaseData.weather.days.length, variant.fixedDays, '完整路线必须返回全部固定天数天气摘要')
  assert.equal(full.trustedBaseData.weather.source, 'Open-Meteo')
  assert.equal(full.trustedBaseData.weather.windUnit, 'm/s')
  assert.equal(full.trustedBaseData.weather.timezone, 'Asia/Shanghai')
  assert.equal(typeof full.trustedBaseData.weather.elevationCaveat, 'string')
  assert.equal(typeof full.trustedBaseData.weather.precipNote, 'string')
  assertGearProjection(full.trustedBaseData, 'full')

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

  // routeType is a trusted route fact, so the same builder must cover the
  // non-climb tour path without asking the client to restate it.
  const tourRoute = { ...route, id: 'route:test-tour', routeType: 'tour', canonicalName: '测试游览线' }
  const tourVariant = { ...variant, id: 'variant:test-tour', routeId: tourRoute.id, canonicalName: '测试游览一日游览线' }
  const tour = await builder.build({ target: { ...tourVariant, entityKind: 'route_variant', capability: 'full', routeVariant: tourVariant, route: tourRoute, place, candidateId: tourVariant.id }, request: { date: '2026-08-09', startTimeLocal: '08:00', level: '中级' } })
  assert.equal(tour.kind, 'built')
  assert.equal(tour.trustedBaseData.routeSnapshot.routeType, 'tour')
  assert.equal(tour.trustedBaseData.routeSnapshot.routeVariantId, tourVariant.id)

  // A manually confirmed point and an external AMap point share the place-only
  // composition, but preserve their origin and finite elevation as trusted
  // inputs.  No client-side route facts are inferred by this builder.
  const manual = await builder.build({ target: { entityKind: 'place', capability: 'place_only', origin: 'manual', name: '手动零海拔点', location: '测试地区', referenceCoordinate: { lat: 0, lon: 0, coordinateSystem: 'GCJ-02' }, referenceElevationM: 0, sourceIds: [] }, request: { date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1, routeType: 'trek' } })
  assert.equal(manual.kind, 'built')
  assert.equal(manual.trustedBaseData.elevation, 0, '手动海拔 0 必须保持有效')
  assert.equal(manual.trustedBaseData.sourceMetadata.routeTypeSource, 'user')
  const external = await builder.build({ target: { entityKind: 'place', capability: 'place_only', origin: 'amap', name: '外部确认点', location: '测试地区', referenceCoordinate: { lat: 1, lon: 2, coordinateSystem: 'GCJ-02' }, referenceElevationM: -20, sourceIds: [] }, request: { date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1, routeType: 'tour' } })
  assert.equal(external.kind, 'built')
  assert.equal(external.trustedBaseData.elevation, -20, '外部确认点的负海拔必须保持有效')
  assert.equal(external.trustedBaseData.sourceMetadata.routeTypeSource, 'amap')

  const beforeInvalidPlace = { ...calls }
  const invalidPlace = await builder.build({ target: { entityKind: 'place', capability: 'place_only', origin: 'manual', name: '无效点', location: '测试地区', referenceCoordinate: null, sourceIds: [] }, request: { date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1, routeType: 'trek' } })
  assert.equal(invalidPlace.kind, 'invalid')
  assert.deepEqual(calls, beforeInvalidPlace, '无效手动地点不得调用天气/装备/规则服务')
  const beforeInvalidDays = { ...calls }
  const invalidDays = await builder.build({ target: { entityKind: 'place', capability: 'place_only', origin: 'manual', name: '天数无效点', location: '测试地区', referenceCoordinate: { lat: 1, lon: 2, coordinateSystem: 'GCJ-02' }, sourceIds: [] }, request: { date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 0, routeType: 'trek' } })
  assert.equal(invalidDays.kind, 'invalid')
  assert.deepEqual(calls, beforeInvalidDays, '无效天数不得调用地点天气/装备/规则服务')

  const insufficientBuilder = createTripBaseBuilder({
    fetchRouteWeather: async () => ({ ok: true, source: 'Open-Meteo', fetchedAt: '2026-08-08T00:00:00.000Z', timezone: 'Asia/Shanghai', dataStatus: 'insufficient', insufficientReasons: [{ code: 'out_of_range', retryable: false }], evaluatedWindows: [] }),
    getGearRules: (input) => getGearRules(input),
    evaluateTripVerdict,
    resolveRouteSourceSummaries: fakeSourceSummaries,
    now: () => new Date('2026-08-08T00:00:00.000Z'),
  })
  const insufficient = await insufficientBuilder.build({ target: { ...variant, entityKind: 'route_variant', capability: 'full', routeVariant: variant, route, place: placeWithIdentityEvidence, candidateId: variant.id }, request: { date: '2026-08-09', startTimeLocal: '08:00', level: '中级' } })
  assert.equal(insufficient.kind, 'built')
  assert.equal(insufficient.trustedBaseData.weatherSnapshot.dataStatus, 'insufficient')
  assert.equal(insufficient.trustedBaseData.deterministicResult.verdict, null)
  assert.equal(insufficient.trustedBaseData.weather, null)

  const beforePlaceOnly = calls.referenceWeather
  const placeOnly = await builder.build({ target: { entityKind: 'place', capability: 'place_only', origin: 'catalog', place: placeWithIdentityEvidence, name: place.canonicalName, location: place.region, referenceCoordinate: place.referenceCoordinate, sourceIds: placeWithIdentityEvidence.sourceIds }, request: { date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 2, routeType: 'trek' } })
  assert.equal(placeOnly.kind, 'built')
  assert.equal(placeOnly.trustedBaseData.routeSnapshot.capability, 'place_only')
  assert.deepEqual(placeOnly.trustedBaseData.routeSnapshot.routeHighestPointElevationM, null)
  assert.deepEqual(placeOnly.trustedBaseData.routeSnapshot.verificationLevel, null)
  assert.deepEqual(placeOnly.trustedBaseData.routeSnapshot.operationalStatus, null)
  assert.deepEqual(placeOnly.trustedBaseData.routeSnapshot.sourceCheckedAt, null)
  assert.deepEqual(placeOnly.trustedBaseData.sourceMetadata.routeSourceIds, [])
  assert.deepEqual(placeOnly.trustedBaseData.sourceMetadata.routeSources, [])
  assert.equal(placeOnly.trustedBaseData.deterministicResult.verdict, null)
  assertGearProjection(placeOnly.trustedBaseData, 'place-only')
  assert.equal(calls.referenceWeather, beforePlaceOnly + 1)

  const blockedVariant = catalog.variants.find((item) => item.capability === 'blocked')
  const blockedRoute = catalog.routes.find((item) => item.id === blockedVariant.routeId)
  const blockedPlace = catalog.places.find((item) => item.id === blockedRoute.placeId)
  const beforeBlocked = { ...calls }
  const blocked = await builder.build({ target: { ...blockedVariant, entityKind: 'route_variant', capability: 'blocked', routeVariant: blockedVariant, route: blockedRoute, place: { ...blockedPlace, sourceIds: ['source:place-identity'] }, candidateId: blockedVariant.id }, request: { date: '2026-08-09', startTimeLocal: '08:00', level: '小白', days: 99, climbSupport: 'invalid' } })
  assert.equal(blocked.kind, 'built')
  assert.equal(blocked.trustedBaseData.deterministicResult.verdict, 'no_go')
  assert.equal(blocked.trustedBaseData.weatherSnapshot, null)
  assert.equal(blocked.trustedBaseData.routeSnapshot.routeHighestPointElevationM, null)
  assert.equal(blocked.trustedBaseData.routeSnapshot.verificationLevel, blockedVariant.verificationLevel)
  assert.equal(blocked.trustedBaseData.routeSnapshot.operationalStatus, blockedVariant.operationalStatus)
  assert.equal(blocked.trustedBaseData.routeSnapshot.sourceCheckedAt, blockedVariant.sourceCheckedAt)
  assert.deepEqual(blocked.trustedBaseData.sourceMetadata.routeSources.map((source) => source.id), blocked.trustedBaseData.sourceMetadata.routeSourceIds)
  assert.equal(blocked.trustedBaseData.sourceMetadata.routeSourceIds.includes('source:place-identity'), false)
  assert.deepEqual(blocked.trustedBaseData.minimumGear, { essential: [], recommended: [], optional: [] })
  assert.equal(blocked.trustedBaseData.weather, null, '禁行路线兼容天气必须为空')
  assert.deepEqual(blocked.trustedBaseData.gearRules.fatalRisks, ['官方禁行'])
  assert.ok(blocked.trustedBaseData.gearRules.ruleNotes.some((note) => note.includes('官方禁行')))
  assertGearProjection(blocked.trustedBaseData, 'blocked')
  assert.equal(calls.routeWeather, beforeBlocked.routeWeather)
  assert.equal(calls.referenceWeather, beforeBlocked.referenceWeather)
  assert.equal(calls.gear, beforeBlocked.gear)
  assert.equal(calls.sunset, beforeBlocked.sunset, '禁行路线不得调用日落服务')

  const invalidClimb = await builder.build({ target: { ...climb, entityKind: 'route_variant', capability: 'full', routeVariant: climb, route: climbRoute, place: climbPlace }, request: { date: '2026-08-09', startTimeLocal: '08:00', level: '小白' } })
  assert.deepEqual(invalidClimb, { kind: 'invalid', code: 'missing_climb_support', message: '技术攀登必须选择队伍支持方式' })
  assert.equal(calls.routeWeather, beforeBlocked.routeWeather, '缺少攀登支持不得调用天气')
  assert.equal(calls.gear, beforeBlocked.gear, '缺少攀登支持不得调用装备')

  console.log('PASS: I21 core input-flow BaseData 编排契约')
}

main().catch((error) => { console.error('FAIL: ' + error.message); process.exitCode = 1 })
