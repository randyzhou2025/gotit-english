import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from "fastify";
import { z } from "zod";
import { getProgress, saveProgress, serializeUser, updateUserProfile } from "../services/user.js";
import {
  getLearningReminder,
  readStudyReminderConfig,
  saveLearningReminder,
} from "../services/learning-reminder.js";
import { uniqueWordIds } from "../lib/utils.js";

const profileSchema = z.object({
  nickname: z.string().trim().min(1).max(20).optional(),
  avatarUrl: z.string().trim().max(512).optional(),
});

const progressSchema = z.object({
  masteredWordIds: z.array(z.string()).default([]),
  savedWeakWordIds: z.array(z.string()).default([]),
  selectedUnitId: z.string().default(""),
  courseSetupCompleted: z.boolean().default(false),
  updatedAt: z.string().optional(),
});

const reminderSchema = z.object({
  enabled: z.boolean(),
  reminderTime: z.string().regex(/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/),
});

export async function registerUserRoutes(app: FastifyInstance, authenticate: preHandlerHookHandler) {
  app.patch("/api/user/me", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const jwtUser = request.user as { sub: string };
    const parsed = profileSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      throw app.httpErrors.badRequest("Invalid profile payload");
    }

    if (!parsed.data.nickname && parsed.data.avatarUrl === undefined) {
      throw app.httpErrors.badRequest("Nothing to update");
    }

    const user = await updateUserProfile(jwtUser.sub, {
      nickname: parsed.data.nickname,
      avatarUrl: parsed.data.avatarUrl,
    });

    if (!user) {
      throw app.httpErrors.notFound("User not found");
    }

    return { user: serializeUser(user) };
  });

  app.get("/api/user/progress", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const jwtUser = request.user as { sub: string };
    return { progress: await getProgress(jwtUser.sub) };
  });

  app.put("/api/user/progress", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const jwtUser = request.user as { sub: string };
    const parsed = progressSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      throw app.httpErrors.badRequest("Invalid progress payload");
    }

    const progress = await saveProgress(jwtUser.sub, {
      masteredWordIds: uniqueWordIds(parsed.data.masteredWordIds),
      savedWeakWordIds: uniqueWordIds(parsed.data.savedWeakWordIds),
      selectedUnitId: parsed.data.selectedUnitId,
      courseSetupCompleted: parsed.data.courseSetupCompleted,
      updatedAt: parsed.data.updatedAt || new Date().toISOString(),
    });

    return { progress };
  });

  app.get("/api/user/reminder", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const jwtUser = request.user as { sub: string };
    const row = await getLearningReminder(jwtUser.sub);
    const config = readStudyReminderConfig();
    return {
      reminder: {
        enabled: row?.enabled ?? false,
        reminderTime: row?.reminderTime ?? "19:00",
        lastDeliveryStatus: row?.lastDeliveryStatus ?? "",
        mode: config.mode,
        templateId: config.templateId,
        available: Boolean(config.templateId),
      },
    };
  });

  app.put("/api/user/reminder", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const jwtUser = request.user as { sub: string };
    const parsed = reminderSchema.safeParse(request.body ?? {});
    if (!parsed.success) throw app.httpErrors.badRequest("Invalid reminder payload");

    const config = readStudyReminderConfig();
    if (parsed.data.enabled && !config.templateId) {
      throw app.httpErrors.serviceUnavailable("微信提醒模板尚未配置");
    }
    const row = await saveLearningReminder(jwtUser.sub, parsed.data);
    return {
      reminder: {
        enabled: row.enabled,
        reminderTime: row.reminderTime,
        lastDeliveryStatus: row.lastDeliveryStatus ?? "",
        mode: config.mode,
        templateId: config.templateId,
        available: Boolean(config.templateId),
      },
    };
  });
}
