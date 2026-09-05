<template>
  <view class="screen hasBottomNav profileScreen" :style="screenStyle">
    <view class="profileLayout isSplitLayout">
      <view class="pageChrome">
        <view class="profileNav">
          <text class="navTitle">个人中心</text>
        </view>
      </view>

      <scroll-view scroll-y class="profileScroll" :show-scrollbar="false">
      <view class="userRow">
        <button class="avatarButton" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
          <image class="avatarImage" :src="avatarDisplayUrl" mode="aspectFill" />
        </button>
        <view class="userMetaBlock">
          <input
            v-if="editingNickname"
            class="nicknameInput"
            type="nickname"
            maxlength="20"
            :focus="editingNickname"
            :value="nicknameDraft"
            @input="onNicknameInput"
            @blur="commitNickname"
            @confirm="commitNickname"
          />
          <text v-else class="nicknameText" @tap="startNicknameEdit">{{ user?.nickname || '课本单词通' }}</text>
          <view v-if="displayUserId" class="userIdRow" @tap="copyUserId">
            <text class="userIdText">ID: {{ displayUserId }}</text>
            <view class="copyIcon" />
          </view>
          <text v-if="showProfileEditHint" class="userSubline">点击头像或昵称可修改</text>
        </view>
      </view>

      <view class="sectionCard">
        <view class="sectionHeader">
          <text class="sectionTitle">我的学习</text>
          <view class="scoreShareButton" role="button" aria-label="晒成绩" @tap="openScoreShare">
            <text class="scoreShareSpark">↗</text>
            <text>晒成绩</text>
          </view>
        </view>
        <view class="learnGrid">
          <view class="learnItem" @tap="goWeakbook">
            <view class="learnIcon learnIconBlue">
              <view class="glyphFolder" />
            </view>
            <text class="learnLabel">生词本</text>
            <text v-if="weakbookCount > 0" class="learnBadge">{{ weakbookBadge }}</text>
          </view>
          <view class="learnItem learnItemStat">
            <view class="learnIcon learnIconGreen learnIconStat">
              <text class="learnIconValue">{{ dashboard?.todayWords ?? 0 }}</text>
              <text class="learnIconUnit">词</text>
            </view>
            <text class="learnLabel">今日单词</text>
          </view>
          <view class="learnItem learnItemStat">
            <view class="learnIcon learnIconOrange learnIconStat">
              <text class="learnIconValue">{{ dashboard?.streakDays ?? 0 }}</text>
              <text class="learnIconUnit">天</text>
            </view>
            <text class="learnLabel">连续学习</text>
          </view>
          <view class="learnItem learnItemStat">
            <view class="learnIcon learnIconPink learnIconStat">
              <text class="learnIconValue">{{ dashboard?.totalStudyDays ?? 0 }}</text>
              <text class="learnIconUnit">天</text>
            </view>
            <text class="learnLabel">累计学习</text>
          </view>
        </view>
        <text class="statsSummary">
          累计掌握 {{ dashboard?.totalMastered ?? localMasteredCount }} 词 · 学习 {{ dashboard?.totalStudyDays ?? 0 }} 天 · 今日 {{ dashboard?.todayMinutes ?? 0 }} 分钟
        </text>
      </view>

      <view class="studyCalendarCard">
        <view
          class="studyCalendarHeader"
          role="button"
          :aria-label="calendarExpanded ? '折叠学习日历' : '展开学习日历'"
          @tap="calendarExpanded = !calendarExpanded"
        >
          <view class="studyCalendarHeading">
            <view class="studyCalendarMark" />
            <text class="studyCalendarTitle">学习日历</text>
          </view>
          <view class="studyCalendarHeaderMeta">
            <text class="studyCalendarSummary">近 30 天学习 {{ recentStudyDays }} 天</text>
            <view :class="['calendarToggleArrow', { isExpanded: calendarExpanded }]" />
          </view>
        </view>
        <view class="calendarWeekHeader">
          <text v-for="label in calendarWeekLabels" :key="label" class="calendarWeekLabel">
            {{ label }}
          </text>
        </view>
        <view class="studyCalendarGrid">
          <view
            v-for="index in displayedCalendarStartOffset"
            :key="'spacer-' + index"
            class="calendarDay isSpacer"
          />
          <view
            v-for="item in displayedCalendarItems"
            :key="item.date"
            :class="[
              'calendarDay',
              'level' + item.level,
              { 'isToday': item.isToday, 'isFuture': item.isFuture }
            ]"
            role="img"
            :aria-label="item.ariaLabel"
          >
            <text class="calendarDayLabel">{{ item.isToday ? '今' : item.dayLabel }}</text>
          </view>
        </view>
        <view class="studyCalendarLegend">
          <text class="calendarLegendLabel">少</text>
          <view
            v-for="level in calendarLegendLevels"
            :key="level"
            :class="['calendarLegendSwatch', 'level' + level]"
          />
          <text class="calendarLegendLabel">多</text>
        </view>
      </view>

      <view class="reminderStrip" role="button" aria-label="设置学习提醒" @tap="openReminderSettings">
        <view class="reminderStripIcon"><view class="toolGlyph toolGlyphReminder" /></view>
        <view class="reminderStripCopy">
          <text class="reminderStripTitle">学习提醒</text>
          <text class="reminderStripDesc">
            {{ reminder.enabled
              ? `每天 ${reminder.reminderTime} · ${reminder.mode === 'long_term' ? '长期提醒' : `剩余 ${reminder.remainingCredits ?? 0} 次`}`
              : '每天固定时间，提醒自己开始听写' }}
          </text>
        </view>
        <view class="reminderStripAction">
          <text>{{ reminder.enabled ? reminder.reminderTime : '未开启' }}</text>
          <view class="rowArrow" />
        </view>
      </view>

      <view class="sectionCard">
        <text class="sectionTitle">工具和服务</text>
        <view class="toolGrid">
          <view class="toolItem" @tap="openCourseSetup">
            <view class="toolIcon">
              <view class="toolGlyph toolGlyphCourse" />
            </view>
            <text class="toolLabel">切换教材</text>
          </view>
          <view
            class="toolItem"
            role="button"
            :aria-label="`切换主题，当前${activeVisualTheme.name}`"
            @tap="switchToNextVisualTheme"
          >
            <view class="toolIcon toolThemeIcon">
              <view class="toolThemeSwatch" />
            </view>
            <text class="toolLabel">主题</text>
          </view>
          <view v-if="apiEnabled" class="toolItem" @tap="syncProgress">
            <view class="toolIcon">
              <view class="toolGlyph toolGlyphSync" />
            </view>
            <text class="toolLabel">{{ syncing ? '同步中' : '云同步' }}</text>
          </view>
          <view v-else class="toolItem" @tap="goHome">
            <view class="toolIcon">
              <view class="toolGlyph toolGlyphHome" />
            </view>
            <text class="toolLabel">开始练习</text>
          </view>
          <view class="toolItem" @tap="openFeedback">
            <view class="toolIcon">
              <view class="toolGlyph toolGlyphFeedback" />
            </view>
            <text class="toolLabel">意见反馈</text>
          </view>
          <view v-if="customerServiceEnabled" class="toolItem" @tap="openCustomerService">
            <view class="toolIcon">
              <view class="toolGlyph toolGlyphService" />
            </view>
            <text class="toolLabel">联系客服</text>
          </view>
        </view>
      </view>

      <view v-if="icpNumber" class="icpFooter">
        <text class="icpShield">🛡</text>
        <text>{{ icpNumber }}</text>
      </view>
      </scroll-view>
    </view>

    <TabBottomNav active="profile" :weakbook-count="weakbookCount" />

    <view v-if="customerServiceEnabled && showServiceModal" class="serviceMask" @tap="closeCustomerService">
      <view class="servicePanel" @tap.stop>
        <text class="serviceTitle">联系客服</text>
        <text class="serviceDesc">使用中遇到任何问题，可联系客服寻求帮助</text>
        <image
          v-if="customerServiceQrUrl"
          class="serviceQr"
          :src="customerServiceQrUrl"
          mode="aspectFit"
          show-menu-by-longpress
        />
        <view v-else class="serviceQrPlaceholder">
          <text>客服二维码待配置</text>
        </view>
        <text class="serviceFootnote">长按识别二维码，添加客服</text>
        <view class="serviceClose" @tap="closeCustomerService">
          <text>关闭</text>
        </view>
      </view>
    </view>

    <canvas
      id="scorePosterCanvas"
      canvas-id="scorePosterCanvas"
      class="scorePosterCanvas"
      :width="scorePosterWidth"
      :height="scorePosterHeight"
    />

    <view v-if="showScoreModal" class="modalMask" @tap="closeScoreShare">
      <view class="scorePanel" @tap.stop>
        <view class="modalHeader">
          <text class="modalTitle">晒成绩</text>
          <view class="modalClose" @tap="closeScoreShare"><text>×</text></view>
        </view>
        <view class="scorePreview">
          <image v-if="scorePosterPath" class="scorePosterImage" :src="scorePosterPath" mode="aspectFit" />
          <view v-else class="scorePosterLoading"><text>{{ scorePosterGenerating ? '成绩海报生成中…' : '海报生成失败，请重试' }}</text></view>
        </view>
        <view class="scoreActions">
          <button class="secondaryModalButton" @tap="saveScorePoster">保存图片</button>
          <button class="primaryModalButton" open-type="share">微信分享</button>
        </view>
        <text class="modalFootnote">海报数据来自当前学习记录</text>
      </view>
    </view>

    <view v-if="showReminderModal" class="modalMask" @tap="closeReminderSettings">
      <view class="reminderPanel" @tap.stop>
        <view class="modalHeader">
          <text class="modalTitle">学习提醒</text>
          <view class="modalClose" @tap="closeReminderSettings"><text>×</text></view>
        </view>
        <view class="reminderHero">
          <view class="reminderHeroIcon"><view class="toolGlyph toolGlyphReminder" /></view>
          <view class="reminderHeroCopy">
            <text class="reminderHeroTitle">每天按时开始听写</text>
            <text class="reminderHeroDesc">到点后通过微信服务通知提醒你</text>
          </view>
        </view>
        <picker mode="time" :value="reminderDraftTime" @change="onReminderTimeChange">
          <view class="reminderTimeRow">
            <text class="reminderTimeLabel">提醒时间</text>
            <view class="reminderTimeValue">
              <text>{{ reminderDraftTime }}</text>
              <view class="rowArrow" />
            </view>
          </view>
        </picker>
        <text class="reminderModeNote">
          {{ reminder.mode === 'long_term'
            ? '开启后每天推送；可随时回来修改时间或关闭。'
            : reminder.enabled
              ? `当前剩余 ${reminder.remainingCredits ?? 0} 次通知；每次完成听写后会自动续期 1 天。`
              : '微信当前提供单次订阅：每授权一次，可预约一次学习提醒。' }}
        </text>
        <view v-if="reminder.mode === 'one_time'" class="reminderPermissionHint">
          <text>开启时请在微信授权弹窗中选择“允许”，并勾选“总是保持以上选择”，以后完成听写即可自动续期。</text>
        </view>
        <button class="primaryModalButton reminderPrimaryButton" :loading="reminderSaving" @tap="enableOrSaveReminder">
          {{ reminder.enabled && reminder.mode === 'one_time' ? '续期提醒（再授权 1 天）' : reminder.enabled ? '保存提醒时间' : '授权并开启提醒' }}
        </button>
        <button v-if="reminder.enabled" class="reminderDisableButton" :disabled="reminderSaving" @tap="disableReminder">
          关闭提醒
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { flushPracticeCloudSync, usePracticeSession } from '@/app/usePracticeSession'
import { useVisualTheme } from '@/app/useVisualTheme'
import { readLocalProgressSnapshot } from '@/core/progressMerge'
import { formatScorePosterDate, pickScorePosterQuote } from '@/core/scorePosterCopy'
import {
  DEFAULT_LEARNING_REMINDER,
  fetchLearningReminder,
  renewLearningReminder,
  requestLearningReminderSubscription,
  saveLearningReminder,
  type LearningReminderSettings
} from '@/core/learningReminder'
import TabBottomNav from '@/components/TabBottomNav.vue'
import { flushStudyEvents, getCachedDashboard, refreshDashboard, setCachedDashboard } from '@/core/studyStats'
import {
  ensureUserSession,
  fetchCurrentUser,
  fetchPublicConfig,
  getAuthToken,
  getCachedUser,
  isApiEnabled,
  shouldShowProfileEditHint,
  type DashboardSnapshot,
  updateUserProfile,
  uploadAvatar
} from '@/core/userSession'

