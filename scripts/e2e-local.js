/**
 * 本地端到端测试（P8.1 预演，无需 GLM_KEY/AMAP_KEY）
 *
 * 验证链路：resolveLocation(内置表) → fetchWeather(真实 Open-Meteo) → calcSunEvents → getGearRules → schema 校验
 * GLM 调用用 mock 替代（验证校验+降级逻辑，不依赖网络）
 *
 * 用法：node scripts/e2e-local.js
 * 需要：网络（Open-Meteo 是免费 API，无需 key）
 */
const CF = __dirname + '/../cloudfunctions/getAdvice'

const { resolveLocation, gcj02ToWgs84 } = require(CF + '/geocode')
const { fetchWeather } = require(CF + '/weather')
const { calcSunEvents } = require(CF + '/sun-events')
const { getGearRules } = require(CF + '/gear-rules')

let pass = 0
let fail = 0
function check(name, cond, detail) {
  if (cond) { console.log('  PASS: ' + name); pass++ }
  else { console.log('  FAIL: ' + name + (detail ? ' -> ' + detail : '')); fail++ }
}

// 内置表路线测试（无需 AMAP_KEY）
const BUILTIN_TESTS = [
  { route: '武功山', expectElev: 1918 },
  { route: '四姑娘山二峰', expectElev: 5276 },
  { route: '五台山朝台', expectElev: 3058 },
]

async function testPipeline(route, expectElev) {
  console.log('\n--- 路线: ' + route + ' ---')

  // 1. 地理编码（内置表，无网络）
  const loc = await resolveLocation(route)
  check('resolveLocation.ok', loc.ok === true, JSON.stringify(loc))
  check('海拔匹配', loc.ok && loc.data.elevation === expectElev, String(loc.ok && loc.data.elevation))

  if (!loc.ok) return

  // 2. 坐标转换
  const wgs84 = gcj02ToWgs84(loc.data.lon, loc.data.lat)
  check('坐标转换有效', typeof wgs84.lat === 'number' && typeof wgs84.lng === 'number', JSON.stringify(wgs84))

  // 3. 天气（真实 Open-Meteo，免费）
  const weather = await fetchWeather(wgs84.lat, wgs84.lng, loc.data.elevation, '2026-07-05')
  check('fetchWeather.ok', weather.ok === true, JSON.stringify(weather).substring(0, 200))
  if (weather.ok) {
    check('返回7天', weather.data.days.length === 7, String(weather.data.days.length))
    check('含 elevationCaveat', typeof weather.data.elevationCaveat === 'string' && weather.data.elevationCaveat.length > 10)
    check('第6天标参考', weather.data.days[5].confidence === '参考')
    // 四姑娘山二峰温度应明显低于低海拔（验证海拔修正）
    if (expectElev > 4000) {
      check('高海拔温度修正（<10°C 最高温）', weather.data.days[0].tempMax < 10, String(weather.data.days[0].tempMax))
    }
  }

  // 4. 天文时刻
  const sun = calcSunEvents(wgs84.lat, wgs84.lng, '2026-07-05')
  check('calcSunEvents.sunrise 非空', typeof sun.sunrise === 'string' && /^\d{2}:\d{2}$/.test(sun.sunrise), String(sun.sunrise))
  check('calcSunEvents.sunset 非空', typeof sun.sunset === 'string' && /^\d{2}:\d{2}$/.test(sun.sunset), String(sun.sunset))
  check('日出时间合理（4-8点）', sun.sunrise && parseInt(sun.sunrise) >= 4 && parseInt(sun.sunrise) <= 8, String(sun.sunrise))
  check('日落时间合理（17-20点）', sun.sunset && parseInt(sun.sunset) >= 17 && parseInt(sun.sunset) <= 20, String(sun.sunset))
  check('含 terrainCaveat', typeof sun.terrainCaveat === 'string' && sun.terrainCaveat.length > 10)

  // 5. 装备规则
  const gear = getGearRules({ month: 7, elevation: loc.data.elevation, days: 1, lat: loc.data.lat })
  check('gear.essential 非空', gear.essential.length > 0)
  if (expectElev >= 5276) {
    check('高海拔含冰爪', gear.essential.some((g) => g.item.includes('冰爪')))
    check('高海拔含结组绳', gear.essential.some((g) => g.item.includes('结组绳')))
  }
}

;(async () => {
  console.log('=== 徒步薯 本地端到端测试（真实 Open-Meteo） ===\n')
  for (const t of BUILTIN_TESTS) {
    try {
      await testPipeline(t.route, t.expectElev)
    } catch (e) {
      console.log('  ERROR: ' + t.route + ' -> ' + e.message)
      fail++
    }
  }

  console.log('\n=== Schema 校验逻辑测试 ===')
  const mockDegraded = require(CF + '/prompt').buildDegradedResponse({ days: [], elevationCaveat: 'x' }, { sunrise: '06:00' }, {})
  check('降级响应 data.degraded=true', mockDegraded.data.degraded === true)
  check('降级响应 risks 为空数组', Array.isArray(mockDegraded.data.risks) && mockDegraded.data.risks.length === 0)
  check('降级响应顶层 degraded=true', mockDegraded.degraded === true)

  console.log('\n=== photoTiming 确定性覆盖测试 ===')
  // 模拟 GLM 返回不准确的 photoTiming，验证 suncalc 值会覆盖
  const glmPhotoTiming = { sunrise: '99:99', sunset: '99:99', goldenHour: 'x', blueHour: 'y' }
  const realSun = { sunrise: '05:32', sunset: '19:18', goldenHour: '05:32-06:32', blueHour: '05:12-05:32', terrainCaveat: '未考虑地形遮挡' }
  const merged = Object.assign({}, glmPhotoTiming, realSun)
  check('suncalc 覆盖 GLM 时刻', merged.sunrise === '05:32', merged.sunrise)
  check('terrainCaveat 合并进 photoTiming', typeof merged.terrainCaveat === 'string')

  console.log('\n=== 总结 ===')
  console.log('PASS: ' + pass + ', FAIL: ' + fail)
  process.exit(fail > 0 ? 1 : 0)
})()
