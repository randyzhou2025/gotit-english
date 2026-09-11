import type { LeaderboardMetric, LeaderboardPeriod, LeaderboardSnapshot } from '@/core/classmates'

export const LEADERBOARD_METRICS: Array<{ id: LeaderboardMetric; label: string }> = [
  { id: 'power', label: '学力榜' },
  { id: 'time', label: '学习时长' },
  { id: 'words', label: '掌握词汇' }
]

export function leaderboardUnit(metric: LeaderboardMetric) {
  return metric === 'time' ? '分钟' : metric === 'words' ? '词' : '分'
}

export function formatLeaderboardValue(value: number, metric: LeaderboardMetric): string {
  if (metric === 'time' && value > 0 && value < 60) return '<1'
  const display = metric === 'time' ? Math.floor(value / 60) : value
  return String(display).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function leaderboardMeasure(metric: LeaderboardMetric, period: LeaderboardPeriod) {
  const measures = {
    time: ['本周累计时长', '累计时长'],
    words: ['本周首次掌握', '当前掌握词汇'],
    power: ['本周学习力', '累计学习力']
  }
  return measures[metric][period === 'week' ? 0 : 1]
}

export function leaderboardRankHint(snapshot: LeaderboardSnapshot): string {
  if (snapshot.myRank === null) return '完成学习后，查看你的排名'
  if (snapshot.myRank === 1) return '每一份积累，都算数'
  if (snapshot.gapToPrevious === 0) return '与上一名成绩相同'
  if (snapshot.gapToPrevious === null) return ''
  const gap = snapshot.metric === 'time' ? Math.ceil(snapshot.gapToPrevious / 60) : snapshot.gapToPrevious
  return `距上一名还差 ${gap} ${leaderboardUnit(snapshot.metric)}`
}
