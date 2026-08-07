const assert = require('node:assert/strict')
const { BUILTIN_ROUTES } = require('../../cloudfunctions/getAdvice/data/routes')

const OFFICIAL_ROUTE_SOURCE_ID = 'source:gongga-laoyulin-yulongxi-official-2026-08-07'
const MANAGEMENT_SOURCE_ID = 'source:gongga-outdoor-management-2026-08-07'
const COMMUNITY_GPX_SOURCE_ID = 'source:gongga-southwest-community-gpx-2026-08-07'
const ROUTE_ID = 'route:gongga-laoyulin-yulongxi'
const VARIANT_ID = 'variant:gongga-laoyulin-yulongxi-point-to-point-3d'

function testAggregatedGonggaLaoyulinYulongxiRecord(catalog, fragment) {
  assert.equal(BUILTIN_ROUTES.length, 175, 'I12 必须保留完整 legacy 基线')
  assert.equal(catalog.sources.length, 11, '聚合目录必须包含四条 full 路线与 Wutai 的十一条 Source')
  assert.equal(catalog.places.length, 175, 'I12 不得新增 Place')
  assert(catalog.places.every((place) => place.sourceStatus === 'legacy_unverified'))
  assert.equal(catalog.routes.length, 5, '聚合目录必须包含五个 Route')
  assert.equal(catalog.variants.length, 5, '聚合目录必须包含四个 full 与一个 blocked Variant')
  assert.equal(catalog.variants.filter((variant) => variant.capability === 'full').length, 4)
  assert.equal(catalog.variants.filter((variant) => variant.capability === 'blocked').length, 1)

  const officialRouteSource = catalog.getById(OFFICIAL_ROUTE_SOURCE_ID)
  const managementSource = catalog.getById(MANAGEMENT_SOURCE_ID)
  const communityGpxSource = catalog.getById(COMMUNITY_GPX_SOURCE_ID)
  const route = catalog.getById(ROUTE_ID)
  const variant = catalog.getById(VARIANT_ID)

  assert.deepEqual(officialRouteSource, {
    id: OFFICIAL_ROUTE_SOURCE_ID,
    tier: 'A',
    kind: 'government',
    title: '在全省山地徒步旅游发展座谈会上的发言',
    publisher: '康定市人民政府办公室',
    url: 'https://www.kangding.gov.cn/lt_gzjh/article/585685',
    checkedAt: '2026-08-07',
    supports: [{
      entityId: ROUTE_ID,
      field: 'canonicalName',
      method: 'derived',
      note: '页面将“老榆林至贡嘎山玉龙西”称为已开发长线；项目规范名结合 reviewed GPX 的实际点序。',
    }, {
      entityId: ROUTE_ID,
      field: 'routeType',
      method: 'derived',
      note: '页面将该长线归入山地徒步；不以页面缺失的 GPX 几何推导行程。',
    }, {
      entityId: ROUTE_ID,
      field: 'summary',
      method: 'derived',
      note: '页面的老榆林至贡嘎山玉龙西长线身份与 reviewed GPX 实际点序结合形成。',
    }],
  })
  assert.deepEqual(managementSource, {
    id: MANAGEMENT_SOURCE_ID,
    tier: 'A',
    kind: 'government',
    title: '康定市关于禁止开展登山、徒步等户外活动的公告',
    publisher: '四川贡嘎山国家级自然保护区管理局、康定市教育和体育局、康定市文化广播电视和旅游局',
    url: 'https://www.kangding.gov.cn/ttxw/article/678900',
    checkedAt: '2026-08-07',
    supports: [{
      entityId: VARIANT_ID,
      field: 'operationalStatus',
      method: 'derived',
      note: '公告自 2025-11-20 起封闭点名山峰及全市未开发、未开放危险区域；未点名本 exact Variant，且 2023 已开发长线身份不能推导 open 或 blocked，故记录 unknown。',
    }],
  })
  assert.deepEqual(communityGpxSource, {
    id: COMMUNITY_GPX_SOURCE_ID,
    tier: 'B',
    kind: 'reviewed_gpx',
    title: '贡嘎西南坡·老榆林—玉龙西三日社区 GPX（去标识化审阅）',
    publisher: '第三方轨迹平台社区用户，经项目控制端审阅',
    url: null,
    checkedAt: '2026-08-07',
    supports: [{
      entityId: ROUTE_ID,
      field: 'canonicalName',
      method: 'derived',
      note: '经审阅 GPX 的实际点序与地标核对后规范化。',
    }, {
      entityId: ROUTE_ID,
      field: 'routeType',
      method: 'direct',
    }, {
      entityId: ROUTE_ID,
      field: 'summary',
      method: 'derived',
      note: '经审阅 GPX 的实际点序与三日点到点活动方式派生。',
    }, {
      entityId: VARIANT_ID,
      field: 'canonicalName',
      method: 'derived',
      note: '经审阅 GPX 的实际三日点到点轨迹派生。',
    }, {
      entityId: VARIANT_ID,
      field: 'fixedDays',
      method: 'derived',
      note: '按 Asia/Shanghai 活动日分为三日。',
    }, {
      entityId: VARIANT_ID,
      field: 'stages',
      method: 'derived',
      note: '按三个 Asia/Shanghai 活动日分段，不连接两个隔夜坐标桥。',
    }, {
      entityId: VARIANT_ID,
      field: 'distanceKm',
      method: 'derived',
      note: '每个活动日独立使用半径 6371008.8m 的 Haversine，汇总不连接隔夜桥。',
    }, {
      entityId: VARIANT_ID,
      field: 'ascentM',
      method: 'derived',
      note: '20m 等距重采样后以半径 2 中位滤波高程，按活动日累计正向变化。',
    }, {
      entityId: VARIANT_ID,
      field: 'descentM',
      method: 'derived',
      note: '20m 等距重采样后以半径 2 中位滤波高程，按活动日累计负向变化。',
    }, {
      entityId: VARIANT_ID,
      field: 'routeHighestPointElevationM',
      method: 'derived',
      note: '来自经审阅 GPX 的最高有效轨迹点，约 4872.5m 按整米记录。',
    }, {
      entityId: VARIANT_ID,
      field: 'weatherSamplePoints',
      method: 'derived',
      note: '按 GPX 1.1 WGS84 语义与地标交叉核对，每个活动日从轨迹高区选取一个样点。',
    }],
  })

  assert.deepEqual(route, {
    entityKind: 'route',
    id: ROUTE_ID,
    placeId: 'place:legacy:贡嘎西南坡',
    canonicalName: '贡嘎山·老榆林—玉龙西穿越',
    aliases: ['贡嘎西南坡', '贡嘎西南坡穿越'],
    routeType: 'trek',
    summary: '从老榆林方向进入，经格西草原、日乌且、莫西沟和玉龙西垭口，到玉龙西一带退出的三日点到点社区实录徒步路线。',
    sourceIds: [OFFICIAL_ROUTE_SOURCE_ID, COMMUNITY_GPX_SOURCE_ID],
  })
  assert.deepEqual(variant, {
    entityKind: 'route_variant',
    recordStatus: 'verified',
    capability: 'full',
    id: VARIANT_ID,
    routeId: ROUTE_ID,
    canonicalName: '贡嘎西南坡·老榆林—玉龙西三日线',
    aliases: ['贡嘎西南坡三日线', '老榆林—玉龙西三日穿越'],
    direction: 'point_to_point',
    startPoint: '老榆林徒步起点区域',
    endPoint: '玉龙西出山点',
    isLoop: false,
    fixedDays: 3,
    stages: [{
      day: 1,
      startPoint: '老榆林徒步起点区域',
      endPoint: '上日乌且营地',
      distanceKm: 20.638,
      ascentM: 1171.6,
      descentM: 92.7,
      durationHours: { min: 11.77, max: 11.77 },
      weatherSamplePointIds: ['gongga-riwuqie-camp-high'],
    }, {
      day: 2,
      startPoint: '上日乌且营地',
      endPoint: '莫西沟营地',
      distanceKm: 14.069,
      ascentM: 600.8,
      descentM: 972.9,
      durationHours: { min: 10.82, max: 10.82 },
      weatherSamplePointIds: ['gongga-riwuqie-pass-high'],
    }, {
      day: 3,
      startPoint: '莫西沟营地',
      endPoint: '玉龙西出山点',
      distanceKm: 10.185,
      ascentM: 619.7,
      descentM: 563.3,
      durationHours: { min: 7.98, max: 7.98 },
      weatherSamplePointIds: ['gongga-yulongxi-pass-high'],
    }],
    distanceKm: 44.892,
    ascentM: 2392.1,
    descentM: 1628.9,
    routeHighestPointElevationM: 4873,
    nearbyPeakElevationM: null,
    weatherSamplePoints: [{
      id: 'gongga-riwuqie-camp-high',
      name: '上日乌且营地高点',
      coordinate: { lat: 29.791363, lon: 101.836397, coordinateSystem: 'WGS84' },
      elevationM: 4305,
    }, {
      id: 'gongga-riwuqie-pass-high',
      name: '日乌且垭口轨迹高点',
      coordinate: { lat: 29.771295, lon: 101.806582, coordinateSystem: 'WGS84' },
      elevationM: 4873,
    }, {
      id: 'gongga-yulongxi-pass-high',
      name: '玉龙西垭口轨迹高点',
      coordinate: { lat: 29.650335, lon: 101.738087, coordinateSystem: 'WGS84' },
      elevationM: 4475,
    }],
    accessMode: 'walk',
    operationalStatus: 'unknown',
    verificationLevel: 'B',
    sourceIds: [MANAGEMENT_SOURCE_ID, COMMUNITY_GPX_SOURCE_ID],
    sourceCheckedAt: '2026-08-07',
  })
  assert.deepEqual(fragment, {
    sources: [officialRouteSource, managementSource, communityGpxSource],
    places: [],
    routes: [route],
    variants: [variant],
  }, '去标识化 fragment 不得携带 catalog 以外的个人、赛事或原始轨迹事实')

  const stageTotals = variant.stages.reduce((totals, stage) => ({
    distanceKm: totals.distanceKm + stage.distanceKm,
    ascentM: totals.ascentM + stage.ascentM,
    descentM: totals.descentM + stage.descentM,
  }), { distanceKm: 0, ascentM: 0, descentM: 0 })
  assert.deepEqual({
    distanceKm: Number(stageTotals.distanceKm.toFixed(3)),
    ascentM: Number(stageTotals.ascentM.toFixed(1)),
    descentM: Number(stageTotals.descentM.toFixed(1)),
  }, {
    distanceKm: Number(variant.distanceKm.toFixed(3)),
    ascentM: Number(variant.ascentM.toFixed(1)),
    descentM: Number(variant.descentM.toFixed(1)),
  }, 'Variant 总量必须等于三个上海活动日 stage 的汇总')
  assert.deepEqual(
    variant.stages.map((stage) => stage.weatherSamplePointIds),
    [
      ['gongga-riwuqie-camp-high'],
      ['gongga-riwuqie-pass-high'],
      ['gongga-yulongxi-pass-high'],
    ],
    '每个活动日必须只引用其实际高区 WGS84 样点',
  )
  assert(variant.weatherSamplePoints.every((sample) => sample.coordinate.coordinateSystem === 'WGS84'))
  assert.equal(variant.routeHighestPointElevationM, 4873, '路线最高点必须来自最高有效轨迹点')
  assert.equal(variant.weatherSamplePoints[1].elevationM, 4873, '第二日高区样点必须保持实际轨迹高点')
  assert.equal(variant.operationalStatus, 'unknown', '官方管理边界不得将 exact Variant 推导为 open 或 blocked')

}

function runGonggaLaoyulinYulongxiTests({ catalog, fragment }) {
  testAggregatedGonggaLaoyulinYulongxiRecord(catalog, fragment)
}

module.exports = { runGonggaLaoyulinYulongxiTests }
