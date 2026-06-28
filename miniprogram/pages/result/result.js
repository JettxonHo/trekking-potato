const app = getApp()

Page({
  data: {
    result: null,
    loading: true,
    elevation: null,
    degraded: false,
    weather: null,
    gear: null,
    risks: null,
    notes: null,
    photoTiming: null,
    microclimate: null,
    disclaimer: '',
    meta: null,
  },

  onLoad() {
    const result = app.globalData.adviceResult
    if (!result) {
      this.setData({ loading: false })
      wx.showToast({ title: '无数据', icon: 'none' })
      return
    }

    const d = result.data || result

    this.setData({
      loading: false,
      result,
      degraded: result.degraded || d.degraded || false,
      elevation: d.meta ? d.meta.elevation : null,
      weather: d.weatherWindow || null,
      gear: d.gear || null,
      risks: d.risks || [],
      notes: d.notes || [],
      photoTiming: d.photoTiming || null,
      microclimate: d.microclimate || null,
      disclaimer: d.disclaimer || '',
      meta: d.meta || null,
    })
  },

  onRetry() {
    wx.navigateBack()
  },
})
