# TripMate Macau — Member A Development Confirmation

评审日期：2026-10-30（Asia/Shanghai）  
评审对象：CS250 Software Engineering / D2-Team2 / Vibecoding  
成员：Member A — Li Zhiqing，Team Leader  
评审阶段：Development Readiness Review  
最终状态：**BLOCKED**（开发开工门槛未满足；资料审核已完成）

本报告只记录现有资料的结论、冲突和建议，不构成四人签核、客户批准或共享合同变更。本次只创建本报告；未编写功能代码、创建工程、安装依赖、修改团队规范或执行 Git commit、push、merge。文中目录和测试是后续计划，不代表已经存在或通过。

## 1. Project Information

### 1.1 实际定位结果

| 对象 | 实际完整路径 | 结果 |
| --- | --- | --- |
| 工作区 | `E:\MUST\2609\CS250 软件工程` | 已扫描 |
| 项目落地目录 | `E:\MUST\2609\CS250 软件工程\项目落地` | 已找到 |
| PDF 主副本 | `E:\MUST\2609\CS250 软件工程\项目落地\TripMate_Macau_4Member_Codex_Engineering_Playbook.pdf` | 已读取，共 19 页 |
| ZIP | `E:\MUST\2609\CS250 软件工程\项目落地\TripMate_Macau_Codex_Team_Package.zip` | 已只读检查目录及文件一致性，未解压写入 |
| 解压文件夹 | `E:\MUST\2609\CS250 软件工程\项目落地\TripMate_Macau_Codex_Team_Package` | 已找到 |
| PDF 包内副本 | `E:\MUST\2609\CS250 软件工程\项目落地\TripMate_Macau_Codex_Team_Package\TripMate_Macau_4Member_Codex_Engineering_Playbook.pdf` | SHA-256 与主副本一致 |

以下简称“团队包目录”的路径为上表的解压文件夹；后文未加目录的八份 Markdown 文件均位于该目录。

成功读取的团队资料：

1. `00_READ_FIRST.md`
2. `PROJECT_BASELINE.md`
3. `SHARED_CONTRACT_v1.md`
4. `API_ENDPOINTS_v1.md`
5. `Codex_Member_A.md`
6. `Codex_Member_B.md`
7. `Codex_Member_C.md`
8. `Codex_Member_D.md`
9. 上述 19 页 Engineering Playbook PDF：重点核对第 01–05 章的需求、架构和合同，第 06–09 章职责，第 10–13 章协作、集成、测试及签字门槛，以及附录合同和成员说明。

ZIP 中的 8 份 Markdown 和 1 份 PDF 均与现有解压文件逐字节匹配；两份 PDF 的 SHA-256 均为 `93e781ca4e5b8858b1adbbb962c71f939472561bff964adf88e35822a4eed35c`。用户指定的文件没有缺失。

补充读取及核对的本地材料：

- `E:\MUST\2609\CS250 软件工程\Task 1\D2-Team2-TripMate Macau Proposal.pdf`：核对功能、Chapter 5–7 的依赖、ownership、pair arrangement 和验收要求。
- `E:\MUST\2609\CS250 软件工程\Task 2\提交\TripMate_Task2_URS_Template_Rebuilt_v2.docx`：核对 REQ-1.1–1.17、非功能需求、范围与待批准事项。该文件与 baseline 所称的 consulted 版本名称相符，但尚不能据此认定它就是最终提交/客户批准版本。
- `E:\MUST\2609\CS250 软件工程\CS250-SE\README.md`。
- `E:\MUST\2609\CS250 软件工程\D2-team2-project\README.md`。
- 上述两仓库的本地 Git status、分支及 remote；未改变分支或仓库内容。

### 1.2 项目范围与现状

团队成员：A Li Zhiqing、B Xia Youran、C Jiang Yuancheng、D Peng Xin。沿用 Task 1 Proposal 和 Task 2 URS，仅重建实现，不重写项目需求或宣称客户已经签字。

主链路：Trip Setup → Discover/Add → Generate → Edit/Recalculate → Map → Save/Reopen；Plaza 为主动选择的分享流程；Companion → Expense → Settlement 是独立费用链路。H 优先于 M，最后 L；Bills 为 M/optional，Relaxed 为 L/optional，Plaza 与 Nearby Food 为 M。不得把可选账单变成规划的前置条件。

本地仓库现状：

| 仓库 | 本地位置 | 只读核对结果 | 评审含义 |
| --- | --- | --- | --- |
| 个人文档仓库 | `E:\MUST\2609\CS250 软件工程\CS250-SE` | remote 为 `https://github.com/lzq2005/CS250-SE.git`；当前分支 `docs/tripmate-public-docs-2026-10-19`；已有 `README.md` 修改和未跟踪的 `docs/task-2/evidence/` | README 声明其保存脱敏文档，不是应用源码仓库；现有改动不是本次产生，不应覆盖 |
| 团队仓库 | `E:\MUST\2609\CS250 软件工程\D2-team2-project` | remote 为 `https://github.com/MUST-Workspace/D2-team2-project.git`；本地 `main` 跟踪 `origin/main`；工作树干净；当前只有 README | 更像团队实现候选位置，但资料未明确指定，不能自行选择 |

