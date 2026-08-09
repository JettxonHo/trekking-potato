const crypto = require('crypto')
const {
  VALID_STATUSES,
  clone,
  errorResponse,
  toAdminList,
  toAdminDetail,
  encodeAdminCursor,
  decodeAdminCursor,
} = require('./response-contract')
const {
  EVIDENCE_DAYS,
  addDays,
  validOpaqueId,
} = require('./submission-lifecycle')
const {
  createEvidenceRecord,
  createApprovedEvidence,
  approvedEvidenceDisplay,
  DuplicateEvidenceError,
} = require('./reviewed-evidence')

const ADMIN_ENV = 'TRACK_REVIEW_ADMIN_OPENIDS'
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 20
const MAX_RAW_AGE_SECONDS = 300
const REVIEW_DECISIONS = new Set(['changes_requested', 'rejected', 'approved_evidence'])

function defaultClock() { return new Date() }
function defaultId() { return crypto.randomUUID() }

function nowFrom(clock) {
  const value = typeof clock === 'function' ? clock() : new Date()
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) throw new TypeError('clock must return a valid Date')
  return new Date(date.getTime())
}

function parseAdminAllowlist(value) {
  if (typeof value !== 'string' || value.length === 0) return null
  const entries = value.split(',')
  if (entries.length < 1 || entries.length > 20) return null
  const result = []
  const seen = new Set()
  for (const raw of entries) {
    const entry = raw.trim()
    if (entry.length < 6 || entry.length > 128 || /[\s\u0000-\u001f\u007f,]/u.test(entry) || seen.has(entry)) return null
    seen.add(entry)
    result.push(entry)
  }
  return result.length ? result : null
}

function authorizeAdmin(openid, env = process.env) {
  if (typeof openid !== 'string' || openid.trim() === '') return { ok: false, response: errorResponse('unauthenticated') }
  const allowlist = parseAdminAllowlist(env && env[ADMIN_ENV])
  if (!allowlist) return { ok: false, response: errorResponse('admin_not_configured') }
  if (!allowlist.includes(openid)) return { ok: false, response: errorResponse('forbidden') }
  return { ok: true }
}

function parseLimit(event) {
  if (!event || event.limit === undefined) return DEFAULT_LIMIT
  return Number.isInteger(event.limit) && event.limit >= 1 && event.limit <= MAX_LIMIT ? event.limit : null
}

function parseStatus(event) {
  if (!event || event.status === undefined) return null
  return typeof event.status === 'string' && VALID_STATUSES.has(event.status) ? event.status : undefined
}

function parseId(event, field) {
  if (!event || typeof event[field] !== 'string' || !validOpaqueId(event[field])) return null
  return event[field].trim()
}

function parseExpectedVersion(event) {
  return event && Number.isInteger(event.expectedVersion) && event.expectedVersion >= 1 ? event.expectedVersion : null
}

function parseReviewAttemptId(event) {
  const value = parseId(event, 'reviewAttemptId')
  return value && value.length <= 80 ? value : null
}

function parseReview(event) {
  const expectedVersion = parseExpectedVersion(event)
  const reviewAttemptId = parseReviewAttemptId(event)
  if (expectedVersion === null || !reviewAttemptId || !REVIEW_DECISIONS.has(event && event.decision)) return null
  let note = null
  if (event.note !== undefined && event.note !== null && event.note !== '') {
    if (typeof event.note !== 'string') return null
    note = event.note.trim()
    if (Array.from(note).length > 500) return null
  }
  if (event.decision === 'changes_requested' && (!note || Array.from(note).length < 1)) return null
  return { expectedVersion, reviewAttemptId, decision: event.decision, note }
}

function mapRepositoryError(_error) { return 'store_unavailable' }

function isLogicallyExpired(record, now) {
  const recordExpiry = record && record.recordExpiresAt ? new Date(record.recordExpiresAt).getTime() : NaN
  const rawExpiry = record && record.rawExpiresAt ? new Date(record.rawExpiresAt).getTime() : null
  return !Number.isFinite(recordExpiry) || recordExpiry <= now.getTime()
    || (rawExpiry !== null && (!Number.isFinite(rawExpiry) || rawExpiry <= now.getTime()))
}

