/**
 * I23b page-local recovery seams.
 *
 * Trip-flow remains the only query state machine.  This module owns the two
 * request snapshots and the bounded identities used by history save/list
 * recovery; it never creates a new flow state or a second source of trusted
 * route/weather facts.
 */

const REQUEST_OPERATIONS = Object.freeze(['prepare', 'confirm'])
const REQUEST_FIELDS = Object.freeze([
  'route', 'date', 'level', 'days', 'manualLat', 'manualLon', 'manualElevation',
  'routeType', 'startTimeLocal', 'climbSupport', 'candidateId',
])

function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function clone(value) {
  if (value === undefined) return undefined
  return JSON.parse(JSON.stringify(value))
}

function hasOwn(value, key) {
  return isRecord(value) && Object.prototype.hasOwnProperty.call(value, key)
}

function createRecoverySlots() {
  return { pendingBaseRequest: null, lastBaseRequest: null }
}

function normalizeRequest(request) {
  if (!isRecord(request)) return null
  const keys = Object.keys(request)
  if (keys.length === 0 || keys.length > REQUEST_FIELDS.length) return null
  if (keys.some((key) => REQUEST_FIELDS.indexOf(key) < 0)) return null
  const normalized = {}
  for (const key of REQUEST_FIELDS) {
    if (hasOwn(request, key) && request[key] !== undefined) normalized[key] = clone(request[key])
  }
  return Object.keys(normalized).length > 0 ? normalized : null
}

function capturePendingBaseRequest(slots, operation, request, historyParams, token) {
  const current = isRecord(slots) ? slots : createRecoverySlots()
  if (REQUEST_OPERATIONS.indexOf(operation) < 0 || !Number.isInteger(token)) return current
  const normalized = normalizeRequest(request)
  if (!normalized) return current
  return {
    pendingBaseRequest: {
      operation,
      request: normalized,
      historyParams: isRecord(historyParams) ? clone(historyParams) : {},
      token,
    },
    lastBaseRequest: current.lastBaseRequest || null,
  }
}

function promoteBaseRequest(slots, token) {
  const current = isRecord(slots) ? slots : createRecoverySlots()
  const pending = current.pendingBaseRequest
  if (!pending || pending.token !== token) return current
  return {
    pendingBaseRequest: null,
    lastBaseRequest: clone(pending),
  }
}

function clearRequestSlots() {
  return createRecoverySlots()
}

function getBaseRequest(slots, kind, token) {
  const current = isRecord(slots) ? slots : createRecoverySlots()
  const source = kind === 'pending' ? current.pendingBaseRequest : current.lastBaseRequest
  if (!source || !isRecord(source.request) || REQUEST_OPERATIONS.indexOf(source.operation) < 0) return null
  if (kind === 'pending' && source.token !== token) return null
  return clone(source)
}

function isBoundedBaseRequest(value) {
  if (!isRecord(value) || REQUEST_OPERATIONS.indexOf(value.operation) < 0) return false
  const request = normalizeRequest(value.request)
  return !!request && Number.isInteger(value.token)
}

function isAdviceRetryEligible(flow, event = {}) {
  if (!isRecord(flow) || flow.status !== 'degraded' || !flow.result || flow.queryId == null) return false
  const ai = isRecord(flow.result.ai) ? flow.result.ai : null
  if (!ai || ai.status !== 'unavailable') return false
  const error = hasOwn(event, 'error') ? event.error : flow.error
  if (error == null) return true
  if (!isRecord(error) || error.code === 'internal_error' || error.code === 'query_context_unavailable') return false
  return error.retryable === true
}

function isReprepareEligible(flow, event = {}) {
  if (!isRecord(flow) || ['complete', 'degraded', 'error'].indexOf(flow.status) < 0) return false
  const request = event.request || event.pendingBaseRequest || event.lastBaseRequest
  if (!isBoundedBaseRequest(request)) return false
  if (event.requestToken !== undefined && event.requestToken !== flow.token) return false
  return true
}