在团队包及上述两仓库内未发现拟议的 `package.json`、Prisma schema、CI YAML 或 CODEOWNERS；所列新架构尚未落地，不应将“未创建”误报成已有实现故障。未发现适用于这些目录的 AGENTS.md。

### 1.3 首先列明的冲突与未决事项

1. **阶段指令冲突**：成员任务书要求建 feature branch 并从 H 切片开始实现；本次用户明确禁止编码、建工程和除报告外的写入。本次以用户阶段限制为准，未执行任务书的开发动作。
2. **合同状态不能当成已冻结**：`SHARED_CONTRACT_v1.md` 标题含 “FROZEN DRAFT”，正文却写明 “All four owners must agree before work starts”；API 文件为 “PROPOSED”。PDF 第 14 页还要求四人签核并提交到 docs 后才视为冻结。未发现签核记录，不能用标题代替批准。
3. **需求版本与范围批准待确认**：baseline 指向 2026-10-18 的 Template_Rebuilt_v2，URS 内部修订表最新条目为 4.0，Reviewed By 仍为 Pending。文件名 v2 不等于 URS 内部版本 2.0。Task 1 的 Bills 承诺比 Task 2 的 M/optional 更广；保留差异并由团队确认实际交付基线，不自行降级或扩充。
4. **资料引用路径与当前布局不符**：成员文件要求读 `docs/PROJECT_BASELINE.md` 等，但实际文件在团队包目录根部；这些相对 docs 路径目前不存在。已按扫描到的真实路径读取，未移动或复制规范。
5. **bootstrap 公共文件权责需要协调**：PDF 第 10 页让 A 的 bootstrap 包含 router 桩；B 的任务书及合同规定 router、全局样式和 UI tokens 由 B 维护。骨架 PR 中该部分必须由 B 提供或明确审核，A 不得据此长期接管 B 的文件。
6. **实现仓库未唯一指定**：Task 1 引用个人仓库，现有个人 README 又定位为文档归档；团队目录有另一 remote。需要明确唯一应用仓库及文档的引用方式。

## 2. Member A Responsibilities

A 同时承担用户可见的 Trip/Billing 功能和公共工程协调。Team Leader 不代表替 B/C/D 实现其业务，也不代表由 A 独自承担全队测试和文档。

| 工作项 | 优先级 | A 的预期交付 | 验证要求 |
| --- | --- | --- | --- |
| A-01 | H | 经批准后创建单仓库骨架、npm workspaces、运行脚本和 Node 版本约束；保留历史 | web、API、DB、`/api/v1/health` 最小链路可启动 |
| A-02 | H | 维护唯一 `packages/contracts`，协调四人确认 DTO、错误规范和共用 fixture | 类型检查及生产者/消费者 contract tests；不得复制 DTO |
| A-03 | H | 唯一维护 SQLite/Prisma schema、migration、关系与唯一索引 | 初始化可复现；关系完整；目标去重；数据写入与失败事务符合约定 |
| A-04 | H | Trip 创建、编辑、保存；日期、每日窗口和澳门起点校验 | 无效日期、`endDate < startDate`、每日 `end <= start` 返回 422，失败不落库；合法保存再读一致 |
| A-05 | H | 稳定 TripConfig API、同行人管理；供 B/C/D 使用 Trip ID 与偏好 | 改同行人姓名不改变给 C 的 Planner Request JSON；姓名变化能反映到费用选项 |
| A-06 | M | Budget/参考 FX，明确来源、日期、估算与不可用状态 | 手算对照；缺少 FX 不伪造 CNY 金额，不阻塞核心行程访问 |
| A-07 | M/optional | 原币账单、付款人/参与者子集、均分、CNY Settlement，分离账单概览和最终转账视图 | 正数金额和参与者校验；仅选中者分摊；总分币守恒；净余额和为零；保留原币及使用的汇率 |
| A-08 | H | 统一 backend Router 注册、合并协调、CI 与文档；与 D 核对部署/集成 | lint/typecheck/test/build 的真实结果；主链路集成证据，失败不得标记完成 |

每个后续 PR 应包含：Issue/REQ IDs、用户可见行为、改动文件、受影响契约、单元/API 测试、相关手动复现或截图、消费者用法、检查结果及阻塞原因。任务书写有 `npm lint` 等简写；骨架阶段应明确实际使用的 npm scripts 及可执行命令，不假设这些命令当前已经可用。本次未运行开发测试，不声称测试通过。

职责边界：

- **A / B**：A 产生 TripConfig、interests、稳定 tripId；B 负责 Match、POI、Favorite 与 Targets、共享 UI/router、Plaza 浏览。A 不实现匹配算法或跨改样式。
- **A / C**：A 提供合法规划配置、货币及可用参考汇率；C 拥有唯一生成/约束/重算规则。Companions 与 Expenses 不进入 PlannerInput。
- **A / D**：A 保存 Trip 配置、维护所有 DB schema；D 是 SavedItinerary 和发布的唯一业务写入者。A 的 schema 所有权不等于 A 接管 D 的保存行为；D 不直接改 migration。Map 由 D 实现，澳门 origins 的数据与输入由 A 提供。

