const crypto = require('crypto')
const { parseTrack } = require('./domain/track-parser')
const {
  clone,
  errorResponse,
  toMine,
  toMineList,
  toUploadReservation,
  encodeCursor,
  decodeCursor,
} = require('./response-contract')
const {
  StorageAdapterError,
  validateCreatorFileId,
  normalizeAllowedHost,
  collectBounded,
} = require('./storage-adapter')
const {
  validOpaqueId,
  normalizeString,
  createRecord,
  addDays,
  RAW_DAYS,
  isUploadExpired,
  isRecordExpired,
  PROCESSING_LEASE_SECONDS,
  parserErrorCode,
  terminalStatus,
} = require('./submission-lifecycle')
const { DuplicateSubmissionError } = require('./submission-repository')

const MAX_BYTES = 10 * 1024 * 1024
const FORMATS = new Set(['gpx', 'kml'])
const PROVENANCE = new Set(['self', '2bulu', 'foooooot', 'other'])
const RIGHTS = new Set(['own_recording', 'authorized_by_creator', 'open_license'])
const DEFAULT_LIMIT = 10

function defaultClock() { return new Date() }
function defaultId() { return crypto.randomUUID() }

function nowFrom(clock) {
  const value = typeof clock === 'function' ? clock() : new Date()
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) throw new TypeError('clock must return a valid Date')
  return new Date(date.getTime())
}

function invalid(code = 'invalid_input') { return { ok: false, response: errorResponse(code) } }
function valid(value) { return { ok: true, value } }

function validUrl(value) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password && !parsed.port
  } catch (_error) {
    return false
  }
}

function filenameParts(value) {
  if (typeof value !== 'string') return null
  const filename = value.trim()
  if (Array.from(filename).length < 1 || Array.from(filename).length > 120) return null
  if (/[\\/]/.test(filename)) return { invalidPath: true }
  const match = /\.([^.]+)$/.exec(filename)
  if (!match) return null
  const format = match[1].toLowerCase()
  return FORMATS.has(format) ? { filename, format } : null
}

function parseBeginInput(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) return invalid()
  if (!validOpaqueId(event.beginAttemptId)) return invalid()
  const attempt = event.beginAttemptId.trim()
  const filename = filenameParts(event.originalFilename)
  if (!filename) return invalid('unsupported_format')
  if (filename.invalidPath) return invalid()
  if (!Number.isInteger(event.declaredSizeBytes) || event.declaredSizeBytes < 1 || event.declaredSizeBytes > MAX_BYTES) return invalid()
  const title = normalizeString(event.title, 2, 80)
  if (!title) return invalid()
  const optional = (field, min, max) => {
    if (event[field] === undefined || event[field] === null || event[field] === '') return null
    return normalizeString(event[field], min, max)
  }
  const region = optional('region', 1, 80)
  const note = optional('note', 1, 500)
  if ((event.region !== undefined && event.region !== null && event.region !== '' && region === null)
    || (event.note !== undefined && event.note !== null && event.note !== '' && note === null)) return invalid()
  const provenancePlatform = event.provenancePlatform === undefined || event.provenancePlatform === null || event.provenancePlatform === ''
    ? null : event.provenancePlatform
  if (provenancePlatform !== null && !PROVENANCE.has(provenancePlatform)) return invalid()
  const provenancePageUrl = event.provenancePageUrl === undefined || event.provenancePageUrl === null || event.provenancePageUrl === ''
    ? null : typeof event.provenancePageUrl === 'string' ? event.provenancePageUrl.trim() : event.provenancePageUrl
  if (provenancePageUrl !== null && (typeof provenancePageUrl !== 'string' || provenancePageUrl.length > 500 || !validUrl(provenancePageUrl))) return invalid()
  if (!RIGHTS.has(event.rightsBasis) || event.rightsAccepted !== true || event.rightsDeclarationVersion !== 'track-rights-v1') {
    return invalid('invalid_rights_declaration')
  }
  let licenseName = null
  let licenseUrl = null
  if (event.licenseName !== undefined && event.licenseName !== null && event.licenseName !== '') licenseName = normalizeString(event.licenseName, 2, 80)
  if (event.licenseUrl !== undefined && event.licenseUrl !== null && event.licenseUrl !== '') licenseUrl = typeof event.licenseUrl === 'string' ? event.licenseUrl.trim() : event.licenseUrl
  if (event.rightsBasis === 'open_license') {
    if (!licenseName || typeof licenseUrl !== 'string' || licenseUrl.length > 500 || !validUrl(licenseUrl)) return invalid('invalid_rights_declaration')
  } else if (licenseName !== null || licenseUrl !== null) {
    return invalid('invalid_rights_declaration')
  }
  let revisesSubmissionId = null
  if (event.revisesSubmissionId !== undefined && event.revisesSubmissionId !== null && event.revisesSubmissionId !== '') {
    if (!validOpaqueId(event.revisesSubmissionId)) return invalid('invalid_revision')
    revisesSubmissionId = event.revisesSubmissionId.trim()
  }
  return valid({
    beginAttemptId: attempt,
    originalFilename: filename.filename,
    format: filename.format,
    declaredSizeBytes: event.declaredSizeBytes,
    title,
    region,
    note,
    provenancePlatform,
    provenancePageUrl,
    rightsBasis: event.rightsBasis,
    rightsAccepted: true,
    rightsDeclarationVersion: 'track-rights-v1',
    licenseName,
    licenseUrl,
    revisesSubmissionId,
  })
}

