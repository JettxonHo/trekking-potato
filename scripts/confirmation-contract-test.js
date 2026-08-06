/**
 * I05a 服务端路线候选与 confirm 契约（离线）。
 *
 * 主接缝是 getAdvice.main(event)：候选由 prepare 返回，confirm 只接受 candidateId
 * 并在服务端恢复内置路线。路线匹配 helper 作为同一服务端模块的纯确定性接缝，
 * 仅用于覆盖没有真实目录样本的重复 alias 与五项截断规则。
 */
const Module = require('module')
const https = require('https')
const fs = require('fs')
const path = require('path')
const openMeteoFixture = require('./fixtures/open-meteo-forecast')

let openid = 'offline-confirmation-user'
let ugcFixture = []
let ugcGetCalls = 0
let weatherRequests = 0
let llmRequests = 0
let gearRuleCalls = 0
let contextReadCount = 0
const contextWrites = []

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
          if (!payload || Object.keys(payload).length !== 1 || !Object.prototype.hasOwnProperty.call(payload, 'data')) {
            throw new Error('TripContext 只允许 set({ data: record })')
          }
          contextWrites.push({ collection: 'trip_contexts', queryId, record: copy(payload.data) })
          return { _id: queryId }
        },
      }
    },
    where() {
      contextReadCount++
      throw new Error('I17 handler 不得读取 TripContext')
    },
  }
}

const cloudbaseMock = {
  DYNAMIC_CURRENT_ENV: 'offline-confirmation',
  init() {},
  database: () => ({
    collection(name) {
      if (name === 'trip_contexts') return tripContextCollection()
      if (name === 'routes') {
        return {
          limit: () => ({
            get: async () => {
              ugcGetCalls++
              return { data: ugcFixture }
            },
          }),
        }
      }
      throw new Error('confirmation-contract-test 不允许 CloudBase collection: ' + name)
    },
  }),
  getWXContext: () => ({ OPENID: openid }),
}

const originalModuleLoad = Module._load
const originalHttpsGet = https.get
const originalHttpsRequest = https.request
Module._load = function loadOfflineCloudbase(request, parent, isMain) {
  if (request === 'wx-server-sdk') return cloudbaseMock
  if (request === './gear-rules' && parent && parent.filename.endsWith('/cloudfunctions/getAdvice/index.js')) {
    const gearRules = originalModuleLoad.call(this, request, parent, isMain)
    return {
      ...gearRules,
      getGearRules(input) {
        gearRuleCalls++
        return gearRules.getGearRules(input)
      },
    }
  }
  return originalModuleLoad.call(this, request, parent, isMain)
}

function respond(callback, payload) {
  const handlers = {}
  const response = {
    on(event, handler) {
      handlers[event] = handler
      return response
    },
  }
  callback(response)
  process.nextTick(() => {
    if (handlers.data) handlers.data(JSON.stringify(payload))
    if (handlers.end) handlers.end()
  })
  return {
    on() { return this },
    setTimeout() { return this },
    destroy() {},
  }
}

