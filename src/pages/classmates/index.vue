<template>
  <page-meta page-style="overflow: visible;" />
  <view class="classmatesScreen hasBottomNav" :style="activeVisualThemeStyle" @tap="closeLearningPowerHelp">
    <view class="classmatesChrome" :style="classmatesChromeStyle">
      <view class="classmatesNav"><text class="classmatesTitle">同学</text></view>
      <view class="classmatesTabs">
        <view :class="['classmatesTab', activeTab === 'feed' && 'isActive']" @tap="setActiveTab('feed')">
          <text>同学动态</text>
        </view>
        <view :class="['classmatesTab', activeTab === 'leaderboard' && 'isActive']" @tap="setActiveTab('leaderboard')">
          <text>全国排行榜</text>
        </view>
      </view>
    </view>

    <view class="classmatesContent">
      <view v-if="loading" class="classmatesLoading">
        <view class="skeletonLine isTitle" />
        <view class="skeletonCard" />
        <view class="skeletonCard isShort" />
      </view>

      <view v-else-if="loadError" class="classmatesState">
        <text class="classmatesStateTitle">暂时没有加载出来</text>
        <text class="classmatesStateCopy">检查网络后再试一次</text>
        <view class="stateAction" @tap="loadPageData"><text>重新加载</text></view>
      </view>

      <template v-else-if="activeTab === 'feed'">
        <view v-if="feedItems.length > 0" class="inviteCard">
          <view class="inviteCopy">
            <text class="inviteTitle">和同学一起把这个 Unit 学完</text>
            <text class="inviteMeta">{{ currentUnitLabel }}</text>
          </view>
          <!-- #ifdef MP-WEIXIN -->
          <button class="inviteButton" open-type="share" hover-class="buttonPressed" @tap="trackClassmateInviteClick('classmates_header')">
            <text>邀请同学</text>
          </button>
          <!-- #endif -->
          <!-- #ifndef MP-WEIXIN -->
          <view class="inviteButton" hover-class="buttonPressed" @tap="showShareHint('classmates_header')">
            <text>邀请同学</text>
          </view>
          <!-- #endif -->
        </view>

        <view v-if="classmates.length > 0" class="classmateManager">
          <view class="sectionHeadingRow">
            <text class="sectionHeading">我的同学 {{ classmates.length }}</text>
            <text class="sectionLink" @tap="showManager = !showManager">{{ showManager ? '收起' : '管理' }}</text>
          </view>
          <view v-if="showManager" class="classmateList">
            <view v-for="classmate in classmates" :key="classmate.id" class="classmateRow">
              <view class="avatar isSmall">
                <image v-if="classmate.avatarUrl" class="avatarImage" :src="classmate.avatarUrl" mode="aspectFill" />
                <text v-else>{{ avatarInitial(classmate.nickname) }}</text>
              </view>
              <text class="classmateName">{{ classmate.nickname }}</text>
              <text class="removeAction" @tap="confirmRemove(classmate)">移除</text>
            </view>
          </view>
        </view>

        <view v-if="feedItems.length > 0" class="feedSection">
          <text class="sectionHeading">最近学习</text>
          <view class="feedList">
            <view v-for="item in feedItems" :key="item.id" class="feedItem">
              <view class="avatar">
                <image v-if="item.avatarUrl" class="avatarImage" :src="item.avatarUrl" mode="aspectFill" />
                <text v-else>{{ avatarInitial(item.nickname) }}</text>
              </view>
              <view class="feedBody">
                <view class="feedTopline">
                  <text class="feedName">{{ item.nickname }}</text>
                  <text class="feedTime">{{ relativeTime(item.occurredAt) }}</text>
                </view>
                <text class="feedCopy">{{ feedCopy(item) }}</text>
                <view :class="['cheerAction', item.cheeredByMe && 'isCheered']" @tap="toggleCheer(item)">
                  <text>👏 加油</text>
                  <text v-if="item.cheerCount > 0" class="cheerCount">{{ item.cheerCount }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view v-else class="classmatesState isEmpty">
          <view class="emptyPeopleMark">
            <view class="emptyPerson isLeft" />
            <view class="emptyPerson isRight" />
          </view>
          <text class="classmatesStateTitle">还没有同学动态</text>
          <text class="classmatesStateCopy">邀请微信同学完成同一个 Unit，学习记录会出现在这里</text>
          <!-- #ifdef MP-WEIXIN -->
          <button class="stateAction" open-type="share" hover-class="buttonPressed" @tap="trackClassmateInviteClick('classmates_empty')"><text>邀请第一位同学</text></button>
          <!-- #endif -->
          <!-- #ifndef MP-WEIXIN -->
          <view class="stateAction" @tap="showShareHint('classmates_empty')"><text>邀请第一位同学</text></view>
          <!-- #endif -->
        </view>
      </template>

      <template v-else>
        <view class="leaderboardHeader">
          <view>
            <text class="leaderboardTitle">本周 Top 10</text>
            <view class="learningPowerHelpAnchor" @tap.stop>
              <text class="leaderboardMeta">按本周学习力排名 · 仅展示前10名</text>
              <view
                v-if="learningPowerHelpEnabled"
                class="learningPowerHelpButton"
                role="button"
                :aria-label="showLearningPowerHelp ? '关闭学习力计算规则' : '查看学习力计算规则'"
                @tap.stop="toggleLearningPowerHelp"
              >
                <text>?</text>
              </view>
              <view v-if="learningPowerHelpEnabled && showLearningPowerHelp" class="learningPowerHelpPopover" role="note" @tap.stop>
                <text class="learningPowerHelpTitle">学习力计算</text>
                <text class="learningPowerHelpRule">本周首次听写该词：每词 +1，每日最多 20</text>
                <text class="learningPowerHelpRule">完成有效听写：每次 +5，每日最多 20</text>
                <text class="learningPowerHelpRule">当天首次有效听写：额外 +10</text>
                <text class="learningPowerHelpRule">连续打开：从第 2 天起，每天 +5</text>
                <text class="learningPowerHelpRule">错词听写或标记认识：每词 +1，每日最多 20</text>
                <text class="learningPowerHelpRule">成功导出词表：每次 +2，每日最多 20</text>
              </view>
            </view>
          </view>
        </view>

        <view v-if="topThree.length > 0" class="podium">
          <view
            v-for="entry in podiumEntries"
            :key="entry.userId"
            :class="['podiumEntry', `rank${entry.rank}`, entry.isMe && 'isMe']"
          >
            <view class="podiumPortrait">
              <view v-if="entry.rank === 1" class="championLaurel" aria-hidden="true">
                <view class="laurelBranch isLeft">
                  <view v-for="leaf in 7" :key="leaf" :class="['laurelLeaf', `leaf${leaf}`]" />
                </view>
                <view class="laurelBranch isRight">
                  <view v-for="leaf in 7" :key="leaf" :class="['laurelLeaf', `leaf${leaf}`]" />
                </view>
              </view>
              <view class="podiumAvatar">
                <image v-if="entry.avatarUrl" class="avatarImage" :src="entry.avatarUrl" mode="aspectFill" />
                <text v-else>{{ avatarInitial(entry.nickname) }}</text>
              </view>
              <view class="podiumMedal" :aria-label="`第${entry.rank}名奖牌`">
                <view class="podiumMedalRibbons">
                  <view class="podiumMedalRibbon isLeft" />
                  <view class="podiumMedalRibbon isRight" />
                </view>
                <view class="podiumMedalDisc"><text>{{ entry.rank }}</text></view>
              </view>
            </view>
            <view class="podiumNameRow">
              <text class="podiumName">{{ entry.nickname }}</text>
              <text v-if="entry.isMe" class="meTag">我</text>
            </view>
            <text class="podiumPower">{{ entry.learningPower }}</text>
            <text class="podiumUnit">学习力</text>
          </view>
        </view>

        <view v-if="regularRanking.length > 0" class="rankingList">
          <view class="rankingListHeader"><text>排名</text><text>学习力</text></view>
          <view v-for="entry in regularRanking" :key="entry.userId" :class="['rankingRow', entry.isMe && 'isMe']">
            <text class="rankingIndex">{{ String(entry.rank).padStart(2, '0') }}</text>
            <view class="avatar isRanking">
              <image v-if="entry.avatarUrl" class="avatarImage" :src="entry.avatarUrl" mode="aspectFill" />
              <text v-else>{{ avatarInitial(entry.nickname) }}</text>
            </view>
            <view class="rankingNameWrap">
              <text class="rankingName">{{ entry.nickname }}</text>
              <text v-if="entry.isMe" class="meTag">我</text>
            </view>
            <text class="rankingPower">{{ entry.learningPower }}</text>
          </view>
        </view>

        <view v-if="leaderboard.myEntry" class="myRankSection">
          <text class="sectionHeading">我的排名</text>
          <view class="rankingRow isMe">
            <text class="rankingIndex">{{ leaderboard.myEntry.rank }}</text>
            <view class="avatar isRanking">
              <image v-if="leaderboard.myEntry.avatarUrl" class="avatarImage" :src="leaderboard.myEntry.avatarUrl" mode="aspectFill" />
              <text v-else>{{ avatarInitial(leaderboard.myEntry.nickname) }}</text>
            </view>
            <view class="rankingNameWrap">
              <text class="rankingName">{{ leaderboard.myEntry.nickname }}</text>
              <text class="meTag">我</text>
            </view>
            <text class="rankingPower">{{ leaderboard.myEntry.learningPower }}</text>
          </view>
        </view>

        <view v-if="leaderboard.myEntry && leaderboard.pointsToEnterTopTen" class="overtakeCard">
          <text>距离上榜还差 {{ leaderboard.pointsToEnterTopTen }} 学习力</text>
        </view>

        <view v-else-if="leaderboard.myRank && leaderboard.pointsToOvertakePrevious" class="overtakeCard">
          <text>再获得 {{ leaderboard.pointsToOvertakePrevious }} 学习力，就能超过上一名</text>
        </view>

        <view v-if="leaderboard.ranking.length === 0" class="classmatesState isEmpty leaderboardEmpty">
          <text class="classmatesStateTitle">本周榜单正在等你</text>
          <text class="classmatesStateCopy">完成一次听写，就会获得本周学习力</text>
        </view>

        <!-- #ifdef MP-WEIXIN -->
        <button class="leaderboardInvite" open-type="share" hover-class="buttonPressed" @tap="trackClassmateInviteClick('leaderboard')">
          <view class="leaderboardInviteIcon" aria-hidden="true"><view class="invitePerson" /><view class="invitePlus" /></view>
          <text>邀请同学一起学</text>
        </button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <view class="leaderboardInvite" hover-class="buttonPressed" @tap="showShareHint('leaderboard')">
          <view class="leaderboardInviteIcon" aria-hidden="true"><view class="invitePerson" /><view class="invitePlus" /></view>
          <text>邀请同学一起学</text>
        </view>
        <!-- #endif -->
      </template>
    </view>

    <TabBottomNav active="classmates" :weakbook-count="savedWeakWords.length" />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { onShareAppMessage, onShareTimeline, onShow } from '@dcloudio/uni-app'
import { buildWeappShareAppMessage, buildWeappShareTimeline, showWeappShareMenu } from '@/app/useWeappShare'
import { buildUnitChallengeTitle } from '@/app/unitChallenge'
import { ensurePracticeSessionReady } from '@/app/usePracticeSession'
import { useVisualTheme } from '@/app/useVisualTheme'
import TabBottomNav from '@/components/TabBottomNav.vue'
import {
  createClassmateShare,
  fetchClassmateFeed,
  fetchClassmates,
  fetchLeaderboard,
  removeClassmate,
  toggleClassmateCheer,
  type ClassmateSummary,
  type FeedItem,
  type LeaderboardEntry,
  type LeaderboardSnapshot,
  type ShareDescriptor
} from '@/core/classmates'
import { trackAnalyticsEvent } from '@/core/analytics'
import type { UnitGroup, WordEntry } from '@/core/types'

const EMPTY_LEADERBOARD: LeaderboardSnapshot = {
  weekKey: '', weekStart: '', weekEnd: '', displayLimit: 10, topSpecialCount: 3,
  myLearningPower: 0, myRank: null, pointsToOvertakePrevious: null, pointsToEnterTopTen: null,
  ranking: [], myEntry: null
}

type ClassmatesTab = 'feed' | 'leaderboard'

const CLASSMATES_ACTIVE_TAB_KEY = 'gotit:classmates:activeTab'

function readStoredActiveTab(): ClassmatesTab {
  try {
    return uni.getStorageSync(CLASSMATES_ACTIVE_TAB_KEY) === 'leaderboard' ? 'leaderboard' : 'feed'
  } catch {
    return 'feed'
  }
}

function storeActiveTab(tab: ClassmatesTab) {
  try {
    uni.setStorageSync(CLASSMATES_ACTIVE_TAB_KEY, tab)
  } catch {
    // Keep tab switching available when storage is unavailable.
  }
}

const activeTab = ref<ClassmatesTab>(readStoredActiveTab())
const loading = ref(true)
const loadError = ref(false)
const showManager = ref(false)
const learningPowerHelpEnabled = false
const showLearningPowerHelp = ref(false)
const feedItems = ref<FeedItem[]>([])
const classmates = ref<ClassmateSummary[]>([])
const leaderboard = ref<LeaderboardSnapshot>({ ...EMPTY_LEADERBOARD })
const preparedShare = ref<ShareDescriptor | null>(null)
const { activeVisualThemeStyle } = useVisualTheme()
const miniProgramCapsuleTop = ref(44)
const miniProgramCapsuleHeight = ref(32)
const classmatesChromeStyle = computed(() => {
  let style = ''
  // #ifdef MP-WEIXIN
  style = `padding-top: ${miniProgramCapsuleTop.value}px; --capsule-h: ${miniProgramCapsuleHeight.value}px;`
  // #endif
  return style
})

function updateMiniProgramNavInset() {
  // #ifdef MP-WEIXIN
  try {
    const statusBarHeight = Number(uni.getWindowInfo?.().statusBarHeight) || 0
    miniProgramCapsuleTop.value = statusBarHeight > 0 ? statusBarHeight + 4 : 44
    const menuButton = uni.getMenuButtonBoundingClientRect?.()
    if (menuButton && menuButton.top > 0) {
      miniProgramCapsuleTop.value = Math.max(menuButton.top, statusBarHeight)
      miniProgramCapsuleHeight.value = menuButton.height > 0 ? menuButton.height : 32
    }
  } catch {
    // Keep the status-bar or default inset when native metrics are unavailable.
  }
  // #endif
}

updateMiniProgramNavInset()
const selectedUnit = shallowRef<UnitGroup>()
const savedWeakWords = shallowRef<WordEntry[]>([])
let pageSessionPromise: Promise<void> | null = null

function ensurePageSession(): Promise<void> {
  if (!pageSessionPromise) {
    pageSessionPromise = ensurePracticeSessionReady().then((session) => {
      selectedUnit.value = session.selectedUnit.value
      savedWeakWords.value = session.savedWeakWords.value
    }).finally(() => {
      pageSessionPromise = null
    })
  }
  return pageSessionPromise
}

const currentUnitLabel = computed(() => selectedUnit.value
  ? `${selectedUnit.value.bookName} · ${selectedUnit.value.unitName}`
  : '选择当前 Unit 后即可邀请')
const topThree = computed(() => leaderboard.value.ranking.slice(0, 3))
const podiumEntries = computed<LeaderboardEntry[]>(() => (
  [topThree.value[1], topThree.value[0], topThree.value[2]]
    .filter((entry): entry is LeaderboardEntry => entry !== undefined)
))
const regularRanking = computed(() => leaderboard.value.ranking.slice(3))

async function prepareInviteShare() {
  const unit = selectedUnit.value
  if (!unit) return
  try {
    preparedShare.value = await createClassmateShare({
      publisherId: unit.publisherId,
      bookId: unit.bookId,
      unitId: unit.unitId,
      unitName: unit.unitName
    }, 'CLASSMATE_INVITE')
    if (preparedShare.value) {
      trackAnalyticsEvent('share_created', { source: 'classmates', shareType: 'CLASSMATE_INVITE' })
    }
  } catch (error) {
    console.warn('[classmates] share preparation failed', error)
  }
}

async function loadPageData() {
  loading.value = true
  loadError.value = false
  try {
    const [feed, ranking, classmateRows] = await Promise.all([
      fetchClassmateFeed(),
      fetchLeaderboard(),
      fetchClassmates()
    ])
    feedItems.value = feed.items
    leaderboard.value = ranking
    classmates.value = classmateRows
  } catch (error) {
    console.warn('[classmates] load failed', error)
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function setActiveTab(tab: ClassmatesTab) {
  showLearningPowerHelp.value = false
  activeTab.value = tab
  storeActiveTab(tab)
  if (tab === 'leaderboard') trackAnalyticsEvent('leaderboard_view', { source: 'classmates_page' })
}

function toggleLearningPowerHelp() {
  showLearningPowerHelp.value = !showLearningPowerHelp.value
}

function closeLearningPowerHelp() {
  showLearningPowerHelp.value = false
}

function avatarInitial(nickname: string): string {
  return nickname.trim().slice(0, 1) || '同'
}

function relativeTime(value: string): string {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return ''
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000))
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return days === 1 ? '昨天' : `${days}天前`
}

function feedCopy(item: FeedItem): string {
  if (item.activityType === 'DICTATION_COMPLETED') return `完成了 ${item.unitName || '当前 Unit'} 听写`
  if (item.activityType === 'DAILY_STUDY') return `今天已经学习了 ${item.countValue ?? 0} 个单词`
  if (item.activityType === 'STREAK') return `已经连续打卡 ${item.countValue ?? 0} 天`
  return `本周升到了第 ${item.rankValue ?? '-'} 名`
}

async function toggleCheer(item: FeedItem) {
  const previous = { cheered: item.cheeredByMe, count: item.cheerCount }
  item.cheeredByMe = !item.cheeredByMe
  item.cheerCount = Math.max(0, item.cheerCount + (item.cheeredByMe ? 1 : -1))
  try {
    const result = await toggleClassmateCheer(item.id)
    item.cheeredByMe = result.cheered
    item.cheerCount = result.cheerCount
    trackAnalyticsEvent('cheer_toggle', { cheered: result.cheered })
  } catch {
    item.cheeredByMe = previous.cheered
    item.cheerCount = previous.count
    uni.showToast({ title: '加油没有送出，请重试', icon: 'none' })
  }
}

function confirmRemove(classmate: ClassmateSummary) {
  uni.showModal({
    title: '移除同学',
    content: `移除 ${classmate.nickname} 后，将不再看到彼此的学习动态。`,
    confirmText: '移除',
    confirmColor: '#b1473d',
    success: result => {
      if (!result.confirm) return
      void removeClassmate(classmate.id).then(() => {
        classmates.value = classmates.value.filter(item => item.id !== classmate.id)
        feedItems.value = feedItems.value.filter(item => item.userId !== classmate.id)
        trackAnalyticsEvent('classmate_removed')
      }).catch(() => uni.showToast({ title: '移除失败，请重试', icon: 'none' }))
    }
  })
}

function trackClassmateInviteClick(source: 'classmates_header' | 'classmates_empty' | 'leaderboard') {
  const unit = selectedUnit.value
  trackAnalyticsEvent('classmate_invite_click', {
    source,
    shareType: 'CLASSMATE_INVITE',
    publisherName: unit?.publisherName,
    bookName: unit?.bookName,
    unitName: unit?.unitName
  })
}

function showShareHint(source: 'classmates_header' | 'classmates_empty' | 'leaderboard') {
  trackClassmateInviteClick(source)
  uni.showToast({ title: '请在微信小程序中分享', icon: 'none' })
}

function currentShareOptions() {
  const unit = selectedUnit.value
  const title = unit ? buildUnitChallengeTitle(unit) : '一起把课本单词学会'
  return { title, path: preparedShare.value?.path, timelineTitle: title }
}

onShareAppMessage(() => buildWeappShareAppMessage(currentShareOptions()))
onShareTimeline(() => buildWeappShareTimeline(currentShareOptions()))
onMounted(() => {
  void ensurePageSession().then(() => {
    showWeappShareMenu()
    return prepareInviteShare()
  })
})
onShow(() => {
  uni.hideTabBar({ animation: false })
  updateMiniProgramNavInset()
  void ensurePageSession().then(loadPageData)
})
</script>

<style scoped lang="scss">
.classmatesScreen {
  box-sizing: border-box;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--page-bg);
  color: var(--ink);
}

