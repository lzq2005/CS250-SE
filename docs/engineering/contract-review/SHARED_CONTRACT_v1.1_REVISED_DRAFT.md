# TripMate Macau — Shared Contract v1.1 REVISED DRAFT

> **定向修订 R1 — Proposed / Pending Approval（2026-10-31）**
> 本稿只处理 ISSUE 1–4（独立审核 IR-01–04），含为闭合这四项所必需的关联规则。未重新开展完整评审，未修复或重新判定 IR-05–15。原草案、原规范、原报告保持不变。本稿对应条款优先于旧 DRAFT，未变条款沿用旧提案状态；绝无已获四人批准之意。配套文件使用同名 REVISED 版，验收示例统一见 Review_Issues_Resolution.md。


**Proposed / Pending Approval — 2026-10-31**。所有下述新增规则及对 v1 的澄清均未生效。原 v1 与成员报告不变；四人批准后才由 A 经 Contract Change 合入正式规范。本文件是文档类型描述，不是项目功能代码。

## 1. 范围、架构与分层

保留 Vue 3/Vite/TypeScript/Tailwind；Node.js/Express/TypeScript；Prisma/SQLite；Leaflet/OpenStreetMap；Vitest/Supertest/Playwright。Monorepo：apps/web、apps/api、packages/contracts、data/fixtures、docs、tests/e2e。精确版本由 bootstrap PR 提供并由四人批准，未验证兼容性，不在本稿捏造版本号。

唯一应用仓库建议 `https://github.com/MUST-Workspace/D2-team2-project`，本地 `E:\MUST\2609\CS250 软件工程\D2-team2-project`；个人 CS250-SE 保留文档用途。该选择仍 Pending。需求精确基线见 Approval Checklist，不因本稿选择工程方案改变 Task 1/Task 2。

single-user/local demo，无 auth/生产多用户隔离承诺。HTTP 与 C 纯函数分开：C adapter 从 A/B 的后端只读服务组装 input；D 后端直接调用 C。模块间不通过额外 HTTP 自调用、不循环导入路由。A 负责共用基础设施注册，业务服务仍归原 owner。

## 2. 基本值与校验

- UUID 字符串，稳定引用；C 的 stop ID 对相同 tripId/poiId 使用稳定 UUID 策略，重复 generate 相同输入得到相同结果，编辑不重建 ID。日程/帖子/账单 ID 在实际创建时分配，不在算法里随机生成。
- Date＝合法 `YYYY-MM-DD`；LocalTime＝`HH:mm`；业务时区 Asia/Macau；Timestamp＝带 Z 的 UTC ISO-8601 字符串。checkedAt/asOf 有值时用 Timestamp，未知可 null。禁止依赖 JS Date 默认本地解析。
- startDate≤endDate；区间含首尾；dayWindows 对每个日期恰一条，date 不重不漏，start<end，同日不跨午夜。人工编辑 start/end 为15分钟倍数；生成和交通计算可为整数分钟；不伪造跨日 HH:mm。
- 每天从 Trip origin 出发，首 leg 的 fromPoiId=null 表示该 origin，非未知起点；暂不承诺每日不同 origin。A 的 curated origin/人工选点须为已核对澳门合法位置，Hengqin Port 使用批准的澳门侧入口坐标；普通包围框不足以证明点位合法。
- Money.amountMinor 非负安全整数（费用录入必须>0）；所有币种本稿均以100 minor units=1 unit。decimalRate 为正十进制字符串，不能用二进制浮点累计；非同币换算只使用明确有方向的批准参考率，不偷偷倒数/补默认率。
- 所有 endpoint 运行时校验；不认识的字段拒绝422，畸形 JSON/格式错误400。版本正整数。枚举区分大小写。所有跨 trip 引用必须校验。

## 3. 保留的核心共享模型（明确字段表）

`?` 表示可省略；未标记者必须存在。值为 null 与省略不同。

