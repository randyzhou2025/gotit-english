import { createSSRApp } from 'vue'
import App from './App.vue'
import { markAppPageReady } from '@/app/appNetworkLifecycle'
import './styles/tokens.scss'

export function createApp() {
  const app = createSSRApp(App)
  app.mixin({ onReady: markAppPageReady })
  return {
    app
  }
}
