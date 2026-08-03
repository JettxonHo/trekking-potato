/**
 * 徒步薯 - 路线类型契约测试（TP-P0-003，离线，不访问真实网络）
 *
 * 背景：climb/trek/tour 必须从路线数据贯穿匹配、解析、确定性规则、Prompt；
 * climb 不得静默退化为 trek，tour 不得被当作 climb，unknown 不得进入安全规则。
 *
 * 覆盖：
 * 1. 内置路线数据集类型审计（总数/各类型计数/无缺失/无非法）
 * 2. 各匹配路径保留类型（exact / 别名 / editDistance + needsConfirm）
 * 3. resolveLocation 内置/UGC/高德分支的 type 与 typeSource（mock wx-server-sdk 与 https）
 * 4. route-type.js 类型模块严格性（不接受大小写/空白/任意字符串变体）
 * 5. getGearRules 对 trek/climb/tour/unknown/banana/undefined 的确定性行为
 * 6. buildMessages 显式路线类型、来源与硬约束
 * 7. advice 阶段 baseData 路线类型结构一致性（纯函数 validateRouteTypeContract）
 *
 * 仅使用 Node 内置模块；wx-server-sdk 通过 require 缓存 mock，不安装依赖。
 * 用法: node scripts/route-type-contract-test.js
 */

// ===== mock wx-server-sdk（必须在 require geocode.js 之前安装）=====
const Module = require('module')
let ugcFixture = []
const WX_MOCK_ID = 'mock-wx-server-sdk'
require.cache[WX_MOCK_ID] = {
  id: WX_MOCK_ID,
  filename: WX_MOCK_ID,
  loaded: true,
  exports: {
    init: () => {},
    DYNAMIC_CURRENT_ENV: 'mock-env',
    database: () => ({
      collection: () => ({
        limit: () => ({ get: async () => ({ data: ugcFixture }) }),
        doc: () => ({ get: async () => ({ data: null }), update: async () => ({}), remove: async () => ({}) }),
        add: async () => ({ _id: 'mock-id' }),
      }),
      serverDate: () => 'mock-date',
    }),
    getWXContext: () => ({ OPENID: 'mock-openid' }),
  },
}
const originalResolveFilename = Module._resolveFilename
Module._resolveFilename = function (request, ...args) {
  if (request === 'wx-server-sdk') return WX_MOCK_ID
  return originalResolveFilename.apply(this, [request, ...args])
}

// 高德分支测试需要 AMAP_KEY 存在（不会发出真实请求，https 已被 mock）
process.env.AMAP_KEY = 'mock-amap-key'

// ===== mock https.get（仅用于高德/elevation 分支；按队列返回 payload）=====
const https = require('https')
const originalGet = https.get
let httpPayloads = []
function installHttpMock(payloads) {
  httpPayloads = payloads.slice()
}
https.get = (url, cb) => {
  const payload = httpPayloads.length > 0 ? httpPayloads.shift() : {}
  const handlers = {}
  const res = { on: (ev, h) => { handlers[ev] = h } }
  cb(res)
  if (handlers.data) handlers.data(JSON.stringify(payload))
  if (handlers.end) handlers.end()
  return { on: () => {}, setTimeout: () => {}, destroy: () => {} }
}

const { BUILTIN_ROUTES, matchBuiltinRoute } = require('../cloudfunctions/getAdvice/data/routes')
const { resolveLocation } = require('../cloudfunctions/getAdvice/geocode')
const { getGearRules } = require('../cloudfunctions/getAdvice/gear-rules')
const { buildMessages, SYSTEM_PROMPT } = require('../cloudfunctions/getAdvice/prompt')
const {
  ROUTE_TYPES,
  ROUTE_TYPE_SOURCES,
  isKnownRouteType,
  normalizeResolvedRouteType,
  getRouteTypeLabel,
  isKnownRouteTypeSource,
  validateRouteTypeContract,
} = require('../cloudfunctions/getAdvice/route-type')

let passed = 0
let failed = 0

function assert(name, condition, detail) {
  if (condition) {
    console.log('  PASS: ' + name)
    passed++
  } else {
    console.log('  FAIL: ' + name + (detail ? ' -> ' + detail : ''))
    failed++
  }
}

function essentialItems(rules) {
  return rules.essential.map((g) => g.item)
}

