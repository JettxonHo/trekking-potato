import { Component } from 'react'
import { View, Text, Input, Picker, Image, ScrollView, PageContainer } from '@tarojs/components'
import LogoIcon from '../../assets/new_logo.png'
import { Button, Cell, CellGroup, Tag, Skeleton, Popup } from '@nutui/nutui-react-taro'
import Taro from '@tarojs/taro'
import './index.css'
import '../../styles/nutui-override.css'

const { createInitialTripFlow, reduceTripFlow, selectTripFlowView } = require('./trip-flow')
const { createGetAdviceService } = require('./get-advice-service')

const FUNNY_MESSAGES = [
  '薯仔正在向老天借晴天...',
  '薯仔正在把雨水塞进云里...',
  '薯仔正在疯狂敲木鱼求平安...',
  '薯仔正在数山上的石头有几颗...',
  '薯仔正在帮蚂蚁搬家...',
  '薯仔正在和风谈判...',
  '薯仔正在读《户外生存手册》第38页...',
  '薯仔正在给太阳充电...',
]

// 结果缓存：用户退出后重进直接恢复，避免重复消耗 LLM token
const CACHE_KEY = 'trekking_last_result'
const CACHE_TTL = 30 * 60 * 1000 // 30 分钟：天气预报在此窗口内变化极小

// TP-P0-003：路线类型用户可见标签（与后端 route-type.js 契约一致）
const ROUTE_TYPE_TEXT = { trek: '徒步', climb: '攀登', tour: '游览' }
const ROUTE_TYPE_SOURCE_TEXT = {
  builtin: '内置路线数据',
  user: '用户选择',
  ugc: 'UGC 路线',
  amap: '外部位置，用户已确认',
  unknown: '类型待确认',
}
const DETERMINISTIC_RISK_ADVICE = '本风险由海拔/季节规则判定，请查阅专业路书获取具体应对措施'
const AI_UNAVAILABLE_NOTE = 'AI 说明暂不可用，当前仅展示确定性规则结果。'
const HISTORY_SAVE_ERROR = '历史未保存，不影响本次结果'

function buildBaseSafetyResult(gearRules) {
  const rules = gearRules || {}
  const gear = {
    essential: Array.isArray(rules.essential) ? rules.essential : [],
    recommended: Array.isArray(rules.recommended) ? rules.recommended : [],
    optional: Array.isArray(rules.optional) ? rules.optional : [],
  }
  const risks = Array.isArray(rules.fatalRisks)
    ? rules.fatalRisks.map((riskName) => ({
      risk: riskName + '风险',
      level: '致命',
      advice: DETERMINISTIC_RISK_ADVICE,
    }))
    : []
  return { gear, risks }
}

export default class Index extends Component {
  state = {
    route: '',
    date: '',
    startTimeLocal: '08:00',
    level: '中级',
    days: 1,
    levels: ['小白', '中级', '老手'],
    levelCaptions: ['适合无经验者，路线以平路为主', '有一定经验，单日 10-20km 含爬升', '强驴专属，地形复杂，需强户外自理能力'],
    levelIndex: 1,
    minDate: '',
    loadingStage: '',
    tripFlow: createInitialTripFlow(),
    manualLat: '',
    manualLon: '',
    manualElev: '',
    // TP-P0-003：手动坐标必须携带用户明确选择的路线类型
    manualRouteType: '',
    routeTypeOptions: ['trek', 'climb', 'tour'],
    routeTypeLabels: ['徒步', '攀登', '游览'],
    climbSupport: 'solo_or_unsure',
    climbSupportOptions: ['solo_or_unsure', 'experienced_team', 'professional_guide'],
    climbSupportLabels: ['独自或支持不确定', '有经验队伍', '专业向导'],
    // TP-P0-003 REVIEW_FIX：手动可信上下文开关。
    // true 表示当前表单的路线身份必须继续使用用户确认的坐标和路线类型，
    // 而不是重新执行路线名解析
    manualContextActive: false,
    funnyMsg: '',
    daysBounce: false,
    showHistory: false,
    historyList: [],
    historyLoading: false,
    historyError: null,
    historySaveError: null,
  }

  componentDidMount() {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const todayStr = `${y}-${m}-${day}`
    this.setState({ minDate: todayStr })

    // 恢复缓存：30 分钟内的上次查询直接回显，省一次 LLM 调用
    try {
      const cached = Taro.getStorageSync(CACHE_KEY)
      if (cached && cached.cachedAt && (Date.now() - cached.cachedAt < CACHE_TTL) && cached.result && cached.form) {
        // 缓存的日期若已过期（跨天场景），回填为今天
        const restoreDate = this._isDateExpired(cached.form.date) ? todayStr : cached.form.date
        // TP-P0-003 REVIEW_FIX：只有缓存明确标记 manualContextActive === true
        // 且类型、坐标均合法时才恢复手动上下文；旧缓存缺失该字段一律视为 false，
        // 不得根据孤立字段推断为手动上下文
        const cachedLat = parseFloat(cached.form.manualLat)
        const cachedLon = parseFloat(cached.form.manualLon)
        const restoreManualContext = cached.form.manualContextActive === true
          && this.state.routeTypeOptions.indexOf(cached.form.manualRouteType) >= 0
          && !isNaN(cachedLat) && !isNaN(cachedLon)
          && cachedLat >= -90 && cachedLat <= 90
          && cachedLon >= -180 && cachedLon <= 180
        this.setState({
          route: cached.form.route || '',
          date: restoreDate,
          startTimeLocal: cached.form.startTimeLocal || '08:00',
          days: cached.form.days || 1,
          level: cached.form.level || '中级',
          levelIndex: cached.form.levelIndex != null ? cached.form.levelIndex : 1,
          climbSupport: this.state.climbSupportOptions.indexOf(cached.form.climbSupport) >= 0 ? cached.form.climbSupport : 'solo_or_unsure',
          // TP-P0-003：恢复手动坐标与路线类型上下文，缓存恢复后继续显示相同类型
          manualContextActive: restoreManualContext,
          manualRouteType: restoreManualContext ? cached.form.manualRouteType : '',
          manualLat: restoreManualContext ? String(cached.form.manualLat) : '',
          manualLon: restoreManualContext ? String(cached.form.manualLon) : '',
          manualElev: restoreManualContext ? (cached.form.manualElevation || '') : '',
          tripFlow: reduceTripFlow(this.state.tripFlow, {
            type: 'RESTORE_CACHED',
            result: cached.result,
            degraded: cached.result.degraded === true,
          }),
        })
      }
    } catch (e) {
      console.warn('[徒步薯] 缓存恢复失败', e)
    }
  }

