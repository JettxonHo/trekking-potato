/**
 * I13 production catalog and permanent-ID resolver contract (offline, test first).
 *
 * The resolver stays deliberately unconnected to the current I05 handler. Tests
 * inject I07-validated synthetic catalogs where the production data cannot express
 * a sensitive ambiguity directly.
 */
const assert = require('node:assert/strict')
const Module = require('node:module')
const fs = require('node:fs')
const path = require('node:path')

const {
  createCatalogResolver,
  resolveRouteQuery,
  resolveRouteCandidateId,
} = require('../cloudfunctions/getAdvice/domain/catalog-resolver')
const { createProductionRouteCatalog } = require('../cloudfunctions/getAdvice/data/catalog/runtime-catalog')
const { createRouteCatalog } = require('../cloudfunctions/getAdvice/domain/route-catalog')

const CANDIDATE_KEYS = [
  'candidateId',
  'entityKind',
  'capability',
  'canonicalName',
  'region',
  'routeType',
  'fixedDays',
]

function targetSummary(target) {
  return {
    candidateId: target.candidateId,
    entityKind: target.entityKind,
    capability: target.capability,
    canonicalName: target.canonicalName,
    region: target.region,
    routeType: target.routeType,
    fixedDays: target.fixedDays,
  }
}

function assertDirect(result, matchStage, candidateId) {
  assert.equal(result.kind, 'direct')
  assert.equal(result.matchStage, matchStage)
  assert.equal(result.target.candidateId, candidateId)
  return result.target
}

function assertNotFound(result) {
  assert.deepEqual(result, { kind: 'not_found' })
}

function assertCandidate(candidate, expected) {
  assert.deepEqual(Object.keys(candidate).sort(), [...CANDIDATE_KEYS].sort())
  assert.deepEqual(candidate, expected)
  for (const forbidden of ['coordinate', 'elevationM', 'weatherSamplePoints', 'sources', 'restriction', 'activityTypeHint']) {
    assert.equal(Object.prototype.hasOwnProperty.call(candidate, forbidden), false)
  }
}

function makeSource({ id = 'source:resolver-fixture', supports } = {}) {
  return {
    id,
    tier: 'A',
    kind: 'official',
    title: 'Resolver fixture authority',
    publisher: 'Fixture authority',
    url: 'https://example.test/resolver-fixture',
    checkedAt: '2026-08-07',
    supports,
  }
}

function makeFull({
  id,
  routeId,
  canonicalName,
  aliases = [],
  fixedDays = 1,
  sourceId = 'source:resolver-fixture',
}) {
  return {
    entityKind: 'route_variant',
    recordStatus: 'verified',
    capability: 'full',
    id,
    routeId,
    canonicalName,
    aliases,
    direction: 'out_and_back',
    startPoint: `${canonicalName} start`,
    endPoint: `${canonicalName} end`,
    isLoop: false,
    fixedDays,
    stages: Array.from({ length: fixedDays }, (_, index) => ({
      day: index + 1,
      startPoint: `${canonicalName} day ${index + 1} start`,
      endPoint: `${canonicalName} day ${index + 1} end`,
      distanceKm: 10,
      ascentM: 500,
      descentM: 500,
      durationHours: { min: 5, max: 5 },
      weatherSamplePointIds: ['fixture-sample'],
    })),
    distanceKm: fixedDays * 10,
    ascentM: fixedDays * 500,
    descentM: fixedDays * 500,
    routeHighestPointElevationM: 2000,
    nearbyPeakElevationM: null,
    weatherSamplePoints: [{
      id: 'fixture-sample',
      name: 'Fixture sample',
      coordinate: { lat: 30, lon: 100, coordinateSystem: 'WGS84' },
      elevationM: 2000,
    }],
    accessMode: 'walk',
    operationalStatus: 'unknown',
    verificationLevel: 'A',
    sourceIds: [sourceId],
    sourceCheckedAt: '2026-08-07',
  }
}

function makeBlocked({
  id,
  routeId,
  canonicalName,
  aliases = [],
  sourceId = 'source:resolver-fixture',
}) {
  return {
    entityKind: 'route_variant',
    recordStatus: 'blocked',
    capability: 'blocked',
    id,
    routeId,
    canonicalName,
    aliases,
    operationalStatus: 'blocked',
    restriction: {
      reason: 'Fixture restriction',
      scope: 'Fixture route',
      effectiveFrom: null,
      effectiveTo: null,
      sourceIds: [sourceId],
    },
    verificationLevel: 'A',
    sourceIds: [sourceId],
    sourceCheckedAt: '2026-08-07',
  }
}

