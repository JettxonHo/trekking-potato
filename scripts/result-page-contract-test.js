/** I22b structured result-page behavior contract. */
const assert = require('assert')
const fs = require('node:fs')
const path = require('node:path')

const {
  RESULT_CACHE_KEY,
  RESULT_CACHE_VERSION,
  applyChecklistLifecycleEvent,
  buildHistorySavePayload,
  buildResultPageModel,
  captureHistoryContext,
  checklistKey,
  conditionForWeatherCode,
  createChecklistLifecycle,
  isStructuredResult,
  historyResultForAdviceOutcome,
  mergeAdviceResult,
  normalizeCachedResult,
  toggleChecklist,
} = require('../taro-app/src/pages/index/result-page-model')

function source(id, tier, url) {
  return { id, tier, kind: tier === 'A' ? 'official' : 'community_track', title: `来源 ${id}`, publisher: '测试发布方', url, checkedAt: '2026-08-07' }
}

function hour(bucketStartLocal, weatherCode, values = {}) {
  return {
    bucketStartLocal,
    bucketEndLocal: bucketStartLocal.replace(':00', ':00').replace(/T(\d\d):00$/, (_, h) => `T${String(Number(h) + 1).padStart(2, '0')}:00`),
    temperatureC: values.temperatureC === undefined ? 0 : values.temperatureC,
    apparentTemperatureC: values.apparentTemperatureC === undefined ? 0 : values.apparentTemperatureC,
    precipitationProbabilityPct: values.precipitationProbabilityPct === undefined ? 0 : values.precipitationProbabilityPct,
    precipitationMm: values.precipitationMm === undefined ? 0 : values.precipitationMm,
    snowfallCm: values.snowfallCm === undefined ? 0 : values.snowfallCm,
    weatherCode,
    visibilityM: values.visibilityM === undefined ? 0 : values.visibilityM,
    windSpeedMs: values.windSpeedMs === undefined ? 0 : values.windSpeedMs,
    windGustMs: values.windGustMs === undefined ? 0 : values.windGustMs,
  }
}

function fullResult(overrides = {}) {
  return {
    requestSummary: { date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 2, climbSupport: null },
    routeSnapshot: {
      entityKind: 'route_variant', capability: 'full', canonicalName: '测试二日线', region: '测试地区', routeType: 'trek', fixedDays: 2,
      routeHighestPointElevationM: 0, verificationLevel: 'B', operationalStatus: 'unknown', sourceCheckedAt: '2026-08-07',
      stages: [{ day: 1, startPoint: '起点', endPoint: '营地' }, { day: 2, startPoint: '营地', endPoint: '终点' }],
    },
    weatherSnapshot: {
      ok: true, source: 'Open-Meteo', fetchedAt: '2026-08-08T00:00:00.000Z', timezone: 'Asia/Shanghai', dataStatus: 'complete',
      units: { temperatureC: '°C', windSpeedMs: 'm/s' },
      evaluatedWindows: [
        {
          day: 1, date: '2026-08-09', startLocal: '2026-08-09T08:00', endLocalExclusive: '2026-08-09T10:00',
          samples: [
            { samplePointId: 'a', samplePointName: '起点', elevationM: 0, hours: [hour('2026-08-09T08:00', 2), hour('2026-08-09T09:00', 66, { temperatureC: 1.5, apparentTemperatureC: -1, precipitationProbabilityPct: 25, precipitationMm: 0.5, snowfallCm: 0.2, visibilityM: 1234, windSpeedMs: 4.2, windGustMs: 8.4 })] },
            { samplePointId: 'b', samplePointName: '营地', elevationM: 1234, hours: [hour('2026-08-09T08:00', 85)] },
          ],
        },
        {
          day: 2, date: '2026-08-10', startLocal: '2026-08-10T08:00', endLocalExclusive: '2026-08-10T09:00',
          samples: [{ samplePointId: 'b', samplePointName: '营地', elevationM: 1234, hours: [hour('2026-08-10T08:00', 99)] }],
        },
      ],
    },
    deterministicResult: {
      verdict: 'go', dataStatus: 'complete',
      reasons: [{ code: 'first', severity: 'caution', message: '先出现的理由' }, { code: 'second', severity: 'no_go', message: '后出现的理由' }],
      dataIssues: [],
    },
    minimumGear: {
      essential: [{ item: '保暖层', reason: '最低要求' }],
      recommended: [{ item: '头灯', reason: '最低要求' }],
      optional: [{ item: '手套', reason: '最低要求' }],
    },
    deterministicSafety: { fatalRisks: ['雷暴'], ruleNotes: ['规则提示'] },
    sourceMetadata: {
      routeSourceIds: ['route-a', 'route-b'], routeSources: [source('route-a', 'A', 'https://example.com/a'), source('route-b', 'B', null)],
      routeTypeSource: 'builtin', weatherSource: 'Open-Meteo', checkedAt: '2026-08-08T00:00:00.000Z',
    },
    ai: { status: 'loading' },
    ...overrides,
  }
}

