/**
 * 徒步薯 - Open-Meteo 天气契约测试（离线，不访问真实网络）
 *
 * 背景（TP-P0-001）：Open-Meteo 默认风速单位为 km/h，系统内部字段 windMs、
 * AI Prompt 与前端均按 m/s 解释。修复后请求边界固定 wind_speed_unit=ms，
 * 并校验响应 daily_units.wind_speed_10m_max === 'm/s'。
 *
 * 背景（TP-P0-002）：天气窗口必须从用户选择的出发日期开始，长度严格等于
 * tripDays，日期连续完整；完整窗口不可获得时确定性返回 out_of_range，
 * 不得用当前天气冒充行程天气。请求使用 start_date/end_date，不再发送 forecast_days。
 *
 * 本测试临时 mock https.get，结束后恢复原始实现；不使用第三方依赖。
 * 所有 fetchWeather 调用注入固定时间 { now: FIXED_NOW }，避免测试随运行日期漂移。
 * FIXED_NOW = 2026-08-04T00:00:00Z，在 Asia/Shanghai 下当地日期为 2026-08-04。
 * 用法: node scripts/weather-contract-test.js
 */

const https = require('https')
const { fetchWeather } = require('../cloudfunctions/getAdvice/weather')

const originalGet = https.get
let capturedUrl = null
let httpsGetCalls = 0

const FIXED_NOW = new Date('2026-08-04T00:00:00.000Z')
const NOW_OPTS = { now: FIXED_NOW }

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
 * 安装 https.get mock：捕获请求 URL、记录调用次数，并以 payload 模拟 Open-Meteo 响应。
 * weather.js 通过共享的 https 模块对象在调用时查找 .get，因此 patch 生效。
 */
