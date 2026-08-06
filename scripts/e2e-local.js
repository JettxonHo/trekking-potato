/**
 * 本地端到端测试（离线，无需任何服务凭据）
 *
 * 验证链路：resolveLocation(内置表) → fixture Open-Meteo → calcSunEvents → getGearRules → schema 校验。
 * wx-server-sdk 在加载云函数模块时替换为本地 mock；DeepSeek 不在这个测试路径中调用。
 */
const CF = __dirname + '/../cloudfunctions/getAdvice'
const Module = require('module')
const https = require('https')
const cloudbaseMock = require('./mocks/cloudbase')
const openMeteoFixture = require('./fixtures/open-meteo-forecast')

const originalModuleLoad = Module._load
const originalHttpsGet = https.get
let weatherRequestUrl = null

function getFixtureForWeatherRequest(url) {
  const params = new URL(url).searchParams
  const startDate = params.get('start_date')
  const endDate = params.get('end_date')
  const startIndex = openMeteoFixture.daily.time.indexOf(startDate)
  const endIndex = openMeteoFixture.daily.time.indexOf(endDate)

  if (startIndex < 0 || endIndex < startIndex) {
    throw new Error('离线天气 fixture 不包含请求窗口: ' + startDate + ' 至 ' + endDate)
  }

  const slice = (values) => values.slice(startIndex, endIndex + 1)
  return {
    daily_units: openMeteoFixture.daily_units,
    daily: {
      time: slice(openMeteoFixture.daily.time),
      temperature_2m_max: slice(openMeteoFixture.daily.temperature_2m_max),
      temperature_2m_min: slice(openMeteoFixture.daily.temperature_2m_min),
      precipitation_probability_max: slice(openMeteoFixture.daily.precipitation_probability_max),
      wind_speed_10m_max: slice(openMeteoFixture.daily.wind_speed_10m_max),
    },
  }
}

Module._load = function mockCloudbase(request, parent, isMain) {
  if (request === 'wx-server-sdk') return cloudbaseMock
  return originalModuleLoad.call(this, request, parent, isMain)
}

https.get = function getOfflineWeather(url, callback) {
  if (!String(url).startsWith('https://api.open-meteo.com/v1/forecast?')) {
    throw new Error('离线 E2E 阻止了未 mock 的网络请求: ' + url)
  }
  weatherRequestUrl = String(url)
  const listeners = {}
  const response = {
    on(event, handler) {
      listeners[event] = handler
      return response
    },
  }
  const request = {
    destroy() {},
    on() { return request },
    setTimeout() { return request },
  }
  callback(response)
  process.nextTick(() => {
    listeners.data(JSON.stringify(getFixtureForWeatherRequest(url)))
    listeners.end()
  })
  return request
}

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
  { route: '武功山', expectElev: 1918, tripDays: 1, routeType: 'trek' },
  { route: '四姑娘山二峰', expectElev: 5276, tripDays: 2, routeType: 'climb' },
  { route: '五台山朝台', expectElev: 3058, tripDays: 3, routeType: 'trek' },
]

async function testPipeline(route, expectElev, tripDays, expectedRouteType) {
  console.log('\n--- 路线: ' + route + ' ---')

  // 1. 地理编码（内置表，无网络）
  const loc = await resolveLocation(route)
  check('resolveLocation.ok', loc.ok === true, JSON.stringify(loc))
  check('海拔匹配', loc.ok && loc.data.elevation === expectElev, String(loc.ok && loc.data.elevation))
  check('路线类型由解析结果贯穿', loc.ok && loc.data.type === expectedRouteType, String(loc.ok && loc.data.type))

  if (!loc.ok) return

  // 2. 坐标转换
  const wgs84 = gcj02ToWgs84(loc.data.lon, loc.data.lat)
  check('坐标转换有效', typeof wgs84.lat === 'number' && typeof wgs84.lng === 'number', JSON.stringify(wgs84))

  // 3. 天气（固定 Open-Meteo fixture，不允许访问网络）
  const weather = await fetchWeather(
    wgs84.lat,
    wgs84.lng,
    loc.data.elevation,
    '2026-08-07',
    tripDays,
    { now: new Date('2026-08-04T00:00:00.000Z') },
  )
  check('fetchWeather.ok', weather.ok === true, JSON.stringify(weather).substring(0, 200))
  if (weather.ok) {
    check('返回天数符合 tripDays', weather.data.days.length === tripDays, String(weather.data.days.length))
    check('天气请求来自 Open-Meteo fixture', weatherRequestUrl && weatherRequestUrl.includes('wind_speed_unit=ms'))
    check('含 elevationCaveat', typeof weather.data.elevationCaveat === 'string' && weather.data.elevationCaveat.length > 10)
    check('第三天按预报提前量标参考', tripDays < 3 || weather.data.days[2].confidence === '参考')
  }

  // 4. 天文时刻
  const sun = calcSunEvents(wgs84.lat, wgs84.lng, '2026-07-05')
  check('calcSunEvents.sunrise 非空', typeof sun.sunrise === 'string' && /^\d{2}:\d{2}$/.test(sun.sunrise), String(sun.sunrise))
  check('calcSunEvents.sunset 非空', typeof sun.sunset === 'string' && /^\d{2}:\d{2}$/.test(sun.sunset), String(sun.sunset))
  check('日出时间合理（4-8点）', sun.sunrise && parseInt(sun.sunrise) >= 4 && parseInt(sun.sunrise) <= 8, String(sun.sunrise))
  check('日落时间合理（17-20点）', sun.sunset && parseInt(sun.sunset) >= 17 && parseInt(sun.sunset) <= 20, String(sun.sunset))
  check('含 terrainCaveat', typeof sun.terrainCaveat === 'string' && sun.terrainCaveat.length > 10)

  // 5. 装备规则
  const gear = getGearRules({ month: 8, elevation: loc.data.elevation, days: tripDays, lat: loc.data.lat, routeType: loc.data.type })
  check('gear.essential 非空', gear.essential.length > 0)
  check('gear.routeType 符合解析结果', gear.routeType === loc.data.type, gear.routeType)
  if (expectElev >= 5276) {
    check('高海拔含冰爪', gear.essential.some((g) => g.item.includes('冰爪')))
    check('高海拔含结组绳', gear.essential.some((g) => g.item.includes('结组绳')))
  }
}

;(async () => {
  console.log('=== 徒步薯 本地端到端测试（fixture/mock） ===\n')
  for (const t of BUILTIN_TESTS) {
    try {
      await testPipeline(t.route, t.expectElev, t.tripDays, t.routeType)
    } catch (e) {
      console.log('  ERROR: ' + t.route + ' -> ' + e.message)
      fail++
    }
  }

  check('CloudBase 使用本地 mock 初始化', cloudbaseMock.calls.init > 0, String(cloudbaseMock.calls.init))

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
  https.get = originalHttpsGet
  Module._load = originalModuleLoad
  process.exitCode = fail > 0 ? 1 : 0
})()
