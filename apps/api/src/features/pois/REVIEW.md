## 最新Review准备 — 2026-11-06

PR #10无冲突同步main d93c24f（含A-05/D-02）。lint/typecheck/build、131个单元／数据库测试（maxWorkers=2）、32个浏览器用例通过（Shell/共享21、live7、Discovery受控4）。A-05 HTTP、D-02原套件和实际B Shell挂载D地图的兼容性均有证据。生产地图数据适配、正式POI注册／Seed及Targets真实链路不在这些测试的完成声明内。

PR #11后端与Targets前端0fdc6a6均未混入。组长已确认先审合#10，再同步审合#11，由A独立接入三组Router和手动Seed，最后Targets前端另开Draft PR；当前#10仍Draft，不自动Merge，试点不自动导入。

## 最新导航接入更新 — 2026-11-05

B-01 PR #5 已合并，本分支无冲突同步 main `6aae40d`。Shell 唯一路由已接 A TripSetup、共享 activeTrip 和 B POI 搜索／详情；D 仅组件注入，实际 D 组件测试通过，D-05 动态详情尚未实现。未修改 A/D 组件、Schema、公共契约或 API 注册。正式 Router/Seed 入口和目标库仍由 A 集成；正常演示库无 POI 写入。PR #10 继续 Draft。

# Member B — B-02 / B-03 统一审核交接

本批解决 B-02/B-03 景点搜索、分类和详情的前后端实现，以及真实数据接入所需的 Seed 准备。REQ-1.3 的 Match% 未实现、未标记完成。基于已合入 A-03 的 main，保留现有 Vue／Express／Prisma 工程与临时 Contract v1.1；不把草案当四人正式批准。

最新反馈：用户转达组长已接受第一阶段实现及首批 5 条试点范围／estimated 坐标；B 本地查重无冲突，真实草案 dry-run 拟新增 5、实际写入 0。固定 UUID 清单与目标库接入前检查见 `data/fixtures/pois.integration-status.md`。A 负责 A-04 后的注册和手动 Seed 入口，PR #10 继续 Draft；这不是全栈联调或 Merge 许可。

最新接续：A-04 已合入 main，B 分支无冲突合入 `5b8a840`，没有人工修改 A 文件。97 个单元／数据库测试、lint/typecheck/build 通过，原4个浏览器用例通过；新增3个真实数据隔离浏览器测试通过（无HTTP mock，浏览器→代理→实际Router→临时SQLite）。测试启动器复用原应用工厂，仅测试注入 B Router，不是正式API入口。正常演示库仍0条，主导航／activeTrip等待B-01，A正式注册／手动Seed仍待接入。详见前端 `live-tests/README.md`。

## 本批可审核内容

| 部分 | 已实现 | 实际验证 |
| --- | --- | --- |
| POI 后端 | GET /pois、GET /pois/:poiId，关键词／分类／收藏 AND 筛选，稳定排序、参数与错误处理、DTO 映射 | Supertest 连接真实临时 SQLite；未知、免费、关闭、BigInt、坏数据等用例 |
| 搜索／详情前端 | 真实 HTTP 客户端、搜索／分类、详情、刷新与返回保留条件、错误重试、手机布局 | 4 个浏览器用例采用受控 HTTP 测试响应；没有生产 mock fallback |
| Seed 模块 | 默认 dry-run、整批校验、按稳定 ID upsert、幂等、事务回滚、关系保留 | 隔离 SQLite，并验证 Seed 后通过实际 Router 搜索／读取；不访问真实演示库 |
| 真实数据草案 | 首批 5 条结构完整 POI，官方资料及 OSM 几何／版本来源 | 只读结构校验及来源引用检查；未经批准、不导入数据库 |

后端导出 `createPoisRouter()`，内部读取导出 `createPoiService(clientOrTransaction)`。Seed 导出 `parsePoiSeed` / `seedPois`。具体导入示例及默认只预览的行为见本目录 README。

前端可用现有 Vite 服务访问 `/src/features/discovery/discovery-preview.html`。A 未注册 Router 时错误提示是预期行为；已注册但无数据时显示空列表。B-01 尚未合入，所以没有复制它的首页／路由代码；之后由 B 接入 DiscoveryPage 的两个 hash 路径。

## 需要 A／团队决定的接入项

1. 审核 POI Router／DTO／Seed 函数，A 统一注册 Router、接入 Seed 总入口；B 未修改 app.ts/server.ts、Schema、migration、公共类型、依赖或共享 CI。
2. 审核首批 5 条数据的参观范围、估计代表坐标、未知值及 B 最终批准的固定 UUID。用户已转达 D 澄清：大三巴 `1111...` 仅用于组件测试，真实集成不复用它；本批不覆盖 D 测试，现有候选 UUID 保持不变并等待 B 最终确认。该澄清不等于数据整体获批。
3. 数据和数据库接入审核完成后，先 dry-run，再由明确的写入路径 apply。本批不自动读取 `pois.curated-draft.json`；代码审核不等于数据获准导入。
4. B-01 合并后由 B 接主导航；A/D 协调新增浏览器测试的统一 CI 注册。

## 验证与边界

最终 `npm run check`：lint、类型检查、73 个单元／数据库测试、构建通过；独立 discovery Playwright 配置 4 个浏览器测试通过。初期 Windows 沙箱临时文件／Prisma 引擎锁问题及已修复的测试问题见各模块 README，不计作成功验证。

单元／数据库测试由现有 `npm test` 自动发现；新增浏览器用例需单独执行：`npx playwright test -c apps/web/src/features/discovery/playwright.config.ts`，使用本地 Chrome 时设置 `TRIPMATE_BROWSER_CHANNEL=chrome`。正常 CI 浏览器可不设置 channel。

本批不是完整生产联调：浏览器采用测试 HTTP 响应，尚无真实数据导入或主导航接入。Favorites／Targets 写接口、Match%、Plaza、附近建议不在本 PR；相应前端动作继续禁用，不会假装已保存。

请审核此批代码与资料；不自动合并 main，不要求组长先批准一个未完成的口头方案。数据详情见 `data/fixtures/pois.review.md`。
