import { Component } from 'react'
import { View, Text, Input, Picker } from '@tarojs/components'
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
    levels: ['初级', '中级', '高级'],
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
  onLevelChange = (e) => this.setState({ levelIndex: e.detail.value, level: this.state.levels[e.detail.value] })
  onDaysChange = (e) => {
    const raw = e.detail.value
    if (raw === '') { this.setState({ days: '' }); return }
    const num = parseInt(raw)
    if (!isNaN(num)) this.setState({ days: num })
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
        } else {
          this.setState({ adviceLoading: false, funnyMsg: '', error: 'AI 建议生成失败' })
        }
      },
      fail: (err) => {
        if (this._unmounted) return
        if (this._adviceStepTimer) clearInterval(this._adviceStepTimer)
        if (this._funnyTimer) clearInterval(this._funnyTimer)
        this.setState((prev) => ({
          adviceLoading: false,
          funnyMsg: '',
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

  componentWillUnmount() {
    this._unmounted = true
    if (this._adviceStepTimer) clearInterval(this._adviceStepTimer)
    if (this._funnyTimer) clearInterval(this._funnyTimer)
  }

  render() {
    const { route, date, days, levels, levelIndex, minDate, loading, loadingStage, error, showResult, result, adviceLoading, showManualCoords, manualLat, manualLon, manualElev } = this.state
    const adviceStage = this.state.adviceStage || '薯仔正在生成建议...'
    const funnyMsg = this.state.funnyMsg

    // ===== Loading 视图（Skeleton 骨架屏 + 薯仔） =====
    if (loading) {
      return (
        <View className="container loading-screen">
          <Text className="loading-potato">🥔</Text>
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
            <View className="advice-loading-bar">
              <View className="spinner-small" />
              <Text>{adviceStage}</Text>
            </View>
          )}

          {funnyMsg && adviceLoading && (
            <Text className="loading-funny" style="display:block;text-align:center;margin-bottom:20rpx;">{funnyMsg}</Text>
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
                <View key={i} className="weather-day">
                  <Text className="day-date">{day.date}</Text>
                  <Text className="day-temp">{day.tempMin}~{day.tempMax}°C</Text>
                  <Text className="day-precip">降水{day.precipProb}%</Text>
                  <Text className="day-wind">{day.windMs}m/s</Text>
                  {day.confidence === '参考' && <Text className="day-confidence">参考</Text>}
                </View>
              ))}
            </View>
          )}

          <View className="card">
            <Text className="card-quirky-icon">🎒</Text>
            <Text className="card-title">装备清单</Text>
            {adviceLoading ? (
              <View className="skeleton-inline">
                <Skeleton rows={4} animated block />
              </View>
            ) : (
              <>
                {gear.essential && gear.essential.length > 0 && (
                  <View className="gear-section">
                    <Tag type="danger" className="gear-label-tag">必备</Tag>
                    {gear.essential.map((g, i) => (
                      <View key={i} className="gear-item"><Text className="gear-name">{g.item}</Text><Text className="gear-reason">{g.reason}</Text></View>
                    ))}
                  </View>
                )}
                {gear.recommended && gear.recommended.length > 0 && (
                  <View className="gear-section">
                    <Tag className="gear-label-tag gear-tag-dark">推荐</Tag>
                    {gear.recommended.map((g, i) => (
                      <View key={i} className="gear-item"><Text className="gear-name">{g.item}</Text><Text className="gear-reason">{g.reason}</Text></View>
                    ))}
                  </View>
                )}
                {gear.optional && gear.optional.length > 0 && (
                  <View className="gear-section">
                    <Tag className="gear-label-tag gear-tag-gray">可选</Tag>
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
            <Text className="card-title">风险提示</Text>
            {adviceLoading ? (
              <View className="skeleton-inline">
                <Skeleton rows={3} animated block />
              </View>
            ) : risks.length > 0 ? (
              risks.map((r, i) => {
                const tagType = r.level === '致命' ? 'danger' : 'warning'
                return (
                  <View key={i} className={`risk-item ${r.level === '致命' ? 'fatal fatal-enter' : ''}`}>
                    <Tag type={tagType} className="risk-level-tag">{r.level}</Tag>
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

          {photo.sunrise && (
            <View className="card">
              <Text className="card-quirky-icon">📷</Text>
              <Text className="card-title">出片时机</Text>
              {photo.terrainCaveat && <Text className="caveat">{photo.terrainCaveat}</Text>}
              <CellGroup className="photo-info-group">
                <Cell title="日出" value={photo.sunrise || '—'} className="photo-cell" />
                <Cell title="日落" value={photo.sunset || '—'} className="photo-cell" />
                <Cell title="黄金时刻" value={photo.goldenHour || '—'} className="photo-cell" />
                <Cell title="蓝调时刻" value={photo.blueHour || '—'} className="photo-cell" />
              </CellGroup>
            </View>
          )}

          {notes.length > 0 && (
            <View className="card">
              <Text className="card-title">注意事项</Text>
              {notes.map((n, i) => <Text key={i} className="note-item">{n}</Text>)}
            </View>
          )}

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
    return (
      <View className="container form-screen">
        <View className="header">
          <Text className="title">徒步薯 🥔</Text>
          <Text className="subtitle">徒步行前建议助手</Text>
        </View>

        <CellGroup className="form-card">
          <Cell title="路线名" className="form-cell">
            <Input className="form-input" placeholder="如：武功山" placeholderClass="placeholder" value={route} onInput={this.onRouteInput} />
          </Cell>
          <Cell title="出发日期" className="form-cell" onClick={() => {}}>
            <Picker mode="date" start={minDate} value={date} onChange={this.onDateChange}>
              <Text className={`form-value ${date ? '' : 'placeholder'}`}>{date || '请选择日期'}</Text>
            </Picker>
          </Cell>
          <Cell title="天数" className="form-cell">
            <Input className="form-input" type="number" placeholder="1-7" placeholderClass="placeholder" value={days === '' ? '' : String(days)} onInput={this.onDaysChange} />
          </Cell>
          <Cell title="徒步水平" className="form-cell" onClick={() => {}}>
            <Picker mode="selector" range={levels} value={levelIndex} onChange={this.onLevelChange}>
              <Text className="form-value">{levels[levelIndex]}</Text>
            </Picker>
          </Cell>
        </CellGroup>

        <Button block type="primary" className="submit-btn" onClick={this.onSubmit}>获取行前建议</Button>

        {error && <View className="error-box"><Text>{error}</Text></View>}

        <Popup visible={showManualCoords} position="bottom" round onClose={() => this.setState({ showManualCoords: false })} className="manual-popup">
          <View className="manual-popup-content">
            <Text className="manual-popup-title">搜不到路线？输入起点坐标 🥔</Text>
            <Text className="manual-hint">在高德地图长按路线起点即可复制坐标</Text>
            <View className="coord-row">
              <Input className="coord-input" type="digit" placeholder="纬度 如 27.45" placeholderClass="placeholder" value={manualLat} onInput={(e) => this.setState({ manualLat: e.detail.value })} />
              <Input className="coord-input" type="digit" placeholder="经度 如 114.17" placeholderClass="placeholder" value={manualLon} onInput={(e) => this.setState({ manualLon: e.detail.value })} />
            </View>
            <Input className="coord-input-wide" type="number" placeholder="海拔（选填，不填自动查询）" placeholderClass="placeholder" value={manualElev} onInput={(e) => this.setState({ manualElev: e.detail.value })} />
            <Button block type="primary" className="manual-submit-btn" onClick={this.onManualSubmit}>用手动坐标查询</Button>
          </View>
        </Popup>
      </View>
    )
  }
}
