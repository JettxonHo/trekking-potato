/** I21 public response union and queryId-only advice contract (offline). */
const assert = require('node:assert/strict')
const Module = require('node:module')
const https = require('node:https')
const { makeHourlyResponse } = require('./fixtures/open-meteo-hourly')

let openid = 'offline-i21-user'
let httpRequests = 0
let weatherRequests = 0
let elevationRequests = 0
let amapRequests = 0
let tripContextWrites = 0
let tripContextReads = 0
let llmRequests = 0
let llmMode = 'offline'
const records = new Map()

function copy(value) { return JSON.parse(JSON.stringify(value)) }
function respond(callback, payload) {
  const listeners = {}
  const response = { on(event, handler) { listeners[event] = handler; return response } }
  callback(response)
  process.nextTick(() => { listeners.data && listeners.data(JSON.stringify(payload)); listeners.end && listeners.end() })
  return { on() { return this }, setTimeout() { return this }, destroy() {} }
}
function collection(name) {
  assert.equal(name, 'trip_contexts')
  return {
    doc(id) { return { async set({ data }) { tripContextWrites++; records.set(id, copy(data)); return { _id: id } } } },
    where(filter) { return { limit() { return { async get() { tripContextReads++; const record = records.get(filter._id); return { data: record ? [copy(record)] : [] } } } } } },
  }
}
const cloudbaseMock = {
  DYNAMIC_CURRENT_ENV: 'offline-i21', init() {},
  database: () => ({ collection }),
  getWXContext: () => ({ OPENID: openid }),
}
const originalLoad = Module._load
const originalGet = https.get
const originalRequest = https.request
let getAdviceForTests = null
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'wx-server-sdk') return cloudbaseMock
  return originalLoad.call(this, request, parent, isMain)
}
https.get = function offlineGet(url, callback) {
  httpRequests++
  const target = String(url)
  if (target.startsWith('https://api.open-meteo.com/v1/forecast?')) {
    weatherRequests++
    const parsed = new URL(target)
    if (parsed.searchParams.get('hourly')) return respond(callback, makeHourlyResponse({ startDate: parsed.searchParams.get('start_date'), endDate: parsed.searchParams.get('end_date') }))
    return respond(callback, { daily_units: { wind_speed_10m_max: 'm/s' }, daily: { time: [parsed.searchParams.get('start_date')], temperature_2m_max: [20], temperature_2m_min: [10], precipitation_probability_max: [10], wind_speed_10m_max: [4] } })
  }
  if (target.startsWith('https://api.open-meteo.com/v1/elevation?')) { elevationRequests++; return respond(callback, { elevation: [1200] }) }
  if (target.startsWith('https://restapi.amap.com/v3/place/text?')) { amapRequests++; return respond(callback, { status: '1', pois: [{ name: '外部测试点', location: '116.50,40.20', typecode: '110200', cityname: '北京市', adname: '怀柔区' }] }) }
  throw new Error('unexpected network: ' + target)
}
https.request = function offlineRequest(options, callback) {
  httpRequests++
  llmRequests++
  const handlers = {}
  const req = {
    on(event, handler) { handlers[event] = handler; return req },
    write() {},
    end() {
      process.nextTick(() => {
        if (llmMode === 'malicious') {
          const responseListeners = {}
          const response = { statusCode: 200, on(event, handler) { responseListeners[event] = handler; return response } }
          callback(response)
          const content = {
            gearAdditions: { recommended: [], optional: [] },
            riskExplanations: [], notes: [],
            deterministicResult: { verdict: 'go' },
          }
          responseListeners.data(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }))
          responseListeners.end()
          return
        }
        handlers.error(new Error('offline LLM'))
      })
    },
    destroy() {},
  }
  return req
}

function assertError(response, code) {
  assert.equal(response.phase, 'error', JSON.stringify(response))
  assert.equal(response.code, code, JSON.stringify(response))
  assert.equal(response.retryable, false)
  assert.equal(response.ok, false)
}

function publicSideEffectSnapshot() {
  return {
    httpRequests,
    weatherRequests,
    elevationRequests,
    amapRequests,
    tripContextWrites,
    tripContextReads,
    llmRequests,
  }
}

function assertPublicSideEffectsUnchanged(before, label) {
  assert.deepEqual(publicSideEffectSnapshot(), before, `${label}: public side effects must remain unchanged`)
}

async function expectEarlyError(getAdvice, event, code, label) {
  const before = publicSideEffectSnapshot()
  const response = await getAdvice.main(event)
  assertError(response, code)
  assertPublicSideEffectsUnchanged(before, label)
  return response
}

