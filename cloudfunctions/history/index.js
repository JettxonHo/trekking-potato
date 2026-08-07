/**
 * Private query-history Cloud Function.
 *
 * The server-side WeChat openid is the only history identity. Legacy public
 * UGC modes remain authenticated tombstones so existing callers receive an
 * explicit answer without touching the routes collection.
 */

const cloud = require('wx-server-sdk')
cloud.init(/** @type {any} */ ({ env: cloud.DYNAMIC_CURRENT_ENV }))

const db = cloud.database()
const MAX_SUMMARY = 120
const VALID_ROUTE_TYPES = ['trek', 'climb', 'tour']
const VALID_ROUTE_TYPE_SOURCES = ['builtin', 'ugc', 'amap', 'user', 'unknown']

function error(error, message, retryable) {
  return { ok: false, error, message, retryable }
}

function historyUnavailable() {
  return error('history_unavailable', '历史服务暂时不可用，请稍后重试', true)
}

function toHistoryItem(record) {
  return {
    id: record._id,
    route: record.route,
    date: record.date,
    days: record.days,
    level: record.level,
    elevation: record.elevation,
    location: record.location,
    summary: record.summary,
    degraded: record.degraded,
    coords: record.coords,
    routeType: record.routeType,
    routeTypeSource: record.routeTypeSource,
  }
}

function normalizedSaveRecord(event, openid) {
  const route = typeof event.route === 'string' ? event.route.trim().substring(0, 50) : ''
  const date = typeof event.date === 'string' ? event.date.trim() : ''
  if (!route || !date) return null

  const coords = event.coords && typeof event.coords === 'object'
    && typeof event.coords.lat === 'number' && typeof event.coords.lon === 'number'
    ? { lat: event.coords.lat, lon: event.coords.lon }
    : null
  const elevation = typeof event.elevation === 'number' && isFinite(event.elevation) ? event.elevation : null

  return {
    _openid: openid,
    route,
    date,
    days: Math.max(1, Math.min(7, parseInt(event.days, 10) || 1)),
    level: typeof event.level === 'string' ? event.level.substring(0, 20) : '中级',
    elevation,
    location: typeof event.location === 'string' ? event.location.substring(0, 60) : '',
    summary: typeof event.summary === 'string' ? event.summary.substring(0, MAX_SUMMARY) : '',
    degraded: event.degraded === true,
    coords,
    routeType: VALID_ROUTE_TYPES.indexOf(event.routeType) >= 0 ? event.routeType : null,
    routeTypeSource: VALID_ROUTE_TYPE_SOURCES.indexOf(event.routeTypeSource) >= 0 ? event.routeTypeSource : null,
    createdAt: db.serverDate(),
  }
}

async function saveRecord(event, openid) {
  const record = normalizedSaveRecord(event, openid)
  if (!record) return error('invalid_history_input', '请填写路线和日期', false)
  try {
    const result = /** @type {{ _id?: string }} */ (await db.collection('history').add({ data: record }))
    return { ok: true, id: result._id }
  } catch (exception) {
    return historyUnavailable()
  }
}

async function listRecords(event, openid) {
  const limit = Math.min(20, Math.max(1, parseInt(event.limit, 10) || 20))
  try {
    const result = /** @type {{ data?: any[] }} */ (await db.collection('history')
      .where({ _openid: openid })
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get())
    return { ok: true, data: (result.data || []).map(toHistoryItem) }
  } catch (exception) {
    return historyUnavailable()
  }
}

async function deleteRecord(event, openid) {
  const id = typeof event.id === 'string' ? event.id.trim() : ''
  if (!id) return error('missing_id', '缺少记录 id', false)
  try {
    const result = /** @type {{ stats?: { removed?: number } }} */ (await db.collection('history')
      .where({ _id: id, _openid: openid })
      .remove())
    if (result.stats && result.stats.removed === 1) return { ok: true }
    return error('history_not_found', '未找到历史记录', false)
  } catch (exception) {
    return historyUnavailable()
  }
}

async function clearRecords(openid) {
  try {
    const result = /** @type {{ stats?: { removed?: number } }} */ (await db.collection('history')
      .where({ _openid: openid })
      .remove())
    return { ok: true, removed: result.stats ? result.stats.removed : 0 }
  } catch (exception) {
    return historyUnavailable()
  }
}

exports.main = async (event = {}, context) => {
  const openid = cloud.getWXContext().OPENID
  if (!openid) return error('no_auth', '无法获取用户身份', false)

  if (event.mode === 'save') return saveRecord(event, openid)
  if (event.mode === 'list') return listRecords(event, openid)
  if (event.mode === 'delete') return deleteRecord(event, openid)
  if (event.mode === 'clear') return clearRecords(openid)
  if (event.mode === 'saveRoute' || event.mode === 'listRoutes') {
    return error('ugc_disabled', '公共路线共创已停用', false)
  }
  return error('invalid_mode', '不支持的历史操作', false)
}
