# TripMate Macau — Review Issues Resolution / R1

**Proposed / Pending Approval — 2026-10-31**。本文件只针对四项指定问题提出定向修订和验收，不是再次完整开发前评审，不代表四位成员批准、功能已实现或独立审核已改判PASS。

## 1. 修订对象、依据与边界

目录：`E:\MUST\2609\CS250 软件工程\项目落地\contract-review`。

本次重新读取的五份依据：

- Contract_v1.1_Independent_Technical_Review.md：§5 IR-01、§6 IR-02/03/04及§7/8；其他IR保留原待处理状态。
- Conflict_Resolution_Matrix.md：CR-06/07/08/09/10、§5的EditCommand/Overwrite判断；作为历史提案，不把其“可审查”当批准。
- SHARED_CONTRACT_v1.1_DRAFT.md：§3原arrive≤start、§4 CandidatePlan、§5锁定/保存/删除。
- API_ENDPOINTS_v1.1_DRAFT.md：§3删除target的404、§4 generate、§5.1/5.2保存和强制先保存。
- Team_Approval_Checklist.md：Bootstrap/H Gate及待确认的候选编辑顺序。

另实际核对 `E:\MUST\2609\CS250 软件工程\Task 2\提交\TripMate_Task2_URS_Final_v5_fixed.docx` 的System Functions、REQ-1.4/1.7/1.8/1.9/1.14：生成候选→查看/编辑→保存，交通/时间改变后的下游重算，错误提示/目标保留，破坏性动作确认与保存恢复。该URS仍写final approval pending，只作需求候选依据，不将其认定为批准最终版。Task 1 §3.4“edit before saving”的证据位置沿用独立审核报告，本次没有重新打开Task 1，不冒称重复验证PDF全文。

输出仅为四份新文件：Shared REVISED、API REVISED、Checklist REVISED、本Resolution。完整修订草案保留其他原提案章节；顶部优先级声明明确R1条款取代旧DRAFT对应段落。原v1、五份依据、成员报告、Task 1/2均不修改。

## 2. 四项解决方案及最小变更

| 用户问题 / 审核编号 | 选定的建议方案（全部Pending） | 修订位置 | 责任与批准 |
| --- | --- | --- | --- |
| ISSUE 1 / IR-01 BLOCKER | 语法合法与可行性分开；保留用户锁定及最早可达，冲突返回OVERLAP/error与infeasible；下游按可达下界传播 | Shared REVISED R1-1/§5；API REVISED §5.2 | C算法、D交互、A契约/存储、B消费；四人批准 |
| ISSUE 2 / IR-02 HIGH | 未保存候选可先编辑；现有generate URL增加editDraft分支，候选附commands；首次Save重放并保留手改。Saved仍用expectedVersion写回 | Shared R1-2及Save分支；API §4/5；Checklist §7 | C适配器/纯函数、D编辑保存、A contracts/schema/register；B消费；四人批准 |
| ISSUE 3 / IR-03 HIGH | PlannedStop结果时间允许null；未知不能作0/沿用旧值；同日越窗与越日明确DAY_END/error，未知单独needs_review | Shared R1-3/类型表；API §5.2 | C/D主审，A类型/可空存储，B POI；四人批准 |
| ISSUE 4 / IR-04 HIGH及删除语义 | removeStop→当前unscheduled、不删target；B移除target→只改源选择、不回写快照。恢复通过明确重新Generate，必要时先Add；悬空target可直接DELETE清理 | Shared R1-4；API §3/5.2；Checklist §7 | B目标、C结果、D交互、A关系；四人批准 |

### 2.1 ISSUE 1 — 明确冲突不是格式错误

用户输入的start/end必须有值、同日、15min且start<end，错误422；“到达晚于要求开始”是重算发现的业务冲突，HTTP200携带infeasible诊断结果，而不是伪装成成功可执行，也不是把请求锁定偷偷推迟。

