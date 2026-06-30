/**
 * 徒步薯 - 历史记录云函数
 *
 * 功能：
 *   mode='saveRoute' — UGC 路线共创落库（地理围栏去重 + 重名保护）
 *   mode='save' — 存一条查询记录（_openid 由微信 SDK 自动注入）
 *   mode='list' — 查当前用户最近 20 条（按 _openid 自动隔离）
 *   mode='delete' — 删除指定记录（仅能删自己的）
 *
 *   mode='listRoutes' — 搜索 UGC 路线库（供 geocode 模块前置查询）

 * 防御性设计：
 * - openId 隔离：db.add() 自带 _openid，安全规则设为"仅创建者可读写"
 * - 字段白名单：save 时只取已知字段，防止注入
 * - 长度限制：summary 截断，防超大文档
 * - 地理围栏：saveRoute 时 Haversine 距离 < 1km 判定为同一路线，拒绝新增
 * - 重名保护：同名但距离 > 5km 的路线自动追加地区前缀
 * - 入参兜底：缺失字段用默认值，不崩
 */

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const MAX_SUMMARY = 120

exports.main = async (event, context) => {
  const { mode } = event

  if (mode === 'save') {
    return await saveRecord(event)
  }
  if (mode === 'list') {
    return await listRecords(event)
  }
  if (mode === 'delete') {
    return await deleteRecord(event)
  }
  if (mode === 'saveRoute') {
    return await saveRoute(event)
  }
  if (mode === 'listRoutes') {
    return await listRoutes(event)
  }

  return { ok: false, error: 'invalid_mode', message: '未知 mode: ' + mode }
}

/**
 * 保存一条历史记录
 * 字段白名单：route, date, days, level, elevation, location, summary, degraded
 */
async function saveRecord(event) {
  const record = {
    route: String(event.route || '未知路线').substring(0, 50),
    date: String(event.date || ''),
    days: Math.max(1, Math.min(7, parseInt(event.days) || 1)),
    level: String(event.level || '中级'),
    elevation: event.elevation || null,
    location: String(event.location || '').substring(0, 60),
    summary: String(event.summary || '').substring(0, MAX_SUMMARY),
    degraded: event.degraded === true,
    coords: event.coords || null,
    createdAt: db.serverDate(),
  }

  try {
    const res = await db.collection('history').add({ data: record })
    return { ok: true, id: res._id }
  } catch (e) {
    console.error('[history:save] 失败:', e.message)
    return { ok: false, error: 'save_failed', message: '历史记录保存失败: ' + e.message }
  }
}

/**
 * 查询当前用户最近 20 条历史记录
 * openId 隔离由微信安全规则自动处理（集合权限设为"仅创建者可读写"）
 */
async function listRecords(event) {
  const limit = Math.min(20, Math.max(1, parseInt(event.limit) || 20))

  try {
    const res = await db.collection('history')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()
    return { ok: true, data: res.data || [] }
  } catch (e) {
    console.error('[history:list] 失败:', e.message)
    return { ok: false, error: 'list_failed', message: '历史记录查询失败: ' + e.message }
  }
}

/**
 * 删除指定记录（仅能删自己的，安全规则兜底）
 */
async function deleteRecord(event) {
  const id = String(event.id || '')
  if (!id) {
    return { ok: false, error: 'missing_id', message: '缺少记录 id' }
  }
  try {
    await db.collection('history').doc(id).remove()
    return { ok: true }
  } catch (e) {
    console.error('[history:delete] 失败:', e.message)
    return { ok: false, error: 'delete_failed', message: '删除失败: ' + e.message }
  }
}

// ===== UGC 路线共创 =====

/**
 * Haversine 距离公式（地球表面两点间球面距离，单位：米）
 */
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000 // 地球半径（米）
  const toRad = (deg) => deg * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * 地理围栏去重 + 重名保护，将用户手动输入的路线沉淀为公共路线
 *
 * 防线 A（1km 去重）：新路线与已有路线距离 < 1000m → 判定同一目的地
 *   - 若名称不同 → 将新名称追加为已有路线的 alias
 *   - 若名称相同 → 直接复用，不新增
 * 防线 B（5km 重名异地）：同名但距离 > 5km → 自动追加地区后缀
 */