function placeResult(weatherSnapshot) {
  return {
    requestSummary: { date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1, climbSupport: null },
    routeSnapshot: { entityKind: 'place', capability: 'place_only', canonicalName: '测试地点', region: '测试地区', routeType: 'tour', fixedDays: null, referenceElevationM: 0, referenceCoordinate: { lat: 1, lon: 2, coordinateSystem: 'GCJ-02' }, routeHighestPointElevationM: null, verificationLevel: null, operationalStatus: null, sourceCheckedAt: null },
    weatherSnapshot,
    deterministicResult: { verdict: null, dataStatus: 'place_only', reasons: [], dataIssues: [{ code: 'place_only_route', retryable: false }] },
    minimumGear: { essential: [], recommended: [], optional: [] },
    deterministicSafety: { fatalRisks: [], ruleNotes: [] },
    sourceMetadata: { routeSourceIds: [], routeSources: [], routeTypeSource: 'amap', weatherSource: 'Open-Meteo', checkedAt: '2026-08-08T00:00:00.000Z' },
  }
}

function blockedResult() {
  return {
    requestSummary: { date: '2026-08-09', startTimeLocal: '08:00', level: '小白', days: null, climbSupport: null },
    routeSnapshot: { entityKind: 'route_variant', capability: 'blocked', canonicalName: '官方禁行线', region: '测试地区', routeType: 'trek', fixedDays: null, routeHighestPointElevationM: null, verificationLevel: 'A', operationalStatus: 'blocked', sourceCheckedAt: '2026-08-06', restriction: { reason: '官方禁行', scope: '全线', sourceIds: ['restriction-a'] } },
    weatherSnapshot: null,
    deterministicResult: { verdict: 'no_go', dataStatus: 'complete', reasons: [{ code: 'official_route_blocked', severity: 'no_go', message: '该路线存在官方禁行记录' }], dataIssues: [] },
    minimumGear: { essential: [], recommended: [], optional: [] },
    deterministicSafety: { fatalRisks: ['官方禁行'], ruleNotes: ['该路线存在官方禁行记录'] },
    sourceMetadata: { routeSourceIds: ['restriction-a'], routeSources: [source('restriction-a', 'A', null)], routeTypeSource: 'builtin', weatherSource: null, checkedAt: '2026-08-06T00:00:00.000Z' },
  }
}

function assertVerdictAndFullWeather() {
  const result = fullResult()
  const model = buildResultPageModel({ result, flowStatus: 'advice_loading' })
  assert.deepStrictEqual(model.verdict, { code: 'go', value: 'go', label: '建议出发', tone: 'positive', dataStatus: 'complete' })
  assert.equal(model.route.highestPointElevationM, 0, '路线最高点 0 不能被当作缺失')
  assert.equal(model.route.operationalStatusLabel, '开放状态待出发前核验')
  assert.equal(model.route.fixedDays, 2)
  assert.equal(model.weather.kind, 'hourly')
  assert.deepEqual(model.weather.days.map((day) => day.day), [1, 2])
  assert.deepEqual(model.weather.days[0].samples.map((sample) => sample.name), ['起点', '营地'])
  assert.deepEqual(model.weather.days[0].samples[0].hours.map((item) => item.localTime), ['2026-08-09T08:00', '2026-08-09T09:00'])
  const freezing = model.weather.days[0].samples[0].hours[1]
  assert.equal(freezing.condition, '冻雨')
  assert.equal(freezing.averageWindMs, 4.2)
  assert.equal(freezing.windGustMs, 8.4)
  assert.equal(freezing.visibilityM, 1234)
  assert.equal(model.weather.days[0].samples[0].hours[0].temperatureC, 0)
  assert.equal(model.weather.days[1].samples[0].hours[0].condition, '雷暴')
  assert.deepEqual(model.reasons.map((reason) => reason.code), ['first', 'second'], '确定性理由顺序必须保留')
  assert.equal(model.ai.status, 'loading', 'AI loading 只存在独立 ai 命名空间')
  assert.equal(model.sources.route[1].url, null, '社区来源 null URL 必须保持 null')
  assert.equal(model.sources.route[0].title, '来源 route-a')
  assert.equal(model.sources.weather.source, 'Open-Meteo')
}

