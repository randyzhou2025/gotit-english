<template>
  <view class="grammarPage withAction" :style="activeVisualThemeStyle">
    <view v-if="quiz?.finished" class="grammarContent">
      <view class="resultSeal">✓</view><text class="gEyebrow resultCenter">{{ quiz.mode === 'review' ? '错题复习结束' : '练习结束' }}</text><text class="gTitle resultCenter">{{ resultTitle }}</text><text class="gSubtitle resultCenter">{{ quiz.title }}</text>
      <view class="resultStats gStats"><view><text class="gStatNumber">{{ stats.practiced }}<text class="gStatTotal">/{{ stats.total }}</text></text><text class="gMuted">已练</text></view><view><text class="gStatNumber">{{ stats.remaining }}</text><text class="gMuted">剩余题数</text></view><view><text class="gStatNumber">{{ stats.wrong }}</text><text class="gMuted">待复习错题</text></view></view>
      <view class="gCard"><text class="nextTitle">{{ resultCopy }}</text><text class="gSubtitle">本次答对 {{ summary.correct }}题 · 答错 {{ summary.wrong }}题</text><text v-if="stats.wrong" class="gSubtitle">错题已保存，复习答对后计为完成。</text></view>
      <text class="gSection">本次答题记录</text>
      <view v-for="attempt in quiz.attempts" :key="attempt.questionId" class="resultQuestion"><view class="gRow" @tap="toggle(attempt.questionId)"><view class="resultQuestionCopy"><text :class="['gBadge', !attempt.correct && !progress.records[attempt.questionId]?.completed && 'wrongBadge']">{{ !attempt.correct ? (progress.records[attempt.questionId]?.completed ? '本次答错 · 已改正' : '待复习') : attempt.selfChecked ? '自评答对' : attempt.hinted ? '提示后答对' : '独立答对' }}</text><text class="resultPrompt">{{ questionById.get(attempt.questionId)?.prompt }}</text></view><text class="gLink">{{ expanded === attempt.questionId ? '收起' : '解析' }}</text></view><view v-if="expanded === attempt.questionId" class="resultDetail"><text class="gSubtitle">你的答案：{{ attempt.values.join('；') }}</text><text v-if="questionById.get(attempt.questionId)?.context" class="gBody gSmall">{{ questionById.get(attempt.questionId)?.context }}</text><text class="gSubtitle">参考答案</text><text class="gEnglish resultAnswer">{{ questionById.get(attempt.questionId)?.answer }}</text><text class="gBody gSmall">{{ questionById.get(attempt.questionId)?.explanation }}</text></view></view>
      <button v-if="quiz.scope !== 'all'" class="gButton quiet" @tap="restartPractice(quiz.scope, true)">重新开始练习</button><button class="gButton quiet" @tap="goGrammar">返回语法目录</button>
      <view class="gFooter"><view class="gFooterInner"><button class="gButton" hover-class="gPressed" @tap="continuePractice">{{ nextLabel }}</button></view></view>
    </view>
    <view v-else class="grammarContent gEmpty"><text class="gTitle">暂无练习结果</text><button class="gButton secondary" @tap="goGrammar">返回语法目录</button></view>
  </view>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useGrammarTheme } from '@/features/grammar/useGrammarTheme'
import { questionById, practiceSets } from '@/features/grammar/content'
import { exerciseStats, loadProgress } from '@/features/grammar/progress'
import { goGrammar, openPractice, openReview, restartPractice } from '@/features/grammar/navigation'
const { activeVisualThemeStyle } = useGrammarTheme()
const progress = ref(loadProgress())
const sessionKey = ref('')
const quiz = computed(() => progress.value.sessions[sessionKey.value])
const stats = computed(() => exerciseStats(progress.value, quiz.value?.scope || 'all'))
const expanded = ref('')
const summary = computed(() => {
  const attempts = quiz.value?.attempts || []
  return { correct: attempts.filter(a => a.correct).length, wrong: attempts.filter(a => !a.correct).length }
})
const resultTitle = computed(() => !stats.value.remaining ? '练习已全部完成！'
  : quiz.value?.mode === 'review' && !stats.value.wrong ? '本次错题已改正！' : '本组已练完')
const resultCopy = computed(() => !stats.value.remaining ? '做得很好！这组题都已答对，也可以重新练习。'
  : stats.value.wrong ? `还有${stats.value.wrong}道错题${stats.value.unpracticed ? `、${stats.value.unpracticed}道未练题` : ''}，进度已保存。` : '进度已保存，可以继续完成剩余题目。')
const nextSet = computed(() => {
  const set = practiceSets.find(item => item.id === quiz.value?.scope)
  if (!set?.tenseId) return undefined
  return practiceSets.find(item => item.tenseId === set.tenseId && exerciseStats(progress.value, item.id).remaining)
})
const nextLabel = computed(() => stats.value.wrong ? `错题复习 ${stats.value.wrong}题`
  : quiz.value?.scope === 'all' ? '返回语法目录'
  : stats.value.remaining ? '继续练习' : nextSet.value ? `继续${nextSet.value.bank === 'workbook' ? '专项练习' : '教材练习'}` : '返回语法目录')
function toggle(id: string) { expanded.value = expanded.value === id ? '' : id }
function continuePractice() {
  if (!quiz.value) return
  if (stats.value.wrong) openReview(quiz.value.scope, true)
  else if (quiz.value.scope === 'all') goGrammar()
  else if (stats.value.remaining) openPractice(quiz.value.scope, true)
  else if (nextSet.value) openPractice(nextSet.value.id, true)
  else goGrammar()
}
onLoad(query => { progress.value = loadProgress(); sessionKey.value = query?.key ? decodeURIComponent(query.key) : progress.value.activeSession })
</script>
<style scoped lang="scss">
@use '@/features/grammar/grammar.scss';
.resultSeal { display: flex; align-items: center; justify-content: center; width: 68px; height: 68px; border-radius: 50%; margin: 8px auto 20px; background: var(--accent-soft); color: var(--accent); font-size: 34px; }.resultCenter { text-align: center; }.resultStats { display: flex; justify-content: space-around; text-align: center; padding: 22px 4px; margin-top: 23px; border-radius: 18px; border: 1px solid var(--line); background: var(--surface); }.nextTitle { display: block; font-size: 15px; font-weight: 750; line-height: 1.7; }.resultQuestion { margin-top: 10px; padding: 17px; border: 1px solid var(--line); border-radius: 16px; background: var(--surface); }.resultQuestionCopy { flex: 1; min-width: 0; }.wrongBadge { color: var(--danger); background: var(--danger-soft); }.resultPrompt { display: block; margin-top: 9px; color: var(--ink-soft); font-size: 14px; line-height: 1.7; white-space: pre-wrap; }.resultDetail { border-top: 1px solid var(--line); margin-top: 16px; padding-top: 8px; }.resultAnswer { font-size: 17px; margin: 14px 0 8px; }
</style>