## 3. Requirement Mapping

以下 REQ 编号与 H/M/L 已对照本地 Template_Rebuilt_v2 URS；不混用早期 REQ-2.x/REQ-3.x。

| REQ | 优先级 | 功能 | 主责与 A 的关系 | 预期验收 |
| --- | --- | --- | --- | --- |
| REQ-1.1 | H | Search/Categories | B；A 提供基础 API/DB 集成 | 过滤、清空、空态；无需已生成 Trip |
| REQ-1.2 | H | POI Details | B；A 协调 schema | 营业日、last entry、费用/预约说明及 unknown |
| REQ-1.3 | M | Preference Match | B；A 提供 interests | 0–100、解释、分类内排序；不是可行性保证 |
| REQ-1.4 | H | Favorite / Add | B；A 保证 Trip ID 和数据库约束 | 两集合互不影响、重复 Add 去重 |
| **REQ-1.5** | **H** | **Trip Information Setup** | **A 主责：A-04/A-05** | **日期/每日窗口校验，保存读回；companions 与规划隔离；TC-05** |
| REQ-1.6 | H | Generate | C；A 提供 TripConfig | 开放窗口、旅行时间、预算比较及状态正确 |
| REQ-1.7 | H | Unscheduled/Warnings | C；A 不另造规则 | 所有选中目标有去向和原因 |
| REQ-1.8 | H | Edit/Recalculate | D 主责、C 支持 | 15 分钟人工编辑及 Bus→Taxi 下游重算 |
| REQ-1.9 | H | Delete/Overwrite Confirmation | D；A 配合事务与版本存储 | cancel 不改变版本、内容、timestamps |
| REQ-1.10 | H | Map/External Navigation | D | 地理地图顺序一致；失败文字回退 |
| **REQ-1.11** | **H** | **Macau Origins/Landmarks** | **A 输入和起点数据，D 展示；C 使用首段起点** | **口岸/机场/人工澳门点保存并用于 first leg；入口和地标可辨识；TC-11** |
| **REQ-1.12** | **M** | **Budget/Currency Reference** | **A 主责：A-06；C 消费估算依据** | **MOP/HKD/CNY，显示汇率/来源/日期/静态说明；缺失回退；TC-12** |
| **REQ-1.13** | **M/optional** | **Travel Bill/Equal Splitting** | **A 主责：A-07；D 提供费用入口上下文** | **原币、参与者子集、留存 FX、CNY 总额/分摊/转账守恒；TC-13** |
| **REQ-1.14** | **H** | **Save/Reopen** | **D 主责；A 提供 Trip 和 schema 基础** | **原配置/POIs/stop IDs/顺序/接受的编辑恢复；损坏数据可恢复提示；TC-14** |
| REQ-1.15 | M | Plaza | D 发布，B 浏览；A 协调 schema | 先脱敏预览再确认；单 POI 收藏；无整旅程复制 |
| REQ-1.16 | M | Nearby Food | B | 现有 curated food POI，用户手动加入 |
| REQ-1.17 | L/optional | Relaxed Pace | C；A 存储批准后的配置 | 缓冲/stop cap 可追踪，不丢失未安排目标 |

额外测试约束来自 URS：PERF-1.1–1.4 的数值阈值、超时和 CAP-2.1 并发目标仍待约定；SEC-1.1–1.4 要求私密默认、白名单发布、确认和输入校验；AVA-1.1–1.3 要求 FX/地图失败时核心功能可用。不得擅自承诺 2 秒、95% 准确率或生产多人隔离。

## 4. File Ownership

下表路径均相对于**尚待确定的应用仓库根目录**，并非相对于资料包；当前不创建这些路径。

| Owner | 专属业务文件 | 公共文件职责/限制 |
| --- | --- | --- |
| A | `apps/api/src/features/trips/**`、`apps/api/src/features/billing/**`、`apps/web/src/features/trip/**`、`apps/web/src/features/billing/**` | `apps/api/prisma/**` 唯一 migration；`packages/contracts/**` 唯一合入维护；`apps/api/src/app.ts` 唯一 API 注册；根 manifests、lockfile/工具配置、CI/dev scripts 由 A 协调并与 D 评审 |
| B | `apps/web/src/features/discovery/**`、`apps/web/src/features/plaza/**`、`apps/api/src/features/pois/**`、`favorites/**`、`targets/**` | `apps/web/src/shared/ui/**`、`router/**`、`styles/**`；`data/fixtures/pois.*` 只改数据不改类型；`apps/api/src/features/plaza/plaza.read.*` |
| C | `apps/api/src/features/planning/**`、`apps/web/src/features/planning/**` | 前端仅生成入口/进度/警告组件；`tests/fixtures/planning/**`、`docs/architecture/planner.md`；不保存日程 |
| D | `apps/api/src/features/itineraries/**`、`apps/web/src/features/itinerary/**`、`apps/web/src/features/map/**` | `apps/api/src/features/plaza/plaza.publish.*`、`tests/e2e/**`、`docs/testing/integration.md`；`docs/deployment.md` 与 A 复核 |

