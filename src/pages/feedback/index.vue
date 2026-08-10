<template>
  <view class="screen" :style="screenStyle">
    <view class="feedbackNav">
      <view class="navBack" @tap="goBack">
        <view class="chevronLeft" />
      </view>
      <text class="navTitle">意见反馈</text>
    </view>

    <view class="feedbackBody">
      <text class="sectionLabel">问题类型</text>
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
import { computed, ref } from 'vue'
import { useWeappShare } from '@/app/useWeappShare'
import { submitFeedback, type FeedbackCategory } from '@/core/userSession'

useWeappShare()

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
const miniProgramCapsuleTop = ref(44)
const miniProgramCapsuleHeight = ref(32)

const screenStyle = computed(() => (
  `padding-top: ${miniProgramCapsuleTop.value}px;`
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

function goBack() {
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

    uni.showToast({ title: '反馈已提交', icon: 'none' })
    content.value = ''
    setTimeout(() => goBack(), 500)
  } catch {
    uni.showToast({ title: '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
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

.feedbackBody {
  box-sizing: border-box;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--surface);
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

.feedbackTextarea {
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

.charCount {
  display: block;
  margin-top: 8px;
  color: #afafaf;
  font-size: 12px;
  font-weight: 700;
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
</style>

<script lang="ts">
export default {
  onShareAppMessage() {},
  onShareTimeline() {}
}
</script>
