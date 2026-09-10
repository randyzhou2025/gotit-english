import assert from "node:assert/strict";
import fs from "node:fs/promises";
import postgres from "postgres";
import Fastify from "fastify";
import jwt from "@fastify/jwt";
import sensible from "@fastify/sensible";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, userProgress, userDailyStats, userWordMastery, weeklyLearningPower } from "../db/schema.js";
import { getMetricLeaderboard } from "../services/leaderboard.js";
import { getProgress, saveProgress } from "../services/user.js";
import { registerSocialRoutes } from "../routes/social.js";
import { registerUserRoutes } from "../routes/user.js";
import { shanghaiWeekContext } from "./learning-power.js";
import { emptyProgress, shanghaiDateString } from "./utils.js";

const connection = new URL(process.env.DATABASE_URL!);
assert.ok(["127.0.0.1", "localhost"].includes(connection.hostname) && connection.pathname === "/gotit_leaderboard",
  "Run only against the isolated local gotit_leaderboard database");
const client = postgres(process.env.DATABASE_URL!, { max: 1 });
const ids: string[] = [];
const now = new Date();
const week = shanghaiWeekContext(now);
const previousWeek = shanghaiWeekContext(new Date(Date.parse(week.weekStart) - 1));
const app = Fastify();

async function main() {
  for (let i = 0; i < 12; i++) {
    const [user] = await db.insert(users).values({ openid: `leaderboard-test-${Date.now()}-${i}`, nickname: `测试${i}` }).returning();
    ids.push(user!.id);
  }
  const me = ids[10]!;
  const oldUser = ids[11]!;
  await db.insert(userProgress).values({ userId: oldUser, masteredWordIds: ["legacy", "legacy"] });
  const migration = await fs.readFile(new URL("../../drizzle/0003_leaderboard_mastery.sql", import.meta.url), "utf8");
  await client.unsafe(migration);
  await client.unsafe(migration);
  const baseline = await db.select().from(userWordMastery).where(eq(userWordMastery.userId, oldUser));
  assert.equal(baseline.length, 1);
  assert.equal(baseline[0]!.firstMasteredAt, null);

  for (const [i, id] of ids.slice(0, 11).entries()) {
    await db.insert(userDailyStats).values([
      { userId: id, statDate: week.dateKey, studySeconds: 1200 - i },
      { userId: id, statDate: previousWeek.dateKey, studySeconds: 600 },
    ]);
    await db.insert(weeklyLearningPower).values([
      { userId: id, weekKey: week.weekKey, learningPower: 100 - i },
      { userId: id, weekKey: previousWeek.weekKey, learningPower: 20 },
    ]);
    await db.insert(userProgress).values({ userId: id, masteredWordIds: ["a", "a", "b", ""] });
    await db.insert(userWordMastery).values([
      { userId: id, wordId: "before", firstMasteredAt: new Date(Date.parse(week.weekStart) - 1) },
      { userId: id, wordId: "start", firstMasteredAt: new Date(week.weekStart) },
      { userId: id, wordId: "end", firstMasteredAt: new Date(week.weekEnd) },
      { userId: id, wordId: "after", firstMasteredAt: new Date(Date.parse(week.weekEnd) + 1) },
      { userId: id, wordId: "unknown", firstMasteredAt: null },
    ]);
  }
  for (const metric of ["time", "words", "power"] as const) {
    for (const period of ["week", "total"] as const) {
      const board = await getMetricLeaderboard(me, metric, period, now);
      assert.equal(board.ranking.length, 10);
      assert.equal(board.metric, metric);
      assert.equal(board.period, period);
      assert.equal(board.myValue, metric === "time" ? (period === "week" ? 1190 : 1790)
        : metric === "power" ? (period === "week" ? 90 : 110) : 2);
      if (metric !== "words") {
        assert.equal(board.myRank, 11);
        assert.equal(board.myEntry?.userId, me);
        assert.equal(board.gapToPrevious, 1);
      }
    }
  }
  // A current total with legacy mastery does not fabricate any weekly mastery.
  const unranked = await getMetricLeaderboard(oldUser, "words", "week", now);
  assert.equal(unranked.myRank, null);
  assert.equal(unranked.myValue, 0);
  const oldProgress = await getProgress(oldUser);
  const sunday = new Date(Date.parse(week.weekStart) - 1).toISOString();
  const eventAt = new Date(week.weekStart).toISOString();
  await Promise.all(Array.from({ length: 3 }, () => saveProgress(oldUser, {
    ...oldProgress, masteredWordIds: ["legacy", "new", "offline"],
  }, [
    { wordId: "legacy", masteredAt: eventAt },
    { wordId: "new", masteredAt: eventAt },
    { wordId: "new", masteredAt: eventAt },
    { wordId: "offline", masteredAt: sunday },
  ])));
  assert.equal((await getMetricLeaderboard(oldUser, "words", "week", now)).myValue, 1);
  assert.equal((await getMetricLeaderboard(oldUser, "words", "total", now)).myValue, 3);
  await saveProgress(oldUser, { ...await getProgress(oldUser), masteredWordIds: [], savedWeakWordIds: ["new"] });
  assert.equal((await getMetricLeaderboard(oldUser, "words", "total", now)).myValue, 2);
  await saveProgress(oldUser, { ...await getProgress(oldUser), masteredWordIds: ["new"], savedWeakWordIds: [] }, [{ wordId: "new", masteredAt: now.toISOString() }]);
  assert.equal((await getMetricLeaderboard(oldUser, "words", "week", now)).myValue, 1);
  await saveProgress(oldUser, { ...await getProgress(oldUser), masteredWordIds: ["late-import"] });
  assert.equal((await getMetricLeaderboard(oldUser, "words", "week", now)).myValue, 1);
  // Retrying the SQL does not overwrite already timestamped records.
  await client.unsafe(migration);
  assert.equal((await getMetricLeaderboard(oldUser, "words", "week", now)).myValue, 1);

  await app.register(sensible);
  await app.register(jwt, { secret: "leaderboard-local-integration-only" });
  const authenticate = async (request: any, reply: any) => {
    try { await request.jwtVerify(); } catch { return reply.code(401).send({ error: "Unauthorized" }); }
  };
  await registerSocialRoutes(app, authenticate);
  await registerUserRoutes(app, authenticate);
  const headers = { authorization: `Bearer ${app.jwt.sign({ sub: oldUser })}` };
  assert.equal((await app.inject({ url: "/api/classmates/leaderboard?metric=words&period=week" })).statusCode, 401);
  assert.equal((await app.inject({ url: "/api/classmates/leaderboard?metric=wrong", headers })).statusCode, 400);
  assert.equal((await app.inject({ url: "/api/classmates/leaderboard?period=month", headers })).statusCode, 400);
  assert.equal((await app.inject({ url: "/api/classmates/leaderboard?metric=time&period=total", headers })).json().metric, "time");
  assert.equal(typeof (await app.inject({ url: "/api/classmates/leaderboard", headers })).json().myLearningPower, "number");
  assert.equal((await app.inject({ method: "PUT", url: "/api/user/progress", headers,
    payload: { ...emptyProgress(), masteryEvents: [{ wordId: "bad", masteredAt: "invalid" }] } })).statusCode, 400);
  const saved = await app.inject({ method: "PUT", url: "/api/user/progress", headers,
    payload: { ...await getProgress(oldUser), masteryEvents: [{ wordId: "route", masteredAt: now.toISOString() }] } });
  assert.equal(saved.statusCode, 200);
  assert.equal(saved.json().masteryEventsSaved, true);
  assert.equal((await getMetricLeaderboard(oldUser, "words", "week", now)).myValue, 2);
  console.log(`leaderboard integration passed: six boards, second-level ordering, ${shanghaiDateString(now)} week boundaries, legacy baseline, offline times, retries, concurrency, remastery, migration rerun, auth and route validation`);
}

main().then(() => 0).catch(error => { console.error(error); return 1; }).then(async code => {
  if (ids.length) await db.delete(users).where(inArray(users.id, ids));
  await app.close();
  await client.end();
  process.exit(code);
});
