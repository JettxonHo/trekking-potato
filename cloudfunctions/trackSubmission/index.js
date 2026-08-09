const cloud = require('wx-server-sdk')
const { createStorageAdapter } = require('./storage-adapter')
const { createCloudBaseRepository } = require('./submission-repository')
const { createOwnerService } = require('./owner-service')

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
} = {}) {
  let ownerService = service
  if (!ownerService) {
    const database = db || (cloudSdk && typeof cloudSdk.database === 'function' ? cloudSdk.database() : null)
    const repo = repository || createCloudBaseRepository({ db: database })
    const adapter = storage || createStorageAdapter({ cloud: cloudSdk, env })
    ownerService = createOwnerService({ repository: repo, storage: adapter, clock, idFactory, parser })
  }
  return async function handler(event = {}, context) {
    let openid = null
    try {
      const wxContext = cloudSdk && typeof cloudSdk.getWXContext === 'function' ? cloudSdk.getWXContext() : null
      openid = wxContext && typeof wxContext.OPENID === 'string' ? wxContext.OPENID : null
    } catch (_error) {
      openid = null
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
