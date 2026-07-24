import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { userProgress, users } from "../db/schema.js";
import {
  defaultNickname,
  emptyProgress,
  serializeProgress,
  type ProgressSnapshot,
} from "../lib/utils.js";

export function serializeUser(row: typeof users.$inferSelect) {
  return {
    nickname: row.nickname,
    avatarUrl: row.avatarUrl ?? "",
    createdAt: row.createdAt.toISOString(),
  };
}

export async function findUserByOpenId(openid: string) {
  const [row] = await db.select().from(users).where(eq(users.openid, openid)).limit(1);
  return row ?? null;
}

export async function createUser(
  openid: string,
  activity?: { ip: string; location: string }
) {
  const now = new Date();
  const [user] = await db
    .insert(users)
    .values({
      openid,
      nickname: defaultNickname(),
      lastActiveIp: activity?.ip,
      lastActiveLocation: activity?.location,
      updatedAt: now,
    })
    .returning();

  await db.insert(userProgress).values({
    userId: user!.id,
    updatedAt: now,
  });

  return user!;
}

export async function touchUserActivity(
  userId: string,
  activity: { ip: string; location: string }
) {
  const now = new Date();
  const [row] = await db
    .update(users)
    .set({
      lastActiveIp: activity.ip,
      lastActiveLocation: activity.location,
      updatedAt: now,
    })
    .where(eq(users.id, userId))
    .returning();

  return row ?? null;
}

export async function getUserById(userId: string) {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return row ?? null;
}

export async function getProgress(userId: string): Promise<ProgressSnapshot> {
  const [row] = await db.select().from(userProgress).where(eq(userProgress.userId, userId)).limit(1);
  if (!row) return emptyProgress();
  return serializeProgress(row);
}

export async function saveProgress(userId: string, snapshot: ProgressSnapshot) {
  const now = new Date();
  const updatedAt = snapshot.updatedAt ? new Date(snapshot.updatedAt) : now;
  const [row] = await db
    .insert(userProgress)
    .values({
      userId,
      masteredWordIds: snapshot.masteredWordIds,
      savedWeakWordIds: snapshot.savedWeakWordIds,
      selectedUnitId: snapshot.selectedUnitId,
      courseSetupCompleted: snapshot.courseSetupCompleted,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: userProgress.userId,
      set: {
        masteredWordIds: snapshot.masteredWordIds,
        savedWeakWordIds: snapshot.savedWeakWordIds,
        selectedUnitId: snapshot.selectedUnitId,
        courseSetupCompleted: snapshot.courseSetupCompleted,
        updatedAt,
      },
    })
    .returning();

  return serializeProgress(row!);
}

export async function updateUserProfile(
  userId: string,
  input: { nickname?: string; avatarUrl?: string }
) {
  const now = new Date();
  const patch: Partial<typeof users.$inferInsert> = { updatedAt: now };
  if (input.nickname !== undefined) patch.nickname = input.nickname;
  if (input.avatarUrl !== undefined) patch.avatarUrl = input.avatarUrl;

  const [row] = await db.update(users).set(patch).where(eq(users.id, userId)).returning();

  return row ?? null;
}
