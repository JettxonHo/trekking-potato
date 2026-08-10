import { Component } from 'react'
import { View, Text, Input, Picker, Checkbox, CheckboxGroup } from '@tarojs/components'
import { Button, Radio, RadioGroup } from '@nutui/nutui-react-taro'
import Taro from '@tarojs/taro'
import './index.css'
import '../../styles/nutui-override.css'

const {
  ACTION_LABELS: TRACK_ACTION_LABELS,
  ADMIN_ACTION_LABELS: TRACK_ADMIN_ACTION_LABELS,
  RIGHTS_BASES,
  RIGHTS_BASIS_COPY,
  RIGHTS_COPY,
  RIGHTS_PLATFORM_COPY,
  createInitialTrackUiState,
  isAdminReviewExpired,
  isExpired: isTrackExpired,
  reduceTrackUi,
  selectTrackUiView,
  STATUS_LABELS: TRACK_STATUS_LABELS,
} = require('../index/track-submission-model')

const { createTrackSubmissionService } = require('../index/track-submission-service')
function trackErrorRetryLabel(error = {}) {
  if (error.code === 'version_conflict' && error.nextAction === 'refresh') return '刷新审核详情'
  if (error.nextAction === 'restart_upload') return '重新选择文件'
  if (error.nextAction === 'refresh') {
    if (error.operation === 'list') return '刷新提交列表'
    if (error.operation === 'detail') return '刷新提交详情'
    if (error.operation === 'cancel' || error.operation === 'cleanup') return '刷新提交状态'
    return '刷新状态'
  }
  if (error.operation === 'upload') return '重试上传'
  if (error.operation === 'begin') return '重试提交'
  if (error.operation === 'list') return '重试列表'
  if (error.operation === 'detail') return '重试详情'
  if (error.operation === 'cleanup') return '重试清理'
  if (error.operation === 'cancel') return '重试取消'
  if (error.operation === 'admin_list') return '刷新审核列表'
  if (error.operation === 'admin_detail') return '刷新审核详情'
  if (error.operation === 'admin_review') return '重试审核'
  return '重试操作'
}

const TRACK_ADMIN_FILTER_OPTIONS = Object.freeze([
  { value: null, label: '全部状态' },
  ...Object.keys(TRACK_STATUS_LABELS).map((status) => ({ value: status, label: TRACK_STATUS_LABELS[status] })),
])

const TRACK_ADMIN_REVIEW_DECISIONS = Object.freeze({
  request_changes: 'changes_requested',
  reject: 'rejected',
  approve_evidence: 'approved_evidence',
})


export default class CommunityTrack extends Component {
  state = {
    trackUi: selectTrackUiView(createInitialTrackUiState()),
  }

  _trackUiState = createInitialTrackUiState()
  _trackService = null
  _unmounted = false

  componentDidMount() {
    this._unmounted = false
    this.onTrackRefresh(false)
  }

  componentWillUnmount() {
    this._unmounted = true
    if (this._trackService) this._trackService.clearSession()
    this._trackUiState = reduceTrackUi(this._trackUiState, { type: 'RESET' })
  }

  onCommunityTrackBack = () => Taro.navigateBack({ delta: 1 })

  _getTrackService() {
    if (!this._trackService) {
      this._trackService = createTrackSubmissionService({
        callFunction: (request) => Taro.cloud.callFunction(request),
        uploadFile: (request) => Taro.cloud.uploadFile(request),
        chooseFile: (request) => Taro.chooseMessageFile(request),
      })
    }
    return this._trackService
  }

  _updateTrackUi(event, callback) {
    this._trackUiState = reduceTrackUi(this._trackUiState, event)
    if (this._unmounted) return
    this.setState({ trackUi: selectTrackUiView(this._trackUiState) }, callback)
  }

  _trackResponse(eventType, token, response, extra = {}) {
    if (response && response.stale) return
    this._updateTrackUi({ type: eventType, token, response, ...extra })
  }

  onTrackFieldInput = (field, event) => {
    if (this._trackUiState.uploadBusy || this._trackUiState.mutation.loading) return
    this._updateTrackUi({ type: 'FORM_PATCH', patch: { [field]: event && event.detail ? event.detail.value : event } })
  }

  onTrackRightsBasis = (rightsBasis) => {
    if (this._trackUiState.uploadBusy || this._trackUiState.mutation.loading) return
    if (!RIGHTS_BASES.includes(rightsBasis)) return
    this._updateTrackUi({ type: 'FORM_PATCH', patch: { rightsBasis } })
  }

