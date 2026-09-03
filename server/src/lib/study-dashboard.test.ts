import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../services/study.ts", import.meta.url), "utf8");
const streakFunction = source.slice(
  source.indexOf("async function countConsecutiveStudyDays"),
  source.indexOf("export async function getDashboard")
);

test("dashboard study streak comes from active daily study records", () => {
  assert.match(streakFunction, /from\(userDailyStats\)/);
  assert.match(streakFunction, /studySeconds/);
  assert.match(streakFunction, /wordsStudied/);
  assert.doesNotMatch(streakFunction, /APP_OPEN|learningPowerEvents/);
});

test("dashboard total study days excludes empty daily records", () => {
  const queryStart = source.indexOf(".select({ total: count() })");
  const queryEnd = source.indexOf("countConsecutiveStudyDays(userId", queryStart);
  const totalDaysQuery = source.slice(queryStart, queryEnd);

  assert.match(totalDaysQuery, /studySeconds/);
  assert.match(totalDaysQuery, /wordsStudied/);
});
