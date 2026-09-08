import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEffectAmount } from "../../src/combat/effect-calc";
import { getMagicAtLevel } from "../../src/magic/magic-config-loader";
import { createDefaultMagicData } from "../../src/magic/magic-defaults";
import { type MagicData, MagicMoveKind, createDefaultMagicItemInfo } from "../../src/magic/types";
import { addMagicExpDirect } from "../../src/player/magic/magic-list-experience";
import { PlayerMagicInventory } from "../../src/player/magic/player-magic-inventory";
import { MagicListReplace } from "../../src/player/magic/magic-list-replace";
import { repairPlayerMagicProgression } from "../../src/player/magic/player-magic-progression";

const fixture = vi.hoisted(() => ({ slug: "sword1", owner: "player", magics: new Map<string, MagicData>() }));
vi.mock("../../src/data/game-data-api", () => ({
  getGameSlug: () => fixture.slug,
  getMagicsData: () => ({ player: [...fixture.magics.keys()].map(key => ({ key, userType: fixture.owner })), npc: [] }),
  isGameDataLoaded: () => true,
  registerCacheBuilder: () => {},
}));
vi.mock("../../src/magic/magic-config-loader", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/magic/magic-config-loader")>();
  return { ...original, getMagic: vi.fn((key: string) => {
    const name = key.replaceAll("\\", "/").split("/").at(-1)!;
    const magic = fixture.magics.get(name);
    return magic ? { ...magic } : null;
  }), preloadMagicAsf: vi.fn(async () => {}) };
});

function placeholder(key = "magic005_掌上生雷.ini"): MagicData {
  return {
    ...createDefaultMagicData(), fileName: key, name: key, speed: 8, maxLevel: 10, moveKind: MagicMoveKind.SingleMove,
    levels: new Map(Array.from({ length: 10 }, (_, i) => [i + 1, { effect: 0, manaCost: 0, levelupExp: 0 }])),
  };
}

beforeEach(() => {
  fixture.slug = "sword1";
  fixture.owner = "player";
  fixture.magics.clear();
  vi.clearAllMocks();
});

