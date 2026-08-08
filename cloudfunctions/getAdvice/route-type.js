/**
 * 徒步薯 - 路线类型契约（TP-P0-003）
 *
 * 唯一合法业务类型：trek / climb / tour
 * 解析边界允许临时状态：unknown（不得进入规则层、成功 base response、Prompt、最终结果）
 *
 * 硬约束：
 * - 不使用任意字符串兜底；
 * - 不 trim 后接受变体；
 * - 不接受大小写变体；
 * - 非法类型在解析边界归一为 unknown，或由调用层明确拒绝；
 * - 规则层（getGearRules）只能接收三个已知类型。
 */

// 唯一合法业务类型枚举
const ROUTE_TYPES = Object.freeze(['trek', 'climb', 'tour'])

// 解析边界临时状态：类型未知，等待用户明确选择
const UNKNOWN_ROUTE_TYPE = 'unknown'

// 类型来源枚举：内置路线表 / UGC 路线库 / 高德 POI / 用户明确选择 / 未知
const ROUTE_TYPE_SOURCES = Object.freeze(['builtin', 'ugc', 'amap', 'user', 'unknown'])

// 用户可见标签
const ROUTE_TYPE_LABELS = Object.freeze({
  trek: '徒步',
  climb: '攀登',
  tour: '游览',
  unknown: '类型待确认',
})

/**
 * 是否为已知合法业务类型（严格相等，不接受大小写/空白变体）
 * @param {*} value
 * @returns {boolean}
 */
function isKnownRouteType(value) {
  return typeof value === 'string' && ROUTE_TYPES.includes(value)
}

/**
 * 解析边界归一化：已知类型原样返回，其余一律归为 unknown。
 * 不得默认成 trek 或 climb。
 * @param {*} value
 * @returns {string} 'trek' | 'climb' | 'tour' | 'unknown'
 */
function normalizeResolvedRouteType(value) {
  return isKnownRouteType(value) ? value : UNKNOWN_ROUTE_TYPE
}

/**
 * 用户可见中文标签；四个契约值以外的输入返回 null（不做兜底文案）
 * @param {*} value
 * @returns {string|null}
 */
function getRouteTypeLabel(value) {
  if (isKnownRouteType(value) || value === UNKNOWN_ROUTE_TYPE) {
    return ROUTE_TYPE_LABELS[value]
  }
  return null
}

/**
 * 是否为允许的类型来源
 * @param {*} value
 * @returns {boolean}
 */
function isKnownRouteTypeSource(value) {
  return typeof value === 'string' && ROUTE_TYPE_SOURCES.includes(value)
}

/**
 * beta_base_v2 路线类型结构一致性校验（纯函数，可离线测试）
 *
 * 通过条件：
 * - baseData.routeSnapshot.routeType 为已知类型；
 * - baseData.sourceMetadata.routeTypeSource 为允许来源；
 * - minimumGear 与 deterministicSafety 为结构化安全投影。
 *
 * @param {*} baseData
 * @returns {{ok: boolean, error?: string}}
 */
function validateRouteTypeContract(baseData) {
  if (!baseData || typeof baseData !== 'object') {
    return { ok: false, error: 'invalid_base_data' }
  }
  if (baseData.schemaVersion !== 'beta_base_v2'
    || !baseData.routeSnapshot || typeof baseData.routeSnapshot !== 'object'
    || !baseData.sourceMetadata || typeof baseData.sourceMetadata !== 'object') {
    return { ok: false, error: 'invalid_base_data' }
  }
  if (!isKnownRouteType(baseData.routeSnapshot.routeType)) {
    return { ok: false, error: 'invalid_base_data' }
  }
  if (!isKnownRouteTypeSource(baseData.sourceMetadata.routeTypeSource)) {
    return { ok: false, error: 'invalid_base_data' }
  }
  if (!baseData.minimumGear || typeof baseData.minimumGear !== 'object'
    || !baseData.deterministicSafety || typeof baseData.deterministicSafety !== 'object') {
    return { ok: false, error: 'invalid_base_data' }
  }
  if (!Array.isArray(baseData.deterministicSafety.fatalRisks)
    || !Array.isArray(baseData.deterministicSafety.ruleNotes)) {
    return { ok: false, error: 'invalid_base_data' }
  }
  return { ok: true }
}

module.exports = {
  ROUTE_TYPES,
  UNKNOWN_ROUTE_TYPE,
  ROUTE_TYPE_SOURCES,
  ROUTE_TYPE_LABELS,
  isKnownRouteType,
  normalizeResolvedRouteType,
  getRouteTypeLabel,
  isKnownRouteTypeSource,
  validateRouteTypeContract,
}
