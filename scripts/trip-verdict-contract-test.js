/**
 * I16 trip-level composition contract (offline only).
 *
 * Snapshots cross I14's injected route-weather seam. I15 and astronomical
 * calculations are injected only at the frozen I16 seams.
 */
const assert = require('node:assert/strict')
const { createRouteCatalog } = require('../cloudfunctions/getAdvice/domain/route-catalog')
const { fetchRouteWeather } = require('../cloudfunctions/getAdvice/hourly-weather')
const { clone, makeCatalogInput, makeHourlyResponse } = require('./fixtures/open-meteo-hourly')
const { evaluateTripVerdict } = require('../cloudfunctions/getAdvice/trip-verdict')

const FIXTURE_NOW = new Date('2026-08-06T15:30:00.000Z')

function getParam(url, name) {
  return new URL(url).searchParams.get(name)
}

function fixtureVariant() {
  return createRouteCatalog(makeCatalogInput()).getById('variant:hourly-fixture')
}

async function routeWeather({ date = '2026-08-10', unavailable = false } = {}) {
  return fetchRouteWeather(
    { variant: fixtureVariant(), date, startTimeLocal: '07:30' },
    {
      now: FIXTURE_NOW,
      requestJson: async (url) => {
        if (unavailable && getParam(url, 'elevation') === '1810') throw new Error('offline weather unavailable')
        return makeHourlyResponse({
          startDate: getParam(url, 'start_date'),
          endDate: getParam(url, 'end_date'),
        })
      },
    },
  )
}

function fullContext(routeType = 'trek') {
  return { kind: 'full', routeType }
}

function request({ level = '中级', climbSupport } = {}) {
  return { level, ...(climbSupport === undefined ? {} : { climbSupport }) }
}

function weatherReason(code = 'rain_or_snow', severity = 'caution') {
  return {
    code,
    severity,
    at: {
      day: 1,
      date: '2026-08-10',
      samplePointId: 'sample-b',
      startLocal: '2026-08-10T07:00',
      endLocalExclusive: '2026-08-10T08:00',
    },
    observed: { weatherCode: 61 },
    message: '来自 I15 的固定天气原因',
  }
}

function makeEvaluator(result, calls) {
  return (snapshot) => {
    calls.push(snapshot)
    return result
  }
}

function sunsetBySample(values, calls) {
  return ({ date, coordinate }) => {
    calls.push({ date, coordinate: { ...coordinate } })
    const item = values[`${date}:${coordinate.lat},${coordinate.lon}`]
    return item || { ok: true, timezone: 'Asia/Shanghai', sunsetLocal: '18:00' }
  }
}

function assertWindowsUnchanged(result, snapshot) {
  assert.deepEqual(result.evaluatedWindows, snapshot.evaluatedWindows)
}

async function testTerminalContextsAndGuards() {
  let evaluatorCalls = 0
  let sunsetCalls = 0
  const blocked = evaluateTripVerdict({
    routeContext: {
      kind: 'blocked',
      restriction: { reason: '官方公告', scope: '台顶徒步', sourceIds: ['source:wutai'] },
      sourceCheckedAt: '2026-08-06',
    },
    request: null,
    weatherSnapshot: null,
  }, {
    evaluateWeatherVerdict() { evaluatorCalls++ },
    getSunsetReference() { sunsetCalls++ },
  })
  assert.deepEqual(blocked, {
    verdict: 'no_go',
    dataStatus: 'complete',
    reasons: [{
      code: 'official_route_blocked',
      severity: 'no_go',
      at: null,
      observed: {
        reason: '官方公告', scope: '台顶徒步', sourceIds: ['source:wutai'], sourceCheckedAt: '2026-08-06',
      },
      message: '该路线存在官方禁行记录',
    }],
    dataIssues: [],
    evaluatedWindows: [],
  })
  assert.equal(evaluatorCalls, 0)
  assert.equal(sunsetCalls, 0)

  const placeOnly = evaluateTripVerdict({
    routeContext: { kind: 'place_only' }, request: null, weatherSnapshot: null,
  })
  assert.deepEqual(placeOnly, {
    verdict: null,
    dataStatus: 'place_only',
    reasons: [],
    dataIssues: [{ code: 'place_only_route', retryable: false }],
    evaluatedWindows: [],
  })

  assert.throws(
    () => evaluateTripVerdict({ routeContext: { kind: 'unknown' } }),
    new TypeError('trusted route context required'),
  )
  assert.throws(
    () => evaluateTripVerdict({ routeContext: fullContext(), request: request({ level: '游客' }) }),
    new TypeError('valid level required'),
  )
  assert.throws(
    () => evaluateTripVerdict({ routeContext: fullContext('climb'), request: request() }),
    new TypeError('climbSupport required for climb'),
  )
  assert.throws(
    () => evaluateTripVerdict({ routeContext: fullContext(), request: request() }),
    new TypeError('route weather snapshot required'),
  )
}

