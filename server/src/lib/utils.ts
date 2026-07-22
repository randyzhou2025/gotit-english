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

function randomSuffix(length = 5): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let value = "";
  for (let i = 0; i < length; i += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)]!;
  }
  return value;
}

export function defaultNickname(): string {
  return `课本单词通_${randomSuffix()}`;
}

export function maskOpenId(openid: string): string {
  if (openid.length <= 8) return "***";
  return `${openid.slice(0, 4)}***${openid.slice(-4)}`;
}
