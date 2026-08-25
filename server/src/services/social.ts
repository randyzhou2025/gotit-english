import { randomBytes } from "node:crypto";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { db } from "../db/index.js";
import {
  appConfig,
  classmateRelations,
  dailyLearningPowerStats,
  dictationSubmissions,
  feedCheers,
  learningActivities,
  learningPowerEvents,
  shareInvites,
  userWeakWordHistory,
  users,
  weeklyLearningPower,
  weeklyWordLearning,
} from "../db/schema.js";
import {
  LEARNING_POWER_LIMITS,
  availableScore,
  isValidDictation,
  learningPowerUniqueKey,
  normalizedClassmatePair,
  pointsToOvertake,
  previousShanghaiDate,
  shanghaiWeekContext,
  type LearningPowerEventType,
} from "../lib/learning-power.js";
import { uniqueWordIds } from "../lib/utils.js";

export type ShareType = "UNIT_INVITE" | "DICTATION_RESULT" | "CLASSMATE_INVITE";

export interface DictationCompletionInput {
  sessionId: string;
  unitId: string;
  unitName: string;
  unitWordCount: number;
  completed: boolean;
  wordResults: Array<{ wordId: string; correct: boolean }>;
  completedAt?: Date;
}

export interface DictationWordCompletionInput {
  sessionId: string;
  unitId: string;
  wordId: string;
  completedAt?: Date;
}

export interface LearningPowerBreakdown {
  dictationWordScore: number;
  validDictationScore: number;
  dailyBonusScore: number;
  streakScore: number;
  mistakeReviewScore: number;
}

const EMPTY_BREAKDOWN: LearningPowerBreakdown = {
  dictationWordScore: 0,
  validDictationScore: 0,
  dailyBonusScore: 0,
  streakScore: 0,
  mistakeReviewScore: 0,
};

interface LeaderboardConfig {
  displayLimit: number;
  maxLimit: number;
  topSpecialCount: number;
  timezone: "Asia/Shanghai";
  weekStartDay: "MONDAY";
}

const DEFAULT_LEADERBOARD_CONFIG: LeaderboardConfig = {
  displayLimit: 10,
  maxLimit: 100,
  topSpecialCount: 3,
  timezone: "Asia/Shanghai",
  weekStartDay: "MONDAY",
};

function totalBreakdown(breakdown: LearningPowerBreakdown): number {
  return Object.values(breakdown).reduce((sum, score) => sum + score, 0);
}

function orderedWeeklyRows<T extends typeof db>(database: T, weekKey: string) {
  return database
    .select({
      userId: weeklyLearningPower.userId,
      nickname: users.nickname,
      avatarUrl: users.avatarUrl,
      learningPower: weeklyLearningPower.learningPower,
      validDictationCount: weeklyLearningPower.validDictationCount,
      activeStudyDays: weeklyLearningPower.activeStudyDays,
      lastScoreAt: weeklyLearningPower.lastScoreAt,
    })
    .from(weeklyLearningPower)
    .innerJoin(users, eq(users.id, weeklyLearningPower.userId))
    .where(eq(weeklyLearningPower.weekKey, weekKey))
    .orderBy(
      desc(weeklyLearningPower.learningPower),
      desc(weeklyLearningPower.validDictationCount),
      desc(weeklyLearningPower.activeStudyDays),
      asc(weeklyLearningPower.lastScoreAt)
    );
}

async function getRank(userId: string, weekKey: string): Promise<number | null> {
  const rows = await orderedWeeklyRows(db, weekKey);
  const index = rows.findIndex((row) => row.userId === userId);
  return index < 0 ? null : index + 1;
}

async function currentLearningSnapshot(userId: string, weekKey: string) {
  const [row] = await db
    .select()
    .from(weeklyLearningPower)
    .where(and(eq(weeklyLearningPower.userId, userId), eq(weeklyLearningPower.weekKey, weekKey)))
    .limit(1);
  return row ?? null;
}

async function countAppOpenStreak(userId: string, dateKey: string): Promise<number> {
  const rows = await db
    .select({ eventDate: learningPowerEvents.eventDate })
    .from(learningPowerEvents)
    .where(and(
      eq(learningPowerEvents.userId, userId),
      eq(learningPowerEvents.eventType, "APP_OPEN"),
      lte(learningPowerEvents.eventDate, dateKey)
    ))
    .orderBy(desc(learningPowerEvents.eventDate));

  const dates = new Set(rows.map((row) => String(row.eventDate)));
  let cursor = dateKey;
  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = previousShanghaiDate(cursor);
  }
  return streak;
}