function makeCatalog({
  places = [{
    entityKind: 'place',
    capability: 'place_only',
    id: 'place:fixture',
    canonicalName: 'Fixture place',
    aliases: [],
    region: 'Fixture region',
    kind: 'mountain',
    referenceCoordinate: { lat: 30, lon: 100, coordinateSystem: 'WGS84' },
    sourceStatus: 'verified',
    sourceIds: [],
  }],
  routes = [{
    entityKind: 'route',
    id: 'route:fixture',
    placeId: 'place:fixture',
    canonicalName: 'Fixture route',
    aliases: [],
    routeType: 'trek',
    summary: 'Fixture route summary.',
    sourceIds: [],
  }],
  variants = [makeFull({
    id: 'variant:fixture-full',
    routeId: 'route:fixture',
    canonicalName: 'Fixture full variant',
  })],
  legacyRecords = [],
} = {}) {
  const fullSupports = variants
    .filter((variant) => variant.recordStatus === 'verified')
    .flatMap((variant) => [
      'canonicalName',
      'fixedDays',
      'stages',
      'distanceKm',
      'ascentM',
      'descentM',
      'routeHighestPointElevationM',
      'weatherSamplePoints',
      'operationalStatus',
    ].map((field) => ({ entityId: variant.id, field, method: 'direct' })))
  const blockedSupports = variants
    .filter((variant) => variant.recordStatus === 'blocked')
    .flatMap((variant) => [
      { entityId: variant.id, field: 'operationalStatus', method: 'direct' },
      { entityId: variant.id, field: 'restriction', method: 'direct' },
    ])
  return createRouteCatalog({
    legacyRecords,
    sources: [makeSource({ supports: [...fullSupports, ...blockedSupports] })],
    places,
    routes,
    variants,
  })
}

function makeMultiVariantCatalog() {
  return makeCatalog({
    legacyRecords: [{
      name: 'Multi place', aliases: ['Multi alias'], lat: 30, lon: 100, location: 'Fixture region', type: 'trek',
    }],
    places: [],
    routes: [{
      entityKind: 'route',
      id: 'route:multi',
      placeId: 'place:legacy:Multi place',
      canonicalName: 'Multi route',
      aliases: ['Multi route alias'],
      routeType: 'trek',
      summary: 'Fixture multi route.',
      sourceIds: [],
    }],
    variants: [
      makeFull({ id: 'variant:multi-zeta', routeId: 'route:multi', canonicalName: 'Zeta route' }),
      makeFull({ id: 'variant:multi-alpha', routeId: 'route:multi', canonicalName: 'Alpha route' }),
    ],
  })
}

