# Public-game local and cloud saves

Requested 2026-09-13 (Asia/Singapore). This changes the public-game deployment's
previous local-only save rule recorded by `0908-workers-game-tabs`. Original-site
resources and the optional full backend retain their existing behavior.

## Effective behavior

- `DemoSaveLoadPanel` offers local/cloud buttons for demo, sword1 and sword2.
- Local JSON import/export needs no account; the `miu2d-local-v1` envelope remains
  compatible and binds a snapshot to its game. Both directions cap files at 20 MiB.
- Cloud accounts are independent email/password player accounts, not original-site
  editor accounts. Passwords require at least 8 characters and at most 72 UTF-8
  bytes, are bcrypt-hashed at cost 12, and are never returned by the API.
- D1 holds player records, hashed-token seven-day sessions, schema version and save
  indexes. The host-only session cookie is Secure, HttpOnly and SameSite=Strict.
- Private R2 objects hold complete save JSON. The Worker checks the session,
  user and game on every read/write. Same-origin checks apply to mutation requests.
- Players create named saves, load, overwrite with expected revision, and delete.
  Another device's revision change returns 409; it never silently overwrites.
- Cloud rate limits are 10 auth requests and 30 save mutations per 60 seconds per
  platform location/IP, with an additional email-key auth limit. These are platform
  bindings rather than global account quotas. Body streaming enforces a bounded size.
- No email verification/recovery, public sharing, automatic sync, original-account
  migration or local database recovery is introduced. Screenshots are optional and
  are not collected into R2 by this implementation.

## Call relationships and failure behavior

`GameMenuPanel` selects `DemoSaveLoadPanel` only for `VITE_DEMO_ONLY`; the original
`WebSaveLoadPanel` and full-backend AuthContext/tRPC contract remain intact.
Both public panels call the supplied engine snapshot collector/loader. Engine
application is serialized across sources; a mode change, game change or unmount
invalidates an outstanding fetch/file read before it can call the loader. Session
checks have their own invalidation generation so old responses cannot overwrite a
new account state. Login happens in the panel and can continue a requested save.

`worker-demo.ts` sends only `/cloud-save/v1/*` to `cloud-save/api.ts`; the existing
public resource proxy never forwards player cookies or cloud writes upstream.
API routes are `auth/session`, `auth/register`, `auth/login`, `auth/logout`,
`saves?game=...`, and `saves/{id}?game=...` (GET/PUT/DELETE).

Save writes put a new R2 object before conditionally changing the D1 pointer.
Definite revision conflicts remove the unused new object. A D1 exception retains
it because the write may have committed; users can refresh the list to establish
the result. There is no cross-service atomicity. Versions older than one day are
pruned on subsequent successful writes of the same save, protecting in-flight
readers. A failed initial save with no index can leave an orphan; no global cleanup
job or unlimited-retention guarantee is claimed. Delete first tombstones the index,
then removes objects; retrying the same DELETE resumes object removal. Tombstones
remain in D1. Failure after player creation but before session creation is recovered
by signing in; no multi-step success is assumed.

`schema.json` contains additive, independently idempotent statements, with the
schema marker written last. `ensureCloudSchema` resumes interrupted initialization.
The generic `deploy:demo` entrypoint builds locally, lets Wrangler provision/reuse
D1/R2 bindings, and applies the same schema remotely. Plain Wrangler deployment is
also supported through first-cloud-request initialization. Failed deployment steps
exit nonzero. No local database is created. Production operations/credentials remain
outside the repository; executing provisioning/deployment still requires scoped
cloud-operation authorization. Real D1/R2 deployment has not been executed here.

## Verification

- `pnpm test:cloud-saves`: four API suites using Map-based binding fakes, covering
  auth, expiry, isolation, conflicts, ambiguous D1 writes, R2 failure and retry delete.
- `pnpm test:cloud-saves:ui`: React DOM/JSDOM regressions for delayed responses,
  repeated mode changes, unmount, local-file cancellation and engine loading lock.
- `pnpm build:demo`, server TypeScript check, changed-source Biome check.
- Public Worker dry bundle/runtime tests; full backend build and `test:workers`
  pass without opening a database. Real cloud service validation is still pending.
- Independent bug-review subagent found and rechecked the repaired request races.
  The dedicated Bugbot product tool was unavailable; no claim of its execution.

Worktree: `D:/proj/miu2d-cloud-saves`, branch `0913-cloud-saves` (Cloudflare saves).
Original `D:/proj/miu2d` quick-interaction edits remain user-owned and excluded.
