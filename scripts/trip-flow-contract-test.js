/**
 * I20 前端查询流与 getAdvice service 契约（离线）。
 *
 * 直接穿过 reducer 和注入式 CloudBase seam；页面源码断言只覆盖接线边界。
 */
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const {
  createInitialTripFlow,
  reduceTripFlow,
  selectTripFlowView,
} = require('../taro-app/src/pages/index/trip-flow')
const { createGetAdviceService } = require('../taro-app/src/pages/index/get-advice-service')

function reduce(state, event) {
  return reduceTripFlow(state, event)
}

function baseResult(label) {
  return { label, gear: { essential: [] }, risks: [], notes: [], meta: {} }
}

function beginSearch(state) {
  return reduce(state, { type: 'BEGIN_SEARCH' })
}

function receiveBase(state, result, queryId) {
  return reduce(state, { type: 'BASE_RECEIVED', token: state.token, result, queryId })
}

function beginAdvice(state) {
  return reduce(state, { type: 'ADVICE_STARTED', token: state.token })
}

function flowToAdviceLoading() {
  let state = beginSearch(createInitialTripFlow())
  state = receiveBase(state, baseResult('base'), 'tctx_base')
  return beginAdvice(state)
}

function assertInitialState() {
  const state = createInitialTripFlow()
  assert.deepStrictEqual(state, {
    status: 'idle',
    token: 0,
    result: null,
    queryId: null,
    candidates: [],
    confirmationInput: null,
    routeTypeRequest: null,
    error: null,
  }, '初始 TripFlowState 必须只含冻结字段和值')
  assert.deepStrictEqual(Object.keys(state).sort(), [
    'candidates', 'confirmationInput', 'error', 'queryId', 'result', 'routeTypeRequest', 'status', 'token',
  ], 'TripFlowState 不得混入页面、缓存或 history 字段')
  assert.deepStrictEqual(selectTripFlowView(state), {
    loading: false,
    refreshing: false,
    adviceLoading: false,
    showResult: false,
    showCandidatePopup: false,
    showManualCoords: false,
    errorMessage: null,
  }, '初始视图派生必须精确')
}

