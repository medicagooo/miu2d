/**
 * AI-TRACE: Contract coverage for polished NPC intro fallbacks consumed by engine conversion and
 * Dashboard previews. The mapping must stay aligned to the 34 verified NPC magics, override their
 * stale/blank prose, preserve unrelated prose, and never expose implementation timing in copy.
 */
import {
  BUNDLED_NPC_MAGIC_DESCRIPTIONS,
  getBundledNpcMagicDescription,
  resolveMagicIntro,
} from "@miu2d/shared/lib/npc-magic-descriptions";
import { describe, expect, it } from "vitest";

describe("bundled NPC magic descriptions", () => {
  it("contains polished copy for exactly 34 verified NPC magics", () => {
    const descriptions = Object.values(BUNDLED_NPC_MAGIC_DESCRIPTIONS);

    expect(descriptions).toHaveLength(34);
    expect(descriptions.every((description) => description.trim().length > 0)).toBe(true);
    expect(descriptions.every((description) => !description.includes("帧"))).toBe(true);
  });

  it("normalizes known NPC keys and rejects player or anomalous records", () => {
    expect(getBundledNpcMagicDescription("INI\\MAGIC\\MAGIC-百剑诀.INI", "npc")).toContain(
      "化一剑为百剑"
    );
    expect(getBundledNpcMagicDescription("magic-百剑诀.ini", "player")).toBeUndefined();
    expect(getBundledNpcMagicDescription("Relation.Ini", "npc")).toBeUndefined();
    expect(getBundledNpcMagicDescription("magic-unknown.ini", "npc")).toBeUndefined();
  });

  it("uses approved NPC prose and preserves unrelated authored prose", () => {
    expect(resolveMagicIntro("旧说明", "magic-百剑诀.ini", "npc")).toContain("化一剑为百剑");
    expect(resolveMagicIntro("   ", "magic-蜂王毒刺.ini", "npc")).toContain("剧毒");
    expect(resolveMagicIntro("原始说明", "magic-unknown.ini", "npc")).toBe("原始说明");
    expect(resolveMagicIntro("玩家说明", "magic-蜂王毒刺.ini", "player")).toBe("玩家说明");
    expect(resolveMagicIntro(null, "magic-蜂王毒刺.ini", "player")).toBeUndefined();
  });
});