| 类型 | 完整字段/取值 |
| --- | --- |
| Category | history / food / shopping / nature |
| Currency | MOP / HKD / CNY |
| KnownStatus | verified / estimated / unknown |
| TravelMode | walk / bus / taxi |
| Money | amountMinor:number，currency:Currency |
| GeoPoint | lat:number，lng:number，均有限数且合法经纬度 |
| WeeklyWindow | weekday:number（1周一–7周日），open:LocalTime，close:LocalTime，lastEntry:LocalTime\|null |
| POI | id:UUID，name:string，category:Category，tags:string[]，position:GeoPoint，address:string，openingHours:WeeklyWindow[]\|null，suggestedVisitMinutes:正整数\|null，price:Money\|null，verification:KnownStatus，sourceUrl:string\|null，checkedAt:Timestamp\|null，**bookingNote:string\|null（新增）** |
| Origin（Trip内） | label:string，position:GeoPoint，source:curated\|manual |
| TripConfig | id:UUID，title:string，startDate:Date，endDate:Date，origin:Origin，dayWindows:{date:Date,start:LocalTime,end:LocalTime}[]，interests:Category[]，budget:Money\|null，pace:standard\|relaxed |
| PlannedStop | id:UUID，poiId:UUID，date:Date，arrive:LocalTime\|null，start:LocalTime\|null，end:LocalTime\|null（R1：仅结果的诊断时刻可空；人工输入仍不允许null） |
| TravelLeg | fromPoiId:UUID\|null，toPoiId:UUID，mode:TravelMode，durationMinutes:非负整数\|null，estimatedCost:Money\|null，estimateStatus:KnownStatus |
| WarningCode | CLOSED / LAST_ENTRY / DAY_END / OVERLAP / BUDGET / UNKNOWN_HOURS / UNKNOWN_TRAVEL / UNKNOWN_PRICE / UNSCHEDULED；新增 UNKNOWN_DURATION / UNKNOWN_FX |
| PlanWarning | code:WarningCode，poiId:UUID\|null，message:string，severity:info\|warning\|error |
| ItineraryDay | date:Date，stops:PlannedStop[]，legs:TravelLeg[] |
| PlanResult | tripId:UUID，status:feasible\|needs_review\|infeasible，days:ItineraryDay[]，unscheduled:{poiId:UUID,reason:string,code:WarningCode}[]，warnings:PlanWarning[]，estimatedTotalCost:Money\|null |
| FxRate | from:Currency，to:Currency，decimalRate:string，asOf:Timestamp\|null，source:string\|null |
| PlannerInput | trip:TripConfig，selectedPois:POI[]，defaultTravelMode:TravelMode，fxRates:FxRate[]；绝无 companions/expenses |

openingHours=null 未知、[]=已知整周关闭；缺少某 weekday 表示已知该日关闭。有多窗口时不得重叠。lastEntry 有值须落在窗口内；null 仅表示没有可靠的额外入场截止资料，不能向用户承诺“无限制”，输出 UNKNOWN_HOURS 警告，已知窗口仍可用于排程。verification 是整体信息状态，不能让 verified 覆盖某个 null 字段的未知含义；bookingNote 只作展示，不能推导虚假的预订可用性。

### R1-1 — 时间的语法有效性、可行性与诊断（ISSUE 1）

**Proposed / Pending Approval。** 人工 EditCommand 的start/end仍须为非空合法同日HH:mm、15分钟粒度、start<end；不符合返回422且不改变草稿/保存版本。`arrive≤start`、完整访问处于营业窗口、last-entry及每日窗口是**feasible判定条件**，不是所有诊断结果必须满足的结构校验。

结果中arrive表示当前输入/交通估计下的最早可达时间，不是已经发生的实测时间；有TimeOverride的start/end表示用户要求的时段，未锁定者是计算的参观时段。arrive晚于锁定start时，C保留用户start/end，返回`OVERLAP`、severity=error、status=infeasible，不能调早arrive或静默后移锁定时段。D同时显示“要求10:30–11:00 / 最早可达10:45 / 时间冲突”，不可用绿色可行标记掩盖冲突。诊断条目允许arrive>start，但绝不允许标feasible；其他已知营业/last-entry冲突同样保留请求并明确警告。

