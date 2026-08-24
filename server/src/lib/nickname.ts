export const NICKNAME_PATTERNS = [
  { key: "traitNature", length: 2, weight: 12 },
  { key: "seasonScene", length: 2, weight: 8 },
  { key: "skySpace", length: 2, weight: 10 },
  { key: "between", length: 3, weight: 20, connector: "间" },
  { key: "and", length: 3, weight: 20, connector: "与" },
  { key: "accompany", length: 3, weight: 12, connector: "伴" },
  { key: "reflect", length: 3, weight: 10, connector: "映" },
  { key: "fall", length: 3, weight: 8, connector: "落" },
] as const;

export const NICKNAME_POOLS = {
  traitNature: {
    first: ["青", "清", "晴", "明", "远", "长", "静", "碧", "苍", "暖"],
    last: ["川", "野", "溪", "岚", "林", "海", "原", "谷", "岸", "洲", "森", "屿"],
  },
  seasonScene: {
    first: ["晨", "暮", "春", "夏", "秋", "冬", "晓", "晚"],
    last: ["风", "光", "雨", "云", "月", "星", "川", "野", "林", "海"],
  },
  skySpace: {
    first: ["星", "月", "云", "风", "雨", "雪", "霞", "霁", "雾", "霜"],
    last: ["野", "川", "海", "林", "溪", "谷", "岸", "原", "洲", "屿"],
  },
  between: {
    first: ["山", "林", "云", "花", "竹", "松", "柳", "枫", "溪", "谷", "野", "海", "湖", "岸", "岛", "河", "川", "峰", "岭", "泉"],
    last: ["风", "月", "星", "云", "光", "雨", "雪", "雾", "霞", "影", "舟", "花", "叶", "泉", "鸟", "灯", "书", "路", "梦", "歌"],
  },
  and: {
    first: ["山", "川", "林", "海", "松", "竹", "花", "溪", "谷", "野", "岸", "岛", "湖", "河", "峰", "岭", "舟", "桥", "城", "窗", "书", "灯", "路", "泉"],
    last: ["月", "星", "云", "风", "雨", "雪", "雾", "霞", "光", "影", "晨", "暮", "春", "夏", "秋", "冬", "梦", "歌", "诗", "叶", "潮", "鸟", "露", "霜"],
  },
  accompany: {
    first: ["风", "云", "星", "月", "雨", "雪", "霞", "晨", "暮", "松", "竹", "花", "舟", "灯", "书", "歌", "影", "梦"],
    last: ["山", "川", "海", "林", "溪", "野", "岸", "路", "窗", "夜", "光", "泉", "桥", "城", "湖", "谷", "峰", "岛"],
  },
  reflect: {
    first: ["月", "星", "日", "霞", "光", "雪", "云", "晨", "暮", "灯", "花", "竹", "松", "柳", "水", "霜"],
    last: ["山", "川", "海", "湖", "溪", "林", "野", "岸", "窗", "桥", "城", "舟", "泉", "谷", "峰", "岛", "路", "田"],
  },
  fall: {
    first: ["星", "月", "雨", "雪", "花", "叶", "霞", "光", "霜", "露", "云", "影"],
    last: ["山", "川", "海", "林", "野", "岸", "桥", "城", "窗", "湖", "谷", "峰", "岛", "原", "溪", "舟", "路", "庭"],
  },
} as const;

export const BLOCKED_CHARS = [
  "死", "伤", "病", "丧", "殇", "恨", "愁", "败", "毒", "鬼", "血", "杀", "滚", "蠢", "傻",
] as const;

export const BLOCKED_WORDS: readonly string[] = [];

const LEGACY_DEFAULT_NICKNAME_PATTERN = /^课本单词通_[a-z0-9]{5}$/;

type RandomSource = () => number;
export type NicknamePattern = (typeof NICKNAME_PATTERNS)[number];
type TwoCharacterPattern = Extract<NicknamePattern, { length: 2 }>;
type ThreeCharacterPattern = Extract<NicknamePattern, { length: 3 }>;

export function randomItem<T>(items: readonly T[], random: RandomSource = Math.random): T {
  return items[Math.floor(random() * items.length)]!;
}

export function selectNicknamePattern(random: RandomSource = Math.random): NicknamePattern {
  const value = random() * 100;
  let cumulativeWeight = 0;

  for (const pattern of NICKNAME_PATTERNS) {
    cumulativeWeight += pattern.weight;
    if (value < cumulativeWeight) return pattern;
  }

  return NICKNAME_PATTERNS[NICKNAME_PATTERNS.length - 1];
}

export function generateTwoCharacterNickname(
  pattern: TwoCharacterPattern,
  random: RandomSource = Math.random
): string {
  const pool = NICKNAME_POOLS[pattern.key];
  return `${randomItem(pool.first, random)}${randomItem(pool.last, random)}`;
}

export function generateThreeCharacterNickname(
  pattern: ThreeCharacterPattern,
  random: RandomSource = Math.random
): string {
  const pool = NICKNAME_POOLS[pattern.key];
  return `${randomItem(pool.first, random)}${pattern.connector}${randomItem(pool.last, random)}`;
}

export function isValidNickname(nickname: string): boolean {
  const characters = Array.from(nickname);

  if (!/^[\u4E00-\u9FFF]{2,3}$/u.test(nickname)) return false;
  if (characters.some((character, index) => character === characters[index - 1])) return false;
  if (characters.length === 3 && characters[0] === characters[2]) return false;
  if (BLOCKED_CHARS.some((character) => nickname.includes(character))) return false;
  if (BLOCKED_WORDS.some((word) => word.length > 0 && nickname.includes(word))) return false;

  return true;
}

export function shouldGenerateDefaultNickname(nickname: string | null): boolean {
  return nickname === null
    || nickname === ""
    || nickname === "课本单词通"
    || LEGACY_DEFAULT_NICKNAME_PATTERN.test(nickname);
}

export function generateNickname(random: RandomSource = Math.random): string {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const pattern = selectNicknamePattern(random);
    const nickname = pattern.length === 2
      ? generateTwoCharacterNickname(pattern, random)
      : generateThreeCharacterNickname(pattern, random);

    if (isValidNickname(nickname)) return nickname;
  }

  return `${NICKNAME_POOLS.traitNature.first[0]}${NICKNAME_POOLS.traitNature.last[0]}`;
}