例如要求P为10:30–11:00，当前最早arrive=10:45：保留三字段10:45/10:30/11:00，warning={code:OVERLAP,poiId:P,severity:error,message:说明晚15分钟}，status=infeasible。D必须区分“用户要求”与“最早可达”，并显示未解决冲突；不能把start称为已实际发生的参观时刻。

为避免下游时刻倒退，内部最早离开=max(arrive,要求start)+(要求end−要求start)。本例最早离开11:15；到下一站15分钟则下一站最早arrive=11:30。用户仍要求11:00结束的事实保留，warning解释为什么不能在该时刻离开。不给公共DTO增加一组重复的“实际开始/结束”字段；若团队不接受这类诊断表达，应Request Changes，而不是C/D分别改成自动挪动或删除。

此分支属于不确定/不可行结果的可见诊断；day.stops中仍保留意向位置与ID，D同时用warnings展示未解决问题。原初次Generate的unscheduled机制不取消，已知无法安排的初始目标仍应保留在该列表。

### 2.2 ISSUE 2 — 先编辑草稿，再保存；不建立新草稿架构

原CandidatePlan只有input/result。若候选发生人工编辑，D保存时只调用generate核验，会丢失或拒绝合法手改；单靠信任客户端result又不能满足既有候选核验。因此最小增加 `commands:EditCommand[]`：它是当前草稿的命令清单，不是数据库事件日志。

初始Generate返回commands=[]。草稿编辑请求仍发给 `POST /api/v1/trips/:tripId/generate`：`{action:'editDraft',candidate,command}`；C从候选input重新generate，回放已有commands核验，再应用新命令，返回新CandidatePlan。D只保留当前浏览器副本；无Saved记录、无DB version、无服务端草稿token/session/table，也无第二套前端算法。一个草稿请求串行处理，不能让迟到结果覆盖新状态。

首次Save提交create+candidate，D在后端调用C同样回放并保存结果及折叠后的timeOverrides，version=1。commands不进入Saved/public；保存快照保留最终排程、mode、unscheduled和锁定即可。每个命令在当时结果上检查引用，重复删除已不存在stop不能伪装成另一个有效操作。

已保存行程仍由D的edits路由处理 `{expectedVersion,command}`。对话框点“应用并保存”才写回：成功version+1，取消/失败/409不变；C不检查DB版本。Saved可以持续编辑，但不能把后台每次试输都当静默自动保存。第一次保存之前不再强制保存；未保存刷新/关闭可能丢失，D离开提示，本稿不承诺草稿持久化。

同一路径增加请求分支是**公共契约修订**，不是“完全没改API”。本稿未新增URL；若团队偏好独立draft-edit URL，需在批准时明确取舍，不能实现者自行改选。

### 2.3 ISSUE 3 — 必须新增可空结果字段的理由

保持同日LocalTime模型而不新增跨日安排引擎；只将PlannedStop.arrive/start/end扩为`LocalTime|null`，因为当前非空HH:mm无法表达“交通未知”及“已知到达次日”。EditCommand输入仍严格非空；TimeOverride也不允许null。

- 无估时：leg.durationMinutes=null/unknown；该stop与当天依赖它的后续arrival为null。自动start/end为null；已锁定要求保留但不当作已到达。没有其他已知错误时needs_review，warning为UNKNOWN_TRAVEL。null不得被D格式化成00:00或补回旧mode时刻。
- 同日超过日终：保留可表达的时刻并给DAY_END/error，status=infeasible；早于日初也按窗口冲突说明。
- 越午夜：内部用分钟数保留计算，越出stop.date的对应字段null；warning说明原日期与次日到达值；日期不偷改、目标不丢、状态infeasible。不能输出24:45，也不能把次日00:45伪装当天值。
- 重新选回已知mode时，从origin和当前顺序重新计算；旧null不是零点、旧warning不是永久状态。已解决warning重建移除；下一个独立day仍从自己的origin/window计算。
- error优先于unknown：未知交通同时用户要求时段已越日终，就同时保留UNKNOWN_TRAVEL及DAY_END，状态infeasible。

