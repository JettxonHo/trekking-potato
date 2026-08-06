/**
 * I17a server-owned, short-lived TripContext storage.
 *
 * This deep module deliberately owns the transitional legacy-to-trusted
 * projection. Public handler wiring belongs to I17b.
 */
const crypto = require('node:crypto')
const { evaluateTripVerdict } = require('./trip-verdict')

const TTL_MS = 30 * 60 * 1000
const QUERY_ID_PATTERN = /^tctx_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const LEGACY_FIELDS = [
  'route', 'date', 'level', 'days', 'elevation', 'location', 'coords',
  'routeType', 'routeTypeSource', 'weather', 'sunEvents', 'gearRules', 'meta',
]

function copy(value) {
  return JSON.parse(JSON.stringify(value))
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isQueryId(value) {
  return typeof value === 'string' && QUERY_ID_PATTERN.test(value)
}

function pickLegacyFields(legacyBaseData) {
  return LEGACY_FIELDS.reduce((result, field) => {
    if (Object.hasOwn(legacyBaseData, field)) result[field] = copy(legacyBaseData[field])
    return result
  }, {})
}

function referenceCoordinate(coords) {
  if (!isPlainObject(coords) || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) return null
  return { lat: coords.lat, lon: coords.lon, coordinateSystem: 'GCJ-02' }
}

function buildTrustedBaseData(legacyBaseData, checkedAt) {
  const legacy = /** @type {any} */ (pickLegacyFields(legacyBaseData))
  const weatherAvailable = legacy.weather !== null && legacy.weather !== undefined
  const gearRules = legacy.gearRules

  return {
    ...legacy,
    schemaVersion: 'beta_base_v1',
    requestSummary: {
      date: legacy.date,
      startTimeLocal: null,
      level: legacy.level,
      days: legacy.days,
    },
    routeSnapshot: {
      entityKind: 'place',
      capability: 'place_only',
      canonicalName: legacy.route,
      region: legacy.location,
      routeType: legacy.routeType,
      referenceCoordinate: referenceCoordinate(legacy.coords),
      referenceElevationM: Number.isFinite(legacy.elevation) ? legacy.elevation : null,
      sourceStatus: legacy.routeTypeSource === 'builtin' ? 'legacy_unverified' : 'unverified',
    },
    weatherSnapshot: weatherAvailable
      ? {
        status: 'available',
        scope: 'reference_point',
        source: 'Open-Meteo',
        data: copy(legacy.weather),
      }
      : {
        status: 'unavailable',
        scope: 'reference_point',
        reason: 'weather_unavailable',
        retryable: true,
      },
    deterministicResult: evaluateTripVerdict({ routeContext: { kind: 'place_only' } }),
    minimumGear: {
      essential: copy(gearRules.essential),
      recommended: copy(gearRules.recommended),
      optional: copy(gearRules.optional),
    },
    sourceMetadata: {
      routeSources: [],
      routeTypeSource: legacy.routeTypeSource,
      weatherSource: weatherAvailable ? 'Open-Meteo' : null,
      checkedAt,
    },
  }
}

function isStoredRecord(value, queryId) {
  return isPlainObject(value)
    && value.schemaVersion === 'trip_context_v1'
    && hasText(value._openid)
    && value.queryId === queryId
    && hasText(value.createdAt)
    && hasText(value.expiresAt)
    && isPlainObject(value.snapshot)
    && value.snapshot.schemaVersion === 'beta_base_v1'
    && !Number.isNaN(new Date(value.createdAt).getTime())
    && !Number.isNaN(new Date(value.expiresAt).getTime())
}

/**
 * @param {{ collection: any, now?: () => Date, createQueryId?: () => string }} dependencies
 */
function createTripContextStore({
  collection,
  now = () => new Date(),
  createQueryId = () => `tctx_${crypto.randomUUID()}`,
}) {
  async function create({ openid, legacyBaseData }) {
    if (!hasText(openid) || !isPlainObject(legacyBaseData)) {
      throw new TypeError('trusted base context required')
    }

    const createdAt = now().toISOString()
    const expiresAt = new Date(Date.parse(createdAt) + TTL_MS).toISOString()
    const queryId = createQueryId()
    const snapshot = buildTrustedBaseData(legacyBaseData, createdAt)
    const record = {
      schemaVersion: 'trip_context_v1',
      _openid: openid,
      queryId,
      createdAt,
      expiresAt,
      snapshot: copy(snapshot),
    }

    try {
      const writeResult = await collection.doc(queryId).set({ data: copy(record) })
      if (!writeResult || writeResult._id !== queryId) return { kind: 'store_unavailable' }
    } catch (_error) {
      return { kind: 'store_unavailable' }
    }

    return {
      kind: 'created',
      queryId,
      expiresAt,
      snapshot: copy(snapshot),
    }
  }

  async function read({ openid, queryId }) {
    if (!isQueryId(queryId)) {
      return { kind: 'unavailable', code: 'context_not_found' }
    }

    let queryResult
    try {
      queryResult = await collection.where({ _id: queryId }).limit(1).get()
    } catch (_error) {
      return { kind: 'store_unavailable' }
    }
    if (!queryResult || !Array.isArray(queryResult.data)) return { kind: 'store_unavailable' }
    if (queryResult.data.length === 0) return { kind: 'unavailable', code: 'context_not_found' }

    const record = queryResult.data[0]
    if (!isStoredRecord(record, queryId)) return { kind: 'store_unavailable' }
    if (record._openid !== openid) return { kind: 'unavailable', code: 'context_forbidden' }
    if (now().getTime() >= Date.parse(record.expiresAt)) {
      return { kind: 'unavailable', code: 'context_expired' }
    }

    return {
      kind: 'found',
      queryId,
      expiresAt: record.expiresAt,
      snapshot: copy(record.snapshot),
    }
  }

  return { create, read }
}

module.exports = { createTripContextStore }
