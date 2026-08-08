/** I23b frontend recovery contract (offline behavior and page wiring). */
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const {
  beginHistoryListRequest,
  canStartHistorySave,
  capturePendingBaseRequest,
  clearRequestSlots,
  closeHistoryList,
  createHistoryListLifecycle,
  createHistorySaveIntent,
  createRecoverySlots,
  createSaveAttemptId,
  failHistorySave,
  getBaseRequest,
  isAdviceRetryEligible,
  isReprepareEligible,
  promoteBaseRequest,
  resolveHistoryList,
  retryableWeatherIssue,
  sameHistorySaveIdentity,
  startHistorySave,
  succeedHistorySave,
} = require('../taro-app/src/pages/index/recovery-model')
const { createInitialTripFlow, reduceTripFlow, selectTripFlowView } = require('../taro-app/src/pages/index/trip-flow')
const { buildResultPageModel, buildHistorySavePayload } = require('../taro-app/src/pages/index/result-page-model')

function flowWithStatus(status, result, queryId, error) {
  let flow = createInitialTripFlow()
  flow = reduceTripFlow(flow, { type: 'BEGIN_SEARCH' })
  if (result !== null) flow = reduceTripFlow(flow, { type: 'BASE_RECEIVED', token: flow.token, result, queryId: queryId || 'q-current' })
  if (status === 'degraded') {
    flow = reduceTripFlow(flow, { type: 'ADVICE_STARTED', token: flow.token })
    flow = reduceTripFlow(flow, { type: 'ADVICE_FAILED', token: flow.token, result, error: error || null })
  } else if (status === 'complete') {
    flow = reduceTripFlow(flow, { type: 'ADVICE_STARTED', token: flow.token })
    flow = reduceTripFlow(flow, { type: 'ADVICE_SUCCEEDED', token: flow.token, result, degraded: false })
  } else if (status === 'error') {
    flow = reduceTripFlow(flow, { type: 'FLOW_FAILED', token: flow.token, error: error || { retryable: true } })
  }
  return flow
}

function deterministicResult(aiStatus = 'unavailable') {
  return {
    routeSnapshot: { capability: 'full', canonicalName: '测试路线' },
    weatherSnapshot: { dataStatus: 'complete' },
    deterministicResult: { verdict: 'caution', dataStatus: 'complete', reasons: [{ code: 'r1' }] },
    minimumGear: { essential: [{ item: '头灯' }], recommended: [], optional: [] },
    sourceMetadata: { routeSources: [] },
    requestSummary: { route: '测试路线' },
    ai: { status: aiStatus, notes: [] },
  }
}

function assertAdviceRecovery() {
  const base = deterministicResult('unavailable')
  const degraded = flowWithStatus('degraded', base, 'q-same')
  assert.equal(degraded.status, 'degraded')
  assert.equal(isAdviceRetryEligible(degraded), true, 'advice degraded without flow error is retryable')
  const retried = reduceTripFlow(degraded, { type: 'BEGIN_ADVICE_RETRY', token: degraded.token })
  assert.equal(retried.status, 'advice_loading')
  assert.equal(retried.token, degraded.token + 1, 'AI retry advances token')
  assert.equal(retried.queryId, 'q-same', 'AI retry preserves same queryId')
  assert.equal(retried.result.deterministicResult.verdict, 'caution', 'AI retry preserves deterministic verdict')
  assert.deepEqual(retried.result.minimumGear, base.minimumGear, 'AI retry preserves deterministic checklist source')
  assert.equal(retried.result.ai.status, 'loading', 'AI retry changes only AI status')
  assert.strictEqual(reduceTripFlow(degraded, { type: 'BEGIN_ADVICE_RETRY', token: degraded.token, error: { code: 'internal_error', retryable: true } }), degraded, 'internal advice error is not blindly retried')
  assert.strictEqual(reduceTripFlow(degraded, { type: 'BEGIN_ADVICE_RETRY', token: degraded.token, error: { code: 'ai_unavailable', retryable: false } }), degraded, 'non-retryable advice error is a no-op')
  const nullQuery = { ...degraded, queryId: null }
  assert.strictEqual(reduceTripFlow(nullQuery, { type: 'BEGIN_ADVICE_RETRY', token: degraded.token }), nullQuery, 'null queryId cannot authorize advice retry')
  const readyAi = { ...degraded, result: { ...base, ai: { status: 'ready' } } }
  assert.strictEqual(reduceTripFlow(readyAi, { type: 'BEGIN_ADVICE_RETRY', token: degraded.token }), readyAi, 'ready AI cannot be retried')
  const errored = flowWithStatus('degraded', base, 'q-error', { code: 'ai_unavailable', retryable: true })
  assert.equal(isAdviceRetryEligible(errored), true, 'retryable advice error is eligible')
  assert.equal(reduceTripFlow(errored, { type: 'BEGIN_ADVICE_RETRY', token: errored.token }).status, 'advice_loading')
  const cached = { ...degraded, queryId: null }
  assert.equal(isAdviceRetryEligible(cached), false, 'cache restore has no advice authority')
}

