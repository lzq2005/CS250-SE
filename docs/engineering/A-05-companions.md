# A-05 Companion Management

Member A / Li Zhiqing. REQ-1.5. 2026-11-05 (Asia/Shanghai).

## Scope and baseline

The original Member A work order assigns A-05 to stable TripConfig APIs and companion management, with companions excluded from planning input. A-04 already supplies TripConfig create/read/update and the transaction-aware `readTrip` service. This change adds only companion list/add/rename using the existing Contract v1.1 REVISED_DRAFT temporary implementation baseline; it does not claim a four-member contract freeze.

Repository: https://github.com/lzq2005/CS250-SE. Branch: `feat/a/A-05-companions`. Worktree: `E:\MUST\2609\CS250 软件工程\CS250-SE-A05`. Base: remote main `5b8a8403b885ef27abc0b53461b9bf59701baf8f`, A-04 merge PR #9, with A-03 merge `cf69b81` as first parent.

Command-line `git fetch origin` failed DNS in the sandbox and connection to github.com:443 in authorized execution. The GitHub connector verified the current remote main. Its signed raw commit payload/signature was reconstructed and accepted only after the complete Git object SHA matched `5b8a8403b885ef27abc0b53461b9bf59701baf8f`; its tree `e46a844257ef64b95ab7249c5db53948f269fee1` exactly matches the existing A-04 tree. The local origin/main ref was synchronized to that verified object and the isolated A-05 branch fast-forwarded before coding. This is not a successful command-line fetch. Sync evidence/helpers are adjacent to the worktrees in `.a05-sync`, outside this PR.

The original CS250-SE README modification and untracked docs/task-2/evidence remain untouched. Existing A-03/A-04/bootstrap worktrees were not edited. No project rebuild, new dependencies, shared DTO changes, Prisma changes, migrations, or B/C/D business changes are included. E2E is a new A-05-specific test file; D's existing E2E files remain unchanged and should be reviewed by D.

## API and consumer handoff

All paths use `/api/v1`. The existing application already registers the Trip router; no new global registration or navigation is required.

| Method/path | Input | Success |
| --- | --- | --- |
| GET `/trips/:tripId/companions` | Trip UUID; no query parameters | 200 `{data:{items:Companion[],total:number}}` |
| POST `/trips/:tripId/companions` | `{name:string}` only | 201 `{data:Companion}` |
| PATCH `/trips/:tripId/companions/:companionId` | `{name:string}` only | 200 `{data:Companion}` |

`Companion` is the existing shared `{id,tripId,name}` type, imported from `@tripmate/contracts`. No storage timestamps are returned. Names are trimmed and must be nonempty strings; Unicode and internal spaces are preserved. No arbitrary maximum length or name uniqueness rule is introduced. Same-name people have distinct server-generated UUIDs. Lists use createdAt ascending, then id as a deterministic tie-breaker; total is computed from that same transaction's items.

Invalid UUIDs or undeclared queries return 400 BAD_REQUEST; malformed JSON uses the existing app's 400 handler. Missing/non-string/blank names and unknown fields return 422 VALIDATION_ERROR. The shared error envelope is `{error:{code,message,details}}`; field validation supplies details.fields. A nonexistent Trip, nonexistent Companion, or Companion belonging to a different Trip returns 404 NOT_FOUND. A valid empty Trip returns an empty list, not 404. Payload validation occurs before database access, consistently with A-04. No access to another Trip's companion name is exposed in errors.

Reads and mutations use Prisma transactions. Trip existence is checked inside the transaction. PATCH updates by both companion ID and trip ID, checks the affected count, and reads the result within the same transaction. Known connectivity errors reuse the existing sanitized 503 STORAGE_UNAVAILABLE handler; unexpected errors flow to the existing app's sanitized 500 handler. Failed mutations roll back.

Backend consumers may use `createCompanionService(db)` from `apps/api/src/features/trips/companions.ts`, returning `list(tripId)`, `create(tripId,body)` and `patch(tripId,companionId,body)`. HTTP consumers should use the paths above. TripConfig and Trip timestamps are never updated by companion operations. C should continue assembling PlannerInput from `readTrip` and its existing POI/FX sources without companions. B/D may consume the companion API without changing their TripConfig or navigation contracts. No companion UI or billing integration is claimed by this API task.

## Pending Contract Change: deletion

**Companion deletion is NOT implemented and is NOT complete.** Contract v1.1 explicitly excludes new Companion deletion. Member A confirmed on 2026-11-05 to implement only GET/POST/PATCH for this A-05 delivery.

The team must separately confirm the DELETE path, response format/status, repeat-delete and missing-resource behavior, and deletion effects on future payer/participant references and stored bills. No provisional DELETE response type or endpoint is introduced here. Shared DTOs, Prisma Schema and existing Contract files remain unchanged. DELETE currently reaches the existing 404 fallback; regression tests prove it does not remove the Companion. This 404 is not an implemented deletion contract.

## Verification

Windows, Node 24.18.0 / npm 11.16.0, locked Prisma 6.19.3. Initial sandbox npm installation failed with EPERM on workspace symlink creation. Authorized `npm ci --offline --no-audit --no-fund` succeeded with 373 packages and no manifest/lockfile edits. `npm run db:generate` and `npm run db:setup` succeeded, applying only the two existing migrations to a new local worktree database. Tests use separate temporary migrated SQLite databases.

| Command | Actual result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | 65 passed, 4 files (45 existing + 20 A-05 cases) |
| `npm run build` | Passed, API/contracts/Web |
| `npm run test:e2e` | 11 passed (10 existing + 1 A-05 live HTTP integration) |

Tests cover validation, exact DTO/list shapes, persistence, same-name IDs, stable rename IDs, deterministic list order, missing resources, cross-Trip isolation, rejected requests without writes, trigger-induced create/update rollback, and byte-equivalent serialized PlannerInput plus unchanged Trip rows after companion add/rename. The PlannerInput check uses the real Trip read service and a minimal valid consumer input; it does not claim C's planning engine integration is complete. E2E runs against the real app through Vite's API proxy and exercises malformed JSON, error statuses, persisted rename and unsupported DELETE. Existing A-04 and D-01 browser regressions pass unchanged. No native UI additions require screenshots.

## Remaining integration and review

- Review A-05 APIs and the new E2E file with consumers/D; local checks do not imply remote CI or peer approval.
- Add companion UI/consumer wiring in the appropriate owner module when scheduled.
- Track deletion as the Pending Contract Change above; no shared contract changes in this PR.
- Push this isolated branch and open a Draft PR targeting main; no automatic merge. Actual commit/upload/PR results are reported in the delivery message.
- This delivery completes the agreed A-05 API slice only; it does not complete the whole TripMate system, planning engine, billing, maps, or itinerary saving.