C计算下游时，用内部分钟数传播可达下界；对锁定时段，参观时长=请求end-start，最早离开=max(最早可达,请求start)+该时长。即使请求end早于这个下界，也不能用请求end假定游客已离开；相应最早离开可写在warning.message里解释。该内部下界无需新增公共字段。后续锁定值继续保留，未锁定站按可达下界重新算，并复核全部约束。

`days.stops`在needs_review/infeasible结果里可以含诊断性条目，D须把相关warning呈现为未解决问题，不把它们称作已确认可执行安排。初次生成时原本无法安排的目标仍放unscheduled。每个选中POI在days.stops或unscheduled恰一处，不因诊断错误直接丢失或重复。

每日legs仍与days.stops一一对应且顺序一致，即使某条stop时间暂为null，地图位置/编号也保留。null表示当前无法给出该字段在stop.date当天的可靠估计，D显示“待确定”，不能显示00:00或沿用旧时刻冒充新结果；具体分支见R1-3。

## 4. Targets → Planner 与候选结果

TargetsView＝`{tripId:UUID,poiIds:UUID[]}`，按首次 Add 顺序稳定去重；数据库唯一 `(tripId,poiId)`。B 的后端读取函数提供 TargetsView 及批量 POI 解析能力。C adapter 在一致性读取中拿 A TripConfig、B target IDs/POIs、A 批准的 FX fixture，按 ID 顺序组装 selectedPois；无 targets 返回422，不为生成自动使用 favorites。任何悬空 target 返回409 DATA_INTEGRITY_ERROR，不静默过滤。

C 继续导出 `generatePlan(input:PlannerInput):PlanResult`。初次HTTP GenerateRequest允许 `action?:'generate'` 与 `defaultTravelMode?:TravelMode`，mode缺省walk；editDraft是R1-2定义的独立请求分支；响应数据为 **CandidatePlan＝`{input:PlannerInput,result:PlanResult,commands:EditCommand[]}`（R1增加commands）**；初次Generate的commands=[]。C 不写已保存日程。该包装用于 D 保留确切输入；不能把客户端随意回传的候选当作可信事实。

生成不改变目标集合：selectedPois 的 ID 集合等于 stops 与 unscheduled 的不相交并集。候选未知时长 POI 暂不排程、以 UNKNOWN_DURATION 解释；未知交通且没有有来源估计时对应访问不能声称确定可行。可使用已标 estimated 的受控估计，不能把 null 当0。

状态优先级（R1，Proposed / Pending Approval）：保留的诊断条目有已知硬约束违反或任何severity=error时为infeasible；没有可安排stop且存在已知不可行目标也为infeasible。没有这些已知错误但有null时刻、未知输入、unscheduled或其他未解决警告时为needs_review。只有全部目标安排完整、结果时刻非空且无已知违反/未解决不确定性才为feasible。已知预算超额仍是已知违反。未知本身不是已知不可行；error优先于unknown。用户可明确保存诊断结果，状态与锁定/空值均原样保留，不得保存时洗成feasible。

### R1-3 — 未知交通、窗口溢出与跨午夜（ISSUE 3）

**Proposed / Pending Approval。** TravelLeg.durationMinutes=null仍表示未知；本次仅使PlannedStop结果的三个时间字段可空，不放宽EditCommand输入。不新增arrivalDate、跨日路由模型或HTTP URL。