function assertReprepareAndRender() {
  const result = deterministicResult('ready')
  const complete = flowWithStatus('complete', result, 'q-old')
  const request = { operation: 'prepare', request: { route: '测试路线', date: '2026-08-09', level: '中级', days: 1 }, token: complete.token }
  assert.equal(isReprepareEligible(complete, { request, requestToken: complete.token }), true)
  const refreshing = reduceTripFlow(complete, { type: 'BEGIN_REPREPARE', token: complete.token, requestToken: complete.token, request, result: complete.result })
  assert.equal(refreshing.status, 'preparing')
  assert.equal(refreshing.queryId, null)
  assert.equal(refreshing.token, complete.token + 1)
  assert.strictEqual(refreshing.result, complete.result, 'reprepare keeps old result object visible')
  assert.deepEqual(selectTripFlowView(refreshing), {
    loading: false, refreshing: true, adviceLoading: false, showResult: true, showCandidatePopup: false, showManualCoords: false, errorMessage: null,
  }, 'reprepare with result uses local refreshing rather than skeleton')
  const fullLoading = reduceTripFlow({ ...complete, result: null, status: 'error' }, { type: 'BEGIN_REPREPARE', token: complete.token, requestToken: complete.token, request, result: null })
  assert.equal(selectTripFlowView(fullLoading).loading, true, 'reprepare without result uses full loading')
  assert.equal(selectTripFlowView(fullLoading).refreshing, false)
  assert.strictEqual(reduceTripFlow(complete, { type: 'BEGIN_REPREPARE', token: complete.token, requestToken: complete.token + 1, request }), complete, 'wrong request token is a no-op')
  assert.strictEqual(reduceTripFlow(complete, { type: 'BEGIN_REPREPARE', token: complete.token }), complete, 'missing request authority is a no-op')
  const resultModel = buildResultPageModel({ result, flowStatus: 'preparing' })
  assert.equal(resultModel.refreshing, true, 'result model exposes local refreshing')
}

function assertRequestSlots() {
  const first = { route: '首条', date: '2026-08-09', level: '中级', days: 1 }
  const second = { route: '第二条', date: '2026-08-10', level: '老手', days: 2 }
  let slots = createRecoverySlots()
  slots = capturePendingBaseRequest(slots, 'prepare', first, { route: '首条' }, 4)
  assert.deepEqual(getBaseRequest(slots, 'pending', 4).request, first)
  assert.equal(getBaseRequest(slots, 'pending', 5), null, 'pending belongs to its current token')
  const failed = slots
  assert.deepEqual(getBaseRequest(failed, 'pending', 4).request, first, 'failure retains pending request')
  assert.equal(getBaseRequest(promoteBaseRequest(failed, 3), 'last', 3), null, 'wrong-token success cannot promote')
  slots = promoteBaseRequest(slots, 4)
  assert.equal(slots.pendingBaseRequest, null)
  assert.deepEqual(getBaseRequest(slots, 'last', 99).request, first, 'BaseData success promotes last request')
  slots = capturePendingBaseRequest(slots, 'confirm', second, { route: '第二条' }, 5)
  assert.deepEqual(getBaseRequest(slots, 'pending', 5).request, second, 'new operation replaces pending')
  assert.deepEqual(getBaseRequest(slots, 'last', 99).request, first, 'new pending does not erase last successful base')
  assert.deepEqual(clearRequestSlots(), { pendingBaseRequest: null, lastBaseRequest: null }, 'reset/history prefill clears both request slots')
}

