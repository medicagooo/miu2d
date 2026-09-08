/** Cross-game icon identity and original-art compatibility, independent of API ownership. */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GAME_MAGIC_ICON_KEYS, getGameMagicIconPath } from "@miu2d/shared/lib/game-magic-icons";
import { resolveMagicIconPath } from "@miu2d/shared/lib/npc-magic-icons";
import { describe, expect, it } from "vitest";

describe("game-specific missing magic icons", () => {
  it("shares verified demo names with sword1 and accepts normalized INI paths", () => {
    for (const slug of ["demo", "sword1"]) {
      expect(getGameMagicIconPath(slug, " INI\\MAGIC\\MAGIC-柳叶飞刀.INI ")).toBe(
        "/magic-icons/demo/magic-柳叶飞刀.png"
      );
    }
    expect(getGameMagicIconPath("sword2", "magic-柳叶飞刀.ini")).toBeUndefined();
    expect(getGameMagicIconPath("unknown", "player-magic-长剑.ini")).toBeUndefined();
    expect(getGameMagicIconPath(undefined, "player-magic-长剑.ini")).toBeUndefined();
  });

  it("fills player and NPC gaps without depending on ownership", () => {
    for (const owner of ["player", "npc"]) {
      expect(resolveMagicIconPath(null, "magic018_碧波临风.ini", owner, "sword1")).toBe(
        "/magic-icons/sword1/magic018_碧波临风.png"
      );
      expect(resolveMagicIconPath(null, "player-magic-长剑.ini", owner, "sword2")).toBe(
        "/magic-icons/sword2/player-magic-长剑.png"
      );
    }
  });

  it("preserves authored icons, legacy callers and non-magic exclusions", () => {
    for (const icon of ["original.asf", "original.msf", "/custom/icon.png"]) {
      expect(resolveMagicIconPath(icon, "magic-蜂王毒刺.ini", "npc", "demo")).toBe(icon);
    }
    expect(resolveMagicIconPath(null, "magic-蜂王毒刺.ini", "npc")).toBe(
      "/npc-magic-icons/magic-蜂王毒刺.png"
    );
    expect(resolveMagicIconPath(null, "magic-蜂王毒刺.ini", "player")).toBeUndefined();
    for (const key of ["Relation.Ini", "player-levelup-1.ini", "player-levelup-2.ini"]) {
      expect(resolveMagicIconPath(null, key, "npc", "sword1")).toBeUndefined();
    }
  });

  it("preserves distinct wind/cloud and rain configurations with the same display names", () => {
    const keys = [
      "magic043_风云突起1.ini", "magic043_风云突起2.ini", "magic043_风云突起3.ini",
      "magic049_快风残雨.ini", "magic049_疾风骤雨.ini", "magic051_疾风骤雨.ini",
    ];
    const paths = keys.map((key) => getGameMagicIconPath("sword1", key));
    expect(paths.every(Boolean)).toBe(true);
    expect(new Set(paths).size).toBe(keys.length);
  });

  it("ships all 94 audited gaps with 29 verified reuse mappings", () => {
    const root = new URL("../../../../", import.meta.url);
    const manifest = JSON.parse(readFileSync(new URL("artifacts/game-magic-icons/manifest.json", root), "utf8"));
    const expected = manifest.entries.map((entry: { slug: string; key: string }) => `${entry.slug}/${entry.key}`);
    const actual = Object.entries(GAME_MAGIC_ICON_KEYS).flatMap(([slug, keys]) => keys.map((key) => `${slug}/${key}`));
    expect(actual.sort()).toEqual(expected.sort());
    expect(GAME_MAGIC_ICON_KEYS.demo).toHaveLength(28);
    expect(GAME_MAGIC_ICON_KEYS.sword1).toHaveLength(65);
    expect(GAME_MAGIC_ICON_KEYS.sword2).toHaveLength(1);
    expect(new Set(actual).size).toBe(94);
    expect(manifest.entries.filter((entry: {status: string}) => entry.status.startsWith("reused"))).toHaveLength(29);
    for (const entry of manifest.entries) {
      expect(entry.originalIcon).toBeFalsy();
      expect(getGameMagicIconPath(entry.slug, entry.key)).toBe(entry.path.replace("packages/web/public", ""));
      const file = fileURLToPath(new URL(entry.path, root));
      const png = readFileSync(file);
      expect(png.subarray(0, 8).toString("hex"), file).toBe("89504e470d0a1a0a");
      if (entry.status !== "reused-original") {
        expect(png.readUInt32BE(16), file).toBe(png.readUInt32BE(20));
        expect(png.readUInt32BE(16), file).toBeGreaterThanOrEqual(64);
      } else {
        expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([30, 40]);
      }
    }
  });
});
