/*
 * C04 page-local track submission model.
 *
 * This module is deliberately pure.  It stores only user-entered fields,
 * safe file metadata and server-projected owner DTOs.  The injected service
 * owns the temporary reservation, local path and opaque upload receipt.
 */

const MAX_TRACK_BYTES = 10 * 1024 * 1024
const RIGHTS_DECLARATION_VERSION = 'track-rights-v1'

const RIGHTS_COPY = '提交前请确认：这是我本人记录、已获得记录者明确授权，或采用允许本次复制和私下审核的开放许可之轨迹。文件可能包含精确位置、海拔和时间等敏感信息。原始文件仅供提交者本人、系统服务和获授权管理员私下审核，不会自动公开。审核通过只表示可作为几何证据，不代表路线已开放、安全或已经发布。从服务端完成不可变审核快照起，原始上传、审核副本和含身份提交记录的可访问期最长 30 天；去身份几何证据的可访问期最长 180 天。取消、无效或拒绝会立即尝试删除原始文件；期限到达后内容立即不可读取、审核或继续使用，并进入物理删除。若云端删除失败，物理清理可能延迟，但内容仍保持不可访问；系统会记录待清理并继续重试，不会宣称已删除。我同意按上述保留与删除规则处理该文件。'
const RIGHTS_PLATFORM_COPY = '不要上传从第三方平台抓取、破解下载或无权再分发的轨迹。两步路、六只脚等平台仅可作为私有来源说明；请先使用平台提供的合法导出方式并确认你有权提交。'

const RIGHTS_BASIS_COPY = Object.freeze({
  own_recording: '这是我本人记录的轨迹，我有权将其提交给徒步薯作私有审核。',
  authorized_by_creator: '轨迹记录者已明确授权我将此文件提交给徒步薯作私有审核。',
  open_license: '此轨迹采用我填写的开放许可，且该许可允许本次复制与审核使用。',
})

const RIGHTS_BASES = Object.freeze(['own_recording', 'authorized_by_creator', 'open_license'])
const PROVENANCE_PLATFORMS = Object.freeze(['self', '2bulu', 'foooooot', 'other'])

const OWNER_ACTIONS = Object.freeze({
  awaiting_upload: Object.freeze(['upload_finalize', 'cancel']),
  processing: Object.freeze(['refresh']),
  pending_review: Object.freeze(['cancel']),
  changes_requested: Object.freeze(['begin_revision', 'cancel']),
  approved_evidence: Object.freeze([]),
  rejected: Object.freeze([]),
  cancelled: Object.freeze([]),
  invalid: Object.freeze([]),
})

const STATUS_LABELS = Object.freeze({
  awaiting_upload: '等待上传',
  processing: '正在校验',
  pending_review: '等待审核',
  changes_requested: '需要修改',
  approved_evidence: '已批准为几何证据',
  rejected: '未通过审核',
  cancelled: '已取消',
  invalid: '文件无效',
})

const ACTION_LABELS = Object.freeze({
  upload_finalize: '上传并提交',
  refresh: '刷新状态',
  begin_revision: '重新提交',
  cancel: '取消提交',
  retry_cleanup: '重试清理',
})

const STATUS_ROWS = Object.freeze(Object.keys(STATUS_LABELS).map((status) => Object.freeze({
  status,
  label: STATUS_LABELS[status],
  actions: OWNER_ACTIONS[status],
})))

