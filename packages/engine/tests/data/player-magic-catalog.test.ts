/**
 * AI-TRACE: Contract coverage for the shared player-eligibility view used by the debug picker
 * and `DebugManager.addAllMagics`. API ownership must remain untouched while every valid NPC
 * magic becomes player-usable, duplicates are suppressed, and `Relation.Ini` stays excluded.
 */
import { buildPlayerMagicCatalog, canPlayerAddMagic } from "../../src/data/player-magic-catalog";
import { describe, expect, it } from "vitest";

describe("player magic catalog", () => {
  const basicAttacks = ["弓箭", "蜂王毒刺", "两格长枪", "强盗飞刀", "刀", "飞刀", "蝙蝠", "长剑", "暗器2", "棍棒", "拳脚", "火箭", "冰弓箭"];

  it.each(["sword1", "demo", "sword2"])("excludes exact basic attacks in %s regardless of ownership", (slug) => {
    const entries = [...basicAttacks.map((name) => ({ key: `magic-${name}.ini` })),
      { key: "player-magic-长剑.ini" }];
    expect(buildPlayerMagicCatalog({ player: entries, npc: entries }, slug)).toEqual([]);
    for (const entry of entries) {
      expect(canPlayerAddMagic(` INI\\MAGIC\\${entry.key.toUpperCase()} `, slug)).toBe(false);
    }
    expect(canPlayerAddMagic("magic-柳叶飞刀.ini", slug)).toBe(true);
    expect(canPlayerAddMagic("magic-百剑诀.ini", slug)).toBe(true);
  });

  it("limits numbered archery exclusions to sword1 and preserves other/legacy games", () => {
    for (const key of ["player-magic1-长剑.ini", "magic060_射箭.ini", "magic062_弓箭.ini", "magic057_梅花镖.ini", "magic058_袖箭.ini"]) {
      expect(canPlayerAddMagic(key, "sword1")).toBe(false);
      expect(canPlayerAddMagic(key, "demo")).toBe(true);
    }
    for (const slug of ["unknown", undefined]) {
      expect(canPlayerAddMagic("magic-长剑.ini", slug)).toBe(true);
      expect(canPlayerAddMagic("player-magic-长剑.ini", slug)).toBe(true);
    }
  });
  it("combines player and NPC magics while preserving player-first order", () => {
    const player = { key: "player-magic-长剑.ini", name: "长剑", userType: "player" };
    const npc = { key: "magic-百剑诀.ini", name: "百剑诀", userType: "npc" };

    expect(buildPlayerMagicCatalog({ player: [player], npc: [npc] })).toEqual([player, npc]);
  });

  it("excludes Relation.Ini and de-duplicates normalized keys", () => {
    const first = { key: "INI/MAGIC/MAGIC-飞刀.INI" };
    const duplicate = { key: "ini\\magic\\magic-飞刀.ini" };
    const relation = { key: "Ini/Magic/Relation.Ini" };

    expect(buildPlayerMagicCatalog({ player: [first], npc: [duplicate, relation] })).toEqual([
      first,
    ]);
  });

  it("returns an empty catalog before game data is available", () => {
    expect(buildPlayerMagicCatalog(null)).toEqual([]);
  });
});