function assertBoundariesAndDataIssues() {
  const insufficient = fullResult({
    weatherSnapshot: { ok: true, source: 'Open-Meteo', fetchedAt: '2026-08-08T00:00:00.000Z', timezone: 'Asia/Shanghai', dataStatus: 'insufficient', evaluatedWindows: [], insufficientReasons: [{ code: 'out_of_range', retryable: false }, { code: 'mystery_code', retryable: true }, { code: 'mystery_code', retryable: true }] },
    deterministicResult: { verdict: 'no_go', dataStatus: 'insufficient', reasons: [{ code: 'hard_stop', severity: 'no_go', message: '硬阻断' }], dataIssues: [{ code: 'out_of_range', retryable: false }] },
  })
  const model = buildResultPageModel({ result: insufficient, flowStatus: 'advice_loading' })
  assert.equal(model.verdict.label, '暂不建议', 'no_go + insufficient 仍必须显示暂不建议')
  assert.equal(model.verdict.dataStatus, 'insufficient')
  assert.equal(model.weather.kind, 'unavailable')
  assert.deepEqual(model.weather.days, [], 'insufficient 不得渲染部分小时读数')
  assert.deepEqual(model.dataIssues.map((issue) => issue.label), ['天气预报超出可用范围', '天气数据不足，暂无法判断'])
  assert.equal(model.reasons[0].message, '硬阻断')

  const place = buildResultPageModel({ result: placeResult({ status: 'available', scope: 'reference_point', source: 'Open-Meteo', data: { days: [{ date: '2026-08-09', tempMin: 0, tempMax: 0, precipProb: 0, windMs: 0 }] } }), flowStatus: 'complete' })
  assert.equal(place.verdict.label, '暂无法判断')
  assert.equal(place.weather.kind, 'reference')
  assert.equal(place.weather.notice, '地点参考天气，不代表完整路线天气')
  assert.equal(place.weather.days[0].tempMin, 0)
  assert.equal(place.route.scope, '地点参考（非完整路线）')

  const blocked = buildResultPageModel({ result: blockedResult(), flowStatus: 'complete' })
  assert.equal(blocked.verdict.label, '暂不建议')
  assert.equal(blocked.weather.kind, 'not_applicable')
  assert.equal(blocked.weather.notice, '官方禁行，本次未请求天气')
  assert.equal(blocked.route.operationalStatusLabel, '官方禁行')
  assert.equal(blocked.route.restriction.reason, '官方禁行')
}

function assertAdviceIsolationAndLifecycle() {
  const base = fullResult({ deterministicResult: { verdict: 'caution', dataStatus: 'complete', reasons: [{ code: 'base', severity: 'caution', message: '确定性提示' }], dataIssues: [] } })
  const merged = mergeAdviceResult(base, {
    verdict: 'go', weather: { forged: true }, photoTiming: { forged: true }, meta: { elevation: 99999 },
    gear: { essential: [{ item: 'AI 必备装备' }], recommended: [{ item: '头灯' }, { item: '望远镜' }, { item: '望远镜' }], optional: [{ item: '望远镜' }, { item: '雨罩' }] },
    risks: [{ risk: 'AI 解释风险', level: '高' }], notes: ['AI 说明'], disclaimer: 'AI 免责声明',
  }, false)
  const model = buildResultPageModel({ result: merged, flowStatus: 'complete' })
  assert.equal(model.verdict.code, 'caution')
  assert.equal(model.route.highestPointElevationM, 0)
  assert.equal(model.weather.kind, 'hourly')
  assert.deepEqual(model.ai.gear.recommended.map((item) => item.item), ['望远镜'])
  assert.deepEqual(model.ai.gear.optional.map((item) => item.item), ['雨罩'])
  assert.equal(model.ai.gear.recommended[0].label, 'AI 补充（非最低要求）')
  assert.deepEqual(model.ai.risks, [{ risk: 'AI 解释风险', level: '高' }])
  assert.deepEqual(model.ai.notes, ['AI 说明'])
  assert.equal(model.ai.disclaimer, 'AI 免责声明')

  const degraded = buildResultPageModel({ result: { ...base, ai: { status: 'unavailable', gear: { recommended: [{ item: '望远镜' }] } } }, flowStatus: 'degraded' })
  assert.equal(degraded.ai.status, 'unavailable')
  const expired = buildResultPageModel({ result: base, flowStatus: 'error', flowError: { code: 'query_context_unavailable' } })
  assert.equal(expired.ai.status, 'context_expired')
  assert.equal(expired.verdict.code, 'caution')
}

