/**
 * AI-TRACE: Bundled NPC martial-art icon contract.
 * Purpose: resolve the 34 verified `magics.npc` keys to Web-public PNG fallbacks.
 * Upstream: remote/local game data keeps its original `Magic.icon`; callers pass `key` and `userType`.
 * Downstream: engine MagicData conversion and Dashboard list/picker renderers consume the returned path.
 * Compatibility: an explicit icon always wins. With gameSlug, the audited per-game artwork has
 * priority over these older NPC fallbacks; omitted slug preserves the existing three-argument API.
 */

import { getGameMagicIconPath } from "./game-magic-icons";

const BUNDLED_NPC_MAGIC_KEYS = new Set([
  "magic-百剑诀.ini",
  "magic-柳叶飞刀.ini",
  "magic-月眉儿攻击.ini",
  "magic-弓箭.ini",
  "magic-蜂王毒刺.ini",
  "magic-孟知秋攻击.ini",
  "magic-两格长枪.ini",
  "magic-金针攻击.ini",
  "magic-紫轩攻击.ini",
  "magic-强盗飞刀.ini",
  "magic-刀.ini",
  "magic-毒液2.ini",
  "magic-符咒攻击.ini",
  "magic-推山填海.ini",
  "magic-土系攻击2.ini",
  "magic-悲天悯人咒.ini",
  "magic-火系攻击2.ini",
  "magic-飞刀.ini",
  "magic-蔷薇攻击.ini",
  "magic-毒液.ini",
  "magic-暗器2.ini",
  "magic-小符咒攻击.ini",
  "magic-火系攻击3.ini",
  "magic-冰刀攻击.ini",
  "magic-蝙蝠.ini",
  "magic-纳兰潜凛攻击.ini",
  "magic-水系攻击2.ini",
  "magic-毒烟攻击.ini",
  "magic-长剑.ini",
  "magic-金刚电闪.ini",
  "magic-水系攻击1.ini",
  "magic-沙暴攻击.ini",
  "magic-金钱镖.ini",
  "magic-花瓣攻击.ini",
]);

function normalizeMagicKey(key: string): string {
  return key.replace(/\\/g, "/").split("/").pop()?.toLowerCase() ?? "";
}

export function getBundledNpcMagicIconPath(
  key: string,
  userType?: string | null
): string | undefined {
  if (userType && userType !== "npc") return undefined;

  const normalizedKey = normalizeMagicKey(key);
  if (!BUNDLED_NPC_MAGIC_KEYS.has(normalizedKey)) return undefined;

  return `/npc-magic-icons/${normalizedKey.replace(/\.ini$/i, ".png")}`;
}

export function resolveMagicIconPath(
  icon: string | null | undefined,
  key: string,
  userType?: string | null,
  gameSlug?: string | null
): string | undefined {
  return icon || getGameMagicIconPath(gameSlug, key) || getBundledNpcMagicIconPath(key, userType);
}

export function isNativeImagePath(path: string | null | undefined): boolean {
  if (!path) return false;
  if (path.startsWith("data:image/") || path.startsWith("blob:")) return true;

  const isDirectUrl = path.startsWith("/") || /^https?:\/\//i.test(path);
  return isDirectUrl && /\.(?:png|jpe?g|webp|gif|svg)(?:[?#].*)?$/i.test(path);
}
