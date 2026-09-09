/** Player inventory overlay only. Never called by NPC/companion inventory readers.
 * NPC source tables stay empty; this builds an independent, source-guarded ten-level Map.
 * Shape tiers and balance rules: .branch-records/0909-npc-shape-growth/implementation.md.
 */
import { canPlayerAddMagic } from "../../data/player-magic-catalog";
import type { MagicData } from "../../magic/magic-data";
import { NPC_PLAYER_GROWTH } from "./npc-player-growth-data";

export const NPC_GROWTH_PROFILES = {
  single: {
    bonus: [0, 20, 40, 65, 90, 120, 155, 195, 240, 300],
    mana: [0, 4, 7, 10, 14, 19, 25, 32, 40, 50],
    exp: [300, 1000, 2200, 4200, 7200, 12000, 20000, 32000, 50000, 0],
  },
  tracking: {
    bonus: [0, 16, 32, 52, 72, 96, 124, 156, 192, 240],
    mana: [0, 5, 8, 12, 17, 23, 30, 38, 48, 60],
    exp: [300, 1000, 2200, 4200, 7200, 12000, 20000, 32000, 50000, 0],
  },
  area: {
    bonus: [0, 12, 24, 39, 54, 72, 93, 117, 144, 180],
    mana: [0, 6, 10, 15, 21, 28, 36, 46, 58, 72],
    exp: [300, 2000, 5000, 12000, 25000, 40000, 50000, 70000, 100000, 0],
  },
  control: {
    bonus: [0, 8, 16, 26, 36, 48, 62, 78, 96, 120],
    mana: [0, 8, 14, 21, 30, 41, 54, 69, 86, 105],
    exp: [600, 2000, 4400, 8400, 14400, 24000, 40000, 64000, 100000, 0],
  },
  strongControl: {
    bonus: [0, 12, 26, 44, 66, 90, 116, 144, 172, 200],
    mana: [0, 10, 16, 24, 34, 46, 60, 76, 94, 115],
    exp: [600, 2000, 4400, 8400, 14400, 24000, 40000, 64000, 100000, 0],
  },
} as const;
export type NpcGrowthProfile = keyof typeof NPC_GROWTH_PROFILES;

const entries = new Map(NPC_PLAYER_GROWTH.map((entry) => [`${entry.game}/${entry.key}`, entry]));

export function applyNpcPlayerProgression(magic: MagicData, gameSlug: string): MagicData {
  const key = magic.fileName.trim().replaceAll("\\", "/").split("/").at(-1)?.toLowerCase() ?? "";
  const entry = entries.get(`${gameSlug}/${key}`);
  if (!entry || !canPlayerAddMagic(key, gameSlug) || magic.levels?.size) return magic;
  // An author-added level table, changed combat baseline, item link or chained spell wins.
  if (
    Object.entries(entry.source).some(([field, value]) => magic[field as keyof MagicData] !== value)
  )
    return magic;
  if (
    magic.goodsName ||
    magic.attackFile ||
    magic.flyMagic ||
    magic.secondMagicFile ||
    magic.explodeMagicFile ||
    magic.randMagicFile ||
    magic.parasiticMagic
  )
    return magic;

  const profile = NPC_GROWTH_PROFILES[entry.profile];
  const levels = new Map<number, Partial<MagicData>>();
  for (let i = 0; i < 10; i++) {
    const tier = Math.floor(i / 3);
    const shape = entry.shape;
    const width = 3 + tier * 2;
    const finalMultiplicity =
      shape === "square" || shape === "triangle"
        ? 9
        : shape === "line"
          ? 7
          : shape === "single" || shape === "tracking"
            ? 4
            : shape === "circle" || shape === "spiral"
              ? 1.6
              : 3;
    const multiplicity =
      shape === "square" || shape === "triangle"
        ? (width / 3) ** 2
        : shape === "line"
          ? 1 + tier * 2
          : shape === "single" || shape === "tracking"
            ? tier + 1
            : shape === "circle" || shape === "spiral"
              ? 1 + tier * 0.2
              : width / 3;
    levels.set(i + 1, {
      playerShape: {
        effectLevel: shape === "wall" ? tier + 1 : shape === "line" ? 1 + tier * 2 : 1 + tier * 3,
        burstCount: shape === "single" || shape === "tracking" ? tier + 1 : 1,
        travelScale: shape === "circle" || shape === "spiral" ? 1 + tier * 0.2 : 1,
      },
      // Original implicit level-one freeze/poison/petrify duration is two seconds.
      ...(magic.specialKind >= 1 && magic.specialKind <= 3
        ? { specialKindMilliSeconds: magic.specialKindMilliSeconds || 2000 }
        : {}),
      // Keep the zero/nonzero Effect damage formula and the original first-level costs.
      effect: magic.effect,
      effectExt: magic.effectExt + profile.bonus[i] / finalMultiplicity,
      manaCost: magic.manaCost + Math.ceil(profile.mana[i] * Math.sqrt(multiplicity)),
      levelupExp: profile.exp[i],
    });
  }
  return { ...magic, maxLevel: 10, levels };
}
