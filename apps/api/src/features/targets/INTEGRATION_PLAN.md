# B 正式导航、activeTrip 与 Targets 接入计划

2026-11-05，依据用户转达的组长最新安排。本文是实施准备，不表示接口已注册、数据已导入或需求已完成；不变更公共契约、成员分工或技术栈。

## 接续状态 — 2026-11-07

B-01 PR #5、A-04／A-05、D-02 和 POI PR #10 已合入 main。PR #10 经 D 对 b19b8c5 正式 Approve，由组长合并；本分支已无冲突同步 `origin/main=dbf7d45`。PR #11 继续 Draft，先进行独立审核；A 仍负责正式注册、手动 Seed CLI 和目标库 dry-run，首批 5 条暂不正式导入。

Shell／Trip Setup／activeTrip 已随 PR #10 合入，不新增第二套状态或 Router。Favorites 与 Targets 前端已分别保存在 B 的独立本地分支，尚未混入本后端 PR。依赖正式合入后再各自同步 main，按约定单独准备 Draft PR 和完整真实页面联调。以下导航／交互规则继续适用；原依赖列表保留为历史实施顺序，不表示前置 PR 仍未合并。

## 依赖顺序

1. D 正式 Review B-01 PR #5，组长合并。
2. B 将 PR #10 同步最新 main，解决自身范围的冲突并回归，保持 Draft；依赖同步完成后按组长安排转正式 Review。
3. PR #10 通过代码审核后先合并 POI 模块，不启用 Seed，不自动导入草案。
4. A 从最新 main 建立独立集成分支，注册 createPoisRouter、添加手动 Seed 入口、协调新 POI 浏览器测试进入 CI，并检查 A-04 与 POI 搜索链路。
5. A 的 Seed 默认 dry-run，在最终目标库检查同名地点与固定 UUID。数据批准且预览确认后才显式写入；本地空库或临时库的结果不能替代目标库检查。
6. B 接入正式页面并配合真实目标库联调。PR #11 的 Favorites/Targets 还需单独审核合入及 A 确认注册，不能假设注册 POI 就等于启用这两组写接口。

B-01 合入后，Trip Setup/activeTrip 可利用已经合入的 A-04 接口先接；POI、收藏及 Targets 的完整用户流程仍按各自依赖验收。PR #10 与 PR #11 保持独立，不代组长合并。

## B 预计修改位置