团队须批准这种“保留诊断条目+nullable”的方案。另一种可选方案是把受影响点全部转为unscheduled并加请求时间元数据，但那会再改变输出结构，本次不并行提出两套供各模块自行选择。

### 2.4 ISSUE 4 — 两种删除及最小恢复

`removeStop`是D的当天日程操作：C把该点移到当前结果unscheduled，reason=USER_REMOVED，保留input.selectedPois/targets；解除该点锁定。D需确认，取消无变化。移除中间站后的新leg继承下一目标的原入站mode，重新估时，不能复用旧端点的duration；输入缺入站leg是422，不额外猜默认mode。

恢复当前日程最小路径：D显示“重新生成会清空本草稿的人工调整”，用户确认后用当前Trip/Targets Generate新候选。若target仍在，就重新被考虑；若因闭馆等仍不能安排，出unscheduled具体原因，不能承诺“一定恢复进当天”。不新增restoreStop命令，不提供未经设计的单点插回算法。Saved旧记录到真正Save/Overwrite前不变，取消不丢旧记录。

`DELETE /trips/:tripId/targets/:poiId`属于B：只移除Trip选择关系，不回写Saved或既有候选快照，不隐式生成一个当前日程删除。要恢复选择，B POST target；POI需存在；重复Add409可提示已在列表。随后Generate/另存或确认覆盖，才会更新某份行程。

悬空target恢复：GET targets仍给原ID，Generate409明确列出缺失ID；B提供移除入口。DELETE只要求Trip存在，不因POI缺失而404；关系已无也200。清理后可以生成剩余目标；空集合则原NO_TARGETS/422。Favorite和费用不受任一种删除影响。

## 3. 数据/API变更清单与非变更

| 项目 | 是否必要变更 | 依据/影响 |
| --- | --- | --- |
| PlannedStop.arrive/start/end | 是，结果字段允许null | ISSUE 3非空HH:mm表达不了未知/越日；A改共享类型，C输出、D显示/存储同步 |
| CandidatePlan.commands | 是，新增必需有序数组 | ISSUE 2编辑后可重放核验，保存不丢手改；旧候选fixture补[] |
| generate HTTP request | 是，原generate分支保留并增加editDraft分支；可选action=generate | 不新增URL；C拥有计算适配，D拥有UI，A注册/合同 |
| Save create/overwrite | 字段分支不变，验证语义变为generate+commands回放 | 保存最终overrides，不再清空草稿锁定；Saved仍按原模型，无commands事件表 |
| Delete target | 路径/返回DTO不变，POI缺失不再导致404 | 关闭IR-04恢复死路；Trip404保留 |
| EditCommand与两纯函数 | 三种命令/函数名和返回类型名不变 | 当前重算参数含timeOverrides，重放复用它们；不加overwrite/restoreStop命令 |
| Saved version、公开白名单、费用/收藏 | 不新增字段，不改变Owner或私密隔离 | 版本仍D原子比较；四项修订不重开Plaza/Billing设计 |

原有IR-05–15未在本次一并关闭。删除新leg mode的小条款与IR-06有关，但仅为本次删除闭环补足；不能据此宣称独立审核全部问题都已修复。精确URS/仓库/版本/范围批准仍待原流程确认。

## 4. 定向验收示例（文档测试计划，未执行）

### 4.1 公共fixture约定

以下P/Q/R、Trip T、stop sP/sQ是测试符号，不是对公网真实POI或实时交通的声明。后续fixture绑定稳定UUID，sP由批准的确定性策略产生；各测试固定所有源配置/算法版本，除指定变更外均已核实且有来源标记，营业/last-entry/价格/预算不会产生额外warning。使用MOP和已知成本，避免FX影响本轮时间测试。默认日期2026-11-01、window 10:00–18:00；P/Q游玩30分钟。origin→P为Walk15分钟、Bus45分钟，P→Q为15分钟。这是受控测试数据，不是澳门交通事实。

