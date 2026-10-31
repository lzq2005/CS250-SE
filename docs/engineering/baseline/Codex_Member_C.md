# TripMate Macau — Member C Codex Work Order

You are the implementation assistant for Member C: Jiang Yuancheng.
Project: CS250 / TripMate Macau / D2-Team2 Vibecoding.
This is a CLEAN CODE REBUILD, NOT a new software project: preserve Task 1 Proposal and Task 2 URS history and semantics.
Your functional ownership: Planner Engine / Constraint Checking / Algorithm QA.
Relevant URS IDs: REQ-1.6, 1.7, 1.17; REQ-1.8 reusable recalculation support.

MANDATORY FIRST ACTIONS:
1. Read docs/PROJECT_BASELINE.md, docs/SHARED_CONTRACT_v1.md, docs/API_ENDPOINTS_v1.md and the existing Task 1/Task 2 source documents if available.
2. Inspect the repository state and the current implementation; do not delete historic materials or force-push.
3. Print your planned file edits, API dependencies, acceptance tests and commands BEFORE coding.
4. Confirm shared contract types exist. If not, use stubs/mocks conforming to contract, and report blockers; do NOT invent incompatible new types.
5. Create a feature branch feat/c/<issue-key>; do not write directly to main.

YOUR FILE OWNERSHIP:
- apps/api/src/features/planning/**
- apps/web/src/features/planning/**（仅生成入口/进度/警告公共组件）
- tests/fixtures/planning/**
- docs/architecture/planner.md

TASK BACKLOG (implement H first, M then L):
- C-01 [H] 实现 pure generatePlan(input): PlanResult 和 fixture tests
- C-02 [H] 按澳门位置分组 + 简单启发式排序，减少明显回头路
- C-03 [H] 覆盖开放日/开放时段/last-entry/游玩时长/日终的可行性检查
- C-04 [H] 生成 travel leg 的时间/成本估计并标注状态；不假装实时
- C-05 [H] 保留所有无法安排的 POI，并输出逐个冲突/原因
- C-06 [H] 提供 revalidateAndRecalculate() 给 D 调用
- C-07 [H] 适配人工时间/交通变更后的下游传播测试（与 D 对齐）
- C-08 [L/可选] 实现 relaxed pace（stop cap/buffer）与回归测试

DO NOT:
- 不得建第二套 Trip/POI types；只 import packages/contracts
- 不得直接更改 D 的 itinerary 数据表或持久化
- 不得静默抛弃不可行目标或捏造开放时间/交通价格
- 不得把同行人和账单传入规划条件

INTEGRATION CONTRACT:
- Base path /api/v1; success { data: T }; errors { error: { code, message, details? } }.
- IDs UUID, local dates YYYY-MM-DD, local times HH:mm Asia/Macau.
- Unknown prices/hours/travel estimates stay null and are labeled unknown.
- Import shared types from packages/contracts; never duplicate cross-team DTO types.
- A owns Prisma schema/migrations and backend registration; B owns app router and UI tokens.
- All interfaces affecting another team are submitted as a contract proposal PR before changing implementation.
- No additional global package install or change to config without A review.

ACCEPTANCE CRITERIA:
- 同一输入重复调用输出确定性一致（在 fixture 下）。
- 已知闭馆/超过最晚入场/日终放不下：不标为 feasible。
- selectedPoiIds = 所有 scheduled poiId 与 unscheduled poiId 的并集（无重复）。
- 时间安排顺序和每段交通分钟数相互一致，无未经解释的重叠。
- D 修改交通方式后调用同一 revalidate 函数，后续时刻和 warnings 自动更新。

REQUIRED DELIVERY IN EVERY PR:
- Issue/REQ IDs, explanation of user-visible behavior, touched files and impacted contracts.
- Code plus automated unit/integration tests, and a manual reproduction or screenshot where relevant.
- Evidence that npm lint, npm typecheck, npm test and npm build pass (or exact blockers).
- Clear instructions for other owners to use your exported API or UI component.
- Keep changes small. Never claim a task 'done' unless tests passed and integration is demonstrated.

Start with the H-priority first thin slice, using fixtures/mocks for dependencies. Do not attempt the entire project or another owner's feature.
