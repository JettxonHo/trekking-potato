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

const OWNER_ACTIONS = Object.freeze({
  awaiting_upload: ['upload_finalize', 'cancel'],
  processing: ['refresh'],
  pending_review: ['cancel'],
  changes_requested: ['begin_revision', 'cancel'],
  approved_evidence: [],
  rejected: [],
  cancelled: [],
  invalid: [],
})

const ADMIN_ACTIONS = Object.freeze({
  awaiting_upload: [],
  processing: [],
  pending_review: ['view_raw', 'request_changes', 'reject', 'approve_evidence'],
  changes_requested: ['view_raw'],
  approved_evidence: ['view_raw'],
  rejected: [],
  cancelled: [],
  invalid: [],
})

const VALID_STATUSES = new Set(Object.keys(OWNER_ACTIONS))

function clone(value) {
  if (value === null || value === undefined) return value
  if (value instanceof Date) return new Date(value.getTime())
  if (Buffer.isBuffer(value)) return Buffer.from(value)
  if (Array.isArray(value)) return value.map(clone)
  if (typeof value === 'object') {
    const output = {}
    Object.keys(value).forEach((key) => { output[key] = clone(value[key]) })
    return output
  }
  return value
}

function iso(value) {
  if (value === null || value === undefined) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}

function errorResponse(code, overrides = {}) {
  const row = ERROR_TABLE[code] || ERROR_TABLE.invalid_input
  return {
    phase: 'error',
    error: {
      code: ERROR_TABLE[code] ? code : 'invalid_input',
      message: overrides.message || row[0],
      retryable: overrides.retryable === undefined ? row[1] : overrides.retryable,
      retryAfterSeconds: overrides.retryAfterSeconds === undefined
        ? (code === 'processing_in_progress' ? 5 : null)
        : overrides.retryAfterSeconds,
      nextAction: overrides.nextAction === undefined ? row[2] : overrides.nextAction,
    },
  }
}

function isValidStatus(status) {
  return VALID_STATUSES.has(status)
}

function cleanupTarget(record) {
  const state = record && record.rawFileState ? record.rawFileState : {}
  const upload = state.upload === 'deletion_pending'
  const review = state.review === 'deletion_pending'
  if (upload && review) return 'both'
  if (upload) return 'upload'
  if (review) return 'review'
  return null
}

function cleanupProjection(record) {
  const target = cleanupTarget(record)
  return { pending: target !== null, target }
}

function ownerActions(record) {
  const actions = OWNER_ACTIONS[record.status] ? [...OWNER_ACTIONS[record.status]] : []
  if (record.status === 'changes_requested' && record.replacementSubmissionId) {
    return actions.filter((action) => action !== 'begin_revision')
  }
  if (['cancelled', 'invalid', 'rejected'].includes(record.status) && cleanupTarget(record)) {
    return ['retry_cleanup']
  }
  return actions
}

function summaryCopy(summary) {
  return summary === null || summary === undefined ? null : clone(summary)
}

function retention(record) {
  return {
    rawExpiresAt: iso(record.rawExpiresAt),
    recordExpiresAt: iso(record.recordExpiresAt),
    evidenceExpiresAt: iso(record.evidenceExpiresAt),
  }
}

function toMineSubmission(record) {
  return {
    submissionId: record._id,
    originalFilename: record.originalFilename,
    title: record.input.title,
    region: record.input.region,
    format: record.format,
    actualSizeBytes: record.actualSizeBytes === undefined ? null : record.actualSizeBytes,
    rightsBasis: record.rights.basis,
    rightsDeclarationVersion: record.rights.declarationVersion,
    licenseName: record.rights.licenseName,
    licenseUrl: record.rights.licenseUrl,
    summary: summaryCopy(record.summary),
    status: record.status,
    version: record.version,
    reviewNote: record.review && record.review.note ? record.review.note : null,
    revisesSubmissionId: record.revisesSubmissionId,
    cleanup: cleanupProjection(record),
    retention: retention(record),
    allowedActions: ownerActions(record),
    createdAt: iso(record.createdAt),
    updatedAt: iso(record.updatedAt),
  }
}

function toMine(record) {
  return { phase: 'mine', submission: toMineSubmission(record) }
}

function toMineListItem(record) {
  return {
    submissionId: record._id,
    originalFilename: record.originalFilename,
    title: record.input.title,
    region: record.input.region,
    format: record.format,
    actualSizeBytes: record.actualSizeBytes === undefined ? null : record.actualSizeBytes,
    status: record.status,
    version: record.version,
    reviewNote: record.review && record.review.note ? record.review.note : null,
    revisesSubmissionId: record.revisesSubmissionId,
    cleanup: cleanupProjection(record),
    retention: retention(record),
    allowedActions: ownerActions(record),
    createdAt: iso(record.createdAt),
    updatedAt: iso(record.updatedAt),
  }
}

function toMineList(records, nextCursor = null) {
  return { phase: 'mine_list', items: records.map(toMineListItem), nextCursor }
}

function rawAccessAvailable(record, now = new Date()) {
  const rawExpiresAt = record && record.rawExpiresAt ? new Date(record.rawExpiresAt) : null
  const state = record && record.rawFileState ? record.rawFileState : {}
  return Boolean(record && record.reviewFileId && state.review === 'present' && rawExpiresAt
    && Number.isFinite(rawExpiresAt.getTime()) && rawExpiresAt.getTime() > now.getTime())
}

