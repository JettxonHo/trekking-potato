/**
 * 徒步薯 - 红蓝对抗安全测试
 *
 * 红队攻击向量：
 *   1. 越权读取：用户 A 尝试 list -> 不应看到用户 B 的记录
 *   2. 越权删除：用户 A 尝试 delete 用户 B 的记录 -> 应被拦截
 *   3. 伪造身份：云函数上下文无 openid -> 应拒绝
 *   4. 篡改参数：注入超长字符串 / __proto__ 污染 -> 应被白名单拦截
 *   5. 空查询：不传参数 / 错误 mode -> 不应崩溃
 *
 * 用法: node scripts/security-test.js
 */

// ===== mock wx-server-sdk =====

const mockData = {
  history: [],
  routes: [],
}

let currentOpenid = ''

function makeChainable(collection) {
  let queryFilter = {}
  let queryOrder = null
  let queryLimit = 100

  const chain = {
    where(filter) { queryFilter = filter || {}; return chain },
    orderBy(field, dir) { queryOrder = { field, dir }; return chain },
    limit(n) { queryLimit = n; return chain },
    async get() {
      let rows = mockData[collection].filter(function (r) {
        return Object.keys(queryFilter).every(function (k) { return r[k] === queryFilter[k] })
      })
      if (queryOrder) {
        rows.sort(function (a, b) {
          var va = (a[queryOrder.field] || 0).getTime ? a[queryOrder.field].getTime() : 0
          var vb = (b[queryOrder.field] || 0).getTime ? b[queryOrder.field].getTime() : 0
          return queryOrder.dir === 'desc' ? vb - va : va - vb
        })
      }
      return { data: rows.slice(0, queryLimit) }
    },
    async add({ data }) {
      var doc = { _id: 'id_' + Math.random().toString(36).slice(2, 10), _openid: currentOpenid, ...data }
      mockData[collection].push(doc)
      return { _id: doc._id }
    },
    doc(id) {
      return {
        async get() {
          var found = mockData[collection].find(function (r) { return r._id === id })
          return { data: found || null }
        },
        async remove() {
          var idx = mockData[collection].findIndex(function (r) { return r._id === id })
          if (idx >= 0) mockData[collection].splice(idx, 1)
          return { stats: { removed: idx >= 0 ? 1 : 0 } }
        },
        async update({ data }) {
          var found = mockData[collection].find(function (r) { return r._id === id })
          if (found) Object.assign(found, data)
          return { stats: { updated: found ? 1 : 0 } }
        },
      }
    },
  }
  return chain
}

const mockSdk = {
  init: function () {},
  DYNAMIC_CURRENT_ENV: 'test-env',
  getWXContext: function () {
    return { OPENID: currentOpenid }
  },
  database: function () {
    return {
      collection: function (name) { return makeChainable(name) },
      serverDate: function () { return new Date() },
    }
  },
}

// hijack require so cloud function loads our mock sdk
const Module = require('module')
const origResolve = Module._resolveFilename
Module._resolveFilename = function (request) {
  if (request === 'wx-server-sdk') return 'wx-server-sdk-mock'
  return origResolve.apply(this, arguments)
}
require.cache['wx-server-sdk-mock'] = {
  id: 'wx-server-sdk-mock',
  filename: 'wx-server-sdk-mock',
  loaded: true,
  exports: mockSdk,
}

// ===== load cloud function =====
const handler = require('../cloudfunctions/history/index.js')

// ===== test framework =====
let passed = 0
let failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log('  \x1b[32mPASS\x1b[0m: ' + name)
    passed++
  } catch (e) {
    console.log('  \x1b[31mFAIL\x1b[0m: ' + name + ' -> ' + e.message)
    failed++
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message)
}

// ===== seed test data =====
function seed() {
  mockData.history = [
    { _id: 'h1', _openid: 'user_A', route: '武功山', date: '2026-07-01', days: 2, level: '中级', createdAt: new Date('2026-07-01T10:00:00') },
    { _id: 'h2', _openid: 'user_A', route: '黄山', date: '2026-07-03', days: 1, level: '小白', createdAt: new Date('2026-07-02T08:00:00') },
    { _id: 'h3', _openid: 'user_B', route: '四姑娘山', date: '2026-07-05', days: 3, level: '老手', createdAt: new Date('2026-07-03T09:00:00') },
    { _id: 'h4', _openid: 'user_B', route: '贡嘎', date: '2026-07-08', days: 5, level: '老手', createdAt: new Date('2026-07-04T07:00:00') },
  ]
}

// ===== attack scenarios =====

