# Member B — B-02 / B-03 统一审核交接

本批解决景点搜索、分类和详情的前后端实现，以及真实数据接入所需的 Seed 准备。关联 REQ-1.1 / 1.2 / 1.3。基于已合入 A-03 的 main，保留现有 Vue／Express／Prisma 工程与临时 Contract v1.1；不把草案当四人正式批准。

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
