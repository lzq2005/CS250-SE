# Temporary Implementation Decisions

2026-11-02: Member A / Team Leader explicitly authorizes bootstrap against Contract v1.1 REVISED_DRAFT. This is temporary implementation authorization, NOT approval by B/C/D and NOT a contract freeze. Original contracts remain unmodified.

## Authority and base

唯一仓库 lzq2005/CS250-SE；这取代历史草案中其他remote建议。隔离worktree来自本地文档提交8a47def；Draft PR #1读取返回404，远端PR内容/基准分支未验证，不假称已review或merge。原副本README与6个evidence文件不动。临时baseline为docs/engineering/contract-review下Shared/API REVISED和Review_Issues_Resolution，三者哈希见后续验证记录。

## Bootstrap scope and pending review

- Vue/Vite/TS/Tailwind，Express/TS，SQLite/Prisma 6.19.3（经典client/schema工作流），Leaflet/OSM依赖就绪；不实现地图或规划。Node 24开发/CI，lockfile记录确切依赖。
- Shared types preserve nullable diagnostic times, commands replay, timeOverrides, outer expectedVersion and public whitelist. Types alone do NOT perform runtime validation; only health and HTTP error handling implemented. Business input validators are future owner work.
- A owns this bootstrap. Minimal App.vue/styles and Playwright smoke tests temporarily provisioned for bootstrap under leader instruction; B/D must review before taking ownership. No full B/C/D functions implemented.
- DB only DemoWorkspace infrastructure migration; Trip/POI/targets/itinerary/billing domain schema deferred to A plus relevant owners. Do not infer domain persistence implemented from SQLite health success.
- API GET /api/v1/health actually probes SQLite; unavailable DB503. Feature routers mounted centrally via modules. Unimplemented endpoints404 NOT_FOUND, not fabricated business results/empty data. Error details always null unless explicitly defined later.
- Plaza remains Core/M required for eventual delivery; placeholder404 is absence in bootstrap, NOT scope removal.
- Arrival-after-locked-start, nullable estimates/cross-day, draft commands replay, deletion/restore remain provisional contractual rules, not algorithms implemented in bootstrap. D must provide visible conflict feedback AND handling entry; C supplies sole generate/revalidate. No Codex quietly resolves remaining IR-05–15.
- ESM throughout, npm workspaces local linking, Vite /api proxy avoids introducing authentication/CORS decisions. Loopback defaults for local demo; no production auth claim.
- Remaining discussions: last-entry unknown vs no restriction, monetary rounding/safe totals, public preview replay ordering, exact shared DB transaction context. Never silently alter baseline to solve them.

## Integration handoff

B: implement POI/targets/favorites and UI/router, return routers with paths relative to /api/v1. C: implement PlannerService using shared DTOs, no DB writes. D: implement itinerary/map/version/publish and extend E2E; invoke C functions, never duplicate algorithm. A registers routers and authors migrations. Each member starts a separate feature branch; no auto merge.

## Verified tooling adjustments / pending debt

- Vite统一为8.x（lockfile为8.3.5），解决Tailwind/Vitest对Vite8与web Vite7同时解析导致的插件类型冲突；没有替换Vue/Vite/Tailwind技术栈。
- packages/contracts通过postinstall先生成dist声明，避免API rootDir越界；新Clone先npm install，再db:generate、db:setup。
- Windows首次SQLite空文件导致Prisma migrate deploy返回空白Schema engine error；db:setup先用同一Prisma client建立连接/文件，再执行正式migrate deploy。新数据库已验证，非跳过migration。
- npm audit当前报告16项（13 moderate/3 high），主要根链为开发工具minimatch与Prisma CLI配置依赖deepmerge-ts；ESLint9另有上游维护终止提示。不使用audit fix --force，不偷偷跨major改ORM。本地演示使用可信配置，仍需在后续依赖维护PR评估支持版本/修复；未评估为生产安全，也未关闭这些告警。