  onTrackConsentChange = (event) => {
    if (this._trackUiState.uploadBusy || this._trackUiState.mutation.loading) return
    const detail = event && event.detail ? event.detail : {}
    const selected = detail.value
    const checked = Array.isArray(selected) && selected.indexOf('track-rights-v1') >= 0
    this._updateTrackUi({ type: 'FORM_PATCH', patch: { rightsAccepted: checked } })
  }

  onTrackChooseFile = async () => {
    if (this._trackUiState.uploadBusy || this._trackUiState.mutation.loading) return
    const selected = await this._getTrackService().chooseLocalFile()
    if (selected && selected.stale) return
    if (selected && selected.ok) this._updateTrackUi({ type: 'FILE_SELECTED', file: selected.value })
    else if (selected && selected.cancelled) {
      this._getTrackService().clearSession()
      this._updateTrackUi({ type: 'FILE_SELECTION_CANCELLED' })
    } else if (selected && selected.error) {
      this._getTrackService().clearSession()
      this._updateTrackUi({ type: 'FILE_SELECTION_FAILED', error: selected.error })
    }
  }

  _trackBegin = async (retry = false) => {
    if (this._trackUiState.uploadBusy) return
    const form = this._trackUiState.form
    if (!retry && !this._trackUiState.file) {
      this._updateTrackUi({ type: 'ERROR', error: { code: 'file_missing' } })
      return
    }
    this._updateTrackUi({ type: 'BEGIN_REQUEST' })
    const requestToken = this._trackUiState.sessionToken
    const reservation = await this._getTrackService().begin(form, { retry })
    if (this._unmounted || this._trackUiState.sessionToken !== requestToken) return
    if (!reservation || reservation.phase !== 'upload_reservation') {
      this._updateTrackUi({ type: 'SUBMISSION_RESPONSE', operation: 'begin', response: reservation })
      return
    }
    this._updateTrackUi({ type: 'RESERVATION_RECEIVED', reservation })
    await this._trackUploadFinalize(requestToken, 'upload', reservation.submissionId, true)
  }

  _trackUploadFinalize = async (requestToken, operation = 'upload', submissionId, allowExisting = false) => {
    const exactSubmissionId = submissionId || (this._trackUiState.reservation && this._trackUiState.reservation.submissionId)
    if (!exactSubmissionId || (!allowExisting && this._trackUiState.uploadBusy)) return
    if (!this._trackUiState.uploadBusy) this._updateTrackUi({ type: 'UPLOAD_REQUEST' })
    const activeToken = requestToken === undefined ? this._trackUiState.sessionToken : requestToken
    const response = await this._getTrackService().resumeUploadFinalize(exactSubmissionId)
    if (this._unmounted || this._trackUiState.sessionToken !== activeToken) return
    if (response && response.stale) return
    this._updateTrackUi({ type: 'SUBMISSION_RESPONSE', operation, response })
  }

  onTrackSubmit = () => {
    if (this._trackUiState.uploadBusy) return
    if (this._trackUiState.error && (this._trackUiState.error.operation === 'begin' || this._trackUiState.error.operation === 'upload')) {
      return this.onTrackErrorAction()
    }
    if (this._trackUiState.reservation) {
      const submissionId = this._trackUiState.reservation.submissionId
      if (!submissionId || !this._getTrackService().hasUploadSession(submissionId)) {
        this._updateTrackUi({ type: 'ERROR', operation: 'upload', error: { code: 'file_missing' } })
        return
      }
      this._trackUploadFinalize(this._trackUiState.sessionToken, 'upload', submissionId)
      return
    }
    this._trackBegin(false)
  }

  _trackFindSubmission(submissionId) {
    if (this._trackUiState.detail.submission && this._trackUiState.detail.submission.submissionId === submissionId) {
      return this._trackUiState.detail.submission
    }
    return this._trackUiState.list.items.find((item) => item.submissionId === submissionId) || null
  }

