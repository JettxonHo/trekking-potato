const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const model = require('../taro-app/src/pages/index/track-submission-model')
const { createTrackSubmissionService } = require('../taro-app/src/pages/index/track-submission-service')

function expectError(value, code, nextAction) {
  const error = value && value.phase === 'error' ? value.error : value && value.error
  assert.ok(error)
  assert.equal(error.code, code)
  assert.equal(error.nextAction, nextAction)
  assert.equal(error.message, model.ERROR_TABLE[code][0])
}

const rightsText = model.RIGHTS_COPY
assert.match(rightsText, /提交前请确认：这是我本人记录、已获得记录者明确授权，或采用允许本次复制和私下审核的开放许可之轨迹。/)
assert.match(rightsText, /原始上传、审核副本和含身份提交记录的可访问期最长 30 天/)
assert.match(rightsText, /去身份几何证据的可访问期最长 180 天/)
assert.match(rightsText, /不会宣称已删除/)
assert.match(model.RIGHTS_PLATFORM_COPY, /不要上传从第三方平台抓取、破解下载或无权再分发的轨迹。/)
assert.deepEqual(model.RIGHTS_BASES, ['own_recording', 'authorized_by_creator', 'open_license'])
assert.equal(model.createInitialTrackForm().rightsAccepted, false)
assert.equal(model.createInitialTrackForm().rightsBasis, 'own_recording')
assert.equal(model.createInitialTrackForm({ rightsBasis: 'open_license' }).rightsAccepted, false)
assert.equal(model.createInitialTrackForm({ rightsAccepted: true }).rightsAccepted, false)

const statusActions = {
  awaiting_upload: ['upload_finalize', 'cancel'],
  processing: ['refresh'],
  pending_review: ['cancel'],
  changes_requested: ['begin_revision', 'cancel'],
  approved_evidence: [],
  rejected: [],
  cancelled: [],
  invalid: [],
}
assert.deepEqual(Object.fromEntries(model.STATUS_ROWS.map((row) => [row.status, row.actions])), statusActions)
assert.equal(model.STATUS_ROWS.length, 8)
assert.equal(model.ACTION_LABELS.retry_cleanup, '重试清理')

const validFile = { name: 'track.GPX', size: 128, path: '/private/tmp/local-track.gpx' }
assert.deepEqual(model.validateLocalFile(validFile), { ok: true, value: { name: 'track.GPX', format: 'gpx', size: 128 } })
expectError(model.validateLocalFile({ name: 'track.kmz', size: 128 }), 'unsupported_format', null)
expectError(model.validateLocalFile({ name: 'track.gpx', size: model.MAX_TRACK_BYTES + 1 }), 'file_size_invalid', 'restart_upload')
expectError(model.validateLocalFile({ name: 'track.gpx', size: 0 }), 'file_size_invalid', 'restart_upload')

