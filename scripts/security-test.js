/**
 * I19 private history contract test.
 *
 * The handler is exercised through its public Cloud Function interface with a
 * small in-memory CloudBase seam. It deliberately rejects routes collection
 * access so the legacy UGC tombstones cannot accidentally keep a live path.
 */

const fs = require('fs')
const path = require('path')
const Module = require('module')

const ALLOWED_HISTORY_FIELDS = [
  'id', 'route', 'date', 'days', 'level', 'elevation', 'location', 'summary',
  'degraded', 'coords', 'routeType', 'routeTypeSource',
]

const store = { history: [], routes: [{ _id: 'legacy-route', name: '旧公共路线' }] }
let openid = ''
let nextId = 1
let failingOperation = null
let addCalls = 0
let historyGetCalls = 0
const queryCalls = []

function copy(value) {
  return JSON.parse(JSON.stringify(value))
}

function comparableTime(value) {
  if (value instanceof Date) return value.getTime()
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function comparableValue(value) {
  return value instanceof Date ? value.getTime() : value
}

function lessThan(actual, expected) {
  if (actual instanceof Date || expected instanceof Date) return comparableTime(actual) < comparableTime(expected)
  const actualDate = Date.parse(actual)
  const expectedDate = Date.parse(expected)
  if (Number.isFinite(actualDate) && Number.isFinite(expectedDate)) return actualDate < expectedDate
  return String(actual) < String(expected)
}

function matchesCondition(record, condition) {
  if (!condition || typeof condition !== 'object') return true
  if (Array.isArray(condition.$and)) return condition.$and.every((part) => matchesCondition(record, part))
  if (Array.isArray(condition.$or)) return condition.$or.some((part) => matchesCondition(record, part))
  return Object.entries(condition).every(([key, expected]) => {
    const actual = key.split('.').reduce((value, part) => (value == null ? undefined : value[part]), record)
    if (expected && typeof expected === 'object' && Object.prototype.hasOwnProperty.call(expected, '$lt')) {
      return lessThan(actual, expected.$lt)
    }
    if (actual instanceof Date || expected instanceof Date) return comparableTime(actual) === comparableTime(expected)
    return comparableValue(actual) === comparableValue(expected)
  })
}

function historyCollection() {
  let filter = {}
  let limit = 100
  const orders = []
  return {
    where(value) { filter = value || {}; queryCalls.push({ type: 'where', value: filter }); return this },
    orderBy(field, direction) { orders.push({ field, direction }); queryCalls.push({ type: 'orderBy', field, direction }); return this },
    limit(value) { limit = value; queryCalls.push({ type: 'limit', value }); return this },
    async get() {
      if (failingOperation === 'get') throw new Error('offline history get')
      if (failingOperation === 'empty-lookup-add') failingOperation = 'add'
      historyGetCalls += 1
      let records = store.history.filter((record) => matchesCondition(record, filter))
      if (orders.length > 0) records = records.slice().sort((left, right) => {
        for (const order of orders) {
          const leftValue = order.field === 'createdAt' ? comparableTime(left[order.field]) : String(left[order.field] || '')
          const rightValue = order.field === 'createdAt' ? comparableTime(right[order.field]) : String(right[order.field] || '')
          if (leftValue === rightValue) continue
          const comparison = leftValue < rightValue ? -1 : 1
          return order.direction === 'desc' ? -comparison : comparison
        }
        return 0
      })
      return { data: copy(records.slice(0, limit)) }
    },
    async add({ data }) {
      addCalls += 1
      if (failingOperation === 'add') throw new Error('offline history add')
      const record = { _id: `history-${nextId++}`, ...copy(data) }
      store.history.push(record)
      return { _id: record._id }
    },
    async remove() {
      if (failingOperation === 'remove') throw new Error('offline history remove')
      const before = store.history.length
      store.history = store.history.filter((record) => !Object.keys(filter).every((key) => record[key] === filter[key]))
      return { stats: { removed: before - store.history.length } }
    },
  }
}

const mockSdk = {
  DYNAMIC_CURRENT_ENV: 'test',
  init() {},
  getWXContext() { return { OPENID: openid } },
  database() {
    return {
      collection(name) {
        if (name === 'history') return historyCollection()
        if (name === 'routes') throw new Error('I19 history handler must not access routes')
        throw new Error(`unexpected collection: ${name}`)
      },
      command: {
        lt(value) { return { $lt: value } },
        or(...expressions) { return { $or: expressions } },
        and(...expressions) { return { $and: expressions } },
      },
      serverDate() { return new Date('2026-08-07T00:00:00.000Z') },
    }
  },
}

const originalResolve = Module._resolveFilename
Module._resolveFilename = function resolveFilename(request) {
  if (request === 'wx-server-sdk') return 'wx-server-sdk-i19-history-test'
  return originalResolve.apply(this, arguments)
}
require.cache['wx-server-sdk-i19-history-test'] = {
  id: 'wx-server-sdk-i19-history-test',
  filename: 'wx-server-sdk-i19-history-test',
  loaded: true,
  exports: mockSdk,
}

const history = require('../cloudfunctions/history/index.js')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertThrows(callback, message) {
  let threw = false
  try { callback() } catch (_error) { threw = true }
  assert(threw, message)
}

function reset() {
  store.history = []
  store.routes = [{ _id: 'legacy-route', name: '旧公共路线' }]
  nextId = 1
  failingOperation = null
  addCalls = 0
  historyGetCalls = 0
  queryCalls.length = 0
}

function assertHistoryPaginationSource(source) {
  assert(source.includes('const base = { _openid: openid }'), 'history list must build its query from the server owner')
  assert(source.includes(".orderBy('createdAt', 'desc')") && source.includes(".orderBy('_id', 'desc')"), 'history list must apply the two-field descending keyset order')
  assert(source.includes('.limit(limit + 1)'), 'history list must use one read-only lookahead')
  assert(source.includes('if (cursor === undefined) return invalidHistoryCursor()'), 'history list must reject malformed cursors before storage access')
  assert(source.includes("Object.keys(payload).sort().join(',') !== 'createdAt,id,v'"), 'history cursors must reject extra or missing fields')
  assert(source.includes('payload.v !== HISTORY_CURSOR_VERSION'), 'history cursors must validate their version')
  assert(source.includes('const nextCursor = records.length > limit ? encodeHistoryCursor(page[page.length - 1]) : null'), 'history list must expose a bounded continuation only when lookahead finds another row')
}

function assertHistoryPaginationMutations() {
  const source = fs.readFileSync(path.join(__dirname, '../cloudfunctions/history/index.js'), 'utf8')
  assertHistoryPaginationSource(source)
  const mutations = [
    ['owner filter', (value) => value.replace('const base = { _openid: openid }', 'const base = {}')],
    ['tie-break order', (value) => value.replace(".orderBy('_id', 'desc')", '')],
    ['cursor rejection', (value) => value.replace('if (cursor === undefined) return invalidHistoryCursor()', 'if (false) return invalidHistoryCursor()')],
    ['lookahead bound', (value) => value.replace('.limit(limit + 1)', '.limit(limit)')],
    ['cursor extra-field rejection', (value) => value.replace("Object.keys(payload).sort().join(',') !== 'createdAt,id,v'", "Object.keys(payload).sort().join(',') !== 'createdAt,id,v,extra'")],
  ]
  mutations.forEach(([label, mutate]) => {
    assertThrows(() => assertHistoryPaginationSource(mutate(source)), `${label} mutation must make the history pagination contract RED`)
  })
}

async function run() {
  console.log('\n=== I19 private history contract ===\n')
  reset()

  openid = 'user-A'
  const savedByA = await history.main({
    mode: 'save', route: '武功山', date: '2026-08-08', days: 2, level: '中级',
    summary: '确定性摘要', _openid: 'user-B', queryId: 'tctx_must_not_persist',
  }, {})
  assert(savedByA.ok === true && typeof savedByA.id === 'string', 'save must create a private history item')
  assert(store.history.length === 1 && store.history[0]._openid === 'user-A', 'client-supplied openid must not override server identity')
  assert(store.history[0].queryId === undefined, 'history must not persist queryId')

  openid = 'user-B'
  const savedByB = await history.main({
    mode: 'save', route: '四姑娘山', date: '2026-08-09', days: 3, level: '老手',
  }, {})
  assert(savedByB.ok === true, 'second user save must succeed')

  openid = 'user-A'
  const listA = await history.main({ mode: 'list', limit: 20, _openid: 'user-B' }, {})
  assert(listA.ok === true && listA.data.length === 1 && listA.data[0].route === '武功山', 'list must only return current openid history')
  assert(JSON.stringify(Object.keys(listA.data[0]).sort()) === JSON.stringify(ALLOWED_HISTORY_FIELDS.slice().sort()), 'list must return only the explicit HistoryItem DTO')
  assert(!('_id' in listA.data[0]) && !('_openid' in listA.data[0]) && !('queryId' in listA.data[0]), 'HistoryItem must not expose database or context fields')

  openid = 'user-B'
  const listB = await history.main({ mode: 'list' }, {})
  assert(listB.ok === true && listB.data.length === 1 && listB.data[0].route === '四姑娘山', 'user B must only see user B history')
  assert(store.routes.length === 1 && store.routes[0].name === '旧公共路线', 'history operations must preserve existing routes data')

  console.log('PASS: private save/list ownership and DTO contract')

  reset()
  openid = 'user-A'
  const tieTimestamp = '2026-08-08T00:00:00.000Z'
  for (let index = 1; index <= 21; index += 1) {
    const id = `history-${String(index).padStart(3, '0')}`
    store.history.push({
      _id: id,
      _openid: 'user-A',
      route: `路线${index}`,
      date: '2026-08-08',
      days: 1,
      level: '中级',
      createdAt: tieTimestamp,
    })
  }
  store.history.push({
    _id: 'history-foreign',
    _openid: 'user-B',
    route: '他人路线',
    date: '2026-08-08',
    days: 1,
    level: '中级',
    createdAt: tieTimestamp,
  })
  const firstPage = await history.main({ mode: 'list', limit: 999 }, {})
  assert(firstPage.ok === true && firstPage.data.length === 20, 'history list must return at most 20 records')
  assert(firstPage.data.every((item) => item.id !== 'history-foreign'), 'history page must exclude foreign records')
  assert(firstPage.data[0].id === 'history-021' && firstPage.data[19].id === 'history-002', 'equal createdAt records must use descending _id tie-break')
  assert(typeof firstPage.nextCursor === 'string' && Object.keys(firstPage).sort().join(',') === 'data,nextCursor,ok', 'history page must expose only the additive nextCursor field')
  assert(queryCalls.filter((call) => call.type === 'limit').at(-1).value === 21, 'history list must read at most limit + 1 records')
  assert(JSON.stringify(queryCalls.filter((call) => call.type === 'orderBy').slice(-2)) === JSON.stringify([
    { type: 'orderBy', field: 'createdAt', direction: 'desc' },
    { type: 'orderBy', field: '_id', direction: 'desc' },
  ]), 'history list must apply createdAt and _id descending order')

  const secondPage = await history.main({ mode: 'list', cursor: firstPage.nextCursor }, {})
  assert(secondPage.ok === true && secondPage.data.length === 1 && secondPage.data[0].id === 'history-001', 'history cursor must continue after the tie-break tuple without omissions')
  assert(secondPage.nextCursor === null, 'final history page must terminate with a null cursor')
  assert(historyGetCalls === 2, 'two history pages should perform exactly two reads')
  const secondWhere = queryCalls.filter((call) => call.type === 'where').at(-1).value
  assert(secondWhere && Array.isArray(secondWhere.$and) && secondWhere.$and[0]._openid === 'user-A', 'cursor query must retain the server owner filter')
  assert(Array.isArray(secondWhere.$and[1].$or), 'cursor query must use a bounded OR seek predicate')

  const readsBeforeInvalidCursor = historyGetCalls
  const malformedCursors = [
    '%%%',
    'x'.repeat(2049),
    123,
    Buffer.from(JSON.stringify({ v: 1, createdAt: tieTimestamp, id: 'history-002', extra: true }), 'utf8').toString('base64url'),
  ]
  for (const cursor of malformedCursors) {
    const invalidCursor = await history.main({ mode: 'list', cursor }, {})
    assert(invalidCursor.error === 'invalid_cursor' && invalidCursor.retryable === false, 'malformed history cursors must be non-retryable input errors')
    assert(historyGetCalls === readsBeforeInvalidCursor, 'malformed history cursors must fail before database access')
  }
  console.log('PASS: bounded owner-private history cursor pagination')

  reset()
  openid = 'user-A'
  const legacyFirst = await history.main({
    mode: 'save', route: '武功山', date: '2026-08-08',
  }, {})
  const legacySecond = await history.main({
    mode: 'save', route: '四姑娘山', date: '2026-08-09',
  }, {})
  assert(legacyFirst.ok === true && legacySecond.ok === true, 'legacy saves without saveAttemptId must succeed')
  assert(legacyFirst.id !== legacySecond.id && store.history.length === 2 && addCalls === 2, 'legacy saves without saveAttemptId must add two distinct records')
  assert(store.history.every((record) => record.saveAttemptId === undefined), 'legacy saves must not persist saveAttemptId')
  console.log('PASS: legacy save behavior without retry identity')

  reset()
  openid = 'user-A'
  const firstAttempt = await history.main({
    mode: 'save', route: '武功山', date: '2026-08-08', saveAttemptId: ' retry-1 ',
  }, {})
  const repeatedAttempt = await history.main({
    mode: 'save', route: '另一条路线', date: '2026-08-09', saveAttemptId: 'retry-1',
  }, {})
  assert(firstAttempt.ok === true && repeatedAttempt.ok === true, 'same save attempt should remain successful on retry')
  assert(repeatedAttempt.id === firstAttempt.id && store.history.length === 1, 'same owner and saveAttemptId must not add a duplicate')
  assert(JSON.stringify(repeatedAttempt) === JSON.stringify({ ok: true, id: firstAttempt.id }), 'deduplicated save response must be exactly {ok:true,id} without a flag')
  assert(store.history[0].saveAttemptId === 'retry-1' && store.history[0].route === '武功山', 'same owner and saveAttemptId must be first-write-wins')

  openid = 'user-B'
  const sameIdDifferentOwner = await history.main({
    mode: 'save', route: '四姑娘山', date: '2026-08-10', saveAttemptId: 'retry-1',
  }, {})
  assert(sameIdDifferentOwner.ok === true && sameIdDifferentOwner.id !== firstAttempt.id && store.history.length === 2, 'same saveAttemptId must be independent across owners')

  openid = 'user-A'
  const differentAttempt = await history.main({
    mode: 'save', route: '贡嘎', date: '2026-08-11', saveAttemptId: 'retry-2',
  }, {})
  assert(differentAttempt.ok === true && differentAttempt.id !== firstAttempt.id && store.history.length === 3, 'different saveAttemptId must create a new record')
  const idempotentList = await history.main({ mode: 'list' }, {})
  assert(idempotentList.ok === true && idempotentList.data.length === 2, 'owner list must include each distinct save attempt once')
  idempotentList.data.forEach((item) => {
    assert(!('saveAttemptId' in item) && !('_id' in item) && !('_openid' in item) && !('queryId' in item), 'list DTO must hide saveAttemptId and database/context fields')
  })
  console.log('PASS: sequential save retry idempotency and private identity boundary')

  reset()
  store.history = [
    { _id: 'history-A', _openid: 'user-A', route: '武功山', date: '2026-08-08', days: 2, level: '中级' },
    { _id: 'history-B', _openid: 'user-B', route: '四姑娘山', date: '2026-08-09', days: 3, level: '老手' },
  ]
  openid = 'user-A'
  const deleted = await history.main({ mode: 'delete', id: 'history-A' }, {})
  assert(JSON.stringify(deleted) === JSON.stringify({ ok: true }), 'owned conditional delete must succeed only after one removal')
  assert(!store.history.some((record) => record._id === 'history-A'), 'owned record must be removed')
  const foreignDelete = await history.main({ mode: 'delete', id: 'history-B' }, {})
  const unknownDelete = await history.main({ mode: 'delete', id: 'history-unknown' }, {})
  assert(JSON.stringify(foreignDelete) === JSON.stringify(unknownDelete), 'foreign and unknown deletion must expose the same response')
  assert(foreignDelete.error === 'history_not_found' && foreignDelete.retryable === false, 'zero conditional deletion must be history_not_found')
  assert(store.history.some((record) => record._id === 'history-B'), 'foreign record must remain after delete attempt')

  const cleared = await history.main({ mode: 'clear' }, {})
  assert(JSON.stringify(cleared) === JSON.stringify({ ok: true, removed: 0 }), 'empty clear must succeed with removed:0')
  store.history.push({ _id: 'history-A2', _openid: 'user-A', route: '贡嘎', date: '2026-08-10', days: 1, level: '中级' })
  const clearedOne = await history.main({ mode: 'clear' }, {})
  assert(JSON.stringify(clearedOne) === JSON.stringify({ ok: true, removed: 1 }), 'clear must return the actual current-user removal count')
  assert(store.history.length === 1 && store.history[0]._id === 'history-B', 'clear must not remove another user history')
  assert(store.routes.length === 1 && store.routes[0].name === '旧公共路线', 'clear must not change existing routes data')
  console.log('PASS: conditional delete and clear ownership contract')

  reset()
  openid = 'user-A'
  const unavailable = []
  failingOperation = 'add'
  unavailable.push(await history.main({ mode: 'save', route: '武功山', date: '2026-08-08' }, {}))
  failingOperation = 'get'
  unavailable.push(await history.main({ mode: 'save', route: '武功山', date: '2026-08-08', saveAttemptId: 'lookup-failure' }, {}))
  unavailable.push(await history.main({ mode: 'list' }, {}))
  failingOperation = 'empty-lookup-add'
  const lookupThenAddFailure = await history.main({ mode: 'save', route: '武功山', date: '2026-08-08', saveAttemptId: 'add-failure-after-empty-lookup' }, {})
  unavailable.push(lookupThenAddFailure)
  failingOperation = 'remove'
  unavailable.push(await history.main({ mode: 'delete', id: 'history-A' }, {}))
  unavailable.push(await history.main({ mode: 'clear' }, {}))
  failingOperation = null
  unavailable.forEach((result) => {
    assert(result.error === 'history_unavailable' && result.retryable === true, 'each storage failure must use retryable history_unavailable')
    assert(result.message === '历史服务暂时不可用，请稍后重试', 'storage failure must not leak raw errors')
  })
  assert(lookupThenAddFailure.error === 'history_unavailable' && lookupThenAddFailure.retryable === true, 'empty lookup followed by add failure must map to history_unavailable')

  const disabledSaveRoute = await history.main({ mode: 'saveRoute', route: '旧公共路线' }, {})
  const disabledListRoutes = await history.main({ mode: 'listRoutes', keyword: '旧公共路线' }, {})
  assert(disabledSaveRoute.error === 'ugc_disabled' && disabledSaveRoute.retryable === false, 'saveRoute must be an authenticated ugc_disabled tombstone')
  assert(JSON.stringify(disabledSaveRoute) === JSON.stringify(disabledListRoutes), 'legacy UGC tombstones must use one public response')
  assert(store.routes.length === 1, 'legacy UGC tombstones must not access or mutate routes')
  console.log('PASS: storage errors and public UGC tombstones')

  const invalidSave = await history.main({ mode: 'save', route: ' ', date: '' }, {})
  reset()
  openid = 'user-A'
  const addCallsBeforeInvalidAttempt = addCalls
  const invalidAttempt = await history.main({ mode: 'save', route: '武功山', date: '2026-08-08', saveAttemptId: '   ' }, {})
  assert(invalidAttempt.error === 'invalid_history_input' && invalidAttempt.retryable === false, 'empty saveAttemptId must use the existing non-retryable invalid input envelope')
  assert(addCalls === addCallsBeforeInvalidAttempt, 'malformed saveAttemptId must be rejected before database add')
  const tooLongAttempt = await history.main({ mode: 'save', route: '武功山', date: '2026-08-08', saveAttemptId: 'x'.repeat(81) }, {})
  assert(tooLongAttempt.error === 'invalid_history_input' && addCalls === addCallsBeforeInvalidAttempt, 'overlong saveAttemptId must be rejected before database add')
  const nonStringAttempt = await history.main({ mode: 'save', route: '武功山', date: '2026-08-08', saveAttemptId: 123 }, {})
  assert(nonStringAttempt.error === 'invalid_history_input' && nonStringAttempt.retryable === false && addCalls === addCallsBeforeInvalidAttempt, 'non-string saveAttemptId must be rejected before database add')
  const missingId = await history.main({ mode: 'delete' }, {})
  const invalidMode = await history.main({ mode: 'client-secret-mode' }, {})
  for (const result of [invalidSave, missingId, invalidMode]) {
    assert(result.ok === false && typeof result.error === 'string' && typeof result.message === 'string' && result.retryable === false, 'input and mode errors must use the common non-retryable envelope')
  }
  assert(invalidSave.error === 'invalid_history_input' && missingId.error === 'missing_id' && invalidMode.error === 'invalid_mode', 'history input and mode errors must use frozen codes')
  assert(!invalidMode.message.includes('client-secret-mode'), 'invalid mode must not echo client input')

  openid = ''
  const noAuth = await history.main({ mode: 'list' }, {})
  assert(noAuth.error === 'no_auth' && noAuth.retryable === false, 'all history modes must reject missing server identity')
  console.log('PASS: common error envelope and server-only authentication')
  assertHistoryPaginationMutations()
  console.log('PASS: history pagination mutation-sensitive source contract')
}

run()
  .finally(() => { Module._resolveFilename = originalResolve })
  .catch((error) => {
    console.error('FAIL:', error.message)
    process.exitCode = 1
  })
