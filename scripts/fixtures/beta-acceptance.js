/**
 * I24b offline boundary fixture.
 *
 * This module owns only deterministic transport/persistence adapters for the
 * acceptance contract. Route identity, BaseData composition, weather windows,
 * verdicts, advice projection, history DTOs and recovery seams are imported
 * from production modules by the contract test.
 */
const Module = require('node:module')
const https = require('node:https')
const { makeHourlyResponse } = require('./open-meteo-hourly')

const TEST_NOW = new Date('2026-08-08T00:00:00.000Z')
const TEST_DATE = '2026-08-09'
const TEST_START_TIME = '08:00'

const PILOTS = Object.freeze([
  {
    id: 'variant:wugongshan-longshan-to-main-gate-2d',
    search: '武功山反穿',
    canonicalName: '武功山·龙山村至景区正门反穿二日徒步线',
    routeType: 'trek',
    fixedDays: 2,
    capability: 'full',
    verificationLevel: 'B',
    operationalStatus: 'unknown',
    sourceCheckedAt: '2026-08-07',
    sourceIds: ['source:wugong-community-gpx-2026-08-07'],
  },
  {
    id: 'variant:siguniang-erfeng-haizigou-out-and-back-2d',
    search: '四姑娘山二峰',
    canonicalName: '四姑娘山二峰·海子沟两日往返线',
    routeType: 'climb',
    fixedDays: 2,
    capability: 'full',
    verificationLevel: 'B',
    operationalStatus: 'unknown',
    sourceCheckedAt: '2026-08-07',
    sourceIds: [
      'source:siguniang-erfeng-official-route-2026-08-07',
      'source:siguniang-haizigou-management-2026-08-07',
      'source:siguniang-erfeng-community-gpx-2026-08-07',
    ],
  },
  {
    id: 'variant:yulong-blue-moon-yunshanping-out-and-back-1d',
    search: '蓝月谷—云杉坪徒步往返线',
    canonicalName: '蓝月谷—云杉坪徒步往返线',
    routeType: 'trek',
    fixedDays: 1,
    capability: 'full',
    verificationLevel: 'B',
    operationalStatus: 'unknown',
    sourceCheckedAt: '2026-08-07',
    sourceIds: [
      'source:yulong-scenic-management-2026-08-07',
      'source:yulong-blue-moon-yunshanping-community-gpx-2026-08-07',
    ],
  },
  {
    id: 'variant:gongga-laoyulin-yulongxi-point-to-point-3d',
    search: '贡嘎西南坡',
    canonicalName: '贡嘎西南坡·老榆林—玉龙西三日线',
    routeType: 'trek',
    fixedDays: 3,
    capability: 'full',
    verificationLevel: 'B',
    operationalStatus: 'unknown',
    sourceCheckedAt: '2026-08-07',
    sourceIds: [
      'source:gongga-laoyulin-yulongxi-official-2026-08-07',
      'source:gongga-outdoor-management-2026-08-07',
      'source:gongga-southwest-community-gpx-2026-08-07',
    ],
  },
  {
    id: 'variant:dangling-huluhai-zhuoyongcuo-out-and-back-1d',
    search: '党岭村—葫芦海—卓雍措一日往返',
    canonicalName: '党岭村—葫芦海—卓雍措一日往返',
    routeType: 'trek',
    fixedDays: 1,
    capability: 'full',
    verificationLevel: 'B',
    operationalStatus: 'unknown',
    sourceCheckedAt: '2026-08-07',
    sourceIds: [
      'source:dangling-winter-management-2026-08-07',
      'source:dangling-huluhai-zhuoyongcuo-reviewed-track-2026-08-07',
      'source:dangling-route-identity-2026-08-07',
    ],
  },
])

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function respond(callback, payload) {
  const listeners = {}
  const response = {
    statusCode: 200,
    on(event, handler) {
      listeners[event] = handler
      return response
    },
  }
  callback(response)
  process.nextTick(() => {
    if (listeners.data) listeners.data(JSON.stringify(payload))
    if (listeners.end) listeners.end()
  })
  return {
    on() { return this },
    setTimeout() { return this },
    destroy() {},
  }
}

