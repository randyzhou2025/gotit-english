import assert from "node:assert/strict";
import test from "node:test";
import { mergeProgressForSave, type ProgressSnapshot } from "./utils.js";

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
