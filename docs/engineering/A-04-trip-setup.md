# A-04 Trip Information Setup — 2026-11-04

Member A / Li Zhiqing. REQ-1.5 and 1.11, budget input support for REQ-1.12. Temporary Contract v1.1 REVISED_DRAFT, not an A-02 freeze or four-member approval.

## Base and safe workspace

Official repository: https://github.com/lzq2005/CS250-SE. PR #6 is merged, merge commit `cf69b81da08a4dcbb79485a97cfb02c96d37bf2e`, with parents `82b2aec` (includes D-01 PR #3) and `082e293` (A-03). Worktree: `E:\MUST\2609\CS250 软件工程\CS250-SE-A04`; branch `feat/a/A-04-trip-setup`.

Git fetch was attempted twice in authorized execution and failed to connect to github.com:443; a sandbox attempt failed DNS. The GitHub connector read current main, PR #6 and the signed raw Git commit. The existing parent objects were merged with git merge-tree to produce the exact remote tree `1703b9f08f77c362cf68b749c45d54e6a346fc78`. The signed commit was reconstructed from GitHub's raw payload/signature and hash-checked against its exact SHA before storing the object and advancing origin/main. The A-04 branch was fast-forwarded to this exact remote commit before implementation. This is verified remote-object synchronization, not a successful git fetch or a new locally invented merge. All subsequent changes are based on the merged A-03/D-01 main.

Original CS250-SE remains on its document branch with modified README and untracked docs/task-2/evidence. A-01 and A-03 worktrees remain clean. No user files were stashed, staged, deleted or overwritten. Commit identity: lzq2005 / 278625566+lzq2005@users.noreply.github.com.

Read Member A work order, PROJECT_BASELINE, Shared/API v1.1 REVISED_DRAFT, shared TypeScript contracts, A-03 schema/migrations/handoff and existing app/tests. Plan before coding: A-owned validator/service/router + central registration, A-owned form and preview, API/database and browser tests, no second storage/DTO/migration or B/C/D feature changes.

## HTTP interfaces

All paths below are relative to `/api/v1`. Success uses `{data:T}`; failure `{error:{code,message,details}}`. Field errors use details.fields with path/reason.

| Method/path | Request | Success |
| --- | --- | --- |
| GET /trips | No query | List<TripConfig>, ordered createdAt then id |
| POST /trips | Existing CreateTripRequest | 201 TripConfig; server UUID; omitted pace becomes standard |
| GET /trips/:tripId | UUID | 200 TripConfig, 404 missing |
| PATCH /trips/:tripId | Nonempty existing PatchTripRequest | 200 complete validated TripConfig |
| GET /origins | No query | List<OriginOption>, verified static points |

Malformed UUID/query is 400; invalid fields, unknown fields at any object level, missing required inputs or invalid whole-object PATCH are 422. JSON parser retains existing 400 handling. Disabled `relaxed` returns 422 OPTION_NOT_ENABLED. Missing Trip is 404. Known connectivity failures become sanitized 503; unexpected failures pass to the existing sanitized 500 handler. No SQL, filesystem path or private rows are exposed.

Validation uses actual Gregorian date validity (including leap dates), exact YYYY-MM-DD and same-day HH:mm in Asia/Macau. Dates are not parsed with host-local timezone. Inclusive range must contain exactly one unique daily window per date, no extra dates, start < end and 15-minute manual input granularity. Interests must be a nonduplicated subset of the four existing categories. Budget is explicitly null, or MOP/HKD/CNY with nonnegative safe integer amountMinor; 0 is valid and never substituted for unknown. Name is trimmed/nonblank. Unknown fields are rejected, not stripped silently.

PATCH reads the current full config inside a Prisma transaction, replaces supplied composite values as whole objects, revalidates the merged config, and replaces windows atomically if supplied. Storage failure rolls back even previously removed windows. It never edits targets, companions, favorites, POIs or SavedItinerary snapshots. No Trip optimistic version has been invented; requests follow the local-demo serialized update contract.

Storage uses existing Trip/DayWindow only. Database money is BigInt and explicitly maps to safe number DTOs. Storage timestamps and companions never enter TripConfig. `readTrip(tx, tripId)` from `apps/api/src/features/trips/service.ts` accepts a Prisma transaction client for B/C consistent reads; no router import or HTTP self-call is needed.

## Origin data and conservative coverage

