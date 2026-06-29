/**
 * 徒步薯 - 天气模块（Open-Meteo，含 elevation）
 *
 * 重要：
 * - 传 elevation 参数请求该海拔天气（非网格点海拔）
 * - 标准递减率线性修正，逆温层场景不准（elevationCaveat）
 * - 第5天后标注置信度递减
 * - precipProb 在中国区域标注来源
 */

const https = require('https')

/**
 * HTTPS GET 封装
 */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { reject(new Error('JSON 解析失败')) }
      })
    })
    req.on('error', reject)
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Open-Meteo 请求超时 8s')) })
  })
}

/**
 * 查询 Open-Meteo 天气
 * @param {number} lat - 纬度（WGS84）
 * @param {number} lon - 经度（WGS84）
 * @param {number} elevation - 海拔（米）
 * @param {string} dateStr - 出发日期 YYYY-MM-DD
 * @returns {Object} {days, source, fetchedAt, elevationCaveat}
 */
async function fetchWeather(lat, lon, elevation, dateStr) {
  // Open-Meteo Forecast API
  // current + daily 7天 + temperature_80m（含高层）+ precipitation + wind
  // 计算出发日期距今天数，请求足够覆盖该日期的预报天数
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tripDate = new Date(dateStr + 'T00:00:00')
  const daysAhead = Math.round((tripDate - today) / (1000 * 60 * 60 * 24))

  let forecastDays = 7
  let dateOutOfRange = false
  let dateRangeNote = ''
  if (daysAhead >= 0 && daysAhead <= 15) {
    // 出发日在预报范围内，覆盖到出发日 + 旅行天数（至少7天窗口）
    forecastDays = Math.min(16, Math.max(7, daysAhead + 7))
  } else if (daysAhead > 15) {
    // 超出 Open-Meteo 免费版16天预报上限
    dateOutOfRange = true
    dateRangeNote = '出发日期(' + dateStr + ')距今天' + daysAhead + '天，超出 Open-Meteo 16天预报范围，以下为当前可用预报，出发前请再次查询'
    forecastDays = 16
  }

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    elevation: elevation.toString(),
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max',
    timezone: 'Asia/Shanghai',
    forecast_days: forecastDays.toString(),
  })

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  const result = await httpsGet(url)

  if (!result.daily || !result.daily.time) {
    return { ok: false, error: 'weather_data_invalid', message: 'Open-Meteo 返回数据异常' }
  }

  const daily = result.daily
  const days = []

  for (let i = 0; i < daily.time.length && i < forecastDays; i++) {
    // 置信度：5天后降级，超出10天标参考
    const confidence = i >= 5 ? '参考' : '正常'
    days.push({
      date: daily.time[i],
      tempMin: daily.temperature_2m_min[i],
      tempMax: daily.temperature_2m_max[i],
      precipProb: daily.precipitation_probability_max ? (daily.precipitation_probability_max[i] || 0) : 0,
      windMs: daily.wind_speed_10m_max ? (daily.wind_speed_10m_max[i] || 0) : 0,
      confidence,
    })
  }

  return {
    ok: true,
    data: {
      days,
      source: 'Open-Meteo',
      fetchedAt: new Date().toISOString(),
      elevationUsed: elevation,
      elevationCaveat: 'Open-Meteo 用标准递减率线性修正，逆温层/辐射冷却场景温度可能反向偏差，山区微气候仅供参考',
      precipNote: 'precipProb 来自 GFS 集合，中国区域验证度低于欧美',
      dateOutOfRange,
      dateRangeNote,
    },
  }
}

module.exports = { fetchWeather }