  onTrackErrorAction = () => {
    const error = this._trackUiState.error
    if (!error) return
    if (error.nextAction === 'restart_upload') {
      if (error.operation === 'begin' || error.operation === 'upload' || !error.operation) {
        this._getTrackService().clearSession()
        this._updateTrackUi({ type: 'CLEAR_FILE' })
      }
      return
    }
    if (error.nextAction === 'retry') {
      if (error.operation === 'upload') {
        const submissionId = this._trackUiState.reservation && this._trackUiState.reservation.submissionId
        if (submissionId) this._trackUploadFinalize(this._trackUiState.sessionToken, 'upload', submissionId)
      } else if (error.operation === 'begin') this._trackBegin(true)
      else if (error.operation === 'list') {
        const intent = error.intent || { append: false, cursor: null }
        this.onTrackRefresh(intent.append, intent.cursor)
      } else if (error.operation === 'detail') {
        const intent = error.intent || { submissionId: this._trackUiState.selectedSubmissionId }
        this.onTrackOpenDetail(intent.submissionId)
      }
      else if (error.operation === 'cancel' || error.operation === 'cleanup') {
        const intent = error.intent
        if (intent) this._trackCancel({ submissionId: intent.submissionId, version: intent.expectedVersion }, intent.action, intent)
      }
      return
    }
    if (error.nextAction === 'refresh') {
      if (error.operation === 'detail') this.onTrackOpenDetail(error.intent && error.intent.submissionId)
      else if (error.operation === 'list') {
        const intent = error.intent || { append: false, cursor: null }
        if (error.code === 'invalid_cursor' && error.nextAction === 'refresh') this.onTrackRefresh(false, null)
        else this.onTrackRefresh(intent.append, intent.cursor)
      } else if (error.operation === 'cancel' || error.operation === 'cleanup') {
        this.onTrackOpenDetail(error.intent && error.intent.submissionId)
      } else this.onTrackRefresh(false, null)
    }
  }

  onTrackRefresh = (append = false, cursorOverride) => {
    if (this._trackUiState.uploadBusy) return
    const appendPage = append === true
    const cursor = appendPage
      ? (cursorOverride !== undefined ? cursorOverride : this._trackUiState.list.nextCursor)
      : undefined
    this._updateTrackUi({ type: 'LIST_REQUEST', append: appendPage, cursor })
    const token = this._trackUiState.list.token
    this._getTrackService().listMine({ cursor, limit: 10 }).then((response) => {
      if (this._unmounted) return
      this._trackResponse('LIST_RESPONSE', token, response, { append: appendPage, operation: 'list', intent: { append: appendPage, cursor: cursor || null } })
    })
  }

  onTrackOpenDetail = (submissionId) => {
    if (this._trackUiState.uploadBusy) return
    if (typeof submissionId !== 'string' || !submissionId) return
    const cached = this._trackUiState.list.items.find((item) => item.submissionId === submissionId)
    if (cached && isTrackExpired(cached)) {
      this._updateTrackUi({ type: 'ERROR', error: { code: 'submission_not_found' } })
      return
    }
    this._updateTrackUi({ type: 'DETAIL_REQUEST', submissionId })
    const token = this._trackUiState.detail.token
    this._getTrackService().getMine(submissionId).then((response) => {
      if (this._unmounted) return
      this._trackResponse('DETAIL_RESPONSE', token, response, { operation: 'detail', intent: { submissionId } })
    })
  }

  onTrackCloseDetail = () => this._updateTrackUi({ type: 'CLOSE_DETAIL' })

  _trackCancel = (item, action = 'cancel', frozenIntent) => {
    const intent = frozenIntent || {
      operation: action === 'retry_cleanup' ? 'cleanup' : 'cancel',
      submissionId: item && item.submissionId,
      expectedVersion: item && item.version,
      action,
    }
    if (!intent || typeof intent.submissionId !== 'string' || !Number.isInteger(intent.expectedVersion)) return
    this._updateTrackUi({ type: 'MUTATION_REQUEST', action: intent.action, operation: intent.operation, submissionId: intent.submissionId, expectedVersion: intent.expectedVersion, intent })
    const token = this._trackUiState.mutation.token
    this._getTrackService().cancel(intent.submissionId, intent.expectedVersion).then((response) => {
      if (this._unmounted) return
      this._trackResponse('MUTATION_RESPONSE', token, response, { operation: intent.operation, intent })
    })
  }

