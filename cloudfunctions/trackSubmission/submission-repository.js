const { clone, sortRecords } = require('./response-contract')
const { PROCESSING_LEASE_SECONDS } = require('./submission-lifecycle')

class DuplicateSubmissionError extends Error {
  constructor() {
    super('duplicate submission')
    this.code = 'duplicate'
  }
}

class RepositoryError extends Error {
  constructor(message = 'repository unavailable') {
    super(message)
    this.code = 'store_unavailable'
  }
}

class RepositoryConflictError extends Error {
  constructor(message = 'repository conflict') {
    super(message)
    this.code = 'version_conflict'
  }
}

function matches(record, conditions = {}) {
  return Object.entries(conditions).every(([key, value]) => {
    const current = key.split('.').reduce((target, part) => (target === null || target === undefined ? undefined : target[part]), record)
    if (value && typeof value === 'object' && value.$gt !== undefined) return new Date(current).getTime() > new Date(value.$gt).getTime()
    if (value && typeof value === 'object' && value.$lt !== undefined) return new Date(current).getTime() < new Date(value.$lt).getTime()
    return current === value
  })
}

function validProcessingConditions(conditions = {}) {
  return conditions && typeof conditions._openid === 'string' && conditions._openid.length > 0
    && conditions.status === 'processing'
    && Number.isInteger(conditions.version) && conditions.version >= 1
    && typeof conditions['processing.leaseId'] === 'string' && conditions['processing.leaseId'].length > 0
}

function processingPatchForUpdate(patch, commands) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)
    || !patch.summary || typeof patch.summary !== 'object' || Array.isArray(patch.summary)) return patch
  if (!commands || typeof commands.set !== 'function') throw new RepositoryError('set command unavailable')
  return { ...patch, summary: commands.set(patch.summary) }
}

function applyPatch(record, patch) {
  Object.entries(patch || {}).forEach(([key, value]) => { record[key] = clone(value) })
  return record
}

function cursorMatches(record, cursor) {
  if (!cursor) return true
  const recordTime = new Date(record.updatedAt).getTime()
  const cursorTime = new Date(cursor.updatedAt).getTime()
  return recordTime < cursorTime || (recordTime === cursorTime && String(record._id) < cursor.submissionId)
}

function adminCursorMatches(record, cursor) {
  if (!cursor) return true
  const recordTime = new Date(record.updatedAt).getTime()
  const cursorTime = new Date(cursor.updatedAt).getTime()
  return recordTime < cursorTime || (recordTime === cursorTime && String(record._id) < cursor.submissionId)
}

function retentionCursorMatches(record, cursor) {
  if (!cursor) return true
  const recordTime = new Date(record.recordExpiresAt).getTime()
  const cursorTime = new Date(cursor.recordExpiresAt).getTime()
  return recordTime > cursorTime || (recordTime === cursorTime && String(record._id) > cursor.submissionId)
}