function productionCatalogTests() {
  const first = createProductionRouteCatalog()
  const second = createProductionRouteCatalog()
  assert.deepEqual([first.sources.length, first.places.length, first.routes.length, first.variants.length], [23, 180, 11, 11])
  assert.deepEqual(
    first.variants.reduce((counts, variant) => ({ ...counts, [variant.capability]: (counts[variant.capability] || 0) + 1 }), {}),
    { full: 10, blocked: 1 },
  )
  first.variants[0].canonicalName = 'mutated catalog result'
  assert.notEqual(second.variants[0].canonicalName, 'mutated catalog result')

  const resolver = createCatalogResolver({ catalog: second })
  const danglingId = 'variant:dangling-huluhai-zhuoyongcuo-out-and-back-1d'
  const wugongId = 'variant:wugongshan-longshan-to-main-gate-2d'
  for (const query of ['党岭', '党岭·葫芦海—卓雍措徒步', '党岭村—葫芦海—卓雍措一日往返']) {
    assert.equal(assertDirect(resolver.resolveQuery(query), 'canonical_exact', danglingId).capability, 'full')
  }
  assert.equal(assertDirect(resolver.resolveQuery('武功山反穿'), 'canonical_exact', wugongId).capability, 'full')
  assert.equal(assertDirect(resolver.resolveQuery('龙山村反穿武功山'), 'unique_alias_exact', wugongId).capability, 'full')
  assert.equal(assertDirect(resolver.resolveQuery('武功山·龙山村至景区正门反穿二日徒步线'), 'canonical_exact', wugongId).capability, 'full')

  const frozenBatch = [
    ['三杆笔—水祖坑郊野径', 'variant:osm-16162196-sanganbi-shuizukeng'],
    ['蝴蝶步道', 'variant:osm-20072118-die-butterfly-trail'],
    ['坪惠湿地步道', 'variant:osm-20046643-pinghui-wetland-trail'],
    ['赵公山东北环线', 'variant:osm-20739620-zhaogongshan-loop'],
    ['三峡之巅徒步道', 'variant:osm-17841828-three-gorges-summit'],
  ]
  for (const [query, candidateId] of frozenBatch) {
    const target = assertDirect(resolver.resolveQuery(query), 'canonical_exact', candidateId)
    assert.equal(target.capability, 'full')
    assert.equal(target.routeVariant.direction, query === '赵公山东北环线' ? 'loop' : 'point_to_point')
    assert.equal(target.routeVariant.accessMode, 'walk')
    assert.equal(target.routeVariant.operationalStatus, 'unknown')
    assert.equal(target.routeVariant.sourceIds.some((sourceId) => second.getById(sourceId).kind === 'open_data'), true)
  }
  const pinghui = second.getById('variant:osm-20046643-pinghui-wetland-trail')
  assert.deepEqual(
    pinghui.sourceIds.map((sourceId) => second.getById(sourceId).kind).sort(),
    ['open_data', 'trusted_api'],
    '20046643 contextual park page must not be promoted as an exact-route official source',
  )

  const taishan = assertDirect(resolver.resolveQuery('泰山'), 'canonical_exact', 'place:legacy:泰山')
  assert.deepEqual(targetSummary(taishan), {
    candidateId: 'place:legacy:泰山',
    entityKind: 'place',
    capability: 'place_only',
    canonicalName: '泰山',
    region: '山东省泰安市',
    routeType: null,
    fixedDays: null,
  })
  assert.equal(Object.prototype.hasOwnProperty.call(taishan.place, 'activityTypeHint'), true)
  assert.equal(taishan.route, null)
  assert.equal(taishan.routeVariant, null)

  const blockedId = 'variant:wutai-grand-pilgrimage'
  for (const query of ['五台山朝台', '五台山大朝台', '五台山大朝台禁行记录']) {
    const blocked = assertDirect(resolver.resolveQuery(query), 'canonical_exact', blockedId)
    assert.equal(blocked.capability, 'blocked')
    assert.equal(blocked.fixedDays, null)
    assert.equal(blocked.routeVariant.restriction.reason, '五台山风景名胜区管理委员会关于全域禁止台顶徒步的公告')
  }
  assertDirect(resolver.resolveQuery('五台山'), 'unique_alias_exact', blockedId)
  assertNotFound(resolver.resolveQuery('五台山大'))
  assertNotFound(resolver.resolveQuery('大朝'))
  assertNotFound(resolver.resolveQuery('台禁行记'))
  assertNotFound(resolver.resolveQuery('五台山大朝台禁形记录'))
}

