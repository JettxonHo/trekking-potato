const assert = require('node:assert/strict')
const { BUILTIN_ROUTES } = require('../../cloudfunctions/getAdvice/data/routes')

const MANAGEMENT_SOURCE_ID = 'source:yulong-scenic-management-2026-08-07'
const COMMUNITY_GPX_SOURCE_ID = 'source:yulong-blue-moon-yunshanping-community-gpx-2026-08-07'
const ROUTE_ID = 'route:yulong-blue-moon-yunshanping'
const VARIANT_ID = 'variant:yulong-blue-moon-yunshanping-out-and-back-1d'

function testAggregatedYulongBlueMoonYunshanpingRecord(catalog) {
  assert.equal(BUILTIN_ROUTES.length, 175, 'I11 必须保留完整 legacy 基线')
  assert.equal(catalog.sources.length, 8, '聚合目录必须包含五台、武功山、四姑娘山与玉龙雪山的八个来源')
  assert.equal(catalog.places.length, 175, 'I11 不得新增 Place')
  assert(catalog.places.every((place) => place.sourceStatus === 'legacy_unverified'))
  assert.equal(catalog.routes.length, 4, '聚合目录必须包含四个 Route')
  assert.equal(catalog.variants.length, 4, '聚合目录必须包含三个 full 与一个 blocked Variant')
  assert.equal(catalog.variants.filter((variant) => variant.capability === 'full').length, 3)
  assert.equal(catalog.variants.filter((variant) => variant.capability === 'blocked').length, 1)

  const managementSource = catalog.getById(MANAGEMENT_SOURCE_ID)
  const communityGpxSource = catalog.getById(COMMUNITY_GPX_SOURCE_ID)
  const route = catalog.getById(ROUTE_ID)
  const variant = catalog.getById(VARIANT_ID)

  assert.deepEqual(managementSource, {
    id: MANAGEMENT_SOURCE_ID,
    tier: 'A',
    kind: 'government',
    title: '玉龙雪山景区票务公告',
    publisher: '丽江玉龙雪山省级旅游开发区管理委员会',
    url: 'https://www.lijiang.cn/article/172717.html',
    checkedAt: '2026-08-07',
    supports: [{
      entityId: VARIANT_ID,
      field: 'operationalStatus',
      method: 'derived',
      note: '公告证明景区与相关交通服务在运行，但正式交通、现场标识与未开发区域限制不能证明经审阅 GPX 完整徒步路径当前 open。',
    }],
  })
  assert.equal(communityGpxSource.tier, 'B')
  assert.equal(communityGpxSource.kind, 'reviewed_gpx')
  assert.equal(communityGpxSource.url, null)
  assert.equal(communityGpxSource.checkedAt, '2026-08-07')
  assert.deepEqual(
    communityGpxSource.supports.map(({ entityId, field, method }) => ({ entityId, field, method })),
    [
      { entityId: ROUTE_ID, field: 'canonicalName', method: 'derived' },
      { entityId: ROUTE_ID, field: 'routeType', method: 'direct' },
      { entityId: ROUTE_ID, field: 'summary', method: 'derived' },
      { entityId: VARIANT_ID, field: 'canonicalName', method: 'derived' },
      { entityId: VARIANT_ID, field: 'fixedDays', method: 'derived' },
      { entityId: VARIANT_ID, field: 'stages', method: 'derived' },
      { entityId: VARIANT_ID, field: 'distanceKm', method: 'derived' },
      { entityId: VARIANT_ID, field: 'ascentM', method: 'derived' },
      { entityId: VARIANT_ID, field: 'descentM', method: 'derived' },
      { entityId: VARIANT_ID, field: 'routeHighestPointElevationM', method: 'derived' },
      { entityId: VARIANT_ID, field: 'weatherSamplePoints', method: 'derived' },
    ],
    '社区 GPX 只支持其实际记录路线的路线事实与几何',
  )

  assert.deepEqual(route, {
    entityKind: 'route',
    id: ROUTE_ID,
    placeId: 'place:legacy:玉龙雪山',
    canonicalName: '蓝月谷—云杉坪徒步',
    aliases: ['蓝月谷云杉坪徒步', '玉龙雪山蓝月谷云杉坪徒步'],
    routeType: 'trek',
    summary: '从蓝月谷附近的玉龙雪山自然保护区派出所一带出发，徒步前往云杉坪后折返，在白水山庄一带结束的一日纯步行路线。',
    sourceIds: [COMMUNITY_GPX_SOURCE_ID],
  })
  assert.deepEqual(variant, {
    entityKind: 'route_variant',
    recordStatus: 'verified',
    capability: 'full',
    id: VARIANT_ID,
    routeId: ROUTE_ID,
    canonicalName: '蓝月谷—云杉坪徒步往返线',
    aliases: ['蓝月谷云杉坪一日往返', '丽江玉龙雪山蓝月谷云杉坪徒步往返线'],
    direction: 'out_and_back',
    startPoint: '玉龙雪山自然保护区派出所附近',
    endPoint: '白水山庄附近',
    isLoop: false,
    fixedDays: 1,
    stages: [{
      day: 1,
      startPoint: '玉龙雪山自然保护区派出所附近',
      endPoint: '白水山庄附近',
      distanceKm: 13.223,
      ascentM: 408,
      descentM: 379,
      durationHours: { min: 5.4, max: 5.4 },
      weatherSamplePointIds: ['yulong-blue-moon-start', 'yulong-yunshanping-high'],
    }],
    distanceKm: 13.223,
    ascentM: 408,
    descentM: 379,
    routeHighestPointElevationM: 3236,
    nearbyPeakElevationM: null,
    weatherSamplePoints: [{
      id: 'yulong-blue-moon-start',
      name: '蓝月谷起点区域',
      coordinate: { lat: 27.129605, lon: 100.246169, coordinateSystem: 'WGS84' },
      elevationM: 2916,
    }, {
      id: 'yulong-yunshanping-high',
      name: '云杉坪高点',
      coordinate: { lat: 27.146977, lon: 100.224182, coordinateSystem: 'WGS84' },
      elevationM: 3236,
    }],
    accessMode: 'walk',
    operationalStatus: 'unknown',
    verificationLevel: 'B',
    sourceIds: [MANAGEMENT_SOURCE_ID, COMMUNITY_GPX_SOURCE_ID],
    sourceCheckedAt: '2026-08-07',
  })

  const stageTotals = variant.stages.reduce((totals, stage) => ({
    distanceKm: totals.distanceKm + stage.distanceKm,
    ascentM: totals.ascentM + stage.ascentM,
    descentM: totals.descentM + stage.descentM,
  }), { distanceKm: 0, ascentM: 0, descentM: 0 })
  assert.deepEqual(stageTotals, {
    distanceKm: variant.distanceKm,
    ascentM: variant.ascentM,
    descentM: variant.descentM,
  }, '异体总量必须等于唯一个上海活动日 stage 的汇总')
  assert(variant.weatherSamplePoints.every((sample) => sample.coordinate.coordinateSystem === 'WGS84'))
  assert.equal(variant.routeHighestPointElevationM, variant.weatherSamplePoints[1].elevationM)
  assert.equal(variant.operationalStatus, 'unknown', '景区运营边界不得解释为 exact Variant open')
}

function runYulongBlueMoonYunshanpingTests({ catalog }) {
  testAggregatedYulongBlueMoonYunshanpingRecord(catalog)
}

module.exports = { runYulongBlueMoonYunshanpingTests }
