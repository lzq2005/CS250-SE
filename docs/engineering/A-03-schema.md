# A-03 Database Schema & Migration — 2026-11-03

Member A / Li Zhiqing. Scope: shared persistence only; no business routes, planner, UI, billing or Plaza implementation.

## Baseline and repository safety

- Official repository: https://github.com/lzq2005/CS250-SE, default branch `main` (verified via GitHub connector).
- GitHub `main` and local `origin/main` both resolve to `1b755b60d720090be6b1f3e1cd8000399135cc27`, PR #2 merge containing A-01 `da0d875`. Initial sandbox Git CLI fetch failed with `getaddrinfo() thread failed to start`; connector independently verified the remote commit before development. A later authorized read-only fetch with credential helper disabled succeeded and confirmed the same main.
- Original `CS250-SE` remains on `docs/development-readiness-20261031`; its modified README and untracked `docs/task-2/evidence/` are preserved. Bootstrap worktree remains on A-01 and clean.
- Worktree: `E:\MUST\2609\CS250 软件工程\CS250-SE-A03`, branch `feat/a/A-03-schema`, based on verified `origin/main`. Local `main` tracking branch was created at that merge without checking it out.
- Commit identity: `lzq2005 <278625566+lzq2005@users.noreply.github.com>`.

Read Member A work order, PROJECT_BASELINE, Shared/API v1.1 REVISED_DRAFT, Review_Issues_Resolution, implementation decisions, all existing contracts, schema/migration, bootstrap HTTP/database and E2E tests. Task 2 was checked against the actual `Task 2/提交/TripMate_Task2_URS_Template_Rebuilt_v2.docx` XML, with the corresponding local extracted evidence for surrounding requirements. REQ-1.2/1.4/1.5/1.7/1.8/1.9/1.11/1.14 drive this schema. Source requirements are unchanged; final scope approval is still pending.

The original schema had only `DemoWorkspace(id, createdAt)`. It lacked every domain relation, target/favorite uniqueness, daily windows and saved snapshots. The bootstrap migration and table are retained.

## Minimal design and ownership

Planned and delivered files: Prisma schema, one additive migration, `tests/unit/schema.test.ts` with inline synthetic fixtures, this handoff. No shared DTO changes, root scripts/dependency/CI changes, B router/POI UI, C algorithm, D itinerary/map code or E2E file edits.

| Model | Storage and constraints |
| --- | --- |
| Trip | UUID, title, local dates, flattened origin, JSON interests, nullable paired budget, pace, timestamps |
| DayWindow | UUID, Trip FK, unique `(tripId,date)`, HH:mm with start < end |
| Companion | UUID, Trip FK, nonblank name, creation ordering; same names allowed |
| POI | UUID, category/tags, coordinates/address, nullable hours/duration/price/source/checkedAt/bookingNote, verification |
| TripTarget | UUID, Trip/POI FKs, unique `(tripId,poiId)` and `(tripId,position)`, nonnegative position |
| Favorite | UUID, unique POI FK, no Trip FK; single local demo workspace |
| SavedItinerary | UUID, Trip FK, version default 1, complete input/result/timeOverrides JSON, creation/update timestamps |

Trip deletion cascades to windows, companions, targets and saved itineraries. It does not affect POIs/Favorites. There is no new deletion API. POI deletion is restricted while any live Target or Favorite refers to it; this avoids silent target loss. No live POI FK exists inside saved JSON, so even eventual POI deletion cannot change a snapshot. Target removal never updates snapshots or Favorites. Normal FK-enforced writes cannot create dangling targets; B/C still need the contract's defensive missing-data handling for corrupted/imported storage. The cleanup DELETE must not require a successful POI lookup.

All new IDs use Prisma `uuid()` defaults (client-side generation); SQLite stores TEXT. Explicit IDs still require UUID validation at the API/import boundary. Existing DemoWorkspace IDs retain their old unconstrained format.

## SQLite mapping and handoff

