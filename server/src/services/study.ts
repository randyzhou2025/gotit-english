import { and, count, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { appConfig, userDailyStats, userProgress } from "../db/schema.js";
import { shanghaiDateString, uniqueWordIds } from "../lib/utils.js";

export interface DashboardSnapshot {
  todayWords: number;
  todayMinutes: number;
  streakDays: number;
  totalMastered: number;
  totalStudyDays: number;
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
    .select({ statDate: userDailyStats.statDate })
    .from(userDailyStats)
    .where(eq(userDailyStats.userId, userId))
    .orderBy(desc(userDailyStats.statDate));

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
  const [[todayRow], [progressRow], [studyDaysRow], streakDays] = await Promise.all([
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
  ]);

  const mastered = progressRow?.masteredWordIds ?? [];

  return {
    todayWords: todayRow?.wordsStudied ?? 0,
    todayMinutes: Math.round((todayRow?.studySeconds ?? 0) / 60),
    streakDays,
    totalMastered: mastered.length,
    totalStudyDays: Number(studyDaysRow?.total ?? 0),
  };
}

export async function ensureAppConfigDefaults() {
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