export async function recordAppOpen(userId: string, openedAt = new Date()) {
  const context = shanghaiWeekContext(openedAt);
  const result = await db.transaction(async (tx) => {
    const [openEvent] = await tx
      .insert(learningPowerEvents)
      .values({
        userId,
        weekKey: context.weekKey,
        eventDate: context.dateKey,
        eventType: "APP_OPEN",
        score: 0,
        uniqueKey: learningPowerUniqueKey({
          type: "APP_OPEN",
          userId,
          dateKey: context.dateKey,
          weekKey: context.weekKey,
        }),
        createdAt: openedAt,
      })
      .onConflictDoNothing({ target: learningPowerEvents.uniqueKey })
      .returning({ id: learningPowerEvents.id });
    if (!openEvent) return { duplicate: true, earned: 0 };

    const [yesterdayOpen] = await tx
      .select({ id: learningPowerEvents.id })
      .from(learningPowerEvents)
      .where(and(
        eq(learningPowerEvents.userId, userId),
        eq(learningPowerEvents.eventType, "APP_OPEN"),
        eq(learningPowerEvents.eventDate, previousShanghaiDate(context.dateKey))
      ))
      .limit(1);
    if (!yesterdayOpen) return { duplicate: false, earned: 0 };

    await tx
      .insert(dailyLearningPowerStats)
      .values(dailyStatDefaults(userId, context.dateKey))
      .onConflictDoNothing({ target: [dailyLearningPowerStats.userId, dailyLearningPowerStats.statDate] });
    const [daily] = await tx
      .select()
      .from(dailyLearningPowerStats)
      .where(and(
        eq(dailyLearningPowerStats.userId, userId),
        eq(dailyLearningPowerStats.statDate, context.dateKey)
      ))
      .for("update")
      .limit(1);
    if (!daily) throw new Error("Daily learning power row was not created");

    await tx
      .insert(weeklyLearningPower)
      .values({ userId, weekKey: context.weekKey, lastScoreAt: openedAt })
      .onConflictDoNothing({ target: [weeklyLearningPower.userId, weeklyLearningPower.weekKey] });
    const [weekly] = await tx
      .select()
      .from(weeklyLearningPower)
      .where(and(
        eq(weeklyLearningPower.userId, userId),
        eq(weeklyLearningPower.weekKey, context.weekKey)
      ))
      .for("update")
      .limit(1);
    if (!weekly) throw new Error("Weekly learning power row was not created");

    const score = LEARNING_POWER_LIMITS.streak;
    const [scoreEvent] = await tx
      .insert(learningPowerEvents)
      .values({
        userId,
        weekKey: context.weekKey,
        eventDate: context.dateKey,
        eventType: "STREAK_BONUS",
        score,
        uniqueKey: learningPowerUniqueKey({
          type: "STREAK_BONUS",
          userId,
          dateKey: context.dateKey,
          weekKey: context.weekKey,
        }),
        createdAt: openedAt,
      })
      .onConflictDoNothing({ target: learningPowerEvents.uniqueKey })
      .returning({ id: learningPowerEvents.id });
    if (!scoreEvent) return { duplicate: false, earned: 0 };

    await tx
      .update(dailyLearningPowerStats)
      .set({
        streakScore: daily.streakScore + score,
        totalScore: daily.totalScore + score,
        updatedAt: openedAt,
      })
      .where(and(
        eq(dailyLearningPowerStats.userId, userId),
        eq(dailyLearningPowerStats.statDate, context.dateKey)
      ));
    await tx
      .update(weeklyLearningPower)
      .set({
        learningPower: weekly.learningPower + score,
        lastScoreAt: openedAt,
        updatedAt: openedAt,
      })
      .where(and(
        eq(weeklyLearningPower.userId, userId),
        eq(weeklyLearningPower.weekKey, context.weekKey)
      ));
    return { duplicate: false, earned: score };
  });

  const streakDays = await countAppOpenStreak(userId, context.dateKey);
  if (streakDays >= 2) {
    await db
      .insert(learningActivities)
      .values({
        userId,
        activityType: "STREAK",
        countValue: streakDays,
        uniqueKey: `STREAK:${userId}:${context.dateKey}`,
        occurredAt: openedAt,
      })
      .onConflictDoNothing({ target: learningActivities.uniqueKey });
  }
  const weekly = await currentLearningSnapshot(userId, context.weekKey);
  return {
    ...result,
    streakDays,
    weekKey: context.weekKey,
    weeklyLearningPower: weekly?.learningPower ?? 0,
  };
}