function retryableWeatherIssue(result) {
  if (!isRecord(result)) return false
  const route = isRecord(result.routeSnapshot) ? result.routeSnapshot : {}
  if (route.capability !== 'full' && route.capability !== 'place_only') return false
  const weather = isRecord(result.weatherSnapshot) ? result.weatherSnapshot : {}
  const issues = []
  if (Array.isArray(weather.insufficientReasons)) issues.push(...weather.insufficientReasons)
  const deterministic = isRecord(result.deterministicResult) ? result.deterministicResult : {}
  if (Array.isArray(deterministic.dataIssues)) issues.push(...deterministic.dataIssues)
  if (weather.status === 'unavailable' && weather.retryable === true) {
    issues.push({ code: weather.error, retryable: weather.retryable !== false })
  }
  if (weather.dataStatus === 'insufficient' && issues.length === 0) {
    issues.push({ code: 'weather_unavailable', retryable: weather.retryable !== false })
  }
  return issues.some((issue) => isRecord(issue)
    && issue.retryable === true
    && issue.code !== 'out_of_range')
}

function isWeatherRecoveryEligible(flow, slots) {
  if (!isRecord(flow) || !retryableWeatherIssue(flow.result)) return false
  const lastBaseRequest = getBaseRequest(slots, 'last', flow.token)
  return isReprepareEligible(flow, {
    request: lastBaseRequest,
    requestToken: flow.token,
  })
}

// A bounded, executable seam for page actions.  The page still delegates the
// actual transition to trip-flow; this projection only prevents controls from
// appearing when the reducer would reject the corresponding event.
function selectRecoveryActions(flow, slots) {
  return {
    adviceRetry: isAdviceRetryEligible(flow),
    weatherRetry: isWeatherRecoveryEligible(flow, slots),
  }
}

function createSaveAttemptId(now = Date.now, random = Math.random) {
  const timePart = Number(now()).toString(36)
  const randomPart = Number(random()).toString(36).replace(/[^a-z0-9]/gi, '').slice(0, 12)
  return `save_${timePart}_${randomPart || 'retry'}`.slice(0, 80)
}

function createHistorySaveIntent({ payload, baseRef, saveAttemptId } = {}) {
  if (!isRecord(payload) || !baseRef || typeof saveAttemptId !== 'string' || saveAttemptId.length === 0) return null
  return {
    baseRef,
    saveAttemptId,
    payload: clone({ ...payload, saveAttemptId }),
    status: 'pending',
    inFlight: false,
  }
}

function sameHistorySaveIdentity(left, right) {
  return !!left && !!right && left.baseRef === right.baseRef && left.saveAttemptId === right.saveAttemptId
}

function canStartHistorySave(intent) {
  return !!intent && intent.inFlight !== true && ['pending', 'failed'].indexOf(intent.status) >= 0
}

function startHistorySave(intent) {
  if (!canStartHistorySave(intent)) return intent
  return { ...intent, inFlight: true }
}

function failHistorySave(intent) {
  if (!intent) return intent
  return { ...intent, inFlight: false, status: 'failed' }
}

function succeedHistorySave(intent) {
  if (!intent) return intent
  return { ...intent, inFlight: false, status: 'succeeded' }
}

function createHistoryListLifecycle(items = []) {
  return {
    token: 0,
    open: false,
    loading: false,
    loadingMore: false,
    requestKind: null,
    requestCursor: null,
    items: Array.isArray(items) ? items.slice() : [],
    nextCursor: null,
    error: null,
  }
}

function beginHistoryListRequest(state) {
  const current = isRecord(state) ? state : createHistoryListLifecycle()
  return {
    ...current,
    token: current.token + 1,
    open: true,
    loading: true,
    loadingMore: false,
    requestKind: 'replace',
    requestCursor: null,
    error: null,
  }
}

function beginHistoryListAppend(state) {
  const current = isRecord(state) ? state : createHistoryListLifecycle()
  if (!current.open || current.loading || current.loadingMore || typeof current.nextCursor !== 'string' || current.nextCursor.length === 0) return current
  return {
    ...current,
    token: current.token + 1,
    loading: false,
    loadingMore: true,
    requestKind: 'append',
    requestCursor: current.nextCursor,
    error: null,
  }
}

