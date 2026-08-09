const assert = require('node:assert/strict')

const { parseTrack } = require('../cloudfunctions/trackSubmission/domain/track-parser')
const { createOwnerService } = require('../cloudfunctions/trackSubmission/owner-service')
const { createAdminService, parseAdminAllowlist } = require('../cloudfunctions/trackSubmission/admin-service')
const { createTrackSubmissionHandler } = require('../cloudfunctions/trackSubmission/index')
const { createMemoryRepository, createCloudBaseRepository } = require('../cloudfunctions/trackSubmission/submission-repository')
const { createMemoryEvidenceRepository, createCloudBaseEvidenceRepository } = require('../cloudfunctions/trackSubmission/reviewed-evidence')

const HOST = 'storage.example.test'
const ENV = { TRACK_REVIEW_ADMIN_OPENIDS: ' admin-1,admin-2 ' }
const GPX_NS = 'http://www.topografix.com/GPX/1/1'

function gpx() {
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><gpx xmlns="${GPX_NS}"><trk><trkseg><trkpt lat="30" lon="100"><ele>1000</ele></trkpt><trkpt lat="30.001" lon="100.001"><ele>1001</ele></trkpt></trkseg></trk></gpx>`)
}

function code(response) {
  assert.equal(response.phase, 'error')
  return response.error.code
}

function assertNoKeys(value, forbidden, path = '$') {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) return value.forEach((item, index) => assertNoKeys(item, forbidden, `${path}[${index}]`))
  Object.entries(value).forEach(([key, child]) => {
    assert.equal(forbidden.has(key), false, `${path}.${key} is forbidden`)
    assertNoKeys(child, forbidden, `${path}.${key}`)
  })
}

function harness({ initialNow = '2026-08-09T00:00:00.000Z' } = {}) {
  let now = new Date(initialNow)
  let sequence = 0
  const repository = createMemoryRepository()
  const evidenceRepository = createMemoryEvidenceRepository()
  const state = { reads: 0, uploads: 0, deletes: 0, urls: 0, maxAge: [], failDelete: false }
  const bytes = gpx()
  const storage = {
    getAllowedHost() { return HOST },
    async readCreator() { state.reads += 1; return Buffer.from(bytes) },
    async uploadReview(path, value) { state.uploads += 1; return `cloud://${HOST}/${path}` },
    async getTemporaryUrl(fileID, maxAge) { state.urls += 1; state.maxAge.push({ fileID, maxAge }); return `https://raw.example.test/${encodeURIComponent(fileID)}` },
    async deleteObject() { state.deletes += 1; if (state.failDelete) throw new Error('storage down'); return true },
  }
  const owner = createOwnerService({
    repository,
    storage,
    clock: () => new Date(now.getTime()),
    idFactory: () => `submission-${++sequence}`,
    parser: (value, options) => parseTrack(value, options),
  })
  const admin = createAdminService({
    repository,
    storage,
    evidenceRepository,
    env: ENV,
    clock: () => new Date(now.getTime()),
    idFactory: () => `evidence-${++sequence}`,
  })
  return {
    repository, evidenceRepository, storage, state, owner, admin,
    setNow(value) { now = new Date(value) },
    async begin(ownerId = 'owner-1', attempt = `attempt-${++sequence}`) {
      return owner.handle({
        mode: 'begin', beginAttemptId: attempt, originalFilename: 'walk.gpx', declaredSizeBytes: bytes.length,
        title: '我的轨迹', rightsBasis: 'own_recording', rightsAccepted: true, rightsDeclarationVersion: 'track-rights-v1',
      }, ownerId)
    },
    async finalize(reservation, ownerId = 'owner-1') {
      const row = (await repository.snapshot()).find((item) => item._id === reservation.submissionId)
      return owner.handle({ mode: 'finalize', submissionId: row._id, fileID: `cloud://${HOST}/${row.cloudPath}` }, ownerId)
    },
  }
}