const baseForm = {
  title: '我的轨迹',
  region: '江西',
  note: '私有审核备注',
  provenancePlatform: 'self',
  provenancePageUrl: '',
  rightsBasis: 'own_recording',
  rightsAccepted: true,
  licenseName: '',
  licenseUrl: '',
}
const payload = model.buildBeginPayload(baseForm, validFile, { beginAttemptId: 'attempt-fixed' })
assert.equal(payload.ok, true)
assert.deepEqual(payload.value, {
  mode: 'begin',
  beginAttemptId: 'attempt-fixed',
  originalFilename: 'track.GPX',
  declaredSizeBytes: 128,
  title: '我的轨迹',
  region: '江西',
  note: '私有审核备注',
  provenancePlatform: 'self',
  provenancePageUrl: null,
  rightsBasis: 'own_recording',
  rightsAccepted: true,
  rightsDeclarationVersion: 'track-rights-v1',
  licenseName: null,
  licenseUrl: null,
  revisesSubmissionId: null,
})
expectError(model.buildBeginPayload({ ...baseForm, rightsAccepted: false }, validFile, { beginAttemptId: 'attempt-fixed' }), 'invalid_rights_declaration', null)
assert.equal(model.validateTrackForm({ ...baseForm, rightsBasis: 'open_license', rightsAccepted: true }).ok, false)
assert.equal(model.validateTrackForm({ ...baseForm, rightsBasis: 'open_license', rightsAccepted: true, licenseName: 'CC BY', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' }).ok, true)

async function serviceContract() {
  const requests = []
  const uploads = []
  let chooseCount = 0
  let beginCount = 0
  let randomValue = 0.123
  const service = createTrackSubmissionService({
    now: () => 1700000000000,
    random: () => { randomValue += 0.1; return randomValue },
    chooseFile: async () => {
      chooseCount += 1
      return { tempFiles: [{ name: 'picked.kml', size: 256, path: '/private/tmp/picked.kml' }] }
    },
    callFunction: async ({ name, data }) => {
      assert.equal(name, 'trackSubmission')
      requests.push({ name, data: JSON.parse(JSON.stringify(data)) })
      if (data.mode === 'begin') {
        beginCount += 1
        return beginCount === 1 ? { result: { phase: 'error', error: { code: 'store_unavailable' } } } : {
          result: {
            phase: 'upload_reservation', submissionId: 'sub-1', status: 'awaiting_upload', version: 1,
            cloudPath: 'track-submissions/sub-1/upload.kml', format: 'kml', expiresAt: '2026-08-09T00:30:00.000Z',
            allowedActions: ['upload_finalize', 'cancel'],
          },
        }
      }
      assert.equal(data.mode, 'finalize')
      assert.equal(data.submissionId, 'sub-1')
      assert.equal(data.fileID, 'cloud://bucket/track-submissions/sub-1/upload.kml')
      return { result: { phase: 'mine', submission: { submissionId: 'sub-1', title: '我的轨迹', status: 'pending_review', version: 2, allowedActions: ['cancel'], retention: { recordExpiresAt: '2026-12-01T00:00:00.000Z' } } } }
    },
    uploadFile: async (input) => {
      uploads.push(input)
      assert.equal(input.cloudPath, 'track-submissions/sub-1/upload.kml')
      assert.equal(input.filePath, '/private/tmp/picked.kml')
      return { fileID: 'cloud://bucket/track-submissions/sub-1/upload.kml' }
    },
  })
  const picked = await service.chooseLocalFile()
  assert.equal(picked.ok, true)
  assert.equal(chooseCount, 1)
  const first = await service.begin({ ...baseForm, rightsBasis: 'own_recording', rightsAccepted: true }, { file: { name: 'picked.kml', size: 256, path: '/private/tmp/picked.kml' } })
  expectError(first, 'store_unavailable', 'retry')
  assert.equal(beginCount, 1, 'manual retry must be explicit; begin has no hidden retry loop')
  const retry = await service.begin({ title: 'CHANGED', rightsBasis: 'own_recording', rightsAccepted: true }, { retry: true })
  assert.equal(retry.phase, 'upload_reservation')
  assert.equal(requests[0].data.beginAttemptId, requests[1].data.beginAttemptId)
  assert.deepEqual(requests[0].data, requests[1].data)
  const mine = await service.resumeUploadFinalize('sub-1')
  assert.equal(mine.phase, 'mine')
  assert.equal(uploads.length, 1)
  assert.equal(requests[2].data.mode, 'finalize')

  const freshPick = await service.chooseLocalFile()
  assert.equal(freshPick.ok, true)
  const fresh = await service.begin(baseForm)
  assert.equal(fresh.phase, 'upload_reservation')
  assert.notEqual(requests[3].data.beginAttemptId, requests[1].data.beginAttemptId)

  const invalid = await createTrackSubmissionService({
    chooseFile: async () => ({ tempFiles: [{ name: 'bad.zip', size: 1, path: '/private/tmp/bad.zip' }] }),
    callFunction: async () => { throw new Error('network must not be called') },
    uploadFile: async () => { throw new Error('upload must not be called') },
  }).chooseLocalFile()
  expectError(invalid, 'unsupported_format', null)
}

async function modelContract() {
  let state = model.createInitialTrackUiState()
  state = model.reduceTrackUi(state, { type: 'FILE_SELECTED', file: validFile })
  assert.equal(state.file.name, 'track.GPX')
  state = model.reduceTrackUi(state, { type: 'FORM_PATCH', patch: { title: '我的轨迹', rightsAccepted: true } })
  state = model.reduceTrackUi(state, { type: 'LIST_REQUEST', append: false })
  const listToken = state.list.token
  state = model.reduceTrackUi(state, { type: 'LIST_RESPONSE', token: listToken - 1, response: { phase: 'mine_list', items: [], nextCursor: null } })
  assert.equal(state.list.loading, true)
  state = model.reduceTrackUi(state, { type: 'LIST_RESPONSE', token: listToken, response: { phase: 'mine_list', items: [{ submissionId: 's1', title: '路书', status: 'changes_requested', allowedActions: ['begin_revision', 'cancel'], retention: { recordExpiresAt: '2026-12-01T00:00:00.000Z' } }], nextCursor: 'next' } })
  assert.deepEqual(state.list.items[0].allowedActions, ['begin_revision', 'cancel'])
  const stale = model.reduceTrackUi(state, { type: 'DETAIL_REQUEST', submissionId: 's1' })
  const detailToken = stale.detail.token
  assert.equal(model.reduceTrackUi(stale, { type: 'DETAIL_RESPONSE', token: detailToken - 1, response: { phase: 'mine', submission: { submissionId: 'late' } } }), stale)
  const expired = model.projectSubmission({ submissionId: 'expired', status: 'pending_review', allowedActions: ['cancel'], retention: { recordExpiresAt: '2026-01-01T00:00:00.000Z' } }, '2026-02-01T00:00:00.000Z')
  assert.equal(expired.unavailable, true)
  assert.deepEqual(expired.allowedActions, [])
  assert.equal(expired.summary, null)
  assert.deepEqual(model.projectSubmission({ submissionId: 'server-rows', status: 'processing', allowedActions: [] }, '2026-02-01T00:00:00.000Z').allowedActions, [])
  const revision = model.reduceTrackUi(state, { type: 'START_REVISION', submission: state.list.items[0] }, '2026-08-09T00:00:00.000Z')
  assert.equal(revision.form.rightsAccepted, false)
  assert.equal(revision.form.revisesSubmissionId, 's1')
  assert.equal(revision.file, null)
  assert.equal(revision.form.title, '路书')
  const reset = model.reduceTrackUi(revision, { type: 'RESET' })
  assert.equal(reset.list.token > state.list.token, true)
  assert.equal(reset.detail.token > revision.detail.token, true)
  assert.equal(reset.mutation.token > state.mutation.token, true)
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, resolve, reject }
}

async function reviewFixServiceContract() {
  const choosePending = deferred()
  const chooseService = createTrackSubmissionService({
    chooseFile: () => choosePending.promise,
    callFunction: async () => ({ result: { phase: 'error', error: { code: 'store_unavailable' } } }),
    uploadFile: async () => ({ fileID: 'cloud://bucket/unused' }),
  })
  const chooseOperation = chooseService.chooseLocalFile()
  chooseService.clearSession()
  choosePending.resolve({ tempFiles: [{ name: 'late.gpx', size: 10, path: '/private/tmp/late.gpx' }] })
  assert.deepEqual(await chooseOperation, { stale: true }, 'clearSession must invalidate an awaited choose')

  const beginPending = deferred()
  const beginService = createTrackSubmissionService({
    chooseFile: async () => ({ tempFiles: [] }),
    callFunction: () => beginPending.promise,
    uploadFile: async () => ({ fileID: 'cloud://bucket/unused' }),
  })
  beginService.rememberFile(validFile)
  const beginOperation = beginService.begin(baseForm)
  beginService.clearSession()
  beginPending.resolve({ result: {
    phase: 'upload_reservation', submissionId: 'late', status: 'awaiting_upload', version: 1,
    cloudPath: 'track-submissions/late/upload.gpx', format: 'gpx', expiresAt: '2026-08-10T00:30:00.000Z',
    allowedActions: ['upload_finalize', 'cancel'],
  } })
  assert.deepEqual(await beginOperation, { stale: true }, 'clearSession must invalidate an awaited begin')

  const uploadPending = deferred()
  const uploadService = createTrackSubmissionService({
    chooseFile: async () => ({ tempFiles: [] }),
    callFunction: async ({ data }) => data.mode === 'begin' ? { result: {
      phase: 'upload_reservation', submissionId: 'upload-race', status: 'awaiting_upload', version: 1,
      cloudPath: 'track-submissions/upload-race/upload.gpx', format: 'gpx', expiresAt: '2026-08-10T00:30:00.000Z',
      allowedActions: ['upload_finalize', 'cancel'],
    } } : { result: { phase: 'mine', submission: { submissionId: 'upload-race', status: 'pending_review', version: 2, allowedActions: ['cancel'] } } },
    uploadFile: () => uploadPending.promise,
  })
  uploadService.rememberFile(validFile)
  await uploadService.begin(baseForm)
  const uploadOperation = uploadService.upload('upload-race')
  uploadService.clearSession()
  uploadPending.resolve({ fileID: 'cloud://bucket/track-submissions/upload-race/upload.gpx' })
  assert.deepEqual(await uploadOperation, { stale: true }, 'clearSession must invalidate an awaited upload')

  const finalizePending = deferred()
  const finalizeService = createTrackSubmissionService({
    chooseFile: async () => ({ tempFiles: [] }),
    callFunction: async ({ data }) => data.mode === 'begin' ? { result: {
      phase: 'upload_reservation', submissionId: 'finalize-race', status: 'awaiting_upload', version: 1,
      cloudPath: 'track-submissions/finalize-race/upload.gpx', format: 'gpx', expiresAt: '2026-08-10T00:30:00.000Z',
      allowedActions: ['upload_finalize', 'cancel'],
    } } : finalizePending.promise,
    uploadFile: async () => ({ fileID: 'cloud://bucket/track-submissions/finalize-race/upload.gpx' }),
  })
  finalizeService.rememberFile(validFile)
  await finalizeService.begin(baseForm)
  await finalizeService.upload('finalize-race')
  const finalizeOperation = finalizeService.finalize('finalize-race')
  finalizeService.clearSession()
  finalizePending.resolve({ result: { phase: 'mine', submission: { submissionId: 'finalize-race', status: 'pending_review', version: 2, allowedActions: ['cancel'] } } })
  assert.deepEqual(await finalizeOperation, { stale: true }, 'clearSession must invalidate an awaited finalize')
}

async function reviewFixRoundTwoServiceContract() {
  const beginPending = deferred()
  const uploadPending = deferred()
  const finalizePending = deferred()
  let beginCalls = 0
  let uploadCalls = 0
  let finalizeCalls = 0
  const service = createTrackSubmissionService({
    chooseFile: async () => ({ tempFiles: [] }),
    callFunction: ({ data }) => {
      if (data.mode === 'begin') {
        beginCalls += 1
        return beginPending.promise
      }
      assert.equal(data.mode, 'finalize')
      assert.equal(data.submissionId, 'submission-a')
      finalizeCalls += 1
      return finalizePending.promise
    },
    uploadFile: (input) => {
      assert.equal(input.cloudPath, 'track-submissions/submission-a/upload.gpx')
      uploadCalls += 1
      return uploadPending.promise
    },
  })
  service.rememberFile(validFile)
  const firstBegin = service.begin(baseForm)
  const secondBegin = service.begin({ ...baseForm, title: '不同但不应重放' })
  assert.equal(beginCalls, 1, 'begin is single-flight before either response settles')
  assert.equal(service.isUploadBusy(), true)
  beginPending.resolve({ result: {
    phase: 'upload_reservation', submissionId: 'submission-a', status: 'awaiting_upload', version: 1,
    cloudPath: 'track-submissions/submission-a/upload.gpx', format: 'gpx', expiresAt: '2026-08-10T00:30:00.000Z',
    allowedActions: ['upload_finalize', 'cancel'],
  } })
  const reservations = await Promise.all([firstBegin, secondBegin])
  assert.equal(reservations[0].submissionId, 'submission-a')
  assert.equal(reservations[1].submissionId, 'submission-a')
  assert.equal(service.hasUploadSession('submission-a'), true)
  assert.equal(service.hasUploadSession('submission-b'), false, 'B cannot see A local session')
  expectError(await service.resumeUploadFinalize('submission-b'), 'invalid_state', null)

  const firstUpload = service.upload('submission-a')
  const secondUpload = service.upload('submission-a')
  assert.equal(uploadCalls, 1, 'double upload click makes one storage upload')
  assert.equal(service.isUploadBusy(), true)
  uploadPending.resolve({ fileID: 'cloud://bucket/track-submissions/submission-a/upload.gpx' })
  assert.deepEqual(await Promise.all([firstUpload, secondUpload]), [{ ok: true }, { ok: true }])

  const firstFinalize = service.finalize('submission-a')
  const secondFinalize = service.finalize('submission-a')
  assert.equal(finalizeCalls, 1, 'double finalize click makes one CloudBase finalize')
  assert.equal(service.isUploadBusy(), true)
  finalizePending.resolve({ result: { phase: 'mine', submission: {
    submissionId: 'submission-a', status: 'pending_review', version: 2, allowedActions: ['cancel'],
  } } })
  const finalized = await Promise.all([firstFinalize, secondFinalize])
  assert.equal(finalized[0].phase, 'mine')
  assert.equal(finalized[1].phase, 'mine')
  assert.equal(service.isUploadBusy(), false)
}

async function reviewFixRoundThreeServiceContract() {
  const uploadPending = deferred()
  const finalizePending = deferred()
  let uploadCalls = 0
  let finalizeCalls = 0
  const service = createTrackSubmissionService({
    chooseFile: async () => ({ tempFiles: [] }),
    callFunction: ({ data }) => {
      if (data.mode === 'begin') return { result: {
        phase: 'upload_reservation', submissionId: 'submission-a', status: 'awaiting_upload', version: 1,
        cloudPath: 'track-submissions/submission-a/upload.gpx', format: 'gpx', expiresAt: '2026-08-10T00:30:00.000Z',
        allowedActions: ['upload_finalize', 'cancel'],
      } }
      assert.equal(data.mode, 'finalize')
      assert.equal(data.submissionId, 'submission-a')
      finalizeCalls += 1
      return finalizePending.promise
    },
    uploadFile: (input) => {
      assert.equal(input.cloudPath, 'track-submissions/submission-a/upload.gpx')
      uploadCalls += 1
      return uploadPending.promise
    },
  })
  service.rememberFile(validFile)
  const reservation = await service.begin(baseForm)
  assert.equal(reservation.submissionId, 'submission-a')

  const uploadA = service.upload('submission-a')
  const uploadARepeat = service.upload('submission-a')
  const uploadB = service.upload('submission-b')
  assert.equal(uploadCalls, 1, 'same upload ID reuses one pending operation')
  uploadPending.resolve({ fileID: 'cloud://bucket/track-submissions/submission-a/upload.gpx' })
  const [uploaded, uploadedRepeat, rejectedUpload] = await Promise.all([uploadA, uploadARepeat, uploadB])
  assert.deepEqual(uploaded, { ok: true })
  assert.deepEqual(uploadedRepeat, { ok: true })
  expectError(rejectedUpload, 'invalid_state', null)

  const finalizeA = service.finalize('submission-a')
  const finalizeARepeat = service.finalize('submission-a')
  const finalizeB = service.finalize('submission-b')
  assert.equal(finalizeCalls, 1, 'same finalize ID reuses one pending operation')
  finalizePending.resolve({ result: { phase: 'mine', submission: {
    submissionId: 'submission-a', status: 'pending_review', version: 2, allowedActions: ['cancel'],
  } } })
  const [finalized, finalizedRepeat, rejectedFinalize] = await Promise.all([finalizeA, finalizeARepeat, finalizeB])
  assert.equal(finalized.phase, 'mine')
  assert.equal(finalizedRepeat.phase, 'mine')
  expectError(rejectedFinalize, 'invalid_state', null)
}

function reviewFixModelContract() {
  let state = model.createInitialTrackUiState()
  const listOne = model.reduceTrackUi(state, { type: 'LIST_REQUEST', append: false })
  const listTwo = model.reduceTrackUi(listOne, { type: 'LIST_REQUEST', append: false })
  assert.ok(listTwo.list.token > listOne.list.token)
  assert.equal(model.reduceTrackUi(listTwo, { type: 'LIST_RESPONSE', token: listOne.list.token, response: { phase: 'mine_list', items: [], nextCursor: null } }), listTwo)
  const detailOne = model.reduceTrackUi(listTwo, { type: 'DETAIL_REQUEST', submissionId: 's1' })
  const detailTwo = model.reduceTrackUi(detailOne, { type: 'DETAIL_REQUEST', submissionId: 's1' })
  assert.ok(detailTwo.detail.token > detailOne.detail.token)
  const mutationOne = model.reduceTrackUi(detailTwo, { type: 'MUTATION_REQUEST', action: 'cancel' })
  const mutationTwo = model.reduceTrackUi(mutationOne, { type: 'MUTATION_REQUEST', action: 'retry_cleanup' })
  assert.ok(mutationTwo.mutation.token > mutationOne.mutation.token)
  const reset = model.reduceTrackUi(mutationTwo, { type: 'RESET' })
  assert.ok(reset.list.token > mutationTwo.list.token)
  assert.ok(reset.detail.token > mutationTwo.detail.token)
  assert.ok(reset.mutation.token > mutationTwo.mutation.token)

  state = model.reduceTrackUi(reset, { type: 'FILE_SELECTED', file: validFile })
  const pendingBegin = model.reduceTrackUi(state, { type: 'BEGIN_REQUEST' })
  const revisionSource = model.projectSubmission({
    submissionId: 'parent', title: '父记录', region: '江西', status: 'changes_requested', version: 4,
    allowedActions: ['begin_revision', 'cancel'], retention: { recordExpiresAt: '2026-12-01T00:00:00.000Z' },
  }, '2026-08-09T00:00:00.000Z')
  const revision = model.reduceTrackUi(pendingBegin, { type: 'START_REVISION', submission: revisionSource }, '2026-08-09T00:00:00.000Z')
  assert.ok(revision.sessionToken > pendingBegin.sessionToken, 'revision must invalidate pending upload/finalize')
  assert.ok(revision.detail.token > pendingBegin.detail.token, 'revision must invalidate pending detail')
  const newFile = model.reduceTrackUi(revision, { type: 'FILE_SELECTED', file: { name: 'new.kml', size: 12 } })
  assert.ok(newFile.sessionToken > revision.sessionToken, 'new file must invalidate pending upload/finalize')

  const withListError = model.reduceTrackUi(state, { type: 'LIST_RESPONSE', token: state.list.token, operation: 'list', response: { phase: 'error', error: { code: 'store_unavailable' } } })
  assert.equal(withListError.error.operation, 'list')
  const withCleanupError = model.reduceTrackUi(withListError, { type: 'MUTATION_RESPONSE', token: withListError.mutation.token, operation: 'cleanup', response: { phase: 'error', error: { code: 'storage_unavailable' } } })
  assert.equal(withCleanupError.error.operation, 'cleanup')

  const poisoned = model.projectSubmission({
    submissionId: 'safe', originalFilename: 'safe.gpx', title: '安全', region: null, format: 'gpx', version: 2,
    status: 'rejected', actualSizeBytes: 12, rightsBasis: 'own_recording', rightsDeclarationVersion: 'track-rights-v1',
    allowedActions: ['retry_cleanup', 'retry_cleanup', 'evil_action'], reviewNote: '公开说明',
    cleanup: { pending: true, target: 'both', _openid: 'poison' },
    retention: { rawExpiresAt: null, recordExpiresAt: '2026-12-01T00:00:00.000Z', evidenceExpiresAt: null, secret: 'poison' },
    summary: {
      summaryVersion: 'track-summary-v1', format: 'gpx', pointCount: 2, segmentCount: 1, distanceM: 3,
      elevation: { presentPointCount: 2, coverage: 1, minM: 1, maxM: 2, secret: 'poison' },
      bounds: { minLat: 1, maxLat: 2, minLon: 3, maxLon: 4 }, start: { lat: 1 }, end: { lon: 4 }, previewSegments: [],
    },
    _openid: 'poison', rawUrl: 'https://poison', cloudPath: 'poison', fileID: 'poison', evidenceKey: 'poison', coordinates: [1],
  }, '2026-08-09T00:00:00.000Z')
  assert.equal(poisoned._openid, undefined)
  assert.equal(poisoned.rawUrl, undefined)
  assert.equal(poisoned.cloudPath, undefined)
  assert.deepEqual(poisoned.allowedActions, ['retry_cleanup'])
  assert.deepEqual(poisoned.cleanup, { pending: true, target: 'both' })
  assert.deepEqual(Object.keys(poisoned).sort(), [
    'actualSizeBytes', 'allowedActions', 'cleanup', 'createdAt', 'format', 'licenseName', 'licenseUrl',
    'originalFilename', 'region', 'reviewNote', 'revisesSubmissionId', 'retention', 'rightsBasis',
    'rightsDeclarationVersion', 'status', 'statusLabel', 'submissionId', 'summary', 'title', 'unavailable',
    'updatedAt', 'version',
  ].sort())
  assert.deepEqual(Object.keys(poisoned.summary).sort(), ['distanceM', 'elevation', 'format', 'hasTimestamps', 'pointCount', 'segmentCount', 'summaryVersion'].sort())
  assert.deepEqual(Object.keys(poisoned.summary.elevation).sort(), ['coverage', 'maxM', 'minM', 'presentPointCount'].sort())

  const cleanTerminal = model.projectSubmission({ submissionId: 'clean', status: 'rejected', allowedActions: [], cleanup: { pending: false, target: null }, retention: { recordExpiresAt: '2026-12-01T00:00:00.000Z' } }, '2026-08-09T00:00:00.000Z')
  assert.deepEqual(cleanTerminal.allowedActions, [])
  const pendingTerminal = model.projectSubmission({ submissionId: 'pending', status: 'rejected', allowedActions: ['retry_cleanup'], cleanup: { pending: true, target: 'review' }, retention: { recordExpiresAt: '2026-12-01T00:00:00.000Z' } }, '2026-08-09T00:00:00.000Z')
  assert.deepEqual(pendingTerminal.allowedActions, ['retry_cleanup'])

  const freshWaiting = model.reduceTrackUi(model.createInitialTrackUiState(), {
    type: 'LIST_RESPONSE', token: 0, response: { phase: 'mine_list', items: [{ submissionId: 'waiting', status: 'awaiting_upload', version: 1, allowedActions: ['upload_finalize', 'cancel'], retention: { recordExpiresAt: '2026-12-01T00:00:00.000Z' } }], nextCursor: null },
  })
  const waitingView = model.selectTrackUiView(freshWaiting)
  assert.deepEqual(waitingView.list.items[0].allowedActions, ['cancel'])
  assert.equal(waitingView.list.items[0].resumeUnavailable, true)
}

function reviewFixRoundTwoModelContract() {
  let state = model.createInitialTrackUiState()
  state = model.reduceTrackUi(state, { type: 'FILE_SELECTED', file: validFile })
  state = model.reduceTrackUi(state, { type: 'BEGIN_REQUEST' })
  assert.equal(state.uploadBusy, true)
  assert.equal(state.uploadOperation, 'begin')
  state = model.reduceTrackUi(state, { type: 'LIST_REQUEST', append: true, cursor: 'cursor-a' })
  state = model.reduceTrackUi(state, { type: 'LIST_RESPONSE', token: state.list.token, append: true, intent: { append: true, cursor: 'cursor-a' }, response: { phase: 'mine_list', items: [], nextCursor: 'cursor-b' } })
  assert.equal(state.uploadBusy, true, 'list response cannot unlock an active upload')
  state = model.reduceTrackUi(state, { type: 'DETAIL_REQUEST', submissionId: 'detail-a' })
  state = model.reduceTrackUi(state, { type: 'DETAIL_RESPONSE', token: state.detail.token, intent: { submissionId: 'detail-a' }, response: { phase: 'mine', submission: { submissionId: 'detail-a', status: 'pending_review', allowedActions: ['cancel'] } } })
  assert.equal(state.uploadBusy, true, 'detail response cannot unlock an active upload')
  state = model.reduceTrackUi(state, { type: 'MUTATION_REQUEST', action: 'cancel', submissionId: 'detail-a', expectedVersion: 2, intent: { operation: 'cancel', submissionId: 'detail-a', expectedVersion: 2, action: 'cancel' } })
  state = model.reduceTrackUi(state, { type: 'MUTATION_RESPONSE', token: state.mutation.token, intent: { operation: 'cancel', submissionId: 'detail-a', expectedVersion: 2, action: 'cancel' }, response: { phase: 'mine', submission: { submissionId: 'detail-a', status: 'cancelled', version: 3, allowedActions: [] } } })
  assert.equal(state.uploadBusy, true, 'mutation response cannot unlock an active upload')

  const listError = model.reduceTrackUi(state, { type: 'LIST_RESPONSE', token: state.list.token, append: true, intent: { append: true, cursor: 'cursor-a' }, response: { phase: 'error', error: { code: 'store_unavailable' } } })
  assert.deepEqual(listError.error.intent, { append: true, cursor: 'cursor-a' })
  const detailError = model.reduceTrackUi(listError, { type: 'DETAIL_RESPONSE', token: listError.detail.token, intent: { submissionId: 'detail-a' }, response: { phase: 'error', error: { code: 'store_unavailable' } } })
  assert.deepEqual(detailError.error.intent, { submissionId: 'detail-a' })
  const mutationError = model.reduceTrackUi(detailError, { type: 'MUTATION_RESPONSE', token: detailError.mutation.token, operation: 'cleanup', intent: { operation: 'cleanup', submissionId: 'detail-a', expectedVersion: 2, action: 'retry_cleanup' }, response: { phase: 'error', error: { code: 'storage_unavailable' } } })
  assert.deepEqual(mutationError.error.intent, { operation: 'cleanup', submissionId: 'detail-a', expectedVersion: 2, action: 'retry_cleanup' })

  const reservationState = model.reduceTrackUi(model.createInitialTrackUiState(), { type: 'RESERVATION_RECEIVED', reservation: { submissionId: 'submission-a', status: 'awaiting_upload', version: 1, allowedActions: ['upload_finalize', 'cancel'] } })
  const withRows = model.reduceTrackUi(reservationState, { type: 'LIST_RESPONSE', token: 0, response: { phase: 'mine_list', items: [
    { submissionId: 'submission-a', status: 'awaiting_upload', allowedActions: ['upload_finalize', 'cancel'] },
    { submissionId: 'submission-b', status: 'awaiting_upload', allowedActions: ['upload_finalize', 'cancel'] },
  ], nextCursor: null } })
  const rows = model.selectTrackUiView(withRows).list.items
  assert.deepEqual(rows[0].allowedActions, ['upload_finalize', 'cancel'])
  assert.deepEqual(rows[1].allowedActions, ['cancel'])
  assert.equal(rows[1].resumeUnavailable, true, 'B row cannot resume A reservation')

  const failedPick = model.reduceTrackUi({ ...reservationState, file: { name: 'old.gpx', size: 12 }, uploadBusy: true, uploadOperation: 'upload' }, { type: 'FILE_SELECTION_FAILED', error: { code: 'unsupported_format' } })
  assert.equal(failedPick.file, null)
  assert.equal(failedPick.reservation, null)
  assert.equal(failedPick.uploadSessionAvailable, false)
  assert.equal(failedPick.uploadBusy, false)
  const cancelledPick = model.reduceTrackUi({ ...reservationState, file: { name: 'old.gpx', size: 12 }, uploadBusy: true, uploadOperation: 'upload' }, { type: 'FILE_SELECTION_CANCELLED' })
  assert.equal(cancelledPick.file, null)
  assert.equal(cancelledPick.reservation, null)
  assert.equal(cancelledPick.uploadSessionAvailable, false)
  assert.equal(cancelledPick.uploadBusy, false)
}

async function sourceWiringContract() {
  const page = fs.readFileSync(path.join(__dirname, '../taro-app/src/pages/index/index.jsx'), 'utf8')
  const service = fs.readFileSync(path.join(__dirname, '../taro-app/src/pages/index/track-submission-service.js'), 'utf8')
  const modelSource = fs.readFileSync(path.join(__dirname, '../taro-app/src/pages/index/track-submission-model.js'), 'utf8')
  ;[
    "createTrackSubmissionService",
    'chooseMessageFile',
    'uploadFile',
    'track-submission-model',
    '_trackBegin',
    '_trackUploadFinalize',
    'onTrackRefresh',
    'onTrackOpenDetail',
    'onTrackAction',
    'onTrackReset',
  ].forEach((literal) => assert.match(page, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), literal))
  assert.match(page, /<Text className="track-rights-copy">\{RIGHTS_COPY\}<\/Text>/)
  assert.match(page, /checked=\{trackUi\.form\.rightsAccepted\}/)
  assert.match(page, /<RadioGroup[^>]+value=\{trackUi\.form\.rightsBasis\}/)
  assert.match(page, /<Radio[^>]+value=\{basis\}/)
  assert.match(page, /CheckboxGroup/)
  assert.match(page, /<CheckboxGroup[^>]+onChange=\{this\.onTrackConsentChange\}/)
  const consentStart = page.indexOf('  onTrackConsentChange = (event) => {')
  const consentEnd = page.indexOf('\n  onTrackChooseFile', consentStart)
  const consentBody = page.slice(consentStart, consentEnd)
  assert.match(consentBody, /const selected = detail\.value/)
  assert.match(consentBody, /selected\.indexOf\('track-rights-v1'\)/)
  assert.doesNotMatch(page, /<Checkbox(?:\s|>)[^>]+onChange=/)
  assert.match(page, /disabled=\{trackUi\.uploadBusy/)
  assert.match(page, /<Button[^>]+onClick=\{this\.onTrackCloseDetail\}>关闭<\/Button>/)
  assert.match(page, /_trackResponse\(eventType, token, response, extra = \{\}\) \{\n    if \(response && response\.stale\) return\n    this\._updateTrackUi/)
  const submitStart = page.indexOf('  onTrackSubmit = () => {')
  const submitEnd = page.indexOf('\n  _trackFindSubmission', submitStart)
  const submitBody = page.slice(submitStart, submitEnd)
  assert.match(submitBody, /if \(this\._trackUiState\.uploadBusy\) return/)
  assert.doesNotMatch(submitBody, /if \(this\._trackUiState\.error\) return this\.onTrackErrorAction\(\)/)
  const errorStart = page.indexOf('  onTrackErrorAction = () => {')
  const errorEnd = page.indexOf('\n  onTrackRefresh', errorStart)
  const errorBody = page.slice(errorStart, errorEnd)
  const retryBody = errorBody.slice(errorBody.indexOf("if (error.nextAction === 'retry')"), errorBody.indexOf("if (error.nextAction === 'refresh')"))
  assert.match(errorBody, /error\.operation === 'list'/)
  assert.match(retryBody, /onTrackRefresh\(intent\.append, intent\.cursor\)/)
  assert.doesNotMatch(retryBody, /invalid_cursor/)
  assert.doesNotMatch(errorBody, /error\.operation === 'list'[\s\S]*_trackBegin/)
  assert.match(errorBody, /error\.operation === 'cancel' \|\| error\.operation === 'cleanup'[\s\S]*_trackCancel\(/)
  const refreshStart = errorBody.indexOf("if (error.nextAction === 'refresh')")
  const refreshEnd = errorBody.indexOf('\n  }\n\n  onTrackRefresh', refreshStart)
  const refreshBody = errorBody.slice(refreshStart, refreshEnd)
  const listRefreshStart = refreshBody.indexOf("else if (error.operation === 'list')")
  const listRefreshEnd = refreshBody.indexOf("} else if (error.operation === 'cancel'", listRefreshStart)
  const listRefreshBody = refreshBody.slice(listRefreshStart, listRefreshEnd)
  assert.match(listRefreshBody, /error\.code === 'invalid_cursor'[\s\S]*onTrackRefresh\(false, null\)/)
  assert.match(listRefreshBody, /onTrackRefresh\(intent\.append, intent\.cursor\)/)
  const refreshMethodStart = page.indexOf('  onTrackRefresh = (append = false, cursorOverride) => {')
  const refreshMethodEnd = page.indexOf('\n  onTrackOpenDetail', refreshMethodStart)
  const refreshMethodBody = page.slice(refreshMethodStart, refreshMethodEnd)
  assert.match(refreshMethodBody, /if \(this\._trackUiState\.uploadBusy\) return/)
  const detailMethodStart = page.indexOf('  onTrackOpenDetail = (submissionId) => {')
  const detailMethodEnd = page.indexOf('\n  onTrackCloseDetail', detailMethodStart)
  const detailMethodBody = page.slice(detailMethodStart, detailMethodEnd)
  assert.match(detailMethodBody, /if \(this\._trackUiState\.uploadBusy\) return/)
  assert.match(page, /disabled=\{trackUi\.uploadBusy \|\| trackUi\.list\.loading\}[^>]+className="inline-retry-btn" onClick=\{\(\) => this\.onTrackRefresh\(false\)\}/)
  assert.match(page, /disabled=\{trackUi\.uploadBusy \|\| trackUi\.list\.loading\}[^>]+className="inline-retry-btn track-more-btn" onClick=\{\(\) => this\.onTrackRefresh\(true\)\}/)
  assert.match(page, /trackUi\.uploadBusy \? 'track-submission-row-disabled' : ''/)
  assert.match(page, /aria-disabled=\{trackUi\.uploadBusy\}/)
  assert.match(page, /aria-disabled=\{trackUi\.uploadBusy\} onClick=\{\(\) => this\.onTrackOpenDetail\(item\.submissionId\)\}/)
  const actionStart = page.indexOf('  onTrackAction = (action, item, event) => {')
  const actionEnd = page.indexOf('\n  onTrackReset', actionStart)
  const actionBody = page.slice(actionStart, actionEnd)
  assert.match(actionBody, /if \(action === 'cancel'\) return this\._trackCancel\(item, 'cancel'\)/)
  assert.match(actionBody, /if \(action === 'retry_cleanup'\) return this\._trackCancel\(item, 'retry_cleanup'\)/)
  assert.doesNotMatch(actionBody, /action === 'cancel' \|\| action === 'retry_cleanup'/)
  assert.match(actionBody, /if \(this\._trackUiState\.uploadBusy\) return/)
  assert.match(page, /reservation\.submissionId !== item\.submissionId/)
  assert.match(page, /sessionToken !== activeToken/)
  const uploadStart = page.indexOf('  _trackUploadFinalize = async')
  const uploadEnd = page.indexOf('\n  onTrackSubmit', uploadStart)
  const uploadBody = page.slice(uploadStart, uploadEnd)
  assert.match(uploadBody, /!allowExisting && this\._trackUiState\.uploadBusy/)
  const chooseStart = page.indexOf('  onTrackChooseFile = async () => {')
  const chooseEnd = page.indexOf('\n  _trackBegin', chooseStart)
  const chooseBody = page.slice(chooseStart, chooseEnd)
  assert.match(chooseBody, /clearSession\(\)[\s\S]*FILE_SELECTION_CANCELLED/)
  assert.match(chooseBody, /clearSession\(\)[\s\S]*FILE_SELECTION_FAILED/)
  ;[
    "operation: 'begin'", "operation: 'upload'", "operation: 'list'", "operation: 'detail'", "action === 'retry_cleanup' ? 'cleanup' : 'cancel'",
    "if (response && response.stale) return",
    "sessionToken !== requestToken",
    "_trackUiState\.detail\.token",
    "_trackUiState\.mutation\.token",
    "hasUploadSession\(item\.submissionId\)",
    "resumeUploadFinalize\(exactSubmissionId\)",
    "type: 'FILE_SELECTION_FAILED'",
    "type: 'FILE_SELECTION_CANCELLED'",
    "onTrackRefresh\(intent\.append, intent\.cursor\)",
    'expectedVersion',
    '联系管理员确认审核配置',
    '重试上传',
    '重试列表',
    '重试详情',
    '重试清理',
  ].forEach((literal) => assert.match(page, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), literal))
  ;[
    'this._getTrackService().begin',
    "await this._trackUploadFinalize(requestToken, 'upload', reservation.submissionId, true)",
    'this._getTrackService().listMine',
    'this._getTrackService().getMine',
    'this._getTrackService().cancel',
    "type: 'START_REVISION'",
    "type: 'MUTATION_REQUEST'",
    "type: 'RESET'",
  ].forEach((literal) => assert.match(page, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), literal))
  ;["name: 'trackSubmission'", "mode: 'begin'", "mode: 'finalize'", "mode: 'list_mine'", "mode: 'get_mine'", "mode: 'cancel'"].forEach((literal) => assert.match(service + modelSource, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), literal))
  assert.doesNotMatch(service, /setTimeout|setInterval/)
  const css = fs.readFileSync(path.join(__dirname, '../taro-app/src/pages/index/index.css'), 'utf8')
  assert.match(css, /track-input[^\n]*min-height: 88rpx/)
  assert.match(css, /track-file-btn, \.track-submit-btn[^\n]*height: 88rpx/)
  assert.match(css, /track-submission-actions \.inline-retry-btn[^\n]*min-height: 88rpx/)
}

Promise.resolve()
  .then(serviceContract)
  .then(modelContract)
  .then(reviewFixServiceContract)
  .then(reviewFixModelContract)
  .then(reviewFixRoundTwoServiceContract)
  .then(reviewFixRoundThreeServiceContract)
  .then(reviewFixRoundTwoModelContract)
  .then(sourceWiringContract)
  .then(() => console.log('PASS: C04 track-submission UI contract'))
  .catch((error) => {
    console.error(error.stack || error)
    process.exitCode = 1
  })
