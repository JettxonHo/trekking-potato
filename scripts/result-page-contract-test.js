/** I22b structured result-page behavior contract. */
const assert = require('assert')
const fs = require('node:fs')
const path = require('node:path')
const { parse: parseBabel } = require('../taro-app/node_modules/@babel/parser')

const {
  RESULT_CACHE_KEY,
  RESULT_CACHE_VERSION,
  applyChecklistLifecycleEvent,
  buildRoutePreviewMapGeometry,
  buildHistorySavePayload,
  buildResultPageModel,
  captureHistoryContext,
  classifyRoutePreviewRegion,
  checklistKey,
  conditionForWeatherCode,
  convertRoutePreviewPointForMap,
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

function routePreview() {
  return {
    coordinateSystem: 'WGS84',
    bounds: { minLat: 30, maxLat: 30.1, minLon: 100, maxLon: 100.2 },
    segments: [{
      day: 1,
      points: [{ lat: 30, lon: 100 }, { lat: 30.1, lon: 100.2 }],
    }],
  }
}

function assertRoutePreviewProjection() {
  const preview = routePreview()
  const result = fullResult({
    routeSnapshot: { ...fullResult().routeSnapshot, routePreview: preview },
  })
  const model = buildResultPageModel({ result, flowStatus: 'complete' })
  assert.deepEqual(model.route.routePreview, preview, 'full route preview must project the exact safe shape')

  const weatherOnly = fullResult()
  weatherOnly.weatherSnapshot.evaluatedWindows[0].samples[0].requestCoordinate = { lat: 30, lon: 100 }
  const weatherModel = buildResultPageModel({ result: weatherOnly, flowStatus: 'complete' })
  assert.equal(weatherModel.route.routePreview, null, 'weather sample points must never become route preview geometry')

  const poisoned = fullResult({
    routeSnapshot: {
      ...fullResult().routeSnapshot,
      routePreview: {
        ...preview,
        segments: [{ ...preview.segments[0], points: [{ lat: 30, lon: 100, elevation: 2200 }, { lat: 30.1, lon: 100.2 }] }],
      },
    },
  })
  const poisonedModel = buildResultPageModel({ result: poisoned, flowStatus: 'complete' })
  assert.equal(poisonedModel.route.routePreview, null, 'preview projection must fail closed on leaky geometry')

  const placeWithPreview = placeResult({ status: 'available', scope: 'reference_point', source: 'Open-Meteo', data: { days: [] } })
  placeWithPreview.routeSnapshot.routePreview = preview
  const placeModel = buildResultPageModel({ result: placeWithPreview, flowStatus: 'complete' })
  assert.equal(placeModel.route.routePreview, null, 'place-only result must omit route preview')
}

function assertRoutePreviewCoordinateProjection() {
  const regionClassificationCases = [
    ['四川省', 'mainland'],
    ['四川省甘孜藏族自治州', 'mainland'],
    ['广东省深圳市', 'mainland'],
    ['中国大陆·四川', 'mainland'],
    ['香港', 'non_mainland'],
    ['澳门', 'non_mainland'],
    ['澳门特别行政区', 'non_mainland'],
    ['macau', 'non_mainland'],
    ['香港·广东', 'unknown'],
    ['尼泊尔·西藏边境', 'unknown'],
    ['hong kong', 'non_mainland'],
    ['HONG KONG', 'non_mainland'],
    ['日本山西县', 'unknown'],
    ['法国四川餐厅', 'unknown'],
    ['Sichuan Province', 'unknown'],
    ['川西', 'unknown'],
    ['', 'unknown'],
    [null, 'unknown'],
  ]
  regionClassificationCases.forEach(([region, expected]) => {
    assert.equal(classifyRoutePreviewRegion(region), expected, `${String(region)} must classify as ${expected}`)
  })
  const insideChinaWgs84 = convertRoutePreviewPointForMap({ lat: 30, lon: 100 }, 'WGS84', '四川省')
  assert.ok(insideChinaWgs84, 'inside-China WGS84 point must project to Map coordinates')
  assert.ok(Math.abs(insideChinaWgs84.latitude - 29.997260753139518) < 1e-12, 'mainland WGS84 latitude must use the bounded deterministic GCJ-02 offset')
  assert.ok(Math.abs(insideChinaWgs84.longitude - 100.00120973751072) < 1e-12, 'mainland WGS84 longitude must use the bounded deterministic GCJ-02 offset')

  const existingGcj02 = convertRoutePreviewPointForMap({ lat: 30, lon: 100 }, 'GCJ-02', '四川省')
  assert.deepEqual(existingGcj02, { latitude: 30, longitude: 100 }, 'GCJ-02 source geometry must remain unchanged')
  assert.equal(convertRoutePreviewPointForMap({ lat: 30, lon: 100 }, 'GCJ-02'), null, 'unknown region must fail closed even when source is already GCJ-02')

  const outsideMainland = [
    [{ lat: 27.7172, lon: 85.3240 }, '尼泊尔'],
    [{ lat: 47.8864, lon: 106.9057 }, '蒙古国'],
    [{ lat: 22.3193, lon: 114.1694 }, '香港特别行政区'],
    [{ lat: 22.1240825, lon: 113.5672684 }, '澳门'],
    [{ lat: 22.1240825, lon: 113.5672684 }, '澳门特别行政区'],
    [{ lat: 22.1240825, lon: 113.5672684 }, 'macau'],
  ]
  outsideMainland.forEach(([point, region]) => {
    assert.deepEqual(convertRoutePreviewPointForMap(point, 'WGS84', region), { latitude: point.lat, longitude: point.lon }, `${region} WGS84 coordinates must remain stable`)
  })
  assert.equal(buildRoutePreviewMapGeometry(routePreview()), null, 'WGS84 preview without a trusted mainland region must fail closed')
  assert.equal(buildRoutePreviewMapGeometry(routePreview(), '法国四川餐厅'), null, 'unknown route region must not produce Map geometry')
  for (const region of ['香港·广东', '尼泊尔·西藏边境']) {
    assert.equal(buildRoutePreviewMapGeometry(routePreview(), region), null, `${region} collision must not produce Map geometry`)
  }

  const mainlandEnd = { latitude: 30.097306205700363, longitude: 100.20125724049596 }
  const geometry = buildRoutePreviewMapGeometry(routePreview(), '四川省')
  assert.deepEqual(geometry.points[0], { latitude: 29.997260753139518, longitude: 100.00120973751072 }, 'every includePoints entry must use the converted mainland coordinate')
  assert.deepEqual(geometry.points[1], mainlandEnd, 'every includePoints entry must use the converted mainland end coordinate')
  assert.deepEqual(geometry.polylines[0].points[0], { latitude: 29.997260753139518, longitude: 100.00120973751072 }, 'every polyline point must use the converted mainland coordinate')
  assert.ok(Math.abs(geometry.center.latitude - 30.04728347941994) < 1e-12, 'map center latitude must use converted points')
  assert.ok(Math.abs(geometry.center.longitude - 100.10123348900333) < 1e-12, 'map center longitude must use converted points')
  assert.deepEqual(geometry.indicators[0], {
    latitude: 29.997260753139518,
    longitude: 100.00120973751072,
    radius: 36,
    color: '#1d1d1f',
    fillColor: '#1d1d1f66',
    strokeWidth: 3,
  }, 'start indicator must use the converted coordinate')
  assert.deepEqual(geometry.indicators[1], {
    latitude: mainlandEnd.latitude,
    longitude: mainlandEnd.longitude,
    radius: 36,
    color: '#34c759',
    fillColor: '#34c75966',
    strokeWidth: 3,
  }, 'end indicator must use the converted coordinate')

  const modelSource = fs.readFileSync(path.join(__dirname, '../taro-app/src/pages/index/result-page-model.js'), 'utf8')
  const loadModel = (source) => {
    const module = { exports: {} }
    new Function('module', 'exports', 'require', source)(module, module.exports, require)
    return module.exports
  }
  const assertMainlandOffsetOracle = (model) => {
    assert.deepEqual(model.convertRoutePreviewPointForMap({ lat: 30, lon: 100 }, 'WGS84', '四川省'), {
      latitude: 29.997260753139518,
      longitude: 100.00120973751072,
    }, 'mainland WGS84 conversion oracle must remain offset')
  }
  const assertOutsideMainlandStability = (model) => {
    outsideMainland.forEach(([point, region]) => {
      assert.deepEqual(model.convertRoutePreviewPointForMap(point, 'WGS84', region), { latitude: point.lat, longitude: point.lon }, `${region} stability oracle must remain unchanged`)
    })
  }
  assertMainlandOffsetOracle(loadModel(modelSource))
  assertOutsideMainlandStability(loadModel(modelSource))
  const regionMutationSource = modelSource.replace(
    'const regionClass = classifyRoutePreviewRegion(routeRegion)',
    'const regionClass = ROUTE_PREVIEW_REGION_MAINLAND',
  )
  assert.notEqual(regionMutationSource, modelSource, 'region applicability mutation must change model source')
  assert.throws(() => assertOutsideMainlandStability(loadModel(regionMutationSource)), undefined, 'region applicability mutation must turn the focused oracle RED')
  const rawMappingMutationSource = modelSource.replace(
    'const regionClass = classifyRoutePreviewRegion(routeRegion)',
    'const regionClass = ROUTE_PREVIEW_REGION_NON_MAINLAND',
  )
  assert.notEqual(rawMappingMutationSource, modelSource, 'raw WGS84 mapping mutation must change model source')
  assert.throws(() => assertMainlandOffsetOracle(loadModel(rawMappingMutationSource)), undefined, 'raw WGS84 mapping mutation must turn the focused oracle RED')
  const unknownRegionMutationSource = modelSource.replaceAll("return ROUTE_PREVIEW_REGION_UNKNOWN", "return ROUTE_PREVIEW_REGION_MAINLAND")
  assert.notEqual(unknownRegionMutationSource, modelSource, 'unknown-region mutation must change model source')
  assert.throws(() => {
    const model = loadModel(unknownRegionMutationSource)
    assert.equal(model.classifyRoutePreviewRegion('法国四川餐厅'), 'unknown', 'unknown region must remain fail-closed')
    assert.equal(model.convertRoutePreviewPointForMap({ lat: 30, lon: 100 }, 'WGS84', '法国四川餐厅'), null, 'unknown region must not produce Map coordinates')
  }, undefined, 'unknown-region mutation must turn the focused oracle RED')
  const collisionGuardMutationSource = modelSource.replace(
    'if (mainlandMatch && nonMainlandMatch) return ROUTE_PREVIEW_REGION_UNKNOWN',
    'if (false) return ROUTE_PREVIEW_REGION_UNKNOWN',
  )
  assert.notEqual(collisionGuardMutationSource, modelSource, 'collision guard mutation must change model source')
  assert.throws(() => {
    const model = loadModel(collisionGuardMutationSource)
    assert.equal(model.classifyRoutePreviewRegion('香港·广东'), 'unknown', 'collision guard must keep mainland/non-mainland conflicts unknown')
    assert.equal(model.buildRoutePreviewMapGeometry(routePreview(), '香港·广东'), null, 'collision guard removal must not produce Map geometry')
  }, undefined, 'collision guard removal must turn the focused oracle RED')
  const nonMainlandExclusionMutationSource = modelSource.replace("  '香港', 'hongkong',", "  'hongkong',")
  assert.notEqual(nonMainlandExclusionMutationSource, modelSource, 'non-mainland exclusion mutation must change model source')
  assert.throws(() => {
    const model = loadModel(nonMainlandExclusionMutationSource)
    assert.equal(model.classifyRoutePreviewRegion('香港'), 'non_mainland', 'non-mainland exclusion must remain effective')
  }, undefined, 'non-mainland exclusion removal must turn the focused oracle RED')
  const macauTokenMutationSource = modelSource.replace("  '香港', 'hongkong', '澳门', 'macau',", "  '香港', 'hongkong', 'macau',")
  assert.notEqual(macauTokenMutationSource, modelSource, 'Macau token mutation must change model source')
  assert.throws(() => {
    const model = loadModel(macauTokenMutationSource)
    assert.equal(model.classifyRoutePreviewRegion('澳门'), 'non_mainland', 'the production 澳门 token must keep Macau outside mainland projection')
    assert.deepEqual(model.convertRoutePreviewPointForMap({ lat: 22.1240825, lon: 113.5672684 }, 'WGS84', '澳门'), {
      latitude: 22.1240825,
      longitude: 113.5672684,
    }, 'Macau WGS84 coordinates must remain unchanged')
  }, undefined, 'deleting the production 澳门 token must turn the focused oracle RED')
  const assertCenterAndEndOracles = (model) => {
    const candidate = model.buildRoutePreviewMapGeometry(routePreview(), '四川省')
    assert.ok(candidate, 'mainland route preview geometry must be available')
    assert.ok(Math.abs(candidate.center.latitude - 30.04728347941994) < 1e-12, 'center oracle must remain converted')
    assert.ok(Math.abs(candidate.center.longitude - 100.10123348900333) < 1e-12, 'center oracle must remain converted')
    assert.deepEqual(candidate.indicators[1], {
      latitude: 30.097306205700363,
      longitude: 100.20125724049596,
      radius: 36,
      color: '#34c759',
      fillColor: '#34c75966',
      strokeWidth: 3,
    }, 'end indicator oracle must remain converted')
  }
  assertCenterAndEndOracles(loadModel(modelSource))
  const centerMutationSource = modelSource.replace(
    'latitude: points.reduce((sum, point) => sum + point.latitude, 0) / points.length,',
    'latitude: start.latitude,',
  )
  assert.notEqual(centerMutationSource, modelSource, 'center mapping mutation must change model source')
  assert.throws(() => assertCenterAndEndOracles(loadModel(centerMutationSource)), undefined, 'center mapping mutation must turn the focused oracle RED')
  const endMutationSource = modelSource.replace(
    "{ latitude: end.latitude, longitude: end.longitude, radius: 36, color: '#34c759',",
    "{ latitude: start.latitude, longitude: start.longitude, radius: 36, color: '#34c759',",
  )
  assert.notEqual(endMutationSource, modelSource, 'end-indicator mapping mutation must change model source')
  assert.throws(() => assertCenterAndEndOracles(loadModel(endMutationSource)), undefined, 'end-indicator mapping mutation must turn the focused oracle RED')
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

function assertReasonSeverityDisplayProjection(page) {
  const resultStart = page.indexOf('    if (showResult && result)')
  assert.ok(resultStart >= 0, 'structured result render must remain present')
  const resultRender = page.slice(resultStart)
  assert.match(resultRender, /reason\.severity \|\| 'info'/, 'reason color class must remain bound to the machine severity')
  assert.match(resultRender, /reason-\$\{reason\.severity \|\| 'info'\}/, 'no_go/caution severity classes must remain addressable without visible labels')
  assert.match(resultRender, /reason\.message \|\| '确定性规则提示'/, 'reason messages must remain visible in the result list')
  assert.match(resultRender, /pageModel\.reasons\.map\(\(reason, index\)/, 'reason order must remain the page-model order')

  const severityClassMutation = page.replace("reason-${reason.severity || 'info'}", 'reason-info')
  assert.notEqual(severityClassMutation, page, 'severity class collapse mutation must change page source')
  assert.throws(() => assertReasonSeverityDisplayProjection(severityClassMutation), undefined, 'severity class collapse must turn the focused oracle RED')
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
  assert.match(clearResult, /this\.setState\(\{ routePreviewFallback: false \}\)/, 'return-to-search must reset map fallback state')
  assert.match(showBase, /this\.setState\(\{ routePreviewFallback: false \}\)/, 'new base result must reset map fallback state')
  const clearMutation = page.replace('    this.setState({ weatherDisclosure: {} })', '    // disclosure reset removed')
  assert.notEqual(clearMutation, page, 'clear-result reset mutation must change source')
  assert.throws(() => assertDisclosureResetSeams(clearMutation), undefined, 'clear-result reset removal must turn the focused contract RED')
  const showBaseNeedle = '    this.setState({ historySaveError: null })\n    this.setState({ weatherDisclosure: {} })'
  const showBaseMutation = page.replace(showBaseNeedle, '    this.setState({ historySaveError: null })')
  assert.notEqual(showBaseMutation, page, 'new-base reset mutation must change source')
  assert.throws(() => assertDisclosureResetSeams(showBaseMutation), undefined, 'new-base reset removal must turn the focused contract RED')
  const clearFallbackMutation = page.replace('    this.setState({ routePreviewFallback: false })', '    // fallback reset removed')
  assert.notEqual(clearFallbackMutation, page, 'clear-result fallback reset mutation must change source')
  assert.throws(() => assertDisclosureResetSeams(clearFallbackMutation), undefined, 'clear-result fallback reset removal must turn the focused contract RED')
  const showBaseFallbackNeedle = '    this.setState({ weatherDisclosure: {} })\n    this.setState({ routePreviewFallback: false })\n    this._updateTripFlow({ type: \'BASE_RECEIVED\''
  const showBaseFallbackMutation = page.replace(showBaseFallbackNeedle, '    this.setState({ weatherDisclosure: {} })\n    this._updateTripFlow({ type: \'BASE_RECEIVED\'')
  assert.notEqual(showBaseFallbackMutation, page, 'new-base fallback reset mutation must change source')
  assert.throws(() => assertDisclosureResetSeams(showBaseFallbackMutation), undefined, 'new-base fallback reset removal must turn the focused contract RED')
}

function assertRoutePreviewFallbackState(page) {
  const stateStart = page.indexOf('state = {')
  assert.ok(stateStart >= 0, 'page state must remain present')
  const stateEnd = page.indexOf('\n  }', stateStart)
  const stateSource = page.slice(stateStart, stateEnd)
  assert.match(stateSource, /routePreviewFallback: false/, 'route preview fallback must start disabled')
  const onError = extractMethodSource(page, '  onRoutePreviewError = () => {')
  assert.match(onError, /this\.setState\(\{ routePreviewFallback: true \}\)/, 'map error must enable the route preview fallback')
  const initialMutation = page.replace('    routePreviewFallback: false,', '    routePreviewFallback: true,')
  assert.notEqual(initialMutation, page, 'initial fallback mutation must change page source')
  assert.throws(() => assertRoutePreviewFallbackState(initialMutation), undefined, 'initial fallback mutation must turn the focused oracle RED')
  const errorMutation = page.replace('this.setState({ routePreviewFallback: true })', 'this.setState({ routePreviewFallback: false })')
  assert.notEqual(errorMutation, page, 'map error fallback mutation must change page source')
  assert.throws(() => assertRoutePreviewFallbackState(errorMutation), undefined, 'map error fallback mutation must turn the focused oracle RED')
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
  assertReasonSeverityDisplayProjection(page)
  assertMapPreviewWiring(page, css)
  assertOpenDataAttributionWiring(page, css)
  assertC13ResultSummaryHierarchy(page, css)
  assertWeatherDisclosureProjection(page)
  assertToggleIsolation(page)
  assertDisclosureResetSeams(page)
  assertRoutePreviewFallbackState(page)

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

function assertOpenDataAttributionWiring(page, css) {
  const resultStart = page.indexOf('    if (showResult && result)')
  assert.ok(resultStart >= 0, 'structured result render must remain present for source attribution')
  const resultRender = page.slice(resultStart)
  assert.match(resultRender, /const hasOpenDataRouteSource = pageModel\.sources\.route\.some\(\(source\) => source && source\.kind === 'open_data'\)/, 'OSM attribution must be gated by the explicit open_data source kind')
  assert.match(resultRender, /const hasElevationRouteSource = pageModel\.sources\.route\.some\(\(source\) => \([\s\S]*source\.id === 'source:trusted-api-open-meteo-copernicus-glo90'[\s\S]*source\.kind === 'trusted_api'[\s\S]*source\.publisher === 'Open-Meteo \/ Copernicus DEM GLO-90'/, 'elevation attribution must require the exact trusted Open-Meteo/Copernicus source')
  assert.match(resultRender, /hasOpenDataRouteSource &&/, 'OSM attribution must be conditional on an open_data route source')
  assert.match(resultRender, /hasElevationRouteSource &&/, 'elevation attribution must be conditional on the exact trusted elevation source')
  assert.match(resultRender, /route-preview-attribution/, 'OSM attribution must sit adjacent to the route preview map')
  assert.match(resultRender, /source-attribution/, 'OSM attribution must sit adjacent to the route source card')
  assert.match(resultRender, /OpenStreetMap contributors/, 'visible attribution must name OpenStreetMap contributors')
  assert.match(resultRender, /ODbL-1\.0/, 'visible attribution must name the ODbL license')
  assert.match(resultRender, /openstreetmap\.org\/copyright/, 'visible attribution must link the OSM copyright guidance')
  assert.match(css, /\.route-preview-attribution\s*\{/, 'route preview attribution needs bounded styling')
  assert.match(css, /\.source-attribution\s*\{/, 'source-card attribution needs bounded styling')

  const attributionMutation = page.replace('© OpenStreetMap contributors · ODbL-1.0 · openstreetmap.org/copyright', '© OpenStreetMap contributors')
  assert.notEqual(attributionMutation, page, 'license removal mutation must change page source')
  assert.throws(() => assertOpenDataAttributionWiring(attributionMutation, css), undefined, 'ODbL removal must turn the focused attribution contract RED')
  const gateMutation = page.replace("source && source.kind === 'open_data'", 'source && source.kind === \'official\'')
  assert.notEqual(gateMutation, page, 'open_data gate mutation must change page source')
  assert.throws(() => assertOpenDataAttributionWiring(gateMutation, css), undefined, 'open_data gate mutation must turn the focused attribution contract RED')
  const mapAttributionMutation = page.replace('<Text className="route-preview-attribution">© OpenStreetMap contributors · ODbL-1.0 · openstreetmap.org/copyright</Text>', '')
  assert.notEqual(mapAttributionMutation, page, 'map attribution removal mutation must change page source')
  assert.throws(() => assertOpenDataAttributionWiring(mapAttributionMutation, css), undefined, 'map attribution removal must turn the focused attribution contract RED')
  const sourceAttributionMutation = page.replace('<Text className="source-attribution">数据地图：© OpenStreetMap contributors · ODbL-1.0 · openstreetmap.org/copyright</Text>', '')
  assert.notEqual(sourceAttributionMutation, page, 'source attribution removal mutation must change page source')
  assert.throws(() => assertOpenDataAttributionWiring(sourceAttributionMutation, css), undefined, 'source attribution removal must turn the focused attribution contract RED')
  const elevationGateMutation = page.replace("source.id === 'source:trusted-api-open-meteo-copernicus-glo90'", "source.id === 'source:other-elevation'")
  assert.notEqual(elevationGateMutation, page, 'trusted elevation gate mutation must change page source')
  assert.throws(() => assertOpenDataAttributionWiring(elevationGateMutation, css), undefined, 'trusted elevation gate mutation must turn the focused attribution contract RED')
}

function assertMapPreviewWiring(page, css) {
  assert.match(page, /import \{[^}]*Map[^}]*\} from '@tarojs\/components'/, 'result page must use the pinned Taro Map component')
  const resultStart = page.indexOf('    if (showResult && result)')
  const resultRender = page.slice(resultStart)
  assert.match(resultRender, /routeModel\.routePreview &&/, 'map must render only for a validated route preview')
  assert.match(resultRender, /buildRoutePreviewMapGeometry\(routePreview, routeModel\.region\)/, 'Map-native coordinates must come from the region-gated coordinate-system-aware geometry projection')
  assert.match(resultRender, /<Map[\s\S]*polyline=\{routePreviewPolylines\}/, 'map must receive route-day polylines')
  assert.match(resultRender, /includePoints=\{routePreviewPoints\}/, 'map must auto-fit the complete preview point set')
  assert.match(resultRender, /latitude=\{routePreviewCenter\.latitude\}/, 'map center latitude must come from converted geometry')
  assert.match(resultRender, /longitude=\{routePreviewCenter\.longitude\}/, 'map center longitude must come from converted geometry')
  assert.match(resultRender, /circles=\{routePreviewIndicators\}/, 'map start/end indicators must come from converted geometry')
  for (const prop of ['enableZoom', 'enableScroll', 'enableRotate', 'enableOverlooking', 'showLocation', 'enablePoi']) {
    assert.match(resultRender, new RegExp(`${prop}=\\{false\\}`), `${prop} must remain disabled for B-lite preview`)
  }
  assert.match(resultRender, /onError=\{this\.onRoutePreviewError\}/, 'map error must trigger the same-point fallback')
  assert.match(resultRender, /routePreviewFallback &&/, 'map failure must switch to the neutral outline fallback')
  assert.match(resultRender, /route-preview-start|route-preview-end/, 'map/fallback must expose start and end indicators')
  assert.match(css, /\.route-preview(?:-|\s)/, 'route preview needs bounded thumbnail styling')

  const summaryStart = resultRender.indexOf('className={`result-summary-card result-verdict-card')
  const previewStart = resultRender.indexOf('{routeModel.routePreview && routePreviewMap && (')
  const summaryClose = resultRender.indexOf('          </View>\n\n          <View className="card result-reasons-card">', summaryStart)
  assert.ok(summaryStart >= 0, 'top result summary card must be explicit')
  assert.ok(previewStart > summaryStart && previewStart < summaryClose, 'map preview must be nested inside the top result summary card')
  assert.doesNotMatch(resultRender.slice(summaryStart, previewStart), /\n {10}<\/View>\n\n/, 'top result summary card must remain open until the preview')

  const missingMapMutation = page.replace(/\{routeModel\.routePreview &&[\s\S]*?route-preview-end[^}]*\}/, '')
  assert.notEqual(missingMapMutation, page, 'map removal mutation must change page source')
  assert.throws(() => assertMapPreviewWiring(missingMapMutation, css), undefined, 'map removal must turn the focused oracle RED')
  const interactiveMutation = page.replace('enableZoom={false}', 'enableZoom={true}')
  assert.notEqual(interactiveMutation, page, 'interactive flag mutation must change page source')
  assert.throws(() => assertMapPreviewWiring(interactiveMutation, css), undefined, 'interactive map mutation must turn the focused oracle RED')
  const poiMutation = page.replace('enablePoi={false}', 'enablePoi={true}')
  assert.notEqual(poiMutation, page, 'POI flag mutation must change page source')
  assert.throws(() => assertMapPreviewWiring(poiMutation, css), undefined, 'POI map mutation must turn the focused contract RED')
  const fallbackMutation = page.replace('onError={this.onRoutePreviewError}', 'onError={() => {}}')
  assert.notEqual(fallbackMutation, page, 'fallback binding mutation must change page source')
  assert.throws(() => assertMapPreviewWiring(fallbackMutation, css), undefined, 'fallback binding mutation must turn the focused oracle RED')
  const rawCoordinateMutation = page.replace('buildRoutePreviewMapGeometry(routePreview, routeModel.region)', 'routePreviewSourcePoints')
  assert.notEqual(rawCoordinateMutation, page, 'raw coordinate mapping mutation must change source')
  assert.throws(() => assertMapPreviewWiring(rawCoordinateMutation, css), undefined, 'raw coordinate mapping must turn the focused contract RED')
  const offsetCoordinateMutation = page.replace('buildRoutePreviewMapGeometry(routePreview, routeModel.region)', "buildRoutePreviewMapGeometry({ ...routePreview, coordinateSystem: 'GCJ-02' }, routeModel.region)")
  assert.notEqual(offsetCoordinateMutation, page, 'coordinate-system mapping mutation must change source')
  assert.throws(() => assertMapPreviewWiring(offsetCoordinateMutation, css), undefined, 'coordinate-system mapping mutation must turn the focused contract RED')
  const centerPropMutation = page.replace('latitude={routePreviewCenter.latitude}', 'latitude={routePreviewStart.latitude}')
  assert.notEqual(centerPropMutation, page, 'center prop mapping mutation must change source')
  assert.throws(() => assertMapPreviewWiring(centerPropMutation, css), undefined, 'center prop mapping mutation must turn the focused oracle RED')
  const indicatorPropMutation = page.replace('circles={routePreviewIndicators}', 'circles={[]}')
  assert.notEqual(indicatorPropMutation, page, 'indicator prop mapping mutation must change source')
  assert.throws(() => assertMapPreviewWiring(indicatorPropMutation, css), undefined, 'indicator prop mapping mutation must turn the focused oracle RED')
  const siblingPreviewMutation = page.replace(
    '              {routeModel.routePreview && routePreviewMap && (',
    '            </View>\n          </View>\n\n          {routeModel.routePreview && routePreviewMap && (',
  )
  assert.notEqual(siblingPreviewMutation, page, 'preview nesting mutation must change source')
  assert.throws(() => assertMapPreviewWiring(siblingPreviewMutation, css), undefined, 'sibling preview mutation must turn the focused contract RED')
}

function assertC13ResultSummaryHierarchy(page, css) {
  const resultStart = page.indexOf('    if (showResult && result)')
  assert.ok(resultStart >= 0, 'structured result render must remain present')
  const resultRender = page.slice(resultStart)
  const summaryStart = resultRender.indexOf('className={`result-summary-card result-verdict-card')
  const reasonsStart = resultRender.indexOf('<View className="card result-reasons-card">', summaryStart)
  assert.ok(summaryStart >= 0, 'C13 top result summary card must remain explicit')
  assert.ok(reasonsStart > summaryStart, 'C13 reasons card must follow the top summary card')
  const summary = resultRender.slice(summaryStart, reasonsStart)
  const contentStart = summary.indexOf('<View className="result-verdict-content">')
  const contentEnd = summary.indexOf('\n          </View>', contentStart)
  assert.ok(contentStart >= 0 && contentEnd > contentStart, 'top-card foreground must use an explicit wrapper')
  const content = summary.slice(contentStart, contentEnd)
  assert.match(content, /route-preview-stage/, 'map stage must remain inside the explicit foreground wrapper')
  assert.match(content, /route-preview-map-labels/, 'map labels must remain inside the explicit foreground wrapper')
  const adviceIndex = summary.indexOf('<Text className="result-advice-kicker">出发建议 · {verdict.label}</Text>')
  const routeNameIndex = summary.indexOf('<Text className="result-route-name">{routeModel.name || \'路线待确认\'}</Text>')
  const previewIndex = summary.indexOf('{routeModel.routePreview && routePreviewMap && (')
  const scopeIndex = summary.indexOf('<Text className="result-route-scope">')
  const factsIndex = summary.indexOf('<View className="result-route-facts">')
  const noteIndex = summary.indexOf('className="route-preview-note"')
  const legendIndex = summary.indexOf('className="route-preview-legend"')
  const previewCardOccurrences = summary.match(/<View className="route-preview-card"\s*\/?\s*>/g) || []
  assert.ok(adviceIndex >= 0, 'overall conclusion must use the compact advice kicker')
  assert.ok(routeNameIndex > adviceIndex, 'route name must follow the compact advice kicker')
  assert.ok(previewIndex > routeNameIndex, 'validated map preview must follow the route name')
  assert.ok(scopeIndex > previewIndex, 'route scope must follow the map preview')
  assert.ok(factsIndex > scopeIndex, 'route facts must follow the route scope')
  assert.ok(noteIndex > factsIndex && legendIndex > noteIndex, 'geometry notice and legend must follow route facts')
  assert.equal(previewCardOccurrences.length, 1, 'result summary must contain exactly one route preview card')
  assert.match(
    summary,
    /\{routeModel\.routePreview && routePreviewMap && \(\s*<View className="route-preview-card">/,
    'route preview card must be conditionally rendered only for a safe route preview',
  )
  assert.doesNotMatch(summary, /本地验收|原型|prototype|local/i, 'real result UI must not expose prototype/local-validation tags')
  assert.doesNotMatch(summary, /<Text className="card-title">完整路线预览<\/Text>/, 'map preview must not introduce a second large title')

  const reasonsEnd = resultRender.indexOf('\n\n          <View className="card result-weather-card">', reasonsStart)
  assert.ok(reasonsEnd > reasonsStart, 'reasons card must remain bounded before weather')
  const reasons = resultRender.slice(reasonsStart, reasonsEnd)
  assert.match(reasons, /className="card-title">判断依据<\/Text>/, 'reason card must use the business title 判断依据')
  assert.match(reasons, /pageModel\.reasons\.map\(\(reason, index\)/, 'reason order must remain page-model order')
  assert.match(
    reasons,
    /<Text className=\{`reason-message reason-\$\{reason\.severity \|\| 'info'\}`\}>\{reason\.message \|\| '确定性规则提示'\}<\/Text>/,
    'reason Text reachable content must remain the exact message or fallback',
  )
  assert.match(reasons, /reason-\$\{reason\.severity \|\| 'info'\}/, 'reason severity must remain a non-overriding visual class')
  assert.doesNotMatch(reasons, /aria-label=/, 'reason Text must not claim unsupported aria-label semantics')
  assert.doesNotMatch(reasons, /className="reason-severity"/, 'reason card must not visibly repeat severity labels')
  assert.doesNotMatch(reasons, /verdict\.label/, 'reason card must not repeat the overall verdict')

  const cardCssStart = css.indexOf('.result-verdict-card {')
  const cardCssEnd = css.indexOf('\n}', cardCssStart) + 2
  assert.ok(cardCssStart >= 0 && cardCssEnd > cardCssStart, 'top result card CSS must remain explicit')
  const cardCss = css.slice(cardCssStart, cardCssEnd)
  assert.match(cardCss, /background:\s*#fff/, 'top result card surface must remain white')
  const depthCssStart = css.indexOf('.result-verdict-card::before')
  const depthCssEnd = css.indexOf('.result-verdict-content', depthCssStart)
  const depthCss = css.slice(depthCssStart, depthCssEnd)
  assert.match(depthCss, /rgba\(142,142,147,0\.(?:14|16)\)/, 'background depth must use neutral gray')
  assert.doesNotMatch(depthCss, /34c759|36,138,61|255,149,0|255,59,48|c9342b|b26a00/, 'background depth must not inherit verdict color')
  assert.match(css, /\.result-verdict-card::before\s*\{[^}]*filter:\s*blur\(/, 'top background depth must use a blurred pseudo-element')
  assert.match(css, /\.result-verdict-card::after\s*\{[^}]*filter:\s*blur\(/, 'bottom background depth must use a blurred pseudo-element')
  assert.match(css, /\.result-verdict-content\s*\{[^}]*position:\s*relative[^}]*z-index:\s*1/, 'foreground text/map must stay above the blurred depth')
  assert.doesNotMatch(css, /\.result-verdict-card\s*>\s*\*/, 'C13 WXSS must not use an unsupported universal child selector')
  assert.doesNotMatch(cardCss, /filter:\s*blur\(/, 'the card foreground must not be blurred as a whole')

  const adviceMutation = page.replace('<Text className="result-advice-kicker">出发建议 · {verdict.label}</Text>', '')
  assert.notEqual(adviceMutation, page, 'advice kicker removal mutation must change page source')
  assert.throws(() => assertC13ResultSummaryHierarchy(adviceMutation, css), undefined, 'advice kicker removal must turn the C13 gate RED')
  const orderMutation = page.replace(
    '            {routeModel.routePreview && routePreviewMap && (',
    '            <Text className="result-route-scope">{routeModel.region || \'地区待确认\'} · {routeModel.scope}</Text>\n            {routeModel.routePreview && routePreviewMap && (',
  )
  assert.notEqual(orderMutation, page, 'route scope reorder mutation must change page source')
  assert.throws(() => assertC13ResultSummaryHierarchy(orderMutation, css), undefined, 'route scope before map must turn the C13 gate RED')
  const duplicateMutation = page.replace(
    '          <View className="card result-reasons-card">\n            <Text className="card-title">判断依据</Text>',
    '          <View className="card result-reasons-card">\n            <Text className="card-title">判断依据</Text>\n            <Text>{verdict.label}</Text>',
  )
  assert.notEqual(duplicateMutation, page, 'duplicate verdict mutation must change page source')
  assert.throws(() => assertC13ResultSummaryHierarchy(duplicateMutation, css), undefined, 'duplicate verdict mutation must turn the C13 gate RED')
  const tagMutation = page.replace(
    '<Text className="result-route-name">{routeModel.name || \'路线待确认\'}</Text>',
    '<Text className="result-route-name">{routeModel.name || \'路线待确认\'}</Text><Text>本地验收</Text>',
  )
  assert.notEqual(tagMutation, page, 'prototype tag mutation must change page source')
  assert.throws(() => assertC13ResultSummaryHierarchy(tagMutation, css), undefined, 'prototype tag mutation must turn the C13 gate RED')
  const wrapperMutation = page.replace('<View className="result-verdict-content">', '')
  assert.notEqual(wrapperMutation, page, 'foreground wrapper removal mutation must change page source')
  assert.throws(() => assertC13ResultSummaryHierarchy(wrapperMutation, css), undefined, 'foreground wrapper removal must turn the C13 gate RED')
  const noPreviewMutation = page.replace(
    '{routeModel.routePreview && routePreviewMap && (\n                <View className="route-preview-card">',
    '<View className="route-preview-card">',
  )
  assert.notEqual(noPreviewMutation, page, 'no-preview mutation must change source')
  assert.throws(() => assertC13ResultSummaryHierarchy(noPreviewMutation, css), undefined, 'unconditional preview card must turn the C13 gate RED')
  const duplicatePreviewInjection = page.replace(
    '<Text className="result-route-name">{routeModel.name || \'路线待确认\'}</Text>',
    '<Text className="result-route-name">{routeModel.name || \'路线待确认\'}</Text>\n              <View className="route-preview-card" />',
  )
  assert.notEqual(duplicatePreviewInjection, page, 'unconditional preview injection must change source')
  assert.doesNotThrow(() => parseBabel(duplicatePreviewInjection, { sourceType: 'module', plugins: ['jsx'] }), 'unconditional preview injection must remain Babel-parseable')
  assert.throws(() => assertC13ResultSummaryHierarchy(duplicatePreviewInjection, css), undefined, 'unconditional preview injection must turn the C13 gate RED')
  const accessibleMessageMutation = page.replace(
    "{reason.message || '确定性规则提示'}",
    'reason.severity',
  )
  assert.notEqual(accessibleMessageMutation, page, 'reason accessible-message mutation must change source')
  assert.throws(() => assertC13ResultSummaryHierarchy(accessibleMessageMutation, css), undefined, 'reason message loss must turn the C13 gate RED')
  const tintedDepthMutation = css.replace('rgba(142,142,147,0.16)', 'rgba(36,138,61,0.18)')
  assert.notEqual(tintedDepthMutation, css, 'verdict-tinted depth mutation must change CSS source')
  assert.throws(() => assertC13ResultSummaryHierarchy(page, tintedDepthMutation), undefined, 'verdict-tinted depth mutation must turn the C13 gate RED')
  const blurMutation = css.replace(
    '.result-verdict-content { position: relative; z-index: 1; }',
    '.result-verdict-content { position: relative; z-index: 1; filter: blur(8rpx); }',
  )
  assert.notEqual(blurMutation, css, 'foreground blur mutation must change CSS source')
  assert.throws(() => assertC13ResultSummaryHierarchy(page, blurMutation), undefined, 'foreground blur mutation must turn the C13 gate RED')
}

function assertC13ResultSummaryArtifact() {
  const artifactPath = path.join(__dirname, '../taro-app/dist/pages/index/index.js')
  assert.ok(fs.existsSync(artifactPath), `built result-page artifact must exist at ${artifactPath}`)
  const artifact = fs.readFileSync(artifactPath, 'utf8')
  const templatePath = path.join(__dirname, '../taro-app/dist/base.wxml')
  assert.ok(fs.existsSync(templatePath), `built WeChat template must exist at ${templatePath}`)
  const template = fs.readFileSync(templatePath, 'utf8')
  assert.doesNotMatch(template, /aria-label/, 'built WeChat template must not claim unsupported aria-label semantics')
  const reasonStart = artifact.indexOf('className:"reason-item"')
  const reasonEnd = artifact.indexOf('data-issues', reasonStart)
  assert.ok(reasonStart >= 0 && reasonEnd > reasonStart, 'built artifact must retain the result reasons subtree')
  const reasons = artifact.slice(reasonStart, reasonEnd)
  assert.match(reasons, /className:"reason-message reason-"\.concat\([^)]*severity\|\|"info"\)/, 'built artifact must retain severity as a non-overriding class')
  assert.match(reasons, /children:e\.message\|\|"\\u786e\\u5b9a\\u6027\\u89c4\\u5219\\u63d0\\u793a"/, 'built artifact must retain the exact visible reason message/fallback')
  assert.doesNotMatch(reasons, /aria-label/, 'built artifact must not rely on an aria-label that WeChat Text does not emit')
}

function resultPresentationContract() {
  const root = path.join(__dirname, '../taro-app/src/pages/index')
  const page = fs.readFileSync(path.join(root, 'index.jsx'), 'utf8')
  const css = fs.readFileSync(path.join(root, 'index.css'), 'utf8')
  resultPresentationContractForSources(page, css)
}

assertVerdictAndFullWeather()
assertBoundariesAndDataIssues()
assertRoutePreviewProjection()
assertRoutePreviewCoordinateProjection()
assertAdviceIsolationAndLifecycle()
assertCacheChecklistAndHistory()
assertLifecycleAndHistoryOrchestration()
assertWmoGroups()
resultPresentationContract()
if (process.env.RESULT_PAGE_ARTIFACT === '1') assertC13ResultSummaryArtifact()
console.log('PASS: I22b structured result-page contract')
