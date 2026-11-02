# Module Development Confirmation Report

**成员：** D - Peng Xin  
**项目：** CS250 TripMate Macau / D2-Team2  
**当前阶段：** 开发前确认  
**结论：** **BLOCKED**  
**报告日期：** 2026-10-30

本报告用于确认成员 D 的开发职责、文件边界、API 契约、跨模块依赖和集成风险。技术栈、API 命名、数据库 Schema 与成员分工均保持现有项目文件中的定义。对未定义的请求或响应字段，本报告只标记缺口，不自行补充公共规范。

## 1. Responsibility

| REQ | 优先级 | 成员 D 的职责 |
|---|---:|---|
| REQ-1.8 | H | 时间或交通方式编辑后重算；支持 15 分钟粒度；下游时间和 warnings 同步更新。C 提供重算能力。 |
| REQ-1.9 | H | 删除、替换和覆盖必须显式确认；取消后数据库中的 stops、版本和 timestamps 不得改变。 |
| REQ-1.10 | H | 使用 Leaflet/OpenStreetMap 展示真实地图；编号顺序与 `day.stops` 一致；支持外部导航和文字降级。 |
| REQ-1.14 | H | 保存候选 `PlanResult`；维护 optimistic version；支持保存、关闭和重新打开。A 提供持久化基础支持。 |
| REQ-1.15 | M | 负责 Plaza 发布侧：脱敏 preview、用户 opt-in publish 和公开字段白名单。B 负责读取和展示。 |
| REQ-1.11 | H | 负责地图起点展示；起点的创建、校验和 `GET /origins` 由 A 负责。 |

成员 D 还负责 `D-01` 至 `D-08`、Playwright 全链路 E2E、真实数据链路集成和部署演示。

不属于成员 D 的职责：

- Trip 创建、日期校验、预算、汇率、同行人、账单与结算：A。
- POI 搜索、详情、Match、Favorite、Add、周边美食和 Plaza 读取 UI：B。
- `generatePlan()`、约束检查、warnings 和 `revalidateAndRecalculate()` 内部算法：C。
- Prisma Schema/migration、共享 contracts、`app.ts` 路由注册和根 CI：A。
- 主 router、全局样式和 UI token：B。

## 2. File Ownership

可以直接创建或修改：

- `apps/api/src/features/itineraries/**`
- `apps/api/src/features/plaza/plaza.publish.*`
- `apps/web/src/features/itinerary/**`
- `apps/web/src/features/map/**`
- `tests/e2e/**`
- `docs/testing/integration.md`
- `docs/deployment.md`，需要 A 复核

需要其他成员批准才能修改的共享文件：

| 共享范围 | 审批 Owner | 成员 D 的处理方式 |
|---|---|---|
| `packages/contracts/**` | A | 提交 Contract Change，不直接修改 |
| `apps/api/prisma/**` | A | 提供持久化需求，由 A 修改 Schema 和 migration |
| `apps/api/src/app.ts` | A | 提供 Router export，由 A 注册 |
| 根目录 manifests、CI、dev scripts | A | 需要 A 审批；D 负责审核 |
| `apps/web/src/router/**` | B | 提供 Itinerary 和 Map Page 路径，由 B 注册 |
| `apps/web/src/shared/ui/**`、`apps/web/src/styles/**` | B | 使用 B 的 UI token 和全局样式 |
| `apps/api/src/features/planning/**` | C | 只调用 C 的导出函数，不修改算法 |

任何跨模块字段或接口变化都必须先创建 Contract Change Issue，说明影响范围、迁移方式、兼容性和测试，再提交对应 Owner 审批。

## 3. API Contracts

统一前缀为 `/api/v1`，使用 JSON UTF-8 和统一响应信封：

```ts
type Success<T> = { data: T };
type Failure = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};
```

HTTP 状态包括 `400`、`404`、`409`、`422` 和 `500`。时间使用 `YYYY-MM-DD` 和 `HH:mm`，按 `Asia/Macau` 处理；ID 为稳定 UUID；金额使用整数 minor units 和显式币种。

