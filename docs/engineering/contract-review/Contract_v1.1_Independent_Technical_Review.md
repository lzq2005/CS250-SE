# Contract v1.1 Independent Technical Review

项目：CS250 / TripMate Macau / D2-Team2  
审核日期：2026-10-31  
最终结论：**FAIL（当前文本不宜冻结为编码契约；可以连同本报告发给 B/C/D 评审）**  
审核方式：重新以需求和 v1 为依据检查 v1.1，不沿用上一轮“方案已经闭合”的假设。此结论是文档审核，不是功能测试、四人批准或客户验收。

## 1. 审核范围和实际读取的文件

### 1.1 路径及引用规则

工作区：`E:\MUST\2609\CS250 软件工程`。本次只新增本报告，不修改以下任何文件，不编写功能代码、不安装依赖、不执行任何 Git 操作。

四份直接审核对象位于 `E:\MUST\2609\CS250 软件工程\项目落地\contract-review`：

| 简称 | 文件 | 实际读取范围 |
| --- | --- | --- |
| MX | Conflict_Resolution_Matrix.md | 全文，79行 |
| SC11 | SHARED_CONTRACT_v1.1_DRAFT.md | 全文，117行 |
| API11 | API_ENDPOINTS_v1.1_DRAFT.md | 全文，144行 |
| CL | Team_Approval_Checklist.md | 全文，85行 |

报告中的行号指本次读取时上述原草案的一基行号；它们未被修改。章节和类型名称可在未来行号变化后辅助定位。

对照文件：

- `项目落地/小组成员报告-1/Member_A_Development_Confirmation.md`：正文 A — Li Zhiqing，BLOCKED；重点复核 §3、§5、§7 的REQ、集成与保存问题。
- `项目落地/小组成员报告-1/Module_Development_Confirmation_Report.md`：正文 B — Xia Youran，BLOCKED；§3–5 的POI/Targets/Favorite/Plaza和URS版本问题。
- `项目落地/小组成员报告-1/Module_Development_Confirmation_Report_Member_C.md`：正文 C — Jiang Yuancheng，READY WITH QUESTIONS；§3、§5 的纯函数、allPois、unknown、编辑保留和汇率问题。
- `项目落地/小组成员报告-1/Module_Development_Confirmation_Report_Member_D.md`：正文 D — Peng Xin，BLOCKED；§3、§5 及“编码前需要确认”的编辑/覆盖/发布问题。
- `项目落地/TripMate_Macau_Codex_Team_Package/SHARED_CONTRACT_v1.md`（SC1）：全文，尤其 canonical shapes、两纯函数、版本控制、公开字段白名单。
- 同目录 `API_ENDPOINTS_v1.md`（API1）：全文，包括各路由Owner与Cross-module rules。
- `Task 1/D2-Team2-TripMate Macau Proposal.pdf`（T1）：核对 §3.2–3.5、§7.1–7.3；PDF物理页12–15、29–30，对应印刷页6–9、23–24。
- `Task 2/提交/TripMate_Task2_URS_Template_Rebuilt_v2.docx`（U2）：核对修订表、REQ-1.8/1.9/1.13/1.16/1.17与批准状态。
- `Task 2/提交/TripMate_Task2_URS_Final_v5_fixed.docx`（U5F）：核对17项详细REQ、修订表、System Functions及数据接口，作为最终版候选对照，**不认定为已批准版本**。
- `Task 2/PartB — URS/TripMate_Task2_URS_Final_v5.docx`（U5）：复核同类详细需求与范围/批准表述。

以上简写路径均相对于工作区。原报告中的历史Git查询结果只视为历史报告内容，本次不执行Git或远端设置检查。

### 1.2 证据限制

1. U2修订表仍有Pending；U5F虽有D2-Team2署名，5.0修订条目明确写“Final v4 approval remains pending”；U5亦保留pending。**唯一最终提交/批准URS未验证**，不能用Final/fixed文件名或团队署名替代批准证据。U5/U5F明确把REQ-1.13、1.16、1.17设为Optional；1.3、1.12、1.15仍为M/Core。
2. 本次是静态文档审核，未运行API、编译或测试；依赖兼容性、Prisma事务实现、fixture真实性、性能、实际权限和branch protection均为**未验证**。不据文档断言已存在循环依赖或安全漏洞。
3. 报告给出反例和未来验收要求，不把反例描述为已经在代码中复现的bug。
4. 严重程度：BLOCKER＝当前核心契约不能作为统一实现依据，须先消除互斥义务；HIGH＝对应H功能/需求符合性的重要缺陷，编码或验收前必须处理；MEDIUM＝局部行为/边界需明确，可随切片解决；LOW＝可延期改进。缺少签核是治理开工门槛，不自动把每项技术细节升为BLOCKER。

