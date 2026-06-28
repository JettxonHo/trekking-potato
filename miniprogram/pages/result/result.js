var app = getApp()

Page({
  data: {
    loading: true,
    hasData: false,
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
  },

  onReady: function () {
    this.loadData()
  },

  loadData: function () {
    var result = null

    try {
      result = app.globalData.adviceResult
    } catch (e) {}

    if (!result) {
      try {
        result = wx.getStorageSync('adviceResult')
      } catch (e) {}
    }

    if (!result) {
      this.setData({ loading: false, hasData: false })
      return
    }

    var d = result.data || result
    var that = this

    // 逐个字段安全设置，避免一次性传大对象
    var updates = {
      loading: false,
      hasData: true,
      degraded: result.degraded === true || d.degraded === true,
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
    }

    // 安全提取 meta
    if (d.meta && typeof d.meta === 'object' && typeof d.meta.elevation === 'number') {
      updates.elevation = d.meta.elevation
    }

    // 天气
    if (d.weatherWindow && typeof d.weatherWindow === 'object') {
      if (Array.isArray(d.weatherWindow.days)) {
        updates.weatherDays = d.weatherWindow.days
      }
      if (d.weatherWindow.elevationCaveat) {
        updates.weatherCaveat = d.weatherWindow.elevationCaveat
      }
    }

    // 装备
    if (d.gear && typeof d.gear === 'object') {
      updates.gearEssential = Array.isArray(d.gear.essential) ? d.gear.essential : []
      updates.gearRecommended = Array.isArray(d.gear.recommended) ? d.gear.recommended : []
      updates.gearOptional = Array.isArray(d.gear.optional) ? d.gear.optional : []
    }

    // 风险
    if (Array.isArray(d.risks)) {
      updates.risks = d.risks
    }

    // 注意事项
    if (Array.isArray(d.notes)) {
      updates.notes = d.notes
    }

    // 出片时机
    if (d.photoTiming && typeof d.photoTiming === 'object') {
      updates.photoTiming = d.photoTiming
    }

    // 微气候
    if (d.microclimate && typeof d.microclimate === 'object') {
      updates.microclimate = d.microclimate
    }

    // 免责声明
    if (typeof d.disclaimer === 'string') {
      updates.disclaimer = d.disclaimer
    }

    this.setData(updates)
  },

  onRetry: function () {
    wx.navigateBack()
  },
})
