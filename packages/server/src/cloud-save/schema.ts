/** Additive, resumable initialization used by the deployment bootstrap and API.
 * Statements are independently idempotent; never rebuild local or existing databases.
 * New schema versions must retain compatibility with already deployed Workers.
 */
import schema from "./schema.json";
export const CLOUD_SCHEMA = schema;

export async function ensureCloudSchema(db: D1Database) {
  // Deliberately no module-global promise: bindings and request lifetimes may differ.
  const exists = await db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'cloud_schema'")
    .first();
  if (exists) {
    const version = await db
      .prepare("SELECT version FROM cloud_schema WHERE id = 1")
      .first<{ version: number }>();
    if (version && version.version >= 1) return;
  }
  for (const sql of CLOUD_SCHEMA) await db.prepare(sql).run();
}
