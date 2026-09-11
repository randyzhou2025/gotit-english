import fs from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

const source = fs.readFileSync(new URL('./index.vue', import.meta.url), 'utf8')
const shareEntrySource = fs.readFileSync(new URL('../share-entry/index.vue', import.meta.url), 'utf8')
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
    expect(source).toContain('<text>排行榜</text>')
    expect(source).not.toContain('全国排行榜')
    expect(source).toContain('👏 加油')
    expect(source).not.toContain('让坚持被看见')
    expect(source).toContain('<text>前 {{ leaderboard.displayLimit }} 名</text>')
    expect(source).not.toContain('周一重新开始')
    expect(source).toContain('邀请同学')
    expect(source).toContain('邀请同学一起学')
    expect(source).toContain("trackAnalyticsEvent('classmate_invite_click'")
    expect(source).toContain("showShareHint('classmates_header')")
    expect(source).toContain("showShareHint('classmates_empty')")
    expect(source).toContain("showShareHint('leaderboard')")
    expect(source).toContain('class="myRankDock"')
    expect(source).toContain('{{ rankingHint }}')
    expect(source).toContain('class="podiumMedal"')
  })

  it('labels app-open streak activity as check-ins instead of study days', () => {
    expect(source).toContain('已经连续打卡')
    expect(source).not.toContain('已经连续学习')
  })

  it('keeps one invite visible whether the feed has activity or is empty', () => {
    expect(source).toContain('<view v-if="feedItems.length > 0" class="inviteCard">')
    expect(source).toContain('<view v-else class="classmatesState isEmpty">')
    expect(source).toContain('邀请第一位同学')
  })

  it('opens a classmate invite on the shared Unit home instead of dictation setup', () => {
    expect(shareEntrySource).toContain("context.shareType === 'CLASSMATE_INVITE'")
    expect(shareEntrySource).toContain('await openSharedUnitHome(context.unitId)')
    expect(shareEntrySource).toMatch(/if \(isClassmateInvite\) \{\s*uni\.switchTab\(\{ url: '\/pages\/index\/index' \}\)/)
  })

  it('keeps the first version focused on learning actions', () => {
    expect(source).not.toContain('聊天')
    expect(source).not.toContain('评论')
    expect(source).not.toContain('私信')
    expect(source).not.toContain('积分商城')
  })

  it('uses one native page scroll with platform-independent content spacing', () => {
    expect(source).toContain('<page-meta page-style="overflow: visible;" />')
    expect(source).toContain('<view class="classmatesContent">')
    expect(source).not.toContain('<scroll-view')
    expect(source).not.toContain('uni-scroll-view-content')
    expect(source).not.toContain('100vh - 128px')
    expect(source).not.toMatch(/@(?:scroll|touchmove)=/)
    expect(source).toMatch(/\.classmatesContent\s*\{[^}]*padding: 18px 18px 34px;/)
    expect(source).toContain('<FixedPageHeader>')
    expect(source).not.toMatch(/\.classmatesChrome\s*\{[^}]*position: sticky;/)
    expect(source).toMatch(/\.classmatesScreen\s*\{[^}]*box-sizing: border-box;/)
    expect(source).toContain('padding-bottom: calc(82px + env(safe-area-inset-bottom))')
  })

  it('centers the title at the native capsule height instead of relying on Android safe-area CSS', () => {
    expect(source).toContain('class="classmatesChrome" :style="classmatesChromeStyle"')
    expect(source).toContain('uni.getWindowInfo?.().statusBarHeight')
    expect(source).toContain('uni.getMenuButtonBoundingClientRect?.()')
    expect(source).toContain('Math.max(menuButton.top, statusBarHeight)')
    expect(source).toContain('padding-top: ${miniProgramCapsuleTop.value}px; --capsule-h: ${miniProgramCapsuleHeight.value}px;')
    expect(source).toMatch(/\.classmatesNav\s*\{[^}]*justify-content: center;[^}]*height: var\(--capsule-h, 32px\);/)
    expect(source).toMatch(/\.classmatesTitle\s*\{[^}]*font-size: 18px;[^}]*font-weight: 800;[^}]*text-align: center;/)
    expect(source).toMatch(/onShow\(\(\) => \{[\s\S]*?updateMiniProgramNavInset\(\)/)
  })

  it.each([
    { status: 24, menu: { top: 30, height: 32 }, top: 30, height: 32 },
    { status: 59, menu: { top: 63, height: 32 }, top: 63, height: 32 },
    { status: 32, menu: { top: 0, height: 0 }, top: 36, height: 32 },
    { status: 0, menu: undefined, top: 44, height: 32 },
    { status: 40, menu: { top: 20, height: 30 }, top: 40, height: 30 }
  ])('uses safe native title metrics for $status px status bars', ({ status, menu, top, height }) => {
    const start = source.indexOf('function updateMiniProgramNavInset()')
    const end = source.indexOf('\n}\n', start) + 2
    const context = {
      miniProgramCapsuleTop: { value: 44 },
      miniProgramCapsuleHeight: { value: 32 },
      uni: { getWindowInfo: () => ({ statusBarHeight: status }), getMenuButtonBoundingClientRect: () => menu }
    }
    runInNewContext(`${source.slice(start, end)}; updateMiniProgramNavInset()`, context)
    expect(context.miniProgramCapsuleTop.value).toBe(top)
    expect(context.miniProgramCapsuleHeight.value).toBe(height)
  })

  it('avoids scrolling backdrop blur on the classmates page only', () => {
    expect(source).not.toContain('backdrop-filter: blur(')
    expect(tabNavSource).toContain(":class=\"{ isClassmates: active === 'classmates' }\"")
    expect(tabNavSource).toMatch(/\.bottomNav\.isClassmates\s*\{[^}]*background: var\(--page-bg\);[^}]*backdrop-filter: none;/)
    expect(tabNavSource).not.toMatch(/\.bottomNav\.isClassmates\s*\{[^}]*background-image:/)
    expect(tabNavSource).toMatch(/\.bottomNav\s*\{[^}]*backdrop-filter: blur\(16px\);/)
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

  it('removes ranking-rule and award-title copy', () => {
    expect(source).not.toContain('learningPowerHelp')
    expect(source).not.toContain('排名规则')
    expect(source).not.toContain('冠军')
    expect(source).not.toContain('亚军')
    expect(source).not.toContain('季军')
  })

  it('integrates small medals with avatars and keeps the champion centered in partial lists', () => {
    expect(source).toContain('class="podiumPortrait"')
    expect(source).not.toContain('championLaurel')
    expect(source).toContain('class="podiumNameRow"')
    expect(source).toContain('v-if="entry.isMe" class="meTag"')
    expect(source).toMatch(/\.podiumEntry\.rank1\s*\{[^}]*grid-column: 2;/)
    expect(source).toMatch(/\.podiumEntry\.rank2\s*\{[^}]*grid-column: 1;/)
    expect(source).toMatch(/\.podiumEntry\.rank3\s*\{[^}]*grid-column: 3;/)
    expect(source).not.toContain('translateY(-16px)')
  })

  it('uses a labeled compact list with readable names and stable score columns', () => {
    expect(source).toContain('class="rankingListHeader"')
    expect(source).toContain('<text>前 {{ leaderboard.displayLimit }} 名</text>')
    expect(source).toContain('class="rankingNameWrap"')
    expect(source).toContain('font-variant-numeric: tabular-nums;')
    expect(source).toMatch(/\.rankingNameWrap\s*\{[^}]*min-width: 0;/)
    expect(source).toMatch(/\.rankingName\s*\{[^}]*text-overflow: ellipsis;/)
    expect(source).toContain('@media (max-width: 360px)')
  })

  it('keeps decorations static and both invite paths functional', () => {
    expect(source).toContain('class="leaderboardInviteIcon" aria-hidden="true"')
    expect(source).toContain('open-type="share" hover-class="buttonPressed" @tap="trackClassmateInviteClick(\'leaderboard\')"')
    expect(source).toContain('hover-class="buttonPressed" @tap="showShareHint(\'leaderboard\')"')
    expect(source).not.toContain('@keyframes')
    expect(source).not.toContain('setInterval')
    expect(source).not.toContain('background-image: linear-gradient(var(--surface), var(--surface));')
    expect(source).toContain(':style="activeVisualThemeStyle"')
    expect(source).not.toContain('--page-bg:')
    expect(source).toMatch(/\.classmatesScreen\s*\{[^}]*background: var\(--page-bg\);/)
    expect(source).toMatch(/\.classmatesChrome\s*\{[^}]*background: var\(--page-bg\);/)
  })

  it('hides native tab chrome when showing its own bottom navigation', () => {
    expect(source).toMatch(/onShow\(\(\) => \{\s*uni\.hideTabBar\(\{ animation: false \}\)/)
    expect(tabNavSource).toMatch(/\.bottomNav\.isClassmates \.bottomNavLabel\s*\{[^}]*font-weight: 500;/)
  })
})

// Resolve an older request last: its data and loading flag must not replace the selected board.
it('keeps the newest metric when leaderboard responses arrive out of order', async () => {
  const start = source.indexOf('async function loadLeaderboard()')
  const end = source.indexOf('function selectMetric', start)
  const pending: Array<(value: unknown) => void> = []
  const state = {
    rankingRequest: 0,
    selectedMetric: { value: 'power' }, selectedPeriod: { value: 'week' },
    rankingLoading: { value: false }, rankingError: { value: false }, leaderboard: { value: null },
    flushProgressUpload: async () => {}, flushStudyEvents: async () => {},
    fetchLeaderboard: () => new Promise(resolve => pending.push(resolve)), console
  }
  const load = runInNewContext(`${source.slice(start, end)}; loadLeaderboard`, state)
  const first = load()
  await new Promise(resolve => setImmediate(resolve))
  state.selectedMetric.value = 'words'
  const second = load()
  await new Promise(resolve => setImmediate(resolve))
  pending[1]!({ metric: 'words', myValue: 12 })
  await second
  pending[0]!({ metric: 'power', myValue: 99 })
  await first
  expect(state.leaderboard.value).toEqual({ metric: 'words', myValue: 12 })
  expect(state.rankingLoading.value).toBe(false)
})
