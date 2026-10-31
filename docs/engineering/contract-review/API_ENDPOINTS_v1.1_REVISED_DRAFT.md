# TripMate Macau — API Endpoints v1.1 REVISED DRAFT

> **定向修订 R1 — Proposed / Pending Approval（2026-10-31）**
> 本稿只处理 ISSUE 1–4（独立审核 IR-01–04），含为闭合这四项所必需的关联规则。未重新开展完整评审，未修复或重新判定 IR-05–15。原草案、原规范、原报告保持不变。本稿对应条款优先于旧 DRAFT，未变条款沿用旧提案状态；绝无已获四人批准之意。配套文件使用同名 REVISED 版，验收示例统一见 Review_Issues_Resolution.md。


**Proposed / Pending Approval — 2026-10-31**。本文是完整 HTTP 边界提案，不是已部署 API，不修改原始 v1。四人批准后由 A 统一合入。业务类型的字段全集与语义见同目录 `SHARED_CONTRACT_v1.1_REVISED_DRAFT.md`；HTTP 不等于 C 纯函数输入。

## 1. Transport、DTO 与错误

所有路径均加 `/api/v1`，JSON UTF-8。成功统一 `{data:T}`，下表“返回”是 T。失败统一 `{error:{code:string,message:string,details:object|null}}`；details 必须存在，无补充时 null；字段错误时 `{fields:[{path:string,reason:string}]}`，不返回 SQL/堆栈/私密对象。

List<T>＝`{items:T[],total:number}`；当前约30个POI/单人本地demo，本稿选**全量小列表+total，不分页**，不接受未定义的page/limit。以后引入分页走合同变更。POI 默认 name 后 id 排序；Trip/Itinerary/Expense 按创建顺序后id；Plaza publishedAt 降序后id；targets 按首次Add顺序；companions按创建顺序。仅标出的查询参数有效。

所有请求中的 ID 为 UUID，日期/时刻/货币/枚举按 Shared 草案校验。body 中未声明字段拒绝422；malformed JSON/错误UUID或查询格式返回400；合法格式但业务无效422；资源不存在404；状态竞争/版本冲突409。非本版本实现的可选路由返回501 FEATURE_NOT_ENABLED；该路由未启用不作为已完成功能展示。

| HTTP | error.code | 触发与状态保证 |
| --- | --- | --- |
| 400 | BAD_REQUEST | JSON/UUID/查询解析错误，不写入 |
| 404 | NOT_FOUND | Trip/POI/Itinerary/Post/Companion/Expense 不存在；资源ID存在但不属于路径trip也按404 |
| 409 | VERSION_CONFLICT | expectedVersion与当前版本不符；details={expectedVersion,actualVersion}；原数据不变 |
| 409 | SOURCE_CHANGED | 生成后的编辑/保存检查发现源Trip/targets/POI/FX变化；保留旧副本并提示重新Generate；伪造/不符回放结果另用422 |
| 409 | DUPLICATE_TARGET | 重复Add，返回details={tripId,poiId}；不重复插入 |
| 409 | DATA_INTEGRITY_ERROR | targets引用缺失POI、保存数据完整性错误；不静默丢目标 |
| 409 | PREVIEW_EXPIRED | token过期或重启丢失；须重新预览 |
| 422 | VALIDATION_ERROR | 日期/窗口/澳门起点/金额/参与者/命令/确认字段不合法；不写入 |
| 422 | INVALID_PREVIEW | token内容或归属不符；不发布 |
| 422 | NO_TARGETS | 空targets生成；保留配置 |
| 422 | OPTION_NOT_ENABLED | 如未启用relaxed却提交relaxed |
| 500 | INTERNAL_ERROR | 事务回滚，用户可重试；日志不泄漏公开隐私 |
| 503 | STORAGE_UNAVAILABLE | 数据库不可用；写入回滚，health可返回此错误 |

已知闭馆、预算超额、时间冲突、未知信息等规划业务结果返回200并在 PlanResult.status/warnings/unscheduled 表达，不把“不可行候选”当500；未知FX不伪造0。不允许用户提交 companions/expenses 到generate。无 auth，服务仅面向批准的local demo，不设置虚假userId。