const miniProgramCapsuleTop = ref(44)
const miniProgramCapsuleHeight = ref(32)
const user = ref(getCachedUser())
const dashboard = ref<DashboardSnapshot | null>(getCachedDashboard())
const icpNumber = ref('')
const customerServiceQrUrl = ref('')
const showServiceModal = ref(false)
const editingNickname = ref(false)
const nicknameDraft = ref('')
const syncing = ref(false)
const calendarExpanded = ref(false)
const showScoreModal = ref(false)
const scorePosterGenerating = ref(false)
const scorePosterPath = ref('')
const scorePosterQuoteIndex = ref(-1)
const showReminderModal = ref(false)
const reminderSaving = ref(false)
const reminder = ref<LearningReminderSettings>({ ...DEFAULT_LEARNING_REMINDER })
const reminderDraftTime = ref('19:00')
const instance = getCurrentInstance()
const scorePosterWidth = 375
const scorePosterHeight = 530
const scorePosterExportWidth = 750
const scorePosterExportHeight = 1060
const apiEnabled = isApiEnabled()
const customerServiceEnabled = false

const { savedWeakWords } = usePracticeSession()
const { activeVisualTheme, activeVisualThemeStyle, switchToNextVisualTheme } = useVisualTheme()

const weakbookCount = computed(() => savedWeakWords.value.length)
const weakbookBadge = computed(() => String(Math.min(weakbookCount.value, 99)))
const localMasteredCount = computed(() => readLocalProgressSnapshot().masteredWordIds.length)
const calendarWeekLabels = ['一', '二', '三', '四', '五', '六', '日']
const calendarLegendLevels = [1, 2, 3, 4]