function dailyStatDefaults(userId: string, dateKey: string) {
  return {
    userId,
    statDate: dateKey,
    ...EMPTY_BREAKDOWN,
    totalScore: 0,
    updatedAt: new Date(),
  };
}

async function learningBreakdownForSession(
  userId: string,
  sessionId: string
): Promise<LearningPowerBreakdown> {
  const rows = await db
    .select({ eventType: learningPowerEvents.eventType, score: learningPowerEvents.score })
    .from(learningPowerEvents)
    .where(and(
      eq(learningPowerEvents.userId, userId),
      eq(learningPowerEvents.dictationSessionId, sessionId)
    ));
  const breakdown = { ...EMPTY_BREAKDOWN };
  for (const row of rows) {
    if (row.eventType === "DICTATION_WORD") breakdown.dictationWordScore += row.score;
    if (row.eventType === "VALID_DICTATION") breakdown.validDictationScore += row.score;
    if (row.eventType === "DAILY_BONUS") breakdown.dailyBonusScore += row.score;
    if (row.eventType === "STREAK_BONUS") breakdown.streakScore += row.score;
    if (row.eventType === "MISTAKE_REVIEW") breakdown.mistakeReviewScore += row.score;
  }
  return breakdown;
}

export async function recordDictationWordCompletion(
  userId: string,
  input: DictationWordCompletionInput
) {
  const occurredAt = input.completedAt ?? new Date();
  const context = shanghaiWeekContext(occurredAt);
  const earned = await db.transaction(async (tx) => {
    await tx
      .insert(dailyLearningPowerStats)
      .values(dailyStatDefaults(userId, context.dateKey))
      .onConflictDoNothing({ target: [dailyLearningPowerStats.userId, dailyLearningPowerStats.statDate] });
    const [daily] = await tx
      .select()
      .from(dailyLearningPowerStats)
      .where(and(
        eq(dailyLearningPowerStats.userId, userId),
        eq(dailyLearningPowerStats.statDate, context.dateKey)
      ))
      .for("update")
      .limit(1);
    if (!daily) throw new Error("Daily learning power row was not created");

    await tx
      .insert(weeklyLearningPower)
      .values({ userId, weekKey: context.weekKey, lastScoreAt: occurredAt })
      .onConflictDoNothing({ target: [weeklyLearningPower.userId, weeklyLearningPower.weekKey] });
    const [weekly] = await tx
      .select()
      .from(weeklyLearningPower)
      .where(and(
        eq(weeklyLearningPower.userId, userId),
        eq(weeklyLearningPower.weekKey, context.weekKey)
      ))
      .for("update")
      .limit(1);
    if (!weekly) throw new Error("Weekly learning power row was not created");

    const [newlyLearned] = await tx
      .insert(weeklyWordLearning)
      .values({
        userId,
        wordId: input.wordId,
        weekKey: context.weekKey,
        firstLearnedAt: occurredAt,
      })
      .onConflictDoNothing({
        target: [weeklyWordLearning.userId, weeklyWordLearning.wordId, weeklyWordLearning.weekKey],
      })
      .returning({ wordId: weeklyWordLearning.wordId });
    if (!newlyLearned) return 0;

    const score = availableScore(
      daily.dictationWordScore,
      LEARNING_POWER_LIMITS.dictationWord,
      1
    );
    if (score <= 0) return 0;

    const [event] = await tx
      .insert(learningPowerEvents)
      .values({
        userId,
        weekKey: context.weekKey,
        eventDate: context.dateKey,
        eventType: "DICTATION_WORD",
        score,
        wordId: input.wordId,
        unitId: input.unitId,
        dictationSessionId: input.sessionId,
        uniqueKey: learningPowerUniqueKey({
          type: "DICTATION_WORD",
          userId,
          dateKey: context.dateKey,
          weekKey: context.weekKey,
          wordId: input.wordId,
        }),
        createdAt: occurredAt,
      })
      .onConflictDoNothing({ target: learningPowerEvents.uniqueKey })
      .returning({ id: learningPowerEvents.id });
    if (!event) return 0;

    await tx
      .update(dailyLearningPowerStats)
      .set({
        dictationWordScore: daily.dictationWordScore + score,
        totalScore: daily.totalScore + score,
        updatedAt: occurredAt,
      })
      .where(and(
        eq(dailyLearningPowerStats.userId, userId),
        eq(dailyLearningPowerStats.statDate, context.dateKey)
      ));
    await tx
      .update(weeklyLearningPower)
      .set({
        learningPower: weekly.learningPower + score,
        lastScoreAt: occurredAt,
        updatedAt: occurredAt,
      })
      .where(and(
        eq(weeklyLearningPower.userId, userId),
        eq(weeklyLearningPower.weekKey, context.weekKey)
      ));
    return score;
  });

  return {
    earned,
    weekKey: context.weekKey,
  };
}

