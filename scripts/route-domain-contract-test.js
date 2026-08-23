/**
 * I07 route-domain catalog contract (offline, test first).
 *
 * This test deliberately reaches only the public catalog factory. It does not
 * depend on the catalog's internal indexing or normalization strategy.
 */
const assert = require('node:assert/strict')
const { BUILTIN_ROUTES } = require('../cloudfunctions/getAdvice/data/routes')
const {
  createRouteCatalog,
  RouteCatalogValidationError,
} = require('../cloudfunctions/getAdvice/domain/route-catalog')
const { createTripBaseBuilder } = require('../cloudfunctions/getAdvice/trip-base')

const FULL_EVIDENCE_FIELDS = [
  'canonicalName',
  'fixedDays',
  'stages',
  'distanceKm',
  'ascentM',
  'descentM',
  'routeHighestPointElevationM',
  'weatherSamplePoints',
  'operationalStatus',
]

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function makeSource({ tier = 'A', supports } = {}) {
  return {
    id: 'source:fixture-authority',
    tier,
    kind: 'official',
    title: 'Fixture authority notice',
    publisher: 'Fixture authority',
    url: 'https://example.test/route-notice',
    checkedAt: '2026-08-06',
    supports: supports || [
      ...FULL_EVIDENCE_FIELDS.map((field) => ({
        entityId: 'variant:fixture-full',
        field,
        method: 'direct',
      })),
      { entityId: 'variant:fixture-blocked', field: 'operationalStatus', method: 'direct' },
      { entityId: 'variant:fixture-blocked', field: 'restriction', method: 'direct' },
    ],
  }
}

function makeFixture() {
  return {
    sources: [makeSource()],
    places: [{
      entityKind: 'place',
      capability: 'place_only',
      id: 'place:fixture-mountain',
      canonicalName: 'Fixture mountain',
      aliases: ['Fixture peak'],
      region: 'Fixture region',
      kind: 'mountain',
      referenceCoordinate: { lat: 30, lon: 100, coordinateSystem: 'WGS84' },
      sourceStatus: 'verified',
      sourceIds: [],
    }],
    routes: [{
      entityKind: 'route',
      id: 'route:fixture-route',
      placeId: 'place:fixture-mountain',
      canonicalName: 'Fixture route',
      aliases: ['Fixture classic route'],
      routeType: 'trek',
      summary: 'A verified fixture route.',
      sourceIds: [],
    }],
    variants: [{
      entityKind: 'route_variant',
      recordStatus: 'verified',
      capability: 'full',
      id: 'variant:fixture-full',
      routeId: 'route:fixture-route',
      canonicalName: 'Fixture route day walk',
      aliases: ['Fixture day walk'],
      direction: 'out_and_back',
      startPoint: 'Fixture trailhead',
      endPoint: 'Fixture trailhead',
      isLoop: false,
      fixedDays: 1,
      stages: [{
        day: 1,
        startPoint: 'Fixture trailhead',
        endPoint: 'Fixture trailhead',
        distanceKm: 12,
        ascentM: 850,
        descentM: 850,
        durationHours: { min: 5, max: 7 },
        weatherSamplePointIds: ['trailhead'],
      }],
      distanceKm: 12,
      ascentM: 850,
      descentM: 850,
      routeHighestPointElevationM: 3200,
      nearbyPeakElevationM: null,
      weatherSamplePoints: [{
        id: 'trailhead',
        name: 'Fixture trailhead',
        coordinate: { lat: 30, lon: 100, coordinateSystem: 'WGS84' },
        elevationM: 2200,
      }],
      accessMode: 'walk',
      operationalStatus: 'open',
      verificationLevel: 'A',
      sourceIds: ['source:fixture-authority'],
      sourceCheckedAt: '2026-08-06',
    }, {
      entityKind: 'route_variant',
      recordStatus: 'blocked',
      capability: 'blocked',
      id: 'variant:fixture-blocked',
      routeId: 'route:fixture-route',
      canonicalName: 'Fixture restricted route',
      aliases: [],
      operationalStatus: 'blocked',
      restriction: {
        reason: 'Official trail closure',
        scope: 'Entire route',
        effectiveFrom: '2026-08-01',
        effectiveTo: null,
        sourceIds: ['source:fixture-authority'],
      },
      verificationLevel: 'A',
      sourceIds: ['source:fixture-authority'],
      sourceCheckedAt: '2026-08-06',
    }],
  }
}

