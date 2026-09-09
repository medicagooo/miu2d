import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPlayerGrowthDetail, getPlayerLevelCost, getPlayerLevelStartExp } from "@miu2d/types";
import { Player } from "../../src/player/player";
import { setEngineContext, type EngineContext } from "../../src/core/engine-context";
import { SaveDataCollector } from "../../src/storage/save-data-collector";
import { loadPlayerFromJSON } from "../../src/storage/loader-data-helpers";
import { toLegacyPartnerProgress } from "../../src/storage/partner-growth";

vi.mock("../../src/data/game-data-api", async importOriginal => ({
  ...await importOriginal<typeof import("../../src/data/game-data-api")>(),
  getGameSlug: () => "sword1",
}));

beforeEach(() => {
  setEngineContext({ guiManager: { showMessage: vi.fn() }, notifyPlayerStateChanged: vi.fn() } as unknown as EngineContext);
  vi.spyOn(Player.prototype, "setNpcIni").mockResolvedValue();
  vi.spyOn(Player.prototype, "applyConfigSetters").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); setEngineContext(null); });

async function makePlayer(level: number) {
  const player = new Player();
  const detail = { ...getPlayerGrowthDetail("sword1-easy", 1), exp: 0, life: 100 };
  player.levelManager.applyConfig("level-easy.ini", new Map([
    [1, { ...detail, levelUpExp: 100 }], [79, { ...detail, levelUpExp: 1000 }], [80, { ...detail, levelUpExp: 0 }],
  ]));
  await player.initializeFromLevelConfig(level);
  return player;
}

describe("real Player public entrypoints", () => {
  it("uses exact formula boundaries, keeps magic experience at cap, and limits debug/script levels", async () => {
    const player = await makePlayer(999);
    const magic = vi.spyOn(player.getPlayerMagicInventory(), "awardKillExp");
    player.addExp(getPlayerLevelCost("sword1-easy", 999), true);
    expect(player.level).toBe(1000);
    expect(player.levelUpExp).toBe(0);
    const exp = player.exp;
    player.addExp(100, true);
    expect(player.exp).toBe(exp);
    expect(magic).toHaveBeenCalledTimes(2);
    expect(player.levelUp()).toBe(false);
    player.setLevelTo(5000);
    expect(player.level).toBe(1000);
    player.setLevelTo(20);
    expect(player.lifeMax).toBe(getPlayerGrowthDetail("sword1-easy", 20).lifeMax);
  });

  it("roundtrips actual save collection/loading without the old cap cleanup, preserving permanent gains and death", async () => {
    const player = await makePlayer(80);
    player.attack += 123;
    player.life = 0;
    player.isDeath = true;
    const saved = SaveDataCollector.collectPlayerData(player);
    expect(saved.growth?.bonuses.attack).toBe(123);
    await loadPlayerFromJSON(saved, player);
    player.recalculateBaseStats();
    expect(player.exp).toBe(getPlayerLevelStartExp("sword1-easy", 80));
    expect(player.levelUpExp).toBeGreaterThan(0);
    expect(player.attack).toBe(saved.attack);
    expect(player.life).toBe(0);
    expect(player.isDeath).toBe(true);
    expect(SaveDataCollector.collectPlayerData(player).growth).toEqual(saved.growth);
  });

  it("projects a high-level former player into capped legacy partner progress without mutating its player snapshot", async () => {
    const player = await makePlayer(500);
    const saved = SaveDataCollector.collectPlayerData(player);
    const partner = toLegacyPartnerProgress(saved, player.levelManager);
    expect(partner.level).toBe(80);
    expect(partner.exp).toBe(0);
    expect(partner.levelUpExp).toBe(0);
    expect(partner.growth).toBeUndefined();
    expect(saved.level).toBe(500);
    expect(saved.growth).toBeDefined();
  });
});
