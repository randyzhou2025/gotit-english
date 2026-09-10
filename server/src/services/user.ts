import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { userProgress, userWeakWordHistory, userWordMastery, users } from "../db/schema.js";
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

export async function saveProgress(
  userId: string,
  snapshot: ProgressSnapshot,
  masteryEvents: Array<{ wordId: string; masteredAt: string }> = []
) {
  const now = new Date();
  const row = await db.transaction(async (tx) => {
    // 同一用户的多端同步串行合并，避免重试或并发把旧词重新算成首次掌握。
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
    const [existingRow] = await tx
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId))
      .limit(1);
    const savedSnapshot = existingRow
      ? mergeProgressForSave(serializeProgress(existingRow), snapshot)
      : snapshot;
    const updatedAt = savedSnapshot.updatedAt ? new Date(savedSnapshot.updatedAt) : now;

    const existingMastered = new Set(existingRow?.masteredWordIds ?? []);
    const eventWordIds = new Set(masteryEvents.map(event => event.wordId));
    const knownEventWords = [...existingMastered].filter(wordId => eventWordIds.has(wordId));
    if (knownEventWords.length > 0) {
      await tx.insert(userWordMastery)
        .values(knownEventWords.map(wordId => ({ userId, wordId, firstMasteredAt: null })))
        .onConflictDoNothing();
    }
    const events = new Map<string, Date>();
    for (const event of masteryEvents) {
      const time = new Date(Math.min(Date.parse(event.masteredAt), now.getTime()));
      const previous = events.get(event.wordId);
      if (!previous || time < previous) events.set(event.wordId, time);
    }
    if (events.size > 0) {
      await tx.insert(userWordMastery)
        .values([...events].map(([wordId, firstMasteredAt]) => ({ userId, wordId, firstMasteredAt })))
        .onConflictDoUpdate({
          target: [userWordMastery.userId, userWordMastery.wordId],
          set: {
            // 存量 NULL 始终保持未知；离线事件乱序抵达时保留最早的真实动作时间。
            firstMasteredAt: sql`case when ${userWordMastery.firstMasteredAt} is null then null
              else least(${userWordMastery.firstMasteredAt}, excluded.first_mastered_at) end`,
          },
        });
    }
    const importedWords = [...new Set(savedSnapshot.masteredWordIds)]
      .filter(wordId => !existingMastered.has(wordId) && !eventWordIds.has(wordId));
    if (importedWords.length > 0) {
      // 旧客户端或导入的全量进度没有动作时间，只入存量，不计周榜。
      await tx.insert(userWordMastery)
        .values(importedWords.map(wordId => ({ userId, wordId, firstMasteredAt: null })))
        .onConflictDoNothing();
    }

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
