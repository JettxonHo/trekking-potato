/**
 * 徒步薯 - 本地单元测试（不依赖网络）
 * 测试：编辑距离、装备规则、内置路线匹配、Prompt 契约、路线类型契约（TP-P0-003）
 * 用法: node scripts/unit-test.js
 */

const { matchBuiltinRoute, editDistance } = require('../cloudfunctions/getAdvice/data/routes')
const { getGearRules, getSeason, getElevationBand, getLatitudeBand } = require('../cloudfunctions/getAdvice/gear-rules')
const { getRouteTypeLabel, isKnownRouteType } = require('../cloudfunctions/getAdvice/route-type')

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

console.log('=== 编辑距离测试 ===')
assert('武功山==武功山 距离0', editDistance('武功山', '武功山') === 0)
assert('武当山≠武功山 距离1', editDistance('武当山', '武功山') === 1, '实际=' + editDistance('武当山', '武功山'))
assert('黄山≠庐山 距离1', editDistance('黄山', '庐山') === 1)

console.log('\n=== 内置路线匹配测试 ===')
const wg = matchBuiltinRoute('武功山')
assert('武功山 精确匹配', wg && wg.name === '武功山', wg ? wg.matchType : 'null')

const wg2 = matchBuiltinRoute('武功山金顶')
assert('武功山金顶 别名匹配', wg2 && wg2.name === '武功山', wg2 ? wg2.matchType : 'null')

const wd = matchBuiltinRoute('武当山')
assert('武当山 精确匹配(已有独立条目)', wd && wd.name === '武当山' && !wd.needsConfirm, wd ? 'matched:' + wd.name : 'null')

const notfound = matchBuiltinRoute('不存在的xyz山')
assert('不存在的山 返回null', notfound === null)

console.log('\n=== 装备规则测试 ===')
// TP-P0-003：getGearRules 现在只接受显式合法 routeType，
// 原有用例全部显式标注路线类型（断言本身保持不变）
// 夏季低海拔南方
const summer_low_south = getGearRules({ month: 7, elevation: 500, days: 1, lat: 25, routeType: 'trek' })
assert('夏季低海拔南方 season=summer', summer_low_south.season === 'summer')
assert('夏季低海拔南方 elevationBand=low', summer_low_south.elevationBand === 'low')
assert('夏季低海拔南方 latitudeBand=south', summer_low_south.latitudeBand === 'south')
assert('夏季南方含雷暴风险', summer_low_south.fatalRisks.includes('雷暴'), JSON.stringify(summer_low_south.fatalRisks))
assert('夏季低海拔南方含中暑风险', summer_low_south.fatalRisks.includes('中暑'))

// 冬季高海拔北方
const winter_high_north = getGearRules({ month: 1, elevation: 4000, days: 3, lat: 40, routeType: 'trek' })
assert('冬季高海拔北方 season=winter', winter_high_north.season === 'winter')
assert('冬季高海拔北方 elevationBand=high', winter_high_north.elevationBand === 'high')
assert('冬季高海拔北方 latitudeBand=north', winter_high_north.latitudeBand === 'north')
assert('冬季高海拔含失温风险', winter_high_north.fatalRisks.includes('失温'))
assert('冬季高海拔含高反风险', winter_high_north.fatalRisks.includes('高反'))
assert('冬季高海拔essential含羽绒', winter_high_north.essential.some(g => g.item.includes('羽绒') || g.item.includes('保暖')))

// 极高海拔（climb：滑坠与技术装备由路线类型确定性触发）
const extreme = getGearRules({ month: 8, elevation: 6000, days: 5, lat: 31, routeType: 'climb' })
assert('极高海拔 elevationBand=extreme', extreme.elevationBand === 'extreme')
assert('极高海拔含滑坠风险', extreme.fatalRisks.includes('滑坠'))
assert('极高海拔essential含冰爪', extreme.essential.some(g => g.item.includes('冰爪')))

// 纬度带差异
const yunnan4000 = getGearRules({ month: 7, elevation: 4000, days: 2, lat: 28, routeType: 'trek' })
const xinjiang4000 = getGearRules({ month: 7, elevation: 4000, days: 2, lat: 42, routeType: 'trek' })
assert('云南4000m latitudeBand=south', yunnan4000.latitudeBand === 'south')
assert('新疆4000m latitudeBand=north', xinjiang4000.latitudeBand === 'north')
assert('新疆推荐含润唇膏', xinjiang4000.recommended.some(g => g.item.includes('润唇')))
assert('云南推荐含速干衣', yunnan4000.recommended.some(g => g.item.includes('速干')))