## 2. 需求覆盖检查

下表“覆盖”只表示存在可实现路径，不表示实现通过。对应需求均按同名REQ详细表核对，未混用旧REQ-2.x/3.x。

| REQ / 优先级 | 责任成员 | v1.1具体位置 | 审核结果 |
| --- | --- | --- | --- |
| 1.1 H Search/Categories | B | API11 §3，L53–62；MX L39 | 覆盖：搜索、分类、空列表、总数；不依赖Trip生成 |
| 1.2 H POI Details | B | SC11 §3，L35/47；API11 L54 | 覆盖：坐标/来源/unknown及新增bookingNote；lastEntry的已知无额外限制表达不足，见IR-07 |
| 1.3 M/Core Match | B，A供interests | MX CR-13/L63；CL L59；SC11 L37 | 可在B模块内实现，无须专属公共endpoint；已有权重规则与测试样例本次未验证，不能新造“原有公式”；M不等于可不交付，见IR-11 |
| 1.4 H Favorite/Add | B | API11 L55–64；SC11 L53 | 双集合与恢复接口覆盖；悬空target清理缺口见IR-04 |
| 1.5 H Trip Setup | A | SC11 §2/§3/§6；API11 §2 | 日期/时段/起点/偏好/Companion覆盖；配置与同行人分开不违反需求 |
| 1.6 H Generate | C | SC11 §4；API11 §4 | 输入聚合和确定性方向成立；unknown时刻分支仍不足，见IR-03 |
| 1.7 H Unscheduled/Warnings | C | SC11 L57–61/75 | 集合不丢失原则覆盖；与编辑冲突、未知时间的表示一起修订，见IR-01/03 |
| 1.8 H Edit/Recalculate | D+C | SC11 §5；API11 §5.2 | 核心冲突见IR-01；额外强制先保存流程见IR-02；并非缺新的重算URL |
| 1.9 H Confirmation | D | SC11 L69/81–84；API11 L92/100 | 删除确认、覆盖确认、取消与409基本覆盖；没有证据强制实现单站自动替换命令 |
| 1.10 H Map/Navigation | D | SC11 L77/96；API11 L122；CL L50 | 保存快照/公开地图边界合理；功能计划有外部导航、文字回退，尚无运行证据；地图不要求新公共API |
| 1.11 H Origins/Landmarks | A+D，B供POI | SC11 L18/88；API11 L38；CL L50 | 起点链路覆盖；地标及非当前起点入口标记的具体fixture/标记约定仍待落实，见IR-10 |
| 1.12 M/Core Currency Reference | A | SC11 L44/61；CL L59 | 后台FX来源有定义，但独立换算UI如何取得相同率和来源未闭合，见IR-08；不据此断言一定要加FX URL |
| 1.13 M/Optional Bills | A，D入口 | SC11 L92–94；API11 §7 | 原币/参与者/汇率留存/结算/删除基本覆盖；金额精度范围及缺FX后恢复见IR-09/13；延期须明确，不作为H前置 |
| 1.14 H Save/Reopen | D，A schema | SC11 L77–84；API11 L87–98 | 快照、版本、ID恢复方向正确；不可把“恢复Saved”误实现为读取最新Trip；候选编辑流程仍需修订 |
| 1.15 M/Core Plaza | D发布/B浏览 | SC11 L96–100；API11 §6 | 白名单/独立标题/预览确认基本完备；重复确认与失效顺序需统一，见IR-12；M可分期不自动变Optional |
| 1.16 M/Optional（U5系列）Food | B | MX L66；CL L60 | 可以复用公开POI坐标本地筛选，不需新endpoint；是否采用U5 Optional待基线选择 |
| 1.17 L/Optional Relaxed | C，A配置 | SC11 L37；API11 L25；CL L61 | 未启用时显式拒绝合理；选做后须提供buffer/cap及回归例子，暂不因没有stopCap字段判定阻塞 |

