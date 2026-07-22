import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  openid: varchar("openid", { length: 128 }).notNull().unique(),
  nickname: varchar("nickname", { length: 20 }).notNull(),
  avatarUrl: varchar("avatar_url", { length: 512 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  phoneCountryCode: varchar("phone_country_code", { length: 8 }),
  phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
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
