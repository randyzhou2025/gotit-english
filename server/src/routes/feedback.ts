import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { appConfig, feedbacks } from "../db/schema.js";

const feedbackCategories = ["bug", "malfunction", "experience", "feature", "other"] as const;

const feedbackSchema = z.object({
  category: z.enum(feedbackCategories),
  content: z.string().trim().min(1).max(500),
});

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

    const [row] = await db
      .insert(feedbacks)
      .values({
        userId: jwtUser.sub,
        category: parsed.data.category,
        content: parsed.data.content,
      })
      .returning();

    return { feedback: { id: row!.id, createdAt: row!.createdAt.toISOString() } };
  });

  app.get("/api/config/public", async () => {
    const rows = await db.select().from(appConfig);
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }

    return {
      customerServiceQrUrl: config.customer_service_qr_url ?? "",
      icpNumber: config.icp_number ?? "",
    };
  });
}
