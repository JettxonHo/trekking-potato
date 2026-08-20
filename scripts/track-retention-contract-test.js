const assert = require('node:assert/strict')

const { createMemoryRepository } = require('../cloudfunctions/trackSubmission/submission-repository')
const { createCloudBaseRepository } = require('../cloudfunctions/trackSubmission/submission-repository')
const { createMemoryEvidenceRepository, createCloudBaseEvidenceRepository, createEvidenceRecord } = require('../cloudfunctions/trackSubmission/reviewed-evidence')
const { createRetentionService } = require('../cloudfunctions/trackSubmission/retention')
const { createAdminService } = require('../cloudfunctions/trackSubmission/admin-service')
const { createRecord, addDays } = require('../cloudfunctions/trackSubmission/submission-lifecycle')
const { createTrackSubmissionHandler } = require('../cloudfunctions/trackSubmission/index')

const HOST = 'storage.example.test'
const ENV_DELETE = { TRIGGER_SRC: 'timer', TRACK_RETENTION_MODE: 'delete' }
const ENV_DRY_RUN = { TRIGGER_SRC: 'timer' }

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

function harness(initialNow = '2026-08-09T00:00:00.000Z', env = ENV_DELETE) {
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
  const service = createRetentionService({ repository, evidenceRepository, storage, env, clock: () => new Date(now.getTime()) })
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

function assertDryRunResponse(response, expected = {}) {
  assert.deepEqual(Object.keys(response).sort(), [
    'count', 'evidenceNextCursor', 'hasMore', 'mode', 'nextCursor', 'now', 'ok',
  ])
  assert.equal(response.ok, true)
  assert.equal(response.mode, 'dry_run')
  assert.deepEqual(Object.keys(response.count).sort(), ['evidence', 'submissions', 'total'])
  assert.equal(Number.isInteger(response.count.submissions), true)
  assert.equal(Number.isInteger(response.count.evidence), true)
  assert.equal(response.count.total, response.count.submissions + response.count.evidence)
  assert.equal(response.count.total <= 20, true)
  assert.equal(response.count.submissions >= 0, true)
  assert.equal(response.count.evidence >= 0, true)
  assert.equal(typeof response.hasMore, 'boolean')
  assert.equal(response.nextCursor === null || typeof response.nextCursor === 'string', true)
  assert.equal(response.evidenceNextCursor === null || typeof response.evidenceNextCursor === 'string', true)
  assert.equal(typeof response.now, 'string')
  if (expected.submissions !== undefined) assert.equal(response.count.submissions, expected.submissions)
  if (expected.evidence !== undefined) assert.equal(response.count.evidence, expected.evidence)
  if (expected.total !== undefined) assert.equal(response.count.total, expected.total)
  return response
}

function forbidDryRunMutations(h) {
  const writes = { submissionUpdates: 0, submissionRemoves: 0, evidenceRemoves: 0, storageDeletes: 0 }
  const update = h.repository.update
  const remove = h.repository.remove
  const evidenceRemove = h.evidenceRepository.remove
  const deleteObject = h.storage.deleteObject
  h.repository.update = async (...args) => { writes.submissionUpdates += 1; return update(...args) }
  h.repository.remove = async (...args) => { writes.submissionRemoves += 1; return remove(...args) }
  h.evidenceRepository.remove = async (...args) => { writes.evidenceRemoves += 1; return evidenceRemove(...args) }
  h.storage.deleteObject = async (...args) => { writes.storageDeletes += 1; return deleteObject(...args) }
  return writes
}

async function run() {
  // C08 RED: the timer-authorized path must default to a bounded dry-run when
  // the explicit destructive mode is absent.
  const defaultDryRunHarness = harness('2026-08-09T00:00:00.000Z', ENV_DRY_RUN)
  const defaultDryRun = await defaultDryRunHarness.service.handle({ TRACK_RETENTION_MODE: 'delete' }, '')
  assertDryRunResponse(defaultDryRun, { submissions: 0, evidence: 0, total: 0 })
  const h = harness()
  const now = h.now()

  // Missing, empty, typo and non-exact values are all fail-closed dry-runs.
  for (const mode of [undefined, '', 'typo', 'delete ']) {
    const env = { TRIGGER_SRC: 'timer' }
    if (mode !== undefined) env.TRACK_RETENTION_MODE = mode
    const dry = harness('2026-08-09T00:00:00.000Z', env)
    const row = makeRecord(`dry-mode-${String(mode)}`, dry.now())
    await dry.repository.add(row)
    const writes = forbidDryRunMutations(dry)
    const result = assertDryRunResponse(await dry.service.handle({}, ''), { submissions: 1, total: 1 })
    assert.equal(result.hasMore, false)
    assert.equal(writes.submissionUpdates, 0)
    assert.equal(writes.submissionRemoves, 0)
    assert.equal(writes.evidenceRemoves, 0)
    assert.equal(writes.storageDeletes, 0)
    assert.ok((await dry.repository.get(row._id)), 'dry-run keeps the due submission')
    assert.equal(JSON.stringify(result).includes(row._id), false)
    assert.equal(JSON.stringify(result).includes('cloud://'), false)
  }

  // Before expiry nothing is previewed; at/equal expiry and pending cleanup are previewed,
  // while the record, evidence and storage boundaries remain untouched.
  {
    const before = harness('2026-08-09T00:00:00.000Z', ENV_DRY_RUN)
    const beforeRow = makeRecord('dry-before', before.now(), {
      rawDue: false, recordDue: false, rawState: { upload: 'deleted', review: 'present' },
    })
    await before.repository.add(beforeRow)
    const beforeWrites = forbidDryRunMutations(before)
    assertDryRunResponse(await before.service.run({}), { submissions: 0, evidence: 0, total: 0 })
    assert.equal(beforeWrites.submissionUpdates, 0)
    assert.equal(beforeWrites.submissionRemoves, 0)
    assert.equal(beforeWrites.evidenceRemoves, 0)
    assert.equal(beforeWrites.storageDeletes, 0)
    assert.ok(await before.repository.get(beforeRow._id))

    const edge = harness('2026-08-09T00:00:00.000Z', ENV_DRY_RUN)
    const edgeRow = makeRecord('dry-edge', edge.now())
    await edge.repository.add(edgeRow)
    const edgeWrites = forbidDryRunMutations(edge)
    assertDryRunResponse(await edge.service.run({}), { submissions: 1, evidence: 0, total: 1 })
    assert.equal(edgeWrites.submissionUpdates, 0)
    assert.equal(edgeWrites.submissionRemoves, 0)
    assert.equal(edgeWrites.evidenceRemoves, 0)
    assert.equal(edgeWrites.storageDeletes, 0)
    assert.ok(await edge.repository.get(edgeRow._id))

    const pending = harness('2026-08-09T00:00:00.000Z', ENV_DRY_RUN)
    const pendingRow = makeRecord('dry-pending', pending.now(), {
      rawDue: false, recordDue: false, rawState: { upload: 'deleted', review: 'deletion_pending' },
    })
    await pending.repository.add(pendingRow)
    const pendingWrites = forbidDryRunMutations(pending)
    assertDryRunResponse(await pending.service.run({}), { submissions: 1, evidence: 0, total: 1 })
    assert.equal(pendingWrites.submissionUpdates, 0)
    assert.equal(pendingWrites.submissionRemoves, 0)
    assert.equal(pendingWrites.evidenceRemoves, 0)
    assert.equal(pendingWrites.storageDeletes, 0)
    assert.equal((await pending.repository.get(pendingRow._id)).rawFileState.review, 'deletion_pending')

    const evidence = harness('2026-08-09T00:00:00.000Z', ENV_DRY_RUN)
    const evidenceRow = {
      _id: 'dry-evidence', approvedEvidence: { evidenceVersion: 'reviewed-track-evidence-v1' },
      approvedAt: new Date('2026-01-01T00:00:00.000Z'), expiresAt: new Date(evidence.now().getTime() - 1),
    }
    await evidence.evidenceRepository.add(evidenceRow)
    const evidenceWrites = forbidDryRunMutations(evidence)
    const evidencePreview = assertDryRunResponse(await evidence.service.run({}), { submissions: 0, evidence: 1, total: 1 })
    assert.equal(evidenceWrites.submissionUpdates, 0)
    assert.equal(evidenceWrites.submissionRemoves, 0)
    assert.equal(evidenceWrites.evidenceRemoves, 0)
    assert.equal(evidenceWrites.storageDeletes, 0)
    assert.ok(await evidence.evidenceRepository.get(evidenceRow._id))
    assert.equal(JSON.stringify(evidencePreview).includes(evidenceRow._id), false)
  }

  // Dry-run scans are globally bounded to 20 submission/evidence rows and carry
  // only opaque continuation cursors across a 21-row backlog.
  {
    const backlog = harness('2026-08-09T00:00:00.000Z', ENV_DRY_RUN)
    const reads = { submissions: [], evidence: [] }
    const listRetentionDue = backlog.repository.listRetentionDue
    const listEvidenceDue = backlog.evidenceRepository.listDue
    backlog.repository.listRetentionDue = async (...args) => {
      reads.submissions.push(args[1])
      return listRetentionDue(...args)
    }
    backlog.evidenceRepository.listDue = async (...args) => {
      reads.evidence.push(args[1])
      return listEvidenceDue(...args)
    }
    for (let index = 0; index < 21; index += 1) {
      await backlog.repository.add(makeRecord(`dry-backlog-${String(index).padStart(2, '0')}`, backlog.now(), {
        rawState: { upload: 'deleted', review: 'absent' },
      }))
    }
    const writes = forbidDryRunMutations(backlog)
    const first = assertDryRunResponse(await backlog.service.run({}), { submissions: 20, evidence: 0, total: 20 })
    assert.equal(first.hasMore, true)
    assert.equal(typeof first.nextCursor, 'string')
    assert.equal(first.evidenceNextCursor, null)
    assert.equal(reads.submissions.length, 1)
    assert.equal(reads.submissions[0].limit, 20)
    assert.equal(reads.evidence.length, 0)
    const second = assertDryRunResponse(await backlog.service.run({ cursor: first.nextCursor }), { submissions: 1, evidence: 0, total: 1 })
    assert.equal(second.hasMore, false)
    assert.equal(second.nextCursor, null)
    assert.equal(reads.evidence.length, 1)
    assert.equal(reads.evidence[0].limit, 19)
    assert.equal(writes.submissionUpdates, 0)
    assert.equal(writes.submissionRemoves, 0)
    assert.equal(writes.evidenceRemoves, 0)
    assert.equal(writes.storageDeletes, 0)
    assert.equal(JSON.stringify(first).includes('dry-backlog-'), false)
    assert.equal(JSON.stringify(second).includes('dry-backlog-'), false)

    const evidenceBacklog = harness('2026-08-09T00:00:00.000Z', ENV_DRY_RUN)
    for (let index = 0; index < 21; index += 1) {
      await evidenceBacklog.evidenceRepository.add({
        _id: `dry-evidence-backlog-${String(index).padStart(2, '0')}`,
        approvedEvidence: { evidenceVersion: 'reviewed-track-evidence-v1' },
        approvedAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: new Date('2026-08-08T00:00:00.000Z'),
      })
    }
    const evidenceWrites = forbidDryRunMutations(evidenceBacklog)
    const evidenceFirst = assertDryRunResponse(await evidenceBacklog.service.run({}), { submissions: 0, evidence: 20, total: 20 })
    assert.equal(evidenceFirst.hasMore, true)
    assert.equal(evidenceFirst.nextCursor, null)
    assert.equal(typeof evidenceFirst.evidenceNextCursor, 'string')
    const evidenceSecond = assertDryRunResponse(await evidenceBacklog.service.run({ evidenceCursor: evidenceFirst.evidenceNextCursor }), { submissions: 0, evidence: 1, total: 1 })
    assert.equal(evidenceSecond.hasMore, false)
    assert.equal(evidenceSecond.evidenceNextCursor, null)
    assert.equal(evidenceWrites.submissionUpdates, 0)
    assert.equal(evidenceWrites.submissionRemoves, 0)
    assert.equal(evidenceWrites.evidenceRemoves, 0)
    assert.equal(evidenceWrites.storageDeletes, 0)
    assert.equal(JSON.stringify(evidenceFirst).includes('dry-evidence-backlog-'), false)
    assert.equal(JSON.stringify(evidenceSecond).includes('dry-evidence-backlog-'), false)

    const mixed = harness('2026-08-09T00:00:00.000Z', ENV_DRY_RUN)
    for (let index = 0; index < 15; index += 1) {
      await mixed.repository.add(makeRecord(`dry-mixed-sub-${String(index).padStart(2, '0')}`, mixed.now(), {
        rawState: { upload: 'deleted', review: 'absent' },
      }))
    }
    for (let index = 0; index < 10; index += 1) {
      await mixed.evidenceRepository.add({
        _id: `dry-mixed-evidence-${String(index).padStart(2, '0')}`,
        approvedEvidence: { evidenceVersion: 'reviewed-track-evidence-v1' },
        approvedAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: new Date('2026-08-08T00:00:00.000Z'),
      })
    }
    const mixedWrites = forbidDryRunMutations(mixed)
    const mixedFirst = assertDryRunResponse(await mixed.service.run({}), { submissions: 15, evidence: 5, total: 20 })
    assert.equal(mixedFirst.hasMore, true)
    assert.equal(typeof mixedFirst.nextCursor, 'string')
    assert.equal(typeof mixedFirst.evidenceNextCursor, 'string')
    const mixedSecond = assertDryRunResponse(await mixed.service.run({ cursor: mixedFirst.nextCursor, evidenceCursor: mixedFirst.evidenceNextCursor }), { submissions: 0, evidence: 5, total: 5 })
    assert.equal(mixedSecond.hasMore, false)
    assert.equal(mixedSecond.evidenceNextCursor, null)
    assert.equal(mixedWrites.submissionUpdates, 0)
    assert.equal(mixedWrites.submissionRemoves, 0)
    assert.equal(mixedWrites.evidenceRemoves, 0)
    assert.equal(mixedWrites.storageDeletes, 0)

    // An exactly full submission page must perform a read-only one-row evidence
    // lookahead so a due evidence row is neither skipped nor hidden by hasMore=false.
    const exactFull = harness('2026-08-09T00:00:00.000Z', ENV_DRY_RUN)
    const exactFullEvidenceReads = []
    const exactFullListEvidence = exactFull.evidenceRepository.listDue
    exactFull.evidenceRepository.listDue = async (...args) => {
      exactFullEvidenceReads.push(args[1])
      return exactFullListEvidence(...args)
    }
    for (let index = 0; index < 20; index += 1) {
      await exactFull.repository.add(makeRecord(`dry-exact-full-sub-${String(index).padStart(2, '0')}`, exactFull.now(), {
        rawState: { upload: 'deleted', review: 'absent' },
      }))
    }
    await exactFull.evidenceRepository.add({
      _id: 'dry-exact-full-evidence', approvedEvidence: { evidenceVersion: 'reviewed-track-evidence-v1' },
      approvedAt: new Date('2026-01-01T00:00:00.000Z'), expiresAt: new Date('2026-08-08T00:00:00.000Z'),
    })
    const exactFullWrites = forbidDryRunMutations(exactFull)
    const exactFullFirst = assertDryRunResponse(await exactFull.service.run({}), { submissions: 20, evidence: 0, total: 20 })
    assert.equal(exactFullFirst.hasMore, true)
    assert.equal(typeof exactFullFirst.nextCursor, 'string')
    assert.equal(exactFullFirst.evidenceNextCursor, null)
    assert.equal(exactFullEvidenceReads.length, 1)
    assert.equal(exactFullEvidenceReads[0].limit, 0)
    const exactFullSecond = assertDryRunResponse(await exactFull.service.run({ cursor: exactFullFirst.nextCursor }), { submissions: 0, evidence: 1, total: 1 })
    assert.equal(exactFullSecond.hasMore, false)
    assert.equal(exactFullSecond.nextCursor, null)
    assert.equal(exactFullSecond.evidenceNextCursor, null)
    assert.equal(exactFullEvidenceReads[1].limit, 20)
    assert.equal(exactFullWrites.submissionUpdates, 0)
    assert.equal(exactFullWrites.submissionRemoves, 0)
    assert.equal(exactFullWrites.evidenceRemoves, 0)
    assert.equal(exactFullWrites.storageDeletes, 0)

    // An exactly full submission page with no evidence must report an exhausted
    // scan with no misleading continuation cursor.
    const exactEmpty = harness('2026-08-09T00:00:00.000Z', ENV_DRY_RUN)
    const exactEmptyEvidenceReads = []
    const exactEmptyListEvidence = exactEmpty.evidenceRepository.listDue
    exactEmpty.evidenceRepository.listDue = async (...args) => {
      exactEmptyEvidenceReads.push(args[1])
      return exactEmptyListEvidence(...args)
    }
    for (let index = 0; index < 20; index += 1) {
      await exactEmpty.repository.add(makeRecord(`dry-exact-empty-sub-${String(index).padStart(2, '0')}`, exactEmpty.now(), {
        rawState: { upload: 'deleted', review: 'absent' },
      }))
    }
    const exactEmptyFirst = assertDryRunResponse(await exactEmpty.service.run({}), { submissions: 20, evidence: 0, total: 20 })
    assert.equal(exactEmptyFirst.hasMore, false)
    assert.equal(exactEmptyFirst.nextCursor, null)
    assert.equal(exactEmptyFirst.evidenceNextCursor, null)
    assert.equal(exactEmptyEvidenceReads.length, 1)
    assert.equal(exactEmptyEvidenceReads[0].limit, 0)

    // When a previous mixed page already supplied an evidence cursor, an exact
    // full submission page must preserve it through the unconsumed lookahead.
    const multiPage = harness('2026-08-09T00:00:00.000Z', ENV_DRY_RUN)
    for (let index = 0; index < 5; index += 1) {
      await multiPage.repository.add(makeRecord(`dry-sentinel-page1-sub-${String(index).padStart(2, '0')}`, multiPage.now(), {
        rawState: { upload: 'deleted', review: 'absent' },
      }))
    }
    for (let index = 0; index < 21; index += 1) {
      await multiPage.evidenceRepository.add({
        _id: `dry-sentinel-evidence-${String(index).padStart(2, '0')}`,
        approvedEvidence: { evidenceVersion: 'reviewed-track-evidence-v1' },
        approvedAt: new Date('2026-01-01T00:00:00.000Z'), expiresAt: new Date('2026-08-08T00:00:00.000Z'),
      })
    }
    const multiFirst = assertDryRunResponse(await multiPage.service.run({}), { submissions: 5, evidence: 15, total: 20 })
    assert.equal(multiFirst.hasMore, true)
    assert.equal(typeof multiFirst.nextCursor, 'string')
    assert.equal(typeof multiFirst.evidenceNextCursor, 'string')
    for (let index = 0; index < 20; index += 1) {
      await multiPage.repository.add(makeRecord(`dry-sentinel-page2-sub-${String(index).padStart(2, '0')}`, multiPage.now(), {
        rawState: { upload: 'deleted', review: 'absent' },
      }))
    }
    const multiSecond = assertDryRunResponse(await multiPage.service.run({
      cursor: multiFirst.nextCursor, evidenceCursor: multiFirst.evidenceNextCursor,
    }), { submissions: 20, evidence: 0, total: 20 })
    assert.equal(multiSecond.hasMore, true)
    assert.equal(typeof multiSecond.nextCursor, 'string')
    assert.equal(multiSecond.evidenceNextCursor, multiFirst.evidenceNextCursor)
    const multiThird = assertDryRunResponse(await multiPage.service.run({
      cursor: multiSecond.nextCursor, evidenceCursor: multiSecond.evidenceNextCursor,
    }), { submissions: 0, evidence: 6, total: 6 })
    assert.equal(multiThird.hasMore, false)
    assert.equal(multiThird.nextCursor, null)
    assert.equal(multiThird.evidenceNextCursor, null)

    // A carried evidence cursor must remain the exact opaque string even when
    // the next submission page has its own lookahead and skips evidence reads.
    const carriedMore = harness('2026-08-09T00:00:00.000Z', ENV_DRY_RUN)
    const carriedSubmissionReads = []
    const carriedEvidenceReads = []
    const carriedListSubmissions = carriedMore.repository.listRetentionDue
    const carriedListEvidence = carriedMore.evidenceRepository.listDue
    carriedMore.repository.listRetentionDue = async (...args) => {
      const rows = await carriedListSubmissions(...args)
      carriedSubmissionReads.push({ options: args[1], rows: rows.slice(0, args[1].limit) })
      return rows
    }
    carriedMore.evidenceRepository.listDue = async (...args) => {
      const rows = await carriedListEvidence(...args)
      carriedEvidenceReads.push({ options: args[1], rows: rows.slice(0, args[1].limit) })
      return rows
    }
    for (let index = 0; index < 5; index += 1) {
      await carriedMore.repository.add(makeRecord(`dry-carried-page1-sub-${String(index).padStart(2, '0')}`, carriedMore.now(), {
        rawState: { upload: 'deleted', review: 'absent' },
      }))
    }
    for (let index = 0; index < 21; index += 1) {
      await carriedMore.evidenceRepository.add({
        _id: `dry-carried-evidence-${String(index).padStart(2, '0')}`,
        approvedEvidence: { evidenceVersion: 'reviewed-track-evidence-v1' },
        approvedAt: new Date('2026-01-01T00:00:00.000Z'), expiresAt: new Date('2026-08-08T00:00:00.000Z'),
      })
    }
    const carriedWrites = forbidDryRunMutations(carriedMore)
    const carriedFirst = assertDryRunResponse(await carriedMore.service.run({}), { submissions: 5, evidence: 15, total: 20 })
    assert.equal(typeof carriedFirst.evidenceNextCursor, 'string')
    const carriedEvidenceCursor = carriedFirst.evidenceNextCursor
    assert.equal(JSON.stringify(carriedFirst).includes('evidenceKey'), false)
    assert.equal(JSON.stringify(carriedFirst).includes('dry-carried-evidence-'), false)
    for (let index = 0; index < 21; index += 1) {
      await carriedMore.repository.add(makeRecord(`dry-carried-page2-sub-${String(index).padStart(2, '0')}`, carriedMore.now(), {
        rawState: { upload: 'deleted', review: 'absent' },
      }))
    }
    const carriedSecond = assertDryRunResponse(await carriedMore.service.run({
      cursor: carriedFirst.nextCursor, evidenceCursor: carriedEvidenceCursor,
    }), { submissions: 20, evidence: 0, total: 20 })
    assert.equal(carriedSecond.hasMore, true)
    assert.equal(carriedSecond.evidenceNextCursor, carriedEvidenceCursor)
    assert.equal(JSON.stringify(carriedSecond).includes('evidenceKey'), false)
    assert.equal(JSON.stringify(carriedSecond).includes('dry-carried-evidence-'), false)
    const carriedThird = assertDryRunResponse(await carriedMore.service.run({
      cursor: carriedSecond.nextCursor, evidenceCursor: carriedSecond.evidenceNextCursor,
    }), { submissions: 1, evidence: 6, total: 7 })
    assert.equal(carriedThird.hasMore, false)
    assert.equal(carriedThird.nextCursor, null)
    assert.equal(carriedThird.evidenceNextCursor, null)
    assert.equal(JSON.stringify(carriedThird).includes('evidenceKey'), false)
    assert.equal(JSON.stringify(carriedThird).includes('dry-carried-evidence-'), false)
    const observedSubmissionIds = carriedSubmissionReads.flatMap((read) => read.rows.map((row) => row._id))
    const observedEvidenceIds = carriedEvidenceReads.flatMap((read) => read.rows.map((row) => row._id))
    assert.equal(new Set(observedSubmissionIds).size, observedSubmissionIds.length)
    assert.equal(new Set(observedEvidenceIds).size, observedEvidenceIds.length)
    assert.equal(observedSubmissionIds.length, 26)
    assert.equal(observedEvidenceIds.length, 21)
    assert.equal(carriedWrites.submissionUpdates, 0)
    assert.equal(carriedWrites.submissionRemoves, 0)
    assert.equal(carriedWrites.evidenceRemoves, 0)
    assert.equal(carriedWrites.storageDeletes, 0)
  }
  // Timer authority is server-owned and never inferred from the event body.
  assert.equal(h.service.timerAuthorized(''), true)
  assert.equal(h.service.timerAuthorized(null), false)
  assert.equal(h.service.timerAuthorized(undefined), false)
  assert.equal(h.service.timerAuthorized('forged-openid'), false)
  assert.equal(errorCode(await h.service.handle({ mode: 'retention' }, 'forged-openid')), 'invalid_mode')
  const authorized = await h.service.handle({ mode: 'retention' }, '')
  assert.equal(authorized.ok, true)
  assert.deepEqual(Object.keys(authorized).sort(), [
    'deleted', 'evidenceNextCursor', 'evidenceProcessed', 'nextCursor', 'now', 'ok', 'pending', 'processed',
  ])

  // The public handler dispatches the internal timer branch from server-owned context only.
  {
    const routeCalls = []
    const handler = createTrackSubmissionHandler({
      cloudSdk: { getWXContext() { return { OPENID: '' } } },
      env: ENV_DELETE,
      service: { async handle(event, openid) { routeCalls.push({ branch: 'owner', event, openid }); return { branch: 'owner' } } },
      retentionService: { async handle(event, openid) { routeCalls.push({ branch: 'timer', event, openid }); return { branch: 'timer' } } },
    })
    assert.deepEqual(await handler({ mode: 'retention', forged: true }), { branch: 'timer' })
    assert.deepEqual(routeCalls, [{ branch: 'timer', event: { mode: 'retention', forged: true }, openid: '' }])
  }

  // An unknown server OpenID may reach the internal gate through the existing router,
  // but the retention service rejects it before any due-list or mutation seam runs.
  {
    const unknownRepository = createMemoryRepository()
    const unknownEvidence = createMemoryEvidenceRepository()
    let dueReads = 0
    const listRetentionDue = unknownRepository.listRetentionDue
    unknownRepository.listRetentionDue = async (...args) => {
      dueReads += 1
      return listRetentionDue(...args)
    }
    const unknownRetention = createRetentionService({
      repository: unknownRepository,
      evidenceRepository: unknownEvidence,
      storage: { async deleteObject() { throw new Error('unknown identity must not delete') } },
      env: ENV_DELETE,
      clock: () => new Date('2026-08-09T00:00:00.000Z'),
    })
    const unknownHandler = createTrackSubmissionHandler({
      cloudSdk: { getWXContext() { return {} } },
      env: ENV_DELETE,
      service: { async handle() { throw new Error('unknown identity must not reach owner service') } },
      retentionService: unknownRetention,
    })
    assert.equal(errorCode(await unknownHandler({ mode: 'retention' })), 'invalid_mode')
    assert.equal(dueReads, 0)
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
  assert.equal(errorCode(await normal.handle({ mode: 'retention', TRIGGER_SRC: 'timer' }, '')), 'invalid_mode')

  {
    const routeCalls = []
    const forgedHandler = createTrackSubmissionHandler({
      cloudSdk: { getWXContext() { return { OPENID: 'client-owner' } } },
      env: ENV_DELETE,
      service: { async handle(event, openid) { routeCalls.push({ branch: 'owner', event, openid }); return { branch: 'owner' } } },
      retentionService: { async handle(event, openid) { routeCalls.push({ branch: 'timer', event, openid }); return { branch: 'timer' } } },
    })
    assert.deepEqual(await forgedHandler({ mode: 'retention', TRIGGER_SRC: 'timer' }), { branch: 'owner' })
    assert.deepEqual(routeCalls, [{ branch: 'owner', event: { mode: 'retention', TRIGGER_SRC: 'timer' }, openid: 'client-owner' }])
  }

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

  // Production-shaped CloudBase due-list seams are read-only in dry-run mode.
  {
    const calls = []
    const scanNow = new Date('2026-08-09T00:00:00.000Z')
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
            async get() {
              return {
                data: name === 'track_submissions'
                  ? [{ _id: 'cloud-dry-submission', recordExpiresAt: new Date(scanNow.getTime() - 1) }]
                  : [{ _id: 'cloud-dry-evidence', expiresAt: new Date(scanNow.getTime() - 1) }],
              }
            },
          }
          return query
        },
        doc(id) {
          calls.push({ type: 'doc', name, id })
          return {
            async get() { calls.push({ type: 'doc.get', name, id }); return { data: null } },
            async update() { calls.push({ type: 'doc.update', name, id }); throw new Error('dry-run update') },
            async remove() { calls.push({ type: 'doc.remove', name, id }); throw new Error('dry-run remove') },
          }
        },
      }
    }
    const db = { command, collection(name) { return collection(name) } }
    const cloudRepository = createCloudBaseRepository({ db })
    const cloudEvidence = createCloudBaseEvidenceRepository({ db })
    const cloudDry = createRetentionService({
      repository: cloudRepository,
      evidenceRepository: cloudEvidence,
      storage: { async deleteObject() { throw new Error('dry-run storage delete') } },
      env: ENV_DRY_RUN,
      clock: () => new Date(scanNow.getTime()),
    })
    const cloudPreview = assertDryRunResponse(await cloudDry.run({}), { submissions: 1, evidence: 1, total: 2 })
    assert.equal(cloudPreview.hasMore, false)
    assert.equal(calls.some((call) => ['doc', 'doc.get', 'doc.update', 'doc.remove'].includes(call.type)), false)
    assert.equal(JSON.stringify(cloudPreview).includes('cloud-dry-'), false)
  }

  console.log('PASS: C08 retention contract (fail-closed dry-run, zero-write bounded scan, timer authority and delete regression)')
}

run().catch((error) => { console.error(error); process.exitCode = 1 })