  onRouteInput = (e) => {
    const nextRoute = e.detail.value
    const routeTypeRequest = this.state.tripFlow.routeTypeRequest
    // TP-P0-003 REVIEW_FIX：用户修改路线文本后必须清除全部手动上下文，
    // 包括 manualContextActive，避免旧坐标与路线类型被串用
    if (this.state.manualContextActive || routeTypeRequest || this.state.manualRouteType || this.state.manualLat || this.state.manualLon) {
      this.setState((previous) => ({
        route: nextRoute,
        manualContextActive: false,
        manualRouteType: '',
        manualLat: '',
        manualLon: '',
        manualElev: '',
        tripFlow: reduceTripFlow(previous.tripFlow, { type: 'RESET' }),
      }))
      return
    }
    this.setState((previous) => ({
      route: nextRoute,
      tripFlow: reduceTripFlow(previous.tripFlow, { type: 'RESET' }),
    }))
  }
  onDateChange = (e) => this.setState({ date: e.detail.value })
  onStartTimeChange = (e) => this.setState({ startTimeLocal: e.detail.value || '08:00' })
  onClimbSupportChange = (e) => {
    const index = parseInt(e.detail.value, 10)
    const next = this.state.climbSupportOptions[index]
    if (next) this.setState({ climbSupport: next })
  }

  // 安全构造日期（规避 iOS Safari new Date('YYYY-MM-DD') 返回 NaN）
  // 输出格式：MM.DD 周几
  formatWeatherDate(dateStr) {
    const parts = String(dateStr || '').split('-')
    if (parts.length !== 3) return dateStr || ''
    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    const day = parseInt(parts[2], 10)
    if (isNaN(month) || isNaN(day)) return dateStr
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const d = new Date(year, month - 1, day)
    if (isNaN(d.getTime())) return dateStr
    const mm = String(month).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    return mm + '.' + dd + ' ' + weekdays[d.getDay()]
  }

  onLevelChange = (e) => this.setState({ levelIndex: e.detail.value, level: this.state.levels[e.detail.value] })
  onDaysDec = () => {
    const cur = parseInt(this.state.days) || 1
    const next = Math.max(1, cur - 1)
    this.setState({ days: next, daysBounce: true })
    setTimeout(() => this.setState({ daysBounce: false }), 400)
  }
  onDaysInc = () => {
    const cur = parseInt(this.state.days) || 1
    const next = Math.min(7, cur + 1)
    this.setState({ days: next, daysBounce: true })
    setTimeout(() => this.setState({ daysBounce: false }), 400)
  }
  onLevelSelect = (idx) => {
    this.setState({ levelIndex: idx, level: this.state.levels[idx] })
  }

  onSubmit = () => {
    const { route, date, startTimeLocal, level, days, climbSupport, manualContextActive, manualRouteType, manualLat, manualLon, manualElev, routeTypeOptions } = this.state
    if (!route.trim()) { Taro.showToast({ title: '请输入路线名', icon: 'none' }); return }
    if (!date) { Taro.showToast({ title: '请选择出发日期', icon: 'none' }); return }
    const tripDays = Math.max(1, Math.min(7, parseInt(days) || 1))
    // TP-P0-003 REVIEW_FIX：手动可信上下文激活时，必须复用用户确认的坐标与路线类型，
    // 不得重新只按路线名解析
    if (manualContextActive) {
      const lat = parseFloat(manualLat)
      const lon = parseFloat(manualLon)
      const elev = parseFloat(manualElev) || 0
      const typeValid = routeTypeOptions.indexOf(manualRouteType) >= 0
      const coordsValid = !isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
      if (!typeValid || !coordsValid) {
        Taro.showToast({ title: '手动坐标或路线类型不完整，请确认后重新提交', icon: 'none' })
        const error = { code: 'invalid_manual_context', message: '手动坐标或路线类型不完整，请确认后重新提交', retryable: false }
        this._openManualFallback(error)
        return
      }
      this._submitBase({
        route: route.trim(),
        date, startTimeLocal, level, days: tripDays, climbSupport,
        manualLat: lat,
        manualLon: lon,
        manualElevation: elev > 0 ? elev : undefined,
        routeType: manualRouteType,
      })
      return
    }
    this._submitBase({ route: route.trim(), date, startTimeLocal, level, days: tripDays, climbSupport })
  }

  _updateTripFlow(event, pageState, callback) {
    let changed = false
    this.setState((previous) => {
      const tripFlow = reduceTripFlow(previous.tripFlow, event)
      changed = tripFlow !== previous.tripFlow
      return { ...(pageState || {}), tripFlow }
    }, () => {
      if (changed && callback) callback(this.state.tripFlow)
    })
  }

  _isCurrentTripFlow(token, statuses) {
    const flow = this.state.tripFlow
    return !this._unmounted && flow.token === token && statuses.indexOf(flow.status) >= 0
  }

  _getAdviceService() {
    return createGetAdviceService({ callFunction: (request) => Taro.cloud.callFunction(request) })
  }

  _openManualFallback(error) {
    const type = this.state.tripFlow.status === 'error' ? 'BEGIN_PREPARE' : 'BEGIN_SEARCH'
    this._updateTripFlow({ type }, null, (flow) => {
      this._updateTripFlow({
        type: 'ROUTE_TYPE_REQUIRED',
        token: flow.token,
        routeTypeRequest: null,
        error,
      })
    })
  }

  _isValidCandidate(candidate) {
    if (!candidate || typeof candidate.candidateId !== 'string' || candidate.candidateId.length === 0
      || typeof candidate.canonicalName !== 'string' || candidate.canonicalName.length === 0
      || typeof candidate.region !== 'string' || candidate.region.length === 0) return false
    if (candidate.entityKind === 'route_variant') {
      return candidate.capability === 'full' && !!ROUTE_TYPE_TEXT[candidate.routeType] && Number.isInteger(candidate.fixedDays) && candidate.fixedDays >= 1
    }
    return candidate.entityKind === 'place' && candidate.capability === 'place_only' && candidate.routeType === null && candidate.fixedDays === null
  }

  onCandidateClose = () => {
    this._updateTripFlow({ type: 'RESET' })
  }

