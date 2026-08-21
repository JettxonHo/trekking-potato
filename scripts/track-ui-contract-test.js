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
  const page = fs.readFileSync(path.join(__dirname, '../taro-app/src/pages/community-track/index.jsx'), 'utf8')
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
  assert.match(page, /_trackResponse\(eventType, token, response, extra = \{\}\) \{[\s\S]*?if \(response && response\.stale\) return[\s\S]*?this\._updateTrackUi/)
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
  const css = fs.readFileSync(path.join(__dirname, '../taro-app/src/pages/community-track/index.css'), 'utf8')
  assert.match(css, /track-input[^\n]*min-height: 88rpx/)
  assert.match(css, /track-file-btn, \.track-submit-btn[^\n]*height: 88rpx/)
  assert.match(css, /track-submission-actions \.inline-retry-btn[^\n]*min-height: 88rpx/)
}

function adminFixture(overrides = {}) {
  return {
    submissionId: 'admin-1', title: '管理员待审轨迹', region: '江西', format: 'gpx', actualSizeBytes: 1024,
    rightsBasis: 'own_recording', status: 'pending_review', version: 7, reviewNote: null,
    revisesSubmissionId: null, pointCount: 12, segmentCount: 2,
    cleanup: { pending: false, target: null },
    retention: { rawExpiresAt: '2026-12-01T00:00:00.000Z', recordExpiresAt: '2026-12-01T00:00:00.000Z', evidenceExpiresAt: null },
    allowedAdminActions: ['view_raw', 'request_changes', 'reject', 'approve_evidence'],
    createdAt: '2026-08-10T00:00:00.000Z', updatedAt: '2026-08-10T00:01:00.000Z',
    ...overrides,
  }
}

function adminDetailFixture(overrides = {}) {
  return {
    ...adminFixture(),
    originalFilename: 'private.gpx', licenseName: null, licenseUrl: null,
    rightsDeclarationVersion: 'track-rights-v1', actualSizeBytes: 1024,
    summary: {
      summaryVersion: 'track-summary-v1', format: 'gpx', pointCount: 12, segmentCount: 2,
      bounds: { minLat: 1, maxLat: 2, minLon: 3, maxLon: 4 },
      start: { lat: 1, lon: 3, elevationM: 100 }, end: { lat: 2, lon: 4, elevationM: 200 },
      distanceM: 1234, elevation: { presentPointCount: 12, coverage: 1, minM: 100, maxM: 200 },
      hasTimestamps: true,
      previewSegments: [{ segmentIndex: 0, points: [{ lat: 1, lon: 3, elevationM: 100 }] }],
    },
    note: '私有备注', provenancePlatform: 'self', provenancePageUrl: null,
    rawAccess: { url: 'https://private.invalid/raw?secret=1', expiresAt: '2026-08-10T00:05:00.000Z' },
    approvedEvidence: null,
    _openid: 'poison-owner', reviewerOpenid: 'poison-reviewer', adminAllowlist: ['secret'],
    cloudPath: 'poison', fileID: 'poison', evidenceStoreKey: 'poison', secret: 'poison',
    ...overrides,
  }
}

function previewGeometryFixture(pointCount) {
  const points = Array.from({ length: pointCount }, (_, index) => ({
    lat: index / 10, lon: index / 10, elevationM: index,
    time: `2026-08-10T00:${String(index % 60).padStart(2, '0')}:00.000Z`, extra: 'poison',
  }))
  const split = Math.min(250, points.length)
  return {
    summaryVersion: 'track-summary-v1', format: 'gpx', pointCount, segmentCount: 2,
    bounds: { minLat: 0, maxLat: 100, minLon: 0, maxLon: 100 },
    start: points[0], end: points[points.length - 1], distanceM: pointCount,
    elevation: { presentPointCount: pointCount, coverage: 1, minM: 0, maxM: pointCount }, hasTimestamps: true,
    previewSegments: [
      { segmentIndex: 0, points: points.slice(0, split) },
      { segmentIndex: 1, points: points.slice(split) },
    ],
  }
}