- 改交通方式后无有来源估计：该leg duration=null、estimateStatus=unknown，输出UNKNOWN_TRAVEL/warning；该stop及当天依赖它的后续stop.arrive=null。未锁定start/end=null；已锁定start/end保留请求，但不能作为“已经到达”的证据。即使后面某段duration已知，也不能从一个未知出发点恢复精确arrival；未知沿该天传播。无其他已知错误时status=needs_review，绝不返回旧mode的时间或把duration作0。
- 改回已知mode：C从当天origin和当前stop顺序重新传播，使用同一POI快照时长与现有override，可恢复非空时间。未知并不自动删除stop，因此仍能用原setTransportMode修改同一date/toPoiId。
- 同日可表达但超过dayWindows.end（或早于start）：保留非空诊断时刻，输出DAY_END/error（message说明是日初还是日终），status=infeasible；不静默挪到下一天，不删除目标。人工请求end<=start仍是422输入错误，不与计划越窗混淆。
- 内部分钟数到达或离开>=1440：不输出24:45，也不把次日00:45写成同日00:45。越出stop.date的对应结果字段=null；已锁定start/end仍保留其当天请求。输出DAY_END/error，message明确原date、次日偏移及计算值（例如“2026-11-01 的下一日（2026-11-02）00:45到达”），status=infeasible。该天后续跨日/依赖时刻不能重置成看似可行；不自动重分配date。后续独立day从自己的origin/window重新计算。
- 例如自动start=23:50、30分钟访问：start仍可为23:50，end=null并给越日DAY_END；如果先前到达已未知，则未锁定的start/end均null。已知违反与未知同时存在时保持infeasible和两类warning。

这些null只改变诊断表达，不改变目标集合；初次Generate的不可安排POI仍可在unscheduled，不能因为新增可空字段就取消原有unscheduled分支。

总成本按 budget.currency 汇总；无预算则 MOP。门票+行程交通都纳入，不含 Expense；任一组成未知或缺 FX 则总成本 null 并附 UNKNOWN_PRICE/UNKNOWN_FX，不能把已知部分显示成完整总额。即使总额未知，已知成本下界已超预算仍出 BUDGET。参考率须有 source；asOf=null 时明确标 Static reference，source=null 的跨币率视不可用。同币不依赖 FX。H 先支持静态数据/缺失反馈，完整 FX UI 仍 M。

## 5. 编辑、持久化与覆盖

**EditCommand 保留 v1 三分支，不新增 overwrite 或 replaceStop：**

- `{type:'setVisitTime',stopId:UUID,start:LocalTime,end:LocalTime}`。
- `{type:'setTransportMode',date:Date,toPoiId:UUID,mode:TravelMode}`。
- `{type:'removeStop',stopId:UUID,confirmed:true}`。

HTTP EditRequest＝`{expectedVersion:number,command:EditCommand}`，由 D 校验版本，不传数据库字段给 C。新增 TimeOverride＝`{stopId:UUID,start:LocalTime,end:LocalTime}`。

RecalculationInput＝`{trip:TripConfig,allPois:POI[],current:PlanResult,command:EditCommand,fxRates:FxRate[],timeOverrides:TimeOverride[]}`；timeOverrides 是新增必需字段，值为应用当前命令前已接受的锁定时间。C 继续导出 `revalidateAndRecalculate(input:RecalculationInput):PlanResult`；函数名/返回不变。C 临时合并当前命令，D 在成功事务中保存同样的 overrides；失败不修改 overrides。

allPois是该草稿/保存输入selectedPois的全量快照（含原unscheduled），不是全城POI。C仍是唯一算法owner；D不复制重算规则。每次重算从当天origin重建时间传播，保留当前顺序、入站mode及timeOverrides；null旧时刻不是新计算的起点。每次重建受影响warning，已解决的OVERLAP/UNKNOWN_TRAVEL/DAY_END不得残留并误锁status；重算不把unscheduled自动塞回日程；锁定冲突按R1-1，未知/越日按R1-3。

### R1-2 — 未保存草稿、编辑与保存（ISSUE 2）

**Proposed / Pending Approval。** 保留Generate→Edit→Save。CandidatePlan不等于SavedItinerary：没有saved ID/version/updatedAt，不出现在My Trips保存列表，不创建日程DB记录。D负责候选UI和浏览器内当前副本；C的后端generate路由增加editDraft请求分支，仍调用同一重算纯函数。没有新增URL、服务器草稿表、候选会话/token或第二套前端算法。

