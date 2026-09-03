import assert from "node:assert/strict";
import test from "node:test";
import {
  countConsecutiveShanghaiDates,
  recentShanghaiDateStrings,
  mergeProgressForSave,
  type ProgressSnapshot,
} from "./utils.js";

const progress = (overrides: Partial<ProgressSnapshot> = {}): ProgressSnapshot => ({
  masteredWordIds: [],
  savedWeakWordIds: [],
  selectedUnitId: "",
  courseSetupCompleted: false,
  updatedAt: "2026-08-27T00:00:00.000Z",
  ...overrides,
});

test("an empty stale client snapshot cannot erase server progress", () => {
  const merged = mergeProgressForSave(
    progress({
      masteredWordIds: ["word-a", "word-b"],
      savedWeakWordIds: ["word-c"],
      selectedUnitId: "unit-old",
      courseSetupCompleted: true,
    }),
    progress({ selectedUnitId: "unit-new" })
  );

  assert.deepEqual(merged.masteredWordIds, ["word-a", "word-b"]);
  assert.deepEqual(merged.savedWeakWordIds, ["word-c"]);
  assert.equal(merged.selectedUnitId, "unit-new");
  assert.equal(merged.courseSetupCompleted, true);
});

test("an incoming word status replaces the previous status without losing other words", () => {
  const merged = mergeProgressForSave(
    progress({
      masteredWordIds: ["word-a", "word-b"],
      savedWeakWordIds: ["word-c"],
    }),
    progress({
      masteredWordIds: ["word-c"],
      savedWeakWordIds: ["word-a"],
    })
  );

  assert.deepEqual(merged.masteredWordIds.sort(), ["word-b", "word-c"]);
  assert.deepEqual(merged.savedWeakWordIds, ["word-a"]);
});

test("recent Shanghai dates include today and remain ordered across a month boundary", () => {
  assert.deepEqual(
    recentShanghaiDateStrings(4, new Date("2026-09-01T08:00:00.000Z")),
    ["2026-08-29", "2026-08-30", "2026-08-31", "2026-09-01"]
  );
});

test("study streak counts real study dates across a month boundary", () => {
  assert.equal(
    countConsecutiveShanghaiDates(
      ["2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"],
      "2026-09-04"
    ),
    5
  );
});

test("study streak remains on yesterday before today's first study", () => {
  assert.equal(
    countConsecutiveShanghaiDates(
      ["2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03"],
      "2026-09-04"
    ),
    4
  );
});

test("study streak stops at the first missed study date", () => {
  assert.equal(
    countConsecutiveShanghaiDates(
      ["2026-08-30", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"],
      "2026-09-04"
    ),
    4
  );
});
