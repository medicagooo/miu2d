import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPlayerGrowthDetail, getPlayerLevelCost, getPlayerLevelStartExp,
  PLAYER_GROWTH_STATS, type PlayerGrowthStats,
} from "@miu2d/types";
import { PlayerGrowth } from "../../src/player/player-growth";
import type { Player } from "../../src/player/player";

const context = vi.hoisted(() => ({ slug: "sword1", file: "level-easy.ini" }));
vi.mock("../../src/data/game-data-api", () => ({ getGameSlug: () => context.slug }));

function setup(level = 40) {
  const original = { ...getPlayerGrowthDetail("sword1-easy", level), lifeMax: 2000, levelUpExp: 2000 };
  const equipment = { attack: 25, lifeMax: 100 };
  const map = new Map([[level - 1, { ...original, levelUpExp: 1000 }], [level, original], [80, { ...original, levelUpExp: 0 }]]);
  const owner = {
    ...original, level, exp: 1500, life: 1050, lifeMax: 2100, thew: 0, mana: 0,
    attack: original.attack + equipment.attack + 17, name: "Player",
    levelManager: {
      getLevelFile: () => context.file, getLevelConfig: () => map,
      getMaxLevel: () => 80, getLevelDetail: (l: number) => map.get(l),
    },
    calculateBaseStats(detail: PlayerGrowthStats): PlayerGrowthStats {
      return Object.fromEntries(PLAYER_GROWTH_STATS.map(key => [key, detail[key] + (equipment[key as keyof typeof equipment] ?? 0)])) as PlayerGrowthStats;
    },
  };
  const notify = vi.fn();
  const growth = new PlayerGrowth(owner as unknown as Player, notify);
  return { owner, growth, notify, original, equipment };
}

beforeEach(() => { context.slug = "sword1"; context.file = "level-easy.ini"; });

describe("player-only runtime growth and save migration", () => {
  it("preserves permanent residuals from the saved snapshot after equipment callbacks mutate runtime fields", () => {
    const { owner, growth } = setup();
    growth.load({ ...owner }, true);
    owner.attack += 25; // asynchronous equip callback after snapshot
    growth.recalculate();
    const base = getPlayerGrowthDetail("sword1-easy", 40);
    expect(owner.attack).toBe(base.attack + 25 + 17);
    expect(owner.life).toBe(Math.floor((base.lifeMax + 100) / 2));
    expect(owner.thew).toBe(0);
    expect(owner.mana).toBe(0);
    expect(owner.exp).toBe(getPlayerLevelStartExp("sword1-easy", 40) + Math.floor(getPlayerLevelCost("sword1-easy", 40) / 2));
  });

  it("saves later script gains and loads repeatedly without accumulating bonuses or losing experience", () => {
    const { owner, growth } = setup();
    growth.load({ ...owner }, true);
    growth.recalculate();
    owner.attack += 11;
    const metadata = growth.save()!;
    expect(metadata.bonuses.attack).toBe(28);
    const saved = { ...owner, growth: metadata };
    const expected = { attack: owner.attack, exp: owner.exp, life: owner.life };
    for (let i = 0; i < 3; i++) {
      growth.load(saved, true);
      growth.recalculate();
      expect({ attack: owner.attack, exp: owner.exp, life: owner.life }).toEqual(expected);
    }
  });

  it("keeps permanent bonuses and within-level progress when difficulty changes", () => {
    const { owner, growth } = setup();
    growth.load({ ...owner }, true);
    growth.recalculate();
    const exp = owner.exp;
    context.file = "level-hard.ini";
    growth.recalculate();
    expect(owner.level).toBe(40);
    expect(owner.exp).toBe(exp); // sword1 difficulty experience is identical
    expect(owner.attack).toBe(getPlayerGrowthDetail("sword1-hard", 40).attack + 42);
  });

  it("preserves exact integer experience on repeated switches between identical curves", () => {
    const { owner, growth } = setup(1);
    growth.load({ ...owner }, true);
    growth.recalculate();
    owner.exp = 15;
    for (let i = 0; i < 10; i++) {
      context.file = i % 2 === 0 ? "level-hard.ini" : "level-easy.ini";
      growth.recalculate();
      expect(owner.exp).toBe(15);
    }
  });

  it("keeps living players at one HP during legacy migration and difficulty changes, while preserving death", () => {
    const { owner, growth, equipment } = setup(1);
    equipment.lifeMax = 0;
    owner.life = 1;
    owner.lifeMax = 10000;
    growth.load({ ...owner, growth: { version: 1, profile: "sword1-easy", bonuses: {} } }, true);
    growth.recalculate();
    expect(owner.life).toBe(1);
    context.file = "level-hard.ini";
    growth.recalculate();
    expect(owner.life).toBe(1);
    owner.life = 0;
    context.file = "level-easy.ini";
    growth.recalculate();
    expect(owner.life).toBe(0);

    // A legacy snapshot with no permanent max-HP bonus also shrinks on migration.
    const legacy = setup(1);
    legacy.owner.life = 1;
    legacy.growth.load({ ...legacy.owner }, true);
    legacy.growth.recalculate();
    expect(legacy.owner.life).toBe(1);
  });

  it("resumes old capped saves, handles exact thresholds and multi-level rewards, caps at 1000", () => {
    const { owner, growth, notify } = setup(80);
    owner.exp = 0; owner.levelUpExp = 0;
    growth.load({ ...owner }, true);
    growth.recalculate();
    expect(owner.levelUpExp).toBeGreaterThan(0);
    growth.addExp(getPlayerLevelCost("sword1-easy", 80));
    expect(owner.level).toBe(81);
    growth.addExp(Number.MAX_SAFE_INTEGER);
    expect(owner.level).toBe(1000);
    expect(owner.levelUpExp).toBe(0);
    const exp = owner.exp;
    growth.addExp(100);
    expect(owner.exp).toBe(exp);
    expect(notify).toHaveBeenCalledTimes(2);
    growth.levelUpTo(5000);
    expect(owner.level).toBe(1000);
  });

  it("does not install formula rows into the manager shared with partners", () => {
    const { owner, growth, original } = setup();
    growth.load({ ...owner }, true);
    growth.recalculate();
    expect(owner.levelManager.getMaxLevel()).toBe(80);
    expect(owner.levelManager.getLevelDetail(40)).toBe(original);
    context.slug = "custom";
    expect(growth.addExp(100)).toBe(false);
  });
});
