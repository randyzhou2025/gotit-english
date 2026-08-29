import { shanghaiDateString, uniqueWordIds } from "./utils.js";

export const LEARNING_POWER_LIMITS = {
  dictationWord: 20,
  validDictation: 20,
  dailyBonus: 10,
  streak: 5,
  mistakeReview: 20,
  wordlistExport: 20,
  wordMatch: 20,
} as const;

export type LearningPowerEventType =
  | "APP_OPEN"
  | "DICTATION_WORD"
  | "VALID_DICTATION"
  | "DAILY_BONUS"
  | "STREAK_BONUS"
  | "MISTAKE_REVIEW"
  | "WORDLIST_EXPORT"
  | "WORD_MATCH_ROUND";

export interface ShanghaiWeekContext {
  dateKey: string;
  weekKey: string;
  weekStart: string;
  weekEnd: string;
}

function noonInShanghai(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00+08:00`);
}

function dateKeyAfter(dateKey: string, days: number): string {
  const value = noonInShanghai(dateKey);
  value.setUTCDate(value.getUTCDate() + days);
  return shanghaiDateString(value);
}

export function shanghaiWeekContext(now = new Date()): ShanghaiWeekContext {
  const dateKey = shanghaiDateString(now);
  const current = noonInShanghai(dateKey);
  const weekday = current.getUTCDay() || 7;
  const mondayKey = dateKeyAfter(dateKey, 1 - weekday);
  const thursdayKey = dateKeyAfter(mondayKey, 3);
  const weekYear = Number(thursdayKey.slice(0, 4));

  const januaryFourthKey = `${weekYear}-01-04`;
  const januaryFourth = noonInShanghai(januaryFourthKey);
  const januaryFourthWeekday = januaryFourth.getUTCDay() || 7;
  const firstMondayKey = dateKeyAfter(januaryFourthKey, 1 - januaryFourthWeekday);
  const weekNumber = Math.floor(
    (noonInShanghai(mondayKey).getTime() - noonInShanghai(firstMondayKey).getTime()) / 604_800_000
  ) + 1;

  return {
    dateKey,
    weekKey: `${weekYear}-W${String(weekNumber).padStart(2, "0")}`,
    weekStart: `${mondayKey}T00:00:00+08:00`,
    weekEnd: `${dateKeyAfter(mondayKey, 6)}T23:59:59.999+08:00`,
  };
}

export function previousShanghaiDate(dateKey: string): string {
  return dateKeyAfter(dateKey, -1);
}

export function normalizedClassmatePair(userId1: string, userId2: string): [string, string] {
  return userId1 <= userId2 ? [userId1, userId2] : [userId2, userId1];
}

export function isValidDictation(input: {
  completed: boolean;
  wordIds: string[];
  unitWordCount: number;
}): boolean {
  if (!input.completed) return false;
  const completedCount = uniqueWordIds(input.wordIds).length;
  if (completedCount >= 10) return true;
  return input.unitWordCount > 0
    && input.unitWordCount < 10
    && completedCount === input.unitWordCount;
}

export function availableScore(current: number, limit: number, requested: number): number {
  return Math.max(0, Math.min(Math.max(0, requested), Math.max(0, limit - current)));
}

export function wordMatchRoundScore(input: {
  wordCount: number;
  bestCombo: number;
  errorCount: number;
}): number {
  const perfectRound = input.wordCount > 0
    && input.errorCount === 0
    && input.bestCombo === input.wordCount;
  return perfectRound ? 5 : 2;
}

export function pointsToOvertake(previousScore: number | null, myScore: number): number | null {
  if (previousScore === null) return null;
  return Math.max(1, previousScore - myScore + 1);
}

export function pointsToEnterTopTen(tenthScore: number | null, myScore: number): number | null {
  if (tenthScore === null) return null;
  return Math.max(1, tenthScore - myScore);
}

export function dictationSubmissionKey(userId: string, sessionId: string): string {
  return `${userId}:${sessionId}`;
}

export function learningPowerUniqueKey(input: {
  type: LearningPowerEventType;
  userId: string;
  dateKey: string;
  weekKey: string;
  wordId?: string;
  sessionId?: string;
  exportId?: string;
  unitId?: string;
  roundIndex?: number;
}): string {
  switch (input.type) {
    case "APP_OPEN":
      return `APP_OPEN:${input.userId}:${input.dateKey.replaceAll("-", "")}`;
    case "DICTATION_WORD":
      return `WEEKLY_WORD:${input.userId}:${input.wordId ?? ""}:${input.weekKey}`;
    case "VALID_DICTATION":
      return `VALID_DICTATION:${input.userId}:${input.sessionId ?? ""}`;
    case "DAILY_BONUS":
      return `DAILY_BONUS:${input.userId}:${input.dateKey.replaceAll("-", "")}`;
    case "STREAK_BONUS":
      return `STREAK_BONUS:${input.userId}:${input.dateKey.replaceAll("-", "")}`;
    case "MISTAKE_REVIEW":
      return `MISTAKE_REVIEW:${input.userId}:${input.wordId ?? ""}:${input.dateKey.replaceAll("-", "")}`;
    case "WORDLIST_EXPORT":
      return `WORDLIST_EXPORT:${input.userId}:${input.exportId ?? ""}`;
    case "WORD_MATCH_ROUND":
      return `WORD_MATCH_ROUND:${input.userId}:${input.unitId ?? ""}:${input.roundIndex ?? ""}:${input.dateKey.replaceAll("-", "")}`;
  }
}