async function saveRoute(event) {
  const name = String(event.route || '').trim().substring(0, 50)
  const lat = parseFloat(event.lat)
  const lon = parseFloat(event.lon)
  const elevation = event.elevation || null
  const location = String(event.location || '').substring(0, 60)

  if (!name || isNaN(lat) || isNaN(lon)) {
    return { ok: false, error: 'invalid_params', message: '路线名或坐标缺失' }
  }

  try {
    // 拉取现有 UGC 路线全表（数据量小，一次性拉取）
    const existing = await db.collection('routes').limit(1000).get()
    const routes = existing.data || []

    const SAME_PLACE_M = 1000   // 1km 内判定同一目的地
    const DIFF_PLACE_M = 5000   // 5km 外判定异地

    // 防线 A：1km 地理围栏去重
    let nearMatch = null
    let nameMatchFar = null  // 同名但距离 > 5km（异地重名）

    for (const r of routes) {
      if (r.lat == null || r.lon == null) continue
      const dist = haversine(lat, lon, r.lat, r.lon)
      if (dist < SAME_PLACE_M) {
        nearMatch = r
        break  // 命中最近匹配即可
      }
      // 同名但距离 > 5km → 异地重名
      if (r.name === name && dist > DIFF_PLACE_M) {
        nameMatchFar = r
      }
    }

    // 防线 A 命中：1km 内已有路线
    if (nearMatch) {
      // 名称不同 → 追加 alias
      if (nearMatch.name !== name) {
        const aliases = nearMatch.aliases || []
        if (aliases.indexOf(name) === -1) {
          aliases.push(name)
          await db.collection('routes').doc(nearMatch._id).update({ data: { aliases } })
        }
      }
      return { ok: true, action: 'merged', data: { name: nearMatch.name, lat: nearMatch.lat, lon: nearMatch.lon, elevation: nearMatch.elevation } }
    }

    // 防线 B：同名但异地（> 5km）→ 自动追加地区后缀
    let finalName = name
    if (nameMatchFar && location) {
      // 提取地区前缀（取 location 的最后一段，如"广东省韶关市"→"韶关"）
      const locParts = location.split(/[省市县区]+/)
      const region = locParts[locParts.length - 2] || ''
      if (region) {
        finalName = name + '-' + region
      }
    }

    // 新增路线记录
    const record = {
      name: finalName,
      lat,
      lon,
      elevation,
      location,
      aliases: [name !== finalName ? name : ''],
      createdBy: 'UGC',
      createdAt: db.serverDate(),
    }
    const res = await db.collection('routes').add({ data: record })
    return { ok: true, action: 'created', id: res._id, data: { name: finalName, lat, lon, elevation } }
  } catch (e) {
    console.error('[history:saveRoute] 失败:', e.message)
    return { ok: false, error: 'save_route_failed', message: '路线保存失败: ' + e.message }
  }
}

/**
 * 搜索 UGC 路线库（供 geocode.js 前置查询）
 * 返回名称匹配的路线，避免重复要求用户输入坐标
 */
async function listRoutes(event) {
  const keyword = String(event.keyword || '').trim()
  if (!keyword) {
    return { ok: true, data: [] }
  }

  try {
    // 拉取全表后 JS 侧过滤（云开发不支持正则模糊查，数据量小可接受）
    const res = await db.collection('routes').limit(500).get()
    const routes = res.data || []
    const matched = routes.filter((r) => {
      if (r.name && r.name.indexOf(keyword) >= 0) return true
      if (r.aliases && Array.isArray(r.aliases)) {
        for (const a of r.aliases) {
          if (a && a.indexOf(keyword) >= 0) return true
        }
      }
      return false
    }).map((r) => ({ name: r.name, lat: r.lat, lon: r.lon, elevation: r.elevation, location: r.location }))
    return { ok: true, data: matched }
  } catch (e) {
    console.error('[history:listRoutes] 失败:', e.message)
    return { ok: false, error: 'list_routes_failed', message: '路线查询失败: ' + e.message }
  }
}
