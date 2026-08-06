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
cloud.init(/** @type {any} */ ({ env: cloud.DYNAMIC_CURRENT_ENV }))

const db = cloud.database()
const MAX_SUMMARY = 120

// TP-P0-003：路线类型契约枚举（与 cloudfunctions/getAdvice/route-type.js 保持一致；
// 云函数按目录独立部署，不能跨函数目录 require）
const VALID_ROUTE_TYPES = ['trek', 'climb', 'tour']
const VALID_ROUTE_TYPE_SOURCES = ['builtin', 'ugc', 'amap', 'user', 'unknown']

exports.main = async (event, context) => {
  const { mode } = event

  // 云函数以管理员权限运行，安全规则不生效，必须手动用 openid 过滤
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  // 统一鉴权：所有 mode 都要求合法 openid
  if (!openid) {
    return { ok: false, error: 'no_auth', message: '无法获取用户身份' }
  }

  if (mode === 'save') {
    return await saveRecord(event, openid)
  }
  if (mode === 'list') {
    return await listRecords(event, openid)
  }
  if (mode === 'delete') {
    return await deleteRecord(event, openid)
  }
  if (mode === 'saveRoute') {
    return await saveRoute(event, openid)
  }
  if (mode === 'listRoutes') {
    return await listRoutes(event, openid)
  }

  return { ok: false, error: 'invalid_mode', message: '未知 mode: ' + mode }
}

/**
 * 保存一条历史记录
 * 字段白名单：route, date, days, level, elevation, location, summary, degraded,
 * routeType, routeTypeSource（TP-P0-003）
 */
async function saveRecord(event, openid) {
  // 手动注入 _openid，不依赖 SDK 隐式行为（防御性：SDK 可能不注入）
  const safeRoute = typeof event.route === 'string' ? event.route.trim().substring(0, 50) : '未知路线'
  const safeLevel = typeof event.level === 'string' ? event.level.substring(0, 20) : '中级'
  const safeCoords = event.coords && typeof event.coords === 'object' && typeof event.coords.lat === 'number' && typeof event.coords.lon === 'number'
    ? { lat: event.coords.lat, lon: event.coords.lon }
    : null
  const safeElev = typeof event.elevation === 'number' && isFinite(event.elevation) ? event.elevation : null
  // TP-P0-003：路线类型只接受合法枚举值；缺失保持缺失，不得迁移为 trek
  const safeRouteType = VALID_ROUTE_TYPES.indexOf(event.routeType) >= 0 ? event.routeType : null
  const safeRouteTypeSource = VALID_ROUTE_TYPE_SOURCES.indexOf(event.routeTypeSource) >= 0 ? event.routeTypeSource : null

  const record = {
    _openid: openid || '',
    route: safeRoute.substring(0, 50),
    date: String(event.date || ''),
    days: Math.max(1, Math.min(7, parseInt(event.days) || 1)),
    level: safeLevel,
    elevation: safeElev,
    location: String(event.location || '').substring(0, 60),
    summary: String(event.summary || '').substring(0, MAX_SUMMARY),
    degraded: event.degraded === true,
    coords: safeCoords,
    routeType: safeRouteType,
    routeTypeSource: safeRouteTypeSource,
    createdAt: db.serverDate(),
  }

  try {
    const res = /** @type {{ _id?: string }} */ (await db.collection('history').add({ data: record }))
    return { ok: true, id: res._id }
  } catch (e) {
    console.error('[history:save] 失败:', e.message)
    return { ok: false, error: 'save_failed', message: '历史记录保存失败: ' + e.message }
  }
}

/**
 * 查询当前用户最近 20 条历史记录
 * openId 隔离：云函数绕过安全规则，必须手动 where({ _openid }) 过滤
 */
