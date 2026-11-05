# B-02 / B-03 — Discovery

Owner: B / Xia Youran. B-02/B-03 search, categories and POI details, using existing shared POI/List types and the temporary Contract v1.1 baseline. REQ-1.3 Match% is not implemented or marked complete.

## Implemented

`DiscoveryPage.vue` calls `poi.api.ts` for real HTTP reads at GET `/api/v1/pois` and GET `/api/v1/pois/:poiId`. It has no production fixture fallback. Search matches the server contract (name/address/tags); category and keyword combine. Loading, empty results, missing details, request errors and retry are explicit.

Hash paths are `#/discover?search=...&category=...` and `#/pois/:poiId?search=...&category=...`. Returning from detail, browser Back and refresh retain filters. Debounced search and cancellation/sequence checks prevent older requests overwriting newer results.

Details show coordinates, windows/last entry, duration, integer minor-unit price, verification, source, checkedAt and notes. Unknown is distinct from free or known closed. Collections with malformed envelopes/fields are rejected rather than treated as empty or free. Favorites/Add buttons remain disabled until their independent mutation APIs and active Trip state are implemented.

All page styles are Vue-scoped. The component includes its own light-blue background and white content panel without changing global CSS, App.vue, A's backend registration or D's views. No map is implemented.

## Preview and remaining integration

With the existing web dev server, open `/src/features/discovery/discovery-preview.html`. This standalone development entry mounts the same API-backed component. It has no fixture mode or fake server. A must register B's POI Router and approve/import real POIs before real tourism data can appear. An unregistered list API displays an error; an empty registered database displays an empty list.

B-01 PR #5 is still open. After it merges, B can lazy-import this component into the shell for the two paths above. Do not replace the existing App or pull unmerged B-01 changes into this branch just for previewing. The normal App/build entry is unchanged; the standalone HTML is a Vite development preview, not a production navigation integration.

The outside-repository preview at port 5174 remains the older, visibly labelled synthetic fixture draft. It was not silently replaced by this production component.

## Source review data

The five real POIs in `data/fixtures/pois.curated-draft.json` have leader acceptance for pilot scope and estimated coordinates, as relayed by the user. B's local database audit found no ID/name collisions; the existing UUIDs are fixed for the pilot. The leader's target database still needs its own dry-run. `pois.sources.json` records this distinction and `pois.geometry.json` preserves the OSM evidence. Unknown windows/prices/durations remain null; coordinates are not exact entrances. Final target-database integration and imported counts remain 0. See `data/fixtures/pois.integration-status.md`. The Seed helper is implemented/tested, but A's common entry and app registration remain pending.

Synthetic POIs live only in `browser-tests/pois.synthetic.json`, are tagged `SYNTHETIC_TEST_ONLY`, and are imported only by tests. They must never be imported by the production page, API service or Seed. Tests intercept HTTP responses explicitly; this is not a deployed mock API.

## Verification — final review package, 2026-11-05

- `npm run check`: lint/typecheck/73 unit and database tests/build passed (21 original + 22 POI backend + 9 client + 21 Seed/handoff cases).
- `npx playwright test -c apps/web/src/features/discovery/playwright.config.ts`: 4 browser cases passed using installed Chrome via `TRIPMATE_BROWSER_CHANNEL=chrome`.
- Browser coverage: contracted requests, search/category, details, Back/refresh preserving query, unknown/closed/free, missing detail, unregistered API without fallback and recovery, rapid categories and 320/390/768 px layouts. Mobile screenshot inspected in `test-results/discovery/`.
- Initial new tests needed JSON import attributes for Node's ESM loader; corrected before the successful runs. No new dependencies installed.

Backend tests use the real A-03 SQLite migrations in a temporary database; browser tests use controlled synthetic HTTP responses. This is not yet evidence of real-data full-stack integration. New browser tests are separate from shared CI; A/D still coordinate CI registration. The unit tests are automatically discovered by the existing `npm test` command.
