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
}

function main() {
  testValidBranchesAndCopies()
  testReviewedTrackSourceKind()
  testLegacyAdapter()
  testSensitiveFailures()
  console.log('PASS: I07 路线领域目录契约')
}

try {
  main()
} catch (error) {
  console.error('FAIL: ' + error.message)
  process.exitCode = 1
}
