import assert from "node:assert/strict";
import test from "node:test";
import { zonedReminderClock } from "./learning-reminder.js";

test("zonedReminderClock returns the Shanghai calendar time", () => {
  assert.deepEqual(
    zonedReminderClock(new Date("2026-09-05T11:08:00.000Z"), "Asia/Shanghai"),
    {
      dateKey: "2026-09-05",
      time: "19:08",
      displayTime: "2026年9月5日 19:08",
    }
  );
});