function assertCacheChecklistAndHistory() {
  assert.equal(RESULT_CACHE_KEY, 'trekking_last_result_v2')
  assert.equal(RESULT_CACHE_VERSION, 'structured-v1')
  const result = fullResult({ ai: { status: 'loading' } })
  assert.equal(isStructuredResult(result), true)
  const restored = normalizeCachedResult(result)
  assert.equal(restored.ai.status, 'unavailable', '缓存恢复不能继续显示无法恢复的 AI loading')
  assert.deepEqual(result.ai, { status: 'loading' }, '缓存归一化不得修改原对象')
  assert.equal(normalizeCachedResult({ route: 'legacy', meta: {} }), null, '旧 compatibility-only cache 必须失效')

  let checked = toggleChecklist({}, 'essential', 0)
  assert.equal(checked[checklistKey('essential', 0)], true)
  checked = toggleChecklist(checked, 'essential', 0)
  assert.equal(checked[checklistKey('essential', 0)], false)
  assert.deepEqual(toggleChecklist(checked, 'recommended', 1), { 'essential:0': false, 'recommended:1': true })

  function assertHistoryProjection(result, expected, label) {
    const context = captureHistoryContext(result)
    assert.deepEqual(context, expected, `${label} captureHistoryContext must preserve structured source facts`)
    assert.equal(Object.prototype.hasOwnProperty.call(context, 'meta'), false, `${label} history context must exclude meta`)
    const request = result.requestSummary
    const payload = buildHistorySavePayload({
      params: { route: result.routeSnapshot.canonicalName, date: request.date, days: request.days, level: request.level },
      historyContext: context,
      resultData: { risks: [{ risk: `${label}风险` }], degraded: false, meta: { routeTypeSource: 'builtin', elevation: 9999 } },
    })
    assert.equal(payload.elevation, expected.elevation, `${label} history payload elevation must use captured context`)
    assert.equal(payload.location, expected.location, `${label} history payload location must use captured context`)
    assert.deepEqual(payload.coords, expected.coords, `${label} history payload coords must use captured context`)
    assert.equal(payload.routeType, expected.routeType, `${label} history payload route type must use captured context`)
    assert.equal(payload.routeTypeSource, expected.routeTypeSource, `${label} history payload type source must use captured context`)
  }

  const full = fullResult()
  assertHistoryProjection(full, {
    elevation: 0, location: '测试地区', coords: null, routeType: 'trek', routeTypeSource: 'builtin',
  }, 'full')

  const place = placeResult({ status: 'available', scope: 'reference_point', source: 'Open-Meteo', data: { days: [] } })
  assertHistoryProjection(place, {
    elevation: 0, location: '测试地区', coords: { lat: 1, lon: 2, coordinateSystem: 'GCJ-02' }, routeType: 'tour', routeTypeSource: 'amap',
  }, 'place/amap')

  const catalogPlace = placeResult({ status: 'available', scope: 'reference_point', source: 'Open-Meteo', data: { days: [] } })
  catalogPlace.sourceMetadata = { ...catalogPlace.sourceMetadata, routeTypeSource: 'user' }
  assertHistoryProjection(catalogPlace, {
    elevation: 0, location: '测试地区', coords: { lat: 1, lon: 2, coordinateSystem: 'GCJ-02' }, routeType: 'tour', routeTypeSource: 'user',
  }, 'place/catalog')

  const manual = placeResult({ status: 'available', scope: 'reference_point', source: 'Open-Meteo', data: { days: [] } })
  manual.routeSnapshot = {
    ...manual.routeSnapshot,
    canonicalName: '手动地点',
    routeType: 'trek',
    referenceElevationM: -20,
    referenceCoordinate: { lat: 3, lon: 4, coordinateSystem: 'GCJ-02' },
  }
  manual.sourceMetadata = { ...manual.sourceMetadata, routeTypeSource: 'user' }
  assertHistoryProjection(manual, {
    elevation: -20, location: '测试地区', coords: { lat: 3, lon: 4, coordinateSystem: 'GCJ-02' }, routeType: 'trek', routeTypeSource: 'user',
  }, 'manual/user')

  const blocked = blockedResult()
  assertHistoryProjection(blocked, {
    elevation: null, location: '测试地区', coords: null, routeType: 'trek', routeTypeSource: 'builtin',
  }, 'blocked')

  const isolated = captureHistoryContext({ routeSnapshot: { capability: 'place_only', region: '测试地区', referenceElevationM: 0, referenceCoordinate: { lat: 1, lon: 2 }, routeType: 'trek' }, sourceMetadata: { routeTypeSource: 'builtin' }, meta: { elevation: 9999 } })
  isolated.coords.lat = 99
  assert.equal(isolated.coords.lat, 99, 'captured coordinates remain an independent copy')
}