function rawPresent(record, now) {
  const state = record && record.rawFileState ? record.rawFileState : {}
  const expiry = record && record.rawExpiresAt ? new Date(record.rawExpiresAt) : null
  const snapshot = record && record.reviewSnapshotAt ? new Date(record.reviewSnapshotAt) : null
  return Boolean(record && record.reviewFileId && state.review === 'present' && snapshot
    && Number.isFinite(snapshot.getTime()) && expiry
    && Number.isFinite(expiry.getTime()) && expiry.getTime() > now.getTime())
}

function cleanupPlan(record, targets = ['upload', 'review']) {
  const state = clone(record.rawFileState || { upload: 'reserved', review: 'absent' })
  const planned = []
  for (const target of targets) {
    if (['reserved', 'present', 'deletion_pending'].includes(state[target])) {
      if (state[target] !== 'deletion_pending') state[target] = 'deletion_pending'
      if (!planned.includes(target)) planned.push(target)
    }
  }
  return { state, targets: planned }
}

function pendingTargets(record) {
  const state = record && record.rawFileState ? record.rawFileState : {}
  return ['upload', 'review'].filter((target) => state[target] === 'deletion_pending')
}

async function deriveUploadFileId(storage, record) {
  if (record.creatorFileId) return record.creatorFileId
  if (!storage || typeof storage.getAllowedHost !== 'function') throw new Error('storage host unavailable')
  const host = await storage.getAllowedHost()
  if (typeof host !== 'string' || !host) throw new Error('storage host unavailable')
  return `cloud://${host}/${record.cloudPath}`
}

async function deleteTarget(storage, fileID) {
  if (!fileID) return true
  if (!storage || typeof storage.deleteObject !== 'function') return false
  try {
    const result = await storage.deleteObject(fileID)
    if (result === undefined || result === true) return true
    if (result && typeof result === 'object' && Array.isArray(result.fileList)) {
      const item = result.fileList.length === 1 ? result.fileList[0] : null
      return Boolean(item && item.fileID === fileID && Number.isInteger(item.status)
        && typeof item.errMsg === 'string' && item.errMsg.trim().length > 0
        && (item.status === 0 || (item.status === -503003
          && typeof item.errMsg === 'string' && item.errMsg.toLowerCase().includes('storage file not exists'))))
    }
    return false
  } catch (error) {
    return Boolean(error && (error.code === 'file_missing' || error.code === 'not_found'
      || (error.code === -503003 && typeof error.errMsg === 'string'
        && error.errMsg.toLowerCase().includes('storage file not exists'))))
  }
}

function mapRawError(_error) { return errorResponse('raw_unavailable') }

