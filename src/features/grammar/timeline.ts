export interface SceneTimeline { points: string[]; active: number[]; meaning: string }
const timelines: Record<string, SceneTimeline> = {
  t01: { points: ['过去', '现在', '将来'], active: [0, 1, 2], meaning: '表示习惯、经常发生的事或客观事实。' },
  t02: { points: ['过去发生', '现在', '将来'], active: [0], meaning: '表示过去发生的事或存在的状态。' },
  t03: { points: ['过去', '现在', '之后发生'], active: [2], meaning: '表示将来的计划、决定或预测。' },
  t04: { points: ['过去', '现在进行中', '将来'], active: [1], meaning: '表示现在或最近一段时间正在做的事。' },
  t05: { points: ['过去某时', '现在', '将来'], active: [0], meaning: '表示过去某个时刻正在做的事。' },
  t06: { points: ['过去发生', '影响现在', '将来'], active: [0, 1], meaning: '过去的事对现在有影响，也可表示持续到现在的状态。' },
  t07: { points: ['过去说话时', '之后的事', '更晚'], active: [0, 1], meaning: '过去说过之后会发生的事，是否发生要看句子意思。' },
  t08: { points: ['过去', '现在', '将来某时'], active: [2], meaning: '表示将来某个时刻正在做的事。' },
  t09: { points: ['先发生', '过去某时', '现在'], active: [0, 1], meaning: '一个过去的动作发生前，另一个动作已经发生或完成。' },
  t10: { points: ['过去开始', '持续至现在', '更晚'], active: [0, 1], meaning: '动作从过去开始，持续到现在，或刚结束但仍有影响。' },
  t11: { points: ['更早开始', '过去某时', '现在'], active: [0, 1], meaning: '到过去某个时刻，动作已经持续了一段时间。' },
  t12: { points: ['现在', '完成动作', '将来某时'], active: [1, 2], meaning: '到将来某个时间，动作将已经完成。' },
  t13: { points: ['动作开始', '持续进行', '将来某时'], active: [0, 1, 2], meaning: '到将来某个时间，动作将已经持续多久。' },
  t14: { points: ['过去说话时', '之后某时', '更晚'], active: [0, 1], meaning: '转述过去的话，表示之后某个时刻正在进行的动作。' },
  t15: { points: ['过去说话时', '完成动作', '之后某时'], active: [0, 1, 2], meaning: '转述过去的话，表示动作会在之后某个时间前完成。' },
  t16: { points: ['过去说话时', '动作持续', '之后某时'], active: [0, 1, 2], meaning: '转述过去的话，表示动作到之后某时将已持续多久。' }
}
export function sceneTimeline(id: string, usageIndex: number): SceneTimeline {
  if ((id === 't01' || id === 't04') && usageIndex === 2) {
    return { points: ['过去', '现在', '已安排的将来'], active: [2], meaning: '这里用现在时的形式表示将来。一般现在时可表示固定时刻表，现在进行时可表示已确定的安排。' }
  }
  return timelines[id] || timelines.t01!
}