## 2. A — Health、Origins、Trip 与 Companion

TripFields＝Shared中 TripConfig 除id以外的全部字段。CreateTripRequest＝TripFields，其中pace可省略默认standard，其余字段必须显式存在，未知预算用null，空偏好用[]。PatchTripRequest＝TripFields的非空部分对象；origin/dayWindows等复合值整块替换，不逐索引merge；id永远不可改。

| Method/Path | Owner | 查询/请求体 | 返回 / 状态 |
| --- | --- | --- | --- |
| GET `/health` | A | 无body/query | `{status:'ok',database:'ok'}` /200；DB不可用503 |
| GET `/origins` | A | 无 | List<OriginOption> /200；含批准的澳门入口坐标 |
| GET `/trips` | A | 无 | List<TripConfig> /200 |
| POST `/trips` | A | CreateTripRequest | TripConfig /201，id由服务端创建 |
| GET `/trips/:tripId` | A | 无 | TripConfig /200 |
| PATCH `/trips/:tripId` | A | PatchTripRequest | 更新后的完整TripConfig /200；完整对象重新校验，不合法422 |
| GET `/trips/:tripId/companions` | A | 无 | List<Companion> /200 |
| POST `/trips/:tripId/companions` | A | `{name:string}` | Companion /201 |
| PATCH `/trips/:tripId/companions/:companionId` | A | `{name:string}` | Companion /200；**新增路径，CR-12，待批准** |

Trip PATCH只改当前Trip，不修改已保存Snapshot或历史Itinerary；本地demo的Trip更新按串行请求处理，同字段后接受值覆盖，不承诺Trip optimistic version。D 的SavedItinerary版本机制独立。A不把Companion嵌入TripConfig；rename不改变任何C输入。Companion删除和Trip删除不在本版新增，原需求中的“删除Trip不删收藏”作为未来删除功能仍需遵守的关系约束。

## 3. B — POI、Targets、Favorites

| Method/Path | 请求 | 返回 / 状态 |
| --- | --- | --- |
| GET `/pois` | 可选query `search:string`（trim，空=无过滤）、`category:Category`（省略=全部）、`favoriteOnly:true|false`（默认false） | List<POI> /200；过滤组合为AND；无结果items=[]、total=0 |
| GET `/pois/:poiId` | 无body | POI /200；不存在404 |
| GET `/trips/:tripId/targets` | 无body | TargetsView /200，空poiIds=[] |
| POST `/trips/:tripId/targets` | `{poiId:UUID}` | 新的TargetsView /201；重复409 DUPLICATE_TARGET |
| DELETE `/trips/:tripId/targets/:poiId` | 无body | 新的TargetsView /200；已无关系或POI资料已缺失也200；只在Trip不存在时404（R1 ISSUE 4） |
| GET `/favorites/:poiId` | 无body | FavoriteState＝`{poiId:UUID,favorited:boolean}` /200 |
| PUT `/favorites/:poiId` | `{}` | FavoriteState（favorited=true）/200；重复也200 |
| DELETE `/favorites/:poiId` | 无body | FavoriteState（favorited=false）/200；重复也200 |

Keyword search对name/address/tags做大小写不敏感子串匹配；不把用户输入解释为正则。未知category或非法favoriteOnly返回400。Favorite作用于唯一演示工作区，与Trip无关；Favorites页用 `GET /pois?favoriteOnly=true` 恢复列表，不逐点扫30次状态，不另加收藏列表URL。Favorite不触发Add，移除target不删Favorite，Plaza单点收藏走同一PUT。

B提供后端只读服务：读取目标ID、按ID解析POI（不定义新公共HTTP endpoint）。C adapter读取完整TargetsView，对全部ID解析；Favorites不参与。activeTrip由B共享前端state维护，Trip创建成功后设id，刷新时用GET trip验证，失效清空并禁用Add；A/C/D页面不得各存一份独立activeTrip。展示state约定不需要公共API新增字段。

