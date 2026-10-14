<template>
  <view class="grammarPage withAction" :style="pageStyle">
    <view v-if="question && quiz" class="grammarContent">
      <text class="gEyebrow">{{ quiz.mode === 'review' ? '错题复习' : '时态练习' }}</text>
      <text class="gTitle practiceTitle">{{ practiceTitle }}</text>
      <text class="gSubtitle practiceStats">已练 {{ stats.practiced }}/{{ stats.total }}题 · 剩余 {{ stats.remaining }}题 · 错题 {{ stats.wrong }}题</text>
      <view class="gRow"><text class="quizTitle">{{ question.kind === 'reference' ? `${question.label} · 自行检查` : question.label }}</text><text class="gSmall gMuted">{{ quiz.mode === 'review' ? '错题' : '第' }}{{ position }}{{ quiz.mode === 'review' ? '' : '题' }} / {{ positionTotal }}</text></view>
      <view class="quizProgress"><view class="quizProgressFill" :style="{ width: `${position / positionTotal * 100}%` }" /></view>

      <view v-if="question.context" class="passageCard"><text class="gEyebrow">阅读短文</text><text class="gBody">{{ question.context }}</text></view>
      <view class="questionCard"><text class="gEnglish" :class="{ chinesePrompt: question.kind === 'reference' }">{{ question.prompt }}</text></view>
      <view id="grammarAnswerPanel" class="answerPanel">
        <template v-if="question.kind === 'choice'">
          <button v-for="(option, index) in question.options" :key="option" :class="['choiceOption', quiz.values[0] === option && 'selected', quiz.revealed && option === question.answer && 'correctChoice']" :disabled="quiz.revealed" hover-class="gPressed" @tap="choose(option)"><text class="optionLetter">{{ index === 0 ? 'A' : 'B' }}</text><text>{{ option }}</text><text v-if="quiz.revealed && option === question.answer" class="optionCheck">✓</text></button>
        </template>
        <template v-else-if="question.kind === 'fill'">
          <text class="gSubtitle answerInstruction">{{ question.blankCount > 1 ? `有${question.blankCount}个空，按句中顺序填写。` : '填写完整的动词形式。' }}</text>
          <view v-for="n in question.blankCount" :key="`${question.id}:${n}`" class="inputRow"><text v-if="question.blankCount > 1" class="blankNumber">{{ n }}</text><input class="answerInput" :value="quiz.values[n - 1] || ''" :disabled="quiz.revealed" :adjust-position="false" :maxlength="120" :placeholder="n === 1 ? '输入答案' : `第${n}空`" confirm-type="done" @input="inputAnswer(n - 1, $event)" @focus="focusAnswer" @confirm="canSubmit && submit()" /></view>
        </template>
        <template v-else>
          <text class="gSubtitle answerInstruction">先写出自己的句子，再对照参考答案。</text>
          <textarea class="referenceInput" :value="quiz.values[0] || ''" :disabled="quiz.revealed" :adjust-position="false" :maxlength="1500" auto-height placeholder="输入完整句子" @input="inputAnswer(0, $event)" @focus="focusAnswer" />
        </template>
      </view>
      <button v-if="!quiz.revealed && question.kind !== 'reference'" class="gButton quiet hintButton" @tap="showHint">{{ quiz.hinted ? '已显示提示' : '查看提示' }}</button>
      <view v-if="quiz.hinted && !quiz.revealed" class="hintCard"><text class="gEyebrow">解题提示</text><text class="gBody gSmall">{{ hint }}</text><text class="gSubtitle">结合提示作答，答对后计为完成。</text></view>
      <view v-if="quiz.revealed" id="grammarFeedback" :class="['feedbackCard', attempt && !attempt.correct && 'needsPractice']">
        <text class="feedbackTitle">{{ feedbackTitle }}</text>
        <text class="gEyebrow feedbackLabel">参考答案</text>
        <text class="gEnglish">{{ question.answer }}</text>
        <view class="gDivider" /><text class="gBody gSmall">{{ question.explanation }}</text>
        <text v-if="question.kind === 'reference'" class="gSubtitle">答案可以不同，符合题意且语法正确即可。检查时态、动词形式和句子是否完整。</text>
        <text v-if="question.kind === 'reference' && !attempt" class="gSubtitle">核对后选择结果。自行检查的题不计入独立答对。</text>
        <text v-if="attempt && !attempt.correct" class="gSubtitle">已加入错题复习。答对后，这道题才算完成。</text>
        <text v-else-if="attempt && quiz.mode === 'review'" class="gSubtitle">已移出错题，这道题已完成。</text>
      </view>
      <text v-if="!saved" class="gNotice">答案未能保存，退出后可能丢失。</text>
      <view class="gFooter" :style="footerStyle"><view class="gFooterInner">
        <view v-if="quiz.revealed && question.kind === 'reference' && !attempt" class="selfCheckActions"><button class="gButton secondary" @tap="selfCheck(false)">还需练习</button><button class="gButton" @tap="selfCheck(true)">我写对了</button></view>
        <button v-else-if="quiz.revealed" class="gButton" hover-class="gPressed" @tap="next">{{ quiz.cursor + 1 === quiz.questionIds.length ? '查看结果' : '下一题' }}</button>
        <button v-else class="gButton" :disabled="!canSubmit" hover-class="gPressed" @tap="submit">{{ question.kind === 'reference' ? '查看参考答案' : '检查答案' }}</button>
        <text class="footerNote">{{ quiz.revealed ? '核对答案后继续。' : saved ? '退出后可继续本题。' : '退出后可能丢失答案。' }}</text>
      </view></view>
    </view>
    <view v-else class="grammarContent gEmpty"><text class="gTitle">请先选择练习</text><text class="gSubtitle">返回目录，选择要学的时态。</text><button class="gButton secondary" @tap="goGrammar">返回语法目录</button></view>
  </view>
