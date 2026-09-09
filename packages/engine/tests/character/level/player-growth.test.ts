import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  clampPlayerLevel, getPlayerGrowthDetail, getPlayerGrowthProfile, getPlayerLevelCost,
  getPlayerLevelFromExp, getPlayerLevelStartExp, migratePlayerExperience,
  PLAYER_GROWTH_PARAMETERS, type PlayerGrowthProfile,
} from "@miu2d/types";

const originals = JSON.parse(readFileSync(new URL("../../../../../.branch-records/0909-player-growth-functions/original-levels.json", import.meta.url), "utf8")) as Record<string, Array<Record<string, number>>>;

describe("approved V2 continuous player curves", () => {
  it.each(Object.keys(PLAYER_GROWTH_PARAMETERS) as PlayerGrowthProfile[])("%s preserves its start and reaches every approved +5%% endpoint", profile => {
    const rows = originals[profile];
    const first = getPlayerGrowthDetail(profile, 1);
    const end = getPlayerGrowthDetail(profile, rows.length);
    for (const key of ["lifeMax", "thewMax", "manaMax", "attack", "defend", "evade"] as const) {
      expect(first[key]).toBe(rows[0][key]);
      expect(end[key]).toBe(Math.ceil(rows.at(-1)![key] * 1.05 - 1e-9));
    }
    let prev = first;
    for (let level = 2; level <= 1000; level++) {
      const detail = getPlayerGrowthDetail(profile, level);
      for (const key of ["lifeMax", "thewMax", "manaMax", "attack", "defend", "evade"] as const) {
        expect(detail[key]).toBeGreaterThanOrEqual(prev[key]);
        expect(Number.isSafeInteger(detail[key])).toBe(true);
      }
      const start = getPlayerLevelStartExp(profile, level);
      expect(Number.isSafeInteger(start)).toBe(true);
      expect(getPlayerLevelFromExp(profile, start - 1)).toBe(level - 1);
      expect(getPlayerLevelFromExp(profile, start)).toBe(level);
      prev = detail;
    }
    expect(prev.levelUpExp).toBe(0);
    expect(getPlayerLevelCost(profile, 1000)).toBe(0);
    expect(getPlayerLevelFromExp(profile, Number.MAX_SAFE_INTEGER)).toBe(1000);
  });

  it("clamps unsafe level inputs and leaves unconfigured games on legacy rules", () => {
    expect(clampPlayerLevel(1001)).toBe(1000);
    expect(clampPlayerLevel(-3)).toBe(1);
    expect(clampPlayerLevel(Number.NaN)).toBe(1);
    expect(getPlayerGrowthProfile("custom")).toBeNull();
    expect(getPlayerGrowthProfile("sword1", "hard")).toBe("sword1-hard");
  });

  it("migrates saved-level progress without reinterpreting totals or resurrecting old cap experience", () => {
    const profile = "sword1-easy";
    const start = getPlayerLevelStartExp(profile, 40);
    const cost = getPlayerLevelCost(profile, 40);
    expect(migratePlayerExperience(profile, 40, 1500, 1000, 2000)).toBe(start + Math.floor(cost / 2));
    expect(migratePlayerExperience(profile, 80, 0, 3000000, 0)).toBe(getPlayerLevelStartExp(profile, 80));
    expect(migratePlayerExperience(profile, 1000, 0, 0, 0)).toBe(getPlayerLevelStartExp(profile, 1000));
  });
});
