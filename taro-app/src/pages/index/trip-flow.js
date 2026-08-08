const INITIAL_TOKEN = 0
const { isAdviceRetryEligible, isReprepareEligible } = require('./recovery-model')

function createInitialTripFlow() {
  return {
    status: 'idle',
    token: INITIAL_TOKEN,
    result: null,
    queryId: null,
    candidates: [],
    confirmationInput: null,
    routeTypeRequest: null,
    error: null,
  }
}

function clearFlow(state, next) {
  return {
    status: next.status,
    token: next.token,
    result: next.result,
    queryId: next.queryId,
    candidates: next.candidates,
    confirmationInput: next.confirmationInput,
    routeTypeRequest: next.routeTypeRequest,
    error: next.error,
  }
}

function resetFlow(state, status) {
  return clearFlow(state, {
    status: status || 'idle',
    token: state.token + 1,
    result: null,
    queryId: null,
    candidates: [],
    confirmationInput: null,
    routeTypeRequest: null,
    error: null,
  })
}

function hasCurrentToken(state, event) {
  return !!event && event.token === state.token
}

function reduceTripFlow(state, event) {
  const current = state || createInitialTripFlow()
  const type = event && event.type

  if (type === 'BEGIN_SEARCH') {
    if (!['idle', 'complete', 'degraded', 'error'].includes(current.status)) return current
    return resetFlow(current, 'searching')
  }

  if (type === 'BEGIN_PREPARE') {
    if (!['awaiting_confirmation', 'awaiting_route_type', 'error'].includes(current.status)) return current
    return clearFlow(current, {
      status: 'preparing',
      token: current.token + 1,
      result: current.result,
      queryId: current.queryId,
      candidates: [],
      confirmationInput: null,
      routeTypeRequest: null,
      error: null,
    })
  }

  if (type === 'RESET') return resetFlow(current)

  if (type === 'RESTORE_CACHED') {
    if (current.status !== 'idle') return current
    return clearFlow(current, {
      status: event.degraded === true ? 'degraded' : 'complete',
      token: current.token + 1,
      result: event.result,
      queryId: null,
      candidates: [],
      confirmationInput: null,
      routeTypeRequest: null,
      error: null,
    })
  }

  if (!hasCurrentToken(current, event)) return current

  if (type === 'BEGIN_ADVICE_RETRY') {
    if (!isAdviceRetryEligible(current, event)) return current
    return clearFlow(current, {
      status: 'advice_loading',
      token: current.token + 1,
      result: {
        ...current.result,
        ai: { ...(current.result.ai || {}), status: 'loading' },
      },
      queryId: current.queryId,
      candidates: [],
      confirmationInput: null,
      routeTypeRequest: null,
      error: null,
    })
  }

  if (type === 'BEGIN_REPREPARE') {
    if (!isReprepareEligible(current, event)) return current
    return clearFlow(current, {
      status: 'preparing',
      token: current.token + 1,
      result: event.result === undefined ? current.result : event.result,
      queryId: null,
      candidates: [],
      confirmationInput: null,
      routeTypeRequest: null,
      error: null,
    })
  }

  if (type === 'CONFIRMATION_REQUIRED') {
    if (current.status !== 'searching') return current
    return clearFlow(current, {
      status: 'awaiting_confirmation',
      token: current.token,
      result: null,
      queryId: null,
      candidates: event.candidates,
      confirmationInput: event.confirmationInput,
      routeTypeRequest: null,
      error: null,
    })
  }

  if (type === 'ROUTE_TYPE_REQUIRED') {
    if (!['searching', 'preparing'].includes(current.status)) return current
    return clearFlow(current, {
      status: 'awaiting_route_type',
      token: current.token,
      result: current.result,
      queryId: current.queryId,
      candidates: [],
      confirmationInput: null,
      routeTypeRequest: event.routeTypeRequest,
      error: event.error || null,
    })
  }

  if (type === 'BASE_RECEIVED') {
    if (!['searching', 'preparing'].includes(current.status)) return current
    return clearFlow(current, {
      status: 'base_ready',
      token: current.token,
      result: event.result,
      queryId: event.queryId,
      candidates: [],
      confirmationInput: null,
      routeTypeRequest: null,
      error: null,
    })
  }

  if (type === 'ADVICE_STARTED') {
    if (current.status !== 'base_ready') return current
    return clearFlow(current, {
      status: 'advice_loading',
      token: current.token,
      result: current.result,
      queryId: current.queryId,
      candidates: [],
      confirmationInput: null,
      routeTypeRequest: null,
      error: null,
    })
  }

  if (type === 'ADVICE_SUCCEEDED') {
    if (current.status !== 'advice_loading') return current
    return clearFlow(current, {
      status: event.degraded === true ? 'degraded' : 'complete',
      token: current.token,
      result: event.result,
      queryId: current.queryId,
      candidates: [],
      confirmationInput: null,
      routeTypeRequest: null,
      error: null,
    })
  }

  if (type === 'ADVICE_FAILED') {
    if (current.status !== 'advice_loading') return current
    return clearFlow(current, {
      status: 'degraded',
      token: current.token,
      result: event.result === undefined ? current.result : event.result,
      queryId: current.queryId,
      candidates: [],
      confirmationInput: null,
      routeTypeRequest: null,
      error: event.error || null,
    })
  }

  if (type === 'FLOW_FAILED') {
    if (!['searching', 'preparing'].includes(current.status)) return current
    return clearFlow(current, {
      status: 'error',
      token: current.token,
      result: current.result,
      queryId: current.queryId,
      candidates: [],
      confirmationInput: null,
      routeTypeRequest: null,
      error: event.error || null,
    })
  }

  if (type === 'CONTEXT_UNAVAILABLE') {
    if (current.status !== 'advice_loading') return current
    return clearFlow(current, {
      status: 'error',
      token: current.token,
      result: current.result,
      queryId: current.queryId,
      candidates: [],
      confirmationInput: null,
      routeTypeRequest: null,
      error: event.error || null,
    })
  }

  return current
}

function selectTripFlowView(state) {
  const current = state || createInitialTripFlow()
  const refreshing = current.status === 'preparing' && current.result !== null
  return {
    loading: current.status === 'searching' || (current.status === 'preparing' && current.result === null),
    refreshing,
    adviceLoading: current.status === 'base_ready' || current.status === 'advice_loading',
    showResult: current.result !== null,
    showCandidatePopup: current.status === 'awaiting_confirmation',
    showManualCoords: current.status === 'awaiting_route_type',
    errorMessage: current.error && current.error.message,
  }
}

module.exports = {
  createInitialTripFlow,
  reduceTripFlow,
  selectTripFlowView,
}
