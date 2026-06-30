/**
 * 徒步薯 - 地理编码模块
 * 路线名 -> {name, lat, lon, elevation, source}
 *
 * 流程：内置表匹配 -> 高德 POI 搜索 -> Open-Meteo elevation 查海拔
 * 坐标转换：高德返回 GCJ-02，Open-Meteo 用 WGS84，必须转换
 */

const https = require('https')
const { matchBuiltinRoute } = require('./data/routes')
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const ugcDb = cloud.database()

// GCJ-02 -> WGS84 坐标转换（红队击穿点：必须转换，否则海拔查询偏差100-300m）
// 算法来源：公开的 GCJ-02 解密算法
function gcj02ToWgs84(lng, lat) {
  const PI = 3.1415926535897932384626
  const A = 6378245.0
  const EE = 0.00669342162296594323

  function transformLat(lng, lat) {
    let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng))
    ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0
    ret += (20.0 * Math.sin(lat * PI) + 40.0 * Math.sin(lat / 3.0 * PI)) * 2.0 / 3.0
    ret += (160.0 * Math.sin(lat / 12.0 * PI) + 320 * Math.sin(lat * PI / 30.0)) * 2.0 / 3.0
    return ret
  }

  function transformLng(lng, lat) {
    let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng))
    ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0
    ret += (20.0 * Math.sin(lng * PI) + 40.0 * Math.sin(lng / 3.0 * PI)) * 2.0 / 3.0
    ret += (150.0 * Math.sin(lng / 12.0 * PI) + 300.0 * Math.sin(lng / 30.0 * PI)) * 2.0 / 3.0
    return ret
  }

  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLng(lng - 105.0, lat - 35.0)
  const radLat = lat / 180.0 * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI)
  dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI)
  const mgLat = lat + dLat
  const mgLng = lng + dLng

  return { lng: lng * 2 - mgLng, lat: lat * 2 - mgLat }
}

/**
 * HTTPS GET 请求封装
 */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { reject(new Error('JSON 解析失败: ' + data.substring(0, 100))) }
      })
    })
    req.on('error', reject)
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('请求超时 5s')) })
  })
}

/**
 * 高德 POI 关键字搜索（非 geocode）
 * 山名是地名不是地址，必须用 POI 搜索
 */
async function searchAmapPOI(route) {
  const AMAP_KEY = process.env.AMAP_KEY
  if (!AMAP_KEY) throw new Error('AMAP_KEY 未配置')

  const url = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(route)}&key=${AMAP_KEY}&types=&city=&offset=5&page=1&extensions=all`
  const result = await httpsGet(url)

  if (result.status !== '1' || !result.pois || result.pois.length === 0) {
    return null
  }

  // 过滤：优先风景名胜/自然地物/山峰类
  const pois = result.pois
  const preferred = pois.find((p) => {
    const typecode = p.typecode || ''
    return typecode.startsWith('11') || typecode.startsWith('14') || typecode.startsWith('15')
  })

  const poi = preferred || pois[0]
  const [lngStr, latStr] = poi.location.split(',')
  const lng = parseFloat(lngStr)
  const lat = parseFloat(latStr)

  return {
    name: poi.name,
    lat: lat,
    lon: lng,
    source: '高德POI',
    location: poi.cityname + poi.adname,
  }
}

/**
 * Open-Meteo elevation API 查询海拔
 * 输入 WGS84 坐标
 */
async function fetchElevation(lat, lon) {
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`
  const result = await httpsGet(url)

  if (!result.elevation || result.elevation.length === 0) {
    return null
  }

  return result.elevation[0]
}

/**
 * resolveLocation 主函数
 * @param {string} route - 路线名
 * @returns {Object} {name, lat, lon, elevation, source, needsConfirm?}
 */
async function resolveLocation(route) {
  if (!route || route.trim().length === 0) {
    return { ok: false, error: 'route_empty', message: '路线名不能为空' }
  }

  // 1. 内置表匹配
  const builtin = matchBuiltinRoute(route)
  if (builtin) {
    return {
      ok: true,
      data: {
        name: builtin.name,
        lat: builtin.lat,
        lon: builtin.lon,
        elevation: builtin.elevation,
        source: '内置路线表',
        location: builtin.location,
        note: builtin.note,
        needsConfirm: builtin.needsConfirm || false,
        matchType: builtin.matchType,
      },
    }
  }

  // 1.5 UGC 共创路线库查询（其他用户手动输入并沉淀的路线）
  try {
    const ugcRes = await ugcDb.collection('routes').limit(500).get()
    const ugcRoutes = ugcRes.data || []
    for (const r of ugcRoutes) {
      // 名称精确匹配或别名匹配
      if (r.name === route) {
        return { ok: true, data: { name: r.name, lat: r.lat, lon: r.lon, elevation: r.elevation || null, source: 'UGC共创路线库', location: r.location || '', matchType: 'ugc' } }
      }
      if (r.aliases && Array.isArray(r.aliases)) {
        for (const a of r.aliases) {
          if (a && a === route) {
            return { ok: true, data: { name: r.name, lat: r.lat, lon: r.lon, elevation: r.elevation || null, source: 'UGC共创路线库', location: r.location || '', matchType: 'ugc' } }
          }
        }
      }
      // 包含匹配（如"黑排角"命中"黑排角海岸线"）
      if (r.name && r.name.indexOf(route) >= 0) {
        return { ok: true, data: { name: r.name, lat: r.lat, lon: r.lon, elevation: r.elevation || null, source: 'UGC共创路线库', location: r.location || '', matchType: 'ugc' } }
      }
    }
  } catch (e) {
    // UGC 查询失败不阻塞，继续走高德 POI
    console.warn('[geocode] UGC 路线库查询失败:', e.message)
  }

  // 2. 高德 POI 搜索
  let amapResult
  try {
    amapResult = await searchAmapPOI(route)
  } catch (e) {
    return { ok: false, error: 'amap_failed', message: '高德 POI 搜索失败: ' + e.message }
  }

  if (!amapResult) {
    return { ok: false, error: 'not_found', message: '未找到位置：' + route }
  }

  // 3. GCJ-02 -> WGS84 转换
  const wgs84 = gcj02ToWgs84(amapResult.lon, amapResult.lat)

  // 4. Open-Meteo 查海拔（用 WGS84 坐标）
  let elevation
  try {
    elevation = await fetchElevation(wgs84.lat, wgs84.lng)
  } catch (e) {
    elevation = null
  }

  if (!elevation) {
    return {
      ok: true,
      data: {
        name: amapResult.name,
        lat: amapResult.lat,
        lon: amapResult.lon,
        elevation: null,
        source: '高德POI(海拔获取失败)',
        location: amapResult.location,
        needsConfirm: true,
      },
    }
  }

  return {
    ok: true,
    data: {
      name: amapResult.name,
      lat: amapResult.lat,
      lon: amapResult.lon,
      elevation: Math.round(elevation),
      source: '高德POI+Open-Meteo',
      location: amapResult.location,
      needsConfirm: false,
    },
  }
}

module.exports = { resolveLocation, gcj02ToWgs84, fetchElevation }
