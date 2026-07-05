/**
 * 徒步薯 - 深层安全审计 (第二轮红队)
 *
 * 目标：暴露第一轮 security-test.js 没覆盖到的漏洞
 * 方法：针对性构造每个已知盲区，标记 EXPECT_PASS / EXPECT_FAIL
 *   EXPECT_FAIL = 预期当前代码有 Bug，测试会 "发现" 它（assert 漏洞存在）
 *   EXPECT_PASS = 预期防线完整，测试应通过
 *
 * 检查项覆盖：测试套件 / Fixtures Diff / Linter / 密钥扫描 / 构建退出码
 *
 * 用法: node scripts/deep-audit.js
 * 退出码: 0=全部符合预期, 1=有意外的发现（可能是新 Bug 或回归）
 */

const Module = require('module')
const path = require('path')
const fs = require('fs')

// ===== mock wx-server-sdk (更严格版：add 不自动注入 _openid，模拟最坏情况) =====
const mockData = { history: [], routes: [] }
let currentOpenid = ''

function makeChainable(collection) {
  let f = {}, ord = null, lim = 100
  const chain = {
    where(filter) { f = filter || {}; return chain },
    orderBy(field, dir) { ord = { field, dir }; return chain },
    limit(n) { lim = n; return chain },
    async get() {
      let rows = mockData[collection].filter(function (r) {
        return Object.keys(f).every(function (k) { return r[k] === f[k] })
      })
      if (ord) rows.sort(function (a, b) {
        var va = (a[ord.field]||0).getTime ? a[ord.field].getTime() : 0
        var vb = (b[ord.field]||0).getTime ? b[ord.field].getTime() : 0
        return ord.dir === 'desc' ? vb - va : va - vb
      })
      return { data: rows.slice(0, lim) }
    },
    async add({ data }) {
      // 严格模式：不自动注入 _openid，模拟「SDK 未注入」的最坏路径
      var doc = { _id: 'id_' + Math.random().toString(36).slice(2, 10), ...data }
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
  getWXContext: function () { return { OPENID: currentOpenid } },
  database: function () {
    return {
      collection: function (name) { return makeChainable(name) },
      serverDate: function () { return new Date() },
    }
  },
}

const origResolve = Module._resolveFilename
Module._resolveFilename = function (request) {
  if (request === 'wx-server-sdk') return 'mock'
  return origResolve.apply(this, arguments)
}
require.cache['mock'] = { id: 'mock', filename: 'mock', loaded: true, exports: mockSdk }

const handler = require('../cloudfunctions/history/index.js')

// ===== 测试框架（区分预期 vs 实际） =====
let pass = 0, fail = 0, findings = []

async function probe(name, expectResult, fn) {
  try {
    var actual = await fn()
    if (expectResult === 'SAFE') {
      // 预期安全：actual.shouldBeBlocked 应为 true
      if (actual.blocked) { pass++; console.log('  \x1b[32m[SAFE]\x1b[0m ' + name) }
      else { fail++; findings.push({ name, severity: actual.severity || 'P2', detail: actual.detail }); console.log('  \x1b[31m[VULN]\x1b[0m ' + name + ' \x1b[33m(' + (actual.severity||'P2') + ')\x1b[0m ' + actual.detail) }
    } else {
      // 预期漏洞（EXPECT_FAIL）：确认漏洞确实存在
      if (!actual.blocked) { pass++; console.log('  \x1b[33m[KNOWN]\x1b[0m ' + name + ' — 漏洞已确认') }
      else { fail++; findings.push({ name, severity: 'INFO', detail: '预期的漏洞不存在（可能已修复）' }); console.log('  \x1b[32m[FIXED]\x1b[0m ' + name + ' — 漏洞不存在（已修复？）') }
    }
  } catch (e) {
    fail++; findings.push({ name, severity: 'P1', detail: '测试本身崩溃: ' + e.message })
    console.log('  \x1b[31m[CRASH]\x1b[0m ' + name + ' -> ' + e.message)
  }
}

function blocked(detail, severity) { return { blocked: true, detail, severity } }
function vulnerable(detail, severity) { return { blocked: false, detail, severity } }

// ===== 场景 1-8：saveRoute 坐标校验盲区 =====

async function testSaveRouteAttacks() {
  console.log('\n\x1b[36m--- A. saveRoute 坐标校验深层探测 ---\x1b[0m\n')
  mockData.routes = []
  currentOpenid = 'attacker'

  // 1. lat 超出 [-90, 90] 范围
  await probe('lat=999 应被拒绝（超出地球纬度范围）', 'SAFE', async () => {
    var res = await handler.main({ mode: 'saveRoute', route: '黑客峰', lat: 999, lon: 100, elevation: 100, location: 'test' }, {})
    if (res.ok && res.action === 'created') return vulnerable('lat=999 被写入数据库，无范围校验', 'P2')
    return blocked('已拒绝')
  })

  // 2. lon 超出 [-180, 180]
  await probe('lon=999 应被拒绝', 'SAFE', async () => {
    var res = await handler.main({ mode: 'saveRoute', route: '黑客谷', lat: 30, lon: 999, elevation: 100, location: 'test' }, {})
    if (res.ok && res.action === 'created') return vulnerable('lon=999 被写入数据库', 'P2')
    return blocked('已拒绝')
  })

  // 3. parseFloat('100abc') = 100 (部分解析)
  await probe('lat="100abc" 不应被接受', 'SAFE', async () => {
    var res = await handler.main({ mode: 'saveRoute', route: '解析峰', lat: '100abc', lon: '100', elevation: 100, location: 'test' }, {})
    if (res.ok) return vulnerable('parseFloat("100abc")=100 被接受，字符串部分解析', 'P2')
    return blocked('已拒绝')
  })

  // 4. Infinity
  await probe('lat=Infinity 不应被接受', 'SAFE', async () => {
    var res = await handler.main({ mode: 'saveRoute', route: '无限峰', lat: 'Infinity', lon: 'Infinity', elevation: 100, location: 'test' }, {})
    if (res.ok) return vulnerable('parseFloat("Infinity")=Infinity 通过了 isNaN 检查', 'P2')
    return blocked('已拒绝')
  })

  // 5. 空字符串别名污染
  await probe('saveRoute 不应创建空字符串别名', 'SAFE', async () => {
    mockData.routes = []
    var res = await handler.main({ mode: 'saveRoute', route: '清洁山', lat: 30.5, lon: 104.0, elevation: 500, location: '四川' }, {})
    if (res.ok && res.action === 'created') {
      var doc = mockData.routes.find(function (r) { return r.name === '清洁山' })
      if (doc && doc.aliases && doc.aliases.indexOf('') >= 0) return vulnerable('aliases 数组含空字符串', 'P3')
      return blocked('别名无空字符串')
    }
    return blocked('未创建')
  })

  // 6. elevation 接受任意类型
  await probe('elevation 应为数字或 null，不接受对象', 'SAFE', async () => {
    var res = await handler.main({ mode: 'saveRoute', route: '对象峰', lat: 30, lon: 104, elevation: { $gt: '' }, location: 'test' }, {})
    if (res.ok && res.action === 'created') {
      var doc = mockData.routes.find(function (r) { return r.name === '对象峰' })
      if (doc && doc.elevation !== null && typeof doc.elevation === 'object') return vulnerable('elevation 存储了对象类型，可能被用于 NoSQL 注入', 'P2')
    }
    return blocked('已拒绝或已类型转换')
  })
}

// ===== 场景 7-10：saveRecord 字段注入 =====

async function testSaveRecordAttacks() {
  console.log('\n\x1b[36m--- B. saveRecord 字段注入探测 ---\x1b[0m\n')
  mockData.history = []
  currentOpenid = 'attacker'

  // 7. coords 接受任意嵌套对象
  await probe('coords 字段不应接受任意嵌套对象', 'SAFE', async () => {
    var res = await handler.main({ mode: 'save', route: '测试', date: '2026-07-01', coords: { nested: { deep: { injection: 'payload' } } } }, {})
    if (res.ok) {
      var doc = mockData.history.find(function (r) { return r.route === '测试' })
      if (doc && doc.coords && typeof doc.coords === 'object' && doc.coords.nested) return vulnerable('coords 存储了深层嵌套对象', 'P3')
    }
    return blocked('已过滤')
  })

  // 8. route 接受对象类型
  await probe('route 字段不应将对象转为 "[object Object]"', 'SAFE', async () => {
    var res = await handler.main({ mode: 'save', route: { $where: '1==1' }, date: '2026-07-01' }, {})
    if (res.ok) {
      var doc = mockData.history[mockData.history.length - 1]
      if (doc && doc.route === '[object Object]') return vulnerable('route 存储了 "[object Object]"', 'P3')
      if (doc && typeof doc.route === 'object') return vulnerable('route 存储了对象类型', 'P2')
    }
    return blocked('已类型转换或拒绝')
  })

  // 9. level 字段注入
  await probe('level 字段不应接受超长/特殊字符', 'SAFE', async () => {
    var res = await handler.main({ mode: 'save', route: '测试', date: '2026-07-01', level: 'A'.repeat(500) }, {})
    if (res.ok) {
      var doc = mockData.history[mockData.history.length - 1]
      if (doc && doc.level.length > 50) return vulnerable('level 未截断，长度=' + doc.level.length, 'P3')
      return blocked('已截断')
    }
    return blocked('已拒绝')
  })

  // 10. _openid 依赖（严格 mock 下 save 不注入 _openid）
  await probe('saveRecord 应手动注入 _openid 而非依赖 SDK', 'SAFE', async () => {
    mockData.history = []
    currentOpenid = 'user_X'
    var saveRes = await handler.main({ mode: 'save', route: 'openid测试', date: '2026-07-01' }, {})
    if (!saveRes.ok) return blocked('save 失败')
    var doc = mockData.history.find(function (r) { return r.route === 'openid测试' })
    if (!doc) return blocked('未找到记录')
    // 在严格 mock 下，_openid 不会被注入
    if (doc._openid === undefined || doc._openid === '') {
      return vulnerable('saveRecord 未手动设置 _openid，listRecords 的 where 过滤将永远查不到此记录', 'P1')
    }
    return blocked('_openid 已存在')
  })
}

// ===== 场景 11-12：listRoutes 数据泄露 =====

async function testListRoutesLeaks() {
  console.log('\n\x1b[36m--- C. listRoutes 数据泄露面 ---\x1b[0m\n')
  mockData.routes = [
    { _id: 'r1', _openid: 'creator_A', name: '武功山', lat: 27.47, lon: 114.18, elevation: 1918, location: '江西', aliases: ['武功山金顶'] },
    { _id: 'r2', _openid: 'creator_B', name: '黄山', lat: 30.13, lon: 118.16, elevation: 1864, location: '安徽', aliases: [] },
  ]
  currentOpenid = 'user_C'

  // 11. listRoutes 不应泄露 _openid
  await probe('listRoutes 返回数据不应包含 _openid 字段', 'SAFE', async () => {
    var res = await handler.main({ mode: 'listRoutes', keyword: '武' }, {})
    if (res.ok && res.data) {
      var leaked = res.data.find(function (r) { return r._openid !== undefined })
      if (leaked) return vulnerable('listRoutes 泄露了 _openid: ' + leaked._openid, 'P2')
      return blocked('无 _openid 泄露')
    }
    return blocked('无数据')
  })

  // 12. listRoutes 不应泄露 _id
  await probe('listRoutes 返回数据不应包含 _id', 'SAFE', async () => {
    var res = await handler.main({ mode: 'listRoutes', keyword: '武' }, {})
    if (res.ok && res.data) {
      var leaked = res.data.find(function (r) { return r._id !== undefined })
      if (leaked) return vulnerable('listRoutes 泄露了内部 _id', 'P3')
      return blocked('无 _id 泄露')
    }
    return blocked('无数据')
  })
}

// ===== 场景 13-14：Fixtures Diff (响应结构一致性) =====

async function testFixturesDiff() {
  console.log('\n\x1b[36m--- D. Fixtures Diff (响应结构一致性) ---\x1b[0m\n')
  mockData.history = []
  currentOpenid = 'user_A'

  // 13. save 响应结构一致性
  await probe('save 成功响应应包含固定字段结构 {ok, id}', 'SAFE', async () => {
    var res = await handler.main({ mode: 'save', route: '结构测试', date: '2026-07-01' }, {})
    var keys = Object.keys(res).sort()
    var expected = ['id', 'ok']
    if (JSON.stringify(keys) !== JSON.stringify(expected)) {
      return vulnerable('响应结构漂移: 期望 ' + JSON.stringify(expected) + ' 实际 ' + JSON.stringify(keys), 'P3')
    }
    return blocked('结构一致')
  })

  // 14. list 响应结构一致性
  await probe('list 响应应包含 {ok, data} 且 data 为数组', 'SAFE', async () => {
    var res = await handler.main({ mode: 'list' }, {})
    if (typeof res.ok !== 'boolean') return vulnerable('ok 不是 boolean 类型', 'P3')
    if (!Array.isArray(res.data)) return vulnerable('data 不是数组类型', 'P3')
    return blocked('结构一致')
  })
}

// ===== 场景 15-16：密钥扫描 + Linter =====

async function testSecretScanning() {
  console.log('\n\x1b[36m--- E. 密钥扫描 + 静态检查 ---\x1b[0m\n')

  // 15. 扫描硬编码密钥
  await probe('代码中不应有硬编码 API Key', 'SAFE', async () => {
    var patterns = [
      /sk-[a-f0-9]{20,}/i,           // OpenAI/DeepSeek key
      /[a-f0-9]{32}\.twitter\./i,    // Twitter token
      /AKIA[A-Z0-9]{16}/,            // AWS key
      /ghp_[a-zA-Z0-9]{36}/,         // GitHub PAT
      /api[_-]?key\s*[:=]\s*['"][^'"]{20,}['"]/i,  // generic api_key
    ]
    var files = [
      'cloudfunctions/history/index.js',
      'cloudfunctions/getAdvice/index.js',
      'cloudfunctions/getAdvice/geocode.js',
      'taro-app/src/pages/index/index.jsx',
    ]
    for (var i = 0; i < files.length; i++) {
      var code
      try { code = fs.readFileSync(path.resolve(__dirname, '..', files[i]), 'utf8') } catch (e) { continue }
      for (var j = 0; j < patterns.length; j++) {
        if (patterns[j].test(code)) return vulnerable('文件 ' + files[i] + ' 疑似硬编码密钥 (pattern ' + j + ')', 'P0')
      }
    }
    return blocked('未发现硬编码密钥')
  })

  // 16. console.error 不应泄露敏感信息到云函数日志
  await probe('catch 块的 console.error 不应输出完整 event', 'SAFE', async () => {
    var code = fs.readFileSync(path.resolve(__dirname, '..', 'cloudfunctions/history/index.js'), 'utf8')
    // 检查是否有 console.error 输出了 event 或含敏感字段
    var dangerous = /console\.error\([^)]*event\b/.test(code)
    if (dangerous) return vulnerable('console.error 可能泄露完整 event 对象', 'P2')
    return blocked('日志输出安全')
  })
}

// ===== 场景 17-18：并发 / 写风暴 =====

async function testConcurrency() {
  console.log('\n\x1b[36m--- F. 并发 / 写风暴 ---\x1b[0m\n')
  mockData.history = []
  currentOpenid = 'spammer'

  // 17. 无限写入保护
  await probe('连续 50 次 save 应有某种节流（当前预期无保护）', 'FAIL', async () => {
    var promises = []
    for (var i = 0; i < 50; i++) {
      promises.push(handler.main({ mode: 'save', route: 'spam_' + i, date: '2026-07-01' }, {}))
    }
    var results = await Promise.all(promises)
    var success = results.filter(function (r) { return r.ok }).length
    if (success === 50) return vulnerable('50 次并发写入全部成功，无速率限制', 'P2')
    if (success < 50) return blocked('有 ' + (50 - success) + ' 次被限流')
    return blocked('部分限流')
  })

  // 18. delete 并发竞态（TOCTOU）
  await probe('delete 先查再删存在 TOCTOU 窗口', 'FAIL', async () => {
    // 概念验证：deleteRecord 先 get 再 remove，中间有窗口
    var code = fs.readFileSync(path.resolve(__dirname, '..', 'cloudfunctions/history/index.js'), 'utf8')
    var hasGetBeforeRemove = /\.doc\(id\)\.get\(\)/.test(code) && /\.doc\(id\)\.remove\(\)/.test(code)
    if (hasGetBeforeRemove) return vulnerable('get -> remove 两步操作，TOCTOU 窗口存在（理论风险，实际影响低）', 'P3')
    return blocked('无 TOCTOU')
  })
}

// ===== 主入口 =====
async function main() {
  console.log('\x1b[36m=========================================\x1b[0m')
  console.log('\x1b[36m  徒步薯 深层安全审计 (第二轮红队)\x1b[0m')
  console.log('\x1b[36m  18 项检查 | 预期发现: 10 个已知漏洞\x1b[0m')
  console.log('\x1b[36m=========================================\x1b[0m')

  await testSaveRouteAttacks()
  await testSaveRecordAttacks()
  await testListRoutesLeaks()
  await testFixturesDiff()
  await testSecretScanning()
  await testConcurrency()

  // ===== 构建退出码检查 =====
  console.log('\n\x1b[36m--- G. 构建退出码 + 语法检查 ---\x1b[0m\n')
  var syntaxFiles = [
    'cloudfunctions/history/index.js',
    'cloudfunctions/getAdvice/index.js',
  ]
  for (var i = 0; i < syntaxFiles.length; i++) {
    var f = syntaxFiles[i]
    try {
      require('child_process').execSync('node --check ' + path.resolve(__dirname, '..', f), { stdio: 'pipe' })
      pass++; console.log('  \x1b[32m[SYNTAX OK]\x1b[0m ' + f)
    } catch (e) {
      fail++; findings.push({ name: f + ' 语法', severity: 'P0', detail: e.message })
      console.log('  \x1b[31m[SYNTAX ERR]\x1b[0m ' + f)
    }
  }

  // ===== 总结 =====
  console.log('\n\x1b[36m=========================================\x1b[0m')
  console.log('  PASS (符合预期): ' + pass)
  console.log('  FAIL (意外发现): ' + fail)
  console.log('\x1b[36m=========================================\x1b[0m')

  if (findings.length > 0) {
    console.log('\n\x1b[33m漏洞清单:\x1b[0m')
    findings.forEach(function (f, i) {
      console.log('  ' + (i + 1) + '. [' + f.severity + '] ' + f.name)
      console.log('     ' + f.detail)
    })
  }

  // 退出码：fail=0 表示「所有测试都按预期跑」（包括预期会发现的漏洞）
  // fail>0 表示「有不符合预期的结果」（新 Bug 或已修复的漏洞回退）
  if (fail > 0) {
    console.log('\n\x1b[31m有不符合预期的结果，请人工复核\x1b[0m')
    process.exit(1)
  } else {
    console.log('\n\x1b[32m所有检查项均符合预期\x1b[0m')
    process.exit(0)
  }
}

main().catch(function (e) { console.error('审计异常:', e); process.exit(1) })