const TECH_GEAR = ['冰爪', '结组绳', '安全带', '头盔']
function hasTechnicalGear(rules) {
  const items = essentialItems(rules)
  return TECH_GEAR.some((t) => items.some((i) => i.indexOf(t) >= 0))
}

async function main() {
  try {
    console.log('=== 1. 内置路线数据集类型审计 ===')
    const counts = { trek: 0, climb: 0, tour: 0 }
    let missingOrIllegal = 0
    for (const r of BUILTIN_ROUTES) {
      if (isKnownRouteType(r.type)) counts[r.type]++
      else missingOrIllegal++
    }
    assert('BUILTIN_ROUTES 总数为 175', BUILTIN_ROUTES.length === 175, '实际=' + BUILTIN_ROUTES.length)
    assert('trek 为 153', counts.trek === 153, '实际=' + counts.trek)
    assert('climb 为 14', counts.climb === 14, '实际=' + counts.climb)
    assert('tour 为 8', counts.tour === 8, '实际=' + counts.tour)
    assert('无缺失或非法类型', missingOrIllegal === 0, '实际=' + missingOrIllegal)

    console.log('\n=== 2. 匹配路径保留类型 ===')
    const trekExact = matchBuiltinRoute('武功山')
    assert('trek 精确匹配保留 type=trek', trekExact && trekExact.type === 'trek' && trekExact.matchType === 'exact', trekExact ? JSON.stringify({ type: trekExact.type, matchType: trekExact.matchType }) : 'null')
    const climbExact = matchBuiltinRoute('四姑娘山二峰')
    assert('climb 精确匹配保留 type=climb', climbExact && climbExact.type === 'climb' && climbExact.matchType === 'exact', climbExact ? JSON.stringify({ type: climbExact.type, matchType: climbExact.matchType }) : 'null')
    const tourExact = matchBuiltinRoute('玉龙雪山')
    assert('tour 精确匹配保留 type=tour', tourExact && tourExact.type === 'tour' && tourExact.matchType === 'exact', tourExact ? JSON.stringify({ type: tourExact.type, matchType: tourExact.matchType }) : 'null')
    const climbAlias = matchBuiltinRoute('二峰')
    assert('climb 别名匹配保留 type=climb', climbAlias && climbAlias.name === '四姑娘山二峰' && climbAlias.type === 'climb', climbAlias ? JSON.stringify({ name: climbAlias.name, type: climbAlias.type }) : 'null')
    const fuzzy = matchBuiltinRoute('卖理浩径')
    assert('编辑距离匹配保留 type 且 needsConfirm=true', fuzzy && fuzzy.name === '麦理浩径' && fuzzy.matchType === 'editDistance' && fuzzy.needsConfirm === true && isKnownRouteType(fuzzy.type), fuzzy ? JSON.stringify({ name: fuzzy.name, type: fuzzy.type, needsConfirm: fuzzy.needsConfirm }) : 'null')

    console.log('\n=== 3. resolveLocation 内置分支透传可信类型 ===')
    const rlClimb = await resolveLocation('四姑娘山二峰')
    assert('四姑娘山二峰 → type=climb', rlClimb.ok && rlClimb.data.type === 'climb', JSON.stringify(rlClimb).substring(0, 200))
    assert('四姑娘山二峰 → typeSource=builtin', rlClimb.ok && rlClimb.data.typeSource === 'builtin', JSON.stringify(rlClimb.data && rlClimb.data.typeSource))
    const rlTrek = await resolveLocation('武功山')
    assert('武功山 → type=trek', rlTrek.ok && rlTrek.data.type === 'trek', JSON.stringify(rlTrek).substring(0, 200))
    assert('武功山 → typeSource=builtin', rlTrek.ok && rlTrek.data.typeSource === 'builtin', JSON.stringify(rlTrek.data && rlTrek.data.typeSource))
    const rlTour = await resolveLocation('玉龙雪山')
    assert('玉龙雪山 → type=tour', rlTour.ok && rlTour.data.type === 'tour', JSON.stringify(rlTour).substring(0, 200))
    assert('玉龙雪山 → typeSource=builtin', rlTour.ok && rlTour.data.typeSource === 'builtin', JSON.stringify(rlTour.data && rlTour.data.typeSource))
    const rlFuzzy = await resolveLocation('卖理浩径')
    assert('编辑距离解析保留 type/typeSource/matchType 且 needsConfirm', rlFuzzy.ok && rlFuzzy.data.needsConfirm === true && isKnownRouteType(rlFuzzy.data.type) && rlFuzzy.data.typeSource === 'builtin' && rlFuzzy.data.matchType === 'editDistance', JSON.stringify(rlFuzzy.data).substring(0, 200))

    console.log('\n=== 3b. resolveLocation UGC 分支 ===')
    ugcFixture = [{ name: '契约测试UGC新路线', lat: 30.1, lon: 120.1, elevation: 900, location: '测试省', type: 'climb' }]
    const rlUgcTyped = await resolveLocation('契约测试UGC新路线')
    assert('UGC 记录合法类型透传 type=climb/typeSource=ugc', rlUgcTyped.ok && rlUgcTyped.data.type === 'climb' && rlUgcTyped.data.typeSource === 'ugc', JSON.stringify(rlUgcTyped.data).substring(0, 200))
    ugcFixture = [{ name: '契约测试UGC旧记录', lat: 30.2, lon: 120.2, elevation: 700, location: '测试省' }]
    const rlUgcUntyped = await resolveLocation('契约测试UGC旧记录')
    assert('UGC 旧记录无类型 → type=unknown/typeSource=unknown（不默认 trek）', rlUgcUntyped.ok && rlUgcUntyped.data.type === 'unknown' && rlUgcUntyped.data.typeSource === 'unknown', JSON.stringify(rlUgcUntyped.data).substring(0, 200))
    ugcFixture = []

    console.log('\n=== 3c. resolveLocation 高德分支 ===')
    installHttpMock([
      { status: '1', pois: [{ name: '契约测试外部山峰', location: '116.50,40.20', typecode: '110200', cityname: '北京市', adname: '怀柔区' }] },
      { elevation: [1234] },
    ])
    const rlAmap = await resolveLocation('契约测试外部山峰甲')
    assert('高德 POI → type=unknown（高德无可信类型）', rlAmap.ok && rlAmap.data.type === 'unknown', JSON.stringify(rlAmap.data).substring(0, 200))
    assert('高德 POI → typeSource=amap 且保留 matchType', rlAmap.ok && rlAmap.data.typeSource === 'amap' && rlAmap.data.matchType === 'amap', JSON.stringify(rlAmap.data).substring(0, 200))
    installHttpMock([])

    console.log('\n=== 4. 类型模块严格性 ===')
    assert('合法枚举恰为 trek/climb/tour', JSON.stringify([...ROUTE_TYPES]) === JSON.stringify(['trek', 'climb', 'tour']))
    assert('三个合法类型被接受', isKnownRouteType('trek') && isKnownRouteType('climb') && isKnownRouteType('tour'))
    assert('unknown 不是业务类型（仅为解析状态）', !isKnownRouteType('unknown') && normalizeResolvedRouteType(undefined) === 'unknown')
    assert('normalize 已知类型原样返回', normalizeResolvedRouteType('climb') === 'climb')
    assert('normalize 非法输入归为 unknown', normalizeResolvedRouteType('banana') === 'unknown' && normalizeResolvedRouteType('TREK') === 'unknown' && normalizeResolvedRouteType(' trek ') === 'unknown')
    assert('空值/大小写/空白变体被拒绝', !isKnownRouteType('') && !isKnownRouteType(null) && !isKnownRouteType(undefined) && !isKnownRouteType('TREK') && !isKnownRouteType(' trek ') && !isKnownRouteType(123))
    assert('标签：徒步/攀登/游览/类型待确认', getRouteTypeLabel('trek') === '徒步' && getRouteTypeLabel('climb') === '攀登' && getRouteTypeLabel('tour') === '游览' && getRouteTypeLabel('unknown') === '类型待确认')
    assert('非法类型标签返回 null（不兜底）', getRouteTypeLabel('banana') === null && getRouteTypeLabel(undefined) === null)
    assert('类型来源枚举校验', ROUTE_TYPE_SOURCES.length === 5 && isKnownRouteTypeSource('builtin') && isKnownRouteTypeSource('ugc') && isKnownRouteTypeSource('amap') && isKnownRouteTypeSource('user') && isKnownRouteTypeSource('unknown') && !isKnownRouteTypeSource('server') && !isKnownRouteTypeSource(undefined))

    console.log('\n=== 5. 规则层类型差异（同条件 7月/5276m/2天/北纬31.1）===')
    const COMMON = { month: 7, elevation: 5276, days: 2, lat: 31.1 }
    const rulesTrek = getGearRules({ ...COMMON, routeType: 'trek' })
    const rulesClimb = getGearRules({ ...COMMON, routeType: 'climb' })
    const rulesTour = getGearRules({ ...COMMON, routeType: 'tour' })

    assert('climb 必有滑坠风险', rulesClimb.fatalRisks.includes('滑坠'), JSON.stringify(rulesClimb.fatalRisks))
    assert('climb 必有头盔/安全带/结组绳', ['头盔', '安全带', '结组绳'].every((g) => essentialItems(rulesClimb).includes(g)), JSON.stringify(essentialItems(rulesClimb)))
    assert('climb >=5000m 必有冰爪', essentialItems(rulesClimb).includes('冰爪'), JSON.stringify(essentialItems(rulesClimb)))
    assert('climb 返回 routeType 不被重写', rulesClimb.routeType === 'climb', rulesClimb.routeType)

    assert('trek 无滑坠风险', !rulesTrek.fatalRisks.includes('滑坠'), JSON.stringify(rulesTrek.fatalRisks))
    assert('trek 无 climb 技术装备', !hasTechnicalGear(rulesTrek), JSON.stringify(essentialItems(rulesTrek)))
    assert('trek 保留高海拔保暖逻辑', rulesTrek.recommended.some((g) => g.item === '防风保暖羽绒服'), JSON.stringify(rulesTrek.recommended.map((g) => g.item)))
    assert('trek 返回 routeType 不被重写', rulesTrek.routeType === 'trek', rulesTrek.routeType)

    assert('tour 不被当作 climb：无滑坠风险', !rulesTour.fatalRisks.includes('滑坠'), JSON.stringify(rulesTour.fatalRisks))
    assert('tour 不被当作 climb：无技术装备', !hasTechnicalGear(rulesTour), JSON.stringify(essentialItems(rulesTour)))
    assert('tour 使用 trek 装备基线（含高海拔保暖）', rulesTour.recommended.some((g) => g.item === '防风保暖羽绒服'), JSON.stringify(rulesTour.recommended.map((g) => g.item)))
    assert('tour 返回类型仍为 tour', rulesTour.routeType === 'tour', rulesTour.routeType)
    assert('tour 附带游览说明 ruleNote', rulesTour.ruleNotes.some((n) => n.includes('游览型路线')), JSON.stringify(rulesTour.ruleNotes))

    console.log('\n=== 5b. 低于 5000m 的 climb 不退化 ===')
    const rulesLowClimb = getGearRules({ month: 7, elevation: 3952, days: 1, lat: 23.5, routeType: 'climb' })
    assert('<5000m climb 仍有滑坠风险', rulesLowClimb.fatalRisks.includes('滑坠'), JSON.stringify(rulesLowClimb.fatalRisks))
    assert('<5000m climb 仍有核心技术装备', ['头盔', '安全带', '结组绳'].every((g) => essentialItems(rulesLowClimb).includes(g)), JSON.stringify(essentialItems(rulesLowClimb)))
    assert('<5000m climb 不加冰爪', !essentialItems(rulesLowClimb).includes('冰爪'), JSON.stringify(essentialItems(rulesLowClimb)))

    console.log('\n=== 5c. unknown/非法/缺失类型确定性拒绝 ===')
    for (const bad of ['unknown', 'banana', undefined, null, 'TREK', '']) {
      let threw = null
      try {
        getGearRules({ ...COMMON, routeType: bad })
      } catch (e) {
        threw = e
      }
      assert('getGearRules 拒绝 routeType=' + JSON.stringify(bad) + '（code=invalid_route_type）', threw && threw.code === 'invalid_route_type', threw ? threw.message : '未抛出')
    }

    console.log('\n=== 6. Prompt 显式路线类型与硬约束 ===')
    const promptMessages = buildMessages({
      route: '四姑娘山二峰',
      date: '2026-08-10',
      level: '小白',
      days: 2,
      weather: { days: [{ date: '2026-08-10', tempMin: 2, tempMax: 12, precipProb: 20, windMs: 6.5, confidence: '正常' }], windUnit: 'm/s' },
      gearRules: rulesClimb,
      sunEvents: null,
      microclimate: { humidity: null, windMs: 6.5, dewPointSpread: null },
      routeType: 'climb',
      routeTypeSource: 'builtin',
    })
    const userContent = promptMessages[1].content
    const systemContent = promptMessages[0].content
    assert('行程信息包含 路线类型：climb（攀登）', userContent.includes('路线类型：climb（攀登）'), userContent.substring(0, 300))
    assert('行程信息包含 类型来源：builtin', userContent.includes('类型来源：builtin'), userContent.substring(0, 300))
    assert('SYSTEM_PROMPT 包含不得猜测/覆盖类型约束', systemContent.includes('不得猜测、修改或覆盖路线类型'), systemContent.substring(0, 200))
    assert('SYSTEM_PROMPT 声明确定性安全约束不得因等级删除', systemContent.includes('essential 和 fatalRisks 属于确定性安全约束'), systemContent.substring(0, 200))
    assert('小白指令已删除无条件禁止技术装备', !userContent.includes('禁止推荐任何技术攀登装备'), '仍存在无条件禁止条款')
    assert('climb + 小白仍保留规则层技术装备约束', userContent.includes('如果路线类型为 climb：必须保留规则层提供的技术安全装备'), userContent.substring(0, 400))
    assert('非 climb 不无依据推荐技术装备的约束存在', userContent.includes('不得无依据添加技术攀登装备'), userContent.substring(0, 400))
    assert('SYSTEM_PROMPT 引用与常量一致', promptMessages[0].content === SYSTEM_PROMPT)

    const legacyMessages = buildMessages({
      route: '武功山',
      date: '2026-08-10',
      level: '中级',
      days: 1,
      weather: null,
      gearRules: null,
      sunEvents: null,
      microclimate: null,
    })
    assert('缺失类型时不注入 undefined 文本', !legacyMessages[1].content.includes('路线类型：undefined') && !legacyMessages[1].content.includes('类型来源：undefined'), legacyMessages[1].content.substring(0, 200))

    console.log('\n=== 7. advice 阶段 baseData 路线类型结构一致性 ===')
    const goodBase = { routeType: 'climb', routeTypeSource: 'builtin', gearRules: { routeType: 'climb' }, weather: null }
    assert('类型与 gearRules 一致时通过', validateRouteTypeContract(goodBase).ok === true, JSON.stringify(validateRouteTypeContract(goodBase)))
    assert('类型与 gearRules 不一致时拒绝', validateRouteTypeContract({ ...goodBase, gearRules: { routeType: 'trek' } }).ok === false)
    assert('routeType=unknown 拒绝', validateRouteTypeContract({ ...goodBase, routeType: 'unknown', gearRules: { routeType: 'unknown' } }).ok === false)
    assert('routeType 非法拒绝', validateRouteTypeContract({ ...goodBase, routeType: 'banana', gearRules: { routeType: 'banana' } }).ok === false)
    assert('缺失 routeType 拒绝', validateRouteTypeContract({ routeTypeSource: 'builtin', gearRules: { routeType: 'climb' } }).ok === false)
    assert('routeTypeSource 非法拒绝', validateRouteTypeContract({ ...goodBase, routeTypeSource: 'server' }).ok === false)
    assert('缺失 gearRules 拒绝', validateRouteTypeContract({ routeType: 'climb', routeTypeSource: 'builtin' }).ok === false)
    assert('baseData 为 null 拒绝', validateRouteTypeContract(null).ok === false)
  } finally {
    https.get = originalGet
    Module._resolveFilename = originalResolveFilename
  }

  console.log('\n=== 总结 ===')
  console.log('PASS: ' + passed + ', FAIL: ' + failed)
  if (failed > 0) {
    console.log('有失败项，请修复')
    process.exit(1)
  } else {
    console.log('全部通过')
  }
}

main().catch((e) => {
  https.get = originalGet
  Module._resolveFilename = originalResolveFilename
  console.log('  FAIL: 测试运行异常 -> ' + e.message)
  process.exit(1)
})
