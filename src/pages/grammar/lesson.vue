<template>
  <view class="grammarPage withAction" :style="activeVisualThemeStyle">
    <view v-if="lesson" class="grammarContent">
      <text class="gEyebrow">{{ levelLabels[lesson.level] }} · {{ lesson.english }}</text>
      <view class="gRow"><text class="gTitle">{{ lesson.title }}</text><text v-if="completed" class="gBadge">已学完</text></view>
      <text class="gSubtitle">已练 {{ lessonStats.practiced }}/{{ lessonStats.total }}题 · 剩余 {{ lessonStats.remaining }}题 · 错题 {{ lessonStats.wrong }}题</text>
      <text class="gSubtitle">{{ lesson.summary }}</text>
      <text v-if="lesson.level === 'extended'" class="gBadge extensionBadge">拓展时态</text>
      <text class="gSection">用法和例句</text>
      <scroll-view v-if="lesson.usages.length > 1" scroll-x class="sceneScroll"><view class="sceneTabs"><button v-for="(usage, index) in lesson.usages" :key="index" :class="['sceneTab', usageIndex === index && 'selected']" @tap="usageIndex = index">{{ usage.label }}</button></view></scroll-view>
      <view class="sceneCard">
        <text class="gEnglish">{{ usage?.example }}</text>
        <text class="gSubtitle">{{ usage?.translation }}</text>
        <view class="timeTrack"><view class="trackLine" /><view v-for="(point, i) in timeline.points" :key="i" :class="['timePoint', timeline.active.includes(i) && 'current']"><view class="pointDot" /><text>{{ point }}</text></view></view>
        <text class="gSubtitle timelineMeaning">{{ timeline.meaning }}</text>
        <text class="gBody sceneRule">{{ lesson.judgement }}</text>
      </view>
      <text class="gSection">句型结构</text>
      <view class="gCard">
        <view class="formTabs"><button v-for="(form, index) in lesson.forms" :key="index" :class="['formTab', formIndex === index && 'selected']" @tap="formIndex = index">{{ form.label }}</button></view>
        <text class="gEnglish formExample">{{ lesson.forms[formIndex]?.example }}</text>
        <view class="gDivider" /><text class="gBody gSmall">{{ lesson.structure }}</text>
        <text class="gSubtitle">do：动词原形；doing：动词-ing形式；done：过去分词。</text>
      </view>
      <view class="gCard"><view class="gRow" @tap="fullExplanation = !fullExplanation"><text class="explanationTitle">时间提示词和易错点</text><text class="gLink">{{ fullExplanation ? '收起 −' : '展开 +' }}</text></view><view v-if="fullExplanation"><text class="gBody gSmall">{{ lesson.clues }}</text><view v-for="(pitfall, index) in lesson.pitfalls" :key="index" class="pitfall"><text class="pitfallNumber">{{ index + 1 }}</text><text class="gBody gSmall">{{ pitfall }}</text></view></view><text v-else class="gSubtitle">结合整句话判断时态，不能只看时间词。</text></view>
      <text class="gSection">练习</text>
      <text class="gSubtitle">剩余题数包含未练题和未改正的错题。</text>
      <view class="gCard practiceMenu"><view v-for="set in sets" :key="set.id" class="practiceEntry"><view class="restartHeading"><text class="practiceName">{{ bankLabels[set.bank] }}</text><text class="gSubtitle">已练 {{ stats(set.id).practiced }}/{{ stats(set.id).total }}题 · 剩余 {{ stats(set.id).remaining }}题</text></view><button v-if="stats(set.id).practiced" class="gRestart" :aria-label="`重新开始${bankLabels[set.bank]}`" title="重新开始" hover-class="gPressed" @tap="restartPractice(set.id)"><text>↻</text></button><text v-if="!stats(set.id).remaining" class="gCompletion">练习已全部完成，做得很好！</text><view class="gActions practiceActions"><button class="gButton" @tap="openPractice(set.id)">{{ practiceButtonLabel(progress, set.id) }}</button><button class="gButton secondary" :disabled="!stats(set.id).wrong" @tap="openReview(set.id)">错题 {{ stats(set.id).wrong }}题</button></view></view></view>
      <text v-if="!saved" class="gNotice">学习记录未保存，退出后可能丢失。</text>
      <view class="gFooter"><view class="gFooterInner"><view class="gActions"><button class="gButton" hover-class="gPressed" @tap="openPractice(lessonId)">{{ practiceButtonLabel(progress, lessonId) }}</button><button class="gButton secondary" :disabled="!lessonStats.wrong" @tap="openReview(lessonId)">错题复习</button></view></view></view>
    </view>
    <view v-else class="gEmpty"><text class="gTitle">课程不存在，请返回目录</text><button class="gButton secondary" @tap="goGrammar">返回语法目录</button></view>
  </view>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useGrammarTheme } from '@/features/grammar/useGrammarTheme'
