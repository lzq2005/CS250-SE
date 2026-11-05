# 隔离的真实 POI 链路测试

本配置复用现有 Vue/Vite、A 的 `createApp`、B 的 Router/Seed 和 A 的实际 Prisma migrations，检查首批 5 条真实 POI 草案的传输／展示。不是正式 API 启动入口，不替代 A 的 Router 注册或手动 Seed 总入口。

```sh
npx playwright test -c apps/web/src/features/discovery/playwright.live.config.ts
```

使用本地 Chrome 时先设置 `TRIPMATE_BROWSER_CHANNEL=chrome`；使用已安装的 Playwright Chromium 可省略。没有新依赖。CI 接入仍由 A/D 协调，本批不修改共享 workflow。

## 隔离措施

- `server.ts` 必须有 `TRIPMATE_POI_LIVE_TEST=1` 才运行；由 Playwright 配置设置，不在正常应用中导入。
- 每次在系统临时目录新建独立 SQLite，覆盖该测试进程的 DATABASE_URL 后才动态导入原 app/db。不使用 `.env` 指向的演示库。
- 应用现有 migration，读入固定 UUID 的 5 条真实草案，断言默认 dry-run 拟新增5且库内0；再对临时库显式 apply；重复 apply 断言 unchanged=5。
- 复用 `createApp({modules:[...]})` 测试扩展点，只在测试中注入 POI Router。A-04 已合入主线，本测试不编辑 app.ts/server.ts。
- 只绑定 127.0.0.1；API 5182、Vite 5181 均不复用已有服务，避免误连其他服务。监听关闭时断开 Prisma 并清理临时目录，清理路径限制为系统临时目录直属测试目录。

## 验证范围

原有 3 个 POI 浏览器用例全部通过，且这些用例没有 page.route、伪造 fetch 或 fixture HTTP 响应；实际链路为浏览器 → 原 Vite 代理 → 原 Express 应用工厂中的 B Router → 实际 SQLite。

覆盖：5 条全量列表、中文关键词／history 分类、固定 UUID 详情、estimated 标记、未知营业与未知费用、官方免费及周窗口、刷新／返回保留筛选、nature 空结果、未知 ID 404，以及390px页面。手机截图见本模块 `previews/real-poi-mobile.png`。

正常演示库在此次测试后只读复查仍为0条 POI，5个UUID没有冲突。这里的临时库导入5条不等于 A 的最终目标库已导入，也不改变数据源元数据的正式导入计数。

新增 3 个 Shell 集成用例也通过：

1. 正式首页 → A TripSetup 保存 → activeTrip UUID 持久化 → 刷新真实 GET 恢复 → B 搜索／详情／返回，使用同一个隔离库。
2. 恢复 404 清空与服务失败保留／重试；只有故障场景拦截一次 HTTP 503，不能将整套测试称为全无拦截。
3. B Shell 挂载 D 的实际 ItineraryDisplay 组件，测试入口显式提供 D 组件测试 props，检查唯一主导航、刷新／返回和 320/390/768px。不是 D-05 真实保存行程后端集成。

目前合计6个用例。B-01 已合并，主导航和 activeTrip 已接线；仍待 A 正式注册／手动 Seed 接入、目标库确认、D 正式数据适配及 D-05 统一动态路由。旧5174草稿没有被替换。
