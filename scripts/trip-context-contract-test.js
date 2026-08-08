/** I21 server-owned TripContext contract (offline). */
const assert = require('node:assert/strict')
const { createTripContextStore } = require('../cloudfunctions/getAdvice/trip-context')

const FIXTURE_TIME = '2026-08-08T08:00:00.000Z'
const QUERY_ID = 'tctx_11111111-1111-4111-8111-111111111111'

function copy(value) { return JSON.parse(JSON.stringify(value)) }

function trustedBase(overrides = {}) {
  return {
    schemaVersion: 'beta_base_v1',
    requestSummary: { date: '2026-08-09', startTimeLocal: '08:00', level: '中级', days: 1, climbSupport: null },
    routeSnapshot: {
      entityKind: 'route_variant', capability: 'full', placeId: 'place:test', routeId: 'route:test', routeVariantId: 'variant:test',
      canonicalName: '测试路线', region: '测试地区', routeType: 'trek', fixedDays: 1, stages: [], referenceCoordinate: null, referenceElevationM: null, restriction: null,
    },
    weatherSnapshot: { ok: true, dataStatus: 'complete', evaluatedWindows: [] },
    deterministicResult: { verdict: 'go', dataStatus: 'complete', reasons: [], dataIssues: [], evaluatedWindows: [] },
    minimumGear: { essential: [], recommended: [], optional: [] },
    sourceMetadata: { routeSourceIds: ['source:test'], routeTypeSource: 'builtin', weatherSource: 'Open-Meteo', checkedAt: FIXTURE_TIME },
    route: '测试路线', date: '2026-08-09', level: '中级', days: 1, elevation: null, location: '测试地区', coords: null,
    routeType: 'trek', routeTypeSource: 'builtin', weather: [], sunEvents: null, gearRules: { essential: [], recommended: [], optional: [], fatalRisks: [], ruleNotes: [] },
    meta: { source: 'base', capability: 'full', dataStatus: 'complete' },
    ...overrides,
  }
}

function memoryCollection({ failWrite = false, failRead = false } = {}) {
  const records = new Map()
  const calls = { set: 0, where: 0, delete: 0 }
  return {
    records, calls,
    collection: {
      doc(id) { return { async set({ data }) { calls.set++; if (failWrite) throw new Error('write secret'); records.set(id, copy(data)); return { _id: id } } } },
      where(filter) {
        calls.where++
        return { limit() { return { async get() { if (failRead) throw new Error('read secret'); const item = records.get(filter._id); return { data: item ? [copy(item)] : [] } } } } }
      },
    },
  }
}

async function main() {
  const memory = memoryCollection()
  const store = createTripContextStore({ collection: memory.collection, now: () => new Date(FIXTURE_TIME), createQueryId: () => QUERY_ID })
  const base = trustedBase()
  const created = await store.create({ openid: 'owner', trustedBaseData: base })
  assert.equal(created.kind, 'created')
  assert.equal(created.queryId, QUERY_ID)
  assert.equal(created.expiresAt, '2026-08-08T08:30:00.000Z')
  assert.deepEqual(created.snapshot, base)
  assert.deepEqual(memory.records.get(QUERY_ID).snapshot, base)

  base.route = 'client mutation'
  created.snapshot.route = 'returned mutation'
  const read = await store.read({ openid: 'owner', queryId: QUERY_ID })
  assert.equal(read.kind, 'found')
  assert.equal(read.snapshot.route, '测试路线')
  read.snapshot.route = 'read mutation'
  assert.equal((await store.read({ openid: 'owner', queryId: QUERY_ID })).snapshot.route, '测试路线')
  assert.deepEqual(await store.read({ openid: 'other', queryId: QUERY_ID }), { kind: 'unavailable', code: 'context_forbidden' })
  assert.deepEqual(await store.read({ openid: 'owner', queryId: 'not-a-query-id' }), { kind: 'unavailable', code: 'context_not_found' })

  const expiredStore = createTripContextStore({ collection: memory.collection, now: () => new Date('2026-08-08T08:30:00.000Z'), createQueryId: () => 'tctx_22222222-2222-4222-8222-222222222222' })
  assert.deepEqual(await expiredStore.read({ openid: 'owner', queryId: QUERY_ID }), { kind: 'unavailable', code: 'context_expired' })
  await assert.rejects(() => store.create({ openid: 'owner', trustedBaseData: null }), new TypeError('trusted base context required'))
  await assert.rejects(() => store.create({ openid: 'owner', trustedBaseData: { route: 'legacy' } }), new TypeError('trusted base context required'))

  const writeFailure = createTripContextStore({ collection: memoryCollection({ failWrite: true }).collection })
  assert.deepEqual(await writeFailure.create({ openid: 'owner', trustedBaseData: trustedBase() }), { kind: 'store_unavailable' })
  const readFailureMemory = memoryCollection()
  const readFailure = createTripContextStore({ collection: readFailureMemory.collection, createQueryId: () => 'tctx_33333333-3333-4333-8333-333333333333' })
  const readFailureCreated = await readFailure.create({ openid: 'owner', trustedBaseData: trustedBase() })
  const unavailable = createTripContextStore({ collection: memoryCollection({ failRead: true }).collection })
  assert.deepEqual(await unavailable.read({ openid: 'owner', queryId: readFailureCreated.queryId }), { kind: 'store_unavailable' })
  console.log('PASS: I21 TripContext trusted BaseData contract')
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