function assertPrimaryTransitions() {
  const candidates = [{ candidateId: 'builtin-route:武功山', canonicalName: '武功山', region: '江西', routeType: 'trek' }]
  const confirmationInput = { date: '2026-08-07', level: '中级', days: 1 }
  let state = beginSearch(createInitialTripFlow())
  const searchToken = state.token
  assert.strictEqual(state.status, 'searching', 'BEGIN_SEARCH 必须进入 searching')

  state = reduce(state, { type: 'CONFIRMATION_REQUIRED', token: searchToken, candidates, confirmationInput })
  assert.strictEqual(state.status, 'awaiting_confirmation', 'searching 必须可进入 confirmation')
  assert.strictEqual(state.candidates, candidates, '候选只由 reducer 保存')
  assert.strictEqual(state.confirmationInput, confirmationInput, '确认快照只由 reducer 保存')
  assert.strictEqual(selectTripFlowView(state).showCandidatePopup, true, 'confirmation 必须派生候选 Popup')

  state = reduce(state, { type: 'BEGIN_PREPARE' })
  const prepareToken = state.token
  assert.strictEqual(state.status, 'preparing', '候选确认必须从 awaiting_confirmation 进入 preparing')
  assert.strictEqual(state.candidates.length, 0, '开始 follow-up 时必须清空候选')

  const base = baseResult('candidate-base')
  state = receiveBase(state, base, 'tctx_candidate')
  assert.strictEqual(state.status, 'base_ready', 'base 必须先独立到达 base_ready')
  assert.strictEqual(state.result, base, 'base_ready 必须立即保存确定性 result')
  assert.strictEqual(state.queryId, 'tctx_candidate', 'base_ready 必须保存服务端 queryId')
  assert.strictEqual(selectTripFlowView(state).adviceLoading, true, 'base_ready 必须显示 advice 正在加载的派生状态')

  state = reduce(state, { type: 'ADVICE_STARTED', token: prepareToken })
  assert.strictEqual(state.status, 'advice_loading', '只有 base_ready 才可启动 advice')
  const advice = baseResult('advice')
  state = reduce(state, { type: 'ADVICE_SUCCEEDED', token: prepareToken, result: advice, degraded: false })
  assert.strictEqual(state.status, 'complete', '正常 advice 必须完成 flow')
  assert.strictEqual(state.result, advice, 'advice 成功必须替换可渲染 result')

  let routeType = beginSearch(createInitialTripFlow())
  const routeToken = routeType.token
  const routeTypeRequest = { name: '外部位置', lat: 30, lon: 120, elevation: 100, location: '测试地' }
  routeType = reduce(routeType, { type: 'ROUTE_TYPE_REQUIRED', token: routeToken, routeTypeRequest })
  assert.strictEqual(routeType.status, 'awaiting_route_type', 'searching 必须可进入 route type 选择')
  assert.strictEqual(routeType.routeTypeRequest, routeTypeRequest, 'route type 预填资料必须只由 reducer 保存')
  assert.strictEqual(selectTripFlowView(routeType).showManualCoords, true, 'route type 状态必须派生手动类型界面')
  routeType = reduce(routeType, { type: 'BEGIN_PREPARE' })
  assert.strictEqual(routeType.status, 'preparing', '手动类型 follow-up 必须可进入 preparing')

  let locationFailed = beginSearch(createInitialTripFlow())
  const locationToken = locationFailed.token
  const locationError = { code: 'location_failed', message: '路线位置暂时无法确认，请手动输入坐标', retryable: false }
  locationFailed = reduce(locationFailed, {
    type: 'ROUTE_TYPE_REQUIRED',
    token: locationToken,
    routeTypeRequest: null,
    error: locationError,
  })
  assert.strictEqual(locationFailed.status, 'awaiting_route_type', 'location_failed 必须复用 awaiting_route_type 打开手动 fallback')
  assert.strictEqual(locationFailed.routeTypeRequest, null, 'location_failed 不得伪造外部位置预填资料')
  assert.strictEqual(locationFailed.error, locationError, 'location_failed 必须保留局部流程错误')
  assert.strictEqual(selectTripFlowView(locationFailed).showManualCoords, true, 'location_failed 必须只由 reducer 派生手动 Popup')

  let localManual = beginSearch(createInitialTripFlow())
  const localManualToken = localManual.token
  localManual = reduce(localManual, {
    type: 'ROUTE_TYPE_REQUIRED',
    token: localManualToken,
    routeTypeRequest: null,
    error: { code: 'invalid_manual_context', message: '手动坐标或路线类型不完整，请确认后重新提交', retryable: false },
  })
  assert.strictEqual(localManual.token, localManualToken, '从 idle 打开本地手动 fallback 必须先经 BEGIN_SEARCH 推进 token')
  assert.strictEqual(localManual.status, 'awaiting_route_type', '本地手动 fallback 必须进入唯一的 awaiting_route_type 状态')

  let failedManual = beginSearch(createInitialTripFlow())
  failedManual = reduce(failedManual, { type: 'FLOW_FAILED', token: failedManual.token, error: { message: '查询失败' } })
  const failedManualToken = failedManual.token
  failedManual = reduce(failedManual, { type: 'BEGIN_PREPARE' })
  failedManual = reduce(failedManual, {
    type: 'ROUTE_TYPE_REQUIRED',
    token: failedManual.token,
    routeTypeRequest: null,
    error: { code: 'invalid_manual_context', message: '手动坐标或路线类型不完整，请确认后重新提交', retryable: false },
  })
  assert.strictEqual(failedManual.token, failedManualToken + 1, '从 error 打开手动 fallback 必须经 BEGIN_PREPARE 推进 token')
  assert.strictEqual(failedManual.status, 'awaiting_route_type', 'error 后的本地手动 fallback 必须进入 awaiting_route_type')
}