.classmatesScreen.hasBottomNav { padding-bottom: calc(82px + env(safe-area-inset-bottom)); }

.classmatesChrome {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: calc(8px + env(safe-area-inset-top)) 20px 0;
  border-bottom: 1px solid var(--line);
  background: var(--page-bg);
}

.classmatesNav { display: flex; align-items: center; justify-content: center; height: var(--capsule-h, 32px); }
.classmatesTitle { display: block; color: var(--ink); font-size: 18px; line-height: 1.4; font-weight: 800; letter-spacing: 0.02em; text-align: center; }
.classmatesTabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 12px; }
.classmatesTab { position: relative; display: flex; justify-content: center; padding: 13px 8px; color: var(--muted); font-size: 14px; line-height: 20px; font-weight: 500; }
.classmatesTab.isActive { color: var(--accent); font-weight: 650; }
.classmatesTab.isActive::after { position: absolute; bottom: 0; left: 50%; width: 44px; height: 2px; border-radius: 999px; background: var(--accent); transform: translateX(-50%); content: ''; }

.classmatesContent { box-sizing: border-box; padding: 18px 18px 34px; }

.inviteCard, .classmateManager, .feedList, .rankingList, .myRankSection, .overtakeCard, .classmatesState, .podium {
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
  box-shadow: 0 10px 26px var(--ink-shadow);
}

