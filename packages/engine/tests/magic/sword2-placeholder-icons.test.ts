import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolveMagicIconPath } from "@miu2d/shared/lib/npc-magic-icons";
import { SWORD2_PLACEHOLDER_ICON_KEYS } from "@miu2d/shared/lib/sword2-placeholder-icons";
import { describe, expect, it } from "vitest";

describe("sword2 Baihong placeholder replacement", () => {
  it("matches audited keys across legacy formats and normalized paths", () => {
    for (const key of SWORD2_PLACEHOLDER_ICON_KEYS) {
      for (const icon of ["白虹贯日s.msf", "白虹贯日s.asf", "ASF\\MAGIC\\白虹贯日S.MPC", "/game/sword2/resources/asf/magic/白虹贯日s.msf"]) {
        expect(resolveMagicIconPath(icon, `INI\\MAGIC\\${key}`, "player", "sword2")).toBe(`/magic-icons/sword2/${key.replace(/\.ini$/, ".png")}`);
      }
    }
  });

  it("preserves originals, future custom icons, other games and legacy callers", () => {
    const original = "白虹贯日s.msf";
    for (const key of ["player-magic-白虹贯日.ini", "player-magic-暴雨梨花箭.ini", "unknown.ini"]) {
      expect(resolveMagicIconPath(original, key, "player", "sword2")).toBe(original);
    }
    for (const slug of [undefined, "sword1", "demo"]) {
      expect(resolveMagicIconPath(original, "magic-刀.ini", "npc", slug)).toBe(original);
    }
    for (const icon of ["专属图.msf", "/custom/刀.png", "白虹贯日s-custom.msf", "/custom/白虹贯日s.png"]) {
      expect(resolveMagicIconPath(icon, "magic-刀.ini", "npc", "sword2")).toBe(icon);
    }
  });

  it("ships every audited replacement with unique verified PNG artwork", () => {
    const root = new URL("../../../../", import.meta.url);
    const manifest = JSON.parse(readFileSync(new URL("artifacts/sword2-placeholder-icons/manifest.json", root), "utf8"));
    expect(manifest.entries.map((e: {key: string}) => e.key).sort()).toEqual([...SWORD2_PLACEHOLDER_ICON_KEYS].sort());
    expect(manifest.entries).toHaveLength(24);
    const hashes = new Set<string>();
    for (const entry of manifest.entries) {
      expect(resolveMagicIconPath(entry.icon, entry.key, entry.userType, "sword2")).toBe(entry.path.replace("packages/web/public", ""));
      const png = readFileSync(new URL(entry.path, root));
      expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      const hash = createHash("sha256").update(png).digest("hex");
      expect(hash).toBe(entry.sha256);
      hashes.add(hash);
    }
    expect(hashes.size).toBe(24);
  });
});