console.log('\n=== 边界处理测试 ===')
// 5276m 边界
const boundary5276 = getGearRules({ month: 8, elevation: 5276, days: 1, lat: 31, routeType: 'trek' })
assert('5276m 按高海拔处理', boundary5276.elevationBand === 'high')
assert('5276m 有边界备注', boundary5276.ruleNotes.some(n => n.includes('偏极高')))

console.log('\n=== Prompt 单位契约测试 ===')
// TP-P0-001：windMs 契约固定为 m/s 后，Prompt 中的单位文字必须与内部契约一致
const { buildMessages } = require('../cloudfunctions/getAdvice/prompt')
const promptMessages = buildMessages({
  route: '武功山',
  date: '2026-08-04',
  level: '中级',
  days: 1,
  weather: {
    days: [{ date: '2026-08-04', tempMin: 10, tempMax: 20, precipProb: 0, windMs: 4.5, confidence: '正常' }],
    windUnit: 'm/s',
  },
  gearRules: { essential: [], recommended: [], optional: [] },
  sunEvents: null,
  microclimate: { humidity: null, windMs: 4.5, dewPointSpread: null },
})
const promptUserContent = promptMessages[1].content
assert('Prompt 包含 风4.5m/s', promptUserContent.includes('风4.5m/s'), promptUserContent.substring(0, 200))

console.log('\n=== Prompt 日期窗口契约测试 ===')
// TP-P0-002：Prompt 只消费传入的正确行程窗口（出发日起连续 tripDays 天），
// 不得出现窗口外日期（如此前"从今天开始"的错误窗口日期）
const windowMessages = buildMessages({
  route: '武功山',
  date: '2026-08-06',
  level: '中级',
  days: 3,
  weather: {
    days: [
      { date: '2026-08-06', tempMin: 10, tempMax: 20, precipProb: 0, windMs: 3.1, confidence: '正常' },
      { date: '2026-08-07', tempMin: 11, tempMax: 21, precipProb: 10, windMs: 4.2, confidence: '正常' },
      { date: '2026-08-08', tempMin: 12, tempMax: 22, precipProb: 20, windMs: 5.3, confidence: '正常' },
    ],
    windUnit: 'm/s',
  },
  gearRules: { essential: [], recommended: [], optional: [] },
  sunEvents: null,
  microclimate: { humidity: null, windMs: 3.1, dewPointSpread: null },
})
const windowUserContent = windowMessages[1].content
assert('Prompt 包含 2026-08-06（出发日）', windowUserContent.includes('2026-08-06'), windowUserContent.substring(0, 200))
assert('Prompt 包含 2026-08-07', windowUserContent.includes('2026-08-07'), windowUserContent.substring(0, 200))
assert('Prompt 包含 2026-08-08', windowUserContent.includes('2026-08-08'), windowUserContent.substring(0, 200))
assert('Prompt 不包含窗口外日期 2026-08-04 的天气摘要', !windowUserContent.includes('2026-08-04'), 'Prompt 中出现窗口外日期')

console.log('\n=== TP-P0-003 路线类型标签测试 ===')
assert('标签 trek=徒步', getRouteTypeLabel('trek') === '徒步')
assert('标签 climb=攀登', getRouteTypeLabel('climb') === '攀登')
assert('标签 tour=游览', getRouteTypeLabel('tour') === '游览')
assert('标签 unknown=类型待确认', getRouteTypeLabel('unknown') === '类型待确认')
assert('非法类型无标签（不兜底）', getRouteTypeLabel('hike') === null && getRouteTypeLabel('TREK') === null)
assert('isKnownRouteType 拒绝大小写与空白变体', !isKnownRouteType('Trek') && !isKnownRouteType(' climb') && !isKnownRouteType('tour '))

