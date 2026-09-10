import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { shanghaiWeekContext } from "../lib/learning-power.js";

export type LeaderboardMetric = "time" | "words" | "power";
export type LeaderboardPeriod = "week" | "total";

/** 只把 Top 10、本人及所需差值取回应用层，避免全量拉取用户排名。 */
export async function getMetricLeaderboard(
  userId: string,
  metric: LeaderboardMetric,
  period: LeaderboardPeriod,
  now = new Date()
) {
  const context = shanghaiWeekContext(now);
  const start = context.weekStart;
  const end = context.weekEnd;
  let totals;
  if (metric === "time") {
    totals = sql`select user_id, sum(study_seconds)::bigint as value, null::timestamptz as tie_at
      from user_daily_stats
      ${period === "week" ? sql`where stat_date between ${start.slice(0, 10)}::date and ${end.slice(0, 10)}::date` : sql``}
      group by user_id`;
  } else if (metric === "words") {
    totals = period === "week"
      ? sql`select user_id, count(*)::bigint as value, null::timestamptz as tie_at
          from user_word_mastery where first_mastered_at between ${start}::timestamptz and ${end}::timestamptz
          group by user_id`
      : sql`select user_id,
          (select count(distinct word_id) from jsonb_array_elements_text(mastered_word_ids) as words(word_id) where word_id <> '')::bigint as value,
          null::timestamptz as tie_at from user_progress`;
  } else {
    totals = sql`select user_id, sum(learning_power)::bigint as value, max(last_score_at) as tie_at
      from weekly_learning_power ${period === "week" ? sql`where week_key = ${context.weekKey}` : sql``}
      group by user_id`;
  }
  // 学力榜保留现有同分时最近得分优先的规则；其他榜同值按用户 ID 稳定排序。
  const rows = await db.execute<{
    user_id: string; nickname: string | null; avatar_url: string | null;
    value: string | number; rank: string | number; previous_value: string | number | null;
  }>(sql`with totals as (${totals}), ranked as (
      select totals.*, users.nickname, users.avatar_url,
        row_number() over (order by value desc, tie_at desc nulls last, user_id asc) as rank,
        lag(value) over (order by value desc, tie_at desc nulls last, user_id asc) as previous_value
      from totals inner join users on users.id = totals.user_id where value > 0
    ) select * from ranked where rank <= 10 or user_id = ${userId}::uuid order by rank`);
  const me = rows.find(row => row.user_id === userId);
  const serialize = (row: typeof rows[number]) => ({
    rank: Number(row.rank), userId: row.user_id, nickname: row.nickname || "同学",
    avatarUrl: row.avatar_url || "", value: Number(row.value), isMe: row.user_id === userId,
  });
  return {
    metric, period, weekKey: context.weekKey, weekStart: start, weekEnd: end,
    asOf: now.toISOString(), displayLimit: 10,
    myRank: me ? Number(me.rank) : null,
    myValue: me ? Number(me.value) : 0,
    gapToPrevious: me?.previous_value != null ? Number(me.previous_value) - Number(me.value) : null,
    ranking: rows.filter(row => Number(row.rank) <= 10).map(serialize),
    myEntry: me ? serialize(me) : null,
  };
}
