/** I24a structured advice-context adapter contract. */
const assert = require('node:assert/strict')
const { BASE_KEYS, TRANSITIONAL_ALIASES, createAdviceContext } = require('../cloudfunctions/getAdvice/advice-context')
const { buildMessages } = require('../cloudfunctions/getAdvice/prompt')

function fullBase(overrides = {}) {
  return {
    schemaVersion: 'beta_base_v2',
    requestSummary: { date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 2, climbSupport: null },
    routeSnapshot: { entityKind: 'route_variant', capability: 'full', canonicalName: '测试二日线', region: '测试地区', routeType: 'trek', fixedDays: 2, routeHighestPointElevationM: 3200, stages: [] },
    weatherSnapshot: {
      ok: true, source: 'Open-Meteo', fetchedAt: '2026-08-08T00:00:00.000Z', timezone: 'Asia/Shanghai', dataStatus: 'complete',
      evaluatedWindows: [{ day: 1, date: '2026-08-09', samples: [{ hours: [{ temperatureC: 10.1, precipitationProbabilityPct: 20, windSpeedMs: 4.5, hourlySecret: 'must not leak' }] }] }],
    },
    deterministicResult: { verdict: 'go', dataStatus: 'complete', reasons: [], dataIssues: [], evaluatedWindows: [] },
    minimumGear: { essential: [{ item: '冲锋衣', reason: '防风' }], recommended: [], optional: [] },
    deterministicSafety: { fatalRisks: ['雷暴'], ruleNotes: ['午后注意避雷'] },
    sourceMetadata: { routeSourceIds: ['source:route'], routeSources: [{ id: 'source:route', title: '不得进入 Prompt' }], routeTypeSource: 'builtin', weatherSource: 'Open-Meteo', checkedAt: '2026-08-08T00:00:00.000Z' },
    ...overrides,
  }
}

function assertExactBase(base, label) {
  assert.deepEqual(Object.keys(base).sort(), BASE_KEYS.slice().sort(), `${label} exact v2 keyset`)
  for (const alias of TRANSITIONAL_ALIASES) assert.equal(Object.hasOwn(base, alias), false, `${label} alias ${alias} absent`)
}

function main() {
  const full = fullBase()
  assertExactBase(full, 'full complete')
  const context = createAdviceContext(full)
  assert.equal(context.routeLabel, '测试二日线')
  assert.equal(context.routeType, 'trek')
  assert.equal(context.routeTypeSource, 'builtin')
  assert.deepEqual(context.weatherSummary.days, [{ date: '2026-08-09', tempMin: 10, tempMax: 11, precipProb: 20, windMs: 4.5, confidence: '正常' }])
  assert.deepEqual(context.minimumGear, full.minimumGear)
  assert.deepEqual(context.deterministicSafety, full.deterministicSafety)
  assert.equal(Object.hasOwn(context, 'routeSources'), false)
  assert.equal(JSON.stringify(context).includes('hourlySecret'), false)

  const prompt = buildMessages(context)
  assert.equal(prompt[1].content.includes('2026-08-09'), true)
  assert.equal(prompt[1].content.includes('风4.5m/s'), true)
  assert.equal(prompt[1].content.includes('hourlySecret'), false)
  assert.equal(prompt[1].content.includes('source:route'), false)
  assert.equal(prompt[1].content.includes('雷暴'), true)

  const insufficient = fullBase({ weatherSnapshot: { ok: true, source: 'Open-Meteo', dataStatus: 'insufficient', insufficientReasons: [{ code: 'out_of_range', retryable: false }], evaluatedWindows: [] } })
  const insufficientContext = createAdviceContext(insufficient)
  assert.deepEqual(insufficientContext.weatherSummary.days, [])
  assert.equal(insufficientContext.weatherSummary.status, 'insufficient')

  const place = fullBase({
    requestSummary: { date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1, climbSupport: null },
    routeSnapshot: { entityKind: 'place', capability: 'place_only', canonicalName: '测试地点', region: '测试地区', routeType: 'tour', fixedDays: null, referenceCoordinate: { lat: 1, lon: 2, coordinateSystem: 'GCJ-02' }, referenceElevationM: 0 },
    weatherSnapshot: { status: 'available', scope: 'reference_point', source: 'Open-Meteo', data: { days: [{ date: '2026-08-09', tempMin: 0, tempMax: 20, precipProb: 10, windMs: 2 }] } },
    deterministicResult: { verdict: null, dataStatus: 'place_only', reasons: [], dataIssues: [] },
    sourceMetadata: { routeSourceIds: [], routeSources: [], routeTypeSource: 'amap', weatherSource: 'Open-Meteo', checkedAt: '2026-08-08T00:00:00.000Z' },
  })
  assertExactBase(place, 'place-only')
  assert.deepEqual(createAdviceContext(place).weatherSummary.days[0].tempMin, 0)

  const blocked = fullBase({
    routeSnapshot: { entityKind: 'route_variant', capability: 'blocked', canonicalName: '禁行线', region: '测试地区', routeType: 'trek', fixedDays: null, restriction: { reason: '官方禁行' } },
    weatherSnapshot: null,
    deterministicResult: { verdict: 'no_go', dataStatus: 'complete', reasons: [{ code: 'official_route_blocked', severity: 'no_go' }], dataIssues: [] },
    minimumGear: { essential: [], recommended: [], optional: [] },
    deterministicSafety: { fatalRisks: ['官方禁行'], ruleNotes: ['该路线存在官方禁行记录'] },
  })
  assertExactBase(blocked, 'blocked')
  assert.equal(createAdviceContext(blocked).weatherSummary, null)

  assert.throws(() => createAdviceContext({ ...full, schemaVersion: 'beta_base_v1' }), /beta_base_v2/)
  assert.throws(() => createAdviceContext({ ...full, weather: { forged: true } }), /beta_base_v2/)
  const deletedSafety = { ...full }
  delete deletedSafety.deterministicSafety
  assert.throws(() => createAdviceContext(deletedSafety), /beta_base_v2/)
  console.log('PASS: I24a structured advice-context adapter contract')
}

try { main() } catch (error) { console.error('FAIL: ' + error.message); process.exitCode = 1 }
