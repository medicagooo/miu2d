/**
 * AI-TRACE: Per-game artwork for the 94 original-icon gaps audited on 2026-09-08.
 * Source/design/provenance: artifacts/game-magic-icons/{manifest,prompts}.json.
 * Engine cache conversion and Dashboard list/picker pass the game slug here through
 * resolveMagicIconPath. Match only an explicit (slug, normalized key) pair; ownership
 * is deliberately irrelevant so later player/NPC recategorization cannot hide artwork.
 * Original API icons still win in the caller; no database records or combat data change.
 */
export const GAME_MAGIC_ICON_KEYS = {
  demo: [
    "player-magic-长剑.ini",
    "magic-柳叶飞刀.ini",
    "magic-月眉儿攻击.ini",
    "magic-蜂王毒刺.ini",
    "magic-孟知秋攻击.ini",
    "magic-金针攻击.ini",
    "magic-紫轩攻击.ini",
    "magic-毒液2.ini",
    "magic-符咒攻击.ini",
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
    "magic-金刚电闪.ini",
    "magic-水系攻击1.ini",
    "magic-沙暴攻击.ini",
    "magic-金钱镖.ini",
    "magic-花瓣攻击.ini",
  ],
  sword1: [
    "magic018_碧波临风.ini",
    "magic026_龙象九重.ini",
    "magic043_风云突起3.ini",
    "magic040_血影怒雷.ini",
    "magic-金针攻击.ini",
    "magic055_噬天灭地.ini",
    "magic-孟知秋攻击.ini",
    "magic049_快风残雨.ini",
    "magic-蜂王毒刺.ini",
    "magic-月眉儿攻击.ini",
    "magic-柳叶飞刀.ini",
    "magic060_射箭.ini",
    "magic-水系攻击2.ini",
    "magic047_蟒蛇出洞.ini",
    "magic048_毒蛇吐芯.ini",
    "magic-纳兰潜凛攻击.ini",
    "magic-蝙蝠.ini",
    "magic-冰刀攻击.ini",
    "magic052_推山填海.ini",
    "magic-火系攻击3.ini",
    "magic-小符咒攻击.ini",
    "magic043_风云突起2.ini",
    "magic027_幻音玄剑.ini",
    "magic023_雨后彩虹.ini",
    "magic-暗器2.ini",
    "magic049_疾风骤雨.ini",
    "magic030_饿虎扑食.ini",
    "magic039_残阳如血.ini",
    "magic-毒液.ini",
    "magic054_狂风逐日.ini",
    "magic043_风云突起1.ini",
    "magic-蔷薇攻击.ini",
    "magic046_投石惊浪.ini",
    "magic053_黑龙探海.ini",
    "magic051_疾风骤雨.ini",
    "magic-飞刀.ini",
    "magic-火系攻击2.ini",
    "magic-悲天悯人咒.ini",
    "magic033_紫霞神功.ini",
    "magic029_风卷残雪.ini",
    "magic-土系攻击2.ini",
    "magic041_倒转乾坤.ini",
    "magic-花瓣攻击.ini",
    "magic032_幻魔雪刀.ini",
    "magic-符咒攻击.ini",
    "magic036_金乌刀法.ini",
    "magic-毒液2.ini",
    "magic045_摘花满天.ini",
    "magic034_含元掌.ini",
    "magic035_观音散雪.ini",
    "magic038_破石鞭法.ini",
    "magic-紫轩攻击.ini",
    "magic042_天外神音.ini",
    "magic037_劈波裂浪.ini",
    "magic031_野马分鬃.ini",
    "magic061_莫须有.ini",
    "magic-金钱镖.ini",
    "magic-沙暴攻击.ini",
    "magic062_弓箭.ini",
    "magic-水系攻击1.ini",
    "magic028_慈航普度.ini",
    "magic-金刚电闪.ini",
    "magic050_追魂索命.ini",
    "magic-毒烟攻击.ini",
    "magic044_威震五岳.ini",
  ],
  sword2: ["player-magic-长剑.ini"],
} as const;