### 3.1 成员 D 负责的接口

| Method and Path | 已知请求参数 | 已知响应或行为 |
|---|---|---|
| `POST /trips/:tripId/itineraries` | `tripId: string`；请求 DTO 未定义 | 保存候选 `PlanResult`，应产生 `SavedItinerary`；路由级响应 DTO 未明确 |
| `GET /trips/:tripId/itineraries` | `tripId: string`；查询参数未定义 | 列出已保存行程；列表响应 DTO 未定义 |
| `GET /itineraries/:itineraryId` | `itineraryId: string` | 返回 `SavedItinerary` 和 optimistic version |
| `POST /itineraries/:itineraryId/edits` | `itineraryId: string`；必须包含 `expectedVersion` 和编辑命令；外层请求 DTO 未定义 | 调用 C 重算；版本冲突返回 `409`；成功响应 DTO 未明确 |
| `POST /itineraries/:itineraryId/publish` | `itineraryId: string`；请求体未定义 | 公开白名单快照目标类型为 `PublishedPostPublic`；preview 与最终 publish 未区分 |

### 3.2 成员 D 调用的接口和函数

| 来源 | 接口或函数 | 用途 |
|---|---|---|
| A | `GET /trips/:tripId` | 获取 `TripConfig` |
| A | `GET /origins` | 获取澳门预置起点和首段坐标 |
| B | `GET /trips/:tripId/targets` | 获取当前行程目标；响应 DTO 未明确 |
| B | `GET /pois`、`GET /pois/:poiId` | 获取 `POI` 坐标、营业信息、价格和 unknown 状态 |
| C | `generatePlan(input: PlannerInput): PlanResult` | 获取候选日程 |
| C | `revalidateAndRecalculate(input: RecalculationInput): PlanResult` | 获取编辑后的重算结果 |

### 3.3 关键共享类型

| 类型 | 关键字段 |
|---|---|
| `TripConfig` | `id`、`title`、起止日期、`origin`、`dayWindows`、`interests`、`budget`、`pace` |
| `POI` | `id`、名称、分类、坐标、地址、营业时间、建议时长、价格、来源和 unknown 状态 |
| `PlannedStop` | `id`、`poiId`、`date`、`arrive`、`start`、`end` |
| `TravelLeg` | `fromPoiId`、`toPoiId`、`mode`、`durationMinutes`、`estimatedCost`、`estimateStatus` |
| `PlanResult` | `tripId`、`status`、`days`、`unscheduled`、`warnings`、`estimatedTotalCost` |
| `SavedItinerary` | `id`、`tripId`、`version`、`result: PlanResult`、`updatedAt` |
| `PublishedPostPublic` | `id`、`title`、`publishedAt`、`days[{ date, poiIds }]` |

当前共享合同中的 `EditCommand` 为：

```ts
type EditCommand =
  | { type: 'setVisitTime'; stopId: string; start: string; end: string }
  | { type: 'setTransportMode'; date: string; toPoiId: string; mode: TravelMode }
  | { type: 'removeStop'; stopId: string; confirmed: true };
```

`TravelMode` 为 `walk | bus | taxi`。`RecalculationInput` 包含 `trip`、`allPois`、`current`、`command` 和 `fxRates`。

## 4. Dependencies

| 依赖方 | 成员 D 所需交付 |
|---|---|
| A | npm workspace、Prisma Schema/migration、`TripConfig`、澳门起点、`SavedItinerary` 版本存储、路由注册、统一错误处理和 CI |
| B | 可信 POI fixture、POI 坐标与开放信息、Trip Targets、主 router、Plaza 只读页面和独立 Favorite |
| C | 稳定的 `PlanResult`、`generatePlan()`、`revalidateAndRecalculate()`、warnings 和交通时间传播 |
| A + D | 部署文档复核、E2E 运行环境和 CI 集成 |
| B + D | Itinerary/Map Page 组件路径、Plaza 发布快照的消费边界和敏感字段白名单 |

