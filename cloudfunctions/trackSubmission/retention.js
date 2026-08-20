const {
  clone,
  errorResponse,
} = require('./response-contract')
const {
  RETENTION_BATCH_SIZE,
  isDue,
} = require('./submission-lifecycle')

const TIMER_SOURCE = 'timer'
const RETENTION_MODE_DELETE = 'delete'
const RETENTION_MODE_DRY_RUN = 'dry_run'

function nowFrom(clock) {
  const value = typeof clock === 'function' ? clock() : new Date()
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) throw new TypeError('clock must return a valid Date')
  return new Date(date.getTime())
}

function timerAuthorized(env = process.env, openid = null) {
  return Boolean(env && env.TRIGGER_SRC === TIMER_SOURCE && openid === '')
}

function retentionMode(env = process.env) {
  return env && env.TRACK_RETENTION_MODE === RETENTION_MODE_DELETE
    ? RETENTION_MODE_DELETE
    : RETENTION_MODE_DRY_RUN
}

function encodeCursor(cursor) {
  return Buffer.from(JSON.stringify({
    recordExpiresAt: cursor.recordExpiresAt,
    submissionId: cursor.submissionId,
  }), 'utf8').toString('base64url')
}

function decodeCursor(value) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || value.length < 1 || value.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(value)) return undefined
  let payload
  try { payload = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) } catch (_error) { return undefined }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)
    || Object.keys(payload).sort().join(',') !== 'recordExpiresAt,submissionId'
    || typeof payload.submissionId !== 'string' || payload.submissionId.length < 1 || payload.submissionId.length > 80
    || typeof payload.recordExpiresAt !== 'string' || !Number.isFinite(Date.parse(payload.recordExpiresAt))) return undefined
  try {
    if (new Date(payload.recordExpiresAt).toISOString() !== payload.recordExpiresAt) return undefined
  } catch (_error) { return undefined }
  return payload
}

function evidenceCursorEncode(cursor) {
  return Buffer.from(JSON.stringify({ expiresAt: cursor.expiresAt, evidenceKey: cursor.evidenceKey }), 'utf8').toString('base64url')
}

function evidenceCursorDecode(value) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || value.length < 1 || value.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(value)) return undefined
  let payload
  try { payload = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) } catch (_error) { return undefined }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)
    || Object.keys(payload).sort().join(',') !== 'evidenceKey,expiresAt'
    || typeof payload.evidenceKey !== 'string' || payload.evidenceKey.length < 1
    || typeof payload.expiresAt !== 'string' || !Number.isFinite(Date.parse(payload.expiresAt))) return undefined
  return payload
}

function pendingTargets(record, dueRaw, now) {
  const state = record.rawFileState || {}
  const names = []
  const recordDue = isDue(record.recordExpiresAt, now)
  if (state.upload === 'deletion_pending' || (dueRaw || recordDue) && ['reserved', 'present'].includes(state.upload)) names.push('upload')
  if (state.review === 'deletion_pending' || (dueRaw || recordDue) && state.review === 'present') names.push('review')
  return names
}

async function deriveFileId(storage, record, target) {
  if (target === 'review') return record.reviewFileId || null
  if (record.creatorFileId) return record.creatorFileId
  if (!storage || typeof storage.getAllowedHost !== 'function') return null
  const host = await storage.getAllowedHost()
  return typeof host === 'string' && host ? `cloud://${host}/${record.cloudPath}` : null
}

