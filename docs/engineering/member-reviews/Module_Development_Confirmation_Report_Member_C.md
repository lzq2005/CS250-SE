# Module Development Confirmation Report

**项目：TripMate Macau｜成员：C · Jiang Yuancheng｜日期：2026-10-31**

本报告依据提供的工程文件进行开发前核对。未创建或修改项目代码；不改变技术栈、API 命名、数据库 Schema 或成员分工。

## 1. Responsibility

| REQ | 优先级 | C 的职责 |
|---|---|---|
| REQ-1.6 | H | 自动生成候选行程；位置分组与启发式排序；检查开放日、开放时段、最晚入场、游玩时长及日终；提供交通时间和费用估计 |
| REQ-1.7 | H | 保留无法安排的目标 POI，输出逐项原因、冲突和警告 |
| REQ-1.8 | H，支持 D | 提供统一重算函数，支持人工时间及交通方式修改后的下游时间和警告更新 |
| REQ-1.17 | L，可选 | 宽松节奏：增加缓冲或限制每日景点数，保留未安排目标 |

C 同时负责算法 QA：相同输入的确定性、目标集合完整性、时间与交通一致性及不可行场景测试。

不属于 C 的职责：A 的 Trip Setup、出发点、汇率参考、账单、Schema/migration 和 API 注册；B 的 POI、Favorite、Trip Targets 写入及全局 UI/router；D 的编辑交互、确认、保存恢复、版本控制、地图、发布和 E2E。C 不持久化行程，同行人和账单不进入规划输入；预算仍通过 TripConfig.budget 输入。不实现实时交通、天气重规划或全局最优路线。

## 2. File Ownership

以下均为规范中的仓库相对路径。

| 权限 | 路径或范围 |
|---|---|
| C 可创建或修改 | `apps/api/src/features/planning/**` |
| C 可创建或修改 | `apps/web/src/features/planning/**`，仅生成入口、进度和警告公共组件 |
| C 可创建或修改 | `tests/fixtures/planning/**` |
| C 可创建或修改 | `docs/architecture/planner.md` |
| 需 A 审批 | `packages/contracts/**`、`apps/api/prisma/**`、`apps/api/src/app.ts`、工作区依赖、配置、CI 和开发脚本 |
| 需 B 审批 | `apps/web/src/router/**`、全局样式、UI tokens；共享 UI 由 B 维护 |
| 需对应 Owner 协调 | B 的 POI/targets 模块及数据 fixture；D 的 itinerary/map 模块和 `tests/e2e/**` |

C 的后端模块只导出 Router，由 A 注册。跨模块变更须提交 Contract Change PR、消费方测试及相关 Owner 审核；共享字段变更须按四人确认流程处理。

## 3. API Contracts

### 3.1 C 实现的接口

| 接口 | 输入 | 输出 |
|---|---|---|
| `POST /api/v1/trips/:tripId/generate` | `tripId: string`（UUID）；HTTP body 未定义 | `{ data: PlanResult }`，仅候选结果 |
| `generatePlan(input: PlannerInput): PlanResult` | PlannerInput | PlanResult |
| `revalidateAndRecalculate(input: RecalculationInput): PlanResult` | RecalculationInput；D 在后端调用 | PlanResult |

以下为现有契约结构摘录，并非新增项目代码或类型提案：

```ts
type PlannerInput = {
  trip: TripConfig; selectedPois: POI[];
  defaultTravelMode: TravelMode; fxRates: FxRate[];
};
type RecalculationInput = {
  trip: TripConfig; allPois: POI[]; current: PlanResult;
  command: EditCommand; fxRates: FxRate[];
};
type EditCommand =
  | { type: 'setVisitTime'; stopId: string; start: string; end: string }
  | { type: 'setTransportMode'; date: string; toPoiId: string; mode: TravelMode }
  | { type: 'removeStop'; stopId: string; confirmed: true };
type PlanResult = {
  tripId: string; status: 'feasible' | 'needs_review' | 'infeasible';
  days: ItineraryDay[];
  unscheduled: Array<{ poiId: string; reason: string; code: WarningCode }>;
  warnings: PlanWarning[]; estimatedTotalCost: Money | null;
};
type ItineraryDay = { date: string; stops: PlannedStop[]; legs: TravelLeg[] };
type PlannedStop = {
  id: string; poiId: string; date: string;
  arrive: string; start: string; end: string;
};
type TravelLeg = {
  fromPoiId: string | null; toPoiId: string; mode: TravelMode;
  durationMinutes: number | null; estimatedCost: Money | null;
  estimateStatus: KnownStatus;
};
type PlanWarning = {
  code: WarningCode; poiId: string | null; message: string;
  severity: 'info' | 'warning' | 'error';
};
```

### 3.2 共享输入与基础类型

```ts
type Category = 'history' | 'food' | 'shopping' | 'nature';
type Currency = 'MOP' | 'HKD' | 'CNY';
type TravelMode = 'walk' | 'bus' | 'taxi';
type KnownStatus = 'verified' | 'estimated' | 'unknown';
type Money = { amountMinor: number; currency: Currency };
type GeoPoint = { lat: number; lng: number };
type WeeklyWindow = {
  weekday: number; open: string; close: string; lastEntry: string | null;
};
type POI = {
  id: string; name: string; category: Category; tags: string[];
  position: GeoPoint; address: string;
  openingHours: WeeklyWindow[] | null;
  suggestedVisitMinutes: number | null; price: Money | null;
  verification: KnownStatus; sourceUrl: string | null; checkedAt: string | null;
};
type TripConfig = {
  id: string; title: string; startDate: string; endDate: string;
  origin: { label: string; position: GeoPoint; source: 'curated' | 'manual' };
  dayWindows: Array<{ date: string; start: string; end: string }>;
  interests: Category[]; budget: Money | null; pace: 'standard' | 'relaxed';
};
type FxRate = {
  from: Currency; to: Currency; decimalRate: string;
  asOf: string | null; source: string | null;
};
type WarningCode = 'CLOSED' | 'LAST_ENTRY' | 'DAY_END' | 'OVERLAP'
  | 'BUDGET' | 'UNKNOWN_HOURS' | 'UNKNOWN_TRAVEL' | 'UNKNOWN_PRICE' | 'UNSCHEDULED';
```

