# TripMate Macau — Shared Contract v1.1 DRAFT

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
| PlannedStop | id:UUID，poiId:UUID，date:Date，arrive:LocalTime，start:LocalTime，end:LocalTime |
| TravelLeg | fromPoiId:UUID\|null，toPoiId:UUID，mode:TravelMode，durationMinutes:非负整数\|null，estimatedCost:Money\|null，estimateStatus:KnownStatus |
| WarningCode | CLOSED / LAST_ENTRY / DAY_END / OVERLAP / BUDGET / UNKNOWN_HOURS / UNKNOWN_TRAVEL / UNKNOWN_PRICE / UNSCHEDULED；新增 UNKNOWN_DURATION / UNKNOWN_FX |
| PlanWarning | code:WarningCode，poiId:UUID\|null，message:string，severity:info\|warning\|error |
| ItineraryDay | date:Date，stops:PlannedStop[]，legs:TravelLeg[] |
| PlanResult | tripId:UUID，status:feasible\|needs_review\|infeasible，days:ItineraryDay[]，unscheduled:{poiId:UUID,reason:string,code:WarningCode}[]，warnings:PlanWarning[]，estimatedTotalCost:Money\|null |
| FxRate | from:Currency，to:Currency，decimalRate:string，asOf:Timestamp\|null，source:string\|null |
| PlannerInput | trip:TripConfig，selectedPois:POI[]，defaultTravelMode:TravelMode，fxRates:FxRate[]；绝无 companions/expenses |

openingHours=null 未知、[]=已知整周关闭；缺少某 weekday 表示已知该日关闭。有多窗口时不得重叠。lastEntry 有值须落在窗口内；null 仅表示没有可靠的额外入场截止资料，不能向用户承诺“无限制”，输出 UNKNOWN_HOURS 警告，已知窗口仍可用于排程。verification 是整体信息状态，不能让 verified 覆盖某个 null 字段的未知含义；bookingNote 只作展示，不能推导虚假的预订可用性。

arrive≤start<end；arrive 是旅行后到达、start 是实际参观开始，差值可以是等待；完整访问应在同一营业窗口内且满足 last-entry。每日 legs 顺序与 stops 一致，每 stop 一个入站 leg。

## 4. Targets → Planner 与候选结果

TargetsView＝`{tripId:UUID,poiIds:UUID[]}`，按首次 Add 顺序稳定去重；数据库唯一 `(tripId,poiId)`。B 的后端读取函数提供 TargetsView 及批量 POI 解析能力。C adapter 在一致性读取中拿 A TripConfig、B target IDs/POIs、A 批准的 FX fixture，按 ID 顺序组装 selectedPois；无 targets 返回422，不为生成自动使用 favorites。任何悬空 target 返回409 DATA_INTEGRITY_ERROR，不静默过滤。

C 继续导出 `generatePlan(input:PlannerInput):PlanResult`。HTTP GenerateRequest 仅允许 `defaultTravelMode?:TravelMode`，缺省 walk；响应数据为 **CandidatePlan＝`{input:PlannerInput,result:PlanResult}`（v1.1新包装）**。C 不写已保存日程。该包装用于 D 保留确切输入；不能把客户端随意回传的候选当作可信事实。

生成不改变目标集合：selectedPois 的 ID 集合等于 stops 与 unscheduled 的不相交并集。候选未知时长 POI 暂不排程、以 UNKNOWN_DURATION 解释；未知交通且没有有来源估计时对应访问不能声称确定可行。可使用已标 estimated 的受控估计，不能把 null 当0。

状态：已安排日程存在已知硬违反，或没有可安排 stop 且存在已知不可行目标时为 infeasible；其余有 unscheduled、未知信息或未解决警告为 needs_review；全部已安排、无未解决约束或未知输入才为 feasible。已知预算超额属于已知违反。带警告的结果仍允许用户明确保存，保存不把其状态改成 feasible。

总成本按 budget.currency 汇总；无预算则 MOP。门票+行程交通都纳入，不含 Expense；任一组成未知或缺 FX 则总成本 null 并附 UNKNOWN_PRICE/UNKNOWN_FX，不能把已知部分显示成完整总额。即使总额未知，已知成本下界已超预算仍出 BUDGET。参考率须有 source；asOf=null 时明确标 Static reference，source=null 的跨币率视不可用。同币不依赖 FX。H 先支持静态数据/缺失反馈，完整 FX UI 仍 M。