SQLite/Prisma 6.19.3 Json supports arrays and objects; scalar list columns are not used. Prisma maps these to JSONB declarations in migration SQL. Preserve `openingHours` SQL NULL via `Prisma.DbNull` (unknown), versus JSON `[]` (known closed all week); JSON null is rejected. Price/budget use both amount/currency NULL for unknown/absent, and zero plus currency for known free/zero budget. No fabricated POI seed is added; fixtures are synthetic test-only data.

Money columns use `BigInt` / SQLite BIGINT with SQL CHECK range 0..9007199254740991. This preserves the shared safe-integer `Money.amountMinor` contract beyond Prisma Int's signed 32-bit range. A/B adapters validate `Number.isSafeInteger`, write `BigInt(amountMinor)`, and map non-null database amounts with `Number(value)`; never JSON.stringify raw Prisma rows containing BigInt. Other persisted enums are String plus SQL CHECK, without redefining DTOs.

- **A / A-04:** map flattened origin and budget to existing TripConfig; order windows by date; include only TripConfig fields, excluding companions and storage timestamps. Create/update Trip and all windows in one transaction after full validation. Rename Companion separately without touching Trip/PlannerInput.
- **B:** Prisma delegate is `tx.pOI`. Map coordinates, BigInt prices, timestamps (`toISOString`) and nullable JSON to shared POI. Use `tx.favorite.upsert({where:{poiId}, create:{poiId}, update:{}})` for idempotent Favorite PUT. Targets are separate. Allocate max(position)+1 in the Add transaction, then order by position; handle uniqueness conflicts/retry rather than dropping targets. After all removals an empty list can restart at 0. Map duplicate `(tripId,poiId)` to DUPLICATE_TARGET, not every position collision. Never infer selection from Favorites.
- **C:** use A/B read-only services in one consistent read transaction to assemble existing PlannerInput; no direct persistence in pure functions. Missing target POIs remain DATA_INTEGRITY_ERROR; no silent filtering. No companions/expenses in input.
- **D:** persist verified existing PlannerInput, PlanResult and folded TimeOverride[] as JSON. Candidate commands are not stored; no server draft table. Multiple saved plans per Trip are supported. Restore from saved input/result/overrides, including null diagnostic times, order, modes, warnings and original POI coordinates; never rebuild from current Trip/POIs. Convert updatedAt to UTC ISO. For edits/overwrite, use a transaction and `updateMany({where:{id,tripId,version:expectedVersion},data:{input,result,timeOverrides,version:{increment:1}}})`; count 0 means conflict/missing, never unconditional update. Read response within that transaction. C replay, source consistency, confirmation and full schema validation remain D/C business work.

## Migration and validation boundary

`20261103000000_a03_domain_schema/migration.sql` was generated with Prisma migrate diff from the A-01 schema, then augmented with named SQLite CHECK constraints. It creates seven tables and seven indexes; no old data/table is rewritten. Deploy with `npm run db:generate` then `npm run db:setup`. Do not edit an applied migration or substitute db push. Later table rebuild migrations must preserve the SQL CHECK constraints, which Prisma schema cannot express.

DB enforces FKs, uniqueness, nonblank title/name, basic date shape/order, valid same-day HH:mm order, coordinate bounds, enum domains, paired money/range, positive duration/version, array/object JSON containers and snapshot input.trip.id/result.tripId matching the row tripId. It does **not** claim complete runtime DTO validation: calendar-valid dates; day-window full coverage/in-range dates and 15-minute manual granularity; Macau origin legality; array item types/category values/window overlaps; full snapshot schema/stop references; provenance and replay checks belong in A-04 and B/C/D validators. Malformed/corrupt snapshots must produce a recoverable DATA_INTEGRITY_ERROR, not fabricated empty plans. Schema CHECKs are defense in depth, not HTTP validation.

No new cross-module DTO conflict was found. Historical docs name another repository and old v1; current leader instructions and the existing temporary implementation decisions supersede those suggestions. v1.1 remains provisional, not four-member approval or A-02 contract freeze. IR-05–15 and the previously noted shared transaction-context/last-entry/FX/publication questions remain open; this PR does not resolve them.

## Actual verification

Windows, Node v24.18.0, npm 11.16.0, Prisma 6.19.3.

