<template>
  <view class="shareEntry">
    <view v-if="state === 'loading'" class="shareEntryPanel">
      <view class="shareEntryMark">
        <view class="shareEntryMarkPerson isLeft" />
        <view class="shareEntryMarkPerson isRight" />
      </view>
      <text class="shareEntryTitle">正在打开同学的学习任务</text>
      <text class="shareEntryCopy">教材和 Unit 会自动准备好</text>
    </view>

    <view v-else class="shareEntryPanel">
      <text class="shareEntryTitle">学习任务暂时打不开</text>
      <text class="shareEntryCopy">{{ errorMessage }}</text>
      <view class="shareEntryButton" @tap="goHome">
        <text>回到首页</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { openUnitDictationChallenge } from '@/app/usePracticeSession'
import { readUnitChallengeId, type UnitChallengeQuery } from '@/app/unitChallenge'
import { acceptClassmateShare } from '@/core/classmates'
import { trackAnalyticsEvent } from '@/core/analytics'

const state = ref<'loading' | 'error'>('loading')
const errorMessage = ref('请让同学重新分享一次')

onLoad(async (query: UnitChallengeQuery = {}) => {
  const token = readUnitChallengeId(query)
  if (!token) {
    state.value = 'error'
    return
  }

  try {
    const context = await acceptClassmateShare(token)
    trackAnalyticsEvent('share_accepted', {
      shareType: context.shareType,
      classmateCreated: context.classmateCreated,
      selfShare: context.isSelfShare
    })
    const opened = await openUnitDictationChallenge(context.unitId)
    if (!opened) throw new Error('unit-unavailable')
    uni.redirectTo({ url: '/pages/dictation/setup' })
  } catch (error) {
    console.warn('[share-entry] accept failed', error)
    errorMessage.value = error instanceof Error && error.message === '登录未完成'
      ? '登录没有完成，请检查网络后重试'
      : '分享可能已失效，请让同学重新分享一次'
    state.value = 'error'
  }
})

function goHome() {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style scoped lang="scss">
.shareEntry {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 28px 24px calc(28px + env(safe-area-inset-bottom));
  background: var(--page-bg);
  color: var(--ink);
}

.shareEntryPanel {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 360px;
  text-align: center;
}

.shareEntryMark {
  position: relative;
  width: 78px;
  height: 58px;
  margin-bottom: 24px;
}

.shareEntryMarkPerson {
  position: absolute;
  top: 5px;
  width: 30px;
  height: 30px;
  border: 3px solid var(--accent);
  border-radius: 50%;
}

.shareEntryMarkPerson::after {
  position: absolute;
  top: 29px;
  left: -8px;
  width: 40px;
  height: 20px;
  border: 3px solid var(--accent);
  border-bottom: 0;
  border-radius: 24px 24px 0 0;
  content: '';
}

.shareEntryMarkPerson.isLeft { left: 8px; }
.shareEntryMarkPerson.isRight { right: 8px; background: var(--page-bg); }

.shareEntryTitle {
  font-size: 23px;
  line-height: 1.3;
  font-weight: 900;
}

.shareEntryCopy {
  margin-top: 12px;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.6;
  font-weight: 650;
}

.shareEntryButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 52px;
  margin-top: 26px;
  border-radius: 14px;
  background: var(--accent);
  color: #fffdf8;
  font-size: 16px;
  font-weight: 850;
}

.shareEntryButton:active { transform: translateY(1px) scale(0.99); }
</style>