export async function recordDictationCompletion(userId: string, input: DictationCompletionInput) {
  const occurredAt = input.completedAt ?? new Date();
  const context = shanghaiWeekContext(occurredAt);
  const wordIds = uniqueWordIds(input.wordResults.map((result) => result.wordId));
  const validDictation = isValidDictation({
    completed: input.completed,
    wordIds,
    unitWordCount: input.unitWordCount,
  });

  const oldRank = await getRank(userId, context.weekKey);
  const result = await db.transaction(async (tx) => {
    const [submission] = await tx
      .insert(dictationSubmissions)
      .values({
        userId,
        sessionId: input.sessionId,
        unitId: input.unitId,
        completedWordCount: wordIds.length,
        isValid: validDictation,
        completedAt: occurredAt,
      })
      .onConflictDoNothing({ target: [dictationSubmissions.userId, dictationSubmissions.sessionId] })
      .returning({ id: dictationSubmissions.id });

    if (!submission) {
      return { duplicate: true, breakdown: { ...EMPTY_BREAKDOWN }, validDictation: false };
    }

    await tx
      .insert(dailyLearningPowerStats)
      .values(dailyStatDefaults(userId, context.dateKey))
      .onConflictDoNothing({ target: [dailyLearningPowerStats.userId, dailyLearningPowerStats.statDate] });
    const [daily] = await tx
      .select()
      .from(dailyLearningPowerStats)
      .where(and(
        eq(dailyLearningPowerStats.userId, userId),
        eq(dailyLearningPowerStats.statDate, context.dateKey)
      ))
      .for("update")
      .limit(1);
    if (!daily) throw new Error("Daily learning power row was not created");

    await tx
      .insert(weeklyLearningPower)
      .values({ userId, weekKey: context.weekKey, lastScoreAt: occurredAt })
      .onConflictDoNothing({ target: [weeklyLearningPower.userId, weeklyLearningPower.weekKey] });
    const [weekly] = await tx
      .select()
      .from(weeklyLearningPower)
      .where(and(
        eq(weeklyLearningPower.userId, userId),
        eq(weeklyLearningPower.weekKey, context.weekKey)
      ))
      .for("update")
      .limit(1);
    if (!weekly) throw new Error("Weekly learning power row was not created");

    const breakdown = { ...EMPTY_BREAKDOWN };
    const eventRows: Array<typeof learningPowerEvents.$inferInsert> = [];
    const addEvent = (
      eventType: LearningPowerEventType,
      score: number,
      extra: { wordId?: string; sessionId?: string } = {}
    ) => {
      if (score <= 0) return;
      eventRows.push({
        userId,
        weekKey: context.weekKey,
        eventDate: context.dateKey,
        eventType,
        score,
        wordId: extra.wordId,
        unitId: input.unitId,
        dictationSessionId: extra.sessionId,
        uniqueKey: learningPowerUniqueKey({
          type: eventType,
          userId,
          dateKey: context.dateKey,
          weekKey: context.weekKey,
          wordId: extra.wordId,
          sessionId: extra.sessionId,
        }),
        createdAt: occurredAt,
      });
    };

    if (wordIds.length > 0) {
      const newlyLearned = await tx
        .insert(weeklyWordLearning)
        .values(wordIds.map((wordId) => ({
          userId,
          wordId,
          weekKey: context.weekKey,
          firstLearnedAt: occurredAt,
        })))
        .onConflictDoNothing({
          target: [weeklyWordLearning.userId, weeklyWordLearning.wordId, weeklyWordLearning.weekKey],
        })
        .returning({ wordId: weeklyWordLearning.wordId });

      const awardedWordCount = availableScore(
        daily.dictationWordScore,
        LEARNING_POWER_LIMITS.dictationWord,
        newlyLearned.length
      );
      breakdown.dictationWordScore = awardedWordCount;
      for (const row of newlyLearned.slice(0, awardedWordCount)) {
        addEvent("DICTATION_WORD", 1, { wordId: row.wordId, sessionId: input.sessionId });
      }
    }

    const firstValidStudyToday = validDictation && daily.dailyBonusScore === 0;
    if (validDictation) {
      breakdown.validDictationScore = availableScore(
        daily.validDictationScore,
        LEARNING_POWER_LIMITS.validDictation,
        5
      );
      addEvent("VALID_DICTATION", breakdown.validDictationScore, { sessionId: input.sessionId });

      if (firstValidStudyToday) {
        breakdown.dailyBonusScore = LEARNING_POWER_LIMITS.dailyBonus;
        addEvent("DAILY_BONUS", breakdown.dailyBonusScore, { sessionId: input.sessionId });
      }
    }

    const weakResults = input.wordResults.filter((result) => !result.correct);
    if (weakResults.length > 0) {
      await tx
        .insert(userWeakWordHistory)
        .values(uniqueWordIds(weakResults.map((result) => result.wordId)).map((wordId) => ({
          userId,
          wordId,
          firstMarkedWeakAt: occurredAt,
          lastMarkedWeakAt: occurredAt,
        })))
        .onConflictDoUpdate({
          target: [userWeakWordHistory.userId, userWeakWordHistory.wordId],
          set: { lastMarkedWeakAt: occurredAt },
        });
    }

    if (eventRows.length > 0) {
      await tx.insert(learningPowerEvents).values(eventRows).onConflictDoNothing({
        target: learningPowerEvents.uniqueKey,
      });
    }

    const earned = totalBreakdown(breakdown);
    await tx
      .update(dailyLearningPowerStats)
      .set({
        dictationWordScore: daily.dictationWordScore + breakdown.dictationWordScore,
        validDictationScore: daily.validDictationScore + breakdown.validDictationScore,
        dailyBonusScore: daily.dailyBonusScore + breakdown.dailyBonusScore,
        streakScore: daily.streakScore + breakdown.streakScore,
        totalScore: daily.totalScore + earned,
        updatedAt: occurredAt,
      })
      .where(and(
        eq(dailyLearningPowerStats.userId, userId),
        eq(dailyLearningPowerStats.statDate, context.dateKey)
      ));

    await tx
      .update(weeklyLearningPower)
      .set({
        learningPower: weekly.learningPower + earned,
        validDictationCount: weekly.validDictationCount + (validDictation ? 1 : 0),
        activeStudyDays: weekly.activeStudyDays + (firstValidStudyToday ? 1 : 0),
        lastScoreAt: earned > 0 ? occurredAt : weekly.lastScoreAt,
        updatedAt: occurredAt,
      })
      .where(and(
        eq(weeklyLearningPower.userId, userId),
        eq(weeklyLearningPower.weekKey, context.weekKey)
      ));

    await tx
      .insert(learningActivities)
      .values({
        userId,
        activityType: "DICTATION_COMPLETED",
        unitId: input.unitId,
        unitName: input.unitName,
        countValue: wordIds.length,
        uniqueKey: `DICTATION_COMPLETED:${userId}:${input.sessionId}`,
        occurredAt,
      })
      .onConflictDoNothing({ target: learningActivities.uniqueKey });

    await tx
      .insert(learningActivities)
      .values({
        userId,
        activityType: "DAILY_STUDY",
        countValue: wordIds.length,
        uniqueKey: `DAILY_STUDY:${userId}:${context.dateKey}`,
        occurredAt,
      })
      .onConflictDoUpdate({
        target: learningActivities.uniqueKey,
        set: {
          countValue: sql`${learningActivities.countValue} + ${wordIds.length}`,
          occurredAt,
        },
      });

    return { duplicate: false, breakdown, validDictation };
  });

  const [weeklySnapshot, myRank, sessionBreakdown] = await Promise.all([
    currentLearningSnapshot(userId, context.weekKey),
    getRank(userId, context.weekKey),
    learningBreakdownForSession(userId, input.sessionId),
  ]);
  if (!result.duplicate && oldRank !== null && myRank !== null && myRank < oldRank) {
    await db
      .insert(learningActivities)
      .values({
        userId,
        activityType: "RANK_UP",
        rankValue: myRank,
        uniqueKey: `RANK_UP:${userId}:${context.weekKey}:${myRank}`,
        occurredAt,
      })
      .onConflictDoNothing({ target: learningActivities.uniqueKey });
  }

  return {
    duplicate: result.duplicate,
    validDictation: result.validDictation,
    earned: totalBreakdown(sessionBreakdown),
    breakdown: sessionBreakdown,
    weekKey: context.weekKey,
    weeklyLearningPower: weeklySnapshot?.learningPower ?? 0,
    myRank,
  };
}

