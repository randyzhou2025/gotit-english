import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { eq, inArray, sql } from "drizzle-orm";
import ts from "typescript";
import { db } from "../db/index.js";
import { appConfig, users, userDailyStats, userProgress, userWordMastery, weeklyLearningPower } from "../db/schema.js";
import { getMetricLeaderboard } from "../services/leaderboard.js";
import { shanghaiWeekContext } from "./learning-power.js";
import { simulatedLeaderboardParticipants } from "./leaderboard-simulation.js";

const connection = new URL(process.env.DATABASE_URL!);
assert.ok(["127.0.0.1", "localhost"].includes(connection.hostname)
  && connection.port === "55436" && connection.pathname === "/gotit_leaderboard",
"Run only against the empty isolated leaderboard database on port 55436");
assert.ok(process.env.LEADERBOARD_BASELINE_REF, "Set LEADERBOARD_BASELINE_REF to the pre-simulation Git commit");
const root = fileURLToPath(new URL("../../../", import.meta.url));
const baselineSource = execFileSync("git", ["show", `${process.env.LEADERBOARD_BASELINE_REF}:server/src/services/leaderboard.ts`], { cwd: root, encoding: "utf8" })
  .replace(/from "([^"]+)"/g, (_match, specifier: string) => `from "${specifier.startsWith(".")
    ? new URL(specifier.replace(/\.js$/, ".ts"), new URL("../services/leaderboard.ts", import.meta.url)).href
    : import.meta.resolve(specifier)}"`);
const baselineCode = ts.transpileModule(baselineSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const baseline = (await import(`data:text/javascript;base64,${Buffer.from(baselineCode).toString("base64")}`)).getMetricLeaderboard as typeof getMetricLeaderboard;
const now = new Date("2026-11-15T12:00:00+08:00");
const week = shanghaiWeekContext(now);
const metrics = ["power", "time", "words"] as const;
const periods = ["week", "total"] as const;
const sampleCount = 200;
const [original] = await db.select().from(appConfig).where(eq(appConfig.key, "leaderboard_config"));
const results: Array<Record<string, number | string>> = [];
let ids: string[] = [];

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return Number(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)]!.toFixed(3));
}

async function timed(call: () => Promise<unknown>) {
  const start = performance.now();
  await call();
  return performance.now() - start;
}

let exitCode = 0;
try {
  const [before] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  assert.equal(before!.count, 0, "Use an empty isolated database");
  await db.insert(appConfig).values({ key: "leaderboard_config", value: '{"displayLimit":20}' })
    .onConflictDoUpdate({ target: appConfig.key, set: { value: '{"displayLimit":20}' } });
  console.log(JSON.stringify({ baselineRef: process.env.LEADERBOARD_BASELINE_REF, samplesPerBoard: sampleCount,
    simulated: Object.fromEntries(metrics.map(metric => [metric, simulatedLeaderboardParticipants(metric, now).length])) }));
  for (const population of [20, 1000, 10000]) {
    ids = Array.from({ length: population }, () => randomUUID());
    for (let offset = 0; offset < population; offset += 500) {
      const batch = ids.slice(offset, offset + 500);
      await db.insert(users).values(batch.map(id => ({ id, openid: `perf-${id}`, nickname: "性能测试" })));
      await db.insert(userDailyStats).values(batch.map((userId, index) => ({ userId, statDate: week.dateKey, studySeconds: population - offset - index })));
      await db.insert(weeklyLearningPower).values(batch.map((userId, index) => ({ userId, weekKey: week.weekKey, learningPower: population - offset - index, lastScoreAt: now })));
      await db.insert(userProgress).values(batch.map(userId => ({ userId, masteredWordIds: ["a", "b", "c", "d", "e"] })));
      await db.insert(userWordMastery).values(batch.flatMap(userId => ["a", "b", "c", "d", "e"].map(wordId => ({ userId, wordId, firstMasteredAt: now }))));
    }
    await db.execute(sql`analyze`);
    for (const metric of metrics) {
      for (const period of periods) {
        const me = ids[ids.length - 1]!;
        const callBaseline = () => baseline(me, metric, period, now);
        const callOptimized = () => getMetricLeaderboard(me, metric, period, now);
        const oldBoard = await callBaseline();
        const newBoard = await callOptimized();
        assert.equal(oldBoard.myValue, newBoard.myValue);
        assert.deepEqual(oldBoard.ranking.map(row => row.userId), newBoard.ranking.map(row => row.userId));
        for (let warmup = 0; warmup < 5; warmup++) {
          await callBaseline();
          await callOptimized();
        }
        const beforeSamples: number[] = [];
        const afterSamples: number[] = [];
        for (let sample = 0; sample < sampleCount; sample++) {
          if (sample % 2 === 0) {
            beforeSamples.push(await timed(callBaseline));
            afterSamples.push(await timed(callOptimized));
          } else {
            afterSamples.push(await timed(callOptimized));
            beforeSamples.push(await timed(callBaseline));
          }
        }
        const result = { population, board: `${metric}:${period}`,
          baselineP50: percentile(beforeSamples, 0.5), optimizedP50: percentile(afterSamples, 0.5),
          baselineP95: percentile(beforeSamples, 0.95), optimizedP95: percentile(afterSamples, 0.95) };
        results.push(result);
        console.log(JSON.stringify(result));
      }
    }
    await db.delete(users).where(inArray(users.id, ids));
    ids = [];
  }
  for (const result of results) {
    assert.ok(Number(result.optimizedP95) <= Number(result.baselineP95) + Math.max(2, Number(result.baselineP95) * 0.15),
      `P95 regression exceeds the local noise budget: ${JSON.stringify(result)}`);
  }
  console.log("Performance comparison passed: original Git baseline vs optimized simulation, 18 boards × 200 interleaved samples per implementation");
} catch (error) {
  console.error(error);
  exitCode = 1;
} finally {
  if (ids.length) await db.delete(users).where(inArray(users.id, ids));
  if (original) await db.insert(appConfig).values(original).onConflictDoUpdate({ target: appConfig.key, set: { value: original.value } });
  else await db.delete(appConfig).where(eq(appConfig.key, "leaderboard_config"));
}
process.exit(exitCode);
