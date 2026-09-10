export interface MasteryEvent {
  wordId: string
  masteredAt: string
}

const STORAGE_KEY = 'gotit:mastery:pending:v1'

export function readPendingMasteryEvents(): MasteryEvent[] {
  try {
    const rows = uni.getStorageSync(STORAGE_KEY)
    return Array.isArray(rows) ? rows.filter((row): row is MasteryEvent =>
      typeof row?.wordId === 'string' && row.wordId.length > 0
      && typeof row?.masteredAt === 'string' && Number.isFinite(Date.parse(row.masteredAt))) : []
  } catch {
    return []
  }
}

/** 仅由真实掌握动作调用，云端合并与历史进度初始化不产生事件。 */
export function recordMasteryEvents(wordIds: string[], now = new Date()) {
  if (wordIds.length === 0) return
  const pending = new Map(readPendingMasteryEvents().map(event => [event.wordId, event]))
  for (const wordId of wordIds) {
    if (wordId && !pending.has(wordId)) pending.set(wordId, { wordId, masteredAt: now.toISOString() })
  }
  try {
    uni.setStorageSync(STORAGE_KEY, [...pending.values()])
  } catch (error) {
    console.warn('[mastery] pending event storage failed', error)
  }
}

/** 只清除本次服务端确认的事件，保留请求期间新产生的记录。 */
export function acknowledgeMasteryEvents(events: MasteryEvent[]) {
  const sent = new Map(events.map(event => [event.wordId, event.masteredAt]))
  const remaining = readPendingMasteryEvents().filter(event => sent.get(event.wordId) !== event.masteredAt)
  try {
    uni.setStorageSync(STORAGE_KEY, remaining)
  } catch (error) {
    // 清除失败时下次重传；服务端按用户和词条去重。
    console.warn('[mastery] pending event acknowledgement failed', error)
  }
}
