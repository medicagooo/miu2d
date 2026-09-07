import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMagic, preloadMagicAsf } from "../../src/magic/magic-config-loader";
import { createDefaultMagicData } from "../../src/magic/magic-defaults";
import { MAGIC_LIST_CONFIG } from "../../src/player/magic/magic-list-config";
import { PlayerMagicInventory } from "../../src/player/magic/player-magic-inventory";

vi.mock("../../src/magic/magic-config-loader", () => ({
  getMagic: vi.fn(),
  getMagicAtLevel: vi.fn((magic, level) => ({ ...magic, currentLevel: level })),
  preloadMagicAsf: vi.fn(async () => {}),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getMagic).mockImplementation((fileName) => ({
    ...createDefaultMagicData(),
    fileName,
    name: "Test magic",
  }));
});

describe("learning magic across inventory containers", () => {
  it.each(["panel", "bottom", "training", "hidden"] as const)(
    "preserves the existing %s item, progress and state",
    async (location) => {
      const inv = new PlayerMagicInventory();
      await inv.addMagic("learn.ini", { level: 7, exp: 123 });
      const original = inv.getItemInfo(1)!;
      original.remainColdMilliseconds = 456;
      if (location === "bottom") inv.assignMagicToBottomSlot(1, 0);
      if (location === "training") inv.exchangeListItem(1, MAGIC_LIST_CONFIG.xiuLianIndex);
      if (location === "hidden") {
        original.hideCount = 0;
        inv.setMagicHide("learn.ini", true);
      }
      const before = { ...original };
      const result = await inv.addMagic("LEARN.INI", { level: 1, exp: 0 });
      expect(result).toEqual({ status: "alreadyLearned", magic: original.magic });
      expect(original).toEqual(before);
      expect(inv.getItemInfo(1)).toBe(location === "panel" ? original : null);
      expect(inv.getBottomMagicInfo(0)).toBe(location === "bottom" ? original : null);
      expect(inv.getXiuLianMagic()).toBe(location === "training" ? original : null);
      expect(inv.getHiddenItemInfo(1)).toBe(location === "hidden" ? original : null);
      expect(getMagic).toHaveBeenCalledTimes(1);
      expect(preloadMagicAsf).toHaveBeenCalledTimes(1);
    }
  );

  it("recognizes an existing shortcut even when the panel is full", async () => {
    const inv = new PlayerMagicInventory();
    await inv.addMagic("learn.ini");
    inv.assignMagicToBottomSlot(1, 0);
    await inv.addMagicBatch(
      Array.from({ length: MAGIC_LIST_CONFIG.maxMagic }, (_, i) => ({
        fileName: `filler-${i}.ini`,
      }))
    );
    expect(inv.getFreeIndex()).toBe(-1);
    expect((await inv.addMagic("learn.ini")).status).toBe("alreadyLearned");
    expect(await inv.addMagic("new.ini")).toEqual({ status: "failed", reason: "full" });
  });

  it("checks both original and active replacement lists without changing either", async () => {
    const inv = new PlayerMagicInventory();
    await inv.addMagic("original.ini", { level: 7, exp: 123 });
    const original = inv.getItemInfo(1)!;
    await inv.replaceListTo("form.ini", ["form-magic.ini"]);
    const replacement = inv.getItemInfo(1)!;
    expect((await inv.addMagic("ORIGINAL.INI")).status).toBe("alreadyLearned");
    expect((await inv.addMagic(replacement.magic!.fileName)).status).toBe("alreadyLearned");
    expect(inv.getItemInfo(1)).toBe(replacement);
    inv.stopReplace();
    expect(inv.getItemInfo(1)).toBe(original);
    expect(original).toMatchObject({ level: 7, exp: 123 });
    expect(inv.getStoreMagics().filter(Boolean)).toHaveLength(1);
  });

  it("adds a new magic at the requested level and reports missing resources", async () => {
    const inv = new PlayerMagicInventory();
    expect(await inv.addMagic("new.ini", { level: 3, exp: 25 })).toMatchObject({
      status: "added",
      index: 1,
    });
    expect(inv.getItemInfo(1)).toMatchObject({ level: 3, exp: 25 });
    vi.mocked(getMagic).mockReturnValueOnce(null);
    expect(await inv.addMagic("missing.ini")).toEqual({ status: "failed", reason: "missingMagic" });
    expect(inv.getItemInfo(2)).toBeNull();
  });

  it("reserves the item before asynchronous preloading completes", async () => {
    const inv = new PlayerMagicInventory();
    let finish!: () => void;
    vi.mocked(preloadMagicAsf).mockImplementationOnce(
      () => new Promise<void>((resolve) => { finish = resolve; })
    );
    const first = inv.addMagic("learn.ini");
    const second = await inv.addMagic("LEARN.INI");
    expect(second.status).toBe("alreadyLearned");
    finish();
    expect((await first).status).toBe("added");
    expect(inv.getStoreMagics().filter(Boolean)).toHaveLength(1);
  });
});