function createAdminService({
  repository,
  storage,
  evidenceRepository,
  env = process.env,
  clock = defaultClock,
  idFactory = defaultId,
} = {}) {
  if (!repository || typeof repository.get !== 'function') throw new TypeError('repository seam is required')
  if (!storage) throw new TypeError('storage seam is required')
  if (!evidenceRepository || typeof evidenceRepository.add !== 'function') throw new TypeError('evidence repository seam is required')

  async function getRecord(submissionId, now) {
    let record
    try { record = await repository.get(submissionId) } catch (error) { return { error: errorResponse(mapRepositoryError(error)) } }
    if (!record || isLogicallyExpired(record, now)) return { error: errorResponse('submission_not_found') }
    return { record }
  }

  async function detail(record, now, includeRawLink = false) {
    let rawAccess = null
    if (includeRawLink) {
      if (!['pending_review', 'changes_requested', 'approved_evidence'].includes(record.status) || !rawPresent(record, now)) {
        return { error: mapRawError() }
      }
      const hardDeadline = new Date(record.rawExpiresAt).getTime()
      const remainingSeconds = Math.floor((hardDeadline - now.getTime()) / 1000)
      if (!Number.isInteger(remainingSeconds) || remainingSeconds < 1) return { error: mapRawError() }
      const maxAge = Math.min(MAX_RAW_AGE_SECONDS, remainingSeconds)
      try {
        const url = await storage.getTemporaryUrl(record.reviewFileId, maxAge)
        if (typeof url !== 'string' || !url) return { error: mapRawError() }
        const urlDeadline = Math.min(now.getTime() + maxAge * 1000, hardDeadline)
        rawAccess = { url, expiresAt: new Date(urlDeadline).toISOString() }
      } catch (error) { return { error: mapRawError(error) } }
    }
    let evidence = null
    if (record.status === 'approved_evidence' && record.evidenceExpiresAt
      && new Date(record.evidenceExpiresAt).getTime() > now.getTime() && record.review && record.review.reviewedAt) {
      try { evidence = approvedEvidenceDisplay(createApprovedEvidence(record, record.review.reviewedAt)) } catch (_error) { evidence = null }
    }
    return { value: toAdminDetail(record, { rawAccess, approvedEvidence: evidence, now }) }
  }

  async function list(event, openid) {
    const auth = authorizeAdmin(openid, env)
    if (!auth.ok) return auth.response
    const limit = parseLimit(event)
    const status = parseStatus(event)
    if (limit === null || status === undefined) return errorResponse('invalid_input')
    const cursor = event && event.cursor !== undefined ? decodeAdminCursor(event.cursor, status) : null
    if (event && event.cursor !== undefined && !cursor) return errorResponse('invalid_cursor')
    const now = nowFrom(clock)
    let rows
    try { rows = await repository.listAdmin(now, { status, cursor, limit }) } catch (error) { return errorResponse(mapRepositoryError(error)) }
    const safe = (Array.isArray(rows) ? rows : []).filter((record) => !isLogicallyExpired(record, now)
      && (status === null || record.status === status))
    const page = safe.slice(0, limit)
    const nextCursor = safe.length > limit && page.length ? encodeAdminCursor({
      updatedAt: new Date(page[page.length - 1].updatedAt).toISOString(),
      submissionId: page[page.length - 1]._id,
      status,
    }) : null
    return toAdminList(page, nextCursor, now)
  }

  async function get(event, openid) {
    const auth = authorizeAdmin(openid, env)
    if (!auth.ok) return auth.response
    const submissionId = parseId(event, 'submissionId')
    if (!submissionId || (event && event.includeRawLink !== undefined && typeof event.includeRawLink !== 'boolean')) return errorResponse('invalid_input')
    const now = nowFrom(clock)
    const result = await getRecord(submissionId, now)
    if (result.error) return result.error
    const projected = await detail(result.record, now, event.includeRawLink === true)
    return projected.error || projected.value
  }

  async function cleanup(record, openid, plannedTargets, now) {
    const state = clone(record.rawFileState || {})
    const fileIds = {}
    for (const target of plannedTargets) {
      try {
        fileIds[target] = target === 'upload' ? await deriveUploadFileId(storage, record) : record.reviewFileId
      } catch (_error) { fileIds[target] = null }
    }
    let nextState = clone(state)
    for (const target of plannedTargets) {
      const success = await deleteTarget(storage, fileIds[target])
      if (success) nextState[target] = 'deleted'
      else nextState[target] = 'deletion_pending'
    }
    if (JSON.stringify(nextState) === JSON.stringify(state)) return { value: record }
    let updated
    try {
      updated = await repository.update(record._id, { _openid: record._openid, status: record.status, version: record.version }, {
        rawFileState: nextState,
        version: record.version + 1,
        updatedAt: now,
      })
    } catch (_error) { return { error: errorResponse('store_unavailable') } }
    if (!updated) return { error: errorResponse('store_unavailable') }
    return { value: updated }
  }

  async function review(event, openid) {
    const auth = authorizeAdmin(openid, env)
    if (!auth.ok) return auth.response
    const submissionId = parseId(event, 'submissionId')
    const input = parseReview(event)
    if (!submissionId || !input) return errorResponse('invalid_input')
    const now = nowFrom(clock)
    const found = await getRecord(submissionId, now)
    if (found.error) return found.error
    const record = found.record
    if (record.review && record.review.attemptId === input.reviewAttemptId && record.status !== 'pending_review') {
      if (record.status === 'rejected' && pendingTargets(record).length) {
        const replay = await cleanup(record, openid, pendingTargets(record), now)
        if (replay.error) return replay.error
        return (await detail(replay.value, now)).value
      }
      const replay = await detail(record, now)
      return replay.error || replay.value
    }
    if (record.status !== 'pending_review') return errorResponse('invalid_state')
    if (record.version !== input.expectedVersion) return errorResponse('version_conflict')
    if (!rawPresent(record, now)) return errorResponse('raw_unavailable')

    const reviewedAt = new Date(now.getTime())
    const plan = input.decision === 'rejected' ? cleanupPlan(record, ['upload', 'review']) : null
    const patch = {
      status: input.decision,
      version: input.expectedVersion + 1,
      review: {
        attemptId: input.reviewAttemptId,
        decision: input.decision,
        note: input.note,
        reviewerOpenid: openid,
        reviewedAt: reviewedAt.toISOString(),
        resultVersion: input.expectedVersion + 1,
      },
      rawFileState: plan ? plan.state : clone(record.rawFileState),
      evidenceExpiresAt: input.decision === 'approved_evidence' ? addDays(reviewedAt, EVIDENCE_DAYS) : null,
      updatedAt: reviewedAt,
    }

    const transactionalApproval = input.decision === 'approved_evidence' && typeof repository.approveReview === 'function'
    if (input.decision === 'approved_evidence' && !transactionalApproval) return errorResponse('store_unavailable')
    let evidenceRecord = null
    if (input.decision === 'approved_evidence') {
      try {
        evidenceRecord = createEvidenceRecord({ record, reviewedAt, idFactory })
      } catch (error) {
        if (error instanceof DuplicateEvidenceError) return errorResponse('store_unavailable')
        return errorResponse('store_unavailable')
      }
    }
    let updated
    const conditions = {
      _id: submissionId,
      status: 'pending_review',
      version: input.expectedVersion,
      'rawFileState.review': 'present',
      'review.attemptId': null,
    }
    try {
      updated = transactionalApproval
        ? await repository.approveReview(submissionId, conditions, patch, evidenceRecord, evidenceRepository)
        : await repository.update(submissionId, conditions, patch)
    } catch (_error) { updated = null }
    if (!updated) {
      let latest = null
      try { latest = await repository.get(submissionId) } catch (_error) {}
      if (latest && latest.review && latest.review.attemptId === input.reviewAttemptId && !isLogicallyExpired(latest, now)) {
        const replay = await detail(latest, now)
        return replay.error || replay.value
      }
      if (latest && latest.status !== 'pending_review') return errorResponse('invalid_state')
      return errorResponse('version_conflict')
    }

    if (input.decision === 'rejected' && plan && plan.targets.length) {
      const cleaned = await cleanup(updated, openid, plan.targets, now)
      if (cleaned.error) return cleaned.error
      updated = cleaned.value
    }
    const projected = await detail(updated, now)
    return projected.error || projected.value
  }

  async function handle(event, openid) {
    if (!event || typeof event !== 'object' || Array.isArray(event)) return errorResponse('invalid_mode')
    if (event.mode === 'admin_list') return list(event, openid)
    if (event.mode === 'admin_get') return get(event, openid)
    if (event.mode === 'admin_review') return review(event, openid)
    return errorResponse('invalid_mode')
  }

  return {
    handle,
    list,
    get,
    review,
    parseAdminAllowlist,
    authorizeAdmin,
    cleanup,
  }
}

module.exports = {
  ADMIN_ENV,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MAX_RAW_AGE_SECONDS,
  REVIEW_DECISIONS,
  parseAdminAllowlist,
  authorizeAdmin,
  createAdminService,
}
