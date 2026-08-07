/**
 * I19 private history contract test.
 *
 * The handler is exercised through its public Cloud Function interface with a
 * small in-memory CloudBase seam. It deliberately rejects routes collection
 * access so the legacy UGC tombstones cannot accidentally keep a live path.
 */

const Module = require('module')

const ALLOWED_HISTORY_FIELDS = [
  'id', 'route', 'date', 'days', 'level', 'elevation', 'location', 'summary',
  'degraded', 'coords', 'routeType', 'routeTypeSource',
]

const store = { history: [], routes: [{ _id: 'legacy-route', name: '旧公共路线' }] }
let openid = ''
let nextId = 1
let failingOperation = null

function copy(value) {
  return JSON.parse(JSON.stringify(value))
}

function historyCollection() {
  let filter = {}
  let limit = 100
  let order = null
  return {
    where(value) { filter = value || {}; return this },
    orderBy(field, direction) { order = { field, direction }; return this },
    limit(value) { limit = value; return this },
    async get() {
      if (failingOperation === 'get') throw new Error('offline history get')
      let records = store.history.filter((record) => Object.keys(filter).every((key) => record[key] === filter[key]))
      if (order) records = records.slice().sort((left, right) => {
        const leftValue = left[order.field] instanceof Date ? left[order.field].getTime() : 0
        const rightValue = right[order.field] instanceof Date ? right[order.field].getTime() : 0
        return order.direction === 'desc' ? rightValue - leftValue : leftValue - rightValue
      })
      return { data: copy(records.slice(0, limit)) }
    },
    async add({ data }) {
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

function reset() {
  store.history = []
  store.routes = [{ _id: 'legacy-route', name: '旧公共路线' }]
  nextId = 1
  failingOperation = null
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
  unavailable.push(await history.main({ mode: 'list' }, {}))
  failingOperation = 'remove'
  unavailable.push(await history.main({ mode: 'delete', id: 'history-A' }, {}))
  unavailable.push(await history.main({ mode: 'clear' }, {}))
  failingOperation = null
  unavailable.forEach((result) => {
    assert(result.error === 'history_unavailable' && result.retryable === true, 'each storage failure must use retryable history_unavailable')
    assert(result.message === '历史服务暂时不可用，请稍后重试', 'storage failure must not leak raw errors')
  })

  const disabledSaveRoute = await history.main({ mode: 'saveRoute', route: '旧公共路线' }, {})
  const disabledListRoutes = await history.main({ mode: 'listRoutes', keyword: '旧公共路线' }, {})
  assert(disabledSaveRoute.error === 'ugc_disabled' && disabledSaveRoute.retryable === false, 'saveRoute must be an authenticated ugc_disabled tombstone')
  assert(JSON.stringify(disabledSaveRoute) === JSON.stringify(disabledListRoutes), 'legacy UGC tombstones must use one public response')
  assert(store.routes.length === 1, 'legacy UGC tombstones must not access or mutate routes')
  console.log('PASS: storage errors and public UGC tombstones')

  const invalidSave = await history.main({ mode: 'save', route: ' ', date: '' }, {})
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
}

run()
  .finally(() => { Module._resolveFilename = originalResolve })
  .catch((error) => {
    console.error('FAIL:', error.message)
    process.exitCode = 1
  })
