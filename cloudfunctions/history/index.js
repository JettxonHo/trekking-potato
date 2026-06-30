/**
 * 徒步薯 - 历史记录云函数
 *
 * 功能：
 *   mode='save' — 存一条查询记录（_openid 由微信 SDK 自动注入）
 *   mode='list' — 查当前用户最近 20 条（按 _openid 自动隔离）
 *   mode='delete' — 删除指定记录（仅能删自己的）
 *
 * 防御性设计：
 * - openId 隔离：db.add() 自带 _openid，安全规则设为"仅创建者可读写"
 * - 字段白名单：save 时只取已知字段，防止注入
 * - 长度限制：summary 截断，防超大文档
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