async function run() {
  // Configuration is exact, trimmed and fail-closed without revealing values.
  assert.deepEqual(parseAdminAllowlist(' admin-1, admin-2 '), ['admin-1', 'admin-2'])
  for (const invalid of [undefined, '', ' ', 'admin-1,admin-1', 'short', 'admin 1']) assert.equal(parseAdminAllowlist(invalid), null)

  const h = harness()
  const before = h.state.reads + h.state.uploads + h.state.deletes + h.state.urls
  assert.equal(code(await h.admin.list({ mode: 'admin_list' }, 'not-admin')), 'forbidden')
  assert.equal(h.state.reads + h.state.uploads + h.state.deletes + h.state.urls, before)
  const emptyList = await h.admin.list({ mode: 'admin_list' }, 'admin-1')
  assert.equal(emptyList.phase, 'admin_list')
  assert.deepEqual(emptyList.items, [])
  const noConfig = createAdminService({
    repository: h.repository, storage: h.storage, evidenceRepository: h.evidenceRepository,
    env: { TRACK_REVIEW_ADMIN_OPENIDS: ' ' }, clock: () => new Date('2026-08-09T00:00:00.000Z'),
  })
  assert.equal(code(await noConfig.list({ mode: 'admin_list' }, 'admin-1')), 'admin_not_configured')

  // A real C02 submission is the only seed; administrator identity comes from the server argument.
  const reservation = await h.begin()
  const finalized = await h.finalize(reservation)
  assert.equal(finalized.submission.status, 'pending_review')
  const list = await h.admin.list({ mode: 'admin_list', limit: 20, _openid: 'forged' }, 'admin-1')
  assert.equal(list.phase, 'admin_list')
  assert.equal(list.items.length, 1)
  assert.deepEqual(Object.keys(list.items[0]).sort(), [
    'actualSizeBytes', 'allowedAdminActions', 'cleanup', 'createdAt', 'format', 'pointCount', 'region',
    'retention', 'revisesSubmissionId', 'reviewNote', 'rightsBasis', 'segmentCount', 'status', 'submissionId',
    'title', 'updatedAt', 'version',
  ].sort())
  assert.deepEqual(list.items[0].allowedAdminActions, ['view_raw', 'request_changes', 'reject', 'approve_evidence'])
  assert.equal(JSON.stringify(list).includes('owner-1'), false)

  const row = list.items[0]
  const detail = await h.admin.get({ mode: 'admin_get', submissionId: row.submissionId }, 'admin-1')
  assert.equal(detail.phase, 'admin_detail')
  assert.deepEqual(Object.keys(detail).sort(), ['phase', 'submission'])
  assert.deepEqual(Object.keys(detail.submission).sort(), [
    'actualSizeBytes', 'allowedActions', 'allowedAdminActions', 'approvedEvidence', 'cleanup', 'createdAt', 'format',
    'licenseName', 'licenseUrl', 'note', 'originalFilename', 'provenancePageUrl', 'provenancePlatform', 'rawAccess',
    'region', 'retention', 'revisesSubmissionId', 'rightsBasis', 'rightsDeclarationVersion', 'reviewNote', 'status',
    'submissionId', 'summary', 'title', 'updatedAt', 'version',
  ].sort())
  assert.equal(detail.submission.rawAccess, null)
  assert.deepEqual(detail.submission.allowedAdminActions, row.allowedAdminActions)
  const raw = await h.admin.get({ mode: 'admin_get', submissionId: row.submissionId, includeRawLink: true }, 'admin-1')
  assert.equal(raw.phase, 'admin_detail')
  assert.equal(new Date(raw.submission.rawAccess.expiresAt).getTime() - new Date(raw.submission.updatedAt).getTime(), 300000)
  assert.equal(h.state.maxAge[0].maxAge, 300)
  assert.equal(JSON.stringify(raw).includes('cloud://'), false)
  assert.equal(JSON.stringify(raw).includes('owner-1'), false)
  const rawRecord = await h.repository.get(row.submissionId)
  h.setNow(new Date(new Date(rawRecord.rawExpiresAt).getTime() - 1500))
  const nearDeadline = await h.admin.get({ mode: 'admin_get', submissionId: row.submissionId, includeRawLink: true }, 'admin-1')
  assert.equal(nearDeadline.phase, 'admin_detail')
  assert.equal(h.state.maxAge.at(-1).maxAge, 1)
  assert.equal(new Date(nearDeadline.submission.rawAccess.expiresAt).getTime(), new Date(rawRecord.rawExpiresAt).getTime() - 500)
  const urlsBeforeSubsecond = h.state.urls
  h.setNow(new Date(new Date(rawRecord.rawExpiresAt).getTime() - 500))
  assert.equal(code(await h.admin.get({ mode: 'admin_get', submissionId: row.submissionId, includeRawLink: true }, 'admin-1')), 'raw_unavailable')
  assert.equal(h.state.urls, urlsBeforeSubsecond)
  h.setNow('2026-08-09T00:00:00.000Z')

  // The complete eight-state admin action matrix is explicit and server-projected.
  {
    const matrix = harness()
    const expectedActions = {
      awaiting_upload: [],
      processing: [],
      pending_review: ['view_raw', 'request_changes', 'reject', 'approve_evidence'],
      changes_requested: ['view_raw'],
      approved_evidence: ['view_raw'],
      rejected: [],
      cancelled: [],
      invalid: [],
    }
    for (const status of Object.keys(expectedActions)) {
      const reservationForStatus = await matrix.begin(`matrix-${status}`, `matrix-${status}`)
      if (['pending_review', 'changes_requested', 'approved_evidence'].includes(status)) {
        await matrix.finalize(reservationForStatus, `matrix-${status}`)
      }
      const stored = await matrix.repository.get(reservationForStatus.submissionId)
      if (status !== stored.status) {
        await matrix.repository.update(stored._id, { _openid: stored._openid, status: stored.status, version: stored.version }, {
          status, version: stored.version + 1,
          rawFileState: ['rejected', 'cancelled', 'invalid'].includes(status)
            ? { upload: 'deleted', review: 'deleted' } : stored.rawFileState,
        })
      }
    }
    const matrixList = await matrix.admin.list({ mode: 'admin_list', limit: 20 }, 'admin-1')
    assert.equal(matrixList.items.length, 8)
    for (const item of matrixList.items) assert.deepEqual(item.allowedAdminActions, expectedActions[item.status])
  }

  // Admin cursor order is updatedAt DESC then submissionId DESC; limit is 1..20 and cursor status-bound.
  {
    const pages = harness()
    const pageIds = []
    for (let i = 0; i < 3; i += 1) {
      const reservationForPage = await pages.begin(`page-owner-${i}`, `page-${i}`)
      pageIds.push(reservationForPage.submissionId)
      pages.setNow(new Date(Date.parse('2026-08-09T00:00:' + String(i + 1).padStart(2, '0') + '.000Z')))
    }
    pages.setNow('2026-08-09T00:00:10.000Z')
    const firstPage = await pages.admin.list({ mode: 'admin_list', limit: 2 }, 'admin-1')
    assert.equal(firstPage.items.length, 2)
    assert.ok(firstPage.nextCursor)
    const secondPage = await pages.admin.list({ mode: 'admin_list', limit: 2, cursor: firstPage.nextCursor }, 'admin-1')
    assert.equal(secondPage.items.length, 1)
    assert.equal(secondPage.nextCursor, null)
    assert.equal(new Set([...firstPage.items, ...secondPage.items].map((item) => item.submissionId)).size, 3)
    assert.equal(code(await pages.admin.list({ mode: 'admin_list', limit: 21 }, 'admin-1')), 'invalid_input')
    assert.equal(code(await pages.admin.list({ mode: 'admin_list', status: 'pending_review', cursor: firstPage.nextCursor }, 'admin-1')), 'invalid_cursor')
  }

  // request_changes is versioned and same-attempt replay is first-write-wins.
  const changed = await h.admin.review({ mode: 'admin_review', submissionId: row.submissionId, expectedVersion: finalized.submission.version,
    reviewAttemptId: 'review-attempt-1', decision: 'changes_requested', note: '请补充说明' }, 'admin-1')
  assert.equal(changed.phase, 'admin_detail')
  assert.equal(changed.submission.status, 'changes_requested')
  assert.equal(changed.submission.reviewNote, '请补充说明')
  const replay = await h.admin.review({ mode: 'admin_review', submissionId: row.submissionId, expectedVersion: 999,
    reviewAttemptId: 'review-attempt-1', decision: 'rejected', note: '改写' }, 'admin-1')
  assert.equal(replay.submission.status, 'changes_requested')
  assert.equal(replay.submission.reviewNote, '请补充说明')
  assert.equal(code(await h.admin.review({ mode: 'admin_review', submissionId: row.submissionId, expectedVersion: changed.submission.version,
    reviewAttemptId: 'review-attempt-2', decision: 'approved_evidence', note: null }, 'admin-1')), 'invalid_state')

  // Approval writes only a separate, de-identified evidence record and no linkage key.
  const approvalReservation = await h.begin('owner-2', 'approval-attempt')
  const approvalFinal = await h.finalize(approvalReservation, 'owner-2')
  const approval = await h.admin.review({ mode: 'admin_review', submissionId: approvalReservation.submissionId,
    expectedVersion: approvalFinal.submission.version, reviewAttemptId: 'review-attempt-approve', decision: 'approved_evidence', note: null }, 'admin-2')
  assert.equal(approval.submission.status, 'approved_evidence')
  assert.equal(approval.submission.approvedEvidence.evidenceVersion, 'reviewed-track-evidence-v1')
  assert.equal(approval.submission.approvedEvidence.limitations.join(','), 'geometry_only,not_operational_status,not_route_publication')
  const evidenceRows = await h.evidenceRepository.snapshot()
  assert.equal(evidenceRows.length, 1)
  const evidenceKey = evidenceRows[0]._id
  assert.equal(JSON.stringify(approval).includes(evidenceKey), false)
  assert.equal(JSON.stringify(approval).includes('owner-2'), false)
  assert.equal(JSON.stringify(evidenceRows[0]).includes(approvalReservation.submissionId), false)
  assert.equal(JSON.stringify(evidenceRows[0]).includes('owner-2'), false)
  assert.equal(JSON.stringify(evidenceRows[0]).includes('reviewFileId'), false)
  assert.deepEqual(Object.keys(evidenceRows[0]).sort(), ['_id', 'approvedAt', 'approvedEvidence', 'expiresAt'].sort())
  assert.deepEqual(Object.keys(evidenceRows[0].approvedEvidence).sort(), [
    'evidenceVersion', 'format', 'geometry', 'limitations', 'region', 'reviewStage', 'reviewedOn', 'sourceKind', 'title',
  ].sort())
  assert.deepEqual(Object.keys(evidenceRows[0].approvedEvidence.geometry).sort(), [
    'bounds', 'distanceM', 'elevation', 'end', 'pointCount', 'previewSegments', 'segmentCount', 'start', 'summaryVersion',
  ].sort())
  assertNoKeys(evidenceRows[0], new Set([
    '_openid', 'submissionId', 'serverEvidenceKey', 'evidenceKey', 'creatorFileId', 'reviewFileId', 'cloudPath',
    'provenancePlatform', 'provenancePageUrl', 'originalFilename',
  ]))
  assertNoKeys(approval.submission, new Set(['_openid', 'serverEvidenceKey', 'evidenceKey']))
  assert.deepEqual(approval.submission.allowedAdminActions, ['view_raw'])
  const approvalStored = await h.repository.get(approvalReservation.submissionId)
  assert.equal(Object.prototype.hasOwnProperty.call(approvalStored, 'serverEvidenceKey'), false)
  assert.equal(Object.prototype.hasOwnProperty.call(approvalStored, 'evidenceKey'), false)
  assertNoKeys(approvalStored, new Set(['serverEvidenceKey', 'evidenceKey']))
  assert.equal(JSON.stringify(approvalStored).includes(evidenceRows[0]._id), false)
  const approvalEvidenceExpiry = approvalStored.evidenceExpiresAt
  const approvalRawExpiry = approvalStored.rawExpiresAt
  const approvalReviewedAt = new Date(approvalStored.review.reviewedAt)
  assert.equal(approvalEvidenceExpiry.getTime() - approvalReviewedAt.getTime(), 180 * 24 * 60 * 60 * 1000)
  assert.equal(evidenceRows[0].expiresAt.getTime() - evidenceRows[0].approvedAt.getTime(), 180 * 24 * 60 * 60 * 1000)
  h.setNow('2026-08-10T00:00:00.000Z')
  const approvalReplay = await h.admin.review({ mode: 'admin_review', submissionId: approvalReservation.submissionId,
    expectedVersion: 999, reviewAttemptId: 'review-attempt-approve', decision: 'rejected', note: 'rewrite' }, 'admin-2')
  assert.equal(approvalReplay.submission.status, 'approved_evidence')
  const approvalAfterReplay = await h.repository.get(approvalReservation.submissionId)
  assert.equal(approvalAfterReplay.evidenceExpiresAt.toISOString(), approvalEvidenceExpiry.toISOString())
  assert.equal(approvalAfterReplay.rawExpiresAt.toISOString(), approvalRawExpiry.toISOString())
  assert.equal((await h.evidenceRepository.snapshot()).length, 1)
  h.setNow('2026-08-09T00:00:00.000Z')

  // Approval must not overwrite a real owner cancel that wins during the awaited evidence write.
  {
    const race = harness()
    const raceReservation = await race.begin('race-owner', 'race-attempt')
    const raceFinal = await race.finalize(raceReservation, 'race-owner')
    let releaseEvidence
    const evidenceGate = new Promise((resolve) => { releaseEvidence = resolve })
    const originalAdd = race.evidenceRepository.add
    race.evidenceRepository.add = async (record) => {
      await evidenceGate
      return originalAdd(record)
    }
    const pendingApproval = race.admin.review({ mode: 'admin_review', submissionId: raceReservation.submissionId,
      expectedVersion: raceFinal.submission.version, reviewAttemptId: 'race-approval', decision: 'approved_evidence', note: null }, 'admin-1')
    await new Promise((resolve) => setImmediate(resolve))
    const cancelled = await race.owner.handle({ mode: 'cancel', submissionId: raceReservation.submissionId,
      expectedVersion: raceFinal.submission.version }, 'race-owner')
    assert.equal(cancelled.submission.status, 'cancelled')
    releaseEvidence()
    const raced = await pendingApproval
    assert.equal(code(raced), 'invalid_state')
    assert.equal((await race.repository.get(raceReservation.submissionId)).status, 'cancelled')
    assert.equal((await race.evidenceRepository.snapshot()).length, 0)
  }

  // Approval without the transaction repository seam fails closed; no evidence orphan is created.
  {
    const fallback = harness()
    const fallbackReservation = await fallback.begin('fallback-owner', 'fallback-attempt')
    const fallbackFinal = await fallback.finalize(fallbackReservation, 'fallback-owner')
    fallback.repository.approveReview = undefined
    const fallbackAdmin = createAdminService({ repository: fallback.repository, storage: fallback.storage,
      evidenceRepository: fallback.evidenceRepository, env: ENV, clock: () => new Date('2026-08-09T00:00:00.000Z'), idFactory: () => 'fallback-evidence' })
  const fallbackResult = await fallbackAdmin.review({ mode: 'admin_review', submissionId: fallbackReservation.submissionId,
      expectedVersion: fallbackFinal.submission.version, reviewAttemptId: 'fallback-review', decision: 'approved_evidence', note: null }, 'admin-1')
    assert.equal(code(fallbackResult), 'store_unavailable')
    assert.equal((await fallback.evidenceRepository.snapshot()).length, 0)
    assert.equal((await fallback.repository.get(fallbackReservation.submissionId)).status, 'pending_review')
  }

  // Missing/deleted immutable raw objects never trigger an SDK URL call or leak its details.
  {
    const missingRaw = harness()
    const missingReservation = await missingRaw.begin('missing-raw-owner', 'missing-raw-attempt')
    const missingFinal = await missingRaw.finalize(missingReservation, 'missing-raw-owner')
    const missingRecord = await missingRaw.repository.get(missingReservation.submissionId)
    await missingRaw.repository.update(missingRecord._id, { status: missingRecord.status, version: missingRecord.version }, {
      rawFileState: { upload: 'deleted', review: 'deleted' }, version: missingRecord.version + 1,
    })
    const missingUrls = missingRaw.state.urls
    const missingResult = await missingRaw.admin.get({ mode: 'admin_get', submissionId: missingReservation.submissionId, includeRawLink: true }, 'admin-1')
    assert.equal(code(missingResult), 'raw_unavailable')
    assert.equal(missingRaw.state.urls, missingUrls)
    assert.equal(JSON.stringify(missingResult).includes('https://raw.example.test'), false)
    assert.equal(missingFinal.submission.status, 'pending_review')
  }

  // Reject marks raw cleanup pending before delete; failure is honest and retryable by the owner/admin projection.
  const rejectReservation = await h.begin('owner-3', 'reject-attempt')
  const rejectFinal = await h.finalize(rejectReservation, 'owner-3')
  h.state.failDelete = true
  const rejected = await h.admin.review({ mode: 'admin_review', submissionId: rejectReservation.submissionId,
    expectedVersion: rejectFinal.submission.version, reviewAttemptId: 'review-attempt-reject', decision: 'rejected', note: null }, 'admin-1')
  assert.equal(rejected.phase, 'admin_detail')
  assert.equal(rejected.submission.status, 'rejected')
  assert.equal(rejected.submission.cleanup.pending, true)
  assert.deepEqual(rejected.submission.allowedAdminActions, [])
  h.state.failDelete = false
  const rejectReplay = await h.admin.review({ mode: 'admin_review', submissionId: rejectReservation.submissionId,
    expectedVersion: 1, reviewAttemptId: 'review-attempt-reject', decision: 'approved_evidence', note: 'rewrite' }, 'admin-1')
  assert.equal(rejectReplay.submission.cleanup.pending, false)

  // Raw and identity projections disappear exactly at the immutable deadline.
  const expiryReservation = await h.begin('owner-4', 'expiry-attempt')
  const expiryFinal = await h.finalize(expiryReservation, 'owner-4')
  const expiryRecord = await h.repository.get(expiryReservation.submissionId)
  h.setNow(expiryRecord.rawExpiresAt)
  assert.equal((await h.admin.list({ mode: 'admin_list' }, 'admin-1')).items.some((item) => item.submissionId === expiryReservation.submissionId), false)
  assert.equal(code(await h.admin.get({ mode: 'admin_get', submissionId: expiryReservation.submissionId }, 'admin-1')), 'submission_not_found')
  assert.equal(code(await h.admin.review({ mode: 'admin_review', submissionId: expiryReservation.submissionId, expectedVersion: expiryFinal.submission.version,
    reviewAttemptId: 'late-review', decision: 'rejected', note: null }, 'admin-1')), 'submission_not_found')

  // Handler ignores forged event identity and denies timer-shaped input from a non-timer caller.
  const handler = createTrackSubmissionHandler({
    cloudSdk: { getWXContext() { return { OPENID: 'admin-1' } } },
    service: { async handle(event, openid) { return { phase: 'mine', openid, event } } },
    adminService: h.admin,
  })
  const handlerResult = await handler({ mode: 'list_mine', _openid: 'forged' })
  assert.equal(handlerResult.openid, 'admin-1')
  const handlerAdmin = await handler({ mode: 'admin_list' })
  assert.equal(handlerAdmin.phase, 'admin_list')
  const timerShaped = await h.admin.handle({ mode: 'retention' }, 'admin-1')
  assert.equal(code(timerShaped), 'invalid_mode')

  // CloudBase repository/evidence seams keep filters, CAS and separate collection writes explicit.
  {
    const calls = []
    const state = { x: {
      _id: 'x', status: 'pending_review', version: 1,
      rawFileState: { upload: 'deleted', review: 'present' }, review: { attemptId: null },
    } }
    const evidenceRows = []
    let transactionActive = false
    let failApprovalUpdate = false
    let failEvidenceAdd = false
    const command = {
      gt: (value) => ({ $gt: value }), lt: (value) => ({ $lt: value }), lte: (value) => ({ $lte: value }),
      or: (...values) => ({ $or: values }), and: (...values) => ({ $and: values }),
    }
    function collection(name, inTransaction = false, localState = state, localEvidence = evidenceRows) {
      return {
        where(condition) {
          calls.push({ type: 'where', name, condition, transaction: inTransaction })
          const query = {
            orderBy(field, direction) { calls.push({ type: 'orderBy', name, field, direction, transaction: inTransaction }); return query },
            limit(value) { calls.push({ type: 'limit', name, value, transaction: inTransaction }); return query },
            async get() { return { data: name === 'track_submissions' ? Object.values(localState) : localEvidence } },
            async update({ data }) {
              if (inTransaction) throw new Error('transaction query update forbidden')
              if (transactionActive) throw new Error('transaction token required')
              Object.assign(localState.x, data)
              return { stats: { updated: 1 } }
            },
            async remove() { delete localState.x; return { stats: { removed: 1 } } },
          }
          return query
        },
        doc(id) {
          return {
            async get() { calls.push({ type: 'doc.get', name, id, transaction: inTransaction }); return { data: localState[id] || null } },
            async update({ data }) {
              if (!inTransaction && transactionActive) throw new Error('transaction token required')
              calls.push({ type: 'doc.update', name, id, data, transaction: inTransaction })
              if (!localState[id]) return { stats: { updated: 0 } }
              if (inTransaction && failApprovalUpdate) return { stats: { updated: 0 } }
              Object.assign(localState[id], data)
              return { stats: { updated: 1 } }
            },
            async remove() { delete localState[id]; return { stats: { removed: 1 } } },
          }
        },
        async add({ data }) {
          calls.push({ type: 'add', name, data, transaction: inTransaction })
          if (inTransaction && failEvidenceAdd) throw new Error('staged evidence add failed')
          localEvidence.push(structuredClone(data))
          return { _id: data._id }
        },
      }
    }
    const db = {
      command,
      collection(name) { calls.push({ type: 'collection', name }); return collection(name) },
      async runTransaction(callback) {
        const stagedState = structuredClone(state)
        const stagedEvidence = structuredClone(evidenceRows)
        transactionActive = true
        try {
          const result = await callback({ collection(name) { return collection(name, true, stagedState, stagedEvidence) } })
          if (result !== null && result !== undefined) {
            Object.keys(state).forEach((key) => delete state[key])
            Object.assign(state, stagedState)
            evidenceRows.splice(0, evidenceRows.length, ...stagedEvidence)
          }
          return result
        } finally { transactionActive = false }
      },
    }
    const cloudRepository = createCloudBaseRepository({ db })
    await cloudRepository.listAdmin(new Date('2026-08-09T00:00:00.000Z'), { limit: 2 })
    const adminWhere = calls.find((call) => call.type === 'where' && call.name === 'track_submissions').condition
    assert.equal(adminWhere.recordExpiresAt.$gt instanceof Date, true)
    assert.deepEqual(calls.filter((call) => call.type === 'orderBy').map(({ field, direction }) => ({ field, direction })), [
      { field: 'updatedAt', direction: 'desc' }, { field: '_id', direction: 'desc' },
    ])
    assert.equal(calls.find((call) => call.type === 'limit').value, 3)
    calls.length = 0
    const adminCursorTime = new Date('2026-08-08T00:00:00.000Z')
    const adminScanTime = new Date('2026-08-09T00:00:00.000Z')
    await cloudRepository.listAdmin(adminScanTime, {
      status: 'pending_review', cursor: { updatedAt: adminCursorTime.toISOString(), submissionId: 'admin-cursor' }, limit: 2,
    })
    const adminCursorWhere = calls.find((call) => call.type === 'where' && call.name === 'track_submissions').condition
    assert.deepEqual(adminCursorWhere, {
      $and: [
        { recordExpiresAt: { $gt: adminScanTime }, status: 'pending_review' },
        { $or: [
          { updatedAt: { $lt: adminCursorTime } },
          { updatedAt: adminCursorTime, _id: { $lt: 'admin-cursor' } },
        ] },
      ],
    })
    assert.deepEqual(calls.filter((call) => call.type === 'orderBy').map(({ field, direction }) => ({ field, direction })), [
      { field: 'updatedAt', direction: 'desc' }, { field: '_id', direction: 'desc' },
    ])
    assert.equal(calls.find((call) => call.type === 'limit').value, 3)
    await cloudRepository.listRetentionDue(new Date('2026-08-09T00:00:00.000Z'), { limit: 2 })
    const cloudEvidence = createCloudBaseEvidenceRepository({ db })
    const approvalConditions = {
      status: 'pending_review', version: 1, 'rawFileState.review': 'present', 'review.attemptId': null,
    }
    state.x.rawFileState.review = 'deleted'
    assert.equal(await cloudRepository.approveReview('x', approvalConditions, { status: 'approved_evidence', version: 2 }, {
      _id: 'evidence-raw-cas', approvedEvidence: { evidenceVersion: 'reviewed-track-evidence-v1' },
      approvedAt: new Date('2026-08-09T00:00:00.000Z'), expiresAt: new Date('2027-02-05T00:00:00.000Z'),
    }, cloudEvidence), null)
    state.x.rawFileState.review = 'present'
    state.x.review.attemptId = 'existing-attempt'
    assert.equal(await cloudRepository.approveReview('x', approvalConditions, { status: 'approved_evidence', version: 2 }, {
      _id: 'evidence-attempt-cas', approvedEvidence: { evidenceVersion: 'reviewed-track-evidence-v1' },
      approvedAt: new Date('2026-08-09T00:00:00.000Z'), expiresAt: new Date('2027-02-05T00:00:00.000Z'),
    }, cloudEvidence), null)
    state.x.review.attemptId = null
    await cloudRepository.approveReview('x', {
      ...approvalConditions,
    }, { status: 'approved_evidence', version: 2 }, {
      _id: 'evidence-cloud', approvedEvidence: { evidenceVersion: 'reviewed-track-evidence-v1' },
      approvedAt: new Date('2026-08-09T00:00:00.000Z'), expiresAt: new Date('2027-02-05T00:00:00.000Z'),
    }, cloudEvidence)
    assert.equal(calls.some((call) => call.type === 'where' && call.transaction), false)
    assert.ok(calls.some((call) => call.type === 'doc.get' && call.transaction && call.name === 'track_submissions'))
    assert.ok(calls.some((call) => call.type === 'doc.update' && call.transaction && call.name === 'track_submissions'))
    assert.ok(calls.some((call) => call.type === 'add' && call.name === 'track_review_evidence'))
    const beforeApprovalRollback = structuredClone(state)
    const beforeEvidenceRollback = structuredClone(evidenceRows)
    failEvidenceAdd = true
    await assert.rejects(
      () => cloudRepository.approveReview('x', { status: 'approved_evidence', version: 2 }, { status: 'approved_evidence', version: 3 }, {
        _id: 'evidence-rollback', approvedEvidence: { evidenceVersion: 'reviewed-track-evidence-v1' },
        approvedAt: new Date('2026-08-09T00:00:00.000Z'), expiresAt: new Date('2027-02-05T00:00:00.000Z'),
      }, cloudEvidence),
      /staged evidence add failed/,
    )
    failEvidenceAdd = false
    assert.deepEqual(state, beforeApprovalRollback)
    assert.deepEqual(evidenceRows, beforeEvidenceRollback)
    failApprovalUpdate = true
    const failedApproval = await cloudRepository.approveReview('x', { status: 'approved_evidence', version: 2 }, { status: 'approved_evidence', version: 3 }, {
      _id: 'evidence-update-rollback', approvedEvidence: { evidenceVersion: 'reviewed-track-evidence-v1' },
      approvedAt: new Date('2026-08-09T00:00:00.000Z'), expiresAt: new Date('2027-02-05T00:00:00.000Z'),
    }, cloudEvidence)
    failApprovalUpdate = false
    assert.equal(failedApproval, null)
    assert.deepEqual(state, beforeApprovalRollback)
    assert.deepEqual(evidenceRows, beforeEvidenceRollback)
  }

  console.log('PASS: C03 admin contract (fail-closed config/auth, DTO/privacy, raw 300s, CAS/replay, evidence isolation, cleanup and expiry)')
}

run().catch((error) => { console.error(error); process.exitCode = 1 })
