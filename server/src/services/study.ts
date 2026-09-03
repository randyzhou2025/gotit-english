import { and, count, desc, eq, gt, gte, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { appConfig, userDailyStats, userProgress } from "../db/schema.js";
import {
  countConsecutiveShanghaiDates,
  recentShanghaiDateStrings,
  shanghaiDateString,
  uniqueWordIds,
} from "../lib/utils.js";

export interface DashboardSnapshot {
  todayWords: number;
  todayMinutes: number;
  streakDays: number;
  totalMastered: number;
  totalStudyDays: number;
  weeklyMinutes: number[];
  weeklyTotalMinutes: number;
  recent30Days: Array<{
    date: string;
    minutes: number;
    studied: boolean;
  }>;
}

function currentWeekDates(): string[] {
  const today = shanghaiDateString();
  const cursor = new Date(`${today}T12:00:00+08:00`);
  const weekday = cursor.getUTCDay() || 7;
  cursor.setUTCDate(cursor.getUTCDate() - weekday + 1);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(cursor);
    date.setUTCDate(cursor.getUTCDate() + index);
    return shanghaiDateString(date);
  });
}

export async function recordStudyEvent(
  userId: string,
  options: { wordIds?: string[]; durationSeconds?: number }
): Promise<void> {
  const statDate = shanghaiDateString();
  const now = new Date();
  const incomingWordIds = uniqueWordIds(options.wordIds ?? []);
  const durationSeconds = Math.max(0, Math.floor(options.durationSeconds ?? 0));

  if (incomingWordIds.length === 0 && durationSeconds <= 0) return;

  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(userDailyStats)
      .where(and(eq(userDailyStats.userId, userId), eq(userDailyStats.statDate, statDate)))
      .limit(1);

    if (existing) {
      const mergedIds = uniqueWordIds([...(existing.wordIdsToday ?? []), ...incomingWordIds]);
      const addedWords = mergedIds.length - (existing.wordIdsToday?.length ?? 0);
      await tx
        .update(userDailyStats)
        .set({
          wordsStudied: existing.wordsStudied + Math.max(0, addedWords),
          studySeconds: existing.studySeconds + durationSeconds,
          wordIdsToday: mergedIds,
          lastSeenAt: now,
        })
        .where(and(eq(userDailyStats.userId, userId), eq(userDailyStats.statDate, statDate)));
      return;
    }

    await tx.insert(userDailyStats).values({
      userId,
      statDate,
      wordsStudied: incomingWordIds.length,
      studySeconds: durationSeconds,
      wordIdsToday: incomingWordIds,
      firstSeenAt: now,
      lastSeenAt: now,
    });
  });
}

async function countConsecutiveStudyDays(userId: string, today: string): Promise<number> {
  const rows = await db
    .select({ statDate: userDailyStats.statDate })
    .from(userDailyStats)
    .where(and(
      eq(userDailyStats.userId, userId),
      or(gt(userDailyStats.studySeconds, 0), gt(userDailyStats.wordsStudied, 0))
    ))
    .orderBy(desc(userDailyStats.statDate));

  return countConsecutiveShanghaiDates(rows.map((row) => String(row.statDate)), today);
}

export async function getDashboard(userId: string): Promise<DashboardSnapshot> {
  const today = shanghaiDateString();
  const weekDates = currentWeekDates();
  const recent30Dates = recentShanghaiDateStrings(30);
  const [[todayRow], [progressRow], [studyDaysRow], streakDays, recentRows] = await Promise.all([
    db
      .select()
      .from(userDailyStats)
      .where(and(eq(userDailyStats.userId, userId), eq(userDailyStats.statDate, today)))
      .limit(1),
    db.select().from(userProgress).where(eq(userProgress.userId, userId)).limit(1),
    db
      .select({ total: count() })
      .from(userDailyStats)
      .where(and(
        eq(userDailyStats.userId, userId),
        or(gt(userDailyStats.studySeconds, 0), gt(userDailyStats.wordsStudied, 0))
      )),
    countConsecutiveStudyDays(userId, today),
    db
      .select({
        statDate: userDailyStats.statDate,
        studySeconds: userDailyStats.studySeconds,
        wordsStudied: userDailyStats.wordsStudied,
      })
      .from(userDailyStats)
      .where(and(eq(userDailyStats.userId, userId), gte(userDailyStats.statDate, recent30Dates[0]!))),
  ]);

  const mastered = progressRow?.masteredWordIds ?? [];
  const statsByDate = new Map(
    recentRows.map((row) => [String(row.statDate), row])
  );
  const weeklyMinutes = weekDates.map((date) =>
    Math.round((statsByDate.get(date)?.studySeconds ?? 0) / 60)
  );
  const recent30Days = recent30Dates.map((date) => {
    const row = statsByDate.get(date);
    return {
      date,
      minutes: Math.round((row?.studySeconds ?? 0) / 60),
      studied: Boolean(row && (row.studySeconds > 0 || row.wordsStudied > 0)),
    };
  });

  return {
    todayWords: todayRow?.wordsStudied ?? 0,
    todayMinutes: Math.round((todayRow?.studySeconds ?? 0) / 60),
    streakDays,
    totalMastered: mastered.length,
    totalStudyDays: Number(studyDaysRow?.total ?? 0),
    weeklyMinutes,
    weeklyTotalMinutes: weeklyMinutes.reduce((sum, minutes) => sum + minutes, 0),
    recent30Days,
  };
}

export async function ensureAppConfigDefaults() {
  await db
    .insert(appConfig)
    .values([
      { key: "analytics_enabled", value: "true" },
      { key: "feature_announcements_enabled", value: "true" },
    ])
    .onConflictDoNothing({ target: appConfig.key });

  const defaults: Record<string, string> = {
    customer_service_qr_url: process.env.CUSTOMER_SERVICE_QR_URL ?? "",
    icp_number: process.env.ICP_NUMBER ?? "",
  };

  for (const [key, value] of Object.entries(defaults)) {
    if (!value) continue;
    await db
      .insert(appConfig)
      .values({ key, value })
      .onConflictDoUpdate({ target: appConfig.key, set: { value } });
  }
}
