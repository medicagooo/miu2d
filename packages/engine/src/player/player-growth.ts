import {
  clampPlayerLevel,
  getPlayerGrowthDetail,
  getPlayerGrowthProfile,
  getPlayerLevelCost,
  getPlayerLevelFromExp,
  getPlayerLevelStartExp,
  isPlayerGrowthProfile,
  migratePlayerExperience,
  PLAYER_GROWTH_STATS,
  PLAYER_GROWTH_VERSION,
  PLAYER_MAX_LEVEL,
  type PlayerGrowthProfile,
  type PlayerGrowthSave,
  type PlayerGrowthStats,
} from "@miu2d/types";
import { difficultyFromLevelFile } from "../character/level/difficulty";
import { getGameSlug } from "../data/game-data-api";
import type { PlayerSaveData } from "../storage/save-types";
import type { Player } from "./player";

type Detail = ReturnType<typeof getPlayerGrowthDetail>;
type Snapshot = Partial<
  Pick<
    PlayerSaveData,
    keyof PlayerGrowthStats | "level" | "exp" | "levelUpExp" | "life" | "thew" | "mana"
  >
> & { growth?: PlayerGrowthSave };

/** Player-only adapter: never installs formula rows into the LevelManager shared by partners.
 * Save data is captured before async equipment loading; legacy residuals are computed only
 * after containers are ready. A residual preserves script/item permanent changes, including
 * values whose historical provenance cannot be reconstructed (not a corruption cleaner).
 */
export class PlayerGrowth {
  private baseline: Detail | null = null;
  private appliedProfile: PlayerGrowthProfile | null = null;
  private pending: { data: Snapshot; saved: boolean } | null = null;

  constructor(
    private readonly player: Player,
    private readonly onLevelUp: () => void
  ) {}

  get profile(): PlayerGrowthProfile | null {
    return getPlayerGrowthProfile(
      getGameSlug(),
      difficultyFromLevelFile(this.player.levelManager.getLevelFile()) ?? "easy"
    );
  }

  load(data: Snapshot, saved: boolean): void {
    const fields = [
      ...PLAYER_GROWTH_STATS,
      "level",
      "exp",
      "levelUpExp",
      "life",
      "thew",
      "mana",
    ] as const;
    this.pending = {
      data: {
        ...Object.fromEntries(fields.map((key) => [key, data[key]])),
        growth: data.growth ? structuredClone(data.growth) : undefined,
      },
      saved,
    };
    this.baseline = null;
    this.appliedProfile = null;
  }

  private readStats(): PlayerGrowthStats {
    return Object.fromEntries(
      PLAYER_GROWTH_STATS.map((key) => [key, this.player[key]])
    ) as PlayerGrowthStats;
  }

  private bonuses(): Partial<PlayerGrowthStats> {
    if (!this.baseline) return {};
    const total = this.player.calculateBaseStats(this.baseline);
    return Object.fromEntries(
      PLAYER_GROWTH_STATS.map((key) => [key, this.player[key] - total[key]])
    );
  }

  save(): PlayerGrowthSave | undefined {
    if (!this.profile) return undefined;
    this.ensure();
    return {
      version: PLAYER_GROWTH_VERSION,
      profile: this.appliedProfile!,
      bonuses: this.bonuses(),
    };
  }

  ensure(): void {
    if (this.pending || !this.baseline || this.appliedProfile !== this.profile) this.recalculate();
  }