async function deleteObject(storage, fileID) {
  if (!fileID) return false
  if (!storage || typeof storage.deleteObject !== 'function') return false
  try {
    const result = await storage.deleteObject(fileID)
    if (result === undefined || result === true) return true
    if (result && Array.isArray(result.fileList) && result.fileList.length === 1) {
      const item = result.fileList[0]
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

function stateClean(record) {
  const state = record.rawFileState || {}
  return ['deleted', 'absent'].includes(state.upload) && ['deleted', 'absent'].includes(state.review)
}

function createRetentionService({
  repository,
  evidenceRepository,
  storage,
  clock = () => new Date(),
  env = process.env,
} = {}) {
  if (!repository || typeof repository.listRetentionDue !== 'function') throw new TypeError('retention repository seam is required')
  if (!evidenceRepository || typeof evidenceRepository.listDue !== 'function') throw new TypeError('evidence repository seam is required')
  if (!storage) throw new TypeError('retention storage seam is required')

  async function markPending(record, targets, now) {
    const currentState = clone(record.rawFileState || { upload: 'reserved', review: 'absent' })
    const nextState = clone(currentState)
    const planned = []
    for (const target of targets) {
      if (['reserved', 'present', 'deletion_pending'].includes(nextState[target])) {
        if (nextState[target] !== 'deletion_pending') nextState[target] = 'deletion_pending'
        planned.push(target)
      }
    }
    if (JSON.stringify(nextState) === JSON.stringify(currentState)) return { value: record, targets: planned }
    let updated
    try {
      updated = await repository.update(record._id, { _id: record._id, status: record.status, version: record.version }, {
        rawFileState: nextState,
        version: record.version + 1,
        updatedAt: now,
      })
    } catch (_error) { return { error: errorResponse('store_unavailable') } }
    if (!updated) return { conflict: true }
    return { value: updated, targets: planned }
  }

  async function cleanPending(record, targets, now) {
    const state = clone(record.rawFileState || {})
    const nextState = clone(state)
    for (const target of targets) {
      let fileID
      try { fileID = await deriveFileId(storage, record, target) } catch (_error) { fileID = null }
      if (await deleteObject(storage, fileID)) nextState[target] = 'deleted'
      else nextState[target] = 'deletion_pending'
    }
    if (JSON.stringify(nextState) === JSON.stringify(state)) return { value: record }
    let updated
    try {
      updated = await repository.update(record._id, { _id: record._id, status: record.status, version: record.version }, {
        rawFileState: nextState,
        version: record.version + 1,
        updatedAt: now,
      })
    } catch (_error) { return { error: errorResponse('store_unavailable') } }
    if (!updated) return { conflict: true }
    return { value: updated }
  }

  async function processSubmission(record, now) {
    const rawDue = isDue(record.rawExpiresAt, now)
    const recordDue = isDue(record.recordExpiresAt, now)
    const targets = pendingTargets(record, rawDue, now)
    if (!rawDue && !recordDue && !targets.length) return { action: 'not_due' }
    let current = record
    if (targets.length) {
      const planned = await markPending(current, targets, now)
      if (planned.error || planned.conflict) return planned
      current = planned.value
      const cleaned = await cleanPending(current, targets, now)
      if (cleaned.error || cleaned.conflict) return cleaned
      current = cleaned.value
    }
    if (recordDue && stateClean(current)) {
      let removed
      try {
        removed = await repository.remove(current._id, { _id: current._id, status: current.status, version: current.version })
      } catch (_error) { return { error: errorResponse('store_unavailable') } }
      if (removed) return { value: null, action: 'submission_deleted' }
    }
    return { value: current, action: targets.length ? 'raw_cleaned' : 'already_clean' }
  }

  async function processEvidence(now, cursor, limit = RETENTION_BATCH_SIZE) {
    if (limit < 1) return { processed: 0, nextCursor: null }
    let rows
    try { rows = await evidenceRepository.listDue(now, { cursor, limit }) } catch (_error) { return { error: errorResponse('store_unavailable') } }
    const safe = Array.isArray(rows) ? rows : []
    const page = safe.slice(0, limit)
    let processed = 0
    for (const record of page) {
      try {
        const removed = await evidenceRepository.remove(record._id)
        if (removed !== false) processed += 1
      } catch (_error) { return { error: errorResponse('store_unavailable') } }
    }
    const next = safe.length > limit && page.length ? evidenceCursorEncode({
      expiresAt: new Date(page[page.length - 1].expiresAt).toISOString(),
      evidenceKey: page[page.length - 1]._id,
    }) : null
    return { processed, nextCursor: next }
  }

  async function runDelete(event = {}) {
    const cursor = decodeCursor(event && event.cursor)
    if (cursor === undefined) return errorResponse('invalid_cursor')
    const evidenceCursor = evidenceCursorDecode(event && event.evidenceCursor)
    if (evidenceCursor === undefined) return errorResponse('invalid_cursor')
    const now = nowFrom(clock)
    let rows
    try { rows = await repository.listRetentionDue(now, { cursor, limit: RETENTION_BATCH_SIZE }) } catch (_error) { return errorResponse('store_unavailable') }
    const safe = Array.isArray(rows) ? rows : []
    const page = safe.slice(0, RETENTION_BATCH_SIZE)
    let processed = 0
    let deleted = 0
    let pending = 0
    for (const record of page) {
      const result = await processSubmission(record, now)
      if (result.error) return result.error
      if (result.conflict) continue
      processed += 1
      if (result.action === 'submission_deleted') deleted += 1
      const latest = result.value
      if (latest && latest.rawFileState && (latest.rawFileState.upload === 'deletion_pending' || latest.rawFileState.review === 'deletion_pending')) pending += 1
    }
    const nextCursor = safe.length > RETENTION_BATCH_SIZE && page.length ? encodeCursor({
      recordExpiresAt: new Date(page[page.length - 1].recordExpiresAt).toISOString(),
      submissionId: page[page.length - 1]._id,
    }) : null
    const evidence = processed >= RETENTION_BATCH_SIZE
      ? { processed: 0, nextCursor: event && event.evidenceCursor ? event.evidenceCursor : null }
      : await processEvidence(now, evidenceCursor, RETENTION_BATCH_SIZE - processed)
    if (evidence.error) return evidence.error
    return {
      ok: true,
      processed,
      deleted,
      pending,
      nextCursor,
      evidenceProcessed: evidence.processed,
      evidenceNextCursor: evidence.nextCursor,
      now: now.toISOString(),
    }
  }

  async function runDryRun(event = {}) {
    const cursor = decodeCursor(event && event.cursor)
    if (cursor === undefined) return errorResponse('invalid_cursor')
    const evidenceCursor = evidenceCursorDecode(event && event.evidenceCursor)
    if (evidenceCursor === undefined) return errorResponse('invalid_cursor')
    const evidenceCursorValue = evidenceCursor === null ? null : event.evidenceCursor
    const now = nowFrom(clock)
    let submissionRows
    try {
      submissionRows = await repository.listRetentionDue(now, { cursor, limit: RETENTION_BATCH_SIZE })
    } catch (_error) {
      return errorResponse('store_unavailable')
    }
    const safeSubmissions = Array.isArray(submissionRows) ? submissionRows : []
    const submissionPage = safeSubmissions.slice(0, RETENTION_BATCH_SIZE)
    const remaining = RETENTION_BATCH_SIZE - submissionPage.length
    const submissionHasMore = safeSubmissions.length > RETENTION_BATCH_SIZE
    const submissionCursor = submissionPage.length
      ? encodeCursor({
        recordExpiresAt: new Date(submissionPage[submissionPage.length - 1].recordExpiresAt).toISOString(),
        submissionId: submissionPage[submissionPage.length - 1]._id,
      })
      : null
    let nextCursor = submissionCursor
    let evidencePage = []
    let evidenceNextCursor = evidenceCursorValue
    let evidenceHasMore = false
    if (remaining > 0) {
      let evidenceRows
      try {
        evidenceRows = await evidenceRepository.listDue(now, { cursor: evidenceCursor, limit: remaining })
      } catch (_error) {
        return errorResponse('store_unavailable')
      }
      const safeEvidence = Array.isArray(evidenceRows) ? evidenceRows : []
      evidencePage = safeEvidence.slice(0, remaining)
      evidenceHasMore = safeEvidence.length > remaining
      evidenceNextCursor = evidenceHasMore && evidencePage.length
        ? evidenceCursorEncode({
          expiresAt: new Date(evidencePage[evidencePage.length - 1].expiresAt).toISOString(),
          evidenceKey: evidencePage[evidencePage.length - 1]._id,
        })
        : null
    } else if (!submissionHasMore && submissionPage.length === RETENTION_BATCH_SIZE) {
      // The repository contract uses limit+1 lookahead. When submissions fill
      // the preview budget exactly, spend one read-only evidence lookahead so a
      // due evidence row remains reachable through the submission cursor.
      let evidenceRows
      try {
        evidenceRows = await evidenceRepository.listDue(now, { cursor: evidenceCursor, limit: 0 })
      } catch (_error) {
        return errorResponse('store_unavailable')
      }
      evidenceHasMore = Array.isArray(evidenceRows) && evidenceRows.length > 0
      evidenceNextCursor = evidenceHasMore ? evidenceCursorValue : null
    }
    if (!submissionHasMore && !evidenceHasMore && !evidenceNextCursor) nextCursor = null
    const submissions = submissionPage.length
    const evidence = evidencePage.length
    return {
      ok: true,
      mode: RETENTION_MODE_DRY_RUN,
      count: { submissions, evidence, total: submissions + evidence },
      hasMore: Boolean(submissionHasMore || evidenceHasMore || evidenceNextCursor),
      nextCursor,
      evidenceNextCursor,
      now: now.toISOString(),
    }
  }

  async function run(event = {}) {
    return retentionMode(env) === RETENTION_MODE_DELETE ? runDelete(event) : runDryRun(event)
  }

  async function handle(event, openid) {
    if (!timerAuthorized(env, openid)) return errorResponse('invalid_mode')
    return run(event)
  }

  return {
    run,
    handle,
    timerAuthorized: (openid) => timerAuthorized(env, openid),
    retentionMode: () => retentionMode(env),
    encodeCursor,
    decodeCursor,
  }
}

module.exports = {
  TIMER_SOURCE,
  RETENTION_MODE_DELETE,
  RETENTION_MODE_DRY_RUN,
  RETENTION_BATCH_SIZE,
  timerAuthorized,
  retentionMode,
  encodeCursor,
  decodeCursor,
  createRetentionService,
}
