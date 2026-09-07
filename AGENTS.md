# Repository privacy

- Keep deployment runbooks, production topology, host addresses, credentials, and production maintenance scripts outside this repository in a private local directory.
- CI may contain a generic deployment trigger. Keep production configuration and detailed deployment logs on the server.
- Do not commit private operational documents, including when asked to commit all completed work.

# Local database policy

- Do not create or rebuild a local database for this project. The incomplete local runtime recovery workflow from commits b5b90f7 and 7c4fb51 was withdrawn by the user on 2026-09-08; see `.branch-records/0908-remove-local-recovery/state.json`.
- Do not recreate the removed snapshot capture, resource mapping, or local database restoration workflow unless the user explicitly changes this decision.
