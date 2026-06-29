import { Component } from 'react'
import { View, Text, Input, Picker, Button, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.css'

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
    adviceLoading: false
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
    // 不实时 clamp，允许用户正常输入数字（实时 clamp 会吞掉输入中间态）
    const raw = e.detail.value
    if (raw === '') { this.setState({ days: '', daysRaw: '' }); return }
    const num = parseInt(raw)
    if (!isNaN(num)) this.setState({ days: num, daysRaw: raw })
  }

  onSubmit = () => {
    const { route, date, level, days } = this.state
    if (!route.trim()) { Taro.showToast({ title: '请输入路线名', icon: 'none' }); return }
    if (!date) { Taro.showToast({ title: '请选择出发日期', icon: 'none' }); return }

    // 提交时校验天数（1-7）
    const tripDays = Math.max(1, Math.min(7, parseInt(days) || 1))
    this._unmounted = false
    this.setState({ loading: true, error: null, showResult: false, result: null, adviceLoading: false, loadingStage: '正在查询路线位置...' })

    // ===== 分步加载 P5.3 =====
    // 第一阶段：geo + weather + sun（~3-5s，秒回天气）
    Taro.cloud.callFunction({
      name: 'getAdvice',
      data: { route: route.trim(), date, level, days: tripDays, mode: 'base' },
      success: (res) => {
        if (this._unmounted) return
        const result = res.result
        if (!result || !result.ok) {
          this.setState({ loading: false, error: (result && result.message) || '路线查询失败' })
          return
        }
        // 天气数据到手，立即渲染结果页（装备/风险栏留空待填充）
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
        // 第二阶段：GLM 建议（~30-40s，独立调用）
        this._fetchAdvice({ route: route.trim(), date, level, days: tripDays, baseData: base })
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
        const result = res.result
        if (result && result.ok) {
          // 用 GLM 结果增量更新（天气保留 base 的，装备/风险/注意事项用 GLM 的）
          const d = result.data
          this.setState((prev) => ({
            adviceLoading: false,
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
          this.setState({ adviceLoading: false, error: 'AI 建议生成失败' })
        }
      },
      fail: (err) => {
        if (this._unmounted) return
        // GLM 超时不影响已展示的天气数据
        this.setState((prev) => ({
          adviceLoading: false,
          result: {
            ...prev.result,
            degraded: true,
            notes: ['AI 建议生成超时，以下为天气基础数据。请重试或查阅专业路书。'],
          },
        }))
        console.error('[徒步薯] advice callFunction fail', err)
      }
    })
  }

  onBack = () => this.setState({ showResult: false })

  componentWillUnmount() { this._unmounted = true }

  render() {
    const { route, date, level, days, levels, levelIndex, minDate, loading, loadingStage, error, showResult, result, adviceLoading } = this.state

    if (loading) {
      return (
        <View className="container loading-screen">
          <View className="spinner" />
        <Text className="loading-text">{loadingStage}</Text>
          <Text className="loading-hint">正在获取天气数据...</Text>
        </View>
      )
    }

    if (showResult && result) {
      const d = result
      const degraded = d.degraded === true
      const meta = d.meta || {}
      const weather = d.weatherWindow || {}
      const gear = d.gear || {}
      const risks = d.risks || []
      const notes = d.notes || []
      const photo = d.photoTiming || {}
      const micro = d.microclimate || {}

      return (
        <View className="container result-container">
          {adviceLoading && (
            <View className="advice-loading-bar">
              <View className="spinner-small" />
              <Text>AI 正在生成装备建议和风险分析（约需 30-50 秒）...</Text>
            </View>
          )}

          {degraded && (
            <View className="degraded-banner">
              <Text>AI 生成失败，以下为基础参考</Text>
            </View>
          )}

          {meta.elevation && (
            <View className="elevation-bar">
              <Text>📍 海拔 {meta.elevation}m</Text>
            </View>
          )}

          {weather.days && weather.days.length > 0 && (
            <View className="card">
              <Text className="card-title">🌤 天气窗口</Text>
              {weather.elevationCaveat && <Text className="caveat">{weather.elevationCaveat}</Text>}
              {weather.days.map((day, i) => (
                <View key={i} className="weather-day">
                  <Text className="day-date">{day.date}</Text>
                  <Text className="day-temp">{day.tempMin}~{day.tempMax}°C</Text>
                  <Text className="day-precip">降水{day.precipProb}%</Text>
                  <Text className="day-wind">{day.windMs}m/s</Text>
                </View>
              ))}
            </View>
          )}

          <View className="card">
            <Text className="card-title">🎒 装备清单</Text>
            {gear.essential && gear.essential.length > 0 && (
              <View className="gear-section">
                <Text className="gear-label essential-label">必备</Text>
                {gear.essential.map((g, i) => (
                  <View key={i} className="gear-item"><Text className="gear-name">{g.item}</Text><Text className="gear-reason">{g.reason}</Text></View>
                ))}
              </View>
            )}
            {gear.recommended && gear.recommended.length > 0 && (
              <View className="gear-section">
                <Text className="gear-label">推荐</Text>
                {gear.recommended.map((g, i) => (
                  <View key={i} className="gear-item"><Text className="gear-name">{g.item}</Text><Text className="gear-reason">{g.reason}</Text></View>
                ))}
              </View>
            )}
            {gear.optional && gear.optional.length > 0 && (
              <View className="gear-section">
                <Text className="gear-label optional-label">可选</Text>
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
            <Text className="card-title">⚠️ 风险提示</Text>
            {risks.length > 0 ? risks.map((r, i) => (
              <View key={i} className={`risk-item ${r.level === '致命' ? 'fatal' : ''}`}>
                <Text className={`risk-level ${r.level === '致命' ? 'fatal-tag' : ''}`}>{r.level}</Text>
                <Text className="risk-name">{r.risk}</Text>
                <Text className="risk-advice">{r.advice}</Text>
              </View>
            )) : degraded ? (
              <Text className="risk-degraded">AI 不可用，请查专业路书</Text>
            ) : (
              <Text className="empty-hint">暂无风险提示</Text>
            )}
          </View>

          {photo.sunrise && (
            <View className="card">
              <Text className="card-title">📷 出片时机</Text>
              <View className="info-row"><Text>日出</Text><Text>{photo.sunrise || '—'}</Text></View>
              <View className="info-row"><Text>日落</Text><Text>{photo.sunset || '—'}</Text></View>
              <View className="info-row"><Text>黄金时刻</Text><Text>{photo.goldenHour || '—'}</Text></View>
              <View className="info-row"><Text>蓝调时刻</Text><Text>{photo.blueHour || '—'}</Text></View>
            </View>
          )}

          {notes.length > 0 && (
            <View className="card">
              <Text className="card-title">📋 注意事项</Text>
              {notes.map((n, i) => <Text key={i} className="note-item">{n}</Text>)}
            </View>
          )}

          {d.disclaimer && <View className="disclaimer-box"><Text className="disclaimer-text">{d.disclaimer}</Text></View>}

          <Button onClick={this.onBack} className="retry-btn">返回重新查询</Button>
        </View>
      )
    }

    // 表单视图
    return (
      <View className="container form-screen">
        <View className="header">
          <Text className="title">徒步薯</Text>
          <Text className="subtitle">徒步行前建议助手</Text>
        </View>

        <View className="form">
          <View className="form-item">
            <Text className="label">路线名</Text>
            <Input className="input" placeholder="如：武功山" value={route} onInput={this.onRouteInput} />
          </View>
          <View className="form-item">
            <Text className="label">出发日期</Text>
            <Picker mode="date" start={minDate} value={date} onChange={this.onDateChange}>
              <Text className={`picker ${date ? '' : 'placeholder'}`}>{date || '请选择日期'}</Text>
            </Picker>
          </View>
          <View className="form-item">
            <Text className="label">天数</Text>
            <Input className="input" type="number" placeholder="1-7" value={days === '' ? '' : String(days)} onInput={this.onDaysChange} />
          </View>
          <View className="form-item">
            <Text className="label">徒步水平</Text>
            <Picker mode="selector" range={levels} value={levelIndex} onChange={this.onLevelChange}>
              <Text className="picker">{levels[levelIndex]}</Text>
            </Picker>
          </View>
        </View>

        <Button type="primary" onClick={this.onSubmit} className="submit-btn">获取行前建议</Button>

        {error && <View className="error-box"><Text>{error}</Text></View>}
      </View>
    )
  }
}
