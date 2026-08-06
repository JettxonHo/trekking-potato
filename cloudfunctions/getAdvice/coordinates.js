/**
 * Pure coordinate-system helpers shared by geocoding and route weather.
 */

function gcj02ToWgs84(lng, lat) {
  const pi = 3.1415926535897932384626
  const a = 6378245.0
  const ee = 0.00669342162296594323

  function transformLat(valueLng, valueLat) {
    let result = -100.0 + 2.0 * valueLng + 3.0 * valueLat + 0.2 * valueLat * valueLat + 0.1 * valueLng * valueLat + 0.2 * Math.sqrt(Math.abs(valueLng))
    result += (20.0 * Math.sin(6.0 * valueLng * pi) + 20.0 * Math.sin(2.0 * valueLng * pi)) * 2.0 / 3.0
    result += (20.0 * Math.sin(valueLat * pi) + 40.0 * Math.sin(valueLat / 3.0 * pi)) * 2.0 / 3.0
    result += (160.0 * Math.sin(valueLat / 12.0 * pi) + 320 * Math.sin(valueLat * pi / 30.0)) * 2.0 / 3.0
    return result
  }

  function transformLng(valueLng, valueLat) {
    let result = 300.0 + valueLng + 2.0 * valueLat + 0.1 * valueLng * valueLng + 0.1 * valueLng * valueLat + 0.1 * Math.sqrt(Math.abs(valueLng))
    result += (20.0 * Math.sin(6.0 * valueLng * pi) + 20.0 * Math.sin(2.0 * valueLng * pi)) * 2.0 / 3.0
    result += (20.0 * Math.sin(valueLng * pi) + 40.0 * Math.sin(valueLng / 3.0 * pi)) * 2.0 / 3.0
    result += (150.0 * Math.sin(valueLng / 12.0 * pi) + 300.0 * Math.sin(valueLng / 30.0 * pi)) * 2.0 / 3.0
    return result
  }

  let deltaLat = transformLat(lng - 105.0, lat - 35.0)
  let deltaLng = transformLng(lng - 105.0, lat - 35.0)
  const radLat = lat / 180.0 * pi
  let magic = Math.sin(radLat)
  magic = 1 - ee * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  deltaLat = (deltaLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * pi)
  deltaLng = (deltaLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * pi)
  const gcjLat = lat + deltaLat
  const gcjLng = lng + deltaLng

  return { lng: lng * 2 - gcjLng, lat: lat * 2 - gcjLat }
}

module.exports = { gcj02ToWgs84 }