async function runAttacks() {
  console.log('\n\x1b[36m=== 红蓝对抗安全测试 ===\x1b[0m\n')

  console.log('\x1b[33m[攻击1] 越权读取 — 用户 A 查询历史，不应看到用户 B 的记录\x1b[0m')
  seed()
  currentOpenid = 'user_A'
  await test('list 仅返回 user_A 的 2 条记录', async () => {
    var res = await handler.main({ mode: 'list' }, {})
    expect(res.ok === true, '应返回 ok')
    expect(res.data.length === 2, '应只有 2 条，实际 ' + res.data.length)
    res.data.forEach(function (r) {
      expect(r._openid === 'user_A', '泄露了 user_B 的记录: ' + r.route)
    })
  })

  currentOpenid = 'user_B'
  await test('user_B 切换后只能看到自己的 2 条', async () => {
    var res = await handler.main({ mode: 'list' }, {})
    expect(res.data.length === 2, '应只有 2 条，实际 ' + res.data.length)
    res.data.forEach(function (r) {
      expect(r._openid === 'user_B', '泄露了 user_A 的记录: ' + r.route)
    })
  })

  console.log('\n\x1b[33m[攻击2] 越权删除 — 用户 A 尝试删用户 B 的记录\x1b[0m')
  seed()
  currentOpenid = 'user_A'
  await test('user_A 删除 user_B 的 h3 应被拒绝', async () => {
    var res = await handler.main({ mode: 'delete', id: 'h3' }, {})
    expect(res.ok === false, '删除应失败但成功了')
    expect(res.error === 'not_owner', '应返回 not_owner，实际 ' + res.error)
    var stillExists = mockData.history.find(function (r) { return r._id === 'h3' })
    expect(stillExists, '记录被越权删除了!')
  })

  await test('user_A 删除自己的 h1 应成功', async () => {
    var res = await handler.main({ mode: 'delete', id: 'h1' }, {})
    expect(res.ok === true, '应删除成功')
    var gone = mockData.history.find(function (r) { return r._id === 'h1' })
    expect(!gone, '记录应该已被删除')
  })

  console.log('\n\x1b[33m[攻击3] 伪造身份 — 无 openid 上下文\x1b[0m')
  seed()
  currentOpenid = ''
  await test('无 openid 时 list 应拒绝', async () => {
    var res = await handler.main({ mode: 'list' }, {})
    expect(res.ok === false, '应被拒绝')
    expect(res.error === 'no_auth', '应返回 no_auth')
  })

  await test('无 openid 时 delete 应拒绝', async () => {
    var res = await handler.main({ mode: 'delete', id: 'h1' }, {})
    expect(res.ok === false, '应被拒绝')
    expect(res.error === 'no_auth', '应返回 no_auth')
  })

  console.log('\n\x1b[33m[攻击4] 篡改参数 — 注入攻击\x1b[0m')
  seed()
  currentOpenid = 'user_A'
  await test('save 注入 __proto__ 字段不应污染原型', async () => {
    var malicious = {
      mode: 'save',
      route: '测试',
      date: '2026-07-01',
      __proto__: { admin: true },
      constructor: { prototype: { poisoned: true } },
    }
    var res = await handler.main(malicious, {})
    expect(res.ok === true, 'save 应成功（白名单过滤后）')
    expect(({}).admin !== true, '原型被污染了!')
    expect(({}).poisoned !== true, '原型被污染了!')
  })

  await test('save 超长 route 应被截断至 50 字符', async () => {
    var longRoute = 'A'.repeat(500)
    var res = await handler.main({ mode: 'save', route: longRoute, date: '2026-07-01' }, {})
    expect(res.ok === true, '应成功')
    var saved = mockData.history.find(function (r) { return r.route && r.route.length === 50 })
    expect(saved, '超长 route 未被截断')
  })

  await test('save 超长 summary 应被截断', async () => {
    var longSummary = 'X'.repeat(10000)
    var res = await handler.main({ mode: 'save', route: '截断测试', date: '2026-07-01', summary: longSummary }, {})
    expect(res.ok === true, '应成功')
    var saved = mockData.history.find(function (r) { return r.summary && r.summary.length === 120 })
    expect(saved, '超长 summary 未被截断')
  })

  console.log('\n\x1b[33m[攻击5] 异常输入 — 空/错误参数不应崩溃\x1b[0m')
  seed()
  currentOpenid = 'user_A'
  await test('未知 mode 应返回 invalid_mode', async () => {
    var res = await handler.main({ mode: 'hack' }, {})
    expect(res.ok === false, '应失败')
    expect(res.error === 'invalid_mode', '应返回 invalid_mode')
  })

  await test('空 event 不应崩溃', async () => {
    var res = await handler.main({}, {})
    expect(res.ok === false, '应失败')
    expect(res.error === 'invalid_mode', '应返回 invalid_mode')
  })

  await test('delete 无 id 应返回 missing_id', async () => {
    var res = await handler.main({ mode: 'delete' }, {})
    expect(res.ok === false, '应失败')
    expect(res.error === 'missing_id', '应返回 missing_id')
  })

  await test('save 无 route/date 不应崩溃（走默认值）', async () => {
    var res = await handler.main({ mode: 'save' }, {})
    expect(res.ok === true, '应有默认值兜底')
  })

  console.log('\n\x1b[33m[攻击6] saveRoute 地理围栏 — 异地重名保护\x1b[0m')
  mockData.routes = [
    { _id: 'r1', name: '白云山', lat: 23.16, lon: 113.30, elevation: 300, location: '广东', aliases: [] },
  ]
  await test('1km 内同名路线不新增（去重）', async () => {
    var res = await handler.main({ mode: 'saveRoute', route: '白云山', lat: 23.1605, lon: 113.3005, elevation: 310, location: '广东' }, {})
    expect(res.ok === true, '应成功')
    expect(res.action === 'merged', '应合并而非新增，实际 ' + res.action)
    expect(mockData.routes.length === 1, '不应新增记录')
  })

  await test('5km 外同名路线应追加地区后缀', async () => {
    var res = await handler.main({ mode: 'saveRoute', route: '白云山', lat: 30.60, lon: 104.07, elevation: 500, location: '四川省成都市' }, {})
    expect(res.ok === true, '应成功')
    expect(res.action === 'created', '应新增带后缀的记录')
    expect(res.data.name.includes('-'), '应有地区后缀: ' + res.data.name)
  })

  console.log('\n\x1b[36m=== 红蓝对抗总结 ===\x1b[0m')
  console.log('PASS: ' + passed + ', FAIL: ' + failed)
  if (failed > 0) {
    console.log('\x1b[31m存在安全漏洞，请修复！\x1b[0m')
    process.exit(1)
  } else {
    console.log('\x1b[32m防线完整，所有攻击已被拦截\x1b[0m')
  }
}

runAttacks().catch(function (e) {
  console.error('测试执行异常:', e)
  process.exit(1)
})