function makeSafeRoutePreview() {
  return {
    coordinateSystem: 'WGS84',
    bounds: { minLat: 30, maxLat: 30.1, minLon: 100, maxLon: 100.2 },
    segments: [{
      day: 1,
      points: [{ lat: 30, lon: 100 }, { lat: 30.1, lon: 100.2 }],
    }],
  }
}

function makeSafeRouteGeometry() {
  return {
    coordinateSystem: 'WGS84',
    points: [
      { lat: 30, lon: 100, elevationM: 2200 },
      { lat: 30.01, lon: 100.02, elevationM: 2400 },
      { lat: 30.02, lon: 100.03, elevationM: 2300 },
    ],
  }
}

function expectInvalid(input, expectedIssue) {
  assert.throws(
    () => createRouteCatalog(input),
    (error) => {
      assert(error instanceof RouteCatalogValidationError, '无效目录必须抛 RouteCatalogValidationError')
      assert.equal(error.code, 'invalid_route_catalog', '无效目录必须使用内部统一错误码')
      assert(Array.isArray(error.issues) && error.issues.length > 0, '无效目录必须给出稳定 issue 列表')
      for (const issue of error.issues) {
        assert.deepEqual(Object.keys(issue).sort(), ['code', 'path'], 'issue 只能暴露稳定 code/path')
        assert.equal(typeof issue.code, 'string', 'issue code 必须稳定为字符串')
        assert.equal(typeof issue.path, 'string', 'issue path 必须稳定为字符串')
      }
      if (expectedIssue) {
        assert(error.issues.some((issue) => (
          issue.code === expectedIssue.code && issue.path === expectedIssue.path
        )), `必须包含 ${expectedIssue.code} @ ${expectedIssue.path}`)
      }
      return true
    },
  )
}

function testValidBranchesAndCopies() {
  const input = makeFixture()
  const snapshot = clone(input)
  const catalog = createRouteCatalog(input)

  assert.deepEqual(input, snapshot, 'factory 不得修改完整调用输入')
  assert.equal(catalog.sources.length, 1)
  assert.equal(catalog.places.length, 1)
  assert.equal(catalog.routes.length, 1)
  assert.equal(catalog.variants.length, 2)
  assert.equal(catalog.variants[0].capability, 'full', '合法 full 记录必须可表达完整路线')
  assert.equal(catalog.variants[1].capability, 'blocked', '合法 blocked 记录不得要求行程字段')
  assert.equal(Object.hasOwn(catalog.variants[1], 'stages'), false, 'blocked 记录不得伪造 stages')
  assert.equal(catalog.getById('variant:fixture-full').id, 'variant:fixture-full')
  assert.equal(catalog.getById('not-an-id'), null, '未知 ID 必须返回 null')

  input.sources[0].supports[0].field = 'mutated'
  input.variants[0].stages[0].durationHours.min = 99
  input.places[0].referenceCoordinate.lat = 9
  assert.equal(catalog.sources[0].supports[0].field, 'canonicalName', 'catalog 不得共享 source 嵌套对象')
  assert.equal(catalog.variants[0].stages[0].durationHours.min, 5, 'catalog 不得共享 stage 嵌套对象')
  assert.equal(catalog.places[0].referenceCoordinate.lat, 30, 'catalog 不得共享 place 坐标对象')
}

function testReviewedTrackSourceKind() {
  const input = makeFixture()
  input.variants = [input.variants[0]]
  input.sources[0].supports = input.sources[0].supports.filter((support) => (
    support.entityId === 'variant:fixture-full'
  ))
  input.sources[0].tier = 'B'
  input.sources[0].kind = 'reviewed_track'

  const catalog = createRouteCatalog(input)

  assert.equal(catalog.sources[0].tier, 'B', 'reviewed_track 必须保留 tier B 证据等级')
  assert.equal(catalog.sources[0].kind, 'reviewed_track', 'reviewed_track 必须作为内部 Source kind 被接受')
}

