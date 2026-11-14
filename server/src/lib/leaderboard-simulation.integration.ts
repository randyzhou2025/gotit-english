import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { appConfig, users, userProgress, userDailyStats, userWordMastery, weeklyLearningPower } from "../db/schema.js";
import { getMetricLeaderboard } from "../services/leaderboard.js";
import { getLeaderboard, recordDictationCompletion } from "../services/social.js";
import { shanghaiWeekContext } from "./learning-power.js";
import { simulatedLeaderboardParticipants } from "./leaderboard-simulation.js";

const connection = new URL(process.env.DATABASE_URL!);
assert.ok(["127.0.0.1", "localhost"].includes(connection.hostname)
  && connection.port === "55436" && connection.pathname === "/gotit_leaderboard",
"Run only against the isolated leaderboard simulation database on port 55436");

const metrics = ["power", "time", "words"] as const;
const periods = ["week", "total"] as const;
const now = new Date("2026-11-14T12:00:00+08:00");
const week = shanghaiWeekContext(now);
const ids = Array.from({ length: 35 }, () => randomUUID());
const [original] = await db.select().from(appConfig).where(eq(appConfig.key, "leaderboard_config"));
let fixturesCreated = false;

async function setLimit(displayLimit: number) {
  const value = JSON.stringify({ displayLimit });
  await db.insert(appConfig).values({ key: "leaderboard_config", value })
    .onConflictDoUpdate({ target: appConfig.key, set: { value } });
}

