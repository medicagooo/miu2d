import { getPlayerLevelCost, getPlayerLevelStartExp, isPlayerGrowthProfile } from "@miu2d/types";
import type { LevelManager } from "../character/level/level-manager";
import type { PlayerSaveData } from "./save-types";

/** A former player enters the legacy partner progression without losing its player snapshot.
 * Once a character has both roles, profile.partner and profile.player hold separate progress;
 * inventory/magic remain shared. Never inject a level-1000 baseline into the partner table.
 */
export function toLegacyPartnerProgress(
  data: PlayerSaveData,
  manager: LevelManager
): PlayerSaveData {
  const source = data.growth?.profile;
  if (!isPlayerGrowthProfile(source)) return data;
  const level = Math.min(manager.getMaxLevel(), Math.max(1, Math.trunc(data.level)));
  let start = 0;
  for (const [key, detail] of manager.getLevelConfig() ?? []) {
    if (key < level) start = Math.max(start, detail.levelUpExp);
  }
  const end = manager.getLevelDetail(level)?.levelUpExp ?? 0;
  const cost = getPlayerLevelCost(source, data.level);
  const fraction =
    cost > 0
      ? Math.max(0, Math.min(1, (data.exp - getPlayerLevelStartExp(source, data.level)) / cost))
      : 0;
  const capped = level === manager.getMaxLevel();
  return {
    ...data,
    growth: undefined,
    level,
    exp: capped
      ? 0
      : start + Math.max(0, Math.min(end - start - 1, Math.floor((end - start) * fraction))),
    levelUpExp: capped ? 0 : end,
  };
}