console.log('\n=== TP-P0-003 Prompt routeType 测试 ===')
const typeMessages = buildMessages({
  route: '四姑娘山二峰',
  date: '2026-08-10',
  level: '小白',
  days: 2,
  weather: { days: [{ date: '2026-08-10', tempMin: 2, tempMax: 12, precipProb: 20, windMs: 6.5, confidence: '正常' }], windUnit: 'm/s' },
  gearRules: getGearRules({ month: 8, elevation: 5276, days: 2, lat: 31.1, routeType: 'climb' }),
  sunEvents: null,
  microclimate: null,
  routeType: 'climb',
  routeTypeSource: 'builtin',
})
const typeUserContent = typeMessages[1].content
assert('Prompt 行程信息含 路线类型：climb（攀登）', typeUserContent.includes('路线类型：climb（攀登）'), typeUserContent.substring(0, 200))
assert('Prompt 行程信息含 类型来源：builtin', typeUserContent.includes('类型来源：builtin'), typeUserContent.substring(0, 200))
assert('SYSTEM 约束不得猜测/覆盖路线类型', typeMessages[0].content.includes('不得猜测、修改或覆盖路线类型'))
assert('小白+climb 不再无条件禁止技术装备', !typeUserContent.includes('禁止推荐任何技术攀登装备'), '仍存在无条件禁止条款')
assert('小白+climb 保留规则层技术装备约束', typeUserContent.includes('必须保留规则层提供的技术安全装备'))

console.log('\n=== TP-P0-003 trek/climb/tour 规则差异 ===')
const TYPE_COMMON = { month: 7, elevation: 5276, days: 2, lat: 31.1 }
const typeTrek = getGearRules({ ...TYPE_COMMON, routeType: 'trek' })
const typeClimb = getGearRules({ ...TYPE_COMMON, routeType: 'climb' })
const typeTour = getGearRules({ ...TYPE_COMMON, routeType: 'tour' })
assert('climb 触发滑坠风险', typeClimb.fatalRisks.includes('滑坠'), JSON.stringify(typeClimb.fatalRisks))
assert('trek 不触发滑坠风险', !typeTrek.fatalRisks.includes('滑坠'), JSON.stringify(typeTrek.fatalRisks))
assert('tour 不触发滑坠风险', !typeTour.fatalRisks.includes('滑坠'), JSON.stringify(typeTour.fatalRisks))
assert('climb essential 含核心技术装备', ['头盔', '安全带', '结组绳'].every((g) => typeClimb.essential.some((e) => e.item === g)), JSON.stringify(typeClimb.essential.map((e) => e.item)))
assert('trek 无技术攀登装备', !['冰爪', '结组绳', '安全带', '头盔'].some((g) => typeTrek.essential.some((e) => e.item === g)), JSON.stringify(typeTrek.essential.map((e) => e.item)))
assert('tour 不被误判为 climb（无技术装备）', !['冰爪', '结组绳', '安全带', '头盔'].some((g) => typeTour.essential.some((e) => e.item === g)), JSON.stringify(typeTour.essential.map((e) => e.item)))

console.log('\n=== TP-P0-003 低于 5000m 的 climb ===')
const lowClimb = getGearRules({ month: 7, elevation: 3952, days: 1, lat: 23.5, routeType: 'climb' })
assert('<5000m climb 仍有滑坠风险', lowClimb.fatalRisks.includes('滑坠'), JSON.stringify(lowClimb.fatalRisks))
assert('<5000m climb 仍有头盔/安全带/结组绳', ['头盔', '安全带', '结组绳'].every((g) => lowClimb.essential.some((e) => e.item === g)), JSON.stringify(lowClimb.essential.map((e) => e.item)))

console.log('\n=== TP-P0-003 5000m 以上 climb 冰爪 ===')
assert('>=5000m climb essential 含冰爪', typeClimb.essential.some((e) => e.item === '冰爪'), JSON.stringify(typeClimb.essential.map((e) => e.item)))

console.log('\n=== TP-P0-003 无效类型确定性拒绝 ===')
for (const badType of ['banana', undefined, 'unknown']) {
  let thrown = null
  try {
    getGearRules({ ...TYPE_COMMON, routeType: badType })
  } catch (e) {
    thrown = e
  }
  assert('routeType=' + JSON.stringify(badType) + ' 被拒绝（code=invalid_route_type）', thrown && thrown.code === 'invalid_route_type', thrown ? thrown.message : '未抛出')
}

console.log('\n=== 总结 ===')
console.log('PASS: ' + passed + ', FAIL: ' + failed)
if (failed > 0) {
  console.log('有失败项，请修复')
  process.exit(1)
} else {
  console.log('全部通过')
}