CandidatePlan增加commands:EditCommand[]，仅是当前未保存候选的有序编辑证明。C从input用generatePlan得到基础结果，再按commands顺序调用revalidateAndRecalculate；逐条维护override（setVisitTime按stopId替换、removeStop删除锁定、transport不改锁定），最后得到当前result。每个命令在它执行时的当前结果上校验引用；已移除的stop不能再直接setVisitTime。D草稿编辑请求回传候选+一个新command，C核验已有命令回放与result相符后追加并返回。commands=[]代表未经编辑的生成结果；不引入持久化事件日志，首次保存后仅保存最终result/overrides，commands不进入Saved或公开帖。

草稿没有DB optimistic version；D必须串行提交单个草稿的编辑请求，失败/迟到响应不得覆盖更新副本。操作成功返回HTTP200，即使结果infeasible也作为可见诊断副本；结构错误422、来源改变409时不改本地副本。草稿编辑不写Trip/Targets/Favorite/Expense；取消编辑不发请求。未保存关闭/刷新可能丢草稿，离开时提示；本稿不承诺草稿跨设备或刷新恢复。

用户Save时D后端校验input与来源一致、调用C重放commands，语义比较result，保存重放后的input/result/timeOverrides；不能只重跑generate忽略编辑。create时version=1；overwrite才要求expectedVersion+confirmed。Saved编辑对话框在用户点“应用并保存”之前不调用mutation；点后沿用edits API并对旧version做原子比较更新，成功+1，失败/取消不改DB。明确提示该按钮会保存，不能把草稿的每次试改偷偷当保存。

### R1-4 — Stop删除、Target移除与恢复（ISSUE 4）

**Proposed / Pending Approval。**

| 操作 | 写入方与状态 | 对其他域的影响 | 恢复方式 |
| --- | --- | --- | --- |
| 从当天日程removeStop | D交互调用C的现有removeStop命令，需confirmed=true；stop从days.stops移至unscheduled，reason=USER_REMOVED、code=UNSCHEDULED；删除该stop的TimeOverride | 不删除input.selectedPois或B的Targets，不改变Favorite/Expense；候选只改候选，Saved在应用并保存时version+1 | 使用明确的“重新生成以恢复日程”操作；当前targets仍含它时，C重新考虑，不保证一定可安排；不新增restoreStop命令 |
| 从Trip Targets移除POI | B调用既有DELETE target，移除关系，不由C删DB | 不回写已有Saved或已有候选快照，不改Favorite/Expense；下次Generate不再包含它；不是当前Saved的隐式unscheduled操作 | B POST target重新Add；POI仍存在才能Add；已有关系则409重复提示。之后Generate，新候选再另存/确认覆盖 |

删除中间站后，新到下一站的leg沿用该下一站原入站mode，重新估算新端点间时长/费用；每个已有stop应有入站leg，若输入缺失该leg则422而不猜mode；绝不沿用被删边的duration。新估计未知则按R1-3。此规则只补足本次删除闭环，不重设计交通算法。

恢复/重新Generate会清空该新候选的commands与手工锁定，D事先告知会重排并丢弃当前草稿编辑，取消则保留原候选/Saved。Saved的重新Generate只是新候选，不立即写旧版本；必须另存，或提供expectedVersion和confirmed=true才覆盖。初次不可行/未知原因的unscheduled仍按原规则展示；USER_REMOVED是明确用户移除，不等于闭馆。

B的DELETE target只依赖Trip存在与关系键，不要求当前POI资料存在；即使target悬空或已无该关系也返回当前TargetsView/200。Trip不存在404、格式错误400。Add和POI详情继续验证POI存在。GET targets在悬空时仍返回ID，Generate仍409 DATA_INTEGRITY_ERROR；B可以展示“资料缺失”并清理该ID，不需要人工修库。