const ERROR_TABLE = Object.freeze({
  invalid_mode: ['请求模式不受支持', false, null],
  unauthenticated: ['请先登录后重试', false, null],
  forbidden: ['无权执行此操作', false, null],
  admin_not_configured: ['审核功能尚未配置', false, 'contact_admin'],
  storage_not_configured: ['轨迹存储尚未配置', false, 'contact_admin'],
  invalid_input: ['提交信息不完整或格式错误', false, null],
  invalid_rights_declaration: ['请确认轨迹权利声明', false, null],
  unsupported_format: ['仅支持 GPX 或 KML 文件', false, null],
  upload_reservation_expired: ['上传已过期，请重新选择文件', false, 'restart_upload'],
  file_missing: ['未找到已上传文件', false, 'restart_upload'],
  file_size_invalid: ['文件大小无效或超过 10 MB', false, 'restart_upload'],
  upload_binding_invalid: ['上传文件与本次提交不匹配', false, 'restart_upload'],
  invalid_revision: ['无法基于该记录重新提交', false, null],
  invalid_cursor: ['列表已更新，请刷新后重试', true, 'refresh'],
  xml_unsafe: ['文件包含不允许的 XML 结构', false, 'restart_upload'],
  xml_invalid: ['无法解析轨迹文件', false, 'restart_upload'],
  track_structure_unsupported: ['轨迹结构暂不支持', false, 'restart_upload'],
  track_limits_exceeded: ['轨迹点数、分段或结构超过限制', false, 'restart_upload'],
  coordinate_invalid: ['轨迹包含无效坐标或高程', false, 'restart_upload'],
  submission_not_found: ['未找到该提交', false, null],
  invalid_state: ['当前状态不允许此操作', false, null],
  version_conflict: ['记录已更新，请刷新后重试', true, 'refresh'],
  processing_in_progress: ['正在校验轨迹，请稍后刷新', true, 'refresh'],
  raw_unavailable: ['原始文件暂不可用', true, 'retry'],
  storage_unavailable: ['文件服务暂不可用，请稍后重试', true, 'retry'],
  store_unavailable: ['提交服务暂不可用，请稍后重试', true, 'retry'],
  processing_failed: ['轨迹处理未完成，请重新上传', false, 'restart_upload'],
})

const TRACK_OPERATIONS = Object.freeze(['begin', 'upload', 'list', 'detail', 'cancel', 'cleanup'])
const SUBMISSION_STATUSES = Object.freeze(Object.keys(STATUS_LABELS))

const FORM_FIELDS = Object.freeze([
  'title', 'region', 'note', 'provenancePlatform', 'provenancePageUrl',
  'rightsBasis', 'rightsAccepted', 'licenseName', 'licenseUrl', 'revisesSubmissionId',
])

function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

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

function asNow(value) {
  const date = value instanceof Date ? value : new Date(value === undefined ? Date.now() : value)
  return Number.isFinite(date.getTime()) ? date.getTime() : Date.now()
}

function createInitialTrackForm(overrides = {}) {
  const form = {
    title: '',
    region: '',
    note: '',
    provenancePlatform: '',
    provenancePageUrl: '',
    rightsBasis: 'own_recording',
    rightsAccepted: false,
    licenseName: '',
    licenseUrl: '',
    revisesSubmissionId: null,
  }
  FORM_FIELDS.forEach((key) => {
    if (key !== 'rightsAccepted' && Object.prototype.hasOwnProperty.call(overrides, key)) form[key] = overrides[key]
  })
  form.rightsAccepted = false
  if (!RIGHTS_BASES.includes(form.rightsBasis)) form.rightsBasis = 'own_recording'
  return form
}

function normalizeText(value, min, max) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  const length = Array.from(text).length
  return length >= min && length <= max ? text : null
}

function normalizeOptionalText(value, max) {
  if (value === undefined || value === null || value === '') return null
  return normalizeText(value, 1, max)
}

function normalizeOperation(value) {
  return TRACK_OPERATIONS.includes(value) ? value : null
}

function safeIntent(operation, value) {
  const source = isRecord(value) ? value : {}
  const intentOperation = normalizeOperation(operation || source.operation)
  if (intentOperation === 'list') {
    return {
      append: source.append === true,
      cursor: typeof source.cursor === 'string' && source.cursor.length > 0 && source.cursor.length <= 2048 ? source.cursor : null,
    }
  }
  if (intentOperation === 'detail') {
    return typeof source.submissionId === 'string' && source.submissionId.length > 0 && source.submissionId.length <= 80
      ? { submissionId: source.submissionId }
      : null
  }
  if (intentOperation === 'cancel' || intentOperation === 'cleanup') {
    const action = source.action === 'retry_cleanup' ? 'retry_cleanup' : (source.action === 'cancel' ? 'cancel' : null)
    return typeof source.submissionId === 'string' && source.submissionId.length > 0 && source.submissionId.length <= 80
      && Number.isInteger(source.expectedVersion) && source.expectedVersion >= 1 && action
      ? { operation: intentOperation, submissionId: source.submissionId, expectedVersion: source.expectedVersion, action }
      : null
  }
  return null
}