function testOpenDataGeometrySourceKind() {
  const input = makeOpenDataFixture()

  const catalog = createRouteCatalog(input)

  assert.equal(catalog.sources[0].kind, 'open_data', 'open_data must be an explicit Source kind')
  assert.equal(catalog.sources[0].license, 'ODbL-1.0', 'open_data license must cross the domain seam')
  assert.equal(catalog.sources[0].provenance.relationVersion, 1, 'relation version must cross the source seam')
  assert.deepEqual(catalog.variants[0].routeGeometry, makeSafeRouteGeometry(), 'full ordered geometry must cross the catalog seam')
  assert.deepEqual(catalog.variants[0].routePreview, makeSafeRoutePreview(), 'open_data preview must use an explicit evidence seam')

  const unknownWithRationale = makeOpenDataFixture()
  unknownWithRationale.variants[0].operationalStatus = 'unknown'
  unknownWithRationale.variants[0].operationalStatusRationale = 'Current opening evidence is not verified; status remains unknown.'
  unknownWithRationale.sources[0].supports = unknownWithRationale.sources[0].supports
    .filter((support) => support.field !== 'operationalStatus')
  assert.equal(createRouteCatalog(unknownWithRationale).variants[0].operationalStatus, 'unknown')
  delete unknownWithRationale.variants[0].operationalStatusRationale
  expectInvalid(unknownWithRationale, { code: 'missing_required', path: 'variants[0].operationalStatusRationale' })

  const reviewedGeometryUnknown = makeOpenDataFixture()
  reviewedGeometryUnknown.sources[0].kind = 'reviewed_track'
  reviewedGeometryUnknown.variants[0].operationalStatus = 'unknown'
  reviewedGeometryUnknown.variants[0].operationalStatusRationale = 'Current opening evidence is not verified; status remains unknown.'
  reviewedGeometryUnknown.sources[0].supports = reviewedGeometryUnknown.sources[0].supports
    .filter((support) => support.field !== 'operationalStatus')
  expectInvalid(reviewedGeometryUnknown, { code: 'missing_evidence', path: 'variants[0].evidence.operationalStatus' })

  const existingUnknown = makeFixture()
  existingUnknown.variants = [existingUnknown.variants[0]]
  existingUnknown.variants[0].operationalStatus = 'unknown'
  existingUnknown.sources[0].supports = existingUnknown.sources[0].supports
    .filter((support) => support.field !== 'operationalStatus')
  expectInvalid(existingUnknown, { code: 'missing_evidence', path: 'variants[0].evidence.operationalStatus' })
}

function makeOpenDataFixture() {
  const input = makeFixture()
  input.variants = [input.variants[0]]
  input.sources[0].tier = 'B'
  input.sources[0].kind = 'open_data'
  input.sources[0].license = 'ODbL-1.0'
  input.sources[0].attribution = '© OpenStreetMap contributors'
  input.sources[0].provenance = {
    provider: 'OpenStreetMap',
    relationId: 'fixture-relation',
    relationVersion: 1,
    wayVersions: [{ id: 'fixture-way', version: 1 }],
    nodeVersions: [{ id: 'fixture-node', version: 1 }],
    snapshot: 'current-full',
    checkedAt: '2026-08-23T00:00:00Z',
  }
  input.sources[0].supports = [
    ...input.sources[0].supports.filter((support) => support.entityId === 'variant:fixture-full'),
    { entityId: 'variant:fixture-full', field: 'routeGeometry', method: 'derived', note: 'OSM current-full relation geometry' },
    { entityId: 'variant:fixture-full', field: 'routePreview', method: 'derived', note: 'OSM controller-reviewed preview' },
  ]
  input.variants[0].routeGeometry = makeSafeRouteGeometry()
  input.variants[0].routePreview = makeSafeRoutePreview()
  return input
}

function testRoutePreviewProjection() {
  const input = makeFixture()
  input.sources[0].tier = 'B'
  input.sources[0].kind = 'reviewed_track'
  input.sources[0].supports = [
    ...input.sources[0].supports.filter((support) => support.entityId === 'variant:fixture-full'),
    { entityId: 'variant:fixture-full', field: 'routePreview', method: 'derived', note: 'fixture-only reviewed geometry' },
  ]
  input.variants = [input.variants[0]]
  input.variants[0].routePreview = makeSafeRoutePreview()

  const catalog = createRouteCatalog(input)
  assert.deepEqual(catalog.variants[0].routePreview, makeSafeRoutePreview(), '合法 reviewed preview 必须保留精确安全形状')
  assert.equal(Object.hasOwn(catalog.variants[0].routePreview.segments[0].points[0], 'elevation'), false, 'preview 点不得带高程')

  input.variants[0].routePreview.segments[0].points[0].lat = 99
  assert.equal(catalog.variants[0].routePreview.segments[0].points[0].lat, 30, 'catalog 不得共享 preview 点对象')
}

