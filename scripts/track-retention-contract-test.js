const assert = require('node:assert/strict')

const { createMemoryRepository } = require('../cloudfunctions/trackSubmission/submission-repository')
const { createCloudBaseRepository } = require('../cloudfunctions/trackSubmission/submission-repository')
const { createMemoryEvidenceRepository, createCloudBaseEvidenceRepository, createEvidenceRecord } = require('../cloudfunctions/trackSubmission/reviewed-evidence')
const { createRetentionService } = require('../cloudfunctions/trackSubmission/retention')
const { createAdminService } = require('../cloudfunctions/trackSubmission/admin-service')
const { createRecord, addDays } = require('../cloudfunctions/trackSubmission/submission-lifecycle')
const { createTrackSubmissionHandler } = require('../cloudfunctions/trackSubmission/index')

const HOST = 'storage.example.test'
const ENV = { TRIGGER_SRC: 'timer' }

function makeRecord(id, now, { status = 'pending_review', rawState = { upload: 'deleted', review: 'present' }, rawDue = true, recordDue = true } = {}) {
  const record = createRecord({
    submissionId: id,
    openid: 'owner-1',
    beginAttemptId: `${id}-attempt`,
    input: { originalFilename: 'walk.gpx', title: `轨迹${id}`, region: null, note: null, provenancePlatform: null, provenancePageUrl: null },
    rights: { basis: 'own_recording', declarationVersion: 'track-rights-v1', licenseName: null, licenseUrl: null },
    format: 'gpx', declaredSizeBytes: 256, now, idFactory: () => id,
  })
  record.status = status
  record.version = 2
  record.summary = {
    summaryVersion: 'track-summary-v1', pointCount: 2, segmentCount: 1,
    bounds: { minLat: 30, maxLat: 30.001, minLon: 100, maxLon: 100.001 },
    start: { lat: 30, lon: 100, elevationM: 1000 }, end: { lat: 30.001, lon: 100.001, elevationM: 1001 },
    distanceM: 147, elevation: { presentPointCount: 2, coverage: 1, minM: 1000, maxM: 1001 },
    hasTimestamps: false, previewSegments: [{ segmentIndex: 0, points: [{ lat: 30, lon: 100, elevationM: 1000 }, { lat: 30.001, lon: 100.001, elevationM: 1001 }] }],
  }
  record.rawFileState = { ...rawState }
  record.creatorFileId = `cloud://${HOST}/${record.cloudPath}`
  record.reviewFileId = `cloud://${HOST}/${record.reviewCloudPath}`
  record.reviewSnapshotAt = new Date(now.getTime())
  record.rawExpiresAt = rawDue ? new Date(now.getTime() - 1) : addDays(now, 30)
  record.recordExpiresAt = recordDue ? new Date(now.getTime() - 1) : addDays(now, 30)
  record.review = {
    attemptId: `${id}-review`, decision: status === 'approved_evidence' ? 'approved_evidence' : null,
    note: null, reviewerOpenid: 'admin-1', reviewedAt: now.toISOString(), resultVersion: 3,
  }
  record.updatedAt = new Date(now.getTime())
  return record
}

function harness(initialNow = '2026-08-09T00:00:00.000Z') {
  let now = new Date(initialNow)
  const repository = createMemoryRepository()
  const evidenceRepository = createMemoryEvidenceRepository()
  const state = { deletes: [], failDeletes: 0 }
  const storage = {
    getAllowedHost() { return HOST },
    async deleteObject(fileID) {
      state.deletes.push(fileID)
      if (state.failDeletes > 0) { state.failDeletes -= 1; throw new Error('storage unavailable') }
      return true
    },
  }
  const service = createRetentionService({ repository, evidenceRepository, storage, env: ENV, clock: () => new Date(now.getTime()) })
  return {
    repository, evidenceRepository, storage, state, service,
    setNow(value) { now = new Date(value) },
    now() { return new Date(now.getTime()) },
  }
}

function errorCode(response) {
  assert.equal(response.phase, 'error')
  return response.error.code
}

