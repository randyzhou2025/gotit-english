import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { shanghaiWeekContext } from "../lib/learning-power.js";
import { scoredSimulatedParticipants, simulatedRankOffset } from "../lib/leaderboard-simulation.js";
import { leaderboardConfig } from "./social.js";

export type LeaderboardMetric = "time" | "words" | "power";
export type LeaderboardPeriod = "week" | "total";

/** 只把配置人数内的排名、本人及所需差值取回应用层，避免全量拉取用户排名。 */
export async function getMetricLeaderboard(
  userId: string,
  metric: LeaderboardMetric,
  period: LeaderboardPeriod,
  now = new Date()
) {
  const { displayLimit } = await leaderboardConfig();
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
  // 数据库只排序真实用户。额外取保护线和末五名，不传输或排序模拟名单。
  const rows = await db.execute<{
    user_id: string; nickname: string | null; avatar_url: string | null;
    value: string | number; rank: string | number; previous_value: string | number | null;
    real_count: string | number;
  }>(sql`with totals as (${totals}), ranked as (
      select totals.*, users.nickname, users.avatar_url,
        row_number() over standings as rank,
        lag(value) over standings as previous_value,
        count(*) over standings as real_count
      from totals inner join users on users.id = totals.user_id where value > 0
      window standings as (order by value desc, tie_at desc nulls last, user_id asc
        rows between unbounded preceding and unbounded following)
    ) select * from ranked where rank <= ${Math.max(displayLimit, 20)}
      or rank > real_count - 5 or user_id = ${userId}::uuid order by rank`);
  const realCount = Number(rows[0]?.real_count ?? 0);
  const twentieth = rows.find(row => Number(row.rank) === 20);
  const last = rows[rows.length - 1];
  const ceiling = Number(twentieth?.value ?? last?.value ?? (metric === "time" ? 900 : metric === "words" ? 10 : 20));
  const tail = realCount > 20 ? rows.find(row => Number(row.rank) > realCount - 5) : undefined;
  // 区间冲突或保护线下降时，始终优先保护真实前二十名。
  const floor = Math.min(ceiling, tail ? Number(tail.value) + 1 : 1);
  const simulated = scoredSimulatedParticipants(metric, period, now, floor, ceiling);
  const me = rows.find(row => row.user_id === userId);
  const serialize = (row: typeof rows[number]) => ({
    rank: Number(row.rank) + simulatedRankOffset(simulated, Number(row.value)).count,
    userId: row.user_id, nickname: row.nickname || "同学",
    avatarUrl: row.avatar_url || "", value: Number(row.value), isMe: row.user_id === userId,
    isSimulated: false,
  });
  const realTop = rows.filter(row => Number(row.rank) <= displayLimit);
  const ranking: Array<ReturnType<typeof serialize>> = [];
  let realIndex = 0;
  let simulatedIndex = 0;
  while (ranking.length < displayLimit && (realIndex < realTop.length || simulatedIndex < simulated.length)) {
    const real = realTop[realIndex];
    const member = simulated[simulatedIndex];
    if (real && (!member || Number(real.value) >= member.value)) {
      ranking.push(serialize(real));
      realIndex++;
    } else if (member) {
      ranking.push({ rank: ranking.length + 1, ...member, avatarUrl: "", isMe: false, isSimulated: true });
      simulatedIndex++;
    }
  }
  const simulatedPrevious = me ? simulatedRankOffset(simulated, Number(me.value)).previousValue : null;
  const previousCandidates = [me?.previous_value, simulatedPrevious].filter(value => value != null).map(Number);
  return {
    metric, period, weekKey: context.weekKey, weekStart: start, weekEnd: end,
    asOf: now.toISOString(), displayLimit,
    participantCount: realCount + simulated.length,
    simulatedParticipantCount: simulated.length,
    myRank: me ? serialize(me).rank : null,
    myValue: me ? Number(me.value) : 0,
    gapToPrevious: me && previousCandidates.length ? Math.min(...previousCandidates) - Number(me.value) : null,
    ranking,
    myEntry: me ? serialize(me) : null,
  };
}
