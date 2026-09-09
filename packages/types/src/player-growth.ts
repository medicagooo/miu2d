import type { LevelDetail } from "./level.js";
import { PLAYER_GROWTH_PARAMETERS } from "./player-growth-parameters.js";

export { PLAYER_GROWTH_PARAMETERS } from "./player-growth-parameters.js";
export const PLAYER_MAX_LEVEL = 1000;
export const PLAYER_GROWTH_VERSION = 1;
export type PlayerGrowthProfile = keyof typeof PLAYER_GROWTH_PARAMETERS;
export const PLAYER_GROWTH_STATS = [
  "lifeMax",
  "thewMax",
  "manaMax",
  "attack",
  "attack2",
  "attack3",
  "defend",
  "defend2",
  "defend3",
  "evade",
] as const;
export type PlayerGrowthStat = (typeof PLAYER_GROWTH_STATS)[number];
export type PlayerGrowthStats = Record<PlayerGrowthStat, number>;

/** Stored independently of flat character fields; old clients can ignore this metadata. */
export interface PlayerGrowthSave {
  version: number;
  profile: PlayerGrowthProfile;
  bonuses: Partial<PlayerGrowthStats>;
}

export function clampPlayerLevel(level: number): number {
  return Math.min(PLAYER_MAX_LEVEL, Math.max(1, Math.trunc(Number.isFinite(level) ? level : 1)));
}

/** Other games keep their authored legacy tables until they have approved coefficients. */
export function getPlayerGrowthProfile(
  game: string,
  difficulty: string = "easy"
): PlayerGrowthProfile | null {
  const id = `${game}-${difficulty}`;
  return Object.hasOwn(PLAYER_GROWTH_PARAMETERS, id) ? (id as PlayerGrowthProfile) : null;
}

export function isPlayerGrowthProfile(value: unknown): value is PlayerGrowthProfile {
  return typeof value === "string" && Object.hasOwn(PLAYER_GROWTH_PARAMETERS, value);
}

export function getPlayerLevelCost(profile: PlayerGrowthProfile, level: number): number {
  const l = clampPlayerLevel(level);
  if (l === PLAYER_MAX_LEVEL) return 0;
  const { k, q, r } = PLAYER_GROWTH_PARAMETERS[profile].experience;
  return Math.ceil(k * l ** q * Math.exp(r * (1 - Math.exp(-(((l - 1) / 40) ** 2)))));
}

// Only cumulative thresholds are memoized; attributes are always evaluated from the function.
const thresholds = new Map<PlayerGrowthProfile, readonly number[]>();
function getThresholds(profile: PlayerGrowthProfile): readonly number[] {
  let result = thresholds.get(profile);
  if (!result) {
    const sums = [0];
    for (let level = 1; level < PLAYER_MAX_LEVEL; level++) {
      sums.push(sums[level - 1] + getPlayerLevelCost(profile, level));
    }
    thresholds.set(profile, sums);
    result = sums;
  }
  return result;
}

/** Cumulative experience needed to enter this level; zero at level one. */
export function getPlayerLevelStartExp(profile: PlayerGrowthProfile, level: number): number {
  return getThresholds(profile)[clampPlayerLevel(level) - 1];
}

export function getPlayerLevelFromExp(profile: PlayerGrowthProfile, exp: number): number {
  const sums = getThresholds(profile);
  const safe = Number.isFinite(exp) ? Math.max(0, exp) : 0;
  let lo = 0;
  let hi = sums.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (sums[mid] <= safe) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

export function getPlayerGrowthDetail(
  profile: PlayerGrowthProfile,
  level: number
): LevelDetail & PlayerGrowthStats {
  const l = clampPlayerLevel(level);
  const attributes = PLAYER_GROWTH_PARAMETERS[profile].attributes;
  const result: LevelDetail & PlayerGrowthStats = {
    level: l,
    lifeMax: 0,
    thewMax: 0,
    manaMax: 0,
    attack: 0,
    attack2: 0,
    attack3: 0,
    defend: 0,
    defend2: 0,
    defend3: 0,
    evade: 0,
    levelUpExp: l === PLAYER_MAX_LEVEL ? 0 : getPlayerLevelStartExp(profile, l + 1),
    newMagic: "",
    newGood: "",
  };
  for (const key of Object.keys(attributes) as Array<keyof typeof attributes>) {
    const { a, b, p } = attributes[key];
    result[key] = Math.floor(a + b * ((1 + (l - 1) / 10) ** p - 1) + 1e-8);
  }
  return result;
}

/** Keep level and within-level progress, never reinterpret a legacy total as new levels. */
export function migratePlayerExperience(
  profile: PlayerGrowthProfile,
  level: number,
  exp: number,
  oldStart: number,
  oldEnd: number
): number {
  const l = clampPlayerLevel(level);
  const start = getPlayerLevelStartExp(profile, l);
  if (l === PLAYER_MAX_LEVEL) return start;
  const cost = getPlayerLevelCost(profile, l);
  // Identical curves must preserve integer progress exactly (15 / 100 * 100
  // can round below 15), including repeated easy/hard switches.
  if (Number.isFinite(exp) && oldEnd - oldStart === cost) {
    return start + Math.min(cost - 1, Math.max(0, Math.floor(exp - oldStart)));
  }
  const fraction =
    Number.isFinite(exp) && oldEnd > oldStart
      ? Math.min(1, Math.max(0, (exp - oldStart) / (oldEnd - oldStart)))
      : 0;
  // Staying at the saved level takes priority at old/exact threshold boundaries.
  return start + Math.min(cost - 1, Math.floor(cost * fraction));
}
