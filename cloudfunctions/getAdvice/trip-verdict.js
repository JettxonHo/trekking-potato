/**
 * I16 trip-level deterministic composition.
 *
 * This module consumes only server-normalized route context and I14 snapshots.
 * It has no transport, persistence, client-clock, AI, or public-handler work.
 */
const { evaluateWeatherVerdict: defaultEvaluateWeatherVerdict } = require('./weather-verdict')
const { getSunsetReference: defaultGetSunsetReference } = require('./sun-events')

const LEVELS = new Set(['小白', '中级', '老手'])
const ROUTE_TYPES = new Set(['trek', 'climb', 'tour'])
const CLIMB_SUPPORTS = new Set(['solo_or_unsure', 'experienced_team', 'professional_guide'])
const TIMEZONE = 'Asia/Shanghai'

function copy(value) {
  return JSON.parse(JSON.stringify(value))
}

function isBlockedContext(value) {
  return value
    && value.kind === 'blocked'
    && value.restriction
    && typeof value.restriction.reason === 'string'
    && typeof value.restriction.scope === 'string'
    && Array.isArray(value.restriction.sourceIds)
    && typeof value.sourceCheckedAt === 'string'
}

function isRouteContext(value) {
  return value
    && typeof value === 'object'
    && (
      value.kind === 'place_only'
      || isBlockedContext(value)
      || (value.kind === 'full' && ROUTE_TYPES.has(value.routeType))
    )
}

function validWeatherSnapshot(value) {
  return value
    && value.ok === true
    && (value.dataStatus === 'complete' || value.dataStatus === 'insufficient')
}

function globalReason(code, severity, observed, message) {
  return { code, severity, at: null, observed, message }
}

function windowAt(window, samplePointId) {
  return {
    day: window.day,
    date: window.date,
    samplePointId,
    startLocal: window.startLocal,
    endLocalExclusive: window.endLocalExclusive,
  }
}

