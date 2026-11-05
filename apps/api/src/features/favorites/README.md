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

Favorite operations use transactions and never modify TripTarget, Trip, Companion, SavedItinerary or POI data. No active Trip is needed to favorite a POI. The service upserts on the existing unique poiId and deletes only that Favorite relation. The Favorites page will later use the existing `GET /pois?favoriteOnly=true` from PR #10; no extra list URL is invented here.

## A registration handoff

Export: `createFavoritesRouter(prisma)` from `router.ts`. A can add `{owner:'B',router:createFavoritesRouter(prisma)}` to existing app feature registration. This PR does not edit app.ts/server.ts or create another API server. Service factory `createFavoriteService(prisma)` exposes get/put/remove; no HTTP self-call.

`http.ts` and `transaction.ts` are internal B relation helpers also used by Targets, not new root middleware or cross-team DTOs. Retrying P2002/P2034 always starts a new transaction, at most three attempts. Unexpected failures pass to existing sanitized error middleware; unavailable storage/retry exhaustion returns 503 without raw errors.

## Validation and scope

`npm run check` passed: lint, typecheck, **75 tests** (45 current-main + 30 B-04), build. `tests/unit/favorites-targets.test.ts` uses actual migrations in an isolated temporary SQLite and synthetic POIs, never the real pilot data/demo database.

This branch `feat/b/B-04-favorites-targets` starts from main `5b8a840` and does not depend on unmerged PR #10 code. POI read integration will be tested together after PR #10 merges; no POI module was copied. Frontend Favorites UI, activeTrip state, Add button wiring and browser validation are not implemented by this backend slice. Shared CI commands/configuration, dependencies and Schema remain unchanged. Do not mark the whole B-04/user requirement complete.
