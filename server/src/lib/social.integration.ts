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
  recordMistakeReviews,
  toggleFeedCheer,
} from "../services/social.js";
import { shanghaiWeekContext } from "./learning-power.js";

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
  ]);
  const [duplicateUser, wordCapUser, validCapUser, reviewCapUser] = userIds as [string, string, string, string];
  const context = shanghaiWeekContext();

  try {
    const duplicatePayload = {
      sessionId: `duplicate-${suffix}`,
      unitId: "rj:required-1:u1",
      unitName: "Unit 1",
      unitWordCount: 20,
      completed: true,
      wordResults: wordResults(`duplicate-${suffix}`, 10),
    } as const;
    const duplicateResults = await Promise.all(
      Array.from({ length: 10 }, () => recordDictationCompletion(duplicateUser, duplicatePayload))
    );
    assert.equal(duplicateResults.filter((result) => !result.duplicate).length, 1);
    const [duplicateWeekly] = await db
      .select()
      .from(weeklyLearningPower)
      .where(and(eq(weeklyLearningPower.userId, duplicateUser), eq(weeklyLearningPower.weekKey, context.weekKey)));
    assert.equal(duplicateWeekly?.learningPower, 25);
    assert.equal(duplicateWeekly?.validDictationCount, 1);

    await recordDictationCompletion(wordCapUser, {
      sessionId: `word-cap-${suffix}`,
      unitId: "rj:required-1:u1",
      unitName: "Unit 1",
      unitWordCount: 100,
      completed: true,
      wordResults: wordResults(`word-cap-${suffix}`, 100),
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
    const secondReview = await recordMistakeReviews(reviewCapUser, {
      reviewSessionId: `review-repeat-${suffix}`,
      wordIds: reviewWordIds.slice(0, 30),
    });
    const cappedReview = await recordMistakeReviews(reviewCapUser, {
      reviewSessionId: `review-capped-${suffix}`,
      wordIds: reviewWordIds,
    });
    assert.equal(firstReview.earned, 10);
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

    console.log("social integration: duplicate, caps, weak-word proof, relation, and cheer permission passed");
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
