const assert = require('node:assert/strict')
const { BUILTIN_ROUTES } = require('../../cloudfunctions/getAdvice/data/routes')

const IDENTITY_SOURCE_ID = 'source:dangling-route-identity-2026-08-07'
const MANAGEMENT_SOURCE_ID = 'source:dangling-winter-management-2026-08-07'
const REVIEWED_TRACK_SOURCE_ID = 'source:dangling-huluhai-zhuoyongcuo-reviewed-track-2026-08-07'
const ROUTE_ID = 'route:dangling-huluhai-zhuoyongcuo'
const VARIANT_ID = 'variant:dangling-huluhai-zhuoyongcuo-out-and-back-1d'

function testAggregatedDanglingHuluhaiZhuoyongcuoRecord(catalog, fragment) {
  assert.equal(BUILTIN_ROUTES.length, 175, 'I10c 必须保留完整 legacy 基线')
  assert.equal(catalog.sources.length, 14, '聚合目录必须包含五条 full 路线与 Wutai 的十四条 Source')
  assert.equal(catalog.places.length, 175, 'I10c 不得新增 Place')
  assert(catalog.places.every((place) => place.sourceStatus === 'legacy_unverified'))
  assert.equal(catalog.routes.length, 6, '聚合目录必须包含六个 Route')
  assert.equal(catalog.variants.length, 6, '聚合目录必须包含五个 full 与一个 blocked Variant')
  assert.equal(catalog.variants.filter((variant) => variant.capability === 'full').length, 5)
  assert.equal(catalog.variants.filter((variant) => variant.capability === 'blocked').length, 1)

  const identitySource = catalog.getById(IDENTITY_SOURCE_ID)
  const managementSource = catalog.getById(MANAGEMENT_SOURCE_ID)
  const reviewedTrackSource = catalog.getById(REVIEWED_TRACK_SOURCE_ID)
  const route = catalog.getById(ROUTE_ID)
  const variant = catalog.getById(VARIANT_ID)

  assert.deepEqual(identitySource, {
    id: IDENTITY_SOURCE_ID,
    tier: 'A',
    kind: 'government',
    title: '以政协之智 展政协之为——丹巴县政协以小微协商助力党岭景区摩托车载客等乱象整治',
    publisher: '政协甘孜藏族自治州委员会',
    url: 'https://www.gzzzx.gov.cn/go-a855.htm',
    checkedAt: '2026-08-07',
    supports: [{
      entityId: ROUTE_ID,
      field: 'canonicalName',
      method: 'derived',
      note: '页面同时明确葫芦海、卓雍措与党岭徒步旅游身份；exact 点序与规范名由 reviewed track 补足。',
    }, {
      entityId: ROUTE_ID,
      field: 'routeType',
      method: 'derived',
      note: '页面将相关活动描述为登山徒步；不以页面缺失的几何推导行程。',
    }, {
      entityId: ROUTE_ID,
      field: 'summary',
      method: 'derived',
      note: '页面的党岭—葫芦海—卓雍措区域身份与 reviewed track 实际点序结合形成。',
    }],
  })
  assert.deepEqual(managementSource, {
    id: MANAGEMENT_SOURCE_ID,
    tier: 'A',
    kind: 'government',
    title: '甘孜：丹巴党岭的迷途引路人',
    publisher: '丹巴县人民政府（县融媒体中心）',
    url: 'https://www.danba.gov.cn/ttxw/article/680325',
    checkedAt: '2026-08-07',
    supports: [{
      entityId: VARIANT_ID,
      field: 'operationalStatus',
      method: 'derived',
      note: '页面证明党岭区域徒步线路自 2025-11-15 起进入当次冬季关闭；未证明 2026-08-07 仍封闭，且未找到一手当前开放原文，故记录 unknown。',
    }],
  })
  assert.deepEqual(reviewedTrackSource, {
    id: REVIEWED_TRACK_SOURCE_ID,
    tier: 'B',
    kind: 'reviewed_track',
    title: '党岭村—葫芦海—卓雍措一日 KML 轨迹（用户自有，去标识化审阅）',
    publisher: '用户本人，经项目控制端审阅',
    url: null,
    checkedAt: '2026-08-07',
    supports: [{
      entityId: ROUTE_ID,
      field: 'canonicalName',
      method: 'derived',
      note: 'KML 实际点序经党岭村、葫芦海与卓雍措地标核对后规范化。',
    }, {
      entityId: ROUTE_ID,
      field: 'routeType',
      method: 'direct',
    }, {
      entityId: ROUTE_ID,
      field: 'summary',
      method: 'derived',
      note: '由 KML 的单日纯步行往返形态和地标点序派生。',
    }, {
      entityId: VARIANT_ID,
      field: 'canonicalName',
      method: 'derived',
      note: '由 KML 的单日往返形态与实际地标点序派生。',
    }, {
      entityId: VARIANT_ID,
      field: 'fixedDays',
      method: 'derived',
      note: '按 Asia/Shanghai 活动日为一日。',
    }, {
      entityId: VARIANT_ID,
      field: 'stages',
      method: 'derived',
      note: '单一活动日连续轨迹；参考时长按首末时间向上取整到整分钟。',
    }, {
      entityId: VARIANT_ID,
      field: 'distanceKm',
      method: 'derived',
      note: '对连续 WGS84 轨迹点使用半径 6371008.8m 的 Haversine。',
    }, {
      entityId: VARIANT_ID,
      field: 'ascentM',
      method: 'derived',
      note: '20m 等距重采样后以半径 2 中位滤波高程，累计正向变化。',
    }, {
      entityId: VARIANT_ID,
      field: 'descentM',
      method: 'derived',
      note: '20m 等距重采样后以半径 2 中位滤波高程，累计负向变化。',
    }, {
      entityId: VARIANT_ID,
      field: 'routeHighestPointElevationM',
      method: 'derived',
      note: '来自 KML 最高有效轨迹点 4341.2m，按整米记录。',
    }, {
      entityId: VARIANT_ID,
      field: 'weatherSamplePoints',
      method: 'derived',
      note: '按 KML WGS84 语义与地标交叉核对，选择低区起点和卓雍措方向轨迹高点。',
    }],
  })

  assert.deepEqual(route, {
    entityKind: 'route',
    id: ROUTE_ID,
    placeId: 'place:legacy:党岭',
    canonicalName: '党岭·葫芦海—卓雍措徒步',
    aliases: ['党岭葫芦海卓雍措', '党岭卓雍措往返'],
    routeType: 'trek',
    summary: '从党岭村出发，经葫芦海到卓雍措湖畔方向后返回党岭村区域的一日社区实录徒步路线。',
    sourceIds: [IDENTITY_SOURCE_ID, REVIEWED_TRACK_SOURCE_ID],
  })
  assert.deepEqual(variant, {
    entityKind: 'route_variant',
    recordStatus: 'verified',
    capability: 'full',
    id: VARIANT_ID,
    routeId: ROUTE_ID,
    canonicalName: '党岭村—葫芦海—卓雍措一日往返',
    aliases: ['党岭葫芦海卓雍措一日线', '党岭村—卓雍措往返'],
    direction: 'out_and_back',
    startPoint: '党岭村徒步起点区域',
    endPoint: '党岭村徒步终点区域',
    isLoop: false,
    fixedDays: 1,
    stages: [{
      day: 1,
      startPoint: '党岭村徒步起点区域',
      endPoint: '党岭村徒步终点区域',
      distanceKm: 19.067,
      ascentM: 1009.4,
      descentM: 955.8,
      durationHours: { min: 12.18, max: 12.18 },
      weatherSamplePointIds: ['dangling-village-trailhead', 'dangling-zhuoyongcuo-track-high'],
    }],
    distanceKm: 19.067,
    ascentM: 1009.4,
    descentM: 955.8,
    routeHighestPointElevationM: 4341,
    nearbyPeakElevationM: null,
    weatherSamplePoints: [{
      id: 'dangling-village-trailhead',
      name: '党岭村徒步起点区域',
      coordinate: { lat: 31.075586, lon: 101.403937, coordinateSystem: 'WGS84' },
      elevationM: 3383,
    }, {
      id: 'dangling-zhuoyongcuo-track-high',
      name: '卓雍措方向轨迹高点',
      coordinate: { lat: 31.051365, lon: 101.359981, coordinateSystem: 'WGS84' },
      elevationM: 4341,
    }],
    accessMode: 'walk',
    operationalStatus: 'unknown',
    verificationLevel: 'B',
    sourceIds: [MANAGEMENT_SOURCE_ID, REVIEWED_TRACK_SOURCE_ID],
    sourceCheckedAt: '2026-08-07',
  })
  assert.deepEqual(fragment, {
    sources: [identitySource, managementSource, reviewedTrackSource],
    places: [],
    routes: [route],
    variants: [variant],
  }, '去标识化 fragment 不得携带 catalog 以外的个人、原始 KML 或轨迹元数据')

  assert.deepEqual(variant.stages[0], {
    day: 1,
    startPoint: variant.startPoint,
    endPoint: variant.endPoint,
    distanceKm: variant.distanceKm,
    ascentM: variant.ascentM,
    descentM: variant.descentM,
    durationHours: { min: 12.18, max: 12.18 },
    weatherSamplePointIds: ['dangling-village-trailhead', 'dangling-zhuoyongcuo-track-high'],
  }, '单日 stage 必须完整反映冻结的 out-and-back 行程与两个实际 WGS84 样点')
}

function runDanglingHuluhaiZhuoyongcuoTests({ catalog, fragment }) {
  testAggregatedDanglingHuluhaiZhuoyongcuoRecord(catalog, fragment)
}

module.exports = { runDanglingHuluhaiZhuoyongcuoTests }
