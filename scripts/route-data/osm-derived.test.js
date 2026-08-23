const assert = require('node:assert/strict')
const { createTripBaseBuilder } = require('../../cloudfunctions/getAdvice/trip-base')

const IDS = [
  'variant:osm-16162196-sanganbi-shuizukeng',
  'variant:osm-20072118-die-butterfly-trail',
  'variant:osm-20046643-pinghui-wetland-trail',
  'variant:osm-20739620-zhaogongshan-loop',
  'variant:osm-17841828-three-gorges-summit',
]

const EXPECTED = {
  'variant:osm-16162196-sanganbi-shuizukeng': { count: 897, first: [22.6624162, 114.4996587], last: [22.6977536, 114.4291095], aliases: ['三杆笔水祖坑徒步'], direction: 'point_to_point', startPoint: '三杆笔', endPoint: '水祖坑' },
  'variant:osm-20072118-die-butterfly-trail': { count: 138, first: [22.6399587, 114.3297848], last: [22.6578917, 114.3411226], aliases: ['深圳蝴蝶步道', '马峦山蝴蝶步道'], direction: 'point_to_point', startPoint: '朴树口', endPoint: '马峦山北门' },
  'variant:osm-20046643-pinghui-wetland-trail': { count: 186, first: [22.7253741, 114.3954554], last: [22.7102382, 114.4006842], aliases: ['坪惠湿地公园步道', '坪山湿地步道'], direction: 'point_to_point', startPoint: '聚龙山湿地生态园北门', endPoint: '坪山湿地公园南门' },
  'variant:osm-20739620-zhaogongshan-loop': { count: 211, first: [30.9639991, 103.5380078], last: [30.9639991, 103.5380078], aliases: ['赵公山东北徒步环线'], direction: 'loop', startPoint: '未命名环线起终点', endPoint: '未命名环线起终点' },
  'variant:osm-17841828-three-gorges-summit': { count: 413, first: [31.0412584, 109.574918], last: [31.0313051, 109.6254474], aliases: ['三峡之巅步道', '赤甲楼至三峡之巅'], direction: 'point_to_point', startPoint: '赤甲楼方向入口', endPoint: '三峡之巅' },
}

function haversineKm(a, b) {
  const radiusM = 6371008.8
  const radians = (value) => value * Math.PI / 180
  const latDelta = radians(b.lat - a.lat)
  const lonDelta = radians(b.lon - a.lon)
  const sinLat = Math.sin(latDelta / 2)
  const sinLon = Math.sin(lonDelta / 2)
  const h = sinLat * sinLat + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * sinLon * sinLon
  return (radiusM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))) / 1000
}

