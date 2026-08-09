const https = require('https')

const MAX_BYTES = 10 * 1024 * 1024
const MAX_FILE_ID_LENGTH = 1024
const HOST_PATTERN = /^[a-z0-9.-]+$/

class StorageAdapterError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'StorageAdapterError'
    this.code = code
  }
}

function fail(code, message) {
  throw new StorageAdapterError(code, message)
}

function validateHost(host) {
  if (typeof host !== 'string') return false
  const value = host.trim()
  if (value.length < 1 || value.length > 253 || !HOST_PATTERN.test(value)) return false
  if (value.startsWith('.') || value.endsWith('.') || value.includes('..')) return false
  const labels = value.split('.')
  return labels.every((label) => label.length >= 1 && label.length <= 63
    && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))
}

function normalizeAllowedHost(value) {
  const host = typeof value === 'string' ? value.trim() : ''
  if (!validateHost(host)) fail('storage_not_configured', 'storage host is not configured')
  return host
}

function validateCloudPath(cloudPath) {
  if (typeof cloudPath !== 'string' || cloudPath.length < 1 || cloudPath.length > 1024) return false
  if (!cloudPath.startsWith('track-submissions/') || cloudPath.includes('\\') || cloudPath.includes('%')) return false
  const pieces = cloudPath.split('/')
  if (pieces.some((piece) => !piece || piece === '.' || piece === '..')) return false
  return /^track-submissions\/[A-Za-z0-9_-]{1,80}\/upload\.(?:gpx|kml)$/.test(cloudPath)
}

function validateCreatorFileId({ fileID, allowedFileHost, cloudPath }) {
  const host = normalizeAllowedHost(allowedFileHost)
  if (typeof fileID !== 'string') fail('upload_binding_invalid', 'fileID is invalid')
  const value = fileID.trim()
  if (value.length < 1 || value.length > MAX_FILE_ID_LENGTH || !value.startsWith('cloud://')) {
    fail('upload_binding_invalid', 'fileID is invalid')
  }
  if (!validateCloudPath(cloudPath)) fail('upload_binding_invalid', 'reserved cloud path is invalid')
  if (/[?#%\\]/.test(value) || /[\s]/.test(value)) fail('upload_binding_invalid', 'fileID is invalid')

  let parsed
  try {
    parsed = new URL(value)
  } catch (_error) {
    fail('upload_binding_invalid', 'fileID is invalid')
  }
  if (parsed.protocol !== 'cloud:' || parsed.hostname !== host || parsed.username || parsed.password || parsed.port) {
    fail('upload_binding_invalid', 'fileID is invalid')
  }
  const authority = value.slice('cloud://'.length).split('/')[0]
  if (authority !== host) fail('upload_binding_invalid', 'fileID host is invalid')
  const rawPath = value.slice('cloud://'.length + authority.length)
  const rawPathParts = rawPath.split('/')
  if (rawPathParts.some((part, index) => index > 0 && (!part || part === '.' || part === '..'))) {
    fail('upload_binding_invalid', 'fileID path is invalid')
  }
  if (parsed.pathname !== `/${cloudPath}`) fail('upload_binding_invalid', 'fileID path is invalid')
  const pathParts = parsed.pathname.split('/')
  if (pathParts.some((part, index) => index > 0 && (!part || part === '.' || part === '..'))) {
    fail('upload_binding_invalid', 'fileID path is invalid')
  }
  return { fileID: value, allowedFileHost: host, cloudPath }
}

function contentLength(headers) {
  if (!headers) return null
  const raw = typeof headers.get === 'function' ? headers.get('content-length') : headers['content-length'] || headers['Content-Length']
  if (raw === undefined || raw === null || raw === '') return null
  if (typeof raw !== 'string' && typeof raw !== 'number') return NaN
  const value = Number(raw)
  return Number.isInteger(value) && value >= 0 ? value : NaN
}

function assertDeleteResult(result, expectedFileID) {
  if (typeof expectedFileID !== 'string' || expectedFileID.length < 1) {
    fail('storage_unavailable', 'delete request is invalid')
  }
  const items = result && Array.isArray(result.fileList) ? result.fileList : null
  if (!items || items.length !== 1) fail('storage_unavailable', 'delete result is unavailable')
  const item = items[0]
  if (!item || typeof item !== 'object' || item.fileID !== expectedFileID
    || typeof item.status !== 'number' || !Number.isInteger(item.status)
    || typeof item.errMsg !== 'string' || item.errMsg.trim().length < 1) {
    fail('storage_unavailable', 'delete result is invalid')
  }
  if (item.status === 0) return true
  if (item.status === -503003 && item.errMsg.toLowerCase().includes('storage file not exists')) return true
  fail('storage_unavailable', 'delete item failed')
}

async function collectBounded(response, maxBytes = MAX_BYTES) {
  if (response && !Buffer.isBuffer(response) && !(response instanceof Uint8Array)
    && (Buffer.isBuffer(response.body) || Buffer.isBuffer(response.data) || typeof response.body === 'string' || typeof response.data === 'string')) {
    const declared = contentLength(response.headers)
    if (Number.isNaN(declared) || (declared !== null && (declared < 1 || declared > maxBytes))) fail('file_size_invalid', 'content length is invalid')
    const bytes = Buffer.from(response.body === undefined ? response.data : response.body)
    if (bytes.length < 1 || bytes.length > maxBytes || (declared !== null && declared !== bytes.length)) fail('file_size_invalid', 'actual object size is invalid')
    return bytes
  }
  if (Buffer.isBuffer(response) || response instanceof Uint8Array || typeof response === 'string') {
    const bytes = Buffer.isBuffer(response) ? Buffer.from(response) : Buffer.from(response)
    if (bytes.length < 1 || bytes.length > maxBytes) fail('file_size_invalid', 'actual object size is invalid')
    return bytes
  }
  const headers = response && response.headers
  const declared = contentLength(headers)
  if (Number.isNaN(declared) || (declared !== null && (declared < 1 || declared > maxBytes))) {
    fail('file_size_invalid', 'content length is invalid')
  }
  const chunks = []
  let total = 0
  const iterator = response && typeof response[Symbol.asyncIterator] === 'function'
    ? response
    : response && typeof response.on === 'function'
      ? streamIterator(response)
      : null
  if (!iterator) fail('storage_unavailable', 'download stream is unavailable')
  for await (const chunk of iterator) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += bytes.length
    if (total > maxBytes) fail('file_size_invalid', 'actual object size exceeds 10 MiB')
    chunks.push(bytes)
  }
  if (total < 1 || (declared !== null && total !== declared)) fail('file_size_invalid', 'actual object size is invalid')
  return Buffer.concat(chunks, total)
}

async function* streamIterator(stream) {
  const chunks = []
  let ended = false
  let failure
  stream.on('data', (chunk) => chunks.push(chunk))
  stream.on('error', (error) => { failure = error })
  stream.on('end', () => { ended = true })
  while (!ended) {
    if (failure) throw failure
    if (chunks.length) yield chunks.shift()
    else await new Promise((resolve) => setTimeout(resolve, 0))
  }
  if (failure) throw failure
  while (chunks.length) yield chunks.shift()
}

function requestGet(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const request = https.request({ method, hostname: parsed.hostname, path: `${parsed.pathname}${parsed.search}`, headers: { Accept: 'application/octet-stream' } }, (response) => {
      if (method === 'HEAD') {
        response.resume()
        response.on('end', () => resolve({ headers: response.headers, statusCode: response.statusCode }))
        return
      }
      resolve(response)
    })
    request.on('error', reject)
    request.end()
  })
}

