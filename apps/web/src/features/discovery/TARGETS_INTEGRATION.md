# B-04 Targets 前端接入准备 — 2026-11-06

## 分支与依赖

独立分支 `feat/b/B-04-targets-ui` 从 POI 分支的 `8bd2d52` 建立。PR #10 和后端 PR #11 不受本次修改影响，也没有把它们互相合入。

本分支依赖 PR #10 的实际 Shell、DiscoveryPage 和单一 activeTrip；运行 Targets 操作还依赖 PR #11 后端的审核合入及 A 的注册。独立分支不是“无依赖功能已上线”。后续先同步已批准的依赖，再提交独立前端 PR，避免把依赖提交误算作本批改动。

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
- `npm test -- --maxWorkers=2`：120 tests 通过（原111 + 客户端9）。默认 `npm run check` 在 A 原有 trips 迁移 beforeAll 超过10秒，24项未执行；限制本地并发复核后全部通过，没有更改公共配置或 A 测试。不能把首次默认 check 写为通过。
- `npx playwright test -c apps/web/src/features/discovery/playwright.config.ts`：9个通过（原POI4 + Targets5），本地设置 `TRIPMATE_BROWSER_CHANNEL=chrome`。
- Targets 浏览器用例显式控制 HTTP：读取／加入／刷新／移除、无旅行不请求、未注册接口不假成功、重复409、503结果未确认、POST404区分旅行有效／删除、切Trip旧响应隔离，以及320/390/768px。
- 原 live 配置复核结果另见本次接续记录；它仅覆盖已有 Trip/POI/组件链路，不包含正式 Targets 注册。

生产组件没有 fixture fallback，没有注册 API、没有修改 Schema／公共类型／A 或 D 组件／共享 CI，也没有在正常数据库导入 POI。受控测试不等于正式 Trip → POI → Targets 全链路已完成。

## A 入口就绪后的验收

1. 先验证原启动入口的 Trip、POI、Targets 均已注册；只注册 POI 不代表 Targets 已启用。
2. 最终目标库由 A 手动 dry-run，查同名地点和固定 UUID；数据获批后才显式写入，不自动加载待审数据。
3. 使用真实 Trip 保存／恢复，搜索并查看固定 UUID 地点，加入、重复加入、移除、刷新后重读。
4. 在两个真实 Trip 间切换，确认目标独立、Favorite 不变、历史快照不改写；记录实际 HTTP 和数据库证据。
5. 配合 A/D 接入 CI；PR #10 保持组长要求的 Draft 状态。
