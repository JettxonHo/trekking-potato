/**
 * 徒步薯 - 地理编码模块
 * 路线名 -> {name, lat, lon, elevation, source}
 *
 * 流程：内置表匹配 -> 高德 POI 搜索 -> Open-Meteo elevation 查海拔
 * 坐标转换：高德返回 GCJ-02，Open-Meteo 用 WGS84，必须转换
 */

const https = require('https')
const { resolveBuiltinRouteQuery } = require('./data/routes')
const { isKnownRouteType } = require('./route-type')
const { gcj02ToWgs84 } = require('./coordinates')
const cloud = require('wx-server-sdk')
cloud.init(/** @type {any} */ ({ env: cloud.DYNAMIC_CURRENT_ENV }))
const ugcDb = cloud.database()

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
 * @returns {Promise<Object>} {name, lat, lon, elevation, source, needsConfirm?}
 */
async function resolveLocation(route) {
  if (!route || route.trim().length === 0) {
    return { ok: false, error: 'route_empty', message: '路线名不能为空' }
  }

  // 1. 内置表匹配
  const builtinResult = resolveBuiltinRouteQuery(route)
  if (builtinResult.kind === 'confirmation') {
    return {
      ok: true,
      data: {
        candidates: builtinResult.candidates,
        needsConfirm: true,
        matchType: builtinResult.matchStage,
      },
    }
  }
  if (builtinResult.kind === 'direct') {
    const builtin = builtinResult.route
    // TP-P0-003：内置路线透传可信类型；类型数据异常时确定性拒绝，不得默认成 trek
    if (!isKnownRouteType(builtin.type)) {
      return { ok: false, error: 'invalid_route_type', message: '内置路线类型数据异常' }
    }
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
        type: builtin.type,
        typeSource: 'builtin',
      },
    }
  }

  // 1.5 UGC 共创路线库查询（其他用户手动输入并沉淀的路线）
  // TP-P0-003：UGC 记录携带合法类型时透传；旧记录缺失或非法类型时归为 unknown，
  // 由调用层要求用户明确选择，不得默认成 trek
  const ugcTypeFields = (r) => {
    if (isKnownRouteType(r && r.type)) {
      return { type: r.type, typeSource: 'ugc' }
    }
    return { type: 'unknown', typeSource: 'unknown' }
  }
  try {
    const ugcRes = /** @type {{ data?: any[] }} */ (await ugcDb.collection('routes').limit(500).get())
    const ugcRoutes = ugcRes.data || []
    for (const r of ugcRoutes) {
      // 名称精确匹配或别名匹配
      if (r.name === route) {
        return { ok: true, data: { name: r.name, lat: r.lat, lon: r.lon, elevation: r.elevation || null, source: 'UGC共创路线库', location: r.location || '', matchType: 'ugc', ...ugcTypeFields(r) } }
      }
      if (r.aliases && Array.isArray(r.aliases)) {
        for (const a of r.aliases) {
          if (a && a === route) {
            return { ok: true, data: { name: r.name, lat: r.lat, lon: r.lon, elevation: r.elevation || null, source: 'UGC共创路线库', location: r.location || '', matchType: 'ugc', ...ugcTypeFields(r) } }
          }
        }
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
        matchType: 'amap',
        // TP-P0-003：高德不能提供可信路线类型，要求用户明确选择
        type: 'unknown',
        typeSource: 'amap',
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
      matchType: 'amap',
      // TP-P0-003：高德不能提供可信路线类型，要求用户明确选择
      type: 'unknown',
      typeSource: 'amap',
    },
  }
}

module.exports = { resolveLocation, gcj02ToWgs84, fetchElevation }
