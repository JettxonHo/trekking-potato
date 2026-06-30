import { Component } from 'react'
import { View, Text, Input, Picker, Image, ScrollView, PageContainer } from '@tarojs/components'
import LogoIcon from '../../assets/new_logo.png'
import { Button, Cell, CellGroup, Tag, Skeleton, Popup } from '@nutui/nutui-react-taro'
import Taro from '@tarojs/taro'
import './index.css'
import '../../styles/nutui-override.css'

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

export default class Index extends Component {
  state = {
    route: '',
    date: '',
    level: '中级',
    days: 1,
    levels: ['小白', '中级', '老手'],
    levelCaptions: ['适合无经验者，路线以平路为主', '有一定经验，单日 10-20km 含爬升', '强驴专属，地形复杂，需强户外自理能力'],
    levelIndex: 1,
    minDate: '',
    loading: false,
    loadingStage: '',
    error: null,
    showResult: false,
    result: null,
    adviceLoading: false,
    showManualCoords: false,
    manualLat: '',
    manualLon: '',
    manualElev: '',
    funnyMsg: '',
    daysBounce: false,
    showHistory: false,
    historyList: [],
    historyLoading: false,
  }

  componentDidMount() {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    this.setState({ minDate: `${y}-${m}-${day}` })
  }

