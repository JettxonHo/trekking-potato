const MAX_BYTES = 10 * 1024 * 1024
const MAX_ID = 80
const RAW_DAYS = 30
const EVIDENCE_DAYS = 180
const UPLOAD_MINUTES = 30
const PROCESSING_MINUTES = 5
const PROCESSING_LEASE_SECONDS = PROCESSING_MINUTES * 60
const REVIEW_PATH_FUNCTION_TIMEOUT_SECONDS = 240
const RETENTION_BATCH_SIZE = 20

function fixedReviewPathTimeoutIsSafe(timeoutSeconds, leaseSeconds = PROCESSING_LEASE_SECONDS) {
  return Number.isInteger(timeoutSeconds) && timeoutSeconds > 0
    && Number.isInteger(leaseSeconds) && leaseSeconds > 0
    && timeoutSeconds <= REVIEW_PATH_FUNCTION_TIMEOUT_SECONDS
    && timeoutSeconds < leaseSeconds
}

function addMinutes(date, minutes) { return new Date(date.getTime() + minutes * 60 * 1000) }
function addDays(date, days) { return new Date(date.getTime() + days * 24 * 60 * 60 * 1000) }

function validOpaqueId(value) {
  return typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= MAX_ID
}

function codePointLength(value) { return Array.from(value).length }

function normalizeString(value, min, max) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return codePointLength(normalized) >= min && codePointLength(normalized) <= max ? normalized : null
}

function createRecord({ submissionId, openid, beginAttemptId, input, rights, format, declaredSizeBytes, now, idFactory, revisesSubmissionId = null }) {
  const createdAt = new Date(now.getTime())
  return {
    _id: submissionId,
    _openid: openid,
    beginAttemptId,
    status: 'awaiting_upload',
    version: 1,
    originalFilename: input.originalFilename,
    format,
    declaredSizeBytes,
    cloudPath: `track-submissions/${submissionId}/upload.${format}`,
    creatorFileId: null,
    uploadExpiresAt: addMinutes(createdAt, UPLOAD_MINUTES),
    reviewCloudPath: `track-reviews/${submissionId}/review.${format}`,
    reviewFileId: null,
    actualSizeBytes: null,
    reviewSnapshotAt: null,
    rawExpiresAt: null,
    recordExpiresAt: addDays(createdAt, RAW_DAYS),
    input: {
      title: input.title,
      region: input.region,
      note: input.note,
      provenancePlatform: input.provenancePlatform,
      provenancePageUrl: input.provenancePageUrl,
    },
    rights: {
      basis: rights.basis,
      declarationVersion: rights.declarationVersion,
      licenseName: rights.licenseName,
      licenseUrl: rights.licenseUrl,
      acceptedAt: createdAt,
    },
    revisesSubmissionId,
    replacementSubmissionId: null,
    summary: null,
    processing: { leaseId: null, startedAt: null },
    rawFileState: { upload: 'reserved', review: 'absent' },
    review: { attemptId: null, decision: null, note: null, reviewerOpenid: null, reviewedAt: null, resultVersion: null },
    evidenceExpiresAt: null,
    createdAt,
    updatedAt: createdAt,
  }
}

function reservationDeadline(record) {
  return record && record.uploadExpiresAt instanceof Date
    ? record.uploadExpiresAt
    : new Date(record.uploadExpiresAt)
}

function isUploadExpired(record, now) {
  return reservationDeadline(record).getTime() <= now.getTime()
}

function isRecordExpired(record, now) {
  return new Date(record.recordExpiresAt).getTime() <= now.getTime()
}

function isRawExpired(record, now) {
  if (!record || !record.rawExpiresAt) return false
  return new Date(record.rawExpiresAt).getTime() <= now.getTime()
}

function isEvidenceExpired(record, now) {
  if (!record || !record.evidenceExpiresAt) return false
  return new Date(record.evidenceExpiresAt).getTime() <= now.getTime()
}

function isDue(value, now) {
  if (!value) return false
  const dueAt = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(dueAt) && dueAt <= now.getTime()
}

function isLeaseStale(record, now) {
  const started = record && record.processing && new Date(record.processing.startedAt).getTime()
  return !Number.isFinite(started) || now.getTime() - started >= PROCESSING_MINUTES * 60 * 1000
}

function parserErrorCode(error) {
  const code = error && error.code
  if (code === 'unsafe_xml') return 'xml_unsafe'
  if (code === 'malformed_xml' || code === 'invalid_encoding') return 'xml_invalid'
  if (code === 'track_structure_unsupported') return 'track_structure_unsupported'
  if (code === 'track_size_exceeded' || code === 'track_points_exceeded' || code === 'track_segments_exceeded' || code === 'xml_depth_exceeded' || code === 'track_scalar_exceeded') return 'track_limits_exceeded'
  if (code === 'invalid_coordinate' || code === 'invalid_elevation') return 'coordinate_invalid'
  if (code === 'unsupported_format') return 'unsupported_format'
  if (code === 'processing_failed') return 'processing_failed'
  return 'xml_invalid'
}

function terminalStatus(status) {
  return ['approved_evidence', 'rejected', 'cancelled', 'invalid'].includes(status)
}

function clearableParentStatus(status) {
  return ['cancelled', 'invalid', 'rejected'].includes(status)
}

module.exports = {
  MAX_BYTES,
  MAX_ID,
  RAW_DAYS,
  EVIDENCE_DAYS,
  UPLOAD_MINUTES,
  PROCESSING_MINUTES,
  PROCESSING_LEASE_SECONDS,
  REVIEW_PATH_FUNCTION_TIMEOUT_SECONDS,
  RETENTION_BATCH_SIZE,
  fixedReviewPathTimeoutIsSafe,
  addMinutes,
  addDays,
  validOpaqueId,
  codePointLength,
  normalizeString,
  createRecord,
  isUploadExpired,
  isRecordExpired,
  isRawExpired,
  isEvidenceExpired,
  isDue,
  isLeaseStale,
  parserErrorCode,
  terminalStatus,
  clearableParentStatus,
}
