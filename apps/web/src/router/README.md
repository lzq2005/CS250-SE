# B Shell navigation — 2026-11-05

已同步 main `d93c24f65c18bba4dbed632b6d7d7079169680a1`（含 B-01、A-05 和 D-02）。Shell 是唯一 Router：`shell-router.ts` 管理 hash 监听，`routes.ts` 解析路径、查询和 POI UUID。功能组件接收 route、发出 navigate，不创建第二套路由。独立 Discovery 预览复用相同控制器。

正式 Shell 已懒加载 A 的 TripSetup 和 B 的 DiscoveryPage，支持 `#/trip`、`#/discover?...`、`#/pois/:poiId?...`。刷新／返回保留筛选，非法路径显示恢复页。原四个首页入口和底部导航保留。

`shared/active-trip.ts` 是唯一共享 activeTrip 实例；A 表单 saved 事件同步状态，只持久化 UUID，刷新通过真实 Trip GET 恢复。404 清除失效 ID；网络／服务失败保留 ID 并允许重试；请求版本防止旧响应覆盖新保存／清空。它不修改 A 的表单组件或 Trip API。

D 通过 `feature-views.ts` 的组件注入边界接入 map/trips；正式应用暂不提供测试数据或假保存行程。实际 D ItineraryDisplay 的组件集成由独立测试入口注入测试 props。未来 D-05 动态详情路径仍须由 B 在此统一扩展，本批未实现 D-05。

## 验证

- `npx playwright test -c apps/web/src/router/playwright.config.ts`：Shell 和原共享 E2E 回归；复用隔离临时 SQLite，避免 Trip 测试写入普通演示库。
- `npx playwright test -c apps/web/src/features/discovery/playwright.live.config.ts`：7 个集成用例，包含实际 Trip 保存／刷新恢复、POI、真实 D 行程与地图组件挂载。
- 本地 Chrome 可设置 `TRIPMATE_BROWSER_CHANNEL=chrome`，不使用个人浏览器资料。无新增依赖；共享 CI 接入由 A/D 协调。
- [B+D 手机集成截图](previews/b-d-shell-mobile.png)：明确标记组件测试数据，不代表正式保存行程链路完成。

## CSS 边界

App.vue 的 shell.css 使用 Vue scoped，A/D 内部标题和类不会被 Shell 选择器直接覆盖；容器宽度和公共主题仍可继承。原 CSS 隔离回归及真实 D 组件的 320/390/768px 回归通过。未修改 D 组件源文件。

正式 POI Router 注册、手动 Seed、最终目标库 dry-run/批准后显式写入仍由 A 处理。正常应用在接口未注册时显示错误，不使用测试启动器或 mock 冒充正式接口。

本批最终 `npm run check` 通过 lint/typecheck/111 tests/build；Shell+原共享 E2E 13个、live集成6个、Discovery受控响应4个全部通过。首次本地高并发出现 A 迁移测试初始化超时，随后限制并发通过；最终默认并发完整检查也通过。另一次沙箱临时文件重命名被拒后，在正常权限下复核通过；未修改公共测试配置。

## PR #10 最新main兼容性复核 — 2026-11-06

无冲突合入main d93c24f；A-05/D-02实现及原测试仅随main合入，未人工修改。B测试入口注入D真实ItineraryMap，新增320/390/768px、唯一主导航、切日后退出与反复挂载、Leaflet全局CSS对首页标题的回归。测试props和瓦片替换只在测试中使用，不是正式规划数据或生产地图适配完成。

lint/typecheck/build、`npm test -- --maxWorkers=2`（131个）通过；Shell+共享页面回归21、live集成7、Discovery受控响应4全部通过，共32个浏览器用例。本次使用低并发单测，没有声称重新执行默认`npm run check`。上方111/13/6为前一版本历史结果。

Targets前端0fdc6a6仍在独立本地分支，未混入本PR；PR #11后端也未混入。按组长顺序：先完整审核PR #10，再在其合入后同步PR #11；A独立注册POI/Favorites/Targets及手动Seed；前置模块合入后Targets前端另建Draft PR。当前PR继续Draft，不代组长合并。