async function testInsufficientAndIndependentClimbNoGo() {
  const insufficient = await routeWeather({ unavailable: true })
  assert.equal(insufficient.dataStatus, 'insufficient')
  const before = clone(insufficient)
  let evaluatorCalls = 0
  let sunsetCalls = 0
  const result = evaluateTripVerdict({
    routeContext: fullContext(), request: request(), weatherSnapshot: insufficient,
  }, {
    evaluateWeatherVerdict() { evaluatorCalls++ },
    getSunsetReference() { sunsetCalls++ },
  })
  assert.equal(result.verdict, null)
  assert.equal(result.dataStatus, 'insufficient')
  assert.deepEqual(result.reasons, [])
  assert.deepEqual(result.dataIssues, insufficient.insufficientReasons)
  assertWindowsUnchanged(result, insufficient)
  assert.deepEqual(insufficient, before)
  assert.equal(evaluatorCalls, 0)
  assert.equal(sunsetCalls, 0)

  const novice = evaluateTripVerdict({
    routeContext: fullContext('climb'),
    request: request({ level: '小白', climbSupport: 'solo_or_unsure' }),
    weatherSnapshot: insufficient,
  }, {
    evaluateWeatherVerdict() { throw new Error('must not evaluate incomplete weather') },
    getSunsetReference() { throw new Error('must not calculate sunset for incomplete weather') },
  })
  assert.deepEqual(novice.reasons, [{
    code: 'novice_climb_solo_or_unsure',
    severity: 'no_go',
    at: null,
    observed: { level: '小白', climbSupport: 'solo_or_unsure' },
    message: '新手独自或支持不确定时不建议进行技术攀登',
  }])
  assert.equal(novice.verdict, 'no_go')
  assert.equal(novice.dataStatus, 'insufficient')
  assert.deepEqual(novice.dataIssues, insufficient.insufficientReasons)
}

