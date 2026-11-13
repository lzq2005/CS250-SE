# B-04 Targets 前端接入 — 2026-11-12

## 分支与依赖

独立分支 `feat/b/B-04-targets-ui` 已同步 `main=7331434`，使用 PR #10 的 Shell、DiscoveryPage 和共享 activeTrip，以及 PR #11 的 Targets 后端。A 的正式接口注册在 PR #17，待合入并确认试点数据后执行正式验收。

## 已实现

- `TargetActions.vue` 在 POI 详情页展示当前旅行、已选数量和当前地点的加入顺序，支持加入／移除；不新增 Router。
- 只消费 `shared/active-trip.ts`，不另存 Trip、目标清单或未经验证的乐观结果。没有旅行时提供设置入口，恢复中／不可验证时不允许提交。
- `targets.api.ts` 按 Contract v1.1 和实际共享 TargetsView 调用：GET/POST `/api/v1/trips/:tripId/targets`、DELETE `/api/v1/trips/:tripId/targets/:poiId`。
- GET、DELETE 无 body，POST 仅 `{poiId}`；验证状态码、响应 tripId、UUID 数组、唯一性、加入／移除后的结果一致性；保留服务端顺序。
- 读取／提交期间禁用操作。重复409只针对结构化 `DUPLICATE_TARGET` 重新读取；其他未确认写操作不乐观成功或自动重试，先提示重新读取。
- POST/DELETE 的404会通过已有 Trip GET 重新验证 activeTrip，不按错误消息猜资源。Trip仍有效时保留它；Trip确实404才清空。
- 组件切换旅行／地点或卸载时取消旧请求，并用版本隔离迟到响应。取消浏览器请求不保证服务器取消写入，重新进入时必须读取服务器实际状态。
- 未改收藏、Planner 或已保存快照；收藏按钮仍明确未接入。本批不实现目标汇总页、生成或 D-05。

## 验证与限制

- lint、typecheck、build 通过。
- `npm test -- --maxWorkers=2` 共10个文件、173项通过，包含main的164项及Targets客户端9项。
- Chrome浏览器共37项通过。Discovery受控HTTP 9项，隔离Trip／POI 7项，Shell与共享页面21项。
- Targets 浏览器用例显式控制 HTTP：读取／加入／刷新／移除、无旅行不请求、未注册接口不假成功、重复409、503结果未确认、POST404区分旅行有效／删除、切Trip旧响应隔离，以及320/390/768px。
- 仓库外组合副本通过1项真实Router与临时SQLite浏览器验证。收藏、加入、刷新、切换测试旅行、移除及取消收藏均读写对应接口，两个旅行的目标保持独立。

## 与收藏前端的合并交接

收藏 PR #19 与本分支都改动 `DiscoveryPage.vue` 的组件导入和详情操作区域。组合副本已验证解决方式：保留 `FavoriteAction` 与 `TargetActions` 的导入和组件，替换详情操作区域的占位按钮。建议先处理收藏 PR，随后同步 Targets 并按该方式处理两处冲突，再运行组合验证。

正式链路验收使用 A 注册后的入口及获准的数据。组合验证的 Router 由临时服务注入，数据库为一次性 SQLite。

## A 入口就绪后的验收

1. 先验证原启动入口的 Trip、POI、Targets 均已注册；只注册 POI 不代表 Targets 已启用。
2. 最终目标库由 A 手动 dry-run，查同名地点和固定 UUID；数据获批后才显式写入，不自动加载待审数据。
3. 使用真实 Trip 保存／恢复，搜索并查看固定 UUID 地点，加入、重复加入、移除、刷新后重读。
4. 在两个真实 Trip 间切换，确认目标独立、Favorite 不变、历史快照不改写；记录实际 HTTP 和数据库证据。
5. 配合 A/D 核对正式入口及 CI，在完成页面验收后交付。