function installMock(payload) {
  capturedUrl = null
  https.get = (url, cb) => {
    httpsGetCalls++
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

/**
 * 构造合法的 daily 响应；可选覆盖数值、单位或删除 daily_units
 */
function dailyPayload(dates, opts) {
  opts = opts || {}
  const payload = {
    timezone: 'Asia/Shanghai',
    daily: {
      time: dates.slice(),
      temperature_2m_min: dates.map((_, i) => (opts.tempMin ? opts.tempMin[i] : 10)),
      temperature_2m_max: dates.map((_, i) => (opts.tempMax ? opts.tempMax[i] : 20)),
      precipitation_probability_max: dates.map((_, i) => (opts.precipProb ? opts.precipProb[i] : 0)),
      wind_speed_10m_max: dates.map((_, i) => (opts.windMs ? opts.windMs[i] : 4.5)),
    },
  }
  if (!opts.noUnits) {
    payload.daily_units = {
      time: 'iso8601',
      temperature_2m_max: '°C',
      temperature_2m_min: '°C',
      precipitation_probability_max: '%',
      wind_speed_10m_max: opts.windUnit || 'm/s',
    }
  }
  return payload
}

const VALID_MS_RESPONSE = dailyPayload(['2026-08-04'])

async function main() {
  try {
    console.log('=== 10.1 请求日期范围契约 ===')
    installMock(dailyPayload(['2026-08-06', '2026-08-07', '2026-08-08']))
    await fetchWeather(31.23, 121.47, 100, '2026-08-06', 3, NOW_OPTS)
    assert('URL 包含 start_date=2026-08-06', typeof capturedUrl === 'string' && capturedUrl.includes('start_date=2026-08-06'), String(capturedUrl))
    assert('URL 包含 end_date=2026-08-08', typeof capturedUrl === 'string' && capturedUrl.includes('end_date=2026-08-08'), String(capturedUrl))
    assert('URL 包含 wind_speed_unit=ms', typeof capturedUrl === 'string' && capturedUrl.includes('wind_speed_unit=ms'), String(capturedUrl))
    assert('URL 包含 timezone=Asia%2FShanghai', typeof capturedUrl === 'string' && capturedUrl.includes('timezone=Asia%2FShanghai'), String(capturedUrl))
    assert('URL 不再包含 forecast_days', typeof capturedUrl === 'string' && !capturedUrl.includes('forecast_days'), String(capturedUrl))

    console.log('\n=== 10.2 单日行程 ===')
    installMock(dailyPayload(['2026-08-04']))
    const single = await fetchWeather(31.23, 121.47, 100, '2026-08-04', 1, NOW_OPTS)
    assert('ok === true', single.ok === true, JSON.stringify(single).substring(0, 200))
    assert('days.length === 1', single.ok && single.data.days.length === 1, single.ok ? String(single.data.days.length) : 'not ok')
    assert('days[0].date === 2026-08-04（出发日）', single.ok && single.data.days[0].date === '2026-08-04', single.ok ? single.data.days[0].date : 'not ok')

    console.log('\n=== 10.3 未来三日行程：日期与数值原样贯穿 ===')
    installMock(dailyPayload(['2026-08-06', '2026-08-07', '2026-08-08'], {
      tempMin: [9.2, 10.7, 11],
      tempMax: [19.1, 20.9, 21],
      precipProb: [10, 20, 30],
      windMs: [3.1, 4.2, 5.3],
    }))
    const three = await fetchWeather(31.23, 121.47, 100, '2026-08-06', 3, NOW_OPTS)
    assert('ok === true', three.ok === true, JSON.stringify(three).substring(0, 200))
    assert('返回日期 = 06/07/08 三天', three.ok && three.data.days.map((d) => d.date).join(',') === '2026-08-06,2026-08-07,2026-08-08', three.ok ? JSON.stringify(three.data.days.map((d) => d.date)) : 'not ok')
    assert('tempMin floor 贯穿 [9,10,11]', three.ok && three.data.days.map((d) => d.tempMin).join(',') === '9,10,11', three.ok ? JSON.stringify(three.data.days.map((d) => d.tempMin)) : 'not ok')
    assert('tempMax ceil 贯穿 [20,21,21]', three.ok && three.data.days.map((d) => d.tempMax).join(',') === '20,21,21', three.ok ? JSON.stringify(three.data.days.map((d) => d.tempMax)) : 'not ok')
    assert('precipProb 贯穿 [10,20,30]', three.ok && three.data.days.map((d) => d.precipProb).join(',') === '10,20,30', three.ok ? JSON.stringify(three.data.days.map((d) => d.precipProb)) : 'not ok')
    assert('windMs 贯穿 [3.1,4.2,5.3]', three.ok && three.data.days.map((d) => d.windMs).join(',') === '3.1,4.2,5.3', three.ok ? JSON.stringify(three.data.days.map((d) => d.windMs)) : 'not ok')

    console.log('\n=== 10.4 tripDays 不影响风速数值 ===')
    installMock(dailyPayload(['2026-08-06'], { windMs: [4.5] }))
    const windValue = await fetchWeather(31.23, 121.47, 100, '2026-08-06', 1, NOW_OPTS)
    assert('windMs === 4.5（不发生 3.6 换算）', windValue.ok && windValue.data.days[0].windMs === 4.5, windValue.ok ? String(windValue.data.days[0].windMs) : 'not ok')

    console.log('\n=== 10.5 API 范围错误 → out_of_range ===')
    installMock({ error: true, reason: "Parameter 'start_date' is out of allowed range from 2026-08-04 to 2026-08-18" })
    const apiRange = await fetchWeather(31.23, 121.47, 100, '2026-08-20', 1, NOW_OPTS)
    assert('ok === false', apiRange.ok === false, JSON.stringify(apiRange))
    assert('error === out_of_range', apiRange.error === 'out_of_range', JSON.stringify(apiRange))
    assert('不携带 weather.days', apiRange.data === undefined, JSON.stringify(apiRange).substring(0, 200))
    assert('附带 requestedStartDate/requestedEndDate', apiRange.requestedStartDate === '2026-08-20' && apiRange.requestedEndDate === '2026-08-20', JSON.stringify(apiRange))
    assert('不暴露 Open-Meteo 原始 reason', !JSON.stringify(apiRange).includes('allowed range'), JSON.stringify(apiRange))

    console.log('\n=== 10.6 部分覆盖 → out_of_range ===')
    installMock(dailyPayload(['2026-08-06', '2026-08-07']))
    const partial = await fetchWeather(31.23, 121.47, 100, '2026-08-06', 3, NOW_OPTS)
    assert('ok === false', partial.ok === false, JSON.stringify(partial))
    assert('error === out_of_range', partial.error === 'out_of_range', JSON.stringify(partial))
    assert('不携带 weather.days', partial.data === undefined, JSON.stringify(partial).substring(0, 200))

    console.log('\n=== 10.7 错误起点 → weather_data_invalid ===')
    installMock(dailyPayload(['2026-08-04', '2026-08-05', '2026-08-06']))
    const shifted = await fetchWeather(31.23, 121.47, 100, '2026-08-06', 3, NOW_OPTS)
    assert('ok === false', shifted.ok === false, JSON.stringify(shifted))
    assert('error === weather_data_invalid（不得截取后继续）', shifted.error === 'weather_data_invalid', JSON.stringify(shifted))

    console.log('\n=== 10.8 缺失中间日期 → 确定性拒绝 ===')
    installMock(dailyPayload(['2026-08-06', '2026-08-08', '2026-08-09']))
    const gap = await fetchWeather(31.23, 121.47, 100, '2026-08-06', 3, NOW_OPTS)
    assert('ok === false', gap.ok === false, JSON.stringify(gap))
    assert('error === weather_data_invalid', gap.error === 'weather_data_invalid', JSON.stringify(gap))

    console.log('\n=== 10.9 日期乱序 → 确定性拒绝 ===')
    installMock(dailyPayload(['2026-08-07', '2026-08-06', '2026-08-08']))
    const unordered = await fetchWeather(31.23, 121.47, 100, '2026-08-06', 3, NOW_OPTS)
    assert('ok === false', unordered.ok === false, JSON.stringify(unordered))
    assert('error === weather_data_invalid', unordered.error === 'weather_data_invalid', JSON.stringify(unordered))

    console.log('\n=== 10.10 过去日期 → invalid_date 且不请求网络 ===')
    installMock(VALID_MS_RESPONSE)
    const callsBeforePast = httpsGetCalls
    const past = await fetchWeather(31.23, 121.47, 100, '2026-08-03', 1, NOW_OPTS)
    assert('ok === false', past.ok === false, JSON.stringify(past))
    assert('error === invalid_date', past.error === 'invalid_date', JSON.stringify(past))
    assert('https.get 未被调用', httpsGetCalls === callsBeforePast, 'calls=' + httpsGetCalls)

    console.log('\n=== 10.11 非法日期 → invalid_date ===')
    const invalidDates = ['2026-02-30', '2026/08/04', '']
    for (const bad of invalidDates) {
      const callsBefore = httpsGetCalls
      const r = await fetchWeather(31.23, 121.47, 100, bad, 1, NOW_OPTS)
      assert('"' + bad + '" 被拒绝（invalid_date 且不请求网络）', r.ok === false && r.error === 'invalid_date' && httpsGetCalls === callsBefore, JSON.stringify(r))
    }

    console.log('\n=== 10.12 非法 tripDays → invalid_trip_days ===')
    const invalidTripDays = [0, -1, 1.5, 8, '1abc']
    for (const bad of invalidTripDays) {
      const callsBefore = httpsGetCalls
      const r = await fetchWeather(31.23, 121.47, 100, '2026-08-06', bad, NOW_OPTS)
      assert('tripDays=' + JSON.stringify(bad) + ' 被拒绝（invalid_trip_days 且不请求网络）', r.ok === false && r.error === 'invalid_trip_days' && httpsGetCalls === callsBefore, JSON.stringify(r))
    }

    console.log('\n=== 10.13 confidence 按实际预报提前量 ===')
    installMock(dailyPayload(['2026-08-08', '2026-08-09']))
    const confidenceResult = await fetchWeather(31.23, 121.47, 100, '2026-08-08', 2, NOW_OPTS)
    assert('ok === true', confidenceResult.ok === true, JSON.stringify(confidenceResult).substring(0, 200))
    assert('2026-08-08（提前4天）= 正常', confidenceResult.ok && confidenceResult.data.days[0].confidence === '正常', confidenceResult.ok ? confidenceResult.data.days[0].confidence : 'not ok')
    assert('2026-08-09（提前5天）= 参考', confidenceResult.ok && confidenceResult.data.days[1].confidence === '参考', confidenceResult.ok ? confidenceResult.data.days[1].confidence : 'not ok')

    console.log('\n=== 10.14 原风速单位契约（TP-P0-001）===')
    installMock(VALID_MS_RESPONSE)
    const okResult = await fetchWeather(31.23, 121.47, 100, '2026-08-04', 1, NOW_OPTS)
    assert('请求 URL 包含 wind_speed_unit=ms', typeof capturedUrl === 'string' && capturedUrl.includes('wind_speed_unit=ms'), String(capturedUrl))
    assert('ok === true', okResult.ok === true, JSON.stringify(okResult).substring(0, 200))
    assert('windMs === 4.5（无重复换算）', okResult.ok && okResult.data.days[0].windMs === 4.5, okResult.ok ? String(okResult.data.days[0].windMs) : 'not ok')
    assert('windUnit === "m/s"', okResult.ok && okResult.data.windUnit === 'm/s', okResult.ok ? String(okResult.data.windUnit) : 'not ok')

    console.log('\n=== 错误单位响应（km/h）===')
    installMock(dailyPayload(['2026-08-04'], { windUnit: 'km/h', windMs: [16.2] }))
    const kmhResult = await fetchWeather(31.23, 121.47, 100, '2026-08-04', 1, NOW_OPTS)
    assert('km/h 单位被确定性拒绝', kmhResult.ok === false && kmhResult.error === 'weather_data_invalid', JSON.stringify(kmhResult))

    console.log('\n=== 缺失 daily_units 响应 ===')
    installMock(dailyPayload(['2026-08-04'], { noUnits: true }))
    const noUnitsResult = await fetchWeather(31.23, 121.47, 100, '2026-08-04', 1, NOW_OPTS)
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