.inviteCard { display: flex; align-items: center; gap: 14px; padding: 17px; }
.inviteCopy { flex: 1 1 auto; min-width: 0; }
.inviteTitle { display: block; font-size: 16px; line-height: 1.35; font-weight: 900; }
.inviteMeta { display: block; overflow: hidden; margin-top: 5px; color: var(--muted); font-size: 11px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.inviteButton, .stateAction, .leaderboardInvite { display: flex; align-items: center; justify-content: center; margin: 0; padding: 0; border: 0; border-radius: 13px; background: var(--accent); color: #fffdf8; font-size: 14px; line-height: 1; font-weight: 850; }
.inviteButton { flex: 0 0 92px; width: 92px; height: 42px; }
.inviteButton::after, .stateAction::after, .leaderboardInvite::after { border: 0; }
.buttonPressed { transform: translateY(1px) scale(0.99); }

.sectionHeadingRow, .leaderboardHeader { display: flex; align-items: center; justify-content: space-between; }
.sectionHeading { display: block; color: var(--ink); font-size: 15px; font-weight: 900; }
.sectionLink { color: var(--accent); font-size: 12px; font-weight: 800; }
.classmateManager { margin-top: 14px; padding: 15px; }
.classmateList { margin-top: 10px; }
.classmateRow { display: flex; align-items: center; min-height: 52px; }
.classmateRow + .classmateRow { border-top: 1px solid var(--line); }
.classmateName { flex: 1; margin-left: 10px; font-size: 14px; font-weight: 800; }
.removeAction { padding: 10px 0 10px 14px; color: var(--danger); font-size: 12px; font-weight: 750; }

.feedSection { margin-top: 20px; }
.feedList { overflow: hidden; margin-top: 10px; }
.feedItem { display: flex; gap: 12px; padding: 15px; }
.feedItem + .feedItem { border-top: 1px solid var(--line); }
.avatar, .podiumAvatar { display: flex; flex: 0 0 auto; align-items: center; justify-content: center; overflow: hidden; width: 42px; height: 42px; border: 2px solid var(--accent-soft); border-radius: 50%; background: var(--accent-soft); color: var(--accent); font-size: 16px; font-weight: 900; }
.avatar.isSmall { width: 34px; height: 34px; font-size: 13px; }
.avatar.isRanking { box-sizing: border-box; width: 32px; height: 32px; border: 0; font-size: 14px; font-weight: 500; }
.avatarImage { width: 100%; height: 100%; }
.feedBody { flex: 1 1 auto; min-width: 0; }
.feedTopline { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.feedName { font-size: 14px; font-weight: 900; }
.feedTime { color: var(--muted); font-size: 10px; font-weight: 600; }
.feedCopy { display: block; margin-top: 5px; color: var(--ink); font-size: 14px; line-height: 1.5; font-weight: 650; }
.cheerAction { display: inline-flex; align-items: center; min-height: 30px; margin-top: 10px; padding: 0 10px; border: 1px solid var(--line); border-radius: 999px; color: var(--muted); font-size: 11px; font-weight: 750; }
.cheerAction.isCheered { border-color: #e7b873; background: #fff4df; color: #8b5b18; }
.cheerCount { margin-left: 5px; }

.classmatesState { display: flex; flex-direction: column; align-items: center; margin-top: 18px; padding: 34px 24px; text-align: center; }
.classmatesStateTitle { font-size: 19px; font-weight: 900; }
.classmatesStateCopy { max-width: 270px; margin-top: 8px; color: var(--muted); font-size: 13px; line-height: 1.6; font-weight: 600; }
.stateAction { width: 100%; max-width: 230px; height: 46px; margin-top: 20px; }
.emptyPeopleMark { position: relative; width: 72px; height: 54px; margin-bottom: 19px; }
.emptyPerson { position: absolute; top: 4px; width: 27px; height: 27px; border: 3px solid var(--accent); border-radius: 50%; }
.emptyPerson::after { position: absolute; top: 26px; left: -8px; width: 37px; height: 19px; border: 3px solid var(--accent); border-bottom: 0; border-radius: 22px 22px 0 0; content: ''; }
.emptyPerson.isLeft { left: 7px; }
.emptyPerson.isRight { right: 7px; background: var(--surface); }

.leaderboardHeader { padding: 6px 2px 20px; }
.leaderboardTitle { display: block; font-size: 24px; line-height: 1.3; font-weight: 650; letter-spacing: -0.5px; }
.learningPowerHelpAnchor { position: relative; display: inline-flex; align-items: center; margin-top: 6px; gap: 5px; }
.leaderboardMeta { color: var(--ink-soft); font-size: 11px; line-height: 1.5; font-weight: 400; }
.learningPowerHelpButton { display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; border: 1px solid var(--muted); border-radius: 50%; color: var(--muted); font-size: 11px; line-height: 1; font-weight: 900; }
.learningPowerHelpPopover { position: absolute; top: 26px; left: 0; z-index: 6; box-sizing: border-box; display: flex; flex-direction: column; width: 292px; max-width: calc(100vw - 40px); padding: 13px 14px; border: 1px solid #bdd5c9; border-radius: 13px; background: #fffdf8; box-shadow: 0 12px 30px rgba(23, 52, 44, 0.16); }
.learningPowerHelpTitle { margin-bottom: 7px; color: var(--ink); font-size: 13px; line-height: 1.3; font-weight: 900; }
.learningPowerHelpRule { color: var(--ink-soft); font-size: 11px; line-height: 1.65; font-weight: 650; }
.podium { box-sizing: border-box; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: end; min-height: 228px; padding: 22px 12px 20px; border-radius: 20px; box-shadow: none; background: radial-gradient(ellipse at 50% 20%, rgba(238, 214, 152, 0.14), transparent 62%), var(--surface); }
.podiumEntry { --medal-edge: #b5c3c2; --medal-fill: linear-gradient(145deg, #fbfdfd 5%, #d8e1e0 46%, #a1b2b1 100%); --medal-ink: #4c6564; --medal-ribbon: #a4b9b4; display: flex; flex-direction: column; align-items: center; grid-row: 1; min-width: 0; }
.podiumEntry.rank1 { --medal-edge: #d4ad55; --medal-fill: linear-gradient(145deg, #fff6cc 5%, #efd284 46%, #c49736 100%); --medal-ink: #785715; --medal-ribbon: #83a794; grid-column: 2; padding-bottom: 18px; }
.podiumEntry.rank2 { grid-column: 1; }
.podiumEntry.rank3 { --medal-edge: #c89d7c; --medal-fill: linear-gradient(145deg, #fce9d8 5%, #e6bd99 46%, #ba8159 100%); --medal-ink: #7b4b2c; --medal-ribbon: #c8a58b; grid-column: 3; }
.podiumPortrait { position: relative; display: flex; justify-content: center; width: 100%; height: 82px; }
.rank1 .podiumPortrait { height: 102px; }
.podiumAvatar { position: relative; z-index: 1; box-sizing: border-box; width: 60px; height: 60px; padding: 3px; border: 1.5px solid var(--medal-edge); background: var(--accent-soft); color: var(--ink-soft); font-size: 23px; font-weight: 500; box-shadow: inset 0 0 0 3px var(--surface); }
.podiumAvatar .avatarImage { border-radius: 50%; }
.rank1 .podiumAvatar { width: 78px; height: 78px; border-width: 2px; }
.podiumMedal { position: absolute; top: 47px; left: 50%; z-index: 2; width: 26px; height: 33px; transform: translateX(-50%); }
.rank1 .podiumMedal { top: 64px; width: 29px; height: 36px; }
.podiumMedalRibbons { position: absolute; right: 5px; bottom: 0; left: 5px; display: flex; justify-content: space-between; height: 15px; }
.podiumMedalRibbon { width: 8px; height: 15px; border-radius: 0 0 1px 1px; background: var(--medal-ribbon); }
.podiumMedalRibbon.isLeft { transform: rotate(16deg); }
.podiumMedalRibbon.isRight { transform: rotate(-16deg); }
.podiumMedalDisc { position: relative; display: flex; align-items: center; justify-content: center; box-sizing: border-box; width: 26px; height: 26px; border: 1px solid var(--medal-edge); border-radius: 50%; background: var(--medal-fill); color: var(--medal-ink); box-shadow: 0 2px 4px rgba(45, 60, 50, 0.12); font-size: 14px; line-height: 1; font-weight: 600; }
.podiumMedalDisc::after { position: absolute; inset: 2px; border: 1px solid rgba(255, 255, 255, 0.65); border-radius: 50%; content: ''; }
.rank1 .podiumMedalDisc { width: 29px; height: 29px; font-size: 16px; }
.championLaurel { position: absolute; top: 23px; left: 50%; width: 116px; height: 72px; transform: translateX(-50%); pointer-events: none; }
.laurelBranch { position: absolute; top: 0; left: 0; width: 27px; height: 68px; }
.laurelBranch.isRight { right: 0; left: auto; transform: scaleX(-1); }
.laurelBranch::after { position: absolute; top: 9px; left: 8px; width: 24px; height: 56px; border-bottom: 1px solid #dcc78d; border-left: 1px solid #dcc78d; border-radius: 0 0 0 100%; transform: rotate(-10deg); content: ''; }
.laurelLeaf { position: absolute; z-index: 1; width: 7px; height: 12px; border-radius: 90% 0 90% 0; background: linear-gradient(145deg, #f2e4ba, #dbbb70); }
.laurelLeaf.leaf1 { top: 0; left: 7px; transform: rotate(8deg); }
.laurelLeaf.leaf2 { top: 12px; left: 1px; transform: rotate(-38deg); }
.laurelLeaf.leaf3 { top: 25px; left: 2px; transform: rotate(-54deg); }
.laurelLeaf.leaf4 { top: 37px; left: 6px; transform: rotate(-70deg); }
.laurelLeaf.leaf5 { top: 47px; left: 13px; transform: rotate(-86deg); }
.laurelLeaf.leaf6 { top: 22px; left: 12px; transform: rotate(18deg); }
.laurelLeaf.leaf7 { top: 37px; left: 17px; transform: rotate(5deg); }
.podiumNameRow { display: flex; align-items: center; justify-content: center; gap: 5px; width: 100%; min-width: 0; min-height: 20px; }
.podiumName { overflow: hidden; min-width: 0; font-size: 12px; line-height: 20px; font-weight: 550; text-overflow: ellipsis; white-space: nowrap; }
.rank1 .podiumName { font-size: 14px; font-weight: 650; }
.meTag { flex: 0 0 auto; box-sizing: border-box; padding: 0 4px; border: 1px solid var(--accent); border-radius: 6px; color: var(--accent); font-size: 10px; line-height: 16px; font-weight: 500; }
.podiumPower { max-width: 100%; margin-top: 8px; color: var(--accent); font-size: 26px; line-height: 1.15; font-weight: 550; font-variant-numeric: tabular-nums; }
.rank1 .podiumPower { font-size: 30px; }
.podiumUnit { margin-top: 4px; color: var(--muted); font-size: 10px; line-height: 1.4; font-weight: 400; }
.rankingList { overflow: hidden; margin-top: 14px; border-radius: 20px; box-shadow: none; }
.rankingListHeader { display: flex; align-items: center; justify-content: space-between; min-height: 36px; padding: 0 16px; color: var(--muted); font-size: 11px; line-height: 1.4; font-weight: 400; }
.rankingRow { position: relative; display: flex; align-items: center; gap: 0; min-height: 52px; padding: 0 16px; }
.rankingRow::before { position: absolute; top: 0; right: 16px; left: 16px; height: 1px; background: var(--line); opacity: 0.55; content: ''; }
.rankingRow.isMe { background: var(--accent-soft); }
.rankingIndex { flex: 0 0 auto; min-width: 30px; margin-right: 6px; color: var(--muted); font-size: 13px; font-weight: 450; font-variant-numeric: tabular-nums; }
.rankingNameWrap { display: flex; flex: 1 1 auto; align-items: center; gap: 6px; min-width: 0; margin: 0 10px; }
.rankingName { overflow: hidden; min-width: 0; font-size: 14px; line-height: 1.4; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.rankingPower { flex: 0 0 auto; color: var(--accent); font-size: 20px; line-height: 1.2; font-weight: 550; font-variant-numeric: tabular-nums; }
.myRankSection { overflow: hidden; margin-top: 14px; padding-top: 14px; box-shadow: none; }
.myRankSection > .sectionHeading { padding: 0 16px 10px; font-size: 13px; font-weight: 550; }
.overtakeCard { margin-top: 14px; padding: 14px 16px; background: var(--accent-soft); color: var(--accent); box-shadow: none; font-size: 12px; line-height: 1.5; font-weight: 500; text-align: center; }
.leaderboardEmpty { margin-top: 0; }
.leaderboardInvite { gap: 10px; width: 100%; height: 50px; margin-top: 18px; border-radius: 16px; font-size: 15px; font-weight: 600; }
.leaderboardInviteIcon { position: relative; flex: 0 0 24px; width: 24px; height: 26px; color: #fffdf8; }
.invitePerson { position: absolute; top: 1px; left: 5px; box-sizing: border-box; width: 11px; height: 11px; border: 1.5px solid currentColor; border-radius: 50%; }
.invitePerson::after { position: absolute; top: 12px; left: -5px; box-sizing: border-box; width: 19px; height: 11px; border: 1.5px solid currentColor; border-radius: 10px 10px 2px 2px; content: ''; }
.invitePlus { position: absolute; top: 13px; right: 0; width: 8px; height: 1.5px; border-radius: 1px; background: currentColor; }
.invitePlus::after { position: absolute; top: -3px; left: 3px; width: 1.5px; height: 8px; border-radius: 1px; background: currentColor; content: ''; }

@media (max-width: 360px) {
  .podium { padding-right: 8px; padding-left: 8px; }
  .podiumAvatar { width: 54px; height: 54px; }
  .rank1 .podiumAvatar { width: 70px; height: 70px; }
  .championLaurel { top: 20px; transform: translateX(-50%) scale(0.9); }
  .podiumMedal { top: 43px; }
  .rank1 .podiumMedal { top: 57px; }
  .rankingRow, .rankingListHeader { padding-right: 12px; padding-left: 12px; }
  .rankingIndex { min-width: 24px; }
}

.classmatesLoading { padding: 14px 0; }
.skeletonLine, .skeletonCard { border-radius: 14px; background: var(--surface); }
.skeletonLine.isTitle { width: 45%; height: 24px; }
.skeletonCard { height: 170px; margin-top: 18px; }
.skeletonCard.isShort { height: 96px; }
</style>
