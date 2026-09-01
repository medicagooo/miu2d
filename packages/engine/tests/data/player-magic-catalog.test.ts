/**
 * AI-TRACE: Contract coverage for the shared player-eligibility view used by the debug picker
 * and `DebugManager.addAllMagics`. API ownership must remain untouched while every valid NPC
 * magic becomes player-usable, duplicates are suppressed, and `Relation.Ini` stays excluded.
 */
import { buildPlayerMagicCatalog } from "../../src/data/player-magic-catalog";
import { describe, expect, it } from "vitest";

describe("player magic catalog", () => {
  it("combines player and NPC magics while preserving player-first order", () => {
    const player = { key: "player-magic-长剑.ini", name: "长剑", userType: "player" };
    const npc = { key: "magic-百剑诀.ini", name: "百剑诀", userType: "npc" };

    expect(buildPlayerMagicCatalog({ player: [player], npc: [npc] })).toEqual([player, npc]);
  });

  it("excludes Relation.Ini and de-duplicates normalized keys", () => {
    const first = { key: "INI/MAGIC/MAGIC-飞刀.INI" };
    const duplicate = { key: "ini\\magic\\magic-飞刀.ini" };
    const relation = { key: "Ini/Magic/Relation.Ini" };

    expect(buildPlayerMagicCatalog({ player: [first], npc: [duplicate, relation] })).toEqual([
      first,
    ]);
  });

  it("returns an empty catalog before game data is available", () => {
    expect(buildPlayerMagicCatalog(null)).toEqual([]);
  });
});
