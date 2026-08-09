const cloud = require('wx-server-sdk')
const { createStorageAdapter } = require('./storage-adapter')
const { createCloudBaseRepository } = require('./submission-repository')
const { createOwnerService } = require('./owner-service')
const { createAdminService } = require('./admin-service')
const { createRetentionService } = require('./retention')
const {
  createMemoryEvidenceRepository,
  createCloudBaseEvidenceRepository,
} = require('./reviewed-evidence')

function createTrackSubmissionHandler({
  cloudSdk = cloud,
  repository,
  storage,
  service,
  db,
  clock,
  idFactory,
  parser,
  env = process.env,
  evidenceRepository,
  adminService,
  retentionService,
} = {}) {
  let ownerService = service
  let reviewService = adminService
  let cleanupService = retentionService
  if (!ownerService) {
    const database = db || (cloudSdk && typeof cloudSdk.database === 'function' ? cloudSdk.database() : null)
    const repo = repository || createCloudBaseRepository({ db: database })
    const adapter = storage || createStorageAdapter({ cloud: cloudSdk, env })
    ownerService = createOwnerService({ repository: repo, storage: adapter, clock, idFactory, parser })
    const evidence = evidenceRepository || (database
      ? createCloudBaseEvidenceRepository({ db: database })
      : createMemoryEvidenceRepository())
    reviewService = reviewService || createAdminService({
      repository: repo,
      storage: adapter,
      evidenceRepository: evidence,
      env,
      clock,
      idFactory,
    })
    cleanupService = cleanupService || createRetentionService({
      repository: repo,
      evidenceRepository: evidence,
      storage: adapter,
      env,
      clock,
    })
  }
  return async function handler(event = {}, context) {
    let openid = null
    try {
      const wxContext = cloudSdk && typeof cloudSdk.getWXContext === 'function' ? cloudSdk.getWXContext() : null
      openid = wxContext && typeof wxContext.OPENID === 'string' ? wxContext.OPENID : null
    } catch (_error) {
      openid = null
    }
    if (cleanupService && env && env.TRIGGER_SRC === 'timer' && (openid === null || openid === '')) {
      return cleanupService.handle(event, openid, context)
    }
    if (reviewService && event && typeof event === 'object'
      && ['admin_list', 'admin_get', 'admin_review'].includes(event.mode)) {
      return reviewService.handle(event, openid, context)
    }
    return ownerService.handle(event, openid, context)
  }
}

let defaultHandler
function getDefaultHandler() {
  if (!defaultHandler) {
    cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
    defaultHandler = createTrackSubmissionHandler({ cloudSdk: cloud })
  }
  return defaultHandler
}

exports.main = async (event, context) => getDefaultHandler()(event, context)
exports.createTrackSubmissionHandler = createTrackSubmissionHandler
