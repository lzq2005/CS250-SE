# B-02 / B-03 — POI read module

Owner: B / Xia Youran. Implements the read API for REQ-1.1 / REQ-1.2 / REQ-1.3 against A-03's existing POI and Favorite tables. Contract v1.1 REVISED and `packages/contracts` remain the temporary implementation baseline; this module does not constitute team approval of the draft.

## Behavior

- `GET /api/v1/pois`: optional `search`, `category`, `favoriteOnly`. Search trims and performs case-insensitive literal substring matching on name/address/tags. Filters combine with AND. Results use `{data:{items,total}}`, ordered by name (`zh-Hant`) then ID; no pagination.
- `GET /api/v1/pois/:poiId`: returns `{data:POI}`, malformed UUID 400, missing POI 404. Unsupported detail query parameters return 400.
- Reject unsupported query keys, duplicate/non-string values, unknown categories and booleans other than exact `true`/`false` with 400 BAD_REQUEST. Empty search means no filter; empty category/favoriteOnly are invalid.
- Preserve unknown `null`, known closed `[]`, zero fee, last-entry null, and integer minor-unit currency amounts. Convert checkedAt to UTC ISO, flattening storage coordinates back into `position`. Never expose raw Prisma rows or BigInt.
- Malformed stored JSON/DTO values produce 409 DATA_INTEGRITY_ERROR, rather than silently dropping records. Storage initialization/connectivity/missing-table failures produce 503 STORAGE_UNAVAILABLE. Unexpected errors go to A's existing error middleware. Responses do not include SQL, stack traces or database paths.
- Read-only: never writes Favorites or TripTargets. `favoriteOnly` reads persisted Favorites, independent of Trip. Favorite/Target mutation routes are a later task.

## A-owned registration (not performed by B)

`createPoisRouter()` exports an Express Router with paths relative to `/api/v1`. A can import and register it using the existing mechanism:

```ts
import { createPoisRouter } from './features/pois/poi.router.js';
// In A's existing createApp configuration, preserving other modules:
{ owner: 'B', router: createPoisRouter() }
```

The factory defaults to A's existing Prisma client. Tests may inject an isolated client. Do not introduce a second server or another `/api/v1` prefix. Until A registers the module, the normal running application still returns its existing 404 for these routes.

For internal reads, `createPoiService(clientOrTransaction).list(filters)` and `.get(poiId)` return shared DTOs; `get` returns null when missing. Callers can pass their existing Prisma transaction to keep reads in their own snapshot. Batch target resolution/missing-target checks remain a subsequent B/C integration task; no new public HTTP URL is introduced.

## Data and development boundaries

Five real tourism POIs are now present in `data/fixtures/pois.curated-draft.json` as pending-review data, with source/geometry evidence and estimated representative coordinates. They are not team-approved or imported. `pois.review.md` describes limitations and the outstanding canonical-ID review. Synthetic records exist only in isolated tests, never as a production fallback.

## Seed preparation — 2026-11-05

`poi.seed.ts` exports `parsePoiSeed(input)` and `seedPois(database, input, options?)`. It is an import module, not a second seed entry or a CLI. It does not import the application's default Prisma client or load any fixture, alter Schema/migrations, register API routes or run on application startup. A still owns the common Seed entry and database-integration review.

Integration example for A, after reviewing the source data and canonical IDs (the variables below are supplied by A's entry):

```ts
import { seedPois } from './features/pois/poi.seed.js';
const preview = await seedPois(prisma, approvedPois); // default dry run
// Only the intentional approved write path:
const applied = await seedPois(prisma, approvedPois, { dryRun: false });
```

Both return `{dryRun,total,created,updated,unchanged}`; dry-run counts describe proposed changes. Both read an already-migrated database. The helper does not authorize or verify team approval: the caller is responsible for supplying approved data. It deliberately does not load the current curated draft, browser fixtures, or source metadata.

- Validates the complete batch before opening a transaction: exact shared POI field set, UUIDs, tags, coordinates, windows/overlaps/last entry, safe prices, ISO UTC timestamps and nullable fields. Source metadata objects and partial POIs are rejected.
- Duplicate UUIDs or normalized names within a batch are rejected. Existing normalized-name/different-ID or UUID-case conflicts require canonical-ID review. Name normalization uses NFKC/trim/lowercase, not a full geographic alias/deduplication service; simplified/traditional spelling and nearby distinct sites still need human review. These are import protections, not new shared DTO or database constraints.
- Uses the supplied stable IDs with upsert inside one transaction. Repeat identical input reports unchanged. Changed rows intentionally replace the full approved POI field set, including explicit nulls; it does not guess which old facts are more reliable or replace checkedAt with the current time.
- Maps unknown hours to `Prisma.DbNull`, known closed to JSON `[]`, prices to BigInt and timestamps to Date. Unknown/free remain distinct on readback.
- No deletes, relation changes, UUID regeneration or pruning of unrelated records. Favorites and Targets retain their references. Failures roll back the whole batch; concurrent/storage errors propagate to the caller rather than being counted as success.

Current status: helper and temporary-database tests are ready for review; **real-data apply, A's root Seed integration and team approval remain pending**. On 2026-11-05 PR #5 is still open with no GitHub discussion feedback; user also reports no group feedback. No draft data was imported.

Verification: the initial Seed slice passed **71 tests**. The final review package adds Seed-to-Router HTTP readback and read-only real-draft validation, for **73 tests** total; lint, typecheck and build passed. Cases cover default dry run, repeat apply, full-field updates, SQL NULL vs JSON [], large safe currency values, relationships and unrelated-row preservation, identity conflicts, whole-batch validation, malformed records, empty input and database failure rollback. The initial lint run found an unused test import; fixed before the successful full run. The final review package also reruns the existing 4 discovery browser cases. See `REVIEW.md` for the combined handoff and remaining integration work.

No Schema/migration, shared DTO, API registration, dependency, lockfile, CI or A/C/D feature code was changed. B-01 PR #5 remains independent. This branch starts from main at `cf69b81` after A-03 merged; it does not carry the unmerged B-01 UI.

## Verification (2026-11-04)

- `npm run db:generate`: passed after stopping the earlier local development server that held the Windows engine DLL open. Initial attempts failed EPERM; these were not counted as passes.
- `npm run lint`, `npm run typecheck`, `npm run build`: passed.
- Initial backend slice `npm test`: 43 passed (21 existing + 22 new POI cases). With the subsequent discovery client tests, `npm run check` passes 52 tests total. Existing test discovery and CI commands are unchanged. Initial sandbox run was blocked by temporary-file rename permission; normal authorized execution passed after the test database initialization fix.

`tests/unit/pois.test.ts` deploys A's actual migrations into an isolated temporary database. It checks response shape, deterministic ordering, literal/case-insensitive search, address/tag search, combined Favorite filters, bad/duplicate/unsupported queries, empty data, details/404, unknown/closed/free distinction, safe BigInt mapping, weekly windows, corruption, caller-owned read transactions and unavailable storage.

These are HTTP/database module tests via `createApp({modules:[...]})`, not evidence that A has registered the module or that the frontend displays real tourism data. The discovery module's separate 4 browser tests use controlled HTTP responses; see its README. Publishing this branch/creating a PR is a separate next action; no automatic merge.