协作规则总体合理，能够减少公共文件冲突，但还需补齐：

- frontend `App.vue`、`main.ts`、全局状态/activeTrip、API client、backend server/DB client/error middleware、seed 入口、测试配置及跨模块 repository/adapters 的唯一维护者尚未逐项指定；建议 A/B/D 按边界确定，不能默认为谁先写谁拥有。
- Plaza 同目录通过 read/publish 文件名拆分可以避免直接冲突，但公共 router/service/repository 的 ownership 尚未定义；B/D 共同提出、A 协调注册和 schema。
- 单一 lockfile、migration 和 app.ts 必须由 A 串行协调；其他成员提交依赖/注册/迁移需求，由 owner 合入。B 负责前端 route 注册，其他成员只交付组件导出和路径。
- `packages/contracts` 的 A approval 是维护门槛，不替代四人对共享合同的批准；A 自己的 PR 仍需另一名成员 review。

### 4.1 GitHub 分支、PR 与合并审核

PDF 第 10–11 页和任务书一致要求：`main` 保持可运行；A 的 `bootstrap/contract-v1` 四人 review 后先合入；之后每个小 Issue 一条 `feat/a/<issue-key>`、`feat/b/...`、`feat/c/...`、`feat/d/...` 分支，修复可用独立 fix 分支。不得直接写 main、force-push 或让 Codex 自动 merge main。

默认 A+B、C+D 配对评审，但消费者跨组 review 仍不可省略。功能 PR 至少一名其他成员 review；contract/schema 必须 A、router/style 必须 B、planner 必须 C、E2E/map 必须 D 参与；合同字段变更先提交 Contract Change，说明影响、迁移、兼容和消费者测试，并按合同取得四人批准。CI 失败不得合并，PR 作者解决冲突后重跑检查。PR 应关联 Issue/REQ、测试、接口影响和 rollback。

**实际配置验证的限度**：本地两仓库未见 CODEOWNERS 或 Actions workflow。通过 GitHub 连接器只读查询团队 remote 的 `branches/main`、`branches/main/protection` 和 `rulesets`，均返回 404，无法确认远端 main protection、required checks、review gate 或权限。404 可能与访问权限或资源可见性有关，**不能据此断言仓库不存在或保护未开启**。未尝试更改远端设置，也未绕过访问限制。

建议后续由仓库管理员核实并落实 required peer review、required checks、owner review 和禁止直接推送的规则；评审账号、合并操作者、合并方式及保护规则的例外权限需明确。CODEOWNERS 和 PR 模板目前只是建议中的落地措施，不是已启用事实。

## 5. API Contracts and Dependencies

### 5.1 已一致的公共约定

统一 `/api/v1`、JSON UTF-8；成功 `{ data: ... }`，失败 `{ error: { code, message, details? } }`；UUID 字符串；日期 `YYYY-MM-DD`、本地时间 `HH:mm`，业务时区 `Asia/Macau`。当前电脑的 Asia/Shanghai 不应改变业务序列化规则。

`TripConfig` 是规划配置，不包含 Companion 或 Expense；`POI` 含稳定 ID、坐标、类别及来源信息；`PlanResult` 包含 days/stops/legs、unscheduled、warnings 和成本状态；`SavedItinerary` 由 D 保存并维护 version；公开类型只允许 `id/title/publishedAt/days[{date,poiIds}]`。Money 为整数 minor units + 显式币种，FxRate 为 decimal string；`null` 未知和已知的 `0` 必须区别。POI 的 `openingHours=null` 是未知，`[]` 是已知整周关闭。

### 5.2 A 提供/协调的 API

| 接口（均加 `/api/v1`） | Owner / 消费者 | 已定用途 | 待冻结内容 |
| --- | --- | --- | --- |
| `GET /health` | A / 全体、CI | 健康检查 | 返回 DTO、HTTP 状态和是否检查 DB |
| `GET /origins` | A / Trip UI、D 地图、C 首段 | 预置澳门起点 | Origin DTO、ID 与 `origin.source` 的映射、来源及澳门点校验 |
| `GET/POST /trips` | A / B/C/D | 列表/创建 TripConfig | CreateTripRequest、服务端 ID、默认值、响应列表形状 |
| `GET/PATCH /trips/:tripId` | A / B/C/D | 读/更新 TripConfig | PATCH 可改字段、部分更新/数组替换、并发与已保存日程失效策略 |
| `GET/POST /trips/:tripId/companions` | A / A Billing | 同行人管理 | Companion DTO；修改姓名/移除 API 缺失；跨 trip 引用规则 |
| `GET/POST /trips/:tripId/expenses` | A / Billing，D 费用入口 | 费用列表/记录 | Expense DTO、付款人与参与者、place/POI/stop 上下文、留存 FX；更新/删除语义 |
| `GET /trips/:tripId/settlement` | A / Settlement UI | CNY 结算 | Settlement DTO、paid/share/net/transfers、缺 FX/部分结果状态、舍入规则 |