function createStorageAdapter({ cloud, env = process.env, request = requestGet } = {}) {
  const sdk = cloud || null
  function allowedHost() {
    return normalizeAllowedHost(env && env.TRACK_STORAGE_FILEID_HOST)
  }
  async function temporaryUrl(fileID) {
    if (!sdk || typeof sdk.getTempFileURL !== 'function') fail('storage_unavailable', 'temporary URL is unavailable')
    const result = await sdk.getTempFileURL({ fileList: [{ fileID, maxAge: 300 }] })
    const item = result && result.fileList && result.fileList[0]
    if (!item || typeof item.tempFileURL !== 'string' || !item.tempFileURL) fail('file_missing', 'file is missing')
    return item.tempFileURL
  }
  const adapter = {
    getAllowedHost: allowedHost,
    validateCreatorFileId,
    async getTemporaryUrl(fileID) { return temporaryUrl(fileID) },
    async head(url) { return request(url, 'HEAD') },
    async get(url) { return request(url, 'GET') },
    async readCreator(fileID, cloudPath) {
      const url = await temporaryUrl(fileID)
      // HEAD is intentionally advisory; only explicit invalid/oversized length rejects.
      if (typeof adapter.head === 'function') {
        try {
          const head = await adapter.head(url)
          const length = contentLength(head && head.headers ? head.headers : head)
          if (Number.isNaN(length) || (length !== null && (length < 1 || length > MAX_BYTES))) {
            fail('file_size_invalid', 'HEAD content length is invalid')
          }
        } catch (error) {
          if (error instanceof StorageAdapterError && error.code === 'file_size_invalid') throw error
          // A missing/unsupported HEAD does not establish size authority.
        }
      }
      const response = await adapter.get(url)
      if (response && Number.isInteger(response.statusCode) && (response.statusCode < 200 || response.statusCode >= 300)) {
        fail('file_missing', 'download response is unavailable')
      }
      return collectBounded(response)
    },
    async uploadReview(cloudPath, bytes) {
      if (!sdk || typeof sdk.uploadFile !== 'function') fail('storage_unavailable', 'review upload is unavailable')
      const result = await sdk.uploadFile({ cloudPath, fileContent: Buffer.from(bytes) })
      if (!result || typeof result.fileID !== 'string' || !result.fileID) fail('storage_unavailable', 'review upload failed')
      return result.fileID
    },
    async deleteObject(fileID) {
      if (!fileID) return true
      if (!sdk || typeof sdk.deleteFile !== 'function') fail('storage_unavailable', 'delete is unavailable')
      const result = await sdk.deleteFile({ fileList: [fileID] })
      return assertDeleteResult(result, fileID)
    },
  }
  return adapter
}

module.exports = {
  MAX_BYTES,
  StorageAdapterError,
  validateHost,
  normalizeAllowedHost,
  validateCreatorFileId,
  contentLength,
  assertDeleteResult,
  collectBounded,
  createStorageAdapter,
}
