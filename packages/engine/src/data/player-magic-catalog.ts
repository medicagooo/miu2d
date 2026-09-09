/**
 * AI-TRACE: Builds the catalog that player-facing learning/debug flows consume.
 * Upstream is `GameDataResponse.magics`, where the public API preserves player/NPC ownership.
 * Downstream callers are `DebugManager.addAllMagics` and the game debug magic picker.
 * NPC records remain in their original API bucket so NPC casting is unchanged; this view only
 * broadens player eligibility, de-duplicates keys, and excludes the imported `Relation.Ini`
 * configuration record because it is not a martial art. Game-specific exclusions also guard
 * Player.addMagic; save restoration and NPC casting deliberately keep their original paths.
 */

export interface PlayerUsableMagicEntry {
  key: string;
}

interface MagicBuckets<T extends PlayerUsableMagicEntry> {
  player: readonly T[];
  npc: readonly T[];
}

function normalizeMagicKey(key: string): string {
  return key.trim().replaceAll("\\", "/").toLowerCase();
}

function isMagicRecord(key: string): boolean {
  return normalizeMagicKey(key).split("/").at(-1) !== "relation.ini";
}

const EXCLUDED_BASIC_ATTACKS = new Set([
  "magic-弓箭.ini",
  "magic-蜂王毒刺.ini",
  "magic-两格长枪.ini",
  "magic-强盗飞刀.ini",
  "magic-刀.ini",
  "magic-飞刀.ini",
  "magic-蝙蝠.ini",
  "magic-长剑.ini",
  "player-magic-长剑.ini",
  "magic-暗器2.ini",
  "magic-棍棒.ini",
  "magic-拳脚.ini",
  "magic-火箭.ini",
  "magic-冰弓箭.ini",
]);

/** Restrict new player learning only; omitted slug preserves the legacy catalog contract. */
export function canPlayerAddMagic(key: string, gameSlug?: string): boolean {
  const fileName = normalizeMagicKey(key).split("/").at(-1) ?? "";
  if (!fileName || !isMagicRecord(key)) return false;
  if (!["sword1", "demo", "sword2"].includes(gameSlug ?? "")) return true;
  if (EXCLUDED_BASIC_ATTACKS.has(fileName)) return false;
  return (
    gameSlug !== "sword1" ||
    ![
      "player-magic1-长剑.ini", "magic060_射箭.ini", "magic062_弓箭.ini",
      // Item projectiles retain their goods use and old saves, but are not learnable arts.
      "magic057_梅花镖.ini", "magic058_袖箭.ini",
    ].includes(fileName)
  );
}

/** Return every valid player and NPC magic as a single player-usable catalog. */
export function buildPlayerMagicCatalog<T extends PlayerUsableMagicEntry>(
  magics: MagicBuckets<T> | null | undefined,
  gameSlug?: string
): T[] {
  if (!magics) return [];

  const catalog: T[] = [];
  const seenKeys = new Set<string>();

  for (const magic of [...magics.player, ...magics.npc]) {
    const normalizedKey = normalizeMagicKey(magic.key);
    if (!canPlayerAddMagic(normalizedKey, gameSlug) || seenKeys.has(normalizedKey)) continue;

    seenKeys.add(normalizedKey);
    catalog.push(magic);
  }

  return catalog;
}