let exitCode = 0;
try {
  const [before] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  assert.equal(before!.count, 0, "Use an empty isolated database");
  await setLimit(20);

  const empty = await getMetricLeaderboard(ids[0]!, "power", "week", now);
  assert.equal(empty.ranking.length, 20);
  assert.equal(empty.myRank, null);
  assert.equal(empty.myValue, 0);
  assert.ok(empty.ranking.every(row => row.isSimulated && row.value > 0));
  const [afterEmpty] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  assert.equal(afterEmpty!.count, 0);

  await db.insert(users).values(ids.map((id, index) => ({ id, openid: `simulation-test-${id}`, nickname: `真实${index}` })));
  fixturesCreated = true;
  await db.insert(userDailyStats).values(ids.map((userId, index) => ({
    userId, statDate: week.dateKey, studySeconds: (100 - index) * 60,
  })));
  await db.insert(weeklyLearningPower).values(ids.map((userId, index) => ({
    userId, weekKey: week.weekKey, learningPower: 100 - index, lastScoreAt: now,
  })));
  await db.insert(userProgress).values(ids.map((userId, index) => ({
    userId, masteredWordIds: Array.from({ length: 100 - index }, (_, word) => `word-${word}`),
  })));
  await db.insert(userWordMastery).values(ids.flatMap((userId, index) =>
    Array.from({ length: 100 - index }, (_, word) => ({ userId, wordId: `word-${word}`, firstMasteredAt: now }))));

  for (const metric of metrics) {
    const simulatedCount = simulatedLeaderboardParticipants(metric, now).length;
    for (const period of periods) {
      const board = await getMetricLeaderboard(ids[34]!, metric, period, now);
      assert.deepEqual(board.ranking.map(row => row.userId), ids.slice(0, 20));
      assert.ok(board.ranking.every(row => !row.isSimulated));
      assert.equal(board.myRank, 35 + simulatedCount);
      assert.equal(board.myValue, metric === "time" ? 66 * 60 : 66);
      assert.equal(board.myEntry?.userId, ids[34]);
      assert.equal(board.gapToPrevious, metric === "time" ? 60 : 1);
      assert.equal(board.participantCount, 35 + simulatedCount);
      assert.equal(board.simulatedParticipantCount, simulatedCount);
      assert.deepEqual(await getMetricLeaderboard(ids[34]!, metric, period, now), board);
    }
  }

  // 扩大可见范围来验证模拟分数确实位于真实第 20 名与真实末 5 名之间。
  await setLimit(100);
  for (const metric of metrics) {
    for (const period of periods) {
      const board = await getMetricLeaderboard(ids[0]!, metric, period, now);
      const scale = metric === "time" ? 60 : 1;
      const simulated = board.ranking.filter(row => row.isSimulated);
      assert.ok(simulated.length > 0);
      assert.ok(simulated.every(row => row.value <= 81 * scale && row.value > 70 * scale));
      assert.deepEqual(board.ranking.slice(0, 20).map(row => row.userId), ids.slice(0, 20));
      assert.equal(new Set(board.ranking.map(row => row.userId)).size, board.ranking.length);
    }
  }
  const concurrent = await Promise.all(Array.from({ length: 3 }, () => getMetricLeaderboard(ids[34]!, "power", "week", now)));
  assert.deepEqual(concurrent[0], concurrent[1]);
  assert.deepEqual(concurrent[1], concurrent[2]);
  const legacy = await getLeaderboard(ids[34]!, now);
  assert.equal(legacy.myRank, concurrent[0]!.myRank);
  assert.equal(legacy.myLearningPower, concurrent[0]!.myValue);
  assert.deepEqual(legacy.ranking.map(row => row.userId), concurrent[0]!.ranking.map(row => row.userId));
  const completion = await recordDictationCompletion(ids[34]!, {
    sessionId: "simulation-rank-consistency", unitId: "test:unit1", unitName: "Unit 1",
    unitWordCount: 10, completed: true, wordResults: [{ wordId: "one", correct: true }], completedAt: now,
  });
  assert.equal(completion.myRank, (await getMetricLeaderboard(ids[34]!, "power", "week", now)).myRank);

  // 只有 21 人时，末五名包含受保护用户，优先保住前二十名。
  await db.delete(users).where(inArray(users.id, ids.slice(21)));
  await setLimit(20);
  for (const metric of metrics) {
    for (const period of periods) {
      const board = await getMetricLeaderboard(ids[20]!, metric, period, now);
      assert.deepEqual(board.ranking.map(row => row.userId), ids.slice(0, 20));
      assert.equal(board.myRank, 21 + board.simulatedParticipantCount);
    }
  }

  // 保护线下降、全部同分和恰好 20 人时，也绝不挤掉真实用户。
  await db.delete(users).where(inArray(users.id, ids.slice(20)));
  await db.update(weeklyLearningPower).set({ learningPower: 1 }).where(inArray(weeklyLearningPower.userId, ids.slice(0, 20)));
  await db.update(userDailyStats).set({ studySeconds: 1 }).where(inArray(userDailyStats.userId, ids.slice(0, 20)));
  await db.update(userProgress).set({ masteredWordIds: ["only"] }).where(inArray(userProgress.userId, ids.slice(0, 20)));
  await db.delete(userWordMastery).where(inArray(userWordMastery.userId, ids.slice(0, 20)));
  await db.insert(userWordMastery).values(ids.slice(0, 20).map(userId => ({ userId, wordId: "only", firstMasteredAt: now })));
  await setLimit(20);
  for (const metric of metrics) {
    for (const period of periods) {
      const board = await getMetricLeaderboard(ids[0]!, metric, period, now);
      assert.ok(board.ranking.every(row => !row.isSimulated && row.value === 1));
      assert.deepEqual(new Set(board.ranking.map(row => row.userId)), new Set(ids.slice(0, 20)));
      assert.equal(board.participantCount, 20 + board.simulatedParticipantCount);
    }
  }

  await db.delete(users).where(eq(users.id, ids[19]!));
  const sparse = await getMetricLeaderboard(ids[0]!, "power", "week", now);
  assert.ok(sparse.ranking.slice(0, 19).every(row => !row.isSimulated));
  assert.ok(sparse.ranking[19]!.isSimulated);
  const [afterQueries] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  assert.equal(afterQueries!.count, 19, "Leaderboard reads must never create real accounts");
  console.log("Leaderboard simulation integration passed: six boards, Top 20 protection, tail-five band, exact 20, ties, falling cap, sparse/empty boards, own rank, counts, determinism, concurrency and account isolation");
} catch (error) {
  console.error(error);
  exitCode = 1;
} finally {
  if (fixturesCreated) await db.delete(users).where(inArray(users.id, ids));
  if (original) await db.insert(appConfig).values(original).onConflictDoUpdate({ target: appConfig.key, set: { value: original.value } });
  else await db.delete(appConfig).where(eq(appConfig.key, "leaderboard_config"));
}
process.exit(exitCode);
