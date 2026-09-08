/**
 * Player-only progression repairs for audited sword1/demo records.
 * PlayerMagicInventory opts in from PlayerBase; NPC/companion inventories and the shared
 * magic API cache retain the source data. Matching the complete legacy table ensures a
 * later author-edited table wins. Returning new maps keeps saves and shared configs isolated.
 * Source evidence, exceptions and new-design values: .branch-records/0909-player-level-repair/implementation.md.
 */
import type { MagicData } from "../../magic/types";
import { MagicMoveKind, MagicSpecialKind } from "../../magic/types";

type ProgressionContext = { gameSlug: string; userType?: string | null };
type CurveRepair = { keys: readonly string[]; before: readonly number[]; after: readonly number[] };

const SWORD1_CURVES: readonly CurveRepair[] = [
  {
    keys: ["magic012_碧海潮生.ini"],
    before: [400, 300, 1400, 2200, 3500, 4200, 5000, 9000, 13000],
    after: [400, 900, 1400, 2200, 3500, 4200, 5000, 9000, 13000],
  },
  {
    keys: ["magic018_潮生碧海.ini"],
    before: [800, 800, 1500, 2000, 2800, 3800, 4800, 6000, 7800],
    after: [800, 1150, 1500, 2000, 2800, 3800, 4800, 6000, 7800],
  },
  {
    keys: ["magic024_幻影飞狐.ini"],
    before: [250, 8000, 18000, 28000, 38000, 49000, 15000, 24000, 32000],
    after: [250, 8000, 18000, 28000, 38000, 49000, 60000, 71000, 82000],
  },
  {
    keys: ["magic满江红.ini"],
    before: [20000, 30000, 40000, 50000, 50000, 50000, 50000, 50000, 50000],
    after: [20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000],
  },
];

const CLOUD_CURVE: CurveRepair = {
  keys: ["player-magic-云生结海.ini"],
  before: [600, 2000, 4400, 8400, 14500, 24000, 40000, 40000, 64000],
  after: [600, 2000, 4400, 8400, 14500, 24000, 40000, 52000, 64000],
};

// New designs, not recovered original values. Keep effect=0 so damage still uses realAttack;
// growth is an additive effectExt bonus rather than switching to a different attack formula.
const NEW_PROGRESSIONS: Record<
  string,
  { bonus: number[]; mana: number[]; exp: number[]; speed: number[] }
> = {
  "magic005_掌上生雷.ini": {
    bonus: [0, 20, 40, 65, 90, 120, 155, 195, 240, 300],
    mana: [0, 4, 6, 8, 10, 14, 18, 22, 28, 36],
    exp: [100, 250, 500, 800, 1200, 1800, 2600, 3600, 5000, 0],
    speed: [8, 8, 8, 8, 9, 9, 9, 9, 9, 10],
  },
  "magic013_天外飞仙.ini": {
    bonus: [0, 35, 75, 120, 180, 250, 330, 425, 535, 660],
    mana: [0, 6, 10, 14, 20, 28, 36, 46, 58, 72],
    exp: [300, 800, 1800, 3400, 5800, 9000, 15000, 24000, 32000, 0],
    speed: [8, 8, 8, 9, 9, 9, 10, 10, 10, 11],
  },
};

export function repairPlayerMagicProgression(
  magic: MagicData,
  context: ProgressionContext
): MagicData {
  if (context.userType !== "player" || !["sword1", "demo"].includes(context.gameSlug)) return magic;
  const key = magic.fileName.trim().replaceAll("\\", "/").split("/").at(-1)?.toLowerCase() ?? "";
  const levels = magic.levels;
  if (
    !levels ||
    levels.size !== 10 ||
    Array.from({ length: 10 }, (_, i) => i + 1).some((level) => !levels.has(level))
  ) {
    return magic;
  }

  const design =
    context.gameSlug === "sword1" && Object.hasOwn(NEW_PROGRESSIONS, key)
      ? NEW_PROGRESSIONS[key]
      : undefined;
  if (
    design &&
    magic.maxLevel === 10 &&
    magic.effect === 0 &&
    magic.manaCost === 0 &&
    magic.effectExt === 0 &&
    magic.speed === 8 &&
    magic.moveKind === MagicMoveKind.SingleMove &&
    magic.specialKind === MagicSpecialKind.None &&
    [...levels.values()].every(
      (level) =>
        (level.effect ?? 0) === 0 &&
        (level.manaCost ?? 0) === 0 &&
        (level.levelupExp ?? 0) === 0 &&
        (level.effectExt ?? 0) === 0 &&
        level.moveKind === undefined &&
        level.speed === undefined &&
        level.lifeFrame === undefined
    )
  ) {
    const upgraded = new Map<number, Partial<MagicData>>();
    for (let i = 0; i < 10; i++) {
      upgraded.set(i + 1, {
        ...levels.get(i + 1),
        effect: 0,
        effectExt: magic.effectExt + design.bonus[i],
        manaCost: design.mana[i],
        levelupExp: design.exp[i],
        speed: i === 0 ? magic.speed : design.speed[i],
      });
    }
    return { ...magic, maxLevel: 10, levels: upgraded };
  }

  const repairs = context.gameSlug === "sword1" ? [...SWORD1_CURVES, CLOUD_CURVE] : [CLOUD_CURVE];
  const repair = repairs.find(
    (entry) =>
      entry.keys.includes(key) &&
      entry.before.every((exp, i) => levels.get(i + 1)?.levelupExp === exp)
  );
  if (!repair) return magic;
  const upgraded = new Map(levels);
  for (let i = 0; i < 9; i++) {
    upgraded.set(i + 1, { ...levels.get(i + 1), levelupExp: repair.after[i] });
  }
  return { ...magic, levels: upgraded };
}
