const assert = require('node:assert/strict')

const { parseTrack } = require('../cloudfunctions/trackSubmission/domain/track-parser')
const { createOwnerService } = require('../cloudfunctions/trackSubmission/owner-service')
const { createTrackSubmissionHandler } = require('../cloudfunctions/trackSubmission/index')
const {
  createMemoryRepository,
  createCloudBaseRepository,
  DuplicateSubmissionError,
} = require('../cloudfunctions/trackSubmission/submission-repository')
const {
  PROCESSING_LEASE_SECONDS,
  REVIEW_PATH_FUNCTION_TIMEOUT_SECONDS,
  fixedReviewPathTimeoutIsSafe,
} = require('../cloudfunctions/trackSubmission/submission-lifecycle')
const {
  StorageAdapterError, collectBounded, validateCreatorFileId, createStorageAdapter,
} = require('../cloudfunctions/trackSubmission/storage-adapter')

const HOST = 'storage.example.test'
const GPX_NS = 'http://www.topografix.com/GPX/1/1'

function gpx(points = [[30, 100], [30.001, 100.001]]) {
  const body = points.map(([lat, lon], index) => `<trkpt lat="${lat}" lon="${lon}"><ele>${1000 + index}</ele></trkpt>`).join('')
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><gpx xmlns="${GPX_NS}"><trk><trkseg>${body}</trkseg></trk></gpx>`)
}

function errorCode(response) {
  assert.equal(response.phase, 'error')
  return response.error.code
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

function harness({ owner = 'owner-a', initialNow = '2026-08-09T00:00:00.000Z', bytes = gpx() } = {}) {
  let now = new Date(initialNow)
  let sequence = 0
  const repository = createMemoryRepository()
  const state = {
    owner,
    bytes: Buffer.from(bytes),
    readCount: 0,
    uploadCount: 0,
    deleteCount: 0,
    deletedFileIds: [],
    uploadedBytes: [],
    parsedBytes: [],
    deleteFailures: 0,
    readError: null,
    readGate: null,
    parserError: null,
  }
  const storage = {
    getAllowedHost() { return HOST },
    async readCreator() {
      state.readCount += 1
      if (state.readGate) await state.readGate.promise
      if (state.readError) throw state.readError
      return Buffer.from(state.bytes)
    },
    async uploadReview(cloudPath, value) {
      state.uploadCount += 1
      state.uploadedBytes.push(Buffer.from(value))
      return `cloud://${HOST}/${cloudPath}`
    },
    async deleteObject(fileID) {
      state.deleteCount += 1
      state.deletedFileIds.push(fileID)
      if (state.deleteFailures > 0) {
        state.deleteFailures -= 1
        throw new StorageAdapterError('storage_unavailable', 'delete failed')
      }
      return true
    },
  }
  const parser = (value, options) => {
    state.parsedBytes.push(Buffer.from(value))
    if (state.parserError) throw state.parserError
    return parseTrack(value, options)
  }
  const service = createOwnerService({
    repository,
    storage,
    clock: () => new Date(now.getTime()),
    idFactory: () => `submission-${++sequence}`,
    parser,
  })
  return {
    repository,
    storage,
    state,
    service,
    owner,
    setNow(value) { now = new Date(value) },
    advance(ms) { now = new Date(now.getTime() + ms) },
    async call(event, identity = owner) { return service.handle(event, identity) },
    async begin(overrides = {}, identity = owner) {
      return this.call({
        mode: 'begin', beginAttemptId: 'attempt-1', originalFilename: 'walk.gpx', declaredSizeBytes: gpx().length,
        title: '我的轨迹', rightsBasis: 'own_recording', rightsAccepted: true,
        rightsDeclarationVersion: 'track-rights-v1', ...overrides,
      }, identity)
    },
  }
}

