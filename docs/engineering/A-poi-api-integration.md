# Member A — production API router integration

## Current baseline and recovered work

2026-11-08: fetched `origin/main=73314340ea24bc03435a6257607c034e3be46d2d`.
GitHub confirms PR #10 merged as `dbf7d45`, PR #11 as `7331434`.
Original local branch `feat/a/poi-api-integration` remains at `3061a2a`, preserving
`2f30979`, `3061a2a` and its historical B dependency merge. It was not reset or deleted.

New branch `feat/a/api-router-integration` starts directly from latest main.
Only A commits were cherry-picked: `2f30979` -> `65dd501`, `3061a2a` -> `ec3b614`.
No historical merge commit or B feature commit is carried in the new branch's
`origin/main..HEAD` commit range. The old B head `8bd2d52` is already an ancestor
of main. The worktree is `CS250-SE-POI-integration`; other worktrees and their
uncommitted files remain untouched.

## Changes relative to main

- `apps/api/src/app.ts`: default module registration invokes B's existing
  `createPoisRouter`, `createFavoritesRouter` and `createTargetsRouter` with the
  existing shared Prisma client. All paths remain relative to `/api/v1`.
  Explicit `options.modules` still supplies owner-isolated test modules.
- Preserve A's manual `apps/api/src/cli/seed-pois.ts` and root npm command.
  Both input and absolute existing database path are mandatory. No implicit
  DATABASE_URL, default fixture, database creation or migration is performed.
- Preserve A's isolated production-entry Playwright config/setup and CI step;
  extend verification with actual relation HTTP operations and default-app tests.
- No changes to B router/service/adapter/helper code, B fixtures/tests, Schema,
  migrations, public contracts, dependencies/lockfile, C/D code or web UI.
  `server.ts` is unchanged and remains the only production Express server entry.

Contract v1.1 REVISED and shared types remain the temporary implementation
baseline, not a new declaration of team contract approval. This backend
registration does not implement B's pending Favorites/Targets frontend pages.

## Manual seed boundary

From repository root, preview only:

```powershell
npm run db:seed:pois -- --database 'E:\absolute\existing.db' --input 'reviewed-pois.json'
```

Default is dry-run; `--dry-run` may also be explicit. Whole-batch validation
finishes before DB access. The CLI opens dry-run SQLite with `mode=ro`, prints
file SHA-256, existing POI count and UUID/NFKC-trim-lowercase name matches, then
calls B's unchanged `seedPois()`. Identity conflicts fail without regenerated
UUIDs. Alternate spellings/geographic aliases still require manual review.

A future authorized apply additionally requires `--apply --approved-sha256
<exact reviewed file hash>`. A matching hash binds file bytes, not team approval.
No startup, migration, install or build command seeds normal application data.
Formal apply requires the user's separate explicit approval and was not run.

## Database scope

**This task does not access any formal/demo database, including historical
worktree dev.db files.** Tests use a worktree-only infrastructure test DB and
per-suite newly created temporary SQLite files. No formal target is selected.

Historical 2026-11-06 evidence: the then-selected original-checkout path
`E:\MUST\2609\CS250 软件工程\CS250-SE\apps\api\prisma\dev.db` and its parent were
missing. That finding is not rechecked or presented as current database state.
Earlier A03/A04/A05 candidate dry-runs were not formal-target acceptance; their
historical details remain in the preserved old branch. No target dry-run is
performed or claimed for this 2026-11-08 task.

B's fixed pilot UUIDs/fixture bytes are untouched. The explicit E2E-only setup
(requiring `TRIPMATE_POI_INTEGRATION_TEST=1`) creates a disposable DB, runs the
manual CLI dry-run/apply/repeat solely there, then imports the compiled original
`apps/api/dist/server.js`. This existing test-only use of five pilot records
never imports them into a development/demo DB. Unit app tests instead use two
clearly synthetic POIs, and verify default app construction leaves an empty DB
empty. There is no extra custom Express listener or test registration override
in the production-entry E2E.

## Verification

The original 2026-11-08 verification:

- `npm run db:generate`: passed, Prisma 6.19.3.
- `npm run lint`: passed.
- `npm run typecheck`: passed, including CLI, config and integration tests.
- `npm test -- --maxWorkers=2`: 11 files, 171 tests passed.
- `npm run build`: passed, contracts/API/web.
- `npm run test:e2e:poi-integration`: 31 tests passed, including the compiled
  production entry, relation HTTP chain and existing A/B/D regressions.

The new default-app tests verify real HTTP -> registered Router -> Prisma ->
SQLite, Favorite PUT/DELETE idempotence and filtered POI readback, ordered targets,
duplicate Add 409 with shared error details, repeat DELETE, cross-Trip isolation,
independence of Favorites/Targets, fresh-client persistence and app reconnection,
unchanged Trip DTO and no startup seed. Existing B tests are reused unchanged.

The browser config includes A/D regression, B Shell/live POI tests and A's HTTP
integration checks. Some existing failure/component cases use declared mocks or
fixture props; this is not a claim that every browser test is unmocked or that
Favorites/Targets frontend integration is complete. Remote CI status is separate
from these actual local results.

## Review and publication

Before push, inspect `git diff --stat origin/main...HEAD`, the complete diff and
`git log origin/main..HEAD`. Compare B features/fixtures, schema/migrations,
contracts, web UI, server.ts and lockfile directly against main: all must match.
Then publish the new independent branch without force push and create a Draft
PR targeting main. No PR merge or auto-merge is authorized. Prior #10/#11
merge-order blockers are resolved; A's Draft PR now needs peer review.

## 2026-11-13 revalidation

Fetched the original development repository again: `origin/main` remains
`73314340ea24bc03435a6257607c034e3be46d2d`. The A branch already contains it;
no merge/rebase or B feature replay is needed. Existing Draft PR #17 is open,
unmerged and has no discussion/review comments at the time of inspection.
Continue that PR instead of opening a duplicate. Original branches and commits,
including `2f30979` and `3061a2a`, remain preserved.

Reviewed all three production registrations and the existing default dry-run
CLI. No production implementation change was necessary. Added one CLI regression
case for an existing but unmigrated temporary SQLite: failure must leave both
schema and file bytes unchanged. This complements missing-path, approval-hash,
identity-conflict, default zero-write and isolated idempotent-apply checks.

Actual reruns on 2026-11-13:

- `npm run db:generate`, `npm run lint`, `npm run typecheck`, `npm run build`: passed.
- `npm test -- --maxWorkers=2`: 11 files, 172 tests passed. The infrastructure
  suite was initialized in a newly created OS temporary directory; business
  suites created their own temporary SQLite databases.
- `npm run test:e2e:poi-integration`: 31 tests passed using the compiled
  production server entry and a new temporary SQLite database.
- B feature code, fixtures, Prisma schema/migrations, public contracts, web UI,
  C/D code, `server.ts` and lockfile remain identical to fetched main.

No formal/demo SQLite was accessed, migrated or seeded. No reads or writes were
made to the course repository, its `main`,
`migration/tripmate-stable-20261112` or migration PR #1. This task publishes only
to `lzq2005/CS250-SE`, branch `feat/a/api-router-integration`, Draft PR #17.
Formal-target verification/import remains a separate future task requiring a
confirmed target and explicit approval for any formal migration or Seed apply.