function assertWeatherAndSaveRecovery() {
  assert.equal(retryableWeatherIssue({ routeSnapshot: { capability: 'full' }, weatherSnapshot: { dataStatus: 'insufficient', insufficientReasons: [{ code: 'weather_unavailable', retryable: true }] } }), true)
  assert.equal(retryableWeatherIssue({ routeSnapshot: { capability: 'full' }, weatherSnapshot: { dataStatus: 'insufficient', insufficientReasons: [{ code: 'out_of_range', retryable: false }] } }), false, 'out-of-range has no weather retry')
  assert.equal(retryableWeatherIssue({ routeSnapshot: { capability: 'blocked' }, weatherSnapshot: { dataStatus: 'insufficient', retryable: true } }), false, 'blocked has no weather retry')
  assert.equal(retryableWeatherIssue({ routeSnapshot: { capability: 'place_only' }, weatherSnapshot: { status: 'unavailable', retryable: true } }), true)
  assert.equal(retryableWeatherIssue({ routeSnapshot: { capability: 'place_only' }, weatherSnapshot: { status: 'unavailable', retryable: true }, deterministicResult: { dataIssues: [{ code: 'place_only_route', retryable: false }] } }), true, 'place-only route boundary must not hide retryable reference weather')

  const id = createSaveAttemptId(() => 1700000000000, () => 0.123456)
  assert(/^save_[a-z0-9_]+$/.test(id) && id.length <= 80, 'save attempt id is bounded non-security identity')
  const payload = buildHistorySavePayload({ params: { route: '测试', date: '2026-08-09', days: 1, level: '中级' }, historyContext: {}, resultData: { risks: [], degraded: true }, saveAttemptId: id })
  const intent = createHistorySaveIntent({ payload, baseRef: {}, saveAttemptId: id })
  assert.equal(intent.payload.saveAttemptId, id)
  assert.equal(canStartHistorySave(intent), true)
  const inFlight = startHistorySave(intent)
  assert.equal(canStartHistorySave(inFlight), false, 'one payload has at most one in-flight save')
  const failed = failHistorySave(inFlight)
  assert.equal(canStartHistorySave(failed), true)
  const retry = startHistorySave(failed)
  assert.deepEqual(retry.payload, intent.payload, 'save retry reuses frozen byte-equivalent payload')
  assert.equal(sameHistorySaveIdentity(retry, intent), true)
  const done = succeedHistorySave(retry)
  assert.equal(done.status, 'succeeded')
  assert.equal(canStartHistorySave(done), false)
  const newIntent = createHistorySaveIntent({ payload, baseRef: {}, saveAttemptId: createSaveAttemptId(() => 1700000000001, () => 0.123456) })
  assert.equal(sameHistorySaveIdentity(newIntent, intent), false, 'new BaseData gets a new save identity')
}

function assertHistoryListRecovery() {
  let lifecycle = createHistoryListLifecycle([{ id: 'old' }])
  lifecycle = beginHistoryListRequest(lifecycle)
  const firstToken = lifecycle.token
  lifecycle = resolveHistoryList(lifecycle, firstToken, { ok: true, data: [{ id: 'new' }] })
  assert.deepEqual(lifecycle.items, [{ id: 'new' }])
  lifecycle = beginHistoryListRequest(lifecycle)
  const retryToken = lifecycle.token
  lifecycle = resolveHistoryList(lifecycle, retryToken, { ok: false, message: '暂时失败' })
  assert.deepEqual(lifecycle.items, [{ id: 'new' }], 'list failure preserves existing items')
  assert.equal(lifecycle.error, '暂时失败')
  lifecycle = beginHistoryListRequest(lifecycle)
  const newerToken = lifecycle.token
  const stale = resolveHistoryList(lifecycle, retryToken, { ok: true, data: [{ id: 'stale' }] })
  assert.deepEqual(stale.items, [{ id: 'new' }], 'stale callback cannot replace newer list')
  lifecycle = closeHistoryList(lifecycle)
  assert.equal(lifecycle.open, false)
  assert.deepEqual(resolveHistoryList(lifecycle, newerToken, { ok: true, data: [{ id: 'closed' }] }).items, [{ id: 'new' }], 'closed panel ignores callback')
}

function assertPageWiring() {
  const source = fs.readFileSync(path.join(__dirname, '../taro-app/src/pages/index/index.jsx'), 'utf8')
  assert(source.includes("require('./recovery-model')"), 'page must wire recovery model')
  for (const marker of ['BEGIN_ADVICE_RETRY', 'BEGIN_REPREPARE', 'capturePendingBaseRequest', 'promoteBaseRequest', 'saveAttemptId', 'beginHistoryListRequest', 'resolveHistoryList']) {
    assert(source.includes(marker), `page wiring must include ${marker}`)
  }
  assert(source.includes('sameHistorySaveIdentity'), 'save callback must use BaseData/attempt identity, not trip token')
  assert(source.includes('this._getAdviceService().advice(queryId)'), 'AI retry must use existing same-query service seam')
  assert(source.includes('this._getAdviceService()[operation](request)'), 'base recovery must replay captured operation')
  assert(source.includes('this._clearRecoverySlots()'), 'reset/history paths must clear both request slots')
  assert(source.includes('historyPrefillNotice'), 'history prefill must tell user to confirm current time/support')
  assert(!source.includes('queryId: record.queryId'), 'history selection must not restore queryId')
}

assertAdviceRecovery()
assertReprepareAndRender()
assertRequestSlots()
assertWeatherAndSaveRecovery()
assertHistoryListRecovery()
assertPageWiring()
console.log('PASS: I23b recovery contract')