  onRouteInput = (e) => this.setState({ route: e.detail.value })
  onDateChange = (e) => this.setState({ date: e.detail.value })

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
    const { route, date, level, days } = this.state
    if (!route.trim()) { Taro.showToast({ title: '请输入路线名', icon: 'none' }); return }
    if (!date) { Taro.showToast({ title: '请选择出发日期', icon: 'none' }); return }
    const tripDays = Math.max(1, Math.min(7, parseInt(days) || 1))
    this._submitBase({ route: route.trim(), date, level, days: tripDays })
  }

  onManualSubmit = () => {
    const { route, date, level, days, manualLat, manualLon, manualElev } = this.state
    const lat = parseFloat(manualLat)
    const lon = parseFloat(manualLon)
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      Taro.showToast({ title: '经纬度格式错误', icon: 'none' }); return
    }
    const tripDays = Math.max(1, Math.min(7, parseInt(days) || 1))
    const elev = parseFloat(manualElev) || 0
    this.setState({ showManualCoords: false })
    this._submitBase({
      route: route.trim() || '手动坐标',
      date, level, days: tripDays,
      manualLat: lat, manualLon: lon,
      manualElevation: elev > 0 ? elev : undefined,
    })
    // UGC 路线共创：手动坐标查询成功后，静默落库供后续用户搜索
    Taro.cloud.callFunction({
      name: 'history',
      data: {
        mode: 'saveRoute',
        route: route.trim() || '手动坐标',
        lat, lon,
       elevation: elev > 0 ? elev : undefined,
       location: route.trim() || 'UGC',
      },
      fail: () => {},
    })
  }

  _startFunnyRotation() {
    this._funnyTimer = setInterval(() => {
      if (this._unmounted || !this.state.adviceLoading) { clearInterval(this._funnyTimer); return }
      const msg = FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)]
      this.setState({ funnyMsg: msg })
    }, 2000)
    this.setState({ funnyMsg: FUNNY_MESSAGES[0] })
  }

  _submitBase(params) {
    this._unmounted = false
    this.setState({ loading: true, error: null, showResult: false, result: null, adviceLoading: false, showManualCoords: false, loadingStage: '薯仔正在查询路线位置...' })
    Taro.cloud.callFunction({
      name: 'getAdvice',
      data: { ...params, mode: 'base' },
      success: (res) => {
        if (this._unmounted) return
        const result = res.result
        if (!result || !result.ok) {
          const isLocationFail = result && result.error === 'location_failed'
          this.setState({ loading: false, error: (result && result.message) || '路线查询失败', showManualCoords: isLocationFail })
          return
        }
        const base = result.data
        this.setState({
          loading: false,
          showResult: true,
          result: {
            weatherWindow: base.weather,
            photoTiming: base.sunEvents,
            gear: { essential: [], recommended: [], optional: [] },
            risks: [],
            notes: [],
            meta: { elevation: base.elevation, location: base.location, coords: base.coords },
          },
          adviceLoading: true,
        })
        this._adviceSteps = ['薯仔正在分析天气窗口...', '薯仔正在匹配装备清单...', '薯仔正在评估风险等级...', '薯仔正在生成行前建议...']
        this._adviceStepIdx = 0
        this._adviceStepTimer = setInterval(() => {
          if (this._unmounted || !this.state.adviceLoading) { clearInterval(this._adviceStepTimer); return }
          this._adviceStepIdx = (this._adviceStepIdx + 1) % this._adviceSteps.length
          this.setState({ adviceStage: this._adviceSteps[this._adviceStepIdx] })
        }, 1800)
        this.setState({ adviceStage: this._adviceSteps[0] })
        this._startFunnyRotation()
        this._fetchAdvice({ ...params, baseData: base })
      },
      fail: (err) => {
        if (this._unmounted) return
        this.setState({ loading: false, error: '云函数调用失败，请检查 getAdvice 是否已部署' })
        console.error('[徒步薯] base callFunction fail', err)
      }
    })
  }

  _fetchAdvice(params) {
    Taro.cloud.callFunction({
      name: 'getAdvice',
      data: { ...params, mode: 'advice' },
      success: (res) => {
        if (this._unmounted) return
        if (this._adviceStepTimer) clearInterval(this._adviceStepTimer)
        if (this._funnyTimer) clearInterval(this._funnyTimer)
        const result = res.result
        if (result && result.ok) {
          const d = result.data
          this.setState((prev) => ({
            adviceLoading: false,
            funnyMsg: '',
    daysBounce: false,
            result: {
              ...prev.result,
              gear: d.gear || prev.result.gear,
              risks: d.risks || [],
              notes: d.notes || [],
              degraded: d.degraded === true,
              photoTiming: d.photoTiming || prev.result.photoTiming,
              disclaimer: d.disclaimer,
              meta: { ...prev.result.meta, ...d.meta },
            },
         }))
          this._saveHistory(params, {
            risks: d.risks || [],
            degraded: d.degraded === true,
            meta: { ...((this.state.result && this.state.result.meta) || {}), ...d.meta },
          })
        } else {
          this.setState({ adviceLoading: false, funnyMsg: '',
    daysBounce: false, error: 'AI 建议生成失败' })
        }
      },
      fail: (err) => {
        if (this._unmounted) return
        if (this._adviceStepTimer) clearInterval(this._adviceStepTimer)
        if (this._funnyTimer) clearInterval(this._funnyTimer)
        this.setState((prev) => ({
          adviceLoading: false,
          funnyMsg: '',
    daysBounce: false,
          result: {
            ...prev.result,
            degraded: true,
            notes: ['AI 建议超时，以下为天气基础数据。请重试或查阅专业路书。'],
          },
        }))
        console.error('[徒步薯] advice callFunction fail', err)
      }
    })
  }

  onBack = () => this.setState({ showResult: false })

  // ===== 历史记录 =====
  // 防写风暴：hash 对比，相同参数不重复写库
  _saveHistory(params, resultData) {
    const hash = params.route + params.date + params.days + params.level
    if (this._lastHistoryHash === hash) return
    this._lastHistoryHash = hash

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
        summary,
        degraded: resultData.degraded === true,
      },
      fail: () => {},  // 静默失败，不阻塞用户
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
    this.setState({ showHistory: true, historyLoading: true, historyList: [] })
    Taro.cloud.callFunction({
      name: 'history',
      data: { mode: 'list', limit: 20 },
      success: (res) => {
        if (this._unmounted) return
        const result = res.result
        this.setState({ historyLoading: false, historyList: (result && result.ok && result.data) || [] })
      },
      fail: () => {
        if (this._unmounted) return
        this.setState({ historyLoading: false })
      }
    })
  }

  onRestoreHistory = (record) => {
    // 日期过期校验：历史日期 < 今日 → 重置为今日
    const restoreDate = this._isDateExpired(record.date) ? this.state.minDate : record.date
    this.setState({
      route: record.route || '',
      date: restoreDate,
      days: record.days || 1,
      level: record.level || '中级',
      levelIndex: ['小白', '中级', '老手'].indexOf(record.level || '中级'),
      showHistory: false,
    })
  }

  componentWillUnmount() {
    this._unmounted = true
    if (this._adviceStepTimer) clearInterval(this._adviceStepTimer)
    if (this._funnyTimer) clearInterval(this._funnyTimer)
  }

  render() {
    const { route, date, days, levels, levelIndex, minDate, loading, loadingStage, error, showResult, result, adviceLoading, showManualCoords, manualLat, manualLon, manualElev, showHistory, historyList, historyLoading } = this.state
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
            {adviceLoading ? (
              <View className="skeleton-lines">
                <View className="sk-line sk-40" />
                <View className="sk-line sk-85" />
                <View className="sk-line sk-60" />
              </View>
            ) : (
              <>
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
              </>
            )}
          </View>

          <View className="card">
            <Text className="card-quirky-icon">⚠️</Text>
            <Text className="card-quirky-icon" style="right:60rpx;opacity:0.2;">(•̀_•́)</Text>
            <Text className="card-title">风险提示</Text>
            {adviceLoading ? (
              <View className="skeleton-lines">
                <View className="sk-line sk-70" />
                <View className="sk-line sk-50" />
              </View>
            ) : risks.length > 0 ? (
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
        </View>

        <Button block type="primary" className="submit-btn quirky-active" onClick={this.onSubmit}>叽里咕噜地看看带点啥</Button>

        <Text className="history-entry quirky-active" onClick={this.onHistoryTap}>历史查询</Text>

        {error && <View className="error-box"><Text>{error}</Text></View>}

        {/* 趣味底部彩蛋 — 简笔画薯仔系鞋带 */}
        <View className="potato-easter-egg">
          <Text className="potato-doodle">╭( ・ㅂ・)و</Text>
          <Text className="potato-doodle-hint">系好鞋带再出发</Text>
        </View>

        <Popup visible={showManualCoords} position="bottom" round onClose={() => this.setState({ showManualCoords: false })} className="manual-popup">
          <View className="manual-popup-content">
            <Text className="manual-popup-title">搜不到路线？输入起点坐标</Text>
            <Text className="manual-hint">在高德地图长按路线起点即可复制坐标</Text>
            <View className="coord-row">
              <Input className="coord-input" type="digit" placeholder="纬度 如 27.45" placeholderClass="placeholder" value={manualLat} onInput={(e) => this.setState({ manualLat: e.detail.value })} />
              <Input className="coord-input" type="digit" placeholder="经度 如 114.17" placeholderClass="placeholder" value={manualLon} onInput={(e) => this.setState({ manualLon: e.detail.value })} />
            </View>
            <Input className="coord-input-wide" type="number" placeholder="海拔（选填，不填自动查询）" placeholderClass="placeholder" value={manualElev} onInput={(e) => this.setState({ manualElev: e.detail.value })} />
          <Button block type="primary" className="manual-submit-btn" onClick={this.onManualSubmit}>用手动坐标查询</Button>
          </View>
        </Popup>

        {showHistory && (
          <PageContainer show={true} position="bottom" round={true} overlay={true} closeOnSlideDown={true} onAfterLeave={() => this.setState({ showHistory: false })} customStyle="height: 70vh;">
            <View className="history-sheet" catchMove>
              <View className="history-drag-bar" />
            <Text className="manual-popup-title">历史查询</Text>
              <ScrollView scrollY={true} className="history-scroll" catchMove={true} enhanced={true} showScrollbar={false}>
                {historyLoading ? (
                  <Text className="history-empty">薯仔正在翻账本...</Text>
                ) : historyList.length === 0 ? (
                  <Text className="history-empty">还没有记录，去查一次路线吧</Text>
                ) : (
                  historyList.map((item, i) => (
                    <View key={i} className="history-item quirky-active" onClick={() => this.onRestoreHistory(item)}>
                      <View className="history-item-main">
                        <Text className="history-route">{item.route}</Text>
                        <Text className="history-meta">{item.date} · {item.days}天 · {item.level}</Text>
                        {item.elevation && <Text className="history-meta">📍 {item.elevation}m</Text>}
                      </View>
                      <Text className="history-summary">{item.summary || ''}</Text>
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