## 4. C — Generate 与后端函数

`POST /trips/:tripId/generate`（Owner C）保留URL，增加两个互斥请求分支（Proposed / Pending Approval）：

| 请求DTO | 成功data/副作用 |
| --- | --- |
| GenerateRequest：`{action?:'generate',defaultTravelMode?:TravelMode}`；action省略等同generate，mode省略walk | CandidatePlan=`{input,result,commands:[]}` /200；只生成候选，不写Saved |
| DraftEditRequest：`{action:'editDraft',candidate:CandidatePlan,command:EditCommand}` | 返回新CandidatePlan /200；commands为已有命令+新命令，result由C重放；不创建/更新Saved，不需要expectedVersion |

新候选类型的input/result按Shared定义，commands:EditCommand[]必须存在。action=editDraft时不允许混入defaultTravelMode/expectedVersion；输入起点/POI/FX仍只允许来自批准源，不接收任意伪造资料。C先检验path/input/result.tripId和源快照一致，按旧commands重放核验candidate.result，再应用新命令；来源改变409 SOURCE_CHANGED，引用/命令/结果不符422。D单草稿串行请求，失败不替换当前副本。

命令重放仍只调用C的两个既有纯函数，维护override属于命令状态折叠；不保存commands审计表或引入服务器draft session。A维护类型/注册，D拥有编辑UI，C维护该路由计算适配器，B的Targets不被该分支修改。

例（只示意信封与字段引用，不是可运行mock数据）：`{data:{input:<PlannerInput>,result:<PlanResult>,commands:[]}}`。完整对象按Shared字段表展开，不能把POI ID[]塞进selectedPois。不存在Trip404、无targets422 NO_TARGETS、悬空POI409、非法配置422；合法但不可行返回200 result.status=infeasible。

后端依赖顺序：A只读Trip → B只读Targets/POIs → A批准静态FX源 → C.generatePlan。读取应为一致性快照；不得把companions、Expense或Favorite加载后透传。FX是内部数据来源，不为函数调用另造HTTP汇率接口。

纯函数维持：

- `generatePlan(input:PlannerInput):PlanResult`。
- `revalidateAndRecalculate(input:RecalculationInput):PlanResult`。

第二函数由D后端用于Saved编辑，也由C自己的editDraft适配器用于候选回放；**不新增 `/recalculate` 路由**。HTTP expectedVersion仍只由D用于Saved，不加入C函数。RecalculationInput新增timeOverrides等精确字段以Shared为准。

## 5. D — Save、Overwrite、Reopen、Edit

### 5.1 路由

| Method/Path | 请求 | 返回 / 状态 |
| --- | --- | --- |
| POST `/trips/:tripId/itineraries` | SaveItineraryRequest（下述两分支） | SavedItinerary；create=201，overwrite=200 |
| GET `/trips/:tripId/itineraries` | 无query/body | List<SavedItinerary> /200；本地规模先返回完整快照，未来摘要DTO另提变更 |
| GET `/itineraries/:itineraryId` | 无body | SavedItinerary /200；损坏的已存对象409 DATA_INTEGRITY_ERROR，不伪装为空行程 |
| POST `/itineraries/:itineraryId/edits` | `{expectedVersion:number,command:EditCommand}` | 原id、version+1的完整SavedItinerary /200 |

create body＝`{mode:'create',candidate:CandidatePlan}`。overwrite body＝`{mode:'overwrite',itineraryId:UUID,expectedVersion:number,confirmed:true,candidate:CandidatePlan}`。不得同时混用两个分支字段。覆盖的Itinerary必须属于路径Trip，不符404；expectedVersion缺失/confirmed不为true返回422，版本不符409。新建version=1，覆盖+1，覆盖是同ID整体更新input/result/重放所得overrides，不再创建另一条同ID记录；create也保留草稿commands重放的锁定，不能一律写空overrides。

