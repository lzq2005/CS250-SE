# TripMate Macau — Member A Codex Work Order

You are the implementation assistant for Member A: Li Zhiqing.
Project: CS250 / TripMate Macau / D2-Team2 Vibecoding.
This is a CLEAN CODE REBUILD, NOT a new software project: preserve Task 1 Proposal and Task 2 URS history and semantics.
Your functional ownership: Team Leader / Trip & Billing / Contract Steward.
Relevant URS IDs: REQ-1.5, 1.11, 1.12, 1.13; supporting infrastructure for 1.14.

MANDATORY FIRST ACTIONS:
1. Read docs/PROJECT_BASELINE.md, docs/SHARED_CONTRACT_v1.md, docs/API_ENDPOINTS_v1.md and the existing Task 1/Task 2 source documents if available.
2. Inspect the repository state and the current implementation; do not delete historic materials or force-push.
3. Print your planned file edits, API dependencies, acceptance tests and commands BEFORE coding.
4. Confirm shared contract types exist. If not, use stubs/mocks conforming to contract, and report blockers; do NOT invent incompatible new types.
5. Create a feature branch feat/a/<issue-key>; do not write directly to main.

YOUR FILE OWNERSHIP:
- apps/api/prisma/** (唯一迁移负责人)
- packages/contracts/** (唯一接口合并负责人)
- apps/api/src/features/trips/**
- apps/api/src/features/billing/**
- apps/web/src/features/trip/**
- apps/web/src/features/billing/**
- apps/api/src/app.ts (统一 route register)
- 根目录 package manifests、CI 和 dev scripts（与 D 评审）

TASK BACKLOG (implement H first, M then L):
- A-01 [H] 初始化单仓库、npm workspaces、Node 版本与运行命令，保留历史
- A-02 [H] 冻结 packages/contracts 的数据类型、API 错误规范、测试 fixture
- A-03 [H] 设计 SQLite/Prisma Schema、migration、唯一索引及关系
- A-04 [H] Trip 创建/编辑/保存和澳门起点/每日时间段校验
- A-05 [H] 提供稳定 TripConfig API + companion 管理（不进入规划输入）
- A-06 [M] 实现参考汇率/预算及明确 unknown/error 回退
- A-07 [M/可选] 实现原币费用记录、参与者均分、CNY 结算及分币舍入
- A-08 [H] 四模块 API 注册、跨模块合并协调、文档与 CI 合规

DO NOT:
- 不得擅自替 B 改 POI 和全局页面样式
- 不得替 C 设计隐藏的规划算法
- 不把账单作为核心规划前置条件

INTEGRATION CONTRACT:
- Base path /api/v1; success { data: T }; errors { error: { code, message, details? } }.
- IDs UUID, local dates YYYY-MM-DD, local times HH:mm Asia/Macau.
- Unknown prices/hours/travel estimates stay null and are labeled unknown.
- Import shared types from packages/contracts; never duplicate cross-team DTO types.
- A owns Prisma schema/migrations and backend registration; B owns app router and UI tokens.
- All interfaces affecting another team are submitted as a contract proposal PR before changing implementation.
- No additional global package install or change to config without A review.

ACCEPTANCE CRITERIA:
- 日期结束早于开始、每日 end<=start 返回 422；不保存错误 Trip。
- TripConfig 对象保存后重新查询一致；起点必须澳门坐标/预置点。
- 仅修改同行人姓名，传给 C 的 Planner Request JSON 不变。
- 费用平分：仅 selected participants 分摊，分币后总额守恒；无 FX 不能伪造 CNY 结算。
- 最小启动成功：web + API + DB + /health，合同通过自动化类型检查。

REQUIRED DELIVERY IN EVERY PR:
- Issue/REQ IDs, explanation of user-visible behavior, touched files and impacted contracts.
- Code plus automated unit/integration tests, and a manual reproduction or screenshot where relevant.
- Evidence that npm lint, npm typecheck, npm test and npm build pass (or exact blockers).
- Clear instructions for other owners to use your exported API or UI component.
- Keep changes small. Never claim a task 'done' unless tests passed and integration is demonstrated.

Start with the H-priority first thin slice, using fixtures/mocks for dependencies. Do not attempt the entire project or another owner's feature.
