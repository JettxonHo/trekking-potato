Page({
  data: {
    loading: false,
    result: null,
    error: null,
  },

  onTestCall() {
    this.setData({ loading: true, error: null })
    wx.cloud.callFunction({
      name: 'getAdvice',
      data: {
        route: '武功山',
        date: '2026-07-05',
        level: '中级',
        days: 1,
      },
      success: (res) => {
        console.log('云函数返回:', res.result)
        this.setData({ result: res.result, loading: false })
      },
      fail: (err) => {
        console.error('云函数调用失败:', err)
        this.setData({ error: err.errMsg || '调用失败', loading: false })
      },
    })
  },
})
