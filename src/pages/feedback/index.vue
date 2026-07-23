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
import { ref } from 'vue'
import { submitFeedback, type FeedbackCategory } from '@/core/userSession'

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

const screenStyle = `padding-top: ${miniProgramCapsuleTop.value}px; --capsule-top: ${miniProgramCapsuleTop.value}px;`

try {
  const menuButton = uni.getMenuButtonBoundingClientRect?.()
  if (menuButton && menuButton.top > 0) {
    miniProgramCapsuleTop.value = menuButton.top
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
  background: #f3f4f6;
}

.feedbackNav {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}

.navBack {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: #fff;
}

.chevronLeft {
  width: 10px;
  height: 10px;
  border-bottom: 2px solid #3c3c3c;
  border-left: 2px solid #3c3c3c;
  transform: rotate(45deg) translateX(2px);
}

.navTitle {
  color: #3c3c3c;
  font-size: 20px;
  font-weight: 900;
}

.feedbackBody {
  box-sizing: border-box;
  padding: 18px;
  border: 2px solid #e5e5e5;
  border-radius: 20px;
  background: #fff;
}

.sectionLabel {
  display: block;
  margin-bottom: 10px;
  color: #3c3c3c;
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
  border: 2px solid #e5e5e5;
  border-radius: 999px;
  color: #777;
  font-size: 13px;
  font-weight: 800;
}

.categoryChip.isActive {
  border-color: #1cb0f6;
  background: #ddf4ff;
  color: #1cb0f6;
}

.feedbackTextarea {
  box-sizing: border-box;
  display: block;
  width: 100%;
  max-width: 100%;
  min-height: 160px;
  padding: 14px;
  border: 2px solid #e5e5e5;
  border-radius: 16px;
  background: #f7f7f7;
  color: #3c3c3c;
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
  background: #1cb0f6;
  color: #fff;
  font-size: 16px;
  font-weight: 900;
}

.submitButton.isDisabled {
  opacity: 0.6;
}
</style>
