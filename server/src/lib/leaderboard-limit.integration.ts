import assert from "node:assert/strict";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { appConfig, users, userProgress, userDailyStats, userWordMastery, weeklyLearningPower } from "../db/schema.js";
import { getMetricLeaderboard } from "../services/leaderboard.js";
import { getLeaderboard } from "../services/social.js";
import { shanghaiWeekContext } from "./learning-power.js";

const connection = new URL(process.env.DATABASE_URL!);
assert.ok(["127.0.0.1", "localhost"].includes(connection.hostname) && connection.pathname === "/gotit_leaderboard",
  "Run only against the isolated local gotit_leaderboard database");
const now = new Date();
const week = shanghaiWeekContext(now);
const ids: string[] = [];
const [original] = await db.select().from(appConfig).where(eq(appConfig.key, "leaderboard_config"));

async function setLimit(displayLimit: number) {
  await db.insert(appConfig).values({ key: "leaderboard_config", value: JSON.stringify({ displayLimit }) })
    .onConflictDoUpdate({ target: appConfig.key, set: { value: JSON.stringify({ displayLimit }) } });
}

let exitCode = 0;
try {
  await db.delete(appConfig).where(eq(appConfig.key, "leaderboard_config"));
  const seed = await db.insert(users).values(Array.from({ length: 105 }, (_, i) => ({
    openid: `limit-test-${Date.now()}-${i}`, nickname: `人数测试${i}`
  }))).returning();
  ids.push(...seed.map(user => user.id));
  for (const [i, userId] of ids.entries()) {
    const value = i + 1;
    const words = Array.from({ length: value }, (_, index) => `limit-word-${index}`);
    await db.insert(userDailyStats).values({ userId, statDate: week.dateKey, studySeconds: value });
    await db.insert(weeklyLearningPower).values({ userId, weekKey: week.weekKey, learningPower: value });
    await db.insert(userProgress).values({ userId, masteredWordIds: words });
    await db.insert(userWordMastery).values(words.map(wordId => ({ userId, wordId, firstMasteredAt: now })));
  }
  const me = ids[0]!;
  assert.equal((await getMetricLeaderboard(me, "time", "week", now)).displayLimit, 10);
  for (const limit of [10, 20, 50, 100]) {
    await setLimit(limit);
    for (const metric of ["time", "words", "power"] as const) {
      for (const period of ["week", "total"] as const) {
        const board = await getMetricLeaderboard(me, metric, period, now);
        assert.equal(board.displayLimit, limit);
        assert.equal(board.ranking.length, limit);
        assert.deepEqual(board.ranking.map(row => row.rank), Array.from({ length: limit }, (_, i) => i + 1));
        assert.ok(board.myRank! > 100);
        assert.equal(board.myValue, 1);
        assert.equal(board.myEntry?.userId, me);
        assert.ok(board.ranking.every(row => row.userId !== me));
      }
    }
    const legacy = await getLeaderboard(me);
    assert.equal(legacy.displayLimit, limit);
    assert.equal(legacy.ranking.length, limit);
    assert.equal(legacy.myEntry?.userId, me);
  }
  await setLimit(25);
  assert.equal((await getMetricLeaderboard(me, "time", "week", now)).displayLimit, 10);
  console.log("Leaderboard limits passed: missing/invalid config defaults, 4 limits × 6 boards, legacy endpoint, own rank outside Top 100");
} catch (error) {
  console.error(error);
  exitCode = 1;
} finally {
  if (original) await db.insert(appConfig).values(original).onConflictDoUpdate({ target: appConfig.key, set: { value: original.value } });
  else await db.delete(appConfig).where(eq(appConfig.key, "leaderboard_config"));
  if (ids.length) await db.delete(users).where(inArray(users.id, ids));
}
process.exit(exitCode);
