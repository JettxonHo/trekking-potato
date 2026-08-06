/**
 * I17a TripContext storage contract (offline only).
 *
 * The public seam is createTripContextStore. Time, ID generation and the
 * CloudBase-compatible collection are injected system boundaries.
 */
const assert = require('node:assert/strict')
const { createTripContextStore } = require('../cloudfunctions/getAdvice/trip-context')

const FIXTURE_TIME = '2026-08-06T08:00:00.000Z'
const FIXTURE_TIME_MS = Date.parse(FIXTURE_TIME)
const UUID_V4 = /^tctx_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

function copy(value) {
  return JSON.parse(JSON.stringify(value))
}

function makeLegacyBaseData(overrides = {}) {
  return {
    route: '武功山',
    date: '2026-08-08',
    level: '中级',
    days: 2,
    elevation: 1918,
    location: '江西省萍乡市',
    coords: { lat: 27.4604, lon: 114.1736 },
    routeType: 'trek',
    routeTypeSource: 'builtin',
    weather: {
      days: [{ date: '2026-08-08', tempMin: 17, tempMax: 23, windMs: 4.5 }],
    },
    sunEvents: { sunrise: '05:42', sunset: '18:57' },
    gearRules: {
      routeType: 'trek',
      essential: [{ item: '登山鞋', reason: '防滑保护' }],
      recommended: [{ item: '登山杖', reason: '保护膝盖' }],
      optional: [{ item: '护膝', reason: '下坡保护' }],
      fatalRisks: ['雷暴'],
      ruleNotes: ['夏季关注雷暴'],
    },
    meta: { elapsed: 12, source: 'base' },
    queryId: 'client-supplied-query-id',
    unexpectedClientFact: { verdict: 'go' },
    ...overrides,
  }
}

function createMemoryCollection({ failWrite = false, failRead = false } = {}) {
  const records = new Map()
  const calls = { doc: 0, set: 0, where: 0, limit: 0, delete: 0 }
  let lastDatabaseResult = null

  return {
    calls,
    records,
    getLastDatabaseResult() {
      return lastDatabaseResult
    },
    collection: {
      doc(queryId) {
        calls.doc++
        return {
          async set({ data }) {
            calls.set++
            if (failWrite) throw new Error('offline write secret')
            records.set(queryId, copy(data))
            return { _id: queryId }
          },
        }
      },
      where(filter) {
        calls.where++
        return {
          limit(limit) {
            calls.limit++
            return {
              async get() {
                if (failRead) throw new Error('offline read secret')
                const item = records.get(filter._id)
                lastDatabaseResult = { data: item ? [copy(item)] : [] }
                return lastDatabaseResult
              },
            }
          },
        }
      },
    },
  }
}

function expectedSnapshot(baseData, checkedAt) {
  return {
    route: '武功山',
    date: '2026-08-08',
    level: '中级',
    days: 2,
    elevation: 1918,
    location: '江西省萍乡市',
    coords: { lat: 27.4604, lon: 114.1736 },
    routeType: 'trek',
    routeTypeSource: 'builtin',
    weather: copy(baseData.weather),
    sunEvents: copy(baseData.sunEvents),
    gearRules: copy(baseData.gearRules),
    meta: copy(baseData.meta),
    schemaVersion: 'beta_base_v1',
    requestSummary: {
      date: '2026-08-08',
      startTimeLocal: null,
      level: '中级',
      days: 2,
    },
    routeSnapshot: {
      entityKind: 'place',
      capability: 'place_only',
      canonicalName: '武功山',
      region: '江西省萍乡市',
      routeType: 'trek',
      referenceCoordinate: { lat: 27.4604, lon: 114.1736, coordinateSystem: 'GCJ-02' },
      referenceElevationM: 1918,
      sourceStatus: 'legacy_unverified',
    },
    weatherSnapshot: {
      status: 'available',
      scope: 'reference_point',
      source: 'Open-Meteo',
      data: copy(baseData.weather),
    },
    deterministicResult: {
      verdict: null,
      dataStatus: 'place_only',
      reasons: [],
      dataIssues: [{ code: 'place_only_route', retryable: false }],
      evaluatedWindows: [],
    },
    minimumGear: {
      essential: copy(baseData.gearRules.essential),
      recommended: copy(baseData.gearRules.recommended),
      optional: copy(baseData.gearRules.optional),
    },
    sourceMetadata: {
      routeSources: [],
      routeTypeSource: 'builtin',
      weatherSource: 'Open-Meteo',
      checkedAt,
    },
  }
}