范围总体保留，没有需要重分配四人功能的证据。但**不能宣称17项均已完全闭合**：H编辑存在内部矛盾；先保存再编辑改变原流程；部分M功能仍只有模块承诺而无明确消费约定。

## 3. API 与 DTO 一致性检查

### 3.1 路由逐组核对

| Owner / 路由全集（路径均加/api/v1） | 请求、返回、错误核对 | 结论 |
| --- | --- | --- |
| A：GET health、origins | API11 L37–38；Health对象/OriginOption列表；DB503 | 明确 |
| A：GET/POST trips、GET/PATCH trips/:tripId | L33–47；Create/Patch与TripConfig、列表；全对象校验/404/422 | 基本明确；Trip无version是明确的demo范围，不与D版本混为一谈 |
| A：GET/POST companions、PATCH companion | L43–45；name、Companion、列表；跨Trip按404 | 明确；新增PATCH需批准，不是既有路径 |
| B：GET pois及详情 | L53–54/62；过滤、List<POI>/POI、400/404 | 明确；favoriteOnly能支持收藏页恢复 |
| B：GET/POST targets、DELETE target | L55–57；TargetsView；重复Add409 | 请求/返回明确，但POI不存在时删除404会堵住悬空引用恢复，见IR-04 |
| B：GET/PUT/DELETE favorites/:poiId | L58–62；FavoriteState、幂等PUT/DELETE；通用404 | 明确；FavoriteState只在HTTP描述，建议最终纳入唯一contracts导出，不在B另造共享DTO |
| C：POST generate | L68–79；仅mode请求、CandidatePlan响应、422/409 | 明确且与纯函数分层；响应包装改变，旧消费者不能继续读data.days |
| D：POST/GET trip itineraries、GET itinerary、POST edits | L87–102；两种save body、SavedItinerary/列表、EditRequest、404/409/422 | DTO主结构已补齐；编辑结果语义仍有IR-01/03，先保存约束有IR-02 |
| D：POST publish；B：GET posts及详情 | L106–122；preview/confirm及两个响应类型、过期/版本冲突 | 无需新增preview URL；白名单清楚，幂等与过期优先级见IR-12 |
| A：GET/POST expenses、DELETE expense、GET settlement | L130–135；Expense/Settlement、服务端FX、非选做501 | 可选模块结构齐；不把缺FX的200 unavailable误当完成结算 |

各路由Owner可由API章节标题确定，并不因为部分表格没重复Owner列就算遗漏负责人。统一success/error及400/404/409/422/500/503在API11 §1；details从v1可选改成必需null/object、列表包装和Generate响应变化均已明确标为不兼容变更（SC11 L115、API11 L139–141）。这部分处理正确。

### 3.2 类型兼容性

- TripConfig/POI/PlannerInput：字段关联可成立；bookingNote变成新增必需nullable字段，老fixture必须显式补null，不能继续用旧POI类型。
- PlanResult/SavedItinerary：result及input.trip.id均需等于外层tripId；快照保持旧配置/POI/FX是合理补充。两个Saved可引用同Trip，不应把稳定stopId当全库唯一行ID（IR-14）。
- RecalculationInput：新增timeOverrides是跨模块签名修订；函数名/返回相同不意味着v1调用仍兼容。D的override增删是状态账簿，不必因此指控D复制规划算法；但只有C有权决定传播和可行性。
- Favorite：独立演示工作区状态，不必再引入Companion/userId。Expense只在Billing，绝不进入PlannerInput/public类型，方向一致。
- “全字段已定义”不等于“全部分支均能表示”；SC11的时刻合法性与冲突诊断之间尚有IR-01/03。

## 4. 跨模块兼容性检查

