import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { feedbackReplies, feedbacks } from "../db/schema.js";

export const FEEDBACK_CATEGORIES = ["bug", "malfunction", "experience", "feature", "other"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
export type FeedbackSender = "user" | "admin";

export interface FeedbackReply {
  id: string;
  sender: FeedbackSender;
  content: string;
  createdAt: string;
}

export interface FeedbackThreadSummary {
  id: string;
  category: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: FeedbackReply | null;
  unread: boolean;
}

function serializeReply(row: { id: string; sender: string; content: string; createdAt: Date }): FeedbackReply {
  return {
    id: row.id,
    sender: row.sender === "admin" ? "admin" : "user",
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

function isUnreadForUser(userLastReadAt: Date | null, lastAdminReplyAt: Date | null): boolean {
  if (!lastAdminReplyAt) return false;
  return !userLastReadAt || lastAdminReplyAt > userLastReadAt;
}

export async function createFeedback(userId: string, category: FeedbackCategory, content: string) {
  const now = new Date();
  const [row] = await db
    .insert(feedbacks)
    .values({
      userId,
      category,
      content,
      userLastReadAt: now,
      updatedAt: now,
    })
    .returning();

  return { id: row!.id, createdAt: row!.createdAt.toISOString() };
}

export async function listFeedbackThreads(userId: string): Promise<FeedbackThreadSummary[]> {
  const rows = await db
    .select({
      id: feedbacks.id,
      category: feedbacks.category,
      content: feedbacks.content,
      createdAt: feedbacks.createdAt,
      updatedAt: feedbacks.updatedAt,
      userLastReadAt: feedbacks.userLastReadAt,
    })
    .from(feedbacks)
    .where(eq(feedbacks.userId, userId))
    .orderBy(desc(feedbacks.updatedAt));

  if (rows.length === 0) return [];

  const replies = await db
    .select()
    .from(feedbackReplies)
    .where(inArray(feedbackReplies.feedbackId, rows.map((row) => row.id)))
    .orderBy(desc(feedbackReplies.createdAt));

  const lastByThread = new Map<string, typeof replies[number]>();
  const lastAdminAt = new Map<string, Date>();
  for (const reply of replies) {
    if (!lastByThread.has(reply.feedbackId)) lastByThread.set(reply.feedbackId, reply);
    if (reply.sender === "admin" && !lastAdminAt.has(reply.feedbackId)) {
      lastAdminAt.set(reply.feedbackId, reply.createdAt);
    }
  }

  return rows.map((row) => {
    const last = lastByThread.get(row.id);
    return {
      id: row.id,
      category: row.category,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      lastMessage: last ? serializeReply(last) : null,
      unread: isUnreadForUser(row.userLastReadAt, lastAdminAt.get(row.id) ?? null),
    };
  });
}

export async function countUnreadFeedback(userId: string): Promise<number> {
  const [row] = await db.execute<{ total: string | number }>(sql`
    select count(*)::int as total
    from feedbacks f
    where f.user_id = ${userId}::uuid
      and exists (
        select 1 from feedback_replies r
        where r.feedback_id = f.id
          and r.sender = 'admin'
          and (f.user_last_read_at is null or r.created_at > f.user_last_read_at)
      )
  `);
  return Number(row?.total ?? 0);
}

export async function getFeedbackThread(userId: string, feedbackId: string) {
  const [thread] = await db
    .select()
    .from(feedbacks)
    .where(and(eq(feedbacks.id, feedbackId), eq(feedbacks.userId, userId)))
    .limit(1);
  if (!thread) return null;

  const replies = await db
    .select()
    .from(feedbackReplies)
    .where(eq(feedbackReplies.feedbackId, feedbackId))
    .orderBy(feedbackReplies.createdAt);

  const now = new Date();
  await db
    .update(feedbacks)
    .set({ userLastReadAt: now })
    .where(and(eq(feedbacks.id, feedbackId), eq(feedbacks.userId, userId)));

  return {
    id: thread.id,
    category: thread.category,
    content: thread.content,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
    unread: false,
    replies: replies.map(serializeReply),
  };
}

export async function addUserReply(userId: string, feedbackId: string, content: string) {
  const [thread] = await db
    .select({ id: feedbacks.id })
    .from(feedbacks)
    .where(and(eq(feedbacks.id, feedbackId), eq(feedbacks.userId, userId)))
    .limit(1);
  if (!thread) return null;

  const now = new Date();
  const [reply] = await db
    .insert(feedbackReplies)
    .values({
      feedbackId,
      sender: "user",
      content,
    })
    .returning();

  await db
    .update(feedbacks)
    .set({ updatedAt: now, userLastReadAt: now })
    .where(eq(feedbacks.id, feedbackId));

  return serializeReply(reply!);
}
