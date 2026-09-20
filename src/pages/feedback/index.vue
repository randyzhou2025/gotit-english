<template>
  <view class="screen" :style="screenStyle">
    <FixedPageHeader>
      <view class="feedbackNav">
        <view class="navBack" @tap="goBack">
          <view class="chevronLeft" />
        </view>
        <text class="navTitle">{{ activeThread ? '反馈对话' : '意见反馈' }}</text>
      </view>
    </FixedPageHeader>

    <view v-if="activeThread" class="threadScreen">
      <view class="threadMeta">
        <text class="threadCategory">{{ categoryLabel(activeThread.category) }}</text>
        <text class="threadTime">{{ formatTime(activeThread.createdAt) }}</text>
      </view>

      <view class="messageList">
        <view class="messageRow isMine">
          <view class="messageBubble isMine">
            <text class="messageRole">我</text>
            <text class="messageText">{{ activeThread.content }}</text>
          </view>
        </view>
        <view
          v-for="reply in activeThread.replies"
          :key="reply.id"
          :class="['messageRow', reply.sender === 'user' ? 'isMine' : 'isAdmin']"
        >
          <view :class="['messageBubble', reply.sender === 'user' ? 'isMine' : 'isAdmin']">
            <text class="messageRole">{{ reply.sender === 'user' ? '我' : '管理员' }}</text>
            <text class="messageText">{{ reply.content }}</text>
          </view>
        </view>
      </view>

      <view class="replyComposer">
        <textarea
          v-model="replyContent"
          class="replyTextarea"
          maxlength="500"
          placeholder="继续回复管理员（1-500字）"
          :show-confirm-bar="false"
        />
        <view :class="['submitButton', replySubmitting && 'isDisabled']" @tap="sendReply">
          <text>{{ replySubmitting ? '发送中…' : '发送回复' }}</text>
        </view>
      </view>
    </view>

    <view v-else class="feedbackBody">
      <view v-if="threads.length > 0" class="threadSection">
        <text class="sectionLabel">我的反馈</text>
        <view
          v-for="thread in threads"
          :key="thread.id"
          class="threadCard"
          @tap="openThread(thread.id)"
        >
          <view class="threadCardTop">
            <text class="threadCardCategory">{{ categoryLabel(thread.category) }}</text>
            <text v-if="thread.unread" class="unreadBadge">新回复</text>
          </view>
          <text class="threadCardPreview">{{ threadPreview(thread) }}</text>
          <text class="threadCardTime">{{ formatTime(thread.updatedAt) }}</text>
        </view>
      </view>

      <text class="sectionLabel">新的反馈</text>
      <view class="categoryGrid">
        <view
          v-for="item in categories"
          :key="item.id"
          :class="['categoryChip', selectedCategory === item.id && 'isActive']"
          @tap="selectedCategory = item.id"
        >
          <text>{{ item.label }}</text>
        </view>
      </view>

      <text class="sectionLabel">问题描述</text>
      <textarea
        v-model="content"
        class="feedbackTextarea"
        maxlength="500"
        placeholder="请描述你遇到的问题或建议（1-500字）"
        :show-confirm-bar="false"
      />
      <text class="charCount">{{ content.length }}/500</text>

      <view :class="['submitButton', submitting && 'isDisabled']" @tap="submit">
        <text>{{ submitting ? '提交中…' : '提交反馈' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import FixedPageHeader from '@/components/FixedPageHeader.vue'
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useVisualTheme } from '@/app/useVisualTheme'
import { useWeappShare } from '@/app/useWeappShare'
import {
  FEEDBACK_CATEGORY_LABELS,
  fetchFeedbackThread,
  fetchFeedbackThreads,
  submitFeedback,
  submitFeedbackReply,
  type FeedbackThreadDetail,
  type FeedbackThreadSummary
} from '@/core/feedback'
import type { FeedbackCategory } from '@/core/userSession'

useWeappShare()
const { activeVisualThemeStyle } = useVisualTheme()

const categories: Array<{ id: FeedbackCategory; label: string }> = [
  { id: 'bug', label: '错误反馈' },
  { id: 'malfunction', label: '功能异常' },
  { id: 'experience', label: '体验问题' },
  { id: 'feature', label: '新功能建议' },
  { id: 'other', label: '其他' }
]

const selectedCategory = ref<FeedbackCategory>('bug')
const content = ref('')
const submitting = ref(false)
const replyContent = ref('')
const replySubmitting = ref(false)
const threads = ref<FeedbackThreadSummary[]>([])
const activeThread = ref<FeedbackThreadDetail | null>(null)
const didAutoOpenUnread = ref(false)
const miniProgramCapsuleTop = ref(44)
const miniProgramCapsuleHeight = ref(32)

const screenStyle = computed(() => (
  `${activeVisualThemeStyle.value} padding-top: ${miniProgramCapsuleTop.value}px;`
  + ` --capsule-top: ${miniProgramCapsuleTop.value}px;`
  + ` --capsule-h: ${miniProgramCapsuleHeight.value}px;`
))

try {
  const menuButton = uni.getMenuButtonBoundingClientRect?.()
  if (menuButton && menuButton.top > 0) {
    miniProgramCapsuleTop.value = menuButton.top
    miniProgramCapsuleHeight.value = menuButton.height || 32
  }
} catch {
  // ignore
}

function categoryLabel(category: string) {
  return FEEDBACK_CATEGORY_LABELS[category] || category
}

function formatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${minute}`
}

function threadPreview(thread: FeedbackThreadSummary) {
  if (thread.lastMessage) {
    const who = thread.lastMessage.sender === 'admin' ? '管理员' : '我'
    return `${who}：${thread.lastMessage.content}`
  }
  return thread.content
}

async function loadThreads(autoOpenUnread = false) {
  try {
    threads.value = await fetchFeedbackThreads()
    if (autoOpenUnread && !didAutoOpenUnread.value) {
      const unread = threads.value.find(thread => thread.unread)
      if (unread) {
        didAutoOpenUnread.value = true
        await openThread(unread.id)
      }
    }
  } catch {
    threads.value = []
  }
}

async function openThread(id: string) {
  try {
    const thread = await fetchFeedbackThread(id)
    if (!thread) {
      uni.showToast({ title: '加载失败', icon: 'none' })
      return
    }
    activeThread.value = thread
    threads.value = threads.value.map(item => item.id === id ? { ...item, unread: false } : item)
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

function goBack() {
  if (activeThread.value) {
    activeThread.value = null
    replyContent.value = ''
    void loadThreads()
    return
  }

  uni.navigateBack({
    fail: () => {
      uni.switchTab({ url: '/pages/profile/index' })
    }
  })
}

async function submit() {
  const trimmed = content.value.trim()
  if (!trimmed) {
    uni.showToast({ title: '请填写问题描述', icon: 'none' })
    return
  }

  if (submitting.value) return
  submitting.value = true
  try {
    const ok = await submitFeedback({
      category: selectedCategory.value,
      content: trimmed
    })
    if (!ok) {
      uni.showToast({ title: '提交失败，请先登录', icon: 'none' })
      return
    }

    content.value = ''
    uni.showToast({ title: '反馈已提交', icon: 'none' })
    await loadThreads()
  } catch {
    uni.showToast({ title: '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function sendReply() {
  if (!activeThread.value) return
  const trimmed = replyContent.value.trim()
  if (!trimmed) {
    uni.showToast({ title: '请填写回复内容', icon: 'none' })
    return
  }
  if (replySubmitting.value) return
  replySubmitting.value = true
  try {
    const reply = await submitFeedbackReply(activeThread.value.id, trimmed)
    if (!reply) {
      uni.showToast({ title: '发送失败，请先登录', icon: 'none' })
      return
    }
    activeThread.value = {
      ...activeThread.value,
      replies: [...activeThread.value.replies, reply],
      lastMessage: reply,
      unread: false
    }
    replyContent.value = ''
  } catch {
    uni.showToast({ title: '发送失败', icon: 'none' })
  } finally {
    replySubmitting.value = false
  }
}

onShow(() => {
  if (activeThread.value) {
    void openThread(activeThread.value.id)
    return
  }
  void loadThreads(true)
})
</script>

<style scoped lang="scss">
.screen {
  box-sizing: border-box;
  min-height: 100vh;
  padding: calc(16px + env(safe-area-inset-top)) 18px calc(26px + env(safe-area-inset-bottom));
  background: var(--page-bg);
}

.feedbackNav {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--capsule-h, 32px);
  min-height: var(--capsule-h, 32px);
  margin-bottom: 18px;
}

.navBack {
  position: absolute;
  top: 50%;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--capsule-h, 32px);
  height: var(--capsule-h, 32px);
  background: transparent;
  transform: translateY(-50%);
}

.chevronLeft {
  width: 10px;
  height: 10px;
  border-bottom: 2px solid var(--ink);
  border-left: 2px solid var(--ink);
  transform: rotate(45deg) translateX(2px);
}

.navTitle {
  color: var(--ink);
  font-size: 18px;
  font-weight: 800;
}

.feedbackBody,
.threadScreen {
  box-sizing: border-box;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
}

.threadSection {
  margin-bottom: 22px;
}

.threadCard {
  margin-bottom: 10px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface-soft);
}

.threadCardTop {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.threadCardCategory,
.threadCategory {
  color: var(--accent);
  font-size: 13px;
  font-weight: 800;
}

.unreadBadge {
  padding: 2px 7px;
  border-radius: 999px;
  background: #ff4d4f;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}

.threadCardPreview,
.messageText {
  display: block;
  color: var(--ink);
  font-size: 14px;
  line-height: 1.55;
}

.threadCardPreview {
  margin-top: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.threadCardTime,
.threadTime,
.messageRole,
.charCount {
  color: #afafaf;
  font-size: 12px;
  font-weight: 700;
}

.threadCardTime {
  display: block;
  margin-top: 6px;
}

.sectionLabel {
  display: block;
  margin-bottom: 10px;
  color: var(--ink);
  font-size: 15px;
  font-weight: 900;
}

.categoryGrid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}

.categoryChip {
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 800;
}

.categoryChip.isActive {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.feedbackTextarea,
.replyTextarea {
  box-sizing: border-box;
  display: block;
  width: 100%;
  max-width: 100%;
  min-height: 160px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--surface-soft);
  color: var(--ink);
  font-size: 14px;
  line-height: 1.6;
}

.replyTextarea {
  min-height: 96px;
}

.charCount {
  display: block;
  margin-top: 8px;
  text-align: right;
}

.submitButton {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 18px;
  padding: 14px;
  border-radius: 16px;
  background: var(--accent);
  color: #fff;
  font-size: 16px;
  font-weight: 900;
}

.submitButton.isDisabled {
  opacity: 0.6;
}

.threadMeta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.messageList {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.messageRow {
  display: flex;
}

.messageRow.isMine {
  justify-content: flex-end;
}

.messageRow.isAdmin {
  justify-content: flex-start;
}

.messageBubble {
  max-width: 86%;
  padding: 10px 12px;
  border-radius: 14px;
}

.messageBubble.isMine {
  background: var(--accent-soft);
}

.messageBubble.isAdmin {
  background: var(--surface-soft);
  border: 1px solid var(--line);
}

.messageRole {
  display: block;
  margin-bottom: 4px;
}

.replyComposer {
  margin-top: 16px;
}
</style>

<script lang="ts">
export default {
  onShareAppMessage() {},
  onShareTimeline() {}
}
</script>
