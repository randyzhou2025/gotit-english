import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { appConfig } from "../db/schema.js";
import { readStudyReminderConfig } from "../services/learning-reminder.js";
import {
  addUserReply,
  countUnreadFeedback,
  createFeedback,
  FEEDBACK_CATEGORIES,
  getFeedbackThread,
  listFeedbackThreads,
} from "../services/feedback.js";

const feedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  content: z.string().trim().min(1).max(500),
});

const replySchema = z.object({
  content: z.string().trim().min(1).max(500),
});

const feedbackIdSchema = z.string().uuid();

export async function registerFeedbackRoutes(
  app: FastifyInstance,
  authenticate: preHandlerHookHandler
) {
  app.post("/api/feedback", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const jwtUser = request.user as { sub: string };
    const parsed = feedbackSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      throw app.httpErrors.badRequest("Invalid feedback payload");
    }

    const feedback = await createFeedback(jwtUser.sub, parsed.data.category, parsed.data.content);
    return { feedback };
  });

  app.get("/api/feedback", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const jwtUser = request.user as { sub: string };
    return { threads: await listFeedbackThreads(jwtUser.sub) };
  });

  app.get("/api/feedback/unread", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const jwtUser = request.user as { sub: string };
    return { unreadCount: await countUnreadFeedback(jwtUser.sub) };
  });

  app.get("/api/feedback/:id", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const jwtUser = request.user as { sub: string };
    const parsed = feedbackIdSchema.safeParse((request.params as { id?: string }).id);
    if (!parsed.success) throw app.httpErrors.badRequest("Invalid feedback id");

    const thread = await getFeedbackThread(jwtUser.sub, parsed.data);
    if (!thread) throw app.httpErrors.notFound("Feedback not found");
    return { thread };
  });

  app.post("/api/feedback/:id/replies", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const jwtUser = request.user as { sub: string };
    const idParsed = feedbackIdSchema.safeParse((request.params as { id?: string }).id);
    const bodyParsed = replySchema.safeParse(request.body ?? {});
    if (!idParsed.success || !bodyParsed.success) {
      throw app.httpErrors.badRequest("Invalid reply payload");
    }

    const reply = await addUserReply(jwtUser.sub, idParsed.data, bodyParsed.data.content);
    if (!reply) throw app.httpErrors.notFound("Feedback not found");
    return { reply };
  });

  app.get("/api/config/public", async () => {
    const rows = await db.select().from(appConfig);
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }

    const reminderConfig = readStudyReminderConfig();
    return {
      customerServiceQrUrl: config.customer_service_qr_url ?? "",
      icpNumber: config.icp_number ?? "",
      analyticsEnabled: config.analytics_enabled !== "false",
      featureAnnouncementsEnabled: config.feature_announcements_enabled !== "false",
      studyReminderTemplateId: reminderConfig.templateId,
      studyReminderMode: reminderConfig.mode,
    };
  });
}
