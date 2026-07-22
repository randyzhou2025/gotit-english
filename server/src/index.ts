import "dotenv/config";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import sensible from "@fastify/sensible";
import fastifyStatic from "@fastify/static";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerFeedbackRoutes } from "./routes/feedback.js";
import { registerStudyRoutes } from "./routes/study.js";
import { registerUploadRoutes } from "./routes/upload.js";
import { registerUserRoutes } from "./routes/user.js";
import { ensureAppConfigDefaults } from "./services/study.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "..", "data", "uploads");

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";
const jwtSecret = process.env.JWT_SECRET ?? "";

if (!jwtSecret || jwtSecret.length < 16) {
  throw new Error("JWT_SECRET must be at least 16 characters");
}

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(sensible);
await app.register(fastifyJwt, {
  secret: jwtSecret,
  sign: { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" },
});
await app.register(multipart, {
  limits: { fileSize: 2 * 1024 * 1024 },
});

await fs.mkdir(uploadsDir, { recursive: true });
await app.register(fastifyStatic, {
  root: uploadsDir,
  prefix: "/uploads/",
  decorateReply: false,
});

const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "Unauthorized" });
  }
};

app.get("/api/health", async () => ({ ok: true }));

await registerAuthRoutes(app, authenticate);
await registerUserRoutes(app, authenticate);
await registerStudyRoutes(app, authenticate);
await registerFeedbackRoutes(app, authenticate);
await registerUploadRoutes(app, authenticate, uploadsDir);

await ensureAppConfigDefaults();

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
