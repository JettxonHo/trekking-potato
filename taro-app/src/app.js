import { Component } from 'react'
import Taro from '@tarojs/taro'
import './app.css'

export default class App extends Component {
  componentDidMount() {
    // 云开发初始化，env 为微信云开发环境 ID
    if (Taro.cloud && typeof Taro.cloud.init === 'function') {
      try {
        Taro.cloud.init({ env: '100050247253', traceUser: false })
        console.log('[徒步薯] 云开发初始化成功')
      } catch (e) {
        console.error('[徒步薯] 云开发初始化失败', e)
      }
    } else {
      console.warn('[徒步薯] 当前环境不支持云开发')
    }
  }
  render() {
    return this.props.children
  }
}