SavedItinerary（v1.1 扩展）＝`{id:UUID,tripId:UUID,version:number,input:PlannerInput,result:PlanResult,timeOverrides:TimeOverride[],updatedAt:Timestamp}`。input.trip.id 和 result.tripId 均与 tripId 一致。保存后的 input 快照不因 A TripConfig、B POI、参考 FX 更新而变化；重开从 snapshot 恢复，地图也从该 snapshot 取坐标。不得以读取最新 Trip 取代恢复。编辑不自动更新源 Trip/Targets；想用新配置重新生成，走 Generate 后覆盖或另存。

SaveItineraryRequest 两分支：

- create：`{mode:'create',candidate:CandidatePlan}` → 新id、version=1；timeOverrides取C重放candidate.commands得到的最终锁定，不丢弃草稿编辑。
- overwrite：`{mode:'overwrite',itineraryId:UUID,expectedVersion:number,confirmed:true,candidate:CandidatePlan}` → 同id、version+1，保存新候选input/result及其重放overrides，替换旧锁定。

覆盖是替换已保存计划，不是 C 的 stop 编辑命令。D校验候选input与当前来源Trip/Targets/POIs/FX一致，在一致性读取下用C从generatePlan重放candidate.commands并按类型语义比较result（不以JSON键顺序判断）；来源不同返回409 SOURCE_CHANGED，命令/结构/回放结果不符返回422 VALIDATION_ERROR。通过后才原子创建/覆盖。D 自己不能生成另一套检查算法。编辑也通过 C 后执行 version 条件写入，失败/冲突不写任何 itinerary 数据，取消不发 mutation。一个 Trip 可有多个 SavedItinerary，无隐含“最新即覆盖”。

## 6. Companion、费用与公开域

Companion＝`{id:UUID,tripId:UUID,name:string}`，trim 后非空，同名允许，外键不能用姓名。OriginOption＝`{id:UUID,label:string,position:GeoPoint}`，curated 列表；id 只用于 UI 选择，保存到 Trip 仍用原 origin 形状。用户重命名通过 PATCH companion，仅名字改变；不触发重算。

以下为 M/Optional 提案，未选做时延期整组：

- Expense＝`{id:UUID,tripId:UUID,place:string,poiId:UUID|null,payerId:UUID,participantIds:UUID[],original:Money,fxToCny:FxRate|null,createdAt:Timestamp}`。payer/participants 是同 Trip 的 Companion；参与者非空去重，payer 可以不在参与者内。poiId 仅作上下文，不与日程级联删除。CNY 原币不需 FX；外币保存时留存当时批准率，缺 FX 可保存原币，fxToCny=null 并明确结算不可用。
- Settlement＝`{tripId:UUID,currency:'CNY',status:'complete'|'unavailable',unresolvedExpenseIds:UUID[],people:{companionId:UUID,paidMinor:number,shareMinor:number,netMinor:number}[],transfers:{fromId:UUID,toId:UUID,amountMinor:number}[]}`。有缺FX账单时 status=unavailable，people/transfers=[]，不输出伪完整结果；无账单时 complete、所有人0。
- 每笔转换后按 CNY 分币四舍五入，再均分；余分按 participant UUID 字典序分配，非参与者份额0。net=paid−share，转账为债务人→债权人，稳定UUID顺序撮合；各人净额和为0。删除费用后重算结算，不改行程。无真实支付。

PublishedPostPublic **严格保留 v1 白名单**＝`{id:UUID,title:string,publishedAt:Timestamp,days:{date:Date,poiIds:UUID[]}[]}`。不含 TripConfig、input、companions、budget、expenses、private notes、版本元数据。公开地图使用 B 的公开 POI 坐标，只画顺序，不从私人 itinerary 读取 legs；缺失点显示不可用并保留编号，不把私人快照透出。

Publish 请求沿用一条 URL：preview `{action:'preview',expectedVersion:number,title:string}`；confirm `{action:'confirm',expectedVersion:number,previewToken:string,confirmed:true}`。title 是用户单独输入的公开标题，trim 后1–120字，禁止自动复制私有 Trip title；脱敏 UI 提醒并展示所有将公开内容，不能宣称自动识别人名。