function assertLifecycleAndHistoryOrchestration() {
  const baseA = { id: 'base-a' }
  const baseB = { id: 'base-b' }
  let lifecycle = createChecklistLifecycle()
  lifecycle = applyChecklistLifecycleEvent(lifecycle, { type: 'base_received', queryId: 'query-a', baseRef: baseA })
  lifecycle.checked = toggleChecklist(lifecycle.checked, 'essential', 0)

  for (const type of ['advice_started', 'advice_succeeded', 'advice_failed', 'context_unavailable']) {
    lifecycle = applyChecklistLifecycleEvent(lifecycle, { type })
  }
  assert.equal(lifecycle.checked['essential:0'], true, '同一 base/query 的 advice 生命周期不得清 checklist')

  lifecycle = applyChecklistLifecycleEvent(lifecycle, { type: 'advice_succeeded', resultRef: { id: 'new-result-object' } })
  assert.equal(lifecycle.checked['essential:0'], true, '同一 base/query 的 advice 新 result 对象不得清 checklist')

  lifecycle = applyChecklistLifecycleEvent(lifecycle, { type: 'base_received', queryId: 'query-a', baseRef: baseB })
  assert.deepEqual(lifecycle.checked, {}, 'different base 必须清 checklist')
  lifecycle.checked = toggleChecklist(lifecycle.checked, 'recommended', 1)
  lifecycle = applyChecklistLifecycleEvent(lifecycle, { type: 'base_received', queryId: 'query-b', baseRef: baseB })
  assert.deepEqual(lifecycle.checked, {}, 'different queryId 必须清 checklist')
  lifecycle.checked = toggleChecklist(lifecycle.checked, 'optional', 2)
  lifecycle = applyChecklistLifecycleEvent(lifecycle, { type: 'return_to_search' })
  assert.deepEqual(lifecycle.checked, {}, 'onBack/return-to-search 必须清 checklist')
  lifecycle.checked = toggleChecklist(lifecycle.checked, 'essential', 3)
  lifecycle = applyChecklistLifecycleEvent(lifecycle, { type: 'cache_restore' })
  assert.deepEqual(lifecycle.checked, {}, 'cache restore 必须从未勾选开始')

  const trustedContext = {
    elevation: 0,
    location: '可信地点',
    coords: { lat: 1, lon: 2 },
    routeType: 'trek',
    routeTypeSource: 'builtin',
  }
  const params = { route: '可信路线', date: '2026-08-09', days: 2, level: '中级' }
  const successResult = historyResultForAdviceOutcome('success', {
    adviceData: { risks: [{ risk: 'AI 解释风险' }], meta: { elevation: 99999 } },
    degraded: false,
  })
  const degradedResult = historyResultForAdviceOutcome('degraded', {
    baseRisks: [{ risk: '规则风险' }],
  })
  const contextUnavailableResult = historyResultForAdviceOutcome('context_unavailable', {
    adviceData: { risks: [{ risk: '不应保存' }] },
  })
  assert.equal([successResult, degradedResult, contextUnavailableResult].filter(Boolean).length, 2, 'success 与普通 degraded 各产生一次保存意图，context unavailable 零保存')
  assert.equal(successResult.degraded, false)
  assert.equal(degradedResult.degraded, true)
  assert.equal(contextUnavailableResult, null)

  const payload = buildHistorySavePayload({
    params,
    historyContext: { ...trustedContext, meta: { elevation: 99999, routeType: 'climb' } },
    resultData: { ...successResult, meta: { elevation: 99999, location: '伪造地点', routeType: 'climb' } },
  })
  assert.deepEqual(payload, {
    mode: 'save',
    route: '可信路线',
    date: '2026-08-09',
    days: 2,
    level: '中级',
    elevation: 0,
    location: '可信地点',
    coords: { lat: 1, lon: 2 },
    routeType: 'trek',
    routeTypeSource: 'builtin',
    summary: 'AI 解释风险',
    degraded: false,
  }, '实际 history DTO 只能来自捕获的五字段，advice/meta 不得改写')
}