describe("audited player progression", () => {
  it.each([
    ["magic005_掌上生雷.ini", 300, 36, 5000],
    ["magic013_天外飞仙.ini", 660, 72, 32000],
  ] as const)("gives %s a complete curve without changing level-one combat or shared data", (key, bonus, mana, exp) => {
    const source = placeholder(key);
    const before = structuredClone(source);
    const repaired = repairPlayerMagicProgression(source, { gameSlug: "sword1", userType: "player" });
    expect(source).toEqual(before);
    expect(repaired.levels).not.toBe(source.levels);
    const first = getMagicAtLevel(repaired, 1);
    const last = getMagicAtLevel(repaired, 10);
    expect(first).toMatchObject({ effect: 0, effectExt: 0, manaCost: 0, speed: source.speed, moveKind: source.moveKind });
    expect(last).toMatchObject({ effect: 0, effectExt: bonus, manaCost: mana, levelupExp: 0, moveKind: source.moveKind });
    expect(repaired.levels?.get(9)?.levelupExp).toBe(exp);
    for (const attack of [50, 500, 2000]) {
      const actor = { isPlayer: true, attack, realAttack: attack + 25, attack2: 0, attack3: 0, effectFormulaAdditive: true };
      let previous = getEffectAmount(first, actor);
      for (let level = 2; level <= 10; level++) {
        const amount = getEffectAmount(getMagicAtLevel(repaired, level), actor);
        expect(amount).toBeGreaterThan(previous);
        previous = amount;
      }
      expect(previous).toBe(actor.realAttack + bonus);
    }
    expect(repairPlayerMagicProgression(repaired, { gameSlug: "sword1", userType: "player" })).toBe(repaired);
  });

  it("upgrades by cumulative experience from 1 to 10 and then stops", () => {
    const base = repairPlayerMagicProgression(placeholder(), { gameSlug: "sword1", userType: "player" });
    const item = createDefaultMagicItemInfo(getMagicAtLevel(base, 1), 1);
    const deps = { callbacks: {}, updateView: vi.fn() };
    for (let level = 1; level < 10; level++) {
      const threshold = item.magic!.levelupExp;
      expect(threshold).toBeGreaterThan(item.exp);
      expect(addMagicExpDirect(deps, item, threshold - item.exp)).toBe(true);
      expect(item.level).toBe(level + 1);
    }
    expect(item.exp).toBe(5000);
    expect(addMagicExpDirect(deps, item, 100000)).toBe(false);
    expect(item.level).toBe(10);
    expect(item.exp).toBe(5000);
  });

  it("does not alter other games, non-player skills, story/items, or author-edited data", () => {
    for (const context of [{ gameSlug: "demo", userType: "player" }, { gameSlug: "sword2", userType: "player" }, { gameSlug: "sword1", userType: "npc" }, { gameSlug: "sword1" }]) {
      const source = placeholder();
      expect(repairPlayerMagicProgression(source, context)).toBe(source);
    }
    for (const key of ["magic011_天魔解体大法.ini", "magic057_梅花镖.ini", "magic058_袖箭.ini", "player-levelup-1.ini", "magic-弓箭.ini"]) {
      const source = placeholder(key);
      expect(repairPlayerMagicProgression(source, { gameSlug: "sword1", userType: "player" })).toBe(source);
    }
    const edited = placeholder();
    edited.levels!.get(4)!.effect = 99;
    expect(repairPlayerMagicProgression(edited, { gameSlug: "sword1", userType: "player" })).toBe(edited);
    const customBase = placeholder();
    customBase.speed = 15;
    expect(repairPlayerMagicProgression(customBase, { gameSlug: "sword1", userType: "player" })).toBe(customBase);
  });

  it.each([
    ["sword1", "magic012_碧海潮生.ini", [400,300,1400,2200,3500,4200,5000,9000,13000], [400,900,1400,2200,3500,4200,5000,9000,13000]],
    ["sword1", "magic018_潮生碧海.ini", [800,800,1500,2000,2800,3800,4800,6000,7800], [800,1150,1500,2000,2800,3800,4800,6000,7800]],
    ["sword1", "magic024_幻影飞狐.ini", [250,8000,18000,28000,38000,49000,15000,24000,32000], [250,8000,18000,28000,38000,49000,60000,71000,82000]],
    ["sword1", "magic满江红.ini", [20000,30000,40000,50000,50000,50000,50000,50000,50000], [20000,30000,40000,50000,60000,70000,80000,90000,100000]],
    ["sword1", "player-magic-云生结海.ini", [600,2000,4400,8400,14500,24000,40000,40000,64000], [600,2000,4400,8400,14500,24000,40000,52000,64000]],
    ["demo", "player-magic-云生结海.ini", [600,2000,4400,8400,14500,24000,40000,40000,64000], [600,2000,4400,8400,14500,24000,40000,52000,64000]],
  ] as const)("repairs only the exact legacy curve for %s/%s", (gameSlug, key, before, after) => {
    const source = placeholder(key);
    for (let level = 1; level <= 9; level++) source.levels!.set(level, { levelupExp: before[level - 1], effect: -100 + level, manaCost: level * 3, speed: 5 });
    const snapshot = structuredClone(source);
    const repaired = repairPlayerMagicProgression(source, { gameSlug, userType: "player" });
    expect(source).toEqual(snapshot);
    for (let level = 1; level <= 9; level++) {
      expect(repaired.levels!.get(level)).toEqual({ ...source.levels!.get(level), levelupExp: after[level - 1] });
      if (level > 1) expect(after[level - 1]).toBeGreaterThan(after[level - 2]);
    }
    expect(repairPlayerMagicProgression(source, { gameSlug, userType: "npc" })).toBe(source);
    expect(repairPlayerMagicProgression(source, { gameSlug: "sword2", userType: "player" })).toBe(source);
    expect(repairPlayerMagicProgression(repaired, { gameSlug, userType: "player" })).toBe(repaired);
    source.levels!.get(1)!.levelupExp = 123;
    expect(repairPlayerMagicProgression(source, { gameSlug, userType: "player" })).toBe(source);
  });
});

