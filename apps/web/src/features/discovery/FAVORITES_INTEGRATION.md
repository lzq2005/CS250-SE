# B-04 收藏前端接入 — 2026-11-12

## 分支／依赖

`feat/b/B-04-favorites-ui` 已同步 `main=7331434`，包含 PR #10 的 POI/Shell 与 PR #11 的 Favorites 后端。Targets 前端在 `feat/b/B-04-targets-ui=0fdc6a6`，各自提交审核。

正常应用入口的 Router 注册由 A 的 PR #17 提供，目前待审核合入。收藏页面与已注册接口的联合验收依赖该入口和经确认的试点数据。

## 实现与契约

- 详情页 `FavoriteAction.vue` 读取／收藏／取消，按POI隔离响应；无activeTrip也能操作。不读写Targets、Trip或Planner。
- `favorites.api.ts` 导入实际 `FavoriteState`：GET `/api/v1/favorites/:poiId` 无body；PUT同路径仅`{}`；DELETE无body。均要求200和对应poiId/boolean；变更结果必须与操作一致。响应损坏／网络／JSON错误不假成功、不透出服务端内容。
- 成功后采用服务端状态；提交时禁用按钮。写入结果未确认时保留提示并禁用再次变更，先重读，避免自动重试掩盖状态。
- 仅消费原Shell路由。`#/favorites`复用Discovery列表，并使用GET `/pois?favoriteOnly=true`，search/category组合AND；已验证列表为每张卡提供初始收藏状态，不逐张GET。
- 详情链接保留favoriteOnly/search/category，刷新及返回收藏列表保留筛选；取消成功从当前列表移除。清除筛选仍只看收藏，不变成全量景点。
- 可选knownFavorite显式默认undefined，避免Vue将缺省Boolean转false而跳过详情读取。只有列表提供已知值，详情始终从API读取。
- 生产不导入任何测试fixture；未注册接口展示错误。Targets按钮仍是明确占位，其真实前端保留在另一分支。

## 验证

- lint、typecheck、build通过。`npm test -- --maxWorkers=2` 共10个文件、171项通过，包含main的164项及收藏客户端7项。
- Discovery受控HTTP浏览器8项通过（原POI4 + Favorite4），覆盖无Trip收藏、刷新、列表筛选／返回、无逐卡请求、未注册错误、失败重读、迟到响应和连续点击只提交一次。
- Shell与共享浏览器回归21项通过，隔离Trip／POI集成7项通过。隔离服务覆盖收藏路由尚未注册时的错误提示。收藏持久化分别由后端组合测试和前端受控响应测试验证，联合验收列于下一节。
- 320/390/768px无横向溢出；列表截图已视觉检查。截图使用显式合成数据，不是正式POI数据或正式导入证据。
- 收藏用例及相关浏览器回归共36项，使用仓库现有Discovery、live和Shell三个Playwright配置，浏览器为Chrome。

## 尚待正式验收

1. 前置PR审核合入、A注册Favorites及目标库确认后，使用真实API验证收藏、取消、刷新读回及列表更新。
2. 与独立Targets前端按干净依赖基线整合，验证双向独立、旅行切换不改变收藏；单独按钮测试不能代替完整联合链路。
3. 配合CI与独立前端PR审核。不能用受控响应通过写成正式持久化联调完成。

没有修改公共类型、Schema、API注册、A/D实现、依赖或共享CI；未导入试点数据。