function adminActions(record, now = new Date()) {
  const actions = ADMIN_ACTIONS[record && record.status] ? [...ADMIN_ACTIONS[record.status]] : []
  if (!rawAccessAvailable(record, now)) return []
  if (record.status === 'changes_requested' || record.status === 'approved_evidence') return ['view_raw']
  if (record.status === 'pending_review') return actions
  return []
}

function approvedEvidenceCopy(evidence) {
  if (!evidence) return null
  const value = evidence.approvedEvidence || evidence
  return clone(value)
}

function toAdminListItem(record, now = new Date()) {
  const summary = record && record.summary
  return {
    submissionId: record._id,
    title: record.input.title,
    region: record.input.region,
    format: record.format,
    actualSizeBytes: record.actualSizeBytes === undefined ? null : record.actualSizeBytes,
    rightsBasis: record.rights.basis,
    status: record.status,
    version: record.version,
    reviewNote: record.review && record.review.note ? record.review.note : null,
    revisesSubmissionId: record.revisesSubmissionId,
    pointCount: summary ? summary.pointCount : null,
    segmentCount: summary ? summary.segmentCount : null,
    cleanup: cleanupProjection(record),
    retention: retention(record),
    allowedAdminActions: adminActions(record, now),
    createdAt: iso(record.createdAt),
    updatedAt: iso(record.updatedAt),
  }
}

function toAdminList(records, nextCursor = null, now = new Date()) {
  return { phase: 'admin_list', items: records.map((record) => toAdminListItem(record, now)), nextCursor }
}

function toAdminDetail(record, { rawAccess = null, approvedEvidence = null, now = new Date() } = {}) {
  const mine = toMineSubmission(record)
  return {
    phase: 'admin_detail',
    submission: {
      ...mine,
      note: record.input.note,
      provenancePlatform: record.input.provenancePlatform,
      provenancePageUrl: record.input.provenancePageUrl,
      rawAccess: rawAccess ? clone(rawAccess) : null,
      approvedEvidence: approvedEvidenceCopy(approvedEvidence),
      allowedAdminActions: adminActions(record, now),
    },
  }
}

function toUploadReservation(record) {
  return {
    phase: 'upload_reservation',
    submissionId: record._id,
    status: 'awaiting_upload',
    version: 1,
    cloudPath: record.cloudPath,
    format: record.format,
    expiresAt: iso(record.uploadExpiresAt),
    allowedActions: ['upload_finalize', 'cancel'],
  }
}

function encodeCursor(cursor) {
  const payload = {
    updatedAt: cursor.updatedAt,
    submissionId: cursor.submissionId,
  }
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

function decodeCursor(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(value)) return null
  let payload
  try {
    payload = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
  } catch (_error) {
    return null
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  if (Object.keys(payload).sort().join(',') !== 'submissionId,updatedAt') return null
  if (typeof payload.submissionId !== 'string' || payload.submissionId.length < 1 || payload.submissionId.length > 80) return null
  if (typeof payload.updatedAt !== 'string' || !Number.isFinite(Date.parse(payload.updatedAt))) return null
  try {
    if (new Date(payload.updatedAt).toISOString() !== payload.updatedAt) return null
  } catch (_error) {
    return null
  }
  return { submissionId: payload.submissionId, updatedAt: payload.updatedAt }
}

function encodeAdminCursor(cursor) {
  const payload = {
    updatedAt: cursor.updatedAt,
    submissionId: cursor.submissionId,
    status: cursor.status === undefined ? null : cursor.status,
  }
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

function decodeAdminCursor(value, status = null) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(value)) return null
  let payload
  try { payload = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) } catch (_error) { return null }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  if (Object.keys(payload).sort().join(',') !== 'status,submissionId,updatedAt') return null
  if (payload.status !== null && typeof payload.status !== 'string') return null
  if (payload.status !== status) return null
  if (typeof payload.submissionId !== 'string' || payload.submissionId.length < 1 || payload.submissionId.length > 80) return null
  if (typeof payload.updatedAt !== 'string' || !Number.isFinite(Date.parse(payload.updatedAt))) return null
  try {
    if (new Date(payload.updatedAt).toISOString() !== payload.updatedAt) return null
  } catch (_error) { return null }
  return { submissionId: payload.submissionId, updatedAt: payload.updatedAt, status: payload.status }
}

function sortRecords(records) {
  return [...records].sort((first, second) => {
    const firstTime = new Date(first.updatedAt).getTime()
    const secondTime = new Date(second.updatedAt).getTime()
    if (firstTime !== secondTime) return secondTime - firstTime
    const firstId = String(first._id)
    const secondId = String(second._id)
    return secondId < firstId ? -1 : secondId > firstId ? 1 : 0
  })
}

module.exports = {
  ERROR_TABLE,
  OWNER_ACTIONS,
  ADMIN_ACTIONS,
  VALID_STATUSES,
  clone,
  iso,
  errorResponse,
  isValidStatus,
  cleanupTarget,
  cleanupProjection,
  ownerActions,
  toMine,
  toMineList,
  toMineListItem,
  rawAccessAvailable,
  adminActions,
  toAdminList,
  toAdminListItem,
  toAdminDetail,
  toUploadReservation,
  encodeCursor,
  decodeCursor,
  encodeAdminCursor,
  decodeAdminCursor,
  sortRecords,
}