### 5.3 七条必须验证的模块对接

| 对接 | 实际接口/数据流 | 缺口与建议 | 验收责任 |
| --- | --- | --- | --- |
| **A → B：Preferences 与 Trip ID** | A 的 Trip API → `TripConfig.id/interests` → B 的 Match 与 `/trips/:tripId/targets` | 规定 activeTrip 的唯一来源、刷新恢复/切换、无 Trip 时禁用 Add；Match 的输入为 interests，不另造 Preferences DTO；分类展示名与 `history/food/shopping/nature` 映射一致 | A+B：切换 Trip 无串数据、偏好变化影响 Match、不改变收藏 |
| **A → C：Trip Configuration** | TripConfig + B 的选中 POIs + mode/FX → C `generatePlan(PlannerInput)` | generate 的 HTTP body、数据由后端读取还是客户端提交、FX 来源/defaultTravelMode 默认值、窗口边界及 H 阶段预算检查尚未冻结；明确服务端组装输入职责 | A+C，B 提供 targets：非法配置 422；改 Companion 请求不变 |
| **B → C：Selected POIs** | B 写 targets；C 生成时读取并解析为 `selectedPois: POI[]` | 文本 `selectedPoiIDs`/`selectedPoiIds` 是集合描述，不是 canonical 输入字段；不能与 `selectedPois` 混用为多个 DTO；规定去重、顺序、缺失 POI 的错误处理及一致性快照 | B+C：Favorite 不进入 Planner；scheduled 与 unscheduled 不重不漏 |
| **C → D：Generated Itinerary** | C `POST /trips/:tripId/generate` 返回候选 PlanResult；D `POST /trips/:tripId/itineraries` 保存 | 生成不保存的边界一致；保存请求、候选与 trip/targets 的一致性校验、版本初值、覆盖动作和源配置/POI 快照未定义 | C+D，A schema：真实结果可显示、保存、重开；错误候选不写库 |
| **D → C：Recalculation** | D `/itineraries/:itineraryId/edits` 校验 expectedVersion → C `revalidateAndRecalculate(RecalculationInput)` → D 原子保存 | 明确 allPois 集合、Trip/POI/FX 的版本、稳定 stopId、时间锁定/传播、移除后 targets 和 unscheduled 的语义；版本比较与写入必须在同一原子操作内 | C+D，A schema：Bus→Taxi、15min 编辑更新全体下游；冲突 409 不写入 |
| **A → D：Persistence 与费用隔离** | A Trip/Companion/Expense 分域；D SavedItinerary 只关联 tripId/result/version | 仅存 PlanResult 无法保证恢复旧 Trip/POI 配置；需决定快照或版本引用。D Add Bill 入口只传批准的上下文给 A；重算/删除 stop 不隐式改账单 | A+D：重开原输入；改同行人/账单不改变规划；私密字段不被保存到公开域 |
| **D → B：Plaza Publishing/Browsing** | D publish 公共白名单快照 → B `GET /plaza/posts` 及详情 → B 单 POI Favorite | 明确 preview/confirm 的两阶段请求、对应保存版本、title 脱敏、分页形状；快照仅含 POI ID，POI 修改/删除时如何展示和地图回退需约定 | B+D，A schema：先预览再确认；公开 JSON 不含私密字段；不能整旅程复制 |

### 5.4 五类实体的持久化边界

- **Trip**：A 写配置，B/C/D 读取；TripConfig 不含 targets/companions 是合理拆分，但需要聚合读取和一致性规则，不应靠所有字段塞回 TripConfig。
- **POI**：B 管 fixture 内容、发现、收藏及选中目标；A 管表结构；C 读规划快照，D 读坐标/展示信息。建议关系唯一性 `(tripId, poiId)`；Favorite 独立，不因删除 target/Trip 自动删除。
- **Itinerary**：C 计算、D 唯一保存/编辑/发布、A 唯一 schema/migration。必须决定一个 Trip 多个 itinerary 的命名、当前版本与列表关系。
- **Companion**：A 独立管理并服务 Billing，使用稳定 ID 而非姓名外键。同名、重命名、删除已被 Expense 引用的成员如何处理尚未定义。
- **Expense**：A 保存原币、参与者子集及使用的 FX；不进入 PlannerInput、PlanResult 或 plazaPosts。与 POI/stop 关联可作上下文，但不能让 itinerary 删除级联销毁账单；需团队批准具体外键策略。

## 6. Technical Architecture Review

