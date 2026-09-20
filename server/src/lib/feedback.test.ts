import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync(new URL("../routes/feedback.ts", import.meta.url), "utf8");
const service = fs.readFileSync(new URL("../services/feedback.ts", import.meta.url), "utf8");
const schema = fs.readFileSync(new URL("../db/schema.ts", import.meta.url), "utf8");

test("feedback schema stores conversation replies and read cursors", () => {
  assert.match(schema, /export const feedbackReplies/);
  assert.match(schema, /userLastReadAt/);
  assert.match(schema, /adminLastReadAt/);
});

test("feedback routes expose unread count, thread detail and user replies", () => {
  assert.match(route, /app.get\("\/api\/feedback\/unread"/);
  assert.match(route, /app.get\("\/api\/feedback\/:id"/);
  assert.match(route, /app.post\("\/api\/feedback\/:id\/replies"/);
  assert.match(service, /sender: "user"/);
  assert.match(service, /sender === "admin"/);
  assert.match(service, /userLastReadAt/);
});