| 数据流 | 可成立部分 | 尚待解决/验证 |
| --- | --- | --- |
| A→B | TripConfig.id/interests → B共享activeTrip与Match；API11 L64 | 刷新前从URL或本地存储找回activeTripId的具体方式未规定，可由B实现后review；不需要公共API变更 |
| B→C | TargetsView.poiIds → B批量POI解析 → selectedPois；SC11 L53/API11 L72 | 传输形状已闭合；事务上下文/只读服务签名需实现前约定，避免各模块分别打开不一致事务；悬空ID恢复见IR-04 |
| C→D | CandidatePlan.input/result → D验证并保存snapshot；SC11 L55/84 | 不能把任意客户端候选当可信；现有重跑核验可用，但语义比较与一致性事务的实际实现未验证，见IR-15 |
| D→C | saved.input.selectedPois + result + overrides + command → C；D条件version更新 | 版本分层正确；时刻与未知传播的输出契约须修，IR-01/03 |
| A→D | 源Trip独立于保存快照；Companion/Expense不在snapshot中 | 旧行程可重开，不自动改变A当前配置；费用入口不因stop移除丢账单。字段级/DB外键实现未验证 |
| D→B | 服务端公开白名单 → B public feed与公开POI地图 | 无私人Saved查询依赖；标题独立输入不等于自动去除所有个人文字，草案已经要求预览提醒，不把用户主动确认的标题推断成未授权泄漏 |

SC11 L111描述了合理的依赖方向，**未发现文档上必然形成循环依赖**：C纯函数独立，C的HTTP适配器可以依赖A/B只读服务，D可调用C纯函数。真正的循环与事务耦合取决于后续代码，不应在未建项目时断言已有循环。公共服务接口需要列清但不要求现在新建一套抽象框架。

## 5. 真实 Blocker 清单

### IR-01 — BLOCKER：合法性不变量与保留人工冲突结果互相抵触

- **位置**：SC11 §3 L49无条件规定`arrive≤start<end`且完整访问应处于营业窗口；§5 L75又规定新到达晚于此前人工锁定时刻时保留输入、输出OVERLAP/error与infeasible。SC11 L59/API11 L94允许保存infeasible；API11 §5.2 L98–100要求C重算后D保存。
- **对照依据**：U5F REQ-1.8 System Processing/Verification要求制造并报告开放时间、last-entry、overlap、daily-window冲突，保留每个选中POI；T1 §7.2（PDF p29–30）要求展示引入及解除冲突，不仅处理无冲突状态。
- **反例**：已有人工锁定start=10:30、end=11:00。变更前段交通后真实arrive=10:45。同一stop无法同时保留10:30、正确报告10:45并满足`arrive≤start`。把arrive伪造为10:30违反真实传播，强移start又违反锁定规则。移到unscheduled也不是草案已经明确指定的冲突输出协议，且会改变D展示的编辑状态，不能让C/D各自选择一个解释。
- **影响**：C重算/校验、D编辑持久化/地图、A contracts与schema；REQ-1.8/1.7/1.14。该问题阻塞统一编辑契约冻结，而不是要求先完成所有M/L功能。
- **最小修复**：将语法有效与计划可行分开：start<end和合法日期/格式是输入硬校验；`arrive≤start`、营业窗口、日终等是feasible的条件。明确needs_review/infeasible是否允许诊断性时间冲突字段被保存；若选择允许，附对应warning并使D展示“请求时间/冲突”，不把start称为已发生的实际时间；若选择显式unscheduled方案，也须保留用户请求并统一返回结构。不能同时保留现在两条无条件义务。
- **必须验证**：用上述反例进行C单测→D API→保存/重开测试，保留锁定值、真实arrival、warning和version一致。由C/D提出最小规则，A维护类型，B作为消费方确认，四人批准。

本次只有上述一项列为技术BLOCKER。四人签核、唯一URS及仓库选择仍是开工门槛（CL L25–36），但它们不等于其他十几项技术BLOCKER，也不阻止把待批准文档发给同伴讨论。

## 6. 非阻塞问题及建议

以下HIGH必须在对应H行为落地前修复；MEDIUM/LOW按功能切片处理，不要求一次解决所有优化。

### IR-02 — HIGH：强制先保存再编辑改变既有用户流程

- **位置**：API11 §5.2 L98/100；CL L78。
- **原因/依据**：T1 §3.4（PDF p12）明确“edit … before saving”；U5F System Functions写generate candidate→inspect/edit→save/share。API11却要求候选先变Saved才能编辑，且每次编辑立即保存。这是可实现的产品流程变更，不是为了类型安全必然需要的唯一方案。
- **影响**：D交互/保存、C候选重算、A持久化；REQ-1.8/1.14/1.9。
- **最小修复**：撤销其“无需求变化”的默认地位，明确候选draft与用户保存的区别及如何复用C处理候选编辑，再说明现有save/edits承载方式；或者把强制先保存/自动保存作为有明确用户提示的需求偏离，取得专门批准。不得另写客户端规划算法，也不能只加一句“团队同意”却不记录行为差异。
- **验证**：候选编辑后取消/退出的保存语义、用户首次Save行为、刷新恢复、取消覆盖均有固定测试。可以先讨论，不必先新增一个URL。