Runtime validation is offline point-in-polygon, with holes supported. It does not use only a bounding rectangle. The static generated file `macau-land.ts` is derived from [DSEC Census 2021 statistical zone layer 0](https://www.dsec.gov.mo/CensusGIS/rest/services/Production2021/Census2021_Population_PT_v2/MapServer/0), queried 2026-11-04 with where=1=1, outFields=*, returnGeometry=true, outSR=4326, maxAllowableOffset=0.00001, f=json. Downloaded JSON SHA256: `3f5c2080d2eb4b2b05b4d69a5a9f60ca1b843b0ca63dbd0faa1d83a18a7aebf6` (retained in the task's adjacent .a04-sync directory, not runtime storage).

The old service ignores reprojection while emitting a 4326 label: returned values near 20,000/20,000 are Macau Grid metres. They must not be treated as longitude/latitude. Conversion uses Macao 1920 / Macao Grid (EPSG:8433) to WGS84 via pyproj's Macao 1920 to WGS84 (1). [DSCC geodetic datum notes](https://www.dscc.gov.mo/files/geographical_geodetic_control/ENG/Macaucoord_2009_web_EN_v201702.pdf) describe the local grid. Generated output was checked against the two MGTO WGS84 sample points and negative mainland/sea/Hengqin samples. Exclude zone 0 (maritime) and 99 (University campus on Hengqin), union land zones, buffer inward 0.00010 degrees and simplify at 0.00001 degrees before rounding coordinates to seven decimal places. The inward margin deliberately rejects uncertain coastal/border points rather than accepting nearby sea/mainland. Rebuild helper: `apps/api/src/features/trips/build_macau_land.py <saved zones.json>`, using a separate pyproj/shapely tool environment; these packages are not project/runtime dependencies.

This is a **2021 census coverage snapshot**, not a current legal boundary or geocoder. New reclamation areas, coastline margins, the Hengqin campus/port exception and unrepresented areas are conservatively rejected with a visible request to select a verified point. It is not a claim that every legitimate Macau point is accepted. Updated land/port coverage needs separately reviewed source data. No guessed Hengqin entrance is included.

The initial curated options are Ruins of St Paul's and Senado Square. Exact coordinates were read from [MGTO's published map data](https://www.macaotourism.gov.mo/en/sightseeing/macao-world-heritage/ruins-of-st-pauls), retrieved 2026-11-04. This is a small verified origin catalogue, not completion of the eventual six port/airport origin catalogue in REQ-1.11. Other valid interior positions can be entered manually. Curated submissions must match label/coordinates in this catalogue, with 1e-7 degree tolerance for SQLite floating-point roundtrip; manual points must pass the same land test. No hours/prices/traffic estimates are invented.

## UI integration handoff to B

Reusable component: `apps/web/src/features/trip/TripSetup.vue`. Props: `initialTrip?: TripConfig`. Event: `saved(trip: TripConfig)`. B should mount it in the agreed Trip Planning route and set B-owned activeTrip from the saved event. No separate activeTrip/localStorage or global Router/style change is introduced here. No B approval or coordination reply is claimed; route integration remains pending with B.

Usable development preview: run `npm run dev`, open `http://127.0.0.1:5173/src/features/trip/trip-preview.html`. Like D-01's independent preview, it is outside global navigation and is not a separately configured production entry point. The normal build typechecks the component; B's eventual import will include it in the production bundle. Users can create, choose/load, edit and save Trips through the real API. Dates generate blank daily windows, preserving already-entered times. No date/origin/window values are fabricated. Blank budget means null; manual decimal conversion avoids binary float accumulation. Standard pace only. Scoped styles do not affect D/B components. Failed validation leaves the draft visible, errors include field paths, and submit is disabled during an in-flight operation.

The UI currently limits interactive date expansion to 367 days to avoid freezing the browser; the API has no new artificial trip-length limit. This is a form limitation, not a DTO change. No companions/billing, planning, map or itinerary operations are implemented.

## Actual verification

Windows, Node 24.18.0, npm 11.16.0, Prisma 6.19.3. npm ci --offline --no-audit --no-fund installed 373 locked packages in the new worktree. No package/lockfile changes. Prisma generation and migration deploy applied both existing migrations to a fresh local dev.db. No schema/migration changes.

- `npm run lint`, `npm run typecheck`, `npm run build`: passed.
- `npm test`: 45 passed, 3 files (21 existing + 24 Trip/API/database cases).
- `npm run test:e2e`: 10 passed (8 existing health/D-01 + 2 real Trip form/API cases).
- API tests cover create/list/get/PATCH/read-only consumer shape, large safe money, null budget, dates/windows/unknown fields/categories, invalid IDs/queries/disabled pace, origin forgery/geography and transaction rollback. A trigger-induced window insert failure proves both Trip and window restoration.
- E2E creates, reloads and edits persisted Trip/budget, preserves curated origin selection, and shows invalid manual-origin errors while keeping the form. Existing D-01 tests remain unchanged.

First checks found and fixed unused-variable lint, exact floating-point origin comparison, select accessible naming, and Vue numeric input coercion. Failed attempts are not counted as successful verification. Vitest/Playwright ran in authorized normal execution because this host's sandbox restricts their temp files/subprocesses. Remote CI must be reported separately from local checks.

## PR preparation and remaining integration

Target main, no automatic merge. Suggested title: `feat(a): implement A-04 Trip setup API and form`.

PR summary: Adds persisted Trip create/list/read/update and a reusable setup form for REQ-1.5/1.11. Validates inclusive daily windows, dates, static verified Macau origin coverage, preferences and nullable budget. PATCH is transactional and preserves all independent/saved data. Reuses A-03 schema and existing DTOs. Local lint/typecheck/build, 45 tests and 10 E2E pass. B route/activeTrip wiring, expanded port catalogue/current coastal coverage, and A-05 companions remain follow-ups; no C/D algorithms/components changed.