function adminModelContract() {
  const row = model.projectAdminListItem({ ...adminFixture(), allowedAdminActions: ['approve_evidence', 'view_raw', 'request_changes', 'reject', 'view_raw', 'evil_action'], _openid: 'poison', rawUrl: 'poison', secret: 'poison' }, '2026-08-10T00:02:00.000Z')
  assert.deepEqual(Object.keys(row).sort(), [
    'actualSizeBytes', 'allowedAdminActions', 'cleanup', 'createdAt', 'format', 'pointCount', 'region',
    'retention', 'rightsBasis', 'reviewNote', 'revisesSubmissionId', 'segmentCount', 'status', 'statusLabel',
    'submissionId', 'title', 'unavailable', 'updatedAt', 'version',
  ].sort())
  assert.equal(row._openid, undefined)
  assert.equal(row.rawUrl, undefined)
  assert.deepEqual(row.allowedAdminActions, ['approve_evidence', 'request_changes', 'reject'], 'view_raw must always be filtered while server action order remains')

  const detail = model.projectAdminDetail(adminDetailFixture(), '2026-08-10T00:02:00.000Z')
  assert.equal(Object.prototype.hasOwnProperty.call(detail, 'rawAccess'), false, 'rawAccess must never enter model state')
  assert.equal(detail._openid, undefined)
  assert.equal(detail.reviewerOpenid, undefined)
  assert.equal(detail.evidenceStoreKey, undefined)
  assert.equal(detail.summary.bounds.minLat, 1)
  assert.equal(detail.summary.previewSegments[0].points[0].lat, 1)
  assert.deepEqual(Object.keys(detail.approvedEvidence || {}).sort(), [])
  assert.deepEqual(detail.allowedAdminActions, ['request_changes', 'reject', 'approve_evidence'])

  const bounded500 = model.projectAdminDetail(adminDetailFixture({ summary: previewGeometryFixture(500) }), '2026-08-10T00:02:00.000Z')
  const bounded500Points = bounded500.summary.previewSegments.flatMap((segment) => segment.points)
  assert.equal(bounded500Points.length, 500)
  assert.equal(bounded500Points.every((point) => Object.keys(point).sort().join(',') === 'elevationM,lat,lon'), true)
  const bounded501 = model.projectAdminDetail(adminDetailFixture({ summary: previewGeometryFixture(501) }), '2026-08-10T00:02:00.000Z')
  const bounded501Points = bounded501.summary.previewSegments.flatMap((segment) => segment.points)
  assert.equal(bounded501Points.length, 500)
  assert.equal(bounded501.summary.previewSegments[1].points.length, 250)

  const evidence = model.projectApprovedEvidence({
    evidenceVersion: 'reviewed-track-evidence-v1', sourceKind: 'community_track_candidate', reviewStage: 'admin_approved',
    title: '证据轨迹', region: '江西', format: 'gpx', reviewedOn: '2026-08-10',
    geometry: adminDetailFixture().summary,
    limitations: ['geometry_only', 'not_operational_status', 'not_route_publication'],
    serverEvidenceKey: 'poison', reviewerOpenid: 'poison', rawUrl: 'poison', secret: 'poison',
  })
  assert.equal(evidence.serverEvidenceKey, undefined)
  assert.equal(evidence.rawUrl, undefined)
  assert.equal(evidence.geometry.bounds.minLat, 1)
  assert.equal(evidence.geometry.previewSegments[0].points[0].lat, 1)

  const expired = model.projectAdminListItem({ ...adminFixture(), retention: { ...adminFixture().retention, recordExpiresAt: '2026-08-10T00:02:00.000Z' } }, '2026-08-10T00:02:00.000Z')
  assert.equal(expired.unavailable, true)
  assert.deepEqual(expired.allowedAdminActions, [])
  const rawExpired = model.projectAdminDetail({ ...adminDetailFixture(), retention: { ...adminDetailFixture().retention, rawExpiresAt: '2026-08-10T00:02:00.000Z' } }, '2026-08-10T00:02:00.000Z')
  assert.equal(Object.prototype.hasOwnProperty.call(rawExpired, 'rawAccess'), false)
  assert.deepEqual(rawExpired.allowedAdminActions, [])

  let state = model.createInitialTrackUiState()
  state = model.reduceTrackUi(state, { type: 'ADMIN_LIST_REQUEST', status: 'pending_review', append: false })
  const listToken = state.admin.listToken
  assert.equal(state.admin.filter, 'pending_review')
  assert.deepEqual(state.admin.items, [])
  assert.equal(state.list.items.length, 0, 'admin list must not touch owner list')
  state = model.reduceTrackUi(state, { type: 'ADMIN_LIST_RESPONSE', token: listToken, status: 'pending_review', append: false, response: { phase: 'admin_list', items: [adminFixture()], nextCursor: 'cursor-a' } })
  assert.equal(state.admin.session, true, 'only server admin_list response opens page-local session')
  assert.equal(state.admin.items[0].submissionId, 'admin-1')
  assert.deepEqual(state.admin.items[0].allowedAdminActions, ['request_changes', 'reject', 'approve_evidence'])
  assert.equal(state.admin.nextCursor, 'cursor-a')
  assert.equal(state.error, null, 'admin success must not overwrite owner error')
  const reviewLoadingState = { ...state, admin: { ...state.admin, review: { ...state.admin.review, loading: true } } }
  assert.strictEqual(model.reduceTrackUi(reviewLoadingState, { type: 'ADMIN_LIST_REQUEST', status: state.admin.filter }), reviewLoadingState)
  assert.strictEqual(model.reduceTrackUi(reviewLoadingState, { type: 'ADMIN_DETAIL_REQUEST', submissionId: 'admin-1' }), reviewLoadingState)
  const appendLoadingState = model.reduceTrackUi(state, { type: 'ADMIN_LIST_REQUEST', status: state.admin.filter, append: true, cursor: 'cursor-a' })
  assert.equal(appendLoadingState.admin.loading, true)
  ;[
    { decision: 'rejected', reviewAttemptId: 'append-reject' },
    { decision: 'approved_evidence', reviewAttemptId: 'append-approve' },
  ].forEach((review) => {
    assert.strictEqual(model.reduceTrackUi(appendLoadingState, {
      type: 'ADMIN_REVIEW_REQUEST',
      intent: { submissionId: 'admin-1', expectedVersion: 7, reviewAttemptId: review.reviewAttemptId, decision: review.decision, note: null },
    }), appendLoadingState, `admin.loading must block ${review.decision} I/O`)
  })
  assert.equal(Object.prototype.hasOwnProperty.call(appendLoadingState.admin, 'raw'), false, 'admin raw state must not exist')
  assert.strictEqual(model.reduceTrackUi(state, { type: 'ADMIN_RAW_REQUEST', submissionId: 'admin-1' }), state, 'removed raw request must be a reducer no-op')
  assert.strictEqual(model.reduceTrackUi(state, { type: 'ADMIN_RAW_RESPONSE', response: { ok: true } }), state, 'removed raw response must be a reducer no-op')
  const stale = model.reduceTrackUi(state, { type: 'ADMIN_LIST_RESPONSE', token: listToken - 1, status: 'pending_review', response: { phase: 'admin_list', items: [adminFixture({ submissionId: 'late' })], nextCursor: null } })
  assert.equal(stale.admin.items[0].submissionId, 'admin-1')
  const changed = model.reduceTrackUi(state, { type: 'ADMIN_LIST_REQUEST', status: 'approved_evidence', append: false })
  assert.deepEqual(changed.admin.items, [])
  assert.equal(changed.admin.nextCursor, null)
  assert.ok(changed.admin.generation > state.admin.generation)
  const authError = model.reduceTrackUi(state, { type: 'ADMIN_LIST_RESPONSE', token: state.admin.listToken, status: state.admin.filter, response: { phase: 'error', error: { code: 'forbidden' } } })
  assert.equal(authError.admin.session, false)
  assert.deepEqual(authError.admin.items, [])
  assert.equal(authError.admin.error.code, 'forbidden')

  const adminNotConfigured = { phase: 'error', error: { code: 'admin_not_configured' } }
  const listPendingForConfig = model.reduceTrackUi(state, { type: 'ADMIN_LIST_REQUEST', status: state.admin.filter, append: false })
  const listConfigCleared = model.reduceTrackUi(listPendingForConfig, {
    type: 'ADMIN_LIST_RESPONSE', token: listPendingForConfig.admin.listToken, status: state.admin.filter,
    response: adminNotConfigured,
  })
  assert.equal(listConfigCleared.admin.session, false)
  assert.equal(listConfigCleared.admin.detail.open, false)
  assert.equal(listConfigCleared.admin.items.length, 0)
  const detailPendingForConfig = model.reduceTrackUi(state, { type: 'ADMIN_DETAIL_REQUEST', submissionId: 'admin-1' })
  const detailConfigCleared = model.reduceTrackUi(detailPendingForConfig, {
    type: 'ADMIN_DETAIL_RESPONSE', token: detailPendingForConfig.admin.detailToken, response: adminNotConfigured,
  })
  assert.equal(detailConfigCleared.admin.session, false)
  assert.equal(detailConfigCleared.admin.detail.open, false)
  assert.equal(detailConfigCleared.admin.detail.submission, null)
  const detailReadyForConfig = model.reduceTrackUi(state, { type: 'ADMIN_DETAIL_REQUEST', submissionId: 'admin-1' })
  const detailReadyToken = detailReadyForConfig.admin.detailToken
  const configuredDetail = model.reduceTrackUi(detailReadyForConfig, {
    type: 'ADMIN_DETAIL_RESPONSE', token: detailReadyToken, response: { phase: 'admin_detail', submission: adminDetailFixture() },
  })
  const reviewPendingForConfig = model.reduceTrackUi(configuredDetail, {
    type: 'ADMIN_REVIEW_REQUEST', intent: { submissionId: 'admin-1', expectedVersion: 7, reviewAttemptId: 'config-review', decision: 'rejected', note: null },
  })
  const reviewConfigCleared = model.reduceTrackUi(reviewPendingForConfig, {
    type: 'ADMIN_REVIEW_RESPONSE', token: reviewPendingForConfig.admin.review.token, response: adminNotConfigured,
  })
  assert.equal(reviewConfigCleared.admin.session, false)
  assert.equal(reviewConfigCleared.admin.detail.open, false)
  assert.equal(reviewConfigCleared.admin.detail.submission, null)
  assert.equal(reviewConfigCleared.admin.review.loading, false)

  const pendingForAuth = model.reduceTrackUi(state, { type: 'ADMIN_DETAIL_REQUEST', submissionId: 'admin-1' })
  const pendingDetailToken = pendingForAuth.admin.detailToken
  const listPending = model.reduceTrackUi(pendingForAuth, { type: 'ADMIN_LIST_REQUEST', status: state.admin.filter, append: false })
  const listAuthError = model.reduceTrackUi(listPending, { type: 'ADMIN_LIST_RESPONSE', token: listPending.admin.listToken, status: state.admin.filter, response: { phase: 'error', error: { code: 'forbidden' } } })
  const lateDetail = model.reduceTrackUi(listAuthError, {
    type: 'ADMIN_DETAIL_RESPONSE', token: pendingDetailToken, generation: pendingForAuth.admin.generation,
    response: { phase: 'admin_detail', submission: adminDetailFixture() },
  })
  assert.equal(lateDetail.admin.session, false, 'authorization loss must invalidate pending detail responses')
  assert.equal(lateDetail.admin.detail.submission, null, 'late detail must not reopen an admin session')

  state = model.reduceTrackUi(state, { type: 'ADMIN_DETAIL_REQUEST', submissionId: 'admin-1' })
  const detailToken = state.admin.detailToken
  state = model.reduceTrackUi(state, { type: 'ADMIN_DETAIL_RESPONSE', token: detailToken, response: { phase: 'admin_detail', submission: adminDetailFixture() } })
  assert.equal(state.admin.detail.submission.submissionId, 'admin-1')
  assert.equal(Object.prototype.hasOwnProperty.call(state.admin.detail.submission, 'rawAccess'), false)
  assert.equal(Object.prototype.hasOwnProperty.call(model.selectTrackUiView(state).admin.detail.submission, 'rawAccess'), false)
  const reviewIntent = { submissionId: 'admin-1', expectedVersion: 7, reviewAttemptId: 'attempt-1', decision: 'changes_requested', note: '请补充说明' }
  const detailAuthState = model.reduceTrackUi(state, { type: 'ADMIN_DETAIL_REQUEST', submissionId: 'admin-1' })
  const detailAuthError = model.reduceTrackUi(detailAuthState, { type: 'ADMIN_DETAIL_RESPONSE', token: detailAuthState.admin.detailToken, response: { phase: 'error', error: { code: 'forbidden' } } })
  assert.equal(detailAuthError.admin.error.operation, 'admin_detail')
  assert.equal(detailAuthError.admin.error.intent.submissionId, 'admin-1')
  const reviewErrorState = model.reduceTrackUi(state, { type: 'ADMIN_REVIEW_REQUEST', intent: reviewIntent })
  const reviewError = model.reduceTrackUi(reviewErrorState, { type: 'ADMIN_REVIEW_RESPONSE', token: reviewErrorState.admin.review.token, response: { phase: 'error', error: { code: 'store_unavailable' } } })
  assert.equal(reviewError.admin.error.operation, 'admin_review')
  assert.deepEqual(reviewError.admin.error.intent, reviewIntent)
  state = model.reduceTrackUi(state, { type: 'ADMIN_REVIEW_NOTE', value: 'x'.repeat(600) })
  assert.equal(state.admin.reviewNote.length, 500)
  state = model.reduceTrackUi(state, { type: 'ADMIN_REVIEW_REQUEST', intent: reviewIntent })
  assert.deepEqual(state.admin.review.intent, reviewIntent)
  assert.equal(state.admin.review.loading, true)
  state = model.reduceTrackUi(state, { type: 'ADMIN_REVIEW_RESPONSE', token: state.admin.review.token, response: { phase: 'admin_detail', submission: adminDetailFixture({ status: 'changes_requested', version: 8, allowedAdminActions: ['view_raw', 'request_changes', 'reject', 'approve_evidence'] }) } })
  assert.equal(state.admin.review.loading, false)
  assert.equal(state.admin.detail.submission.status, 'changes_requested')
  assert.deepEqual(state.admin.detail.submission.allowedAdminActions, ['request_changes', 'reject', 'approve_evidence'])

  const conflictState = model.reduceTrackUi(state, { type: 'ADMIN_REVIEW_REQUEST', intent: reviewIntent })
  const conflict = model.reduceTrackUi(conflictState, {
    type: 'ADMIN_REVIEW_RESPONSE', token: conflictState.admin.review.token,
    response: { phase: 'error', error: { code: 'version_conflict' } },
  })
  assert.equal(conflict.admin.review.intent, null, 'version conflict must not retain a stale replay intent')
  assert.equal(conflict.admin.review.token > conflictState.admin.review.token, true)
  assert.equal(conflict.admin.error.operation, 'admin_review')

  const cursorState = model.reduceTrackUi(state, { type: 'ADMIN_LIST_REQUEST', status: 'pending_review', append: true, cursor: 'stale-cursor' })
  const cursorError = model.reduceTrackUi(cursorState, {
    type: 'ADMIN_LIST_RESPONSE', token: cursorState.admin.listToken, status: 'pending_review', append: true,
    response: { phase: 'error', error: { code: 'invalid_cursor' } },
  })
  assert.equal(cursorError.admin.error.operation, 'admin_list')
  assert.deepEqual(cursorError.admin.error.intent, { append: true, status: 'pending_review', cursor: 'stale-cursor' })
  const reset = model.reduceTrackUi(state, { type: 'ADMIN_RESET' })
  assert.equal(reset.admin.session, false)
  assert.deepEqual(reset.admin.items, [])
  assert.equal(reset.admin.detail.submission, null)
  assert.ok(reset.admin.generation > state.admin.generation)
}