function validateTrackForm(form = {}) {
  if (!isRecord(form)) return { ok: false, error: mapTrackError({ code: 'invalid_input' }) }
  const title = normalizeText(form.title, 2, 80)
  if (!title) return { ok: false, error: mapTrackError({ code: 'invalid_input' }) }
  const region = normalizeOptionalText(form.region, 80)
  const note = normalizeOptionalText(form.note, 500)
  if ((form.region !== undefined && form.region !== null && form.region !== '' && region === null)
    || (form.note !== undefined && form.note !== null && form.note !== '' && note === null)) {
    return { ok: false, error: mapTrackError({ code: 'invalid_input' }) }
  }
  if (!RIGHTS_BASES.includes(form.rightsBasis) || form.rightsAccepted !== true) {
    return { ok: false, error: mapTrackError({ code: 'invalid_rights_declaration' }) }
  }
  const provenancePlatform = form.provenancePlatform === undefined || form.provenancePlatform === ''
    ? null : form.provenancePlatform
  if (provenancePlatform !== null && !PROVENANCE_PLATFORMS.includes(provenancePlatform)) {
    return { ok: false, error: mapTrackError({ code: 'invalid_input' }) }
  }
  const provenancePageUrl = form.provenancePageUrl === undefined || form.provenancePageUrl === ''
    ? null : String(form.provenancePageUrl).trim()
  if (provenancePageUrl !== null && (provenancePageUrl.length > 500 || !isHttpsUrl(provenancePageUrl))) {
    return { ok: false, error: mapTrackError({ code: 'invalid_input' }) }
  }
  let licenseName = null
  let licenseUrl = null
  if (form.licenseName !== undefined && form.licenseName !== '') licenseName = normalizeText(form.licenseName, 2, 80)
  if (form.licenseUrl !== undefined && form.licenseUrl !== '') licenseUrl = String(form.licenseUrl).trim()
  if (form.rightsBasis === 'open_license') {
    if (!licenseName || !licenseUrl || licenseUrl.length > 500 || !isHttpsUrl(licenseUrl)) {
      return { ok: false, error: mapTrackError({ code: 'invalid_rights_declaration' }) }
    }
  } else if (licenseName !== null || licenseUrl !== null) {
    return { ok: false, error: mapTrackError({ code: 'invalid_rights_declaration' }) }
  }
  return {
    ok: true,
    value: {
      title,
      region,
      note,
      provenancePlatform,
      provenancePageUrl,
      rightsBasis: form.rightsBasis,
      rightsAccepted: true,
      rightsDeclarationVersion: RIGHTS_DECLARATION_VERSION,
      licenseName,
      licenseUrl,
      revisesSubmissionId: form.revisesSubmissionId || null,
    },
  }
}

function isHttpsUrl(value) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password && !parsed.port
  } catch (_error) {
    return false
  }
}

function fileFormat(name) {
  if (typeof name !== 'string') return null
  const match = /\.([^.]+)$/.exec(name.trim())
  if (!match) return null
  const format = match[1].toLowerCase()
  return format === 'gpx' || format === 'kml' ? format : null
}

function validateLocalFile(file) {
  if (!isRecord(file)) return { ok: false, error: mapTrackError({ code: 'file_missing' }) }
  const name = typeof file.name === 'string' ? file.name.trim() : ''
  const format = fileFormat(name)
  if (!format) return { ok: false, error: mapTrackError({ code: 'unsupported_format' }) }
  if (!Number.isInteger(file.size) || file.size < 1 || file.size > MAX_TRACK_BYTES) {
    return { ok: false, error: mapTrackError({ code: 'file_size_invalid' }) }
  }
  return { ok: true, value: { name, format, size: file.size } }
}

