# Member A — POI API integration

## Dependency and scope

Checked 2026-11-06 against GitHub and fetched refs. `origin/main` =
`d93c24f65c18bba4dbed632b6d7d7079169680a1`; PR #10 is Draft, open and unmerged,
with no submitted reviews. Its head `feat/b/B-02-pois` =
`8bd2d527bde246f37b3a1766916df0cb363536e4`; common ancestor is `6aae40d`.
The isolated A branch `feat/a/poi-api-integration` starts from B's head and
merges main to include A-05 Companions and D-02 Map. This preparation branch
depends on #10 and must not be merged directly ahead of it.

Contract v1.1 REVISED_DRAFT and `packages/contracts` remain the authorized
temporary baseline, not team approval. A owns app registration, database/seed
entry, root scripts and CI. B owns the POI router/service/DTO adapter/seed helper
and fixtures. This change preserves all B feature files, shared DTOs, Prisma
schema and migration SQL byte-for-byte relative to the combined dependency base.

`createApp()` registers B's existing `createPoisRouter(prisma)` through the
existing modules loop at `/api/v1`. `server.ts` remains the sole application
server. Explicit `options.modules` replaces defaults for isolated owner tests;
production callers use `createApp()` without options. Trip routes, middleware,
health and error envelopes remain in place. There is no fixture fallback.

## Manual seed CLI

After `npm ci` and `npm run db:generate`, from the repository root:

```powershell
npm run db:seed:pois -- --database 'E:\absolute\target.db' --input 'data/fixtures/pois.curated-draft.json'
```

This defaults to dry-run; `--dry-run` may be explicit. Both database and input
are mandatory. Database must be an absolute path to an existing migrated SQLite
file. The CLI ignores `DATABASE_URL` and does not choose or create a demo DB.
It validates the whole input, prints its SHA-256 and target, reports existing
POI count and each candidate's UUID/name matches, and invokes B's `seedPois()`.
Dry-run opens SQLite with `mode=ro`. Conflicts are printed and B's helper fails
with nonzero exit status; no UUIDs are regenerated or records deleted.
Names use B's NFKC/trim/lowercase matching; geographic aliases and alternate
spellings still require human review. Exact UUID matches can propose full-field
updates; review both identities and the summary before any approved apply.

For a later, separately approved import only:

```powershell
npm run db:seed:pois -- --database 'E:\absolute\target.db' --input 'approved-pois.json' --apply --approved-sha256 '<reviewed SHA-256>'
```

The hash guard binds the exact file bytes; it does not establish team approval.
`--apply` and `--dry-run` are mutually exclusive. The current curated draft is
not automatically approved. No application startup, install, build or migration
command imports seed data. This task executes apply only in disposable test DBs.

## Isolated verification

`tests/unit/poi-cli.test.ts` migrates a new temporary DB and runs the actual CLI
as a child process. It covers byte-identical default dry-run, explicit target
selection despite misleading environment, missing/invalid input and missing DB,
hash/flag guards, synthetic-only apply/repeat and canonical identity conflicts.

After `npm run build`, run `npm run test:e2e:poi-integration`. Its guarded setup
creates a temporary SQLite DB, deploys existing migrations, invokes the CLI for
dry-run/apply/repeat on the five pending pilot records **for isolated testing**,
then imports the compiled production `apps/api/dist/server.js`. There is no
custom Express app, manual test registration or alternate production listener.
Playwright uses Vite's proxy to this sole server on test port 5182. Both test
servers disallow reuse. It includes existing A/D E2E, B Shell and real POI
browser tests plus A prefix/error/read-only checks. Existing controlled failure
and component-fixture tests retain their declared scope; this does not imply
that every regression case is unmocked. The new job is also included in CI;
local results do not claim a remote CI pass.

All test writes use temporary DBs. Target dry-run and actual results are recorded
below after execution; a previous member's result is not treated as final-target
evidence.

## Merge order

1. B updates/reviews #10 against current main; obtain the required review and
   manually merge #10. This task never enables auto-merge or merges a PR.
2. Fetch the resulting main and create a clean A branch from it. Cherry-pick
   only A's integration commit(s), excluding the preparatory dependency merge.
   This handles either merge, squash or rebase of #10 without duplicating B's work.
3. Review `git diff main...HEAD` to confirm only A's integration changes; rerun
   lint, typecheck, test, build and isolated E2E against the actual merged main.