| 位置 | 工作 | 边界 |
| --- | --- | --- |
| apps/web/src/router/**、App.vue | 已接到 TripSetup / DiscoveryPage；后续沿用 | 不换 Vue Router 或重搭工程 |
| apps/web/src/shared/active-trip.ts（已有） | 沿用单一共享状态及恢复逻辑 | B 内部状态，无公共 DTO 或后端 activeTrip 新接口 |
| apps/web/src/features/discovery/** | 收藏／Targets 客户端、按钮状态及目标读取 | 复用现有搜索、详情，不扩展 POI 响应字段 |
| B 所属测试／配置 | 导航、状态恢复、关系独立、异常和移动端验收 | 不自行修改共享 workflow，由 A 协调 CI |

apps/api/src/app.ts、server.ts、Schema/migration、Seed 总入口由 A 维护。TripSetup 是 A 组件，沿用 initialTrip / saved(trip) 边界，不擅自改它的事件或数据格式。

## 导航准备

- 首页“旅行规划”继续使用 #/trip，挂载已有 TripSetup；成功 saved 事件交给 B 的共享状态。
- #/discover 和现有 #/pois/:poiId 详情交给 DiscoveryPage。B 的 hash 解析须分离 pathname 与 query，避免分类／搜索查询被误认成未找到页面；返回和刷新保留筛选。
- Favorites 入口继续 #/favorites，列表复用 GET /pois?favoriteOnly=true，不新增收藏列表 API，不逐条扫描所有景点。
- Map／Itinerary 保持 D 所有，不用临时实现替代。样式保持局部隔离，验证窄屏内容和固定底栏。

## activeTrip 状态规则（仅前端内部）

只持久化 Trip UUID；内存使用服务端返回的 TripConfig。A/B/C/D 页面消费同一份状态，不各存另一份当前 Trip。

| 触发／结果 | 状态行为 | Add |
| --- | --- | --- |
| 尚无 Trip，或持久化 ID 格式无效 | 空状态；无效 ID 清除 | 禁用并提示先设置旅行 |
| TripSetup 保存成功 | 接收 saved 的完整 TripConfig，更新共享 ID | 数据可用后启用 |
| 刷新，有合法 ID | GET /trips/:id 恢复；恢复期间不使用旧快照冒充已验证数据 | 暂禁用 |
| 恢复200 | 使用本次完整响应 | 启用 |
| 恢复404 | 清空失效 ID／当前目标视图 | 禁用 |
| 网络失败或503 | 标记暂不可验证，保留 ID 供重试；不假定 Trip 已删除 | 禁用 |
| 用户主动清空／切换 | 清理或重新加载相应 Trip 的目标视图，不改 Favorites | 新 Trip 验证前禁用 |

现有 TripSetup 只发 saved，不发 loaded。B 不将表单“载入编辑”偷偷当成 activeTrip 已切换；当前 Trip 在外层明确展示。若需要“载入即设为当前”，先与 A 确认组件事件边界或由 B 外层显式选择／GET 后设置，不擅自改 A 组件。通过请求序号／选择版本防止旧恢复结果覆盖后续清空或新选择；这是内部实现方案，不新增公共字段。

## Favorites 与 Targets 交互规则

- Favorite 无需 activeTrip，PUT {}／DELETE 后以响应 FavoriteState 更新；失败保留原值。批量状态优先复用 favoriteOnly 列表，不为每张卡片重复请求。
- Add 使用点击时已验证的 activeTrip.id，POST {poiId}；成功只更新该 Trip 的 TargetsView，不自动收藏。重复409提示已加入并重新读取目标，不重复插入。
- Remove 调用 DELETE target，成功使用服务端的完整有序列表；不取消收藏、不修改已保存快照。
- 同一条目的请求进行中禁用相应操作。切 Trip 时按请求所属 Trip 隔离结果；不能把旧 Trip 的迟到响应写进新 Trip 的目标列表。
- POST target 的404可能是 Trip 或 POI 不存在，不能仅凭这个404清空 activeTrip；使用已有 GET Trip 重新校验。Trip仍有效时保留它，并核查地点／模块可用性，不解析错误消息字符串猜资源种类。
- 目标读取不静默过滤缺失POI；保留编号并显示资料不可用，C 的全量解析按契约报告 DATA_INTEGRITY_ERROR。收藏不参与 PlannerInput。

## 接入验收清单

1. 首页→Trip Setup保存→共享当前Trip→搜索→详情→Add，固定UUID全程一致。
2. 刷新恢复、失效Trip清理、503/断网重试、恢复中切换/清空不会恢复旧Trip。
3. 收藏与Add可分别切换；切Trip及移除目标不取消收藏，重复Add只保留一条。
4. 两个Trip之间快速切换，迟到响应不串目标；POST404正确区分失效Trip与缺失地点。
5. 搜索／分类／详情返回和刷新保留查询；空态／错误／未知值与手机布局保持正确。
6. 最终目标库的dry-run、显式导入、正常应用注册及新增CI用例有各自证据；不能用隔离测试代替这些完成条件。

当前已有：main 的 POI/Seed、Shell/activeTrip；PR #11 的33个后端关系／POI组合用例，合计164个单元／数据库测试通过，现有Shell配置21个浏览器回归通过。独立前端本地成果不等于正式页面联调；正式Router、目标库验证／批准写入及完整Trip→POI→Targets验收仍未完成。REQ-1.3 Match% 仍不标完成。
