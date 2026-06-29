import { Component } from 'react'
import { ConfigProvider } from '@nutui/nutui-react-taro'
import '@nutui/nutui-react-taro/dist/style.css'
import Taro from '@tarojs/taro'
import './app.css'

export default class App extends Component {
  componentDidMount() {
    // 云开发初始化，env 为微信云开发环境 ID
    if (Taro.cloud && typeof Taro.cloud.init === 'function') {
      try {
        Taro.cloud.init({ env: 'cloud1-d0gtzgqzh9c128aaf', traceUser: false })
        console.log('[徒步薯] 云开发初始化成功')
      } catch (e) {
        console.error('[徒步薯] 云开发初始化失败', e)
      }
    } else {
      console.warn('[徒步薯] 当前环境不支持云开发')
    }
  }
  render() {
    return (
      <ConfigProvider>
        {this.props.children}
      </ConfigProvider>
    )
  }
}
