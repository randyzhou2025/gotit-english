import { and, count, desc, eq, gte } from "drizzle-orm";
import { db } from "../db/index.js";
import { appConfig, learningPowerEvents, userDailyStats, userProgress } from "../db/schema.js";
import { shanghaiDateString, uniqueWordIds } from "../lib/utils.js";

export interface DashboardSnapshot {
  todayWords: number;
  todayMinutes: number;
  streakDays: number;
  totalMastered: number;
  totalStudyDays: number;
  weeklyMinutes: number[];
  weeklyTotalMinutes: number;
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

async function countConsecutiveStudyDays(userId: string): Promise<number> {
  const rows = await db
    .select({ statDate: learningPowerEvents.eventDate })
    .from(learningPowerEvents)
    .where(and(
      eq(learningPowerEvents.userId, userId),
      eq(learningPowerEvents.eventType, "APP_OPEN")
    ))
    .orderBy(desc(learningPowerEvents.eventDate));

  if (rows.length === 0) return 0;

  const dateSet = new Set(rows.map((r) => String(r.statDate)));
  let cursor = shanghaiDateString();
  if (!dateSet.has(cursor)) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    cursor = shanghaiDateString(yesterday);
  }

  let streak = 0;
  while (dateSet.has(cursor)) {
    streak += 1;
    const d = new Date(`${cursor}T12:00:00+08:00`);
    d.setDate(d.getDate() - 1);
    cursor = shanghaiDateString(d);
  }

  return streak;
}

export async function getDashboard(userId: string): Promise<DashboardSnapshot> {
  const today = shanghaiDateString();
  const weekDates = currentWeekDates();
  const [[todayRow], [progressRow], [studyDaysRow], streakDays, weekRows] = await Promise.all([
    db
      .select()
      .from(userDailyStats)
      .where(and(eq(userDailyStats.userId, userId), eq(userDailyStats.statDate, today)))
      .limit(1),
    db.select().from(userProgress).where(eq(userProgress.userId, userId)).limit(1),
    db
      .select({ total: count() })
      .from(userDailyStats)
      .where(eq(userDailyStats.userId, userId)),
    countConsecutiveStudyDays(userId),
    db
      .select({
        statDate: userDailyStats.statDate,
        studySeconds: userDailyStats.studySeconds,
      })
      .from(userDailyStats)
      .where(and(eq(userDailyStats.userId, userId), gte(userDailyStats.statDate, weekDates[0]!))),
  ]);

  const mastered = progressRow?.masteredWordIds ?? [];
  const secondsByDate = new Map(
    weekRows.map((row) => [String(row.statDate), row.studySeconds])
  );
  const weeklyMinutes = weekDates.map((date) =>
    Math.round((secondsByDate.get(date) ?? 0) / 60)
  );

  return {
    todayWords: todayRow?.wordsStudied ?? 0,
    todayMinutes: Math.round((todayRow?.studySeconds ?? 0) / 60),
    streakDays,
    totalMastered: mastered.length,
    totalStudyDays: Number(studyDaysRow?.total ?? 0),
    weeklyMinutes,
    weeklyTotalMinutes: weeklyMinutes.reduce((sum, minutes) => sum + minutes, 0),
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