function parseId(event, field) {
  if (!event || typeof event[field] !== 'string' || !validOpaqueId(event[field])) return null
  return event[field].trim()
}

function parseAttemptId(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event) || !validOpaqueId(event.beginAttemptId)) return null
  return event.beginAttemptId.trim()
}

function parseFileId(event) {
  if (!event || typeof event.fileID !== 'string') return null
  const value = event.fileID.trim()
  return value.length >= 1 && value.length <= 1024 ? value : null
}

function parseExpectedVersion(event) {
  return event && Number.isInteger(event.expectedVersion) && event.expectedVersion >= 1 ? event.expectedVersion : null
}

function mapStorageError(error) {
  if (error && error.code && ['file_missing', 'file_size_invalid', 'upload_binding_invalid', 'storage_not_configured'].includes(error.code)) return error.code
  if (error && error.code === 'storage_unavailable') return 'storage_unavailable'
  return 'storage_unavailable'
}

function mapRepositoryError(_error) { return 'store_unavailable' }

async function maybeRead(storage, fileID, cloudPath) {
  if (storage && typeof storage.readCreator === 'function') return storage.readCreator(fileID, cloudPath)
  if (!storage || typeof storage.getTemporaryUrl !== 'function' || typeof storage.get !== 'function') throw new StorageAdapterError('storage_unavailable', 'read seam missing')
  const url = await storage.getTemporaryUrl(fileID, 300)
  if (typeof storage.head === 'function') {
    try {
      const head = await storage.head(url)
      const raw = head && head.headers && (head.headers['content-length'] || head.headers['Content-Length'])
      if (raw !== undefined) {
        const length = Number(raw)
        if (!Number.isInteger(length) || length < 1 || length > MAX_BYTES) throw new StorageAdapterError('file_size_invalid', 'invalid HEAD length')
      }
    } catch (error) {
      if (error instanceof StorageAdapterError && error.code === 'file_size_invalid') throw error
    }
  }
  const response = await storage.get(url)
  if (response && Number.isInteger(response.statusCode) && (response.statusCode < 200 || response.statusCode >= 300)) {
    throw new StorageAdapterError('file_missing', 'download response is unavailable')
  }
  return collectBounded(response)
}

async function removeObject(storage, fileID) {
  if (!fileID) return true
  if (!storage || typeof storage.deleteObject !== 'function') throw new StorageAdapterError('storage_unavailable', 'delete seam missing')
  await storage.deleteObject(fileID)
  return true
}

function cleanupFields(record, storage, targets) {
  const entries = []
  const rawFileState = record.rawFileState || { upload: 'reserved', review: 'absent' }
  if (targets.includes('upload') && rawFileState.upload === 'deletion_pending' && record.creatorFileId) {
    entries.push(['upload', record.creatorFileId])
  }
  if (targets.includes('review') && rawFileState.review === 'deletion_pending' && record.reviewFileId) {
    entries.push(['review', record.reviewFileId])
  }
  return Promise.all(entries.map(async ([target, fileID]) => {
    try {
      await removeObject(storage, fileID)
      return [target, true]
    } catch (_error) {
      return [target, false]
    }
  })).then((results) => {
    const output = clone(rawFileState)
    results.forEach(([target, success]) => {
      output[target] = success ? 'deleted' : 'deletion_pending'
    })
    return output
  })
}