function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function recentDateKeys(): string[] {
  const today = new Date()
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today)
    date.setHours(12, 0, 0, 0)
    date.setDate(today.getDate() - 29 + index)
    return localDateKey(date)
  })
}

function legacyWeeklyStudyByDate(): Map<string, number> {
  const result = new Map<string, number>()
  const values = dashboard.value?.weeklyMinutes
  if (!Array.isArray(values) || values.length !== 7) return result

  const today = new Date()
  const todayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1
  const monday = new Date(today)
  monday.setHours(12, 0, 0, 0)
  monday.setDate(today.getDate() - todayIndex)

  values.slice(0, todayIndex + 1).forEach((value, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    result.set(localDateKey(date), Math.max(0, Math.round(Number(value) || 0)))
  })
  return result
}

const recentStudyData = computed(() => {
  const apiData = new Map(
    (dashboard.value?.recent30Days ?? []).map((item) => [item.date, item])
  )
  const legacyData = legacyWeeklyStudyByDate()

  return recentDateKeys().map((date, index) => {
    const apiItem = apiData.get(date)
    const minutes = apiItem
      ? Math.max(0, Math.round(Number(apiItem.minutes) || 0))
      : legacyData.get(date) ?? (index === 29 ? dashboard.value?.todayMinutes ?? 0 : 0)
    return {
      date,
      minutes,
      studied: apiItem?.studied ?? minutes > 0
    }
  })
})

function calendarIntensity(minutes: number, studied: boolean): number {
  if (!studied) return 0
  if (minutes <= 5) return 1
  if (minutes <= 15) return 2
  if (minutes <= 30) return 3
  return 4
}

const recentStudyDays = computed(() => recentStudyData.value.filter((item) => item.studied).length)
const calendarStartOffset = computed(() => {
  const firstDate = new Date(`${recentStudyData.value[0]?.date}T12:00:00`)
  const day = firstDate.getDay()
  return day === 0 ? 6 : day - 1
})
const studyCalendarItems = computed(() => {
  const todayKey = localDateKey(new Date())
  return recentStudyData.value.map((item) => {
    const [, month = '', day = ''] = item.date.split('-')
    const dayNumber = Number(day)
    return {
      ...item,
      dayLabel: dayNumber === 1 ? `${Number(month)}/1` : String(dayNumber),
      level: calendarIntensity(item.minutes, item.studied),
      isToday: item.date === todayKey,
      isFuture: false,
      ariaLabel: `${Number(month)}月${dayNumber}日，${item.studied ? `学习 ${item.minutes} 分钟` : '未学习'}`
    }
  })
})
const currentWeekCalendarItems = computed(() => {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const todayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - todayIndex)
  const studyByDate = new Map(recentStudyData.value.map((item) => [item.date, item]))
  const todayKey = localDateKey(today)

  return Array.from({ length: 7 }, (_, index) => {
    const dateValue = new Date(monday)
    dateValue.setDate(monday.getDate() + index)
    const date = localDateKey(dateValue)
    const study = studyByDate.get(date) ?? { date, minutes: 0, studied: false }
    const month = dateValue.getMonth() + 1
    const day = dateValue.getDate()
    const isFuture = date > todayKey
    return {
      ...study,
      dayLabel: day === 1 ? `${month}/1` : String(day),
      level: calendarIntensity(study.minutes, study.studied),
      isToday: date === todayKey,
      isFuture,
      ariaLabel: `${month}月${day}日，${isFuture ? '尚未到来' : study.studied ? `学习 ${study.minutes} 分钟` : '未学习'}`
    }
  })
})
const displayedCalendarItems = computed(() => (
  calendarExpanded.value ? studyCalendarItems.value : currentWeekCalendarItems.value
))
const displayedCalendarStartOffset = computed(() => (
  calendarExpanded.value ? calendarStartOffset.value : 0
))
const avatarPreviewUrl = ref('')
const avatarDisplayUrl = computed(() => (
  avatarPreviewUrl.value
  || user.value?.avatarUrl
  || '/static/tabbar/profile.png'
))

const displayUserId = computed(() => {
  if (!user.value?.createdAt) return ''
  const ts = new Date(user.value.createdAt).getTime()
  if (!Number.isFinite(ts)) return ''
  return String(ts).slice(-9)
})

const showProfileEditHint = computed(() => shouldShowProfileEditHint(user.value))

function isLocalAvatarPath(url: string): boolean {
  return url.startsWith('wxfile://')
    || url.startsWith('http://tmp/')
    || url.startsWith('https://tmp/')
    || url.startsWith('/')
}