function buildBeginPayload(form, file, { beginAttemptId, revisesSubmissionId } = {}) {
  const checkedForm = validateTrackForm(form)
  const checkedFile = validateLocalFile(file)
  if (!checkedForm.ok) return checkedForm
  if (!checkedFile.ok) return checkedFile
  if (typeof beginAttemptId !== 'string' || beginAttemptId.trim().length < 1 || beginAttemptId.trim().length > 80) {
    return { ok: false, error: mapTrackError({ code: 'invalid_input' }) }
  }
  const input = checkedForm.value
  return {
    ok: true,
    value: {
      mode: 'begin',
      beginAttemptId: beginAttemptId.trim(),
      originalFilename: checkedFile.value.name,
      declaredSizeBytes: checkedFile.value.size,
      title: input.title,
      region: input.region,
      note: input.note,
      provenancePlatform: input.provenancePlatform,
      provenancePageUrl: input.provenancePageUrl,
      rightsBasis: input.rightsBasis,
      rightsAccepted: true,
      rightsDeclarationVersion: RIGHTS_DECLARATION_VERSION,
      licenseName: input.licenseName,
      licenseUrl: input.licenseUrl,
      revisesSubmissionId: revisesSubmissionId === undefined ? input.revisesSubmissionId : (revisesSubmissionId || null),
    },
  }
}

function mapTrackError(value, operation, intent) {
  const source = isRecord(value) && isRecord(value.error) ? value.error : value
  const code = source && ERROR_TABLE[source.code] ? source.code : 'invalid_input'
  const row = ERROR_TABLE[code]
  const result = {
    code,
    message: row[0],
    retryable: row[1],
    retryAfterSeconds: code === 'processing_in_progress' ? 5 : null,
    nextAction: row[2],
  }
  const operationName = normalizeOperation(operation || (source && source.operation))
  if (operationName) {
    result.operation = operationName
    const boundedIntent = safeIntent(operationName, intent || (source && source.intent))
    if (boundedIntent) result.intent = boundedIntent
  }
  return result
}

function isExpired(submission, now = Date.now()) {
  if (!submission || !submission.retention || !submission.retention.recordExpiresAt) return false
  const expiry = Date.parse(submission.retention.recordExpiresAt)
  return Number.isFinite(expiry) && expiry <= asNow(now)
}

function safeActions(value) {
  if (!Array.isArray(value)) return []
  const allowed = new Set(['upload_finalize', 'refresh', 'begin_revision', 'cancel', 'retry_cleanup'])
  const seen = new Set()
  return value.filter((action) => {
    if (!allowed.has(action) || seen.has(action)) return false
    seen.add(action)
    return true
  })
}

function safeString(value) {
  return typeof value === 'string' ? value : null
}

function safeInteger(value) {
  return Number.isInteger(value) ? value : null
}