4. Push that branch and open A's independent PR targeting main; another member
   reviews it. Until #10 is merged, this is a local dependent preparation branch.
5. Production seed approval is a separate later action: confirm target DB,
   canonical IDs, exact reviewed dataset hash and dry-run before explicit apply.

## Execution results

2026-11-06 local verification:

| Check | Actual result |
| --- | --- |
| `npm ci --no-audit --no-fund` | Passed outside sandbox after sandbox workspace-symlink EPERM |
| `npm run db:generate` | Passed, Prisma 6.19.3 |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed, including CLI and integration config/specs |
| `npm test` | 136 tests / 9 files passed; isolated worktree test DB plus per-suite temporary DBs |
| `npm run build` | Passed, contracts/API/web |
| `npm run test:e2e:poi-integration` | 29 passed using compiled production entry and temporary SQLite |
| Preservation | No A edits in B feature/fixture files, web UI, contracts, schema/migrations or lockfile; original dirty worktree unchanged |

The initial sandbox Vitest attempt had nine EPERM suite-load failures and ran
zero tests. The successful 136-test run used normal authorized Windows execution.
There were no code/test assertion failures in that run. This branch has not
been pushed, no A PR has been opened, and remote CI has not run for this change.
PR #10 was rechecked after local verification and remains Draft/open/unmerged.

### Confirmed formal target — file missing

After the initial handoff, the user selected this exact formal development/demo
database path:

`E:\MUST\2609\CS250 软件工程\CS250-SE\apps\api\prisma\dev.db`

Read-only filesystem verification on 2026-11-06 found that **both the file and
its parent `apps/api/prisma` directory do not exist** in that original checkout.
Therefore database structure, actual applied Prisma migration status, POI count,
UUID/name conflicts and formal-target dry-run are **unavailable / not run**;
the POI count must not be reported as zero. The checked-in migration files in
`origin/main` do not prove any migration has been applied to this missing file.

No database or directory was created, replaced or migrated; no formal-target
Prisma connection, `db:setup` or seed command was executed. Historical A03/A04/A05
databases are explicitly excluded as formal targets. Development/tests continue
to use isolated temporary SQLite, fixed B POI UUIDs remain unchanged, and formal
apply requires the user's later explicit approval. The next database action
awaits user direction concerning the missing file, rather than automatic setup.

### Earlier candidate dry-runs — historical evidence only

Before the formal target was selected, no `.env` or inherited `DATABASE_URL`
identified it. The CLI was run with explicit `--dry-run` against three migrated
local candidates. These are **not the formal target and cannot substitute for
its verification**. Paths below are relative to the shared workspace
`E:\MUST\2609\CS250 软件工程`:

| SQLite candidate | Count before/after | Fixed UUID/name collisions | Proposed created/updated/unchanged |
| --- | --- | --- | --- |
| `CS250-SE-A03/apps/api/prisma/dev.db` | 0 / 0 | None for all five IDs and normalized names | 5 / 0 / 0 |
| `CS250-SE-A04/apps/api/prisma/dev.db` | 0 / 0 | None for all five IDs and normalized names | 5 / 0 / 0 |
| `CS250-SE-A05/apps/api/prisma/dev.db` | 0 / 0 | None for all five IDs and normalized names | 5 / 0 / 0 |

All three returned `{dryRun:true,total:5,created:5,updated:0,unchanged:0}`;
each database's SHA-256 before/after was identical:

| Candidate | Database SHA-256 before = after |
| --- | --- |
| A03 | `acd27f3960d036f955d4b89b88c33450fa3ad0ce64bf1f17b660df30e4c9d311` |
| A04 | `08099bd5716915b5b1dce0899f236dfef2e0c1db9dc534cf5ebee27aa33bc15b` |
| A05 | `779994e7fcc83b9e3f0038aa76e1ff5e7e1d573fe9f9cd46f415dd513ccced7d` |

The bootstrap database has no POI table (read-only SQLite inspection); it was
not migrated or seeded. The integration worktree has no normal `dev.db`.
The fixture SHA-256 remains
`8954fd58b582b2ca4b7548a7851c86f446d0312997064eed5e47ea34c450487d`.
Full local CLI outputs are under ignored `test-results/CS250-SE-A0*-dry-run.txt`.
These results cover only these exact historical candidate files, not the
confirmed missing formal target. **Formal-target verification is blocked by
the missing file. No formal seed write was executed.**
