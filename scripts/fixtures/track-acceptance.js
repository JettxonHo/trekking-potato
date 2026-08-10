/**
 * C06 offline vertical-flow fixture.
 *
 * The fixture supplies only deterministic boundaries: memory persistence,
 * storage, clock and server identity. Production owner/admin/retention
 * services, parser, response projectors and page model/service remain the
 * seams under test in the acceptance contract.
 */
const { parseTrack } = require('../../cloudfunctions/trackSubmission/domain/track-parser')
const { createOwnerService } = require('../../cloudfunctions/trackSubmission/owner-service')
const { createAdminService } = require('../../cloudfunctions/trackSubmission/admin-service')
const { createRetentionService } = require('../../cloudfunctions/trackSubmission/retention')
const { createTrackSubmissionHandler } = require('../../cloudfunctions/trackSubmission/index')
const { createMemoryRepository } = require('../../cloudfunctions/trackSubmission/submission-repository')
const { createMemoryEvidenceRepository } = require('../../cloudfunctions/trackSubmission/reviewed-evidence')
const { createTrackSubmissionService } = require('../../taro-app/src/pages/index/track-submission-service')

const STORAGE_HOST = 'storage.example.test'
const ADMIN_OPENID = 'admin-c06'
const OWNER_A = 'owner-c06-a'
const OWNER_B = 'owner-c06-b'
const GPX_NS = 'http://www.topografix.com/GPX/1/1'
const BASE_NOW = '2026-08-10T00:00:00.000Z'

function gpxBytes() {
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><gpx xmlns="${GPX_NS}"><trk><name>private fixture</name><trkseg><trkpt lat="30" lon="100"><ele>1000</ele><time>2026-08-10T00:00:00Z</time></trkpt><trkpt lat="30.001" lon="100.001"><ele>1001</ele><time>2026-08-10T00:01:00Z</time></trkpt><trkpt lat="30.002" lon="100.002" /></trkseg></trk></gpx>`)
}

function kmlBytes() {
  return Buffer.from('<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><LineString><coordinates>100,30,1000 100.001,30.001,1001</coordinates></LineString></Placemark></Document></kml>')
}

function createAcceptanceHarness({ initialNow = BASE_NOW } = {}) {
  let now = new Date(initialNow)
  let submissionSequence = 0
  let evidenceSequence = 0
  let currentOpenid = OWNER_A
  const repository = createMemoryRepository()
  const evidenceRepository = createMemoryEvidenceRepository()
  const bytesByFormat = { gpx: gpxBytes(), kml: kmlBytes() }
  const state = {
    reads: 0,
    reviewUploads: [],
    deletes: [],
    temporaryUrls: [],
    failDelete: false,
    missingDelete: false,
    uiRequests: [],
    uiPlatformCalls: [],
  }
  const env = {
    TRACK_STORAGE_FILEID_HOST: STORAGE_HOST,
    TRACK_REVIEW_ADMIN_OPENIDS: ` ${ADMIN_OPENID} `,
  }
  const storage = {
    getAllowedHost() { return STORAGE_HOST },
    async readCreator(fileID, cloudPath) {
      state.reads += 1
      state.lastRead = { fileID, cloudPath }
      const format = /\.([a-z]+)$/.exec(cloudPath)?.[1] || 'gpx'
      return Buffer.from(bytesByFormat[format] || bytesByFormat.gpx)
    },
    async uploadReview(cloudPath, value) {
      const bytes = Buffer.from(value)
      state.reviewUploads.push({ cloudPath, bytes })
      return `cloud://${STORAGE_HOST}/${cloudPath}`
    },
    async getTemporaryUrl(fileID, maxAge) {
      state.temporaryUrls.push({ fileID, maxAge })
      return `https://raw.example.test/${encodeURIComponent(fileID)}`
    },
    async deleteObject(fileID) {
      state.deletes.push(fileID)
      if (state.failDelete) throw new Error('storage unavailable')
      if (state.missingDelete) {
        return { fileList: [{ fileID, status: -503003, errMsg: 'storage file not exists' }] }
      }
      return true
    },
  }
  const owner = createOwnerService({
    repository,
    storage,
    clock: () => new Date(now.getTime()),
    idFactory: () => `submission-${++submissionSequence}`,
    parser: (value, options) => parseTrack(value, options),
  })
  const admin = createAdminService({
    repository,
    storage,
    evidenceRepository,
    env,
    clock: () => new Date(now.getTime()),
    idFactory: () => `evidence-${++evidenceSequence}`,
  })
  const retention = createRetentionService({
    repository,
    evidenceRepository,
    storage,
    env,
    clock: () => new Date(now.getTime()),
  })
  const cloudSdk = { getWXContext() { return { OPENID: currentOpenid } } }
  const handler = createTrackSubmissionHandler({
    cloudSdk,
    service: owner,
    adminService: admin,
    retentionService: retention,
    env,
  })

  async function call(event, openid = OWNER_A) {
    currentOpenid = openid
    return handler(event)
  }

  async function begin({ ownerId = OWNER_A, attempt = `attempt-${submissionSequence + 1}`, format = 'gpx', title = '私有轨迹', revisesSubmissionId = null } = {}) {
    return call({
      mode: 'begin',
      beginAttemptId: attempt,
      originalFilename: `fixture.${format}`,
      declaredSizeBytes: bytesByFormat[format].length,
      title,
      region: '江西',
      note: 'C06 offline review fixture',
      provenancePlatform: 'self',
      rightsBasis: 'own_recording',
      rightsAccepted: true,
      rightsDeclarationVersion: 'track-rights-v1',
      revisesSubmissionId,
    }, ownerId)
  }

  async function finalize(reservation, ownerId = OWNER_A, fileID) {
    const record = await repository.get(reservation.submissionId)
    const boundFileID = fileID || `cloud://${STORAGE_HOST}/${record.cloudPath}`
    return call({ mode: 'finalize', submissionId: reservation.submissionId, fileID: boundFileID }, ownerId)
  }

  function setNow(value) { now = new Date(value) }
  function getNow() { return new Date(now.getTime()) }
  function setEnv(key, value) { env[key] = value }
  function setOpenid(value) { currentOpenid = value }

  function createUiService({ identity = ADMIN_OPENID } = {}) {
    return createTrackSubmissionService({
      now: () => now.getTime(),
      random: () => 0.123456,
      chooseFile: async () => ({ tempFiles: [] }),
      callFunction: async ({ name, data }) => {
        state.uiRequests.push({ name, data: JSON.parse(JSON.stringify(data)) })
        return { result: await call(data, identity) }
      },
      uploadFile: async (request) => {
        state.uiPlatformCalls.push({ type: 'upload', request })
        return { fileID: `cloud://${STORAGE_HOST}/${request.cloudPath}` }
      },
    })
  }

  return {
    repository,
    evidenceRepository,
    storage,
    state,
    env,
    owner,
    admin,
    retention,
    handler,
    call,
    begin,
    finalize,
    setNow,
    getNow,
    setEnv,
    setOpenid,
    createUiService,
    fileIDFor(record) { return `cloud://${STORAGE_HOST}/${record.cloudPath}` },
    reviewFileIDFor(record) { return `cloud://${STORAGE_HOST}/${record.reviewCloudPath}` },
  }
}

module.exports = {
  ADMIN_OPENID,
  BASE_NOW,
  OWNER_A,
  OWNER_B,
  STORAGE_HOST,
  createAcceptanceHarness,
  gpxBytes,
  kmlBytes,
}