async function adminServiceContract() {
  const requests = []
  const service = createTrackSubmissionService({
    now: () => 1700000000000,
    random: () => 0.25,
    chooseFile: async () => ({ tempFiles: [] }),
    uploadFile: async () => ({ fileID: 'cloud://bucket/unused' }),
    callFunction: async ({ name, data }) => {
      assert.equal(name, 'trackSubmission')
      requests.push(JSON.parse(JSON.stringify(data)))
      if (data.mode === 'admin_list') return { result: { phase: 'admin_list', items: [adminFixture()], nextCursor: 'cursor-1' } }
      if (data.mode === 'admin_get') {
        assert.equal(Object.prototype.hasOwnProperty.call(data, 'includeRawLink'), false, 'C05 must never request a raw link')
        return { result: { phase: 'admin_detail', submission: adminDetailFixture({ rawAccess: { url: 'https://poison.invalid/raw', expiresAt: '2099-01-01T00:00:00.000Z' } }) } }
      }
      if (data.mode === 'admin_review') return { result: { phase: 'admin_detail', submission: adminDetailFixture({ status: data.decision, version: data.expectedVersion + 1, allowedAdminActions: ['approve_evidence', 'view_raw', 'request_changes', 'reject'] }) } }
      throw new Error('unexpected mode')
    },
  })
  const list = await service.listAdmin({ status: 'pending_review', cursor: null, limit: 10 })
  assert.equal(list.phase, 'admin_list')
  assert.deepEqual(requests[0], { mode: 'admin_list', status: 'pending_review', limit: 10 })
  const detail = await service.getAdmin('admin-1')
  assert.equal(detail.phase, 'admin_detail')
  assert.deepEqual(requests[1], { mode: 'admin_get', submissionId: 'admin-1' })
  const intent = service.createReviewIntent({ submissionId: 'admin-1', expectedVersion: 7, decision: 'changes_requested', note: '请补充说明' })
  assert.equal(typeof intent.reviewAttemptId, 'string')
  assert.equal(service.createReviewIntent({ submissionId: 'admin-1', expectedVersion: 7, decision: 'rejected', note: 'x'.repeat(501) }), null)
  expectError(await service.reviewAdmin({ ...intent, reviewAttemptId: ' ' }), 'invalid_input', null)
  await service.reviewAdmin(intent)
  await service.reviewAdmin(intent)
  assert.deepEqual(requests[2], requests[3], 'manual retry of frozen review intent reuses exact attempt/payload')
  assert.equal(requests[2].mode, 'admin_review')
  assert.equal(requests[2].reviewAttemptId, intent.reviewAttemptId)
  const changedIntent = service.createReviewIntent({ submissionId: 'admin-1', expectedVersion: 7, decision: 'rejected', note: '改写' })
  assert.notEqual(changedIntent.reviewAttemptId, intent.reviewAttemptId)
  const rejected = await service.reviewAdmin(changedIntent)
  assert.equal(rejected.phase, 'admin_detail')
  const approvedIntent = service.createReviewIntent({ submissionId: 'admin-1', expectedVersion: 7, decision: 'approved_evidence', note: null })
  const approved = await service.reviewAdmin(approvedIntent)
  assert.equal(approved.phase, 'admin_detail')
  assert.deepEqual(requests.slice(2).map((request) => request.decision), ['changes_requested', 'changes_requested', 'rejected', 'approved_evidence'], 'three review actions keep exact server decision order')
}