  onTrackAction = (action, item, event) => {
    if (event && event.stopPropagation) event.stopPropagation()
    if (this._trackUiState.uploadBusy) return
    if (!item || !Array.isArray(item.allowedActions) || item.allowedActions.indexOf(action) < 0) return
    if (action === 'upload_finalize') {
      if (!this._trackUiState.reservation
        || this._trackUiState.reservation.submissionId !== item.submissionId
        || !this._getTrackService().hasUploadSession(item.submissionId)) {
        this._updateTrackUi({ type: 'ERROR', operation: 'upload', error: { code: 'file_missing' } })
        return
      }
      return this._trackUploadFinalize(this._trackUiState.sessionToken, 'upload', item.submissionId)
    }
    if (action === 'refresh') return this.onTrackOpenDetail(item.submissionId)
    if (action === 'begin_revision') {
      this._getTrackService().clearSession()
      this._updateTrackUi({ type: 'START_REVISION', submission: item })
      return
    }
    if (action === 'cancel') return this._trackCancel(item, 'cancel')
    if (action === 'retry_cleanup') return this._trackCancel(item, 'retry_cleanup')
  }

  onTrackReset = () => {
    this._getTrackService().clearSession()
    this._updateTrackUi({ type: 'RESET' })
  }

  onTrackAdminFilter = (event) => {
    const value = event && event.detail && event.detail.value !== undefined ? event.detail.value : event
    const option = TRACK_ADMIN_FILTER_OPTIONS[Number(value)]
    this.onTrackAdminRefresh(false, option ? option.value : null)
  }

  onTrackAdminRefresh = (append = false, statusOverride, cursorOverride) => {
    const admin = this._trackUiState.admin
    if (admin.loading || admin.review.loading) return
    const status = statusOverride === undefined ? admin.filter : statusOverride
    const appendPage = append === true && status === admin.filter
    const cursor = appendPage
      ? (cursorOverride !== undefined ? cursorOverride : admin.nextCursor)
      : null
    if (appendPage && !cursor) return
    this._updateTrackUi({ type: 'ADMIN_LIST_REQUEST', status, append: appendPage, cursor })
    const token = this._trackUiState.admin.listToken
    const generation = this._trackUiState.admin.generation
    this._getTrackService().listAdmin({ status, cursor, limit: 10 }).then((response) => {
      if (this._unmounted || this._trackUiState.admin.generation !== generation) return
      this._trackResponse('ADMIN_LIST_RESPONSE', token, response, {
        status,
        append: appendPage,
        operation: 'admin_list',
      })
    })
  }

  onTrackAdminOpenDetail = (submissionId) => {
    const admin = this._trackUiState.admin
    if (!admin.session || admin.loading || admin.review.loading || typeof submissionId !== 'string' || !submissionId) return
    const cached = admin.items.find((item) => item.submissionId === submissionId)
    if (cached && (cached.unavailable || isTrackExpired(cached))) {
      this._updateTrackUi({ type: 'ADMIN_LIST_RESPONSE', token: admin.listToken, status: admin.filter, response: { phase: 'error', error: { code: 'submission_not_found' } } })
      return
    }
    this._updateTrackUi({ type: 'ADMIN_DETAIL_REQUEST', submissionId })
    const token = this._trackUiState.admin.detailToken
    const generation = this._trackUiState.admin.generation
    this._getTrackService().getAdmin(submissionId).then((response) => {
      if (this._unmounted) return
      this._trackResponse('ADMIN_DETAIL_RESPONSE', token, response, { generation, operation: 'admin_detail', intent: { submissionId } })
    })
  }

  onTrackAdminCloseDetail = () => {
    if (this._trackUiState.admin.review.loading) return
    this._updateTrackUi({ type: 'ADMIN_CLOSE_DETAIL' })
  }

  onTrackAdminReviewNote = (event) => {
    if (this._trackUiState.admin.review.loading) return
    const value = event && event.detail ? event.detail.value : event
    this._updateTrackUi({ type: 'ADMIN_REVIEW_NOTE', value: typeof value === 'string' ? value : '' })
  }

  _trackAdminReviewWithIntent = (intent) => {
    if (!intent) {
      this._updateTrackUi({ type: 'ADMIN_REVIEW_RESPONSE', token: this._trackUiState.admin.review.token, response: { phase: 'error', error: { code: 'invalid_input' } } })
      return
    }
    this._updateTrackUi({ type: 'ADMIN_REVIEW_REQUEST', intent })
    const token = this._trackUiState.admin.review.token
    const generation = this._trackUiState.admin.generation
    this._getTrackService().reviewAdmin(intent).then((response) => {
      if (this._unmounted) return
      this._trackResponse('ADMIN_REVIEW_RESPONSE', token, response, { generation, operation: 'admin_review', intent })
      if (this._trackUiState.admin.generation === generation && this._trackUiState.admin.session
        && response && response.phase === 'error' && response.error && response.error.code === 'version_conflict') {
        this.onTrackAdminOpenDetail(intent.submissionId)
      }
    })
  }

