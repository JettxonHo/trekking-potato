/**
 * 徒步薯 - Open-Meteo 风速单位契约测试（离线，不访问真实网络）
 *
 * 背景（TP-P0-001）：Open-Meteo 默认风速单位为 km/h，系统内部字段 windMs、
 * AI Prompt 与前端均按 m/s 解释。修复后请求边界固定 wind_speed_unit=ms，
 * 并校验响应 daily_units.wind_speed_10m_max === 'm/s'。
 *
 * 本测试临时 mock https.get，结束后恢复原始实现；不使用第三方依赖。
 * 用法: node scripts/weather-contract-test.js
 */

const https = require('https')
const { fetchWeather } = require('../cloudfunctions/getAdvice/weather')

const originalGet = https.get
let capturedUrl = null

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

/**
 * 安装 https.get mock：捕获请求 URL，并以 payload 模拟 Open-Meteo 响应。
 * weather.js 通过共享的 https 模块对象在调用时查找 .get，因此 patch 生效。
 */
function installMock(payload) {
  capturedUrl = null
  https.get = (url, cb) => {
    capturedUrl = url
    const handlers = {}
    const res = {
      on(event, handler) { handlers[event] = handler },
    }
    cb(res)
    if (handlers.data) handlers.data(JSON.stringify(payload))
    if (handlers.end) handlers.end()
    return {
      on() {},
      setTimeout() {},
      destroy() {},
    }
  }
}

const VALID_MS_RESPONSE = {
  timezone: 'Asia/Shanghai',
  daily_units: {
    time: 'iso8601',
    temperature_2m_max: '°C',
    temperature_2m_min: '°C',
    precipitation_probability_max: '%',
    wind_speed_10m_max: 'm/s',
  },
  daily: {
    time: ['2026-08-04'],
    temperature_2m_min: [10],
    temperature_2m_max: [20],
    precipitation_probability_max: [0],
    wind_speed_10m_max: [4.5],
  },
}

async function main() {
  try {
    console.log('=== 请求参数契约 ===')
    installMock(VALID_MS_RESPONSE)
    const okResult = await fetchWeather(31.23, 121.47, 100, '2026-08-04')
    assert('请求 URL 包含 wind_speed_unit=ms', typeof capturedUrl === 'string' && capturedUrl.includes('wind_speed_unit=ms'), String(capturedUrl))

    console.log('\n=== 正确单位响应（m/s）===')
    assert('ok === true', okResult.ok === true, JSON.stringify(okResult).substring(0, 200))
    assert('windMs === 4.5（无重复换算）', okResult.ok && okResult.data.days[0].windMs === 4.5, okResult.ok ? String(okResult.data.days[0].windMs) : 'not ok')
    assert('windUnit === "m/s"', okResult.ok && okResult.data.windUnit === 'm/s', okResult.ok ? String(okResult.data.windUnit) : 'not ok')

    console.log('\n=== 错误单位响应（km/h）===')
    const kmhResponse = JSON.parse(JSON.stringify(VALID_MS_RESPONSE))
    kmhResponse.daily_units.wind_speed_10m_max = 'km/h'
    kmhResponse.daily.wind_speed_10m_max = [16.2]
    installMock(kmhResponse)
    const kmhResult = await fetchWeather(31.23, 121.47, 100, '2026-08-04')
    assert('km/h 单位被确定性拒绝', kmhResult.ok === false && kmhResult.error === 'weather_data_invalid', JSON.stringify(kmhResult))

    console.log('\n=== 缺失 daily_units 响应 ===')
    const noUnitsResponse = JSON.parse(JSON.stringify(VALID_MS_RESPONSE))
    delete noUnitsResponse.daily_units
    installMock(noUnitsResponse)
    const noUnitsResult = await fetchWeather(31.23, 121.47, 100, '2026-08-04')
    assert('缺失 daily_units 被确定性拒绝', noUnitsResult.ok === false && noUnitsResult.error === 'weather_data_invalid', JSON.stringify(noUnitsResult))
  } finally {
    https.get = originalGet
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
  console.log('  FAIL: 测试运行异常 -> ' + e.message)
  process.exit(1)
})
