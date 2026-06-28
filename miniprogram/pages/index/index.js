Page({
  data: {
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
  },

  onLoad() {
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    this.setData({ minDate: y + '-' + m + '-' + d })
  },

  onRouteInput(e) {
    this.setData({ route: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value })
  },

  onLevelChange(e) {
    this.setData({ levelIndex: parseInt(e.detail.value), level: this.data.levels[e.detail.value] })
  },

  onDaysChange(e) {
    const days = Math.max(1, Math.min(7, parseInt(e.detail.value) || 1))
    this.setData({ days })
  },

  onSubmit() {
    var that = this
    var route = this.data.route
    var date = this.data.date
    var level = this.data.level
    var days = this.data.days

    if (!route || !route.trim()) {
      wx.showToast({ title: '请输入路线名', icon: 'none' })
      return
    }
    if (!date) {
      wx.showToast({ title: '请选择出发日期', icon: 'none' })
      return
    }

    this.setData({ loading: true, error: null, loadingStage: '正在查询路线位置...' })

    this._stageTimer1 = setTimeout(function () {
      if (that.data.loading) that.setData({ loadingStage: '获取天气数据中...' })
    }, 3000)

    this._stageTimer2 = setTimeout(function () {
      if (that.data.loading) that.setData({ loadingStage: 'AI 正在生成建议...' })
    }, 7000)

    wx.cloud.callFunction({
      name: 'getAdvice',
      data: { route: route.trim(), date: date, level: level, days: days },
      success: function (res) {
        clearTimeout(that._stageTimer1)
        clearTimeout(that._stageTimer2)
        var result = res.result

        if (result && result.needsConfirm) {
          wx.showModal({
            title: '路线确认',
            content: result.message || '是否确认此路线？',
            confirmText: '确认',
            cancelText: '重新输入',
            success: function (modal) {
              if (modal.confirm && result.data) {
                that.setData({ loading: false })
                that.navigateToResult(result)
              } else {
                that.setData({ loading: false })
              }
            },
          })
        } else if (result && result.ok) {
          that.navigateToResult(result)
        } else {
          that.setData({ loading: false, error: (result && result.message) || '获取建议失败' })
        }
      },
      fail: function (err) {
        clearTimeout(that._stageTimer1)
        clearTimeout(that._stageTimer2)
        console.error('云函数调用失败:', err)
        that.setData({ loading: false, error: '网络错误，请重试' })
      },
    })
  },

  navigateToResult: function (result) {
    var that = this
    this.setData({ loading: false })

    // 用 globalData 传递（保留），但同时存到 wx.setStorageSync 作为备份
    var app = getApp()
    app.globalData.adviceResult = result
    try {
      wx.setStorageSync('adviceResult', result)
    } catch (e) {
      console.error('存储失败:', e)
    }

    wx.navigateTo({
      url: '/pages/result/result',
    })
  },

  onUnload() {
    clearTimeout(this._stageTimer1)
    clearTimeout(this._stageTimer2)
  },
})
