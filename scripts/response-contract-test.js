/** I21 public response union and queryId-only advice contract (offline). */
const assert = require('node:assert/strict')
const Module = require('node:module')
const https = require('node:https')
const { makeHourlyResponse } = require('./fixtures/open-meteo-hourly')

let openid = 'offline-i21-user'
let weatherRequests = 0
let llmRequests = 0
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
    doc(id) { return { async set({ data }) { records.set(id, copy(data)); return { _id: id } } } },
    where(filter) { return { limit() { return { async get() { const record = records.get(filter._id); return { data: record ? [copy(record)] : [] } } } } } },
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
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'wx-server-sdk') return cloudbaseMock
  return originalLoad.call(this, request, parent, isMain)
}
https.get = function offlineGet(url, callback) {
  const target = String(url)
  if (target.startsWith('https://api.open-meteo.com/v1/forecast?')) {
    weatherRequests++
    const parsed = new URL(target)
    if (parsed.searchParams.get('hourly')) return respond(callback, makeHourlyResponse({ startDate: parsed.searchParams.get('start_date'), endDate: parsed.searchParams.get('end_date') }))
    return respond(callback, { daily_units: { wind_speed_10m_max: 'm/s' }, daily: { time: [parsed.searchParams.get('start_date')], temperature_2m_max: [20], temperature_2m_min: [10], precipitation_probability_max: [10], wind_speed_10m_max: [4] } })
  }
  if (target.startsWith('https://api.open-meteo.com/v1/elevation?')) return respond(callback, { elevation: [1200] })
  if (target.startsWith('https://restapi.amap.com/v3/place/text?')) return respond(callback, { status: '1', pois: [{ name: '外部测试点', location: '116.50,40.20', typecode: '110200', cityname: '北京市', adname: '怀柔区' }] })
  throw new Error('unexpected network: ' + target)
}
https.request = function offlineRequest(options, callback) {
  llmRequests++
  const handlers = {}
  const req = { on(event, handler) { handlers[event] = handler; return req }, write() {}, end() { process.nextTick(() => handlers.error(new Error('offline LLM'))) }, destroy() {} }
  return req
}

function assertError(response, code) {
  assert.equal(response.phase, 'error', JSON.stringify(response))
  assert.equal(response.code, code, JSON.stringify(response))
  assert.equal(response.retryable, false)
  assert.equal(response.ok, false)
}

async function main() {
  const getAdvice = require('../cloudfunctions/getAdvice/index')
  assertError(await getAdvice.main({ mode: 'base', route: '武功山反穿', date: '2026-08-09', startTimeLocal: '08:00', level: '中级' }), 'invalid_mode')
  const confirmation = await getAdvice.main({ mode: 'prepare', route: '山', date: '2026-08-09', startTimeLocal: '08:00', level: '中级' })
  assert.equal(confirmation.phase, 'confirmation')
  assert.ok(confirmation.candidates.length >= 1)
  const beforePlace = weatherRequests
  const placeRequired = await getAdvice.main({ mode: 'prepare', route: '泰山', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1 })
  assert.equal(placeRequired.phase, 'route_type_required')
  assert.equal(placeRequired.data.resolutionKind, 'catalog_place')
  assert.equal(Object.hasOwn(placeRequired.data, 'lat'), false)
  assert.equal(weatherRequests, beforePlace)

  const manualRequired = await getAdvice.main({ mode: 'prepare', route: '手动坐标', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1, manualLat: 40.2, manualLon: 116.5 })
  assert.equal(manualRequired.phase, 'route_type_required')
  assert.equal(manualRequired.data.resolutionKind, 'manual_place')
  assert.equal(manualRequired.data.lat, 40.2)
  assert.equal(manualRequired.data.lon, 116.5)
  assert.equal(weatherRequests, beforePlace)
  assertError(await getAdvice.main({ mode: 'prepare', route: '手动坐标', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1, manualLat: null, manualLon: 116.5, routeType: 'trek' }), 'invalid_manual_place')

  process.env.AMAP_KEY = 'offline'
  const amapRequired = await getAdvice.main({ mode: 'prepare', route: '外部测试点', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1 })
  assert.equal(amapRequired.phase, 'route_type_required')
  assert.equal(amapRequired.data.resolutionKind, 'amap_place')
  assert.equal(Object.hasOwn(amapRequired.data, 'lat'), false)
  const amapBase = await getAdvice.main({ mode: 'prepare', route: '外部测试点', routeType: 'trek', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1 })
  assert.equal(amapBase.phase, 'base', JSON.stringify(amapBase))
  assert.equal(amapBase.data.routeSnapshot.capability, 'place_only')
  assert.equal(amapBase.data.sourceMetadata.routeTypeSource, 'amap')
  assertError(await getAdvice.main({ mode: 'prepare', route: '泰山', routeType: 'banana', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1 }), 'invalid_route_type')

  const base = await getAdvice.main({ mode: 'prepare', route: '武功山反穿', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 'invalid' })
  assert.equal(base.phase, 'base', JSON.stringify(base))
  assert.equal(base.data.schemaVersion, 'beta_base_v1')
  assert.equal(base.data.routeSnapshot.capability, 'full')
  assert.equal(base.data.requestSummary.days, 2)
  assert.ok(base.queryId && records.has(base.queryId))
  assert.deepEqual(records.get(base.queryId).snapshot, base.data)

  process.env.LLM_KEY = 'offline'
  const advice = await getAdvice.main({
    mode: 'advice', queryId: base.queryId,
    route: 'forged', weather: { verdict: 'go' }, baseData: { verdict: 'go' },
  })
  assert.equal(advice.phase, 'advice')
  assert.equal(advice.degraded, true)
  assert.equal(llmRequests, 1)

  const blockedBefore = weatherRequests
  const blocked = await getAdvice.main({ mode: 'prepare', route: '五台山大朝台', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 4 })
  assert.equal(blocked.phase, 'base')
  assert.equal(blocked.data.deterministicResult.verdict, 'no_go')
  assert.equal(blocked.data.requestSummary.days, null)
  assert.equal(blocked.data.weatherSnapshot, null)
  assert.equal(weatherRequests, blockedBefore)

  assertError(await getAdvice.main({ mode: 'prepare', route: '武功山反穿', date: '2026-08-09', startTimeLocal: 'bad', level: '中级' }), 'invalid_start_time')
  assertError(await getAdvice.main({ mode: 'prepare', route: '武功山反穿', date: '2026-08-09', startTimeLocal: '08:00', level: 'unknown' }), 'invalid_level')
  assertError(await getAdvice.main({ mode: 'prepare', route: '手动', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', manualLat: 1, manualLon: 2.1, manualElevation: 9001, routeType: 'trek' }), 'invalid_manual_place')
  assertError(await getAdvice.main({ mode: 'confirm', candidateId: 'variant:not-found', date: '2026-08-09', startTimeLocal: '08:00', level: '中级' }), 'route_not_found')
  console.log('PASS: I21 public response and queryId-only advice contract')
}

main().catch((error) => { console.error('FAIL: ' + error.message); process.exitCode = 1 }).finally(() => {
  Module._load = originalLoad
  https.get = originalGet
  https.request = originalRequest
})