async function cacheAvatarForDisplay(url: string) {
  if (!url || isLocalAvatarPath(url)) {
    avatarPreviewUrl.value = url
    return
  }

  if (!/^https?:\/\//.test(url)) return

  try {
    const result = await new Promise<{ statusCode?: number; tempFilePath?: string }>((resolve, reject) => {
      uni.downloadFile({ url, success: resolve, fail: reject })
    })
    if ((result.statusCode ?? 0) >= 200 && (result.statusCode ?? 0) < 300 && result.tempFilePath) {
      avatarPreviewUrl.value = result.tempFilePath
    }
  } catch (error) {
    console.warn('[ProfileScreen] avatar download failed', error)
  }
}

const screenStyle = computed(() => {
  let style = activeVisualThemeStyle.value

  // #ifdef MP-WEIXIN
  style += ` padding-top: ${miniProgramCapsuleTop.value}px;`
    + ` --capsule-top: ${miniProgramCapsuleTop.value}px;`
    + ` --capsule-h: ${miniProgramCapsuleHeight.value}px;`
  // #endif

  return style
})

function updateMiniProgramNavInset() {
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect?.()
    if (menuButton && menuButton.top > 0) {
      miniProgramCapsuleTop.value = menuButton.top
      miniProgramCapsuleHeight.value = menuButton.height || 32
    }
  } catch {
    // ignore
  }
}

async function loadProfileData() {
  user.value = getCachedUser() ?? user.value
  dashboard.value = getCachedDashboard() ?? dashboard.value

  void refreshProfileDataInBackground()
}

async function refreshProfileDataInBackground() {
  if (apiEnabled) {
    try {
      if (!getAuthToken()) {
        const session = await ensureUserSession()
        if (session) {
          user.value = session.user
          dashboard.value = session.dashboard
          setCachedDashboard(session.dashboard)
        }
      } else {
        const [nextUser, nextDashboard] = await Promise.all([
          fetchCurrentUser(),
          refreshDashboard()
        ])
        if (nextUser) user.value = nextUser
        if (nextDashboard) dashboard.value = nextDashboard
      }
    } catch (error) {
      console.warn('[ProfileScreen] profile refresh failed', error)
    }
  }

  try {
    const config = await fetchPublicConfig()
    icpNumber.value = config.icpNumber
    customerServiceQrUrl.value = config.customerServiceQrUrl
  } catch {
    // keep cached footer values
  }

  if (user.value?.avatarUrl) {
    await cacheAvatarForDisplay(user.value.avatarUrl)
  }

  if (apiEnabled && getAuthToken()) {
    try {
      reminder.value = await fetchLearningReminder()
      reminderDraftTime.value = reminder.value.reminderTime
    } catch (error) {
      console.warn('[ProfileScreen] reminder refresh failed', error)
    }
  }
}

function startNicknameEdit() {
  nicknameDraft.value = user.value?.nickname ?? ''
  editingNickname.value = true
}

function onNicknameInput(event: Event) {
  const miniProgramValue = (event as unknown as { detail?: { value?: string } }).detail?.value
  const webValue = (event.target as HTMLInputElement | null)?.value
  nicknameDraft.value = String(miniProgramValue ?? webValue ?? '').slice(0, 20)
}

async function commitNickname() {
  editingNickname.value = false
  const nextNickname = nicknameDraft.value.trim().slice(0, 20)
  if (!nextNickname || nextNickname === user.value?.nickname) return

  const updated = await updateUserProfile({ nickname: nextNickname })
  if (updated) {
    user.value = updated
    uni.showToast({ title: '昵称已更新', icon: 'none' })
    return
  }

  uni.showToast({ title: '昵称更新失败', icon: 'none' })
}

async function onChooseAvatar(event: Event) {
  const avatarUrl = (event as unknown as { detail?: { avatarUrl?: string } }).detail?.avatarUrl
  if (!avatarUrl) return

  avatarPreviewUrl.value = avatarUrl

  try {
    let nextUrl = avatarUrl

    if (isLocalAvatarPath(avatarUrl)) {
      const uploadedUrl = await uploadAvatar(avatarUrl)
      if (!uploadedUrl) {
        throw new Error('头像上传失败')
      }
      nextUrl = uploadedUrl
    } else if (!/^https:\/\//.test(avatarUrl)) {
      throw new Error('不支持的头像地址')
    }

    const updated = await updateUserProfile({ avatarUrl: nextUrl })
    if (!updated) {
      throw new Error('保存头像失败')
    }

    user.value = updated
    await cacheAvatarForDisplay(updated.avatarUrl || avatarUrl)
    uni.showToast({ title: '头像已更新', icon: 'none' })
  } catch (error) {
    console.warn('[ProfileScreen] avatar update failed', error)
    uni.showToast({ title: '头像更新失败', icon: 'none' })
  }
}

function copyUserId() {
  if (!displayUserId.value) return
  uni.setClipboardData({
    data: displayUserId.value,
    success: () => uni.showToast({ title: 'ID 已复制', icon: 'none' })
  })
}

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}

function goWeakbook() {
  uni.switchTab({ url: '/pages/weakbook/index' })
}

function openFeedback() {
  uni.navigateTo({ url: '/pages/feedback/index' })
}

function openCustomerService() {
  showServiceModal.value = true
}

function closeCustomerService() {
  showServiceModal.value = false
}

function openCourseSetup() {
  uni.navigateTo({ url: '/pages/course/index' })
}

function drawPosterRoundedRect(
  context: ReturnType<typeof uni.createCanvasContext>,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.lineTo(x + width - radius, y)
  context.arcTo(x + width, y, x + width, y + radius, radius)
  context.lineTo(x + width, y + height - radius)
  context.arcTo(x + width, y + height, x + width - radius, y + height, radius)
  context.lineTo(x + radius, y + height)
  context.arcTo(x, y + height, x, y + height - radius, radius)
  context.lineTo(x, y + radius)
  context.arcTo(x, y, x + radius, y, radius)
  context.closePath()
}