  onTrackAdminReview = (action, item, event) => {
    if (event && event.stopPropagation) event.stopPropagation()
    const admin = this._trackUiState.admin
    if (!admin.session || admin.loading || admin.review.loading || !item || typeof item.submissionId !== 'string'
      || !item.submissionId || item.unavailable || !Array.isArray(item.allowedAdminActions)
      || isAdminReviewExpired(item)
      || item.allowedAdminActions.indexOf(action) < 0) return
    if (action === 'request_changes' && (!admin.detail.open || !admin.detail.submission || admin.detail.submission.submissionId !== item.submissionId)) {
      this.onTrackAdminOpenDetail(item.submissionId)
      return
    }
    const decision = TRACK_ADMIN_REVIEW_DECISIONS[action]
    if (!decision) return
    const note = admin.reviewNote ? admin.reviewNote.trim() : ''
    const intent = this._getTrackService().createReviewIntent({
      submissionId: item.submissionId,
      expectedVersion: item.version,
      decision,
      note: note || null,
    })
    this._trackAdminReviewWithIntent(intent)
  }

  onTrackAdminAction = (action, item, event) => this.onTrackAdminReview(action, item, event)

  onTrackAdminReviewRetry = () => {
    const intent = this._trackUiState.admin.review.intent
    if (!intent || this._trackUiState.admin.loading || this._trackUiState.admin.review.loading) return
    this._trackAdminReviewWithIntent(intent)
  }

  onTrackAdminErrorAction = () => {
    const error = this._trackUiState.admin.error
    if (!error || this._trackUiState.admin.loading || this._trackUiState.admin.review.loading) return
    if (error.code === 'version_conflict' && error.nextAction === 'refresh') {
      return this.onTrackAdminOpenDetail(error.intent && error.intent.submissionId)
    }
    if (error.operation === 'admin_review') return this.onTrackAdminReviewRetry()
    if (error.operation === 'admin_detail' && this._trackUiState.admin.detail.requestIntent) {
      return this.onTrackAdminOpenDetail(this._trackUiState.admin.detail.requestIntent.submissionId)
    }
    if (error.operation === 'admin_list' && error.code === 'invalid_cursor' && error.nextAction === 'refresh') {
      const intent = error.intent || {}
      return this.onTrackAdminRefresh(false, intent.status)
    }
    const intent = error.intent || this._trackUiState.admin.requestIntent || {}
    this.onTrackAdminRefresh(intent.append === true, intent.status, intent.cursor)
  }

  onTrackAdminReset = () => {
    this._updateTrackUi({ type: 'ADMIN_RESET' })
  }