async function listRecords(event, openid) {
  if (!openid) {
    return { ok: false, error: 'no_auth', message: '无法获取用户身份' }
  }
  const limit = Math.min(20, Math.max(1, parseInt(event.limit) || 20))

  try {
    const res = /** @type {{ data?: any[] }} */ (await db.collection('history')
      .where({ _openid: openid })
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get())
    return { ok: true, data: res.data || [] }
  } catch (e) {
    console.error('[history:list] 失败:', e.message)
    return { ok: false, error: 'list_failed', message: '历史记录查询失败: ' + e.message }
  }
}

/**
 * 删除指定记录（仅能删自己的，openid 校验兜底）
 */
async function deleteRecord(event, openid) {
  const id = String(event.id || '')
  if (!id) {
    return { ok: false, error: 'missing_id', message: '缺少记录 id' }
  }
  if (!openid) {
    return { ok: false, error: 'no_auth', message: '无法获取用户身份' }
  }
  try {
    // 校验所有权：先查再删，防越权
    const doc = /** @type {{ data?: any }} */ (await db.collection('history').doc(id).get())
    if (!doc.data || doc.data._openid !== openid) {
      return { ok: false, error: 'not_owner', message: '只能删除自己的记录' }
    }
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
async function saveRoute(event, openid) {
  const name = typeof event.route === 'string' ? event.route.trim().substring(0, 50) : ''
  // 严格数值校验：拒绝 parseFloat 部分解析（如 '45abc'=45），仅接受纯数字
  const latStr = String(event.lat || '').trim()
  const lonStr = String(event.lon || '').trim()
  const isNumeric = (s) => /^-?\d+(\.\d+)?$/.test(s)
  const lat = parseFloat(latStr)
  const lon = parseFloat(lonStr)
  const elevation = typeof event.elevation === 'number' && isFinite(event.elevation) ? event.elevation : null
  const location = String(event.location || '').substring(0, 60)
  // TP-P0-003：接受前端手动选择的合法路线类型写入新 UGC 记录；
  // 缺失或非法时记为 null，由 geocode 视为 unknown 要求用户重新选择。
  // 静默写入、距离去重、名称合并与审核状态行为不变（属 P1-2）。
  const type = VALID_ROUTE_TYPES.indexOf(event.type) >= 0 ? event.type : null

  // 严格校验：非纯数字 / NaN / Infinity / 超范围 全部拒绝
  if (!name || !isNumeric(latStr) || !isNumeric(lonStr) || isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return { ok: false, error: 'invalid_params', message: '路线名或坐标缺失' }
  }

  try {
    // 拉取现有 UGC 路线全表（数据量小，一次性拉取）
    const existing = /** @type {{ data?: any[] }} */ (await db.collection('routes').limit(1000).get())
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
      return { ok: true, action: 'merged', data: { name: nearMatch.name, lat: nearMatch.lat, lon: nearMatch.lon, elevation: nearMatch.elevation, type: VALID_ROUTE_TYPES.indexOf(nearMatch.type) >= 0 ? nearMatch.type : null } }
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
      // TP-P0-003：UGC 记录携带用户明确选择的路线类型（可为 null）
      type,
      aliases: name !== finalName ? [name] : [],
      createdBy: 'UGC',
      _openid: openid,
      createdAt: db.serverDate(),
    }
    const res = /** @type {{ _id?: string }} */ (await db.collection('routes').add({ data: record }))
    return { ok: true, action: 'created', id: res._id, data: { name: finalName, lat, lon, elevation, type } }
  } catch (e) {
    console.error('[history:saveRoute] 失败:', e.message)
    return { ok: false, error: 'save_route_failed', message: '路线保存失败: ' + e.message }
  }
}

/**
 * 搜索 UGC 路线库（供 geocode.js 前置查询）
 * 返回名称匹配的路线，避免重复要求用户输入坐标
 */
async function listRoutes(event, openid) {
  const keyword = String(event.keyword || '').trim()
  if (!keyword) {
    return { ok: true, data: [] }
  }

  try {
    // 拉取全表后 JS 侧过滤（云开发不支持正则模糊查，数据量小可接受）
    const res = /** @type {{ data?: any[] }} */ (await db.collection('routes').limit(500).get())
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
