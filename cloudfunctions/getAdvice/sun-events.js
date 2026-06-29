/**
 * 徒步薯 - 天文时刻模块（suncalc 离线计算）
 * 日出/日落/黄金时刻/蓝调时刻
 * 地形遮挡标注（山谷实际日出可能晚1-2小时）
 */

// suncalc 是纯 JS 库，云函数 npm install 即可
// 这里直接 require，部署时在 cloudfunctions/getAdvice/ 下 npm install suncalc
let SunCalc
try {
  SunCalc = require('suncalc')
} catch (e) {
  // suncalc 未安装时的降级（开发阶段）
  SunCalc = null
}

/**
 * 计算天文时刻
 * @param {number} lat - 纬度（WGS84）
 * @param {number} lon - 经度（WGS84）
 * @param {string} dateStr - 日期 YYYY-MM-DD
 * @returns {Object} {sunrise, sunset, goldenHour, blueHour, terrainCaveat}
 */
function calcSunEvents(lat, lon, dateStr) {
  const date = new Date(dateStr + 'T12:00:00Z')

  if (!SunCalc) {
    return {
      sunrise: null,
      sunset: null,
      goldenHour: null,
      blueHour: null,
      terrainCaveat: '未考虑地形遮挡，山谷实际日出可能晚 1-2 小时',
      error: 'suncalc 未安装',
    }
  }

 const times = SunCalc.getTimes(date, lat, lon)

 // 黄金时刻：日出后1小时 + 日落前1小时
 const sunrise = times.sunrise
 const sunset = times.sunset
 const goldenMorningEnd = new Date(sunrise.getTime() + 60 * 60 * 1000)
 const goldenEveningStart = new Date(sunset.getTime() - 60 * 60 * 1000)

 // 蓝调时刻：日出前20分钟 + 日落后20分钟
 const blueMorningStart = new Date(sunrise.getTime() - 20 * 60 * 1000)
 const blueEveningEnd = new Date(sunset.getTime() + 20 * 60 * 1000)

  // 中国统一用 UTC+8 显示时间（云函数服务器时区不可靠，不能依赖 toTimeString）
  function fmt(d) {
    if (!d || isNaN(d.getTime())) return null
    // 取 UTC 分量后加 8 小时，再格式化，避免依赖服务器本地时区
    let h = d.getUTCHours() + 8
    const m = d.getUTCMinutes()
    h = ((h % 24) + 24) % 24 // 处理跨日（如日出在 UTC 前一天 23:xx）
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
  }

  return {
    sunrise: fmt(sunrise),
    sunset: fmt(sunset),
    goldenHour: fmt(sunrise) + '-' + fmt(goldenMorningEnd) + ' / ' + fmt(goldenEveningStart) + '-' + fmt(sunset),
    blueHour: fmt(blueMorningStart) + '-' + fmt(sunrise) + ' / ' + fmt(sunset) + '-' + fmt(blueEveningEnd),
    terrainCaveat: '未考虑地形遮挡，山谷实际日出可能晚 1-2 小时。此为海平面几何参考值。',
  }
}

module.exports = { calcSunEvents }
