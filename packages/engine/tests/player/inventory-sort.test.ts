import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMagic } from "../../src/magic/magic-config-loader";
import { createDefaultMagicData } from "../../src/magic/magic-defaults";
import { EquipPosition, type Good, GoodKind, getGood } from "../../src/player/goods/good";
import { GoodsListManager, STORE_INDEX_END } from "../../src/player/goods/goods-list-manager";
import { MAGIC_LIST_CONFIG } from "../../src/player/magic/magic-list-config";
import { PlayerMagicInventory } from "../../src/player/magic/player-magic-inventory";
import { SaveDataCollector } from "../../src/storage/save-data-collector";

vi.mock("../../src/player/goods/good", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../src/player/goods/good")>(),
  getGood: vi.fn(),
}));
vi.mock("../../src/magic/magic-config-loader", () => ({
  getMagic: vi.fn(),
  getMagicAtLevel: vi.fn((magic) => magic),
  preloadMagicAsf: vi.fn(async () => {}),
}));

beforeEach(() => vi.clearAllMocks());

function putGood(inv: GoodsListManager, index: number, kind: GoodKind, cost: number, count = 1) {
  const good = { kind, cost, fileName: `item-${index}`, randAttr: { attack: index } } as unknown as Good;
  vi.mocked(getGood).mockReturnValueOnce(good);
  inv.setItemAtIndex(index, good.fileName, count);
  const item = inv.getItemInfo(index)!;
  item.remainColdMilliseconds = index;
  return item;
}

describe("goods auto sort", () => {
  it("sorts categories and unit prices ascending, keeps ties and item identity", () => {
    const inv = new GoodsListManager();
    const equipment = putGood(inv, 2, GoodKind.Equipment, 1);
    const expensive = putGood(inv, 4, GoodKind.Drug, 100);
    const cheap = putGood(inv, 5, GoodKind.Drug, 10, 99);
    const samePrice = putGood(inv, 8, GoodKind.Drug, 10);
    const task = putGood(inv, 9, GoodKind.Event, 0);
    const other = putGood(inv, 10, 99 as GoodKind, 0);
    const onUpdateView = vi.fn();
    const onEquiping = vi.fn();
    inv.setCallbacks({ onUpdateView, onEquiping });
    inv.sortInventory();
    const expected = [cheap, samePrice, expensive, equipment, task, other];
    expected.forEach((item, i) => expect(inv.getItemInfo(i + 1)).toBe(item));
    expect(cheap.count).toBe(99);
    expect(cheap.remainColdMilliseconds).toBe(5);
    expect(equipment.good).toHaveProperty("randAttr.attack", 2);
    expect(inv.getItemInfo(7)).toBeNull();
    expect(inv.getItemInfo(10)).toBeNull();
    expect(onUpdateView).toHaveBeenCalledTimes(1);
    expect(onEquiping).not.toHaveBeenCalled();
    inv.sortInventory();
    expected.forEach((item, i) => expect(inv.getItemInfo(i + 1)).toBe(item));
    const saved = SaveDataCollector.collectGoodsContainer(inv);
    expect(saved.bagItems[0]).toMatchObject({ fileName: cheap.good.fileName, count: 99 });
  });

  it("keeps equipment and shortcut items untouched while compacting a full bag", () => {
    const inv = new GoodsListManager();
    const equipped = putGood(inv, 1, GoodKind.Equipment, 200);
    inv.setEquipSlotSilent(EquipPosition.Head, equipped);
    putGood(inv, 2, GoodKind.Drug, 100);
    inv.moveBagToBottom(2, 0);
    const bottom = inv.getBottomItems()[0];
    for (let i = 1; i <= STORE_INDEX_END; i++) putGood(inv, i, GoodKind.Drug, STORE_INDEX_END - i);
    const cheapest = inv.getItemInfo(STORE_INDEX_END);
    inv.sortInventory();
    expect(inv.getItemInfo(1)).toBe(cheapest);
    expect(inv.getBottomItems()[0]).toBe(bottom);
    expect(inv.getEquipAtSlotIndex(0)).toBe(equipped);
    expect(inv.getItemInfo(STORE_INDEX_END)).not.toBeNull();
  });

  it("handles an empty bag", () => {
    const inv = new GoodsListManager();
    inv.sortInventory();
    expect(inv.getItemInfo(1)).toBeNull();
  });
});

