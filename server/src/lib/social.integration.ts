import assert from "node:assert/strict";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  classmateRelations,
  dailyLearningPowerStats,
  learningActivities,
  userWeakWordHistory,
  users,
  weeklyLearningPower,
  weeklyWordLearning,
} from "../db/schema.js";
import {
  acceptShare,
  createShare,
  recordDictationCompletion,
  recordDictationWordCompletion,
  recordAppOpen,
  recordMistakeReviews,
  toggleFeedCheer,
} from "../services/social.js";
import { getDashboard } from "../services/study.js";
import { previousShanghaiDate, shanghaiWeekContext } from "./learning-power.js";

function wordResults(prefix: string, countValue: number) {
  return Array.from({ length: countValue }, (_, index) => ({
    wordId: `${prefix}-word-${index}`,
    correct: true,
  }));
}

async function createTestUser(suffix: string) {
  const [user] = await db
    .insert(users)
    .values({ openid: `social-integration-${suffix}`, nickname: `测试${suffix.slice(-2)}` })
    .returning({ id: users.id });
  return user!.id;
}

async function main() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const userIds = await Promise.all([
    createTestUser(`${suffix}-a`),
    createTestUser(`${suffix}-b`),
    createTestUser(`${suffix}-c`),
    createTestUser(`${suffix}-d`),
    createTestUser(`${suffix}-e`),
  ]);
  const [duplicateUser, wordCapUser, validCapUser, reviewCapUser, streakUser] = userIds as [string, string, string, string, string];
  const context = shanghaiWeekContext();

  try {
    const yesterday = new Date(`${previousShanghaiDate(context.dateKey)}T12:00:00+08:00`);
    const today = new Date(`${context.dateKey}T12:00:00+08:00`);
    const dayAfterTomorrow = new Date(today.getTime() + 2 * 86_400_000);
    const firstOpen = await recordAppOpen(streakUser, yesterday);
    const duplicateOpen = await recordAppOpen(streakUser, new Date(yesterday.getTime() + 3_600_000));
    const consecutiveOpen = await recordAppOpen(streakUser, today);
    const brokenStreakOpen = await recordAppOpen(streakUser, dayAfterTomorrow);
    assert.equal(firstOpen.earned, 0);
    assert.equal(firstOpen.streakDays, 1);
    assert.equal(duplicateOpen.earned, 0);
    assert.equal(duplicateOpen.duplicate, true);
    assert.equal(consecutiveOpen.earned, 5);
    assert.equal(consecutiveOpen.streakDays, 2);
    assert.equal((await getDashboard(streakUser)).streakDays, 2);
    assert.equal(brokenStreakOpen.earned, 0);
    assert.equal(brokenStreakOpen.streakDays, 1);

    const duplicatePayload = {
      sessionId: `duplicate-${suffix}`,
      unitId: "rj:required-1:u1",
      unitName: "Unit 1",
      unitWordCount: 20,
      completed: true,
      wordResults: wordResults(`duplicate-${suffix}`, 10),
    } as const;
    const perWordResults = await Promise.all(duplicatePayload.wordResults.flatMap((result) => [
      recordDictationWordCompletion(duplicateUser, {
        sessionId: duplicatePayload.sessionId,
        unitId: duplicatePayload.unitId,
        wordId: result.wordId,
      }),
      recordDictationWordCompletion(duplicateUser, {
        sessionId: duplicatePayload.sessionId,
        unitId: duplicatePayload.unitId,
        wordId: result.wordId,
      }),
    ]));
    assert.equal(perWordResults.reduce((sum, result) => sum + result.earned, 0), 10);
    const [beforeReportWeekly] = await db
      .select()
      .from(weeklyLearningPower)
      .where(and(eq(weeklyLearningPower.userId, duplicateUser), eq(weeklyLearningPower.weekKey, context.weekKey)));
    assert.equal(beforeReportWeekly?.learningPower, 10);

    const duplicateResults = await Promise.all(
      Array.from({ length: 10 }, () => recordDictationCompletion(duplicateUser, duplicatePayload))
    );
    assert.equal(duplicateResults.filter((result) => !result.duplicate).length, 1);
    assert.equal(duplicateResults[0]?.earned, 25);
    assert.equal(duplicateResults[0]?.breakdown.dictationWordScore, 10);
    const [duplicateWeekly] = await db
      .select()
      .from(weeklyLearningPower)
      .where(and(eq(weeklyLearningPower.userId, duplicateUser), eq(weeklyLearningPower.weekKey, context.weekKey)));
    assert.equal(duplicateWeekly?.learningPower, 25);
    assert.equal(duplicateWeekly?.validDictationCount, 1);

    const wordCapSessionId = `word-cap-${suffix}`;
    const wordCapResults = wordResults(`word-cap-${suffix}`, 100);
    for (const result of wordCapResults) {
      await recordDictationWordCompletion(wordCapUser, {
        sessionId: wordCapSessionId,
        unitId: "rj:required-1:u1",
        wordId: result.wordId,
      });
    }
    await recordDictationCompletion(wordCapUser, {
      sessionId: wordCapSessionId,
      unitId: "rj:required-1:u1",
      unitName: "Unit 1",
      unitWordCount: 100,
      completed: true,
      wordResults: wordCapResults,
    });
    const [[wordCapDaily], [weeklyWords]] = await Promise.all([
      db.select().from(dailyLearningPowerStats).where(and(
        eq(dailyLearningPowerStats.userId, wordCapUser),
        eq(dailyLearningPowerStats.statDate, context.dateKey)
      )),
      db.select({ total: count() }).from(weeklyWordLearning).where(and(
        eq(weeklyWordLearning.userId, wordCapUser),
        eq(weeklyWordLearning.weekKey, context.weekKey)
      )),
    ]);
    assert.equal(wordCapDaily?.dictationWordScore, 20);
    assert.equal(Number(weeklyWords?.total), 100);

    await Promise.all(Array.from({ length: 10 }, (_, index) => recordDictationCompletion(validCapUser, {
      sessionId: `valid-cap-${suffix}-${index}`,
      unitId: "rj:required-1:u1",
      unitName: "Unit 1",
      unitWordCount: 20,
      completed: true,
      wordResults: wordResults(`valid-shared-${suffix}`, 10),
    })));
    const [validCapDaily] = await db.select().from(dailyLearningPowerStats).where(and(
      eq(dailyLearningPowerStats.userId, validCapUser),
      eq(dailyLearningPowerStats.statDate, context.dateKey)
    ));
    assert.equal(validCapDaily?.validDictationScore, 20);
    assert.equal(validCapDaily?.dailyBonusScore, 10);

    const reviewWordIds = wordResults(`review-cap-${suffix}`, 40).map((item) => item.wordId);
    await db.insert(userWeakWordHistory).values(reviewWordIds.map((wordId) => ({
      userId: reviewCapUser,
      wordId,
    })));
    const firstReview = await recordMistakeReviews(reviewCapUser, {
      reviewSessionId: `review-${suffix}`,
      wordIds: reviewWordIds.slice(0, 10),
    });
    const reviewDictation = await recordDictationCompletion(reviewCapUser, {
      sessionId: `review-${suffix}`,
      unitId: "rj:required-1:u1",
      unitName: "Unit 1",
      unitWordCount: 20,
      completed: true,
      wordResults: reviewWordIds.slice(0, 10).map((wordId) => ({ wordId, correct: true })),
    });
    const secondReview = await recordMistakeReviews(reviewCapUser, {
      reviewSessionId: `review-repeat-${suffix}`,
      wordIds: reviewWordIds.slice(0, 30),
    });
    const cappedReview = await recordMistakeReviews(reviewCapUser, {
      reviewSessionId: `review-capped-${suffix}`,
      wordIds: reviewWordIds,
    });
    assert.equal(firstReview.earned, 10);
    assert.equal(reviewDictation.breakdown.mistakeReviewScore, 10);
    assert.equal(reviewDictation.earned, 35);
    assert.equal(secondReview.earned, 10);
    assert.equal(cappedReview.earned, 0);

    const share = await createShare(duplicateUser, {
      publisherId: "rj",
      bookId: "required-1",
      unitId: "rj:required-1:u1",
      unitName: "Unit 1",
      shareType: "CLASSMATE_INVITE",
    });
    await Promise.all([
      acceptShare(wordCapUser, share.shareToken),
      acceptShare(wordCapUser, share.shareToken),
      acceptShare(wordCapUser, share.shareToken),
    ]);
    await acceptShare(duplicateUser, share.shareToken);
    const [relationCount] = await db
      .select({ total: count() })
      .from(classmateRelations)
      .where(orPair(duplicateUser, wordCapUser));
    assert.equal(Number(relationCount?.total), 1);

    const [feed] = await db
      .select({ id: learningActivities.id })
      .from(learningActivities)
      .where(eq(learningActivities.userId, duplicateUser))
      .limit(1);
    assert.ok(feed);
    assert.equal(await toggleFeedCheer(validCapUser, feed.id), null);
    assert.deepEqual(await toggleFeedCheer(wordCapUser, feed.id), { cheered: true, cheerCount: 1 });
    assert.deepEqual(await toggleFeedCheer(wordCapUser, feed.id), { cheered: false, cheerCount: 0 });

    console.log("social integration: app-open streak, per-word scoring, report settlement, caps, weak words, relation, and cheer permission passed");
  } finally {
    await db.delete(users).where(inArray(users.id, userIds));
  }
}

function orPair(userId1: string, userId2: string) {
  const [userAId, userBId] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
  return and(eq(classmateRelations.userAId, userAId), eq(classmateRelations.userBId, userBId));
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
