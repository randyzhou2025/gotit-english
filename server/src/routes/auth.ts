import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";
import { z } from "zod";
import { getDashboard } from "../services/study.js";
import {
  createUser,
  findUserByOpenId,
  getProgress,
  getUserById,
  serializeUser,
} from "../services/user.js";
import { code2Session } from "../wechat.js";

const sessionSchema = z.object({
  code: z.string().min(1),
});

export async function registerAuthRoutes(app: FastifyInstance, authenticate: preHandlerHookHandler) {
  app.post("/api/weapp/session", async (request, reply: FastifyReply) => {
    const parsed = sessionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "code is required" });
    }

    try {
      const { openid } = await code2Session(parsed.data.code);
      let user = await findUserByOpenId(openid);
      if (!user) {
        user = await createUser(openid);
      }

      const progress = await getProgress(user.id);
      const dashboard = await getDashboard(user.id);
      const token = await reply.jwtSign({ sub: user.id });

      return reply.send({
        token,
        user: serializeUser(user),
        progress,
        dashboard,
      });
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
      return reply.code(statusCode).send({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  });

  app.get("/api/user/me", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const jwtUser = request.user as { sub: string };
    const user = await getUserById(jwtUser.sub);
    if (!user) {
      throw app.httpErrors.notFound("User not found");
    }
    return { user: serializeUser(user) };
  });
}
