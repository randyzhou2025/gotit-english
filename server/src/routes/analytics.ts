import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { appConfig, usageEvents } from "../db/schema.js";

const analyticsEventNames = [
  "theme_selected",
  "home_export_click",
  "home_word_match_click",
  "wordlist_export_click",
  "weakbook_click",
  "dictation_start",
  "unit_wordlist_click",
  "meaning_self_test_click",
  "classmates_tab_view",
  "leaderboard_view",
  "classmate_invite_click",
  "share_created",
  "share_accepted",
  "cheer_toggle",
  "classmate_removed",
  "learning_power_awarded",
] as const;

const analyticsPropertyValue = z.union([
  z.string().max(256),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const analyticsEventSchema = z.object({
  eventId: z.string().min(8).max(64),
  name: z.enum(analyticsEventNames),
  occurredAt: z.string().datetime(),
  properties: z.record(analyticsPropertyValue).refine(
    (properties) => Object.keys(properties).length <= 24,
    "Too many properties"
  ),
});

const analyticsBatchSchema = z.object({
  events: z.array(analyticsEventSchema).min(1).max(20),
});

async function analyticsEnabled(): Promise<boolean> {
  const [row] = await db
    .select({ value: appConfig.value })
    .from(appConfig)
    .where(eq(appConfig.key, "analytics_enabled"))
    .limit(1);
  return row?.value !== "false";
}

export async function registerAnalyticsRoutes(
  app: FastifyInstance,
  authenticate: preHandlerHookHandler
) {
  app.post("/api/analytics/events", { preHandler: [authenticate] }, async (request: FastifyRequest, reply) => {
    const parsed = analyticsBatchSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      throw app.httpErrors.badRequest("Invalid analytics payload");
    }

    if (!(await analyticsEnabled())) {
      return reply.code(202).send({ accepted: 0, disabled: true });
    }

    const jwtUser = request.user as { sub: string };
    await db
      .insert(usageEvents)
      .values(parsed.data.events.map((event) => ({
        eventId: event.eventId,
        userId: jwtUser.sub,
        eventName: event.name,
        properties: event.properties,
        occurredAt: new Date(event.occurredAt),
      })))
      .onConflictDoNothing({ target: usageEvents.eventId });

    return reply.code(202).send({ accepted: parsed.data.events.length });
  });
}
