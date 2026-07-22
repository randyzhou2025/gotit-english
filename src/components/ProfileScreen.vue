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
          <text v-else class="userSubline">点击头像或昵称可修改</text>
        </view>
      </view>

      <view class="promoBanner" @tap="goHome">
        <view class="promoCopy">
          <text class="promoBadge">学习</text>
          <text class="promoLine">
            今日已学 {{ dashboard?.todayWords ?? 0 }} 词 · 连续 {{ dashboard?.streakDays ?? 0 }} 天
          </text>
        </view>
        <view class="promoAction">
          <text>去练习</text>
          <view class="promoArrow" />
        </view>
      </view>

      <view class="sectionCard">
        <text class="sectionTitle">我的学习</text>
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
          <view class="learnItem" @tap="openCourseSetup">
            <view class="learnIcon learnIconPink">
              <view class="glyphBook" />
            </view>
            <text class="learnLabel">切换教材</text>
          </view>
        </view>
        <text class="statsSummary">
          累计掌握 {{ dashboard?.totalMastered ?? localMasteredCount }} 词 · 学习 {{ dashboard?.totalStudyDays ?? 0 }} 天 · 今日 {{ dashboard?.todayMinutes ?? 0 }} 分钟
        </text>
      </view>

      <view class="sectionCard">
        <text class="sectionTitle">工具和服务</text>
        <view class="toolGrid">
          <view class="toolItem" @tap="openFeedback">
            <view class="toolIcon">
              <view class="toolGlyph toolGlyphFeedback" />
            </view>
            <text class="toolLabel">意见反馈</text>
          </view>
          <view class="toolItem" @tap="openCustomerService">
            <view class="toolIcon">
              <view class="toolGlyph toolGlyphService" />
            </view>
            <text class="toolLabel">联系客服</text>
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
          <view class="toolItem" @tap="openCourseSetup">
            <view class="toolIcon">
              <view class="toolGlyph toolGlyphCourse" />
            </view>
            <text class="toolLabel">切换教材</text>
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

    <view v-if="showServiceModal" class="serviceMask" @tap="closeCustomerService">
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
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { flushPracticeCloudSync, usePracticeSession } from '@/app/usePracticeSession'
import { flushCloudSyncOnForeground } from '@/core/cloudSyncPolicy'
import { readLocalProgressSnapshot } from '@/core/progressMerge'
import TabBottomNav from '@/components/TabBottomNav.vue'
import { flushStudyEvents, getCachedDashboard, refreshDashboard, setCachedDashboard } from '@/core/studyStats'
import {
  ensureUserSession,
  fetchCurrentUser,
  fetchPublicConfig,
  getAuthToken,
  getCachedUser,
  isApiEnabled,
  type DashboardSnapshot,
  updateUserProfile,
  uploadAvatar
} from '@/core/userSession'

const miniProgramCapsuleTop = ref(44)
const user = ref(getCachedUser())
const dashboard = ref<DashboardSnapshot | null>(getCachedDashboard())
const icpNumber = ref('')
const customerServiceQrUrl = ref('')
const showServiceModal = ref(false)
const editingNickname = ref(false)
const nicknameDraft = ref('')
const syncing = ref(false)
const apiEnabled = isApiEnabled()

const { savedWeakWords } = usePracticeSession()

const weakbookCount = computed(() => savedWeakWords.value.length)
const weakbookBadge = computed(() => String(Math.min(weakbookCount.value, 99)))
const localMasteredCount = computed(() => readLocalProgressSnapshot().masteredWordIds.length)
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
    const result = await new Promise<UniApp.DownloadFileSuccessCallbackResult>((resolve, reject) => {
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
  // #ifdef MP-WEIXIN
  return `padding-top: ${miniProgramCapsuleTop.value}px; --capsule-top: ${miniProgramCapsuleTop.value}px;`
  // #endif
  return ''
})

function updateMiniProgramNavInset() {
  try {
    const menuButton = uni.getMenuButtonBoundingClientRect?.()
    if (menuButton && menuButton.top > 0) {
      miniProgramCapsuleTop.value = menuButton.top
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

async function syncProgress() {
  if (syncing.value) return
  syncing.value = true
  try {
    flushCloudSyncOnForeground(true)
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

.promoBanner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 16px 18px;
  border-radius: 16px;
  background: linear-gradient(90deg, #ffb45c 0%, #ffd08a 100%);
  box-shadow: 0 10px 24px rgba(255, 148, 64, 0.22);
}

.promoCopy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.promoBadge {
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.28);
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.promoLine {
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.45;
}

.promoAction {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  border-radius: 999px;
  background: #fff;
  color: #f08a24;
  font-size: 13px;
  font-weight: 900;
}

.promoArrow {
  width: 7px;
  height: 7px;
  border-top: 2px solid #f08a24;
  border-right: 2px solid #f08a24;
  transform: rotate(45deg);
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
</style>
