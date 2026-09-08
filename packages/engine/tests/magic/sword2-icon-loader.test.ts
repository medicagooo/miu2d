import { describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  rebuild: undefined as (() => void) | undefined,
  slug: "sword2",
  player: [
    { key: "magic-暴雨梨花箭.ini", name: "暴雨梨花箭", icon: "白虹贯日s.msf" },
    { key: "player-magic-白虹贯日.ini", name: "白虹贯日", icon: "白虹贯日s.msf" },
    { key: "magic-天忍神功.ini", name: "天忍神功", icon: "专属.msf" },
    { key: "player-magic-长剑.ini", name: "长剑", icon: null },
  ],
}));
vi.mock("../../src/data/game-data-api", () => ({
  getGameSlug: () => fixture.slug,
  getMagicsData: () => ({ player: fixture.player, npc: [] }),
  isGameDataLoaded: () => true,
  registerCacheBuilder: (fn: () => void) => { fixture.rebuild = fn; },
}));
import { getMagicFromApiCache } from "../../src/magic/magic-config-loader";

describe("engine icon path conversion", () => {
  it("keeps bundled web paths outside the game resource root and preserves originals", () => {
    fixture.rebuild?.();
    expect(getMagicFromApiCache("magic-暴雨梨花箭.ini")?.icon).toBe("/magic-icons/sword2/magic-暴雨梨花箭.png");
    expect(getMagicFromApiCache("player-magic-长剑.ini")?.icon).toBe("/magic-icons/sword2/player-magic-长剑.png");
    expect(getMagicFromApiCache("player-magic-白虹贯日.ini")?.icon).toBe("asf/magic/白虹贯日s.msf");
    expect(getMagicFromApiCache("magic-天忍神功.ini")?.icon).toBe("asf/magic/专属.msf");
    fixture.slug = "demo";
    fixture.rebuild?.();
    expect(getMagicFromApiCache("magic-暴雨梨花箭.ini")?.icon).toBe("asf/magic/白虹贯日s.msf");
  });
});
