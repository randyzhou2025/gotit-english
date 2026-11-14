import assert from "node:assert/strict";
import test from "node:test";
import { shanghaiWeekContext } from "./learning-power.js";
import { scoredSimulatedParticipants, simulatedLeaderboardParticipants, simulatedRankOffset, simulatedWeeklyPlan } from "./leaderboard-simulation.js";

const metrics = ["power", "time", "words"] as const;

test("weekly population stays within 700–2100 and adds at least 70 each day", () => {
  for (let week = 0; week < 156; week++) {
    const date = new Date(Date.UTC(2025, 11, 29 + week * 7));
    for (const metric of metrics) {
      const plan = simulatedWeeklyPlan(metric, shanghaiWeekContext(date).weekKey);
      assert.ok(plan.total >= 700 && plan.total <= 2100);
      assert.equal(plan.dailyAdds.length, 7);
      assert.equal(plan.dailyAdds.reduce((sum, value) => sum + value, 0), plan.total);
      assert.ok(plan.dailyAdds.every(value => Number.isInteger(value) && value >= 70 && value <= 2100));
    }
  }
});

test("daily cohorts and scores are deterministic, grow monotonically and include inactive members", () => {
  for (const metric of metrics) {
    let previous = new Map<string, number>();
    let grew = false;
    let stayed = false;
    const plan = simulatedWeeklyPlan(metric, "2026-W46");
    for (let day = 0; day < 7; day++) {
      const now = new Date(`2026-11-${String(9 + day).padStart(2, "0")}T08:00:00+08:00`);
      const participants = simulatedLeaderboardParticipants(metric, now);
      assert.deepEqual(simulatedLeaderboardParticipants(metric, now), participants);
      assert.deepEqual(simulatedLeaderboardParticipants(metric, new Date(now.getTime() + 15 * 3600000)), participants);
      assert.equal(participants.length, plan.dailyAdds.slice(0, day + 1).reduce((sum, value) => sum + value, 0));
      assert.equal(new Set(participants.map(member => member.user_id)).size, participants.length);
      for (const member of participants) {
        assert.ok(member.progress >= 0 && member.progress <= 1000000);
        const before = previous.get(member.user_id);
        if (before === undefined) continue;
        assert.ok(member.progress >= before);
        grew ||= member.progress > before;
        stayed ||= member.progress === before;
      }
      previous = new Map(participants.map(member => [member.user_id, member.progress]));
    }
    assert.ok(grew && stayed);
    assert.equal(previous.size, plan.total);
  }
});

test("the cohort resets exactly at Shanghai Monday, including the ISO year boundary", () => {
  const sunday = new Date("2027-01-03T23:59:59+08:00");
  const monday = new Date("2027-01-04T00:00:00+08:00");
  for (const metric of metrics) {
    const previous = simulatedLeaderboardParticipants(metric, sunday);
    const next = simulatedLeaderboardParticipants(metric, monday);
    assert.equal(previous.length, simulatedWeeklyPlan(metric, "2026-W53").total);
    assert.equal(next.length, simulatedWeeklyPlan(metric, "2027-W01").dailyAdds[0]);
    const previousIds = new Set(previous.map(member => member.user_id));
    assert.ok(next.every(member => !previousIds.has(member.user_id)));
  }
  assert.notDeepEqual(simulatedWeeklyPlan("power", "2026-W46"), simulatedWeeklyPlan("time", "2026-W46"));
});

test("daily lists and score bands are immutable bounded caches, refreshed on date or real-score changes", () => {
  const now = new Date("2026-11-14T10:00:00+08:00");
  const participants = simulatedLeaderboardParticipants("power", now);
  assert.equal(simulatedLeaderboardParticipants("power", now), participants);
  assert.ok(Object.isFrozen(participants) && Object.isFrozen(participants[0]));
  const scores = scoredSimulatedParticipants("power", "week", now, 20, 100);
  assert.equal(scoredSimulatedParticipants("power", "week", now, 20, 100), scores);
  assert.ok(Object.isFrozen(scores) && Object.isFrozen(scores[0]));
  const clamped = scoredSimulatedParticipants("power", "week", now, 1, 1);
  assert.notEqual(clamped, scores);
  assert.ok(clamped.every(member => member.value === 1));
  const tomorrow = new Date("2026-11-15T10:00:00+08:00");
  assert.notEqual(simulatedLeaderboardParticipants("power", tomorrow), participants);
  assert.notEqual(scoredSimulatedParticipants("power", "week", tomorrow, 20, 100), scores);
});

test("binary rank offsets and preceding scores agree with a full scan, with real users winning ties", () => {
  const now = new Date("2026-11-15T10:00:00+08:00");
  const scores = scoredSimulatedParticipants("words", "total", now, 10, 100);
  for (let value = 0; value <= 110; value++) {
    const higher = scores.filter(member => member.value > value);
    assert.deepEqual(simulatedRankOffset(scores, value), {
      count: higher.length, previousValue: higher[higher.length - 1]?.value ?? null,
    });
  }
  const tied = scoredSimulatedParticipants("words", "total", now, 10, 10);
  assert.deepEqual(simulatedRankOffset(tied, 10), { count: 0, previousValue: null });
  assert.deepEqual(simulatedRankOffset(tied, 9), { count: tied.length, previousValue: 10 });
});
