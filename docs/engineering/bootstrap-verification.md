# Bootstrap Verification — 2026-11-02

## Authorization and isolation

Member A / Team Leader授权的临时实施基线，不代表B/C/D批准。worktree：CS250-SE-bootstrap；分支feat/a/A-01-bootstrap；父提交8a47def。原CS250-SE文档分支与README及6个evidence文件保持未提交且不纳入本分支。

PR #1通过GitHub连接器读取返回404。只验证到本地已存在origin/docs/development-readiness-20261031跟踪分支及8a47def；远端默认分支/PR详情/最新状态未确认，不自动合并、冻结或推默认分支。最终git fetch origin尝试失败：禁止交互时无法取得GitHub Username，属于本机命令行认证缺失；本次保留本地提交，不声称已上传。

## Actual execution results

环境：Windows，Node v24.18.0，npm 11.16.0。安装和浏览器/进程测试需在非受限执行环境中运行；沙箱曾发生Registry ENOTFOUND及Vitest临时目录EPERM，不能把这些失败记为通过。

| Command | 实际结果 |
| --- | --- |
| npm install | 成功；生成package-lock，377包初装；统一Vite后移除4个重复包，再次install成功 |
| npm ci --no-audit --prefer-offline | lockfile重新安装成功（373包，54秒），随后再次生成Prisma Client成功 |
| npm run db:generate | Prisma Client 6.19.3生成成功 |
| npm run db:setup | dev.db迁移成功；修正首次空文件初始化后，在全新的bootstrap-clean.db迁移也成功 |
| npm run lint | 通过 |
| npm run typecheck | API/web/contracts及测试配置全部通过 |
| npm test | 1文件、5测试通过，含真实SQLite连接/事务回滚、503隐私错误、404及owner Router接入/非法JSON400 |
| npm run build | contracts声明/API JS/web资源构建成功；Vite8.3.5，web 13个module |
| npx playwright install chromium | 安装Chromium v1248及依赖成功 |
| npm run test:e2e | 2测试通过（9.8秒）；真实Vue→Vite proxy→Express→SQLite状态及重连；模拟503时显示可重试错误 |

E2E启动了真实API与web dev进程，用Chromium访问127.0.0.1:5173；API实际响应data.status=ok/database=ok。失败用例只对第二个测试的请求作明确503拦截，不冒充真实生产故障。进程由Playwright管理结束。npm ci重装后再次运行迁移、5个基础测试及2个E2E均通过（E2E第二轮7.9秒）。

这些结果仅覆盖bootstrap smoke，不是17项REQ验收。没有实现Trip CRUD、POI/targets/favorites、算法、编辑重算、地图、账单或发布。Leaflet依赖已装，地图没有实现。GitHub Actions已配置，远端CI尚未运行；Linux执行结果未验证。

## Known issues

- audit：16项（13 moderate/3 high），来自minimatch与deepmerge-ts等开发工具链及其传播；不宣称依赖安全扫描通过。没有执行force修复。
- ESLint9上游维护终止提示；后续专门维护PR升级并验证，避免把本次骨架变成无界依赖迁移。
- 所有业务DTO仅TypeScript约束，不代替运行时校验。当前只有health可用，其余路径404；Plaza仍Core/M，后续必须实现。
- 未解决IR-05–15与R1诊断/恢复细节保留在implementation-decisions和原审核文档；B/C/D尚未批准。
- Node/Playwright在沙箱中可能遭临时目录/子进程限制；普通Desktop终端运行本项目命令。实际通过结果来自允许子进程/网络的执行环境。
- 不把客户端SELECT1成功误当成业务表已存在；迁移仅DemoWorkspace基础表，业务schema由A与owner另行评审。

## Baseline traceability

最新项目落地Shared/API REVISED与Resolution已同工作树归档逐段文本核对一致（Git自动换行可能使原始字节hash不同）。本次采用的归档文件SHA-256：

- SHARED_CONTRACT_v1.1_REVISED_DRAFT.md: `6d07c027e64bead1d481b1ce265c9f87a797c9ab9af91a17ada08fc936f046bd`

- API_ENDPOINTS_v1.1_REVISED_DRAFT.md: `d254778fd87b1f55b04ea3eaee3cd79049e711a73268c4769680a1721680be79`

- Review_Issues_Resolution.md: `6aa0fdc72f8c184348ed1b9bda4c77676b1ceed4c2ef874be17fd200ff66f942`

## Changed files

以下新增文件及隔离分支README变更；不包含node_modules、数据库、构建产物、浏览器下载或原副本7项改动：

- `.env.example`
- `.github/workflows/checks.yml`
- `.gitignore`
- `.nvmrc`
- `README.md`
- `apps/api/package.json`
- `apps/api/prisma/migrations/20261102000000_bootstrap/migration.sql`
- `apps/api/prisma/migrations/migration_lock.toml`
- `apps/api/prisma/schema.prisma`
- `apps/api/src/app.ts`
- `apps/api/src/db.ts`
- `apps/api/src/features/billing/README.md`
- `apps/api/src/features/favorites/README.md`
- `apps/api/src/features/itineraries/README.md`
- `apps/api/src/features/planning/README.md`
- `apps/api/src/features/plaza/README.md`
- `apps/api/src/features/pois/README.md`
- `apps/api/src/features/targets/README.md`
- `apps/api/src/features/trips/README.md`
- `apps/api/src/server.ts`
- `apps/api/tsconfig.json`
- `apps/web/index.html`
- `apps/web/package.json`
- `apps/web/src/App.vue`
- `apps/web/src/api.ts`
- `apps/web/src/features/billing/README.md`
- `apps/web/src/features/discovery/README.md`
- `apps/web/src/features/itinerary/README.md`
- `apps/web/src/features/map/README.md`
- `apps/web/src/features/planning/README.md`
- `apps/web/src/features/plaza/README.md`
- `apps/web/src/features/trip/README.md`
- `apps/web/src/main.ts`
- `apps/web/src/style.css`
- `apps/web/tsconfig.json`
- `apps/web/vite.config.ts`
- `data/fixtures/README.md`
- `docs/engineering/bootstrap-verification.md`
- `docs/engineering/implementation-decisions.md`
- `eslint.config.mjs`
- `package-lock.json`
- `package.json`
- `packages/contracts/package.json`
- `packages/contracts/src/index.ts`
- `packages/contracts/tsconfig.json`
- `playwright.config.ts`
- `scripts/database.mjs`
- `tests/e2e/health.spec.ts`
- `tests/tsconfig.json`
- `tests/unit/api.test.ts`
- `tsconfig.base.json`
- `vitest.config.ts`