function createMemoryRepository({ records = [] } = {}) {
  const table = new Map()
  records.forEach((record) => table.set(record._id, clone(record)))

  return {
    kind: 'memory',
    async get(id) { return table.has(id) ? clone(table.get(id)) : null },
    async findByAttempt(openid, beginAttemptId) {
      for (const record of table.values()) {
        if (record._openid === openid && record.beginAttemptId === beginAttemptId) return clone(record)
      }
      return null
    },
    async add(record) {
      if (table.has(record._id)) throw new DuplicateSubmissionError()
      for (const existing of table.values()) {
        if (existing._openid === record._openid && existing.beginAttemptId === record.beginAttemptId) throw new DuplicateSubmissionError()
      }
      table.set(record._id, clone(record))
      return { _id: record._id }
    },
    async update(id, conditions, patch) {
      const current = table.get(id)
      if (!current || !matches(current, conditions)) return null
      const updated = applyPatch(clone(current), patch)
      table.set(id, updated)
      return clone(updated)
    },
    async updateProcessing(id, conditions, patch) {
      if (!validProcessingConditions(conditions)) return null
      return this.update(id, conditions, patch)
    },
    async approveReview(id, conditions, patch, evidenceRecord, evidenceRepository) {
      const current = table.get(id)
      if (!current || !matches(current, conditions)) return null
      if (!evidenceRepository || typeof evidenceRepository.add !== 'function' || typeof evidenceRepository.remove !== 'function') {
        throw new RepositoryError('evidence repository unavailable')
      }
      await evidenceRepository.add(evidenceRecord)
      const latest = table.get(id)
      if (!latest || !matches(latest, conditions)) {
        try { await evidenceRepository.remove(evidenceRecord._id) } catch (_error) {}
        return null
      }
      const updated = applyPatch(clone(latest), patch)
      table.set(id, updated)
      return clone(updated)
    },
    async remove(id, conditions = {}) {
      const current = table.get(id)
      if (!current || !matches(current, conditions)) return null
      table.delete(id)
      return clone(current)
    },
    async claimProcessing(id, openid, now, leaseId) {
      const current = table.get(id)
      if (!current || current._openid !== openid) return { kind: 'missing' }
      if (current.status === 'processing') {
        const started = new Date(current.processing && current.processing.startedAt).getTime()
        if (Number.isFinite(started) && now.getTime() - started < PROCESSING_LEASE_SECONDS * 1000) return { kind: 'fresh', record: clone(current) }
      } else if (current.status !== 'awaiting_upload') {
        return { kind: 'terminal', record: clone(current) }
      }
      const next = clone(current)
      next.status = 'processing'
      next.version += 1
      next.processing = { leaseId, startedAt: now.toISOString() }
      next.updatedAt = new Date(now.getTime())
      table.set(id, next)
      return { kind: 'claimed', record: clone(next) }
    },
    async list(openid, now, { cursor = null, limit = 20 } = {}) {
      const records = sortRecords([...table.values()].filter((record) => record._openid === openid
        && new Date(record.recordExpiresAt).getTime() > now.getTime()
        && cursorMatches(record, cursor)).map(clone))
      return records.slice(0, limit + 1)
    },
    async listAdmin(now, { status = null, cursor = null, limit = 20 } = {}) {
      const records = sortRecords([...table.values()].filter((record) =>
        new Date(record.recordExpiresAt).getTime() > now.getTime()
        && (status === null || record.status === status)
        && adminCursorMatches(record, cursor)).map(clone))
      return records.slice(0, limit + 1)
    },
    async listRetentionDue(now, { cursor = null, limit = 20 } = {}) {
      const records = [...table.values()].filter((record) => {
        const rawDue = record.rawExpiresAt && new Date(record.rawExpiresAt).getTime() <= now.getTime()
        const recordDue = record.recordExpiresAt && new Date(record.recordExpiresAt).getTime() <= now.getTime()
        const pending = record.rawFileState
          && (record.rawFileState.upload === 'deletion_pending' || record.rawFileState.review === 'deletion_pending')
        return (rawDue || recordDue || pending) && retentionCursorMatches(record, cursor)
      }).sort((first, second) => {
        const firstTime = new Date(first.recordExpiresAt).getTime()
        const secondTime = new Date(second.recordExpiresAt).getTime()
        if (firstTime !== secondTime) return firstTime - secondTime
        return String(first._id).localeCompare(String(second._id))
      })
      return records.slice(0, limit + 1).map(clone)
    },
    async insertRevision(parentId, openid, child, now = new Date()) {
      const parent = table.get(parentId)
      const expiresAt = new Date(parent && parent.recordExpiresAt).getTime()
      const sampledNow = new Date(now).getTime()
      if (!parent || parent._openid !== openid || parent.status !== 'changes_requested' || parent.replacementSubmissionId
        || !Number.isFinite(expiresAt) || !Number.isFinite(sampledNow) || expiresAt <= sampledNow) return null
      if (table.has(child._id)) throw new DuplicateSubmissionError()
      const nextParent = clone(parent)
      nextParent.replacementSubmissionId = child._id
      nextParent.version += 1
      nextParent.updatedAt = clone(child.createdAt)
      table.set(parentId, nextParent)
      table.set(child._id, clone(child))
      return clone(child)
    },
    async clearReplacement(parentId, childId, openid, now = new Date()) {
      const parent = table.get(parentId)
      if (!parent || parent._openid !== openid || parent.replacementSubmissionId !== childId) return null
      const next = clone(parent)
      next.replacementSubmissionId = null
      next.version += 1
      next.updatedAt = clone(now)
      table.set(parentId, next)
      return clone(next)
    },
    async transitionRevisionTerminal(childId, openid, conditions, patch, now = new Date()) {
      const child = table.get(childId)
      if (!child || !matches(child, conditions)) return null
      const parentId = child.revisesSubmissionId
      if (!parentId) {
        const next = applyPatch(clone(child), patch)
        table.set(childId, next)
        return { child: clone(next), parent: null }
      }
      const parent = table.get(parentId)
      if (!parent || parent._openid !== openid || parent.replacementSubmissionId !== childId) return null
      const nextChild = applyPatch(clone(child), patch)
      const nextParent = clone(parent)
      nextParent.replacementSubmissionId = null
      nextParent.version += 1
      nextParent.updatedAt = clone(now)
      table.set(childId, nextChild)
      table.set(parentId, nextParent)
      return { child: clone(nextChild), parent: clone(nextParent) }
    },
    async repairRevisionPointer(childId, openid, now = new Date()) {
      const child = table.get(childId)
      if (!child || child._openid !== openid || !child.revisesSubmissionId
        || !['cancelled', 'invalid', 'rejected'].includes(child.status)) return null
      const parent = table.get(child.revisesSubmissionId)
      if (!parent || parent._openid !== openid || parent.replacementSubmissionId !== childId) return clone(child)
      const nextParent = clone(parent)
      nextParent.replacementSubmissionId = null
      nextParent.version += 1
      nextParent.updatedAt = clone(now)
      table.set(child.revisesSubmissionId, nextParent)
      return clone(child)
    },
    async snapshot() { return [...table.values()].map(clone) },
  }
}

