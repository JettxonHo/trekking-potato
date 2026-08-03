/**
 * 徒步薯 - 天气模块（Open-Meteo，含 elevation）
 *
 * 重要：
 * - 传 elevation 参数请求该海拔天气（非网格点海拔）
 * - 标准递减率线性修正，逆温层场景不准（elevationCaveat）
 * - 使用 start_date/end_date 请求严格对应出发日期与行程天数的窗口（TP-P0-002）
 * - 置信度按相对今天的实际预报提前量标注（>=5 天为"参考"）
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

/* ---------- ISO 日期辅助函数（TP-P0-002） ----------
 * 纯 UTC 日历运算，不依赖云函数主机或本地时区；
 * 不使用本地时间毫秒运算，规避夏令时/时区偏移造成的日期漂移。
 */

/**
 * 严格校验真实存在的 YYYY-MM-DD 日期
 */
function isValidIsoDate(dateStr) {
  if (typeof dateStr !== 'string') return false
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!m) return false
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const dt = new Date(Date.UTC(year, month - 1, day))
  return dt.getUTCFullYear() === year && dt.getUTCMonth() === month - 1 && dt.getUTCDate() === day
}

/**
 * 在 ISO 日期上按 UTC 日历加减天数，返回 YYYY-MM-DD
 */
function addIsoDays(dateStr, amount) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!m) throw new Error('addIsoDays: 无效日期 ' + dateStr)
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + amount))
  return dt.toISOString().slice(0, 10)
}

/**
 * 两个 ISO 日期相差天数（endDate - startDate），均为 UTC 零点，结果精确
 */
function diffIsoDays(startDate, endDate) {
  const a = new Date(startDate + 'T00:00:00Z').getTime()
  const b = new Date(endDate + 'T00:00:00Z').getTime()
  return Math.round((b - a) / 86400000)
}

/**
 * 取某一时刻在指定时区的当地日期（YYYY-MM-DD），使用 formatToParts 避免猜测偏移量。
 * 产品时区固定为 Asia/Shanghai。
 */
function getDateInTimeZone(now, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const value = (type) => parts.find((p) => p.type === type).value
  return value('year') + '-' + value('month') + '-' + value('day')
}

/**
 * tripDays 云函数入口严格解析（TP-P0-002 REVIEW_FIX）
 * 接受：undefined/null → 默认 1；数字 1–7 的整数；单字符十进制字符串 "1"–"7"。
 * 拒绝：0、负数、小数、8 及以上、NaN、Infinity、布尔、数组、对象、空字符串、
 * 带空格字符串、前导零、小数、指数、十六进制、带符号及非数字字符串，一律返回 null。
 * 不对任意类型调用 Number(value) 强制转换，不 trim；非法时返回 null，由调用方报错。
 */
function parseTripDaysInput(value) {
  if (value === undefined || value === null) return 1

  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 1 && value <= 7
      ? value
      : null
  }

  if (typeof value === 'string' && /^[1-7]$/.test(value)) {
    return Number(value)
  }

  return null
}

/**
 * 查询 Open-Meteo 天气（严格行程窗口契约，TP-P0-002）
 * @param {number} lat - 纬度（WGS84）
 * @param {number} lon - 经度（WGS84）
 * @param {number} elevation - 海拔（米）
 * @param {string} dateStr - 出发日期 YYYY-MM-DD（必须是真实日期且不早于 Asia/Shanghai 今天）
 * @param {number} tripDays - 行程天数，必须是 1–7 的整数
 * @param {Object} [options] - 可选 { now: Date }，仅用于确定性测试；生产不传
 * @returns {Object} ok:true 时 data.days[0].date === dateStr 且 data.days.length === tripDays；
 *                   完整窗口不可获得时 ok:false, error:'out_of_range'
 */
