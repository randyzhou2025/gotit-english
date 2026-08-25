import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(new URL('./index.vue', import.meta.url), 'utf8')
const tabNavSource = fs.readFileSync(new URL('../../components/TabBottomNav.vue', import.meta.url), 'utf8')
const pages = JSON.parse(fs.readFileSync(new URL('../../pages.json', import.meta.url), 'utf8')) as {
  tabBar: { list: Array<{ pagePath: string; text: string; iconPath: string }> }
}

describe('classmates page MVP', () => {
  it('adds the classmates tab without changing the other tab destinations', () => {
    expect(pages.tabBar.list.map(item => item.text)).toEqual(['首页', '同学', '生词本', '我的'])
    expect(pages.tabBar.list[1]).toEqual(expect.objectContaining({
      pagePath: 'pages/classmates/index',
      iconPath: 'static/tabbar/classmates.png'
    }))
  })

  it('contains feed, cheer, leaderboard and every invite entry', () => {
    expect(source).toContain('同学动态')
    expect(source).toContain('👏 加油')
    expect(source).toContain('本周排行榜')
    expect(source).not.toContain('周一重新开始')
    expect(source).toContain('邀请同学')
    expect(source).toContain('邀请同学一起学')
    expect(source).toContain("trackAnalyticsEvent('classmate_invite_click'")
    expect(source).toContain("showShareHint('classmates_header')")
    expect(source).toContain("showShareHint('classmates_empty')")
    expect(source).toContain("showShareHint('leaderboard')")
    expect(source).toContain('再获得 {{ leaderboard.pointsToOvertakePrevious }} 学习力，就能超过上一名')
    expect(source).toContain('距离上榜还差 {{ leaderboard.pointsToEnterTopTen }} 学习力')
    expect(source).toContain('class="podiumMedal"')
  })

  it('keeps the first version focused on learning actions', () => {
    expect(source).not.toContain('聊天')
    expect(source).not.toContain('评论')
    expect(source).not.toContain('私信')
    expect(source).not.toContain('积分商城')
  })

  it('tracks classmates and leaderboard clicks without double-counting page display', () => {
    expect(tabNavSource).toContain("trackAnalyticsEvent('classmates_tab_view', { source: 'tabbar' })")
    expect(source).toContain("trackAnalyticsEvent('leaderboard_view', { source: 'classmates_page' })")
    expect(source).not.toContain("trackAnalyticsEvent('classmates_tab_view')")
  })

  it('defaults to the feed and restores the last selected classmates tab', () => {
    expect(source).toContain("const CLASSMATES_ACTIVE_TAB_KEY = 'gotit:classmates:activeTab'")
    expect(source).toContain("uni.getStorageSync(CLASSMATES_ACTIVE_TAB_KEY) === 'leaderboard' ? 'leaderboard' : 'feed'")
    expect(source).toContain('const activeTab = ref<ClassmatesTab>(readStoredActiveTab())')
    expect(source).toContain('uni.setStorageSync(CLASSMATES_ACTIVE_TAB_KEY, tab)')
    expect(source).toContain('storeActiveTab(tab)')
  })

  it('temporarily hides the learning-power help entry while preserving its content', () => {
    expect(source).toContain('const learningPowerHelpEnabled = false')
    expect(source).toContain('v-if="learningPowerHelpEnabled"')
    expect(source).toContain('class="learningPowerHelpButton"')
    expect(source).toContain('@tap.stop="toggleLearningPowerHelp"')
    expect(source).toContain('@tap="closeLearningPowerHelp"')
    expect(source).toContain('本周首次听写该词：每词 +1，每日最多 20')
    expect(source).toContain('连续打开：从第 2 天起，每天 +5')
    expect(source).toContain('错词听写或标记认识：每词 +1，每日最多 20')
  })
})