### 4.2 ISSUE 1：R1-T01–T03

| ID | 输入/动作 | 期望输出与不可发生行为 | 验收成员 |
| --- | --- | --- | --- |
| R1-T01 | P已锁10:30–11:00；origin10:00，Walk→Bus45；Q未锁 | P.arrive=10:45，start=10:30/end=11:00保留，OVERLAP/error，status=infeasible；内部P最早离开11:15，Q.arrive/start=11:30、end=12:00；D显示要求/最早可达，不能绿标可行或假定P11:00已离开 | C单测，D UI/API，A类型 |
| R1-T02 | 在T01诊断上用户主动改P要求为10:45–11:15 | arrive=10:45、锁定新值；Q11:30–12:00；旧OVERLAP移除，其他条件全已知时feasible；改变来自用户命令而非C偷偷调锁定 | C/D |
| R1-T03 | 提交P 10:32–11:00、start=end，或null输入 | 422 VALIDATION_ERROR，不返回一个默默修正的时段；草稿commands/result和Saved.version/updatedAt均不变；结果可空不等于命令可空 | A/C/D |

### 4.3 ISSUE 2：R1-T04–T07

| ID | 输入/动作 | 期望输出与持久化断言 | 验收成员 |
| --- | --- | --- | --- |
| R1-T04 | 初次Generate返回input/result/commands=[]；editDraft setVisitTime锁P10:30–11:00 | 返回commands长度1及重算结果；DB Saved数量不增加、不要求expectedVersion；My Trips保存列表无这份草稿；取消编辑保持旧副本 | C/D，A DB |
| R1-T05 | 草稿先改P时间、再改交通；Save create该候选 | 后端重放得到与候选语义一致结果；Saved.version=1、input/result相同、timeOverrides含P锁定；即使结果infeasible仍保留状态；重开不丢mode/锁定。Saved/public无commands字段 | A/C/D |
| R1-T06 | 已存version=3；两次edits都带expectedVersion=3；另测编辑对话框取消 | 一次200并version=4，另一次409 VERSION_CONFLICT；取消不发mutation，原DB内容/version/updatedAt不变；不是两次都成功到5 | A/D，C配合 |
| R1-T07 | 草稿结果被篡改而commands不变；另测源Trip被合法修改后继续editDraft/Save | 篡改422 VALIDATION_ERROR；源变化409 SOURCE_CHANGED；两者均保留浏览器原副本且不写Saved。D提示重新Generate前会清空草稿调整，拒绝/取消不能直接丢弃草稿 | A/C/D |

### 4.4 ISSUE 3：R1-T08–T11

| ID | 输入/动作 | 期望输出与禁止事项 | 验收成员 |
| --- | --- | --- | --- |
| R1-T08 | 将origin→P改为无duration估计的mode；P仍锁10:30–11:00，Q未锁 | leg.duration=null/status unknown；P.arrive=null但锁定10:30/11:00保留；Q.arrive/start/end=null；UNKNOWN_TRAVEL/warning，其他条件无error则needs_review；不能用旧Walk15或把未知作0，所有ID和地图顺序仍在 | C/D |
| R1-T09 | 在T08结果上把同一leg改回Walk15 | 从origin重新推算P.arrive10:15，P锁定10:30–11:00，Q11:15–11:45；移除已解决UNKNOWN_TRAVEL，其他条件全已知时feasible；不必删除/重新Add POI | C/D |
| R1-T10 | 单站fixture，date11-01、window23:45–23:59，原有短交通/短访问能排入；改该leg为已知60分钟 | 内部到达为11-02 00:45；stop.date仍11-01，arrive=null，未锁start/end=null，DAY_END/error、infeasible，message包含原/次日日期及00:45；禁止24:45、同日00:45及自动移到11-02 | C/D，A可空存储 |
| R1-T11 | 子例a：window16:00–17:00，origin16:00、leg45、访问30；子例b：同window下leg未知，用户锁17:15–17:45 | a到达/开始16:45、结束17:15，DAY_END/error、infeasible；b arrival=null、请求17:15/17:45保留，同时UNKNOWN_TRAVEL与DAY_END/error，status=infeasible优先于needs_review；不能把越窗命令当格式错误自动改到17:00 | C/D |

