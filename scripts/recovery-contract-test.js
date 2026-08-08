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
  isWeatherRecoveryEligible,
  isReprepareEligible,
  promoteBaseRequest,
  resolveHistoryList,
  retryableWeatherIssue,
  sameHistorySaveIdentity,
  selectRecoveryActions,
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

function assertWeatherActionEligibility() {
  const result = deterministicResult('ready')
  result.weatherSnapshot = {
    dataStatus: 'insufficient',
    insufficientReasons: [{ code: 'weather_unavailable', retryable: true }],
  }
  const base = flowWithStatus('complete', result, 'q-weather')
  const request = { operation: 'prepare', request: { route: '测试路线', date: '2026-08-09', level: '中级', days: 1 }, token: base.token }
  let slots = capturePendingBaseRequest(createRecoverySlots(), 'prepare', request.request, request.request, base.token)
  slots = promoteBaseRequest(slots, base.token)

  const baseReady = reduceTripFlow({ ...base, status: 'base_ready' }, { type: 'NOOP' })
  const adviceLoading = { ...base, status: 'advice_loading' }
  assert.equal(isWeatherRecoveryEligible(baseReady, slots), false, 'base_ready has no visible weather reprepare action')
  assert.equal(isWeatherRecoveryEligible(adviceLoading, slots), false, 'advice_loading has no visible weather reprepare action')
  assert.equal(isWeatherRecoveryEligible(base, slots), true, 'complete with valid last-base authority can reprepare weather')
  assert.equal(isWeatherRecoveryEligible({ ...base, status: 'degraded' }, slots), true, 'degraded with valid last-base authority can reprepare weather')
  assert.equal(isWeatherRecoveryEligible({ ...base, status: 'error' }, slots), true, 'error with valid last-base authority can reprepare weather')
  assert.equal(isWeatherRecoveryEligible(base, createRecoverySlots()), false, 'weather recovery requires a valid last-base authority')
  assert.deepEqual(selectRecoveryActions(base, slots), { adviceRetry: false, weatherRetry: true }, 'page action seam projects only reducer-authorized actions')
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

function methodRange(source, signature) {
  const start = source.indexOf(signature)
  assert(start >= 0, `page must define ${signature}`)
  const open = source.indexOf('{', start)
  assert(open >= 0, `${signature} must have a body`)
  let depth = 0
  let quote = null
  let escaped = false
  for (let index = open; index < source.length; index += 1) {
    const char = source[index]
    if (quote) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === quote) quote = null
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char
      continue
    }
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return { start, open, end: index }
    }
  }
  assert.fail(`${signature} has unbalanced braces`)
}

function methodBody(source, signature) {
  const range = methodRange(source, signature)
  return source.slice(range.open + 1, range.end)
}

function replaceMethodBody(source, signature, needle, replacement) {
  const range = methodRange(source, signature)
  const body = source.slice(range.open + 1, range.end)
  assert(body.includes(needle), `${signature} mutation needle must exist`)
  return source.slice(0, range.open + 1)
    + body.replace(needle, replacement)
    + source.slice(range.end)
}