保存不得盲信客户端candidate：D验证引用一致，按Shared规则检查源数据、调用C.generatePlan后按candidate.commands逐条重放重算并核对结果/最终overrides，在一致性读取/事务边界保证源未变化。来源改变返回409 SOURCE_CHANGED，伪造/命令或重放结果不符422 VALIDATION_ERROR；版本条件写入失败409 VERSION_CONFLICT；DB失败回滚。用户可保存needs_review/infeasible以保留选择，UI必须显示状态而非假称可行。

### 5.2 编辑与确认

**R1 — Proposed / Pending Approval。** 未保存候选通过§4的editDraft分支先编辑，再由用户Save；不得强迫先创建Saved。候选无数据库version和updatedAt，不出现在保存列表；关闭未保存内容前D提示可能丢失，不承诺刷新恢复。

已保存行程仍使用 `POST /itineraries/:itineraryId/edits`，请求保持 `{expectedVersion:number,command:EditCommand}`，响应完整SavedItinerary/200。D编辑对话框仅在“应用并保存”时发mutation；C从Saved.input快照、当前result、原overrides重算，D在同一原子提交中保存result/新overrides并version+1。取消或HTTP失败不改DB；版本冲突409也不能覆盖本地已保存旧副本。两次同version请求仅一成功。timeOverrides只接受合法同日非空15min start<end，引用无效422。

**ISSUE 1/3 响应语义：** HTTP200不代表feasible。锁定10:30–11:00而arrive=10:45时，保持要求值、返回OVERLAP/error与infeasible；未知交通时arrival及依赖自动时刻为null，锁定要求保留，UNKNOWN_TRAVEL/warning，单纯未知为needs_review；已知越窗/越日为DAY_END/error与infeasible。越日字段null，不回卷到当天00:45；message说明次日时间。字段语义、最早离开传播和混合状态优先级以Shared R1-1/R1-3为准。D显示“要求/最早可达/待确定/冲突”，不以旧时刻填null。双方都不得静默删点。

**ISSUE 4 操作边界：** removeStop确认后只改当前候选或Saved.result：移至unscheduled，reason=USER_REMOVED、code=UNSCHEDULED，清理该锁定。input.selectedPois及B targets/Favorite/Expense不变。下一条新leg继承目标站原入站mode，重新估计端点，不继承旧duration；未知按R1-3。setVisitTime/removeStop只允许引用仍在当前days.stops的stop；重复命令未通过当前引用校验则422。

从Trip中移除目标必须由B的DELETE target完成；不会回写已保存/未保存快照。恢复USER_REMOVED的最小流程是用户确认重新Generate当前targets，再另存或确认覆盖；若target已被B移除，先用POST target加回（资料缺失不能Add），再Generate。重新生成清空新候选commands与锁定，D在执行前提示，取消不丢旧草稿。Saved重新生成不写旧DB，overwrite才检查其expectedVersion。恢复意味着重新考虑目标，不保证它会进入可行安排。草稿自己重新生成不需DB版本；已有Saved版本检查仅在真正写回时执行。

本版不新增replaceStop命令。用户选新POI可走B Add、重新Generate、D确认覆盖；属于用户可见的多步操作，不假装是原子替换单站。若要求一键单站替换，需四人明确范围、ID/targets语义并新增合同，不在本次最小提案中偷加。

## 6. D → B — Plaza Preview / Confirm

仅使用已有 `POST /itineraries/:itineraryId/publish`。该功能为M，可在H骨架批准时明确延期；选做后必须满足以下完整协议。

| action/body | data/状态 | 允许副作用 |
| --- | --- | --- |
| `{action:'preview',expectedVersion:number,title:string}` | PublishPreview /200 | 仅生成10分钟临时token；无plazaPosts写入、不改Saved.version/updatedAt |
| `{action:'confirm',expectedVersion:number,previewToken:string,confirmed:true}` | PublishedPostPublic /201；同token重复确认返回原帖/200 | token绑定的同版本确切白名单内容在事务内一次发布 |

