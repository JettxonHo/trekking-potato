const assert = require('node:assert/strict')
const { BUILTIN_ROUTES } = require('../../cloudfunctions/getAdvice/data/routes')

const WUGONG_SOURCE_ID = 'source:wugong-community-gpx-2026-08-07'
const WUGONG_ROUTE_ID = 'route:wugongshan-reverse-traverse'
const WUGONG_VARIANT_ID = 'variant:wugongshan-longshan-to-main-gate-2d'

function testAggregatedWugongshanReverseRecord(catalog) {
  assert.equal(BUILTIN_ROUTES.length, 175, 'I08 必须保留完整 legacy 基线')
  assert.equal(catalog.sources.length, 3, '聚合目录必须包含两个 Wutai 来源和一个武功山 GPX 来源')
  assert.equal(catalog.places.length, 175, 'I08 不得新增 Place')
  assert(catalog.places.every((place) => place.sourceStatus === 'legacy_unverified'))
  assert.equal(catalog.routes.length, 2, '聚合目录必须包含武功山 Route 与 Wutai Route')
  assert.equal(catalog.variants.length, 2, '聚合目录必须包含一个 full 和一个 blocked Variant')
  assert.equal(catalog.variants.filter((variant) => variant.capability === 'full').length, 1)
  assert.equal(catalog.variants.filter((variant) => variant.capability === 'blocked').length, 1)

  const source = catalog.getById(WUGONG_SOURCE_ID)
  const route = catalog.getById(WUGONG_ROUTE_ID)
  const variant = catalog.getById(WUGONG_VARIANT_ID)

  assert.deepEqual(source, {
    id: WUGONG_SOURCE_ID,
    tier: 'B',
    kind: 'reviewed_gpx',
    title: '武功山反穿社区 GPX（去标识化审阅）',
    publisher: '第三方轨迹平台社区用户，经项目控制端审阅',
    url: null,
    checkedAt: '2026-08-07',
    supports: [{
      entityId: WUGONG_ROUTE_ID,
      field: 'canonicalName',
      method: 'direct',
    }, {
      entityId: WUGONG_ROUTE_ID,
      field: 'routeType',
      method: 'direct',
    }, {
      entityId: WUGONG_ROUTE_ID,
      field: 'summary',
      method: 'direct',
    }, {
      entityId: WUGONG_VARIANT_ID,
      field: 'canonicalName',
      method: 'derived',
      note: '经审阅 GPX 的实际点序与两日活动记录派生。',
    }, {
      entityId: WUGONG_VARIANT_ID,
      field: 'fixedDays',
      method: 'derived',
      note: '按 Asia/Shanghai 活动日分为两日。',
    }, {
      entityId: WUGONG_VARIANT_ID,
      field: 'stages',
      method: 'derived',
      note: '按上海活动日分段，不连接约 5.8 米的隔夜坐标桥。',
    }, {
      entityId: WUGONG_VARIANT_ID,
      field: 'distanceKm',
      method: 'derived',
      note: '分日审阅汇总。',
    }, {
      entityId: WUGONG_VARIANT_ID,
      field: 'ascentM',
      method: 'derived',
      note: '分日审阅汇总，排除无效零高程。',
    }, {
      entityId: WUGONG_VARIANT_ID,
      field: 'descentM',
      method: 'derived',
      note: '分日审阅汇总，排除无效零高程。',
    }, {
      entityId: WUGONG_VARIANT_ID,
      field: 'routeHighestPointElevationM',
      method: 'derived',
      note: '来自清洗后的审阅轨迹最高有效点。',
    }, {
      entityId: WUGONG_VARIANT_ID,
      field: 'weatherSamplePoints',
      method: 'derived',
      note: 'GPX 点序与地标交叉核对后的 WGS84 采样点。',
    }, {
      entityId: WUGONG_VARIANT_ID,
      field: 'operationalStatus',
      method: 'derived',
      note: 'GPX 不证明当前开放，故记录 unknown。',
    }],
  })

  assert.deepEqual(route, {
    entityKind: 'route',
    id: WUGONG_ROUTE_ID,
    placeId: 'place:legacy:武功山反穿',
    canonicalName: '武功山反穿',
    aliases: ['龙山村反穿武功山'],
    routeType: 'trek',
    summary: '从龙山村进入，经武功山山脊与金顶，由景区正门退出的两日纯步行反穿路线。',
    sourceIds: [WUGONG_SOURCE_ID],
  })

  assert.deepEqual(variant, {
    entityKind: 'route_variant',
    recordStatus: 'verified',
    capability: 'full',
    id: WUGONG_VARIANT_ID,
    routeId: WUGONG_ROUTE_ID,
    canonicalName: '武功山·龙山村至景区正门反穿二日徒步线',
    aliases: ['武功山反穿两日线'],
    direction: 'point_to_point',
    startPoint: '龙山村徒步起点',
    endPoint: '武功山景区正门',
    isLoop: false,
    fixedDays: 2,
    stages: [{
      day: 1,
      startPoint: '龙山村徒步起点',
      endPoint: '观音宕首日住宿点',
      distanceKm: 14.126,
      ascentM: 1767,
      descentM: 738,
      durationHours: { min: 5.42, max: 5.42 },
      weatherSamplePointIds: ['wugong-longshan-start', 'wugong-guanyindang-overnight'],
    }, {
      day: 2,
      startPoint: '观音宕首日住宿点',
      endPoint: '武功山景区正门',
      distanceKm: 9.539,
      ascentM: 433.5,
      descentM: 1421.5,
      durationHours: { min: 4.32, max: 4.32 },
      weatherSamplePointIds: ['wugong-guanyindang-overnight', 'wugong-jinding-high'],
    }],
    distanceKm: 23.665,
    ascentM: 2200.5,
    descentM: 2159.5,
    routeHighestPointElevationM: 1915,
    nearbyPeakElevationM: null,
    weatherSamplePoints: [{
      id: 'wugong-longshan-start',
      name: '龙山村起点',
      coordinate: { lat: 27.537922, lon: 114.171427, coordinateSystem: 'WGS84' },
      elevationM: 556,
    }, {
      id: 'wugong-guanyindang-overnight',
      name: '观音宕住宿点',
      coordinate: { lat: 27.474087, lon: 114.181005, coordinateSystem: 'WGS84' },
      elevationM: 1596.9,
    }, {
      id: 'wugong-jinding-high',
      name: '金顶高点',
      coordinate: { lat: 27.455233, lon: 114.173342, coordinateSystem: 'WGS84' },
      elevationM: 1915,
    }],
    accessMode: 'walk',
    operationalStatus: 'unknown',
    verificationLevel: 'B',
    sourceIds: [WUGONG_SOURCE_ID],
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
  assert.equal(variant.operationalStatus, 'unknown', '社区 GPX 不能证明当前开放')
}

function runWugongshanReverseTests({ catalog }) {
  testAggregatedWugongshanReverseRecord(catalog)
}

module.exports = { runWugongshanReverseTests }
