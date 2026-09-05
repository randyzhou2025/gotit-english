import { and, eq, isNull, ne, or } from "drizzle-orm";
import type { FastifyBaseLogger } from "fastify";
import { db } from "../db/index.js";
import { learningReminders, users } from "../db/schema.js";
import { zonedReminderClock } from "../lib/learning-reminder.js";
import { sendStudyReminderMessage } from "../wechat.js";

export type StudyReminderMode = "one_time" | "long_term";

export interface StudyReminderConfig {
  templateId: string;
  mode: StudyReminderMode;
  page: string;
  thingKey: string;
  timeKey: string;
}

export function readStudyReminderConfig(): StudyReminderConfig {
  return {
    templateId: process.env.WECHAT_STUDY_REMINDER_TEMPLATE_ID?.trim() ?? "",
    mode: process.env.WECHAT_STUDY_REMINDER_MODE === "long_term" ? "long_term" : "one_time",
    page: process.env.WECHAT_STUDY_REMINDER_PAGE?.trim() || "pages/index/index",
    thingKey: process.env.WECHAT_STUDY_REMINDER_THING_KEY?.trim() || "thing1",
    timeKey: process.env.WECHAT_STUDY_REMINDER_TIME_KEY?.trim() || "time2",
  };
}

export async function getLearningReminder(userId: string) {
  const [row] = await db
    .select()
    .from(learningReminders)
    .where(eq(learningReminders.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function saveLearningReminder(userId: string, input: {
  enabled: boolean;
  reminderTime: string;
}) {
  const existing = await getLearningReminder(userId);
  const reactivating = input.enabled && !existing?.enabled;
  const [row] = await db
    .insert(learningReminders)
    .values({
      userId,
      enabled: input.enabled,
      reminderTime: input.reminderTime,
      timezone: "Asia/Shanghai",
      lastAttemptDate: null,
      lastDeliveryStatus: null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: learningReminders.userId,
      set: {
        enabled: input.enabled,
        reminderTime: input.reminderTime,
        ...(reactivating ? { lastAttemptDate: null, lastDeliveryStatus: null } : {}),
        updatedAt: new Date(),
      },
    })
    .returning();
  return row!;
}

export async function dispatchDueLearningReminders(logger: FastifyBaseLogger, now = new Date()) {
  const config = readStudyReminderConfig();
  if (!config.templateId) return { attempted: 0, sent: 0 };

  const rows = await db
    .select({ reminder: learningReminders, openid: users.openid })
    .from(learningReminders)
    .innerJoin(users, eq(users.id, learningReminders.userId))
    .where(eq(learningReminders.enabled, true));

  let attempted = 0;
  let sent = 0;
  for (const row of rows) {
    const clock = zonedReminderClock(now, row.reminder.timezone);
    if (clock.time < row.reminder.reminderTime || row.reminder.lastAttemptDate === clock.dateKey) continue;

    const [claimed] = await db
      .update(learningReminders)
      .set({ lastAttemptDate: clock.dateKey, lastDeliveryStatus: "sending", updatedAt: now })
      .where(and(
        eq(learningReminders.userId, row.reminder.userId),
        eq(learningReminders.enabled, true),
        or(
          isNull(learningReminders.lastAttemptDate),
          ne(learningReminders.lastAttemptDate, clock.dateKey)
        )
      ))
      .returning({ userId: learningReminders.userId });
    if (!claimed) continue;

    attempted += 1;
    try {
      await sendStudyReminderMessage({
        openid: row.openid,
        templateId: config.templateId,
        page: config.page,
        thingKey: config.thingKey,
        timeKey: config.timeKey,
        reminderAt: clock.displayTime,
      });
      await db
        .update(learningReminders)
        .set({
          enabled: config.mode === "long_term",
          lastSentDate: clock.dateKey,
          lastDeliveryStatus: "sent",
          updatedAt: new Date(),
        })
        .where(eq(learningReminders.userId, row.reminder.userId));
      sent += 1;
    } catch (error) {
      const code = Number((error as { code?: unknown }).code ?? 0);
      await db
        .update(learningReminders)
        .set({
          enabled: config.mode === "one_time" && code === 43101 ? false : true,
          lastDeliveryStatus: "failed",
          updatedAt: new Date(),
        })
        .where(eq(learningReminders.userId, row.reminder.userId));
      logger.warn({ err: error, userId: row.reminder.userId }, "learning reminder delivery failed");
    }
  }
  return { attempted, sent };
}

export function startLearningReminderScheduler(logger: FastifyBaseLogger): () => void {
  const config = readStudyReminderConfig();
  if (!config.templateId) {
    logger.info("learning reminder scheduler disabled: template id is not configured");
    return () => {};
  }

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await dispatchDueLearningReminders(logger);
    } catch (error) {
      logger.error({ err: error }, "learning reminder scheduler failed");
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), 60_000);
  timer.unref();
  void tick();
  return () => clearInterval(timer);
}