async function testTripBasePreviewBoundaries() {
  const preview = makeSafeRoutePreview()
  const builder = createTripBaseBuilder({
    fetchRouteWeather: async () => ({ ok: true, source: 'fixture', dataStatus: 'complete', evaluatedWindows: [] }),
    fetchReferenceWeather: async () => ({ status: 'unavailable', source: 'fixture', error: 'offline' }),
    evaluateTripVerdict: () => ({ verdict: 'go', dataStatus: 'complete', reasons: [], dataIssues: [] }),
    getGearRules: () => ({ essential: [], recommended: [], optional: [], fatalRisks: [], ruleNotes: [] }),
    now: () => new Date('2026-08-08T00:00:00.000Z'),
  })
  const route = { id: 'route:fixture-route', routeType: 'trek', sourceIds: [] }
  const place = { id: 'place:fixture-mountain', region: 'Fixture region' }
  const variant = {
    id: 'variant:fixture-preview', canonicalName: 'Fixture preview route', fixedDays: 1,
    stages: [], routeHighestPointElevationM: 3200, verificationLevel: 'B', operationalStatus: 'unknown',
    sourceIds: [], weatherSamplePoints: [{ coordinate: { lat: 30, lon: 100 }, elevationM: 2200 }],
    routePreview: preview,
  }
  const request = { date: '2026-08-09', startTimeLocal: '08:00', level: '中级' }
  const full = await builder.build({ target: { entityKind: 'route_variant', capability: 'full', routeType: 'trek', routeVariant: variant, route, place }, request })
  assert.equal(full.kind, 'built')
  assert.deepEqual(full.trustedBaseData.routeSnapshot.routePreview, preview, 'full trusted BaseData must carry the optional preview')
  assert.notStrictEqual(full.trustedBaseData.routeSnapshot.routePreview, preview, 'full preview must cross the seam by value')

  const absentVariant = { ...variant }
  delete absentVariant.routePreview
  const absent = await builder.build({ target: { entityKind: 'route_variant', capability: 'full', routeType: 'trek', routeVariant: absentVariant, route, place }, request })
  assert.equal(Object.hasOwn(absent.trustedBaseData.routeSnapshot, 'routePreview'), false, 'absent full preview must remain absent')

  const blockedVariant = {
    ...variant,
    capability: 'blocked',
    restriction: { reason: 'fixture restriction', scope: 'all', sourceIds: [] },
    routePreview: preview,
  }
  const blocked = await builder.build({ target: { entityKind: 'route_variant', capability: 'blocked', routeType: 'trek', routeVariant: blockedVariant, route, place }, request })
  assert.equal(Object.hasOwn(blocked.trustedBaseData.routeSnapshot, 'routePreview'), false, 'blocked route must omit preview even if input carries one')

  const placeTarget = {
    entityKind: 'place', capability: 'place_only', origin: 'manual', name: 'Fixture place', region: 'Fixture region',
    referenceCoordinate: { lat: 30, lon: 100, coordinateSystem: 'WGS84' }, routePreview: preview,
  }
  const placeResult = await builder.build({ target: placeTarget, request: { ...request, routeType: 'trek', days: 1 } })
  assert.equal(Object.hasOwn(placeResult.trustedBaseData.routeSnapshot, 'routePreview'), false, 'place-only route must omit preview even if input carries one')
}

