# TripMate Macau — Member B Codex Work Order

You are the implementation assistant for Member B: Xia Youran.
Project: CS250 / TripMate Macau / D2-Team2 Vibecoding.
This is a CLEAN CODE REBUILD, NOT a new software project: preserve Task 1 Proposal and Task 2 URS history and semantics.
Your functional ownership: POI Discovery / UI System / Plaza Reader.
Relevant URS IDs: REQ-1.1, 1.2, 1.3, 1.4, 1.16; read-side REQ-1.15.

MANDATORY FIRST ACTIONS:
1. Read docs/PROJECT_BASELINE.md, docs/SHARED_CONTRACT_v1.md, docs/API_ENDPOINTS_v1.md and the existing Task 1/Task 2 source documents if available.
2. Inspect the repository state and the current implementation; do not delete historic materials or force-push.
3. Print your planned file edits, API dependencies, acceptance tests and commands BEFORE coding.
4. Confirm shared contract types exist. If not, use stubs/mocks conforming to contract, and report blockers; do NOT invent incompatible new types.
5. Create a feature branch feat/b/<issue-key>; do not write directly to main.

YOUR FILE OWNERSHIP:
- apps/web/src/features/discovery/**
- apps/web/src/features/plaza/** (浏览UI)
- apps/web/src/shared/ui/**
- apps/web/src/router/**
- apps/web/src/styles/**
- apps/api/src/features/pois/**
- apps/api/src/features/favorites/**
- apps/api/src/features/targets/**
- apps/api/src/features/plaza/plaza.read.*
- data/fixtures/pois.* (只允许数据内容，不修改类型)

TASK BACKLOG (implement H first, M then L):
- B-01 [H] 制定 responsive 设计 token 和四个底栏 tabs + 四个首页入口
- B-02 [H] 用已批准 POI fixture 实现关键词搜索/分类与无结果状态
- B-03 [H] POI 详情页：坐标、营业时间、最晚入场、时长、费用及未知标记
- B-04 [H] Favorites 独立持久化；Add 只操作 trip targets；去重
- B-05 [M] POI Selection 从 TripConfig 读取兴趣，提供 Match%及解释
- B-06 [M] Plaza 阅读列表/详情，支持单 POI 收藏，不复制整段行程
- B-07 [M] 基于现有 food 类 POI 的附近建议（手动 Add）
- B-08 [H] 页面空态/加载/错误态 + 移动端响应式截图

DO NOT:
- 不得写新 Map 实现，D 负责地图
- 不得修改 C 的 planner、共享合同和数据库 migration
- Favorite 和 Add 不能被合并成一个状态
- 未核实的 POI 不准假定开放/免费

INTEGRATION CONTRACT:
- Base path /api/v1; success { data: T }; errors { error: { code, message, details? } }.
- IDs UUID, local dates YYYY-MM-DD, local times HH:mm Asia/Macau.
- Unknown prices/hours/travel estimates stay null and are labeled unknown.
- Import shared types from packages/contracts; never duplicate cross-team DTO types.
- A owns Prisma schema/migrations and backend registration; B owns app router and UI tokens.
- All interfaces affecting another team are submitted as a contract proposal PR before changing implementation.
- No additional global package install or change to config without A review.

ACCEPTANCE CRITERIA:
- 搜索无结果显示空态；清除关键词能恢复全量数据。
- Favorite 切换不更改 trip_targets；Add/Remove 不改 favorites。
- 重复 Add 只保留一个目标，并提示重复；无活跃 Trip 不允许 Add。
- 对缺少 openingHours 的 POI 显示 Unknown，而不是 24h/免费。
- Map 和 Itinerary 页面由 D 实现；B 的路由只做 lazy import，避免双实现。

REQUIRED DELIVERY IN EVERY PR:
- Issue/REQ IDs, explanation of user-visible behavior, touched files and impacted contracts.
- Code plus automated unit/integration tests, and a manual reproduction or screenshot where relevant.
- Evidence that npm lint, npm typecheck, npm test and npm build pass (or exact blockers).
- Clear instructions for other owners to use your exported API or UI component.
- Keep changes small. Never claim a task 'done' unless tests passed and integration is demonstrated.

Start with the H-priority first thin slice, using fixtures/mocks for dependencies. Do not attempt the entire project or another owner's feature.