function weatherFixtureFor(url) {
  const params = new URL(url).searchParams
  const start = params.get('start_date')
  const end = params.get('end_date')
  const startIndex = openMeteoFixture.daily.time.indexOf(start)
  const endIndex = openMeteoFixture.daily.time.indexOf(end)
  if (startIndex < 0 || endIndex < startIndex) {
    throw new Error('离线 fixture 不包含天气窗口: ' + start + ' 至 ' + end)
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

https.get = function getOffline(url, callback) {
  const target = String(url)
  if (target.startsWith('https://api.open-meteo.com/v1/forecast?')) {
    weatherRequests++
    return respond(callback, weatherFixtureFor(target))
  }
  if (target.startsWith('https://restapi.amap.com/v3/place/text?')) {
    return respond(callback, {
      status: '1',
      pois: [{
        name: '高德回退地点', location: '116.50,40.20', typecode: '110200', cityname: '北京市', adname: '怀柔区',
      }],
    })
  }
  if (target.startsWith('https://api.open-meteo.com/v1/elevation?')) return respond(callback, { elevation: [1234] })
  throw new Error('confirmation-contract-test 不允许网络请求: ' + target)
}

https.request = function noLlmRequest() {
  llmRequests++
  throw new Error('confirmation-contract-test 不允许 AI 请求')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function candidateNames(result) {
  return result.candidates.map((candidate) => candidate.canonicalName)
}

async function main() {
  const {
    BUILTIN_ROUTES,
    getBuiltinCandidateId,
    resolveBuiltinRouteQuery,
  } = require('../cloudfunctions/getAdvice/data/routes')
  const { resolveLocation } = require('../cloudfunctions/getAdvice/geocode')
  const getAdvice = require('../cloudfunctions/getAdvice/index')

  assert(new Set(BUILTIN_ROUTES.map((route) => route.name)).size === BUILTIN_ROUTES.length, '内置 canonicalName 必须全局唯一')
  assert(getBuiltinCandidateId({ name: '武功山' }) === 'builtin-route:武功山', 'candidateId 必须由 canonicalName 确定')

  const canonical = resolveBuiltinRouteQuery('龙脊')
  assert(canonical.kind === 'direct' && canonical.route.name === '龙脊', 'canonical exact 必须全局优先于同名 alias')

  const uniqueAlias = resolveBuiltinRouteQuery('武功山金顶')
  assert(uniqueAlias.kind === 'direct' && uniqueAlias.route.name === '武功山', '唯一 alias exact 必须直达')

  const prefix = resolveBuiltinRouteQuery('武功山反')
  assert(prefix.kind === 'confirmation' && prefix.matchStage === 'prefix', 'prefix 必须返回 confirmation')
  assert(JSON.stringify(prefix.candidates.map((candidate) => candidate.canonicalName)) === JSON.stringify(['武功山', '武功山反穿']), 'prefix 候选必须按 canonicalName 确定排序')

  const contains = resolveBuiltinRouteQuery('白山')
  assert(contains.kind === 'confirmation' && contains.matchStage === 'contains', '无 prefix 命中时 contains 必须返回 confirmation')
  assert(JSON.stringify(contains.candidates.map((candidate) => candidate.canonicalName)) === JSON.stringify(['太白山', '长白山']), 'contains 候选必须按 canonicalName 确定排序')

  const fuzzy = resolveBuiltinRouteQuery('卖理浩径')
  assert(fuzzy.kind === 'confirmation' && fuzzy.matchStage === 'fuzzy' && JSON.stringify(candidateNames(fuzzy)) === JSON.stringify(['麦理浩径']), 'fuzzy 必须只返回第一非空阶段候选')

  const fuzzyOrderFixture = [
    { name: 'A路线', aliases: ['mmmae'], location: '甲地区', type: 'trek' },
    { name: 'Z路线', aliases: ['mouze'], location: '乙地区', type: 'tour' },
  ]
  const fuzzyOrder = resolveBuiltinRouteQuery('mouae', fuzzyOrderFixture)
  assert(JSON.stringify(candidateNames(fuzzyOrder)) === JSON.stringify(['Z路线', 'A路线']), 'fuzzy 必须先按最小编辑距离、再按 canonicalName 排序')

  const repeatedAliasFixture = [
    { name: '甲路线', aliases: ['共用别名'], location: '甲地区', type: 'trek' },
    { name: '乙路线', aliases: ['共用别名'], location: '乙地区', type: 'tour' },
  ]
  const repeatedAlias = resolveBuiltinRouteQuery('共用别名', repeatedAliasFixture)
  assert(repeatedAlias.kind === 'confirmation' && repeatedAlias.matchStage === 'repeated_alias_exact', '重复 alias exact 必须确认')
  assert(JSON.stringify(candidateNames(repeatedAlias)) === JSON.stringify(['乙路线', '甲路线'].sort()), '重复 alias 候选必须稳定排序')

  const maxFiveFixture = Array.from({ length: 6 }, (_, index) => ({
    name: `候选${6 - index}`,
    aliases: [`前缀${index}`],
    location: '测试地区',
    type: 'trek',
  }))
  const maxFive = resolveBuiltinRouteQuery('前缀', maxFiveFixture)
  assert(maxFive.kind === 'confirmation' && maxFive.candidates.length === 5, '候选必须去重、排序后最多返回五条')

  const beforeConfirmation = { weatherRequests, llmRequests, ugcGetCalls, gearRuleCalls }
  const contextWritesBeforeConfirmation = contextWrites.length
  const confirmation = await getAdvice.main({ mode: 'prepare', route: '卖理浩径', date: '2026-08-07', level: '中级' })
  assert(confirmation.phase === 'confirmation' && confirmation.ok === true && confirmation.needsConfirm === true, '模糊 prepare 必须返回 confirmation')
  assert(!Object.prototype.hasOwnProperty.call(confirmation, 'data'), 'confirmation 不得泄露旧 data 坐标对象')
  assert(JSON.stringify(candidateNames(confirmation)) === JSON.stringify(['麦理浩径']), 'confirmation 必须暴露确定候选')
  const expectedFields = ['candidateId', 'canonicalName', 'region', 'routeType']
  for (const candidate of confirmation.candidates) {
    assert(JSON.stringify(Object.keys(candidate).sort()) === JSON.stringify(expectedFields), 'candidate 只能暴露四个冻结字段')
    assert(candidate.candidateId === `builtin-route:${candidate.canonicalName}`, 'candidateId 必须跨查询稳定')
  }
  assert(weatherRequests === beforeConfirmation.weatherRequests && llmRequests === beforeConfirmation.llmRequests && ugcGetCalls === beforeConfirmation.ugcGetCalls && gearRuleCalls === beforeConfirmation.gearRuleCalls, 'confirmation 必须在天气、规则、AI 和 UGC 读取前返回')
  assert(contextWrites.length === contextWritesBeforeConfirmation, 'confirmation 不得写入 TripContext')

  const beforeUnknown = { weatherRequests, llmRequests, ugcGetCalls, gearRuleCalls }
  const contextWritesBeforeInvalidConfirm = contextWrites.length
  const unknown = await getAdvice.main({
    mode: 'confirm', candidateId: 'builtin-route:不存在', date: '2026-08-07', level: '中级', route: '伪造路线', routeType: 'climb', manualLat: 1, manualLon: 2,
  })
  assert(unknown.phase === 'error' && unknown.code === 'candidate_not_found' && unknown.retryable === false, '未知 candidate 必须返回不可重试 candidate_not_found')
  assert(unknown.message === '候选路线已失效，请重新查询', 'candidate_not_found 必须使用冻结用户提示')
  assert(weatherRequests === beforeUnknown.weatherRequests && llmRequests === beforeUnknown.llmRequests && ugcGetCalls === beforeUnknown.ugcGetCalls && gearRuleCalls === beforeUnknown.gearRuleCalls, '未知 confirm 不得触发天气、规则、AI 或历史/UGC 读取')
  assert(contextWrites.length === contextWritesBeforeInvalidConfirm, '未知 confirm 不得写入 TripContext')

  const malformed = await getAdvice.main({ mode: 'confirm', candidateId: {}, date: '2026-08-07', level: '中级' })
  assert(malformed.phase === 'error' && malformed.code === 'candidate_not_found' && malformed.retryable === false, '畸形 candidateId 必须返回不可重试 candidate_not_found')
  assert(weatherRequests === beforeUnknown.weatherRequests && llmRequests === beforeUnknown.llmRequests && ugcGetCalls === beforeUnknown.ugcGetCalls && gearRuleCalls === beforeUnknown.gearRuleCalls, '畸形 confirm 不得触发天气、规则、AI 或历史/UGC 读取')
  assert(contextWrites.length === contextWritesBeforeInvalidConfirm, '畸形 confirm 不得写入 TripContext')

  const missingCandidate = await getAdvice.main({ mode: 'confirm', date: '2026-08-07', level: '中级' })
  assert(missingCandidate.phase === 'error' && missingCandidate.code === 'missing_params', '缺失 candidateId 必须保留 missing_params')
  assert(contextWrites.length === contextWritesBeforeInvalidConfirm, '缺失 candidateId 不得写入 TripContext')

  const contextWritesBeforeValid = contextWrites.length
  const valid = await getAdvice.main({
    mode: 'confirm', candidateId: 'builtin-route:武功山', date: '2026-08-07', level: '中级', days: 1,
    route: '四姑娘山二峰', routeType: 'climb', manualLat: 1, manualLon: 2, manualElevation: 9999,
    baseData: { route: '伪造路线', weather: null }, queryId: 'tctx_client_spoof', weather: null, createdAt: '1999-01-01T00:00:00.000Z',
  })
  assert(valid.phase === 'base' && valid.data.route === '武功山' && valid.data.routeType === 'trek', 'valid confirm 必须从 candidateId 恢复服务端 builtin 事实')
  assert(valid.data.coords.lat === 27.4543 && valid.data.coords.lon === 114.1765, 'valid confirm 不得采用客户端伪造坐标')
  assert(weatherRequests === beforeUnknown.weatherRequests + 1 && gearRuleCalls === beforeUnknown.gearRuleCalls + 1 && llmRequests === 0, 'valid confirm 只允许进入 base，不调用 AI')
  assert(typeof valid.queryId === 'string' && typeof valid.expiresAt === 'string', 'valid confirm 必须返回顶层可信上下文元数据')
  assert(contextWrites.length === contextWritesBeforeValid + 1, 'valid confirm 必须只写入一次 TripContext')
  const validContext = contextWrites[contextWrites.length - 1]
  assert(validContext.collection === 'trip_contexts' && validContext.queryId === valid.queryId, 'valid confirm 必须写入返回 queryId 对应的 TripContext 文档')
  assert(validContext.record._openid === openid, 'valid confirm 的 TripContext 必须绑定服务端 openid')
  assert(JSON.stringify(validContext.record.snapshot) === JSON.stringify(valid.data), 'valid confirm 必须直接返回已持久化可信快照')
  assert(validContext.record.snapshot.route === '武功山' && validContext.record.snapshot.routeType === 'trek', '客户端伪造路线和类型不得进入 confirm 快照')
  assert(validContext.record.snapshot.coords.lat === 27.4543 && validContext.record.snapshot.weather !== null, '客户端伪造坐标和天气不得进入 confirm 快照')
  assert(validContext.queryId !== 'tctx_client_spoof', '客户端 queryId 不得决定服务端存储文档')

  process.env.AMAP_KEY = 'offline-confirmation-key'
  ugcFixture = [{ name: 'I05a UGC 长路线', lat: 30.1, lon: 120.1, elevation: 900, location: '测试省', type: 'trek' }]
  const ugcSubstring = await resolveLocation('I05a UGC')
  assert(ugcSubstring.ok && ugcSubstring.data.source.startsWith('高德POI'), 'UGC substring 自动命中必须关闭，改走 AMap')

  const pageSource = fs.readFileSync(path.join(__dirname, '../taro-app/src/pages/index/index.jsx'), 'utf8')
  assert(pageSource.includes('showCandidatePopup'), '前端必须为 confirmation 使用独立候选 Popup')
  assert(pageSource.includes('candidateSnapshot: { date: params.date, level: params.level, days: params.days }'), 'prepare confirmation 必须保存当次 date/level/days 快照')
  assert(pageSource.includes('onCandidateSelect = (candidateId)'), '前端必须处理用户显式选择 candidateId')
  assert(pageSource.includes("const params = { candidateId, date: snapshot.date, level: snapshot.level, days: snapshot.days }"), 'confirm 参数必须只从 candidateId 与快照恢复')
  assert(pageSource.includes("data: { mode: 'confirm', ...params }"), 'confirm 调用必须使用冻结 mode=confirm 参数')
  assert(pageSource.includes('this._showBaseAndFetchAdvice(result.data, result.queryId, params, generation)'), 'confirm base 必须复用现有 base→advice 流程并透传可信 queryId/generation')
  assert(pageSource.includes("candidates.length < 1 || candidates.length > 5 || !candidates.every((candidate) => this._isValidCandidate(candidate))"), '空或畸形候选必须稳定报错而不进入 base')
  assert(pageSource.includes('onCandidateClose = () =>') && pageSource.includes('this._nextRequestGeneration()'), '取消候选必须使旧 prepare/confirm 回调失效')
  assert((pageSource.match(/generation !== this\._requestGeneration/g) || []).length >= 4, 'prepare 与 confirm 的 success/fail 回调必须受单调 generation 保护')

  assert(openid === 'offline-confirmation-user', '离线 mock 身份必须保持固定')
  assert(contextReadCount === 0, 'I17 handler 不得读取 TripContext')
  console.log('PASS: I05a 服务端候选与 confirm 契约')
}

main().finally(() => {
  Module._load = originalModuleLoad
  https.get = originalHttpsGet
  https.request = originalHttpsRequest
}).catch((error) => {
  console.error('FAIL: ' + error.message)
  process.exitCode = 1
})