function assertPageWiring(source) {
  assert(source.includes("require('./recovery-model')"), 'page must wire recovery model')

  const beginReprepare = methodBody(source, '_beginReprepare(kind')
  assert.match(beginReprepare, /getBaseRequest\(this\._recoverySlots/)
  assert.match(beginReprepare, /type:\s*'BEGIN_REPREPARE'/)
  assert.match(beginReprepare, /requestToken:\s*flow\.token/)
  assert.match(beginReprepare, /request:\s*snapshot/)
  assert.match(beginReprepare, /result:\s*flow\.result/)
  assert.match(beginReprepare, /_replayBaseRequest\(snapshot,\s*nextFlow\.token\)/)
  assert(!beginReprepare.includes('_invalidateHistorySaveIntent'), 'reprepare start must preserve old history save intent')

  const weatherRetry = methodBody(source, 'onWeatherRetry = () =>')
  assert.match(weatherRetry, /isWeatherRecoveryEligible\(this\.state\.tripFlow,\s*this\._recoverySlots\)/)
  assert.match(weatherRetry, /_beginReprepare\('last'/)

  const adviceRetry = methodBody(source, 'onAdviceRetry = () =>')
  assert.match(adviceRetry, /type:\s*'BEGIN_ADVICE_RETRY'/)
  assert.match(adviceRetry, /_fetchAdvice\(nextFlow\.queryId,\s*this\._historyParams \|\| \{\},\s*nextFlow\.token,\s*\{ saveHistory: false \}\)/)

  const basePresentation = methodBody(source, '_showBaseAndFetchAdvice(base, queryId, params, generation)')
  assert.match(basePresentation, /_promoteBaseRequest\(generation\)/)
  assert.match(basePresentation, /_invalidateHistorySaveIntent\(\)/)
  assert.match(basePresentation, /setState\(\{ historySaveError: null \}\)/)

  const saveHistory = methodBody(source, '_saveHistory(params, resultData)')
  assert.match(saveHistory, /_baseHistoryIdentity/)
  assert.match(saveHistory, /_historySaveIntent\.baseRef !== this\._baseHistoryIdentity/)
  assert.match(saveHistory, /createSaveAttemptId\(\)/)
  assert.match(saveHistory, /createHistorySaveIntent\(/)
  assert.match(saveHistory, /_sendHistorySaveIntent\(\)/)
  const saveCallback = methodBody(source, '_sendHistorySaveIntent()')
  assert.match(saveCallback, /canStartHistorySave\(intent\)/)
  assert.match(saveCallback, /sameHistorySaveIdentity\(this\._historySaveIntent,\s*activeIntent\)/)

  const historyTap = methodBody(source, 'onHistoryTap = () =>')
  assert.match(historyTap, /beginHistoryListRequest\(this\._historyListLifecycle\)/)
  assert.match(historyTap, /resolveHistoryList\(this\._historyListLifecycle,\s*requestToken/)
  assert.match(historyTap, /!this\._historyListLifecycle\.open \|\| this\._historyListLifecycle\.token !== requestToken/)
  assert.equal((historyTap.match(/this\._historyListLifecycle\.token !== requestToken/g) || []).length, 2, 'both list callbacks must guard their request token')
  const historyClose = methodBody(source, 'onHistoryClose = () =>')
  assert.match(historyClose, /closeHistoryList\(this\._historyListLifecycle\)/)

  const historyRestore = methodBody(source, 'onRestoreHistory = (record) =>')
  assert.match(historyRestore, /_clearResultLocalState\(\)/)
  assert.match(historyRestore, /type:\s*'RESET'/)
  assert.match(historyRestore, /removeStorageSync\(CACHE_KEY\)/)
  assert.match(historyRestore, /historyPrefillNotice/)
  assert(!historyRestore.includes('cloud.callFunction'), 'history prefill must not perform network I/O')
  assert(!historyRestore.includes('getAdvice'), 'history prefill must not restore or invoke advice')
  assert(!source.includes('queryId: record.queryId'), 'history selection must not restore queryId')

  const render = methodBody(source, 'render()')
  assert.match(render, /const recoveryActions = selectRecoveryActions\(tripFlow,\s*this\._recoverySlots\)/)
  assert.match(render, /if \(loading\) \{/)
  assert.match(render, /if \(showResult && result\) \{/)
  assert.match(render, /refreshing && <View className="refreshing-indicator"/)
  assert.match(render, /recoveryActions\.weatherRetry && <Button[\s\S]{0,180}onClick=\{this\.onWeatherRetry\}/)
  assert.match(render, /recoveryActions\.adviceRetry && <Button[\s\S]{0,160}onClick=\{this\.onAdviceRetry\}/)
  assert.match(render, /\{historyLoading && historyList\.length === 0 \?/)
  assert.match(render, /: !historyLoading && historyList\.length === 0 \?/)
  assert.match(render, /historyList\.map\(\(item\)/)
}

function assertMutationSensitivePageWiring() {
  const source = fs.readFileSync(path.join(__dirname, '../taro-app/src/pages/index/index.jsx'), 'utf8')
  assertPageWiring(source)
  const mutations = [
    ['weather eligibility', (value) => replaceMethodBody(value, 'render()', 'recoveryActions.weatherRetry &&', 'true &&')],
    ['old-result refreshing priority', (value) => replaceMethodBody(value, 'render()', 'if (loading) {', 'if (loading || refreshing) {')],
    ['history list loading priority', (value) => replaceMethodBody(value, 'render()', 'historyLoading && historyList.length === 0', 'historyLoading')],
    ['same-query AI retry', (value) => replaceMethodBody(value, 'onAdviceRetry = () =>', '_fetchAdvice(nextFlow.queryId', "_fetchAdvice('wrong-query'")],
    ['base snapshot replay', (value) => replaceMethodBody(value, '_beginReprepare(kind', '_replayBaseRequest(snapshot, nextFlow.token)', '_replayBaseRequest(null, nextFlow.token)')],
    ['same-base history intent', (value) => replaceMethodBody(value, '_saveHistory(params, resultData)', '_historySaveIntent.baseRef !== this._baseHistoryIdentity', 'false')],
    ['stale history-list guard', (value) => replaceMethodBody(value, 'onHistoryTap = () =>', 'this._historyListLifecycle.token !== requestToken', 'false')],
    ['zero-I/O history prefill', (value) => replaceMethodBody(value, 'onRestoreHistory = (record) =>', 'this._clearResultLocalState()', 'this._clearRecoverySlots()')],
  ]
  for (const [label, mutate] of mutations) {
    const mutated = mutate(source)
    assert.throws(() => assertPageWiring(mutated), `${label} mutation must make wiring assertions RED`)
  }
}

assertAdviceRecovery()
assertReprepareAndRender()
assertWeatherActionEligibility()
assertRequestSlots()
assertWeatherAndSaveRecovery()
assertHistoryListRecovery()
assertMutationSensitivePageWiring()
console.log('PASS: I23b recovery contract')