  onCandidateSelect = (candidateId) => {
    const { candidates, confirmationInput } = this.state.tripFlow
    const candidate = candidates.find((item) => item.candidateId === candidateId)
    const snapshot = confirmationInput
    if (!this._isValidCandidate(candidate) || !snapshot || typeof snapshot.date !== 'string' || typeof snapshot.startTimeLocal !== 'string' || typeof snapshot.level !== 'string' || !snapshot.days) {
      this._updateTripFlow({ type: 'BEGIN_PREPARE' }, null, (flow) => {
        this._updateTripFlow({
          type: 'FLOW_FAILED',
          token: flow.token,
          error: { message: '候选路线信息异常，请修改输入后重试', retryable: false },
        })
      })
      return
    }

    const params = {
      candidateId, date: snapshot.date, startTimeLocal: snapshot.startTimeLocal, level: snapshot.level, days: snapshot.days,
      climbSupport: snapshot.climbSupport,
    }
    this._updateTripFlow({ type: 'BEGIN_PREPARE' }, { loadingStage: '薯仔正在确认路线...' }, (flow) => {
      const token = flow.token
      this._getAdviceService().confirm(params).then((outcome) => {
        if (!this._isCurrentTripFlow(token, ['preparing'])) return
        if (outcome.kind === 'transport_failure') {
          this._updateTripFlow({
            type: 'FLOW_FAILED',
            token,
            error: { message: '云函数调用失败，请检查 getAdvice 是否已部署', retryable: true },
          })
          return
        }
        const result = outcome.result
        if (!result) {
          this._updateTripFlow({ type: 'FLOW_FAILED', token, error: { message: '路线确认失败，请重新查询', retryable: true } })
          return
        }
        if (result.phase === 'route_type_required') {
          const pd = result.data
          this._updateTripFlow({ type: 'ROUTE_TYPE_REQUIRED', token, routeTypeRequest: pd }, {
            manualContextActive: pd.resolutionKind === 'manual_place',
            manualLat: pd.lat != null ? String(pd.lat) : '',
            manualLon: pd.lon != null ? String(pd.lon) : '',
            manualElev: pd.elevation != null ? String(pd.elevation) : '',
            manualRouteType: '',
          })
          return
        }
        if (result.phase === 'error') {
          this._updateTripFlow({ type: 'FLOW_FAILED', token, error: { code: result.code, message: result.message || '路线确认失败，请重新查询', retryable: result.retryable === true } })
          return
        }
        if (result.phase !== 'base') {
          this._updateTripFlow({ type: 'FLOW_FAILED', token, error: { message: '路线确认失败，请重新查询', retryable: true } })
          return
        }
        const base = result.data
        const historyParams = { ...params, route: params.route || base.route }
        this._showBaseAndFetchAdvice(base, result.queryId, historyParams, token)
      })
    })
  }

  _handleFollowupOutcome = (outcome, token, historyParams) => {
    if (!this._isCurrentTripFlow(token, ['preparing'])) return
    if (outcome.kind === 'transport_failure') {
      this._updateTripFlow({ type: 'FLOW_FAILED', token, error: { message: '云函数调用失败，请检查 getAdvice 是否已部署', retryable: true } })
      return
    }
    const result = outcome.result
    if (!result) {
      this._updateTripFlow({ type: 'FLOW_FAILED', token, error: { message: '路线确认失败，请重新查询', retryable: true } })
      return
    }
    if (result.phase === 'route_type_required') {
      this._updateTripFlow({ type: 'ROUTE_TYPE_REQUIRED', token, routeTypeRequest: result.data }, {
        manualContextActive: result.data.resolutionKind === 'manual_place',
        manualLat: result.data.lat != null ? String(result.data.lat) : '',
        manualLon: result.data.lon != null ? String(result.data.lon) : '',
        manualElev: result.data.elevation != null ? String(result.data.elevation) : '',
        manualRouteType: '',
      })
      return
    }
    if (result.phase === 'error') {
      this._updateTripFlow({ type: 'FLOW_FAILED', token, error: { code: result.code, message: result.message || '路线确认失败，请重新查询', retryable: result.retryable === true } })
      return
    }
    if (result.phase !== 'base') {
      this._updateTripFlow({ type: 'FLOW_FAILED', token, error: { message: '路线确认失败，请重新查询', retryable: true } })
      return
    }
    this._showBaseAndFetchAdvice(result.data, result.queryId, { ...historyParams, route: historyParams.route || result.data.route }, token)
  }

  // TP-P0-003：手动坐标路线类型选择（Picker 索引 → 枚举值）
  onManualRouteTypeChange = (e) => {
    const idx = parseInt(e.detail.value, 10)
    const next = this.state.routeTypeOptions[idx]
    if (next) this.setState({ manualRouteType: next })
  }

