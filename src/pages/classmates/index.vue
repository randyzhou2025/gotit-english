<template>
  <view class="classmatesScreen hasBottomNav" :style="activeVisualThemeStyle" @tap="closeLearningPowerHelp">
    <view class="classmatesChrome">
      <text class="classmatesTitle">同学</text>
      <view class="classmatesTabs">
        <view :class="['classmatesTab', activeTab === 'feed' && 'isActive']" @tap="setActiveTab('feed')">
          <text>同学动态</text>
        </view>
        <view :class="['classmatesTab', activeTab === 'leaderboard' && 'isActive']" @tap="setActiveTab('leaderboard')">
          <text>排行榜</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="classmatesScroll" :show-scrollbar="false">
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
        <view class="inviteCard">
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
            <text class="leaderboardTitle">本周排行榜</text>
            <view class="learningPowerHelpAnchor" @tap.stop>
              <text class="leaderboardMeta">按本周学习力排名</text>
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
            <view class="podiumMedal" :aria-label="`第${entry.rank}名奖牌`">
              <view class="podiumMedalRibbons">
                <view class="podiumMedalRibbon isLeft" />
                <view class="podiumMedalRibbon isRight" />
              </view>
              <view class="podiumMedalDisc"><text>{{ entry.rank }}</text></view>
            </view>
            <view class="podiumAvatar">
              <image v-if="entry.avatarUrl" class="avatarImage" :src="entry.avatarUrl" mode="aspectFill" />
              <text v-else>{{ avatarInitial(entry.nickname) }}</text>
            </view>
            <text class="podiumName">{{ entry.nickname }}<template v-if="entry.isMe"> · 我</template></text>
            <text class="podiumPower">{{ entry.learningPower }}</text>
            <text class="podiumUnit">学习力</text>
          </view>
        </view>

        <view v-if="regularRanking.length > 0" class="rankingList">
          <view v-for="entry in regularRanking" :key="entry.userId" :class="['rankingRow', entry.isMe && 'isMe']">
            <text class="rankingIndex">{{ String(entry.rank).padStart(2, '0') }}</text>
            <view class="avatar isRanking">
              <image v-if="entry.avatarUrl" class="avatarImage" :src="entry.avatarUrl" mode="aspectFill" />
              <text v-else>{{ avatarInitial(entry.nickname) }}</text>
            </view>
            <text class="rankingName">{{ entry.nickname }}<template v-if="entry.isMe"> · 我</template></text>
            <text class="rankingPower">{{ entry.learningPower }}</text>
          </view>
        </view>

        <view v-if="leaderboard.myEntry" class="myRankSection">
          <text class="sectionHeading">我的排名</text>
          <view class="rankingRow isMe">
            <text class="rankingIndex">{{ leaderboard.myEntry.rank }}</text>
            <view class="avatar isRanking"><text>{{ avatarInitial(leaderboard.myEntry.nickname) }}</text></view>
            <text class="rankingName">{{ leaderboard.myEntry.nickname }} · 我</text>
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
        <button class="leaderboardInvite" open-type="share" hover-class="buttonPressed" @tap="trackClassmateInviteClick('leaderboard')"><text>邀请同学一起学</text></button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <view class="leaderboardInvite" @tap="showShareHint('leaderboard')"><text>邀请同学一起学</text></view>
        <!-- #endif -->
      </template>
    </scroll-view>

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
  if (item.activityType === 'STREAK') return `已经连续学习 ${item.countValue ?? 0} 天`
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
  void ensurePageSession().then(loadPageData)
})
</script>

<style scoped lang="scss">
.classmatesScreen {
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
  padding: calc(14px + env(safe-area-inset-top)) 20px 0;
  border-bottom: 1px solid var(--line);
  background: var(--theme-chrome);
  backdrop-filter: blur(18px);
}

.classmatesTitle { display: block; font-size: 26px; line-height: 1.2; font-weight: 950; }
.classmatesTabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 12px; }
.classmatesTab { position: relative; display: flex; justify-content: center; padding: 11px 8px 13px; color: var(--muted); font-size: 14px; font-weight: 800; }
.classmatesTab.isActive { color: var(--accent); }
.classmatesTab.isActive::after { position: absolute; right: 28%; bottom: 0; left: 28%; height: 3px; border-radius: 999px; background: var(--accent); content: ''; }

.classmatesScroll { height: calc(100vh - 128px - env(safe-area-inset-top)); height: calc(100dvh - 128px - env(safe-area-inset-top)); }
.classmatesScroll :deep(.uni-scroll-view-content) { box-sizing: border-box; padding: 18px 18px 34px; }

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
.avatar.isRanking { width: 36px; height: 36px; font-size: 13px; }
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

