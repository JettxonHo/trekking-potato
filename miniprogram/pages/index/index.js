Page({
  data: {
    // 表单
    route: '',
    date: '',
    level: '中级',
    days: 1,
    levels: ['初级', '中级', '高级'],
    levelIndex: 1,
    minDate: '',
    // 状态
    loading: false,
    loadingStage: '',
    error: null,
    showResult: false,
    // 结果数据（扁平化）
    degraded: false,
    elevation: null,
    weatherDays: [],
    weatherCaveat: '',
    gearEssential: [],
    gearRecommended: [],
    gearOptional: [],
    risks: [],
    notes: [],
    photoTiming: null,
    microclimate: null,
    disclaimer: '',
    meta: null,
  },

  onLoad: function () {
    var today = new Date()
    this.setData({
      minDate: today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0')
    })
  },

  onRouteInput: function (e) { this.setData({ route: e.detail.value }) },
  onDateChange: function (e) { this.setData({ date: e.detail.value }) },
  onLevelChange: function (e) {
    this.setData({ levelIndex: parseInt(e.detail.value), level: this.data.levels[e.detail.value] })
  },
  onDaysChange: function (e) {
    this.setData({ days: Math.max(1, Math.min(7, parseInt(e.detail.value) || 1)) })
  },

  onSubmit: function () {
    var that = this
    var route = this.data.route.trim()
    var date = this.data.date
    var level = this.data.level
    var days = this.data.days

    if (!route) { wx.showToast({ title: '请输入路线名', icon: 'none' }); return }
    if (!date) { wx.showToast({ title: '请选择出发日期', icon: 'none' }); return }

    // 重置结果状态
    this.setData({
      loading: true, error: null, showResult: false, loadingStage: '正在查询路线位置...'
    })

    this._t1 = setTimeout(function () { if (that.data.loading) that.setData({ loadingStage: '获取天气数据中...' }) }, 3000)
    this._t2 = setTimeout(function () { if (that.data.loading) that.setData({ loadingStage: 'AI 正在生成建议...' }) }, 7000)

    wx.cloud.callFunction({
      name: 'getAdvice',
      data: { route: route, date: date, level: level, days: days },
      success: function (res) {
        clearTimeout(that._t1); clearTimeout(that._t2)
        var result = res.result
        if (result && result.needsConfirm) {
          wx.showModal({
            title: '路线确认', content: result.message || '确认路线？',
            confirmText: '确认', cancelText: '重输',
            success: function (m) {
              if (m.confirm) { that.handleResult(result) }
              else { that.setData({ loading: false }) }
            }
          })
        } else if (result && result.ok) {
          that.handleResult(result)
        } else {
          that.setData({ loading: false, error: (result && result.message) || '获取建议失败' })
        }
      },
      fail: function (err) {
        clearTimeout(that._t1); clearTimeout(that._t2)
        that.setData({ loading: false, error: '网络错误，请重试' })
      }
    })
  },

  handleResult: function (result) {
    var d = result.data || result
    var meta = (d.meta && typeof d.meta === 'object') ? d.meta : {}

    // 安全提取所有字段，一次性 setData
    this.setData({
      loading: false,
      showResult: true,
      degraded: result.degraded === true || d.degraded === true,
      elevation: (typeof meta.elevation === 'number') ? meta.elevation : null,
      weatherDays: (d.weatherWindow && Array.isArray(d.weatherWindow.days)) ? d.weatherWindow.days : [],
      weatherCaveat: (d.weatherWindow && d.weatherWindow.elevationCaveat) ? d.weatherWindow.elevationCaveat : '',
      gearEssential: (d.gear && Array.isArray(d.gear.essential)) ? d.gear.essential : [],
      gearRecommended: (d.gear && Array.isArray(d.gear.recommended)) ? d.gear.recommended : [],
      gearOptional: (d.gear && Array.isArray(d.gear.optional)) ? d.gear.optional : [],
      risks: Array.isArray(d.risks) ? d.risks : [],
      notes: Array.isArray(d.notes) ? d.notes : [],
      photoTiming: (d.photoTiming && typeof d.photoTiming === 'object') ? d.photoTiming : null,
      microclimate: (d.microclimate && typeof d.microclimate === 'object') ? d.microclimate : null,
      disclaimer: (typeof d.disclaimer === 'string') ? d.disclaimer : '',
      meta: meta,
    })
  },

  onBack: function () {
    this.setData({ showResult: false })
  },

  onUnload: function () {
    clearTimeout(this._t1); clearTimeout(this._t2)
  }
})