  /** Rebuild with permanent deltas; migration keeps level and fractional experience progress. */
  recalculate(): boolean {
    const profile = this.profile;
    if (!profile) return false;
    const player = this.player;
    const pending = this.pending;
    const data: Snapshot = pending?.data ?? {
      ...this.readStats(),
      level: player.level,
      exp: player.exp,
      levelUpExp: player.levelUpExp,
      life: player.life,
      thew: player.thew,
      mana: player.mana,
    };
    const level = clampPlayerLevel(player.level);
    const detail = getPlayerGrowthDetail(profile, level);
    const savedGrowth = data.growth;
    const hasGrowth =
      savedGrowth?.version === PLAYER_GROWTH_VERSION && isPlayerGrowthProfile(savedGrowth.profile);
    let bonuses: Partial<PlayerGrowthStats> = pending ? {} : this.bonuses();
    let oldProfile = this.appliedProfile;
    if (pending && hasGrowth) {
      bonuses = savedGrowth.bonuses ?? {};
      oldProfile = savedGrowth.profile;
    } else if (pending?.saved) {
      const oldDetail = player.levelManager.getLevelDetail(data.level ?? level);
      if (oldDetail) {
        const oldTotal = player.calculateBaseStats(oldDetail);
        bonuses = Object.fromEntries(
          PLAYER_GROWTH_STATS.map((key) => [
            key,
            Number.isFinite(data[key]) ? data[key]! - oldTotal[key] : 0,
          ])
        );
      }
    }
    const total = player.calculateBaseStats(detail);
    for (const key of PLAYER_GROWTH_STATS) {
      const extra = bonuses[key];
      player[key] = Math.max(0, total[key] + (Number.isFinite(extra) ? extra! : 0));
    }
    // Preserve zero/death and resource ratios. A living player must retain at least
    // one HP: zero HP without the death transition would bypass takeDamage.
    for (const [current, max] of [
      ["life", "lifeMax"],
      ["thew", "thewMax"],
      ["mana", "manaMax"],
    ] as const) {
      const oldMax = data[max] ?? player[max];
      const oldValue = data[current] ?? player[current];
      const ratio = oldMax > 0 ? Math.min(1, Math.max(0, oldValue / oldMax)) : 0;
      player[current] = Math.floor(player[max] * ratio + 1e-8);
      if (current === "life" && oldValue > 0 && player.lifeMax > 0) {
        player.life = Math.max(1, player.life);
      }
    }
    player.level = level;
    const exp = data.exp ?? player.exp;
    if (oldProfile === profile) {
      player.exp = this.clampExperience(profile, level, exp);
    } else if (oldProfile) {
      player.exp = migratePlayerExperience(
        profile,
        level,
        exp,
        getPlayerLevelStartExp(oldProfile, level),
        level === PLAYER_MAX_LEVEL ? 0 : getPlayerLevelStartExp(oldProfile, level + 1)
      );
    } else {
      const config = player.levelManager.getLevelConfig();
      let start = 0;
      // Legacy tables may contain decreasing thresholds: use an attained lower bound.
      for (const [key, value] of config ?? []) {
        if (key < level) start = Math.max(start, value.levelUpExp);
      }
      const end =
        level >= player.levelManager.getMaxLevel()
          ? 0
          : (config?.get(level)?.levelUpExp ?? data.levelUpExp ?? 0);
      player.exp = migratePlayerExperience(profile, level, exp, start, end);
    }
    player.levelUpExp = detail.levelUpExp;
    this.baseline = detail;
    this.appliedProfile = profile;
    this.pending = null;
    return true;
  }

  private clampExperience(profile: PlayerGrowthProfile, level: number, exp: number): number {
    const start = getPlayerLevelStartExp(profile, level);
    if (level === PLAYER_MAX_LEVEL) return start;
    return Math.max(
      start,
      Math.min(
        start + getPlayerLevelCost(profile, level) - 1,
        Number.isFinite(exp) ? Math.floor(exp) : start
      )
    );
  }

  addExp(amount: number): boolean {
    const profile = this.profile;
    if (!profile) return false;
    this.ensure();
    const player = this.player;
    if (player.level === PLAYER_MAX_LEVEL || !Number.isFinite(amount) || amount <= 0) return true;
    player.exp = Math.min(
      getPlayerLevelStartExp(profile, PLAYER_MAX_LEVEL),
      player.exp + Math.floor(amount)
    );
    const level = getPlayerLevelFromExp(profile, player.exp);
    if (level > player.level) {
      this.levelUpTo(level);
      this.onLevelUp();
    }
    return true;
  }

  levelUpTo(value: number): boolean {
    const profile = this.profile;
    if (!profile) return false;
    this.ensure();
    const player = this.player;
    const level = clampPlayerLevel(value);
    const detail = getPlayerGrowthDetail(profile, level);
    for (const key of PLAYER_GROWTH_STATS)
      player[key] = Math.max(0, player[key] + detail[key] - this.baseline![key]);
    player.level = level;
    player.exp = this.clampExperience(profile, level, player.exp);
    player.levelUpExp = detail.levelUpExp;
    if (level !== this.baseline!.level) {
      player.life = player.lifeMax;
      player.thew = player.thewMax;
      player.mana = player.manaMax;
    }
    this.baseline = detail;
    return true;
  }
}