### IR-03 — HIGH：未知交通或跨午夜到达的结果表示规则不完整

- **位置**：SC11 §2 L16–17、§3 L38–39/49、§4 L57、§5 L75；API11 L100。
- **原因/反例**：用户将已排入站leg改为一个没有估时的mode，durationMinutes=null但PlannedStop.arrive/start/end必须为非空HH:mm。草案只说不能作0，未规定下游时刻是撤回、保留为过期显示还是移入unscheduled。另一个合法输入为23:45出发+60分钟交通，不能把次日00:45当同日00:45或输出非法24:45。
- **依据/影响**：U5F REQ-1.6–1.8要求真实传播、未知提示且不丢选择；影响C/D和A类型。该缺口可以通过明确一种输出分支解决，因此不另升为BLOCKER。
- **最小修复**：选择并写清unknown/越日后的下游表示策略；优先显式unscheduled+原因并保存用户override，或批准含日期/可空估时的诊断表示。不要默用旧时间并让用户以为属于新mode；不需要为了处理它新增HTTP接口。
- **验证**：无估时Bus/Taxi、23:45越日、后续恢复已知mode、全部POI仍有去向，与IR-01统一处理。

### IR-04 — HIGH：悬空 target 被检测后无法通过现有删除接口恢复

- **位置**：SC11 L53；API11 §1 L20、§3 L57、§4 L70。
- **原因/反例**：已存targets引用的POI因fixture调整缺失，Generate正确返回409 DATA_INTEGRITY_ERROR；但用户调用DELETE target清理它时，API11规定“POI不存在404”，再次失败，只能恢复旧POI或人工修库。文档已主动考虑此错误，不应同时堵死恢复路径。
- **依据/影响**：U5F REQ-1.4的Remove、REQ-1.7保留/解释、1.14可恢复状态；B Targets、C Generate、A关系设计。
- **最小修复**：DELETE按tripId/poiId删除关系，不以当前POI存在为前提；Trip不存在仍404，target已无则按原约定200。Add/详情仍检查POI。用已有URL即可；UI在409后允许用户看到并移除缺失目标ID。
- **验证**：人为创建悬空target→Generate409→DELETE200→其余targets可生成；Favorite/Saved快照不被连带删。

### IR-05 — MEDIUM：文件所有权表使用缩写，违背“均相对于仓库根”声明

- **位置**：SC11 §7 L104–109，尤其`billing/**`、`plaza/**`、`map/**`、`shared/ui/**`等；CL L31引用该表。
- **原因/影响**：原成员报告给完整路径；新表声明仓库相对路径却混用省略前缀的缩写，若直接转CODEOWNERS或喂给Codex，会指向根目录而不是web/api features。A/B/D公共文件注册可能越界。
- **最小修复**：列出每个完整仓库相对路径；新增server/DB/client/Plaza storage等公共范围也给明确路径与唯一维护者。B review router/shell，A review DB/app.ts，D review公共发布存储；无需改任何业务API。不能据该问题断言现在已发生并发冲突。

### IR-06 — MEDIUM：删除中间站后的新leg mode继承含糊

- **位置**：SC11 §5 L75的“已有leg mode保留”“removeStop…重算下一段”；C报告§5已要求对齐交通来源。
- **原因/反例**：A→B是Bus，B→C是Taxi；删B后A→C并不是原来的任何一条leg。“保留已有mode”可能分别被实现为Taxi、Bus或初始default mode，生成不同下游结果。
- **影响/修复**：C/D；约定新入站leg按目标站原mode或明确fallback（例如Saved.input.defaultTravelMode），并规定无估时分支。加一条测试样例即可，不需新字段或endpoint。

### IR-07 — MEDIUM：lastEntry=null混合未知与已知无额外限制

