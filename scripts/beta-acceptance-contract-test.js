/** I24b deterministic five-pilot public-pipeline acceptance contract. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {
  PILOTS,
  TEST_DATE,
  TEST_NOW,
  TEST_START_TIME,
  clone,
  createHarness,
} = require('./fixtures/beta-acceptance')

const BASE_KEYS = [
  'schemaVersion',
  'requestSummary',
  'routeSnapshot',
  'weatherSnapshot',
  'deterministicResult',
  'minimumGear',
  'deterministicSafety',
  'sourceMetadata',
]
const ADVICE_KEYS = ['gear', 'risks', 'notes', 'disclaimer', 'meta']
const SOURCE_FIELDS = ['id', 'tier', 'kind', 'title', 'publisher', 'url', 'checkedAt']
const QUERY_ID_PATTERN = /^tctx_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

function counterDelta(before, after, field) {
  return after[field] - before[field]
}

function expectNoSideEffects(before, after, label) {
  assert.deepEqual(after, before, `${label}: fuzzy/early response must not perform side effects`)
}

function assertBaseShape(response, label) {
  assert.equal(response.phase, 'base', `${label}: expected base response`)
  assert.equal(response.ok, true, `${label}: base response must be ok`)
  assert.match(response.queryId, QUERY_ID_PATTERN, `${label}: queryId must be server generated`)
  assert.equal(typeof response.expiresAt, 'string', `${label}: expiresAt must be server generated`)
  assert.deepEqual(Object.keys(response.data).sort(), BASE_KEYS.slice().sort(), `${label}: exact beta_base_v2 keys`)
  assert.equal(response.data.schemaVersion, 'beta_base_v2')
  assert.ok(response.data.routeSnapshot && response.data.deterministicResult)
  assert.ok(response.data.minimumGear && response.data.deterministicSafety)
  assert.ok(response.data.sourceMetadata)
}

function assertRouteSources(metadata, expected, label) {
  assert.deepEqual(metadata.routeSourceIds, expected.sourceIds.slice().sort(), `${label}: route source IDs`)
  assert.deepEqual(metadata.routeSources.map((source) => source.id), expected.sourceIds.slice().sort(), `${label}: display-safe source IDs`)
  for (const [index, source] of metadata.routeSources.entries()) {
    assert.deepEqual(Object.keys(source).sort(), SOURCE_FIELDS.slice().sort(), `${label}: route source ${index} exact seven fields`)
    assert.deepEqual(source, expected.sourceDtos[index], `${label}: route source ${index} exact DTO values`)
    assert.equal(Object.hasOwn(source, 'supports'), false, `${label}: source supports must stay internal`)
  }
}

function assertWeatherAlignment(response, expected, label) {
  const route = response.data.routeSnapshot
  const weather = response.data.weatherSnapshot
  assert.equal(weather.evaluatedWindows.length, expected.fixedDays, `${label}: weather windows match fixed days`)
  for (const [index, stage] of route.stages.entries()) {
    const window = weather.evaluatedWindows[index]
    assert.equal(window.day, stage.day, `${label}: stage/window day alignment ${index + 1}`)
    assert.deepEqual(window.samples.map((sample) => sample.samplePointId), stage.weatherSamplePointIds, `${label}: stage/window sample IDs ${index + 1}`)
    assert.ok(window.samples.length > 0, `${label}: evaluated window ${index + 1} has samples`)
    for (const sample of window.samples) {
      assert.ok(sample.hours.length > 0, `${label}: sample ${sample.samplePointId} has non-empty hours`)
      for (const hour of sample.hours) {
        assert.ok(hour.bucketStartLocal >= window.startLocal && hour.bucketStartLocal < window.endLocalExclusive, `${label}: hour starts inside active window`)
        assert.ok(hour.bucketEndLocal > hour.bucketStartLocal, `${label}: hour bucket is ordered`)
      }
    }
  }
}

function assertDistinctWeatherRequests(response, actualRequestCount, label) {
  const distinctSampleIds = new Set(response.data.routeSnapshot.stages.flatMap((stage) => stage.weatherSamplePointIds))
  assert.equal(actualRequestCount, distinctSampleIds.size, `${label}: one hourly request per distinct stage sample`)
}

function assertPilotResult(response, expected, label) {
  assertBaseShape(response, label)
  const { routeSnapshot: route, weatherSnapshot: weather, deterministicResult: deterministic, minimumGear: gear, sourceMetadata: metadata } = response.data
  assert.equal(route.routeVariantId, expected.id, `${label}: permanent route variant ID`)
  assert.equal(route.canonicalName, expected.canonicalName, `${label}: canonical name`)
  assert.equal(route.entityKind, 'route_variant', `${label}: entity kind`)
  assert.equal(route.capability, expected.capability, `${label}: capability`)
  assert.equal(route.routeType, expected.routeType, `${label}: trusted route type`)
  assert.equal(route.fixedDays, expected.fixedDays, `${label}: trusted fixed days`)
  assert.equal(route.verificationLevel, expected.verificationLevel, `${label}: verification level`)
  assert.equal(route.operationalStatus, expected.operationalStatus, `${label}: operational status`)
  assert.equal(route.sourceCheckedAt, expected.sourceCheckedAt, `${label}: source checked date`)
  assert.equal(route.stages.length, expected.fixedDays, `${label}: route stages match fixed days`)
  assert.equal(metadata.routeTypeSource, 'builtin', `${label}: trusted catalog type source`)
  assert.equal(metadata.weatherSource, 'Open-Meteo', `${label}: weather source`)
  assertRouteSources(metadata, expected, label)
  assert.ok(weather && weather.dataStatus === 'complete', `${label}: full pilot must have complete hourly weather`)
  assert.equal(weather.timezone, 'Asia/Shanghai', `${label}: weather timezone`)
  assert.equal(weather.evaluatedWindows.length, expected.fixedDays, `${label}: weather windows follow route days`)
  assertWeatherAlignment(response, expected, label)
  assert.equal(deterministic.dataStatus, 'complete', `${label}: deterministic data status`)
  assert.ok(['go', 'caution', 'no_go'].includes(deterministic.verdict), `${label}: deterministic verdict is explicit`)
  assert.ok(Array.isArray(gear.essential) && Array.isArray(gear.recommended) && Array.isArray(gear.optional), `${label}: minimum gear categories`)
  assert.deepEqual(response.data.deterministicSafety, {
    fatalRisks: response.data.deterministicSafety.fatalRisks,
    ruleNotes: response.data.deterministicSafety.ruleNotes,
  }, `${label}: structured deterministic safety`)
}

function assertIndependentMutations(response, expected, label) {
  const mutations = [
    ['id', (route) => { route.routeVariantId = `${route.routeVariantId}:mutated` }],
    ['fixedDays', (route) => { route.fixedDays += 1 }],
    ['routeType', (route) => { route.routeType = route.routeType === 'trek' ? 'climb' : 'trek' }],
    ['capability', (route) => { route.capability = 'place_only' }],
  ]
  for (const [field, mutate] of mutations) {
    const changed = clone(response)
    mutate(changed.data.routeSnapshot)
    assert.throws(() => assertPilotResult(changed, expected, label + ` mutation:${field}`), `${label} ${field} mutation must be detected`)
  }
}

function assertWeatherAndRequestMutations(response, expected, actualRequestCount, label) {
  const missingStageSample = clone(response)
  missingStageSample.data.routeSnapshot.stages[0].weatherSamplePointIds[0] = 'sample:missing'
  assert.throws(
    () => assertWeatherAlignment(missingStageSample, expected, `${label} mutation:missing-stage-sample`),
    `${label}: missing stage sample must be detected`,
  )

  const replacedWindowSample = clone(response)
  replacedWindowSample.data.weatherSnapshot.evaluatedWindows[0].samples[0].samplePointId = 'sample:replaced'
  assert.throws(
    () => assertWeatherAlignment(replacedWindowSample, expected, `${label} mutation:replaced-window-sample`),
    `${label}: replaced window sample must be detected`,
  )

  const emptyHours = clone(response)
  emptyHours.data.weatherSnapshot.evaluatedWindows[0].samples[0].hours = []
  assert.throws(
    () => assertWeatherAlignment(emptyHours, expected, `${label} mutation:empty-hours`),
    `${label}: empty sample hours must be detected`,
  )

  const outsideHours = clone(response)
  outsideHours.data.weatherSnapshot.evaluatedWindows[0].samples[0].hours[0].bucketStartLocal = '1999-01-01T00:00'
  assert.throws(
    () => assertWeatherAlignment(outsideHours, expected, `${label} mutation:out-of-window-hour`),
    `${label}: out-of-window hours must be detected`,
  )

  assert.throws(
    () => assertDistinctWeatherRequests(response, actualRequestCount + 1, `${label} mutation:request-count`),
    `${label}: request-count mismatch must be detected`,
  )
}

function requestForPilot(pilot, route = pilot.search) {
  return {
    mode: 'prepare',
    route,
    date: TEST_DATE,
    startTimeLocal: TEST_START_TIME,
    level: '中级',
    // Full variants ignore this client value and use the trusted fixedDays.
    days: 99,
    ...(pilot.routeType === 'climb' ? { climbSupport: 'experienced_team' } : {}),
  }
}

async function assertFivePilots(harness) {
  const bases = []
  for (const pilot of PILOTS) {
    const prepared = []
    for (const [label, route] of [['name', pilot.name], ['alias', pilot.alias]]) {
      const before = harness.counters()
      const base = await harness.getAdvice.main(requestForPilot(pilot, route))
      const after = harness.counters()
      const requestLabel = `${pilot.id} ${label} prepare`
      assertPilotResult(base, pilot, requestLabel)
      const requestCount = counterDelta(before, after, 'hourlyWeatherRequests')
      assertDistinctWeatherRequests(base, requestCount, requestLabel)
      assert.ok(harness.records.has(base.queryId), `${requestLabel}: TripContext must be persisted server-side`)
      assert.deepEqual(harness.records.get(base.queryId).snapshot, base.data, `${requestLabel}: persisted snapshot must equal response`)
      if (label === 'name') {
        assertIndependentMutations(base, pilot, requestLabel)
        assertWeatherAndRequestMutations(base, pilot, requestCount, requestLabel)
      }
      prepared.push(base)
    }

    const confirmBefore = harness.counters()
    const confirmed = await harness.getAdvice.main({
      mode: 'confirm',
      candidateId: pilot.id,
      route: '客户端伪造',
      date: TEST_DATE,
      startTimeLocal: TEST_START_TIME,
      level: '中级',
      days: 1,
      routeType: pilot.routeType === 'climb' ? 'trek' : 'climb',
      ...(pilot.routeType === 'climb' ? { climbSupport: 'experienced_team' } : {}),
    })
    const confirmAfter = harness.counters()
    const confirmLabel = `${pilot.id} permanent-ID confirm`
    assertPilotResult(confirmed, pilot, confirmLabel)
    assertDistinctWeatherRequests(confirmed, counterDelta(confirmBefore, confirmAfter, 'hourlyWeatherRequests'), confirmLabel)
    assert.equal(confirmed.data.routeSnapshot.routeVariantId, pilot.id, `${confirmLabel}: own permanent ID only`)

    const stale = await harness.getAdvice.main({
      mode: 'confirm',
      candidateId: `${pilot.id}:mutated`,
      date: TEST_DATE,
      startTimeLocal: TEST_START_TIME,
      level: '中级',
      days: pilot.fixedDays,
      ...(pilot.routeType === 'climb' ? { climbSupport: 'experienced_team' } : {}),
    })
    assert.equal(stale.phase, 'error', `${pilot.id}: mutated candidate must not resolve`)
    assert.equal(stale.code, 'route_not_found', `${pilot.id}: mutated candidate error`)
    bases.push({ pilot, response: prepared[0], aliasResponse: prepared[1], confirmed })
  }

  const climb = bases.find(({ pilot }) => pilot.routeType === 'climb')
  assert.ok(climb, 'one exact pilot must exercise climb')
  assert.ok(['caution', 'no_go'].includes(climb.response.data.deterministicResult.verdict), 'climb pilot must never be go')
  assert.equal(climb.response.data.requestSummary.climbSupport, 'experienced_team')
  return bases
}

async function assertConfirmationAndPlaceBoundaries(harness) {
  const beforeFuzzy = harness.counters()
  const fuzzy = await harness.getAdvice.main({
    mode: 'prepare', route: '蓝月谷云杉坪行', date: TEST_DATE,
    startTimeLocal: TEST_START_TIME, level: '中级', days: 1,
  })
  assert.equal(fuzzy.phase, 'confirmation')
  assert.equal(fuzzy.needsConfirm, true)
  assert.equal(fuzzy.candidates.length, 1)
  assert.equal(fuzzy.candidates[0].candidateId, PILOTS[2].id)
  expectNoSideEffects(beforeFuzzy, harness.counters(), 'fuzzy confirmation')

  const confirmed = await harness.getAdvice.main({
    mode: 'confirm', candidateId: PILOTS[0].id, route: '客户端伪造',
    date: TEST_DATE, startTimeLocal: TEST_START_TIME, level: '中级', days: 1, routeType: 'climb',
  })
  assertPilotResult(confirmed, PILOTS[0], 'candidate-ID confirm')
  assert.equal(confirmed.data.routeSnapshot.routeType, 'trek', 'confirm must use server candidate facts')
  assert.equal(confirmed.data.requestSummary.days, 2, 'confirm must use trusted fixed days')

  const manualRequiredBefore = harness.counters()
  const manualRequired = await harness.getAdvice.main({
    mode: 'prepare', route: '手动测试点', manualLat: 40.2, manualLon: 116.5,
    date: TEST_DATE, startTimeLocal: TEST_START_TIME, level: '中级', days: 1,
  })
  assert.equal(manualRequired.phase, 'route_type_required')
  assert.equal(manualRequired.data.resolutionKind, 'manual_place')
  expectNoSideEffects(manualRequiredBefore, harness.counters(), 'manual route type prompt')

  const manual = await harness.getAdvice.main({
    mode: 'prepare', route: '手动测试点', manualLat: 40.2, manualLon: 116.5, manualElevation: 120,
    routeType: 'trek', date: TEST_DATE, startTimeLocal: TEST_START_TIME, level: '中级', days: 1,
  })
  assertBaseShape(manual, 'manual place')
  assert.equal(manual.data.routeSnapshot.capability, 'place_only')
  assert.equal(manual.data.routeSnapshot.routeType, 'trek')
  assert.equal(manual.data.routeSnapshot.referenceElevationM, 120)
  assert.equal(manual.data.sourceMetadata.routeTypeSource, 'user')
  assert.deepEqual(manual.data.sourceMetadata.routeSourceIds, [])
  assert.equal(manual.data.deterministicResult.verdict, null)
  assert.equal(manual.data.deterministicResult.dataStatus, 'place_only')
  assert.ok(manual.data.weatherSnapshot && manual.data.weatherSnapshot.status === 'available')

  const amapRequired = await harness.getAdvice.main({
    mode: 'prepare', route: '外部测试点', date: TEST_DATE,
    startTimeLocal: TEST_START_TIME, level: '中级', days: 1,
  })
  assert.equal(amapRequired.phase, 'route_type_required')
  assert.equal(amapRequired.data.resolutionKind, 'amap_place')
  const amap = await harness.getAdvice.main({
    mode: 'prepare', route: '外部测试点', routeType: 'trek', date: TEST_DATE,
    startTimeLocal: TEST_START_TIME, level: '中级', days: 1,
  })
  assertBaseShape(amap, 'AMap place')
  assert.equal(amap.data.routeSnapshot.capability, 'place_only')
  assert.equal(amap.data.sourceMetadata.routeTypeSource, 'amap')
  assert.deepEqual(amap.data.sourceMetadata.routeSourceIds, [])
  assert.equal(amap.data.deterministicResult.verdict, null)
  assert.equal(amap.data.deterministicResult.dataStatus, 'place_only')
  assert.ok(harness.state.amapRequests >= 2, 'AMap fallback must be exercised offline')
}

async function assertBlockedAndInsufficient(harness) {
  const blockedBefore = harness.counters()
  const blocked = await harness.getAdvice.main({
    mode: 'prepare', route: '五台山大朝台', date: TEST_DATE,
    startTimeLocal: TEST_START_TIME, level: '中级', days: 7,
  })
  assertBaseShape(blocked, 'official Wutai blocked')
  assert.equal(blocked.data.routeSnapshot.capability, 'blocked')
  assert.equal(blocked.data.routeSnapshot.operationalStatus, 'blocked')
  assert.equal(blocked.data.routeSnapshot.verificationLevel, 'A')
  assert.equal(blocked.data.deterministicResult.verdict, 'no_go')
  assert.equal(blocked.data.weatherSnapshot, null)
  assert.equal(harness.counters().hourlyWeatherRequests, blockedBefore.hourlyWeatherRequests, 'blocked route must not request weather')
  assert.equal(harness.counters().referenceWeatherRequests, blockedBefore.referenceWeatherRequests, 'blocked route must not request reference weather')

  harness.state.weatherMode = 'insufficient'
  const insufficient = await harness.getAdvice.main({
    mode: 'prepare', route: PILOTS[1].search, date: TEST_DATE,
    startTimeLocal: TEST_START_TIME, level: '小白', days: 2, climbSupport: 'solo_or_unsure',
  })
  harness.state.weatherMode = 'complete'
  assertBaseShape(insufficient, 'insufficient climb')
  const insufficientWeather = insufficient.data.weatherSnapshot
  const insufficientDeterministic = insufficient.data.deterministicResult
  assert.equal(insufficientWeather.dataStatus, 'insufficient')
  assert.equal(insufficientDeterministic.dataStatus, 'insufficient')
  assert.equal(insufficientWeather.retryable, true, 'insufficient weather must be retryable')
  assert.ok(insufficientWeather.insufficientReasons.length > 0, 'insufficient weather must explain its reason')
  assert.ok(insufficientWeather.insufficientReasons.every((reason) => reason.code && reason.retryable === true), 'insufficient reasons must be retryable and coded')
  assert.equal(insufficientWeather.evaluatedWindows.filter((window) => Array.isArray(window.samples) && window.samples.length > 0).length, 0, 'insufficient weather must have zero partial windows')
  assert.equal(insufficientDeterministic.evaluatedWindows.filter((window) => Array.isArray(window.samples) && window.samples.length > 0).length, 0, 'deterministic result must have zero partial windows')
  assert.equal(insufficient.data.deterministicResult.verdict, 'no_go', 'independent hard climb block survives insufficient weather')
  assert.ok(insufficientDeterministic.reasons.some((reason) => reason.code === 'novice_climb_solo_or_unsure'))
}

function deterministicFacts(snapshot) {
  return clone({
    routeSnapshot: snapshot.routeSnapshot,
    weatherSnapshot: snapshot.weatherSnapshot,
    deterministicResult: snapshot.deterministicResult,
    minimumGear: snapshot.minimumGear,
    deterministicSafety: snapshot.deterministicSafety,
    sourceMetadata: snapshot.sourceMetadata,
  })
}

function includesGearItem(items, expectedItem) {
  return items.some((item) => item.item === expectedItem.item && item.reason === expectedItem.reason)
}

function assertDeterministicAdviceProjection(advice, base, label) {
  const deterministic = base.response.data
  for (const category of ['essential', 'recommended', 'optional']) {
    for (const item of deterministic.minimumGear[category]) {
      assert.equal(includesGearItem(advice.data.gear[category], item), true, `${label}: deterministic ${category} gear preserved`)
    }
  }
  for (const fatalRisk of deterministic.deterministicSafety.fatalRisks) {
    assert.equal(
      advice.data.risks.some((risk) => risk.risk === fatalRisk || risk.risk === `${fatalRisk}风险`),
      true,
      `${label}: deterministic fatal risk preserved`,
    )
  }
  for (const ruleNote of deterministic.deterministicSafety.ruleNotes) {
    assert.equal(advice.data.notes.includes(`规则提示：${ruleNote}`), true, `${label}: deterministic rule note preserved`)
  }
}

async function assertAdviceAndContextBoundaries(harness, base) {
  const trustedFacts = deterministicFacts(base.response.data)
  const adviceByMode = {}
  for (const mode of ['available', 'invalid', 'unavailable']) {
    harness.state.llmMode = mode
    const advice = await harness.getAdvice.main({
      mode: 'advice', queryId: base.response.queryId, route: '客户端伪造',
      baseData: {
        deterministicResult: { verdict: 'go', reasons: [{ code: '伪造风险' }] },
        weather: { verdict: 'go' },
        minimumGear: { essential: [{ item: '伪造装备', reason: '伪造' }] },
        deterministicSafety: { fatalRisks: ['伪造风险'], ruleNotes: ['伪造规则'] },
      },
    })
    assert.equal(advice.phase, 'advice', `AI ${mode} must return advice phase`)
    assert.deepEqual(Object.keys(advice.data).sort(), ADVICE_KEYS.slice().sort(), `AI ${mode} public DTO keyset`)
    assert.equal(advice.data.weather, undefined)
    assert.equal(advice.data.deterministicResult, undefined)
    assert.deepEqual(deterministicFacts(harness.records.get(base.response.queryId).snapshot), trustedFacts, `AI ${mode} cannot change trusted facts`)
    assertDeterministicAdviceProjection(advice, base, `AI ${mode}`)
    assert.equal(advice.data.gear.essential.some((item) => item.item === '伪造装备'), false, `AI ${mode} must ignore forged gear`)
    assert.equal(advice.data.risks.some((risk) => risk.risk === '伪造风险'), false, `AI ${mode} must ignore forged risks`)
    assert.equal(advice.data.notes.includes('伪造规则'), false, `AI ${mode} must ignore forged rule notes`)
    if (mode === 'available') assert.equal(advice.degraded, false)
    else assert.equal(advice.degraded, true)
    adviceByMode[mode] = advice
  }

  const missingGear = clone(adviceByMode.available)
  missingGear.data.gear.essential.shift()
  assert.throws(
    () => assertDeterministicAdviceProjection(missingGear, base, 'AI available mutation:lost-essential'),
    'lost deterministic essential gear must be detected',
  )
  const missingRisk = clone(adviceByMode.invalid)
  missingRisk.data.risks.shift()
  assert.throws(
    () => assertDeterministicAdviceProjection(missingRisk, base, 'AI invalid mutation:lost-fatal-risk'),
    'lost deterministic fatal risk must be detected',
  )
  if (base.response.data.deterministicSafety.ruleNotes.length > 0) {
    const missingNote = clone(adviceByMode.unavailable)
    missingNote.data.notes = missingNote.data.notes.filter((note) => !note.startsWith('规则提示：'))
    assert.throws(
      () => assertDeterministicAdviceProjection(missingNote, base, 'AI unavailable mutation:lost-rule-note'),
      'lost deterministic rule note must be detected',
    )
  }

  const beforeMissing = harness.counters().llmRequests
  const missing = await harness.getAdvice.main({ mode: 'advice', queryId: 'tctx_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', baseData: { deterministicResult: { verdict: 'go' } } })
  assert.equal(missing.phase, 'error')
  assert.equal(missing.code, 'query_context_unavailable')
  assert.equal(harness.counters().llmRequests, beforeMissing, 'missing context must not invoke LLM')

  const legacyId = 'tctx_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  harness.records.set(legacyId, {
    schemaVersion: 'trip_context_v1', _openid: harness.state.openid, queryId: legacyId,
    createdAt: TEST_NOW.toISOString(), expiresAt: new Date(TEST_NOW.getTime() + 1800000).toISOString(),
    snapshot: { schemaVersion: 'beta_base_v1' },
  })
  const beforeLegacy = harness.counters().llmRequests
  const legacy = await harness.getAdvice.main({ mode: 'advice', queryId: legacyId })
  assert.equal(legacy.phase, 'error')
  assert.equal(legacy.code, 'query_context_unavailable')
  assert.equal(harness.counters().llmRequests, beforeLegacy, 'legacy context must not invoke LLM')
}

async function assertHistoryBoundary(harness) {
  harness.setOpenid('history-user-a')
  const first = await harness.history.main({
    mode: 'save', route: '武功山反穿', date: TEST_DATE, days: 2, level: '中级',
    location: '江西省萍乡市', routeType: 'trek', routeTypeSource: 'builtin', saveAttemptId: 'beta-retry-1',
  })
  const repeated = await harness.history.main({
    mode: 'save', route: '伪造路线', date: TEST_DATE, days: 1, level: '老手', saveAttemptId: 'beta-retry-1',
  })
  assert.equal(first.ok, true)
  assert.deepEqual(repeated, { ok: true, id: first.id }, 'retry must return first history record')
  assert.equal(harness.state.historyAdds, 1, 'same saveAttemptId must not add twice')
  const listA = await harness.history.main({ mode: 'list' })
  assert.equal(listA.ok, true)
  assert.equal(listA.data.length, 1)
  assert.equal(listA.data[0].route, '武功山反穿')
  assert.equal(listA.data[0].routeTypeSource, 'builtin')
  assert.equal(Object.hasOwn(listA.data[0], 'saveAttemptId'), false)

  harness.setOpenid('history-user-b')
  const other = await harness.history.main({ mode: 'save', route: '四姑娘山二峰', date: TEST_DATE, saveAttemptId: 'beta-retry-1' })
  assert.equal(other.ok, true)
  assert.notEqual(other.id, first.id, 'same retry identity is openid scoped')
  assert.equal((await harness.history.main({ mode: 'list' })).data.length, 1)
  harness.setOpenid('history-user-a')
  assert.equal((await harness.history.main({ mode: 'list' })).data.length, 1)
  const ugc = await harness.history.main({ mode: 'saveRoute', route: '旧公共路线' })
  assert.equal(ugc.error, 'ugc_disabled')
}

function assertRecoverySeams() {
  const recovery = require('../taro-app/src/pages/index/recovery-model')
  const flowModel = require('../taro-app/src/pages/index/trip-flow')
  const resultPage = require('../taro-app/src/pages/index/result-page-model')
  const result = {
    routeSnapshot: { capability: 'full', canonicalName: '测试路线' },
    weatherSnapshot: { dataStatus: 'insufficient', insufficientReasons: [{ code: 'weather_unavailable', retryable: true }] },
    deterministicResult: { verdict: 'caution', dataStatus: 'insufficient', reasons: [{ code: 'weather' }], dataIssues: [] },
    minimumGear: { essential: [{ item: '头灯', reason: '照明' }], recommended: [], optional: [] },
    deterministicSafety: { fatalRisks: [], ruleNotes: [] },
    sourceMetadata: { routeSources: [] },
    requestSummary: { date: TEST_DATE, startTimeLocal: TEST_START_TIME, level: '中级', days: 1 },
    ai: { status: 'unavailable', notes: [] },
  }
  let flow = flowModel.createInitialTripFlow()
  flow = flowModel.reduceTripFlow(flow, { type: 'BEGIN_SEARCH' })
  flow = flowModel.reduceTripFlow(flow, { type: 'BASE_RECEIVED', token: flow.token, result, queryId: 'q-recovery' })
  flow = flowModel.reduceTripFlow(flow, { type: 'ADVICE_STARTED', token: flow.token })
  flow = flowModel.reduceTripFlow(flow, { type: 'ADVICE_FAILED', token: flow.token, result, error: { code: 'ai_unavailable', retryable: true } })
  assert.equal(recovery.isAdviceRetryEligible(flow), true)
  const adviceRetry = flowModel.reduceTripFlow(flow, { type: 'BEGIN_ADVICE_RETRY', token: flow.token })
  assert.equal(adviceRetry.status, 'advice_loading')
  assert.equal(adviceRetry.queryId, 'q-recovery')
  assert.equal(adviceRetry.result.deterministicResult.verdict, 'caution')

  const request = { operation: 'prepare', request: { route: '测试路线', date: TEST_DATE, level: '中级', days: 1 }, token: flow.token }
  assert.equal(recovery.isReprepareEligible(flow, { request, requestToken: flow.token }), true)
  const refreshing = flowModel.reduceTripFlow(flow, { type: 'BEGIN_REPREPARE', token: flow.token, requestToken: flow.token, request, result })
  assert.equal(refreshing.status, 'preparing')
  assert.equal(flowModel.selectTripFlowView(refreshing).refreshing, true)

  let slots = recovery.capturePendingBaseRequest(recovery.createRecoverySlots(), 'prepare', request.request, request.request, flow.token)
  slots = recovery.promoteBaseRequest(slots, flow.token)
  assert.equal(recovery.isWeatherRecoveryEligible(flow, slots), true)
  const saveIntent = recovery.createHistorySaveIntent({ payload: { mode: 'save', route: '测试路线' }, baseRef: 'base-1', saveAttemptId: 'save-fixed' })
  assert.equal(recovery.sameHistorySaveIdentity(saveIntent, { ...saveIntent }), true)
  assert.equal(recovery.canStartHistorySave(saveIntent), true)
  const failed = recovery.failHistorySave(recovery.startHistorySave(saveIntent))
  assert.equal(recovery.canStartHistorySave(failed), true, 'same frozen save intent remains retryable')

  const lifecycle = recovery.beginHistoryListRequest(recovery.createHistoryListLifecycle())
  const closed = recovery.closeHistoryList(lifecycle)
  assert.deepEqual(recovery.resolveHistoryList(closed, lifecycle.token, { ok: true, data: [{ id: 'stale' }] }), closed, 'stale history list callback must be ignored')
  const payload = resultPage.buildHistorySavePayload({
    params: { route: '测试路线', date: TEST_DATE, days: 1, level: '中级' },
    historyContext: { elevation: 100, location: '测试地区', coords: { lat: 1, lon: 2 }, routeType: 'trek', routeTypeSource: 'user' },
    resultData: { risks: [], degraded: true }, saveAttemptId: 'save-fixed',
  })
  assert.equal(payload.saveAttemptId, 'save-fixed')
  assert.equal(payload.routeTypeSource, 'user')
  const source = fs.readFileSync(path.join(__dirname, '../taro-app/src/pages/index/index.jsx'), 'utf8')
  const restoreStart = source.indexOf('onRestoreHistory = (record) =>')
  assert.ok(restoreStart >= 0, 'history restore action must remain explicit')
  const restoreSlice = source.slice(restoreStart, restoreStart + 1800)
  assert.equal(restoreSlice.includes('cloud.callFunction'), false, 'history prefill must have zero network intent')
  assert.equal(restoreSlice.includes('getAdvice'), false, 'history prefill must not restore trusted query')
}

async function main() {
  const harness = createHarness()
  try {
    const bases = await assertFivePilots(harness)
    await assertConfirmationAndPlaceBoundaries(harness)
    await assertBlockedAndInsufficient(harness)
    await assertAdviceAndContextBoundaries(harness, bases[1])
    await assertHistoryBoundary(harness)
    assertRecoverySeams()
    console.log('PASS: I24b five-pilot Beta acceptance contract')
  } finally {
    harness.restore()
  }
}

main().catch((error) => {
  console.error('FAIL: ' + error.message)
  process.exitCode = 1
})
