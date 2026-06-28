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
    error: null,
  },

  onLoad() {
    // 设置最小日期为今天
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    this.setData({ minDate: `${y}-${m}-${d}` })
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
    const { route, date, level, days } = this.data

    // 输入校验
    if (!route.trim()) {
      wx.showToast({ title: '请输入路线名', icon: 'none' })
      return
    }
    if (!date) {
      wx.showToast({ title: '请选择出发日期', icon: 'none' })
      return
    }

    this.setData({ loading: true, error: null })

    wx.cloud.callFunction({
      name: 'getAdvice',
      data: { route: route.trim(), date, level, days },
      success: (res) => {
        const result = res.result
        if (result.needsConfirm) {
          // 编辑距离匹配，需用户确认
          wx.showModal({
            title: '路线确认',
            content: result.message,
            confirmText: '确认',
            cancelText: '重新输入',
            success: (modal) => {
              if (modal.confirm && result.data) {
                this.setData({ loading: false })
                this.navigateToResult(result)
              } else {
                this.setData({ loading: false })
              }
            },
          })
        } else if (result.ok) {
          this.navigateToResult(result)
        } else {
          this.setData({ loading: false, error: result.message || '获取建议失败' })
        }
      },
      fail: (err) => {
        console.error('云函数调用失败:', err)
        this.setData({ loading: false, error: '网络错误，请重试' })
      },
    })
  },

  navigateToResult(result) {
    // 传结果到 result 页（大数据用全局变量或缓存）
    const app = getApp()
    app.globalData.adviceResult = result

    this.setData({ loading: false })
    wx.navigateTo({ url: '/pages/result/result' })
  },
})