ID 为稳定 UUID 字符串；日期为 YYYY-MM-DD，时间为 HH:mm、Asia/Macau。金额为整数最小货币单位；汇率为十进制字符串。openingHours 为 null 表示未知，空数组表示已知整周关闭；未知价格、时长和交通估计不得当作 0 或已确认可行。

### 3.3 依赖及交接接口

| 接口 | Owner | 已知内容及缺口 |
|---|---|---|
| `GET /api/v1/trips/:tripId` | A | 提供规划所需 TripConfig |
| `GET /api/v1/trips/:tripId/targets` | B | 提供目标集合；响应为 ID、目标记录还是完整 POI 尚未定义 |
| `GET /api/v1/pois/:poiId` | B | 提供 POI 详情；完整 HTTP 响应 DTO 未明确 |
| `POST /api/v1/trips/:tripId/itineraries` | D | 保存候选日程；完整请求/响应 DTO 未定义 |
| `POST /api/v1/itineraries/:itineraryId/edits` | D | 携带 expectedVersion，由 D 调用 C 重算；完整请求/响应 DTO 未定义 |

统一 HTTP 前缀为 /api/v1，JSON UTF-8；成功为 `{ data: ... }`，失败为 `{ error: { code, message, details? } }`。D 校验 SavedItinerary.version，版本冲突返回 409；expectedVersion 不属于 C 当前纯函数参数。

保存模型为 `SavedItinerary = { id: string; tripId: string; version: number; result: PlanResult; updatedAt: string }`。D 的保存及编辑接口属于交接边界，不由 C 实现。

## 4. Dependencies

| 成员 | C 所需交付 |
|---|---|
| A | 已批准共享类型、项目骨架、TripConfig/每日窗口/origin、汇率参考数据、统一路由注册与错误处理 |
| B | 稳定去重的目标 POI；坐标、营业时间、最晚入场、时长、价格、来源及未知标记；路由和 UI 规范 |
| D | 调用 C 的唯一重算函数；传入当前结果与编辑命令；负责版本校验和落库；共同验证编辑传播和保存恢复 |

依赖未就绪时可按规范使用符合冻结契约的 mocks/fixtures；最终必须替换为真实 API 数据链路。

## 5. Integration Risks

未发现明确的职责重复或核心 DTO 版本冲突；以下事项仍需团队确认。

| 问题 | 文件与相关接口 | 确认方 |
|---|---|---|
| 正式冻结状态无法确认 | SHARED_CONTRACT_v1.md 第 1–3 行仍为 proposed/FROZEN DRAFT；API_ENDPOINTS_v1.md 第 1 行仍为 PROPOSED；附件未包含四人签核记录 | 四人 |
| HTTP 数据链路定义不完整 | API_ENDPOINTS_v1.md 第 14、17–20 行：generate body、targets 响应、保存和编辑 DTO 未完整定义；不得直接认定 PlannerInput 就是 HTTP body | A/B/C/D |
| 删除 stop 与保留目标的关系不明确 | SHARED_CONTRACT_v1.md 第 69 行 removeStop；API_ENDPOINTS_v1.md 第 15 行由 B 删除 target；Codex_Member_C.md 第 50 行要求目标完整保留。删除后进入 unscheduled 还是同步 target，尚需明确 | B/C/D |
| 重算数据范围及编辑保留规则未明确 | SHARED_CONTRACT_v1.md 第 70–73 行：allPois 范围、原未安排 POI 新进入日程时的交通方式、后续重算如何保留既有人工时间调整，未规定 | C/D，涉及目标时 B |
| 时间和未知信息处理口径待对齐 | SHARED_CONTRACT_v1.md 第 27、32、46–58 行及 Codex_Member_C.md 第 49–52 行：weekday 编码、未知游玩/交通时长处理、15 分钟编辑校验位置、needs_review/infeasible 划分未完整规定 | B/C/D |
| 汇率供应及费用汇总口径不完整 | SHARED_CONTRACT_v1.md 第 58、61–65 行定义 FxRate 和总费用；API_ENDPOINTS_v1.md 未列汇率接口。总费用币种、缺失汇率及部分费用未知时的预算判定需明确 | A/C，D 配合展示 |

这些事项属于待补充的契约或行为定义，不授权 C 自行新增公共字段、接口或修改 Schema。

## 核对依据

- TripMate_Macau_4Member_Codex_Engineering_Playbook.pdf：重点为第 2–6、8–12、14–15、18 页。
- PROJECT_BASELINE.md：需求继承、优先级、产品边界及工程提案性质。
- SHARED_CONTRACT_v1.md：类型、所有权、纯函数与跨模块调用规则。
- API_ENDPOINTS_v1.md：HTTP 路径、Owner 及调用边界。
- Codex_Member_C.md：C 的工作范围、文件所有权和验收标准。

原 Task 1/Task 2 未在本次所列资料中单独提供；REQ 映射依据工程手册和基线，不代表重新审核原始 URS 或取得客户签核。

## 结论：READY WITH QUESTIONS

C 的职责、文件边界及核心纯函数契约基本明确。正式编码前需完成四人签核，并确认上述跨模块接口与行为问题。本报告不代表公共规范已获批准，也未验证实际代码或数据库实现。
