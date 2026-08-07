const assert = require('node:assert/strict')
const { BUILTIN_ROUTES } = require('../../cloudfunctions/getAdvice/data/routes')

const OFFICIAL_ROUTE_SOURCE_ID = 'source:siguniang-erfeng-official-route-2026-08-07'
const MANAGEMENT_SOURCE_ID = 'source:siguniang-haizigou-management-2026-08-07'
const COMMUNITY_GPX_SOURCE_ID = 'source:siguniang-erfeng-community-gpx-2026-08-07'
const ROUTE_ID = 'route:siguniang-erfeng'
const VARIANT_ID = 'variant:siguniang-erfeng-haizigou-out-and-back-2d'

function testAggregatedSiguniangErfengRecord(catalog) {
  assert.equal(BUILTIN_ROUTES.length, 175, 'I09 必须保留完整 legacy 基线')
  assert.equal(catalog.sources.length, 6, '聚合目录必须包含 Wutai、武功山和四姑娘山的六个来源')
  assert.equal(catalog.places.length, 175, 'I09 不得新增 Place')
  assert(catalog.places.every((place) => place.sourceStatus === 'legacy_unverified'))
  assert.equal(catalog.routes.length, 3, '聚合目录必须包含三个 Route')
  assert.equal(catalog.variants.length, 3, '聚合目录必须包含两个 full 和一个 blocked Variant')
  assert.equal(catalog.variants.filter((variant) => variant.capability === 'full').length, 2)
  assert.equal(catalog.variants.filter((variant) => variant.capability === 'blocked').length, 1)

  const officialRouteSource = catalog.getById(OFFICIAL_ROUTE_SOURCE_ID)
  const managementSource = catalog.getById(MANAGEMENT_SOURCE_ID)
  const communityGpxSource = catalog.getById(COMMUNITY_GPX_SOURCE_ID)
  const route = catalog.getById(ROUTE_ID)
  const variant = catalog.getById(VARIANT_ID)

  assert.deepEqual(officialRouteSource, {
    id: OFFICIAL_ROUTE_SOURCE_ID,
    tier: 'A',
    kind: 'official',
    title: '四姑娘山二峰（海拔5276m）推荐行程',
    publisher: '四姑娘山风景名胜区管理局',
    url: 'https://www.sgns.cn/play/line',
    checkedAt: '2026-08-07',
    supports: [{
      entityId: ROUTE_ID,
      field: 'canonicalName',
      method: 'direct',
    }, {
      entityId: ROUTE_ID,
      field: 'routeType',
      method: 'derived',
      note: '来自官方二峰两日冲顶点序；页面近似距离/时长不作为 GPX 几何。',
    }, {
      entityId: ROUTE_ID,
      field: 'summary',
      method: 'derived',
      note: '来自官方二峰两日冲顶点序；页面近似距离/时长不作为 GPX 几何。',
    }, {
      entityId: VARIANT_ID,
      field: 'canonicalName',
      method: 'derived',
      note: '来自官方二峰两日冲顶点序；页面近似距离/时长不作为 GPX 几何。',
    }, {
      entityId: VARIANT_ID,
      field: 'fixedDays',
      method: 'direct',
    }, {
      entityId: VARIANT_ID,
      field: 'routeHighestPointElevationM',
      method: 'direct',
    }],
  })
  assert.deepEqual(managementSource, {
    id: MANAGEMENT_SOURCE_ID,
    tier: 'A',
    kind: 'government',
    title: '四姑娘山海子沟部分户外线路4月10日起恢复开放',
    publisher: '阿坝藏族羌族自治州人民政府',
    url: 'https://www.abazhou.gov.cn/abazhou/c101955/202604/a5ea16709bc94f44ac20950848ac3bf8.shtml',
    checkedAt: '2026-08-07',
    supports: [{
      entityId: VARIANT_ID,
      field: 'operationalStatus',
      method: 'derived',
      note: '仅部分线路恢复，封闭时段动态划定，赛事涉及区域可能暂停手续；不能证明本 Variant 当前 open。',
    }],
  })
  assert.deepEqual(communityGpxSource, {
    id: COMMUNITY_GPX_SOURCE_ID,
    tier: 'B',
    kind: 'reviewed_gpx',
    title: '四姑娘山二峰两日往返社区 GPX（去标识化审阅）',
    publisher: '第三方轨迹平台社区用户，经项目控制端审阅',
    url: null,
    checkedAt: '2026-08-07',
    supports: [{
      entityId: VARIANT_ID,
      field: 'stages',
      method: 'derived',
      note: '按 Asia/Shanghai 活动日拆分，不连接隔夜停留的坐标桥。',
    }, {
      entityId: VARIANT_ID,
      field: 'distanceKm',
      method: 'derived',
      note: '按分日 Haversine 汇总。',
    }, {
      entityId: VARIANT_ID,
      field: 'ascentM',
      method: 'derived',
      note: '20m 等距重采样并以半径 2 中位滤波高程后按分日汇总。',
    }, {
      entityId: VARIANT_ID,
      field: 'descentM',
      method: 'derived',
      note: '20m 等距重采样并以半径 2 中位滤波高程后按分日汇总。',
    }, {
      entityId: VARIANT_ID,
      field: 'weatherSamplePoints',
      method: 'derived',
      note: '按 GPX 1.1 WGS84 语义及地标交叉核对选取实际采样点。',
    }],
  })

  assert.deepEqual(route, {
    entityKind: 'route',
    id: ROUTE_ID,
    placeId: 'place:legacy:四姑娘山二峰',
    canonicalName: '四姑娘山二峰',
    aliases: ['四姑娘山二峰登山'],
    routeType: 'climb',
    summary: '从四姑娘山镇海子沟方向进入，经锅庄坪、打尖包至二峰大本营，次日登顶二峰后返回海子沟起点区域的两日高海拔攀登路线。',
    sourceIds: [OFFICIAL_ROUTE_SOURCE_ID],
  })
  assert.deepEqual(variant, {
    entityKind: 'route_variant',
    recordStatus: 'verified',
    capability: 'full',
    id: VARIANT_ID,
    routeId: ROUTE_ID,
    canonicalName: '四姑娘山二峰·海子沟两日往返线',
    aliases: ['四姑娘山二峰两日线', '海子沟二峰往返'],
    direction: 'out_and_back',
    startPoint: '海子沟徒步起点',
    endPoint: '海子沟徒步终点',
    isLoop: false,
    fixedDays: 2,
    stages: [{
      day: 1,
      startPoint: '海子沟徒步起点',
      endPoint: '二峰大本营',
      distanceKm: 12.995,
      ascentM: 1123.2,
      descentM: 53.2,
      durationHours: { min: 6.23, max: 6.23 },
      weatherSamplePointIds: ['siguniang-haizigou-start', 'siguniang-erfeng-base-camp'],
    }, {
      day: 2,
      startPoint: '二峰大本营',
      endPoint: '海子沟徒步终点',
      distanceKm: 19.584,
      ascentM: 966.2,
      descentM: 2040.7,
      durationHours: { min: 12.98, max: 12.98 },
      weatherSamplePointIds: ['siguniang-erfeng-base-camp', 'siguniang-erfeng-high', 'siguniang-haizigou-start'],
    }],
    distanceKm: 32.579,
    ascentM: 2089.4,
    descentM: 2093.9,
    routeHighestPointElevationM: 5276,
    nearbyPeakElevationM: null,
    weatherSamplePoints: [{
      id: 'siguniang-haizigou-start',
      name: '海子沟起终点',
      coordinate: { lat: 30.999177, lon: 102.841495, coordinateSystem: 'WGS84' },
      elevationM: 3246,
    }, {
      id: 'siguniang-erfeng-base-camp',
      name: '二峰大本营',
      coordinate: { lat: 31.046768, lon: 102.919293, coordinateSystem: 'WGS84' },
      elevationM: 4319,
    }, {
      id: 'siguniang-erfeng-high',
      name: '二峰高点',
      coordinate: { lat: 31.06886, lon: 102.908327, coordinateSystem: 'WGS84' },
      elevationM: 5254,
    }],
    accessMode: 'walk',
    operationalStatus: 'unknown',
    verificationLevel: 'B',
    sourceIds: [OFFICIAL_ROUTE_SOURCE_ID, MANAGEMENT_SOURCE_ID, COMMUNITY_GPX_SOURCE_ID],
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
  }, '变体总量必须等于两个上海活动日 stage 的汇总')
  assert.deepEqual(
    variant.stages.map((stage) => stage.weatherSamplePointIds),
    [
      ['siguniang-haizigou-start', 'siguniang-erfeng-base-camp'],
      ['siguniang-erfeng-base-camp', 'siguniang-erfeng-high', 'siguniang-haizigou-start'],
    ],
    '两个 stage 必须按合同引用实际的 WGS84 天气采样点',
  )
  assert(variant.weatherSamplePoints.every((sample) => sample.coordinate.coordinateSystem === 'WGS84'))
  assert.equal(variant.routeHighestPointElevationM, 5276, '官方路线 Source 必须保留二峰路线最高点')
  assert.equal(variant.weatherSamplePoints[2].elevationM, 5254, 'GPX 高点只能作为天气采样海拔')
  assert.equal(variant.nearbyPeakElevationM, null, '官方峰高不得改写为 nearby peak')
  assert.equal(variant.operationalStatus, 'unknown', '动态管理资料不能把部分恢复解释为 Variant open')
}

function runSiguniangErfengTests({ catalog }) {
  testAggregatedSiguniangErfengRecord(catalog)
}

module.exports = { runSiguniangErfengTests }
