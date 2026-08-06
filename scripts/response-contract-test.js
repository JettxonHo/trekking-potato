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
const cloudbaseMock = {
  DYNAMIC_CURRENT_ENV: 'offline-response-contract',
  init() {},
  database: () => ({
    collection: () => ({
      limit: () => ({ get: async () => ({ data: [] }) }),
    }),
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
    assert(typeof response.message === 'string' && response.data, 'confirmation 必须包含 message/data')
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

function installLlmMock(mode) {
  https.request = function requestOfflineLlm(options, callback) {
    const requestHandlers = {}
    const responseHandlers = {}
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
      write() {},
      end() {
        process.nextTick(() => {
          if (mode === 'failure') {
            requestHandlers.error(new Error('offline LLM failure'))
            return
          }
          callback(response)
          process.nextTick(() => {
            const payload = {
              choices: [{
                message: {
                  content: JSON.stringify({
                    gear: { essential: [], recommended: [], optional: [] },
                    risks: [],
                  }),
                },
              }],
            }
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
  assert(confirmation.data && confirmation.data.name === '麦理浩径', '确认态必须给出候选路线，实际=' + JSON.stringify(confirmation))
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

  const baseAlias = await getAdvice.main({
    mode: 'base', route: '武功山', date: '2026-08-07', level: '中级',
  })
  assert(baseAlias.phase === 'base' && baseAlias.ok === true, 'base 必须仅作为 prepare 的兼容别名，实际=' + JSON.stringify(baseAlias))

  openid = ''
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

  const invalidBaseData = await getAdvice.main({
    mode: 'advice', route: '武功山', date: '2026-08-07', level: '中级',
  })
  assertError(invalidBaseData, 'invalid_base_data')

  process.env.LLM_KEY = 'offline-response-contract-key'
  installLlmMock('failure')
  const degradedAdvice = await getAdvice.main({
    mode: 'advice', route: '武功山', date: '2026-08-07', level: '中级', baseData: base.data,
  })
  assert(degradedAdvice.phase === 'advice' && degradedAdvice.degraded === true, 'LLM 降级仍必须返回 phase=advice，实际=' + JSON.stringify(degradedAdvice))
  assertExclusivePhaseFields(degradedAdvice)

  installLlmMock('success')
  const normalAdvice = await getAdvice.main({
    mode: 'advice', route: '武功山', date: '2026-08-07', level: '中级', baseData: base.data,
  })
  assert(normalAdvice.phase === 'advice' && normalAdvice.degraded === false, '正常 AI 结果必须返回 phase=advice，实际=' + JSON.stringify(normalAdvice))
  assertExclusivePhaseFields(normalAdvice)

  const pageSource = fs.readFileSync(path.join(__dirname, '../taro-app/src/pages/index/index.jsx'), 'utf8')
  const submitBaseSource = pageMethod(pageSource, '_submitBase(params)', '_fetchAdvice(params)')
  const fetchAdviceSource = pageMethod(pageSource, '_fetchAdvice(params)', 'onBack =')
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
  assert(submitBaseSource.includes("mode: 'prepare'"), '前端首请求必须使用 mode=prepare')
  assert(!submitBaseSource.includes("mode: 'base'"), '前端不得继续主动发送 mode=base')
  assert(!/result\.ok/.test(submitBaseSource), '前端 prepare 消费不得按兼容 ok 分支')
  assert(submitBaseSource.includes("result.phase === 'confirmation'"), '前端必须处理 confirmation 阶段')
  assert(submitBaseSource.includes("result.phase === 'route_type_required'"), '前端必须处理 route_type_required 阶段')
  assert(submitBaseSource.includes("result.phase !== 'base'"), '前端必须只从 base 阶段启动 advice')
  assert(confirmationBranch.includes("error: result.message || '请确认路线名称后重试'") && confirmationBranch.includes('return'), 'confirmation 只能展示 message 后返回')
  assert(!/_fetchAdvice|_saveCache|_saveHistory/.test(confirmationBranch), 'confirmation 分支不得触发 advice、缓存或历史')
  assert(routeTypeBranch.includes('showManualCoords: true') && routeTypeBranch.includes('pendingResolvedLocation') && routeTypeBranch.includes('return'), 'route_type_required 只能进入现有路线类型选择流程后返回')
  assert(!/_fetchAdvice|_saveCache|_saveHistory/.test(routeTypeBranch), 'route_type_required 分支不得触发 advice、缓存或历史')
  assert(!/result\.ok/.test(fetchAdviceSource), '前端 advice 消费不得按兼容 ok 分支')
  assert(fetchAdviceSource.includes("result.phase === 'advice'"), '前端必须只消费 advice 阶段的建议')

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