async function generateScorePoster() {
  if (scorePosterGenerating.value) return
  scorePosterGenerating.value = true
  scorePosterPath.value = ''
  await nextTick()

  try {
    const context = uni.createCanvasContext('scorePosterCanvas', instance?.proxy)
    const todayWords = dashboard.value?.todayWords ?? 0
    const streakDays = dashboard.value?.streakDays ?? 0
    const totalMastered = dashboard.value?.totalMastered ?? localMasteredCount.value
    const studyDays = dashboard.value?.totalStudyDays ?? 0
    const nickname = (user.value?.nickname || '课本单词通同学').slice(0, 14)
    const selectedQuote = pickScorePosterQuote(scorePosterQuoteIndex.value)
    scorePosterQuoteIndex.value = selectedQuote.index

    context.scale(0.5, 0.5)
    context.setFillStyle('#e8f3ed')
    context.fillRect(0, 0, scorePosterExportWidth, scorePosterExportHeight)
    context.setFillStyle('#d3e7dc')
    context.beginPath()
    context.arc(650, 120, 220, 0, Math.PI * 2)
    context.fill()
    context.setFillStyle('#b9d7ca')
    context.beginPath()
    context.arc(90, 580, 260, 0, Math.PI * 2)
    context.fill()

    context.setFillStyle('#174c3b')
    context.setFontSize(28)
    context.fillText('DAILY LEARNING NOTE', 64, 82)
    context.setFontSize(48)
    context.fillText(`“${selectedQuote.quote.lines[0]}`, 64, 190)
    context.fillText(`${selectedQuote.quote.lines[1]}”`, 64, 258)
    context.setFillStyle('#4f7468')
    context.setFontSize(25)
    context.fillText(`— ${selectedQuote.quote.author}`, 66, 330)

    context.setFillStyle('#ffffff')
    drawPosterRoundedRect(context, 48, 430, 654, 490, 34)
    context.fill()

    context.setFillStyle('#174c3b')
    context.setFontSize(34)
    context.fillText(nickname, 82, 505)
    context.setFillStyle('#7a8d86')
    context.setFontSize(23)
    context.fillText(formatScorePosterDate(new Date()), 82, 548)

    const stats = [
      { value: todayWords, label: '今日学习 / 词', x: 84, y: 665 },
      { value: streakDays, label: '连续学习 / 天', x: 398, y: 665 },
      { value: totalMastered, label: '累计掌握 / 词', x: 84, y: 815 },
      { value: studyDays, label: '累计学习 / 天', x: 398, y: 815 }
    ]
    stats.forEach((stat) => {
      context.setFillStyle('#174c3b')
      context.setFontSize(58)
      context.fillText(String(stat.value), stat.x, stat.y)
      context.setFillStyle('#7a8d86')
      context.setFontSize(22)
      context.fillText(stat.label, stat.x, stat.y + 42)
    })

    context.setStrokeStyle('#e3ebe6')
    context.setLineWidth(2)
    context.beginPath()
    context.moveTo(375, 600)
    context.lineTo(375, 840)
    context.stroke()

    context.setFillStyle('#174c3b')
    context.setFontSize(26)
    context.fillText('KEEP GOING.', 64, 1000)
    context.setFillStyle('#6f8b81')
    context.setFontSize(20)
    context.fillText('A RECORD OF TODAY’S LEARNING', 64, 1034)

    await new Promise<void>((resolve) => context.draw(false, resolve))
    const path = await new Promise<string>((resolve, reject) => {
      uni.canvasToTempFilePath({
        canvasId: 'scorePosterCanvas',
        width: scorePosterWidth,
        height: scorePosterHeight,
        destWidth: scorePosterExportWidth,
        destHeight: scorePosterExportHeight,
        fileType: 'png',
        success: (result) => resolve(result.tempFilePath),
        fail: reject
      }, instance?.proxy)
    })
    scorePosterPath.value = path
    uni.setStorageSync('gotit:profile:scorePoster', path)
  } catch (error) {
    console.warn('[ProfileScreen] score poster generation failed', error)
    uni.showToast({ title: '海报生成失败，请重试', icon: 'none' })
  } finally {
    scorePosterGenerating.value = false
  }
}

function openScoreShare() {
  showScoreModal.value = true
  void generateScorePoster()
}

function closeScoreShare() {
  showScoreModal.value = false
}

async function saveScorePoster() {
  if (!scorePosterPath.value) {
    await generateScorePoster()
  }
  if (!scorePosterPath.value) return
  try {
    await new Promise<void>((resolve, reject) => {
      uni.saveImageToPhotosAlbum({
        filePath: scorePosterPath.value,
        success: () => resolve(),
        fail: reject
      })
    })
    uni.showToast({ title: '已保存到相册', icon: 'success' })
  } catch (error) {
    const message = String((error as { errMsg?: string }).errMsg ?? '')
    if (message.includes('auth deny') || message.includes('authorize')) {
      uni.showModal({
        title: '需要相册权限',
        content: '请在设置中允许保存图片到相册。',
        confirmText: '去设置',
        success: (result) => {
          if (result.confirm) uni.openSetting({})
        }
      })
      return
    }
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
}

async function openReminderSettings() {
  showReminderModal.value = true
  reminderDraftTime.value = reminder.value.reminderTime
  if (!apiEnabled || !getAuthToken()) return
  try {
    reminder.value = await fetchLearningReminder()
    reminderDraftTime.value = reminder.value.reminderTime
  } catch (error) {
    console.warn('[ProfileScreen] reminder load failed', error)
  }
}

function closeReminderSettings() {
  showReminderModal.value = false
}

function onReminderTimeChange(event: Event) {
  const value = (event as unknown as { detail?: { value?: string } }).detail?.value
  if (value) reminderDraftTime.value = value
}

function confirmReminderAutoRenew(): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title: '开启学习提醒',
      content: '请在接下来的微信授权弹窗中选择“允许”，并勾选“总是保持以上选择”。以后每次完成听写时，系统才能自动为提醒续期 1 天。',
      confirmText: '继续开启',
      success: (result) => resolve(Boolean(result.confirm)),
      fail: () => resolve(false)
    })
  })
}

async function enableOrSaveReminder() {
  if (reminderSaving.value) return
  if (!apiEnabled || !getAuthToken()) {
    uni.showToast({ title: '请在微信小程序中设置提醒', icon: 'none' })
    return
  }
  if (!reminder.value.available || !reminder.value.templateId) {
    uni.showToast({ title: '提醒服务配置中，请稍后再试', icon: 'none' })
    return
  }

  reminderSaving.value = true
  try {
    if (!reminder.value.enabled && reminder.value.mode === 'one_time') {
      const confirmed = await confirmReminderAutoRenew()
      if (!confirmed) return
    }

    if (reminder.value.mode === 'one_time' || !reminder.value.enabled) {
      const accepted = await requestLearningReminderSubscription(reminder.value.templateId)
      if (!accepted) {
        uni.showToast({ title: '未获得微信通知授权', icon: 'none' })
        return
      }
      const wasEnabled = reminder.value.enabled
      reminder.value = await renewLearningReminder(reminderDraftTime.value)
      uni.showToast({ title: wasEnabled ? '提醒已续期 1 天' : '学习提醒已开启', icon: 'success' })
    } else {
      reminder.value = await saveLearningReminder({
        enabled: true,
        reminderTime: reminderDraftTime.value
      })
      uni.showToast({ title: '提醒时间已保存', icon: 'success' })
    }
    showReminderModal.value = false
  } catch (error) {
    console.warn('[ProfileScreen] reminder save failed', error)
    uni.showToast({ title: '提醒设置失败，请重试', icon: 'none' })
  } finally {
    reminderSaving.value = false
  }
}