export async function recordMistakeReviews(
  userId: string,
  input: { reviewSessionId: string; wordIds: string[]; reviewedAt?: Date }
) {
  const occurredAt = input.reviewedAt ?? new Date();
  const context = shanghaiWeekContext(occurredAt);
  const requestedWordIds = uniqueWordIds(input.wordIds);
  if (requestedWordIds.length === 0) {
    const weekly = await currentLearningSnapshot(userId, context.weekKey);
    return { earned: 0, weekKey: context.weekKey, weeklyLearningPower: weekly?.learningPower ?? 0 };
  }

  const earned = await db.transaction(async (tx) => {
    await tx
      .insert(dailyLearningPowerStats)
      .values(dailyStatDefaults(userId, context.dateKey))
      .onConflictDoNothing({ target: [dailyLearningPowerStats.userId, dailyLearningPowerStats.statDate] });
    const [daily] = await tx
      .select()
      .from(dailyLearningPowerStats)
      .where(and(
        eq(dailyLearningPowerStats.userId, userId),
        eq(dailyLearningPowerStats.statDate, context.dateKey)
      ))
      .for("update")
      .limit(1);
    if (!daily) throw new Error("Daily learning power row was not created");

    const weakRows = await tx
      .select({ wordId: userWeakWordHistory.wordId })
      .from(userWeakWordHistory)
      .where(and(
        eq(userWeakWordHistory.userId, userId),
        inArray(userWeakWordHistory.wordId, requestedWordIds)
      ));
    const eligibleIds = weakRows.map((row) => row.wordId);
    if (eligibleIds.length === 0) return 0;
    const awardedRows = await tx
      .select({ wordId: learningPowerEvents.wordId })
      .from(learningPowerEvents)
      .where(and(
        eq(learningPowerEvents.userId, userId),
        eq(learningPowerEvents.eventDate, context.dateKey),
        eq(learningPowerEvents.eventType, "MISTAKE_REVIEW"),
        inArray(learningPowerEvents.wordId, eligibleIds)
      ));
    const awardedIds = new Set(awardedRows.flatMap((row) => row.wordId ? [row.wordId] : []));
    const newEligibleIds = eligibleIds.filter((wordId) => !awardedIds.has(wordId));
    const remaining = availableScore(
      daily.mistakeReviewScore,
      LEARNING_POWER_LIMITS.mistakeReview,
      newEligibleIds.length
    );
    if (remaining <= 0) return 0;

    await tx
      .insert(weeklyLearningPower)
      .values({ userId, weekKey: context.weekKey, lastScoreAt: occurredAt })
      .onConflictDoNothing({ target: [weeklyLearningPower.userId, weeklyLearningPower.weekKey] });
    const [weekly] = await tx
      .select()
      .from(weeklyLearningPower)
      .where(and(
        eq(weeklyLearningPower.userId, userId),
        eq(weeklyLearningPower.weekKey, context.weekKey)
      ))
      .for("update")
      .limit(1);
    if (!weekly) throw new Error("Weekly learning power row was not created");

    const inserted = await tx
      .insert(learningPowerEvents)
      .values(newEligibleIds.slice(0, remaining).map((wordId) => ({
        userId,
        weekKey: context.weekKey,
        eventDate: context.dateKey,
        eventType: "MISTAKE_REVIEW",
        score: 1,
        wordId,
        dictationSessionId: input.reviewSessionId,
        uniqueKey: learningPowerUniqueKey({
          type: "MISTAKE_REVIEW",
          userId,
          dateKey: context.dateKey,
          weekKey: context.weekKey,
          wordId,
        }),
        createdAt: occurredAt,
      })))
      .onConflictDoNothing({ target: learningPowerEvents.uniqueKey })
      .returning({ id: learningPowerEvents.id });
    const score = inserted.length;
    if (score <= 0) return 0;

    await tx
      .update(dailyLearningPowerStats)
      .set({
        mistakeReviewScore: daily.mistakeReviewScore + score,
        totalScore: daily.totalScore + score,
        updatedAt: occurredAt,
      })
      .where(and(
        eq(dailyLearningPowerStats.userId, userId),
        eq(dailyLearningPowerStats.statDate, context.dateKey)
      ));
    await tx
      .update(weeklyLearningPower)
      .set({
        learningPower: weekly.learningPower + score,
        lastScoreAt: occurredAt,
        updatedAt: occurredAt,
      })
      .where(and(
        eq(weeklyLearningPower.userId, userId),
        eq(weeklyLearningPower.weekKey, context.weekKey)
      ));
    return score;
  });

  const weekly = await currentLearningSnapshot(userId, context.weekKey);
  return { earned, weekKey: context.weekKey, weeklyLearningPower: weekly?.learningPower ?? 0 };
}