describe("player inventory loading integration", () => {
  it("reloads author edits in active, inactive and hidden replacement lists without losing progress", async () => {
    const source = placeholder();
    fixture.magics.set(source.fileName, source);
    const player = new PlayerMagicInventory(true);
    await player.deserializeReplaceLists({ isInReplaceMagicList: true, currentReplaceMagicListFilePath: "active.ini", replaceLists: {
      "active.ini": [{ index: 1, fileName: source.fileName, level: 5, exp: 1100 }],
      "inactive.ini": [{ index: 1, fileName: source.fileName, level: 7, exp: 2200 }, { index: 1002, fileName: source.fileName, level: 8, exp: 3300, hideCount: 3 }],
    } });
    const active = player.getItemInfo(1)!;
    active.remainColdMilliseconds = 123;
    expect(active.magic?.effectExt).toBe(90);
    for (let level = 1; level <= 10; level++) {
      source.levels!.set(level, { effect: 1000 + level, manaCost: 5, levelupExp: level < 10 ? level * 1000 : 0 });
    }
    await player.reloadAllMagics();
    expect(active).toMatchObject({ level: 5, exp: 1100, remainColdMilliseconds: 123, magic: { effect: 1005, effectExt: 0, manaCost: 5 } });
    await player.replaceListTo("inactive.ini", []);
    expect(player.getItemInfo(1)).toMatchObject({ level: 7, exp: 2200, magic: { effect: 1007, effectExt: 0 } });
    // The save metadata must survive the same reload; hidden config is tested directly below.
    const replacement = player.serializeReplaceLists() as { replaceLists: Record<string, { fileName: string; index: number; level: number; exp: number; hideCount: number }[]> };
    expect(replacement.replaceLists["inactive.ini"].find(item => item.index === 1002)).toMatchObject({ level: 8, exp: 3300, hideCount: 3 });
  });

  it("refreshes the configuration inside a hidden replacement slot", async () => {
    const source = placeholder();
    const replace = new MagicListReplace(() => repairPlayerMagicProgression(source, { gameSlug: "sword1", userType: "player" }));
    await replace.deserialize({ isInReplaceMagicList: true, currentReplaceMagicListFilePath: "hidden.ini", replaceLists: {
      "hidden.ini": [{ index: 1002, fileName: source.fileName, level: 8, exp: 3300, hideCount: 3 }],
    } });
    const item = replace.getActiveHideList([])[2]!;
    expect(item.magic?.effectExt).toBe(195);
    source.levels!.get(8)!.effect = 999;
    expect(replace.reloadAllMagics()).toBe(1);
    expect(item).toMatchObject({ level: 8, exp: 3300, hideCount: 3, magic: { effect: 999, effectExt: 0 } });
  });

  it("opts in only the player inventory and keeps the source cache untouched", async () => {
    const source = placeholder();
    fixture.magics.set(source.fileName, source);
    const player = new PlayerMagicInventory(true);
    const companion = new PlayerMagicInventory();
    await player.addMagic(source.fileName, { level: 5, exp: 123 });
    await companion.addMagic(source.fileName, { level: 5, exp: 123 });
    expect(player.getItemInfo(1)?.magic?.effectExt).toBe(90);
    expect(companion.getItemInfo(1)?.magic?.effectExt).toBe(0);
    expect(source.levels!.get(5)!.levelupExp).toBe(0);
    expect(player.getItemInfo(1)?.exp).toBe(123);
  });

  it("loads panel, hidden, shortcut, training and replacement saves with the same curve", async () => {
    const source = placeholder();
    fixture.magics.set(source.fileName, source);
    const player = new PlayerMagicInventory(true);
    await player.addMagicBatch([{ fileName: source.fileName, index: 1, level: 4, exp: 600 }]);
    await player.addHiddenMagicBatch([{ fileName: source.fileName, index: 2, level: 5, exp: 999, hideCount: 2 }]);
    const shortcut = createDefaultMagicItemInfo(getMagicAtLevel(source, 6), 6);
    shortcut.exp = 1500;
    shortcut.remainColdMilliseconds = 789;
    player.setBottomSlotForLoad(0, shortcut);
    const training = createDefaultMagicItemInfo(getMagicAtLevel(source, 7), 7);
    training.exp = 2222;
    player.setXiuLianForLoad(training);
    expect(player.getItemInfo(1)?.magic?.effectExt).toBe(65);
    expect(player.getHiddenItemInfo(2)?.magic?.effectExt).toBe(90);
    expect(player.getBottomMagicInfo(0)?.magic?.effectExt).toBe(120);
    expect(player.getXiuLianMagic()?.magic?.effectExt).toBe(155);
    await player.reloadAllMagics();
    expect(shortcut).toMatchObject({ level: 6, exp: 1500, remainColdMilliseconds: 789, magic: { effectExt: 120 } });
    expect(training).toMatchObject({ level: 7, exp: 2222, magic: { effectExt: 155 } });
    await player.replaceListTo("form.ini", [source.fileName]);
    expect(player.getItemInfo(1)?.magic?.levelupExp).toBe(100);
    await player.deserializeReplaceLists({ isInReplaceMagicList: true, currentReplaceMagicListFilePath: "saved.ini", replaceLists: {
      "saved.ini": [{ index: 1, fileName: source.fileName, level: 8, exp: 3000 }],
    } });
    expect(player.getItemInfo(1)).toMatchObject({ level: 8, exp: 3000, magic: { effectExt: 195 } });
  });
});