function closeHistoryList(state) {
  const current = isRecord(state) ? state : createHistoryListLifecycle()
  return {
    ...current,
    token: current.token + 1,
    open: false,
    loading: false,
    loadingMore: false,
    requestKind: null,
    requestCursor: null,
    error: null,
  }
}

function nextHistoryCursor(response) {
  if (response && (response.nextCursor === null || typeof response.nextCursor === 'string')) return response.nextCursor
  return null
}

function resolveHistoryList(state, token, response) {
  const current = isRecord(state) ? state : createHistoryListLifecycle()
  if (!current.open || token !== current.token || current.requestKind !== 'replace') return current
  if (response && response.ok === true) {
    return {
      ...current,
      loading: false,
      loadingMore: false,
      requestKind: null,
      requestCursor: null,
      error: null,
      items: Array.isArray(response.data) ? response.data.slice() : [],
      nextCursor: nextHistoryCursor(response),
    }
  }
  return {
    ...current,
    loading: false,
    loadingMore: false,
    requestKind: null,
    requestCursor: null,
    error: response && response.message ? response.message : '历史暂时无法读取，请重试',
  }
}

function mergeHistoryItems(existing, incoming) {
  const items = Array.isArray(existing) ? existing.slice() : []
  const ids = new Set(items.filter((item) => item && typeof item.id === 'string').map((item) => item.id))
  if (!Array.isArray(incoming)) return items
  incoming.forEach((item) => {
    if (!item || typeof item.id !== 'string' || ids.has(item.id)) return
    ids.add(item.id)
    items.push(item)
  })
  return items
}

function resolveHistoryListAppend(state, token, cursor, response) {
  const current = isRecord(state) ? state : createHistoryListLifecycle()
  if (!current.open || token !== current.token || current.requestKind !== 'append' || current.requestCursor !== cursor) return current
  if (response && response.ok === true) {
    return {
      ...current,
      loadingMore: false,
      requestKind: null,
      requestCursor: null,
      error: null,
      items: mergeHistoryItems(current.items, response.data),
      nextCursor: nextHistoryCursor(response),
    }
  }
  return {
    ...current,
    loadingMore: false,
    requestKind: null,
    requestCursor: null,
    error: response && response.message ? response.message : '历史暂时无法读取，请重试',
  }
}

function removeHistoryListItem(state, id) {
  const current = isRecord(state) ? state : createHistoryListLifecycle()
  const items = Array.isArray(current.items) ? current.items : []
  return {
    ...current,
    token: current.token + 1,
    loading: false,
    loadingMore: false,
    requestKind: null,
    requestCursor: null,
    items: items.filter((item) => !item || item.id !== id),
  }
}

function clearHistoryListItems(state) {
  const current = isRecord(state) ? state : createHistoryListLifecycle()
  return {
    ...current,
    token: current.token + 1,
    loading: false,
    loadingMore: false,
    requestKind: null,
    requestCursor: null,
    items: [],
    nextCursor: null,
    error: null,
  }
}

module.exports = {
  REQUEST_FIELDS,
  REQUEST_OPERATIONS,
  beginHistoryListAppend,
  beginHistoryListRequest,
  canStartHistorySave,
  capturePendingBaseRequest,
  clearRequestSlots,
  closeHistoryList,
  clearHistoryListItems,
  createHistoryListLifecycle,
  createHistorySaveIntent,
  createRecoverySlots,
  createSaveAttemptId,
  failHistorySave,
  getBaseRequest,
  isAdviceRetryEligible,
  isBoundedBaseRequest,
  isReprepareEligible,
  isWeatherRecoveryEligible,
  normalizeRequest,
  promoteBaseRequest,
  resolveHistoryList,
  resolveHistoryListAppend,
  removeHistoryListItem,
  retryableWeatherIssue,
  selectRecoveryActions,
  sameHistorySaveIdentity,
  startHistorySave,
  succeedHistorySave,
}