function safeTimestamp(value) {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function safeCleanup(cleanup) {
  if (!isRecord(cleanup)) return { pending: false, target: null }
  const target = ['upload', 'review', 'both'].includes(cleanup.target) ? cleanup.target : null
  return { pending: cleanup.pending === true, target }
}

function safeRetention(retention) {
  if (!isRecord(retention)) return { rawExpiresAt: null, recordExpiresAt: null, evidenceExpiresAt: null }
  return {
    rawExpiresAt: safeTimestamp(retention.rawExpiresAt),
    recordExpiresAt: safeTimestamp(retention.recordExpiresAt),
    evidenceExpiresAt: safeTimestamp(retention.evidenceExpiresAt),
  }
}

function safeSummary(summary) {
  if (!isRecord(summary)) return null
  const elevation = isRecord(summary.elevation) ? {
    presentPointCount: safeInteger(summary.elevation.presentPointCount),
    coverage: typeof summary.elevation.coverage === 'number' && Number.isFinite(summary.elevation.coverage)
      ? summary.elevation.coverage : null,
    minM: typeof summary.elevation.minM === 'number' && Number.isFinite(summary.elevation.minM)
      ? summary.elevation.minM : null,
    maxM: typeof summary.elevation.maxM === 'number' && Number.isFinite(summary.elevation.maxM)
      ? summary.elevation.maxM : null,
  } : null
  return {
    summaryVersion: summary.summaryVersion === 'track-summary-v1' ? summary.summaryVersion : null,
    format: ['gpx', 'kml'].includes(summary.format) ? summary.format : null,
    pointCount: safeInteger(summary.pointCount),
    segmentCount: safeInteger(summary.segmentCount),
    distanceM: safeInteger(summary.distanceM),
    elevation,
    hasTimestamps: summary.hasTimestamps === true,
  }
}

function projectSubmission(submission, now = Date.now()) {
  if (!isRecord(submission)) return null
  const projected = {
    submissionId: safeString(submission.submissionId),
    originalFilename: safeString(submission.originalFilename),
    title: safeString(submission.title),
    region: safeString(submission.region),
    format: ['gpx', 'kml'].includes(submission.format) ? submission.format : null,
    actualSizeBytes: safeInteger(submission.actualSizeBytes),
    rightsBasis: RIGHTS_BASES.includes(submission.rightsBasis) ? submission.rightsBasis : null,
    rightsDeclarationVersion: submission.rightsDeclarationVersion === RIGHTS_DECLARATION_VERSION
      ? submission.rightsDeclarationVersion : null,
    licenseName: safeString(submission.licenseName),
    licenseUrl: safeString(submission.licenseUrl),
    summary: safeSummary(submission.summary),
    status: SUBMISSION_STATUSES.includes(submission.status) ? submission.status : null,
    version: safeInteger(submission.version),
    reviewNote: safeString(submission.reviewNote),
    revisesSubmissionId: safeString(submission.revisesSubmissionId),
    cleanup: safeCleanup(submission.cleanup),
    retention: safeRetention(submission.retention),
    allowedActions: safeActions(submission.allowedActions),
    createdAt: safeTimestamp(submission.createdAt),
    updatedAt: safeTimestamp(submission.updatedAt),
  }
  const expired = isExpired(projected, now)
  projected.allowedActions = expired ? [] : projected.allowedActions
  projected.statusLabel = expired ? '内容已过期，暂不可用' : (STATUS_LABELS[projected.status] || '状态待确认')
  projected.unavailable = expired
  if (projected.unavailable) {
    projected.reviewNote = null
    projected.summary = null
  }
  return projected
}

function createInitialTrackUiState() {
  return {
    form: createInitialTrackForm(),
    file: null,
    phase: 'idle',
    error: null,
    reservation: null,
    list: { items: [], nextCursor: null, loading: false, token: 0, requestIntent: null },
    detail: { submission: null, loading: false, token: 0, open: false, requestIntent: null },
    mutation: { loading: false, action: null, token: 0, requestIntent: null },
    selectedSubmissionId: null,
    revisionParentId: null,
    sessionToken: 0,
    uploadSessionAvailable: false,
    uploadBusy: false,
    uploadOperation: null,
  }
}

function token(state, key) {
  const source = key && state && state[key] ? state[key] : state
  return (source && Number.isInteger(source.token) ? source.token : 0) + 1
}

function upsert(items, submission, now = Date.now()) {
  if (!submission || typeof submission.submissionId !== 'string') return Array.isArray(items) ? items : []
  const next = Array.isArray(items) ? items.filter((item) => item.submissionId !== submission.submissionId) : []
  next.push(projectSubmission(submission, now))
  return next
}

function reduceTrackUi(previous, event = {}, now = Date.now()) {
  const state = previous || createInitialTrackUiState()
  const type = event.type
  if (type === 'FORM_PATCH') {
    const patch = isRecord(event.patch) ? event.patch : {}
    const form = { ...state.form }
    FORM_FIELDS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(patch, key)) form[key] = patch[key]
    })
    if (Object.prototype.hasOwnProperty.call(patch, 'rightsBasis')) {
      form.rightsAccepted = false
      if (form.rightsBasis !== 'open_license') {
        form.licenseName = ''
        form.licenseUrl = ''
      }
    }
    return { ...state, form, error: null, phase: state.phase === 'error' ? 'editing' : state.phase }
  }
  if (type === 'FILE_SELECTED') {
    const checked = validateLocalFile(event.file)
    return checked.ok
      ? {
        ...state,
        file: checked.value,
        reservation: null,
        uploadSessionAvailable: false,
        uploadBusy: false,
        uploadOperation: null,
        sessionToken: state.sessionToken + 1,
        error: null,
        phase: 'editing',
      }
      : {
        ...state,
        file: null,
        reservation: null,
        uploadSessionAvailable: false,
        uploadBusy: false,
        uploadOperation: null,
        sessionToken: state.sessionToken + 1,
        error: checked.error,
        phase: 'error',
      }
  }
  if (type === 'CLEAR_FILE') return {
    ...state,
    file: null,
    reservation: null,
    uploadSessionAvailable: false,
    uploadBusy: false,
    uploadOperation: null,
    sessionToken: state.sessionToken + 1,
    error: null,
    phase: 'editing',
  }
  if (type === 'FILE_SELECTION_FAILED' || type === 'FILE_SELECTION_CANCELLED') return {
    ...state,
    file: null,
    reservation: null,
    uploadSessionAvailable: false,
    uploadBusy: false,
    uploadOperation: null,
    sessionToken: state.sessionToken + 1,
    error: type === 'FILE_SELECTION_FAILED' ? mapTrackError(event.error) : null,
    phase: 'editing',
  }
  if (type === 'BEGIN_REQUEST') {
    if (state.uploadBusy) return state
    return {
      ...state,
      phase: 'uploading',
      error: null,
      sessionToken: state.sessionToken + 1,
      uploadSessionAvailable: false,
      uploadBusy: true,
      uploadOperation: 'begin',
      mutation: { ...state.mutation, action: 'upload_finalize', token: state.mutation.token + 1 },
    }
  }
  if (type === 'UPLOAD_REQUEST') {
    if (state.uploadBusy) return state
    return {
      ...state,
      phase: 'uploading',
      error: null,
      uploadBusy: true,
      uploadOperation: 'upload',
    }
  }
  if (type === 'RESERVATION_RECEIVED') {
    const reservation = isRecord(event.reservation) ? {
      submissionId: safeString(event.reservation.submissionId),
      status: event.reservation.status,
      version: event.reservation.version,
      format: event.reservation.format,
      expiresAt: event.reservation.expiresAt,
      allowedActions: safeActions(event.reservation.allowedActions),
    } : null
    return {
      ...state,
      reservation,
      uploadSessionAvailable: Boolean(reservation && reservation.submissionId),
      uploadBusy: true,
      uploadOperation: 'upload',
      phase: 'awaiting_upload',
      error: null,
    }
  }
  if (type === 'SUBMISSION_RESPONSE') {
    const response = event.response
    if (response && response.phase === 'mine' && response.submission) {
      const submission = projectSubmission(response.submission, now)
      return {
        ...state,
        phase: 'idle',
        error: null,
        reservation: null,
        file: null,
        uploadSessionAvailable: false,
        uploadBusy: false,
        uploadOperation: null,
        revisionParentId: null,
        list: { ...state.list, items: upsert(state.list.items, submission, now) },
        detail: { ...state.detail, submission, open: state.detail.open },
      }
    }
    if (response && response.phase === 'error') {
      const operation = normalizeOperation(event.operation)
      const keepUploadSession = operation === 'upload' && state.reservation && state.uploadSessionAvailable
      return {
        ...state,
        phase: 'error',
        error: mapTrackError(response, operation, event.intent),
        reservation: keepUploadSession ? state.reservation : null,
        uploadSessionAvailable: Boolean(keepUploadSession),
        uploadBusy: operation === 'begin' || operation === 'upload' ? false : state.uploadBusy,
        uploadOperation: operation === 'begin' || operation === 'upload' ? null : state.uploadOperation,
      }
    }
    return state
  }
  if (type === 'ERROR') {
    const operation = normalizeOperation(event.operation)
    return {
      ...state,
      phase: 'error',
      error: mapTrackError(event.error, operation, event.intent),
      list: { ...state.list, loading: false },
      detail: { ...state.detail, loading: false },
      mutation: { ...state.mutation, loading: false, action: null },
      uploadBusy: operation === 'begin' || operation === 'upload' ? false : state.uploadBusy,
      uploadOperation: operation === 'begin' || operation === 'upload' ? null : state.uploadOperation,
    }
  }
  if (type === 'LIST_REQUEST') {
    const nextToken = token(state.list, 'list')
    const intent = {
      append: event.append === true,
      cursor: event.append === true
        ? (typeof event.cursor === 'string' && event.cursor.length > 0 ? event.cursor : (state.list.nextCursor || null))
        : null,
    }
    return {
      ...state,
      phase: 'loading',
      error: null,
      list: { ...state.list, loading: true, token: nextToken, requestIntent: intent, items: event.append ? state.list.items : [], nextCursor: event.append ? state.list.nextCursor : null },
    }
  }
  if (type === 'LIST_RESPONSE') {
    if (event.token !== state.list.token) return state
    const response = event.response
    if (response && response.phase === 'mine_list') {
      const incoming = Array.isArray(response.items) ? response.items.map((item) => projectSubmission(item, now)) : []
      const append = event.append === true || (state.list.requestIntent && state.list.requestIntent.append === true)
      const items = append
        ? incoming.reduce((all, item) => upsert(all, item, now), state.list.items)
        : incoming
      return { ...state, phase: 'idle', error: null, list: { ...state.list, loading: false, requestIntent: null, items, nextCursor: response.nextCursor || null } }
    }
    return { ...state, phase: 'error', error: mapTrackError(response, event.operation || 'list', event.intent || state.list.requestIntent), list: { ...state.list, loading: false } }
  }
  if (type === 'DETAIL_REQUEST') {
    const nextToken = token(state.detail, 'detail')
    const intent = typeof event.submissionId === 'string' && event.submissionId.length > 0 ? { submissionId: event.submissionId } : null
    return { ...state, error: null, detail: { ...state.detail, loading: true, token: nextToken, requestIntent: intent, open: true }, selectedSubmissionId: event.submissionId }
  }
  if (type === 'DETAIL_RESPONSE') {
    if (event.token !== state.detail.token) return state
    const response = event.response
    if (response && response.phase === 'mine' && response.submission) {
      const submission = projectSubmission(response.submission, now)
      return { ...state, phase: 'idle', error: null, detail: { ...state.detail, loading: false, requestIntent: null, submission, open: true }, list: { ...state.list, items: upsert(state.list.items, submission, now) } }
    }
    return { ...state, phase: 'error', error: mapTrackError(response, event.operation || 'detail', event.intent || state.detail.requestIntent), detail: { ...state.detail, loading: false } }
  }
  if (type === 'MUTATION_REQUEST') {
    const nextToken = token(state.mutation, 'mutation')
    const operation = normalizeOperation(event.operation || (event.action === 'retry_cleanup' ? 'cleanup' : 'cancel'))
    const intent = safeIntent(operation, event.intent || {
      operation,
      submissionId: event.submissionId,
      expectedVersion: event.expectedVersion,
      action: event.action,
    })
    return {
      ...state,
      error: null,
      selectedSubmissionId: typeof event.submissionId === 'string' ? event.submissionId : state.selectedSubmissionId,
      mutation: { loading: true, action: event.action || null, token: nextToken, requestIntent: intent },
    }
  }
  if (type === 'MUTATION_RESPONSE') {
    if (event.token !== state.mutation.token) return state
    const response = event.response
    if (response && response.phase === 'mine' && response.submission) {
      const submission = projectSubmission(response.submission, now)
      return { ...state, phase: 'idle', error: null, mutation: { ...state.mutation, loading: false, action: null, requestIntent: null }, list: { ...state.list, items: upsert(state.list.items, submission, now) }, detail: { ...state.detail, submission, open: state.detail.open } }
    }
    const responseOperation = event.operation || (event.intent && event.intent.operation) || (state.mutation.requestIntent && state.mutation.requestIntent.operation) || 'cancel'
    return { ...state, phase: 'error', error: mapTrackError(response, responseOperation, event.intent || state.mutation.requestIntent), mutation: { ...state.mutation, loading: false, action: null } }
  }
  if (type === 'START_REVISION') {
    const source = event.submission || state.detail.submission || state.list.items.find((item) => item.submissionId === event.submissionId)
    if (!source || isExpired(source, now) || !safeActions(source.allowedActions).includes('begin_revision')) return state
    return {
      ...state,
      form: createInitialTrackForm({
        title: source.title || '',
        region: source.region || '',
        rightsBasis: 'own_recording',
        rightsAccepted: false,
        revisesSubmissionId: source.submissionId,
      }),
      file: null,
      reservation: null,
      uploadSessionAvailable: false,
      uploadBusy: false,
      uploadOperation: null,
      sessionToken: state.sessionToken + 1,
      phase: 'editing',
      error: null,
      revisionParentId: source.submissionId,
      detail: { ...state.detail, open: false, token: state.detail.token + 1, requestIntent: null },
    }
  }
  if (type === 'CLOSE_DETAIL') {
    return { ...state, detail: { ...state.detail, open: false, token: state.detail.token + 1, requestIntent: null }, selectedSubmissionId: null }
  }
  if (type === 'RESET' || type === 'INVALIDATE') {
    const clean = createInitialTrackUiState()
    return { ...clean, sessionToken: state.sessionToken + 1, list: { ...clean.list, token: state.list.token + 1 }, detail: { ...clean.detail, token: state.detail.token + 1 }, mutation: { ...clean.mutation, token: state.mutation.token + 1 } }
  }
  return state
}

