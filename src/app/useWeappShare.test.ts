import { describe, expect, it } from 'vitest'
import {
  WEAPP_SHARE_PATH,
  WEAPP_SHARE_TITLE,
  buildWeappShareAppMessage,
  buildWeappShareTimeline
} from './useWeappShare'

describe('useWeappShare', () => {
  it('uses default title and home path for friend shares', () => {
    expect(buildWeappShareAppMessage()).toEqual({
      title: WEAPP_SHARE_TITLE,
      path: WEAPP_SHARE_PATH
    })
  })

  it('allows custom share payloads', () => {
    expect(buildWeappShareAppMessage({
      title: '自定义标题',
      path: '/pages/course/index'
    })).toEqual({
      title: '自定义标题',
      path: '/pages/course/index'
    })
  })

  it('includes a generated poster when one is available', () => {
    expect(buildWeappShareAppMessage({ imageUrl: 'wxfile://score-poster.png' })).toEqual({
      title: WEAPP_SHARE_TITLE,
      path: WEAPP_SHARE_PATH,
      imageUrl: 'wxfile://score-poster.png'
    })
  })

  it('uses timeline title override when provided', () => {
    expect(buildWeappShareTimeline({
      title: '朋友标题',
      timelineTitle: '朋友圈标题'
    })).toEqual({
      title: '朋友圈标题'
    })
  })
})