  onManualSubmit = () => {
    const { route, date, startTimeLocal, level, days, climbSupport, manualLat, manualLon, manualElev, manualRouteType, routeTypeOptions } = this.state
    const request = this.state.tripFlow.routeTypeRequest
    if (request && request.resolutionKind === 'catalog_place') {
      if (routeTypeOptions.indexOf(manualRouteType) < 0) {
        Taro.showToast({ title: '请选择路线类型', icon: 'none' }); return
      }
      const snapshot = request.input || { date, startTimeLocal, level, days, climbSupport }
      this._updateTripFlow({ type: 'BEGIN_PREPARE' }, { loadingStage: '薯仔正在确认地点类型...' }, (flow) => {
        const token = flow.token
        this._getAdviceService().confirm({
          candidateId: request.candidateId,
          date: snapshot.date,
          startTimeLocal: snapshot.startTimeLocal,
          level: snapshot.level,
          days: snapshot.days,
          climbSupport: snapshot.climbSupport,
          routeType: manualRouteType,
        }).then((outcome) => this._handleFollowupOutcome(outcome, token, { route: request.name }))
      })
      return
    }
    if (request && request.resolutionKind === 'amap_place') {
      if (routeTypeOptions.indexOf(manualRouteType) < 0) {
        Taro.showToast({ title: '请选择路线类型', icon: 'none' }); return
      }
      const snapshot = request.input || { date, startTimeLocal, level, days, climbSupport }
      this._submitBase({ route: request.route, date: snapshot.date, startTimeLocal: snapshot.startTimeLocal, level: snapshot.level, days: snapshot.days, climbSupport: snapshot.climbSupport, routeType: manualRouteType })
      return
    }
    const lat = parseFloat(manualLat)
    const lon = parseFloat(manualLon)
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      Taro.showToast({ title: '经纬度格式错误', icon: 'none' }); return
    }
    // TP-P0-003：未选择路线类型时禁止提交，不得默认为 trek
    if (routeTypeOptions.indexOf(manualRouteType) < 0) {
      Taro.showToast({ title: '请选择路线类型', icon: 'none' }); return
    }
    const tripDays = Math.max(1, Math.min(7, parseInt(days) || 1))
    const elev = parseFloat(manualElev) || 0
    // TP-P0-003 REVIEW_FIX：手动弹窗成功发起查询即激活手动可信上下文，
    // 后续普通提交复用该坐标与类型
    this.setState({ manualContextActive: true })
    this._submitBase({
      route: route.trim() || '手动坐标',
      date, startTimeLocal, level, days: tripDays, climbSupport,
      manualLat: lat, manualLon: lon,
      manualElevation: elev > 0 ? elev : undefined,
      routeType: manualRouteType,
    })
  }

  onManualClose = () => this._updateTripFlow({ type: 'RESET' })

  _startFunnyRotation() {
    this._funnyTimer = setInterval(() => {
      if (this._unmounted || !selectTripFlowView(this.state.tripFlow).adviceLoading) { clearInterval(this._funnyTimer); return }
      const msg = FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)]
      this.setState({ funnyMsg: msg })
    }, 2000)
    this.setState({ funnyMsg: FUNNY_MESSAGES[0] })
  }

  _showBaseAndFetchAdvice(base, queryId, params, generation) {
    const baseSafetyResult = buildBaseSafetyResult(base.gearRules)
    const baseResult = {
        routeSnapshot: base.routeSnapshot,
        deterministicResult: base.deterministicResult,
        minimumGear: base.minimumGear,
        sourceMetadata: base.sourceMetadata,
        weatherWindow: base.weather,
        photoTiming: base.sunEvents,
        gear: baseSafetyResult.gear,
        risks: baseSafetyResult.risks,
        notes: [],
        meta: {
          elevation: base.elevation,
          location: base.location,
          coords: base.coords,
          // TP-P0-003：结果保存可信路线类型与来源
          routeType: base.routeType,
          routeTypeSource: base.routeTypeSource,
          capability: base.meta && base.meta.capability,
          dataStatus: base.meta && base.meta.dataStatus,
        },
    }
    this._updateTripFlow({ type: 'BASE_RECEIVED', token: generation, result: baseResult, queryId }, null, (flow) => {
      if (this._unmounted || flow.token !== generation || flow.status !== 'base_ready') return
      this._saveCache(generation)
      this._updateTripFlow({ type: 'ADVICE_STARTED', token: generation }, null, (adviceFlow) => {
        if (this._unmounted || adviceFlow.token !== generation || adviceFlow.status !== 'advice_loading') return
        this._adviceSteps = ['薯仔正在分析天气窗口...', '薯仔正在匹配装备清单...', '薯仔正在评估风险等级...', '薯仔正在生成行前建议...']
        this._adviceStepIdx = 0
        this._adviceStepTimer = setInterval(() => {
          if (this._unmounted || !selectTripFlowView(this.state.tripFlow).adviceLoading) { clearInterval(this._adviceStepTimer); return }
          this._adviceStepIdx = (this._adviceStepIdx + 1) % this._adviceSteps.length
          this.setState({ adviceStage: this._adviceSteps[this._adviceStepIdx] })
        }, 1800)
        this.setState({ adviceStage: this._adviceSteps[0] })
        this._startFunnyRotation()
        this._fetchAdvice(queryId, params, generation)
      })
    })
  }

  _submitBase(params) {
    this._unmounted = false
    const status = this.state.tripFlow.status
    const type = ['awaiting_confirmation', 'awaiting_route_type', 'error'].indexOf(status) >= 0
      ? 'BEGIN_PREPARE'
      : 'BEGIN_SEARCH'
    this._updateTripFlow({ type }, { loadingStage: '薯仔正在查询路线位置...' }, (flow) => {
      const generation = flow.token
      this._getAdviceService().prepare(params).then((outcome) => {
        if (!this._isCurrentTripFlow(generation, ['searching', 'preparing'])) return
        if (outcome.kind === 'transport_failure') {
          this._updateTripFlow({
            type: 'FLOW_FAILED',
            token: generation,
            error: { message: '云函数调用失败，请检查 getAdvice 是否已部署', retryable: true },
          })
          return
        }
        const result = outcome.result
        if (!result) {
          this._updateTripFlow({ type: 'FLOW_FAILED', token: generation, error: { message: '路线查询失败', retryable: true } })
          return
        }
        if (result.phase === 'confirmation') {
          const candidates = Array.isArray(result.candidates) ? result.candidates : []
          if (candidates.length < 1 || candidates.length > 5 || !candidates.every((candidate) => this._isValidCandidate(candidate))) {
            this._updateTripFlow({ type: 'FLOW_FAILED', token: generation, error: { message: '候选路线信息异常，请修改输入后重试', retryable: false } })
            return
          }
          this._updateTripFlow({
            type: 'CONFIRMATION_REQUIRED',
            token: generation,
            candidates,
            confirmationInput: { date: params.date, startTimeLocal: params.startTimeLocal, level: params.level, days: params.days, climbSupport: params.climbSupport },
          })
          return
        }
        if (result.phase === 'route_type_required') {
          // TP-P0-003：类型未知不是普通失败——保存已解析位置，预填手动坐标弹窗，
          // 打开路线类型选择；不自动选择 trek
          const pd = result.data
          this._updateTripFlow({ type: 'ROUTE_TYPE_REQUIRED', token: generation, routeTypeRequest: pd }, {
            // TP-P0-003 REVIEW_FIX：外部位置预填后激活手动可信上下文
            manualContextActive: pd.resolutionKind === 'manual_place',
            manualLat: pd.lat != null ? String(pd.lat) : '',
            manualLon: pd.lon != null ? String(pd.lon) : '',
            manualElev: pd.elevation != null ? String(pd.elevation) : '',
            manualRouteType: '',
          })
          return
        }
        if (result.phase === 'error') {
          const error = result.code
          const flowError = { code: result.code, message: result.message || '路线查询失败', retryable: result.retryable === true }
          if (error === 'location_failed' || error === 'route_not_found') {
            this._updateTripFlow({ type: 'ROUTE_TYPE_REQUIRED', token: generation, routeTypeRequest: null, error: flowError })
            return
          }
          this._updateTripFlow({ type: 'FLOW_FAILED', token: generation, error: flowError })
          return
        }
        if (result.phase !== 'base') {
          this._updateTripFlow({ type: 'FLOW_FAILED', token: generation, error: { message: '路线查询失败', retryable: true } })
          return
        }
        this._showBaseAndFetchAdvice(result.data, result.queryId, params, generation)
      })
    })
  }

  _fetchAdvice(queryId, historyParams, generation) {
    this._getAdviceService().advice(queryId).then((outcome) => {
        if (!this._isCurrentTripFlow(generation, ['advice_loading'])) return
        if (this._adviceStepTimer) clearInterval(this._adviceStepTimer)
        if (this._funnyTimer) clearInterval(this._funnyTimer)
        if (outcome.kind === 'transport_failure') {
          this._finishDegradedAdvice(generation, historyParams, { message: 'AI 建议生成失败', retryable: true })
          return
        }
        const result = outcome.result
        if (result && result.phase === 'error' && result.code === 'query_context_unavailable') {
          this._updateTripFlow({
            type: 'CONTEXT_UNAVAILABLE',
            token: generation,
            error: { code: result.code, message: result.message, retryable: result.retryable === true },
          }, { funnyMsg: '', daysBounce: false })
          return
        }
        if (result && result.phase === 'advice') {
          const d = result.data
          const degraded = result.degraded === true
          const base = this.state.tripFlow.result
          const mergedResult = {
              ...base,
              gear: d.gear || base.gear,
              risks: d.risks || base.risks,
              notes: d.notes || base.notes,
              degraded,
              weatherWindow: d.weather || base.weatherWindow,
              photoTiming: d.photoTiming || base.photoTiming,
              disclaimer: d.disclaimer,
              meta: { ...base.meta, ...d.meta },
          }
          this._updateTripFlow({ type: 'ADVICE_SUCCEEDED', token: generation, result: mergedResult, degraded }, { funnyMsg: '', daysBounce: false }, (flow) => {
            if (this._unmounted || flow.token !== generation || ['complete', 'degraded'].indexOf(flow.status) < 0) return
            const historyResult = {
              risks: d.risks || [],
              degraded,
              meta: { ...(flow.result.meta || {}), ...d.meta },
            }
            this._saveCache(generation)
            this._saveHistory(historyParams, historyResult, generation)
          })
        } else {
          this._finishDegradedAdvice(generation, historyParams, {
            code: result && result.phase === 'error' ? result.code : undefined,
            message: (result && result.phase === 'error' && result.message) || 'AI 建议生成失败',
            retryable: result && result.retryable === true,
          })
        }
    })
  }

  _finishDegradedAdvice(token, historyParams, error) {
    const base = this.state.tripFlow.result
    const result = {
      ...base,
      degraded: true,
      notes: [...(base.notes || []), AI_UNAVAILABLE_NOTE],
    }
    this._updateTripFlow({ type: 'ADVICE_FAILED', token, result, error }, { funnyMsg: '', daysBounce: false }, (flow) => {
      if (this._unmounted || flow.token !== token || flow.status !== 'degraded') return
      const historyResult = {
        risks: flow.result.risks || [],
        degraded: true,
        meta: flow.result.meta || {},
      }
      this._saveCache(token)
      this._saveHistory(historyParams, historyResult, token)
    })
  }

  onBack = () => this._updateTripFlow({ type: 'RESET' })

  // ===== 结果缓存 =====
  _saveCache() {
    const token = arguments[0]
    if (this._unmounted || this.state.tripFlow.token !== token) return
    const { route, date, startTimeLocal, days, level, levelIndex, climbSupport, manualContextActive, manualRouteType, manualLat, manualLon, manualElev } = this.state
    const result = this.state.tripFlow.result
    if (!result) return
    try {
      Taro.setStorageSync(CACHE_KEY, {
        // TP-P0-003 REVIEW_FIX：缓存显式保存 manualContextActive；
        // 只有手动上下文激活时才保存有效的手动字段，
        // 普通内置路线缓存不得携带遗留手动上下文
        form: {
          route, date, startTimeLocal, days, level, levelIndex, climbSupport,
          manualContextActive,
          manualRouteType: manualContextActive ? manualRouteType : '',
          manualLat: manualContextActive ? manualLat : '',
          manualLon: manualContextActive ? manualLon : '',
          manualElevation: manualContextActive ? manualElev : '',
        },
        result,
        cachedAt: Date.now(),
      })
    } catch (e) {
      console.warn('[徒步薯] 缓存保存失败', e)
    }
  }

  // ===== 历史记录 =====
  _saveHistory(params, resultData) {
    const token = arguments[2]
    const risks = resultData.risks || []
    const summary = risks.length > 0
      ? risks[0].risk + (risks.length > 1 ? ' 等' + risks.length + '项风险' : '')
      : (resultData.degraded ? 'AI 降级·基础参考' : '无重大风险')

    Taro.cloud.callFunction({
      name: 'history',
      data: {
        mode: 'save',
        route: params.route,
        date: params.date,
        days: params.days,
        level: params.level,
        elevation: resultData.meta && resultData.meta.elevation,
        location: resultData.meta && resultData.meta.location,
        coords: resultData.meta && resultData.meta.coords,
        // TP-P0-003：历史记录保存路线类型与来源
        routeType: resultData.meta && resultData.meta.routeType,
        routeTypeSource: resultData.meta && resultData.meta.routeTypeSource,
        summary,
        degraded: resultData.degraded === true,
      },
      success: (res) => {
        if (this._unmounted || this.state.tripFlow.token !== token) return
        const result = res.result
        this.setState({ historySaveError: result && result.ok ? null : HISTORY_SAVE_ERROR })
      },
      fail: () => {
        if (this._unmounted || this.state.tripFlow.token !== token) return
        this.setState({ historySaveError: HISTORY_SAVE_ERROR })
      },
    })
  }

  // 日期过期校验（防呆：回填历史时若日期已过，重置为今日）
  _isDateExpired(dateStr) {
    if (!dateStr) return true
    const parts = String(dateStr).split('-')
    if (parts.length !== 3) return true
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return d.getTime() < today.getTime()
  }

  onHistoryTap = () => {
    this.setState({ showHistory: true, historyLoading: true, historyError: null })
    Taro.cloud.callFunction({
      name: 'history',
      data: { mode: 'list', limit: 20 },
      success: (res) => {
        if (this._unmounted) return
        const result = res.result
        if (result && result.ok) {
          this.setState({ historyLoading: false, historyList: result.data || [], historyError: null })
          return
        }
        this.setState({ historyLoading: false, historyError: (result && result.message) || '历史暂时无法读取，请重试' })
      },
      fail: () => {
        if (this._unmounted) return
        this.setState({ historyLoading: false, historyError: '历史暂时无法读取，请重试' })
      }
    })
  }

  onDeleteHistory = (id, event) => {
    event.stopPropagation()
    Taro.cloud.callFunction({
      name: 'history',
      data: { mode: 'delete', id },
      success: (res) => {
        const result = res.result
        if (result && result.ok) {
          this.setState((prev) => ({
            historyList: prev.historyList.filter((item) => item.id !== id),
            historyError: null,
          }))
          return
        }
        this.setState({ historyError: (result && result.message) || '历史删除失败，请重试' })
      },
      fail: () => this.setState({ historyError: '历史删除失败，请重试' }),
    })
  }

  onClearHistory = () => {
    Taro.showModal({
      title: '清空历史',
      content: '确认清空全部历史查询吗？',
      success: (modal) => {
        if (!modal.confirm) return
        Taro.cloud.callFunction({
          name: 'history',
          data: { mode: 'clear' },
          success: (res) => {
            const result = res.result
            if (result && result.ok) {
              this.setState({ historyList: [], historyError: null })
              return
            }
            this.setState({ historyError: (result && result.message) || '历史清空失败，请重试' })
          },
          fail: () => this.setState({ historyError: '历史清空失败，请重试' }),
        })
      },
    })
  }

  onRestoreHistory = (record) => {
    // 日期过期校验：历史日期 < 今日 → 重置为今日
    const restoreDate = this._isDateExpired(record.date) ? this.state.minDate : record.date
    // TP-P0-003 REVIEW_FIX：只有用户手动来源（routeTypeSource === 'user'）、
    // 类型合法且坐标为有效数字的记录才恢复手动可信上下文；
    // builtin/ugc/amap/unknown/缺失来源/旧记录必须清空手动上下文，
    // 再次提交时按路线名重新解析，不得伪装为用户手动坐标来源
    const coords = record.coords && typeof record.coords === 'object' ? record.coords : null
    const coordsValid = !!coords
      && typeof coords.lat === 'number' && typeof coords.lon === 'number'
      && isFinite(coords.lat) && isFinite(coords.lon)
      && coords.lat >= -90 && coords.lat <= 90
      && coords.lon >= -180 && coords.lon <= 180
    const isManualRecord = record.routeTypeSource === 'user'
      && this.state.routeTypeOptions.indexOf(record.routeType) >= 0
      && coordsValid
    this.setState({
      route: record.route || '',
      date: restoreDate,
      days: record.days || 1,
      level: record.level || '中级',
      levelIndex: ['小白', '中级', '老手'].indexOf(record.level || '中级'),
      showHistory: false,
      manualContextActive: isManualRecord,
      manualRouteType: isManualRecord ? record.routeType : '',
      manualLat: isManualRecord ? String(coords.lat) : '',
      manualLon: isManualRecord ? String(coords.lon) : '',
      manualElev: isManualRecord && record.elevation != null ? String(record.elevation) : '',
    })
  }

  componentWillUnmount() {
    this._unmounted = true
    if (this._adviceStepTimer) clearInterval(this._adviceStepTimer)
    if (this._funnyTimer) clearInterval(this._funnyTimer)
  }

  render() {
    const { route, date, startTimeLocal, days, levels, levelIndex, minDate, loadingStage, tripFlow, manualLat, manualLon, manualElev, manualRouteType, routeTypeLabels, routeTypeOptions, climbSupport, climbSupportLabels, showHistory, historyList, historyLoading, historyError, historySaveError } = this.state
    const { loading, adviceLoading, showResult, showCandidatePopup, showManualCoords, errorMessage } = selectTripFlowView(tripFlow)
    const { result, candidates, routeTypeRequest } = tripFlow
    const error = errorMessage
    const adviceStage = this.state.adviceStage || '薯仔正在生成建议...'
    const funnyMsg = this.state.funnyMsg

    // ===== Loading 视图（Skeleton 骨架屏 + 薯仔） =====
    if (loading) {
      return (
        <View className="container loading-screen">
          <Text className="potato-face">(•_•)</Text>
          <Text className="loading-text">{loadingStage}</Text>
          <View className="skeleton-card">
            <Skeleton rows={2} animated block />
            <View className="skeleton-gap" />
            <Skeleton rows={3} animated block />
          </View>
        </View>
      )
    }

    // ===== 结果视图 =====
    if (showResult && result) {
      const d = result
      const degraded = d.degraded === true
      const meta = d.meta || {}
      const weather = d.weatherWindow || {}
      const gear = d.gear || {}
      const risks = d.risks || []
      const notes = d.notes || []
      const photo = d.photoTiming || {}

      return (
        <View className="container" style="padding-top:40rpx;padding-bottom:120rpx;">
          {degraded && (
            <View className="degraded-banner">
              <Text>薯仔脑子暂时短路了，以下为基础参考 🥔</Text>
            </View>
          )}

          {error && <View className="error-box"><Text>{error}</Text></View>}
          {historySaveError && <View className="history-error-box"><Text>{historySaveError}</Text></View>}

          {adviceLoading && (
            <View className="status-bar">
              <Text className="status-text">{adviceStage}</Text>
              <Text className="quirky-potato-char">( º﹃º )</Text>
            </View>
          )}

          {meta.elevation && (
            <View className="elevation-pill">
              <Text>📍 {meta.elevation}m · {meta.location}</Text>
            </View>
          )}

          {/* TP-P0-003：向用户展示可信路线类型（中文标签），不得只显示英文枚举 */}
          {ROUTE_TYPE_TEXT[meta.routeType] && (
            <View className="elevation-pill">
              <Text>🧭 路线类型：{ROUTE_TYPE_TEXT[meta.routeType]}{ROUTE_TYPE_SOURCE_TEXT[meta.routeTypeSource] ? ' · ' + ROUTE_TYPE_SOURCE_TEXT[meta.routeTypeSource] : ''}</Text>
            </View>
          )}

          {weather.days && weather.days.length > 0 && (
            <View className="card">
              <Text className="card-quirky-icon">{weather.days[0] && weather.days[0].precipProb > 80 ? '🌧' : '☀️'}</Text>
              <Text className="card-title">天气窗口</Text>
              {weather.elevationCaveat && <Text className="caveat">{weather.elevationCaveat}</Text>}
              {weather.dateOutOfRange && <Text className="caveat">⚠ {weather.dateRangeNote}</Text>}
             {weather.days.map((day, i) => (
                <View key={i} className={`weather-day ${i >= 5 ? 'weather-day-dim' : ''}`}>
                  <Text className="day-date">{this.formatWeatherDate(day.date)}</Text>
                  <Text className="day-temp">{day.tempMin}~{day.tempMax}°C</Text>
                  <Text className="day-precip">降水{day.precipProb}%</Text>
                  <Text className="day-wind">{day.windMs}m/s</Text>
                </View>
              ))}
            </View>
          )}

          <View className="card">
            <Text className="card-quirky-icon">🎒</Text>
            <Text className="card-title">装备清单</Text>
            {gear.essential && gear.essential.length > 0 && (
             <View className="gear-section">
                <Text className="gear-tag gear-tag-essential">必备</Text>
                {gear.essential.map((g, i) => (
                  <View key={i} className="gear-item"><Text className="gear-name">{g.item}</Text><Text className="gear-reason">{g.reason}</Text></View>
                ))}
              </View>
            )}
            {gear.recommended && gear.recommended.length > 0 && (
             <View className="gear-section">
                <Text className="gear-tag gear-tag-recommended">推荐</Text>
                {gear.recommended.map((g, i) => (
                  <View key={i} className="gear-item"><Text className="gear-name">{g.item}</Text><Text className="gear-reason">{g.reason}</Text></View>
                ))}
              </View>
            )}
            {gear.optional && gear.optional.length > 0 && (
             <View className="gear-section">
                <Text className="gear-tag gear-tag-optional">可选</Text>
                {gear.optional.map((g, i) => (
                  <View key={i} className="gear-item"><Text className="gear-name">{g.item}</Text><Text className="gear-reason">{g.reason}</Text></View>
                ))}
              </View>
            )}
            {(!gear.essential || gear.essential.length === 0) && (!gear.recommended || gear.recommended.length === 0) && (
              <Text className="empty-hint">装备清单为空</Text>
            )}
          </View>

          <View className="card">
            <Text className="card-quirky-icon">⚠️</Text>
            <Text className="card-quirky-icon" style="right:60rpx;opacity:0.2;">(•̀_•́)</Text>
            <Text className="card-title">风险提示</Text>
            {risks.length > 0 ? (
             risks.map((r, i) => {
               return (
                 <View key={i} className={`risk-item ${r.level === '致命' ? 'fatal fatal-enter' : ''}`}>
                  <Text className={`risk-level-capsule ${r.level === '致命' ? 'capsule-fatal' : 'capsule-high'}`}>{r.level}</Text>
                   <Text className="risk-name">{r.risk}</Text>
                   <Text className="risk-advice">{r.advice}</Text>
                 </View>
               )
              })
            ) : degraded ? (
              <Text className="risk-advice" style="color:#ff3b30;">AI 不可用，请查专业路书</Text>
            ) : (
              <Text className="empty-hint">暂无风险提示</Text>
            )}
          </View>

          {(photo.sunrise || photo.sunset || photo.goldenHour) && (
            <View className="card">
            <Text className="card-quirky-icon">📷</Text>
            <Text className="card-title">晨昏光影时刻</Text>
            {photo.terrainCaveat && <Text className="caveat">{photo.terrainCaveat}</Text>}
              {weather.dateOutOfRange && <Text className="caveat">⚠ 天文时刻为当下参考值，出发前2-3天请重新查询</Text>}
              <View className="photo-info">
                <View className="info-row"><Text>日出</Text><Text className="info-value">{photo.sunrise || '—'}</Text></View>
                <View className="info-row"><Text>日落</Text><Text className="info-value">{photo.sunset || '—'}</Text></View>
                <View className="info-row"><Text>黄金时刻</Text><Text className="info-value">{photo.goldenHour || '—'}</Text></View>
                <View className="info-row"><Text>蓝调时刻</Text><Text className="info-value">{photo.blueHour || '—'}</Text></View>
              </View>
            </View>
          )}

          <View className="card">
            <Text className="card-title">注意事项</Text>
            {adviceLoading ? (
              <View className="skeleton-lines">
                <View className="sk-line sk-60" />
                <View className="sk-line sk-80" />
              </View>
            ) : notes.length > 0 ? (
              notes.map((n, i) => <Text key={i} className="note-item">{n}</Text>)
            ) : (
              <Text className="empty-hint">暂无注意事项</Text>
            )}
          </View>

          {d.disclaimer && (
            <View className="disclaimer-box">
              <Text className="disclaimer-text">{d.disclaimer}</Text>
            </View>
          )}

          <Button block className="retry-btn" onClick={this.onBack}>返回重新查询</Button>
        </View>
      )
    }

    // ===== 表单视图 =====
    const { levelCaptions, daysBounce } = this.state
    return (
      <View className="container form-screen">
        <View className="form-header">
          <Image src={LogoIcon} className={`brand-logo-top ${loading ? 'header-logo-loading' : ''}`} mode="aspectFit" />
          <Text className="form-title">徒步薯</Text>
          <Text className="form-subtitle">大自然没给你带说明书，我带了</Text>
        </View>

        <View className="form-fields">
          {/* A. 目的地 — 顶部微型标签 + 左对齐输入 */}
          <View className="field-group">
            <Text className="field-label">WHERE · 目的地</Text>
            <Input className="field-input" placeholder="如：武功山" placeholderClass="field-placeholder" value={route} onInput={this.onRouteInput} />
          </View>

          {/* A. 出发日期 — 顶部标签 + Picker */}
          <View className="field-group">
            <Text className="field-label">WHEN · 出发日期</Text>
            <Picker mode="date" start={minDate} value={date} onChange={this.onDateChange}>
              <Text className={`field-value ${date ? '' : 'field-placeholder'}`}>{date || '请选择日期'}</Text>
            </Picker>
          </View>

          <View className="field-group">
            <Text className="field-label">TIME · 每日出发时间</Text>
            <Picker mode="time" value={startTimeLocal} onChange={this.onStartTimeChange}>
              <Text className="field-value">{startTimeLocal || '08:00'}</Text>
            </Picker>
          </View>

          {/* B. 天数步进器 — 紧凑型 - 1天 + */}
          <View className="field-group">
            <Text className="field-label">DURATION · 徒步天数</Text>
            <View className="stepper">
              <View className={`stepper-btn quirky-active ${parseInt(days) <= 1 ? 'stepper-btn-disabled' : ''}`} onClick={parseInt(days) <= 1 ? undefined : this.onDaysDec}>
                <Text className="stepper-btn-text">-</Text>
              </View>
              <View className="stepper-display">
                <Text className={`stepper-num ${daysBounce ? 'stepper-bounce' : ''}`}>{days === '' ? '1' : days}</Text>
                <Text className="stepper-unit">天</Text>
              </View>
              <View className={`stepper-btn quirky-active ${parseInt(days) >= 7 ? 'stepper-btn-disabled' : ''}`} onClick={parseInt(days) >= 7 ? undefined : this.onDaysInc}>
                <Text className="stepper-btn-text">+</Text>
              </View>
            </View>
          </View>

          {/* C. 能力等级 — 分段选择器 + 动态辅助文案 */}
          <View className="field-group">
            <Text className="field-label">LEVEL · 徒步水平</Text>
            <View className="segmented">
              {levels.map((lv, i) => (
                <View
                  key={i}
                  className={`segmented-item ${levelIndex === i ? 'segmented-active' : ''} quirky-active`}
                  onClick={() => this.onLevelSelect(i)}
                >
                  <Text className="segmented-text">{lv}</Text>
                </View>
              ))}
            </View>
            <Text className="field-caption">{levelCaptions[levelIndex]}</Text>
          </View>

          <View className="field-group">
            <Text className="field-label">CLIMB SUPPORT · 仅技术攀登适用</Text>
            <Picker mode="selector" range={climbSupportLabels} value={Math.max(0, this.state.climbSupportOptions.indexOf(climbSupport))} onChange={this.onClimbSupportChange}>
              <Text className="field-value">{climbSupportLabels[Math.max(0, this.state.climbSupportOptions.indexOf(climbSupport))]}</Text>
            </Picker>
          </View>
        </View>

        <Button block type="primary" className="submit-btn quirky-active" onClick={this.onSubmit}>叽里咕噜地看看带点啥</Button>

        <Text className="history-entry quirky-active" onClick={this.onHistoryTap}>历史查询</Text>

        {error && <View className="error-box"><Text>{error}</Text></View>}

        {/* 趣味底部彩蛋 — 简笔画薯仔系鞋带 */}
        <View className="potato-easter-egg">
          <Text className="potato-doodle">╭( ・ㅂ・)و</Text>
          <Text className="potato-doodle-hint">系好鞋带再出发</Text>
        </View>

        <Popup visible={showCandidatePopup} position="bottom" round onClose={this.onCandidateClose} className="candidate-popup">
          <View className="candidate-popup-content">
            <Text className="candidate-popup-title">请选择要查询的路线</Text>
            <Text className="candidate-popup-hint">薯仔不替你猜，选好后再继续查天气和装备</Text>
            {candidates.map((candidate) => (
              <View key={candidate.candidateId} className="candidate-row quirky-active" onClick={() => this.onCandidateSelect(candidate.candidateId)}>
                <Text className="candidate-name">{candidate.canonicalName}</Text>
                <Text className="candidate-region">{candidate.region}</Text>
                <Text className="candidate-type">{candidate.capability === 'place_only' ? '地点级参考' : ROUTE_TYPE_TEXT[candidate.routeType]}</Text>
              </View>
            ))}
            <Button block className="candidate-cancel-btn" onClick={this.onCandidateClose}>取消</Button>
          </View>
        </Popup>

        <Popup visible={showManualCoords} position="bottom" round onClose={this.onManualClose} className="manual-popup">
          <View className="manual-popup-content">
            <Text className="manual-popup-title">{routeTypeRequest ? (routeTypeRequest.resolutionKind === 'catalog_place' ? '请选择地点类型' : '已定位到外部位置，请确认路线类型') : '搜不到路线？输入起点坐标'}</Text>
            <Text className="manual-hint">{routeTypeRequest ? '请明确选择后继续；系统不会默认成徒步' : '在高德地图长按路线起点即可复制坐标'}</Text>
            {(!routeTypeRequest || routeTypeRequest.resolutionKind === 'manual_place') && <View className="coord-row">
              <Input className="coord-input" type="digit" placeholder="纬度 如 27.45" placeholderClass="placeholder" value={manualLat} onInput={(e) => this.setState({ manualLat: e.detail.value })} />
              <Input className="coord-input" type="digit" placeholder="经度 如 114.17" placeholderClass="placeholder" value={manualLon} onInput={(e) => this.setState({ manualLon: e.detail.value })} />
            </View>}
            {(!routeTypeRequest || routeTypeRequest.resolutionKind === 'manual_place') && <Input className="coord-input-wide" type="number" placeholder="海拔（选填，不填自动查询）" placeholderClass="placeholder" value={manualElev} onInput={(e) => this.setState({ manualElev: e.detail.value })} />}
            {/* TP-P0-003：手动坐标必选路线类型；未选择时禁止提交 */}
            <Picker mode="selector" range={routeTypeLabels} value={manualRouteType ? routeTypeOptions.indexOf(manualRouteType) : 0} onChange={this.onManualRouteTypeChange}>
              <View className="coord-input-wide">
                <Text className={manualRouteType ? '' : 'field-placeholder'}>路线类型：{manualRouteType ? ROUTE_TYPE_TEXT[manualRouteType] : '必选（徒步 / 攀登 / 游览）'}</Text>
              </View>
            </Picker>
          <Button block type="primary" className="manual-submit-btn" onClick={this.onManualSubmit}>{routeTypeRequest && routeTypeRequest.resolutionKind !== 'manual_place' ? '确认类型并继续' : '用手动坐标查询'}</Button>
          </View>
        </Popup>

        {showHistory && (
          <PageContainer show={true} position="bottom" round={true} overlay={true} closeOnSlideDown={true} onAfterLeave={() => this.setState({ showHistory: false })} customStyle="height: 70vh;">
            <View className="history-sheet" catchMove>
              <View className="history-drag-bar" />
              <View className="history-title-row">
                <Text className="manual-popup-title">历史查询</Text>
                {historyList.length > 0 && <Text className="history-clear" onClick={this.onClearHistory}>清空</Text>}
              </View>
              {historyError && <View className="history-error-box"><Text>{historyError}</Text></View>}
              <ScrollView scrollY={true} className="history-scroll" catchMove={true} enhanced={true} showScrollbar={false}>
                {historyLoading ? (
                  <Text className="history-empty">薯仔正在翻账本...</Text>
                ) : historyList.length === 0 ? (
                  <Text className="history-empty">还没有记录，去查一次路线吧</Text>
                ) : (
                  historyList.map((item) => (
                    <View key={item.id} className="history-item quirky-active" onClick={() => this.onRestoreHistory(item)}>
                      <View className="history-item-main">
                        <Text className="history-route">{item.route}</Text>
                        <Text className="history-meta">{item.date} · {item.days}天 · {item.level}</Text>
                        {item.elevation && <Text className="history-meta">📍 {item.elevation}m</Text>}
                      </View>
                      <View className="history-item-actions">
                        <Text className="history-summary">{item.summary || ''}</Text>
                        <Text className="history-delete" onClick={(event) => this.onDeleteHistory(item.id, event)}>删除</Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </PageContainer>
        )}
      </View>
    )
  }
}