## 5. 编辑、持久化与覆盖

**EditCommand 保留 v1 三分支，不新增 overwrite 或 replaceStop：**

- `{type:'setVisitTime',stopId:UUID,start:LocalTime,end:LocalTime}`。
- `{type:'setTransportMode',date:Date,toPoiId:UUID,mode:TravelMode}`。
- `{type:'removeStop',stopId:UUID,confirmed:true}`。

HTTP EditRequest＝`{expectedVersion:number,command:EditCommand}`，由 D 校验版本，不传数据库字段给 C。新增 TimeOverride＝`{stopId:UUID,start:LocalTime,end:LocalTime}`。

RecalculationInput＝`{trip:TripConfig,allPois:POI[],current:PlanResult,command:EditCommand,fxRates:FxRate[],timeOverrides:TimeOverride[]}`；timeOverrides 是新增必需字段，值为应用当前命令前已接受的锁定时间。C 继续导出 `revalidateAndRecalculate(input:RecalculationInput):PlanResult`；函数名/返回不变。C 临时合并当前命令，D 在成功事务中保存同样的 overrides；失败不修改 overrides。

allPois 是该已保存输入 selectedPois 的全量快照，包含原 unscheduled，不是全城POI。重算只重排时间和估计，不把 unscheduled 自动塞回日程；已有 leg mode 保留。更新一站时间/交通后传播后续未锁定站点；此前接受的人工时间不被静默覆盖，若与新到达时刻冲突则保留输入并给 OVERLAP/其他 error，status=infeasible。removeStop 从日程移到 unscheduled，reason=`USER_REMOVED`，code=UNSCHEDULED；其 timeOverride 删除，重算下一段；B targets、favorites、Expense 不变。UI 明示这是“从当前日程移除”；重新 Generate 会重新考虑仍在 targets 的 POI。

SavedItinerary（v1.1 扩展）＝`{id:UUID,tripId:UUID,version:number,input:PlannerInput,result:PlanResult,timeOverrides:TimeOverride[],updatedAt:Timestamp}`。input 和 result.tripId 均与 tripId 一致。保存后的 input 快照不因 A TripConfig、B POI、参考 FX 更新而变化；重开从 snapshot 恢复，地图也从该 snapshot 取坐标。不得以读取最新 Trip 取代恢复。编辑不自动更新源 Trip/Targets；想用新配置重新生成，走 Generate 后覆盖或另存。

SaveItineraryRequest 两分支：

- create：`{mode:'create',candidate:CandidatePlan}` → 新 id，version=1，timeOverrides=[]。
- overwrite：`{mode:'overwrite',itineraryId:UUID,expectedVersion:number,confirmed:true,candidate:CandidatePlan}` → 同 id、version+1，新的 input/result，timeOverrides=[]。

覆盖是替换已保存计划，不是 C 的 stop 编辑命令。D 校验候选 input 与当前来源 Trip/Targets/POIs/FX 一致，在一致性读取下重跑 C.generatePlan 并比较 result；不一致返回409 SOURCE_CHANGED，结构错误422。通过后才原子创建/覆盖。D 自己不能生成另一套检查算法。编辑也通过 C 后执行 version 条件写入，失败/冲突不写任何 itinerary 数据，取消不发 mutation。一个 Trip 可有多个 SavedItinerary，无隐含“最新即覆盖”。

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

保留 EditCommand、两纯函数名称、主业务ownership和全部 v1 路径；增加 bookingNote、两种 unknown WarningCode、CandidatePlan、SavedItinerary快照/timeOverrides、RecalculationInput.timeOverrides、Companion/Expense/Settlement/Publish DTO。Generate 响应由 PlanResult 改 CandidatePlan，保存详情增加字段，属于明确的跨模块变更，不能声称完全向后兼容；A/B/C/D mocks与消费者同批更新。API 请求/错误等完整定义见同目录 API 草案。

无需真实业务代码即可评审本稿；批准后再写类型/单元/API/E2E测试。最低测试：targets/Favorite隔离、数据不丢、相同输入确定性、两次人工编辑保留、版本竞争、覆盖取消、源数据变更重开、FX缺失、发布预览无副作用/确认一致/敏感字段负例。草案不是测试已通过的证据。
