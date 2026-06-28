// 徒步薯 - 全局 App
// 注意：wx.cloud.init() 需要你在微信开发者工具创建云开发环境
// 然后把 env 参数改成你的云环境 ID

App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    try {
      wx.cloud.init({
        // env: 'your-env-id',  // 如果你有云环境 ID，取消注释并替换
        traceUser: false,
      })
      console.log('云开发初始化成功')
    } catch (e) {
      console.error('云开发初始化失败:', e)
    }
  },
  globalData: {
    userInfo: null,
    adviceResult: null,
  },
})