async function putMagic(inv: PlayerMagicInventory, index: number, exp: number | undefined, maxLevel = 10) {
  const magic = {
    ...createDefaultMagicData(), fileName: `magic-${index}`, maxLevel,
    levelupExp: 0, // A learned max-level instance must still sort by the level 9 threshold.
    levels: new Map([[9, { levelupExp: exp }], [maxLevel, {}]]),
  };
  vi.mocked(getMagic).mockReturnValueOnce(magic);
  await inv.addMagic(magic.fileName, { index, level: 10, exp: 999 });
  return inv.getItemInfo(index)!;
}

describe("magic auto sort", () => {
  it("uses the cumulative level 9 threshold ascending, keeps unknowns last and ties stable", async () => {
    const inv = new PlayerMagicInventory();
    const high = await putMagic(inv, 2, 1000);
    const unknown = await putMagic(inv, 4, undefined);
    const low = await putMagic(inv, 6, 100);
    const tie = await putMagic(inv, 7, 100);
    const short = await putMagic(inv, 8, 50, 8);
    const zero = await putMagic(inv, 9, 0);
    low.remainColdMilliseconds = 45;
    const before = { ...low };
    const update = vi.fn();
    inv.setCallbacks({ onUpdateView: update });
    inv.sortInventory();
    const expected = [low, tie, high, unknown, short, zero];
    expected.forEach((item, i) => expect(inv.getItemInfo(i + 1)).toBe(item));
    expect(low).toEqual(before);
    expect(inv.getItemInfo(7)).toBeNull();
    expect(update).toHaveBeenCalledTimes(1);
    inv.sortInventory();
    expected.forEach((item, i) => expect(inv.getItemInfo(i + 1)).toBe(item));
    const saved = SaveDataCollector.collectMagicContainer(inv);
    expect(saved.panelMagics[0]).toMatchObject({ fileName: low.magic!.fileName, level: 10, exp: 999 });
  });

  it("leaves shortcuts, training, hidden items and current selection intact", async () => {
    const inv = new PlayerMagicInventory();
    const bottom = await putMagic(inv, 1, 100);
    const training = await putMagic(inv, 2, 200);
    const hidden = await putMagic(inv, 3, 300);
    inv.assignMagicToBottomSlot(1, 0);
    inv.exchangeListItem(2, MAGIC_LIST_CONFIG.xiuLianIndex);
    hidden.hideCount = 0;
    inv.setMagicHide(hidden.magic!.fileName, true);
    const selected = await putMagic(inv, 4, 1000);
    inv.setCurrentMagicInUse(selected);
    await putMagic(inv, 5, 500);
    inv.sortInventory();
    expect(inv.getBottomMagicInfo(0)).toBe(bottom);
    expect(inv.getXiuLianMagic()).toBe(training);
    expect(inv.getHiddenItemInfo(1)).toBe(hidden);
    expect(hidden.hideCount).toBe(1);
    expect(inv.getCurrentMagicInUse()).toBe(selected);
    expect(inv.getItemInfo(2)).toBe(selected);
  });

  it("sorts the active replacement panel without modifying the original", async () => {
    const inv = new PlayerMagicInventory();
    const original = await putMagic(inv, 5, 300);
    const makeForm = (fileName: string, exp: number) => ({
      ...createDefaultMagicData(), fileName,
      levels: new Map([[9, { levelupExp: exp }], [10, {}]]),
    });
    vi.mocked(getMagic).mockReturnValueOnce(makeForm("high", 500)).mockReturnValueOnce(makeForm("low", 50));
    await inv.replaceListTo("form", ["high", "low"]);
    const low = inv.getItemInfo(2);
    inv.sortInventory();
    expect(inv.getItemInfo(1)).toBe(low);
    inv.stopReplace();
    expect(inv.getItemInfo(5)).toBe(original);
    expect(inv.getItemInfo(1)).toBeNull();
  });
});
