const assert = require('node:assert/strict')
const { BUILTIN_ROUTES } = require('../../cloudfunctions/getAdvice/data/routes')

const BLOCKED_FULL_FIELDS = [
  'direction',
  'startPoint',
  'endPoint',
  'isLoop',
  'fixedDays',
  'stages',
  'distanceKm',
  'ascentM',
  'descentM',
  'routeHighestPointElevationM',
  'nearbyPeakElevationM',
  'weatherSamplePoints',
  'accessMode',
]

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function makeCatalogInput(fragment) {
  return {
    legacyRecords: BUILTIN_ROUTES,
    sources: clone(fragment.sources),
    places: clone(fragment.places),
    routes: clone(fragment.routes),
    variants: clone(fragment.variants),
  }
}

function expectInvalidCatalog(createRouteCatalog, input, expectedIssue) {
  assert.throws(
    () => createRouteCatalog(input),
    (error) => {
      assert.equal(error.code, 'invalid_route_catalog', '无效试点数据必须使用 I07 统一错误码')
      assert(error.issues.some((issue) => (
        issue.code === expectedIssue.code && issue.path === expectedIssue.path
      )), `必须拒绝 ${expectedIssue.code} @ ${expectedIssue.path}`)
      return true
    },
  )
}

function testAggregatedWutaiBlockedRecord(catalog) {
  assert.equal(BUILTIN_ROUTES.length, 175, 'I10a 必须保留完整 legacy 基线')
  assert.equal(catalog.places.length, 175, '聚合目录不得新增 verified Place')
  assert(catalog.places.every((place) => place.sourceStatus === 'legacy_unverified'))
  assert.equal(catalog.routes.length, 1, '聚合目录必须只新增大朝台 Route')
  assert.equal(catalog.variants.length, 1, '聚合目录必须只新增一个 blocked Variant')
  assert.equal(catalog.variants.filter((variant) => variant.capability === 'full').length, 0)

  const route = catalog.getById('route:wutai-grand-pilgrimage')
  const variant = catalog.getById('variant:wutai-grand-pilgrimage')
  const routeIdentitySource = catalog.getById('source:wutai-dailuoding-2021')
  const restrictionSource = catalog.getById('source:wutai-no-summit-hiking-2026-07-31')

  assert.deepEqual(route, {
    entityKind: 'route',
    id: 'route:wutai-grand-pilgrimage',
    placeId: 'place:legacy:五台山朝台',
    canonicalName: '五台山大朝台',
    aliases: ['五台山朝台'],
    routeType: 'trek',
    summary: '亲登五座台顶的大朝台路线；当前只保留官方禁行记录，不提供可规划行程。',
    sourceIds: ['source:wutai-dailuoding-2021'],
  })
  assert.deepEqual(variant.restriction, {
    reason: '五台山风景名胜区管理委员会关于全域禁止台顶徒步的公告',
    scope: '台顶徒步',
    effectiveFrom: null,
    effectiveTo: null,
    sourceIds: ['source:wutai-no-summit-hiking-2026-07-31'],
  })
  assert.equal(variant.recordStatus, 'blocked')
  assert.equal(variant.capability, 'blocked')
  assert.equal(variant.operationalStatus, 'blocked')
  assert.equal(variant.verificationLevel, 'A')
  assert.equal(variant.sourceCheckedAt, '2026-08-06')
  for (const field of BLOCKED_FULL_FIELDS) {
    assert.equal(Object.hasOwn(variant, field), false, `blocked 记录不得包含 ${field}`)
  }

  assert.deepEqual(routeIdentitySource, {
    id: 'source:wutai-dailuoding-2021',
    tier: 'A',
    kind: 'official',
    title: '黛螺顶',
    publisher: '五台山风景名胜区管理委员会',
    url: 'https://www.wtsykfwzx.com/ztzl_show.aspx?id=84',
    checkedAt: '2026-08-06',
    supports: [{
      entityId: 'route:wutai-grand-pilgrimage',
      field: 'canonicalName',
      method: 'direct',
    }],
  })
  assert.deepEqual(restrictionSource, {
    id: 'source:wutai-no-summit-hiking-2026-07-31',
    tier: 'A',
    kind: 'official',
    title: '五台山风景名胜区管理委员会关于全域禁止台顶徒步的公告',
    publisher: '五台山风景名胜区管理委员会',
    url: 'https://www.wtsykfwzx.com/tzzn_show.aspx?id=1129',
    checkedAt: '2026-08-06',
    supports: [{
      entityId: 'variant:wutai-grand-pilgrimage',
      field: 'restriction',
      method: 'direct',
    }, {
      entityId: 'variant:wutai-grand-pilgrimage',
      field: 'operationalStatus',
      method: 'derived',
      note: '公告标题禁止台顶徒步，派生 blocked 模型状态。',
    }],
  })
}

function testBlockedDataRejections(createRouteCatalog, fragment) {
  const tierBRestriction = clone(fragment)
  tierBRestriction.sources[1].tier = 'B'
  expectInvalidCatalog(createRouteCatalog, makeCatalogInput(tierBRestriction), {
    code: 'missing_evidence',
    path: 'variants[0].evidence.operationalStatus',
  })

  const missingRestrictionEvidence = clone(fragment)
  missingRestrictionEvidence.sources[1].supports = missingRestrictionEvidence.sources[1].supports
    .filter((support) => support.field !== 'restriction')
  expectInvalidCatalog(createRouteCatalog, makeCatalogInput(missingRestrictionEvidence), {
    code: 'missing_evidence',
    path: 'variants[0].evidence.restriction',
  })

  const blockedWithFullField = clone(fragment)
  blockedWithFullField.variants[0].fixedDays = 1
  expectInvalidCatalog(createRouteCatalog, makeCatalogInput(blockedWithFullField), {
    code: 'forbidden_field',
    path: 'variants[0].fixedDays',
  })
}

function runWutaiTests({ catalog, createRouteCatalog, fragment }) {
  testAggregatedWutaiBlockedRecord(catalog)
  testBlockedDataRejections(createRouteCatalog, fragment)
}

module.exports = { runWutaiTests }
