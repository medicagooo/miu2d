import { beforeEach, describe, expect, it, vi } from "vitest";
import { DebugManager } from "../../src/debug/debug-manager";
import { setEngineContext, type EngineContext } from "../../src/core/engine-context";

const mocks = vi.hoisted(() => ({ load: vi.fn(), keys: vi.fn(), config: vi.fn() }));
vi.mock("../../src/script/parser", () => ({ loadScript: mocks.load }));
vi.mock("../../src/npc/npc-config-cache", () => ({
  getAllNpcConfigKeys: mocks.keys, getNpcConfigFromCache: mocks.config,
}));

describe("debug catalog and object interactions", () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it("lists off-scene NPCs and uses inline resource keys without mutating shared configs", async () => {
    const config = { name: "侠客", kind: 1, npcIni: "", stats: { life: 123 } };
    mocks.keys.mockReturnValue(["npc-侠客.ini"]);
    mocks.config.mockReturnValue(config);
    const add = vi.fn(async () => ({ name: "侠客" }));
    setEngineContext({ player: { tilePosition: { x: 12, y: 34 } },
      npcManager: { addNpcWithConfig: add }, guiManager: { showMessage: vi.fn() },
    } as unknown as EngineContext);
    const debug = new DebugManager();
    const entries = await debug.getNpcCatalogEntries();
    expect(entries).toMatchObject([{ key: "npc-侠客.ini", name: "侠客", kind: 1 }]);
    await debug.addNpcFromCatalogEntry(entries[0].data);
    expect(add).toHaveBeenCalledWith({ ...config, npcIni: "npc-侠客.ini" }, 12, 34);
    expect(config.npcIni).toBe("");
    expect(add.mock.calls[0][0]).not.toBe(config);
  });

  it.each(["cancel", "scene", "removed", "busy"])("does not execute stale object after script loading: %s", async (reason) => {
    let loaded!: (value: object) => void;
    mocks.load.mockReturnValue(new Promise((resolve) => { loaded = resolve; }));
    let stop = false;
    let map = "map1";
    let busy = false;
    const obj = { id: "obj1", scriptFile: "chest.txt", canInteract: () => true };
    const getObj = vi.fn(() => obj);
    const run = vi.fn();
    setEngineContext({ getCurrentMapName: () => map, getScriptBasePath: () => "scripts/",
      objManager: { getObjById: getObj }, runScript: run,
    } as unknown as EngineContext);
    const debug = new DebugManager();
    debug.setExtendedSystems({ isRunning: () => busy } as never, () => ({}), () => ({ mapName: map, mapPath: "" }));
    const pending = debug.interactWithObj("obj1", () => stop);
    expect(debug.isScriptRunning()).toBe(true);
    await expect(debug.interactWithObj("obj1")).rejects.toThrow("脚本正在执行");
    if (reason === "cancel") stop = true;
    if (reason === "scene") map = "map2";
    if (reason === "removed") getObj.mockReturnValue({ ...obj });
    if (reason === "busy") busy = true;
    loaded({});
    if (reason === "busy") await expect(pending).rejects.toThrow("其他脚本已开始");
    else await pending;
    expect(run).not.toHaveBeenCalled();
    busy = false;
    expect(debug.isScriptRunning()).toBe(false);
  });
});