function assertWmoGroups() {
  assert.equal(conditionForWeatherCode(0), '晴')
  assert.equal(conditionForWeatherCode(2), '多云')
  assert.equal(conditionForWeatherCode(57), '冻毛毛雨')
  assert.equal(conditionForWeatherCode(67), '冻雨')
  assert.equal(conditionForWeatherCode(75), '雪')
  assert.equal(conditionForWeatherCode(82), '阵雨')
  assert.equal(conditionForWeatherCode(86), '阵雪')
  assert.equal(conditionForWeatherCode(99), '雷暴')
  assert.equal(conditionForWeatherCode(97), '雷暴')
  assert.equal(conditionForWeatherCode(999), '天气现象待确认')
}

function extractFunctionSource(source, name) {
  const marker = `function ${name}`
  const start = source.indexOf(marker)
  if (start < 0) return ''
  const braceStart = source.indexOf('{', start)
  if (braceStart < 0) return ''
  let depth = 0
  for (let index = braceStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(start, index + 1)
    }
  }
  return ''
}

function extractMethodSource(source, marker) {
  const start = source.indexOf(marker)
  if (start < 0) return ''
  const braceStart = source.indexOf('{', start)
  if (braceStart < 0) return ''
  let depth = 0
  for (let index = braceStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(start, index + 1)
    }
  }
  return ''
}

function evaluateFunction(source, name) {
  const functionSource = extractFunctionSource(source, name)
  assert.ok(functionSource, `${name} must be executable from the page source`)
  return new Function(`return (${functionSource})`)()
}

function evaluateFunctionWithArgs(source, name, args) {
  const functionSource = extractFunctionSource(source, name)
  assert.ok(functionSource, `${name} must be executable from the page source`)
  return new Function(...Object.keys(args), `return (${functionSource})`)(...Object.values(args))
}

