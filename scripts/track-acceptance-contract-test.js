/** C06 owner → administrator → retention/UI offline acceptance contract. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const {
  ADMIN_OPENID,
  OWNER_A,
  OWNER_B,
  createAcceptanceHarness,
  gpxBytes,
  kmlBytes,
} = require('./fixtures/track-acceptance')
const { createTrackSubmissionModel, reduceTrackUi, selectTrackUiView } = require('../taro-app/src/pages/index/track-submission-model')

const DAY = 24 * 60 * 60 * 1000
const FORBIDDEN_PRIVATE_KEYS = new Set([
  '_openid', 'reviewerOpenid', 'creatorFileId', 'reviewFileId', 'cloudPath', 'reviewCloudPath',
  'serverEvidenceKey', 'evidenceKey', 'temporaryUrl', 'tempFileURL',
])
const OPTION_A_RESIDUE = [
  /\bview_raw\b/u,
  /\brawAccess\b/u,
  /\bincludeRawLink\b/u,
  /openAdminRaw/u,
  /openDocument/u,
  /downloadFile/u,
  /saveFile/u,
  /setClipboardData/u,
  /shareFileMessage/u,
  /shareAppMessage/u,
]
const OPTION_A_FILES = [
  'taro-app/src/pages/index/index.jsx',
  'taro-app/src/pages/index/track-submission-model.js',
  'taro-app/src/pages/index/track-submission-service.js',
]

function assertOptionAResidueAbsent(contents, label) {
  for (const pattern of OPTION_A_RESIDUE) assert.equal(pattern.test(contents), false, `${label}: residue ${pattern} must stay absent`)
}

function errorCode(response) {
  assert.equal(response && response.phase, 'error', 'expected an error response')
  return response.error.code
}

function clone(value) {
  if (value === undefined) return undefined
  return JSON.parse(JSON.stringify(value))
}

function assertNoKeys(value, forbidden, location = '$') {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoKeys(item, forbidden, `${location}[${index}]`))
    return
  }
  Object.entries(value).forEach(([key, child]) => {
    assert.equal(forbidden.has(key), false, `${location}.${key} must remain private`)
    assertNoKeys(child, forbidden, `${location}.${key}`)
  })
}

function assertNoEvidenceLinkage(value, submissionId, evidenceKey, label) {
  const serialized = JSON.stringify(value)
  assert.equal(serialized.includes(submissionId), false, `${label}: submission linkage must not cross boundary`)
  assert.equal(serialized.includes(evidenceKey), false, `${label}: evidence key must not cross boundary`)
  assertNoKeys(value, FORBIDDEN_PRIVATE_KEYS, label)
}

function assertExactKeys(value, expected, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label}: object is required`)
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label}: exact keys must remain frozen`)
}

function assertReviewedGeometryShape(geometry, label) {
  assertExactKeys(geometry, [
    'summaryVersion', 'pointCount', 'segmentCount', 'bounds', 'start', 'end', 'distanceM', 'elevation', 'previewSegments',
  ], `${label}.geometry`)
  assert.equal(geometry.summaryVersion, 'track-summary-v1')
  assert.ok(Number.isInteger(geometry.pointCount) && geometry.pointCount > 0, `${label}: geometry must contain points`)
  assert.ok(Number.isInteger(geometry.segmentCount) && geometry.segmentCount > 0, `${label}: geometry must contain segments`)
  assertExactKeys(geometry.bounds, ['minLat', 'maxLat', 'minLon', 'maxLon'], `${label}.bounds`)
  assertExactKeys(geometry.start, ['lat', 'lon', 'elevationM'], `${label}.start`)
  assertExactKeys(geometry.end, ['lat', 'lon', 'elevationM'], `${label}.end`)
  assertExactKeys(geometry.elevation, ['presentPointCount', 'coverage', 'minM', 'maxM'], `${label}.elevation`)
  assert.ok(Array.isArray(geometry.previewSegments) && geometry.previewSegments.length > 0, `${label}: preview is required`)
  geometry.previewSegments.forEach((segment, index) => {
    assertExactKeys(segment, ['segmentIndex', 'points'], `${label}.previewSegments[${index}]`)
    assert.ok(Array.isArray(segment.points) && segment.points.length > 0, `${label}.previewSegments[${index}]: points required`)
    segment.points.forEach((point, pointIndex) => {
      assertExactKeys(point, ['lat', 'lon', 'elevationM'], `${label}.previewSegments[${index}].points[${pointIndex}]`)
    })
  })
}

function assertApprovedEvidenceShape(evidence, label) {
  assertExactKeys(evidence, [
    'evidenceVersion', 'sourceKind', 'reviewStage', 'title', 'region', 'format', 'geometry', 'reviewedOn', 'limitations',
  ], label)
  assert.equal(evidence.evidenceVersion, 'reviewed-track-evidence-v1')
  assert.equal(evidence.sourceKind, 'community_track_candidate')
  assert.equal(evidence.reviewStage, 'admin_approved')
  assert.equal(typeof evidence.title, 'string')
  assert.ok(evidence.title.trim().length > 0, `${label}: title must be non-empty`)
  assert.ok(['gpx', 'kml'].includes(evidence.format), `${label}: format must be literal GPX/KML`)
  assert.match(evidence.reviewedOn, /^\d{4}-\d{2}-\d{2}$/u)
  assert.deepEqual(evidence.limitations, ['geometry_only', 'not_operational_status', 'not_route_publication'])
  assertReviewedGeometryShape(evidence.geometry, label)
}

function assertEvidenceRecordShape(record, label) {
  assertExactKeys(record, ['_id', 'approvedEvidence', 'approvedAt', 'expiresAt'], label)
  assert.ok(typeof record._id === 'string' && record._id.trim().length > 0, `${label}: evidence key must be non-empty`)
  assertApprovedEvidenceShape(record.approvedEvidence, `${label}.approvedEvidence`)
  assert.ok(Number.isFinite(new Date(record.approvedAt).getTime()), `${label}: approvedAt must be a date`)
  assert.ok(Number.isFinite(new Date(record.expiresAt).getTime()), `${label}: expiresAt must be a date`)
}

function assertExactRetention(record, label) {
  const snapshot = new Date(record.reviewSnapshotAt).getTime()
  const raw = new Date(record.rawExpiresAt).getTime()
  const recordExpiry = new Date(record.recordExpiresAt).getTime()
  const reviewed = new Date(record.review.reviewedAt).getTime()
  const evidence = new Date(record.evidenceExpiresAt).getTime()
  assert.equal(raw - snapshot, 30 * DAY, `${label}: raw deadline is exactly 30 days from snapshot`)
  assert.equal(recordExpiry - raw, 0, `${label}: identity record never outlives raw deadline`)
  assert.equal(evidence - reviewed, 180 * DAY, `${label}: evidence deadline is exactly 180 days from review`)
}

function assertAcceptanceFlowNoRuntimeMutation(before, after, label) {
  assert.deepEqual(after.routes, before.routes, `${label}: runtime route catalog must not change`)
  assert.equal(after.historySource, before.historySource, `${label}: private history function must not change`)
  assert.equal(after.publicUgcSource, before.publicUgcSource, `${label}: public UGC path must remain unchanged`)
}

function runtimeBoundarySnapshot() {
  const routes = require('../cloudfunctions/getAdvice/data/routes').BUILTIN_ROUTES
  return {
    routes: clone(routes),
    historySource: fs.readFileSync(path.resolve(__dirname, '../cloudfunctions/history/index.js'), 'utf8'),
    publicUgcSource: fs.readFileSync(path.resolve(__dirname, '../cloudfunctions/getAdvice/index.js'), 'utf8'),
  }
}

async function ownerFlowAndPrivacy() {
  const h = createAcceptanceHarness()
  const reservation = await h.begin({ ownerId: OWNER_A, attempt: 'owner-attempt-1', format: 'gpx' })
  assert.equal(reservation.phase, 'upload_reservation')
  assert.equal(reservation.cloudPath, `track-submissions/${reservation.submissionId}/upload.gpx`)
  assert.deepEqual(reservation.allowedActions, ['upload_finalize', 'cancel'])
  const reservationPrivateKeys = new Set([...FORBIDDEN_PRIVATE_KEYS].filter((key) => key !== 'cloudPath'))
  assertNoKeys(reservation, reservationPrivateKeys, 'upload reservation')

  // Same owner + attempt is a byte-for-byte retry identity; changed form input cannot overwrite it.
  const retried = await h.begin({ ownerId: OWNER_A, attempt: 'owner-attempt-1', title: 'changed after retry' })
  assert.deepEqual(retried, reservation, 'begin retry must return the original reservation')
  const otherOwner = await h.begin({ ownerId: OWNER_B, attempt: 'owner-attempt-1' })
  assert.notEqual(otherOwner.submissionId, reservation.submissionId, 'begin identity is owner-scoped')

  const readsBeforeMismatch = h.state.reads
  assert.equal(errorCode(await h.finalize(reservation, OWNER_A, 'cloud://evil.example.test/wrong/path.gpx')), 'upload_binding_invalid')
  assert.equal(h.state.reads, readsBeforeMismatch, 'reserved-path mismatch must have zero object reads')

  const finalized = await h.finalize(reservation, OWNER_A)
  assert.equal(finalized.phase, 'mine')
  assert.equal(finalized.submission.status, 'pending_review')
  assert.equal(finalized.submission.summary.pointCount, 3)
  assert.equal(finalized.submission.summary.hasTimestamps, true)
  const stored = await h.repository.get(reservation.submissionId)
  assert.equal(stored.cloudPath, reservation.cloudPath)
  assert.equal(stored.reviewCloudPath, `track-reviews/${reservation.submissionId}/review.gpx`)
  assert.equal(h.state.lastRead.cloudPath, reservation.cloudPath)
  assert.equal(h.state.reviewUploads[0].cloudPath, stored.reviewCloudPath)
  assert.deepEqual(h.state.reviewUploads[0].bytes, gpxBytes(), 'immutable review object must contain the exact uploaded bytes')

  // KML follows the same public vertical path and keeps its format in every owner/admin projection.
  const kmlHarness = createAcceptanceHarness()
  const kmlReservation = await kmlHarness.begin({ ownerId: OWNER_A, attempt: 'kml-vertical', format: 'kml' })
  assert.equal(kmlReservation.cloudPath, `track-submissions/${kmlReservation.submissionId}/upload.kml`)
  const kmlFinalized = await kmlHarness.finalize(kmlReservation, OWNER_A)
  assert.equal(kmlFinalized.submission.format, 'kml')
  assert.equal(kmlFinalized.submission.summary.format, 'kml')
  assert.equal(kmlFinalized.submission.summary.pointCount, 2)
  assert.equal(kmlFinalized.submission.summary.segmentCount, 1)
  const kmlStored = await kmlHarness.repository.get(kmlReservation.submissionId)
  assert.equal(kmlStored.reviewCloudPath,
    `track-reviews/${kmlReservation.submissionId}/review.kml`)
  assert.ok(Number.isFinite(new Date(kmlStored.reviewSnapshotAt).getTime()), 'KML immutable review snapshot must be recorded')
  assert.deepEqual(kmlHarness.state.reviewUploads[0].bytes, kmlBytes(), 'KML immutable review object must contain exact bytes')
  const kmlAdminList = await kmlHarness.call({ mode: 'admin_list' }, ADMIN_OPENID)
  assert.equal(kmlAdminList.items[0].format, 'kml')
  assert.equal(kmlAdminList.items[0].pointCount, 2)
  const kmlAdminDetail = await kmlHarness.call({ mode: 'admin_get', submissionId: kmlReservation.submissionId }, ADMIN_OPENID)
  assert.equal(kmlAdminDetail.submission.format, 'kml')
  assert.equal(kmlAdminDetail.submission.summary.format, 'kml')
  assert.equal(kmlAdminDetail.submission.summary.pointCount, 2)

  const ownerList = await h.call({ mode: 'list_mine', _openid: OWNER_B }, OWNER_A)
  assert.equal(ownerList.phase, 'mine_list')
  assert.deepEqual(ownerList.items.map((item) => item.submissionId), [reservation.submissionId])
  assertNoKeys(ownerList, FORBIDDEN_PRIVATE_KEYS, 'owner list')
  const otherOwnerList = await h.call({ mode: 'list_mine', _openid: OWNER_A }, OWNER_B)
  assert.deepEqual(otherOwnerList.items.map((item) => item.submissionId), [otherOwner.submissionId])
  const foreignGet = await h.call({ mode: 'get_mine', submissionId: reservation.submissionId, _openid: OWNER_A }, OWNER_B)
  assert.equal(errorCode(foreignGet), 'submission_not_found', 'forged owner identity must not cross records')
  const ownerDetail = await h.call({ mode: 'get_mine', submissionId: reservation.submissionId, _openid: OWNER_B }, OWNER_A)
  assert.equal(ownerDetail.phase, 'mine')
  assertNoKeys(ownerDetail, FORBIDDEN_PRIVATE_KEYS, 'owner detail')
  assert.equal(JSON.stringify(ownerDetail).includes(OWNER_A), false, 'owner OpenID must not enter DTO')

  const awaiting = await h.begin({ ownerId: OWNER_A, attempt: 'expiry-attempt' })
  const awaitingRecord = await h.repository.get(awaiting.submissionId)
  h.setNow(awaitingRecord.uploadExpiresAt)
  const readsBeforeExpiry = h.state.reads
  assert.equal(errorCode(await h.finalize(awaiting, OWNER_A)), 'upload_reservation_expired')
  assert.equal(h.state.reads, readsBeforeExpiry, 'expired reservation must not read storage')

  return { h, reservation, finalized, stored }
}

async function adminReviewTableAndRevision() {
  const decisions = [
    { decision: 'changes_requested', note: '请补充路线记录说明' },
    { decision: 'rejected', note: null },
    { decision: 'approved_evidence', note: null },
  ]
  const outputs = []
  for (const [index, choice] of decisions.entries()) {
    const h = createAcceptanceHarness()
    const reservation = await h.begin({ ownerId: OWNER_A, attempt: `decision-${choice.decision}` })
    const finalized = await h.finalize(reservation, OWNER_A)
    const list = await h.call({ mode: 'admin_list', limit: 20, _openid: OWNER_A }, ADMIN_OPENID)
    assert.equal(list.phase, 'admin_list')
    assert.equal(list.items.length, 1)
    assert.deepEqual(list.items[0].allowedAdminActions, ['view_raw', 'request_changes', 'reject', 'approve_evidence'])
    assertNoKeys(list, FORBIDDEN_PRIVATE_KEYS, 'admin list')

    const detail = await h.call({ mode: 'admin_get', submissionId: reservation.submissionId, _openid: OWNER_A }, ADMIN_OPENID)
    assert.equal(detail.phase, 'admin_detail')
    assert.equal(detail.submission.rawAccess, null)
    assertNoKeys(detail, FORBIDDEN_PRIVATE_KEYS, 'admin detail')
    const attempt = `review-attempt-${index}`
    assert.equal(errorCode(await h.call({
      mode: 'admin_review', submissionId: reservation.submissionId, expectedVersion: finalized.submission.version - 1,
      reviewAttemptId: `${attempt}-stale`, decision: choice.decision, note: choice.note, _openid: OWNER_A,
    }, ADMIN_OPENID)), 'version_conflict', 'review version CAS must fail closed')
    if (choice.decision === 'rejected') h.state.failDelete = true
    const reviewed = await h.call({
      mode: 'admin_review', submissionId: reservation.submissionId, expectedVersion: finalized.submission.version,
      reviewAttemptId: attempt, decision: choice.decision, note: choice.note, _openid: OWNER_A,
    }, ADMIN_OPENID)
    assert.equal(reviewed.phase, 'admin_detail')
    assert.equal(reviewed.submission.status, choice.decision)
    if (choice.decision === 'changes_requested') {
      assert.equal(reviewed.submission.reviewNote, choice.note)
      const replay = await h.call({
        mode: 'admin_review', submissionId: reservation.submissionId, expectedVersion: 999,
        reviewAttemptId: attempt, decision: 'rejected', note: 'mutated replay', _openid: OWNER_A,
      }, ADMIN_OPENID)
      assert.equal(replay.submission.status, 'changes_requested', 'same review attempt is first-write-wins')
      assert.equal(replay.submission.reviewNote, choice.note)
      const parent = await h.repository.get(reservation.submissionId)
      const revision = await h.begin({ ownerId: OWNER_A, attempt: 'revision-attempt', revisesSubmissionId: parent._id })
      assert.equal(revision.phase, 'upload_reservation')
      const revised = await h.finalize(revision, OWNER_A)
      assert.equal(revised.submission.revisesSubmissionId, parent._id)
      const staleCancel = await h.call({ mode: 'cancel', submissionId: revision.submissionId, expectedVersion: revised.submission.version - 1 }, OWNER_A)
      assert.equal(errorCode(staleCancel), 'version_conflict')
      h.state.failDelete = true
      const cancelled = await h.call({ mode: 'cancel', submissionId: revision.submissionId, expectedVersion: revised.submission.version }, OWNER_A)
      assert.equal(cancelled.submission.status, 'cancelled')
      assert.equal(cancelled.submission.cleanup.pending, true, 'failed cancellation cleanup remains pending')
      h.state.failDelete = false
      const repaired = await h.call({ mode: 'cancel', submissionId: revision.submissionId, expectedVersion: 1 }, OWNER_A)
      assert.equal(repaired.submission.cleanup.pending, false, 'cleanup retry reports physical state honestly')
      const parentAfter = await h.repository.get(parent._id)
      assert.equal(parentAfter.replacementSubmissionId, null, 'terminal revision unlocks parent pointer')
    }
    if (choice.decision === 'rejected') {
      assert.equal(reviewed.submission.cleanup.pending, true)
      h.state.failDelete = false
      const replay = await h.call({
        mode: 'admin_review', submissionId: reservation.submissionId, expectedVersion: 1,
        reviewAttemptId: attempt, decision: 'approved_evidence', note: 'mutated replay', _openid: OWNER_A,
      }, ADMIN_OPENID)
      assert.equal(replay.submission.status, 'rejected')
      assert.equal(replay.submission.cleanup.pending, false, 'reject replay repairs only pending cleanup')
    }
    if (choice.decision === 'approved_evidence') {
      const stored = await h.repository.get(reservation.submissionId)
      const evidenceRows = await h.evidenceRepository.snapshot()
      assert.equal(evidenceRows.length, 1)
      assertExactRetention(stored, 'approved evidence')
      assert.equal(stored.input.provenancePlatform, 'self', 'private provenance input must be non-empty before projection')
      assert.equal(stored.input.note, 'C06 offline review fixture', 'private note input must be non-empty before projection')
      const evidenceKey = evidenceRows[0]._id
      assertEvidenceRecordShape(evidenceRows[0], 'stored evidence record')
      assertApprovedEvidenceShape(evidenceRows[0].approvedEvidence, 'stored approved evidence')
      assertApprovedEvidenceShape(reviewed.submission.approvedEvidence, 'review response approved evidence display')
      const adminDisplay = await h.call({ mode: 'admin_get', submissionId: reservation.submissionId }, ADMIN_OPENID)
      assertApprovedEvidenceShape(adminDisplay.submission.approvedEvidence, 'admin detail approved evidence display DTO')
      assert.equal(Object.hasOwn(reviewed.submission.approvedEvidence, 'serverEvidenceKey'), false)
      assertNoEvidenceLinkage(reviewed.submission.approvedEvidence, reservation.submissionId, evidenceKey, 'admin approved evidence display')
      const ownerAfterApproval = await h.call({ mode: 'get_mine', submissionId: reservation.submissionId }, OWNER_A)
      assert.equal(ownerAfterApproval.submission.approvedEvidence, undefined, 'owner DTO must not expose approved-evidence display')
      assert.equal(JSON.stringify(ownerAfterApproval).includes(evidenceKey), false)
      assert.equal(JSON.stringify(evidenceRows[0]).includes(OWNER_A), false)
      assert.equal(JSON.stringify(evidenceRows[0]).includes(reservation.submissionId), false)
      assert.equal(JSON.stringify(evidenceRows[0]).includes(stored.reviewFileId), false)
      assertNoKeys(evidenceRows[0], FORBIDDEN_PRIVATE_KEYS, 'evidence record')

      // Each representative privacy/linkage leak must be rejected by the independent exact-key oracle.
      const evidenceMutations = [
        ['provenance', (value) => { value.approvedEvidence.provenancePlatform = 'self' }],
        ['raw', (value) => { value.rawFileId = stored.reviewFileId }],
        ['linkage', (value) => { value.submissionId = reservation.submissionId }],
      ]
      evidenceMutations.forEach(([name, mutate]) => {
        const mutated = clone(evidenceRows[0])
        mutate(mutated)
        assert.throws(() => assertEvidenceRecordShape(mutated, `mutated stored evidence ${name}`),
          `stored evidence ${name} leak must turn the focused gate RED`)
      })
      const displayMutations = [
        ['note', (value) => { value.note = 'private admin note' }],
        ['raw', (value) => { value.rawAccess = { url: 'https://raw.example.test/leak' } }],
        ['linkage', (value) => { value.submissionId = reservation.submissionId }],
        ['provenance', (value) => { value.provenancePageUrl = 'https://private.example.test/provenance' }],
      ]
      displayMutations.forEach(([name, mutate]) => {
        const mutated = clone(adminDisplay.submission.approvedEvidence)
        mutate(mutated)
        assert.throws(() => assertApprovedEvidenceShape(mutated, `mutated display ${name}`),
          `display ${name} leak must turn the focused gate RED`)
      })
      const replay = await h.call({
        mode: 'admin_review', submissionId: reservation.submissionId, expectedVersion: 999,
        reviewAttemptId: attempt, decision: 'rejected', note: 'mutated replay', _openid: OWNER_A,
      }, ADMIN_OPENID)
      assert.equal(replay.submission.status, 'approved_evidence', 'approval replay must keep first decision')
      const afterReplay = await h.repository.get(reservation.submissionId)
      assert.equal(new Date(afterReplay.rawExpiresAt).getTime(), new Date(stored.rawExpiresAt).getTime(), 'review replay cannot extend raw deadline')
      assert.equal(new Date(afterReplay.evidenceExpiresAt).getTime(), new Date(stored.evidenceExpiresAt).getTime(), 'review replay cannot extend evidence deadline')
      outputs.push({ h, reservation, reviewed, stored, evidenceKey })
    }
  }

  // The server context, not event._openid, determines admin authority; denied calls do no I/O.
  const authority = createAcceptanceHarness()
  const before = { reads: authority.state.reads, urls: authority.state.temporaryUrls.length, deletes: authority.state.deletes.length }
  assert.equal(errorCode(await authority.call({ mode: 'admin_list', _openid: ADMIN_OPENID }, OWNER_B)), 'forbidden')
  assert.deepEqual({ reads: authority.state.reads, urls: authority.state.temporaryUrls.length, deletes: authority.state.deletes.length }, before)

  // Approval and owner cancellation share one version/CAS boundary: exactly one transition wins.
  const race = createAcceptanceHarness()
  const raceReservation = await race.begin({ ownerId: OWNER_A, attempt: 'cancel-review-race' })
  const raceFinal = await race.finalize(raceReservation, OWNER_A)
  let releaseEvidence
  const gate = new Promise((resolve) => { releaseEvidence = resolve })
  const originalAdd = race.evidenceRepository.add
  race.evidenceRepository.add = async (record) => { await gate; return originalAdd(record) }
  const pendingApproval = race.call({ mode: 'admin_review', submissionId: raceReservation.submissionId,
    expectedVersion: raceFinal.submission.version, reviewAttemptId: 'race-approval', decision: 'approved_evidence', note: null }, ADMIN_OPENID)
  await new Promise((resolve) => setImmediate(resolve))
  const cancelled = await race.call({ mode: 'cancel', submissionId: raceReservation.submissionId, expectedVersion: raceFinal.submission.version }, OWNER_A)
  assert.equal(cancelled.submission.status, 'cancelled')
  releaseEvidence()
  assert.equal(errorCode(await pendingApproval), 'invalid_state')
  assert.equal((await race.evidenceRepository.snapshot()).length, 0)

  return outputs[0]
}

async function retentionBoundariesAndBacklog(approved) {
  const { h, reservation, stored, evidenceKey } = approved
  assertExactRetention(stored, 'raw/record/evidence retention')
  const rawExpiry = new Date(stored.rawExpiresAt).getTime()
  const evidenceExpiry = new Date(stored.evidenceExpiresAt).getTime()
  h.setNow(new Date(rawExpiry - 1000))
  const beforeRaw = await h.call({ mode: 'admin_get', submissionId: reservation.submissionId, includeRawLink: true }, ADMIN_OPENID)
  assert.equal(beforeRaw.phase, 'admin_detail')
  assert.equal(h.state.temporaryUrls.at(-1).maxAge, 1)
  h.setNow(rawExpiry)
  assert.equal(errorCode(await h.call({ mode: 'admin_get', submissionId: reservation.submissionId, includeRawLink: true }, ADMIN_OPENID)), 'submission_not_found')
  assert.equal(errorCode(await h.call({ mode: 'get_mine', submissionId: reservation.submissionId }, OWNER_A)), 'submission_not_found')
  h.setEnv('TRIGGER_SRC', 'timer')
  h.setOpenid('')
  const rawCleanup = await h.handler({})
  assert.equal(rawCleanup.ok, true)
  assert.equal(await h.repository.get(reservation.submissionId), null, 'identity record disappears at raw/record deadline')
  assert.equal((await h.evidenceRepository.get(evidenceKey)) !== null, true, 'approved evidence outlives raw by 180-day policy')
  h.setNow(new Date(evidenceExpiry - 1))
  assert.equal((await h.evidenceRepository.get(evidenceKey)) !== null, true)
  h.setNow(evidenceExpiry)
  const evidenceCleanup = await h.handler({})
  assert.equal(evidenceCleanup.ok, true)
  assert.equal(await h.evidenceRepository.get(evidenceKey), null, 'evidence is inaccessible/deleted at 180 days')

  // Normal client and forged event cannot enter the timer-only branch.
  const authority = createAcceptanceHarness()
  assert.equal(errorCode(await authority.call({ mode: 'retention', TRIGGER_SRC: 'timer' }, 'client-owner')), 'invalid_mode')
  authority.setEnv('TRIGGER_SRC', 'timer')
  assert.equal(errorCode(await authority.call({ mode: 'retention' }, OWNER_A)), 'invalid_mode')

  // 21 due records prove max-20 pagination, stable cursor drain and duplicate delivery safety.
  const backlog = createAcceptanceHarness()
  for (let index = 0; index < 21; index += 1) {
    const row = await backlog.begin({ ownerId: OWNER_A, attempt: `backlog-${index}` })
    const record = await backlog.repository.get(row.submissionId)
    await backlog.repository.update(record._id, { _id: record._id, status: record.status, version: record.version }, {
      rawExpiresAt: new Date('2026-08-09T00:00:00.000Z'),
      recordExpiresAt: new Date('2026-08-09T00:00:00.000Z'),
      updatedAt: new Date('2026-08-09T00:00:00.000Z'),
    })
  }
  backlog.setNow('2026-08-10T00:00:00.000Z')
  backlog.setEnv('TRIGGER_SRC', 'timer')
  backlog.setOpenid('')
  const first = await backlog.handler({})
  assert.equal(first.ok, true)
  assert.equal(first.processed, 20)
  assert.ok(first.nextCursor)
  const second = await backlog.handler({ cursor: first.nextCursor })
  assert.equal(second.ok, true)
  assert.equal(second.processed, 1)
  const duplicate = await backlog.handler({ cursor: first.nextCursor })
  assert.equal(duplicate.ok, true)
  assert.equal(duplicate.processed, 0, 'duplicate timer delivery is idempotent')

  // CAS conflict and deletion-pending are recoverable; missing-object status is idempotent success.
  const repair = createAcceptanceHarness()
  const pending = await repair.begin({ ownerId: OWNER_A, attempt: 'pending-repair' })
  const pendingRecord = await repair.repository.get(pending.submissionId)
  await repair.repository.update(pendingRecord._id, { _id: pendingRecord._id, status: pendingRecord.status, version: pendingRecord.version }, {
    rawExpiresAt: new Date('2026-08-09T00:00:00.000Z'),
    recordExpiresAt: new Date('2026-08-09T00:00:00.000Z'),
    updatedAt: new Date('2026-08-09T00:00:00.000Z'),
  })
  repair.setNow('2026-08-10T00:00:00.000Z')
  repair.setEnv('TRIGGER_SRC', 'timer')
  repair.setOpenid('')
  repair.state.failDelete = true
  const originalUpdate = repair.repository.update
  let forceConflict = true
  repair.repository.update = async (...args) => {
    if (forceConflict) { forceConflict = false; return null }
    return originalUpdate(...args)
  }
  const conflict = await repair.handler({})
  assert.equal(conflict.ok, true)
  assert.equal(conflict.processed, 0, 'CAS conflict must not claim cleanup completed')
  const failed = await repair.handler({})
  assert.equal(failed.ok, true)
  const pendingStored = await repair.repository.get(pending.submissionId)
  assert.equal(pendingStored.rawFileState.upload, 'deletion_pending')
  repair.state.failDelete = false
  const repaired = await repair.handler({})
  assert.equal(repaired.ok, true)
  assert.equal(await repair.repository.get(pending.submissionId), null)

  const missing = createAcceptanceHarness()
  const missingReservation = await missing.begin({ ownerId: OWNER_A, attempt: 'missing-delete' })
  const missingRecord = await missing.repository.get(missingReservation.submissionId)
  await missing.repository.update(missingRecord._id, { _id: missingRecord._id, status: missingRecord.status, version: missingRecord.version }, {
    rawExpiresAt: new Date('2026-08-09T00:00:00.000Z'),
    recordExpiresAt: new Date('2026-08-09T00:00:00.000Z'),
    updatedAt: new Date('2026-08-09T00:00:00.000Z'),
  })
  missing.setNow('2026-08-10T00:00:00.000Z')
  missing.setEnv('TRIGGER_SRC', 'timer')
  missing.setOpenid('')
  missing.state.missingDelete = true
  const missingResult = await missing.handler({})
  assert.equal(missingResult.ok, true)
  assert.equal(await missing.repository.get(missingReservation.submissionId), null, 'missing storage object is idempotent cleanup success')
}

async function optionAUiBoundary() {
  const source = OPTION_A_FILES.map((relative) => ({ relative, text: fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf8') }))
  for (const { relative, text: contents } of source) assertOptionAResidueAbsent(contents, relative)

  const h = createAcceptanceHarness()
  const service = h.createUiService()
  const pending = await h.begin({ ownerId: OWNER_A, attempt: 'ui-poison' })
  const finalized = await h.finalize(pending, OWNER_A)
  const request = await service.getAdmin(pending.submissionId)
  assert.equal(request.phase, 'admin_detail')
  const lastRequest = h.state.uiRequests.at(-1)
  assert.deepEqual(lastRequest.data, { mode: 'admin_get', submissionId: pending.submissionId })
  assert.equal(Object.hasOwn(lastRequest.data, 'includeRawLink'), false)

  let uiState = createTrackSubmissionModel().getState()
  uiState = reduceTrackUi(uiState, { type: 'ADMIN_LIST_REQUEST', status: null })
  const listToken = uiState.admin.listToken
  uiState = reduceTrackUi(uiState, {
    type: 'ADMIN_LIST_RESPONSE', token: listToken, generation: uiState.admin.generation, status: null,
    response: { phase: 'admin_list', items: [{
      submissionId: pending.submissionId, title: 'poisoned', format: 'gpx', status: 'pending_review', version: finalized.submission.version,
      retention: { rawExpiresAt: '2026-12-01T00:00:00.000Z', recordExpiresAt: '2026-12-01T00:00:00.000Z' },
      allowedAdminActions: ['view_raw', 'request_changes', 'reject', 'approve_evidence'],
      rawAccess: { url: 'https://raw.example.test/poison' }, _openid: OWNER_A, evidenceKey: 'evidence-poison',
    }], nextCursor: null },
  })
  assert.deepEqual(uiState.admin.items[0].allowedAdminActions, ['request_changes', 'reject', 'approve_evidence'])
  assertNoKeys(uiState, new Set(['rawAccess', 'url', '_openid', 'evidenceKey']), 'option-A list state')
  assertNoKeys(selectTrackUiView(uiState), new Set(['rawAccess', 'url', '_openid', 'evidenceKey']), 'option-A list view')
  const detailTokenState = reduceTrackUi(uiState, { type: 'ADMIN_DETAIL_REQUEST', submissionId: pending.submissionId })
  const detailToken = detailTokenState.admin.detailToken
  uiState = reduceTrackUi(detailTokenState, {
    type: 'ADMIN_DETAIL_RESPONSE', token: detailToken, generation: detailTokenState.admin.generation,
    response: { phase: 'admin_detail', submission: {
      submissionId: pending.submissionId, title: 'poisoned', format: 'gpx', status: 'pending_review', version: finalized.submission.version,
      retention: { rawExpiresAt: '2026-12-01T00:00:00.000Z', recordExpiresAt: '2026-12-01T00:00:00.000Z' },
      summary: finalized.submission.summary, allowedAdminActions: ['view_raw', 'approve_evidence'],
      rawAccess: { url: 'https://raw.example.test/poison' }, _openid: OWNER_A, reviewerOpenid: ADMIN_OPENID,
    } },
  })
  const view = selectTrackUiView(uiState)
  assert.equal(view.admin.detail.submission.allowedAdminActions.includes('view_raw'), false)
  assertNoKeys(uiState, new Set(['rawAccess', 'url', '_openid', 'reviewerOpenid']), 'option-A detail state')
  assertNoKeys(view, new Set(['rawAccess', 'url', '_openid', 'reviewerOpenid']), 'option-A detail view')
  assert.equal(JSON.stringify(view).includes('raw.example.test'), false)
  assert.equal(h.state.uiPlatformCalls.length, 0, 'poisoned raw input must not trigger platform I/O')
  assert.equal(JSON.stringify(h.state.uiRequests).includes('raw.example.test'), false, 'poisoned raw URL must not enter request/log state')

  // The production assertions are mutation-sensitive: representative reintroductions must be detected.
  assert.throws(() => assertOptionAResidueAbsent(`${source[0].text}\nincludeRawLink`, 'mutated raw request'),
    'raw request/opener reintroduction must turn the focused gate RED')
  assert.throws(() => assertOptionAResidueAbsent('shareFileMessage', 'mutated shareFileMessage'),
    'shareFileMessage reintroduction must independently turn the focused gate RED')
  assert.throws(() => {
    const mutated = clone(view)
    mutated.admin.detail.submission.allowedAdminActions.push('view_raw')
    assert.equal(mutated.admin.detail.submission.allowedAdminActions.includes('view_raw'), false)
  }, 'view_raw action projection mutation must turn the focused gate RED')
}

async function runtimeCatalogBoundary() {
  const before = runtimeBoundarySnapshot()
  const h = createAcceptanceHarness()
  const row = await h.begin({ ownerId: OWNER_A, attempt: 'catalog-boundary' })
  const finalized = await h.finalize(row, OWNER_A)
  await h.call({ mode: 'admin_list' }, ADMIN_OPENID)
  await h.call({ mode: 'admin_review', submissionId: row.submissionId, expectedVersion: finalized.submission.version,
    reviewAttemptId: 'catalog-approval', decision: 'approved_evidence', note: null }, ADMIN_OPENID)
  const after = runtimeBoundarySnapshot()
  assertAcceptanceFlowNoRuntimeMutation(before, after, 'acceptance flow runtime mutation boundary')

  // These probes only prove that the no-mutation oracle is discriminating; source integrity is covered by the
  // exact production-file allowlist/diff and the existing route/weather/verdict/history focused gates.
  assert.throws(() => {
    const mutated = clone(after)
    mutated.routes[0].operationalStatus = 'open'
    assertAcceptanceFlowNoRuntimeMutation(before, mutated, 'mutation probe')
  }, 'catalog operational-status mutation must turn the focused gate RED')
  assert.throws(() => {
    const mutated = clone(after)
    mutated.routes[0].type = mutated.routes[0].type === 'trek' ? 'climb' : 'trek'
    assertAcceptanceFlowNoRuntimeMutation(before, mutated, 'mutation probe')
  }, 'catalog route-type mutation must turn the focused gate RED')
}

async function run() {
  const owner = await ownerFlowAndPrivacy()
  const approved = await adminReviewTableAndRevision()
  await retentionBoundariesAndBacklog(approved)
  await optionAUiBoundary()
  await runtimeCatalogBoundary()

  assert.ok(owner.h && approved.h, 'vertical fixture harnesses were exercised')
  console.log('PASS: C06 track-submission owner→admin→retention/UI acceptance contract')
}

run().catch((error) => {
  console.error(error && error.stack ? error.stack : error)
  process.exitCode = 1
})
