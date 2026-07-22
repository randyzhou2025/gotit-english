import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from "fastify";
import { z } from "zod";
import { getDashboard, recordStudyEvent } from "../services/study.js";

const studyEventSchema = z.object({
  wordIds: z.array(z.string()).default([]),
  durationSeconds: z.number().int().min(0).default(0),
});

export async function registerStudyRoutes(app: FastifyInstance, authenticate: preHandlerHookHandler) {
  app.get("/api/study/dashboard", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const jwtUser = request.user as { sub: string };
    const dashboard = await getDashboard(jwtUser.sub);
    return { dashboard };
  });

  app.post("/api/study/event", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const jwtUser = request.user as { sub: string };
    const parsed = studyEventSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      throw app.httpErrors.badRequest("Invalid study event payload");
    }

    await recordStudyEvent(jwtUser.sub, parsed.data);
    const dashboard = await getDashboard(jwtUser.sub);
    return { dashboard };
  });
}