async function fetchWeather(lat, lon, elevation, dateStr, tripDays, options) {
  const now = options && options.now instanceof Date ? options.now : new Date()

  // 出发日期校验：必须是真实存在的 YYYY-MM-DD
  if (!isValidIsoDate(dateStr)) {
    return { ok: false, error: 'invalid_date', message: '出发日期无效或早于今天' }
  }

  // 行程天数校验：1–7 整数，不静默截断或修正非法值
  if (!Number.isInteger(tripDays) || tripDays < 1 || tripDays > 7) {
    return { ok: false, error: 'invalid_trip_days', message: '行程天数必须为 1 至 7 天' }
  }

  // 过去日期（早于 Asia/Shanghai 今天）确定性拒绝
  const todayStr = getDateInTimeZone(now, 'Asia/Shanghai')
  if (diffIsoDays(todayStr, dateStr) < 0) {
    return { ok: false, error: 'invalid_date', message: '出发日期无效或早于今天' }
  }

  // 行程窗口：start_date = 出发日，end_date = 出发日 + tripDays - 1
  const startDate = dateStr
  const endDate = addIsoDays(startDate, tripDays - 1)
  const expectedDates = []
  for (let i = 0; i < tripDays; i++) expectedDates.push(addIsoDays(startDate, i))

  // Open-Meteo Forecast API：显式日期范围直接表达完整行程窗口。
  // 不使用 forecast_days（不得与 start_date/end_date 同时发送）；
  // 可用预报边界由服务端动态决定，不硬编码任何天数常量。
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    elevation: (elevation != null ? elevation : 0).toString(),
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max',
    wind_speed_unit: 'ms',
    timezone: 'Asia/Shanghai',
    start_date: startDate,
    end_date: endDate,
  })

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  const result = await httpsGet(url)

  // Open-Meteo 错误响应：{ error: true, reason: '...' }。
  // reason 明确表示日期超出允许范围时映射为确定性 out_of_range；
  // 不向客户端暴露原始 reason，不从 reason 解析硬编码边界，也不回退请求当前天气。
  if (result && result.error === true) {
    const reason = typeof result.reason === 'string' ? result.reason : ''
    if (/out of allowed range/i.test(reason) && /start_date|end_date/i.test(reason)) {
      return {
        ok: false,
        error: 'out_of_range',
        message: '所选行程超出当前可用天气预报范围，请临近出发日期后重新查询',
        requestedStartDate: startDate,
        requestedEndDate: endDate,
      }
    }
    return { ok: false, error: 'weather_data_invalid', message: 'Open-Meteo 返回数据异常' }
  }

  if (!result.daily || !result.daily.time) {
    return { ok: false, error: 'weather_data_invalid', message: 'Open-Meteo 返回数据异常' }
  }

  // 风速单位契约：请求已固定 wind_speed_unit=ms，响应单位必须严格为 m/s。
  // daily_units 缺失、单位字段缺失、km/h 或其他值一律确定性拒绝，防止单位漂移。
  const windUnitMeta = result.daily_units && result.daily_units.wind_speed_10m_max
  if (windUnitMeta !== 'm/s') {
    return { ok: false, error: 'weather_data_invalid', message: 'Open-Meteo 风速单位异常' }
  }

  const daily = result.daily

  // 严格窗口验证（TP-P0-002）：只有在返回日期与期望行程窗口完全一致时才构建 days。
  if (!Array.isArray(daily.time)) {
    return { ok: false, error: 'weather_data_invalid', message: 'Open-Meteo 返回的天气日期窗口异常' }
  }
  if (daily.time.length < tripDays) {
    // 部分覆盖：无法得到完整行程窗口，确定性 out_of_range，不得截取后继续
    return {
      ok: false,
      error: 'out_of_range',
      message: '所选行程无法获得完整天气预报，请临近出发日期后重新查询',
      requestedStartDate: startDate,
      requestedEndDate: endDate,
    }
  }
  if (daily.time.length !== tripDays) {
    return { ok: false, error: 'weather_data_invalid', message: 'Open-Meteo 返回的天气日期窗口异常' }
  }
  for (let i = 0; i < tripDays; i++) {
    // 日期缺失、乱序或起点错误一律确定性拒绝，不用 slice 掩盖错误起点
    if (daily.time[i] !== expectedDates[i]) {
      return { ok: false, error: 'weather_data_invalid', message: 'Open-Meteo 返回的天气日期窗口异常' }
    }
  }

  const days = []
  for (let i = 0; i < tripDays; i++) {
    // 置信度按相对今天的实际预报提前量（天数），不是数组下标
    const leadDays = diffIsoDays(todayStr, daily.time[i])
    const confidence = leadDays >= 5 ? '参考' : '正常'
    days.push({
      date: daily.time[i],
      // 温度防重合：最低温 floor、最高温 ceil，规避 round 导致的零温差 UI Bug
      tempMin: Math.floor(daily.temperature_2m_min[i]),
      tempMax: Math.ceil(daily.temperature_2m_max[i]),
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
      windUnit: 'm/s',
      fetchedAt: now.toISOString(),
      elevationUsed: elevation,
      elevationCaveat: 'Open-Meteo 用标准递减率线性修正，逆温层/辐射冷却场景温度可能反向偏差，山区微气候仅供参考',
      precipNote: 'precipProb 来自 GFS 集合，中国区域验证度低于欧美',
      // 保留字段以避免下游兼容性变化；成功结果中窗口已严格对应行程，不再出现 true
      dateOutOfRange: false,
      dateRangeNote: '',
    },
  }
}

module.exports = { fetchWeather, isValidIsoDate, addIsoDays, diffIsoDays, getDateInTimeZone, parseTripDaysInput }
