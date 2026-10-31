# TripMate Macau — Member D Codex Work Order

You are the implementation assistant for Member D: Peng Xin.
Project: CS250 / TripMate Macau / D2-Team2 Vibecoding.
This is a CLEAN CODE REBUILD, NOT a new software project: preserve Task 1 Proposal and Task 2 URS history and semantics.
Your functional ownership: Itinerary Editor / Map / Integration & E2E Owner.
Relevant URS IDs: REQ-1.8, 1.9, 1.10, 1.14; publishing-side REQ-1.15; map for 1.11.

MANDATORY FIRST ACTIONS:
1. Read docs/PROJECT_BASELINE.md, docs/SHARED_CONTRACT_v1.md, docs/API_ENDPOINTS_v1.md and the existing Task 1/Task 2 source documents if available.
2. Inspect the repository state and the current implementation; do not delete historic materials or force-push.
3. Print your planned file edits, API dependencies, acceptance tests and commands BEFORE coding.
4. Confirm shared contract types exist. If not, use stubs/mocks conforming to contract, and report blockers; do NOT invent incompatible new types.
5. Create a feature branch feat/d/<issue-key>; do not write directly to main.

YOUR FILE OWNERSHIP:
- apps/api/src/features/itineraries/**
- apps/api/src/features/plaza/plaza.publish.*
- apps/web/src/features/itinerary/**
- apps/web/src/features/map/**
- tests/e2e/**
- docs/testing/integration.md
- docs/deployment.md（与 A 复核）

TASK BACKLOG (implement H first, M then L):
- D-01 [H] My Trips 日程展示：天数/stop 顺序/transport/warnings
- D-02 [H] 真实地理 Leaflet 地图、编号标记与日程顺序一致
- D-03 [H] 交通方式及 15min 粒度时间编辑；调用 C 重新计算
- D-04 [H] 删除、替换和覆盖必须显式确认；支持 cancel no-op
- D-05 [H] 候选 PlanResult 的持久化、版本号、保存/重新打开
- D-06 [H] Map 服务失败时保留可用的文字顺序列表和外部导航链接
- D-07 [M] 发布前脱敏 preview + opt-in publish；向 B 提供公开只读快照
- D-08 [H] Playwright 全链路 E2E + 失败演示 + 本地部署手册

DO NOT:
- 不得为重算另写一套规则；调用 C 的 revalidateAndRecalculate
- 不得修改 B 的 router/global style，提交路由需求给 B
- 不得自行更改共享 DTO/DB schema；用 A 协调的变更 PR
- 不得让发布包含 companion/bill/budget/private note

INTEGRATION CONTRACT:
- Base path /api/v1; success { data: T }; errors { error: { code, message, details? } }.
- IDs UUID, local dates YYYY-MM-DD, local times HH:mm Asia/Macau.
- Unknown prices/hours/travel estimates stay null and are labeled unknown.
- Import shared types from packages/contracts; never duplicate cross-team DTO types.
- A owns Prisma schema/migrations and backend registration; B owns app router and UI tokens.
- All interfaces affecting another team are submitted as a contract proposal PR before changing implementation.
- No additional global package install or change to config without A review.

ACCEPTANCE CRITERIA:
- 地图编号顺序与当前 day.stops 顺序完全一致。
- 将 Bus 改 Taxi 后下游时刻按新估计传播，warning 同步改变。
- 取消删除和覆盖：数据库版本、stops 和 timestamps 均不变化。
- 保存后重新打开：原 trip、POI ID、顺序和编辑后的时间完全恢复。
- Plaza 公开 JSON 不含同行人名、私人预算、费用行和私人备注。

REQUIRED DELIVERY IN EVERY PR:
- Issue/REQ IDs, explanation of user-visible behavior, touched files and impacted contracts.
- Code plus automated unit/integration tests, and a manual reproduction or screenshot where relevant.
- Evidence that npm lint, npm typecheck, npm test and npm build pass (or exact blockers).
- Clear instructions for other owners to use your exported API or UI component.
- Keep changes small. Never claim a task 'done' unless tests passed and integration is demonstrated.

Start with the H-priority first thin slice, using fixtures/mocks for dependencies. Do not attempt the entire project or another owner's feature.