</template>
<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { useGrammarTheme } from '@/features/grammar/useGrammarTheme'
import { getLesson, questionById, scopeQuestionIds } from '@/features/grammar/content'
import { advanceQuiz, exerciseStats, loadProgress, matchesAnswer, recordAttempt, saveProgress } from '@/features/grammar/progress'
import { goGrammar } from '@/features/grammar/navigation'
const { activeVisualThemeStyle } = useGrammarTheme()
const progress = ref(loadProgress())
const sessionKey = ref('')
const quiz = computed(() => progress.value.sessions[sessionKey.value])
const stats = computed(() => exerciseStats(progress.value, quiz.value?.scope || 'all'))
const question = computed(() => quiz.value ? questionById.get(quiz.value.questionIds[quiz.value.cursor] || '') : undefined)
const practiceTitle = computed(() => quiz.value?.mode === 'review' ? getLesson(question.value?.tenseId || '')?.title || quiz.value.title : quiz.value?.title)
const position = computed(() => quiz.value?.mode === 'review' ? quiz.value.cursor + 1 : scopeQuestionIds(quiz.value?.scope || '').indexOf(question.value?.id || '') + 1)
const positionTotal = computed(() => quiz.value?.mode === 'review' ? quiz.value.questionIds.length : stats.value.total)
const attempt = computed(() => quiz.value?.attempts.find(a => a.questionId === question.value?.id))
const saved = ref(true)
const keyboardHeight = ref(0)
const pageStyle = computed(() => `${activeVisualThemeStyle.value};${keyboardHeight.value ? `padding-bottom:${keyboardHeight.value + 140}px;` : ''}`)
const footerStyle = computed(() => keyboardHeight.value ? `bottom:${keyboardHeight.value}px;padding-bottom:12px;` : '')
const hint = computed(() => getLesson(question.value?.tenseId || '')?.judgement || '先判断事情发生在过去、现在还是将来，再判断动作是经常发生、正在进行、已经完成，还是持续了一段时间。要结合整句话判断。')
const canSubmit = computed(() => {
  if (!question.value || !quiz.value || quiz.value.revealed) return false
  const count = question.value.kind === 'fill' ? question.value.blankCount : 1
  return Array.from({ length: count }, (_, i) => quiz.value!.values[i]?.trim()).every(Boolean)
})
const feedbackTitle = computed(() => question.value?.kind === 'reference' ? (attempt.value ? (attempt.value.correct ? '自评：答对了' : '自评：还需练习') : '请核对答案') : attempt.value?.correct ? (attempt.value.hinted ? '提示后答对' : '答对了') : '答错了')
function persist() { saved.value = saveProgress(progress.value) }
function inputAnswer(index: number, event: Event) {
  if (!quiz.value || quiz.value.revealed) return
  quiz.value.values[index] = (event as unknown as { detail: { value: string } }).detail.value
  persist()
}
function choose(option: string) { if (quiz.value && !quiz.value.revealed) { quiz.value.values = [option]; persist() } }
function showHint() { if (quiz.value) { quiz.value.hinted = true; persist() } }
function focusAnswer() {
  // #ifdef MP-WEIXIN
  setTimeout(() => uni.pageScrollTo({ selector: '#grammarAnswerPanel', duration: 200 }), 200)
  // #endif
}
function keyboardChanged(event: { height: number }) { keyboardHeight.value = event.height }
function revealFeedback() {
  uni.hideKeyboard()
  void nextTick(() => uni.pageScrollTo({ selector: '#grammarFeedback', duration: 200 }))
}
function submit() {
  if (!canSubmit.value || !question.value || !quiz.value) return
  if (question.value.kind === 'reference') quiz.value.revealed = true
  else recordAttempt(progress.value, quiz.value, question.value, matchesAnswer(question.value, quiz.value.values))
  persist()
  revealFeedback()
}
function selfCheck(correct: boolean) {
  if (!question.value || !quiz.value?.revealed || attempt.value) return
  recordAttempt(progress.value, quiz.value, question.value, correct)
  persist()
}
function next() {
  if (!quiz.value || !attempt.value) return
  const finished = advanceQuiz(progress.value, quiz.value)
  persist()
  if (finished) uni.redirectTo({ url: `/pages/grammar/result?key=${encodeURIComponent(sessionKey.value)}` })
  else uni.pageScrollTo({ scrollTop: 0, duration: 0 })
}
onLoad(query => {
  progress.value = loadProgress()
  sessionKey.value = query?.key ? decodeURIComponent(query.key) : progress.value.activeSession
  if (quiz.value?.finished) uni.redirectTo({ url: `/pages/grammar/result?key=${encodeURIComponent(sessionKey.value)}` })
  // #ifdef MP-WEIXIN
  uni.onKeyboardHeightChange(keyboardChanged)
  // #endif
})
onShow(() => { progress.value = loadProgress() })
onUnload(() => {
  // #ifdef MP-WEIXIN
  uni.offKeyboardHeightChange(keyboardChanged)
  // #endif
})
</script>
<style scoped lang="scss">
@use '@/features/grammar/grammar.scss';
.practiceTitle { font-size: 23px; }.practiceStats { margin-bottom: 18px; }.quizProgress { height: 5px; background: var(--line); border-radius: 4px; margin: 4px 0 17px; overflow: hidden; }.quizProgressFill { height: 100%; background: var(--accent); transition: width .2s ease; }.quizTitle { display: block; color: var(--muted); font-size: 13px; line-height: 1.6; }.questionCard { padding: 25px 21px; margin-top: 17px; border: 1px solid var(--line); border-radius: 22px; background: var(--surface); }.questionCard .gEnglish { font-size: 22px; line-height: 1.75; }.questionCard .chinesePrompt { font-family: var(--font-sans); font-size: 18px; }.passageCard { padding: 17px; margin-top: 18px; background: var(--surface-soft); border: 1px solid var(--line); border-radius: 16px; }.passageCard .gBody { font-family: Georgia, serif; font-size: 16px; line-height: 1.8; }
.answerPanel { margin-top: 20px; }.answerInstruction { margin-bottom: 10px; }.choiceOption { display: flex; text-align: left; align-items: center; gap: 14px; min-height: 60px; margin: 10px 0 0; padding: 15px; background: var(--surface); color: var(--ink); font-size: 17px; line-height: 1.5; border: 1px solid var(--line); border-radius: 15px; }.choiceOption::after { border: 0; }.choiceOption[disabled] { color: var(--ink); }.choiceOption.selected { background: var(--accent-soft); border: 2px solid var(--accent); padding: 14px; }.choiceOption.correctChoice { border-color: var(--accent); }.optionLetter { font-size: 12px; color: var(--muted); }.optionCheck { color: var(--accent); margin-left: auto; }.inputRow { display: flex; gap: 9px; align-items: center; margin-top: 10px; }.blankNumber { font-size: 13px; color: var(--muted); }.answerInput { flex: 1; min-width: 0; height: 54px; padding: 0 16px; border: 1px solid var(--line-strong); border-radius: 13px; background: var(--surface); color: var(--ink); font-size: 17px; }.referenceInput { width: 100%; box-sizing: border-box; min-height: 120px; padding: 16px; border: 1px solid var(--line-strong); border-radius: 14px; background: var(--surface); color: var(--ink); font-size: 16px; line-height: 1.8; }.hintButton { margin-top: 8px; }.hintCard { margin-top: 6px; padding: 17px; border-radius: 16px; background: var(--info-soft); }.feedbackCard { padding: 23px 20px; margin-top: 20px; border: 1px solid var(--accent); background: var(--success-soft); border-radius: 20px; }.feedbackCard.needsPractice { border-color: var(--danger); background: var(--danger-soft); }.feedbackTitle { display: block; font-size: 18px; font-weight: 750; }.feedbackLabel { margin: 18px 0 9px; }.feedbackCard .gEnglish { font-size: 19px; }.selfCheckActions { display: flex; gap: 10px; }.selfCheckActions .gButton { flex: 1; }.footerNote { display: block; text-align: center; margin-top: 8px; font-size: 11px; color: var(--muted); }
</style>
