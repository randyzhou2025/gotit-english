import { getLesson } from './content'
import { exerciseStats, loadProgress, nextPracticeSet, prepareQuiz, resetExercises, saveProgress } from './progress'
import type { Progress, Quiz } from './types'

export function openLesson(id: string) {
  uni.navigateTo({ url: `/pages/grammar/lesson?id=${encodeURIComponent(id)}` })
}
function enterQuiz(progress: Progress, quiz: Quiz, replacePage: boolean) {
  if (!saveProgress(progress)) uni.showToast({ title: '进度保存失败', icon: 'none' })
  const url = `/pages/grammar/practice?key=${encodeURIComponent(quiz.key)}`
  if (replacePage) uni.redirectTo({ url })
  else uni.navigateTo({ url })
}
export function openPractice(scope: string, replacePage = false) {
  const progress = loadProgress()
  if (!exerciseStats(progress, scope).remaining) {
    uni.showModal({ title: '练习已全部完成', content: '做得很好！要从第1题重新练习吗？', confirmText: '重新练习', cancelText: '暂不重做',
      success: result => { if (result.confirm) restart(scope, replacePage) } })
    return
  }
  const target = getLesson(scope) ? nextPracticeSet(progress, scope)?.id : scope
  if (!target) return
  const quiz = prepareQuiz(progress, target)
  if (quiz) enterQuiz(progress, quiz, replacePage)
}
export function openReview(scope = 'all', replacePage = false) {
  const progress = loadProgress()
  const quiz = prepareQuiz(progress, scope, 'review')
  if (quiz) enterQuiz(progress, quiz, replacePage)
  else uni.showToast({ title: '没有待复习的错题', icon: 'none' })
}
function restart(scope: string, replacePage: boolean) {
  const progress = loadProgress()
  resetExercises(progress, scope)
  saveProgress(progress)
  openPractice(scope, replacePage)
}
export function restartPractice(scope: string, replacePage = false) {
  uni.showModal({ title: '重新开始练习', content: '清空这组练习的进度和错题，从第1题开始。',
    confirmText: '重新开始', cancelText: '取消', success: result => { if (result.confirm) restart(scope, replacePage) } })
}
export function goGrammar() {
  const pages = getCurrentPages()
  const index = pages.findIndex(page => page.route === 'pages/grammar/index')
  if (index >= 0) {
    const delta = pages.length - 1 - index
    if (delta > 0) uni.navigateBack({ delta })
  } else uni.redirectTo({ url: '/pages/grammar/index' })
}
