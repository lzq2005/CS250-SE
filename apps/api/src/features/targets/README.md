# B-04 — Trip Targets backend

导航／activeTrip／Targets 集成方案见 [INTEGRATION_PLAN.md](./INTEGRATION_PLAN.md)。2026-11-07 已同步包含 B-01、A-05、D-02 及 PR #10 的 main；PR #11 继续 Draft，A 的正式注册／手动 Seed 及前端全链路验收仍待进行。

Owner B / Xia Youran. Uses the existing Trip/POI/TripTarget tables and shared `TargetsView`, preserving API Contract v1.1 REVISED semantics. No Schema/migration or contract changes.

## Interfaces

Paths relative to `/api/v1`, success `{data:{tripId,poiIds}}`, no invented list/pagination fields.

| Method/path | Input | Success |
| --- | --- | --- |
| GET /trips/:tripId/targets | UUID Trip, no query/body | 200; ordered IDs, empty `[]` allowed |
| POST /trips/:tripId/targets | UUID Trip, exactly `{poiId:UUID}` | 201 complete list; repeated Add is 409 DUPLICATE_TARGET with details `{tripId,poiId}` |
| DELETE /trips/:tripId/targets/:poiId | UUIDs, no query/body | 200 complete list; absent relation or missing POI still succeeds; only missing Trip produces resource 404 |

POST requires both Trip and POI; absent resource 404. Malformed UUID/URL/query 400; missing/unknown body fields 422. GET/DELETE reject bodies, and all methods reject queries. Format errors still apply to DELETE (an invalid UUID is not an idempotent-delete success).

## Ordering and write isolation

Add validates existence/duplicate relation and allocates max(position)+1 in the same transaction. It does not renumber remaining targets after removal; re-Add appends. An emptied list can restart at0. Existing DB unique `(tripId,poiId)` and `(tripId,position)` constraints remain the authority.

Internal relation transaction helper retries unique/write conflicts in a new transaction, at most3 times. Actual relation existence determines DUPLICATE_TARGET; a position collision alone is not mislabeled as a duplicate. Exhaustion yields retryable503 and no partial write. Requests remain single-user demo operations, not a promise of arbitrary production concurrency.

DELETE verifies Trip and directly deleteMany on the relation, deliberately not loading POI; it can repair a legacy dangling reference. GET returns all stored IDs without an inner POI join that would silently drop unresolved targets. It never changes Favorites or saved snapshots. Same POI can be a target of different Trips independently.

## Integration handoff

A registers exported `createTargetsRouter(prisma)` through the existing app mechanism; this module does not edit app.ts/server.ts. `createTargetService(prisma)` exposes get/add/remove. `readTargets(tx,tripId)` can be called inside C's existing read transaction, returning ordered shared TargetsView and 404 if Trip is absent. POI resolution is separate: C must resolve ALL returned IDs through the now-merged B read module and report missing POIs as DATA_INTEGRITY_ERROR; do not silently filter them. No new public HTTP endpoint for C.

POST requires a valid Trip path but does not invent server-side activeTrip storage. B's future shared frontend state must supply the active Trip; no active Trip means the Add button is disabled. Favorite remains independent of that state.

## Actual verification — 2026-11-07

Merged `origin/main=dbf7d45abfd07baf755b641716ac4a081bacccd9` without conflicts. `npm run lint`, `npm run typecheck`, `npm test -- --maxWorkers=2` and `npm run build` pass: **164 tests** total (main 131 + B-04 33). These commands were run separately; default `npm run check` was not rerun. The original 30 HTTP/SQLite cases cover:

- Favorite persistence and idempotence, missing POIs, exact shared envelopes.
- First-Add order, duplicate conflict details, removal/re-Add/reset, per-Trip isolation.
- Favorite/Target independence, Trip deletion preserving Favorites, unchanged saved snapshot.
- Missing-POI DELETE, actual legacy dangling-reference cleanup and foreign_key_check.
- ReadTargets in an existing transaction; invalid queries/UUID/body/JSON and no writes.
- Concurrent duplicate and different Adds/PUTs, controlled position-conflict retry and bounded busy failure, sanitized unavailable database errors.

The additional three integration cases compose actual POI/Favorites/Targets factories only in the test app, verifying POI Favorite AND filters and unchanged details; reopening through a fresh Prisma client/router against the same temporary DB; and ordered POI resolution through a caller-owned read transaction without selecting Favorites as targets. No production handler needed changes.

Tests use a fresh migrated temporary SQLite. Only the disposable test DB temporarily disables foreign keys to construct the legacy-corruption fixture, then immediately restores them; no production code disables FKs. No real tourism data or demo database is changed.

The existing Shell configuration passed **21 browser regressions**, including A-04/A-05 and D-01/D-02, on Chrome and the existing isolated server. No new browser tests/configuration or frontend implementation were added here; these checks do not prove the full Trip→POI→Targets browser flow or production registration. Root CI discovers the backend tests through existing npm test. PR #11 stays Draft pending review; A registers the routers and manual Seed separately. The target database and fixed UUIDs must be checked by A via dry-run and data approval before any explicit import. All five pilot POIs remain unimported in the normal demo DB.