function testLegacyAdapter() {
  assert.equal(BUILTIN_ROUTES.length, 175, 'I07 基线必须仍有 175 条 legacy 记录')
  const legacyInput = clone(BUILTIN_ROUTES)
  const catalog = createRouteCatalog({ legacyRecords: legacyInput })

  assert.equal(catalog.places.length, 175, 'legacy 适配必须精确生成 175 Place')
  assert.equal(catalog.routes.length, 0, 'legacy 适配不得伪造 Route')
  assert.equal(catalog.variants.length, 0, 'legacy 适配不得伪造 RouteVariant')
  for (const [index, place] of catalog.places.entries()) {
    const legacy = legacyInput[index]
    assert.equal(place.entityKind, 'place')
    assert.equal(place.capability, 'place_only')
    assert.equal(place.sourceStatus, 'legacy_unverified')
    assert.deepEqual(place.sourceIds, [])
    assert.equal(place.id, `place:legacy:${legacy.name}`)
    assert.equal(place.legacyCandidateId, `builtin-route:${legacy.name}`)
    assert.equal(place.referenceCoordinate.coordinateSystem, 'GCJ-02')
    assert.equal(Object.hasOwn(place, 'elevation'), false, 'legacy elevation 不能成为领域事实')
    assert.equal(Object.hasOwn(place, 'bestSeason'), false, 'legacy season 不能成为领域事实')
    assert.equal(Object.hasOwn(place, 'note'), false, 'legacy note 不能成为领域事实')
    assert.equal(Object.hasOwn(place, 'operationalStatus'), false, 'legacy note 不能推断 blocked')
    assert.equal(new Set(place.aliases).size, place.aliases.length, '单 Place aliases 必须去重')
    assert(!place.aliases.includes(place.canonicalName), '单 Place aliases 不得包含自身规范名')
    assert(place.aliases.every((alias) => alias === alias.trim() && alias.length > 0), 'legacy aliases 必须规范化')
  }
  assert.deepEqual(legacyInput, BUILTIN_ROUTES, 'legacy adapter 不得修改原 BUILTIN_ROUTES 输入')

  const custom = createRouteCatalog({ legacyRecords: [
    { name: 'Legacy A', aliases: [' Legacy A ', ' shared ', 'shared', ''], lat: 30, lon: 100, location: 'A', type: 'trek' },
    { name: 'Legacy B', aliases: ['shared'], lat: 31, lon: 101, location: 'B', type: 'tour' },
  ] })
  assert.deepEqual(custom.places[0].aliases, ['shared'], 'adapter 必须移除自身名、空 alias 并在单 Place 内去重')
  assert.deepEqual(custom.places[1].aliases, ['shared'], '跨 Place 重复 alias 必须保留给 I13 消歧')
}