function deduplicateDataIssues(issues) {
  const seen = new Set()
  return issues.filter((issue) => {
    const key = [issue.code, issue.day, issue.date, issue.samplePointId, issue.retryable].join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function shanghaiDate(isoTime) {
  const value = new Date(isoTime)
  if (Number.isNaN(value.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value)
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${byType.year}-${byType.month}-${byType.day}`
}

function calendarDayDifference(fromDate, toDate) {
  return Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86400000)
}

function isValidSunset(value) {
  return value
    && value.ok === true
    && value.timezone === TIMEZONE
    && typeof value.sunsetLocal === 'string'
    && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.sunsetLocal)
}

function isAfterSunset(endLocalExclusive, date, sunsetLocal) {
  return endLocalExclusive > `${date}T${sunsetLocal}`
}

function evaluateSunset(window, getSunsetReference) {
  const successful = []
  const issues = []
  for (const sample of window.samples) {
    let reference
    try {
      reference = getSunsetReference({
        date: window.date,
        coordinate: sample.requestCoordinate,
      })
    } catch (_error) {
      reference = null
    }
    if (!isValidSunset(reference)) {
      issues.push({
        day: window.day,
        date: window.date,
        samplePointId: sample.samplePointId,
        code: 'sunset_reference_unavailable',
        retryable: false,
      })
      continue
    }
    successful.push({ samplePointId: sample.samplePointId, sunsetLocal: reference.sunsetLocal })
  }
  if (issues.length > 0) return { issues }
  const earliest = successful.reduce((current, candidate) => (
    candidate.sunsetLocal < current.sunsetLocal ? candidate : current
  ))
  return { earliest, issues }
}

function climbReasons(routeContext, request) {
  if (routeContext.routeType !== 'climb') return []
  if (request.level === '小白' && request.climbSupport === 'solo_or_unsure') {
    return [globalReason(
      'novice_climb_solo_or_unsure',
      'no_go',
      { level: '小白', climbSupport: 'solo_or_unsure' },
      '新手独自或支持不确定时不建议进行技术攀登',
    )]
  }
  return [globalReason(
    'technical_climb',
    'caution',
    { routeType: 'climb', climbSupport: request.climbSupport },
    '技术攀登最低按谨慎出发处理',
  )]
}

function forecastReasons(windows, fetchedAt) {
  const fetchedDate = shanghaiDate(fetchedAt)
  if (!fetchedDate) return []
  return windows.flatMap((window) => {
    const leadDays = calendarDayDifference(fetchedDate, window.date)
    if (leadDays < 5) return []
    return [{
      code: 'forecast_lead_time',
      severity: 'caution',
      at: windowAt(window, null),
      observed: { leadDays, thresholdDays: 5 },
      message: '预报提前量较长，临近出发需重新确认',
    }]
  })
}

function finalVerdict(reasons, dataStatus) {
  if (reasons.some((reason) => reason.severity === 'no_go')) return 'no_go'
  if (dataStatus !== 'complete') return null
  return reasons.some((reason) => reason.severity === 'caution') ? 'caution' : 'go'
}

/**
 * @param {{ routeContext?: any, request?: any, weatherSnapshot?: any }} input
 * @param {{ evaluateWeatherVerdict?: (snapshot: any) => any, getSunsetReference?: (input: any) => any }} [options]
 */
function evaluateTripVerdict(input, options = {}) {
  const { routeContext, request, weatherSnapshot } = input || {}
  if (!isRouteContext(routeContext)) throw new TypeError('trusted route context required')

  if (routeContext.kind === 'blocked') {
    return {
      verdict: 'no_go',
      dataStatus: 'complete',
      reasons: [globalReason(
        'official_route_blocked',
        'no_go',
        {
          reason: routeContext.restriction.reason,
          scope: routeContext.restriction.scope,
          sourceIds: copy(routeContext.restriction.sourceIds),
          sourceCheckedAt: routeContext.sourceCheckedAt,
        },
        '该路线存在官方禁行记录',
      )],
      dataIssues: [],
      evaluatedWindows: [],
    }
  }

  if (routeContext.kind === 'place_only') {
    return {
      verdict: null,
      dataStatus: 'place_only',
      reasons: [],
      dataIssues: [{ code: 'place_only_route', retryable: false }],
      evaluatedWindows: [],
    }
  }

  if (!request || !LEVELS.has(request.level)) throw new TypeError('valid level required')
  if (routeContext.routeType === 'climb' && !CLIMB_SUPPORTS.has(request.climbSupport)) {
    throw new TypeError('climbSupport required for climb')
  }
  if (!validWeatherSnapshot(weatherSnapshot)) throw new TypeError('route weather snapshot required')

  const climb = climbReasons(routeContext, request)
  const evaluatedWindows = copy(weatherSnapshot.evaluatedWindows)
  if (weatherSnapshot.dataStatus === 'insufficient') {
    const dataIssues = deduplicateDataIssues(copy(weatherSnapshot.insufficientReasons || []))
    return {
      verdict: finalVerdict(climb, 'insufficient'),
      dataStatus: 'insufficient',
      reasons: climb,
      dataIssues,
      evaluatedWindows,
    }
  }

  const evaluateWeatherVerdict = options.evaluateWeatherVerdict || defaultEvaluateWeatherVerdict
  const getSunsetReference = options.getSunsetReference || defaultGetSunsetReference
  const weatherVerdict = evaluateWeatherVerdict(weatherSnapshot)
  const weatherReasons = copy(weatherVerdict.reasons)
  const forecast = forecastReasons(weatherSnapshot.evaluatedWindows, weatherSnapshot.fetchedAt)
  const sunsetReasons = []
  const sunsetIssues = []

  for (const window of weatherSnapshot.evaluatedWindows) {
    const sunset = evaluateSunset(window, getSunsetReference)
    sunsetIssues.push(...sunset.issues)
    if (!sunset.earliest) continue
    if (isAfterSunset(window.endLocalExclusive, window.date, sunset.earliest.sunsetLocal)) {
      sunsetReasons.push({
        code: 'expected_finish_after_sunset',
        severity: 'caution',
        at: windowAt(window, sunset.earliest.samplePointId),
        observed: {
          endLocalExclusive: window.endLocalExclusive,
          sunsetLocal: sunset.earliest.sunsetLocal,
        },
        message: '预计结束时间晚于几何日落',
      })
    }
  }

  const dataIssues = deduplicateDataIssues(sunsetIssues)
  const dataStatus = dataIssues.length > 0 ? 'insufficient' : 'complete'
  const reasons = [
    ...climb.filter((reason) => reason.severity === 'no_go'),
    ...weatherReasons,
    ...climb.filter((reason) => reason.severity === 'caution'),
    ...forecast,
    ...sunsetReasons,
  ]
  return {
    verdict: finalVerdict(reasons, dataStatus),
    dataStatus,
    reasons,
    dataIssues,
    evaluatedWindows,
  }
}

module.exports = { evaluateTripVerdict }
