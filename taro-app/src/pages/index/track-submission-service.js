/*
 * C04 injected service seam.
 *
 * CloudBase reservations, the temporary local file path and the opaque
 * upload receipt stay inside this closure. Every deferred operation captures
 * a generation/session snapshot so clearSession or a deliberate new file
 * cannot let a late continuation mutate a replacement intent.
 */

const {
  buildBeginPayload,
  mapTrackError,
  validateLocalFile,
} = require('./track-submission-model')

function clone(value) {
  if (value === undefined || value === null) return value
  if (Array.isArray(value)) return value.map(clone)
  if (typeof value === 'object') {
    const output = {}
    Object.keys(value).forEach((key) => { output[key] = clone(value[key]) })
    return output
  }
  return value
}

function makeAttemptId(now = Date.now, random = Math.random) {
  const time = Number(now()).toString(36)
  const entropy = Number(random()).toString(36).replace(/[^a-z0-9]/gi, '').slice(0, 16) || 'retry'
  return `track_${time}_${entropy}`.slice(0, 80)
}

function errorResponse(code) {
  return { phase: 'error', error: mapTrackError({ code }) }
}

function normalizeResponse(response) {
  if (response && Object.prototype.hasOwnProperty.call(response, 'result')) return response.result
  return response
}

function createTrackSubmissionService({
  callFunction,
  uploadFile,
  chooseFile,
  now = () => Date.now(),
  random = Math.random,
} = {}) {
  if (typeof callFunction !== 'function') throw new TypeError('callFunction seam is required')
  if (typeof uploadFile !== 'function') throw new TypeError('uploadFile seam is required')
  if (typeof chooseFile !== 'function') throw new TypeError('chooseFile seam is required')

  let generation = 0
  let session = null
  let inFlight = { begin: null, upload: null, finalize: null }
  let reviewAttemptCounter = 0

  function invalidateSession() {
    generation += 1
    session = null
    inFlight = { begin: null, upload: null, finalize: null }
    return generation
  }

  function snapshot() {
    return { generation, session }
  }

  function isCurrent(saved) {
    return saved && saved.generation === generation && saved.session === session
  }

  function staleResponse() {
    return { stale: true }
  }

  async function invoke(data) {
    try {
      const response = normalizeResponse(await callFunction({ name: 'trackSubmission', data }))
      if (response && response.phase === 'error') return { phase: 'error', error: mapTrackError(response) }
      return response
    } catch (_error) {
      return errorResponse('store_unavailable')
    }
  }

  function setFile(file) {
    const checked = validateLocalFile(file)
    if (!checked.ok) return checked
    const path = typeof file.path === 'string' ? file.path : (typeof file.filePath === 'string' ? file.filePath : '')
    if (!path) return { ok: false, error: mapTrackError({ code: 'file_missing' }) }
    session = {
      file: { ...checked.value, path },
      fileMeta: checked.value,
      reservation: null,
      fileID: null,
      payload: null,
    }
    return { ok: true, value: checked.value }
  }

  function rememberFile(file) {
    invalidateSession()
    return setFile(file)
  }

  async function chooseLocalFile() {
    const operationGeneration = invalidateSession()
    let result
    try {
      result = await chooseFile({ count: 1, type: 'file', extension: ['gpx', 'kml'] })
    } catch (error) {
      if (operationGeneration !== generation) return staleResponse()
      const cancelled = error && typeof error.errMsg === 'string' && /cancel/i.test(error.errMsg)
      return cancelled
        ? { ok: false, cancelled: true }
        : { ok: false, error: mapTrackError({ code: 'file_missing' }) }
    }
    if (operationGeneration !== generation) return staleResponse()
    const files = result && Array.isArray(result.tempFiles) ? result.tempFiles : []
    if (files.length !== 1) return { ok: false, cancelled: true }
    return setFile(files[0])
  }

  function createSession(form, file, options = {}) {
    const previousFile = file || (session && session.file)
    invalidateSession()
    const remembered = previousFile ? setFile(previousFile) : { ok: false, error: mapTrackError({ code: 'file_missing' }) }
    if (!remembered.ok) return remembered
    const beginAttemptId = typeof options.beginAttemptId === 'string' && options.beginAttemptId.trim().length > 0
      ? options.beginAttemptId.trim() : makeAttemptId(now, random)
    const payload = buildBeginPayload(form, remembered.value, {
      beginAttemptId,
      revisesSubmissionId: options.revisesSubmissionId,
    })
    if (!payload.ok) {
      session = null
      return payload
    }
    session = {
      ...session,
      beginAttemptId,
      payload: clone(payload.value),
      reservation: null,
      fileID: null,
    }
    return { ok: true, value: clone(payload.value) }
  }

  async function beginInternal(form, options = {}) {
    const retry = options.retry === true
    if (!retry || !session || !session.payload) {
      const created = createSession(form, options.file, options)
      if (!created.ok) return errorResponse(created.error.code)
    }
    if (!session || !session.payload) return errorResponse('invalid_input')
    const saved = snapshot()
    const response = await invoke(clone(saved.session.payload))
    if (!isCurrent(saved)) return staleResponse()
    if (response && response.phase === 'upload_reservation') {
      saved.session.reservation = clone(response)
      return response
    }
    return response || errorResponse('store_unavailable')
  }

  async function begin(form, options = {}) {
    if (inFlight.begin) return inFlight.begin
    const operation = beginInternal(form, options)
    inFlight.begin = operation
    try {
      return await operation
    } finally {
      if (inFlight.begin === operation) inFlight.begin = null
    }
  }

  async function uploadInternal(submissionId) {
    const saved = snapshot()
    if (!saved.session || !saved.session.reservation || !saved.session.file
      || typeof submissionId !== 'string' || saved.session.reservation.submissionId !== submissionId) return errorResponse('invalid_state')
    let result
    try {
      result = await uploadFile({
        cloudPath: saved.session.reservation.cloudPath,
        filePath: saved.session.file.path,
      })
    } catch (_error) {
      return isCurrent(saved) ? errorResponse('storage_unavailable') : staleResponse()
    }
    if (!isCurrent(saved)) return staleResponse()
    const fileID = result && typeof result.fileID === 'string' ? result.fileID.trim() : ''
    if (!fileID) return errorResponse('storage_unavailable')
    saved.session.fileID = fileID
    return { ok: true }
  }

  async function upload(submissionId) {
    if (inFlight.upload) {
      if (inFlight.upload.submissionId !== submissionId) return errorResponse('invalid_state')
      return inFlight.upload.promise
    }
    const operation = uploadInternal(submissionId)
    inFlight.upload = { submissionId, promise: operation }
    try {
      return await operation
    } finally {
      if (inFlight.upload && inFlight.upload.promise === operation) inFlight.upload = null
    }
  }

  async function finalizeInternal(submissionId) {
    const saved = snapshot()
    if (!saved.session || !saved.session.reservation || !saved.session.fileID
      || typeof submissionId !== 'string' || saved.session.reservation.submissionId !== submissionId) return errorResponse('invalid_state')
    const response = await invoke({
      mode: 'finalize',
      submissionId: saved.session.reservation.submissionId,
      fileID: saved.session.fileID,
    })
    if (!isCurrent(saved)) return staleResponse()
    if (response && response.phase === 'mine') invalidateSession()
    return response || errorResponse('store_unavailable')
  }

  async function finalize(submissionId) {
    if (inFlight.finalize) {
      if (inFlight.finalize.submissionId !== submissionId) return errorResponse('invalid_state')
      return inFlight.finalize.promise
    }
    const operation = finalizeInternal(submissionId)
    inFlight.finalize = { submissionId, promise: operation }
    try {
      return await operation
    } finally {
      if (inFlight.finalize && inFlight.finalize.promise === operation) inFlight.finalize = null
    }
  }

  async function uploadAndFinalize(form, options = {}) {
    const reservation = await begin(form, options)
    if (!reservation || reservation.stale) return reservation || staleResponse()
    if (reservation.phase !== 'upload_reservation') return reservation || errorResponse('store_unavailable')
    const submissionId = reservation.submissionId
    const uploaded = await upload(submissionId)
    if (!uploaded || uploaded.stale) return uploaded || staleResponse()
    if (uploaded.phase === 'error' || uploaded.ok !== true) return uploaded
    return finalize(submissionId)
  }

  async function resumeUploadFinalize(submissionId) {
    if (!session || !session.reservation || session.reservation.submissionId !== submissionId) return errorResponse('invalid_state')
    const uploaded = await upload(submissionId)
    if (!uploaded || uploaded.stale) return uploaded || staleResponse()
    if (uploaded.phase === 'error' || uploaded.ok !== true) return uploaded
    return finalize(submissionId)
  }

  async function listMine({ cursor, limit } = {}) {
    const data = { mode: 'list_mine' }
    if (cursor) data.cursor = cursor
    if (limit !== undefined) data.limit = limit
    return (await invoke(data)) || errorResponse('store_unavailable')
  }

  async function getMine(submissionId) {
    if (typeof submissionId !== 'string' || submissionId.trim().length < 1) return errorResponse('invalid_input')
    return (await invoke({ mode: 'get_mine', submissionId: submissionId.trim() })) || errorResponse('store_unavailable')
  }

  async function listAdmin({ status, cursor, limit } = {}) {
    const data = { mode: 'admin_list' }
    if (status !== undefined && status !== null && status !== '') data.status = status
    if (cursor) data.cursor = cursor
    if (limit !== undefined) data.limit = limit
    return (await invoke(data)) || errorResponse('store_unavailable')
  }

  async function getAdmin(submissionId) {
    if (typeof submissionId !== 'string' || submissionId.trim().length < 1) return errorResponse('invalid_input')
    return (await invoke({ mode: 'admin_get', submissionId: submissionId.trim() })) || errorResponse('store_unavailable')
  }

  function createReviewIntent({ submissionId, expectedVersion, decision, note } = {}) {
    const id = typeof submissionId === 'string' ? submissionId.trim() : ''
    const version = Number.isInteger(expectedVersion) && expectedVersion >= 1 ? expectedVersion : null
    const normalizedDecision = ['changes_requested', 'rejected', 'approved_evidence'].includes(decision) ? decision : null
    const normalizedNote = note === undefined || note === null || note === '' ? null : String(note).trim()
    if (!id || !version || !normalizedDecision || (normalizedDecision === 'changes_requested' && !normalizedNote)
      || (normalizedNote && Array.from(normalizedNote).length > 500)) return null
    return {
      submissionId: id,
      expectedVersion: version,
      reviewAttemptId: `${makeAttemptId(now, random)}_${reviewAttemptCounter++}`.slice(0, 80),
      decision: normalizedDecision,
      note: normalizedNote,
    }
  }

  async function reviewAdmin(intent) {
    if (!intent || typeof intent !== 'object'
      || typeof intent.submissionId !== 'string' || intent.submissionId.trim().length < 1
      || !Number.isInteger(intent.expectedVersion)
      || intent.expectedVersion < 1 || typeof intent.reviewAttemptId !== 'string'
      || intent.reviewAttemptId.trim().length < 1
      || !['changes_requested', 'rejected', 'approved_evidence'].includes(intent.decision)) {
      return errorResponse('invalid_input')
    }
    const note = intent.note === undefined || intent.note === null || intent.note === '' ? null : String(intent.note).trim()
    if (intent.decision === 'changes_requested' && !note) return errorResponse('invalid_input')
    if (note && Array.from(note).length > 500) return errorResponse('invalid_input')
    return (await invoke({
      mode: 'admin_review',
      submissionId: intent.submissionId.trim(),
      expectedVersion: intent.expectedVersion,
      reviewAttemptId: intent.reviewAttemptId.trim(),
      decision: intent.decision,
      note,
    })) || errorResponse('store_unavailable')
  }

  async function cancel(submissionId, expectedVersion) {
    if (typeof submissionId !== 'string' || submissionId.trim().length < 1 || !Number.isInteger(expectedVersion) || expectedVersion < 1) {
      return errorResponse('invalid_input')
    }
    return (await invoke({ mode: 'cancel', submissionId: submissionId.trim(), expectedVersion })) || errorResponse('store_unavailable')
  }

  function clearSession() {
    invalidateSession()
  }

  function hasUploadSession(submissionId) {
    return Boolean(session && session.reservation && session.file
      && typeof submissionId === 'string' && session.reservation.submissionId === submissionId)
  }

  function isUploadBusy() {
    return Boolean(inFlight.begin || inFlight.upload || inFlight.finalize)
  }

  return {
    begin,
    cancel,
    chooseLocalFile,
    clearSession,
    finalize,
    getMine,
    getAdmin,
    hasUploadSession,
    isUploadBusy,
    listMine,
    listAdmin,
    makeAttemptId: () => makeAttemptId(now, random),
    createReviewIntent,
    reviewAdmin,
    rememberFile,
    resumeUploadFinalize,
    submit: uploadAndFinalize,
    upload,
    uploadAndFinalize,
  }
}

module.exports = {
  createTrackSubmissionService,
  makeAttemptId,
}
