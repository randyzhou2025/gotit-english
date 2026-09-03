/** 上海时区日历日 YYYY-MM-DD */
export function shanghaiDateString(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(d);
}

export function recentShanghaiDateStrings(days: number, now = new Date()): string[] {
  const count = Math.max(0, Math.floor(days));
  const today = shanghaiDateString(now);
  const cursor = new Date(`${today}T12:00:00+08:00`);
  cursor.setUTCDate(cursor.getUTCDate() - count + 1);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(cursor);
    date.setUTCDate(cursor.getUTCDate() + index);
    return shanghaiDateString(date);
  });
}

export function countConsecutiveShanghaiDates(
  dates: string[],
  today = shanghaiDateString()
): number {
  const dateSet = new Set(dates);
  let cursor = today;

  if (!dateSet.has(cursor)) {
    const yesterday = new Date(`${cursor}T12:00:00+08:00`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    cursor = shanghaiDateString(yesterday);
  }

  let streak = 0;
  while (dateSet.has(cursor)) {
    streak += 1;
    const previousDay = new Date(`${cursor}T12:00:00+08:00`);
    previousDay.setUTCDate(previousDay.getUTCDate() - 1);
    cursor = shanghaiDateString(previousDay);
  }

  return streak;
}

export function uniqueWordIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => typeof id === "string" && id.length > 0)));
}

export interface ProgressSnapshot {
  masteredWordIds: string[];
  savedWeakWordIds: string[];
  selectedUnitId: string;
  courseSetupCompleted: boolean;
  updatedAt: string;
}

export function serializeProgress(row: {
  masteredWordIds: string[];
  savedWeakWordIds: string[];
  selectedUnitId: string;
  courseSetupCompleted: boolean;
  updatedAt: Date;
}): ProgressSnapshot {
  return {
    masteredWordIds: row.masteredWordIds ?? [],
    savedWeakWordIds: row.savedWeakWordIds ?? [],
    selectedUnitId: row.selectedUnitId ?? "",
    courseSetupCompleted: Boolean(row.courseSetupCompleted),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function emptyProgress(): ProgressSnapshot {
  return {
    masteredWordIds: [],
    savedWeakWordIds: [],
    selectedUnitId: "",
    courseSetupCompleted: false,
    updatedAt: "",
  };
}

/**
 * Preserve words omitted by a partial/stale client snapshot while still allowing
 * an incoming mastered/weak status to replace the previous status.
 */
export function mergeProgressForSave(
  existing: ProgressSnapshot,
  incoming: ProgressSnapshot
): ProgressSnapshot {
  const incomingMastered = new Set(uniqueWordIds(incoming.masteredWordIds));
  const incomingWeak = new Set(uniqueWordIds(incoming.savedWeakWordIds));

  return {
    masteredWordIds: uniqueWordIds([
      ...existing.masteredWordIds.filter((id) => !incomingWeak.has(id)),
      ...incomingMastered,
    ]),
    savedWeakWordIds: uniqueWordIds([
      ...existing.savedWeakWordIds.filter((id) => !incomingMastered.has(id)),
      ...incomingWeak,
    ]),
    selectedUnitId: incoming.selectedUnitId || existing.selectedUnitId,
    courseSetupCompleted: existing.courseSetupCompleted || incoming.courseSetupCompleted,
    updatedAt: incoming.updatedAt || existing.updatedAt,
  };
}

export function maskOpenId(openid: string): string {
  if (openid.length <= 8) return "***";
  return `${openid.slice(0, 4)}***${openid.slice(-4)}`;
}