| 方面 | 文档一致性 | 编码前需决定/验证 |
| --- | --- | --- |
| Monorepo | PDF、合同和任务书一致：`apps/web`、`apps/api`、`packages/contracts`、`data/fixtures`、`docs`、`tests/e2e` | 唯一应用仓库、docs 位置、workspace 包名、导出路径、build 顺序 |
| Frontend | Vue 3 + Vite + TypeScript + Tailwind CSS 一致 | 批准版本；B 管 shell/router/UI；activeTrip/API client ownership；前后端本地连接策略 |
| Backend | Node.js + Express + TypeScript 一致 | Node/包版本、ESM/CJS、入口与 error middleware、环境配置及路由挂载规则 |
| DB | Prisma + SQLite，一人维护 migration，适合本地单人演示 | 所有实体关系/索引、金额与 FX 存储、JSON 与关系表选择、版本原子更新、seed 和测试隔离方案；不能直接假定 DTO 就是 DB schema |
| Planner | 纯 TypeScript；C 导出唯一 generate/revalidate | HTTP adapter 与函数分层；估计数据输入、稳定 ID 与确定性、unknown/status 规则 |
| Map | Leaflet + OpenStreetMap；D 实现 | 标记/顺序/起点/地标数据接入、外部导航、失败文字回退；地图展示本身不提供承诺的实时交通或估时规则 |
| Tests | Vitest + Supertest + Playwright 一致 | 版本、scripts、CI required checks、SQLite 临时库、可复现 fixture、运行环境和离线/失败测试方式 |
| Privacy | 单人/local demo，暂不假设 auth；public whitelist 一致 | 团队明确接受范围；本地私密数据和公开快照严格分离；上线/多用户属于另行批准范围 |

未发现互相要求 React/Vue、不同数据库或不同测试框架等硬性技术栈矛盾。问题集中在**提案尚未批准、版本及运行方案未锁定、实体与请求契约未闭合**。本次不安装依赖或运行 npm；不能据文档判断依赖兼容性、构建或运行是否通过。

建议的数据库设计约束（仅供讨论，不是新 schema）：Trip 与其 Targets/Companions/Expenses/Itineraries 之间有明确外键；所有跨 trip 引用检查；费用参与者关系与 payer 分别校验；金额使用整数存储、FX 保留十进制精度；D 的 edit 进行版本条件更新与原子提交；测试库不得污染演示库；B 的 seed 数据应可重复导入且不破坏现有 Trip 引用。

## 7. Integration Risks

等级解释：**开工门槛**须在批准骨架前解决；**核心阻塞**须在合同冻结/对应 H 功能实现前解决；**阶段问题**在相应 M/L 功能前解决，可由团队明确延期。以下均为建议，未修改原规范。

