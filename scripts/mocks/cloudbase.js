const calls = {
  collection: 0,
  init: 0,
}

function reset() {
  calls.collection = 0
  calls.init = 0
}

function createCollection() {
  return {
    limit() { return this },
    async get() { return { data: [] } },
  }
}

module.exports = {
  DYNAMIC_CURRENT_ENV: Symbol('DYNAMIC_CURRENT_ENV'),
  calls,
  database() {
    return {
      collection() {
        calls.collection++
        return createCollection()
      },
    }
  },
  getWXContext() {
    return { OPENID: 'offline-e2e-user' }
  },
  init() {
    calls.init++
  },
  reset,
}
