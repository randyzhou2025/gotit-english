import type { FastifyInstance, FastifyRequest, preHandlerHookHandler } from "fastify";
import { z } from "zod";
import {
  acceptShare,
  createShare,
  getClassmateFeed,
  getClassmates,
  getLeaderboard,
  recordAppOpen,
  recordDictationCompletion,
  recordDictationWordCompletion,
  recordMistakeReviews,
  recordWordlistExport,
  recordWordMatchRound,
  removeClassmate,
  toggleFeedCheer,
} from "../services/social.js";

const shareSchema = z.object({
  publisherId: z.string().trim().min(1).max(64),
  bookId: z.string().trim().min(1).max(128),
  unitId: z.string().trim().min(1).max(128),
  unitName: z.string().trim().min(1).max(128),
  shareType: z.enum(["UNIT_INVITE", "DICTATION_RESULT", "CLASSMATE_INVITE", "WORD_MATCH_CHALLENGE"]),
});

const shareTokenSchema = z.string().trim().min(16).max(64).regex(/^[A-Za-z0-9_-]+$/);

const dictationCompletionSchema = z.object({
  sessionId: z.string().trim().min(8).max(128),
  unitId: z.string().trim().min(1).max(128),
  unitName: z.string().trim().min(1).max(128),
  unitWordCount: z.number().int().min(1).max(500),
  completed: z.literal(true),
  wordResults: z.array(z.object({
    wordId: z.string().trim().min(1).max(160),
    correct: z.boolean(),
  })).min(1).max(500),
  reviewedWeakWordIds: z.array(z.string().trim().min(1).max(160)).max(500).default([]),
});

const dictationWordCompletionSchema = z.object({
  sessionId: z.string().trim().min(8).max(128),
  unitId: z.string().trim().min(1).max(128),
  wordId: z.string().trim().min(1).max(160),
});

const mistakeReviewSchema = z.object({
  reviewSessionId: z.string().trim().min(8).max(128),
  wordIds: z.array(z.string().trim().min(1).max(160)).min(1).max(100),
});

const wordlistExportSchema = z.object({
  exportId: z.string().trim().min(8).max(128),
  unitId: z.string().trim().min(1).max(128).optional(),
});

const wordMatchRoundSchema = z.object({
  unitId: z.string().trim().min(1).max(128),
  roundIndex: z.number().int().min(0).max(99),
  wordCount: z.number().int().min(1).max(9),
  bestCombo: z.number().int().min(0).max(9).default(0),
  errorCount: z.number().int().min(0).max(999).default(1),
});

export async function registerSocialRoutes(
  app: FastifyInstance,
  authenticate: preHandlerHookHandler
) {
  app.post("/api/shares", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const parsed = shareSchema.safeParse(request.body ?? {});
    if (!parsed.success) throw app.httpErrors.badRequest("Invalid share payload");
    const jwtUser = request.user as { sub: string };
    return createShare(jwtUser.sub, parsed.data);
  });

  app.post("/api/shares/:shareToken/accept", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const token = shareTokenSchema.safeParse((request.params as { shareToken?: string }).shareToken);
    if (!token.success) throw app.httpErrors.badRequest("Invalid share token");
    const jwtUser = request.user as { sub: string };
    const result = await acceptShare(jwtUser.sub, token.data);
    if (!result) throw app.httpErrors.notFound("Share not found");
    return result;
  });

  app.post("/api/learning-power/dictations", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const parsed = dictationCompletionSchema.safeParse(request.body ?? {});
    if (!parsed.success) throw app.httpErrors.badRequest("Invalid dictation result payload");
    const jwtUser = request.user as { sub: string };
    if (parsed.data.reviewedWeakWordIds.length > 0) {
      await recordMistakeReviews(jwtUser.sub, {
        reviewSessionId: parsed.data.sessionId,
        wordIds: parsed.data.reviewedWeakWordIds,
      });
    }
    return recordDictationCompletion(jwtUser.sub, parsed.data);
  });

  app.post("/api/learning-power/app-opens", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const jwtUser = request.user as { sub: string };
    return recordAppOpen(jwtUser.sub);
  });

  app.post("/api/learning-power/dictation-words", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const parsed = dictationWordCompletionSchema.safeParse(request.body ?? {});
    if (!parsed.success) throw app.httpErrors.badRequest("Invalid dictation word payload");
    const jwtUser = request.user as { sub: string };
    return recordDictationWordCompletion(jwtUser.sub, parsed.data);
  });

  app.post("/api/learning-power/reviews", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const parsed = mistakeReviewSchema.safeParse(request.body ?? {});
    if (!parsed.success) throw app.httpErrors.badRequest("Invalid review result payload");
    const jwtUser = request.user as { sub: string };
    return recordMistakeReviews(jwtUser.sub, parsed.data);
  });

  app.post("/api/learning-power/wordlist-exports", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const parsed = wordlistExportSchema.safeParse(request.body ?? {});
    if (!parsed.success) throw app.httpErrors.badRequest("Invalid wordlist export payload");
    const jwtUser = request.user as { sub: string };
    return recordWordlistExport(jwtUser.sub, parsed.data);
  });

  app.post("/api/learning-power/word-match-rounds", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const parsed = wordMatchRoundSchema.safeParse(request.body ?? {});
    if (!parsed.success) throw app.httpErrors.badRequest("Invalid word match round payload");
    const jwtUser = request.user as { sub: string };
    return recordWordMatchRound(jwtUser.sub, parsed.data);
  });

  app.get("/api/classmates/feed", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const jwtUser = request.user as { sub: string };
    return getClassmateFeed(jwtUser.sub);
  });

  app.post("/api/classmates/feed/:feedId/cheer", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const feedId = z.string().uuid().safeParse((request.params as { feedId?: string }).feedId);
    if (!feedId.success) throw app.httpErrors.badRequest("Invalid feed id");
    const jwtUser = request.user as { sub: string };
    const result = await toggleFeedCheer(jwtUser.sub, feedId.data);
    if (!result) throw app.httpErrors.notFound("Feed item not found");
    return result;
  });

  app.get("/api/classmates/leaderboard", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const jwtUser = request.user as { sub: string };
    return getLeaderboard(jwtUser.sub);
  });

  app.get("/api/classmates", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const jwtUser = request.user as { sub: string };
    return { classmates: await getClassmates(jwtUser.sub) };
  });

  app.delete("/api/classmates/:classmateUserId", { preHandler: [authenticate] }, async (request: FastifyRequest) => {
    const classmateUserId = z.string().uuid().safeParse((request.params as { classmateUserId?: string }).classmateUserId);
    if (!classmateUserId.success) throw app.httpErrors.badRequest("Invalid classmate id");
    const jwtUser = request.user as { sub: string };
    const removed = await removeClassmate(jwtUser.sub, classmateUserId.data);
    if (!removed) throw app.httpErrors.notFound("Active classmate relation not found");
    return { removed: true };
  });
}