function queryStageTests() {
  const catalog = makeCatalog({
    places: [
      {
        entityKind: 'place', capability: 'place_only', id: 'place:canonical', canonicalName: 'Shared', aliases: ['Place only'],
        region: 'Canonical region', kind: 'mountain', referenceCoordinate: { lat: 30, lon: 100, coordinateSystem: 'WGS84' }, sourceStatus: 'verified', sourceIds: [],
      },
      {
        entityKind: 'place', capability: 'place_only', id: 'place:alias', canonicalName: 'Alias holder', aliases: ['Shared'],
        region: 'Alias region', kind: 'mountain', referenceCoordinate: { lat: 31, lon: 101, coordinateSystem: 'WGS84' }, sourceStatus: 'verified', sourceIds: [],
      },
    ],
    routes: [],
    variants: [],
  })
  const resolver = createCatalogResolver({ catalog })
  assertDirect(resolver.resolveQuery('Shared'), 'canonical_exact', 'place:canonical')
  assertDirect(resolver.resolveQuery('Place only'), 'unique_alias_exact', 'place:canonical')

  const multiResolver = createCatalogResolver({ catalog: makeMultiVariantCatalog() })
  const canonical = multiResolver.resolveQuery('Multi place')
  assert.equal(canonical.kind, 'confirmation')
  assert.equal(canonical.matchStage, 'canonical_exact')
  assert.deepEqual(canonical.candidates.map((candidate) => candidate.candidateId), ['variant:multi-alpha', 'variant:multi-zeta'])
  const alias = multiResolver.resolveQuery('Multi alias')
  assert.equal(alias.kind, 'confirmation')
  assert.equal(alias.matchStage, 'repeated_alias_exact')
  assert.deepEqual(alias.candidates.map((candidate) => candidate.canonicalName), ['Alpha route', 'Zeta route'])

  const stageCatalog = makeCatalog({
    places: [
      {
        entityKind: 'place', capability: 'place_only', id: 'place:prefix', canonicalName: 'Prefix route', aliases: ['prefix alias'],
        region: 'Prefix region', kind: 'mountain', referenceCoordinate: { lat: 30, lon: 100, coordinateSystem: 'WGS84' }, sourceStatus: 'verified', sourceIds: [],
      },
      {
        entityKind: 'place', capability: 'place_only', id: 'place:contains', canonicalName: 'Contains route', aliases: ['unrelated'],
        region: 'Contains region', kind: 'mountain', referenceCoordinate: { lat: 31, lon: 100, coordinateSystem: 'WGS84' }, sourceStatus: 'verified', sourceIds: [],
      },
      {
        entityKind: 'place', capability: 'place_only', id: 'place:fuzzy', canonicalName: 'Fuzzy route', aliases: ['fuzzy alias'],
        region: 'Fuzzy region', kind: 'mountain', referenceCoordinate: { lat: 32, lon: 100, coordinateSystem: 'WGS84' }, sourceStatus: 'verified', sourceIds: [],
      },
    ],
    routes: [],
    variants: [],
  })
  const stageResolver = createCatalogResolver({ catalog: stageCatalog })
  assert.equal(stageResolver.resolveQuery('Prefix').matchStage, 'prefix')
  assert.equal(stageResolver.resolveQuery('ontains').matchStage, 'contains')
  assert.equal(stageResolver.resolveQuery('Fuzzy rute').matchStage, 'fuzzy')
  assertNotFound(stageResolver.resolveQuery('Fzy'))

  const fuzzyCatalog = makeCatalog({
    places: [
      {
        entityKind: 'place', capability: 'place_only', id: 'place:fuzzy-z', canonicalName: 'Zeta', aliases: ['mmmae'],
        region: 'Fixture region', kind: 'mountain', referenceCoordinate: { lat: 30, lon: 100, coordinateSystem: 'WGS84' }, sourceStatus: 'verified', sourceIds: [],
      },
      {
        entityKind: 'place', capability: 'place_only', id: 'place:fuzzy-a', canonicalName: 'Alpha', aliases: ['mouze'],
        region: 'Fixture region', kind: 'mountain', referenceCoordinate: { lat: 31, lon: 100, coordinateSystem: 'WGS84' }, sourceStatus: 'verified', sourceIds: [],
      },
    ],
    routes: [],
    variants: [],
  })
  const fuzzy = createCatalogResolver({ catalog: fuzzyCatalog }).resolveQuery('mouae')
  assert.equal(fuzzy.kind, 'confirmation')
  assert.equal(fuzzy.matchStage, 'fuzzy')
  assert.deepEqual(fuzzy.candidates.map((candidate) => candidate.canonicalName), ['Alpha', 'Zeta'])

  const maxFiveCatalog = makeCatalog({
    places: Array.from({ length: 6 }, (_, index) => ({
      entityKind: 'place', capability: 'place_only', id: `place:max-${index}`, canonicalName: `Many ${6 - index}`,
      aliases: [`fuzzy${index}`], region: 'Fixture region', kind: 'mountain', referenceCoordinate: { lat: 30 + index, lon: 100, coordinateSystem: 'WGS84' }, sourceStatus: 'verified', sourceIds: [],
    })),
    routes: [],
    variants: [],
  })
  const maxFive = createCatalogResolver({ catalog: maxFiveCatalog }).resolveQuery('fuzzy')
  assert.equal(maxFive.kind, 'confirmation')
  assert.equal(maxFive.matchStage, 'prefix')
  assert.equal(maxFive.candidates.length, 5)
  assert.deepEqual(maxFive.candidates.map((candidate) => candidate.canonicalName), ['Many 1', 'Many 2', 'Many 3', 'Many 4', 'Many 5'])
}

