const assert = require('node:assert/strict')
const { summarizeSource, summarizeSources } = require('../cloudfunctions/getAdvice/domain/source-summary')
const {
  createCatalogResolver,
  resolveRouteSourceSummaries,
} = require('../cloudfunctions/getAdvice/domain/catalog-resolver')

assert.equal(typeof summarizeSource, 'function')
assert.equal(typeof summarizeSources, 'function')

const sources = [
  {
    id: 'source:test-route', tier: 'A', kind: 'official', title: '路线来源', publisher: '测试发布方',
    url: 'https://example.test/route', checkedAt: '2026-08-08', supports: [{ field: 'route', note: 'internal' }],
  },
  {
    id: 'source:test-variant', tier: 'B', kind: 'reviewed_track', title: '变体轨迹', publisher: '测试审阅方',
    url: null, checkedAt: '2026-08-07', supports: [{ field: 'variant', note: 'internal' }],
  },
  {
    id: 'source:test-place', tier: 'A', kind: 'government', title: '地点身份', publisher: '地点发布方',
    url: 'https://example.test/place', checkedAt: '2026-08-06', supports: [{ field: 'place', note: 'internal' }],
  },
]

const catalog = {
  sources,
  places: [{
    entityKind: 'place', capability: 'place_only', id: 'place:test', canonicalName: '测试地点', aliases: [],
    region: '测试地区', kind: 'mountain', referenceCoordinate: { lat: 30, lon: 100, coordinateSystem: 'WGS84' },
    sourceStatus: 'verified', sourceIds: ['source:test-place'],
  }],
  routes: [{
    entityKind: 'route', id: 'route:test', placeId: 'place:test', canonicalName: '测试路线', aliases: [],
    routeType: 'trek', summary: '测试路线摘要', sourceIds: ['source:test-route'],
  }],
  variants: [{
    entityKind: 'route_variant', recordStatus: 'verified', capability: 'full', id: 'variant:test', routeId: 'route:test',
    canonicalName: '测试变体', aliases: [], fixedDays: 1, sourceIds: ['source:test-variant'],
  }],
}

function exactKeys(value) {
  return Object.keys(value).sort()
}

function expected(source) {
  return {
    id: source.id,
    tier: source.tier,
    kind: source.kind,
    title: source.title,
    publisher: source.publisher,
    url: source.url,
    checkedAt: source.checkedAt,
  }
}

const single = summarizeSource(sources[0])
assert.deepEqual(single, expected(sources[0]))
assert.deepEqual(exactKeys(single), ['checkedAt', 'id', 'kind', 'publisher', 'tier', 'title', 'url'])
assert.equal(Object.hasOwn(single, 'supports'), false)

const directSummaries = summarizeSources([sources[1], sources[0]])
assert.deepEqual(directSummaries, [expected(sources[1]), expected(sources[0])], 'pure projection preserves supplied order')
directSummaries[0].title = 'mutated summary'
assert.equal(sources[1].title, '变体轨迹', 'projection must isolate source input')

const resolver = createCatalogResolver({ catalog })
const target = resolver.resolveQuery('测试变体')
assert.equal(target.kind, 'direct')
assert.equal(target.target.candidateId, 'variant:test')
const summaries = resolver.summarizeSources(['source:test-variant', 'source:test-route'])
assert.deepEqual(summaries, [expected(sources[1]), expected(sources[0])])
summaries[0].publisher = 'mutated resolver result'
assert.equal(resolver.summarizeSources(['source:test-variant'])[0].publisher, '测试审阅方')

// Resolver-owned snapshot: mutating the caller catalog after factory creation
// must not alter either target resolution or Source summary lookup.
catalog.sources[1].title = 'caller mutation'
catalog.variants[0].canonicalName = 'caller mutation'
assert.equal(resolver.resolveQuery('测试变体').target.canonicalName, '测试变体')
assert.equal(resolver.summarizeSources(['source:test-variant'])[0].title, '变体轨迹')

assert.throws(
  () => resolver.summarizeSources(['source:missing']),
  /Unknown source ID/,
  'unknown trusted Source ID is a catalog-integrity error',
)

const productionSummary = resolveRouteSourceSummaries(['source:wugong-community-gpx-2026-08-07'])
assert.deepEqual(exactKeys(productionSummary[0]), ['checkedAt', 'id', 'kind', 'publisher', 'tier', 'title', 'url'])
assert.equal(productionSummary[0].id, 'source:wugong-community-gpx-2026-08-07')
assert.equal(Object.hasOwn(productionSummary[0], 'supports'), false)

console.log('PASS: source summary contract')