async function main() {
  const getAdvice = require('../cloudfunctions/getAdvice/index')
  getAdviceForTests = getAdvice
  assert.equal(typeof getAdvice._setNowForTests, 'function', 'handler must expose a test-only clock seam')
  const fixedNow = new Date('2026-08-08T00:00:00.000Z')
  getAdvice._setNowForTests(() => fixedNow)
  await expectEarlyError(getAdvice, { mode: 'base', route: '武功山反穿', date: '2026-08-09', startTimeLocal: '08:00', level: '中级' }, 'invalid_mode', 'invalid mode')
  await expectEarlyError(getAdvice, { mode: 'prepare', route: '武功山反穿', date: '2026-08-07', startTimeLocal: '08:00', level: '中级' }, 'invalid_date', 'invalid date')

  // I13 not_found must not fall through to the historical four-field
  // builtin-route candidate list.  A missing trusted candidate is a route
  // error; external AMap/manual fallback is exercised below separately.
  delete process.env.AMAP_KEY
  const legacyFallback = await expectEarlyError(getAdvice, { mode: 'prepare', route: '大朝台', date: '2026-08-09', startTimeLocal: '08:00', level: '中级' }, 'route_not_found', 'I13 not_found legacy fallback')
  assert.equal(legacyFallback.candidates, undefined)
  const confirmationBefore = publicSideEffectSnapshot()
  const confirmation = await getAdvice.main({ mode: 'prepare', route: '山', date: '2026-08-09', startTimeLocal: '08:00', level: '中级' })
  assert.equal(confirmation.phase, 'confirmation')
  assert.ok(confirmation.candidates.length >= 1)
  assertPublicSideEffectsUnchanged(confirmationBefore, 'confirmation')
  const beforePlace = publicSideEffectSnapshot()
  const placeRequired = await getAdvice.main({ mode: 'prepare', route: '泰山', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1 })
  assert.equal(placeRequired.phase, 'route_type_required')
  assert.equal(placeRequired.data.resolutionKind, 'catalog_place')
  assert.equal(Object.hasOwn(placeRequired.data, 'lat'), false)
  assertPublicSideEffectsUnchanged(beforePlace, 'catalog place route_type_required')
  await expectEarlyError(getAdvice, { mode: 'prepare', route: '泰山', routeType: 'trek', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 0 }, 'invalid_trip_days', 'invalid days')

  const manualRequired = await getAdvice.main({ mode: 'prepare', route: '手动坐标', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1, manualLat: 40.2, manualLon: 116.5 })
  assert.equal(manualRequired.phase, 'route_type_required')
  assert.equal(manualRequired.data.resolutionKind, 'manual_place')
  assert.equal(manualRequired.data.lat, 40.2)
  assert.equal(manualRequired.data.lon, 116.5)
  assertPublicSideEffectsUnchanged(beforePlace, 'manual route_type_required')
  await expectEarlyError(getAdvice, { mode: 'prepare', route: '手动坐标', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1, manualLat: null, manualLon: 116.5, routeType: 'trek' }, 'invalid_manual_place', 'manual coordinates missing')
  const manualNegativeCases = [
    { label: 'manual elevation string', manualLat: 1, manualLon: 2, manualElevation: '120' },
    { label: 'manual latitude NaN', manualLat: NaN, manualLon: 2 },
    { label: 'manual longitude Infinity', manualLat: 1, manualLon: Infinity },
    { label: 'manual latitude out of range', manualLat: 90.1, manualLon: 2 },
    { label: 'manual longitude out of range', manualLat: 1, manualLon: -180.1 },
    { label: 'manual elevation below lower bound', manualLat: 1, manualLon: 2, manualElevation: -501 },
    { label: 'manual elevation above upper bound', manualLat: 1, manualLon: 2, manualElevation: 9001 },
  ]
  for (const invalidManual of manualNegativeCases) {
    const { label, ...fields } = invalidManual
    await expectEarlyError(getAdvice, {
      mode: 'prepare', route: '手动负例', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1,
      routeType: 'trek', ...fields,
    }, 'invalid_manual_place', label)
  }

  const manualZero = await getAdvice.main({ mode: 'prepare', route: '手动零海拔', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1, manualLat: 0, manualLon: 0, manualElevation: 0, routeType: 'trek' })
  assert.equal(manualZero.phase, 'base', JSON.stringify(manualZero))
  assert.equal(manualZero.data.routeSnapshot.referenceElevationM, 0, '手动海拔 0 必须保持有效')
  const manualNegative = await getAdvice.main({ mode: 'prepare', route: '手动负海拔', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1, manualLat: 1, manualLon: 2, manualElevation: -20, routeType: 'trek' })
  assert.equal(manualNegative.phase, 'base', JSON.stringify(manualNegative))
  assert.equal(manualNegative.data.routeSnapshot.referenceElevationM, -20, '手动负海拔必须保持有效')

  process.env.AMAP_KEY = 'offline'
  const amapRequired = await getAdvice.main({ mode: 'prepare', route: '外部测试点', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1 })
  assert.equal(amapRequired.phase, 'route_type_required')
  assert.equal(amapRequired.data.resolutionKind, 'amap_place')
  assert.equal(Object.hasOwn(amapRequired.data, 'lat'), false)
  const amapBase = await getAdvice.main({ mode: 'prepare', route: '外部测试点', routeType: 'trek', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1 })
  assert.equal(amapBase.phase, 'base', JSON.stringify(amapBase))
  assert.equal(amapBase.data.routeSnapshot.capability, 'place_only')
  assert.deepEqual(amapBase.data.routeSnapshot.routeHighestPointElevationM, null)
  assert.deepEqual(amapBase.data.routeSnapshot.verificationLevel, null)
  assert.deepEqual(amapBase.data.routeSnapshot.operationalStatus, null)
  assert.deepEqual(amapBase.data.routeSnapshot.sourceCheckedAt, null)
  assert.deepEqual(amapBase.data.sourceMetadata.routeSourceIds, [])
  assert.deepEqual(amapBase.data.sourceMetadata.routeSources, [])
  assert.equal(amapBase.data.sourceMetadata.routeTypeSource, 'amap')
  await expectEarlyError(getAdvice, { mode: 'prepare', route: '泰山', routeType: 'banana', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1 }, 'invalid_route_type', 'invalid route type')

  const base = await getAdvice.main({ mode: 'prepare', route: '武功山反穿', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 'invalid' })
  assert.equal(base.phase, 'base', JSON.stringify(base))
  assert.equal(base.data.schemaVersion, 'beta_base_v2')
  assert.equal(base.data.routeSnapshot.capability, 'full')
  assert.equal(typeof base.data.routeSnapshot.routeHighestPointElevationM, 'number')
  assert.equal(base.data.routeSnapshot.verificationLevel, 'B')
  assert.equal(base.data.routeSnapshot.operationalStatus, 'unknown')
  assert.equal(base.data.routeSnapshot.sourceCheckedAt, '2026-08-07')
  assert.deepEqual(base.data.sourceMetadata.routeSources.map((source) => source.id), base.data.sourceMetadata.routeSourceIds)
  assert.ok(base.data.sourceMetadata.routeSources.length > 0)
  assert.equal(Object.hasOwn(base.data.sourceMetadata.routeSources[0], 'supports'), false)
  assert.equal(base.data.requestSummary.days, 2)
  assert.equal(Object.hasOwn(base.data, 'weather'), false)
  assert.equal(Object.hasOwn(base.data, 'gearRules'), false)
  assert.equal(Object.hasOwn(base.data, 'meta'), false)
  assert.ok(base.data.weatherSnapshot && Array.isArray(base.data.weatherSnapshot.evaluatedWindows), '完整路线必须保留结构化小时天气')
  assert.ok(base.data.deterministicSafety && Array.isArray(base.data.deterministicSafety.fatalRisks), 'BaseData 必须携带 deterministicSafety')
  assert.ok(base.queryId && records.has(base.queryId))
  assert.deepEqual(records.get(base.queryId).snapshot, base.data)

  const legacyQueryId = 'tctx_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  records.set(legacyQueryId, {
    schemaVersion: 'trip_context_v1', _openid: openid, queryId: legacyQueryId,
    createdAt: '2026-08-08T00:00:00.000Z', expiresAt: '2026-08-08T00:30:00.000Z', snapshot: { schemaVersion: 'beta_base_v1' },
  })
  const llmBeforeLegacy = llmRequests
  const legacyAdvice = await getAdvice.main({ mode: 'advice', queryId: legacyQueryId })
  assertError(legacyAdvice, 'query_context_unavailable')
  assert.equal(llmRequests, llmBeforeLegacy, 'stored v1 context must never invoke LLM')

  process.env.LLM_KEY = 'offline'
  const deterministicBeforeAdvice = copy(records.get(base.queryId).snapshot.deterministicResult)
  const advice = await getAdvice.main({
    mode: 'advice', queryId: base.queryId,
    route: 'forged', weather: { verdict: 'go' }, baseData: { verdict: 'go' },
  })
  assert.equal(advice.phase, 'advice')
  assert.equal(advice.degraded, true)
  assert.deepEqual(Object.keys(advice.data).sort(), ['disclaimer', 'gear', 'meta', 'notes', 'risks'].sort())
  assert.deepEqual(Object.keys(advice.data.meta).sort(), ['elapsed', 'generatedAt', 'llmModel', 'degradedReason'].sort())
  assert.equal(advice.data.weather, undefined)
  assert.equal(advice.data.sunEvents, undefined)
  assert.equal(advice.data.deterministicResult, undefined)
  assert.equal(llmRequests, 1)
  assert.deepEqual(records.get(base.queryId).snapshot.deterministicResult, deterministicBeforeAdvice, 'queryId-only advice 不得让 AI 或客户端修改确定性结果')

  llmMode = 'malicious'
  const maliciousAdvice = await getAdvice.main({ mode: 'advice', queryId: base.queryId, baseData: { deterministicResult: { verdict: 'go' } } })
  assert.equal(maliciousAdvice.phase, 'advice')
  assert.equal(maliciousAdvice.degraded, false)
  assert.equal(maliciousAdvice.data.deterministicResult, undefined)
  assert.equal(maliciousAdvice.data.weather, undefined)
  assert.equal(maliciousAdvice.data.meta.degradedReason, undefined)
  assert.deepEqual(records.get(base.queryId).snapshot.deterministicResult, deterministicBeforeAdvice, '可用 AI 也不得修改服务端确定性结果')
  assert.equal(llmRequests, 2)
  llmMode = 'offline'

  const placeAdvice = await getAdvice.main({ mode: 'advice', queryId: amapBase.queryId, baseData: { deterministicResult: { verdict: 'go' }, weather: { days: [] } } })
  assert.equal(placeAdvice.phase, 'advice')
  assert.equal(placeAdvice.degraded, true)
  assert.equal(llmRequests, 3)

  const blockedBefore = weatherRequests
  const blocked = await getAdvice.main({ mode: 'prepare', route: '五台山大朝台', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 4 })
  assert.equal(blocked.phase, 'base')
  assert.equal(blocked.data.deterministicResult.verdict, 'no_go')
  assert.equal(blocked.data.requestSummary.days, null)
  assert.equal(blocked.data.weatherSnapshot, null)
  assert.equal(blocked.data.routeSnapshot.routeHighestPointElevationM, null)
  assert.equal(blocked.data.routeSnapshot.verificationLevel, 'A')
  assert.equal(blocked.data.routeSnapshot.operationalStatus, 'blocked')
  assert.equal(blocked.data.routeSnapshot.sourceCheckedAt, '2026-08-06')
  assert.deepEqual(blocked.data.sourceMetadata.routeSources.map((source) => source.id), blocked.data.sourceMetadata.routeSourceIds)
  assert.ok(blocked.queryId && records.has(blocked.queryId))
  assert.equal(weatherRequests, blockedBefore)
  const blockedAdvice = await getAdvice.main({ mode: 'advice', queryId: blocked.queryId, route: 'forged', baseData: { deterministicResult: { verdict: 'go' } } })
  assert.equal(blockedAdvice.phase, 'advice')
  assert.equal(blockedAdvice.degraded, true)
  assert.equal(llmRequests, 4)

  await expectEarlyError(getAdvice, { mode: 'prepare', route: '四姑娘山二峰', date: '2026-08-09', startTimeLocal: '08:00', level: '小白' }, 'missing_climb_support', 'missing climb support')
  await expectEarlyError(getAdvice, { mode: 'prepare', route: '武功山反穿', date: '2026-08-09', startTimeLocal: 'bad', level: '中级' }, 'invalid_start_time', 'invalid start time')
  await expectEarlyError(getAdvice, { mode: 'prepare', route: '武功山反穿', date: '2026-08-09', startTimeLocal: '08:00', level: 'unknown' }, 'invalid_level', 'invalid level')
  await expectEarlyError(getAdvice, { mode: 'confirm', candidateId: 'variant:not-found', date: '2026-08-09', startTimeLocal: '08:00', level: '中级' }, 'route_not_found', 'stale candidate')
  console.log('PASS: I21 public response and queryId-only advice contract')
}

main().catch((error) => { console.error('FAIL: ' + error.message); process.exitCode = 1 }).finally(() => {
  if (getAdviceForTests && typeof getAdviceForTests._setNowForTests === 'function') getAdviceForTests._setNowForTests(null)
  Module._load = originalLoad
  https.get = originalGet
  https.request = originalRequest
})