| ID / 等级 | 证据文件、接口或类型 | 风险/冲突 | 建议处理与责任人 |
| --- | --- | --- | --- |
| R01 / 开工门槛 | `00_READ_FIRST.md` 第 2 条；Shared Contract 开头；PDF 第 13–14 页 | 无四人签核；技术、no-auth 和 scope 仍是 proposal | A 组织 A/B/C/D 留下统一基线及批准证据；不能由 A 单方把 draft 标成 frozen |
| R02 / 开工门槛 | baseline；Task 1 Chapter 6.1；两个仓库 README/remotes | 需求批准状态、个人/团队实现仓库未唯一确定；现有个人工作树有改动 | 四人确认实际交付 URS 文件及内部版本、唯一实现 remote、本地根路径；不覆盖现有文档改动 |
| R03 / 核心阻塞 | Shared `TripConfig`、`PlannerInput`；API trips/generate | 缺 Create/Patch/Generate request/response；客户端与后端组装输入权责未定；重复 trip ID 的一致性检查未定义 | A 提出 DTO/错误/来源规则，B/C/D 消费者确认；定义 body/path/result.tripId 一致性及 400/404/422 |
| R04 / 核心阻塞 | Shared 无 `Companion`；API companions 仅 GET/POST；A-05 验收要求重命名 | 同行人稳定 ID/字段和改名流程缺失，费用引用及“改名不影响规划”无法按已列接口完整实现 | A 提出最小 Companion 契约及更新/移除策略；四人确认；C/D 验证规划和公开域无该对象 |
| R05 / 核心阻塞 | B targets API；Shared `selectedPois`；PDF 文本 selectedPoiIDs | HTTP 选择读取形状、目标顺序和解析适配未定；容易把 ID[] 当 POI[] 或把 Favorite 并入输入 | B+C 规定 targets→POI[] adapter，A 确认关系/唯一索引；拒绝缺失 POI，不静默过滤 |
| R06 / 核心阻塞 | `TripConfig.dayWindows`、`WeeklyWindow`、`PlannedStop`；REQ-1.5/1.8/1.11 | weekday 编码、窗口覆盖/重复/重叠、跨午夜边界、arrive/start/end 语义、澳门人工点校验未定；`lastEntry=null` 含义未明确 | A+B+C+D 定义日期/时段校验、null 为未知还是不适用、15min 仅人工编辑还是也约束生成；A/C 实现统一验证；D 展示一致 |
| R07 / 核心阻塞 | `TravelLeg`、`PlannerInput.defaultTravelMode`、A `/origins`、REQ-1.11 | 首段 `fromPoiId=null` 如何对应 Trip origin；多日首段起点、交通估计依据和未能估时后的状态不明确；地标/入口标记的数据源缺少约定 | A 提供批准的 origin 结构/数据；C 定义估时、unknown、每日首段规则；B 提供相关 POI，D 提供 origin/landmark 展示与降级 |
| R08 / 核心阻塞 | Shared `SavedItinerary` 仅 result；`RecalculationInput.trip/allPois/fxRates`；REQ-1.14 | 保存后修改当前 Trip/POI/FX，会导致旧行程无法恢复原输入，重算结果漂移 | A/C/D 决定配置、targets、POIs、FX 的快照或版本引用及失效规则；D 保存、A migration；重开测试覆盖源数据变化 |
| R09 / 核心阻塞 | API `POST .../itineraries`、`.../edits`；Shared `EditCommand`；REQ-1.9 | expectedVersion 无正式 body DTO；初次保存/另存/覆盖的区别与覆盖确认缺失；removeStop 是否同步 B targets 不明确 | D+C+B 定义确认/取消/no-op、删除后重算与未来 regenerate 语义；A 协调事务；版本比较和更新原子化，409 保留原数据 |
| R10 / 核心阻塞 | Shared `Money/FxRate/PlanResult`；C 的 REQ-1.6 H 与 A-06 M | 预算比较是 H planner 的一部分，而参考 FX 排在 M；总成本币种、混币、部分未知、Fx 缺失及 precision/舍入未定 | A+C 在 H 基线先提供确定的估算/缺失警告规则；不把完整 M 货币 UI 提前强制实现；未知总成本不应当作预算满足；确定 minor units 安全整数范围及成本基准 |
| R11 / 核心阻塞 | Shared `POI.verification/sourceUrl/checkedAt`；REQ-1.2 | 一个总 verification 难以区分“已核实时间但估计价格”；无 booking/reservation note 字段；unknown duration/last-entry 的处理不足 | B 提供带来源的演示 POI；A/B/C/D 批准字段级来源/说明或明确允许的表达办法；无需擅自补造真实营业/价格事实 |
| R12 / 核心阻塞 | C 验收确定性；Shared UUID、PlannedStop.id | 随机生成 stopId 会让同输入深度比较不一致；重算重建 ID 会破坏 D 的 stop 编辑引用 | C+D 约定稳定且符合 UUID 规则的 ID 策略、函数确定性范围；A 确认唯一性；测试实际 ID 和编辑后的引用 |
| R13 / 阶段问题（M） | Shared 无 `Expense/Settlement`；API expenses/settlement；REQ-1.13 | 原币/付款人/参与者/place、保留转换汇率、缺 FX 状态和费用更新/删除未定义；可能重新按当前 FX 计算历史账单 | A 提交费用与结算契约：稳定 companion IDs、原币、账单应用 FX、CNY paid/share/net、确定性余分分配及转账规则；D 只接入入口；M 未排期时明确延期 |
| R14 / 阶段问题（M） | Shared `PublishedPostPublic`；API publish；B/D 任务书；REQ-1.15 | 单个 publish POST 没有定义先预览后确认的具体协议；title 自由文本和 POI 后续变化仍可能造成泄漏/展示漂移 | D+B 明确 preview/confirmation 与保存版本关联、服务端白名单及 title 内容审核/确认；确定公开 POI 的解析/不可用回退；不得未经批准扩大白名单 |
| R15 / 阶段问题（M/L） | B-05、REQ-1.3；Shared `TripConfig.pace`；REQ-1.17 | Match 规则/neutral ranking 示例未给；pace 强制含 relaxed 但可选功能未实现；daily stop cap 未建模 | B 对齐现有 weighting 规则并给样例；A/C 决定 standard 默认及未实现 relaxed 的行为，若做 cap 走 Contract Change；不在 H 中虚假接受未实现选项 |
| R16 / 开工门槛及工程风险 | Ownership、PDF bootstrap/router；现有仓库未见公共工具文件 | 单一 owner 规则尚无实施证据，公共 shell/client/DB/Plaza 文件仍有空白 | A/B/D 明确 bootstrap 文件清单和公共维护人；四人确认 owner/reviewer，管理员验证实际 PR gates；不能把 404 当成保护已关闭 |
| R17 / 核心/验收待定 | API error envelope；PDF 第 5 页；任务书检查命令；URS PERF/CAP | error.details 可选与示例 null 未统一到规范 schema；错误码、分页、运行命令、性能阈值未落定 | A 与各消费者定义响应/状态码/分页和脚本；D 协调测试条件。数值性能阈值在验收前批准，不擅自宣称当前合规 |

同一风险可能涉及多个成员；A 负责汇总和共享规范合入，不应代替业务 owner 做算法、UI 或持久化决策。未列出的酒店/航班预订、支付、实时公交/交通、天气自动重规划、整旅程复制和完整社交功能继续保持既有范围排除。

## 8. Issues Requiring Team Discussion

### 8.1 批准骨架前的决定