### 4.5 ISSUE 4：R1-T12–T15

| ID | 输入/动作 | 期望输出与跨模块断言 | 验收成员 |
| --- | --- | --- | --- |
| R1-T12 | 日程P→Q→R，R入站mode=Taxi，Q有锁定；用户确认removeStop sQ | days.stops不含Q，unscheduled恰一条Q/USER_REMOVED/UNSCHEDULED；Q锁定移除；input.selectedPois/B targets仍含Q；P→R用R原Taxi但重新估时；Favorite/Expense完全不变。取消时以上均不改 | B/C/D，A关系 |
| R1-T13 | T12后点恢复并确认重新Generate；另测取消恢复 | 若Q仍为当前target且能安排，新候选重新考虑Q，commands=[]且不保留旧锁定；不保证所有其他手工编辑保留，UI事前明示。取消则原草稿/已存版本不变；Saved旧结果只有另存/带version确认overwrite才变 | B/C/D |
| R1-T14 | B从Targets移除Q，再Generate；随后B Add回Q，再Generate | 第一个新input不含Q，不自动在新结果塞Q的USER_REMOVED；已有Saved和旧候选快照仍保持旧Q。重新Add后新的生成再次考虑Q；重复Add409、Favorite独立；不是C偷偷改B关系 | B/C/D |
| R1-T15 | GET targets含已缺失POI Q；Generate；DELETE target Q；重复DELETE | Generate409 DATA_INTEGRITY_ERROR明确缺失ID；两次DELETE都200返回最新TargetsView，不因Q资料缺失404；剩余有效目标可生成，若全空则422 NO_TARGETS；Saved快照/Favorite/费用无级联修改，Trip不存在仍404 | A/B/C/D |

每条验收应记录fixture版本、输入、期望/实际输出、DB前后状态、UI截图或API结果、执行人及提交SHA。本次只定义用例，不写测试代码、不宣称测试已经通过。

## 5. 仍需团队决定与交付状态

| 决策 | 当前推荐 | 状态 |
| --- | --- | --- |
| 冲突时保留诊断条目还是迁入另一结构 | 当前推荐保留条目/用户要求并显式infeasible；批准nullable与可达下界传播 | Pending，C/D主审，A/B确认 |
| 候选编辑承载方式 | 当前推荐同generate路径的editDraft+commands，不新增URL/草稿表/事件存储 | Pending，四人确认 |
| 已保存行程写回交互 | 当前推荐显式“应用并保存”才做expectedVersion检查并原子落库；无隐式试输保存 | Pending，D主审，四人确认 |
| Stop恢复的最小体验 | 当前推荐确认后重新Generate，会重排并清空新候选手改；不保证单站恢复且保留全部其他编辑 | Pending，B/C/D主审，A确认；若不接受，另行设计最小restore命令，不能私自实现 |
| 未保存草稿刷新/关闭 | 当前推荐离开提示，不承诺跨刷新/跨设备恢复 | Pending，D主审 |
| 其余原问题 | IR-05–15未整体关闭；唯一URS/仓库/范围仍待批准 | 本轮未重新评审 |

可以把四份修订文档交给B/C/D审核。交付状态是**四项均已有明确建议与验收 / Proposed / Pending Approval**，不是“已修复实现”“全契约PASS”或“可立即开工”。下一步应让责任成员确认同一修订，再针对这四项及对应测试方案复核；本次不触发编码或Git操作。