function assertAdviceOutcomes() {
  let normal = flowToAdviceLoading()
  normal = reduce(normal, { type: 'ADVICE_SUCCEEDED', token: normal.token, result: baseResult('merged'), degraded: false })
  assert.strictEqual(normal.status, 'complete', '正常 advice 必须进入 complete')

  let degraded = flowToAdviceLoading()
  const deterministic = degraded.result
  degraded = reduce(degraded, { type: 'ADVICE_SUCCEEDED', token: degraded.token, result: deterministic, degraded: true })
  assert.strictEqual(degraded.status, 'degraded', 'degraded advice 必须进入 degraded')
  assert.strictEqual(degraded.result, deterministic, 'degraded advice 必须保留确定性 result')

  let transport = flowToAdviceLoading()
  const transportBase = transport.result
  transport = reduce(transport, {
    type: 'ADVICE_FAILED',
    token: transport.token,
    error: { code: 'ai_unavailable', message: 'AI 建议生成失败', retryable: true },
  })
  assert.strictEqual(transport.status, 'degraded', 'advice transport failure 必须进入 degraded')
  assert.strictEqual(transport.result, transportBase, 'advice transport failure 必须保留确定性 result')

  let unavailable = flowToAdviceLoading()
  const unavailableBase = unavailable.result
  unavailable = reduce(unavailable, {
    type: 'CONTEXT_UNAVAILABLE',
    token: unavailable.token,
    error: { code: 'query_context_unavailable', message: '本次查询已失效，请重新查询', retryable: false },
  })
  assert.strictEqual(unavailable.status, 'error', 'query_context_unavailable 必须进入 error')
  assert.strictEqual(unavailable.result, unavailableBase, 'query_context_unavailable 必须保留 base result')
  assert.notStrictEqual(unavailable.status, 'degraded', 'query_context_unavailable 不得伪装成 degraded')
  assert.strictEqual(selectTripFlowView(unavailable).showResult, true, 'context unavailable 仍必须展示 base result')
}

function assertTokenGuardsAndRestore() {
  let state = flowToAdviceLoading()
  const oldToken = state.token
  state = reduce(state, { type: 'RESET' })
  assert.strictEqual(state.status, 'idle', 'RESET 必须回到 idle')
  assert.strictEqual(state.token, oldToken + 1, 'RESET 必须推进 token')
  assert.strictEqual(reduce(state, { type: 'ADVICE_SUCCEEDED', token: oldToken, result: baseResult('late') }), state, 'RESET 后迟到 success 必须同对象 no-op')

  let candidate = beginSearch(createInitialTripFlow())
  const candidateToken = candidate.token
  candidate = reduce(candidate, { type: 'CONFIRMATION_REQUIRED', token: candidateToken, candidates: [], confirmationInput: { date: '2026-08-07' } })
  const candidateCancelled = reduce(candidate, { type: 'RESET' })
  assert.strictEqual(candidateCancelled.token, candidateToken + 1, '候选取消使用 RESET 时必须推进 token')
  assert.strictEqual(reduce(candidateCancelled, { type: 'FLOW_FAILED', token: candidateToken, error: { message: 'late' } }), candidateCancelled, '候选取消后迟到 failure 必须同对象 no-op')

  let manual = beginSearch(createInitialTripFlow())
  const manualToken = manual.token
  manual = reduce(manual, { type: 'ROUTE_TYPE_REQUIRED', token: manualToken, routeTypeRequest: { name: '外部位置' } })
  const manualCancelled = reduce(manual, { type: 'RESET' })
  assert.strictEqual(manualCancelled.token, manualToken + 1, '手动弹窗取消使用 RESET 时必须推进 token')

  let completed = flowToAdviceLoading()
  completed = reduce(completed, { type: 'ADVICE_SUCCEEDED', token: completed.token, result: baseResult('done'), degraded: false })
  const nextSearch = reduce(completed, { type: 'BEGIN_SEARCH' })
  assert.strictEqual(nextSearch.token, completed.token + 1, '新查询必须推进 token')
  assert.strictEqual(nextSearch.result, null, '新查询必须清空旧 result')
  const onBack = reduce(completed, { type: 'RESET' })
  assert.strictEqual(onBack.token, completed.token + 1, 'onBack 使用 RESET 时必须推进 token')

  const cache = baseResult('cached')
  const restored = reduce(createInitialTripFlow(), { type: 'RESTORE_CACHED', result: cache, degraded: false })
  assert.strictEqual(restored.status, 'complete', '普通缓存必须恢复为 complete')
  assert.strictEqual(restored.result, cache, '缓存恢复必须保留 result')
  const restoredDegraded = reduce(createInitialTripFlow(), { type: 'RESTORE_CACHED', result: cache, degraded: true })
  assert.strictEqual(restoredDegraded.status, 'degraded', '降级缓存必须恢复为 degraded')

  const idle = createInitialTripFlow()
  const invalidStart = reduce(idle, { type: 'ADVICE_STARTED', token: 0 })
  assert.strictEqual(invalidStart, idle, '不适用的异步事件必须同对象 no-op')
}

