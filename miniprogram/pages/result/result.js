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

  onLoad: function () {
    var result = null

    // 优先从 globalData 读取
    try {
      var app = getApp()
      result = app.globalData.adviceResult
    } catch (e) {
      console.error('读取 globalData 失败:', e)
    }

    // 如果 globalData 没有，从 storage 读取（备份方案）
    if (!result) {
      try {
        result = wx.getStorageSync('adviceResult')
      } catch (e) {
        console.error('读取 storage 失败:', e)
      }
    }

    if (!result) {
      this.setData({ loading: false })
      return
    }

    // 安全提取数据
    var d = result.data || result
    var meta = (d.meta && typeof d.meta === 'object') ? d.meta : {}

    var weather = null
    if (d.weatherWindow && typeof d.weatherWindow === 'object') {
      weather = {
        days: Array.isArray(d.weatherWindow.days) ? d.weatherWindow.days : [],
        source: d.weatherWindow.source || '',
        elevationCaveat: d.weatherWindow.elevationCaveat || '',
        precipNote: d.weatherWindow.precipNote || '',
      }
    }

    var gear = { essential: [], recommended: [], optional: [] }
    if (d.gear && typeof d.gear === 'object') {
      gear.essential = Array.isArray(d.gear.essential) ? d.gear.essential : []
      gear.recommended = Array.isArray(d.gear.recommended) ? d.gear.recommended : []
      gear.optional = Array.isArray(d.gear.optional) ? d.gear.optional : []
    }

    var risks = Array.isArray(d.risks) ? d.risks : []
    var notes = Array.isArray(d.notes) ? d.notes : []

    var photoTiming = null
    if (d.photoTiming && typeof d.photoTiming === 'object') {
      photoTiming = {
        sunrise: d.photoTiming.sunrise || '—',
        sunset: d.photoTiming.sunset || '—',
        goldenHour: d.photoTiming.goldenHour || '—',
        blueHour: d.photoTiming.blueHour || '—',
        terrainCaveat: d.photoTiming.terrainCaveat || '',
      }
    }

    // 用 setTimeout 确保 setData 在下一个 tick 执行（避免时序问题）
    var that = this
    setTimeout(function () {
      that.setData({
        loading: false,
        degraded: result.degraded === true || d.degraded === true,
        elevation: (typeof meta.elevation === 'number') ? meta.elevation : null,
        weather: weather,
        gear: gear,
        risks: risks,
        notes: notes,
        photoTiming: photoTiming,
        microclimate: (d.microclimate && typeof d.microclimate === 'object') ? d.microclimate : null,
        disclaimer: (typeof d.disclaimer === 'string') ? d.disclaimer : '',
        meta: meta,
      })
    }, 50)
  },

  onRetry: function () {
    wx.navigateBack()
  },
})