async function run() {
  const h = harness()
  const now = h.now()
  // Timer authority is server-owned and never inferred from the event body.
  assert.equal(h.service.timerAuthorized(null), true)
  assert.equal(h.service.timerAuthorized('forged-openid'), false)
  assert.equal(errorCode(await h.service.handle({ mode: 'retention' }, 'forged-openid')), 'invalid_mode')
  const authorized = await h.service.handle({ mode: 'retention' }, null)
  assert.equal(authorized.ok, true)

  // The public handler dispatches the internal timer branch from server-owned context only.
  {
    const routeCalls = []
    const handler = createTrackSubmissionHandler({
      cloudSdk: { getWXContext() { return { OPENID: '' } } },
      env: ENV,
      service: { async handle(event, openid) { routeCalls.push({ branch: 'owner', event, openid }); return { branch: 'owner' } } },
      retentionService: { async handle(event, openid) { routeCalls.push({ branch: 'timer', event, openid }); return { branch: 'timer' } } },
    })
    assert.deepEqual(await handler({ mode: 'retention', forged: true }), { branch: 'timer' })
    assert.deepEqual(routeCalls, [{ branch: 'timer', event: { mode: 'retention', forged: true }, openid: '' }])
  }

  // Exact deadline: nothing is touched before expiry, then identity/raw cleanup runs at the edge.
  const early = makeRecord('early', now, { rawDue: false, recordDue: false, rawState: { upload: 'deleted', review: 'present' } })
  await h.repository.add(early)
  const earlyRun = await h.service.run({})
  assert.equal(earlyRun.processed, 0)
  assert.equal(h.state.deletes.length, 0)
  h.setNow(new Date(early.rawExpiresAt.getTime() - 1))
  const beforeEdgeRun = await h.service.run({})
  assert.equal(beforeEdgeRun.processed, 0)
  assert.equal(h.state.deletes.length, 0)
  h.setNow(early.rawExpiresAt)
  const edgeRun = await h.service.run({})
  assert.equal(edgeRun.processed, 1)
  assert.equal(await h.repository.get('early'), null)
  assert.equal(h.state.deletes.length, 1)

  // Approved evidence survives raw/submission expiry and is removed only at +180 days.
  const approvedNow = h.now()
  const approved = makeRecord('approved', approvedNow, { status: 'approved_evidence', rawState: { upload: 'deleted', review: 'present' } })
  approved.recordExpiresAt = new Date(approved.rawExpiresAt.getTime())
  await h.repository.add(approved)
  const evidence = createEvidenceRecord({ record: approved, reviewedAt: approvedNow, idFactory: () => 'evidence-approved' })
  await h.evidenceRepository.add(evidence)
  approved.evidenceExpiresAt = evidence.expiresAt
  await h.repository.update('approved', { version: approved.version }, { evidenceExpiresAt: evidence.expiresAt })
  await h.service.run({})
  assert.equal(await h.repository.get('approved'), null)
  assert.ok(await h.evidenceRepository.get('evidence-approved'))
  h.setNow(new Date(evidence.expiresAt.getTime() - 1))
  await h.service.run({})
  assert.ok(await h.evidenceRepository.get('evidence-approved'))
  h.setNow(evidence.expiresAt)
  await h.service.run({})
  assert.equal(await h.evidenceRepository.get('evidence-approved'), null)

  // Pending-before-delete is honest and repaired by a duplicate timer delivery.
  const pending = makeRecord('pending', h.now(), { rawState: { upload: 'deleted', review: 'present' } })
  await h.repository.add(pending)
  h.state.failDeletes = 1
  const failed = await h.service.run({})
  assert.equal(failed.pending, 1)
  const pendingRecord = await h.repository.get('pending')
  assert.equal(pendingRecord.rawFileState.review, 'deletion_pending')
  const repaired = await h.service.run({})
  assert.equal(repaired.deleted, 1)
  assert.equal(await h.repository.get('pending'), null)
  const deleteCount = h.state.deletes.length
  await h.service.run({})
  assert.equal(h.state.deletes.length, deleteCount)

  // Expired status rows are table-driven: logical projections are empty, upload IDs are server-derived,
  // and a failed first delete remains pending until duplicate timer delivery repairs it.
  const expiredCases = [
    { status: 'awaiting_upload', rawState: { upload: 'reserved', review: 'absent' }, target: 'upload', expectedFileIDs: (record) => [
      `cloud://${HOST}/${record.cloudPath}`, `cloud://${HOST}/${record.cloudPath}`,
    ] },
    { status: 'processing', rawState: { upload: 'present', review: 'present' }, target: 'upload', expectedFileIDs: (record) => [
      `cloud://${HOST}/${record.cloudPath}`, record.reviewFileId, `cloud://${HOST}/${record.cloudPath}`,
    ] },
    { status: 'changes_requested', rawState: { upload: 'deleted', review: 'present' }, target: 'review', expectedFileIDs: (record) => [
      record.reviewFileId, record.reviewFileId,
    ] },
  ]
  for (const [index, fixture] of expiredCases.entries()) {
    const expired = harness()
    const expiredNow = expired.now()
    const record = makeRecord(`expired-${fixture.status}-${index}`, expiredNow, {
      status: fixture.status, rawState: fixture.rawState, rawDue: true, recordDue: true,
    })
    record.creatorFileId = null
    await expired.repository.add(record)
    const admin = createAdminService({
      repository: expired.repository, storage: expired.storage, evidenceRepository: expired.evidenceRepository,
      env: { TRACK_REVIEW_ADMIN_OPENIDS: 'admin-1' }, clock: expired.now,
    })
    assert.deepEqual((await admin.list({ mode: 'admin_list' }, 'admin-1')).items, [])
    assert.equal(errorCode(await admin.get({ mode: 'admin_get', submissionId: record._id }, 'admin-1')), 'submission_not_found')
    expired.state.failDeletes = 1
    const firstExpired = await expired.service.run({})
    assert.equal(firstExpired.pending, 1)
    const pendingExpired = await expired.repository.get(record._id)
    assert.equal(pendingExpired.rawFileState[fixture.target], 'deletion_pending')
    const repairedExpired = await expired.service.run({})
    assert.equal(repairedExpired.deleted, 1)
    assert.equal(await expired.repository.get(record._id), null)
    assert.deepEqual(expired.state.deletes, fixture.expectedFileIDs(record))
  }

  // A terminal immediate-cleanup backlog is timer-retryable before its 30-day record deadline.
  const terminal = makeRecord('terminal', h.now(), {
    status: 'rejected', rawDue: false, recordDue: false,
    rawState: { upload: 'deleted', review: 'deletion_pending' },
  })
  await h.repository.add(terminal)
  const terminalRun = await h.service.run({})
  assert.equal(terminalRun.processed, 1)
  assert.equal((await h.repository.get('terminal')).rawFileState.review, 'deleted')
  assert.ok(await h.repository.get('terminal'))

  // CAS loss prevents destructive storage work.
  const cas = makeRecord('cas', h.now(), { rawState: { upload: 'deleted', review: 'present' } })
  await h.repository.add(cas)
  const originalUpdate = h.repository.update
  let failOnce = true
  h.repository.update = async (...args) => {
    if (failOnce) { failOnce = false; return null }
    return originalUpdate(...args)
  }
  const deletesBeforeCas = h.state.deletes.length
  await h.service.run({})
  assert.equal(h.state.deletes.length, deletesBeforeCas)
  assert.equal((await h.repository.get('cas')).rawFileState.review, 'present')
  h.repository.update = originalUpdate

  // 21 due records drain in max-20 pages using an opaque stable cursor.
  const backlog = harness(h.now())
  const backlogNow = backlog.now()
  for (let i = 0; i < 21; i += 1) await backlog.repository.add(makeRecord(`backlog-${String(i).padStart(2, '0')}`, backlogNow, { rawState: { upload: 'deleted', review: 'absent' } }))
  const first = await backlog.service.run({})
  assert.equal(first.processed, 20)
  assert.ok(first.nextCursor)
  const second = await backlog.service.run({ cursor: first.nextCursor })
  assert.equal(second.processed, 1)
  assert.equal(second.nextCursor, null)
  assert.equal((await backlog.repository.snapshot()).length, 0)
  assert.equal(backlog.state.deletes.length, 0)

  // Forged event bodies cannot authorize cleanup; only env timer + empty OpenID works.
  const normalEnv = { TRIGGER_SRC: 'client' }
  const normal = createRetentionService({ repository: createMemoryRepository(), evidenceRepository: createMemoryEvidenceRepository(), storage: h.storage, env: normalEnv, clock: h.now })
  assert.equal(errorCode(await normal.handle({ mode: 'retention' }, null)), 'invalid_mode')

  // CloudBase retention/evidence seams preserve due filters, cursor ordering and limit+1 pagination.
  {
    const calls = []
    const command = {
      gt: (value) => ({ $gt: value }), lte: (value) => ({ $lte: value }),
      or: (...values) => ({ $or: values }), and: (...values) => ({ $and: values }),
    }
    function collection(name) {
      return {
        where(condition) {
          calls.push({ type: 'where', name, condition })
          const query = {
            orderBy(field, direction) { calls.push({ type: 'orderBy', name, field, direction }); return query },
            limit(value) { calls.push({ type: 'limit', name, value }); return query },
            async get() { return { data: [] } },
          }
          return query
        },
        doc() { return { async get() { return { data: null } }, async remove() { return { stats: { removed: 1 } } } } },
      }
    }
    const db = { command, collection(name) { return collection(name) } }
    const cloudRepository = createCloudBaseRepository({ db })
    const cloudEvidence = createCloudBaseEvidenceRepository({ db })
    const scanNow = new Date('2026-08-09T00:00:00.000Z')
    calls.length = 0
    await cloudRepository.listRetentionDue(scanNow, {
      cursor: { recordExpiresAt: '2026-08-08T00:00:00.000Z', submissionId: 'cursor-submission' }, limit: 2,
    })
    const retentionWhere = calls.find((call) => call.type === 'where' && call.name === 'track_submissions').condition
    const retentionCursorTime = new Date('2026-08-08T00:00:00.000Z')
    assert.deepEqual(retentionWhere, {
      $and: [
        { $or: [
          { recordExpiresAt: { $lte: scanNow } },
          { rawExpiresAt: { $lte: scanNow } },
          { 'rawFileState.upload': 'deletion_pending' },
          { 'rawFileState.review': 'deletion_pending' },
        ] },
        { $or: [
          { recordExpiresAt: { $gt: retentionCursorTime } },
          { recordExpiresAt: retentionCursorTime, _id: { $gt: 'cursor-submission' } },
        ] },
      ],
    })
    assert.deepEqual(calls.filter((call) => call.type === 'orderBy').map(({ field, direction }) => ({ field, direction })), [
      { field: 'recordExpiresAt', direction: 'asc' }, { field: '_id', direction: 'asc' },
    ])
    assert.equal(calls.find((call) => call.type === 'limit').value, 3)
    calls.length = 0
    await cloudEvidence.listDue(scanNow, { cursor: { expiresAt: '2026-08-08T00:00:00.000Z', evidenceKey: 'cursor-evidence' }, limit: 2 })
    const evidenceWhere = calls.find((call) => call.type === 'where' && call.name === 'track_review_evidence').condition
    const evidenceCursorTime = new Date('2026-08-08T00:00:00.000Z')
    assert.deepEqual(evidenceWhere, {
      $and: [
        { expiresAt: { $lte: scanNow } },
        { $or: [
          { expiresAt: { $gt: evidenceCursorTime } },
          { expiresAt: evidenceCursorTime, _id: { $gt: 'cursor-evidence' } },
        ] },
      ],
    })
    assert.deepEqual(calls.filter((call) => call.type === 'orderBy').map(({ field, direction }) => ({ field, direction })), [
      { field: 'expiresAt', direction: 'asc' }, { field: '_id', direction: 'asc' },
    ])
    assert.equal(calls.find((call) => call.type === 'limit').value, 3)
  }

  console.log('PASS: C03 retention contract (timer authority, exact 30/180 boundaries, max-20 cursor/CAS, idempotent cleanup and pending repair)')
}

run().catch((error) => { console.error(error); process.exitCode = 1 })