preview.title为独立公开标题，不自动读A私人Trip标题，1–120字；D组装title和days/poiIds，响应私有PublishPreview包含token、版本和content。用户看到内容后才能点确认；更改标题或日程必须重新预览。confirm不允许发送任意content/TripConfig，也不允许客户端更改白名单字段。token无效422 INVALID_PREVIEW、过期409 PREVIEW_EXPIRED、保存版本变化409 VERSION_CONFLICT；未知资源404。幂等确认重放已发布token只返回原帖，不再次发布，即便源日程后来编辑也不复制新内容。

发布public JSON仅含id/title/publishedAt/days；token、itineraryId、expectedVersion等私有协议元数据不写入public post。确认时分配id/publishedAt。D独占发布存储写入；B只读，接口：

| Method/Path | 请求 | 返回 |
| --- | --- | --- |
| GET `/plaza/posts` | 无body/query | List<PublishedPostPublic> /200 |
| GET `/plaza/posts/:postId` | 无body | PublishedPostPublic /200；缺失404 |

B从公开POI读取坐标和详情；不存在POI时显示“地点资料不可用”，保持公开顺序，不访问私人Saved输入。地图用D的只读组件，B提供public poiIds/公开POI，不重复实现Map。无whole-trip import endpoint。

## 7. A — Optional Expense / Settlement

仅在团队明确选做REQ-1.13后启用；不是Planner前置条件。类型字段见Shared §6。

| Method/Path | 请求 | 返回 |
| --- | --- | --- |
| GET `/trips/:tripId/expenses` | 无body/query | List<Expense> /200 |
| POST `/trips/:tripId/expenses` | `{place:string,poiId:UUID|null,payerId:UUID,participantIds:UUID[],original:Money}` | Expense /201；服务端取当时批准FX留存，createdAt/id由服务端产生 |
| DELETE `/trips/:tripId/expenses/:expenseId` | 无body | `{expenseId:UUID,deleted:true}` /200；不存在404；**新增可选路径，CR-15** |
| GET `/trips/:tripId/settlement` | 无body | Settlement /200；缺FX返回status=unavailable及unresolvedExpenseIds，不返回假的完整transfers |

amount>0、参与者非空去重、币种有效；payer/participants必须同Trip，否则422；Trip本身不存在404。poiId非null时必须为已知POI，否则422。不得由客户端上传fxToCny/createdAt或结算结果。原币记录可以在缺FX时保存，但UI明确未结算；原账单汇率不随全局FX改变。更新费用不在本版新增，后续需要时单独提案，不让D改账单；日程删除不级联删费用。

## 8. 相对于v1的精确变更与测试

- v1所有路径保留，method保留；新增H companion PATCH、可选M expense DELETE；新增GET pois的favoriteOnly筛选，不新增favorites列表、FX、重算、overwrite或preview URL。
- Generate成功data由PlanResult变为CandidatePlan；R1再增加commands、结果时刻nullable及现有generate路径的editDraft分支；Saved版本语义不变，保存必须回放草稿编辑；targets删除允许清理悬空引用。保存/编辑/发布补discriminated body与完整响应；列表统一List；details统一必需nullable。属于合同修订，不能让老消费者静默接受；Shared增加的字段须同批更新fixture/mocks。
- API变更须A维护、四人批准，B/C/D分别review其消费者。候选来源校验与DB事务由D实现、A配合schema；算法始终由C维护。
- 待开发后的最低测试：Trip日期422无落库；targets/Favorite独立与重复Add；HTTP参数不等于PlannerInput；source变化拒绝保存；创建/覆盖分支；两并发expectedVersion仅一成功；连续编辑保持锁定；取消无mutation；读取旧snapshot；preview无公开写入；token过期/版本变化/重复确认；public JSON敏感字段递归负例；可选费用缺FX/分币守恒。

本文描述期望行为，未运行这些测试；不构成READY或API已实现证据。

R1仅处理四项审核问题，其他原草案非阻塞问题仍待处理；不得据新增空值或回放分支宣称全部接口已经通过测试。配套验收见Review_Issues_Resolution.md，批准勾选使用Team_Approval_Checklist_REVISED.md。