.leaderboardHeader { padding: 2px 2px 14px; }
.leaderboardTitle { display: block; font-size: 22px; font-weight: 950; }
.learningPowerHelpAnchor { position: relative; display: inline-flex; align-items: center; margin-top: 4px; gap: 5px; }
.leaderboardMeta { color: var(--muted); font-size: 12px; font-weight: 650; }
.learningPowerHelpButton { display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; border: 1px solid var(--muted); border-radius: 50%; color: var(--muted); font-size: 11px; line-height: 1; font-weight: 900; }
.learningPowerHelpPopover { position: absolute; top: 26px; left: 0; z-index: 6; box-sizing: border-box; display: flex; flex-direction: column; width: 292px; max-width: calc(100vw - 40px); padding: 13px 14px; border: 1px solid #bdd5c9; border-radius: 13px; background: #fffdf8; box-shadow: 0 12px 30px rgba(23, 52, 44, 0.16); }
.learningPowerHelpTitle { margin-bottom: 7px; color: var(--ink); font-size: 13px; line-height: 1.3; font-weight: 900; }
.learningPowerHelpRule { color: var(--ink-soft); font-size: 11px; line-height: 1.65; font-weight: 650; }
.podium { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: end; min-height: 214px; padding: 18px 10px 14px; background: linear-gradient(180deg, #fff9ec, var(--surface)); }
.podiumEntry { display: flex; flex-direction: column; align-items: center; min-width: 0; }
.podiumEntry.rank1 { order: 2; transform: translateY(-16px); }
.podiumEntry.rank2 { order: 1; }
.podiumEntry.rank3 { order: 3; }
.podiumMedal { position: relative; width: 38px; height: 46px; margin-bottom: 8px; }
.podiumMedalRibbons { position: absolute; top: 0; left: 6px; display: flex; width: 26px; height: 23px; }
.podiumMedalRibbon { width: 13px; height: 23px; background: #8d9b97; }
.podiumMedalRibbon.isLeft { transform: rotate(8deg); transform-origin: top right; }
.podiumMedalRibbon.isRight { transform: rotate(-8deg); transform-origin: top left; }
.podiumMedalDisc { position: absolute; bottom: 0; left: 2px; display: flex; align-items: center; justify-content: center; box-sizing: border-box; width: 34px; height: 34px; border: 3px solid #aeb7b4; border-radius: 50%; background: linear-gradient(145deg, #f7faf9, #bdc7c4); color: #5e6966; box-shadow: 0 3px 8px rgba(44, 57, 53, 0.16); font-size: 13px; font-weight: 950; }
.rank1 .podiumMedalRibbon { background: #b88c20; }
.rank1 .podiumMedalDisc { border-color: #c79621; background: linear-gradient(145deg, #fff1ae, #d6a328); color: #76530a; }
.rank2 .podiumMedalRibbon { background: #899592; }
.rank2 .podiumMedalDisc { border-color: #9aa5a2; background: linear-gradient(145deg, #f8fbfa, #b7c1be); color: #58625f; }
.rank3 .podiumMedalRibbon { background: #a66b45; }
.rank3 .podiumMedalDisc { border-color: #a96840; background: linear-gradient(145deg, #efc2a0, #b87750); color: #6f3d21; }
.podiumAvatar { width: 54px; height: 54px; border: 3px solid #bfc6c3; background: #eef1ef; }
.rank1 .podiumAvatar { width: 66px; height: 66px; border-color: #d5b66b; box-shadow: 0 0 20px rgba(213, 182, 107, 0.2); }
.rank3 .podiumAvatar { border-color: #bd8f72; }
.podiumName { overflow: hidden; max-width: 92px; margin-top: 8px; font-size: 12px; font-weight: 850; text-overflow: ellipsis; white-space: nowrap; }
.podiumPower { margin-top: 5px; color: var(--ink); font-size: 23px; line-height: 1; font-weight: 950; }
.podiumUnit { margin-top: 3px; color: var(--muted); font-size: 9px; font-weight: 650; }
.rankingList { overflow: hidden; margin-top: 14px; }
.rankingRow { display: flex; align-items: center; min-height: 58px; padding: 0 14px; }
.rankingRow + .rankingRow { border-top: 1px solid var(--line); }
.rankingRow.isMe { background: var(--accent-soft); }
.rankingIndex { flex: 0 0 30px; color: var(--muted); font-size: 13px; font-weight: 850; }
.rankingName { flex: 1 1 auto; overflow: hidden; margin-left: 10px; font-size: 14px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.rankingPower { flex: 0 0 auto; color: var(--accent); font-size: 18px; font-weight: 950; }
.myRankSection { overflow: hidden; margin-top: 14px; padding-top: 14px; }
.myRankSection > .sectionHeading { padding: 0 14px 8px; }
.overtakeCard { margin-top: 14px; padding: 14px 16px; border-color: #bdd5c9; background: var(--accent-soft); color: var(--accent); font-size: 13px; line-height: 1.5; font-weight: 800; text-align: center; }
.leaderboardEmpty { margin-top: 0; }
.leaderboardInvite { width: 100%; height: 50px; margin-top: 16px; }

.classmatesLoading { padding: 14px 0; }
.skeletonLine, .skeletonCard { border-radius: 14px; background: var(--surface); }
.skeletonLine.isTitle { width: 45%; height: 24px; }
.skeletonCard { height: 170px; margin-top: 18px; }
.skeletonCard.isShort { height: 96px; }
</style>