const CLEANUP_CANDIDATE_STATES = new Set(['reserved', 'present', 'deletion_pending'])

function cleanupPlan(record, targets) {
  const rawFileState = clone(record.rawFileState || { upload: 'reserved', review: 'absent' })
  const plannedTargets = []
  targets.forEach((target) => {
    if (CLEANUP_CANDIDATE_STATES.has(rawFileState[target])) {
      rawFileState[target] = 'deletion_pending'
      plannedTargets.push(target)
    }
  })
  return { rawFileState, targets: plannedTargets }
}

function pendingCleanupTargets(record) {
  const rawFileState = record.rawFileState || {}
  return ['upload', 'review'].filter((target) => rawFileState[target] === 'deletion_pending')
}

function createOwnerService({ repository, storage, clock = defaultClock, idFactory = defaultId, parser = parseTrack } = {}) {
  if (!repository || typeof repository.get !== 'function') throw new TypeError('repository seam is required')
  if (!storage || typeof storage.getAllowedHost !== 'function') throw new TypeError('storage seam is required')

  async function requireStorageHost() {
    try {
      return normalizeAllowedHost(await storage.getAllowedHost())
    } catch (error) {
      return { error: error && error.code === 'storage_not_configured' ? 'storage_not_configured' : 'storage_not_configured' }
    }
  }

  async function trustedCleanupRecord(record, targets) {
    if (!targets.includes('upload') || record.creatorFileId) return valid(record)
    const host = await requireStorageHost()
    if (host && host.error) return invalid(host.error)
    return valid({ ...record, creatorFileId: `cloud://${host}/${record.cloudPath}` })
  }

  async function persistCleanup(record, openid, targetNames) {
    if (!targetNames.length) return valid(record)
    const nextState = await cleanupFields(record, storage, targetNames)
    if (JSON.stringify(nextState) === JSON.stringify(record.rawFileState)) return valid(record)
    let updated
    try {
      updated = await repository.update(record._id, {
        _openid: openid, status: record.status, version: record.version,
      }, {
        rawFileState: nextState,
        version: record.version + 1,
        updatedAt: nowFrom(clock),
      })
    } catch (_error) {
      return invalid('store_unavailable')
    }
    if (!updated) return invalid('store_unavailable')
    return valid(updated)
  }

  async function replayCleanup(record, openid) {
    const targets = pendingCleanupTargets(record)
    if (!targets.length) return valid(record)
    const cleanupRecord = await trustedCleanupRecord(record, targets)
    if (!cleanupRecord.ok) return cleanupRecord
    return persistCleanup(cleanupRecord.value, openid, targets)
  }

  async function begin(event, openid) {
    const attemptId = parseAttemptId(event)
    if (!attemptId) return errorResponse('invalid_input')
    let existing
    try {
      existing = await repository.findByAttempt(openid, attemptId)
    } catch (error) {
      return errorResponse(mapRepositoryError(error))
    }
    if (existing) return toUploadReservation(existing)
    const host = await requireStorageHost()
    if (host && host.error) return errorResponse(host.error)
    const parsed = parseBeginInput(event)
    if (!parsed.ok) return parsed.response
    const input = parsed.value
    try {
      const now = nowFrom(clock)
      const submissionId = String(await idFactory()).trim()
      if (!validOpaqueId(submissionId)) return errorResponse('store_unavailable')
      const rights = {
        basis: input.rightsBasis,
        declarationVersion: input.rightsDeclarationVersion,
        licenseName: input.licenseName,
        licenseUrl: input.licenseUrl,
      }
      const recordInput = {
        originalFilename: input.originalFilename,
        title: input.title,
        region: input.region,
        note: input.note,
        provenancePlatform: input.provenancePlatform,
        provenancePageUrl: input.provenancePageUrl,
      }
      const record = createRecord({
        submissionId,
        openid,
        beginAttemptId: input.beginAttemptId,
        input: recordInput,
        rights,
        format: input.format,
        declaredSizeBytes: input.declaredSizeBytes,
        now,
        idFactory,
        revisesSubmissionId: input.revisesSubmissionId,
      })
      let inserted
      if (input.revisesSubmissionId) {
        const parent = await repository.get(input.revisesSubmissionId)
        if (!parent || parent._openid !== openid || parent.status !== 'changes_requested') return errorResponse('invalid_revision')
        const parentExpiresAt = new Date(parent.recordExpiresAt).getTime()
        if (!Number.isFinite(parentExpiresAt) || parentExpiresAt <= now.getTime()) return errorResponse('submission_not_found')
        if (parent.replacementSubmissionId) {
          try {
            const raced = await repository.findByAttempt(openid, input.beginAttemptId)
            if (raced) return toUploadReservation(raced)
          } catch (_ignored) {}
          return errorResponse('invalid_revision')
        }
        try {
          inserted = await repository.insertRevision(input.revisesSubmissionId, openid, record, now)
        } catch (error) {
          try {
            const raced = await repository.findByAttempt(openid, input.beginAttemptId)
            if (raced) return toUploadReservation(raced)
          } catch (_ignored) {}
          return errorResponse(mapRepositoryError(error))
        }
        if (!inserted) {
          try {
            const raced = await repository.findByAttempt(openid, input.beginAttemptId)
            if (raced) return toUploadReservation(raced)
          } catch (_ignored) {}
          return errorResponse('invalid_revision')
        }
      } else {
        try {
          inserted = await repository.add(record)
        } catch (error) {
          if (error instanceof DuplicateSubmissionError || error.code === 'duplicate' || error.code === 'DUPLICATE_KEY') {
            const raced = await repository.findByAttempt(openid, input.beginAttemptId)
            if (raced) return toUploadReservation(raced)
          } else {
            // CloudBase's unique-index error code is not stable across SDK
            // versions. A single owner/attempt re-read is safe and closes the
            // race without treating arbitrary failures as success.
            try {
              const raced = await repository.findByAttempt(openid, input.beginAttemptId)
              if (raced) return toUploadReservation(raced)
            } catch (_ignored) {}
          }
          return errorResponse(mapRepositoryError(error))
        }
      }
      const result = input.revisesSubmissionId ? record : await repository.get((inserted && inserted._id) || submissionId)
      return result ? toUploadReservation(result) : errorResponse('store_unavailable')
    } catch (error) {
      return errorResponse(mapRepositoryError(error))
    }
  }

  async function finalize(event, openid) {
    const host = await requireStorageHost()
    if (host && host.error) return errorResponse(host.error)
    const submissionId = parseId(event, 'submissionId')
    const fileID = parseFileId(event)
    if (!submissionId || !fileID) return errorResponse('invalid_input')
    let record
    try { record = await repository.get(submissionId) } catch (error) { return errorResponse(mapRepositoryError(error)) }
    const now = nowFrom(clock)
    if (!record || record._openid !== openid || isRecordExpired(record, now)) return errorResponse('submission_not_found')
    if (record.status === 'pending_review' || record.status === 'invalid') {
      const replay = await replayCleanup(record, openid)
      if (!replay.ok) return replay.response
      return toMine(replay.value)
    }
    try {
      validateCreatorFileId({ fileID, allowedFileHost: host, cloudPath: record.cloudPath })
    } catch (error) {
      return errorResponse(error && error.code === 'storage_not_configured' ? 'storage_not_configured' : 'upload_binding_invalid')
    }
    if (isUploadExpired(record, now) && record.status === 'awaiting_upload') return errorResponse('upload_reservation_expired')
    if (terminalStatus(record.status)) return toMine(record)
    if (record.status === 'processing') {
      const started = new Date(record.processing && record.processing.startedAt).getTime()
      if (Number.isFinite(started) && now.getTime() - started < PROCESSING_LEASE_SECONDS * 1000) return errorResponse('processing_in_progress')
    }
    if (record.status !== 'awaiting_upload' && record.status !== 'processing') return errorResponse('invalid_state')
    const leaseId = String(await idFactory()).trim()
    let claim
    try { claim = await repository.claimProcessing(submissionId, openid, now, leaseId) } catch (error) { return errorResponse(mapRepositoryError(error)) }
    if (!claim || claim.kind === 'missing') return errorResponse('submission_not_found')
    if (claim.kind === 'fresh') return errorResponse('processing_in_progress')
    if (claim.kind === 'terminal') return toMine(claim.record)
    if (claim.kind === 'conflict') return errorResponse('version_conflict')
    const processing = claim.record
    let bytes
    let reviewFileId = null
    try {
      bytes = await maybeRead(storage, fileID, record.cloudPath)
      if (!Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes)
      if (bytes.length < 1 || bytes.length > MAX_BYTES) throw new StorageAdapterError('file_size_invalid', 'actual object size is invalid')
      if (typeof storage.uploadReview !== 'function') throw new StorageAdapterError('storage_unavailable', 'review upload seam missing')
      reviewFileId = await storage.uploadReview(record.reviewCloudPath, bytes)
    } catch (error) {
      const reset = {
        status: 'awaiting_upload',
        version: processing.version + 1,
        processing: { leaseId: null, startedAt: null },
        updatedAt: now,
      }
      let resetResult
      try {
        resetResult = await repository.update(submissionId, {
          _openid: openid, status: 'processing', version: processing.version, 'processing.leaseId': leaseId,
        }, reset)
      } catch (_error) {
        return errorResponse('store_unavailable')
      }
      if (!resetResult) return errorResponse('store_unavailable')
      return errorResponse(mapStorageError(error))
    }

    let summary
    try {
      summary = parser(bytes, { format: record.format, filename: record.originalFilename })
      if (!summary || typeof summary !== 'object' || Array.isArray(summary)) throw new StorageAdapterError('processing_failed', 'parser returned no summary')
    } catch (error) {
      const code = parserErrorCode(error)
      const patch = {
        status: 'invalid',
        version: processing.version + 1,
        creatorFileId: fileID,
        reviewFileId,
        actualSizeBytes: bytes.length,
        summary: null,
        processing: { leaseId: null, startedAt: null },
        rawFileState: { upload: 'deletion_pending', review: 'deletion_pending' },
        updatedAt: now,
      }
      let terminal
      try {
        const conditions = {
          _openid: openid, status: 'processing', version: processing.version,
          'processing.leaseId': processing.processing.leaseId,
        }
        if (processing.revisesSubmissionId) {
          if (typeof repository.transitionRevisionTerminal !== 'function') return errorResponse('store_unavailable')
          const transitioned = await repository.transitionRevisionTerminal(submissionId, openid, conditions, patch, now)
          terminal = transitioned && transitioned.child
        } else {
          terminal = await repository.update(submissionId, conditions, patch)
        }
      } catch (transitionError) {
        return errorResponse(transitionError && transitionError.code === 'version_conflict' ? 'version_conflict' : 'store_unavailable')
      }
      if (!terminal) return errorResponse('version_conflict')
      const cleanup = await persistCleanup({ ...terminal, creatorFileId: fileID, reviewFileId }, openid, ['upload', 'review'])
      if (!cleanup.ok) return cleanup.response
      return code === 'xml_invalid' || code === 'xml_unsafe' || code === 'track_structure_unsupported' || code === 'track_limits_exceeded' || code === 'coordinate_invalid' || code === 'unsupported_format'
        ? errorResponse(code)
        : errorResponse('processing_failed')
    }

    const snapshotAt = nowFrom(clock)
    const finalPatch = {
      status: 'pending_review',
      version: processing.version + 1,
      creatorFileId: fileID,
      reviewFileId,
      actualSizeBytes: bytes.length,
      reviewSnapshotAt: snapshotAt,
      rawExpiresAt: addDays(snapshotAt, RAW_DAYS),
      recordExpiresAt: addDays(snapshotAt, RAW_DAYS),
      summary: clone(summary),
      processing: { leaseId: null, startedAt: null },
      rawFileState: { upload: 'deletion_pending', review: 'present' },
      updatedAt: snapshotAt,
    }
    let updated
    try {
      updated = await repository.update(submissionId, {
        _openid: openid, status: 'processing', version: processing.version, 'processing.leaseId': processing.processing.leaseId,
      }, finalPatch)
    } catch (error) {
      return errorResponse(mapRepositoryError(error))
    }
    if (!updated) return errorResponse('version_conflict')
    const cleanup = await persistCleanup(updated, openid, ['upload'])
    if (!cleanup.ok) return cleanup.response
    return toMine(cleanup.value)
  }

  async function listMine(event, openid) {
    let limit = DEFAULT_LIMIT
    if (event && event.limit !== undefined) {
      if (!Number.isInteger(event.limit) || event.limit < 1 || event.limit > 20) return errorResponse('invalid_input')
      limit = event.limit
    }
    const cursor = event && event.cursor !== undefined ? decodeCursor(event.cursor) : null
    if (event && event.cursor !== undefined && !cursor) return errorResponse('invalid_cursor')
    const now = nowFrom(clock)
    try {
      const queried = await repository.list(openid, now, { cursor, limit })
      const rows = (Array.isArray(queried) ? queried : []).filter((record) => record._openid === openid && !isRecordExpired(record, now))
      const page = rows.slice(0, limit)
      const nextCursor = rows.length > limit && page.length ? encodeCursor({
        updatedAt: new Date(page[page.length - 1].updatedAt).toISOString(),
        submissionId: page[page.length - 1]._id,
      }) : null
      return toMineList(page, nextCursor)
    } catch (error) {
      return errorResponse(mapRepositoryError(error))
    }
  }

  async function getMine(event, openid) {
    const submissionId = parseId(event, 'submissionId')
    if (!submissionId) return errorResponse('invalid_input')
    try {
      const record = await repository.get(submissionId)
      const now = nowFrom(clock)
      if (!record || record._openid !== openid || isRecordExpired(record, now)) return errorResponse('submission_not_found')
      return toMine(record)
    } catch (error) {
      return errorResponse(mapRepositoryError(error))
    }
  }

  async function cancel(event, openid) {
    const submissionId = parseId(event, 'submissionId')
    const expectedVersion = parseExpectedVersion(event)
    if (!submissionId || expectedVersion === null) return errorResponse('invalid_input')
    let record
    try { record = await repository.get(submissionId) } catch (error) { return errorResponse(mapRepositoryError(error)) }
    const now = nowFrom(clock)
    if (!record || record._openid !== openid || isRecordExpired(record, now)) return errorResponse('submission_not_found')
    if (['cancelled', 'invalid', 'rejected'].includes(record.status)) {
      if (record.revisesSubmissionId) {
        if (typeof repository.repairRevisionPointer !== 'function') return errorResponse('store_unavailable')
        let repaired
        try { repaired = await repository.repairRevisionPointer(submissionId, openid, now) } catch (_error) { return errorResponse('store_unavailable') }
        if (!repaired) return errorResponse('store_unavailable')
      }
      const replay = await replayCleanup(record, openid)
      if (!replay.ok) return replay.response
      return toMine(replay.value)
    }
    if (!['awaiting_upload', 'pending_review', 'changes_requested'].includes(record.status)) return errorResponse('invalid_state')
    if (record.version !== expectedVersion) return errorResponse('version_conflict')
    const plan = cleanupPlan(record, ['upload', 'review'])
    const plannedRecord = { ...record, rawFileState: plan.rawFileState }
    const cleanupRecord = await trustedCleanupRecord(plannedRecord, plan.targets)
    if (!cleanupRecord.ok) return cleanupRecord.response
    let updated
    const cancellationConditions = { _openid: openid, status: record.status, version: expectedVersion }
    const cancellationPatch = {
      status: 'cancelled',
      version: expectedVersion + 1,
      rawFileState: plan.rawFileState,
      updatedAt: now,
    }
    try {
      if (record.revisesSubmissionId) {
        if (typeof repository.transitionRevisionTerminal !== 'function') return errorResponse('store_unavailable')
        const transitioned = await repository.transitionRevisionTerminal(submissionId, openid, cancellationConditions, cancellationPatch, now)
        updated = transitioned && transitioned.child
      } else {
        updated = await repository.update(submissionId, cancellationConditions, cancellationPatch)
      }
    } catch (error) { return errorResponse(mapRepositoryError(error)) }
    if (!updated) return errorResponse('version_conflict')
    const cleanup = await persistCleanup({
      ...updated,
      creatorFileId: updated.creatorFileId || cleanupRecord.value.creatorFileId,
      reviewFileId: updated.reviewFileId || cleanupRecord.value.reviewFileId,
    }, openid, plan.targets)
    if (!cleanup.ok) return cleanup.response
    return toMine(cleanup.value)
  }

  async function handle(event = {}, openid) {
    if (typeof openid !== 'string' || openid.trim() === '') return errorResponse('unauthenticated')
    if (!event || typeof event !== 'object' || Array.isArray(event)) return errorResponse('invalid_mode')
    if (event.mode === 'begin') return begin(event, openid)
    if (event.mode === 'finalize') return finalize(event, openid)
    if (event.mode === 'list_mine') return listMine(event, openid)
    if (event.mode === 'get_mine') return getMine(event, openid)
    if (event.mode === 'cancel') return cancel(event, openid)
    return errorResponse('invalid_mode')
  }

  return {
    handle,
    begin,
    finalize,
    listMine,
    getMine,
    cancel,
    parseBeginInput,
  }
}

module.exports = {
  createOwnerService,
  parseBeginInput,
  parseId,
  parseFileId,
  parseExpectedVersion,
}
