/** 上海时区日历日 YYYY-MM-DD */
export function shanghaiDateString(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(d);
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
