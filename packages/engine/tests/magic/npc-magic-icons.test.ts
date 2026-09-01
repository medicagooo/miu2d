/**
 * AI-TRACE: Contract coverage for the shared NPC icon fallback used by engine conversion and
 * Dashboard rendering. Explicit icons and non-NPC records must remain backward compatible.
 */
import {
  getBundledNpcMagicIconPath,
  isNativeImagePath,
  resolveMagicIconPath,
} from "@miu2d/shared/lib/npc-magic-icons";
import { describe, expect, it } from "vitest";

describe("bundled NPC magic icons", () => {
  it("resolves verified NPC keys to Web-public PNG paths", () => {
    expect(getBundledNpcMagicIconPath("magic-百剑诀.ini", "npc")).toBe(
      "/npc-magic-icons/magic-百剑诀.png"
    );
    expect(getBundledNpcMagicIconPath("INI/MAGIC/magic-花瓣攻击.INI", "npc")).toBe(
      "/npc-magic-icons/magic-花瓣攻击.png"
    );
  });

  it("does not assign a bundled icon to players or anomalous records", () => {
    expect(getBundledNpcMagicIconPath("magic-百剑诀.ini", "player")).toBeUndefined();
    expect(getBundledNpcMagicIconPath("Relation.Ini", "npc")).toBeUndefined();
    expect(getBundledNpcMagicIconPath("magic-unknown.ini", "npc")).toBeUndefined();
  });

  it("preserves explicit icons and identifies native image paths", () => {
    expect(resolveMagicIconPath("existing.asf", "magic-百剑诀.ini", "npc")).toBe(
      "existing.asf"
    );
    expect(isNativeImagePath("/npc-magic-icons/magic-百剑诀.png")).toBe(true);
    expect(isNativeImagePath("asf/magic/custom.png")).toBe(false);
    expect(isNativeImagePath("asf/magic/mag001.asf")).toBe(false);
  });
});
