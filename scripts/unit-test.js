/**
 * 徒步薯 - 本地单元测试（不依赖网络）
 * 测试：编辑距离、装备规则、坐标转换、内置路线匹配
 * 用法: node scripts/unit-test.js
 */

const { matchBuiltinRoute, editDistance } = require('../cloudfunctions/getAdvice/data/routes')
const { getGearRules, getSeason, getElevationBand, getLatitudeBand } = require('../cloudfunctions/getAdvice/gear-rules')

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
// 夏季低海拔南方
const summer_low_south = getGearRules({ month: 7, elevation: 500, days: 1, lat: 25 })
assert('夏季低海拔南方 season=summer', summer_low_south.season === 'summer')
assert('夏季低海拔南方 elevationBand=low', summer_low_south.elevationBand === 'low')
assert('夏季低海拔南方 latitudeBand=south', summer_low_south.latitudeBand === 'south')
assert('夏季南方含雷暴风险', summer_low_south.fatalRisks.includes('雷暴'), JSON.stringify(summer_low_south.fatalRisks))
assert('夏季低海拔南方含中暑风险', summer_low_south.fatalRisks.includes('中暑'))

// 冬季高海拔北方
const winter_high_north = getGearRules({ month: 1, elevation: 4000, days: 3, lat: 40 })
assert('冬季高海拔北方 season=winter', winter_high_north.season === 'winter')
assert('冬季高海拔北方 elevationBand=high', winter_high_north.elevationBand === 'high')
assert('冬季高海拔北方 latitudeBand=north', winter_high_north.latitudeBand === 'north')
assert('冬季高海拔含失温风险', winter_high_north.fatalRisks.includes('失温'))
assert('冬季高海拔含高反风险', winter_high_north.fatalRisks.includes('高反'))
assert('冬季高海拔essential含羽绒', winter_high_north.essential.some(g => g.item.includes('羽绒') || g.item.includes('保暖')))

// 极高海拔
const extreme = getGearRules({ month: 8, elevation: 6000, days: 5, lat: 31 })
assert('极高海拔 elevationBand=extreme', extreme.elevationBand === 'extreme')
assert('极高海拔含滑坠风险', extreme.fatalRisks.includes('滑坠'))
assert('极高海拔essential含冰爪', extreme.essential.some(g => g.item.includes('冰爪')))

// 纬度带差异
const yunnan4000 = getGearRules({ month: 7, elevation: 4000, days: 2, lat: 28 })
const xinjiang4000 = getGearRules({ month: 7, elevation: 4000, days: 2, lat: 42 })
assert('云南4000m latitudeBand=south', yunnan4000.latitudeBand === 'south')
assert('新疆4000m latitudeBand=north', xinjiang4000.latitudeBand === 'north')
assert('新疆推荐含润唇膏', xinjiang4000.recommended.some(g => g.item.includes('润唇')))
assert('云南推荐含速干衣', yunnan4000.recommended.some(g => g.item.includes('速干')))

console.log('\n=== 边界处理测试 ===')
// 5276m 边界
const boundary5276 = getGearRules({ month: 8, elevation: 5276, days: 1, lat: 31 })
assert('5276m 按高海拔处理', boundary5276.elevationBand === 'high')
assert('5276m 有边界备注', boundary5276.ruleNotes.some(n => n.includes('偏极高')))

console.log('\n=== 总结 ===')
console.log('PASS: ' + passed + ', FAIL: ' + failed)
if (failed > 0) {
  console.log('有失败项，请修复')
  process.exit(1)
} else {
  console.log('全部通过')
}
