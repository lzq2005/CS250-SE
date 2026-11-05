# B Shell navigation — 2026-11-05

已同步 main `6aae40d`（B-01 PR #5）。Shell 是唯一 Router：`shell-router.ts` 管理 hash 监听，`routes.ts` 解析路径、查询和 POI UUID。功能组件接收 route、发出 navigate，不创建第二套路由。独立 Discovery 预览复用相同控制器。

正式 Shell 已懒加载 A 的 TripSetup 和 B 的 DiscoveryPage，支持 `#/trip`、`#/discover?...`、`#/pois/:poiId?...`。刷新／返回保留筛选，非法路径显示恢复页。原四个首页入口和底部导航保留。

`shared/active-trip.ts` 是唯一共享 activeTrip 实例；A 表单 saved 事件同步状态，只持久化 UUID，刷新通过真实 Trip GET 恢复。404 清除失效 ID；网络／服务失败保留 ID 并允许重试；请求版本防止旧响应覆盖新保存／清空。它不修改 A 的表单组件或 Trip API。

D 通过 `feature-views.ts` 的组件注入边界接入 map/trips；正式应用暂不提供测试数据或假保存行程。实际 D ItineraryDisplay 的组件集成由独立测试入口注入测试 props。未来 D-05 动态详情路径仍须由 B 在此统一扩展，本批未实现 D-05。

## 验证

- `npx playwright test -c apps/web/src/router/playwright.config.ts`：Shell 和原共享 E2E 回归；复用隔离临时 SQLite，避免 Trip 测试写入普通演示库。
- `npx playwright test -c apps/web/src/features/discovery/playwright.live.config.ts`：6 个集成用例，包含实际 Trip 保存／刷新恢复、POI 和真实 D 组件挂载。
- 本地 Chrome 可设置 `TRIPMATE_BROWSER_CHANNEL=chrome`，不使用个人浏览器资料。无新增依赖；共享 CI 接入由 A/D 协调。
- [B+D 手机集成截图](previews/b-d-shell-mobile.png)：明确标记组件测试数据，不代表正式保存行程链路完成。

## CSS 边界

App.vue 的 shell.css 使用 Vue scoped，A/D 内部标题和类不会被 Shell 选择器直接覆盖；容器宽度和公共主题仍可继承。原 CSS 隔离回归及真实 D 组件的 320/390/768px 回归通过。未修改 D 组件源文件。

正式 POI Router 注册、手动 Seed、最终目标库 dry-run/批准后显式写入仍由 A 处理。正常应用在接口未注册时显示错误，不使用测试启动器或 mock 冒充正式接口。

本批最终 `npm run check` 通过 lint/typecheck/111 tests/build；Shell+原共享 E2E 13个、live集成6个、Discovery受控响应4个全部通过。首次本地高并发出现 A 迁移测试初始化超时，随后限制并发通过；最终默认并发完整检查也通过。另一次沙箱临时文件重命名被拒后，在正常权限下复核通过；未修改公共测试配置。