function forecastPayload(url) {
  const parsed = new URL(url)
  const startDate = parsed.searchParams.get('start_date')
  const endDate = parsed.searchParams.get('end_date')
  const dates = []
  const max = Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000)
  for (let offset = 0; offset <= max; offset += 1) {
    const value = new Date(Date.parse(`${startDate}T00:00:00Z`) + offset * 86400000)
    dates.push(value.toISOString().slice(0, 10))
  }
  return {
    daily_units: { wind_speed_10m_max: 'm/s' },
    daily: {
      time: dates,
      temperature_2m_max: dates.map(() => 20),
      temperature_2m_min: dates.map(() => 10),
      precipitation_probability_max: dates.map(() => 10),
      wind_speed_10m_max: dates.map(() => 4),
    },
  }
}

function createHarness() {
  const previousAmapKey = process.env.AMAP_KEY
  const previousLlmKey = process.env.LLM_KEY
  const records = new Map()
  const historyRecords = []
  const state = {
    openid: 'offline-beta-acceptance-user',
    weatherMode: 'complete',
    llmMode: 'unavailable',
    httpRequests: 0,
    hourlyWeatherRequests: 0,
    referenceWeatherRequests: 0,
    elevationRequests: 0,
    amapRequests: 0,
    tripContextWrites: 0,
    tripContextReads: 0,
    llmRequests: 0,
    historyAdds: 0,
    historyReads: 0,
    historyRemoves: 0,
  }
  let nextHistoryId = 1

  function matchingHistory(filter) {
    return historyRecords.filter((record) => Object.keys(filter).every((key) => record[key] === filter[key]))
  }

  function historyCollection() {
    let filter = {}
    let limit = 20
    let order = null
    const chain = {
      where(value) { filter = value || {}; return chain },
      orderBy(field, direction) { order = { field, direction }; return chain },
      limit(value) { limit = value; return chain },
      async get() {
        state.historyReads += 1
        let recordsForQuery = matchingHistory(filter)
        if (order) {
          recordsForQuery = recordsForQuery.slice().sort((left, right) => {
            const leftValue = left[order.field] instanceof Date ? left[order.field].getTime() : 0
            const rightValue = right[order.field] instanceof Date ? right[order.field].getTime() : 0
            return order.direction === 'desc' ? rightValue - leftValue : leftValue - rightValue
          })
        }
        return { data: clone(recordsForQuery.slice(0, limit)) }
      },
      async add({ data }) {
        state.historyAdds += 1
        const record = { _id: `history-beta-${nextHistoryId++}`, ...clone(data) }
        historyRecords.push(record)
        return { _id: record._id }
      },
      async remove() {
        state.historyRemoves += 1
        const before = historyRecords.length
        for (let index = historyRecords.length - 1; index >= 0; index -= 1) {
          if (Object.keys(filter).every((key) => historyRecords[index][key] === filter[key])) historyRecords.splice(index, 1)
        }
        return { stats: { removed: before - historyRecords.length } }
      },
    }
    return chain
  }

  function tripContextCollection() {
    return {
      doc(id) {
        return {
          async set({ data }) {
            state.tripContextWrites += 1
            records.set(id, clone(data))
            return { _id: id }
          },
        }
      },
      where(filter) {
        return {
          limit() {
            return {
              async get() {
                state.tripContextReads += 1
                const record = records.get(filter && filter._id)
                return { data: record ? [clone(record)] : [] }
              },
            }
          },
        }
      },
    }
  }

  const cloudbaseMock = {
    DYNAMIC_CURRENT_ENV: 'offline-beta-acceptance',
    init() {},
    database() {
      return {
        serverDate() { return new Date('2026-08-08T00:00:00.000Z') },
        collection(name) {
          if (name === 'trip_contexts') return tripContextCollection()
          if (name === 'history') return historyCollection()
          if (name === 'routes') throw new Error('I24b must not access public routes collection')
          throw new Error(`unexpected collection: ${name}`)
        },
      }
    },
    getWXContext() { return { OPENID: state.openid } },
  }

  const originalLoad = Module._load
  const originalGet = https.get
  const originalRequest = https.request
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'wx-server-sdk') return cloudbaseMock
    return originalLoad.call(this, request, parent, isMain)
  }

  https.get = function offlineGet(url, callback) {
    state.httpRequests += 1
    const target = String(url)
    const parsed = new URL(target)
    if (parsed.hostname === 'api.open-meteo.com' && parsed.searchParams.has('hourly')) {
      state.hourlyWeatherRequests += 1
      if (state.weatherMode === 'transport') throw new Error('offline weather transport')
      if (state.weatherMode === 'insufficient') return respond(callback, { error: true, reason: 'offline weather unavailable' })
      if (state.weatherMode === 'invalid') return respond(callback, { timezone: 'UTC', hourly_units: {}, hourly: {} })
      return respond(callback, makeHourlyResponse({ startDate: parsed.searchParams.get('start_date'), endDate: parsed.searchParams.get('end_date') }))
    }
    if (parsed.hostname === 'api.open-meteo.com' && parsed.pathname.endsWith('/elevation')) {
      state.elevationRequests += 1
      return respond(callback, { elevation: [1200] })
    }
    if (parsed.hostname === 'api.open-meteo.com') {
      state.referenceWeatherRequests += 1
      if (state.weatherMode === 'transport') throw new Error('offline weather transport')
      if (state.weatherMode === 'insufficient') return respond(callback, { error: true, reason: 'offline reference weather unavailable' })
      if (state.weatherMode === 'invalid') return respond(callback, { daily_units: {}, daily: {} })
      return respond(callback, forecastPayload(target))
    }
    if (parsed.hostname === 'restapi.amap.com' && parsed.pathname.endsWith('/v3/place/text')) {
      state.amapRequests += 1
      return respond(callback, {
        status: '1',
        pois: [{ name: '外部测试点', location: '116.50,40.20', typecode: '110200', cityname: '北京市', adname: '怀柔区' }],
      })
    }
    throw new Error('unexpected offline GET: ' + target)
  }

  https.request = function offlineRequest(options, callback) {
    state.httpRequests += 1
    state.llmRequests += 1
    const handlers = {}
    const request = {
      on(event, handler) { handlers[event] = handler; return request },
      write() {},
      end() {
        process.nextTick(() => {
          if (state.llmMode === 'unavailable') {
            if (handlers.error) handlers.error(new Error('offline LLM transport'))
            return
          }
          const listeners = {}
          const response = {
            statusCode: 200,
            on(event, handler) { listeners[event] = handler; return response },
          }
          callback(response)
          let content = 'invalid AI response'
          if (state.llmMode === 'available') {
            content = JSON.stringify({
              gearAdditions: { recommended: [{ item: 'AI备用头灯', reason: '示例补充' }], optional: [] },
              riskExplanations: [],
              notes: ['离线 AI 解释'],
              deterministicResult: { verdict: 'go' },
            })
          }
          if (listeners.data) listeners.data(JSON.stringify({ choices: [{ message: { content } }] }))
          if (listeners.end) listeners.end()
        })
      },
      destroy() {},
    }
    return request
  }

  process.env.AMAP_KEY = 'offline-beta-acceptance'
  process.env.LLM_KEY = 'offline-beta-acceptance'

  const getAdvice = require('../../cloudfunctions/getAdvice/index')
  const history = require('../../cloudfunctions/history/index')
  getAdvice._setNowForTests(() => new Date(TEST_NOW.getTime()))

  function counters() {
    return {
      httpRequests: state.httpRequests,
      hourlyWeatherRequests: state.hourlyWeatherRequests,
      referenceWeatherRequests: state.referenceWeatherRequests,
      elevationRequests: state.elevationRequests,
      amapRequests: state.amapRequests,
      tripContextWrites: state.tripContextWrites,
      tripContextReads: state.tripContextReads,
      llmRequests: state.llmRequests,
      historyAdds: state.historyAdds,
      historyReads: state.historyReads,
      historyRemoves: state.historyRemoves,
    }
  }

  function restore() {
    getAdvice._setNowForTests(null)
    Module._load = originalLoad
    https.get = originalGet
    https.request = originalRequest
    if (previousAmapKey === undefined) delete process.env.AMAP_KEY
    else process.env.AMAP_KEY = previousAmapKey
    if (previousLlmKey === undefined) delete process.env.LLM_KEY
    else process.env.LLM_KEY = previousLlmKey
  }

  return {
    getAdvice,
    history,
    state,
    records,
    historyRecords,
    counters,
    restore,
    setOpenid(value) { state.openid = value },
  }
}

module.exports = {
  PILOTS,
  TEST_DATE,
  TEST_NOW,
  TEST_START_TIME,
  clone,
  createHarness,
}
