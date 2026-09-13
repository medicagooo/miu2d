/** Public Worker saves are independent of the full backend's user/game tables.
 * The local envelope remains miu2d-local-v1; both modes feed the same engine loader.
 */
export interface CloudPlayer {
  id: string;
  name: string;
  email: string;
}
export interface CloudSaveSlot {
  id: string;
  gameSlug: string;
  name: string;
  revision: number;
  updatedAt: number;
}
export const LOCAL_SAVE_FORMAT = "miu2d-local-v1";
export const MAX_SAVE_BYTES = 20 * 1024 * 1024;
export function isSaveData(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const value = data as Record<string, unknown>;
  return (
    Number.isFinite(value.version) &&
    [value.player, value.state, value.snapshot].every(
      (part) => !!part && typeof part === "object" && !Array.isArray(part)
    )
  );
}
