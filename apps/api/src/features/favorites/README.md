# B-04 — Favorites backend

Owner B / Xia Youran. Independent persisted Favorites for the existing single local demo workspace. No userId/auth layer, new Schema or new DTO. Baseline: current `packages/contracts` and provisional API Contract v1.1 REVISED, not a new contract approval.

## Interfaces

Paths below are relative to `/api/v1`, responses use the existing `{data:T}` envelope and shared `FavoriteState={poiId,favorited}`.

| Method/path | Input | Result |
| --- | --- | --- |
| GET /favorites/:poiId | UUID, no query/body | 200, current persisted flag |
| PUT /favorites/:poiId | UUID and exactly `{}` JSON, no query | 200 true; repeated PUT stays true with one row |
| DELETE /favorites/:poiId | UUID, no query/body | 200 false; repeated removal of a known POI stays false |

All three require a known POI (unknown POI 404); repeat-delete idempotence means no Favorite relation for an existing POI. The contract's special missing-POI cleanup exception applies to Targets DELETE, implemented separately. Malformed UUID/URL/query returns 400; unsupported body returns 422 with details.fields. Malformed JSON uses A's existing 400 handler.

Favorite operations use transactions and never modify TripTarget, Trip, Companion, SavedItinerary or POI data. No active Trip is needed to favorite a POI. The service upserts on the existing unique poiId and deletes only that Favorite relation. The Favorites page uses the existing `GET /pois?favoriteOnly=true` from the now-merged PR #10; no extra list URL is invented here. Production registration remains A's separate task.

## A registration handoff

Export: `createFavoritesRouter(prisma)` from `router.ts`. A can add `{owner:'B',router:createFavoritesRouter(prisma)}` to existing app feature registration. This PR does not edit app.ts/server.ts or create another API server. Service factory `createFavoriteService(prisma)` exposes get/put/remove; no HTTP self-call.

`http.ts` and `transaction.ts` are internal B relation helpers also used by Targets, not new root middleware or cross-team DTOs. Retrying P2002/P2034 always starts a new transaction, at most three attempts. Unexpected failures pass to existing sanitized error middleware; unavailable storage/retry exhaustion returns 503 without raw errors.

## Validation and scope

On 2026-11-07 this branch merged `origin/main=dbf7d45abfd07baf755b641716ac4a081bacccd9` without conflicts, including PR #10, A-05 and D-02. Actual rerun commands passed: `npm run lint`, `npm run typecheck`, `npm test -- --maxWorkers=2` (**164 tests**, main's 131 + 33 B-04), and `npm run build`. This is not a claim that the default unbounded `npm run check` was rerun. Initial attempts hit a sandbox cache permission failure and a Prisma startup timeout before business tests; the subsequent full isolated run passed without changing timeouts or business code.

The 33 cases in `tests/unit/favorites-targets.test.ts` use actual migrations in an isolated temporary SQLite and synthetic POIs, never the normal pilot/demo database. Three new combined-factory checks verify Favorite writes through POI AND filters, persisted state through a fresh client/router instance, and ordered target-to-POI reads in a caller-owned transaction. The real factories are composed only in tests, not registered in production app.ts.

The existing B Shell browser configuration also passed **21 tests**, including A-04/A-05 and D-01/D-02, using its isolated test server and Chrome (`TRIPMATE_BROWSER_CHANNEL=chrome`, `node node_modules/@playwright/test/cli.js test --config apps/web/src/router/playwright.config.ts`). This does not demonstrate real Favorites/Targets frontend integration; the server does not register these two routers.

`feat/b/B-04-favorites-targets` remains the backend-only Draft PR #11. Independent local Favorites/Targets frontend branches are not included. No POI implementation was copied or changed relative to the merged main. Shared types, CI commands/configuration, dependencies, Schema, migrations and A/D implementation remain unchanged. A's registration/manual Seed/target-database dry-run and the full user-flow verification are still pending. Do not mark the whole B-04/user requirement complete.
