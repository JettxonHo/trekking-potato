Page({
  data: {
    route: '',
    date: '',
    level: '中级',
    days: 1,
    levels: ['初级', '中级', '高级'],
    levelIndex: 1,
    minDate: '',
    showResult: false,
    testResult: ''
  },

  onLoad: function () {
    var d = new Date()
    var y = d.getFullYear()
    var m = d.getMonth() + 1
    var day = d.getDate()
    this.setData({ minDate: y + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day) })
  },

  onRouteInput: function (e) { this.setData({ route: e.detail.value }) },
  onDateChange: function (e) { this.setData({ date: e.detail.value }) },
  onLevelChange: function (e) { this.setData({ levelIndex: e.detail.value, level: this.data.levels[e.detail.value] }) },
  onDaysChange: function (e) { this.setData({ days: e.detail.value }) },

  onSubmit: function () {
    // 最简版：不调云函数，只显示测试文本
    this.setData({ showResult: true, testResult: '路线:' + this.data.route + ' 日期:' + this.data.date + ' 天数:' + this.data.days + ' 级别:' + this.data.level })
  },

  onBack: function () {
    this.setData({ showResult: false })
  }
})