async function adminRawPathRemovedContract() {
  const requests = []
  const service = createTrackSubmissionService({
    now: () => 1700000000000,
    chooseFile: async () => ({ tempFiles: [] }),
    uploadFile: async () => ({ fileID: 'cloud://bucket/unused' }),
    callFunction: async ({ data }) => {
      requests.push(JSON.parse(JSON.stringify(data)))
      assert.equal(data.mode, 'admin_get')
      assert.equal(Object.prototype.hasOwnProperty.call(data, 'includeRawLink'), false)
      return { result: { phase: 'admin_detail', submission: adminDetailFixture({ rawAccess: { url: 'https://poison.invalid/raw', expiresAt: '2099-01-01T00:00:00.000Z' } }) } }
    },
  })
  assert.equal(typeof service.openAdminRaw, 'undefined', 'raw opener service seam must be removed')
  assert.equal(typeof service.invalidateAdminRaw, 'undefined', 'raw invalidation service seam must be removed')
  const detail = await service.getAdmin('admin-1')
  assert.equal(detail.phase, 'admin_detail')
  assert.deepEqual(requests, [{ mode: 'admin_get', submissionId: 'admin-1' }])
}

async function adminSourceWiringContract() {
  const page = fs.readFileSync(path.join(__dirname, '../taro-app/src/pages/community-track/index.jsx'), 'utf8')
  const service = fs.readFileSync(path.join(__dirname, '../taro-app/src/pages/index/track-submission-service.js'), 'utf8')
  const modelSource = fs.readFileSync(path.join(__dirname, '../taro-app/src/pages/index/track-submission-model.js'), 'utf8')
  ;[
    'onTrackAdminRefresh', 'onTrackAdminOpenDetail', 'onTrackAdminAction', 'onTrackAdminReview', 'onTrackAdminReset', 'onTrackAdminFilter',
    'listAdmin', 'getAdmin', 'reviewAdmin', 'createReviewIntent', 'allowedAdminActions', 'track-admin-card', 'adminReviewNote',
  ].forEach((literal) => assert.match(page + service + modelSource, new RegExp(literal.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')), literal))
  assert.match(page, /<View className="track-admin-card card">/)
  assert.match(page, /trackUi\.admin\.items\.map/)
  assert.match(page, /item\.allowedAdminActions\.map/)
  assert.match(page, /item\.allowedAdminActions\.indexOf\(action\) < 0/)
  assert.match(page, /nextAction !== 'contact_admin'/)
  assert.match(page, /maxLength=\{500\}/)
  const adminRefreshStart = page.indexOf('  onTrackAdminRefresh = (append = false, statusOverride, cursorOverride) => {')
  const adminRefreshEnd = page.indexOf('\n  onTrackAdminOpenDetail', adminRefreshStart)
  const adminRefreshBody = page.slice(adminRefreshStart, adminRefreshEnd)
  assert.match(adminRefreshBody, /admin\.review\.loading/)
  assert.match(adminRefreshBody, /this\._trackUiState\.admin\.generation !== generation/)
  assert.match(adminRefreshBody, /ADMIN_LIST_RESPONSE/)
  const adminDetailStart = page.indexOf('  onTrackAdminOpenDetail = (submissionId) => {')
  const adminDetailEnd = page.indexOf('\n  onTrackAdminCloseDetail', adminDetailStart)
  const adminDetailBody = page.slice(adminDetailStart, adminDetailEnd)
  assert.match(adminDetailBody, /admin\.review\.loading/)
  assert.match(adminDetailBody, /ADMIN_DETAIL_RESPONSE/)
  const adminReviewStart = page.indexOf('  onTrackAdminReview = (action, item, event) => {')
  const adminReviewEnd = page.indexOf('\n  onTrackAdminAction =', adminReviewStart)
  const adminReviewBody = page.slice(adminReviewStart, adminReviewEnd)
  assert.match(adminReviewBody, /if \(!admin\.session \|\| admin\.loading \|\| admin\.review\.loading \|\| !item \|\| typeof item\.submissionId !== 'string'/)
  assert.match(adminReviewBody, /admin\.loading/)
  assert.doesNotMatch(adminReviewBody, /view_raw|rawAccess|openDocument|includeRawLink/)
  const requestChangesStart = adminReviewBody.indexOf("if (action === 'request_changes'")
  const requestChangesEnd = adminReviewBody.indexOf("\n    const decision =", requestChangesStart)
  assert.match(adminReviewBody.slice(requestChangesStart, requestChangesEnd), /onTrackAdminOpenDetail\(item\.submissionId\)/)
  const reviewWithIntentStart = page.indexOf('  _trackAdminReviewWithIntent = (intent) => {')
  const reviewWithIntentEnd = page.indexOf('\n  onTrackAdminReview =', reviewWithIntentStart)
  const reviewWithIntentBody = page.slice(reviewWithIntentStart, reviewWithIntentEnd)
  assert.match(reviewWithIntentBody, /version_conflict[\s\S]*onTrackAdminOpenDetail\(intent\.submissionId\)/)
  const adminErrorActionStart = page.indexOf('  onTrackAdminErrorAction = () => {')
  const adminErrorActionEnd = page.indexOf('\n  onTrackAdminReset =', adminErrorActionStart)
  const adminErrorActionBody = page.slice(adminErrorActionStart, adminErrorActionEnd)
  assert.match(adminErrorActionBody, /if \(!error \|\| this\._trackUiState\.admin\.loading \|\| this\._trackUiState\.admin\.review\.loading\) return/)
  assert.match(adminErrorActionBody, /invalid_cursor[\s\S]*onTrackAdminRefresh\(false, intent\.status\)/)
  assert.match(page, /if \(this\._unmounted\) return/)
  const unmountStart = page.indexOf('  componentWillUnmount() {')
  const unmountEnd = page.indexOf('\n  render() {', unmountStart)
  const unmountBody = page.slice(unmountStart, unmountEnd)
  assert.doesNotMatch(unmountBody, /invalidateAdminRaw|openAdminRaw|ADMIN_RAW/)
  assert.doesNotMatch(page + service + modelSource, /ADMIN_RAW|openAdminRaw|invalidateAdminRaw|includeRawLink|rawAccess|openDocument|downloadFile|clipboard/)
  assert.doesNotMatch(page, /view_raw|查看原始文件/)
  assert.match(page + service, /expectedVersion/)
  assert.match(page + service, /reviewAttemptId/)
  assert.match(page, /TRACK_ADMIN_REVIEW_DECISIONS/)
  assert.doesNotMatch(page, /isAdmin\s*=/)
  assert.match(modelSource, /allowedAdminActions: safeAdminActions\(item\.allowedAdminActions\)/)
  assert.doesNotMatch(modelSource, /rawAccess\s*:/)
  const css = fs.readFileSync(path.join(__dirname, '../taro-app/src/pages/community-track/index.css'), 'utf8')
  assert.match(css, /track-admin-card/)
  assert.match(css, /track-admin-action/)
}

function secondaryCommunityPageContract() {
  const root = path.join(__dirname, '../taro-app/src')
  const homepage = fs.readFileSync(path.join(root, 'pages/index/index.jsx'), 'utf8')
  const homeCss = fs.readFileSync(path.join(root, 'pages/index/index.css'), 'utf8')
  const config = fs.readFileSync(path.join(root, 'app.config.js'), 'utf8')
  const pagePath = path.join(root, 'pages/community-track/index.jsx')
  const pageCssPath = path.join(root, 'pages/community-track/index.css')
  assert.equal(fs.existsSync(pagePath), true, 'secondary community-track page must exist')
  assert.equal(fs.existsSync(pageCssPath), true, 'secondary community-track stylesheet must exist')
  const page = fs.readFileSync(pagePath, 'utf8')
  const pageCss = fs.readFileSync(pageCssPath, 'utf8')
  const homepageRender = homepage.slice(homepage.indexOf('  render() {'))
  assert.match(config, /pages\/community-track\/index/)
  assert.match(homepage, /Taro\.navigateTo\(\s*\{\s*url:\s*['"]\/pages\/community-track\/index['"]\s*\}\s*\)/)
  assert.match(homepage, /<Button[^>]+className="community-track-entry-btn"[^>]*>社区轨迹<\/Button>/)
  assert.match(homepage, /<Button[^>]+className="community-track-fallback-btn"[^>]*>上传 GPX\/KML，补充完整路线<\/Button>/)
  assert.match(homepage, /<Button[^>]*className="community-track-entry-btn"[^>]*onClick=\{this\.onCommunityTrackEntry\}[^>]*>社区轨迹<\/Button>/)
  assert.match(homepage, /<Button[^>]*className="community-track-fallback-btn"[^>]*onClick=\{this\.onCommunityTrackUpload\}[^>]*>上传 GPX\/KML，补充完整路线<\/Button>/)
  assert.doesNotMatch(homepageRender, /<View className="track-owner-card card">/)
  assert.doesNotMatch(homepageRender, /<View className="track-admin-card card">/)
  assert.doesNotMatch(homepageRender, /CLIMB SUPPORT|攀登支持|climbSupportLabels|onClimbSupportChange/)
  assert.doesNotMatch(homeCss, /track-owner-card|track-admin-card/)
  assert.doesNotMatch(homepage, /track-submission-model|track-submission-service|createTrackSubmissionService|_trackBegin|onTrackAdminRefresh|renderTrackPage\(\)/)

  ;[
    'createTrackSubmissionService', 'createInitialTrackUiState', 'reduceTrackUi', 'selectTrackUiView',
    'onTrackChooseFile', 'onTrackRefresh', 'onTrackOpenDetail', 'onTrackAdminRefresh',
    'onTrackAdminOpenDetail', 'onTrackAdminReview', 'onTrackAdminReset', 'componentWillUnmount',
    'clearSession', 'listMine', 'getMine', 'listAdmin', 'getAdmin', 'reviewAdmin',
  ].forEach((literal) => assert.match(page, new RegExp(literal.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')), `secondary page: ${literal}`))
  assert.match(page, /<View className="track-owner-card card">/)
  assert.match(page, /<View className="track-admin-card card">/)
  assert.match(page, /trackUi\.list\.items\.map/)
  assert.match(page, /trackUi\.detail\.submission/)
  assert.match(page, /trackUi\.admin\.items\.map/)
  assert.match(page, /allowedAdminActions\.map/)
  assert.match(page, /onTrackAdminReview/)
  assert.match(page, /trackUi\.admin\.items\.map[\s\S]*onClick=\{\(event\) => this\.onTrackAdminReview\(action, item, event\)\}/)
  assert.match(page, /trackUi\.admin\.detail\.submission\.allowedAdminActions\.map[\s\S]*onClick=\{\(event\) => this\.onTrackAdminReview\(action, trackUi\.admin\.detail\.submission, event\)\}/)
  assert.match(page, /onClick=\{this\.onTrackChooseFile\}/)
  assert.match(page, /<Button[^>]*className="track-submit-btn"[^>]*onClick=\{this\.onTrackSubmit\}[^>]*>/)
  assert.match(page, /trackUi\.list\.items\.map[\s\S]*onClick=\{\(\) => this\.onTrackOpenDetail\(item\.submissionId\)\}/)
  assert.match(page, /<Button[^>]*className="inline-retry-btn"[^>]*onClick=\{\(event\) => this\.onTrackAction\(action, item, event\)\}[^>]*>/)
  assert.match(page, /<Button[^>]*className="inline-retry-btn"[^>]*onClick=\{\(event\) => this\.onTrackAction\(action, trackUi\.detail\.submission, event\)\}[^>]*>/)
  assert.match(page, /componentWillUnmount\(\) \{\n\s+this\._unmounted = true\n\s+if \(this\._trackService\) this\._trackService\.clearSession\(\)/)
  assert.match(page, /navigateBack|navigateTo/)
  assert.match(pageCss, /track-owner-card/)
  assert.match(pageCss, /track-admin-card/)
  assert.match(pageCss, /track-admin-action/)
  assert.match(page, /track-submission-model/)
  assert.match(page, /track-submission-service/)
  assert.match(page, /\{this\.renderTrackPage\(\)\}/)

  const ownerCardStart = page.indexOf('<View className="track-owner-card card">')
  const ownerCardEnd = page.indexOf('\n        <View className="track-admin-card card">', ownerCardStart)
  assert.ok(ownerCardStart >= 0 && ownerCardEnd > ownerCardStart, 'owner card render seam must be bounded')
  const ownerCard = page.slice(ownerCardStart, ownerCardEnd)
  const submitIndex = ownerCard.indexOf('className="track-submit-btn"')
  assert.ok(submitIndex >= 0, 'owner submit button must remain in the owner card')
  assert.match(ownerCard, /<Button block disabled=\{!trackUi\.file \|\| !trackUi\.form\.rightsAccepted \|\| trackUi\.uploadBusy \|\| trackUi\.mutation\.loading\} className="track-submit-btn" onClick=\{this\.onTrackSubmit\}>/)
  assert.match(ownerCard, /<Text className="card-title">提交私有轨迹<\/Text>/)
  const titleIndex = ownerCard.indexOf('<Text className="card-title">提交私有轨迹</Text>')
  const introIndex = ownerCard.indexOf('className="track-policy-intro"')
  const firstFieldIndex = ownerCard.indexOf('className="track-field-label"')
  assert.ok(introIndex > titleIndex && introIndex < firstFieldIndex, 'private-review intro must follow title before the form')
  assert.match(ownerCard, /<Text className="track-policy-intro-copy">仅供私下审核，不会自动公开<\/Text>/)

  const fileButtonIndex = ownerCard.indexOf('className="track-file-btn"')
  const errorIndex = ownerCard.indexOf('className="track-error-box"')
  const summaryIndex = ownerCard.indexOf('className="track-policy-summary"')
  assert.ok(fileButtonIndex >= 0 && errorIndex >= 0, 'file and error seams must remain in the owner form')
  assert.ok(summaryIndex > fileButtonIndex && summaryIndex > errorIndex, '30/180 summary must follow file/error')

  const consentIndex = ownerCard.indexOf('className="track-consent-row"')
  assert.ok(consentIndex >= 0 && summaryIndex < consentIndex && consentIndex < submitIndex, 'summary and consent must precede submission')
  assert.match(ownerCard.slice(consentIndex, submitIndex), /<CheckboxGroup className="track-consent-group" onChange=\{this\.onTrackConsentChange\}>/)
  assert.match(ownerCard.slice(summaryIndex, consentIndex), /原始文件和含身份记录最长保留 30 天[\s\S]*去身份几何证据最长保留 180 天/)
  const rightsIndex = ownerCard.indexOf('{RIGHTS_COPY}')
  const platformRightsIndex = ownerCard.indexOf('{RIGHTS_PLATFORM_COPY}')
  assert.ok(rightsIndex > submitIndex, 'full rights copy must follow submission')
  assert.ok(platformRightsIndex > submitIndex, 'full platform warning must follow submission')
  assert.match(page, /trackDisclosureOpen:\s*false/)
  assert.match(page, /onTrackDisclosureToggle = \(\) =>/)
  const disclosureIndex = ownerCard.indexOf('className="track-rights-disclosure"')
  assert.ok(disclosureIndex > submitIndex, 'rights disclosure must follow submission')
  const disclosure = ownerCard.slice(disclosureIndex)
  assert.match(disclosure, /<Button[^>]*className="track-disclosure-toggle"[^>]*aria-expanded=\{trackDisclosureOpen\}[^>]*onClick=\{this\.onTrackDisclosureToggle\}[^>]*>/)
  assert.match(disclosure, /trackDisclosureOpen &&/)
  assert.match(disclosure, /<Text className="track-rights-copy">\{RIGHTS_COPY\}<\/Text>/)
  assert.match(disclosure, /<Text className="track-rights-copy track-rights-warning">\{RIGHTS_PLATFORM_COPY\}<\/Text>/)
  assert.match(pageCss, /\.track-disclosure-toggle[^\n]*min-height: 88rpx !important/)
  assert.match(pageCss, /\.track-disclosure-toggle[^\n]*line-height: 88rpx !important/)
  assert.match(pageCss, /track-policy-intro/)
  assert.match(pageCss, /track-policy-summary/)
  assert.match(pageCss, /track-rights-disclosure/)
}

function homepagePresentationContract() {
  const root = path.join(__dirname, '../taro-app/src/pages/index')
  const homepage = fs.readFileSync(path.join(root, 'index.jsx'), 'utf8')
  const css = fs.readFileSync(path.join(root, 'index.css'), 'utf8')
  const renderStart = homepage.indexOf('  render() {')
  const homepageRender = homepage.slice(renderStart)
  const queryButton = '<Button block type="primary" className="submit-btn quirky-active" onClick={this.onSubmit}>叽里咕噜地看看带点啥</Button>'
  const communityButton = '<Button block className="community-track-entry-btn" onClick={this.onCommunityTrackEntry}>社区轨迹</Button>'
  const historyEntry = '<Text className="history-entry quirky-active" onClick={this.onHistoryTap}>历史查询</Text>'
  const queryIndex = homepageRender.indexOf(queryButton)
  const communityIndex = homepageRender.indexOf(communityButton)
  const historyIndex = homepageRender.indexOf(historyEntry)
  assert.ok(queryIndex >= 0, 'homepage query button must remain present')
  assert.ok(communityIndex >= 0, 'homepage community entry must remain present')
  assert.ok(historyIndex >= 0, 'homepage history entry must remain present')
  assert.ok(queryIndex < communityIndex && communityIndex < historyIndex, 'homepage order must be query, community, history')
  assert.match(homepageRender, /<View className="form-action-stack">[\s\S]*submit-btn[\s\S]*community-track-entry-btn[\s\S]*history-entry/)
  assert.match(css, /\.form-action-stack\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*gap:\s*20rpx/)
  assert.match(css, /\.submit-btn\s*\{[^}]*margin-top:\s*0rpx\s*!important/)
  assert.match(css, /\.community-track-entry-btn\s*\{[^}]*margin-top:\s*0rpx\s*!important/)
  assert.match(css, /\.potato-easter-egg\s*\{[^}]*position:\s*static/)

  const reorderMutation = homepage.replace(
    `${queryButton}\n          ${communityButton}`,
    `${communityButton}\n          ${queryButton}`,
  )
  assert.notEqual(reorderMutation, homepage, 'homepage reorder mutation must change source')
  assert.throws(() => homepagePresentationContractForSources(reorderMutation, css), undefined, 'reordered actions must turn the focused contract RED')

  const missingHandlerMutation = homepage.replace('onClick={this.onSubmit}', 'onClick={this.onCommunityTrackEntry}')
  assert.notEqual(missingHandlerMutation, homepage, 'homepage handler mutation must change source')
  assert.throws(() => homepagePresentationContractForSources(missingHandlerMutation, css), undefined, 'query handler mutation must turn the focused contract RED')

  const overlapMutation = css.replace('.potato-easter-egg { position: static;', '.potato-easter-egg { position: absolute;')
  assert.notEqual(overlapMutation, css, 'decorative overlap mutation must change stylesheet')
  assert.throws(() => homepagePresentationContractForSources(homepage, overlapMutation), undefined, 'decorative overlap mutation must turn the focused contract RED')
}

function homepagePresentationContractForSources(homepage, css) {
  const renderStart = homepage.indexOf('  render() {')
  const homepageRender = homepage.slice(renderStart)
  const queryButton = '<Button block type="primary" className="submit-btn quirky-active" onClick={this.onSubmit}>叽里咕噜地看看带点啥</Button>'
  const communityButton = '<Button block className="community-track-entry-btn" onClick={this.onCommunityTrackEntry}>社区轨迹</Button>'
  const historyEntry = '<Text className="history-entry quirky-active" onClick={this.onHistoryTap}>历史查询</Text>'
  const queryIndex = homepageRender.indexOf(queryButton)
  const communityIndex = homepageRender.indexOf(communityButton)
  const historyIndex = homepageRender.indexOf(historyEntry)
  assert.ok(queryIndex >= 0, 'homepage query button must remain present')
  assert.ok(communityIndex >= 0, 'homepage community entry must remain present')
  assert.ok(historyIndex >= 0, 'homepage history entry must remain present')
  assert.ok(queryIndex < communityIndex && communityIndex < historyIndex, 'homepage order must be query, community, history')
  assert.match(homepageRender, /<View className="form-action-stack">[\s\S]*submit-btn[\s\S]*community-track-entry-btn[\s\S]*history-entry/)
  assert.match(css, /\.form-action-stack\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*gap:\s*20rpx/)
  assert.match(css, /\.submit-btn\s*\{[^}]*margin-top:\s*0rpx\s*!important/)
  assert.match(css, /\.community-track-entry-btn\s*\{[^}]*margin-top:\s*0rpx\s*!important/)
  assert.match(css, /\.potato-easter-egg\s*\{[^}]*position:\s*static/)
}

function extractNamedFunctionSource(source, name) {
  const marker = `function ${name}`
  const start = source.indexOf(marker)
  if (start < 0) return ''
  const braceStart = source.indexOf('{', start)
  if (braceStart < 0) return ''
  let depth = 0
  for (let index = braceStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    else if (source[index] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(start, index + 1)
    }
  }
  return ''
}

function assertRouteContributionWiring(homepage, page) {
  assert.match(homepage, /function normalizeCommunityTrackDraftTitle\(value\)/)
  assert.match(homepage, /encodeURIComponent\(title\)/)
  assert.match(homepage, /onCommunityTrackUpload = \(\) =>/)
  assert.doesNotMatch(homepage, /draftTitle=[^\n]*(?:manualLat|manualLon|manualElev|fileID|cloudPath|openid|consent|admin|publish)/i)

  const entryStart = homepage.indexOf('  onCommunityTrackEntry = (searchText) => {')
  const entryEnd = homepage.indexOf('\n  onCommunityTrackUpload', entryStart)
  const entryBody = homepage.slice(entryStart, entryEnd)
  assert.ok(entryStart >= 0 && entryEnd > entryStart, 'community-track navigation seam must be bounded')
  assert.match(entryBody, /Taro\.navigateTo\(\s*\{\s*url:\s*['"]\/pages\/community-track\/index['"]\s*\}\s*\)/)
  assert.match(entryBody, /Taro\.navigateTo\(\s*\{\s*url:\s*`\/pages\/community-track\/index\?draftTitle=\$\{encodedTitle\}`\s*\}\s*\)/)
  assert.doesNotMatch(entryBody, /&(?:manualLat|manualLon|manualElev|fileID|cloudPath|openid|consent|admin|publish)\s*=/i)

  const candidateStart = homepage.indexOf('<Popup visible={showCandidatePopup}')
  const candidateEnd = homepage.indexOf('\n        </Popup>', candidateStart)
  const candidatePopup = homepage.slice(candidateStart, candidateEnd)
  assert.match(candidatePopup, /onClick=\{\(\) => this\.onCandidateSelect\(candidate\.candidateId\)\}/)
  assert.match(candidatePopup, /<Button[^>]+className="candidate-upload-btn"[^>]+onClick=\{this\.onCommunityTrackUpload\}[^>]*>都不是，上传我的轨迹<\/Button>/)
  assert.doesNotMatch(candidatePopup, /candidate-upload-btn[^\n]*onClick=\{this\.onCandidateSelect/)

  const manualStart = homepage.indexOf('<Popup visible={showManualCoords}')
  const manualEnd = homepage.indexOf('\n        </Popup>', manualStart)
  const manualPopup = homepage.slice(manualStart, manualEnd)
  assert.match(manualPopup, /resolutionKind === 'catalog_place'/)
  assert.match(manualPopup, /上传 GPX\/KML，补充完整路线/)
  assert.match(manualPopup, /\{routeTypeRequest && <Button block className="community-track-fallback-btn" onClick=\{this\.onCommunityTrackUpload\}>上传 GPX\/KML，补充完整路线<\/Button>\}/)
  assert.match(manualPopup, /\{!routeTypeRequest && tripFlow\.error && \['location_failed', 'route_not_found'\]\.indexOf\(tripFlow\.error\.code\) >= 0 && <Button block className="community-track-fallback-btn" onClick=\{this\.onCommunityTrackUpload\}>上传 GPX\/KML，补充完整路线<\/Button>\}/)
  assert.match(manualPopup, /className="community-track-fallback-btn"[^>]+onClick=\{this\.onCommunityTrackUpload\}[^>]*>上传 GPX\/KML，补充完整路线<\/Button>/)
  assert.match(manualPopup, /className="manual-submit-btn"[^>]+onClick=\{this\.onManualSubmit\}/)
  assert.match(manualPopup, /className="manual-modify-btn"[^>]+onClick=\{this\.onManualClose\}[^>]*>修改搜索<\/Button>/)

  assert.match(page, /componentDidMount\(\)[\s\S]*decodeCommunityTrackDraftTitle[\s\S]*FORM_PATCH/)
  const prefillStart = page.indexOf('  _applyDraftTitle = () => {')
  const prefillEnd = page.indexOf('\n  onTrackDisclosureToggle', prefillStart)
  const prefillBody = page.slice(prefillStart, prefillEnd)
  assert.ok(prefillStart >= 0 && prefillEnd > prefillStart, 'draft-title prefill seam must be bounded')
  assert.match(prefillBody, /Taro\.getCurrentInstance\(\)/)
  assert.match(prefillBody, /patch: \{ title: draftTitle \}/)
  assert.doesNotMatch(prefillBody, /rightsAccepted|file:|session|admin|consent|cloudPath|fileID|manualLat|manualLon|publish/i)
  assert.match(page, /仅供私下审核，不会自动公开/)
  assert.match(page, /不会立即生成完整路线建议/)
  assert.match(page, /不会自动发布为可搜索路线/)
}

function assertDraftTitleContract(homepage, page) {
  const normalizeSource = extractNamedFunctionSource(homepage, 'normalizeCommunityTrackDraftTitle')
  assert.ok(normalizeSource, 'homepage must have a bounded draft-title producer')
  assert.match(normalizeSource, /Array\.from\(text\)\.length/)
  const normalizeDraftTitle = new Function(`return ${normalizeSource}`)()
  const decodeSource = extractNamedFunctionSource(page, 'decodeCommunityTrackDraftTitle')
  assert.ok(decodeSource, 'community page must have a bounded draft-title decoder')
  assert.match(decodeSource, /raw\.length > 1024/)
  assert.match(decodeSource, /Array\.from\(decoded\)\.length/)
  const decodeDraftTitle = new Function(`return ${decodeSource}`)()

  const cjk2 = '中文'
  const cjk80 = '字'.repeat(80)
  const emoji41 = '😀'.repeat(41)
  const emoji80 = '😀'.repeat(80)
  assert.equal(normalizeDraftTitle(` ${cjk2} `), cjk2, 'two CJK code points pass after trimming')
  assert.equal(normalizeDraftTitle(cjk80), cjk80, '80 CJK code points pass')
  assert.equal(normalizeDraftTitle(emoji41), emoji41, '41 emoji code points pass')
  assert.equal(normalizeDraftTitle(emoji80), emoji80, '80 emoji code points pass')
  assert.equal(normalizeDraftTitle('字'), '', 'one code point is rejected')
  assert.equal(normalizeDraftTitle('字'.repeat(81)), '', '81 code points are rejected')
  assert.equal(normalizeDraftTitle(`a\u0001b`), '', 'C0 U+0001 is rejected by the producer')
  assert.equal(normalizeDraftTitle(`a\u007fb`), '', 'DEL is rejected by the producer')
  assert.equal(normalizeDraftTitle(`a\u0085b`), '', 'C1 U+0085 is rejected by the producer')

  assert.equal(decodeDraftTitle({ draftTitle: encodeURIComponent(cjk2) }), cjk2, 'two CJK code points decode')
  assert.equal(decodeDraftTitle({ draftTitle: encodeURIComponent(cjk80) }), cjk80, '80 CJK code points decode')
  assert.equal(decodeDraftTitle({ draftTitle: encodeURIComponent(emoji41) }), emoji41, '41 emoji code points decode')
  const encodedEmoji80 = encodeURIComponent(emoji80)
  assert.equal(encodedEmoji80.length, 960, '80 four-byte code points use 960 encoded characters')
  assert.ok(encodedEmoji80.length <= 1024, 'valid 80-code-point title fits receiver raw cap')
  const producedEmoji80 = normalizeDraftTitle(emoji80)
  assert.equal(decodeDraftTitle({ draftTitle: encodeURIComponent(producedEmoji80) }), producedEmoji80, 'producer/receiver round-trip exactly')
  assert.equal(decodeDraftTitle({ draftTitle: encodedEmoji80 }), emoji80, '80 emoji title round-trips exactly')
  assert.equal(decodeDraftTitle({ draftTitle: encodeURIComponent('字') }), '', 'one code point is rejected by decoder')
  assert.equal(decodeDraftTitle({ draftTitle: encodeURIComponent('字'.repeat(81)) }), '', '81 code points are rejected by decoder')
  assert.equal(decodeDraftTitle({ draftTitle: '%' }), '', 'malformed percent encoding fails closed')
  assert.equal(decodeDraftTitle({ draftTitle: encodeURIComponent(`a\u0085b`) }), '', 'C1 U+0085 is rejected by the decoder')
  assert.equal(decodeDraftTitle({ draftTitle: encodeURIComponent('a\u007fb') }), '', 'DEL is rejected by the decoder')
  assert.equal(decodeDraftTitle({ draftTitle: 'a'.repeat(1025) }), '', 'raw encoded input above 1024 is rejected')
}

function runRouteContributionMutations(homepage, page) {
  const identity = (source) => source
  const routeSearchMutations = [
    {
      label: 'candidate upload entry removed',
      mutateHomepage: (source) => source.replace(/\s*<Button[^>]+className="candidate-upload-btn"[\s\S]*?<\/Button>/, ''),
      mutatePage: identity,
      target: 'homepage',
    },
    {
      label: 'no-result upload entry removed',
      mutateHomepage: (source) => source.replace(/\{!routeTypeRequest && tripFlow\.error && \['location_failed', 'route_not_found'\]\.indexOf\(tripFlow\.error\.code\) >= 0 && <Button block className="community-track-fallback-btn" onClick=\{this\.onCommunityTrackUpload\}>上传 GPX\/KML，补充完整路线<\/Button>\}/, ''),
      mutatePage: identity,
      target: 'homepage',
    },
    {
      label: 'candidate selection misrouted',
      mutateHomepage: (source) => source.replace('onClick={() => this.onCandidateSelect(candidate.candidateId)}', 'onClick={this.onCommunityTrackUpload}'),
      mutatePage: identity,
      target: 'homepage',
    },
    {
      label: 'privacy wording removed',
      mutateHomepage: identity,
      mutatePage: (source) => source.replace('不会自动发布为可搜索路线', ''),
      target: 'page',
    },
    {
      label: 'draft-title coordinate query leakage',
      mutateHomepage: (source) => source.replace(
        'return Taro.navigateTo({ url: `/pages/community-track/index?draftTitle=${encodedTitle}` })',
        'return Taro.navigateTo({\n      url: `/pages/community-track/index?draftTitle=${encodedTitle}` +\n        `&manualLat=${this.state.manualLat}`,\n    })',
      ),
      mutatePage: identity,
      target: 'homepage',
    },
  ]
  routeSearchMutations.forEach(({ label, mutateHomepage, mutatePage, target }) => {
    const mutatedHomepage = mutateHomepage(homepage)
    const mutatedPage = mutatePage(page)
    if (target === 'homepage') {
      assert.notEqual(mutatedHomepage, homepage, `${label} must change homepage source`)
      assert.equal(mutatedPage, page, `${label} must not change community page source`)
    } else {
      assert.equal(mutatedHomepage, homepage, `${label} must not change homepage source`)
      assert.notEqual(mutatedPage, page, `${label} must change community page source`)
    }
    if (label === 'no-result upload entry removed') {
      assert.match(mutatedHomepage, /\{routeTypeRequest && <Button block className="community-track-fallback-btn" onClick=\{this\.onCommunityTrackUpload\}>上传 GPX\/KML，补充完整路线<\/Button>\}/, 'place-only upload branch must remain')
    }
    assert.throws(() => assertRouteContributionWiring(mutatedHomepage, mutatedPage), undefined, label)
  })
}

function routeSearchContributionContract() {
  const root = path.join(__dirname, '../taro-app/src')
  const homepage = fs.readFileSync(path.join(root, 'pages/index/index.jsx'), 'utf8')
  const page = fs.readFileSync(path.join(root, 'pages/community-track/index.jsx'), 'utf8')
  assertRouteContributionWiring(homepage, page)
  assertDraftTitleContract(homepage, page)
  runRouteContributionMutations(homepage, page)
}

Promise.resolve()
  .then(serviceContract)
  .then(modelContract)
  .then(reviewFixServiceContract)
  .then(reviewFixModelContract)
  .then(reviewFixRoundTwoServiceContract)
  .then(reviewFixRoundThreeServiceContract)
  .then(reviewFixRoundTwoModelContract)
  .then(adminServiceContract)
  .then(adminRawPathRemovedContract)
  .then(adminModelContract)
  .then(sourceWiringContract)
  .then(adminSourceWiringContract)
  .then(secondaryCommunityPageContract)
  .then(homepagePresentationContract)
  .then(routeSearchContributionContract)
  .then(() => console.log('PASS: C04/C05/C07 track-submission UI contract'))
  .catch((error) => {
    console.error(error.stack || error)
    process.exitCode = 1
  })