async function run() {
  // Authentication/mode and zero-side-effect boundaries.
  {
    const h = harness()
    const unauthenticated = await h.call({ mode: 'begin' }, null)
    assert.equal(errorCode(unauthenticated), 'unauthenticated')
    assert.equal(h.state.readCount, 0)
    assert.equal(h.state.uploadCount, 0)
    const unknown = await h.call({ mode: 'admin_list' })
    assert.equal(errorCode(unknown), 'invalid_mode')
    assert.equal(h.state.readCount, 0)
    const invalidRights = await h.begin({ rightsAccepted: false })
    assert.equal(errorCode(invalidRights), 'invalid_rights_declaration')
    assert.equal((await h.repository.snapshot()).length, 0)
    const invalidIdentity = await h.begin({ _openid: 'forged' }, 'owner-a')
    assert.equal(invalidIdentity.phase, 'upload_reservation')
    assert.equal((await h.repository.snapshot()).every((record) => record._openid === 'owner-a'), true)
  }

  // Strict config/input checks happen before database or storage mutations.
  {
    const h = harness()
    h.storage.getAllowedHost = () => { throw new StorageAdapterError('storage_not_configured', 'missing host') }
    const response = await h.begin()
    assert.equal(errorCode(response), 'storage_not_configured')
    assert.equal((await h.repository.snapshot()).length, 0)
    const malformed = harness()
    const invalid = await malformed.begin({ originalFilename: '../walk.gpx' })
    assert.equal(errorCode(invalid), 'invalid_input')
    assert.equal((await malformed.repository.snapshot()).length, 0)
  }

  // A unique-index duplicate race re-reads the owner's first reservation.
  {
    const race = harness()
    const originalAdd = race.repository.add
    race.repository.add = async (record) => {
      await originalAdd(record)
      throw new DuplicateSubmissionError()
    }
    const raced = await race.begin()
    assert.equal(raced.phase, 'upload_reservation')
    assert.equal((await race.repository.snapshot()).length, 1)
  }

  // Begin reservation, exact retry idempotency, owner isolation and revision lock.
  const h = harness()
  const first = await h.begin()
  assert.equal(first.phase, 'upload_reservation')
  assert.deepEqual(Object.keys(first).sort(), ['allowedActions', 'cloudPath', 'expiresAt', 'format', 'phase', 'status', 'submissionId', 'version'].sort())
  assert.equal(first.cloudPath, `track-submissions/${first.submissionId}/upload.gpx`)
  assert.deepEqual(first.allowedActions, ['upload_finalize', 'cancel'])
  const retry = await h.begin({ title: '改变后的标题', declaredSizeBytes: 10 })
  assert.deepEqual(retry, first)
  h.storage.getAllowedHost = () => { throw new StorageAdapterError('storage_not_configured', 'changed config') }
  const invalidRetry = await h.begin({ title: '', rightsAccepted: false, declaredSizeBytes: 0 })
  assert.deepEqual(invalidRetry, first)
  h.storage.getAllowedHost = () => HOST
  const other = await h.begin({ beginAttemptId: 'attempt-1' }, 'owner-b')
  assert.notEqual(other.submissionId, first.submissionId)
  assert.equal((await h.repository.snapshot()).filter((record) => record.beginAttemptId === 'attempt-1').length, 2)

  const parent = (await h.repository.snapshot()).find((record) => record._id === first.submissionId)
  await h.repository.update(parent._id, { status: 'awaiting_upload', version: parent.version }, { status: 'changes_requested', version: parent.version + 1 })
  const revision = await h.begin({ beginAttemptId: 'revision-1', revisesSubmissionId: parent._id, title: '重新上传' })
  assert.equal(revision.phase, 'upload_reservation')
  const locked = await h.begin({ beginAttemptId: 'revision-2', revisesSubmissionId: parent._id })
  assert.equal(errorCode(locked), 'invalid_revision')

  const revisionRace = harness()
  const raceParentReservation = await revisionRace.begin({ beginAttemptId: 'revision-parent' })
  const raceParent = (await revisionRace.repository.snapshot()).find((item) => item._id === raceParentReservation.submissionId)
  await revisionRace.repository.update(raceParent._id, { status: 'awaiting_upload', version: raceParent.version }, {
    status: 'changes_requested', version: raceParent.version + 1,
  })
  const originalInsertRevision = revisionRace.repository.insertRevision
  revisionRace.repository.insertRevision = async (parentId, openid, child) => {
    await originalInsertRevision(parentId, openid, child)
    throw new DuplicateSubmissionError()
  }
  const racedRevision = await revisionRace.begin({ beginAttemptId: 'revision-race', revisesSubmissionId: raceParent._id })
  assert.equal(racedRevision.phase, 'upload_reservation')

  const pointerRace = harness()
  const pointerParentReservation = await pointerRace.begin({ beginAttemptId: 'pointer-parent' })
  const pointerParent = (await pointerRace.repository.snapshot()).find((item) => item._id === pointerParentReservation.submissionId)
  await pointerRace.repository.update(pointerParent._id, { status: 'awaiting_upload', version: pointerParent.version }, {
    status: 'changes_requested', version: pointerParent.version + 1,
  })
  const pointerChild = await pointerRace.begin({ beginAttemptId: 'pointer-child', revisesSubmissionId: pointerParent._id })
  const pointerFind = pointerRace.repository.findByAttempt
  let pointerFindCalls = 0
  pointerRace.repository.findByAttempt = async (openid, attempt) => {
    pointerFindCalls += 1
    if (attempt === 'pointer-child' && pointerFindCalls === 1) return null
    return pointerFind(openid, attempt)
  }
  const pointerReread = await pointerRace.begin({ beginAttemptId: 'pointer-child', revisesSubmissionId: pointerParent._id, title: 'changed retry' })
  assert.deepEqual(pointerReread, pointerChild)

  // A fresh revision may not mutate an expired parent; the exact deadline is expired too.
  for (const [label, deadline] of [
    ['past', '2026-08-08T23:59:59.999Z'],
    ['at-deadline', '2026-08-09T00:00:00.000Z'],
  ]) {
    const expired = harness()
    const expiredReservation = await expired.begin({ beginAttemptId: `expired-parent-${label}` })
    const expiredParent = (await expired.repository.snapshot()).find((item) => item._id === expiredReservation.submissionId)
    const changed = await expired.repository.update(expiredParent._id, {
      _openid: expired.owner, status: 'awaiting_upload', version: expiredParent.version,
    }, {
      status: 'changes_requested', version: expiredParent.version + 1,
      recordExpiresAt: new Date(deadline), updatedAt: new Date('2026-08-08T00:00:00.000Z'),
    })
    assert.equal(changed.status, 'changes_requested')
    const before = await expired.repository.get(expiredParent._id)
    const expiredRevision = await expired.begin({
      beginAttemptId: `expired-revision-${label}`, revisesSubmissionId: expiredParent._id,
    })
    assert.equal(errorCode(expiredRevision), 'submission_not_found')
    assert.equal(expired.state.readCount, 0)
    assert.equal(expired.state.uploadCount, 0)
    assert.equal(expired.state.deleteCount, 0)
    assert.equal((await expired.repository.snapshot()).length, 1)
    const after = await expired.repository.get(expiredParent._id)
    assert.equal(after.replacementSubmissionId, before.replacementSubmissionId || null)
    assert.equal(after.version, before.version)
  }

  // An unexpired revision succeeds and the existing attempt remains idempotent.
  {
    const fresh = harness()
    const freshParentReservation = await fresh.begin({ beginAttemptId: 'fresh-parent' })
    const freshParent = (await fresh.repository.snapshot()).find((item) => item._id === freshParentReservation.submissionId)
    await fresh.repository.update(freshParent._id, { _openid: fresh.owner, status: 'awaiting_upload', version: freshParent.version }, {
      status: 'changes_requested', version: freshParent.version + 1,
      recordExpiresAt: new Date('2026-08-10T00:00:00.000Z'), updatedAt: new Date('2026-08-09T00:00:00.000Z'),
    })
    const freshRevision = await fresh.begin({ beginAttemptId: 'fresh-revision', revisesSubmissionId: freshParent._id, title: '新修订' })
    assert.equal(freshRevision.phase, 'upload_reservation')
    const freshChildBeforeReplay = await fresh.repository.findByAttempt(fresh.owner, 'fresh-revision')
    const freshReplay = await fresh.begin({ beginAttemptId: 'fresh-revision', revisesSubmissionId: freshParent._id, title: '忽略重试变更' })
    assert.deepEqual(freshReplay, freshRevision)
    assert.deepEqual(await fresh.repository.findByAttempt(fresh.owner, 'fresh-revision'), freshChildBeforeReplay)
  }

  // Exact fileID host/path binding rejects prefix/suffix, query, userinfo, encoded and duplicate paths.
  {
    const record = (await h.repository.snapshot()).find((item) => item._id === revision.submissionId)
    const valid = `cloud://${HOST}/${record.cloudPath}`
    assert.deepEqual(validateCreatorFileId({ fileID: valid, allowedFileHost: HOST, cloudPath: record.cloudPath }).fileID, valid)
    for (const fileID of [
      `cloud://evil-${HOST}/${record.cloudPath}`,
      `cloud://${HOST}.evil/${record.cloudPath}`,
      `cloud://${HOST}/${record.cloudPath}?x=1`,
      `cloud://user@${HOST}/${record.cloudPath}`,
      `cloud://${HOST}//${record.cloudPath}`,
      `cloud://${HOST}/track-submissions/${record._id}/./upload.gpx`,
      `cloud://${HOST}/track-submissions/${record._id}/upload%2Egpx`,
    ]) assert.throws(() => validateCreatorFileId({ fileID, allowedFileHost: HOST, cloudPath: record.cloudPath }), /fileID/)
  }

  // Finalize uses one server-read Buffer for immutable upload and parser; HEAD is never authority.
  const finalizeRecord = (await h.repository.snapshot()).find((record) => record._id === revision.submissionId)
  const creatorFileID = `cloud://${HOST}/${finalizeRecord.cloudPath}`
  const finalized = await h.call({ mode: 'finalize', submissionId: finalizeRecord._id, fileID: creatorFileID })
  assert.equal(finalized.phase, 'mine')
  assert.equal(finalized.submission.status, 'pending_review')
  assert.equal(finalized.submission.summary.summaryVersion, 'track-summary-v1')
  assert.deepEqual(h.state.uploadedBytes[0], h.state.parsedBytes[0])
  assert.deepEqual(h.state.uploadedBytes[0], h.state.bytes)
  assert.equal(h.state.readCount, 1)
  assert.equal(h.state.deleteCount, 1)
  assert.equal(finalized.submission.cleanup.pending, false)
  const finalizedStored = await h.repository.get(finalizeRecord._id)
  const DAY_MS = 24 * 60 * 60 * 1000
  assert.equal(finalizedStored.rawExpiresAt.getTime() - finalizedStored.reviewSnapshotAt.getTime(), 30 * DAY_MS)
  assert.equal(finalizedStored.recordExpiresAt.getTime() - finalizedStored.reviewSnapshotAt.getTime(), 30 * DAY_MS)
  assert.deepEqual(finalized.submission.allowedActions, ['cancel'])
  assert.deepEqual(Object.keys(finalized).sort(), ['phase', 'submission'])
  assert.deepEqual(Object.keys(finalized.submission).sort(), [
    'actualSizeBytes', 'allowedActions', 'cleanup', 'createdAt', 'format', 'licenseName', 'licenseUrl',
    'originalFilename', 'region', 'retention', 'revisesSubmissionId', 'rightsBasis', 'rightsDeclarationVersion',
    'reviewNote', 'status', 'submissionId', 'summary', 'title', 'updatedAt', 'version',
  ].sort())
  const finalizedList = await h.call({ mode: 'list_mine', limit: 20 })
  assert.deepEqual(Object.keys(finalizedList).sort(), ['items', 'nextCursor', 'phase'])
  const finalizedListItem = finalizedList.items.find((item) => item.submissionId === finalizeRecord._id)
  assert.ok(finalizedListItem)
  assert.deepEqual(Object.keys(finalizedListItem).sort(), [
    'actualSizeBytes', 'allowedActions', 'cleanup', 'createdAt', 'format', 'originalFilename', 'region',
    'retention', 'revisesSubmissionId', 'reviewNote', 'status', 'submissionId', 'title', 'updatedAt', 'version',
  ].sort())
  const privacy = harness()
  const privacyReservation = await privacy.begin()
  const privacyRecord = (await privacy.repository.snapshot()).find((item) => item._id === privacyReservation.submissionId)
  await privacy.call({ mode: 'finalize', submissionId: privacyRecord._id, fileID: `cloud://${HOST}/${privacyRecord.cloudPath}` })
  const privacyStored = (await privacy.repository.snapshot()).find((item) => item._id === privacyRecord._id)
  await privacy.repository.update(privacyRecord._id, { _openid: 'owner-a', version: privacyStored.version }, {
    cloudPath: 'SENTINEL_CLOUD_PATH', creatorFileId: 'SENTINEL_CREATOR_FILE_ID', reviewFileId: 'SENTINEL_REVIEW_FILE_ID',
    input: { ...privacyStored.input, provenancePageUrl: 'SENTINEL_PROVENANCE_URL' },
  })
  const privateMine = await privacy.call({ mode: 'get_mine', submissionId: privacyRecord._id })
  assert.equal(JSON.stringify(privateMine).includes('SENTINEL_'), false)
  const actionRows = harness()
  const actionReservation = await actionRows.begin()
  const actionRecord = (await actionRows.repository.snapshot()).find((item) => item._id === actionReservation.submissionId)
  const expectedActions = {
    awaiting_upload: ['upload_finalize', 'cancel'],
    processing: ['refresh'],
    pending_review: ['cancel'],
    changes_requested: ['begin_revision', 'cancel'],
    approved_evidence: [],
    rejected: [],
    cancelled: [],
    invalid: [],
  }
  for (const [status, actions] of Object.entries(expectedActions)) {
    const current = (await actionRows.repository.snapshot()).find((item) => item._id === actionRecord._id)
    const rawFileState = status === 'awaiting_upload' ? { upload: 'reserved', review: 'absent' } : { upload: 'deleted', review: 'deleted' }
    await actionRows.repository.update(actionRecord._id, { _openid: 'owner-a', version: current.version }, {
      status, version: current.version + 1, replacementSubmissionId: null, rawFileState,
    })
    const detail = await actionRows.call({ mode: 'get_mine', submissionId: actionRecord._id })
    assert.deepEqual(detail.submission.allowedActions, actions)
  }
  assert.equal(JSON.stringify(finalized).includes('owner-a'), false)
  assert.equal(JSON.stringify(finalized).includes('cloud://'), false)
  const cancelledRevision = await h.call({ mode: 'cancel', submissionId: finalizeRecord._id, expectedVersion: finalized.submission.version })
  assert.equal(cancelledRevision.submission.status, 'cancelled')
  const parentAfterChild = (await h.repository.snapshot()).find((item) => item._id === parent._id)
  assert.equal(parentAfterChild.replacementSubmissionId, null)
  const secondRevision = await h.begin({ beginAttemptId: 'revision-3', revisesSubmissionId: parent._id, title: '再次上传' })
  assert.equal(secondRevision.phase, 'upload_reservation')
  const replayFinal = await h.call({ mode: 'finalize', submissionId: finalizeRecord._id, fileID: creatorFileID })
  assert.equal(replayFinal.submission.status, 'cancelled')
  assert.equal(h.state.readCount, 1)

  const missingBinding = await h.call({ mode: 'finalize', submissionId: finalizeRecord._id, fileID: `cloud://${HOST}/wrong/path.gpx` })
  assert.equal(errorCode(missingBinding), 'upload_binding_invalid')
  assert.equal(h.state.readCount, 1)

  // Upload reservation expiry and post-record deadline zero projection.
  const expiry = harness()
  const reservation = await expiry.begin()
  expiry.advance(31 * 60 * 1000)
  const expiredFinalize = await expiry.call({ mode: 'finalize', submissionId: reservation.submissionId, fileID: `cloud://${HOST}/${reservation.cloudPath}` })
  assert.equal(errorCode(expiredFinalize), 'upload_reservation_expired')
  const expiredDetail = await expiry.call({ mode: 'get_mine', submissionId: reservation.submissionId })
  assert.equal(expiredDetail.phase, 'mine')
  expiry.setNow('2026-09-10T00:00:01.000Z')
  assert.equal(errorCode(await expiry.call({ mode: 'get_mine', submissionId: reservation.submissionId })), 'submission_not_found')
  assert.equal((await expiry.call({ mode: 'list_mine' })).items.length, 0)

  // Actual bounded streaming and GET Content-Length authority are tested at the storage seam.
  {
    async function* stream(chunks) { for (const chunk of chunks) yield Buffer.from(chunk) }
    const expectedTemporaryFileID = `cloud://${HOST}/track-submissions/submission-1/upload.gpx`
    const temporaryCalls = []
    const temporary = createStorageAdapter({
      env: { TRACK_STORAGE_FILEID_HOST: HOST },
      cloud: {
        async getTempFileURL(options) {
          temporaryCalls.push(options)
          return { fileList: [{
            fileID: expectedTemporaryFileID, status: 0, errMsg: 'getTempFileURL:ok', maxAge: 123,
            tempFileURL: 'https://download.example/temporary',
          }] }
        },
      },
    })
    assert.equal(await temporary.getTemporaryUrl(expectedTemporaryFileID, 123), 'https://download.example/temporary')
    assert.deepEqual(temporaryCalls, [{ fileList: [{ fileID: expectedTemporaryFileID, maxAge: 123 }] }])
    for (const result of [
      { fileList: [] },
      { fileList: [{ fileID: 'cloud://other.example.test/x', status: 0, errMsg: 'ok', maxAge: 123, tempFileURL: 'https://download.example/temporary' }] },
      { fileList: [{ fileID: expectedTemporaryFileID, status: 1, errMsg: 'ok', maxAge: 123, tempFileURL: 'https://download.example/temporary' }] },
      { fileList: [{ fileID: expectedTemporaryFileID, status: 0, errMsg: '', maxAge: 123, tempFileURL: 'https://download.example/temporary' }] },
      { fileList: [{ fileID: expectedTemporaryFileID, status: 0, errMsg: 'ok', maxAge: 124, tempFileURL: 'https://download.example/temporary' }] },
      { fileList: [{ fileID: expectedTemporaryFileID, status: 0, errMsg: 'ok', maxAge: 123, tempFileURL: '' }] },
    ]) {
      const malformed = createStorageAdapter({
        env: { TRACK_STORAGE_FILEID_HOST: HOST },
        cloud: { async getTempFileURL() { return result } },
      })
      await assert.rejects(() => malformed.getTemporaryUrl(expectedTemporaryFileID, 123), (error) => error.code === 'storage_unavailable')
    }
    const bounded = await collectBounded({ headers: { 'content-length': '4' }, [Symbol.asyncIterator]: () => stream(['ab', 'cd']) })
    assert.deepEqual(bounded, Buffer.from('abcd'))
    await assert.rejects(() => collectBounded({ headers: { 'content-length': '5' }, [Symbol.asyncIterator]: () => stream(['ab', 'cd']) }), (error) => error.code === 'file_size_invalid')
    await assert.rejects(() => collectBounded({ [Symbol.asyncIterator]: () => stream([Buffer.alloc(10 * 1024 * 1024), Buffer.from('x')]) }), (error) => error.code === 'file_size_invalid')

    let requestCount = 0
    const adapter = createStorageAdapter({
      env: { TRACK_STORAGE_FILEID_HOST: HOST },
      cloud: {
        async getTempFileURL({ fileList }) { return { fileList: [{
          fileID: fileList[0].fileID, status: 0, errMsg: 'getTempFileURL:ok', maxAge: fileList[0].maxAge,
          tempFileURL: 'https://download.example/temporary',
        }] } },
      },
      request: async (_url, method) => {
        requestCount += 1
        if (method === 'HEAD') return { headers: { 'content-length': String(11 * 1024 * 1024) } }
        return { headers: { 'content-length': '4' }, [Symbol.asyncIterator]: () => stream(['abcd']) }
      },
    })
    await assert.rejects(() => adapter.readCreator(`cloud://${HOST}/track-submissions/submission-1/upload.gpx`, 'track-submissions/submission-1/upload.gpx'), (error) => error.code === 'file_size_invalid')
    assert.equal(requestCount, 1)
    const mismatchAdapter = createStorageAdapter({
      env: { TRACK_STORAGE_FILEID_HOST: HOST },
      cloud: {
        async getTempFileURL({ fileList }) { return { fileList: [{
          fileID: fileList[0].fileID, status: 0, errMsg: 'getTempFileURL:ok', maxAge: fileList[0].maxAge,
          tempFileURL: 'https://download.example/temporary',
        }] } },
      },
      request: async (_url, method) => method === 'HEAD'
        ? { headers: {} }
        : { headers: { 'content-length': '5' }, [Symbol.asyncIterator]: () => stream(['abcd']) },
    })
    await assert.rejects(() => mismatchAdapter.readCreator(`cloud://${HOST}/track-submissions/submission-1/upload.gpx`, 'track-submissions/submission-1/upload.gpx'), (error) => error.code === 'file_size_invalid')

    const expectedDeleteFileID = `cloud://${HOST}/track-submissions/submission-1/upload.gpx`
    for (const result of [
      { fileList: [{ fileID: expectedDeleteFileID, status: -1, errMsg: 'ok' }] },
      { fileList: [{ fileID: expectedDeleteFileID, statusCode: 0, errMsg: 'deleteFile:ok' }] },
      { fileList: [{ fileID: 'cloud://other.example.test/track-submissions/submission-1/upload.gpx', status: 0, errMsg: 'ok' }] },
      { fileList: [] },
      {},
    ]) {
      const deleting = createStorageAdapter({
        cloud: { async deleteFile() { return result } },
        env: { TRACK_STORAGE_FILEID_HOST: HOST },
      })
      await assert.rejects(() => deleting.deleteObject(expectedDeleteFileID), (error) => error.code === 'storage_unavailable')
    }
    const deleting = createStorageAdapter({
      cloud: { async deleteFile() { return { fileList: [{ fileID: expectedDeleteFileID, status: 0, errMsg: 'deleteFile:ok' }] } } },
      env: { TRACK_STORAGE_FILEID_HOST: HOST },
    })
    assert.equal(await deleting.deleteObject(expectedDeleteFileID), true)
    const absent = createStorageAdapter({
      cloud: { async deleteFile() { return { fileList: [{ fileID: expectedDeleteFileID, status: -503003, errMsg: 'deleteFile:fail storage file not exists' }] } } },
      env: { TRACK_STORAGE_FILEID_HOST: HOST },
    })
    assert.equal(await absent.deleteObject(expectedDeleteFileID), true)
  }

  // Fresh processing lease returns refresh; stale lease can be taken over.
  {
    const lease = harness()
    const reservationLease = await lease.begin()
    const record = (await lease.repository.snapshot()).find((item) => item._id === reservationLease.submissionId)
    lease.state.readGate = deferred()
    const firstFinalize = lease.call({ mode: 'finalize', submissionId: record._id, fileID: `cloud://${HOST}/${record.cloudPath}` })
    await new Promise((resolve) => setImmediate(resolve))
    const fresh = await lease.call({ mode: 'finalize', submissionId: record._id, fileID: `cloud://${HOST}/${record.cloudPath}` })
    assert.equal(errorCode(fresh), 'processing_in_progress')
    lease.advance(6 * 60 * 1000)
    const takeoverPromise = lease.call({ mode: 'finalize', submissionId: record._id, fileID: `cloud://${HOST}/${record.cloudPath}` })
    await new Promise((resolve) => setImmediate(resolve))
    lease.state.readGate.resolve()
    const [firstResult, takeover] = await Promise.all([firstFinalize, takeoverPromise])
    assert.equal(['mine', 'error'].includes(firstResult.phase), true)
    assert.equal(['mine', 'error'].includes(takeover.phase), true)
    assert.equal(lease.state.readCount >= 2, true)
  }

  // Parser failures become invalid and cleanup is honest; CAS conflict returns retryable conflict.
  {
    const unavailable = harness()
    const reservationUnavailable = await unavailable.begin()
    const unavailableRecord = (await unavailable.repository.snapshot()).find((item) => item._id === reservationUnavailable.submissionId)
    unavailable.state.readError = new StorageAdapterError('storage_unavailable', 'temporary read outage')
    const storageFailure = await unavailable.call({ mode: 'finalize', submissionId: unavailableRecord._id, fileID: `cloud://${HOST}/${unavailableRecord.cloudPath}` })
    assert.equal(errorCode(storageFailure), 'storage_unavailable')
    const resetRecord = (await unavailable.repository.snapshot()).find((item) => item._id === unavailableRecord._id)
    assert.equal(resetRecord.status, 'awaiting_upload')
    assert.equal(resetRecord.summary, null)

    const bad = harness({ bytes: Buffer.from(`<gpx xmlns="${GPX_NS}"><trk><trkseg><trkpt lat="30" lon="100"></trkseg></trk></gpx>`) })
    const reservationBad = await bad.begin()
    const badRecord = (await bad.repository.snapshot()).find((item) => item._id === reservationBad.submissionId)
    const badResult = await bad.call({ mode: 'finalize', submissionId: badRecord._id, fileID: `cloud://${HOST}/${badRecord.cloudPath}` })
    assert.equal(errorCode(badResult), 'xml_invalid')
    const badMine = await bad.call({ mode: 'get_mine', submissionId: badRecord._id })
    assert.equal(badMine.submission.status, 'invalid')
    assert.deepEqual(badMine.submission.allowedActions, [])
    const conflict = harness()
    const conflictReservation = await conflict.begin()
    const conflictRecord = (await conflict.repository.snapshot()).find((item) => item._id === conflictReservation.submissionId)
    const originalUpdate = conflict.repository.update
    conflict.repository.update = async (id, conditions, patch) => {
      if (patch && patch.status === 'pending_review') return null
      return originalUpdate(id, conditions, patch)
    }
    const conflictResult = await conflict.call({ mode: 'finalize', submissionId: conflictRecord._id, fileID: `cloud://${HOST}/${conflictRecord.cloudPath}` })
    assert.equal(errorCode(conflictResult), 'version_conflict')

    const parserCas = harness()
    const parserCasReservation = await parserCas.begin()
    const parserCasRecord = (await parserCas.repository.snapshot()).find((item) => item._id === parserCasReservation.submissionId)
    parserCas.state.parserError = new StorageAdapterError('malformed_xml', 'invalid')
    const parserCasUpdate = parserCas.repository.update
    parserCas.repository.update = async (id, conditions, patch) => {
      if (patch && patch.status === 'invalid') return null
      return parserCasUpdate(id, conditions, patch)
    }
    const parserCasResult = await parserCas.call({ mode: 'finalize', submissionId: parserCasRecord._id, fileID: `cloud://${HOST}/${parserCasRecord.cloudPath}` })
    assert.equal(errorCode(parserCasResult), 'version_conflict')
    assert.equal(parserCas.state.deleteCount, 0)

    const resetCas = harness()
    const resetReservation = await resetCas.begin()
    const resetCasRecord = (await resetCas.repository.snapshot()).find((item) => item._id === resetReservation.submissionId)
    resetCas.state.readError = new StorageAdapterError('storage_unavailable', 'temporary read outage')
    const resetCasUpdate = resetCas.repository.update
    resetCas.repository.update = async (id, conditions, patch) => {
      if (patch && patch.status === 'awaiting_upload') return null
      return resetCasUpdate(id, conditions, patch)
    }
    const resetCasResult = await resetCas.call({ mode: 'finalize', submissionId: resetCasRecord._id, fileID: `cloud://${HOST}/${resetCasRecord.cloudPath}` })
    assert.equal(errorCode(resetCasResult), 'store_unavailable')
    assert.equal((await resetCas.repository.snapshot()).find((item) => item._id === resetCasRecord._id).status, 'processing')

    const parserCleanupCas = harness()
    const parserCleanupReservation = await parserCleanupCas.begin()
    const parserCleanupRecord = (await parserCleanupCas.repository.snapshot()).find((item) => item._id === parserCleanupReservation.submissionId)
    parserCleanupCas.state.parserError = new StorageAdapterError('malformed_xml', 'invalid')
    const parserCleanupUpdate = parserCleanupCas.repository.update
    parserCleanupCas.repository.update = async (id, conditions, patch) => {
      if (patch && patch.rawFileState && patch.status === undefined) return null
      return parserCleanupUpdate(id, conditions, patch)
    }
    const parserCleanupResult = await parserCleanupCas.call({ mode: 'finalize', submissionId: parserCleanupRecord._id, fileID: `cloud://${HOST}/${parserCleanupRecord.cloudPath}` })
    assert.equal(errorCode(parserCleanupResult), 'store_unavailable')
    assert.equal(parserCleanupCas.state.deleteCount, 2)
  }

  // Cancellation, races and deletion-pending retry.
  {
    const cancel = harness()
    const reservationCancel = await cancel.begin()
    const cancelRecord = (await cancel.repository.snapshot()).find((item) => item._id === reservationCancel.submissionId)
    cancel.state.deleteFailures = 1
    const cancelled = await cancel.call({ mode: 'cancel', submissionId: cancelRecord._id, expectedVersion: 1 })
    assert.equal(cancelled.submission.status, 'cancelled')
    assert.equal(cancelled.submission.cleanup.pending, true)
    assert.deepEqual(cancel.state.deletedFileIds, [`cloud://${HOST}/${reservationCancel.cloudPath}`])
    const cancelledRetry = await cancel.call({ mode: 'cancel', submissionId: cancelRecord._id, expectedVersion: cancelled.submission.version })
    assert.equal(cancelledRetry.submission.cleanup.pending, false)
    assert.deepEqual(cancel.state.deletedFileIds, [`cloud://${HOST}/${reservationCancel.cloudPath}`, `cloud://${HOST}/${reservationCancel.cloudPath}`])
    // A finalized object uses the recorded creator fileID rather than deriving a new path.
    const retryCleanup = harness()
    const reservationCleanup = await retryCleanup.begin()
    const cleanupRecord = (await retryCleanup.repository.snapshot()).find((item) => item._id === reservationCleanup.submissionId)
    const cleanFileID = `cloud://${HOST}/${cleanupRecord.cloudPath}`
    await retryCleanup.call({ mode: 'finalize', submissionId: cleanupRecord._id, fileID: cleanFileID })
    const storedCleanup = (await retryCleanup.repository.snapshot()).find((item) => item._id === cleanupRecord._id)
    retryCleanup.state.deleteFailures = 1
    const cancelledCleanup = await retryCleanup.call({ mode: 'cancel', submissionId: storedCleanup._id, expectedVersion: storedCleanup.version })
    assert.equal(cancelledCleanup.submission.status, 'cancelled')
    assert.equal(cancelledCleanup.submission.cleanup.pending, true)
    assert.deepEqual(cancelledCleanup.submission.allowedActions, ['retry_cleanup'])
    const retried = await retryCleanup.call({ mode: 'cancel', submissionId: storedCleanup._id, expectedVersion: cancelledCleanup.submission.version })
    assert.equal(retried.submission.cleanup.pending, false)
    assert.deepEqual(retried.submission.allowedActions, [])
    assert.equal((await retryCleanup.call({ mode: 'cancel', submissionId: storedCleanup._id, expectedVersion: 1 })).submission.status, 'cancelled')
  }

  // Terminal cleanup marks pending before deletion and replays only pending targets.
  {
    const finalizeReplay = harness()
    const finalizeReservation = await finalizeReplay.begin()
    const finalizeRecord = (await finalizeReplay.repository.snapshot()).find((item) => item._id === finalizeReservation.submissionId)
    const originalFinalizeUpdate = finalizeReplay.repository.update
    let failFinalizeCleanup = true
    finalizeReplay.repository.update = async (id, conditions, patch) => {
      if (failFinalizeCleanup && patch && patch.rawFileState && patch.status === undefined) {
        failFinalizeCleanup = false
        return null
      }
      return originalFinalizeUpdate(id, conditions, patch)
    }
    const finalizeFirst = await finalizeReplay.call({ mode: 'finalize', submissionId: finalizeRecord._id, fileID: `cloud://${HOST}/${finalizeRecord.cloudPath}` })
    assert.equal(errorCode(finalizeFirst), 'store_unavailable')
    const finalizePending = (await finalizeReplay.repository.snapshot()).find((item) => item._id === finalizeRecord._id)
    assert.equal(finalizePending.status, 'pending_review')
    assert.equal(finalizePending.rawFileState.upload, 'deletion_pending')
    assert.equal(finalizePending.rawFileState.review, 'present')
    assert.equal(finalizePending.version, 3)
    assert.equal(finalizeReplay.state.parsedBytes.length, 1)
    assert.equal(finalizeReplay.state.deleteCount, 1)
    const finalizeSecond = await finalizeReplay.call({ mode: 'finalize', submissionId: finalizeRecord._id, fileID: `cloud://${HOST}/${finalizeRecord.cloudPath}` })
    assert.equal(finalizeSecond.phase, 'mine')
    assert.equal(finalizeSecond.submission.status, 'pending_review')
    assert.equal(finalizeReplay.state.parsedBytes.length, 1)
    assert.equal(finalizeReplay.state.deleteCount, 2)
    const finalizeClean = (await finalizeReplay.repository.snapshot()).find((item) => item._id === finalizeRecord._id)
    assert.equal(finalizeClean.rawFileState.upload, 'deleted')
    assert.equal(finalizeClean.rawFileState.review, 'present')
    assert.equal(finalizeClean.version, 4)

    const parserReplay = harness()
    const parserReservation = await parserReplay.begin()
    const parserRecord = (await parserReplay.repository.snapshot()).find((item) => item._id === parserReservation.submissionId)
    parserReplay.state.parserError = new StorageAdapterError('malformed_xml', 'invalid')
    const originalParserUpdate = parserReplay.repository.update
    let throwParserCleanup = true
    parserReplay.repository.update = async (id, conditions, patch) => {
      if (throwParserCleanup && patch && patch.rawFileState && patch.status === undefined) {
        throwParserCleanup = false
        throw new Error('cleanup CAS unavailable')
      }
      return originalParserUpdate(id, conditions, patch)
    }
    const parserFirst = await parserReplay.call({ mode: 'finalize', submissionId: parserRecord._id, fileID: `cloud://${HOST}/${parserRecord.cloudPath}` })
    assert.equal(errorCode(parserFirst), 'store_unavailable')
    const parserPending = (await parserReplay.repository.snapshot()).find((item) => item._id === parserRecord._id)
    assert.equal(parserPending.status, 'invalid')
    assert.equal(parserPending.rawFileState.upload, 'deletion_pending')
    assert.equal(parserPending.rawFileState.review, 'deletion_pending')
    assert.equal(parserPending.version, 3)
    assert.equal(parserReplay.state.parsedBytes.length, 1)
    assert.equal(parserReplay.state.deleteCount, 2)
    const parserSecond = await parserReplay.call({ mode: 'finalize', submissionId: parserRecord._id, fileID: `cloud://${HOST}/${parserRecord.cloudPath}` })
    assert.equal(parserSecond.phase, 'mine')
    assert.equal(parserSecond.submission.status, 'invalid')
    assert.equal(parserReplay.state.parsedBytes.length, 1)
    assert.equal(parserReplay.state.deleteCount, 4)
    const parserClean = (await parserReplay.repository.snapshot()).find((item) => item._id === parserRecord._id)
    assert.equal(parserClean.rawFileState.upload, 'deleted')
    assert.equal(parserClean.rawFileState.review, 'deleted')
    assert.equal(parserClean.version, 4)

    const cancelReplay = harness()
    const cancelReservation = await cancelReplay.begin()
    const cancelRecord = (await cancelReplay.repository.snapshot()).find((item) => item._id === cancelReservation.submissionId)
    const originalCancelUpdate = cancelReplay.repository.update
    let failCancelCleanup = true
    cancelReplay.repository.update = async (id, conditions, patch) => {
      if (failCancelCleanup && patch && patch.rawFileState && patch.status === undefined) {
        failCancelCleanup = false
        return null
      }
      return originalCancelUpdate(id, conditions, patch)
    }
    const cancelFirst = await cancelReplay.call({ mode: 'cancel', submissionId: cancelRecord._id, expectedVersion: 1 })
    assert.equal(errorCode(cancelFirst), 'store_unavailable')
    const cancelPending = (await cancelReplay.repository.snapshot()).find((item) => item._id === cancelRecord._id)
    assert.equal(cancelPending.status, 'cancelled')
    assert.equal(cancelPending.rawFileState.upload, 'deletion_pending')
    assert.equal(cancelPending.version, 2)
    assert.equal(cancelReplay.state.deleteCount, 1)
    const cancelSecond = await cancelReplay.call({ mode: 'cancel', submissionId: cancelRecord._id, expectedVersion: 1 })
    assert.equal(cancelSecond.phase, 'mine')
    assert.equal(cancelReplay.state.deleteCount, 2)
    const cancelClean = (await cancelReplay.repository.snapshot()).find((item) => item._id === cancelRecord._id)
    assert.equal(cancelClean.rawFileState.upload, 'deleted')
    assert.equal(cancelClean.version, 3)

    const fullyClean = harness()
    const fullyCleanReservation = await fullyClean.begin()
    const fullyCleanRecord = (await fullyClean.repository.snapshot()).find((item) => item._id === fullyCleanReservation.submissionId)
    const fullyCleanFinal = await fullyClean.call({ mode: 'finalize', submissionId: fullyCleanRecord._id, fileID: `cloud://${HOST}/${fullyCleanRecord.cloudPath}` })
    const fullyCleanStored = (await fullyClean.repository.snapshot()).find((item) => item._id === fullyCleanRecord._id)
    const fullyCleanCancel = await fullyClean.call({ mode: 'cancel', submissionId: fullyCleanRecord._id, expectedVersion: fullyCleanStored.version })
    const beforeReplay = (await fullyClean.repository.snapshot()).find((item) => item._id === fullyCleanRecord._id)
    const deleteCountBeforeReplay = fullyClean.state.deleteCount
    const originalFullyCleanUpdate = fullyClean.repository.update
    let updateCountAfterCleanReplay = 0
    fullyClean.repository.update = async (...args) => {
      updateCountAfterCleanReplay += 1
      return originalFullyCleanUpdate(...args)
    }
    const fullyCleanReplay = await fullyClean.call({ mode: 'cancel', submissionId: fullyCleanRecord._id, expectedVersion: 1 })
    assert.equal(fullyCleanReplay.phase, 'mine')
    assert.equal(fullyClean.state.deleteCount, deleteCountBeforeReplay)
    assert.equal(updateCountAfterCleanReplay, 0)
    const afterReplay = (await fullyClean.repository.snapshot()).find((item) => item._id === fullyCleanRecord._id)
    assert.deepEqual(afterReplay.rawFileState, beforeReplay.rawFileState)
    assert.equal(afterReplay.version, beforeReplay.version)
    assert.equal(fullyCleanCancel.submission.status, 'cancelled')
    assert.equal(fullyCleanFinal.submission.status, 'pending_review')
  }

  // Cursor strict seek/order, limit validation and expiry filtering.
  {
    const pages = harness()
    const a = await pages.begin({ beginAttemptId: 'a', title: '轨迹甲' })
    pages.advance(1000)
    const b = await pages.begin({ beginAttemptId: 'b', title: '轨迹乙' })
    pages.advance(1000)
    const c = await pages.begin({ beginAttemptId: 'c', title: '轨迹丙' })
    const firstPage = await pages.call({ mode: 'list_mine', limit: 2 })
    assert.equal(firstPage.items.length, 2)
    assert.equal(firstPage.nextCursor !== null, true)
    const secondPage = await pages.call({ mode: 'list_mine', limit: 2, cursor: firstPage.nextCursor })
    assert.equal(secondPage.items.length, 1)
    assert.equal(new Set([...firstPage.items, ...secondPage.items].map((item) => item.submissionId)).size, 3)
    assert.equal(errorCode(await pages.call({ mode: 'list_mine', limit: 0 })), 'invalid_input')
    assert.equal(errorCode(await pages.call({ mode: 'list_mine', cursor: '%%%'})), 'invalid_cursor')
    pages.setNow('2026-09-10T00:00:00.000Z')
    assert.equal((await pages.call({ mode: 'list_mine' })).items.length, 0)
    assert.equal(a.submissionId !== b.submissionId && b.submissionId !== c.submissionId, true)

    const seekRows = await pages.repository.list('owner-a', new Date('2026-08-09T00:00:02.000Z'), {
      cursor: { updatedAt: new Date('2026-08-09T00:00:01.000Z').toISOString(), submissionId: b.submissionId },
      limit: 1,
    })
    assert.equal(seekRows.length <= 2, true)
    assert.equal(seekRows.every((record) => new Date(record.updatedAt).getTime() < Date.parse('2026-08-09T00:00:01.000Z')
      || (new Date(record.updatedAt).getTime() === Date.parse('2026-08-09T00:00:01.000Z') && record._id < b.submissionId)), true)
  }

  // The stable review path requires a separately verifiable hard timeout below the lease.
  {
    assert.equal(REVIEW_PATH_FUNCTION_TIMEOUT_SECONDS, 240)
    assert.equal(PROCESSING_LEASE_SECONDS, 300)
    assert.equal(fixedReviewPathTimeoutIsSafe(REVIEW_PATH_FUNCTION_TIMEOUT_SECONDS, PROCESSING_LEASE_SECONDS), true)
    assert.equal(fixedReviewPathTimeoutIsSafe(REVIEW_PATH_FUNCTION_TIMEOUT_SECONDS + 1, PROCESSING_LEASE_SECONDS), false)
    assert.equal(fixedReviewPathTimeoutIsSafe(300, 300), false)
  }

  // Cancelling before finalize derives the reserved creator object from trusted host/path.
  {
    const uploaded = harness()
    const reservation = await uploaded.begin()
    const expectedCreatorFileId = `cloud://${HOST}/${reservation.cloudPath}`
    const cancelled = await uploaded.call({ mode: 'cancel', submissionId: reservation.submissionId, expectedVersion: 1 })
    assert.equal(cancelled.submission.cleanup.pending, false)
    assert.equal(cancelled.submission.version, 3)
    assert.deepEqual(uploaded.state.deletedFileIds, [expectedCreatorFileId])

    const failed = harness()
    const failedReservation = await failed.begin()
    failed.state.deleteFailures = 1
    const failedCancel = await failed.call({ mode: 'cancel', submissionId: failedReservation.submissionId, expectedVersion: 1 })
    assert.equal(failedCancel.submission.cleanup.pending, true)
    assert.deepEqual(failed.state.deletedFileIds, [`cloud://${HOST}/${failedReservation.cloudPath}`])
    const retried = await failed.call({ mode: 'cancel', submissionId: failedReservation.submissionId, expectedVersion: failedCancel.submission.version })
    assert.equal(retried.submission.cleanup.pending, false)
    assert.equal(retried.submission.version, failedCancel.submission.version + 1)
    assert.deepEqual(failed.state.deletedFileIds, [`cloud://${HOST}/${failedReservation.cloudPath}`, `cloud://${HOST}/${failedReservation.cloudPath}`])
  }

  // Cleanup-state writes are CAS-protected; a lost write never returns a false Mine projection.
  {
    const finalizeCas = harness()
    const finalizeCasReservation = await finalizeCas.begin()
    const finalizeCasRecord = (await finalizeCas.repository.snapshot()).find((item) => item._id === finalizeCasReservation.submissionId)
    const finalizeCasUpdate = finalizeCas.repository.update
    finalizeCas.repository.update = async (id, conditions, patch) => {
      if (patch && patch.rawFileState && !patch.reviewSnapshotAt) return null
      return finalizeCasUpdate(id, conditions, patch)
    }
    const finalizeCasResult = await finalizeCas.call({ mode: 'finalize', submissionId: finalizeCasRecord._id, fileID: `cloud://${HOST}/${finalizeCasRecord.cloudPath}` })
    assert.equal(errorCode(finalizeCasResult), 'store_unavailable')
    assert.equal(finalizeCas.state.deleteCount, 1)

    const cancelCas = harness()
    const cancelCasReservation = await cancelCas.begin()
    const cancelCasRecord = (await cancelCas.repository.snapshot()).find((item) => item._id === cancelCasReservation.submissionId)
    await cancelCas.call({ mode: 'finalize', submissionId: cancelCasRecord._id, fileID: `cloud://${HOST}/${cancelCasRecord.cloudPath}` })
    const cancelCasStored = (await cancelCas.repository.snapshot()).find((item) => item._id === cancelCasRecord._id)
    const cancelCasUpdate = cancelCas.repository.update
    cancelCas.repository.update = async (id, conditions, patch) => {
      if (patch && patch.rawFileState && patch.status === undefined) return null
      return cancelCasUpdate(id, conditions, patch)
    }
    const cancelCasResult = await cancelCas.call({ mode: 'cancel', submissionId: cancelCasRecord._id, expectedVersion: cancelCasStored.version })
    assert.equal(errorCode(cancelCasResult), 'store_unavailable')
  }

  // A revision child terminal transition and parent unlock are one repository transaction.
  {
    const revisionCancel = harness()
    const parentReservation = await revisionCancel.begin({ beginAttemptId: 'parent-atomic' })
    const parentRecord = (await revisionCancel.repository.snapshot()).find((item) => item._id === parentReservation.submissionId)
    await revisionCancel.repository.update(parentRecord._id, { status: 'awaiting_upload', version: parentRecord.version }, {
      status: 'changes_requested', version: parentRecord.version + 1,
    })
    const childReservation = await revisionCancel.begin({ beginAttemptId: 'child-atomic', revisesSubmissionId: parentRecord._id })
    const childRecord = (await revisionCancel.repository.snapshot()).find((item) => item._id === childReservation.submissionId)
    const originalTransition = revisionCancel.repository.transitionRevisionTerminal
    revisionCancel.repository.transitionRevisionTerminal = async () => null
    const atomicFailure = await revisionCancel.call({ mode: 'cancel', submissionId: childRecord._id, expectedVersion: childRecord.version })
    assert.equal(errorCode(atomicFailure), 'version_conflict')
    assert.equal(revisionCancel.state.deleteCount, 0)
    assert.equal((await revisionCancel.repository.get(parentRecord._id)).replacementSubmissionId, childRecord._id)
    revisionCancel.repository.transitionRevisionTerminal = originalTransition
    const atomicSuccess = await revisionCancel.call({ mode: 'cancel', submissionId: childRecord._id, expectedVersion: childRecord.version })
    assert.equal(atomicSuccess.submission.status, 'cancelled')
    assert.equal((await revisionCancel.repository.get(parentRecord._id)).replacementSubmissionId, null)

    const revisionParser = harness()
    const parserParentReservation = await revisionParser.begin({ beginAttemptId: 'parser-parent' })
    const parserParent = (await revisionParser.repository.snapshot()).find((item) => item._id === parserParentReservation.submissionId)
    await revisionParser.repository.update(parserParent._id, { status: 'awaiting_upload', version: parserParent.version }, {
      status: 'changes_requested', version: parserParent.version + 1,
    })
    const parserChildReservation = await revisionParser.begin({ beginAttemptId: 'parser-child', revisesSubmissionId: parserParent._id })
    const parserChild = (await revisionParser.repository.snapshot()).find((item) => item._id === parserChildReservation.submissionId)
    revisionParser.state.parserError = new StorageAdapterError('malformed_xml', 'invalid')
    const parserTransition = revisionParser.repository.transitionRevisionTerminal
    revisionParser.repository.transitionRevisionTerminal = async () => null
    const parserAtomicFailure = await revisionParser.call({ mode: 'finalize', submissionId: parserChild._id, fileID: `cloud://${HOST}/${parserChild.cloudPath}` })
    assert.equal(errorCode(parserAtomicFailure), 'version_conflict')
    assert.equal(revisionParser.state.deleteCount, 0)
    assert.equal((await revisionParser.repository.get(parserParent._id)).replacementSubmissionId, parserChild._id)
    revisionParser.repository.transitionRevisionTerminal = parserTransition

    const replay = harness()
    const replayParentReservation = await replay.begin({ beginAttemptId: 'parent-replay' })
    const replayParent = (await replay.repository.snapshot()).find((item) => item._id === replayParentReservation.submissionId)
    await replay.repository.update(replayParent._id, { status: 'awaiting_upload', version: replayParent.version }, {
      status: 'changes_requested', version: replayParent.version + 1,
    })
    const replayChildReservation = await replay.begin({ beginAttemptId: 'child-replay', revisesSubmissionId: replayParent._id })
    const replayChild = (await replay.repository.snapshot()).find((item) => item._id === replayChildReservation.submissionId)
    await replay.repository.update(replayChild._id, { status: 'awaiting_upload', version: replayChild.version }, {
      status: 'cancelled', version: replayChild.version + 1,
    })
    const replayed = await replay.call({ mode: 'cancel', submissionId: replayChild._id, expectedVersion: 1 })
    assert.equal(replayed.submission.status, 'cancelled')
    assert.equal((await replay.repository.get(replayParent._id)).replacementSubmissionId, null)
  }

  // Handler and CloudBase seams observe server identity, owner/expiry seek, CAS and transactions.
  {
    const calls = []
    const handler = createTrackSubmissionHandler({
      cloudSdk: { getWXContext() { return { OPENID: 'server-owner' } } },
      service: {
        async handle(event, openid) {
          calls.push({ event, openid })
          return { phase: 'mine_list', openid, forged: event._openid || null }
        },
      },
    })
    const handlerResult = await handler({ mode: 'list_mine', _openid: 'forged-client-owner' })
    assert.equal(handlerResult.openid, 'server-owner')
    assert.equal(handlerResult.forged, 'forged-client-owner')
    assert.equal(calls[0].openid, 'server-owner')

    const queryCalls = []
    const records = {
      child: { _id: 'child', _openid: 'server-owner', status: 'processing', version: 1, revisesSubmissionId: 'parent', processing: { leaseId: 'lease-1' } },
      parent: { _id: 'parent', _openid: 'server-owner', status: 'changes_requested', version: 4, replacementSubmissionId: 'child' },
    }
    const command = {
      gt: (value) => ({ $gt: value }),
      lt: (value) => ({ $lt: value }),
      or: (...expressions) => ({ $or: expressions }),
      and: (...expressions) => ({ $and: expressions }),
    }
    let transactionActive = false
    let transactionCalls = 0
    let transactionUpdateCount = 0
    let failTransactionUpdateAt = null
    function makeCollection(state, inTransaction) {
      return {
        where(condition) {
          queryCalls.push({ type: 'where', condition, transaction: inTransaction })
          const query = {
            orderBy(field, direction) { queryCalls.push({ type: 'orderBy', field, direction, transaction: inTransaction }); return query },
            limit(value) { queryCalls.push({ type: 'limit', value, transaction: inTransaction }); return query },
            async get() { return { data: [] } },
            async update({ data }) {
              if (!inTransaction && transactionActive) throw new Error('transaction token required')
              if (inTransaction) throw new Error('transaction query update forbidden')
              queryCalls.push({ type: 'update', data, condition, transaction: inTransaction })
              if (inTransaction) {
                transactionUpdateCount += 1
                if (failTransactionUpdateAt === transactionUpdateCount) return { stats: { updated: 0 } }
              }
              const id = condition._id
              if (!id || !state[id]) return { stats: { updated: 0 } }
              Object.assign(state[id], data)
              return { stats: { updated: 1 } }
            },
          }
          return query
        },
        async add({ data }) {
          if (!inTransaction && transactionActive) throw new Error('transaction token required')
          queryCalls.push({ type: 'add', data, transaction: inTransaction })
          if (inTransaction) {
            transactionUpdateCount += 1
            if (failTransactionUpdateAt === transactionUpdateCount) throw new Error('staged add failed')
          }
          if (state[data._id]) throw new Error('duplicate')
          state[data._id] = structuredClone(data)
          return { _id: data._id }
        },
        doc(id) {
          return {
            async get() { queryCalls.push({ type: 'doc.get', id, transaction: inTransaction }); return { data: state[id] || null } },
            async update({ data }) {
              if (!inTransaction && transactionActive) throw new Error('transaction token required')
              queryCalls.push({ type: 'doc.update', id, data, transaction: inTransaction })
              if (inTransaction) {
                transactionUpdateCount += 1
                if (failTransactionUpdateAt === transactionUpdateCount) return { stats: { updated: 0 } }
              }
              if (!state[id]) return { stats: { updated: 0 } }
              Object.assign(state[id], data)
              return { stats: { updated: 1 } }
            },
          }
        },
      }
    }
    const collection = makeCollection(records, false)
    const db = {
      command,
      collection() { return collection },
      async runTransaction(callback) {
        transactionCalls += 1
        const staged = structuredClone(records)
        transactionActive = true
        transactionUpdateCount = 0
        try {
          const result = await callback({ token: Symbol('transaction-token'), collection() { return makeCollection(staged, true) } })
          Object.keys(records).forEach((key) => delete records[key])
          Object.assign(records, staged)
          return result
        } finally {
          transactionActive = false
        }
      },
    }
    await assert.rejects(
      () => db.runTransaction(async () => db.collection().where({ _id: 'parent' }).update({ data: { replacementSubmissionId: 'direct-bypass' } })),
      /transaction token/,
    )
    await assert.rejects(
      () => db.runTransaction(async (transaction) => transaction.collection('track_submissions').where({ _id: 'parent' }).update({ data: { replacementSubmissionId: 'query-bypass' } })),
      /transaction query update forbidden/,
    )
    const cloudRepository = createCloudBaseRepository({ db })
    const realShapeCommand = {
      gt: (value) => ({ operator: 'gt', operands: [value] }),
      lt: (value) => ({ operator: 'lt', operands: [value] }),
      lte: (value) => ({ operator: 'lte', operands: [value] }),
      or: (...expressions) => ({ operator: 'or', operands: expressions }),
      and: (...expressions) => ({ operator: 'and', operands: expressions }),
    }
    const realShapeRepository = createCloudBaseRepository({ db, command: realShapeCommand })
    queryCalls.length = 0
    await cloudRepository.findByAttempt('server-owner', 'attempt-lookup')
    const attemptWhere = queryCalls.find((entry) => entry.type === 'where').condition
    assert.deepEqual(attemptWhere, { _openid: 'server-owner', beginAttemptId: 'attempt-lookup' })
    assert.equal(queryCalls.find((entry) => entry.type === 'limit').value, 1)
    queryCalls.length = 0
    await cloudRepository.list('server-owner', new Date('2026-08-09T00:00:00.000Z'), {
      cursor: { updatedAt: '2026-08-08T00:00:00.000Z', submissionId: 'cursor-id' },
      limit: 2,
    })
    const listWhere = queryCalls.find((entry) => entry.type === 'where').condition
    assert.equal(listWhere.$and[0]._openid, 'server-owner')
    assert.equal(listWhere.$and[0].recordExpiresAt.$gt instanceof Date, true)
    assert.equal(Array.isArray(listWhere.$and[1].$or), true)
    assert.deepEqual(listWhere.$and[1].$or[0].updatedAt.$lt, new Date('2026-08-08T00:00:00.000Z'))
    assert.deepEqual(listWhere.$and[1].$or[1].updatedAt, new Date('2026-08-08T00:00:00.000Z'))
    assert.deepEqual(listWhere.$and[1].$or[1]._id.$lt, 'cursor-id')
    assert.deepEqual(queryCalls.filter((entry) => entry.type === 'orderBy').map(({ field, direction }) => ({ field, direction })), [
      { field: 'updatedAt', direction: 'desc' },
      { field: '_id', direction: 'desc' },
    ])
    assert.equal(queryCalls.find((entry) => entry.type === 'limit').value, 3)

    // The pinned CloudBase SDK represents gt as a command object, not a local {$gt: value} predicate.
    records['real-shape-parent'] = {
      _id: 'real-shape-parent', _openid: 'server-owner', status: 'changes_requested', version: 1,
      replacementSubmissionId: null, recordExpiresAt: new Date('2026-08-10T00:00:00.000Z'),
    }
    const realShapeChild = {
      _id: 'real-shape-child', _openid: 'server-owner', beginAttemptId: 'real-shape-attempt',
      status: 'awaiting_upload', version: 1, revisesSubmissionId: 'real-shape-parent',
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
    }
    const realShapeInsert = await realShapeRepository.insertRevision(
      'real-shape-parent', 'server-owner', realShapeChild, new Date('2026-08-09T00:00:00.000Z'),
    )
    assert.deepEqual(realShapeInsert, realShapeChild)

    queryCalls.length = 0
    await cloudRepository.update('child', { _openid: 'server-owner', status: 'processing', version: 1 }, { status: 'pending_review' })
    const updateWhere = queryCalls.filter((entry) => entry.type === 'where').at(-1).condition
    assert.equal(updateWhere._openid, 'server-owner')
    assert.equal(updateWhere.status, 'processing')
    assert.equal(updateWhere.version, 1)
    records.child.status = 'processing'
    queryCalls.length = 0
    const transition = await cloudRepository.transitionRevisionTerminal('child', 'server-owner', {
      _openid: 'server-owner', status: 'processing', version: 1, 'processing.leaseId': 'lease-1',
    }, { status: 'invalid', version: 2 }, new Date('2026-08-09T00:00:00.000Z'))
    assert.deepEqual(queryCalls.filter((entry) => entry.type === 'doc.get' && entry.transaction).map((entry) => entry.id), ['child', 'parent'])
    assert.deepEqual(queryCalls.filter((entry) => entry.type === 'doc.update').map((entry) => ({ id: entry.id, data: entry.data })), [
      { id: 'child', data: { status: 'invalid', version: 2 } },
      { id: 'parent', data: { replacementSubmissionId: null, version: 5, updatedAt: new Date('2026-08-09T00:00:00.000Z') } },
    ])
    assert.equal(queryCalls.some((entry) => entry.type === 'update' && entry.transaction), false)
    assert.equal(transition.child.status, 'invalid')
    assert.equal(records.parent.replacementSubmissionId, null)
    assert.equal(records.parent.version, 5)

    records.parent = {
      _id: 'parent', _openid: 'server-owner', status: 'changes_requested', version: 5, replacementSubmissionId: null,
      recordExpiresAt: new Date('2026-08-10T00:00:00.000Z'),
    }
    delete records['child-new']
    const insertedChild = {
      _id: 'child-new', _openid: 'server-owner', beginAttemptId: 'attempt-child', status: 'awaiting_upload', version: 1,
      revisesSubmissionId: 'parent', createdAt: new Date('2026-08-09T00:00:00.000Z'),
    }
    queryCalls.length = 0
    const beforeInsertTransactions = transactionCalls
    const revisionNow = new Date('2026-08-09T00:00:00.000Z')
    const inserted = await cloudRepository.insertRevision('parent', 'server-owner', insertedChild, revisionNow)
    assert.equal(transactionCalls, beforeInsertTransactions + 1)
    assert.deepEqual(inserted, insertedChild)
    assert.equal(records.parent.replacementSubmissionId, 'child-new')
    assert.equal(records.parent.version, 6)
    assert.equal(queryCalls.some((entry) => entry.type === 'where' && entry.transaction), false)
    assert.deepEqual(queryCalls.find((entry) => entry.type === 'doc.update').data, {
      replacementSubmissionId: 'child-new', version: 6, updatedAt: insertedChild.createdAt,
    })
    assert.deepEqual(queryCalls.find((entry) => entry.type === 'add').data, insertedChild)

    records.parent = {
      _id: 'parent', _openid: 'server-owner', status: 'changes_requested', version: 7, replacementSubmissionId: null,
      recordExpiresAt: revisionNow,
    }
    const expiredChild = { ...insertedChild, _id: 'expired-child', beginAttemptId: 'expired-attempt' }
    const beforeExpiredRevision = structuredClone(records)
    queryCalls.length = 0
    const expiredInsert = await cloudRepository.insertRevision('parent', 'server-owner', expiredChild, revisionNow)
    assert.equal(expiredInsert, null)
    assert.deepEqual(records, beforeExpiredRevision)
    assert.equal(queryCalls.some((entry) => entry.type === 'update' || entry.type === 'add'), false)

    records.parent = {
      _id: 'parent', _openid: 'server-owner', status: 'changes_requested', version: 8, replacementSubmissionId: null,
      recordExpiresAt: new Date('2026-08-10T00:00:00.000Z'),
    }
    const rollbackChild = { ...insertedChild, _id: 'rollback-child', beginAttemptId: 'rollback-attempt' }
    const beforeInsertRollback = structuredClone(records)
    failTransactionUpdateAt = 2
    await assert.rejects(
      () => cloudRepository.insertRevision('parent', 'server-owner', rollbackChild, revisionNow),
      /staged add failed/,
    )
    failTransactionUpdateAt = null
    assert.deepEqual(records, beforeInsertRollback)

    records.child = { _id: 'child', _openid: 'server-owner', status: 'processing', version: 1, revisesSubmissionId: 'parent', processing: { leaseId: 'lease-1' } }
    records.parent = { _id: 'parent', _openid: 'server-owner', status: 'changes_requested', version: 4, replacementSubmissionId: 'child' }
    failTransactionUpdateAt = 2
    const beforeFailedTransition = structuredClone(records)
    await assert.rejects(
      () => cloudRepository.transitionRevisionTerminal('child', 'server-owner', {
        _openid: 'server-owner', status: 'processing', version: 1, 'processing.leaseId': 'lease-1',
      }, { status: 'invalid', version: 2 }, new Date('2026-08-09T00:00:00.000Z')),
      (error) => error && error.code === 'version_conflict',
    )
    assert.deepEqual(records, beforeFailedTransition)
    failTransactionUpdateAt = null

    records.child = { _id: 'child', _openid: 'server-owner', status: 'cancelled', version: 2, revisesSubmissionId: 'parent' }
    records.parent = { _id: 'parent', _openid: 'server-owner', status: 'changes_requested', version: 7, replacementSubmissionId: 'child' }
    queryCalls.length = 0
    const beforeRepairTransactions = transactionCalls
    const repaired = await cloudRepository.repairRevisionPointer('child', 'server-owner', new Date('2026-08-09T00:00:00.000Z'))
    assert.equal(transactionCalls, beforeRepairTransactions + 1)
    assert.equal(repaired._id, 'child')
    assert.equal(records.parent.replacementSubmissionId, null)
    assert.equal(records.parent.version, 8)
    assert.equal(queryCalls.some((entry) => entry.type === 'where' && entry.transaction), false)
    assert.deepEqual(queryCalls.find((entry) => entry.type === 'doc.update').data, {
      replacementSubmissionId: null, version: 8, updatedAt: new Date('2026-08-09T00:00:00.000Z'),
    })
  }

  console.log('PASS: C02 owner lifecycle contract (auth, reservation, binding, bounded immutable finalize, lease/CAS, revision, DTO/cursor/expiry, cancel cleanup)')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
