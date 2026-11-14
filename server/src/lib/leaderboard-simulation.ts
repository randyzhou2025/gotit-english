import { createHash } from "node:crypto";
import { shanghaiWeekContext } from "./learning-power.js";
import { generateNickname } from "./nickname.js";

type Metric = "time" | "words" | "power";
type Participant = Readonly<{ user_id: string; nickname: string; progress: number }>;
type ScoredParticipant = Readonly<{ userId: string; nickname: string; value: number }>;

const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" });
// 固定最多三个每日名单、六个分数区间缓存，不按请求用户扩张。
const participantCache = new Map<Metric, { dateKey: string; participants: readonly Participant[] }>();
const scoreCache = new Map<string, {
  participants: readonly Participant[]; floor: number; ceiling: number; entries: readonly ScoredParticipant[];
}>();

function seededRandom(key: string) {
  let state = createHash("sha256").update(key).digest().readUInt32LE(0);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** 一周先确定总人数，再分配七天增量；刷新、补访和服务重启不会重复增长。 */
export function simulatedWeeklyPlan(metric: Metric, weekKey: string) {
  const random = seededRandom(`leaderboard:v1:${metric}:${weekKey}`);
  const total = 700 + Math.floor(random() * 1401);
  const weights = Array.from({ length: 7 }, () => 1 + Math.floor(random() * 1000));
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const dailyAdds = weights.map(weight => 70 + Math.floor((total - 490) * weight / weightSum));
  const remainder = total - dailyAdds.reduce((sum, value) => sum + value, 0);
  for (let day = 0; day < remainder; day++) dailyAdds[day] = dailyAdds[day]! + 1;
  return { total, dailyAdds };
}

/** 模拟名单只用于排名，不创建 users 或学习记录；同一榜的周榜、总榜共享名单。 */
export function simulatedLeaderboardParticipants(metric: Metric, now: Date) {
  const dateKey = dateFormatter.format(now);
  const cached = participantCache.get(metric);
  if (cached?.dateKey === dateKey) return cached.participants;
  const context = shanghaiWeekContext(now);
  const day = Math.floor((Date.parse(`${context.dateKey}T00:00:00+08:00`) - Date.parse(context.weekStart)) / 86400000);
  const plan = simulatedWeeklyPlan(metric, context.weekKey);
  const participants: Array<{ user_id: string; nickname: string; progress: number }> = [];
  let index = 0;
  for (let joinedDay = 0; joinedDay <= day; joinedDay++) {
    for (let member = 0; member < plan.dailyAdds[joinedDay]!; member++, index++) {
      const userId = `sim:${metric}:${context.weekKey}:${index}`;
      const random = seededRandom(userId);
      const nickname = generateNickname(random);
      let progress = 50000 + Math.floor(random() * 500001);
      for (let activeDay = joinedDay + 1; activeDay <= day; activeDay++) {
        if (random() < 0.45) continue;
        progress = Math.min(1000000, progress + 10000 + Math.floor(random() * 65001));
      }
      participants.push({ user_id: userId, nickname, progress });
    }
  }
  const frozen = Object.freeze(participants.map(member => Object.freeze(member)));
  participantCache.set(metric, { dateKey, participants: frozen });
  return frozen;
}

export function scoredSimulatedParticipants(
  metric: Metric, period: "week" | "total", now: Date, floor: number, ceiling: number
) {
  const participants = simulatedLeaderboardParticipants(metric, now);
  const key = `${metric}:${period}`;
  const cached = scoreCache.get(key);
  if (cached?.participants === participants && cached.floor === floor && cached.ceiling === ceiling) return cached.entries;
  const entries = Object.freeze(participants.map(member => Object.freeze({
    userId: member.user_id, nickname: member.nickname,
    value: floor + Math.floor((ceiling - floor) * member.progress / 1000000),
  })).sort((a, b) => b.value - a.value || (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0)));
  scoreCache.set(key, { participants, floor, ceiling, entries });
  return entries;
}

/** 同分真实用户优先，二分查找严格高于真实分数的模拟人数及最近分数。 */
export function simulatedRankOffset(entries: readonly ScoredParticipant[], value: number) {
  let low = 0;
  let high = entries.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (entries[middle]!.value > value) low = middle + 1;
    else high = middle;
  }
  return { count: low, previousValue: low > 0 ? entries[low - 1]!.value : null };
}