async function testCreatedRecordAndTrustedSnapshot() {
  const memory = createMemoryCollection()
  const baseData = makeLegacyBaseData()
  const store = createTripContextStore({
    collection: memory.collection,
    now: () => new Date(FIXTURE_TIME_MS),
  })

  const first = await store.create({ openid: 'openid-owner', legacyBaseData: baseData })
  const second = await store.create({ openid: 'openid-owner', legacyBaseData: baseData })

  assert.equal(first.kind, 'created')
  assert.match(first.queryId, UUID_V4)
  assert.match(second.queryId, UUID_V4)
  assert.notEqual(first.queryId, second.queryId)
  assert.equal(first.expiresAt, '2026-08-06T08:30:00.000Z')
  assert.deepEqual(first.snapshot, expectedSnapshot(baseData, FIXTURE_TIME))
  assert.equal(Object.hasOwn(first.snapshot, 'queryId'), false)
  assert.equal(Object.hasOwn(first.snapshot, 'unexpectedClientFact'), false)
  assert.equal(Object.hasOwn(first.snapshot.routeSnapshot, 'fixedDays'), false)
  assert.equal(memory.calls.doc, 2)
  assert.equal(memory.calls.set, 2)
  assert.equal(memory.calls.delete, 0)

  const stored = memory.records.get(first.queryId)
  assert.deepEqual(stored, {
    schemaVersion: 'trip_context_v1',
    _openid: 'openid-owner',
    queryId: first.queryId,
    createdAt: FIXTURE_TIME,
    expiresAt: '2026-08-06T08:30:00.000Z',
    snapshot: expectedSnapshot(baseData, FIXTURE_TIME),
  })

  const unavailableWeather = await store.create({
    openid: 'openid-owner',
    legacyBaseData: makeLegacyBaseData({ weather: null, routeTypeSource: 'amap', elevation: 'unknown' }),
  })
  assert.deepEqual(unavailableWeather.snapshot.weatherSnapshot, {
    status: 'unavailable',
    scope: 'reference_point',
    reason: 'weather_unavailable',
    retryable: true,
  })
  assert.equal(unavailableWeather.snapshot.routeSnapshot.referenceElevationM, null)
  assert.equal(unavailableWeather.snapshot.routeSnapshot.sourceStatus, 'unverified')
  assert.equal(unavailableWeather.snapshot.sourceMetadata.weatherSource, null)
}

async function testReadOwnershipExpiryAndIsolation() {
  let currentTime = FIXTURE_TIME_MS
  const memory = createMemoryCollection()
  const baseData = makeLegacyBaseData()
  const store = createTripContextStore({
    collection: memory.collection,
    now: () => new Date(currentTime),
    createQueryId: () => 'tctx_11111111-1111-4111-8111-111111111111',
  })
  const created = await store.create({ openid: 'openid-owner', legacyBaseData: baseData })

  baseData.weather.days[0].tempMin = -99
  created.snapshot.weather.days[0].tempMax = 99
  currentTime = FIXTURE_TIME_MS + 1799999
  const firstRead = await store.read({ openid: 'openid-owner', queryId: created.queryId })
  assert.equal(firstRead.kind, 'found')
  assert.equal(firstRead.snapshot.weather.days[0].tempMin, 17)
  assert.equal(firstRead.snapshot.weather.days[0].tempMax, 23)

  firstRead.snapshot.weather.days[0].windMs = 999
  memory.getLastDatabaseResult().data[0].snapshot.weather.days[0].tempMax = 888
  assert.equal(firstRead.snapshot.weather.days[0].tempMax, 23)
  const secondRead = await store.read({ openid: 'openid-owner', queryId: created.queryId })
  assert.equal(secondRead.kind, 'found')
  assert.deepEqual(secondRead.snapshot, expectedSnapshot(makeLegacyBaseData(), FIXTURE_TIME))

  const unknown = await store.read({
    openid: 'openid-owner',
    queryId: 'tctx_22222222-2222-4222-8222-222222222222',
  })
  assert.deepEqual(unknown, { kind: 'unavailable', code: 'context_not_found' })

  const foreign = await store.read({ openid: 'openid-other', queryId: created.queryId })
  assert.deepEqual(foreign, { kind: 'unavailable', code: 'context_forbidden' })

  const queriesBeforeMalformed = memory.calls.where
  const malformed = await store.read({ openid: 'openid-owner', queryId: 'client-token' })
  assert.deepEqual(malformed, { kind: 'unavailable', code: 'context_not_found' })
  assert.equal(memory.calls.where, queriesBeforeMalformed)

  currentTime = FIXTURE_TIME_MS + 1800000
  const expired = await store.read({ openid: 'openid-owner', queryId: created.queryId })
  assert.deepEqual(expired, { kind: 'unavailable', code: 'context_expired' })
  assert.equal(memory.calls.delete, 0)
}

