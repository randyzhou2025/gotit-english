import { onMounted } from 'vue'
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'

export const WEAPP_SHARE_TITLE = '课本单词通 - 专注课本单词听写'
export const WEAPP_SHARE_PATH = '/pages/index/index'

export interface WeappShareOptions {
  title?: string
  path?: string
  timelineTitle?: string
}

export function buildWeappShareAppMessage(options: WeappShareOptions = {}) {
  return {
    title: options.title ?? WEAPP_SHARE_TITLE,
    path: options.path ?? WEAPP_SHARE_PATH
  }
}

export function buildWeappShareTimeline(options: WeappShareOptions = {}) {
  return {
    title: options.timelineTitle ?? options.title ?? WEAPP_SHARE_TITLE
  }
}

export function useWeappShare(options: WeappShareOptions = {}) {
  // #ifdef MP-WEIXIN
  onShareAppMessage(() => buildWeappShareAppMessage(options))
  onShareTimeline(() => buildWeappShareTimeline(options))
  onMounted(() => {
    uni.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  })
  // #endif
}