export async function createShare(
  userId: string,
  input: {
    publisherId: string;
    bookId: string;
    unitId: string;
    unitName: string;
    shareType: ShareType;
  }
) {
  const token = randomBytes(24).toString("base64url");
  const [share] = await db
    .insert(shareInvites)
    .values({ token, inviterUserId: userId, ...input })
    .returning({ token: shareInvites.token });
  return {
    shareToken: share!.token,
    path: `/pages/share-entry/index?token=${encodeURIComponent(share!.token)}`,
  };
}

export async function acceptShare(currentUserId: string, token: string) {
  const [share] = await db.select().from(shareInvites).where(eq(shareInvites.token, token)).limit(1);
  if (!share) return null;

  let classmateCreated = false;
  const isSelfShare = share.inviterUserId === currentUserId;
  if (!isSelfShare) {
    const [userAId, userBId] = normalizedClassmatePair(share.inviterUserId, currentUserId);
    const [relation] = await db
      .insert(classmateRelations)
      .values({
        userAId,
        userBId,
        source: share.shareType,
        sourceShareId: share.id,
        status: "ACTIVE",
      })
      .onConflictDoUpdate({
        target: [classmateRelations.userAId, classmateRelations.userBId],
        set: { status: "ACTIVE", updatedAt: new Date() },
      })
      .returning({ createdAt: classmateRelations.createdAt, updatedAt: classmateRelations.updatedAt });
    classmateCreated = Boolean(relation && relation.createdAt.getTime() === relation.updatedAt.getTime());
  }

  return {
    publisherId: share.publisherId,
    bookId: share.bookId,
    volumeId: share.bookId,
    unitId: share.unitId,
    unitName: share.unitName,
    shareType: share.shareType,
    isSelfShare,
    classmateCreated,
  };
}

