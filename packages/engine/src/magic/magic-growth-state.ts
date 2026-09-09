import type { MagicData } from "./magic-data";

export type MagicGrowthState = "trainable" | "maxed" | "unconfigured";

/** UI bridge and direct inventory UI share the same rule. A zero threshold alone does not
 * prove mastery: empty placeholder tables and fixed attacks must stay unconfigured. */
export function getMagicGrowthState(magic: MagicData, level: number): MagicGrowthState {
  if (magic.levelupExp > 0) return "trainable";
  const growthLevels = [...(magic.levels?.entries() ?? [])];
  const hasGrowth = growthLevels.some(([, data]) => (data.levelupExp ?? 0) > 0);
  const maxLevel = growthLevels.reduce((max, [key]) => Math.max(max, key), 0);
  return hasGrowth && level >= maxLevel ? "maxed" : "unconfigured";
}

export function magicGrowthLabel(state: MagicGrowthState): string {
  return { trainable: "可修炼", maxed: "已满级", unconfigured: "无成长配置" }[state];
}
