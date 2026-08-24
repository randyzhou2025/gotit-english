<template>
  <PracticeShell route-screen="dictationReward" />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import {
  buildWeappShareAppMessage,
  buildWeappShareTimeline,
  showWeappShareMenu,
  type WeappShareOptions
} from '@/app/useWeappShare'
import { buildUnitChallengePath, buildUnitChallengeTitle } from '@/app/unitChallenge'
import { isPracticeSessionReady, usePracticeSession } from '@/app/usePracticeSession'
import { createClassmateShare } from '@/core/classmates'
import { trackAnalyticsEvent } from '@/core/analytics'
import PracticeShell from '@/components/PracticeShell.vue'

onLoad(() => {
  const hasReward = isPracticeSessionReady() && Boolean(usePracticeSession().dictationReward.value)
  if (hasReward) return

  uni.switchTab({ url: '/pages/index/index' })
})

const preparedSharePath = ref('')

async function prepareResultShare() {
  if (!isPracticeSessionReady()) return
  const unit = usePracticeSession().selectedUnit.value
  if (!unit) return
  try {
    const share = await createClassmateShare({
      publisherId: unit.publisherId,
      bookId: unit.bookId,
      unitId: unit.unitId,
      unitName: unit.unitName
    }, 'DICTATION_RESULT')
    preparedSharePath.value = share?.path ?? ''
    if (share) trackAnalyticsEvent('share_created', { source: 'dictation_reward', shareType: 'DICTATION_RESULT' })
  } catch (error) {
    console.warn('[dictation/reward] share preparation failed', error)
  }
}

function buildCurrentUnitChallengeShare(): WeappShareOptions {
  try {
    const unit = usePracticeSession().selectedUnit.value
    if (!unit) return {}

    return {
      title: buildUnitChallengeTitle(unit),
      path: preparedSharePath.value || buildUnitChallengePath(''),
      timelineTitle: buildUnitChallengeTitle(unit)
    }
  } catch {
    return {}
  }
}

onShareAppMessage(() => buildWeappShareAppMessage(buildCurrentUnitChallengeShare()))
onShareTimeline(() => buildWeappShareTimeline(buildCurrentUnitChallengeShare()))
onMounted(() => {
  showWeappShareMenu()
  void prepareResultShare()
})
</script>
