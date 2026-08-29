import assert from "node:assert/strict";
import test from "node:test";
import {
  LEARNING_POWER_LIMITS,
  availableScore,
  isValidDictation,
  learningPowerUniqueKey,
  normalizedClassmatePair,
  pointsToEnterTopTen,
  pointsToOvertake,
  shanghaiWeekContext,
  wordMatchRoundScore,
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

test("wordlist exports earn two points with an independent daily cap of twenty", () => {
  assert.equal(LEARNING_POWER_LIMITS.wordlistExport, 20);
  assert.equal(availableScore(0, LEARNING_POWER_LIMITS.wordlistExport, 2), 2);
  assert.equal(availableScore(18, LEARNING_POWER_LIMITS.wordlistExport, 2), 2);
  assert.equal(availableScore(20, LEARNING_POWER_LIMITS.wordlistExport, 2), 0);
});

test("wordlist export keys are scoped to the user and remain idempotent across days", () => {
  const input = { type: "WORDLIST_EXPORT" as const, userId: "u1", exportId: "export-1", dateKey: "2026-08-26", weekKey: "2026-W35" };
  assert.equal(learningPowerUniqueKey(input), "WORDLIST_EXPORT:u1:export-1");
  assert.equal(learningPowerUniqueKey({ ...input, dateKey: "2026-08-31", weekKey: "2026-W36" }), learningPowerUniqueKey(input));
  assert.notEqual(learningPowerUniqueKey({ ...input, exportId: "export-2" }), learningPowerUniqueKey(input));
  assert.notEqual(learningPowerUniqueKey({ ...input, userId: "u2" }), learningPowerUniqueKey(input));
});

test("unique keys make app opens, weekly words, sessions, daily bonuses and reviews idempotent", () => {
  const base = { userId: "u1", dateKey: "2026-08-24", weekKey: "2026-W35" };
  assert.equal(learningPowerUniqueKey({ ...base, type: "APP_OPEN" }), "APP_OPEN:u1:20260824");
  assert.equal(learningPowerUniqueKey({ ...base, type: "DICTATION_WORD", wordId: "apple" }), "WEEKLY_WORD:u1:apple:2026-W35");
  assert.equal(learningPowerUniqueKey({ ...base, type: "VALID_DICTATION", sessionId: "s1" }), "VALID_DICTATION:u1:s1");
  assert.equal(learningPowerUniqueKey({ ...base, type: "DAILY_BONUS" }), "DAILY_BONUS:u1:20260824");
  assert.equal(learningPowerUniqueKey({ ...base, type: "MISTAKE_REVIEW", wordId: "apple" }), "MISTAKE_REVIEW:u1:apple:20260824");
});

test("word match round rewards are unique per unit, round and Shanghai date", () => {
  assert.equal(LEARNING_POWER_LIMITS.wordMatch, 20);
  assert.equal(availableScore(0, LEARNING_POWER_LIMITS.wordMatch, 2), 2);
  assert.equal(availableScore(19, LEARNING_POWER_LIMITS.wordMatch, 2), 1);
  assert.equal(wordMatchRoundScore({ wordCount: 9, bestCombo: 9, errorCount: 0 }), 5);
  assert.equal(wordMatchRoundScore({ wordCount: 5, bestCombo: 5, errorCount: 0 }), 5);
  assert.equal(wordMatchRoundScore({ wordCount: 9, bestCombo: 8, errorCount: 0 }), 2);
  assert.equal(wordMatchRoundScore({ wordCount: 9, bestCombo: 9, errorCount: 1 }), 2);
  const input = {
    type: "WORD_MATCH_ROUND" as const,
    userId: "u1",
    unitId: "rj:required-1:u1",
    roundIndex: 2,
    dateKey: "2026-08-29",
    weekKey: "2026-W35",
  };
  assert.equal(
    learningPowerUniqueKey(input),
    "WORD_MATCH_ROUND:u1:rj:required-1:u1:2:20260829"
  );
  assert.notEqual(
    learningPowerUniqueKey({ ...input, roundIndex: 3 }),
    learningPowerUniqueKey(input)
  );
  assert.notEqual(
    learningPowerUniqueKey({ ...input, dateKey: "2026-08-30" }),
    learningPowerUniqueKey(input)
  );
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