function testSensitiveFailures() {
  const missingLicense = makeOpenDataFixture()
  delete missingLicense.sources[0].license
  expectInvalid(missingLicense, { code: 'missing_required', path: 'sources[0].license' })

  const missingAttribution = makeOpenDataFixture()
  delete missingAttribution.sources[0].attribution
  expectInvalid(missingAttribution, { code: 'missing_required', path: 'sources[0].attribution' })

  const missingProvenance = makeOpenDataFixture()
  delete missingProvenance.sources[0].provenance
  expectInvalid(missingProvenance, { code: 'missing_required', path: 'sources[0].provenance' })

  const geometryOutOfBounds = makeOpenDataFixture()
  geometryOutOfBounds.variants[0].routeGeometry.points[0].lat = 91
  expectInvalid(geometryOutOfBounds, { code: 'invalid_value', path: 'variants[0].routeGeometry.points[0].lat' })

  const geometryTooLarge = makeOpenDataFixture()
  geometryTooLarge.variants[0].routeGeometry.points = Array.from({ length: 10001 }, () => ({ lat: 30, lon: 100, elevationM: 2200 }))
  expectInvalid(geometryTooLarge, { code: 'invalid_value', path: 'variants[0].routeGeometry.points' })

  const emptyStableSuffix = makeFixture()
  emptyStableSuffix.sources[0].id = 'source:'
  emptyStableSuffix.variants[0].sourceIds = ['source:']
  emptyStableSuffix.variants[1].sourceIds = ['source:']
  emptyStableSuffix.variants[1].restriction.sourceIds = ['source:']
  expectInvalid(emptyStableSuffix, { code: 'invalid_id', path: 'sources[0].id' })

  const wrongNamespace = makeFixture()
  wrongNamespace.routes[0].id = 'place:not-a-route'
  expectInvalid(wrongNamespace, { code: 'invalid_namespace', path: 'routes[0].id' })

  const duplicate = makeFixture()
  duplicate.routes[0].id = duplicate.places[0].id
  expectInvalid(duplicate, { code: 'duplicate_id', path: 'routes[0].id' })

  const missingPlace = makeFixture()
  missingPlace.routes[0].placeId = 'place:missing'
  expectInvalid(missingPlace, { code: 'missing_reference', path: 'routes[0].placeId' })

  const missingVariantRoute = makeFixture()
  missingVariantRoute.variants[0].routeId = 'route:missing'
  expectInvalid(missingVariantRoute, { code: 'missing_reference', path: 'variants[0].routeId' })

  const missingEntitySource = makeFixture()
  missingEntitySource.places[0].sourceIds = ['source:missing']
  expectInvalid(missingEntitySource, { code: 'missing_reference', path: 'places[0].sourceIds[0]' })

  const selfAlias = makeFixture()
  selfAlias.places[0].aliases = ['Fixture mountain']
  expectInvalid(selfAlias, { code: 'invalid_value', path: 'places[0].aliases[0]' })

  const missingSample = makeFixture()
  missingSample.variants[0].stages[0].weatherSamplePointIds = ['missing-sample']
  expectInvalid(missingSample, { code: 'missing_reference', path: 'variants[0].stages[0].weatherSamplePointIds[0]' })

  const allC = makeFixture()
  allC.variants = [allC.variants[0]]
  allC.sources[0].tier = 'C'
  allC.sources[0].supports = allC.sources[0].supports.filter((support) => support.entityId === 'variant:fixture-full')
  expectInvalid(allC, { code: 'missing_evidence', path: 'variants[0].evidence.canonicalName' })

  const missingCoreEvidence = makeFixture()
  missingCoreEvidence.variants = [missingCoreEvidence.variants[0]]
  missingCoreEvidence.sources[0].supports = missingCoreEvidence.sources[0].supports.filter((support) => (
    support.entityId !== 'variant:fixture-blocked' && support.field !== 'distanceKm'
  ))
  expectInvalid(missingCoreEvidence, { code: 'missing_evidence', path: 'variants[0].evidence.distanceKm' })

  const zeroDays = makeFixture()
  zeroDays.variants = [zeroDays.variants[0]]
  zeroDays.variants[0].fixedDays = 0
  zeroDays.sources[0].supports = zeroDays.sources[0].supports.filter((support) => support.entityId === 'variant:fixture-full')
  expectInvalid(zeroDays, { code: 'invalid_value', path: 'variants[0].fixedDays' })

  const emptyStages = makeFixture()
  emptyStages.variants = [emptyStages.variants[0]]
  emptyStages.variants[0].stages = []
  emptyStages.sources[0].supports = emptyStages.sources[0].supports.filter((support) => support.entityId === 'variant:fixture-full')
  expectInvalid(emptyStages, { code: 'invalid_value', path: 'variants[0].stages' })

  const mismatchedDays = makeFixture()
  mismatchedDays.variants = [mismatchedDays.variants[0]]
  mismatchedDays.variants[0].fixedDays = 2
  mismatchedDays.sources[0].supports = mismatchedDays.sources[0].supports.filter((support) => support.entityId === 'variant:fixture-full')
  expectInvalid(mismatchedDays, { code: 'invalid_value', path: 'variants[0].stages' })

  const tooManySamples = makeFixture()
  const sample = tooManySamples.variants[0].weatherSamplePoints[0]
  tooManySamples.variants[0].weatherSamplePoints.push(
    { ...sample, id: 'mid-route', name: 'Fixture mid route' },
    { ...sample, id: 'high-point', name: 'Fixture high point' },
    { ...sample, id: 'exit', name: 'Fixture exit' },
  )
  expectInvalid(tooManySamples, { code: 'invalid_value', path: 'variants[0].weatherSamplePoints' })

  const nearbyWithoutRouteHighest = makeFixture()
  nearbyWithoutRouteHighest.variants = [nearbyWithoutRouteHighest.variants[0]]
  delete nearbyWithoutRouteHighest.variants[0].routeHighestPointElevationM
  nearbyWithoutRouteHighest.variants[0].nearbyPeakElevationM = 3600
  nearbyWithoutRouteHighest.sources[0].supports = nearbyWithoutRouteHighest.sources[0].supports.filter((support) => support.entityId === 'variant:fixture-full')
  expectInvalid(nearbyWithoutRouteHighest, { code: 'missing_required', path: 'variants[0].routeHighestPointElevationM' })

  const blockedTierB = makeFixture()
  blockedTierB.sources[0].tier = 'B'
  expectInvalid(blockedTierB, { code: 'missing_evidence', path: 'variants[1].evidence.operationalStatus' })

  const blockedWithFullFields = makeFixture()
  blockedWithFullFields.variants[1].fixedDays = 1
  expectInvalid(blockedWithFullFields, { code: 'forbidden_field', path: 'variants[1].fixedDays' })

  const previewWithLeak = makeFixture()
  previewWithLeak.sources[0].tier = 'B'
  previewWithLeak.sources[0].kind = 'reviewed_track'
  previewWithLeak.sources[0].supports = previewWithLeak.sources[0].supports
    .filter((support) => support.entityId === 'variant:fixture-full')
  previewWithLeak.sources[0].supports.push({ entityId: 'variant:fixture-full', field: 'routePreview', method: 'derived', note: 'fixture' })
  previewWithLeak.variants = [previewWithLeak.variants[0]]
  previewWithLeak.variants[0].routePreview = makeSafeRoutePreview()
  previewWithLeak.variants[0].routePreview.segments[0].points[0].elevation = 2200
  expectInvalid(previewWithLeak, { code: 'forbidden_field', path: 'variants[0].routePreview.segments[0].points[0].elevation' })

  const previewTooLarge = makeFixture()
  previewTooLarge.sources[0].tier = 'B'
  previewTooLarge.sources[0].kind = 'reviewed_gpx'
  previewTooLarge.sources[0].supports = previewTooLarge.sources[0].supports
    .filter((support) => support.entityId === 'variant:fixture-full')
  previewTooLarge.sources[0].supports.push({ entityId: 'variant:fixture-full', field: 'routePreview', method: 'derived', note: 'fixture' })
  previewTooLarge.variants = [previewTooLarge.variants[0]]
  previewTooLarge.variants[0].routePreview = makeSafeRoutePreview()
  previewTooLarge.variants[0].routePreview.segments[0].points = Array.from({ length: 501 }, (_, index) => ({ lat: 30 + index / 10000, lon: 100 + index / 10000 }))
  previewTooLarge.variants[0].routePreview.bounds = { minLat: 30, maxLat: 30.0501, minLon: 100, maxLon: 100.0501 }
  expectInvalid(previewTooLarge, { code: 'invalid_value', path: 'variants[0].routePreview.segments' })

  const previewWrongBounds = makeFixture()
  previewWrongBounds.sources[0].tier = 'B'
  previewWrongBounds.sources[0].kind = 'reviewed_track'
  previewWrongBounds.sources[0].supports = previewWrongBounds.sources[0].supports
    .filter((support) => support.entityId === 'variant:fixture-full')
  previewWrongBounds.sources[0].supports.push({ entityId: 'variant:fixture-full', field: 'routePreview', method: 'derived', note: 'fixture' })
  previewWrongBounds.variants = [previewWrongBounds.variants[0]]
  previewWrongBounds.variants[0].routePreview = makeSafeRoutePreview()
  previewWrongBounds.variants[0].routePreview.bounds.minLat = 30.01
  expectInvalid(previewWrongBounds, { code: 'invalid_value', path: 'variants[0].routePreview.bounds' })

  const previewUnreviewed = makeFixture()
  previewUnreviewed.sources[0].supports = previewUnreviewed.sources[0].supports
    .filter((support) => support.entityId === 'variant:fixture-full')
  previewUnreviewed.sources[0].supports.push({ entityId: 'variant:fixture-full', field: 'routePreview', method: 'derived', note: 'fixture' })
  previewUnreviewed.variants = [previewUnreviewed.variants[0]]
  previewUnreviewed.variants[0].routePreview = makeSafeRoutePreview()
  expectInvalid(previewUnreviewed, { code: 'missing_evidence', path: 'variants[0].evidence.routePreview' })
}

async function main() {
  testValidBranchesAndCopies()
  testReviewedTrackSourceKind()
  testOpenDataGeometrySourceKind()
  testRoutePreviewProjection()
  await testTripBasePreviewBoundaries()
  testLegacyAdapter()
  testSensitiveFailures()
  console.log('PASS: I07 路线领域目录契约')
}

main().catch((error) => {
  console.error('FAIL: ' + error.message)
  process.exitCode = 1
})