async function disableReminder() {
  if (reminderSaving.value) return
  reminderSaving.value = true
  try {
    reminder.value = await saveLearningReminder({
      enabled: false,
      reminderTime: reminderDraftTime.value
    })
    uni.showToast({ title: '学习提醒已关闭', icon: 'none' })
    showReminderModal.value = false
  } catch (error) {
    console.warn('[ProfileScreen] reminder disable failed', error)
    uni.showToast({ title: '关闭失败，请重试', icon: 'none' })
  } finally {
    reminderSaving.value = false
  }
}

async function syncProgress() {
  if (syncing.value) return
  syncing.value = true
  try {
    await flushStudyEvents()
    await flushPracticeCloudSync()
    dashboard.value = await refreshDashboard()
    uni.showToast({ title: '同步完成', icon: 'none' })
  } catch {
    uni.showToast({ title: '同步失败', icon: 'none' })
  } finally {
    syncing.value = false
  }
}

onMounted(() => {
  updateMiniProgramNavInset()
  void loadProfileData()
})

onShow(() => {
  updateMiniProgramNavInset()
  void loadProfileData()
})
</script>

<style scoped lang="scss">
.screen {
  box-sizing: border-box;
  width: 100%;
  max-width: 430px;
  min-height: 100vh;
  min-height: 100dvh;
  margin: 0 auto;
  padding: calc(8px + env(safe-area-inset-top)) 16px calc(86px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, #e8f7f5 0%, #f4f8fb 38%, #f7f8fa 100%) no-repeat;
  background-color: #f7f8fa;
}

.profileScreen {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
}

.profileLayout {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.isSplitLayout {
  height: 100%;
}

.pageChrome {
  flex: 0 0 auto;
  z-index: 30;
  padding-bottom: 8px;
  background: #e8f7f5;
}

.profileNav {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
}

.navTitle {
  color: #1f2933;
  font-size: 18px;
  font-weight: 950;
  letter-spacing: 0.02em;
  text-align: center;
}

/* #ifdef MP-WEIXIN */
.screen {
  max-width: none;
  padding-right: 16px;
  padding-left: 16px;
}
/* #endif */

.profileScroll {
  flex: 1 1 auto;
  height: 0;
  min-height: 0;
  padding-top: 2px;
}

.userRow {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  padding: 4px 2px 0;
}

.avatarButton {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  padding: 0;
  margin: 0;
  border: 3px solid #fff;
  border-radius: 999px;
  overflow: hidden;
  background: #eef6f8;
  box-shadow: 0 8px 18px rgba(31, 41, 51, 0.08);
}

.avatarButton::after {
  border: 0;
}

.avatarImage {
  width: 64px;
  height: 64px;
  border-radius: 999px;
}

.userMetaBlock {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.nicknameText,
.nicknameInput {
  color: #1f2933;
  font-size: 20px;
  font-weight: 900;
  line-height: 1.2;
}

.nicknameInput {
  width: 100%;
}

.userIdRow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
}

.userIdText,
.userSubline {
  color: #8a9298;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
}

.copyIcon {
  width: 12px;
  height: 12px;
  border: 1.5px solid #b8c0c6;
  border-radius: 2px;
  background:
    linear-gradient(#b8c0c6, #b8c0c6) 3px 6px / 6px 1px no-repeat,
    linear-gradient(#b8c0c6, #b8c0c6) 3px 8px / 4px 1px no-repeat;
}

.sectionCard {
  margin-bottom: 14px;
  padding: 18px 16px 16px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(31, 41, 51, 0.05);
}

.sectionTitle {
  display: block;
  margin-bottom: 16px;
  color: #1f2933;
  font-size: 16px;
  font-weight: 900;
}

.sectionHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.sectionHeader .sectionTitle {
  margin-bottom: 0;
}

.scoreShareButton {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 850;
  line-height: 1;
}

.scoreShareSpark {
  font-size: 14px;
  font-weight: 900;
}

.learnGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.learnItem {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 4px 0 2px;
}

.learnIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
}

.learnIconBlue {
  background: #e8f3ff;
}

.learnIconGreen {
  background: #e7f8ef;
}

.learnIconOrange {
  background: #fff1df;
}

.learnIconPink {
  background: #ffecef;
}

.learnIconStat {
  flex-direction: column;
  gap: 2px;
}

.learnIconValue {
  color: #1f2933;
  font-size: 22px;
  font-weight: 950;
  line-height: 1;
}

.learnIconUnit {
  color: #6b7280;
  font-size: 11px;
  font-weight: 850;
  line-height: 1;
}

.learnItemStat {
  pointer-events: none;
}

.glyphFolder {
  position: relative;
  width: 22px;
  height: 16px;
  border-radius: 3px;
  background: #5b9df5;
}

.glyphFolder::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 0;
  width: 12px;
  height: 6px;
  border-radius: 3px 3px 0 0;
  background: #5b9df5;
}

.glyphFolder::after {
  content: '';
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: inset 0 0 0 1.5px #5b9df5;
}

.glyphBook {
  width: 18px;
  height: 22px;
  border-radius: 3px;
  background: linear-gradient(90deg, #ff9f7a 0%, #ff9f7a 48%, #ffd2bf 48%, #ffd2bf 100%);
  box-shadow: inset -2px 0 0 rgba(255, 255, 255, 0.35);
}

.learnLabel {
  color: #4b5563;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.2;
  text-align: center;
}

.learnBadge {
  position: absolute;
  top: -2px;
  right: 4px;
  min-width: 16px;
  padding: 1px 4px;
  border-radius: 999px;
  background: #ff4b4b;
  color: #fff;
  font-size: 10px;
  font-weight: 900;
  line-height: 1.3;
  text-align: center;
}

.statsSummary {
  display: block;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #f0f2f5;
  color: #8a9298;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
}

.studyCalendarCard {
  margin-bottom: 12px;
  padding: 17px 16px 15px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}

.studyCalendarHeader,
.studyCalendarHeading {
  display: flex;
  align-items: center;
}

.studyCalendarHeader {
  justify-content: space-between;
  gap: 12px;
}

.studyCalendarHeading {
  gap: 10px;
}

.studyCalendarHeaderMeta {
  display: flex;
  align-items: center;
  gap: 9px;
}

.calendarToggleArrow {
  width: 7px;
  height: 7px;
  border-right: 2px solid var(--muted);
  border-bottom: 2px solid var(--muted);
  transform: rotate(45deg) translateY(-2px);
  transition: transform 180ms ease;
}

.calendarToggleArrow.isExpanded {
  transform: rotate(225deg) translate(-1px, -1px);
}

.studyCalendarMark {
  width: 4px;
  height: 20px;
  border-radius: 999px;
  background: var(--accent);
}

.studyCalendarTitle {
  color: var(--ink);
  font-size: 16px;
  font-weight: 850;
  line-height: 1.2;
}

.studyCalendarSummary {
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.calendarWeekHeader,
.studyCalendarGrid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  column-gap: 6px;
}

.calendarWeekHeader {
  margin-top: 16px;
  margin-bottom: 7px;
}

.calendarWeekLabel {
  color: var(--muted-light);
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  text-align: center;
}

.studyCalendarGrid {
  row-gap: 6px;
}

.calendarDay {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  border: 1px solid transparent;
  border-radius: 9px;
}

.calendarDay.isSpacer {
  visibility: hidden;
}

.calendarDay.level0 {
  border-color: rgba(221, 217, 206, 0.72);
  background: var(--surface-soft);
}

.calendarDay.level1,
.calendarLegendSwatch.level1 {
  background: var(--calendar-level-1);
}

.calendarDay.level2,
.calendarLegendSwatch.level2 {
  background: var(--calendar-level-2);
}

.calendarDay.level3,
.calendarLegendSwatch.level3 {
  background: var(--calendar-level-3);
}

.calendarDay.level4,
.calendarLegendSwatch.level4 {
  background: var(--calendar-level-4);
}

.calendarDay.isToday {
  box-shadow: 0 0 0 2px var(--surface), 0 0 0 3px var(--accent);
}

.calendarDay.isFuture {
  opacity: 0.46;
}

.calendarDayLabel {
  color: var(--ink-soft);
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.calendarDay.level3 .calendarDayLabel,
.calendarDay.level4 .calendarDayLabel {
  color: var(--surface);
}

.studyCalendarLegend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  margin-top: 14px;
}

.calendarLegendLabel {
  color: var(--muted);
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
}

.calendarLegendSwatch {
  width: 12px;
  height: 12px;
  border-radius: 4px;
}

.reminderStrip {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}

.reminderStripIcon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: #faeee2;
}

.reminderStripCopy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.reminderStripTitle {
  color: var(--ink);
  font-size: 15px;
  font-weight: 850;
}

.reminderStripDesc {
  overflow: hidden;
  color: var(--muted);
  font-size: 11px;
  font-weight: 650;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reminderStripAction {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 850;
}

.toolGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px 8px;
}

.toolItem {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.toolIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 999px;
  background: #f3f5f7;
}

.toolThemeIcon {
  background: var(--surface-soft);
  box-shadow: inset 0 0 0 1px var(--line);
}

.toolThemeSwatch {
  width: 24px;
  height: 24px;
  border: 2px solid var(--surface);
  border-radius: 999px;
  background: var(--theme-switch-swatch);
  box-shadow: 0 3px 8px var(--accent-shadow);
}

.toolGlyphReminder {
  width: 18px;
  height: 17px;
  border: 2px solid #c8733c;
  border-radius: 10px 10px 5px 5px;
}

.toolGlyphReminder::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 6px;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: #c8733c;
}

.toolGlyphReminder::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 5px;
  width: 6px;
  height: 3px;
  border-radius: 0 0 999px 999px;
  background: #c8733c;
}