| 决定 | 需要得到的明确结论 | 参与者 | 当前情况 |
| --- | --- | --- | --- |
| G1 基线与仓库 | 实际交付 URS 文件/内部版本、Task 1→Task 2 范围差异、唯一应用 remote/目录，保留个人文档历史 | A/B/C/D | 未找到统一决定记录 |
| G2 技术与演示边界 | 技术栈、Node/依赖版本、workspace/DB/测试方案、single-user local demo/no-auth 范围 | A/B/C/D | 提案一致，批准与版本锁定未见证据 |
| G3 最小 H 契约 | R03–R12 的决策，至少覆盖 Trip/Companion、targets adapter、generate、save/reopen、edits/version、日期/金额/unknown 规则 | A 汇总，B/C/D 各确认生产/消费约定 | 当前尚不完整；不能让四个实现自行补齐 |
| G4 Ownership 与 PR | bootstrap router 的 B 责任、公共文件唯一 owner、A 自身 PR 的 peer review、main gate 和 CI 检查名 | A/B/C/D，仓库管理员 | 文档有规则，实际保护未能验证 |

G1–G4 应使用同一份记录，标明版本、A/B/C/D 结论和未决项。这里是在指出既有规范要求的开工门槛，并未新设客户签字流程；客户最终 scope 状态应如实保留，不能由工程签核替代。

### 8.2 可以明确排到后续的决定

- M：参考货币 UI/FX 数据来源、Billing/Settlement 的完整 DTO 和删改规则、Plaza 两阶段发布及浏览解析、Match 示例和 Nearby Food 策略；对应功能开始前解决。H planner 的预算/unknown 规则不能随 M UI 一起悬空。
- L：Relaxed 的 stop cap/buffer、配置和验收，未批准不实现。
- 验收：演示设备、约 30 个 POI 的来源/核验日期、PERF 和 capacity 数值阈值、地图/外部 provider 故障条件及测试 evidence 归档方式。
- 协作：合并操作者及方式、远端保护核验、管理员例外、公共文件变更的 owner/consumer review 路由；这些是工程治理事项，不冒充客户需求。

## 9. Recommended Implementation Order

以下只给顺序，不执行。六周计划应从团队约定的开发起点计算，不能从资料日期推定已经开始或承诺交付日。

1. **完成开工门槛**：A 汇总本报告，四人确认 G1–G4；先解决核心契约矛盾，M/L 项可以明确延期。选择既有目标仓库而不是另建第三套工程。
2. **A-01/A-02 基础骨架**：在获准后的 `bootstrap/contract-v1` 中建立 workspace、共享类型、API/DB/测试/CI 最小链路；B 提供/审核 shell/router 桩，D 审核运行与 E2E 基线，四人 review 后再合入。锁定版本与可执行 scripts。
3. **A-03 + 最小 fixture**：A 落地已批准 schema/migration、test DB 和稳定 ID；B 给有来源的少量 POI，C/D 给可验证规划例子；不要先等待全部 30 个 POI。
4. **A-04/A-05 + B 的 H 切片**：Trip/Origin/Companion 合法写入、读回；B Search/Detail/Favorite/Targets。先连通真实 Trip ID，验证 Favorite 与 Add 隔离。
5. **C 生成 + D 保存/地图**：C 从真实 Trip 和 Targets 组装 PlannerInput；D 消费 PlanResult，保留 warnings/unscheduled，保存并重开原配置与引用，地图顺序一致。
6. **C+D 编辑闭环，A 支持**：15min、交通变化、确认删除/覆盖、expectedVersion、409/no-op 和事务；覆盖首段起点、未知时间/价格、缺 FX、预算不足和 provider 失败。
7. **D 主持 H 全链路验收，A 协调**：执行 Playbook 的 IT-01–IT-05：创建→Add→生成→显示/保存；仅 Favorite 不入规划；不可行点保留；重算更新；刷新重开。所有相关 owner 提交 REQ/输入/期望/实际结果证据。
8. **再做 M，最后 L**：按资源批准 A-06/A-07、B Match/Food/Plaza read、D publish，并执行 IT-06 的发布→浏览→单 POI 收藏及隐私测试；Relaxed 最后。M/L 不挤占 H 缺陷修复。
9. **发布前收尾**：全套 checks/E2E、受控 demo、依赖锁定、README/部署手册、故障演示、四人贡献及 peer review 证据齐全后，再按团队流程处理发布；本次不触发任何发布或 Git 写操作。

## 10. Final Readiness Status

**选择：BLOCKED。**

理由：资料完整，统一技术方向与功能分工基本一致；但 `00_READ_FIRST.md`、Shared Contract 和 PDF 明确要求开发前四人批准，目前没有该证据。与此同时，应用仓库未唯一指定，H 链路的 Companion/请求 DTO、保存源配置/POI 的版本策略及编辑/targets 一致性尚未闭合。直接搭骨架并冻结不完整类型，会把尚待讨论的选择变成事实。

**现在不进入项目骨架搭建。** 先完成 G1–G4 并记录批准结果；后续获得明确开发阶段授权后，可以由 A 按批准的 bootstrap 清单搭建骨架。Bills/Plaza/Relaxed 的细节允许经团队明确延期，不要求为了开工提前完成全部可选设计。

本结论只表示“当前开工条件未满足”，不表示项目不可实施，也不表示团队资料或应用已经通过运行测试。报告内所有修复建议均待责任成员讨论，原始需求、共享数据结构、API、成员文件和历史材料均保持原状。