async function activeClassmateIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ userAId: classmateRelations.userAId, userBId: classmateRelations.userBId })
    .from(classmateRelations)
    .where(and(
      eq(classmateRelations.status, "ACTIVE"),
      or(eq(classmateRelations.userAId, userId), eq(classmateRelations.userBId, userId))
    ));
  return rows.map((row) => row.userAId === userId ? row.userBId : row.userAId);
}

export async function getClassmateFeed(userId: string, limit = 30) {
  const classmateIds = await activeClassmateIds(userId);
  const visibleUserIds = [userId, ...classmateIds];
  const items = await db
    .select({
      id: learningActivities.id,
      userId: learningActivities.userId,
      nickname: users.nickname,
      avatarUrl: users.avatarUrl,
      activityType: learningActivities.activityType,
      unitId: learningActivities.unitId,
      unitName: learningActivities.unitName,
      countValue: learningActivities.countValue,
      rankValue: learningActivities.rankValue,
      occurredAt: learningActivities.occurredAt,
    })
    .from(learningActivities)
    .innerJoin(users, eq(users.id, learningActivities.userId))
    .where(inArray(learningActivities.userId, visibleUserIds))
    .orderBy(desc(learningActivities.occurredAt))
    .limit(Math.min(Math.max(1, limit), 50));

  const feedIds = items.map((item) => item.id);
  const cheerRows = feedIds.length > 0
    ? await db
        .select({ feedId: feedCheers.feedId, total: count() })
        .from(feedCheers)
        .where(inArray(feedCheers.feedId, feedIds))
        .groupBy(feedCheers.feedId)
    : [];
  const myCheers = feedIds.length > 0
    ? await db
        .select({ feedId: feedCheers.feedId })
        .from(feedCheers)
        .where(and(eq(feedCheers.userId, userId), inArray(feedCheers.feedId, feedIds)))
    : [];
  const totalByFeed = new Map(cheerRows.map((row) => [row.feedId, Number(row.total)]));
  const cheeredIds = new Set(myCheers.map((row) => row.feedId));

  return {
    classmateCount: classmateIds.length,
    items: items.map((item) => ({
      ...item,
      nickname: item.nickname ?? "同学",
      avatarUrl: item.avatarUrl ?? "",
      cheerCount: totalByFeed.get(item.id) ?? 0,
      cheeredByMe: cheeredIds.has(item.id),
    })),
  };
}