function assertAiDisplayProjection(page) {
  const stripAiDisplayPrefix = evaluateFunction(page, 'stripAiDisplayPrefix')
  const cases = [
    ['item', 'AI 补充（非最低要求）：防风层', '防风层'],
    ['reason', 'AI 说明：低温时保暖层更重要', '低温时保暖层更重要'],
    ['risk', 'AI 说明：雷暴风险解释', '雷暴风险解释'],
    ['note', 'AI 说明：建议出发前复核', '建议出发前复核'],
    ['disclaimer', 'AI 补充（非最低要求）：仅供参考', '仅供参考'],
  ]
  cases.forEach(([kind, prefixed, substantive]) => {
    assert.equal(stripAiDisplayPrefix(prefixed), substantive, `${kind} prefix must be removed`)
    assert.equal(stripAiDisplayPrefix(substantive), substantive, `${kind} substantive content must remain unchanged`)
  })
  const emptyMutation = page.replace(/  return text\.replace\([^\n]+/, "  return ''")
  assert.notEqual(emptyMutation, page, 'empty prefix mutation must change source')
  assert.throws(() => assertAiDisplayProjection(emptyMutation), undefined, 'empty prefix mutation must turn the focused oracle RED')
}

function assertWeatherDisclosureProjection(page) {
  const formatWeatherHourLabel = evaluateFunction(page, 'formatWeatherHourLabel')
  const buildWeatherSampleDisclosure = (sample) => evaluateFunctionWithArgs(page, 'buildWeatherSampleDisclosure', { formatWeatherHourLabel })(sample)
  const disclosure = buildWeatherSampleDisclosure({
    hours: [
      { localTime: '2026-08-09T08:00', endLocal: '2026-08-09T09:00' },
      { localTime: '2026-08-09T09:00', endLocal: '2026-08-09T10:00' },
    ],
  })
  assert.deepEqual(disclosure, { firstHour: '08:00', lastHour: '10:00', hourCount: 2 })
  assert.equal(`${disclosure.firstHour}—${disclosure.lastHour}·${disclosure.hourCount}小时`, '08:00—10:00·2小时')
  const lastHourMutation = page.replace(/const lastHour =[^\n]*/, "const lastHour = ''")
  assert.notEqual(lastHourMutation, page, 'lastHour mutation must change source')
  assert.throws(() => assertWeatherDisclosureProjection(lastHourMutation), undefined, 'lastHour empty mutation must turn the header oracle RED')
}

function assertToggleIsolation(page) {
  const toggle = extractMethodSource(page, '  onWeatherSampleToggle = (sampleKey) => {')
  assert.ok(toggle, 'weather toggle method must remain present')
  assert.doesNotMatch(toggle, /_saveCache|tripFlow|result|CACHE_KEY|Taro\./, 'weather toggle must stay page-local and data-inert')
  const cacheMutation = page.replace(
    '  onWeatherSampleToggle = (sampleKey) => {',
    '  onWeatherSampleToggle = (sampleKey) => {\n    this._saveCache()\n',
  )
  assert.notEqual(cacheMutation, page, 'toggle cache mutation must change source')
  assert.throws(() => assertToggleIsolation(cacheMutation), undefined, 'toggle cache mutation must turn the focused contract RED')
}

function assertDisclosureResetSeams(page) {
  const clearResult = extractMethodSource(page, '  _clearResultLocalState() {')
  const showBase = extractMethodSource(page, '  _showBaseAndFetchAdvice(base, queryId, params, generation) {')
  assert.match(clearResult, /this\.setState\(\{ weatherDisclosure: \{\} \}\)/, 'return-to-search must reset disclosure state')
  assert.match(showBase, /this\.setState\(\{ weatherDisclosure: \{\} \}\)/, 'new base result must reset disclosure state')
  const clearMutation = page.replace('    this.setState({ weatherDisclosure: {} })', '    // disclosure reset removed')
  assert.notEqual(clearMutation, page, 'clear-result reset mutation must change source')
  assert.throws(() => assertDisclosureResetSeams(clearMutation), undefined, 'clear-result reset removal must turn the focused contract RED')
  const showBaseNeedle = '    this.setState({ historySaveError: null })\n    this.setState({ weatherDisclosure: {} })'
  const showBaseMutation = page.replace(showBaseNeedle, '    this.setState({ historySaveError: null })')
  assert.notEqual(showBaseMutation, page, 'new-base reset mutation must change source')
  assert.throws(() => assertDisclosureResetSeams(showBaseMutation), undefined, 'new-base reset removal must turn the focused contract RED')
}

function resultPresentationContractForSources(page, css) {
  assert.match(page, /weatherDisclosure:\s*\{\}/, 'hourly disclosure state must start empty/default-collapsed')
  assert.match(page, /onWeatherSampleToggle = \(sampleKey\) => \{[\s\S]*weatherDisclosure:\s*\{[\s\S]*\.\.\.previous\.weatherDisclosure[\s\S]*\[sampleKey\]: !previous\.weatherDisclosure\[sampleKey\]/, 'weather disclosure toggling must be keyed per sample')
  assert.match(page, /function stripAiDisplayPrefix\(value\)/, 'AI display cleanup must be a page presentation helper')

  const resultStart = page.indexOf('    if (showResult && result)')
  assert.ok(resultStart >= 0, 'structured result render must remain present')
  const resultRender = page.slice(resultStart)
  assert.match(resultRender, /stripAiDisplayPrefix\(item\.label\)/, 'AI addition labels must not repeat the section prefix')
  assert.match(resultRender, /stripAiDisplayPrefix\(risk\.(?:risk|message)/, 'AI risk lines must use display-prefix cleanup')
  assert.match(resultRender, /aiModel\.notes\.map\([\s\S]*stripAiDisplayPrefix\(note\)/, 'AI notes must use display-prefix cleanup')
  assert.match(resultRender, /stripAiDisplayPrefix\(aiModel\.disclaimer\)/, 'AI disclaimer must preserve content without a repeated prefix')
  assert.doesNotMatch(resultRender, /\{item\.label\}：/, 'raw repeated AI addition label must not render directly')

  assert.match(resultRender, /const sampleKey = `\$\{day\.day\}-\$\{sample\.samplePointId\}`/, 'each weather sample needs a stable page-local key')
  assert.match(resultRender, /const expanded = weatherDisclosure\[sampleKey\] === true/, 'weather samples must be collapsed unless explicitly opened')
  assert.match(resultRender, /<View className="weather-sample-toggle" role="button" aria-expanded=\{expanded\} onClick=\{\(\) => this\.onWeatherSampleToggle\(sampleKey\)\}>/, 'weather header must expose expanded state and its own toggle')
  assert.match(resultRender, /(?:sample\.hours\.length|hourCount)/, 'weather header must show the existing hour count')
  assert.match(resultRender, /firstHour[\s\S]*lastHour/, 'weather header must show the existing hour range')
  assert.match(resultRender, /expanded && sample\.hours\.map/, 'hourly rows must only render for the expanded sample')
  assert.match(resultRender, /sample-disclosure-affordance/, 'weather header must include a clear expand/collapse affordance')
  assert.match(css, /\.weather-sample-toggle\s*\{[^}]*min-height:\s*88rpx/, 'weather toggle target must be at least 88rpx tall')
  assert.match(css, /\.weather-sample-toggle\s*\{[^}]*display:\s*flex/, 'weather toggle target must have an explicit layout')
  assertAiDisplayProjection(page)
  assertWeatherDisclosureProjection(page)
  assertToggleIsolation(page)
  assertDisclosureResetSeams(page)

  const prefixMutation = page.replaceAll('stripAiDisplayPrefix(item.label)', 'item.label')
  assert.notEqual(prefixMutation, page, 'prefix restoration mutation must change page source')
  assert.throws(() => resultPresentationContractForSources(prefixMutation, css), undefined, 'prefix restoration must turn the focused contract RED')

  const defaultOpenMutation = page.replace('weatherDisclosure[sampleKey] === true', 'weatherDisclosure[sampleKey] !== false')
  assert.notEqual(defaultOpenMutation, page, 'default-open mutation must change page source')
  assert.throws(() => resultPresentationContractForSources(defaultOpenMutation, css), undefined, 'default-open mutation must turn the focused contract RED')

  const sharedToggleMutation = page.replace('this.onWeatherSampleToggle(sampleKey)', "this.onWeatherSampleToggle('weather')")
  assert.notEqual(sharedToggleMutation, page, 'shared-toggle mutation must change page source')
  assert.throws(() => resultPresentationContractForSources(sharedToggleMutation, css), undefined, 'shared-toggle mutation must turn the focused contract RED')

  const missingHandlerMutation = page.replace('onClick={() => this.onWeatherSampleToggle(sampleKey)}', 'onClick={() => {}}')
  assert.notEqual(missingHandlerMutation, page, 'missing-toggle-handler mutation must change page source')
  assert.throws(() => resultPresentationContractForSources(missingHandlerMutation, css), undefined, 'missing-toggle-handler must turn the focused contract RED')
}

function resultPresentationContract() {
  const root = path.join(__dirname, '../taro-app/src/pages/index')
  const page = fs.readFileSync(path.join(root, 'index.jsx'), 'utf8')
  const css = fs.readFileSync(path.join(root, 'index.css'), 'utf8')
  resultPresentationContractForSources(page, css)
}

assertVerdictAndFullWeather()
assertBoundariesAndDataIssues()
assertAdviceIsolationAndLifecycle()
assertCacheChecklistAndHistory()
assertLifecycleAndHistoryOrchestration()
assertWmoGroups()
resultPresentationContract()
console.log('PASS: I22b structured result-page contract')