async function assertService() {
  const calls = []
  const service = createGetAdviceService({
    callFunction(request) {
      calls.push(request)
      return Promise.resolve({ result: { phase: request.data.mode } })
    },
  })

  const prepare = await service.prepare({
    route: '武功山', date: '2026-08-07', level: '中级', days: 1,
    manualLat: 27.4, manualLon: 114.1, manualElevation: undefined, routeType: 'trek',
    startTimeLocal: undefined, climbSupport: undefined, ignored: 'must-not-send',
  })
  assert.deepStrictEqual(prepare, { kind: 'response', result: { phase: 'prepare' } }, 'prepare 成功必须返回冻结 response union')
  assert.deepStrictEqual(calls[0], {
    name: 'getAdvice',
    data: { mode: 'prepare', route: '武功山', date: '2026-08-07', level: '中级', days: 1, manualLat: 27.4, manualLon: 114.1, routeType: 'trek' },
  }, 'prepare 请求体只能包含冻结字段并跳过 undefined')

  const manualZero = await service.prepare({
    route: '手动零海拔', date: '2026-08-07', level: '中级', days: 1,
    manualLat: 1, manualLon: 2, manualElevation: 0, routeType: 'trek',
  })
  assert.deepStrictEqual(manualZero, { kind: 'response', result: { phase: 'prepare' } })
  assert.equal(calls[1].data.manualElevation, 0, 'service 必须原样保留手动海拔 0')

  const manualNegative = await service.prepare({
    route: '手动负海拔', date: '2026-08-07', level: '中级', days: 1,
    manualLat: 1, manualLon: 2, manualElevation: -20, routeType: 'trek',
  })
  assert.deepStrictEqual(manualNegative, { kind: 'response', result: { phase: 'prepare' } })
  assert.equal(calls[2].data.manualElevation, -20, 'service 必须原样保留手动负海拔')

  const confirm = await service.confirm({
    candidateId: 'builtin-route:武功山', date: '2026-08-07', level: '中级', days: 1,
    routeType: 'trek', startTimeLocal: '07:00', climbSupport: undefined, route: 'must-not-send',
  })
  assert.deepStrictEqual(confirm, { kind: 'response', result: { phase: 'confirm' } }, 'confirm 成功必须返回冻结 response union')
  assert.deepStrictEqual(calls[3], {
    name: 'getAdvice',
    data: { mode: 'confirm', candidateId: 'builtin-route:武功山', date: '2026-08-07', level: '中级', days: 1, routeType: 'trek', startTimeLocal: '07:00' },
  }, 'confirm 请求体只能包含冻结字段并跳过 undefined')

  const advice = await service.advice('tctx_123', { route: 'must-not-send', baseData: { forged: true } })
  assert.deepStrictEqual(advice, { kind: 'response', result: { phase: 'advice' } }, 'advice 成功必须返回冻结 response union')
  assert.deepStrictEqual(calls[4], { name: 'getAdvice', data: { mode: 'advice', queryId: 'tctx_123' } }, 'advice 请求必须只有 mode/queryId')

  const failedService = createGetAdviceService({
    callFunction() {
      return Promise.reject(new Error('raw transport detail'))
    },
  })
  assert.deepStrictEqual(await failedService.advice('tctx_failure'), { kind: 'transport_failure' }, 'transport failure 不得泄露 raw error')
}

function extractMethodBody(source, header) {
  const match = header.exec(source)
  if (!match) return ''
  const braceStart = source.indexOf('{', match.index + match[0].length - 1)
  if (braceStart < 0) return ''
  let depth = 0
  for (let index = braceStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    else if (source[index] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(braceStart, index + 1)
    }
  }
  return ''
}

