const crypto = require('crypto')
const { clone } = require('./response-contract')
const { addDays, EVIDENCE_DAYS } = require('./submission-lifecycle')
const { projectReviewedGeometry } = require('./domain/evidence-projection')

class EvidenceRepositoryError extends Error {
  constructor(message = 'evidence repository unavailable') {
    super(message)
    this.code = 'store_unavailable'
  }
}

class DuplicateEvidenceError extends Error {
  constructor() {
    super('duplicate evidence')
    this.code = 'duplicate'
  }
}

function defaultId() { return crypto.randomUUID() }

function reviewedOn(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) throw new TypeError('reviewedAt must be a valid Date')
  return date.toISOString().slice(0, 10)
}

function createApprovedEvidence(record, reviewedAt) {
  if (!record || !record.summary || !record.input) throw new TypeError('reviewable submission is required')
  return {
    evidenceVersion: 'reviewed-track-evidence-v1',
    sourceKind: 'community_track_candidate',
    reviewStage: 'admin_approved',
    title: record.input.title,
    region: record.input.region,
    format: record.format,
    geometry: projectReviewedGeometry(record.summary),
    reviewedOn: reviewedOn(reviewedAt),
    limitations: ['geometry_only', 'not_operational_status', 'not_route_publication'],
  }
}

function createEvidenceRecord({ record, reviewedAt, idFactory = defaultId } = {}) {
  const approvedEvidence = createApprovedEvidence(record, reviewedAt)
  const approvedAt = reviewedAt instanceof Date ? new Date(reviewedAt.getTime()) : new Date(reviewedAt)
  if (!Number.isFinite(approvedAt.getTime())) throw new TypeError('approvedAt must be a valid Date')
  const key = String(idFactory()).trim()
  if (!key || key.length > 128) throw new TypeError('evidence key is invalid')
  return {
    _id: key,
    approvedEvidence,
    approvedAt,
    expiresAt: addDays(approvedAt, EVIDENCE_DAYS),
  }
}

function cursorMatches(record, cursor) {
  if (!cursor) return true
  const expiry = new Date(record.expiresAt).getTime()
  const cursorExpiry = new Date(cursor.expiresAt).getTime()
  return expiry > cursorExpiry || (expiry === cursorExpiry && String(record._id) > cursor.evidenceKey)
}

function sortDue(records) {
  return [...records].sort((first, second) => {
    const firstTime = new Date(first.expiresAt).getTime()
    const secondTime = new Date(second.expiresAt).getTime()
    if (firstTime !== secondTime) return firstTime - secondTime
    return String(first._id).localeCompare(String(second._id))
  })
}

function createMemoryEvidenceRepository({ records = [] } = {}) {
  const table = new Map()
  records.forEach((record) => table.set(record._id, clone(record)))
  return {
    kind: 'memory-evidence',
    async get(id) { return table.has(id) ? clone(table.get(id)) : null },
    async add(record) {
      if (table.has(record._id)) throw new DuplicateEvidenceError()
      table.set(record._id, clone(record))
      return { _id: record._id }
    },
    async remove(id) {
      table.delete(id)
      return true
    },
    async delete(id) {
      table.delete(id)
      return true
    },
    async listDue(now, { cursor = null, limit = 20 } = {}) {
      const rows = sortDue([...table.values()].filter((record) => new Date(record.expiresAt).getTime() <= now.getTime()
        && cursorMatches(record, cursor)))
      return rows.slice(0, limit + 1).map(clone)
    },
    async snapshot() { return [...table.values()].map(clone) },
  }
}

function createCloudBaseEvidenceRepository({ db, collectionName = 'track_review_evidence', command } = {}) {
  if (!db || typeof db.collection !== 'function') throw new TypeError('db collection is required')
  const collection = db.collection(collectionName)
  const commands = command || db.command || {}
  return {
    kind: 'cloudbase-evidence',
    async get(id) {
      try {
        const result = await collection.doc(id).get()
        return result && result.data ? result.data : null
      } catch (_error) { return null }
    },
    async add(record) {
      try { return await collection.add({ data: record }) } catch (error) {
        if (error && (error.code === 'DUPLICATE_KEY' || error.code === 'duplicate')) throw new DuplicateEvidenceError()
        throw new EvidenceRepositoryError()
      }
    },
    async remove(id) {
      try {
        const result = await collection.doc(id).remove()
        return !result || !result.stats || result.stats.removed === undefined || result.stats.removed === 1
      } catch (_error) { throw new EvidenceRepositoryError() }
    },
    async delete(id) { return this.remove(id) },
    async listDue(now, { cursor = null, limit = 20 } = {}) {
      if (typeof commands.lte !== 'function' || typeof commands.or !== 'function') throw new EvidenceRepositoryError('evidence cursor unavailable')
      const base = { expiresAt: commands.lte(now) }
      let where = base
      if (cursor) {
        if (typeof commands.and !== 'function' || typeof commands.gt !== 'function') {
          throw new EvidenceRepositoryError('evidence cursor unavailable')
        }
        where = commands.and(base, commands.or(
          { expiresAt: commands.gt(new Date(cursor.expiresAt)) },
          { expiresAt: new Date(cursor.expiresAt), _id: commands.gt(cursor.evidenceKey) },
        ))
      }
      const result = await collection.where(where).orderBy('expiresAt', 'asc').orderBy('_id', 'asc').limit(limit + 1).get()
      return (result && result.data) || []
    },
  }
}

function approvedEvidenceDisplay(evidence) {
  if (!evidence) return null
  const value = evidence.approvedEvidence || evidence
  return clone(value)
}

module.exports = {
  EvidenceRepositoryError,
  DuplicateEvidenceError,
  createApprovedEvidence,
  createEvidenceRecord,
  createMemoryEvidenceRepository,
  createCloudBaseEvidenceRepository,
  approvedEvidenceDisplay,
}