function selectTrackUiView(state = createInitialTrackUiState(), now = Date.now()) {
  const hideUploadResume = (submission) => {
    if (!submission) return submission
    const hasMatchingSession = state.uploadSessionAvailable
      && state.reservation
      && state.reservation.submissionId === submission.submissionId
    const resumeUnavailable = submission.status === 'awaiting_upload'
      && submission.allowedActions.includes('upload_finalize')
      && !hasMatchingSession
    if (!resumeUnavailable) return submission
    return {
      ...submission,
      allowedActions: submission.allowedActions.filter((action) => action !== 'upload_finalize'),
      resumeUnavailable: true,
    }
  }
  const list = state.list.items.map((item) => hideUploadResume(projectSubmission(item, now)))
  const detail = state.detail.submission ? hideUploadResume(projectSubmission(state.detail.submission, now)) : null
  return {
    form: clone(state.form),
    file: clone(state.file),
    phase: state.phase,
    error: state.error ? mapTrackError(state.error, state.error.operation) : null,
    reservation: clone(state.reservation),
    list: { items: list, nextCursor: state.list.nextCursor, loading: state.list.loading, token: state.list.token },
    detail: { submission: detail, loading: state.detail.loading, open: state.detail.open, token: state.detail.token },
    mutation: clone(state.mutation),
    uploadBusy: state.uploadBusy,
    uploadOperation: state.uploadOperation,
    revisionParentId: state.revisionParentId,
    statusRows: STATUS_ROWS.map((row) => ({ status: row.status, label: row.label, actions: [...row.actions] })),
  }
}

