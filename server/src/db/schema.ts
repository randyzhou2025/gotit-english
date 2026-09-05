import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  openid: varchar("openid", { length: 128 }).notNull().unique(),
  nickname: varchar("nickname", { length: 20 }),
  isDefaultNickname: boolean("is_default_nickname").notNull().default(false),
  avatarUrl: varchar("avatar_url", { length: 512 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  phoneCountryCode: varchar("phone_country_code", { length: 8 }),
  phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
  lastActiveIp: varchar("last_active_ip", { length: 64 }),
  lastActiveLocation: varchar("last_active_location", { length: 128 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userProgress = pgTable("user_progress", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  masteredWordIds: jsonb("mastered_word_ids").$type<string[]>().notNull().default([]),
  savedWeakWordIds: jsonb("saved_weak_word_ids").$type<string[]>().notNull().default([]),
  selectedUnitId: varchar("selected_unit_id", { length: 128 }).notNull().default(""),
  courseSetupCompleted: boolean("course_setup_completed").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userDailyStats = pgTable(
  "user_daily_stats",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    statDate: date("stat_date").notNull(),
    wordsStudied: integer("words_studied").notNull().default(0),
    studySeconds: integer("study_seconds").notNull().default(0),
    wordIdsToday: jsonb("word_ids_today").$type<string[]>().notNull().default([]),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.statDate] })]
);

export const learningReminders = pgTable("learning_reminders", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(false),
  remainingCredits: integer("remaining_credits").notNull().default(0),
  reminderTime: varchar("reminder_time", { length: 5 }).notNull().default("19:00"),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Shanghai"),
  lastAttemptDate: date("last_attempt_date"),
  lastSentDate: date("last_sent_date"),
  lastDeliveryStatus: varchar("last_delivery_status", { length: 16 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const feedbacks = pgTable("feedbacks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 32 }).notNull(),
  content: text("content").notNull(),
  imageUrls: jsonb("image_urls").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appConfig = pgTable("app_config", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
});

export type UsageEventProperties = Record<string, string | number | boolean | null>;

export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: varchar("event_id", { length: 64 }).notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventName: varchar("event_name", { length: 64 }).notNull(),
    properties: jsonb("properties").$type<UsageEventProperties>().notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("usage_events_occurred_at_idx").on(t.occurredAt),
    index("usage_events_user_event_idx").on(t.userId, t.eventName, t.occurredAt),
  ]
);

export const shareInvites = pgTable(
  "share_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: varchar("token", { length: 64 }).notNull().unique(),
    inviterUserId: uuid("inviter_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    publisherId: varchar("publisher_id", { length: 64 }).notNull(),
    bookId: varchar("book_id", { length: 128 }).notNull(),
    unitId: varchar("unit_id", { length: 128 }).notNull(),
    unitName: varchar("unit_name", { length: 128 }).notNull(),
    shareType: varchar("share_type", { length: 32 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("share_invites_inviter_idx").on(t.inviterUserId, t.createdAt)]
);

export const classmateRelations = pgTable(
  "classmate_relations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userAId: uuid("user_a_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userBId: uuid("user_b_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    source: varchar("source", { length: 32 }).notNull(),
    sourceShareId: uuid("source_share_id").references(() => shareInvites.id, { onDelete: "set null" }),
    status: varchar("status", { length: 16 }).notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("classmate_relations_pair_uidx").on(t.userAId, t.userBId),
    index("classmate_relations_user_b_idx").on(t.userBId, t.status),
  ]
);

export const dictationSubmissions = pgTable(
  "dictation_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionId: varchar("session_id", { length: 128 }).notNull(),
    unitId: varchar("unit_id", { length: 128 }).notNull(),
    completedWordCount: integer("completed_word_count").notNull(),
    isValid: boolean("is_valid").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("dictation_submissions_user_session_uidx").on(t.userId, t.sessionId)]
);

export const weeklyWordLearning = pgTable(
  "weekly_word_learning",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    wordId: varchar("word_id", { length: 160 }).notNull(),
    weekKey: varchar("week_key", { length: 16 }).notNull(),
    firstLearnedAt: timestamp("first_learned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.wordId, t.weekKey] })]
);

export const userWeakWordHistory = pgTable(
  "user_weak_word_history",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    wordId: varchar("word_id", { length: 160 }).notNull(),
    firstMarkedWeakAt: timestamp("first_marked_weak_at", { withTimezone: true }).notNull().defaultNow(),
    lastMarkedWeakAt: timestamp("last_marked_weak_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.wordId] })]
);

export const learningPowerEvents = pgTable(
  "learning_power_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekKey: varchar("week_key", { length: 16 }).notNull(),
    eventDate: date("event_date").notNull(),
    eventType: varchar("event_type", { length: 32 }).notNull(),
    score: integer("score").notNull(),
    wordId: varchar("word_id", { length: 160 }),
    unitId: varchar("unit_id", { length: 128 }),
    dictationSessionId: varchar("dictation_session_id", { length: 128 }),
    uniqueKey: varchar("unique_key", { length: 320 }).notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("learning_power_events_user_week_idx").on(t.userId, t.weekKey, t.eventType),
    index("learning_power_events_created_at_idx").on(t.createdAt),
  ]
);

export const dailyLearningPowerStats = pgTable(
  "daily_learning_power_stats",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    statDate: date("stat_date").notNull(),
    dictationWordScore: integer("dictation_word_score").notNull().default(0),
    validDictationScore: integer("valid_dictation_score").notNull().default(0),
    dailyBonusScore: integer("daily_bonus_score").notNull().default(0),
    streakScore: integer("streak_score").notNull().default(0),
    mistakeReviewScore: integer("mistake_review_score").notNull().default(0),
    wordlistExportScore: integer("wordlist_export_score").notNull().default(0),
    totalScore: integer("total_score").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.statDate] })]
);

export const weeklyLearningPower = pgTable(
  "weekly_learning_power",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekKey: varchar("week_key", { length: 16 }).notNull(),
    learningPower: integer("learning_power").notNull().default(0),
    validDictationCount: integer("valid_dictation_count").notNull().default(0),
    activeStudyDays: integer("active_study_days").notNull().default(0),
    lastScoreAt: timestamp("last_score_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.weekKey] }),
    index("weekly_learning_power_rank_idx").on(
      t.weekKey,
      t.learningPower,
      t.validDictationCount,
      t.activeStudyDays,
      t.lastScoreAt
    ),
  ]
);

export const learningActivities = pgTable(
  "learning_activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activityType: varchar("activity_type", { length: 32 }).notNull(),
    unitId: varchar("unit_id", { length: 128 }),
    unitName: varchar("unit_name", { length: 128 }),
    countValue: integer("count_value"),
    rankValue: integer("rank_value"),
    uniqueKey: varchar("unique_key", { length: 256 }).notNull().unique(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("learning_activities_user_time_idx").on(t.userId, t.occurredAt)]
);

export const feedCheers = pgTable(
  "feed_cheers",
  {
    feedId: uuid("feed_id")
      .notNull()
      .references(() => learningActivities.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.feedId, t.userId] })]
);
