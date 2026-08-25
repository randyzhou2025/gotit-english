import assert from "node:assert/strict";
import test from "node:test";
import {
  availableScore,
  isValidDictation,
  learningPowerUniqueKey,
  normalizedClassmatePair,
  pointsToEnterTopTen,
  pointsToOvertake,
  shanghaiWeekContext,
} from "./learning-power.js";

test("Shanghai week starts on Monday and switches without deleting history", () => {
  const sunday = shanghaiWeekContext(new Date("2026-08-30T15:59:59.000Z"));
  const monday = shanghaiWeekContext(new Date("2026-08-30T16:00:00.000Z"));

  assert.equal(sunday.weekKey, "2026-W35");
  assert.equal(monday.weekKey, "2026-W36");
  assert.equal(monday.weekStart, "2026-08-31T00:00:00+08:00");
  assert.equal(monday.weekEnd, "2026-09-06T23:59:59.999+08:00");
});

test("valid dictation accepts ten words or a completed small unit", () => {
  assert.equal(isValidDictation({ completed: true, wordIds: Array.from({ length: 10 }, (_, i) => `w${i}`), unitWordCount: 20 }), true);
  assert.equal(isValidDictation({ completed: true, wordIds: Array.from({ length: 8 }, (_, i) => `w${i}`), unitWordCount: 8 }), true);
  assert.equal(isValidDictation({ completed: true, wordIds: ["a", "b", "c"], unitWordCount: 8 }), false);
  assert.equal(isValidDictation({ completed: false, wordIds: Array.from({ length: 10 }, (_, i) => `w${i}`), unitWordCount: 20 }), false);
});

test("daily caps never exceed their configured maximum", () => {
  assert.equal(availableScore(0, 20, 100), 20);
  assert.equal(availableScore(18, 20, 10), 2);
  assert.equal(availableScore(20, 20, 5), 0);
});

test("unique keys make app opens, weekly words, sessions, daily bonuses and reviews idempotent", () => {
  const base = { userId: "u1", dateKey: "2026-08-24", weekKey: "2026-W35" };
  assert.equal(learningPowerUniqueKey({ ...base, type: "APP_OPEN" }), "APP_OPEN:u1:20260824");
  assert.equal(learningPowerUniqueKey({ ...base, type: "DICTATION_WORD", wordId: "apple" }), "WEEKLY_WORD:u1:apple:2026-W35");
  assert.equal(learningPowerUniqueKey({ ...base, type: "VALID_DICTATION", sessionId: "s1" }), "VALID_DICTATION:u1:s1");
  assert.equal(learningPowerUniqueKey({ ...base, type: "DAILY_BONUS" }), "DAILY_BONUS:u1:20260824");
  assert.equal(learningPowerUniqueKey({ ...base, type: "MISTAKE_REVIEW", wordId: "apple" }), "MISTAKE_REVIEW:u1:apple:20260824");
});

test("classmate pairs are normalized and overtake copy uses score plus one", () => {
  assert.deepEqual(normalizedClassmatePair("b", "a"), ["a", "b"]);
  assert.equal(pointsToOvertake(215, 203), 13);
  assert.equal(pointsToOvertake(null, 203), null);
});

test("top-ten gap allows a newly reached tie to enter ahead of an older score", () => {
  assert.equal(pointsToEnterTopTen(215, 203), 12);
  assert.equal(pointsToEnterTopTen(203, 203), 1);
  assert.equal(pointsToEnterTopTen(null, 203), null);
});
