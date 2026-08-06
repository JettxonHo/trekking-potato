/**
 * I04 getAdvice 响应契约。
 *
 * 兼容字段保留在这一层，调用方只应按 phase 识别响应状态。
 */
const ERROR_RETRYABLE = Object.freeze({
  weather_data_invalid: true,
  no_auth: false,
  missing_params: false,
  invalid_mode: false,
  invalid_trip_days: false,
  invalid_date: false,
  invalid_route_type: false,
  candidate_not_found: false,
  location_failed: false,
  out_of_range: false,
  invalid_base_data: false,
  internal_error: false,
})
const ROUTE_TYPE_OPTIONS = Object.freeze(['trek', 'climb', 'tour'])

function errorResponse(code, message, extra) {
  if (!Object.prototype.hasOwnProperty.call(ERROR_RETRYABLE, code)) {
    throw new Error('未定义的 I04 错误码: ' + code)
  }

  return {
    ...(extra || {}),
    phase: 'error',
    code,
    message,
    retryable: ERROR_RETRYABLE[code],
    ok: false,
    error: code,
  }
}

function confirmationResponse(message, candidates) {
  return {
    phase: 'confirmation',
    message,
    candidates,
    ok: true,
    needsConfirm: true,
  }
}

function routeTypeRequiredResponse(data) {
  return {
    phase: 'route_type_required',
    displayName: data.name,
    allowedTypes: [...ROUTE_TYPE_OPTIONS],
    data: {
      ...data,
      routeTypeOptions: [...ROUTE_TYPE_OPTIONS],
    },
    ok: false,
    error: 'route_type_required',
    needsRouteType: true,
  }
}

function baseResponse(data) {
  return { phase: 'base', data, ok: true }
}

function adviceResponse(data, degraded) {
  return {
    phase: 'advice',
    degraded: degraded === true,
    data,
    ok: true,
  }
}

module.exports = {
  ERROR_RETRYABLE,
  ROUTE_TYPE_OPTIONS,
  errorResponse,
  confirmationResponse,
  routeTypeRequiredResponse,
  baseResponse,
  adviceResponse,
}
