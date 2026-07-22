import { createWriteStream } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { FastifyInstance, FastifyReply, FastifyRequest, preHandlerHookHandler } from "fastify";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function registerUploadRoutes(
  app: FastifyInstance,
  authenticate: preHandlerHookHandler,
  uploadsDir: string
) {
  app.post(
    "/api/upload/avatar",
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const file = await request.file();
      if (!file) {
        return reply.code(400).send({ error: "file is required" });
      }

      const mime = file.mimetype;
      if (!ALLOWED_MIME.has(mime)) {
        return reply.code(400).send({ error: "Unsupported file type" });
      }

      const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const filename = `${randomUUID()}.${ext}`;
      const filepath = path.join(uploadsDir, filename);
      await pipeline(file.file, createWriteStream(filepath));

      const baseUrl = process.env.PUBLIC_BASE_URL ?? `${request.protocol}://${request.hostname}`;
      const url = `${baseUrl.replace(/\/$/, "")}/uploads/${filename}`;

      return { url };
    }
  );
}