function assertClose(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: ${actual} !== ${expected}`)
}

function assertFrozenGeometryShape(variant) {
  const expected = EXPECTED[variant.id]
  const geometry = variant.routeGeometry.points
  assert.equal(geometry.length, expected.count, `${variant.id} full geometry count must remain exact`)
  assert.deepEqual([geometry[0].lat, geometry[0].lon], expected.first, `${variant.id} start endpoint must remain exact`)
  assert.deepEqual([geometry[geometry.length - 1].lat, geometry[geometry.length - 1].lon], expected.last, `${variant.id} end endpoint must remain exact`)
  if (variant.isLoop) assert.deepEqual(geometry[0], geometry[geometry.length - 1], `${variant.id} loop must close`)
}

function assertFrozenIdentity(variant) {
  const expected = EXPECTED[variant.id]
  assert.deepEqual(variant.aliases, expected.aliases, `${variant.id} aliases must remain exact and collision-safe`)
  assert.equal(variant.direction, expected.direction, `${variant.id} direction must remain deterministic`)
  assert.equal(variant.startPoint, expected.startPoint, `${variant.id} start identity must remain exact`)
  assert.equal(variant.endPoint, expected.endPoint, `${variant.id} end identity must remain exact`)
}

async function runOsmDerivedTests({ catalog }) {
  const variants = IDS.map((id) => catalog.getById(id))
  assert.equal(variants.filter(Boolean).length, IDS.length, '冻结批次必须包含恰好五条可搜索 full variant')
  for (const variant of variants) {
    const expected = EXPECTED[variant.id]
    const geometry = variant.routeGeometry.points
    assertFrozenIdentity(variant)
    assertFrozenGeometryShape(variant)
    let distance = 0
    let ascent = 0
    let descent = 0
    let highest = -Infinity
    for (let index = 0; index < geometry.length; index += 1) {
      highest = Math.max(highest, geometry[index].elevationM)
      if (index === 0) continue
      distance += haversineKm(geometry[index - 1], geometry[index])
      const delta = geometry[index].elevationM - geometry[index - 1].elevationM
      if (delta > 0) ascent += delta
      else descent -= delta
    }
    assert.equal(Math.floor(distance * 1000) / 1000, variant.distanceKm, `${variant.id} distance must be Haversine floor`)
    assertClose(ascent, variant.ascentM, `${variant.id} ascent must sum adjacent DEM deltas`)
    assertClose(descent, variant.descentM, `${variant.id} descent must sum adjacent DEM deltas`)
    assertClose(highest, variant.routeHighestPointElevationM, `${variant.id} highest elevation must be max DEM point`)
    assert.equal(variant.capability, 'full')
    assert.equal(variant.accessMode, 'walk')
    assert.equal(variant.operationalStatus, 'unknown')
    assert.equal(variant.routeGeometry.coordinateSystem, 'WGS84')
    assert.ok(variant.routeGeometry.points.length >= 2, 'full geometry must retain an ordered path')
    assert.ok(variant.routePreview.segments.every((segment) => segment.points.length >= 2))
    assert.ok(variant.routePreview.segments.reduce((sum, segment) => sum + segment.points.length, 0) <= 500)
    const previewPoints = variant.routePreview.segments.flatMap((segment) => segment.points)
    assert.deepEqual(previewPoints[0], { lat: expected.first[0], lon: expected.first[1] })
    assert.deepEqual(previewPoints[previewPoints.length - 1], { lat: expected.last[0], lon: expected.last[1] })
    const previewBounds = {
      minLat: Math.min(...previewPoints.map((point) => point.lat)),
      maxLat: Math.max(...previewPoints.map((point) => point.lat)),
      minLon: Math.min(...previewPoints.map((point) => point.lon)),
      maxLon: Math.max(...previewPoints.map((point) => point.lon)),
    }
    assert.deepEqual(variant.routePreview.bounds, previewBounds, `${variant.id} preview bounds must derive from preview projection`)
    const fullBounds = {
      minLat: Math.min(...geometry.map((point) => point.lat)),
      maxLat: Math.max(...geometry.map((point) => point.lat)),
      minLon: Math.min(...geometry.map((point) => point.lon)),
      maxLon: Math.max(...geometry.map((point) => point.lon)),
    }
    for (const [key, value] of Object.entries(fullBounds)) {
      assert.ok(key.startsWith('min') ? variant.routePreview.bounds[key] <= value : variant.routePreview.bounds[key] >= value, `${variant.id} preview bounds must enclose full geometry ${key}`)
    }
    assert.equal(variant.stages.length, 1)
    assert.equal(variant.stages[0].distanceKm, variant.distanceKm)
    assert.equal(variant.stages[0].ascentM, variant.ascentM)
    assert.equal(variant.stages[0].descentM, variant.descentM)
    const openDataSource = variant.sourceIds
      .map((sourceId) => catalog.getById(sourceId))
      .find((source) => source && source.kind === 'open_data')
    assert.ok(openDataSource, `${variant.id} must link an OSM open_data source`)
    assert.equal(openDataSource.license, 'ODbL-1.0')
    assert.match(openDataSource.attribution, /OpenStreetMap contributors/)
    assert.equal(openDataSource.provenance.provider, 'OpenStreetMap')
    assert.equal(openDataSource.provenance.snapshot, 'current-full')
    assert.ok(openDataSource.provenance.relationVersion > 0)
    assert.ok(openDataSource.provenance.wayVersions.length > 0)
    assert.ok(openDataSource.provenance.nodeVersions.length > 0)
    assert.match(openDataSource.provenance.checkedAt, /Z$/)
    if (variant.id === 'variant:osm-20046643-pinghui-wetland-trail') {
      assert.equal(
        variant.sourceIds.some((sourceId) => {
          const source = catalog.getById(sourceId)
          return source && source.kind === 'official'
        }),
        false,
        '20046643 contextual park page must not claim the exact route as an official source',
      )
    }
    const openDataFields = new Set(openDataSource.supports
      .filter((support) => support.entityId === variant.id)
      .map((support) => support.field))
    assert.equal(openDataFields.has('ascentM'), false, 'OSM must not claim elevation metrics')
    assert.equal(openDataFields.has('descentM'), false, 'OSM must not claim elevation metrics')
    assert.equal(openDataFields.has('routeHighestPointElevationM'), false, 'OSM must not claim DEM maxima')
    assert.equal(openDataFields.has('weatherSamplePoints'), false, 'OSM must not claim DEM samples')
    assert.equal(openDataFields.has('operationalStatus'), false, 'OSM must not claim opening status')
    const expectedOsmIdentityFields = variant.id === IDS[3]
      ? ['direction', 'isLoop', 'accessMode']
      : variant.id === IDS[4]
        ? ['isLoop', 'accessMode']
        : ['direction', 'startPoint', 'endPoint', 'isLoop', 'accessMode']
    for (const field of expectedOsmIdentityFields) {
      assert.equal(openDataFields.has(field), true, `${variant.id} OSM source must support ${field} without official overclaim`)
    }
    assert.match(variant.operationalStatusRationale, /unknown/)
    const elevationSource = variant.sourceIds
      .map((sourceId) => catalog.getById(sourceId))
      .find((source) => source && source.kind === 'trusted_api')
    assert.ok(elevationSource, `${variant.id} must link the trusted elevation source`)
    assert.match(elevationSource.publisher, /Copernicus DEM GLO-90/)
    const elevationFields = new Set(elevationSource.supports
      .filter((support) => support.entityId === variant.id)
      .map((support) => support.field))
    assert.equal(elevationFields.has('ascentM'), true)
    assert.equal(elevationFields.has('descentM'), true)
    assert.equal(elevationFields.has('routeHighestPointElevationM'), true)
    assert.equal(elevationFields.has('weatherSamplePoints'), true)
    assert.equal(elevationFields.has('routeGeometry'), true, 'trusted elevation source must claim only the elevation component joined into routeGeometry')
  }

  assert.equal(catalog.getById(IDS[0]).distanceKm, 17.088, '16162196 must use complete relation distance floor')
  assert.equal(catalog.getById(IDS[3]).direction, 'loop')
  assert.equal(catalog.getById(IDS[3]).isLoop, true)
  const zhaogongSource = catalog.getById(catalog.getById(IDS[3]).sourceIds
    .find((sourceId) => sourceId.startsWith('source:osm-')))
  assert.match(zhaogongSource.derivation, /residential/)

  const zhaogongAliasMutation = { ...variants[3], aliases: ['赵公山环线'] }
  assert.throws(() => assertFrozenIdentity(zhaogongAliasMutation), undefined, 'broad Zhao Gong Shan alias mutation must turn the identity contract RED')
  const zhaogongStartMutation = { ...variants[3], startPoint: '赵公山东北环线起点' }
  assert.throws(() => assertFrozenIdentity(zhaogongStartMutation), undefined, 'fabricated Zhao Gong Shan endpoint mutation must turn the identity contract RED')
  const sanganbiAliasMutation = { ...variants[0], aliases: ['三杆笔水祖坑徒步', '三杆笔—水祖坑主线'] }
  assert.throws(() => assertFrozenIdentity(sanganbiAliasMutation), undefined, 'truncated mainline alias mutation must turn the identity contract RED')

  const truncated = { ...variants[0], routeGeometry: { ...variants[0].routeGeometry, points: variants[0].routeGeometry.points.slice(0, -1) } }
  assert.throws(() => assertFrozenGeometryShape(truncated), undefined, 'removing 16162196 final detour point must turn the frozen geometry contract RED')
  const offset = { ...variants[0], routeGeometry: { ...variants[0].routeGeometry, points: variants[0].routeGeometry.points.map((point, index) => index === 0 ? { ...point, lat: point.lat + 0.001 } : point) } }
  assert.throws(() => assertFrozenGeometryShape(offset), undefined, 'offsetting a frozen endpoint must turn the geometry contract RED')

  const poisonVariant = variants[0]
  const route = catalog.getById(poisonVariant.routeId)
  const place = catalog.getById(route.placeId)
  const builder = createTripBaseBuilder({
    fetchRouteWeather: async () => ({ ok: false, error: 'offline', retryable: true }),
    resolveRouteSourceSummaries: (sourceIds) => sourceIds.map((sourceId) => {
      const source = catalog.getById(sourceId)
      return { id: source.id, tier: source.tier, kind: source.kind, title: source.title, publisher: source.publisher, url: source.url, checkedAt: source.checkedAt }
    }),
    now: () => new Date('2026-08-23T00:00:00.000Z'),
  })
  const built = await builder.build({
    target: { entityKind: 'route_variant', capability: 'full', routeVariant: { ...poisonVariant, routeGeometry: { poison: 'must not cross seam' } }, route, place, routeType: 'trek' },
    request: { date: '2026-08-24', startTimeLocal: '08:00', level: '中级' },
  })
  assert.equal(built.kind, 'built')
  assert.equal(Object.hasOwn(built.trustedBaseData.routeSnapshot, 'routeGeometry'), false, 'trip-base must not expose internal routeGeometry')
}

module.exports = { runOsmDerivedTests }
