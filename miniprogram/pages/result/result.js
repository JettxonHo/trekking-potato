const app = getApp()

Page({
  data: {
    loading: true,
    degraded: false,
    elevation: null,
    weather: null,
    gear: { essential: [], recommended: [], optional: [] },
    risks: [],
    notes: [],
    photoTiming: null,
    microclimate: null,
    disclaimer: '',
    meta: null,
  },

  onLoad() {
    const result = app.globalData.adviceResult

    if (!result) {
      this.setData({ loading: false })
      return
    }

    // 安全提取数据，避免 undefined 传入 setData
    const d = result.data || result

    const weather = (d.weatherWindow && typeof d.weatherWindow === 'object') ? d.weatherWindow : null
    const gear = (d.gear && typeof d.gear === 'object') ? {
      essential: Array.isArray(d.gear.essential) ? d.gear.essential : [],
      recommended: Array.isArray(d.gear.recommended) ? d.gear.recommended : [],
      optional: Array.isArray(d.gear.optional) ? d.gear.optional : [],
    } : { essential: [], recommended: [], optional: [] }
    const risks = Array.isArray(d.risks) ? d.risks : []
    const notes = Array.isArray(d.notes) ? d.notes : []
    const photoTiming = (d.photoTiming && typeof d.photoTiming === 'object') ? d.photoTiming : null
    const microclimate = (d.microclimate && typeof d.microclimate === 'object') ? d.microclimate : null
    const meta = (d.meta && typeof d.meta === 'object') ? d.meta : null

    this.setData({
      loading: false,
      degraded: result.degraded === true || d.degraded === true,
      elevation: (meta && typeof meta.elevation === 'number') ? meta.elevation : null,
      weather: weather,
      gear: gear,
      risks: risks,
      notes: notes,
      photoTiming: photoTiming,
      microclimate: microclimate,
      disclaimer: typeof d.disclaimer === 'string' ? d.disclaimer : '',
      meta: meta,
    })
  },

  onRetry() {
    wx.navigateBack()
  },
})