- **位置**：SC11 §3 L34/47；U5F REQ-1.2要求显示“applicable last-entry”、known/missing不同。
- **原因/影响**：一个已核实无需单独最晚入场限制的地点，现有类型只能填null或捏造具体时刻。草案强制所有null发UNKNOWN_HOURS，会把已知情况也标成未知，使部分完全核实fixture无法feasible；但这不是必须“自动判为开放”的理由。
- **最小修复**：B/C/A明确“无额外限制”和“未取得资料”的可表达方式，可用最小状态补充，不能把null一律当无约束或强行编造lastEntry=close。若暂只支持未知，明确这是展示/状态限制并选择能覆盖验收的真实数据，不宣称具备完整三态。

### IR-08 — MEDIUM：REQ-1.12前端参考换算的数据消费路径未明确

- **位置**：SC11 §4 L61，API11 §4 L72，CL L59；A报告A-06；U5F REQ-1.12 Display/System Input。
- **原因/影响**：只描述A内部FX fixture给C；Trip响应不带率，用户未生成日程时也可能输入金额并查看参考换算，不能依赖CandidatePlan才获得来源/日期。A前端与C若各自复制常量可能不一致。
- **最小修复**：明确A web通过一个批准的共用reference数据模块消费同一静态率，或批准必要的读取接口；本地静态demo不强制新增FX endpoint。至少给“输入金额→显示率/来源/静态标记→换算”的可执行例子。当前已存在可用共享模块/真实率来源：**未验证**。

### IR-09 — MEDIUM（费用模块实施前）：金额运算安全上限与规划舍入边界未闭合

- **位置**：SC11 L19/32/61/92–94；API11 L131/135。
- **原因/影响**：单笔输入是安全整数，不保证乘decimalRate、累计和结算后仍在安全范围。Billing转换写了分币四舍五入，planner跨币总成本是先逐项取整还是最后取整未定，预算边界可差1分。影响A/C/D显示与验收，不是当前H骨架阻塞。
- **最小修复**：明确运算内部精度、转换/累加舍入顺序、最终结果范围校验及超范围422；参考FX必须验证from=原币/to=目标币。补混币恰好预算±1分及最大金额例子，保留net可为负。

### IR-10 — MEDIUM：起点/地标完整性尚停留在验收清单

- **位置**：SC11 L18/88，API11 L38，CL L50；U5F REQ-1.11 Display列六入口与圣保禄/新葡京/永利皇宫地标。
- **原因/影响**：OriginOption解决出发点，但没明确D如何识别和展示非当前origin的入口及prominent landmarks。可通过现有POI/tags和fixture完成，不应凭没有新DTO就判功能不可能。
- **最小修复**：A/B/D给批准的稳定ID/tag/地图标记样例并划清数据维护人，覆盖未选中地标是否也显示；不必建新Map API。真实坐标与来源：**未验证**。

### IR-11 — MEDIUM：M/Core与Optional的延期措辞需要区分

- **位置**：MX §6 L79、CL §4 L54–71、SC11 L90以下；U5F REQ-1.3/1.12/1.15标Core，1.13/1.16/1.17标Optional。
- **原因/影响**：按M/L分期对骨架合理，但“选做/延期”若被理解为所有M均可从最终验收移除，会悄悄缩小Match、Currency、Plaza范围。四份草案没有证据支持这种最终删减。
- **最小修复**：注明延期是实施顺序，不是从选定URS中删掉Core；任何最终范围变更另记批准。Plaza预览细节不阻塞H骨架，但承诺交付Plaza时不能删掉预览。由A汇总、四人选定基线确认。

### IR-12 — MEDIUM（Plaza实施前）：幂等确认与版本/过期校验顺序跨文档不完全一致

- **位置**：SC11 L100“过期/版本变化拒绝”；API11 L113又明确已发布token即便后来编辑仍返回原帖。
- **原因/影响**：已消费token之后又过期或源version增加，SC的绝对规则可得到409，API的重放规则可得到200。D实现与B/测试期望可能不一致；这不是需要拆preview URL的证据。
- **最小修复**：统一规定：先确认token确实属于路径itinerary及演示作用域；若已成功消费，返回关联原帖且不再发布；未消费才检查过期和当前version。也可选择所有过期重试409，但两文必须一致并写明幂等时限。重启后幂等映射是否保留需明确；不要求未发布前引入分布式系统。

