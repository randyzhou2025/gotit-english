<template>
  <page-meta page-style="overflow: visible;" />
  <view class="classmatesScreen hasBottomNav" :class="{ isLeaderboard: activeTab === 'leaderboard' }" :style="classmatesScreenStyle">
    <view class="classmatesChrome" :style="classmatesChromeStyle">
      <view class="classmatesNav"><text class="classmatesTitle">同学</text></view>
      <view class="classmatesTabs">
        <view :class="['classmatesTab', activeTab === 'feed' && 'isActive']" @tap="setActiveTab('feed')">
          <text>同学动态</text>
        </view>
        <view :class="['classmatesTab', activeTab === 'leaderboard' && 'isActive']" @tap="setActiveTab('leaderboard')">
          <text>排行榜</text>
        </view>
      </view>
    </view>

    <view class="classmatesContent">
      <view v-if="loading && activeTab === 'feed'" class="classmatesLoading">
        <view class="skeletonLine isTitle" />
        <view class="skeletonCard" />
        <view class="skeletonCard isShort" />
      </view>

      <view v-else-if="loadError && activeTab === 'feed'" class="classmatesState">
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
        <view class="leaderboardHeader"><text class="leaderboardTitle">让坚持被看见</text></view>
        <view class="leaderboardMetrics" role="tablist" aria-label="榜单类型">
          <view v-for="metric in LEADERBOARD_METRICS" :key="metric.id"
            :class="['leaderboardMetric', selectedMetric === metric.id && 'isActive']"
            role="tab" :aria-selected="selectedMetric === metric.id" @tap="selectMetric(metric.id)">
            <text>{{ metric.label }}</text>
          </view>
        </view>
        <view class="leaderboardPeriodRow">
          <view class="leaderboardPeriods" role="tablist" aria-label="统计周期">
            <view :class="['leaderboardPeriod', selectedPeriod === 'week' && 'isActive']" role="tab"
              :aria-selected="selectedPeriod === 'week'" @tap="selectPeriod('week')"><text>周榜</text></view>
            <view :class="['leaderboardPeriod', selectedPeriod === 'total' && 'isActive']" role="tab"
              :aria-selected="selectedPeriod === 'total'" @tap="selectPeriod('total')"><text>总榜</text></view>
          </view>
          <text v-if="!rankingLoading && !rankingError" class="leaderboardDate">{{ rankingDate }}</text>
        </view>
        <view v-if="rankingLoading" class="classmatesLoading"><view class="skeletonCard" /><view class="skeletonCard isShort" /></view>
        <view v-else-if="rankingError" class="classmatesState">
          <text class="classmatesStateTitle">榜单暂时没有加载出来</text>
          <text class="classmatesStateCopy">检查网络后再试一次</text>
          <view class="stateAction" @tap="loadLeaderboard"><text>重新加载</text></view>
        </view>
        <template v-else>
        <view class="rankingListHeader"><text>前 10 名</text><text>{{ rankingMeasure }}</text></view>
        <view v-if="topThree.length > 0" class="podium">
          <view
            v-for="entry in podiumEntries"
            :key="entry.userId"
            :class="['podiumEntry', `rank${entry.rank}`, entry.isMe && 'isMe']"
          >
            <view class="podiumPortrait">
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
            <view class="podiumScore"><text class="podiumPower">{{ formatLeaderboardValue(entry.value, selectedMetric) }}</text><text class="podiumUnit">{{ rankingUnit }}</text></view>
          </view>
        </view>

        <view v-if="regularRanking.length > 0" class="rankingList">
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
            <view class="rankingScore"><text class="rankingPower">{{ formatLeaderboardValue(entry.value, selectedMetric) }}</text><text class="rankingUnit">{{ rankingUnit }}</text></view>
          </view>
        </view>

        <view v-if="leaderboard.ranking.length === 0" class="classmatesState isEmpty leaderboardEmpty">
          <text class="classmatesStateTitle">榜单正在等你</text>
          <text class="classmatesStateCopy">{{ rankingEmptyCopy }}</text>
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
      </template>
    </view>

    <view v-if="activeTab === 'leaderboard' && !rankingLoading && !rankingError" class="myRankDock">
      <view class="myRankCard">
        <view class="myRankTopline">
          <text v-if="leaderboard.myRank !== null" class="myRankNumber"><text class="myRankHash">#</text>{{ leaderboard.myRank }}</text>
          <text v-else class="myRankUnranked">暂未排名</text>
          <text class="myRankLabel">我的排名</text>
          <view class="rankingScore"><text class="rankingPower">{{ formatLeaderboardValue(leaderboard.myValue, selectedMetric) }}</text><text class="rankingUnit">{{ rankingUnit }}</text></view>
        </view>
        <text class="myRankHint">{{ rankingHint }}</text>
      </view>
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
  type LeaderboardMetric,
  type LeaderboardPeriod,
  type LeaderboardSnapshot,
  type ShareDescriptor
} from '@/core/classmates'
import { trackAnalyticsEvent } from '@/core/analytics'
import { LEADERBOARD_METRICS, formatLeaderboardValue, leaderboardMeasure, leaderboardRankHint, leaderboardUnit } from '@/core/leaderboard'
import { flushProgressUpload } from '@/core/progressSync'
import { flushStudyEvents } from '@/core/studyStats'
import type { UnitGroup, WordEntry } from '@/core/types'