.toolGlyph {
  position: relative;
}

.toolGlyphFeedback {
  width: 16px;
  height: 18px;
  border: 2px solid #6b7280;
  border-radius: 2px;
}

.toolGlyphFeedback::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 8px;
  height: 1.5px;
  background: #6b7280;
  box-shadow: 0 4px 0 #6b7280, 0 8px 0 #6b7280;
}

.toolGlyphService {
  width: 18px;
  height: 14px;
  border: 2px solid #6b7280;
  border-radius: 8px 8px 4px 4px;
}

.toolGlyphService::before,
.toolGlyphService::after {
  content: '';
  position: absolute;
  top: 8px;
  width: 4px;
  height: 6px;
  border: 2px solid #6b7280;
  border-radius: 999px;
  background: #f3f5f7;
}

.toolGlyphService::before {
  left: 2px;
}

.toolGlyphService::after {
  right: 2px;
}

.toolGlyphSync {
  width: 16px;
  height: 16px;
  border: 2px solid #6b7280;
  border-top-color: transparent;
  border-right-color: transparent;
  border-radius: 999px;
  transform: rotate(-45deg);
}

.toolGlyphSync::after {
  content: '';
  position: absolute;
  top: -1px;
  right: -1px;
  width: 0;
  height: 0;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 6px solid #6b7280;
  transform: rotate(45deg);
}

.toolGlyphCourse {
  width: 16px;
  height: 18px;
  border: 2px solid #6b7280;
  border-radius: 2px;
}

.toolGlyphCourse::before {
  content: '';
  position: absolute;
  top: 4px;
  left: 3px;
  width: 8px;
  height: 1.5px;
  background: #6b7280;
  box-shadow: 0 4px 0 #6b7280;
}

.toolGlyphHome {
  width: 16px;
  height: 14px;
  border: 2px solid #6b7280;
  border-top: 0;
}

.toolGlyphHome::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 1px;
  width: 10px;
  height: 10px;
  border-top: 2px solid #6b7280;
  border-left: 2px solid #6b7280;
  transform: rotate(45deg);
}

.toolLabel {
  color: #4b5563;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
}

.icpFooter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 0 20px;
  color: #b0b8bf;
  font-size: 11px;
  font-weight: 700;
}

.icpShield {
  font-size: 12px;
  line-height: 1;
}

.serviceMask {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(30, 58, 78, 0.42);
}

.servicePanel {
  width: min(100%, 320px);
  padding: 22px 20px 18px;
  border-radius: 20px;
  background: #fff;
}

.serviceTitle {
  display: block;
  color: #1f2933;
  font-size: 20px;
  font-weight: 900;
}

.serviceDesc {
  display: block;
  margin-top: 8px;
  color: #8a9298;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
}

