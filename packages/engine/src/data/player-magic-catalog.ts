/**
 * AI-TRACE: Builds the catalog that player-facing learning/debug flows consume.
 * Upstream is `GameDataResponse.magics`, where the public API preserves player/NPC ownership.
 * Downstream callers are `DebugManager.addAllMagics` and the game debug magic picker.
 * NPC records remain in their original API bucket so NPC casting is unchanged; this view only
 * broadens player eligibility, de-duplicates keys, and excludes the imported `Relation.Ini`
 * configuration record because it is not a martial art.
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

/** Return every valid player and NPC magic as a single player-usable catalog. */
export function buildPlayerMagicCatalog<T extends PlayerUsableMagicEntry>(
  magics: MagicBuckets<T> | null | undefined
): T[] {
  if (!magics) return [];

  const catalog: T[] = [];
  const seenKeys = new Set<string>();

  for (const magic of [...magics.player, ...magics.npc]) {
    const normalizedKey = normalizeMagicKey(magic.key);
    if (!normalizedKey || !isMagicRecord(normalizedKey) || seenKeys.has(normalizedKey)) continue;

    seenKeys.add(normalizedKey);
    catalog.push(magic);
  }

  return catalog;
}