export async function toggleFeedCheer(userId: string, feedId: string) {
  const [feed] = await db
    .select({ ownerId: learningActivities.userId })
    .from(learningActivities)
    .where(eq(learningActivities.id, feedId))
    .limit(1);
  if (!feed) return null;
  const visibleUserIds = new Set([userId, ...await activeClassmateIds(userId)]);
  if (!visibleUserIds.has(feed.ownerId)) return null;

  const [existing] = await db
    .select({ feedId: feedCheers.feedId })
    .from(feedCheers)
    .where(and(eq(feedCheers.feedId, feedId), eq(feedCheers.userId, userId)))
    .limit(1);

  if (existing) {
    await db.delete(feedCheers).where(and(eq(feedCheers.feedId, feedId), eq(feedCheers.userId, userId)));
  } else {
    await db.insert(feedCheers).values({ feedId, userId }).onConflictDoNothing();
  }

  const [total] = await db.select({ count: count() }).from(feedCheers).where(eq(feedCheers.feedId, feedId));
  return { cheered: !existing, cheerCount: Number(total?.count ?? 0) };
}

async function leaderboardConfig(): Promise<LeaderboardConfig> {
  const [row] = await db.select({ value: appConfig.value }).from(appConfig).where(eq(appConfig.key, "leaderboard_config")).limit(1);
  if (!row) return DEFAULT_LEADERBOARD_CONFIG;
  try {
    const parsed = JSON.parse(row.value) as Partial<LeaderboardConfig>;
    return {
      ...DEFAULT_LEADERBOARD_CONFIG,
      ...parsed,
      displayLimit: Math.min(Math.max(1, Number(parsed.displayLimit) || 10), 100),
      maxLimit: Math.min(Math.max(1, Number(parsed.maxLimit) || 100), 100),
      topSpecialCount: 3,
      timezone: "Asia/Shanghai",
      weekStartDay: "MONDAY",
    };
  } catch {
    return DEFAULT_LEADERBOARD_CONFIG;
  }
}

export async function getLeaderboard(userId: string, requestedLimit?: number) {
  const context = shanghaiWeekContext();
  const config = await leaderboardConfig();
  const limit = Math.min(requestedLimit ?? config.displayLimit, config.maxLimit);
  const rows = await orderedWeeklyRows(db, context.weekKey);
  const serialized = rows.map((row, index) => ({
    rank: index + 1,
    userId: row.userId,
    nickname: row.nickname ?? "同学",
    avatarUrl: row.avatarUrl ?? "",
    learningPower: row.learningPower,
    isMe: row.userId === userId,
  }));
  const myIndex = serialized.findIndex((row) => row.isMe);
  const me = myIndex >= 0 ? serialized[myIndex]! : null;
  const previous = myIndex > 0 ? serialized[myIndex - 1]! : null;

  return {
    weekKey: context.weekKey,
    weekStart: context.weekStart,
    weekEnd: context.weekEnd,
    displayLimit: limit,
    topSpecialCount: config.topSpecialCount,
    myLearningPower: me?.learningPower ?? 0,
    myRank: me?.rank ?? null,
    pointsToOvertakePrevious: pointsToOvertake(previous?.learningPower ?? null, me?.learningPower ?? 0),
    ranking: serialized.slice(0, limit),
    myEntry: me && me.rank > limit ? me : null,
  };
}

export async function getClassmates(userId: string) {
  const ids = await activeClassmateIds(userId);
  if (ids.length === 0) return [];
  const rows = await db
    .select({ id: users.id, nickname: users.nickname, avatarUrl: users.avatarUrl })
    .from(users)
    .where(inArray(users.id, ids));
  return rows.map((row) => ({ id: row.id, nickname: row.nickname ?? "同学", avatarUrl: row.avatarUrl ?? "" }));
}

export async function removeClassmate(userId: string, classmateUserId: string): Promise<boolean> {
  if (userId === classmateUserId) return false;
  const [userAId, userBId] = normalizedClassmatePair(userId, classmateUserId);
  const rows = await db
    .update(classmateRelations)
    .set({ status: "REMOVED", updatedAt: new Date() })
    .where(and(
      eq(classmateRelations.userAId, userAId),
      eq(classmateRelations.userBId, userBId),
      eq(classmateRelations.status, "ACTIVE")
    ))
    .returning({ id: classmateRelations.id });
  return rows.length > 0;
}

export async function ensureSocialConfigDefaults() {
  await db
    .insert(appConfig)
    .values({ key: "leaderboard_config", value: JSON.stringify(DEFAULT_LEADERBOARD_CONFIG) })
    .onConflictDoNothing({ target: appConfig.key });
}