function blockedCollisionTests() {
  const mixed = makeCatalog({
    places: [{
      entityKind: 'place', capability: 'place_only', id: 'place:mixed', canonicalName: 'Mixed exact', aliases: [],
      region: 'Fixture region', kind: 'mountain', referenceCoordinate: { lat: 30, lon: 100, coordinateSystem: 'WGS84' }, sourceStatus: 'verified', sourceIds: [],
    }],
    routes: [{
      entityKind: 'route', id: 'route:mixed-full', placeId: 'place:mixed', canonicalName: 'Mixed exact', aliases: [], routeType: 'trek', summary: 'Full route.', sourceIds: [],
    }, {
      entityKind: 'route', id: 'route:mixed-blocked', placeId: 'place:mixed', canonicalName: 'Mixed exact', aliases: [], routeType: 'trek', summary: 'Blocked route.', sourceIds: [],
    }],
    variants: [
      makeFull({ id: 'variant:mixed-full', routeId: 'route:mixed-full', canonicalName: 'Full choice' }),
      makeBlocked({ id: 'variant:mixed-blocked', routeId: 'route:mixed-blocked', canonicalName: 'Blocked choice' }),
    ],
  })
  assertNotFound(createCatalogResolver({ catalog: mixed }).resolveQuery('Mixed exact'))

  const twoBlocked = makeCatalog({
    places: [{
      entityKind: 'place', capability: 'place_only', id: 'place:two-blocked', canonicalName: 'Two blocked', aliases: [],
      region: 'Fixture region', kind: 'mountain', referenceCoordinate: { lat: 30, lon: 100, coordinateSystem: 'WGS84' }, sourceStatus: 'verified', sourceIds: [],
    }],
    routes: [{
      entityKind: 'route', id: 'route:two-blocked-a', placeId: 'place:two-blocked', canonicalName: 'Route a', aliases: ['Two blocked'], routeType: 'trek', summary: 'A.', sourceIds: [],
    }, {
      entityKind: 'route', id: 'route:two-blocked-b', placeId: 'place:two-blocked', canonicalName: 'Route b', aliases: ['Two blocked'], routeType: 'trek', summary: 'B.', sourceIds: [],
    }],
    variants: [
      makeBlocked({ id: 'variant:two-blocked-a', routeId: 'route:two-blocked-a', canonicalName: 'Blocked a' }),
      makeBlocked({ id: 'variant:two-blocked-b', routeId: 'route:two-blocked-b', canonicalName: 'Blocked b' }),
    ],
  })
  assertNotFound(createCatalogResolver({ catalog: twoBlocked }).resolveQuery('Two blocked'))
}