.serviceQr,
.serviceQrPlaceholder {
  width: 220px;
  height: 220px;
  margin: 18px auto 0;
  border-radius: 16px;
  background: #f7f7f7;
}

.serviceQrPlaceholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b0b8bf;
  font-size: 13px;
  font-weight: 700;
}

.serviceFootnote {
  display: block;
  margin-top: 12px;
  text-align: center;
  color: #8a9298;
  font-size: 13px;
  font-weight: 700;
}

.serviceClose {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  padding: 12px;
  border-radius: 14px;
  background: #e8f7f5;
  color: #2bb8a9;
  font-size: 15px;
  font-weight: 900;
}

.scorePosterCanvas {
  position: fixed;
  top: 0;
  left: -1200px;
  width: 375px;
  height: 530px;
  pointer-events: none;
}

.modalMask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 18px;
  background: rgba(23, 52, 44, 0.5);
}

.scorePanel,
.reminderPanel {
  box-sizing: border-box;
  width: min(100%, 360px);
  border: 1px solid var(--line);
  border-radius: 24px;
  background: var(--surface);
  box-shadow: 0 24px 64px rgba(23, 52, 44, 0.24);
}

.scorePanel {
  padding: 18px;
}

.reminderPanel {
  padding: 20px;
}

.modalHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 34px;
}

.modalTitle {
  color: var(--ink);
  font-size: 20px;
  font-weight: 900;
}

.modalClose {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--muted);
  font-size: 24px;
  line-height: 1;
}

.scorePreview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48vh;
  min-height: 320px;
  max-height: 480px;
  margin-top: 14px;
  overflow: hidden;
  border-radius: 18px;
  background: var(--surface-soft);
}

.scorePosterImage {
  display: block;
  width: 100%;
  height: 100%;
}

.scorePosterLoading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 360px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}

.scoreActions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 14px;
}

.primaryModalButton,
.secondaryModalButton,
.reminderDisableButton {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-height: 46px;
  padding: 0 14px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 850;
  line-height: 1.2;
}

.primaryModalButton::after,
.secondaryModalButton::after,
.reminderDisableButton::after {
  border: 0;
}

.primaryModalButton {
  background: var(--accent);
  color: var(--surface);
}

.secondaryModalButton {
  border: 1px solid var(--line);
  background: var(--surface-soft);
  color: var(--ink);
}

.modalFootnote,
.reminderModeNote {
  display: block;
  color: var(--muted);
  font-size: 11px;
  font-weight: 650;
  line-height: 1.55;
}

.modalFootnote {
  margin-top: 10px;
  text-align: center;
}

.reminderHero {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  padding: 15px;
  border-radius: 16px;
  background: #faeee2;
}

.reminderHeroIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.7);
}

.reminderHeroCopy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.reminderHeroTitle {
  color: var(--ink);
  font-size: 15px;
  font-weight: 850;
}

.reminderHeroDesc {
  color: var(--muted);
  font-size: 11px;
  font-weight: 650;
  line-height: 1.4;
}

.reminderTimeRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding: 16px 2px;
  border-bottom: 1px solid var(--line);
}

.reminderTimeLabel {
  color: var(--ink);
  font-size: 15px;
  font-weight: 800;
}

.reminderTimeValue {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--accent);
  font-size: 17px;
  font-weight: 900;
}

.rowArrow {
  width: 7px;
  height: 7px;
  border-top: 2px solid var(--muted);
  border-right: 2px solid var(--muted);
  transform: rotate(45deg);
}

.reminderModeNote {
  margin-top: 12px;
}

.reminderPermissionHint {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--surface-soft);
  color: var(--muted);
  font-size: 11px;
  font-weight: 650;
  line-height: 1.55;
}

.reminderPrimaryButton {
  width: 100%;
  margin-top: 18px;
}

.reminderDisableButton {
  width: 100%;
  margin-top: 8px;
  background: transparent;
  color: var(--muted);
}

/* V3 paper editorial UI */
.screen {
  color: var(--ink);
  background: var(--page-bg);
}

.pageChrome {
  padding-bottom: 10px;
  background: var(--page-bg);
}

.profileNav {
  height: var(--capsule-h, 32px);
  min-height: var(--capsule-h, 32px);
}

.navTitle {
  color: var(--ink);
  font-size: 18px;
  font-weight: 800;
}

.profileScroll {
  padding-top: 6px;
}

.userRow {
  margin-bottom: 12px;
  padding: 4px 2px;
}

.avatarButton {
  width: 60px;
  height: 60px;
  border: 2px solid var(--surface);
  background: var(--accent-soft);
  box-shadow: 0 7px 16px var(--ink-shadow);
}

.avatarImage {
  width: 60px;
  height: 60px;
}

.nicknameText,
.nicknameInput {
  color: var(--ink);
}

.userIdText,
.userSubline {
  color: var(--muted);
}

.sectionCard {
  margin-bottom: 12px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}

.sectionTitle,
.learnIconValue {
  color: var(--ink);
}

.learnIconBlue {
  background: var(--info-soft);
}

.learnIconGreen {
  background: var(--accent-soft);
}

.learnIconOrange {
  background: #faeee2;
}

.learnIconPink {
  background: #efeae0;
}

.glyphFolder {
  background: var(--info);
}

.glyphFolder::before {
  background: var(--info);
}

.glyphFolder::after {
  box-shadow: inset 0 0 0 1.5px var(--info);
}

.learnLabel,
.toolLabel {
  color: var(--ink-soft);
}

.learnBadge {
  background: var(--danger);
}

.statsSummary {
  border-color: var(--line);
  color: var(--muted);
}

.toolGrid {
  grid-template-columns: repeat(4, 1fr);
}

.toolIcon {
  border: 1px solid var(--line);
  background: var(--surface-soft);
}

.toolGlyphFeedback,
.toolGlyphService,
.toolGlyphCourse {
  border-color: var(--ink-soft);
}

.toolGlyphFeedback::after,
.toolGlyphCourse::before {
  background: var(--ink-soft);
  box-shadow: 0 4px 0 var(--ink-soft), 0 8px 0 var(--ink-soft);
}

.toolGlyphSync {
  border-left-color: var(--ink-soft);
  border-bottom-color: var(--ink-soft);
}

.toolGlyphSync::after {
  border-left-color: var(--ink-soft);
}

.serviceMask {
  background: rgba(23, 52, 44, 0.46);
}

.servicePanel {
  background: var(--surface);
}

.serviceClose {
  background: var(--accent-soft);
  color: var(--accent);
}
</style>
