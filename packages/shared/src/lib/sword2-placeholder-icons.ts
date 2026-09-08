/**
 * AI-TRACE: 2026-09-08 sword2 API audit found 24 unrelated skills using the
 * Baihong icon. Shared by engine conversion and dashboard list/picker through
 * resolveMagicIconPath; match both key and legacy resource, preserving custom art.
 * Evidence and art provenance: artifacts/sword2-placeholder-icons/manifest.json.
 */
export const SWORD2_PLACEHOLDER_ICON_KEYS = [
  "magic-暴雨梨花箭.ini",
  "magic-别离心法.ini",
  "magic-十一式暴雨剑法.ini",
  "magic-封神十二剑.ini",
  "magic-风残剑法.ini",
  "magic-拈花指.ini",
  "magic-天忍神功.ini",
  "magic-乱披风箭术.ini",
  "magic-逍遥刀法.ini",
  "magic-断金斧.ini",
  "magic-孔雀翎.ini",
  "magic-葵花宝典.ini",
  "magic-霹雳刀法.ini",
  "magic-流水掌法.ini",
  "magic-逆流刀法.ini",
  "magic-百变掌法.ini",
  "magic-棍棒.ini",
  "magic-长剑.ini",
  "magic-火箭.ini",
  "magic-拳脚.ini",
  "magic-刀.ini",
  "magic-冰弓箭.ini",
  "magic-两格长枪.ini",
  "magic-弓箭.ini",
] as const;

const keys = new Set<string>(SWORD2_PLACEHOLDER_ICON_KEYS);

export function getSword2PlaceholderIconPath(
  icon: string | null | undefined,
  key: string,
  gameSlug?: string | null
): string | undefined {
  if (gameSlug !== "sword2" || !icon) return undefined;
  const normalizedKey = key.trim().replaceAll("\\", "/").split("/").at(-1)?.toLowerCase();
  const filename = icon.trim().replaceAll("\\", "/").split("/").at(-1)?.toLowerCase();
  if (
    !normalizedKey ||
    !keys.has(normalizedKey) ||
    !/^白虹贯日s\.(?:msf|asf|mpc)$/.test(filename ?? "")
  )
    return undefined;
  return `/magic-icons/sword2/${normalizedKey.replace(/\.ini$/i, ".png")}`;
}