// Same-name sword1 gaps reuse demo artwork; duplicate names were matched by key.
// Bow's original API resource is missing: reuse the existing demo bundled fallback.
export const SWORD1_DEMO_ICON_ALIASES: Readonly<Record<string, string>> = {
  "magic-金针攻击.ini": "/magic-icons/demo/magic-金针攻击.png",
  "magic-孟知秋攻击.ini": "/magic-icons/demo/magic-孟知秋攻击.png",
  "magic-蜂王毒刺.ini": "/magic-icons/demo/magic-蜂王毒刺.png",
  "magic-月眉儿攻击.ini": "/magic-icons/demo/magic-月眉儿攻击.png",
  "magic-柳叶飞刀.ini": "/magic-icons/demo/magic-柳叶飞刀.png",
  "magic-水系攻击2.ini": "/magic-icons/demo/magic-水系攻击2.png",
  "magic-纳兰潜凛攻击.ini": "/magic-icons/demo/magic-纳兰潜凛攻击.png",
  "magic-蝙蝠.ini": "/magic-icons/demo/magic-蝙蝠.png",
  "magic-冰刀攻击.ini": "/magic-icons/demo/magic-冰刀攻击.png",
  "magic052_推山填海.ini": "/magic-icons/demo/original-player-magic-推山填海.png",
  "magic-火系攻击3.ini": "/magic-icons/demo/magic-火系攻击3.png",
  "magic-小符咒攻击.ini": "/magic-icons/demo/magic-小符咒攻击.png",
  "magic-暗器2.ini": "/magic-icons/demo/magic-暗器2.png",
  "magic-毒液.ini": "/magic-icons/demo/magic-毒液.png",
  "magic-蔷薇攻击.ini": "/magic-icons/demo/magic-蔷薇攻击.png",
  "magic-飞刀.ini": "/magic-icons/demo/magic-飞刀.png",
  "magic-火系攻击2.ini": "/magic-icons/demo/magic-火系攻击2.png",
  "magic-悲天悯人咒.ini": "/magic-icons/demo/magic-悲天悯人咒.png",
  "magic-土系攻击2.ini": "/magic-icons/demo/magic-土系攻击2.png",
  "magic-花瓣攻击.ini": "/magic-icons/demo/magic-花瓣攻击.png",
  "magic-符咒攻击.ini": "/magic-icons/demo/magic-符咒攻击.png",
  "magic-毒液2.ini": "/magic-icons/demo/magic-毒液2.png",
  "magic-紫轩攻击.ini": "/magic-icons/demo/magic-紫轩攻击.png",
  "magic-金钱镖.ini": "/magic-icons/demo/magic-金钱镖.png",
  "magic-沙暴攻击.ini": "/magic-icons/demo/magic-沙暴攻击.png",
  "magic062_弓箭.ini": "/npc-magic-icons/magic-弓箭.png",
  "magic-水系攻击1.ini": "/magic-icons/demo/magic-水系攻击1.png",
  "magic-金刚电闪.ini": "/magic-icons/demo/magic-金刚电闪.png",
  "magic-毒烟攻击.ini": "/magic-icons/demo/magic-毒烟攻击.png",
};

const keySets = new Map<string, ReadonlySet<string>>(
  Object.entries(GAME_MAGIC_ICON_KEYS).map(([slug, keys]) => [slug, new Set<string>(keys)])
);

export function getGameMagicIconPath(
  gameSlug: string | null | undefined,
  key: string
): string | undefined {
  if (!gameSlug) return undefined;
  const normalizedKey = key.trim().replaceAll("\\", "/").split("/").at(-1)?.toLowerCase();
  if (!normalizedKey || !keySets.get(gameSlug)?.has(normalizedKey)) return undefined;
  if (gameSlug === "sword1" && SWORD1_DEMO_ICON_ALIASES[normalizedKey]) {
    return SWORD1_DEMO_ICON_ALIASES[normalizedKey];
  }
  return `/magic-icons/${gameSlug}/${normalizedKey.replace(/\.ini$/i, ".png")}`;
}
