/**
 * I17a server-owned, short-lived TripContext storage.
 *
 * This deep module stores the trusted BaseData assembled by the I21 handler.
 * It deliberately does not infer facts from client or legacy projections.
 */
const crypto = require('node:crypto')
const { assertBaseV2 } = require('./advice-context')
const TTL_MS = 30 * 60 * 1000
const QUERY_ID_PATTERN = /^tctx_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
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

function isStoredRecord(value, queryId) {
  return isPlainObject(value)
    && value.schemaVersion === 'trip_context_v2'
    && hasText(value._openid)
    && value.queryId === queryId
    && hasText(value.createdAt)
    && hasText(value.expiresAt)
    && isPlainObject(value.snapshot)
    && value.snapshot.schemaVersion === 'beta_base_v2'
    && (() => { try { assertBaseV2(value.snapshot); return true } catch (_error) { return false } })()
    && !Number.isNaN(new Date(value.createdAt).getTime())
    && !Number.isNaN(new Date(value.expiresAt).getTime())
}

function isLegacyStoredRecord(value, queryId) {
  return isPlainObject(value)
    && (value.schemaVersion === 'trip_context_v1'
      || (isPlainObject(value.snapshot) && value.snapshot.schemaVersion === 'beta_base_v1'))
    && (!value.queryId || value.queryId === queryId)
}

/**
 * @param {{ collection: any, now?: () => Date, createQueryId?: () => string }} dependencies
 */
function createTripContextStore({
  collection,
  now = () => new Date(),
  createQueryId = () => `tctx_${crypto.randomUUID()}`,
}) {
  async function create({ openid, trustedBaseData }) {
    if (!hasText(openid) || !isPlainObject(trustedBaseData)) {
      throw new TypeError('trusted base context required')
    }
    try { assertBaseV2(trustedBaseData) } catch (_error) { throw new TypeError('trusted base context required') }

    const createdAt = now().toISOString()
    const expiresAt = new Date(Date.parse(createdAt) + TTL_MS).toISOString()
    const queryId = createQueryId()
    const snapshot = copy(trustedBaseData)
    const record = {
      schemaVersion: 'trip_context_v2',
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
    if (!isStoredRecord(record, queryId)) {
      if (isLegacyStoredRecord(record, queryId)) return { kind: 'unavailable', code: 'context_legacy' }
      return { kind: 'store_unavailable' }
    }
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