function candidateIdAndIsolationTests() {
  const catalog = createProductionRouteCatalog()
  const resolver = createCatalogResolver({ catalog })
  const fullId = 'variant:dangling-huluhai-zhuoyongcuo-out-and-back-1d'
  catalog.variants.find((variant) => variant.id === fullId).canonicalName = 'mutated injected catalog'
  catalog.routes.find((route) => route.id === 'route:dangling-huluhai-zhuoyongcuo').routeType = 'tour'
  const snapshotTarget = assertDirect(resolver.resolveCandidateId(fullId), 'candidate_id', fullId)
  assert.equal(snapshotTarget.canonicalName, '党岭村—葫芦海—卓雍措一日往返')
  assert.equal(snapshotTarget.route.routeType, 'trek')
  const full = assertDirect(resolver.resolveCandidateId(fullId), 'candidate_id', fullId)
  assert.equal(full.route.routeType, 'trek')
  assert.equal(full.routeVariant.fixedDays, 1)
  const blocked = assertDirect(resolver.resolveCandidateId('variant:wutai-grand-pilgrimage'), 'candidate_id', 'variant:wutai-grand-pilgrimage')
  assert.equal(blocked.capability, 'blocked')
  const placeOnly = assertDirect(resolver.resolveCandidateId('place:legacy:泰山'), 'candidate_id', 'place:legacy:泰山')
  assert.equal(placeOnly.routeType, null)
  assertNotFound(resolver.resolveCandidateId('place:legacy:党岭'))
  assertNotFound(resolver.resolveCandidateId('place:legacy:五台山朝台'))
  assertNotFound(resolver.resolveCandidateId('route:wutai-grand-pilgrimage'))
  assertNotFound(resolver.resolveCandidateId('variant:unknown'))
  assertNotFound(resolver.resolveCandidateId({}))

  const legacyFull = assertDirect(resolver.resolveCandidateId('builtin-route:党岭'), 'legacy_candidate_id', fullId)
  const legacyBlocked = assertDirect(resolver.resolveCandidateId('builtin-route:五台山朝台'), 'legacy_candidate_id', 'variant:wutai-grand-pilgrimage')
  const legacyPlace = assertDirect(resolver.resolveCandidateId('builtin-route:泰山'), 'legacy_candidate_id', 'place:legacy:泰山')
  assert.equal(legacyFull.capability, 'full')
  assert.equal(legacyBlocked.capability, 'blocked')
  assert.equal(legacyPlace.capability, 'place_only')

  const staleCatalog = makeMultiVariantCatalog()
  assertNotFound(createCatalogResolver({ catalog: staleCatalog }).resolveCandidateId('place:legacy:Multi place'))
  assertNotFound(createCatalogResolver({ catalog: staleCatalog }).resolveCandidateId('builtin-route:Multi place'))

  const target = resolver.resolveQuery('党岭').target
  target.canonicalName = 'mutated target'
  target.place.canonicalName = 'mutated nested place'
  target.route.routeType = 'tour'
  target.routeVariant.weatherSamplePoints[0].coordinate.lat = 0
  const next = resolver.resolveQuery('党岭').target
  assert.notEqual(next.canonicalName, 'mutated target')
  assert.notEqual(next.place.canonicalName, 'mutated nested place')
  assert.equal(next.route.routeType, 'trek')
  assert.notEqual(next.routeVariant.weatherSamplePoints[0].coordinate.lat, 0)

  const multiResolver = createCatalogResolver({ catalog: makeMultiVariantCatalog() })
  const candidateResult = multiResolver.resolveQuery('Multi place')
  assertCandidate(candidateResult.candidates[0], {
    candidateId: 'variant:multi-alpha',
    entityKind: 'route_variant',
    capability: 'full',
    canonicalName: 'Alpha route',
    region: 'Fixture region',
    routeType: 'trek',
    fixedDays: 1,
  })
  candidateResult.candidates[0].canonicalName = 'mutated candidate'
  assert.equal(multiResolver.resolveQuery('Multi place').candidates[0].canonicalName, 'Alpha route')
}

function productionExportAndNoIoTests() {
  const direct = resolveRouteQuery('党岭')
  assertDirect(direct, 'canonical_exact', 'variant:dangling-huluhai-zhuoyongcuo-out-and-back-1d')
  assertDirect(resolveRouteCandidateId('place:legacy:泰山'), 'candidate_id', 'place:legacy:泰山')

  const runtimeSource = fs.readFileSync(path.join(__dirname, '../cloudfunctions/getAdvice/data/catalog/runtime-catalog.js'), 'utf8')
  const resolverSource = fs.readFileSync(path.join(__dirname, '../cloudfunctions/getAdvice/domain/catalog-resolver.js'), 'utf8')
  const forbidden = /https|http|wx-server-sdk|cloudbase|\bfs\b|readFile|process\.env|database\s*\(/
  assert.equal(forbidden.test(runtimeSource), false)
  assert.equal(forbidden.test(resolverSource), false)

  const originalLoad = Module._load
  Module._load = function rejectExternalIo(request, parent, isMain) {
    if (['https', 'http', 'fs', 'wx-server-sdk'].includes(request)) throw new Error(`unexpected resolver dependency: ${request}`)
    return originalLoad.call(this, request, parent, isMain)
  }
  try {
    delete require.cache[require.resolve('../cloudfunctions/getAdvice/data/catalog/runtime-catalog')]
    delete require.cache[require.resolve('../cloudfunctions/getAdvice/domain/catalog-resolver')]
    const isolated = require('../cloudfunctions/getAdvice/domain/catalog-resolver')
    assertDirect(isolated.resolveRouteQuery('党岭'), 'canonical_exact', 'variant:dangling-huluhai-zhuoyongcuo-out-and-back-1d')
  } finally {
    Module._load = originalLoad
  }
}

function main() {
  productionCatalogTests()
  queryStageTests()
  blockedCollisionTests()
  candidateIdAndIsolationTests()
  productionExportAndNoIoTests()
  console.log('PASS: I13 production catalog and permanent-ID resolver contract')
}

try {
  main()
} catch (error) {
  console.error('FAIL: ' + error.message)
  process.exitCode = 1
}
