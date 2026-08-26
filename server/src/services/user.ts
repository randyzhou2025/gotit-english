import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { userProgress, userWeakWordHistory, users } from "../db/schema.js";
import { generateNickname, shouldGenerateDefaultNickname } from "../lib/nickname.js";
import {
  emptyProgress,
  mergeProgressForSave,
  serializeProgress,
  type ProgressSnapshot,
} from "../lib/utils.js";

export function serializeUser(row: typeof users.$inferSelect) {
  return {
    nickname: row.nickname ?? "",
    isDefaultNickname: row.isDefaultNickname,
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
      nickname: generateNickname(),
      isDefaultNickname: true,
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

export async function ensureDefaultNickname(user: typeof users.$inferSelect) {
  if (!shouldGenerateDefaultNickname(user.nickname)) return user;

  const now = new Date();
  const unchangedNickname = user.nickname === null
    ? isNull(users.nickname)
    : eq(users.nickname, user.nickname);
  const [updated] = await db
    .update(users)
    .set({
      nickname: generateNickname(),
      isDefaultNickname: true,
      updatedAt: now,
    })
    .where(and(eq(users.id, user.id), unchangedNickname))
    .returning();

  return updated ?? (await getUserById(user.id)) ?? user;
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
  const row = await db.transaction(async (tx) => {
    const [existingRow] = await tx
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId))
      .limit(1);
    const savedSnapshot = existingRow
      ? mergeProgressForSave(serializeProgress(existingRow), snapshot)
      : snapshot;
    const updatedAt = savedSnapshot.updatedAt ? new Date(savedSnapshot.updatedAt) : now;

    const [saved] = await tx
      .insert(userProgress)
      .values({
        userId,
        masteredWordIds: savedSnapshot.masteredWordIds,
        savedWeakWordIds: savedSnapshot.savedWeakWordIds,
        selectedUnitId: savedSnapshot.selectedUnitId,
        courseSetupCompleted: savedSnapshot.courseSetupCompleted,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: userProgress.userId,
        set: {
          masteredWordIds: savedSnapshot.masteredWordIds,
          savedWeakWordIds: savedSnapshot.savedWeakWordIds,
          selectedUnitId: savedSnapshot.selectedUnitId,
          courseSetupCompleted: savedSnapshot.courseSetupCompleted,
          updatedAt,
        },
      })
      .returning();

    if (snapshot.savedWeakWordIds.length > 0) {
      await tx
        .insert(userWeakWordHistory)
        .values(snapshot.savedWeakWordIds.map((wordId) => ({
          userId,
          wordId,
          firstMarkedWeakAt: now,
          lastMarkedWeakAt: now,
        })))
        .onConflictDoUpdate({
          target: [userWeakWordHistory.userId, userWeakWordHistory.wordId],
          set: { lastMarkedWeakAt: now },
        });
    }
    return saved!;
  });

  return serializeProgress(row);
}

export async function updateUserProfile(
  userId: string,
  input: { nickname?: string; avatarUrl?: string }
) {
  const now = new Date();
  const patch: Partial<typeof users.$inferInsert> = { updatedAt: now };
  if (input.nickname !== undefined) {
    patch.nickname = input.nickname;
    patch.isDefaultNickname = false;
  }
  if (input.avatarUrl !== undefined) patch.avatarUrl = input.avatarUrl;

  const [row] = await db.update(users).set(patch).where(eq(users.id, userId)).returning();

  return row ?? null;
}