| Command/check | Actual result |
| --- | --- |
| npm ci --offline --no-audit --no-fund | Passed, 373 locked packages; first sandbox attempt failed EPERM workspace symlink, authorized normal environment succeeded |
| npm run db:generate | Passed |
| npm run db:setup | Passed on fresh final-schema database and default dev.db; both migrations applied |
| Prisma migrate status | Passed, up to date (DATABASE_URL must be set for direct CLI use) |
| Prisma migrate diff --from-url <absolute dev.db> --to-schema-datamodel ... --exit-code | Passed, no difference |
| npm run lint | Passed |
| npm run typecheck | Passed after correcting a test tuple inference error |
| npm test | 2 files, 21 tests passed: 5 original HTTP/bootstrap and 16 schema cases |
| npm run build | Passed contracts/API/Vue production build |
| npm run test:e2e | 2 existing Chromium smoke tests passed, 9.1 seconds |

Vitest first failed in sandbox before running tests due to temporary-file rename EPERM. The initial sandbox E2E attempt did not complete server startup and was stopped; normal authorized execution passed. Direct CLI status/diff first used missing env/incorrect relative URL, then passed with explicit env/absolute path. These failed attempts are not counted as passes. E2E covers Vue→proxy→Express→SQLite health and visible failure/retry only, not future Trip or itinerary UI. No new browser download was needed. Remote CI result is separate from these local results.

Schema tests use an isolated temporary database: deploy only the bootstrap migration, insert an existing record, deploy the actual full migration chain, redeploy, and verify preserved data and foreign_key_check. Other cases exercise UUID generation, uniqueness/order, missing FKs, POI restrictions, Trip cascade/Favorite independence, unknown vs closed/free, invalid value rejection, nested rollback, safe money limits, full typed diagnostic snapshot roundtrip after source changes/deletion, multiple saved plans and competing version predicates (one winner). Test temp files are removed; dev DB/build output/node_modules are ignored.

Next: **A-04 Trip Information Setup** — Trip CRUD and explicit runtime validation/transactional daily-window replacement, then A-05 companion/read-only TripConfig integration. Coordinate B activeTrip state; do not implement their router or C/D features here.

## Publication status and ready PR content

Local commit retained. Git push failed because no usable command-line password/credential was available. Connected GitHub write attempts also failed with HTTP 403 `Resource not accessible by integration` at blob creation; no remote branch/commit/PR was created. This was authentication/integration permission failure, not an automatic approval rejection. No main update or force push occurred. Remote CI has not run for A-03.

GitHub Desktop: File → Add Local Repository → select `CS250-SE-A03` (the A-03 worktree), verify Current Branch `feat/a/A-03-schema`, then Publish branch. Open Pull Request with base `main`; do not merge automatically. If Desktop requires the primary working tree, preserve its uncommitted files and publish via an authenticated terminal in the A-03 worktree with `git push -u origin feat/a/A-03-schema`; do not switch or stash the original document worktree merely to publish.

Suggested title: `feat(db): A-03 TripMate domain schema and migration`

Suggested PR body:

> Adds the missing Trip, DayWindow, Companion, POI, TripTarget, Favorite and SavedItinerary persistence for REQ-1.2/1.4/1.5/1.7–1.9/1.11/1.14. Targets and Favorites are independent; saved plans retain exact input/result/timeOverrides snapshots, nullable diagnostics and optimistic version storage. The additive migration preserves A-01 metadata and adds FK/unique/CHECK constraints. Shared DTOs and B/C/D business code are unchanged.
>
> Validation on Windows/Node 24: Prisma generation, fresh migration, bootstrap upgrade/data preservation, repeat deploy, migrate status/schema comparison, lint, typecheck and build passed; 21 unit/database tests and 2 Chromium E2E smoke tests passed. Initial sandbox permissions required authorized normal execution. Remote CI is pending. Full runtime business validation and DTO adapters remain A-04/B/C/D work; see docs/engineering/A-03-schema.md for BigInt/JSON mapping and transaction requirements. Contract v1.1 remains provisional; B/C/D should review their schema consumers. No billing, Plaza or planner implementation included.
