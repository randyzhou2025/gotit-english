import assert from "node:assert/strict";
import test from "node:test";
import {
  BLOCKED_CHARS,
  NICKNAME_PATTERNS,
  NICKNAME_POOLS,
  generateNickname,
  isValidNickname,
  shouldGenerateDefaultNickname,
} from "./nickname.js";

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function classifyNickname(nickname: string): (typeof NICKNAME_PATTERNS)[number]["key"] {
  const characters = Array.from(nickname);

  if (characters.length === 3) {
    const connectorToPattern = {
      "间": "between",
      "与": "and",
      "伴": "accompany",
      "映": "reflect",
      "落": "fall",
    } as const;
    return connectorToPattern[characters[1] as keyof typeof connectorToPattern];
  }

  const first = characters[0];
  if ((NICKNAME_POOLS.traitNature.first as readonly string[]).includes(first!)) {
    return "traitNature";
  }
  if ((NICKNAME_POOLS.seasonScene.first as readonly string[]).includes(first!)) {
    return "seasonScene";
  }
  return "skySpace";
}

test("nickname pattern weights total 100 with a 30/70 length split", () => {
  const total = NICKNAME_PATTERNS.reduce((sum, pattern) => sum + pattern.weight, 0);
  const twoCharacterWeight = NICKNAME_PATTERNS
    .filter((pattern) => pattern.length === 2)
    .reduce((sum, pattern) => sum + pattern.weight, 0);

  assert.equal(total, 100);
  assert.equal(twoCharacterWeight, 30);
  assert.equal(total - twoCharacterWeight, 70);
});

test("nickname validation rejects invalid characters, repetitions, and blocked content", () => {
  for (const nickname of ["星野", "清溪", "山间月", "雨落窗"]) {
    assert.equal(isValidNickname(nickname), true, nickname);
  }

  for (const nickname of ["云云", "云间云", "青A", "青1", "青 川", "青😀", "死海", "青川岸原"]) {
    assert.equal(isValidNickname(nickname), false, nickname);
  }

  assert.equal(BLOCKED_CHARS.length, 15);
});

test("default nickname initialization migrates legacy defaults only once", () => {
  assert.equal(shouldGenerateDefaultNickname(null), true);
  assert.equal(shouldGenerateDefaultNickname(""), true);
  assert.equal(shouldGenerateDefaultNickname("课本单词通"), true);
  assert.equal(shouldGenerateDefaultNickname("课本单词通_ab123"), true);
  assert.equal(shouldGenerateDefaultNickname("课本单词通_ABC12"), false);
  assert.equal(shouldGenerateDefaultNickname("星野"), false);
  assert.equal(shouldGenerateDefaultNickname("自定义昵称"), false);
});

test("generator retries invalid combinations and returns a valid fallback after 10 attempts", () => {
  const retryValues = [0.35, 0.11, 0.16, 0, 0, 0];
  let retryIndex = 0;
  assert.equal(generateNickname(() => retryValues[retryIndex++]!), "青川");

  const repeatedInvalidValues = [0.35, 0.11, 0.16];
  let invalidIndex = 0;
  const fallback = generateNickname(() => repeatedInvalidValues[invalidIndex++ % 3]!);
  assert.equal(fallback, "青川");
  assert.equal(isValidNickname(fallback), true);
});

test("10,000 generated nicknames meet validity and distribution targets", () => {
  const sampleSize = 10_000;
  const random = createSeededRandom(20260824);
  const nicknames = Array.from({ length: sampleSize }, () => generateNickname(random));
  const patternCounts = Object.fromEntries(
    NICKNAME_PATTERNS.map((pattern) => [pattern.key, 0])
  ) as Record<(typeof NICKNAME_PATTERNS)[number]["key"], number>;

  let twoCharacterCount = 0;
  let invalidCount = 0;
  let lengthAnomalyCount = 0;

  for (const nickname of nicknames) {
    const length = Array.from(nickname).length;
    if (length === 2) twoCharacterCount += 1;
    if (length < 2 || length > 3) lengthAnomalyCount += 1;
    if (!isValidNickname(nickname)) invalidCount += 1;
    patternCounts[classifyNickname(nickname)] += 1;
  }

  const percentage = (count: number) => Number(((count / sampleSize) * 100).toFixed(2));
  const uniqueCount = new Set(nicknames).size;
  const duplicateCount = sampleSize - uniqueCount;
  const report = {
    sampleSize,
    lengthRatios: {
      twoCharacters: percentage(twoCharacterCount),
      threeCharacters: percentage(sampleSize - twoCharacterCount),
    },
    patternRatios: Object.fromEntries(
      Object.entries(patternCounts).map(([key, count]) => [key, percentage(count)])
    ),
    duplicateCount,
    duplicateRatio: percentage(duplicateCount),
    invalidCount,
    lengthAnomalyCount,
  };

  console.log("Nickname generation report:", JSON.stringify(report, null, 2));
  console.log("100 nickname samples:", nicknames.slice(0, 100).join("、"));

  assert.equal(invalidCount, 0);
  assert.equal(lengthAnomalyCount, 0);
  assert.ok(Math.abs(percentage(twoCharacterCount) - 30) <= 2);

  for (const pattern of NICKNAME_PATTERNS) {
    assert.ok(
      Math.abs(percentage(patternCounts[pattern.key]) - pattern.weight) <= 2,
      `${pattern.key} ratio is outside tolerance`
    );
  }
});
