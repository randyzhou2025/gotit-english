import { describe, expect, it } from 'vitest'
import { formatLeaderboardValue, leaderboardRankHint } from './leaderboard'
import type { LeaderboardSnapshot } from './classmates'

describe('leaderboard display', () => {
  it('preserves second-level ranking without displaying zero for active learners', () => {
    expect(formatLeaderboardValue(0, 'time')).toBe('0')
    expect(formatLeaderboardValue(59, 'time')).toBe('<1')
    expect(formatLeaderboardValue(119, 'time')).toBe('1')
    expect(formatLeaderboardValue(3697, 'words')).toBe('3,697')
  })

  it('explains ties without promising that equal scores overtake', () => {
    expect(leaderboardRankHint({ myRank: 2, gapToPrevious: 0, metric: 'words' } as LeaderboardSnapshot))
      .toBe('与上一名成绩相同')
    expect(leaderboardRankHint({ myRank: 4, gapToPrevious: 61, metric: 'time' } as LeaderboardSnapshot))
      .toBe('距上一名还差 2 分钟')
    expect(leaderboardRankHint({ myRank: null } as LeaderboardSnapshot)).toContain('完成学习后')
  })
})