function createTrackSubmissionModel(options = {}) {
  let state = createInitialTrackUiState()
  const clock = typeof options.clock === 'function' ? options.clock : () => Date.now()
  return {
    dispatch(event) {
      state = reduceTrackUi(state, event, clock())
      return selectTrackUiView(state, clock())
    },
    getState() { return clone(state) },
    getView() { return selectTrackUiView(state, clock()) },
    reset() { return this.dispatch({ type: 'RESET' }) },
  }
}

module.exports = {
  ACTION_LABELS,
  ERROR_TABLE,
  FORM_FIELDS,
  MAX_TRACK_BYTES,
  OWNER_ACTIONS,
  PROVENANCE_PLATFORMS,
  RIGHTS_BASES,
  RIGHTS_BASIS_COPY,
  RIGHTS_COPY,
  RIGHTS_DECLARATION_VERSION,
  RIGHTS_PLATFORM_COPY,
  STATUS_LABELS,
  STATUS_ROWS,
  TRACK_OPERATIONS,
  buildBeginPayload,
  createInitialTrackForm,
  createInitialTrackUiState,
  createTrackSubmissionModel,
  fileFormat,
  isExpired,
  mapTrackError,
  normalizeOperation,
  projectSubmission,
  reduceTrackUi,
  safeActions,
  safeSummary,
  selectTrackUiView,
  validateLocalFile,
  validateTrackForm,
}