const EMPTY_LEADERBOARD: LeaderboardSnapshot = {
  metric: 'power', period: 'week', asOf: '', weekKey: '', weekStart: '', weekEnd: '', displayLimit: 10,
  myValue: 0, myRank: null, gapToPrevious: null, ranking: [], myEntry: null
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
const selectedMetric = ref<LeaderboardMetric>('power')
const selectedPeriod = ref<LeaderboardPeriod>('week')
const rankingLoading = ref(true)
const rankingError = ref(false)
let rankingRequest = 0
const feedItems = ref<FeedItem[]>([])
const classmates = ref<ClassmateSummary[]>([])
const leaderboard = ref<LeaderboardSnapshot>({ ...EMPTY_LEADERBOARD })
const preparedShare = ref<ShareDescriptor | null>(null)
const { activeVisualThemeStyle } = useVisualTheme()
const classmatesScreenStyle = computed(() => activeTab.value === 'leaderboard'
  ? `${activeVisualThemeStyle.value}; --page-bg: #fbfcfa; --surface: #ffffff; --ink: #203d35; --accent: #286447; --accent-soft: #eaf1e7; --muted: #7b887f; --line: #e5eae3;`
  : activeVisualThemeStyle.value)
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
const rankingUnit = computed(() => leaderboardUnit(selectedMetric.value))
const rankingMeasure = computed(() => leaderboardMeasure(selectedMetric.value, selectedPeriod.value))
const rankingHint = computed(() => leaderboardRankHint(leaderboard.value))
const rankingDate = computed(() => {
  const snapshot = leaderboard.value
  if (selectedPeriod.value === 'week') {
    return snapshot.weekStart ? `${snapshot.weekStart.slice(5, 10).replace('-', '.')} — ${snapshot.weekEnd.slice(5, 10).replace('-', '.')}` : ''
  }
  if (!snapshot.asOf) return ''
  const date = new Date(Date.parse(snapshot.asOf) + 8 * 3600_000).toISOString().slice(5, 10).replace('-', '.')
  return `截至 ${date}`
})
const rankingEmptyCopy = computed(() => selectedMetric.value === 'words'
  ? (selectedPeriod.value === 'week' ? '本周还没有新增掌握记录，学会新词就能积累成绩' : '掌握词汇后，你的积累会出现在这里')
  : selectedMetric.value === 'time' ? '开始学习，积累你的学习时长' : '完成一次听写，积累你的学习力')

async function loadLeaderboard() {
  const request = ++rankingRequest
  const metric = selectedMetric.value
  const period = selectedPeriod.value
  rankingLoading.value = true
  rankingError.value = false
  try {
    await Promise.all([flushProgressUpload(), flushStudyEvents()])
    const snapshot = await fetchLeaderboard(metric, period)
    if (request === rankingRequest) leaderboard.value = snapshot
  } catch (error) {
    if (request === rankingRequest) rankingError.value = true
    console.warn('[classmates] leaderboard load failed', error)
  } finally {
    if (request === rankingRequest) rankingLoading.value = false
  }
}

function selectMetric(metric: LeaderboardMetric) {
  if (metric === selectedMetric.value) return
  selectedMetric.value = metric
  void loadLeaderboard()
}

function selectPeriod(period: LeaderboardPeriod) {
  if (period === selectedPeriod.value) return
  selectedPeriod.value = period
  void loadLeaderboard()
}


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
  void loadLeaderboard()
  loading.value = true
  loadError.value = false
  try {
    const [feed, classmateRows] = await Promise.all([
      fetchClassmateFeed(),
      fetchClassmates()
    ])
    feedItems.value = feed.items
    classmates.value = classmateRows
  } catch (error) {
    console.warn('[classmates] load failed', error)
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function setActiveTab(tab: ClassmatesTab) {
  activeTab.value = tab
  storeActiveTab(tab)
  if (tab === 'leaderboard') trackAnalyticsEvent('leaderboard_view', { source: 'classmates_page' })
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

.inviteCard, .classmateManager, .feedList, .classmatesState, .podium {
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


.classmatesScreen.isLeaderboard { padding-bottom: calc(174px + env(safe-area-inset-bottom)); }
.leaderboardHeader { padding: 6px 5px 18px; }
.leaderboardTitle { display: block; font-size: 26px; line-height: 1.3; font-weight: 650; letter-spacing: -0.8px; }
.leaderboardMetrics { display: flex; gap: 25px; margin: 0 5px; border-bottom: 1px solid var(--line); }
.leaderboardMetric { position: relative; padding: 5px 0 15px; color: var(--muted); font-size: 16px; line-height: 22px; white-space: nowrap; }
.leaderboardMetric.isActive { color: var(--accent); font-weight: 650; }
.leaderboardMetric.isActive::after { position: absolute; right: 0; bottom: -1px; left: 0; height: 2px; background: var(--accent); content: ''; }
.leaderboardPeriodRow { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 17px 5px 13px; }
.leaderboardPeriods { display: flex; gap: 2px; padding: 3px; border-radius: 9px; background: #edf0eb; }
.leaderboardPeriod { padding: 6px 16px; border-radius: 7px; color: var(--muted); font-size: 12px; line-height: 18px; }
.leaderboardPeriod.isActive { background: #fff; color: var(--accent); box-shadow: 0 1px 4px rgba(37, 61, 51, 0.06); font-weight: 600; }
.leaderboardDate { color: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.rankingListHeader { display: flex; justify-content: space-between; margin: 0 5px 9px; color: var(--muted); font-size: 11px; line-height: 16px; }
.podium { box-sizing: border-box; display: grid; grid-template-columns: 1fr 1.12fr 1fr; align-items: end; min-height: 195px; padding: 20px 9px 19px; border: 1px solid #eae8dc; border-radius: 16px; box-shadow: none; background: radial-gradient(ellipse at 50% 24%, rgba(250, 240, 206, 0.44), transparent 61%), linear-gradient(145deg, #fcfbf6, #f5f6ee); }
.podiumEntry { --medal-edge: #a9b8b9; --medal-fill: linear-gradient(135deg, #fbfcfc 12%, #b8c5c7 48%, #fbfcfc 84%); --medal-ink: #647b7f; --medal-ribbon: #9eafb0; display: flex; flex-direction: column; align-items: center; grid-row: 1; min-width: 0; }
.podiumEntry.rank1 { --medal-edge: #c3a25a; --medal-fill: linear-gradient(135deg, #faf3d9 12%, #d4b66c 48%, #faf3d9 84%); --medal-ink: #987536; --medal-ribbon: #c5ae78; grid-column: 2; }
.podiumEntry.rank2 { grid-column: 1; }
.podiumEntry.rank3 { --medal-edge: #c39874; --medal-fill: linear-gradient(135deg, #fbebde 12%, #d8ad89 48%, #fbebde 84%); --medal-ink: #9c6f4e; --medal-ribbon: #c4997c; grid-column: 3; }
.podiumPortrait { position: relative; display: flex; justify-content: center; width: 100%; height: 81px; }
.rank1 .podiumPortrait { height: 98px; }
.podiumAvatar { position: relative; box-sizing: border-box; width: 62px; height: 62px; padding: 4px; border: 1px solid var(--medal-edge); background: var(--medal-fill); color: #526c54; font-size: 22px; font-weight: 500; box-shadow: 0 0 0 4px rgba(255, 250, 243, 0.5); }
.podiumAvatar > text, .podiumAvatar .avatarImage { display: flex; align-items: center; justify-content: center; box-sizing: border-box; width: 100%; height: 100%; border: 3px solid #fcfcf6; border-radius: 50%; background: #e0e8dc; }
.rank1 .podiumAvatar { width: 78px; height: 78px; font-size: 27px; box-shadow: 0 0 0 5px rgba(239, 230, 196, 0.17), 0 0 0 6px rgba(217, 191, 120, 0.2); }
.podiumMedal { position: absolute; top: 48px; left: 50%; z-index: 2; width: 26px; height: 34px; transform: translateX(-50%); }
.rank1 .podiumMedal { top: 63px; width: 30px; height: 39px; }
.podiumMedalRibbons { position: absolute; right: 4px; bottom: 0; left: 4px; display: flex; justify-content: space-between; height: 15px; }
.podiumMedalRibbon { width: 10px; height: 15px; background: var(--medal-ribbon); clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 77%, 0 100%); }
.podiumMedalRibbon.isLeft { transform: rotate(17deg); }
.podiumMedalRibbon.isRight { transform: rotate(-17deg); }
.podiumMedalDisc { position: relative; display: flex; align-items: center; justify-content: center; box-sizing: border-box; width: 26px; height: 26px; border: 1px solid var(--medal-edge); border-radius: 50%; background: var(--medal-fill); color: var(--medal-ink); box-shadow: inset 0 0 0 2px rgba(255, 253, 248, 0.5), inset 0 0 0 3px var(--medal-edge), 0 2px 4px rgba(111, 90, 48, 0.09); font-size: 13px; line-height: 1; font-weight: 650; }
.rank1 .podiumMedalDisc { width: 30px; height: 30px; font-size: 15px; }
.podiumNameRow { display: flex; align-items: center; justify-content: center; gap: 4px; width: 100%; min-width: 0; min-height: 20px; }
.podiumName { overflow: hidden; min-width: 0; font-size: 12px; line-height: 20px; font-weight: 550; text-overflow: ellipsis; white-space: nowrap; }
.meTag { flex: 0 0 auto; padding: 0 4px; border-radius: 4px; background: #e3eee5; color: #41725a; font-size: 9px; line-height: 16px; font-weight: 500; }
.podiumScore { display: flex; align-items: baseline; justify-content: center; max-width: 100%; margin-top: 5px; white-space: nowrap; }
.podiumPower { color: #436052; font-size: 21px; line-height: 1.2; font-weight: 550; letter-spacing: -0.5px; font-variant-numeric: tabular-nums; }
.rank1 .podiumPower { font-size: 26px; color: #3d5d40; }
.podiumUnit { margin-left: 3px; color: var(--muted); font-size: 9px; line-height: 1.4; }
.rankingList { overflow: hidden; margin-top: 9px; }
.rankingRow { position: relative; display: flex; align-items: center; min-height: 56px; padding: 0 9px; }
.rankingRow + .rankingRow::before { position: absolute; top: 0; right: 9px; left: 50px; height: 1px; background: var(--line); opacity: 0.55; content: ''; }
.rankingRow.isMe { border-radius: 8px; background: #f3f6f0; }
.rankingIndex { flex: 0 0 auto; min-width: 25px; margin-right: 10px; color: var(--muted); font-size: 14px; font-weight: 450; font-variant-numeric: tabular-nums; }
.rankingNameWrap { display: flex; flex: 1 1 auto; align-items: center; gap: 6px; min-width: 0; margin: 0 10px; }
.rankingName { overflow: hidden; min-width: 0; font-size: 14px; line-height: 1.4; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.rankingScore { display: flex; flex: 0 0 auto; align-items: baseline; white-space: nowrap; }
.rankingPower { color: #345447; font-size: 20px; line-height: 1.2; font-weight: 550; font-variant-numeric: tabular-nums; letter-spacing: -0.6px; }
.rankingUnit { margin-left: 4px; color: var(--muted); font-size: 10px; font-weight: 400; }
.myRankDock { position: fixed; z-index: 19; right: 0; bottom: calc(73px + env(safe-area-inset-bottom)); left: 0; padding: 8px 15px 10px; background: var(--page-bg); }
.myRankCard { box-sizing: border-box; max-width: 430px; margin: auto; padding: 13px 15px 12px; border: 1px solid #e2eadd; border-radius: 13px; background: #eaf1e7; }
.myRankTopline { display: flex; align-items: center; gap: 11px; }
.myRankNumber { color: var(--ink); font-size: 25px; line-height: 30px; letter-spacing: -1px; font-weight: 550; }
.myRankHash { margin-right: 2px; font-size: 11px; letter-spacing: 0; font-weight: 400; }
.myRankUnranked { color: var(--muted); font-size: 12px; }
.myRankLabel { flex: 1; font-size: 13px; font-weight: 550; }
.myRankHint { display: block; margin-top: 6px; color: #71816f; font-size: 10px; line-height: 15px; }
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
  .podiumPower { font-size: 18px; }
  .rank1 .podiumPower { font-size: 22px; }
  .rank1 .podiumAvatar { width: 70px; height: 70px; }
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