async function testMalformedStorageRecords() {
  const invalidCreatedAt = createMemoryCollection()
  const createdAtStore = createTripContextStore({
    collection: invalidCreatedAt.collection,
    createQueryId: () => 'tctx_44444444-4444-4444-8444-444444444444',
  })
  const createdAtContext = await createdAtStore.create({
    openid: 'openid-owner', legacyBaseData: makeLegacyBaseData(),
  })
  invalidCreatedAt.records.get(createdAtContext.queryId).createdAt = 'not-a-date'
  assert.deepEqual(
    await createdAtStore.read({ openid: 'openid-owner', queryId: createdAtContext.queryId }),
    { kind: 'store_unavailable' },
  )

  const invalidSnapshot = createMemoryCollection()
  const snapshotStore = createTripContextStore({
    collection: invalidSnapshot.collection,
    createQueryId: () => 'tctx_55555555-5555-4555-8555-555555555555',
  })
  const snapshotContext = await snapshotStore.create({
    openid: 'openid-owner', legacyBaseData: makeLegacyBaseData(),
  })
  invalidSnapshot.records.get(snapshotContext.queryId).snapshot.schemaVersion = 'not_beta_base_v1'
  assert.deepEqual(
    await snapshotStore.read({ openid: 'openid-owner', queryId: snapshotContext.queryId }),
    { kind: 'store_unavailable' },
  )
}

async function testAvailabilityAndTrustedGuard() {
  const failingWrite = createMemoryCollection({ failWrite: true })
  const writeStore = createTripContextStore({ collection: failingWrite.collection })
  const writeResult = await writeStore.create({ openid: 'openid-owner', legacyBaseData: makeLegacyBaseData() })
  assert.deepEqual(writeResult, { kind: 'store_unavailable' })
  assert.equal(JSON.stringify(writeResult).includes('secret'), false)

  const failingRead = createMemoryCollection({ failRead: true })
  const readStore = createTripContextStore({
    collection: failingRead.collection,
    createQueryId: () => 'tctx_33333333-3333-4333-8333-333333333333',
  })
  const created = await readStore.create({ openid: 'openid-owner', legacyBaseData: makeLegacyBaseData() })
  assert.equal(created.kind, 'created')
  const readResult = await readStore.read({ openid: 'openid-owner', queryId: created.queryId })
  assert.deepEqual(readResult, { kind: 'store_unavailable' })
  assert.equal(JSON.stringify(readResult).includes('secret'), false)

  const validStore = createTripContextStore({ collection: createMemoryCollection().collection })
  await assert.rejects(
    () => validStore.create({ openid: 'openid-owner', legacyBaseData: null }),
    new TypeError('trusted base context required'),
  )
}

async function main() {
  await testCreatedRecordAndTrustedSnapshot()
  await testReadOwnershipExpiryAndIsolation()
  await testMalformedStorageRecords()
  await testAvailabilityAndTrustedGuard()
  console.log('PASS: I17a TripContext storage contract')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