  renderTrackPage() {
    const { trackUi } = this.state
    return (
      <>
        <View className="track-owner-card card">
          <Text className="card-title">私有轨迹审核</Text>
          <Text className="track-rights-copy">{RIGHTS_COPY}</Text>
          <Text className="track-rights-copy track-rights-warning">{RIGHTS_PLATFORM_COPY}</Text>

          <Text className="track-field-label">轨迹标题</Text>
          <Input disabled={trackUi.uploadBusy || trackUi.mutation.loading} className="track-input" placeholder="例如：武功山东江村记录" value={trackUi.form.title} onInput={(event) => this.onTrackFieldInput('title', event)} />
          <Text className="track-field-label">地区（选填）</Text>
          <Input disabled={trackUi.uploadBusy || trackUi.mutation.loading} className="track-input" placeholder="例如：江西萍乡" value={trackUi.form.region} onInput={(event) => this.onTrackFieldInput('region', event)} />
          <Text className="track-field-label">备注（选填）</Text>
          <Input disabled={trackUi.uploadBusy || trackUi.mutation.loading} className="track-input" placeholder="仅供私下审核的补充说明" value={trackUi.form.note} onInput={(event) => this.onTrackFieldInput('note', event)} />

          <Text className="track-field-label">权利基础</Text>
          <RadioGroup className="track-rights-bases" value={trackUi.form.rightsBasis} disabled={trackUi.uploadBusy || trackUi.mutation.loading} onChange={this.onTrackRightsBasis}>
            {RIGHTS_BASES.map((basis) => (
              <Radio
                key={basis}
                value={basis}
                className={`track-rights-basis ${trackUi.form.rightsBasis === basis ? 'track-rights-basis-active' : ''}`}
              >
                <Text className="track-rights-basis-name">{basis === 'own_recording' ? '本人记录' : basis === 'authorized_by_creator' ? '记录者授权' : '开放许可'}</Text>
                {trackUi.form.rightsBasis === basis && <Text className="track-rights-basis-copy">{RIGHTS_BASIS_COPY[basis]}</Text>}
              </Radio>
            ))}
          </RadioGroup>
          {trackUi.form.rightsBasis === 'open_license' && (
            <View className="track-license-fields">
              <Input disabled={trackUi.uploadBusy || trackUi.mutation.loading} className="track-input" placeholder="开放许可名称（必填）" value={trackUi.form.licenseName} onInput={(event) => this.onTrackFieldInput('licenseName', event)} />
              <Input disabled={trackUi.uploadBusy || trackUi.mutation.loading} className="track-input" placeholder="开放许可 HTTPS 链接（必填）" value={trackUi.form.licenseUrl} onInput={(event) => this.onTrackFieldInput('licenseUrl', event)} />
            </View>
          )}
          <View className="track-consent-row">
            <CheckboxGroup className="track-consent-group" onChange={this.onTrackConsentChange}>
              <Checkbox value="track-rights-v1" disabled={trackUi.uploadBusy || trackUi.mutation.loading} checked={trackUi.form.rightsAccepted} />
            </CheckboxGroup>
            <Text className="track-consent-copy">我同意按上述保留与删除规则处理该文件。</Text>
          </View>

          <Button block disabled={trackUi.uploadBusy || trackUi.mutation.loading} className="track-file-btn" onClick={this.onTrackChooseFile}>{trackUi.file ? `已选择：${trackUi.file.name}（${trackUi.file.size} bytes）` : '选择一个 GPX 或 KML 文件'}</Button>
          {trackUi.file && <Text className="track-file-hint">仅做本地格式与大小提示，服务端仍会重新验证文件。</Text>}
          {trackUi.error && <View className="track-error-box"><Text>{trackUi.error.message}</Text>{trackUi.error.nextAction === 'contact_admin' && <Text className="track-contact-admin-guidance">如需继续，请联系管理员确认审核配置。</Text>}{trackUi.error.nextAction && trackUi.error.nextAction !== 'contact_admin' && <Button size="small" disabled={trackUi.uploadBusy || trackUi.mutation.loading || trackUi.list.loading || trackUi.detail.loading} className="inline-retry-btn" onClick={this.onTrackErrorAction}>{trackErrorRetryLabel(trackUi.error)}</Button>}</View>}
          <Button block disabled={!trackUi.file || !trackUi.form.rightsAccepted || trackUi.uploadBusy || trackUi.mutation.loading} className="track-submit-btn" onClick={this.onTrackSubmit}>{trackUi.uploadBusy ? '正在上传并提交…' : trackUi.reservation ? '继续上传并提交' : trackUi.revisionParentId ? '提交新的修订轨迹' : '提交私有轨迹'}</Button>
          {trackUi.uploadBusy && <Text className="track-progress">正在{trackUi.uploadOperation === 'begin' ? '准备上传' : '上传并校验'}，页面不会自动重试。</Text>}

          <View className="track-list-heading" aria-busy={trackUi.list.loading}><Text className="track-list-title">我的轨迹提交</Text><Button size="small" disabled={trackUi.uploadBusy || trackUi.list.loading} className="inline-retry-btn" onClick={() => this.onTrackRefresh(false)}>{trackUi.list.loading ? '读取中…' : '刷新'}</Button></View>
          {trackUi.list.loading && <Text className="empty-hint">正在读取你的私有提交…</Text>}
          {!trackUi.list.loading && trackUi.list.items.length === 0 && <Text className="empty-hint">还没有私有轨迹提交</Text>}
          {trackUi.list.items.map((item) => (
            <View key={item.submissionId} className={`track-submission-row ${item.unavailable ? 'track-submission-unavailable' : ''} ${trackUi.uploadBusy ? 'track-submission-row-disabled' : ''}`} aria-disabled={trackUi.uploadBusy} onClick={() => this.onTrackOpenDetail(item.submissionId)}>
              <View className="track-submission-main"><Text className="track-submission-title">{item.title || item.originalFilename || '未命名轨迹'}</Text><Text className="track-submission-status">{item.statusLabel}</Text><Text className="track-submission-meta">{(item.format || 'track').toUpperCase()} · {item.originalFilename || '文件名不可用'}</Text></View>
              {item.resumeUnavailable && <Text className="track-detail-note">此记录在本页没有本地文件，不能继续上传；如需提交，请重新选择文件。</Text>}
              <View className="track-submission-actions">{item.allowedActions.map((action) => <Button key={action} size="small" disabled={trackUi.uploadBusy || trackUi.mutation.loading || trackUi.list.loading} className="inline-retry-btn" onClick={(event) => this.onTrackAction(action, item, event)}>{TRACK_ACTION_LABELS[action]}</Button>)}</View>
            </View>
          ))}
          {trackUi.list.nextCursor && <Button size="small" disabled={trackUi.uploadBusy || trackUi.list.loading} className="inline-retry-btn track-more-btn" onClick={() => this.onTrackRefresh(true)}>{trackUi.list.loading ? '读取中…' : '加载更多'}</Button>}
          {trackUi.detail.open && (
            <View className="track-detail-panel">
              <View className="track-detail-heading"><Text className="track-list-title">提交详情</Text><Button size="small" disabled={trackUi.detail.loading} className="track-detail-close" onClick={this.onTrackCloseDetail}>关闭</Button></View>
              {trackUi.detail.loading && <Text className="empty-hint">正在读取提交详情…</Text>}
              {!trackUi.detail.loading && trackUi.detail.submission && <>
                <Text className="track-submission-status">{trackUi.detail.submission.statusLabel}</Text>
                {trackUi.detail.submission.resumeUnavailable && <Text className="track-detail-note">此记录在本页没有本地文件，不能继续上传；如需提交，请重新选择文件。</Text>}
                {trackUi.detail.submission.reviewNote && <Text className="track-detail-note">审核说明：{trackUi.detail.submission.reviewNote}</Text>}
                {trackUi.detail.submission.summary && <Text className="track-detail-note">轨迹点 {trackUi.detail.submission.summary.pointCount} · 分段 {trackUi.detail.submission.summary.segmentCount} · 距离 {trackUi.detail.submission.summary.distanceM}m</Text>}
                <View className="track-submission-actions">{trackUi.detail.submission.allowedActions.map((action) => <Button key={action} size="small" disabled={trackUi.uploadBusy || trackUi.mutation.loading} className="inline-retry-btn" onClick={(event) => this.onTrackAction(action, trackUi.detail.submission, event)}>{TRACK_ACTION_LABELS[action]}</Button>)}</View>
              </>}
            </View>
          )}
        </View>

        <View className="track-admin-card card">
          <View className="track-admin-heading" aria-busy={trackUi.admin.loading || trackUi.admin.review.loading}>
            <View>
              <Text className="card-title">管理员审核</Text>
              <Text className="track-admin-caption">仅展示服务端授权的私有审核队列，不显示提交者或审核者身份。</Text>
            </View>
            {trackUi.admin.session
              ? <Button size="small" disabled={trackUi.admin.loading || trackUi.admin.review.loading} className="track-admin-action" onClick={() => this.onTrackAdminRefresh(false)}>{trackUi.admin.loading ? '读取中…' : '刷新队列'}</Button>
              : <Button size="small" disabled={trackUi.admin.loading} className="track-admin-action" onClick={() => this.onTrackAdminRefresh(false)}>进入审核</Button>}
          </View>
          {trackUi.admin.error && <View className="track-admin-error"><Text>{trackUi.admin.error.message}</Text>{trackUi.admin.error.code === 'admin_not_configured' && <Text>如需继续，请联系管理员确认审核配置。</Text>}{trackUi.admin.error.nextAction && trackUi.admin.error.nextAction !== 'contact_admin' && <Button size="small" disabled={trackUi.admin.loading || trackUi.admin.review.loading} className="track-admin-action" onClick={() => this.onTrackAdminErrorAction()}>{trackErrorRetryLabel({ ...trackUi.admin.error, operation: trackUi.admin.error.operation || 'admin_list' })}</Button>}</View>}
          {trackUi.admin.session && <>
            <Picker mode="selector" range={TRACK_ADMIN_FILTER_OPTIONS.map((option) => option.label)} value={Math.max(0, TRACK_ADMIN_FILTER_OPTIONS.findIndex((option) => option.value === trackUi.admin.filter))} onChange={this.onTrackAdminFilter} disabled={trackUi.admin.loading || trackUi.admin.review.loading}>
              <View className="track-admin-filter" aria-disabled={trackUi.admin.loading || trackUi.admin.review.loading}><Text>{TRACK_ADMIN_FILTER_OPTIONS.find((option) => option.value === trackUi.admin.filter)?.label || '全部状态'}</Text></View>
            </Picker>
            {trackUi.admin.loading && <Text className="empty-hint">正在读取私有审核队列…</Text>}
            {!trackUi.admin.loading && trackUi.admin.items.length === 0 && <Text className="empty-hint">当前没有可审核的私有轨迹</Text>}
            {trackUi.admin.items.map((item) => (
              <View key={item.submissionId} className={`track-admin-row ${item.unavailable ? 'track-submission-unavailable' : ''}`} aria-disabled={trackUi.admin.loading || trackUi.admin.review.loading} onClick={() => this.onTrackAdminOpenDetail(item.submissionId)}>
                <View className="track-submission-main"><Text className="track-submission-title">{item.title || '未命名轨迹'}</Text><Text className="track-submission-status">{item.statusLabel}</Text><Text className="track-submission-meta">{(item.format || 'track').toUpperCase()} · {item.pointCount || 0} 点 · {item.segmentCount || 0} 段</Text></View>
              <View className="track-submission-actions">{item.allowedAdminActions.map((action) => <Button key={action} size="small" disabled={trackUi.admin.loading || trackUi.admin.review.loading || item.unavailable} className="track-admin-action" onClick={(event) => this.onTrackAdminReview(action, item, event)}>{TRACK_ADMIN_ACTION_LABELS[action]}</Button>)}</View>
              </View>
            ))}
            {trackUi.admin.nextCursor && <Button size="small" disabled={trackUi.admin.loading || trackUi.admin.review.loading} className="track-admin-action track-more-btn" onClick={() => this.onTrackAdminRefresh(true)}>{trackUi.admin.loading ? '读取中…' : '加载更多'}</Button>}
            {trackUi.admin.detail.open && <View className="track-admin-detail-panel">
              <View className="track-detail-heading"><Text className="track-list-title">管理员审核详情</Text><Button size="small" disabled={trackUi.admin.review.loading} className="track-detail-close" onClick={this.onTrackAdminCloseDetail}>关闭</Button></View>
              {trackUi.admin.detail.loading && <Text className="empty-hint">正在读取审核详情…</Text>}
              {!trackUi.admin.detail.loading && trackUi.admin.detail.submission && <>
                <Text className="track-submission-title">{trackUi.admin.detail.submission.title || '未命名轨迹'}</Text>
                <Text className="track-submission-status">{trackUi.admin.detail.submission.statusLabel}</Text>
                {trackUi.admin.detail.submission.summary && <Text className="track-detail-note">轨迹点 {trackUi.admin.detail.submission.summary.pointCount} · 分段 {trackUi.admin.detail.submission.summary.segmentCount} · 距离 {trackUi.admin.detail.submission.summary.distanceM}m</Text>}
                {trackUi.admin.detail.submission.approvedEvidence && <Text className="track-detail-note">已批准的内容仅作为去身份几何证据，不代表路线已开放或已发布。</Text>}
                <Input className="adminReviewNote" maxLength={500} disabled={trackUi.admin.review.loading} placeholder="审核说明（要求修改时必填）" value={trackUi.admin.reviewNote} onInput={this.onTrackAdminReviewNote} />
                <View className="track-submission-actions">{trackUi.admin.detail.submission.allowedAdminActions.map((action) => <Button key={action} size="small" disabled={trackUi.admin.review.loading || trackUi.admin.detail.submission.unavailable} className="track-admin-action" onClick={(event) => this.onTrackAdminReview(action, trackUi.admin.detail.submission, event)}>{TRACK_ADMIN_ACTION_LABELS[action]}</Button>)}</View>
                {trackUi.admin.review.loading && <Text className="track-progress">正在提交审核决定，页面不会自动重试。</Text>}
              </>}
            </View>}
          </>}
        </View>
      </>
    )
  }


  render() {
    const { trackUi } = this.state
    return (
      <View className="container community-track-page">
        <View className="community-track-header">
          <View>
            <Text className="community-track-kicker">PRIVATE COMMUNITY TRACK</Text>
            <Text className="community-track-title">社区轨迹</Text>
            <Text className="community-track-subtitle">提交、查看私有审核状态；管理员审核只显示服务端授权内容。</Text>
          </View>
          <Button size="small" className="community-track-back" onClick={this.onCommunityTrackBack}>返回路线查询</Button>
        </View>
        <View className="community-track-body" aria-busy={trackUi.uploadBusy || trackUi.list.loading || trackUi.admin.loading}>
          {this.renderTrackPage()}
        </View>
      </View>
    )
  }
}