function assertPageWiring() {
  const pageSource = fs.readFileSync(path.join(__dirname, '../taro-app/src/pages/index/index.jsx'), 'utf8')
  assert(pageSource.includes("require('./trip-flow')") && pageSource.includes("require('./get-advice-service')"), '页面必须接入 reducer 与 service 模块')
  assert(pageSource.includes("require('./result-page-model')"), '页面必须接入纯结构化 result-page model')
  assert(pageSource.includes('buildResultPageModel({ result, flowStatus: tripFlow.status, flowError: tripFlow.error })'), '结果页必须由 flow status/error 投影结构化模型')
  assert(pageSource.includes('captureHistoryContext(base)'), 'historyContext 必须在 base 到达时捕获')
  assert(pageSource.includes('mergeAdviceResult(base, d, degraded)'), 'advice 必须进入独立 AI namespace')
  assert(pageSource.includes('version: CACHE_VERSION'), '结构化结果缓存必须带版本')
  assert(pageSource.includes('gearChecked: {}'), '缓存恢复与新 base 必须清空页面 checklist')
  assert(!pageSource.includes('const weather = d.weatherWindow'), '结果页不得从 compatibility weatherWindow 渲染')
  assert(!pageSource.includes('const meta = d.meta'), '结果页不得从 compatibility meta 渲染')
  assert(!pageSource.includes('_requestGeneration'), '页面不得保留私有 generation 双写')
  for (const field of ['loading:', 'showResult:', 'adviceLoading:', 'showCandidatePopup:', 'candidateSnapshot:', 'pendingResolvedLocation:']) {
    assert(!pageSource.includes(field), '页面顶层 state 不得保留旧流程字段: ' + field)
  }
  assert(pageSource.includes("type: 'RESTORE_CACHED'"), '缓存恢复必须经 RESTORE_CACHED')
  assert(pageSource.includes("type: 'RESET'"), '取消与 onBack 必须经 RESET 推进 token')
  assert(!pageSource.includes('showManualCoords:'), '页面不得保留顶层 showManualCoords 或其写入')
  assert(!pageSource.includes('manualPopupVisible ||'), '手动 Popup 不得叠加页面局部可见性')
  assert(pageSource.includes('_openManualFallback(error)'), '本地无效手动上下文必须经 reducer 打开 fallback')
  const submitStart = pageSource.indexOf('onSubmit = () =>')
  const submitEnd = pageSource.indexOf('_updateTripFlow(event', submitStart)
  const submitSource = pageSource.slice(submitStart, submitEnd)
  assert(submitStart >= 0 && submitEnd > submitStart, 'onSubmit 手动分支源码边界必须可切出')
  assert(/if\s*\(\s*manualContextActive\s*\)/.test(submitSource), 'onSubmit 必须包含手动上下文分支')
  assert(/manualElevation:\s*elevation\.provided\s*\?\s*elevation\.value\s*:\s*undefined/.test(submitSource), 'onSubmit 手动分支必须按 provided 传递海拔')
  const manualSubmitStart = pageSource.indexOf('onManualSubmit = () =>')
  const manualSubmitEnd = pageSource.indexOf('onManualClose =', manualSubmitStart)
  const manualSubmitSource = pageSource.slice(manualSubmitStart, manualSubmitEnd)
  assert(manualSubmitStart >= 0 && manualSubmitEnd > manualSubmitStart, 'onManualSubmit 源码边界必须可切出')
  assert(!manualSubmitSource.includes('showManualCoords'), 'onManualSubmit 必须通过 BEGIN_PREPARE 关闭 reducer Popup，而非页面局部状态')
  assert(/manualElevation:\s*elevation\.provided\s*\?\s*elevation\.value\s*:\s*undefined/.test(manualSubmitSource), 'onManualSubmit 必须按 provided 传递海拔')
  assert(pageSource.includes("result.code === 'location_failed' || result.code === 'route_not_found'"), 'location_failed 与 route_not_found 都必须打开手动 fallback')
  assert(pageSource.includes("type: 'ROUTE_TYPE_REQUIRED', token, routeTypeRequest: null, error: flowError"), 'route_not_found fallback 必须保留错误并进入统一类型选择状态')
  assert(pageSource.includes('candidate.fixedDays') && pageSource.includes('固定${candidate.fixedDays}天（只读）'), '完整候选必须渲染服务端固定天数，不提供可编辑输入')
  const elevationMatch = pageSource.match(/function parseManualElevation\(value\) \{([\s\S]*?)\n\}/)
  assert(elevationMatch, '页面必须包含可独立验证的手动海拔解析函数')
  const parseManualElevation = new Function(`return function parseManualElevation(value) {${elevationMatch[1]}}`)()
  assert.deepStrictEqual(parseManualElevation(''), { provided: false, value: undefined, valid: true }, '空海拔必须交给服务端自动查询')
  assert.deepStrictEqual(parseManualElevation('0'), { provided: true, value: 0, valid: true }, '海拔 0 必须作为有效输入保留')
  assert.deepStrictEqual(parseManualElevation('-20'), { provided: true, value: -20, valid: true }, '负海拔必须作为有效输入保留')
  assert.equal(parseManualElevation('NaN').valid, false, 'NaN 海拔必须被拒绝')
  assert.equal(parseManualElevation('9001').valid, false, '超范围海拔必须被拒绝')
  assert(pageSource.includes('this.state.tripFlow.token !== token'), 'cache/history side effect 必须在页面回调再次确认 reducer token')
  assert(pageSource.includes('this._unmounted || this.state.tripFlow.token !== token'), '卸载后不得触发 cache/history/UI side effect')
  assert(!/name:\s*['\"]getAdvice['\"]/.test(pageSource), '页面不得直接发送 getAdvice；必须经 service')
  assert(pageSource.includes("name: 'history'"), 'I19 history 调用和局部状态必须留在页面')

  const mountBody = extractMethodBody(pageSource, /componentDidMount\s*\(\)\s*\{/)
  assert(mountBody.includes("this._applyChecklistLifecycle({ type: 'cache_restore' })"), 'cache restore 必须真实调用 cache_restore lifecycle seam')
  const clearBody = extractMethodBody(pageSource, /_clearResultLocalState\(\)\s*\{/)
  assert(clearBody.includes("this._applyChecklistLifecycle({ type: 'return_to_search' }, true)"), '清理结果状态必须真实调用 return_to_search lifecycle seam')
  const backBody = extractMethodBody(pageSource, /onBack\s*=\s*\(\)\s*=>\s*\{/)
  assert(backBody.includes('this._clearResultLocalState()'), 'onBack 必须走实际结果状态清理路径')

  const baseBody = extractMethodBody(pageSource, /_showBaseAndFetchAdvice\(base,\s*queryId,\s*params,\s*generation\)\s*\{/)
  assert(baseBody.includes("this._applyChecklistLifecycle({ type: 'base_received', queryId, baseRef: base }, true)"), '真实 base/query 到达必须调用 base_received lifecycle seam')
  assert(baseBody.includes("this._applyChecklistLifecycle({ type: 'advice_started' })"), '真实 advice start 必须调用 advice_started lifecycle seam')

  const adviceBody = extractMethodBody(pageSource, /_fetchAdvice\(queryId,\s*historyParams,\s*generation(?:,\s*options\s*=\s*\{\})?\)\s*\{/)
  assert(adviceBody.includes("this._applyChecklistLifecycle({ type: 'advice_succeeded' })"), 'advice success 必须调用 advice_succeeded lifecycle seam')
  assert(adviceBody.includes("historyResultForAdviceOutcome('success', { adviceData: d, degraded })"), 'advice success 必须产生 success history intent')
  assert(adviceBody.includes('this._saveHistory(historyParams, historyResult)'), 'advice success 必须实际保存一次 history')
  const contextStart = adviceBody.indexOf("if (result && result.phase === 'error' && result.code === 'query_context_unavailable')")
  const adviceBranchStart = adviceBody.indexOf("if (result && result.phase === 'advice')", contextStart)
  const contextBranch = contextStart >= 0 && adviceBranchStart > contextStart ? adviceBody.slice(contextStart, adviceBranchStart) : ''
  assert(contextBranch.includes("this._applyChecklistLifecycle({ type: 'context_unavailable' })"), 'context-unavailable 必须调用 context lifecycle seam')
  assert(!contextBranch.includes('_saveHistory('), 'context-unavailable 分支不得保存 history')

  const degradedBody = extractMethodBody(pageSource, /_finishDegradedAdvice\(token,\s*historyParams,\s*error(?:,\s*options\s*=\s*\{\})?\)\s*\{/)
  assert(degradedBody.includes("this._applyChecklistLifecycle({ type: 'advice_failed' })"), '普通 degraded 必须调用 advice_failed lifecycle seam')
  assert(degradedBody.includes("historyResultForAdviceOutcome('degraded', { baseRisks: this._baseHistoryRisks })"), '普通 degraded 必须产生 degraded history intent')
  assert(degradedBody.includes('this._saveHistory(historyParams, historyResult)'), '普通 degraded 必须实际保存一次 history')
}

async function main() {
  assertInitialState()
  assertPrimaryTransitions()
  assertAdviceOutcomes()
  assertTokenGuardsAndRestore()
  await assertService()
  assertPageWiring()
  console.log('PASS: I20 trip-flow reducer 与 getAdvice service 契约')
}

main().catch((error) => {
  console.error('FAIL: ' + error.message)
  process.exitCode = 1
})
