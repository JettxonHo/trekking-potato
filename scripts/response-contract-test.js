/**
 * getAdvice I04 响应阶段契约（离线）。
 *
 * 该测试通过公开的 main(event) 接缝调用云函数；不会访问网络或真实 CloudBase。
 */
const Module = require('module')
const https = require('https')
const fs = require('fs')
const path = require('path')
const openMeteoFixture = require('./fixtures/open-meteo-forecast')
const originalLlmKey = process.env.LLM_KEY

let openid = 'offline-response-contract-user'
let throwOnAuthLookup = false
let contextWriteFailure = false
let contextWriteAttempts = 0
let contextReadCount = 0
let contextReadFailure = false
const contextWrites = []
const contextRecords = new Map()

function copy(value) {
  return JSON.parse(JSON.stringify(value))
}

function tripContextCollection() {
  return {
    doc(queryId) {
      if (typeof queryId !== 'string' || queryId.length === 0) {
        throw new Error('TripContext document id 必须为非空字符串')
      }
      return {
        async set(payload) {
          contextWriteAttempts++
          if (!payload || Object.keys(payload).length !== 1 || !Object.prototype.hasOwnProperty.call(payload, 'data')) {
            throw new Error('TripContext 只允许 set({ data: record })')
          }
          if (contextWriteFailure) throw new Error('offline TripContext write failure')
          const record = copy(payload.data)
          contextWrites.push({ collection: 'trip_contexts', queryId, record })
          contextRecords.set(queryId, record)
          return { _id: queryId }
        },
      }
    },
    where(filter) {
      contextReadCount++
      if (!filter || Object.keys(filter).length !== 1 || typeof filter._id !== 'string') {
        throw new Error('TripContext 只允许 where({ _id: queryId })')
      }
      return {
        limit(limit) {
          if (limit !== 1) throw new Error('TripContext 读取必须 limit(1)')
          return {
            async get() {
              if (contextReadFailure) throw new Error('offline TripContext read failure')
              const record = contextRecords.get(filter._id)
              return { data: record ? [copy(record)] : [] }
            },
          }
        },
      }
    },
  }
}

const cloudbaseMock = {
  DYNAMIC_CURRENT_ENV: 'offline-response-contract',
  init() {},
  database: () => ({
    collection(name) {
      if (name === 'trip_contexts') return tripContextCollection()
      if (name === 'routes') {
        return { limit: () => ({ get: async () => ({ data: [] }) }) }
      }
      throw new Error('response-contract-test 不允许 CloudBase collection: ' + name)
    },
  }),
  getWXContext: () => {
    if (throwOnAuthLookup) throw new Error('offline auth lookup failure')
    return { OPENID: openid }
  },
}

const originalModuleLoad = Module._load
const originalHttpsGet = https.get
const originalHttpsRequest = https.request
let weatherResponseMode = 'success'
let weatherRequestCount = 0
let llmRequestCount = 0
let lastLlmRequestBody = null
Module._load = function loadOfflineCloudbase(request, parent, isMain) {
  if (request === 'wx-server-sdk') return cloudbaseMock
  return originalModuleLoad.call(this, request, parent, isMain)
}

