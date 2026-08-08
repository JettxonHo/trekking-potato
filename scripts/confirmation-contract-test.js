/** I21 resolver confirmation and candidate-ID-only follow-up contract. */
const assert = require('node:assert/strict')
const Module = require('node:module')
const https = require('node:https')
const { makeHourlyResponse } = require('./fixtures/open-meteo-hourly')

const records = new Map()
const cloudbaseMock = {
  DYNAMIC_CURRENT_ENV: 'offline-confirmation-i21', init() {},
  database: () => ({ collection(name) {
    assert.equal(name, 'trip_contexts')
    return {
      doc(id) { return { async set({ data }) { records.set(id, JSON.parse(JSON.stringify(data))); return { _id: id } } } },
      where(filter) { return { limit() { return { async get() { const item = records.get(filter._id); return { data: item ? [JSON.parse(JSON.stringify(item))] : [] } } } } } },
    }
  } }),
  getWXContext: () => ({ OPENID: 'offline-confirmation-i21-user' }),
}
const originalLoad = Module._load
const originalGet = https.get
let getAdviceForTests = null
Module._load = function patchedLoad(request, parent, isMain) { if (request === 'wx-server-sdk') return cloudbaseMock; return originalLoad.call(this, request, parent, isMain) }
https.get = function offlineGet(url, callback) {
  const parsed = new URL(String(url))
  if (parsed.searchParams.get('hourly')) return respond(callback, makeHourlyResponse({ startDate: parsed.searchParams.get('start_date'), endDate: parsed.searchParams.get('end_date') }))
  if (parsed.pathname.endsWith('/elevation')) return respond(callback, { elevation: [1200] })
  return respond(callback, { daily_units: { wind_speed_10m_max: 'm/s' }, daily: { time: [parsed.searchParams.get('start_date')], temperature_2m_max: [20], temperature_2m_min: [10], precipitation_probability_max: [10], wind_speed_10m_max: [4] } })
}
function respond(callback, payload) {
  const listeners = {}
  const response = { on(event, handler) { listeners[event] = handler; return response } }
  callback(response)
  process.nextTick(() => { listeners.data && listeners.data(JSON.stringify(payload)); listeners.end && listeners.end() })
  return { on() { return this }, setTimeout() { return this }, destroy() {} }
}

async function main() {
  const getAdvice = require('../cloudfunctions/getAdvice/index')
  getAdviceForTests = getAdvice
  assert.equal(typeof getAdvice._setNowForTests, 'function', 'confirmation tests need a deterministic handler clock')
  getAdvice._setNowForTests(() => new Date('2026-08-08T00:00:00.000Z'))
  const invalidDate = await getAdvice.main({ mode: 'prepare', route: '泰山', date: '2026-08-07', startTimeLocal: '08:00', level: '中级', days: 1 })
  assert.equal(invalidDate.code, 'invalid_date')
  const required = await getAdvice.main({ mode: 'prepare', route: '泰山', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1 })
  assert.equal(required.phase, 'route_type_required')
  assert.equal(required.data.resolutionKind, 'catalog_place')
  assert.equal(required.data.candidateId, 'place:legacy:泰山')
  assert.deepEqual(required.data.input, { date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1, climbSupport: null })

  const confirmedPlace = await getAdvice.main({ mode: 'confirm', candidateId: required.data.candidateId, date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1, routeType: 'trek', route: '伪造', manualLat: 1, manualLon: 2 })
  assert.equal(confirmedPlace.phase, 'base')
  assert.equal(confirmedPlace.data.routeSnapshot.placeId, 'place:legacy:泰山')
  assert.equal(confirmedPlace.data.routeSnapshot.capability, 'place_only')
  assert.equal(confirmedPlace.data.routeSnapshot.routeType, 'trek')

  const confirmedFull = await getAdvice.main({ mode: 'confirm', candidateId: 'variant:wugongshan-longshan-to-main-gate-2d', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 99, routeType: 'climb', manualLat: 1, manualLon: 2 })
  assert.equal(confirmedFull.phase, 'base')
  assert.equal(confirmedFull.data.routeSnapshot.routeVariantId, 'variant:wugongshan-longshan-to-main-gate-2d')
  assert.equal(confirmedFull.data.routeSnapshot.routeType, 'trek')
  assert.equal(confirmedFull.data.requestSummary.days, 2)

  const blocked = await getAdvice.main({ mode: 'confirm', candidateId: 'variant:wutai-grand-pilgrimage', date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 0 })
  assert.equal(blocked.phase, 'base')
  assert.equal(blocked.data.deterministicResult.verdict, 'no_go')
  assert.equal(blocked.data.requestSummary.days, null)

  const malformed = await getAdvice.main({ mode: 'confirm', candidateId: {}, date: '2026-08-09', startTimeLocal: '08:00', level: '中级' })
  assert.equal(malformed.phase, 'error')
  assert.equal(malformed.code, 'route_not_found')
  const page = require('node:fs').readFileSync(require('node:path').join(__dirname, '../taro-app/src/pages/index/index.jsx'), 'utf8')
  assert.ok(page.includes('confirmationInput: { date: params.date, startTimeLocal: params.startTimeLocal'))
  assert.ok(page.includes('candidate.capability === \'place_only\''))
  assert.ok(page.includes('candidate.fixedDays') && page.includes('只读'), '完整候选必须显示服务端固定天数且不可编辑')
  console.log('PASS: I21 candidate confirmation and follow-up contract')
}

main().catch((error) => { console.error('FAIL: ' + error.message); process.exitCode = 1 }).finally(() => {
  if (getAdviceForTests && typeof getAdviceForTests._setNowForTests === 'function') getAdviceForTests._setNowForTests(null)
  Module._load = originalLoad
  https.get = originalGet
})