### IR-13 — LOW（可选费用）：缺FX账单没有后补转换流程

- **位置**：SC11 L92–94、API11 L135。
- **原因/影响**：原币可保存且fxToCny=null，后续全局率变化又不更改历史率，且没有Expense更新；账单会一直unavailable。用户当前可删除重录，不是不可恢复的全局阻塞。
- **最小修复**：明确删后重录是当前可见恢复办法及确认要求；若体验需要，再提补率操作并留下来源，不自动重算历史已定率账单。M不选做时可延期。

### IR-14 — LOW：稳定stopId的唯一性范围应避免被误当全局主键

- **位置**：SC11 L15、L77/84允许同Trip多个Saved。
- **原因/影响**：同tripId+poiId的确定性UUID会在该Trip的多个itinerary副本中重复。DTO本身没问题，若A以后把stopId直接做全局主键会冲突；数据库实现尚不存在/未验证，不能据此断言已冲突。
- **最小修复**：注明stopId按itinerary上下文解释；关系表使用(itineraryId,stopId)或快照嵌套，不破坏确定性验收。A/D/C实施schema时确认。

### IR-15 — LOW：候选重跑校验的比较与版本范围须可测试

- **位置**：SC11 L84、API11 L94。
- **原因/影响**：纯函数重跑是可行的最小方案，但“比较result”不应是对象键顺序敏感的原始JSON字符串比较；估时算法/静态交通fixture若发生升级，同一snapshot可能得到不同结果。不是当前必需候选token或新endpoint的理由。
- **最小修复**：定义按类型语义比较，固定测试所用算法/交通fixture版本；返回SOURCE_CHANGED时给可恢复提示，不把不同warning文案排序造成的差异当数据损坏。代码与锁版本实现：**未验证**。

## 7. 修订优先级

| 顺序 | 项目 | 必须完成的最小结果 | 评审方/时间点 |
| --- | --- | --- | --- |
| 1 | IR-01 | 明确可行性约束与诊断结果的关系，形成一个冲突锁定时间反例的唯一输出 | C/D主提，A类型，B消费方；编辑契约冻结前 |
| 2 | IR-02/03/04 | 记录候选先编辑的需求偏离或修正流程；unknown/越日有返回分支；悬空target能清除 | A/B/C/D；相关H切片编码前 |
| 3 | IR-05/06/07/10 | 完整ownership路径、新leg mode规则、last-entry状态、origin/landmark fixture | 各owner/消费者；对应切片前，不要求先完成整个项目 |
| 4 | IR-08/09/11/12 | 参考FX消费、金额精度、Core分期措辞、Plaza幂等优先级 | A/C及B/D；M实施或最终范围承诺前 |
| 5 | IR-13/14/15 | 费用恢复说明、stopId作用域、语义比较/fixture固定 | 对应owner，随可选模块/schema/测试完善 |

本次没有修改草案，修订表不是已完成修复。四人签核、唯一URS/仓库、技术版本和PR治理仍按CL核实；源码测试与CI应在获准的骨架PR中验证，不要求先有不存在的功能测试记录。

## 8. 最终审核结论

**选择：FAIL。** 这是对“当前文本可否作为冻结后的统一实现合同”的否定，主要依据是IR-01的核心规则矛盾，以及IR-02对既有编辑/保存流程的未批准变化；不是否定现有总体架构、Owner分工或项目可实施性。

可以现在把v1.1四份草案**连同本报告**发给B、C、D，明确这是Request Changes评审材料，不是让他们照稿开工或批准一个已修好的版本。本次未发送任何消息。

至少先修IR-01，并由四人对IR-02/03/04形成明确的H行为决定，才能冻结C/D编辑与保存契约；其他MEDIUM/LOW不应一律升级成全项目开工阻塞。独立的基础设施骨架是否先做，可以在明确不冻结有缺陷接口、满足治理Gate后由团队另行授权；当前会话的限制仍是不编码。

对D原报告的重点复核结论保持：**Overwrite不必成为EditCommand；expectedVersion不必进入C纯函数；Plaza Preview不必新增URL。** v1.1在这些方向上有改进，但“URL少且DTO齐”不足以证明冲突结果和用户流程正确。建议修订后只针对变更和上述反例再审核，不重设计整个软件。