function respond(callback, payload) {
  const listeners = {}
  const response = {
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

function weatherFixtureFor(url) {
  if (weatherResponseMode === 'out_of_range') {
    return { error: true, reason: 'start_date is out of allowed range for end_date' }
  }
  if (weatherResponseMode === 'invalid') return { daily: {} }

  const params = new URL(url).searchParams
  const start = params.get('start_date')
  const end = params.get('end_date')
  const startIndex = openMeteoFixture.daily.time.indexOf(start)
  const endIndex = openMeteoFixture.daily.time.indexOf(end)
  if (startIndex < 0 || endIndex < startIndex) {
    throw new Error('离线天气 fixture 不包含请求窗口: ' + start + ' 至 ' + end)
  }
  const take = (values) => values.slice(startIndex, endIndex + 1)
  return {
    daily_units: openMeteoFixture.daily_units,
    daily: {
      time: take(openMeteoFixture.daily.time),
      temperature_2m_max: take(openMeteoFixture.daily.temperature_2m_max),
      temperature_2m_min: take(openMeteoFixture.daily.temperature_2m_min),
      precipitation_probability_max: take(openMeteoFixture.daily.precipitation_probability_max),
      wind_speed_10m_max: take(openMeteoFixture.daily.wind_speed_10m_max),
    },
  }
}

https.get = function getOfflineResponse(url, callback) {
  const target = String(url)
  if (target.startsWith('https://api.open-meteo.com/v1/forecast?')) {
    weatherRequestCount++
    return respond(callback, weatherFixtureFor(target))
  }
  if (target.startsWith('https://restapi.amap.com/v3/place/text?')) {
    return respond(callback, {
      status: '1',
      pois: [{
        name: '契约测试外部山峰',
        location: '116.50,40.20',
        typecode: '110200',
        cityname: '北京市',
        adname: '怀柔区',
      }],
    })
  }
  if (target.startsWith('https://api.open-meteo.com/v1/elevation?')) {
    return respond(callback, { elevation: [1234] })
  }
  throw new Error('response-contract-test 不允许网络请求: ' + target)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertThrows(callback, message) {
  let thrown = false
  try {
    callback()
  } catch (_error) {
    thrown = true
  }
  assert(thrown, message)
}

function assertError(response, code, retryable) {
  const expectedRetryable = retryable === true
  assert(response.phase === 'error', code + ' 必须返回 phase=error，实际=' + JSON.stringify(response))
  assert(response.code === code, code + ' 必须返回同名 code，实际=' + JSON.stringify(response))
  assert(typeof response.message === 'string' && response.message.trim().length > 0, code + ' 必须返回非空用户可见 message，实际=' + JSON.stringify(response))
  assert(response.retryable === expectedRetryable, code + ' retryable 不符合冻结映射，实际=' + JSON.stringify(response))
  assert(response.ok === false && response.error === code, code + ' 的兼容字段必须一致，实际=' + JSON.stringify(response))
  assert(!Object.prototype.hasOwnProperty.call(response, 'data'), code + ' 不得携带 data，实际=' + JSON.stringify(response))
  assert(!Object.prototype.hasOwnProperty.call(response, 'degraded'), code + ' 不得携带 degraded，实际=' + JSON.stringify(response))
  assert(!Object.prototype.hasOwnProperty.call(response, 'displayName'), code + ' 不得携带 displayName，实际=' + JSON.stringify(response))
  assert(!Object.prototype.hasOwnProperty.call(response, 'allowedTypes'), code + ' 不得携带 allowedTypes，实际=' + JSON.stringify(response))
}

function assertExclusivePhaseFields(response) {
  if (response.phase === 'error') return
  assert(!Object.prototype.hasOwnProperty.call(response, 'code'), response.phase + ' 不得携带 error code')
  assert(!Object.prototype.hasOwnProperty.call(response, 'retryable'), response.phase + ' 不得携带 retryable')

  if (response.phase === 'confirmation') {
    assert(typeof response.message === 'string' && Array.isArray(response.candidates), 'confirmation 必须包含 message/candidates')
    assert(!Object.prototype.hasOwnProperty.call(response, 'data'), 'confirmation 不得携带旧 data')
    assert(!Object.prototype.hasOwnProperty.call(response, 'displayName'), 'confirmation 不得携带 displayName')
    assert(!Object.prototype.hasOwnProperty.call(response, 'allowedTypes'), 'confirmation 不得携带 allowedTypes')
    assert(!Object.prototype.hasOwnProperty.call(response, 'degraded'), 'confirmation 不得携带 degraded')
    assert(!Object.prototype.hasOwnProperty.call(response, 'needsRouteType'), 'confirmation 不得携带 needsRouteType')
    return
  }

  if (response.phase === 'route_type_required') {
    assert(typeof response.displayName === 'string' && response.data, 'route_type_required 必须包含 displayName/data')
    assert(Array.isArray(response.allowedTypes), 'route_type_required 必须包含 allowedTypes')
    assert(!Object.prototype.hasOwnProperty.call(response, 'degraded'), 'route_type_required 不得携带 degraded')
    assert(!Object.prototype.hasOwnProperty.call(response, 'message'), 'route_type_required 不得携带 confirmation/error message')
    assert(!Object.prototype.hasOwnProperty.call(response, 'needsConfirm'), 'route_type_required 不得携带 needsConfirm')
    return
  }

  if (response.phase === 'base') {
    assert(response.data, 'base 必须包含 data')
    assert(typeof response.queryId === 'string' && response.queryId.length > 0, 'base 必须在顶层包含 queryId')
    assert(typeof response.expiresAt === 'string' && response.expiresAt.length > 0, 'base 必须在顶层包含 expiresAt')
    assert(!Object.prototype.hasOwnProperty.call(response.data, 'queryId'), 'base data 不得重复包含 queryId')
    assert(!Object.prototype.hasOwnProperty.call(response.data, 'expiresAt'), 'base data 不得重复包含 expiresAt')
    assert(!Object.prototype.hasOwnProperty.call(response, 'degraded'), 'base 不得携带 degraded')
    assert(!Object.prototype.hasOwnProperty.call(response, 'message'), 'base 不得携带 message')
    assert(!Object.prototype.hasOwnProperty.call(response, 'displayName'), 'base 不得携带 displayName')
    assert(!Object.prototype.hasOwnProperty.call(response, 'allowedTypes'), 'base 不得携带 allowedTypes')
    return
  }

  if (response.phase === 'advice') {
    assert(response.data && typeof response.degraded === 'boolean', 'advice 必须包含 data/degraded')
    assert(!Object.prototype.hasOwnProperty.call(response, 'message'), 'advice 不得携带 message')
    assert(!Object.prototype.hasOwnProperty.call(response, 'displayName'), 'advice 不得携带 displayName')
    assert(!Object.prototype.hasOwnProperty.call(response, 'allowedTypes'), 'advice 不得携带 allowedTypes')
    return
  }

  throw new Error('未知 phase: ' + JSON.stringify(response))
}

function installLlmMock(mode, advicePayload) {
  https.request = function requestOfflineLlm(options, callback) {
    llmRequestCount++
    const requestHandlers = {}
    const responseHandlers = {}
    let requestBody = ''
    const response = {
      statusCode: 200,
      on(event, handler) {
        responseHandlers[event] = handler
        return response
      },
    }
    const request = {
      on(event, handler) {
        requestHandlers[event] = handler
        return request
      },
      write(chunk) { requestBody += chunk },
      end() {
        process.nextTick(() => {
          lastLlmRequestBody = requestBody ? JSON.parse(requestBody) : null
          if (mode === 'failure') {
            requestHandlers.error(new Error('offline LLM failure'))
            return
          }
          callback(response)
          process.nextTick(() => {
            const content = mode === 'non_json_content'
              ? 'this is not JSON'
              : JSON.stringify(advicePayload || {
                gearAdditions: { recommended: [], optional: [] },
                riskExplanations: [],
                notes: [],
              })
            const payload = mode === 'malformed_envelope'
              ? { choices: [] }
              : { choices: [{ message: { content } }] }
            responseHandlers.data(JSON.stringify(payload))
            responseHandlers.end()
          })
        })
      },
      destroy() {},
    }
    return request
  }
}

function pageMethod(source, name, nextName) {
  const start = source.indexOf('  ' + name)
  const end = source.indexOf('  ' + nextName, start + 1)
  return source.slice(start, end)
}

function sourceBranch(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start + startMarker.length)
  assert(start >= 0 && end > start, '未找到前端分支边界: ' + startMarker)
  return source.slice(start, end)
}

async function main() {
  const { baseResponse } = require('../cloudfunctions/getAdvice/response-contract')
  assertThrows(() => baseResponse({ route: '武功山' }), 'baseResponse 必须拒绝缺少可信上下文元数据的调用')

  const getAdvice = require('../cloudfunctions/getAdvice/index')
  const response = await getAdvice.main({
    mode: 'unsupported-mode',
    route: '武功山',
    date: '2026-08-07',
    level: '中级',
  })

  assertError(response, 'invalid_mode')

  const missingMode = await getAdvice.main({ route: '武功山', date: '2026-08-07', level: '中级' })
  assertError(missingMode, 'invalid_mode')

  const missingParams = await getAdvice.main({ mode: 'prepare' })
  assertError(missingParams, 'missing_params')

  const weatherBeforeConfirmation = weatherRequestCount
  const confirmation = await getAdvice.main({
    mode: 'prepare',
    route: '卖理浩径',
    date: '2026-08-07',
    level: '中级',
  })
  assert(confirmation.phase === 'confirmation', '模糊匹配必须返回 phase=confirmation，实际=' + JSON.stringify(confirmation))
  assert(confirmation.ok === true && confirmation.needsConfirm === true, '确认态兼容字段必须一致，实际=' + JSON.stringify(confirmation))
  assert(confirmation.candidates && confirmation.candidates.length === 1 && confirmation.candidates[0].canonicalName === '麦理浩径', '确认态必须给出候选路线，实际=' + JSON.stringify(confirmation))
  assert(confirmation.candidates[0].candidateId === 'builtin-route:麦理浩径', '确认态必须提供稳定 candidateId，实际=' + JSON.stringify(confirmation))
  assert(weatherRequestCount === weatherBeforeConfirmation, 'confirmation 必须在天气查询前返回')
  assertExclusivePhaseFields(confirmation)

  process.env.AMAP_KEY = 'offline-response-contract-key'
  const weatherBeforeRouteType = weatherRequestCount
  const routeTypeRequired = await getAdvice.main({
    mode: 'prepare',
    route: '契约测试外部山峰甲',
    date: '2026-08-07',
    level: '中级',
  })
  assert(routeTypeRequired.phase === 'route_type_required', '未知路线类型必须返回 phase=route_type_required，实际=' + JSON.stringify(routeTypeRequired))
  assert(routeTypeRequired.displayName === '契约测试外部山峰', 'route_type_required 必须提供 displayName，实际=' + JSON.stringify(routeTypeRequired))
  assert(JSON.stringify(routeTypeRequired.allowedTypes) === JSON.stringify(['trek', 'climb', 'tour']), 'route_type_required 必须提供固定 allowedTypes，实际=' + JSON.stringify(routeTypeRequired))
  const routeTypeData = routeTypeRequired.data
  const requiredRouteTypeFields = ['name', 'lat', 'lon', 'elevation', 'location', 'routeTypeOptions']
  assert(routeTypeData && requiredRouteTypeFields.every((field) => Object.prototype.hasOwnProperty.call(routeTypeData, field)), 'route_type_required data 必须包含迁移期全部字段，实际=' + JSON.stringify(routeTypeRequired))
  assert(typeof routeTypeData.name === 'string' && typeof routeTypeData.lat === 'number' && typeof routeTypeData.lon === 'number' && typeof routeTypeData.location === 'string', 'route_type_required data 的位置字段必须完整，实际=' + JSON.stringify(routeTypeRequired))
  assert(JSON.stringify(routeTypeData.routeTypeOptions) === JSON.stringify(['trek', 'climb', 'tour']), 'route_type_required data 必须保留选项，实际=' + JSON.stringify(routeTypeRequired))
  assert(routeTypeRequired.ok === false && routeTypeRequired.error === 'route_type_required' && routeTypeRequired.needsRouteType === true, 'route_type_required 兼容字段必须一致，实际=' + JSON.stringify(routeTypeRequired))
  assert(weatherRequestCount === weatherBeforeRouteType, 'route_type_required 必须在天气查询前返回')
  assertExclusivePhaseFields(routeTypeRequired)

  const base = await getAdvice.main({
    mode: 'prepare',
    route: '武功山',
    date: '2026-08-07',
    level: '中级',
  })
  assert(base.phase === 'base' && base.ok === true, 'prepare 成功必须返回 phase=base，实际=' + JSON.stringify(base))
  assert(base.data && base.data.route === '武功山' && base.data.routeType === 'trek', 'base 必须保留可信路线数据，实际=' + JSON.stringify(base))
  assertExclusivePhaseFields(base)
  assert(contextWrites.length === 1, '成功 prepare 必须只持久化一次 TripContext')
  assert(contextWrites[0].collection === 'trip_contexts' && contextWrites[0].queryId === base.queryId, 'prepare 的 TripContext 必须写入 queryId 对应文档')
  assert(contextWrites[0].record._openid === openid, 'TripContext 必须绑定当前服务端 openid')
  assert(JSON.stringify(contextWrites[0].record.snapshot) === JSON.stringify(base.data), 'base data 必须直接使用已持久化的可信快照')

  process.env.LLM_KEY = 'offline-response-contract-key'
  installLlmMock('failure')
  const legacyFieldsMustNotBeRead = { mode: 'advice', queryId: base.queryId }
  for (const field of ['route', 'date', 'level', 'days', 'baseData', 'weather']) {
    Object.defineProperty(legacyFieldsMustNotBeRead, field, {
      enumerable: true,
      get() { throw new Error('I18 advice 不得读取客户端 ' + field) },
    })
  }
  const llmBeforeQueryOnlyAdvice = llmRequestCount
  const queryOnlyAdvice = await getAdvice.main(legacyFieldsMustNotBeRead)
  assert(queryOnlyAdvice.phase === 'advice' && queryOnlyAdvice.degraded === true, 'owner 只发送 queryId 必须从可信快照返回降级 advice')
  assert(llmRequestCount === llmBeforeQueryOnlyAdvice + 1, 'owner queryId advice 必须调用 AI 一次')
  assert(contextReadCount === 1, 'owner queryId advice 必须只读取一次 TripContext')
  assert(lastLlmRequestBody && JSON.stringify(lastLlmRequestBody.messages).includes('武功山'), 'owner queryId advice 的 Prompt 必须来自可信快照')

  const writesBeforeBaseAlias = contextWrites.length
  const baseAlias = await getAdvice.main({
    mode: 'base', route: '武功山', date: '2026-08-07', level: '中级',
  })
  assert(baseAlias.phase === 'base' && baseAlias.ok === true, 'base 必须仅作为 prepare 的兼容别名，实际=' + JSON.stringify(baseAlias))
  assertExclusivePhaseFields(baseAlias)
  assert(contextWrites.length === writesBeforeBaseAlias + 1, '兼容 base 必须只持久化一次 TripContext')
  assert(contextWrites[contextWrites.length - 1].queryId === baseAlias.queryId, '兼容 base 必须返回对应持久化文档的 queryId')

  const writesBeforeUnavailable = contextWrites.length
  const attemptsBeforeUnavailable = contextWriteAttempts
  contextWriteFailure = true
  const unavailable = await getAdvice.main({
    mode: 'prepare', route: '武功山', date: '2026-08-07', level: '中级',
  })
  contextWriteFailure = false
  assertError(unavailable, 'context_unavailable', true)
  assert(!Object.prototype.hasOwnProperty.call(unavailable, 'queryId') && !Object.prototype.hasOwnProperty.call(unavailable, 'expiresAt'), 'TripContext 写入失败不得返回上下文元数据')
  assert(contextWriteAttempts === attemptsBeforeUnavailable + 1 && contextWrites.length === writesBeforeUnavailable, '失败写入不得留下可用 TripContext 快照')

  const writesAfterBaseOutcomes = contextWrites.length
  openid = ''
  const readsBeforeNoAuthAdvice = contextReadCount
  const noAuthAdvice = await getAdvice.main({ mode: 'advice', queryId: base.queryId })
  assertError(noAuthAdvice, 'no_auth')
  assert(contextReadCount === readsBeforeNoAuthAdvice, '未认证 advice 必须在 TripContext read 前失败')
  const noAuth = await getAdvice.main({ mode: 'prepare' })
  assertError(noAuth, 'no_auth')
  openid = 'offline-response-contract-user'

  throwOnAuthLookup = true
  const internalError = await getAdvice.main({ mode: 'prepare' })
  assertError(internalError, 'internal_error')
  assert(!internalError.message.includes('重试'), 'internal_error 不得以 retryable=false 的同时承诺重试，实际=' + JSON.stringify(internalError))
  throwOnAuthLookup = false

  const invalidDays = await getAdvice.main({
    mode: 'prepare', route: '武功山', date: '2026-08-07', level: '中级', days: 0,
  })
  assertError(invalidDays, 'invalid_trip_days')

  const invalidDate = await getAdvice.main({
    mode: 'prepare', route: '武功山', date: '2026-02-30', level: '中级',
  })
  assertError(invalidDate, 'invalid_date')

  const invalidRouteType = await getAdvice.main({
    mode: 'prepare', route: '手动坐标', date: '2026-08-07', level: '中级', manualLat: 30, manualLon: 120, routeType: 'invalid',
  })
  assertError(invalidRouteType, 'invalid_route_type')

  delete process.env.AMAP_KEY
  const locationFailed = await getAdvice.main({
    mode: 'prepare', route: '无位置测试路线', date: '2026-08-07', level: '中级',
  })
  assertError(locationFailed, 'location_failed')
  process.env.AMAP_KEY = 'offline-response-contract-key'

  weatherResponseMode = 'out_of_range'
  const outOfRange = await getAdvice.main({
    mode: 'prepare', route: '武功山', date: '2026-08-07', level: '中级',
  })
  assertError(outOfRange, 'out_of_range')
  assert(outOfRange.requestedStartDate === '2026-08-07' && outOfRange.requestedEndDate === '2026-08-07', 'out_of_range 必须保留请求日期窗口，实际=' + JSON.stringify(outOfRange))

  weatherResponseMode = 'invalid'
  const invalidWeather = await getAdvice.main({
    mode: 'prepare', route: '武功山', date: '2026-08-07', level: '中级',
  })
  assertError(invalidWeather, 'weather_data_invalid', true)
  weatherResponseMode = 'success'
  assert(contextReadCount === 1, 'prepare/base 及其错误分支不得读取 TripContext')

  const llmBeforeContextErrors = llmRequestCount
  const readsBeforeMissingContext = contextReadCount
  const missingContext = await getAdvice.main({ mode: 'advice' })
  assertError(missingContext, 'query_context_unavailable')
  assert(contextReadCount === readsBeforeMissingContext, '缺失 queryId 不得查询 TripContext')

  const unknownContext = await getAdvice.main({
    mode: 'advice', queryId: 'tctx_00000000-0000-4000-8000-000000000000',
  })
  assertError(unknownContext, 'query_context_unavailable')
  assert(unknownContext.message === '本次查询已失效，请重新查询', 'query_context_unavailable 必须使用冻结的重新查询提示')
  assert(!['queryId', 'expiresAt', 'snapshot'].some((field) => Object.prototype.hasOwnProperty.call(unknownContext, field)), 'query_context_unavailable 不得泄露上下文元数据')

  const ownerOpenid = openid
  openid = 'offline-foreign-context-user'
  const foreignContext = await getAdvice.main({ mode: 'advice', queryId: base.queryId })
  openid = ownerOpenid
  assertError(foreignContext, 'query_context_unavailable')

  const aliasContextRecord = contextRecords.get(baseAlias.queryId)
  aliasContextRecord.expiresAt = '2000-01-01T00:00:00.000Z'
  const expiredContext = await getAdvice.main({ mode: 'advice', queryId: baseAlias.queryId })
  assertError(expiredContext, 'query_context_unavailable')
  assert(JSON.stringify(unknownContext) === JSON.stringify(foreignContext)
    && JSON.stringify(unknownContext) === JSON.stringify(expiredContext), 'unknown、foreign、expired 必须公开为同一上下文不可用响应')

  contextReadFailure = true
  const unavailableContext = await getAdvice.main({ mode: 'advice', queryId: base.queryId })
  contextReadFailure = false
  assertError(unavailableContext, 'context_unavailable', true)
  assert(unavailableContext.message === '暂时无法读取本次查询，请重试', 'context_unavailable 必须使用冻结的可重试提示')
  assert(!['queryId', 'expiresAt', 'snapshot'].some((field) => Object.prototype.hasOwnProperty.call(unavailableContext, field)), 'context_unavailable 不得泄露上下文元数据')
  assert(!unavailableContext.message.includes('offline TripContext'), '存储读取失败不得泄露 mock 或原始错误')
  assert(llmRequestCount === llmBeforeContextErrors, '上下文不可用不得调用 AI')

  const degradedAdvice = await getAdvice.main({
    mode: 'advice', queryId: base.queryId,
  })
  assert(degradedAdvice.phase === 'advice' && degradedAdvice.degraded === true, 'LLM 降级仍必须返回 phase=advice，实际=' + JSON.stringify(degradedAdvice))
  assertExclusivePhaseFields(degradedAdvice)
  assert(degradedAdvice.data.meta.degradedReason === 'ai_unavailable', 'LLM 调用失败必须只在 data.meta 记录 ai_unavailable')

  installLlmMock('success', {
    gearAdditions: { recommended: [], optional: [] },
    riskExplanations: '不是数组',
    notes: [],
  })
  const invalidAdvice = await getAdvice.main({
    mode: 'advice', queryId: base.queryId,
  })
  assert(invalidAdvice.phase === 'advice' && invalidAdvice.degraded === true, 'AI schema 无效仍必须返回降级 advice')
  assert(invalidAdvice.data.meta.degradedReason === 'ai_output_invalid', 'AI schema 无效必须只在 data.meta 记录 ai_output_invalid')
  assert(JSON.stringify(invalidAdvice.data.gear) === JSON.stringify(degradedAdvice.data.gear)
    && JSON.stringify(invalidAdvice.data.risks) === JSON.stringify(degradedAdvice.data.risks)
    && JSON.stringify(invalidAdvice.data.notes) === JSON.stringify(degradedAdvice.data.notes), 'AI 无效与不可用必须共享确定性核心')

  installLlmMock('non_json_content')
  const nonJsonAdvice = await getAdvice.main({
    mode: 'advice', queryId: base.queryId,
  })
  assert(nonJsonAdvice.phase === 'advice' && nonJsonAdvice.degraded === true, 'LLM non-JSON content 必须返回降级 advice')
  assert(nonJsonAdvice.data.meta.degradedReason === 'ai_output_invalid', 'LLM non-JSON content 必须标记 ai_output_invalid')

  installLlmMock('malformed_envelope')
  const malformedEnvelopeAdvice = await getAdvice.main({
    mode: 'advice', queryId: base.queryId,
  })
  assert(malformedEnvelopeAdvice.phase === 'advice' && malformedEnvelopeAdvice.degraded === true, 'LLM 畸形 envelope 必须返回降级 advice')
  assert(malformedEnvelopeAdvice.data.meta.degradedReason === 'ai_output_invalid', 'LLM 畸形 envelope 必须标记 ai_output_invalid')

  installLlmMock('success', {
    gearAdditions: { recommended: [{ item: '  头灯  ', reason: '  天黑备用  ' }], optional: [] },
    riskExplanations: [{ risk: '雷暴风险', explanation: '  尽早下撤  ' }],
    notes: ['  随身携带雨具  '],
    essential: [],
    risks: [],
    verdict: 'go',
    weather: { days: [] },
    meta: { injected: true },
  })
  const normalAdvice = await getAdvice.main({
    mode: 'advice', queryId: base.queryId, route: 'EVENT_ROUTE_MUST_NOT_REACH_PROMPT', date: 'EVENT_DATE_MUST_NOT_REACH_PROMPT', level: 'EVENT_LEVEL_MUST_NOT_REACH_PROMPT', days: 7, baseData: base.data,
  })
  assert(normalAdvice.phase === 'advice' && normalAdvice.degraded === false, '正常 AI 结果必须返回 phase=advice，实际=' + JSON.stringify(normalAdvice))
  assertExclusivePhaseFields(normalAdvice)
  assert(JSON.stringify(normalAdvice.data.gear.essential) === JSON.stringify(base.data.gearRules.essential), 'handler 正常路径不得允许 AI 覆盖确定性必备装备')
  assert(normalAdvice.data.gear.recommended.some((item) => item.item === '头灯'), 'handler 正常路径只能追加白名单装备')
  assert(normalAdvice.data.risks.every((risk) => risk.level === '致命'), 'handler 风险等级必须保持确定性致命等级')
  assert(!Object.prototype.hasOwnProperty.call(normalAdvice.data, 'verdict') && !Object.prototype.hasOwnProperty.call(normalAdvice.data, 'degradedReason'), '越权 AI 字段和第二 degradedReason 位置不得进入 data')
  assert(JSON.stringify(normalAdvice.data.weather) === JSON.stringify(base.data.weather)
    && JSON.stringify(normalAdvice.data.sunEvents) === JSON.stringify(base.data.sunEvents), 'weather/sunEvents 必须仅来自可信快照')
  assert(lastLlmRequestBody && !JSON.stringify(lastLlmRequestBody.messages).includes('EVENT_'), 'Prompt 不得读取 event 中重复路线事实')

  const pageSource = fs.readFileSync(path.join(__dirname, '../taro-app/src/pages/index/index.jsx'), 'utf8')
  const showBaseSource = pageMethod(pageSource, '_showBaseAndFetchAdvice(base, queryId, params, generation)', '_submitBase(params)')
  const submitBaseSource = pageMethod(pageSource, '_submitBase(params)', '_fetchAdvice(queryId, historyParams, generation)')
  const fetchAdviceSource = pageMethod(pageSource, '_fetchAdvice(queryId, historyParams, generation)', 'onBack =')
  const confirmationBranch = sourceBranch(
    submitBaseSource,
    "if (result.phase === 'confirmation')",
    "if (result.phase === 'route_type_required')",
  )
  const routeTypeBranch = sourceBranch(
    submitBaseSource,
    "if (result.phase === 'route_type_required')",
    "if (result.phase === 'error')",
  )
  assert(submitBaseSource.includes('this._getAdviceService().prepare(params)'), '前端首请求必须经 getAdvice service 使用 prepare')
  assert(!submitBaseSource.includes("mode: 'base'"), '前端不得继续主动发送 mode=base')
  assert(!/result\.ok/.test(submitBaseSource), '前端 prepare 消费不得按兼容 ok 分支')
  assert(submitBaseSource.includes("result.phase === 'confirmation'"), '前端必须处理 confirmation 阶段')
  assert(submitBaseSource.includes("result.phase === 'route_type_required'"), '前端必须处理 route_type_required 阶段')
  assert(submitBaseSource.includes("result.phase !== 'base'"), '前端必须只从 base 阶段启动 advice')
  assert(confirmationBranch.includes("type: 'CONFIRMATION_REQUIRED'") && confirmationBranch.includes('confirmationInput: { date: params.date, level: params.level, days: params.days }') && confirmationBranch.includes('return'), 'confirmation 必须经 reducer 保存候选快照并打开独立候选 Popup 后返回')
  assert(!/_fetchAdvice|_saveCache|_saveHistory/.test(confirmationBranch), 'confirmation 分支不得触发 advice、缓存或历史')
  assert(routeTypeBranch.includes("type: 'ROUTE_TYPE_REQUIRED'") && routeTypeBranch.includes('routeTypeRequest: pd') && routeTypeBranch.includes('return'), 'route_type_required 只能进入 reducer 的现有路线类型选择流程后返回')
  assert(!/_fetchAdvice|_saveCache|_saveHistory/.test(routeTypeBranch), 'route_type_required 分支不得触发 advice、缓存或历史')
  assert(!/result\.ok/.test(fetchAdviceSource), '前端 advice 消费不得按兼容 ok 分支')
  assert(fetchAdviceSource.includes("result.phase === 'advice'"), '前端必须只消费 advice 阶段的建议')
  assert(showBaseSource.includes('this._fetchAdvice(queryId, params, generation)'), 'base 结果必须把顶层 queryId 与 generation 传给 advice')
  assert(submitBaseSource.includes('this._showBaseAndFetchAdvice(result.data, result.queryId, params, generation)'), 'prepare base 必须从顶层读取 queryId 并传递当前 generation')
  assert(fetchAdviceSource.includes('this._getAdviceService().advice(queryId)'), 'advice 云函数请求必须经 service 只接收 queryId')
  assert(!fetchAdviceSource.includes('baseData'), 'advice 云函数请求不得展开表单或 BaseData')
  assert(fetchAdviceSource.includes('this._saveHistory(historyParams,'), '历史只能使用本地 history 参数')
  assert(fetchAdviceSource.includes("this._isCurrentTripFlow(generation, ['advice_loading'])"), 'advice success 与 fail 都必须受 reducer token 保护')
  assert(showBaseSource.includes('buildBaseSafetyResult(base.gearRules)'), 'base 到达后必须立即由 gearRules 建立确定性装备和风险')
  assert(pageSource.includes("risk: riskName + '风险'") && pageSource.includes("level: '致命'"), '前端 base 风险必须使用冻结记录格式')
  assert(!pageSource.includes('gear: { essential: [], recommended: [], optional: [] }'), 'base 阶段不得先用空装备覆盖确定性内容')
  assert(fetchAdviceSource.includes('this._finishDegradedAdvice(generation, historyParams,'), 'advice phase error 与传输失败必须共享降级路径')
  const queryContextUnavailableBranch = sourceBranch(
    fetchAdviceSource,
    "if (result && result.phase === 'error' && result.code === 'query_context_unavailable')",
    "if (result && result.phase === 'advice')",
  )
  assert(queryContextUnavailableBranch.includes("type: 'CONTEXT_UNAVAILABLE'") && queryContextUnavailableBranch.includes('error: { code: result.code'), 'query_context_unavailable 必须经 reducer 保留 base 并展示服务端消息')
  assert(!/degraded|AI_UNAVAILABLE_NOTE|_saveHistory/.test(queryContextUnavailableBranch), 'query_context_unavailable 不得伪装 AI 降级或写历史')
  assert((pageSource.match(/\{error && <View className="error-box"><Text>\{error\}<\/Text><\/View>\}/g) || []).length === 2, '结果视图必须显示 query_context_unavailable 消息')
  const gearCard = sourceBranch(pageSource, '<Text className="card-title">装备清单</Text>', '<Text className="card-title">风险提示</Text>')
  const riskCard = sourceBranch(pageSource, '<Text className="card-title">风险提示</Text>', '<Text className="card-title">晨昏光影时刻</Text>')
  assert(!gearCard.includes('adviceLoading ?'), 'advice loading 不得用 skeleton 遮挡已有装备')
  assert(!riskCard.includes('adviceLoading ?'), 'advice loading 不得用 skeleton 遮挡已有风险')
  const saveHistorySource = pageMethod(pageSource, '_saveHistory(params, resultData)', '// 日期过期校验')
  const degradedAdviceSource = pageMethod(pageSource, '_finishDegradedAdvice(token, historyParams, error)', 'onBack =')
  assert(!pageSource.includes("mode: 'saveRoute'"), '手动坐标查询不得再写入公共 UGC')
  assert(!saveHistorySource.includes('_lastHistoryHash'), 'history 保存失败不得把同一参数永久标记为已保存')
  assert(saveHistorySource.includes('historySaveError'), 'history save 失败必须只写入主结果保存提示')
  assert(fetchAdviceSource.includes('this._saveHistory(historyParams, historyResult, generation)') && degradedAdviceSource.includes('this._saveHistory(historyParams, historyResult, token)'), 'normal advice、ordinary error 与 transport failure 都必须尝试保存 private history')
  assert(fetchAdviceSource.includes("result.code === 'query_context_unavailable'") && !/degraded|AI_UNAVAILABLE_NOTE|_saveHistory/.test(queryContextUnavailableBranch), 'query_context_unavailable 必须继续保持零 history')
  assert(pageSource.includes('historyError: null'), '页面 state 必须包含局部 historyError')
  assert(pageSource.includes('onDeleteHistory =') && pageSource.includes("mode: 'delete'"), 'history 面板必须提供单项删除操作')
  assert(pageSource.includes('event.stopPropagation()'), '删除控件必须阻止触发历史恢复')
  assert(pageSource.includes('onClearHistory =') && pageSource.includes('Taro.showModal({') && pageSource.includes("mode: 'clear'"), 'history 面板必须在一次原生确认后支持清空')
  assert(pageSource.includes('historyError && <View className="history-error-box">'), 'list/delete/clear 失败必须在 history 面板显示局部错误')
  const historyPanelSource = pageMethod(pageSource, 'onHistoryTap = () =>', 'onRestoreHistory =')
  const resultViewSource = sourceBranch(pageSource, 'if (showResult && result)', '// ===== 表单视图 =====')
  assert(pageSource.includes('historyError: null') && pageSource.includes('historySaveError: null'), '页面必须区分面板 historyError 与保存 historySaveError')
  assert(saveHistorySource.includes('historySaveError') && !saveHistorySource.includes('historyError'), '_saveHistory 只能写主结果保存提示')
  assert(historyPanelSource.includes('historyError') && !historyPanelSource.includes('historySaveError'), 'list/delete/clear 只能写面板局部错误')
  assert(resultViewSource.includes('historySaveError && <View className="history-error-box">') && !resultViewSource.includes('historyError &&'), '主结果不得渲染 history 面板错误')
  assert(contextWrites.length === writesAfterBaseOutcomes, '非 base 分支不得写入 TripContext')
  assert(contextReadCount > 1, 'I18 advice 必须通过 TripContext 读取可信快照')

  console.log('PASS: 后端与前端响应阶段契约')
}

main()
  .catch((error) => {
    console.error('FAIL: ' + error.message)
    process.exitCode = 1
  })
  .finally(() => {
    Module._load = originalModuleLoad
    https.get = originalHttpsGet
    https.request = originalHttpsRequest
    if (originalLlmKey === undefined) delete process.env.LLM_KEY
    else process.env.LLM_KEY = originalLlmKey
  })