PublishPreview＝`{previewToken:string,itineraryId:UUID,expectedVersion:number,expiresAt:Timestamp,content:{title:string,days:{date:Date,poiIds:UUID[]}[]}}`，只对本地私有工作区返回。D 从保存版本生成白名单；token 由 D 内部管理，绑定版本和确切 content，有效10分钟；preview 不创建 plazaPosts、不改 itinerary version/updatedAt。confirm 原子校验 token/版本/内容后发布，一次确认创建一帖；重复同token返回同帖（不重复发布）。过期 token 409 PREVIEW_EXPIRED，保存版本变化409 VERSION_CONFLICT，内容/token不符422。publishedAt 在确认时服务端分配，用户预览内容不含尚未存在的发布ID/时间。取消不调用 confirm；仅自然过期临时token，不修改业务数据。

## 7. 文件所有权及模块依赖

| Owner | 业务与公共路径（相对于应用仓库） |
| --- | --- |
| A | `apps/api/prisma/**`、`packages/contracts/**`、`apps/api/src/features/trips/**`、`billing/**`、`apps/web/src/features/trip/**`、`billing/**`、`apps/api/src/app.ts`；根 manifests/lockfile、CI/dev scripts。新增明确：backend server/DB client/error middleware、seed总入口、contracts build 配置由A维护 |
| B | `apps/web/src/features/discovery/**`、`plaza/**`、`shared/ui/**`、`router/**`、`styles/**`；`apps/api/src/features/pois/**`、`favorites/**`、`targets/**`、`plaza/plaza.read.*`；`data/fixtures/pois.*`数据。新增明确：App.vue/main.ts、activeTrip state、共用 web API client；bootstrap这些文件由B提供/审核 |
| C | `apps/api/src/features/planning/**`、`apps/web/src/features/planning/**`（仅生成入口/进度/warning）、`tests/fixtures/planning/**`、`docs/architecture/planner.md` |
| D | `apps/api/src/features/itineraries/**`、`plaza/plaza.publish.*`、`apps/web/src/features/itinerary/**`、`map/**`、`tests/e2e/**`、`docs/testing/integration.md`、`docs/deployment.md`（A复核）；新增明确：Plaza公共存储服务由D维护，B读函数、D写函数，A注册router/schema |

直接依赖只读服务/共享类型，不依赖对方 Router；C adapter消费A/B只读服务，C纯函数不访问DB；D消费C纯函数和已保存snapshot；B读取D发布的public存储。schema/migration只能A改、router/style只能B协调；owner不是单方批准共享合同的权力。

## 8. 变更清单与验收

保留 EditCommand、两纯函数名称、主业务ownership和全部 v1 路径；增加 bookingNote、两种 unknown WarningCode、CandidatePlan、SavedItinerary快照/timeOverrides、RecalculationInput.timeOverrides、Companion/Expense/Settlement/Publish DTO。R1进一步把CandidatePlan扩为input/result/commands，并将PlannedStop结果时间扩为nullable，generate现有路径增加editDraft请求分支；保存时重放编辑而不丢锁定。不增加URL、不扩EditCommand、不改变职责。它们属于明确的跨模块变更，不能声称完全向后兼容；A/B/C/D mocks与消费者同批更新。API 请求/错误等完整定义见同目录 API 草案。

无需真实业务代码即可评审本稿；批准后再写类型/单元/API/E2E测试。最低测试：targets/Favorite隔离、数据不丢、相同输入确定性、两次人工编辑保留、版本竞争、覆盖取消、源数据变更重开、FX缺失、发布预览无副作用/确认一致/敏感字段负例。草案不是测试已通过的证据。

本次定向验收：见Review_Issues_Resolution.md的R1-T01–T15；四项均为“已提出解决方案/待批准与验证”，不是审核员重新判为PASS。IR-05–15中的其他问题继续保留未关闭。