function createCloudBaseRepository({ db, collectionName = 'track_submissions', command } = {}) {
  if (!db || typeof db.collection !== 'function') throw new TypeError('db collection is required')
  const collection = db.collection(collectionName)
  const commands = command || db.command || {
    gt: (value) => ({ $gt: value }),
    lt: (value) => ({ $lt: value }),
    lte: (value) => ({ $lte: value }),
    or: (...expressions) => ({ $or: expressions }),
    and: (...expressions) => ({ $and: expressions }),
  }
  return {
    kind: 'cloudbase',
    async get(id) {
      try {
        const result = await collection.doc(id).get()
        return result && result.data ? result.data : null
      } catch (error) {
        const message = error && typeof error.message === 'string' ? error.message.toLowerCase() : ''
        if (error && (error.code === 'DOC_NOT_FOUND' || error.code === 'document.not.exists' || message.includes('does not exist'))) return null
        throw new RepositoryError()
      }
    },
    async findByAttempt(openid, beginAttemptId) {
      const result = await collection.where({ _openid: openid, beginAttemptId }).limit(1).get()
      return result && result.data && result.data[0] ? result.data[0] : null
    },
    async add(record) {
      return collection.add({ data: record })
    },
    async update(id, conditions, patch) {
      const result = await collection.where({ _id: id, ...conditions }).update({ data: patch })
      if (!result || !result.stats || result.stats.updated !== 1) return null
      return this.get(id)
    },
    async updateProcessing(id, conditions, patch) {
      if (!validProcessingConditions(conditions)) return null
      if (typeof db.runTransaction !== 'function') throw new RepositoryError('transaction unavailable')
      const expected = Object.freeze({
        _id: id,
        _openid: conditions._openid,
        status: conditions.status,
        version: conditions.version,
        'processing.leaseId': conditions['processing.leaseId'],
      })
      let transactionResult
      transactionResult = await db.runTransaction(async (transaction) => {
        const document = transaction.collection(collectionName).doc(id)
        const currentResult = await document.get()
        const current = currentResult && currentResult.data
        const matched = Boolean(current && matches(current, expected))
        if (!matched) return null
        const updateResult = await document.update({ data: processingPatchForUpdate(patch, commands) })
        if (!updateResult || !updateResult.stats || updateResult.stats.updated !== 1) return null
        return true
      })
      return transactionResult ? this.get(id) : null
    },
    async approveReview(id, conditions, patch, evidenceRecord, _evidenceRepository) {
      if (typeof db.runTransaction !== 'function') throw new RepositoryError('transaction unavailable')
      const transactionResult = await db.runTransaction(async (transaction) => {
        const submission = transaction.collection(collectionName).doc(id)
        const currentResult = await submission.get()
        const current = currentResult && currentResult.data
        if (!current || !matches(current, { _id: id, ...conditions })) return null
        const updateResult = await submission.update({ data: patch })
        if (!updateResult || !updateResult.stats || updateResult.stats.updated !== 1) return null
        await transaction.collection('track_review_evidence').add({ data: evidenceRecord })
        return true
      })
      return transactionResult ? this.get(id) : null
    },
    async remove(id, conditions = {}) {
      const result = await collection.where({ _id: id, ...conditions }).remove()
      if (!result || !result.stats || result.stats.removed !== 1) return null
      return { _id: id }
    },
    async claimProcessing(id, openid, now, leaseId) {
      const current = await this.get(id)
      if (!current || current._openid !== openid) return { kind: 'missing' }
      if (current.status === 'processing') {
        const started = new Date(current.processing && current.processing.startedAt).getTime()
        if (Number.isFinite(started) && now.getTime() - started < PROCESSING_LEASE_SECONDS * 1000) return { kind: 'fresh', record: current }
      } else if (current.status !== 'awaiting_upload') return { kind: 'terminal', record: current }
      const patch = {
        status: 'processing',
        version: current.version + 1,
        processing: { leaseId, startedAt: now.toISOString() },
        updatedAt: now,
      }
      const conditions = { _openid: openid, status: current.status, version: current.version }
      if (current.status === 'processing') conditions['processing.leaseId'] = current.processing && current.processing.leaseId
      const updated = await this.update(id, conditions, patch)
      return updated ? { kind: 'claimed', record: updated } : { kind: 'conflict' }
    },
    async list(openid, now, { cursor = null, limit = 20 } = {}) {
      const base = { _openid: openid, recordExpiresAt: commands.gt(now) }
      let where = base
      if (cursor) {
        if (typeof commands.lt !== 'function' || typeof commands.or !== 'function' || typeof commands.and !== 'function') {
          throw new RepositoryError('cursor query unavailable')
        }
        const seek = commands.or(
          { updatedAt: commands.lt(new Date(cursor.updatedAt)) },
          { updatedAt: new Date(cursor.updatedAt), _id: commands.lt(cursor.submissionId) },
        )
        where = commands.and(base, seek)
      }
      const result = await collection.where(where).orderBy('updatedAt', 'desc').orderBy('_id', 'desc').limit(limit + 1).get()
      return (result && result.data) || []
    },
    async listAdmin(now, { status = null, cursor = null, limit = 20 } = {}) {
      const base = { recordExpiresAt: commands.gt(now) }
      if (status !== null) base.status = status
      let where = base
      if (cursor) {
        if (typeof commands.lt !== 'function' || typeof commands.or !== 'function' || typeof commands.and !== 'function') {
          throw new RepositoryError('cursor query unavailable')
        }
        where = commands.and(base, commands.or(
          { updatedAt: commands.lt(new Date(cursor.updatedAt)) },
          { updatedAt: new Date(cursor.updatedAt), _id: commands.lt(cursor.submissionId) },
        ))
      }
      const result = await collection.where(where).orderBy('updatedAt', 'desc').orderBy('_id', 'desc').limit(limit + 1).get()
      return (result && result.data) || []
    },
    async listRetentionDue(now, { cursor = null, limit = 20 } = {}) {
      if (typeof commands.lte !== 'function' || typeof commands.or !== 'function' || typeof commands.and !== 'function') {
        throw new RepositoryError('retention query unavailable')
      }
      const due = commands.or(
        { recordExpiresAt: commands.lte(now) },
        { rawExpiresAt: commands.lte(now) },
        { 'rawFileState.upload': 'deletion_pending' },
        { 'rawFileState.review': 'deletion_pending' },
      )
      let where = due
      if (cursor) {
        where = commands.and(due, commands.or(
          { recordExpiresAt: commands.gt(new Date(cursor.recordExpiresAt)) },
          { recordExpiresAt: new Date(cursor.recordExpiresAt), _id: commands.gt(cursor.submissionId) },
        ))
      }
      const result = await collection.where(where).orderBy('recordExpiresAt', 'asc').orderBy('_id', 'asc').limit(limit + 1).get()
      return (result && result.data) || []
    },
    async insertRevision(parentId, openid, child, now = new Date()) {
      if (typeof db.runTransaction !== 'function') throw new RepositoryError('transaction unavailable')
      const transactionResult = await db.runTransaction(async (transaction) => {
        const submissions = transaction.collection(collectionName)
        const parentDocument = submissions.doc(parentId)
        const parentResult = await parentDocument.get()
        const parent = parentResult && parentResult.data
        const expiresAt = new Date(parent && parent.recordExpiresAt).getTime()
        const sampledNow = new Date(now).getTime()
        if (!parent || parent._openid !== openid || parent.status !== 'changes_requested' || parent.replacementSubmissionId
          || !Number.isFinite(expiresAt) || !Number.isFinite(sampledNow) || expiresAt <= sampledNow) return null
        const parentConditions = {
          _id: parentId, _openid: openid, status: 'changes_requested', version: parent.version,
          replacementSubmissionId: null,
        }
        // `commands.gt()` produces an SDK query object, not a local predicate. Expiry was
        // validated above against this sampled clock value; keep the frozen CAS fields local.
        if (!matches(parent, parentConditions)) return null
        const parentUpdate = await parentDocument.update({ data: { replacementSubmissionId: child._id, version: parent.version + 1, updatedAt: child.createdAt } })
        if (!parentUpdate || !parentUpdate.stats || parentUpdate.stats.updated !== 1) return null
        await submissions.add({ data: child })
        return child
      })
      return transactionResult ? clone(child) : null
    },
    async clearReplacement(parentId, childId, openid, now = new Date()) {
      if (typeof db.runTransaction !== 'function') throw new RepositoryError('transaction unavailable')
      const transactionResult = await db.runTransaction(async (transaction) => {
        const parentDocument = transaction.collection(collectionName).doc(parentId)
        const parentResult = await parentDocument.get()
        const parent = parentResult && parentResult.data
        if (!parent || parent._openid !== openid || parent.replacementSubmissionId !== childId) return null
        const parentConditions = {
          _id: parentId,
          _openid: openid,
          replacementSubmissionId: childId,
          version: parent.version,
        }
        if (!matches(parent, parentConditions)) return null
        const updateResult = await parentDocument.update({ data: {
          replacementSubmissionId: null,
          version: parent.version + 1,
          updatedAt: now,
        } })
        if (!updateResult || !updateResult.stats || updateResult.stats.updated !== 1) return null
        return true
      })
      return transactionResult ? this.get(parentId) : null
    },
    async transitionRevisionTerminal(childId, openid, conditions, patch, now = new Date()) {
      if (typeof db.runTransaction !== 'function') throw new RepositoryError('transaction unavailable')
      const transactionResult = await db.runTransaction(async (transaction) => {
        const submissions = transaction.collection(collectionName)
        const childDocument = submissions.doc(childId)
        const childResult = await childDocument.get()
        const child = childResult && childResult.data
        if (!child || child._openid !== openid || !matches(child, conditions)) return null
        const parentId = child.revisesSubmissionId
        if (parentId) {
          const parentDocument = submissions.doc(parentId)
          const parentResult = await parentDocument.get()
          const parent = parentResult && parentResult.data
          if (!parent || parent._openid !== openid || parent.replacementSubmissionId !== childId) return null
          if (!matches(parent, { _id: parentId, _openid: openid, replacementSubmissionId: childId, version: parent.version })) return null
          const childUpdate = await childDocument.update({ data: patch })
          if (!childUpdate || !childUpdate.stats || childUpdate.stats.updated !== 1) throw new RepositoryConflictError()
          const parentUpdate = await parentDocument.update({ data: { replacementSubmissionId: null, version: parent.version + 1, updatedAt: now } })
          if (!parentUpdate || !parentUpdate.stats || parentUpdate.stats.updated !== 1) throw new RepositoryConflictError()
          return true
        }
        const childUpdate = await childDocument.update({ data: patch })
        if (!childUpdate || !childUpdate.stats || childUpdate.stats.updated !== 1) throw new RepositoryConflictError()
        return true
      })
      return transactionResult ? { child: await this.get(childId), parent: null } : null
    },
    async repairRevisionPointer(childId, openid, now = new Date()) {
      if (typeof db.runTransaction !== 'function') throw new RepositoryError('transaction unavailable')
      const transactionResult = await db.runTransaction(async (transaction) => {
        const submissions = transaction.collection(collectionName)
        const childResult = await submissions.doc(childId).get()
        const child = childResult && childResult.data
        if (!child || child._openid !== openid || !child.revisesSubmissionId
          || !['cancelled', 'invalid', 'rejected'].includes(child.status)) return null
        const parentDocument = submissions.doc(child.revisesSubmissionId)
        const parentResult = await parentDocument.get()
        const parent = parentResult && parentResult.data
        if (!parent || parent._openid !== openid || parent.replacementSubmissionId !== childId) return true
        const parentConditions = {
          _id: child.revisesSubmissionId,
          _openid: openid,
          replacementSubmissionId: childId,
          version: parent.version,
        }
        if (!matches(parent, parentConditions)) return true
        const parentUpdate = await parentDocument.update({ data: { replacementSubmissionId: null, version: parent.version + 1, updatedAt: now } })
        if (!parentUpdate || !parentUpdate.stats || parentUpdate.stats.updated !== 1) throw new RepositoryConflictError()
        return true
      })
      return transactionResult ? this.get(childId) : null
    },
  }
}

module.exports = {
  DuplicateSubmissionError,
  RepositoryError,
  RepositoryConflictError,
  createMemoryRepository,
  createCloudBaseRepository,
}