import { getLesson, practiceSets, bankLabels, levelLabels } from '@/features/grammar/content'
import { openPractice, openReview, restartPractice, goGrammar } from '@/features/grammar/navigation'
import { exerciseStats, isLessonComplete, loadProgress, practiceButtonLabel, saveProgress } from '@/features/grammar/progress'
import { sceneTimeline } from '@/features/grammar/timeline'
const { activeVisualThemeStyle } = useGrammarTheme()
const progress = ref(loadProgress())
const lessonId = ref('')
const lesson = computed(() => getLesson(lessonId.value))
const usageIndex = ref(0)
const formIndex = ref(0)
const fullExplanation = ref(false)
const saved = ref(true)
const usage = computed(() => lesson.value?.usages[usageIndex.value])
const sets = computed(() => practiceSets.filter(set => set.tenseId === lessonId.value))
const completed = computed(() => isLessonComplete(progress.value, lessonId.value))
const lessonStats = computed(() => stats(lessonId.value))
function stats(scope: string) { return exerciseStats(progress.value, scope) }
const timeline = computed(() => sceneTimeline(lessonId.value, usageIndex.value))
onLoad(query => {
  lessonId.value = query?.id || ''
  if (lesson.value) {
    uni.setNavigationBarTitle({ title: lesson.value.title })
    progress.value.currentLessonId = lessonId.value
    saved.value = saveProgress(progress.value)
  }
})
onShow(() => { progress.value = loadProgress() })
</script>
<style scoped lang="scss">
@use '@/features/grammar/grammar.scss';
.extensionBadge { margin-top: 13px; }.sceneScroll { width: 100%; white-space: nowrap; }.sceneTabs { display: flex; gap: 8px; padding-bottom: 4px; }.sceneTab { display: inline-block; flex-shrink: 0; margin: 0; padding: 8px 13px; font-size: 12px; line-height: 1.5; border-radius: 10px; color: var(--muted); background: var(--surface); }.sceneTab::after { border-color: var(--line); }.sceneTab.selected { background: var(--accent-soft); color: var(--accent); }.sceneCard { padding: 23px 20px; margin-top: 10px; background: var(--surface); border: 1px solid var(--line); border-radius: 22px; }.timelineMeaning { margin: -5px 0 15px; font-size: 12px; color: var(--accent); }.sceneRule { font-size: 13px; color: var(--ink-soft); }
.timeTrack { display: flex; position: relative; justify-content: space-between; margin: 28px 4px 22px; }.trackLine { position: absolute; height: 2px; top: 5px; left: 7%; right: 7%; background: var(--line-strong); }.timePoint { position: relative; width: 30%; text-align: center; color: var(--muted); font-size: 11px; }.pointDot { width: 10px; height: 10px; background: var(--line-strong); border: 3px solid var(--surface); box-sizing: content-box; border-radius: 50%; margin: -2px auto 9px; }.timePoint.current { color: var(--accent); font-weight: 700; }.current .pointDot { background: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); }
.formTabs { display: flex; gap: 5px; }.formTab { flex: 1; margin: 0; padding: 9px 3px; font-size: 12px; line-height: 1.5; color: var(--muted); background: var(--surface-soft); border-radius: 9px; }.formTab::after { border: 0; }.formTab.selected { background: var(--accent-soft); color: var(--accent); font-weight: 750; }.formExample { margin-top: 17px; }.explanationTitle { font-size: 15px; font-weight: 700; }.pitfall { display: flex; align-items: baseline; gap: 10px; margin-top: 16px; }.pitfallNumber { font: 14px Georgia, serif; color: var(--accent); }.practiceMenu { padding-top: 0; padding-bottom: 0; }.practiceEntry { position: relative; padding: 17px 0; border-bottom: 1px solid var(--line); }.practiceEntry:last-child { border: 0; }.practiceName { display: block; font-size: 15px; font-weight: 700; }.practiceEntry .gSubtitle { font-size: 12px; margin-top: 3px; }.practiceActions { margin-top: 12px; }.practiceActions .gButton { min-height: 44px; font-size: 14px; }
</style>