A 必须先提交并合并 `bootstrap/contract-v1`。骨架合并前，D 可以使用符合共享合同的 mock，但最终测试必须使用真实 Trip、POI、PlanResult、持久化记录和发布快照。

## 5. Integration Risks

| 风险 | 等级 | 具体问题 | 相关文件或接口 |
|---|---:|---|---|
| `EditCommand` 与 D-04 不兼容 | **Blocker** | D-04 要求替换和覆盖，但共享合同只定义修改时间、交通方式和删除 | `SHARED_CONTRACT_v1.md / EditCommand`；`Codex_Member_D.md / D-04` |
| 发布 preview 与 publish 不明确 | **Blocker** | D-07 要求 preview 后进行 opt-in publish，但 API 清单只有一个 `POST .../publish` | `API_ENDPOINTS_v1.md / POST publish`；`Codex_Member_D.md / D-07` |
| 编辑请求未完全类型化 | High | `expectedVersion` 是强制参数，但 `RecalculationInput` 不包含它，外层请求和成功响应 DTO 未定义 | `API_ENDPOINTS_v1.md / POST edits`；`SHARED_CONTRACT_v1.md` |
| Itinerary 路由 DTO 不完整 | High | 保存、列举、编辑和发布接口缺少逐路由的请求体、响应体和列表结构 | `API_ENDPOINTS_v1.md` |
| `allPois` 来源未明确 | Medium | D 调用重算时必须提供全部 POI，但 POI 列表接口没有明确全量返回协议或服务层边界 | `SHARED_CONTRACT_v1.md / RecalculationInput`；`API_ENDPOINTS_v1.md / GET pois` |
| 发布标题来源未明确 | Medium | `PublishedPostPublic` 需要 `title`，但 `SavedItinerary` 不包含它，D 需通过 `tripId` 从 A 的 `TripConfig` 获取 | `PublishedPostPublic`、`SavedItinerary`、`TripConfig` |
| 地图坐标依赖 B | Medium | `PlanResult` 只保存 `poiId`，Leaflet marker 必须通过 B 的 POI 数据解析坐标 | `PlanResult`；`GET /pois/:poiId` |
| 重算算法重复风险 | 已识别 | D 不得复制 planner，所有编辑重算必须调用 C 的 `revalidateAndRecalculate()` | `Codex_Member_D.md`；`API_ENDPOINTS_v1.md` |
| 路由或地图重复实现 | 已识别 | B 负责 router lazy import，D 只提供 Itinerary/Map Page 组件 | `Codex_Member_D.md`；工程手册第 09 章 |

## 编码前需要确认

1. D-04 的替换与覆盖是否需要扩展 `EditCommand`。若需要，应由 A 发起 Contract Change，并由 C、D 和相关消费者确认。
2. D-07 的 preview 和最终 publish 采用两个接口还是一个接口的明确模式，以及如何保证第二次请求代表用户主动确认。
3. 保存、列举、编辑和发布接口的完整请求体、成功响应、`404/409/422` 错误体，以及 `expectedVersion` 的外层字段。
4. D 获取 `allPois` 的正式服务边界，以及保存和发布时从 `TripConfig` 获取 `title` 的方式。

## 最终结论

**BLOCKED**

成员 D 的基础职责、文件权限和大部分跨模块边界已经明确，但以下两项契约冲突必须先解决，否则 D-04 和 D-07 会产生重复实现或不兼容接口：

- 共享合同缺少替换与覆盖命令，与 H 优先级 D-04 冲突。
- 发布接口没有区分 preview 与 opt-in publish，与 D-07 的验收要求冲突。

在相关 Contract Change 经 A、B、C、D 确认并合入前，不应创建成员 D 的功能代码。确认后，应从已合并的 `bootstrap/contract-v1` 创建 `feat/d/<issue-key>`，按 H、M、L 和单个 Issue 小步提交。

## 依据文件

- `TripMate_Macau_4Member_Codex_Engineering_Playbook.pdf`
- `Codex_Member_D.md`
- `PROJECT_BASELINE.md`
- `SHARED_CONTRACT_v1.md`
- `API_ENDPOINTS_v1.md`