async function testWeatherPreservationClimbAndLeadTime() {
  const complete = await routeWeather()
  assert.equal(complete.dataStatus, 'complete')
  const i15Reason = weatherReason()
  const evaluatorCalls = []
  const sunsetCalls = []
  const result = evaluateTripVerdict({
    routeContext: fullContext('climb'),
    request: request({ level: '中级', climbSupport: 'experienced_team' }),
    weatherSnapshot: complete,
  }, {
    evaluateWeatherVerdict: makeEvaluator({ verdict: 'caution', dataStatus: 'complete', reasons: [i15Reason] }, evaluatorCalls),
    getSunsetReference: sunsetBySample({}, sunsetCalls),
  })
  assert.equal(evaluatorCalls.length, 1)
  assert.equal(sunsetCalls.length, 4, 'one local sunset check per route-day sample')
  assert.deepEqual(result.reasons, [
    i15Reason,
    {
      code: 'technical_climb',
      severity: 'caution',
      at: null,
      observed: { routeType: 'climb', climbSupport: 'experienced_team' },
      message: '技术攀登最低按谨慎出发处理',
    },
    {
      code: 'forecast_lead_time',
      severity: 'caution',
      at: {
        day: 2,
        date: '2026-08-11',
        samplePointId: null,
        startLocal: '2026-08-11T07:30',
        endLocalExclusive: '2026-08-11T09:30',
      },
      observed: { leadDays: 5, thresholdDays: 5 },
      message: '预报提前量较长，临近出发需重新确认',
    },
  ])
  assert.equal(result.verdict, 'caution')
  assert.equal(result.dataStatus, 'complete')
  assert.deepEqual(result.dataIssues, [])
  assertWindowsUnchanged(result, complete)

  for (const routeType of ['trek', 'tour']) {
    const plain = evaluateTripVerdict({
      routeContext: fullContext(routeType),
      request: request({ level: '小白', climbSupport: 'solo_or_unsure' }),
      weatherSnapshot: complete,
    }, {
      evaluateWeatherVerdict: () => ({ verdict: 'go', dataStatus: 'complete', reasons: [] }),
      getSunsetReference: sunsetBySample({}, []),
    })
    assert.equal(plain.reasons.some((reason) => reason.code === 'technical_climb'), false)
    assert.equal(plain.reasons.some((reason) => reason.code === 'novice_climb_solo_or_unsure'), false)
  }

  for (const level of ['小白', '中级', '老手']) {
    for (const climbSupport of ['solo_or_unsure', 'experienced_team', 'professional_guide']) {
      const matrix = evaluateTripVerdict({
        routeContext: fullContext('climb'),
        request: request({ level, climbSupport }),
        weatherSnapshot: complete,
      }, {
        evaluateWeatherVerdict: () => ({ verdict: 'go', dataStatus: 'complete', reasons: [] }),
        getSunsetReference: sunsetBySample({}, []),
      })
      assert.equal(matrix.verdict, level === '小白' && climbSupport === 'solo_or_unsure' ? 'no_go' : 'caution')
      assert.equal(matrix.reasons.some((reason) => reason.code === 'technical_climb'), !(level === '小白' && climbSupport === 'solo_or_unsure'))
    }
  }
}

async function testSunsetBoundariesAndDataIssues() {
  const complete = await routeWeather()
  const first = complete.evaluatedWindows[0]
  const second = complete.evaluatedWindows[1]
  const bySample = {
    [`${first.date}:30,100`]: { ok: true, timezone: 'Asia/Shanghai', sunsetLocal: '17:30' },
    [`${first.date}:39.91359571849836,116.39775550083061`]: { ok: true, timezone: 'Asia/Shanghai', sunsetLocal: '17:00' },
    [`${second.date}:31,101`]: { ok: true, timezone: 'Asia/Shanghai', sunsetLocal: '18:00' },
    [`${second.date}:30,100`]: { ok: true, timezone: 'Asia/Shanghai', sunsetLocal: '18:00' },
  }

  const equal = clone(complete)
  equal.evaluatedWindows[0].endLocalExclusive = '2026-08-10T17:00'
  const equality = evaluateTripVerdict({
    routeContext: fullContext(), request: request(), weatherSnapshot: equal,
  }, {
    evaluateWeatherVerdict: () => ({ verdict: 'go', dataStatus: 'complete', reasons: [] }),
    getSunsetReference: sunsetBySample(bySample, []),
  })
  assert.equal(equality.reasons.some((reason) => reason.code === 'expected_finish_after_sunset'), false)

  const late = clone(equal)
  late.evaluatedWindows[0].endLocalExclusive = '2026-08-10T17:01'
  const later = evaluateTripVerdict({
    routeContext: fullContext(), request: request(), weatherSnapshot: late,
  }, {
    evaluateWeatherVerdict: () => ({ verdict: 'go', dataStatus: 'complete', reasons: [] }),
    getSunsetReference: sunsetBySample(bySample, []),
  })
  assert.deepEqual(later.reasons.at(-1), {
    code: 'expected_finish_after_sunset',
    severity: 'caution',
    at: {
      day: 1,
      date: '2026-08-10',
      samplePointId: 'sample-a',
      startLocal: '2026-08-10T07:30',
      endLocalExclusive: '2026-08-10T17:01',
    },
    observed: { endLocalExclusive: '2026-08-10T17:01', sunsetLocal: '17:00' },
    message: '预计结束时间晚于几何日落',
  })

  const tied = clone(late)
  const tie = evaluateTripVerdict({
    routeContext: fullContext(), request: request(), weatherSnapshot: tied,
  }, {
    evaluateWeatherVerdict: () => ({ verdict: 'go', dataStatus: 'complete', reasons: [] }),
    getSunsetReference: sunsetBySample({
      ...bySample,
      [`${first.date}:30,100`]: { ok: true, timezone: 'Asia/Shanghai', sunsetLocal: '17:00' },
    }, []),
  })
  assert.equal(tie.reasons.at(-1).at.samplePointId, 'sample-b', 'earliest-sunset ties use I14 sample order')

  const crossMidnight = clone(complete)
  crossMidnight.evaluatedWindows[0].endLocalExclusive = '2026-08-11T00:00'
  const midnight = evaluateTripVerdict({
    routeContext: fullContext(), request: request(), weatherSnapshot: crossMidnight,
  }, {
    evaluateWeatherVerdict: () => ({ verdict: 'go', dataStatus: 'complete', reasons: [] }),
    getSunsetReference: sunsetBySample(bySample, []),
  })
  assert.equal(midnight.reasons.some((reason) => reason.code === 'expected_finish_after_sunset'), true)

  const unavailable = evaluateTripVerdict({
    routeContext: fullContext(), request: request(), weatherSnapshot: complete,
  }, {
    evaluateWeatherVerdict: () => ({ verdict: 'caution', dataStatus: 'complete', reasons: [weatherReason()] }),
    getSunsetReference: sunsetBySample({
      ...bySample,
      [`${first.date}:39.91359571849836,116.39775550083061`]: { ok: false, code: 'sunset_unavailable' },
    }, []),
  })
  assert.equal(unavailable.verdict, null, 'caution must not turn missing sun data into danger')
  assert.equal(unavailable.dataStatus, 'insufficient')
  assert.deepEqual(unavailable.dataIssues, [{
    day: 1,
    date: '2026-08-10',
    samplePointId: 'sample-a',
    code: 'sunset_reference_unavailable',
    retryable: false,
  }])

  const weatherNoGo = evaluateTripVerdict({
    routeContext: fullContext(), request: request(), weatherSnapshot: complete,
  }, {
    evaluateWeatherVerdict: () => ({ verdict: 'no_go', dataStatus: 'complete', reasons: [weatherReason('thunderstorm', 'no_go')] }),
    getSunsetReference: sunsetBySample({
      ...bySample,
      [`${first.date}:39.91359571849836,116.39775550083061`]: { ok: false, code: 'sunset_unavailable' },
    }, []),
  })
  assert.equal(weatherNoGo.verdict, 'no_go', 'known hard weather rule survives missing sunset data')
  assert.equal(weatherNoGo.dataStatus, 'insufficient')
}

async function testDefaultI15AndImmutability() {
  const complete = await routeWeather({ date: '2026-08-06' })
  const input = {
    routeContext: fullContext(), request: request(), weatherSnapshot: complete,
  }
  const before = clone(input)
  const sunsets = []
  const options = { getSunsetReference: sunsetBySample({}, sunsets) }
  const first = evaluateTripVerdict(input, options)
  const second = evaluateTripVerdict(input, options)
  assert.equal(first.verdict, 'go')
  assert.deepEqual(second, first)
  assert.deepEqual(input, before)
}

async function main() {
  await testTerminalContextsAndGuards()
  await testInsufficientAndIndependentClimbNoGo()
  await testWeatherPreservationClimbAndLeadTime()
  await testSunsetBoundariesAndDataIssues()
  await testDefaultI15AndImmutability()
  console.log('PASS: I16 trip-verdict contract')
}

main().catch((error) => {
  console.error('FAIL: ' + error.message)
  process.exitCode = 1
})
