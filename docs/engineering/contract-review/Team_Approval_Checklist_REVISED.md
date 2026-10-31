# TripMate Macau — Team Approval Checklist REVISED

> **定向修订 R1 — Proposed / Pending Approval（2026-10-31）**
> 本稿只处理 ISSUE 1–4（独立审核 IR-01–04），含为闭合这四项所必需的关联规则。未重新开展完整评审，未修复或重新判定 IR-05–15。原草案、原规范、原报告保持不变。本稿对应条款优先于旧 DRAFT，未变条款沿用旧提案状态；绝无已获四人批准之意。配套文件使用同名 REVISED 版，验收示例统一见 Review_Issues_Resolution.md。


**Proposed / Pending Approval — 2026-10-31**。未替任何成员打勾；A 的协调身份不等于 B/C/D 批准。所有签核应引用这次评审四份文件的同一修订和SHA-256，不能只回复“看过了”。本稿不请求系统权限，也未发送团队消息。

## 1. 待评审文件与批准记录

本目录：`E:\MUST\2609\CS250 软件工程\项目落地\contract-review`。

- [ ] Conflict_Resolution_Matrix.md：确认CR-01–CR-17分类、范围和优先级。
- [ ] SHARED_CONTRACT_v1.1_REVISED_DRAFT.md：确认类型、模型、算法/HTTP边界和ownership。
- [ ] API_ENDPOINTS_v1.1_REVISED_DRAFT.md：确认所有请求/响应、状态码和路径变更。
- [ ] Team_Approval_Checklist_REVISED.md与Review_Issues_Resolution.md：确认四项R1规则与验收；旧Conflict Matrix及独立Review只作历史依据，本稿不关闭其余IR。

| 成员 | 重点评审 | 结论 | 记录日期/版本/文件SHA-256/证据链接 |
| --- | --- | --- | --- |
| A Li Zhiqing | 基线、Trip/Companion/Billing、schema、错误、仓库/CI | **Pending** | 待本人填写 |
| B Xia Youran | targets→POIs、Favorite、UI/router、public读取、Food范围 | **Pending** | 待本人填写 |
| C Jiang Yuancheng | generate/revalidate、timeOverrides、unknown、预算、稳定ID | **Pending** | 待本人填写 |
| D Peng Xin | 保存/覆盖/编辑版本、preview/confirm、地图快照、E2E | **Pending** | 待本人填写 |

允许结论为Approve / Request Changes / Approve with explicit deferrals；附条件批准必须写清批准范围，不能据此宣称整套功能已批准。草案修改后重新确认受影响部分和同一文件版本。

## 2. Bootstrap Gate：开始统一骨架前

- [ ] 四人选定需求引用文件的**实际完整路径、内部版本、SHA-256**；推荐从已核对Rebuilt_v2与Final_v5系列中讨论选择，而非按文件名自动选择。
- [ ] 记录Task1 Bills承诺与Task2 Optional收窄；明确Food是否采用v5的M Optional，Relaxed继续L Optional；未选功能明确延期而不是悄悄删除。
- [ ] 接受建议唯一应用remote `https://github.com/MUST-Workspace/D2-team2-project` 及本地 `E:\MUST\2609\CS250 软件工程\D2-team2-project`，或明确写出替代选择；个人CS250-SE文档改动不覆盖。
- [ ] 四人批准既有技术栈、单用户local/no-auth范围、核心DTO方向与Shared v1.1；精确依赖版本可由bootstrap PR提出，合并前锁定，不在未建骨架时谎称运行验证通过。
- [ ] 确认HTTP外层expectedVersion归D、C纯函数无DB；保留三种EditCommand，saved-plan overwrite走保存分支；单站替换不作为本提案新增必交功能。
- [ ] 确认CandidatePlan新增commands、结果时间nullable、generate路径editDraft分支及保存回放；snapshot/timeOverrides和Saved版本保持边界，四人消费者/mocks统一；不得误读为已批准。
- [ ] 确认A组装骨架、B提供/审核router/shell、D审核CI/E2E环境；公共文件清单按Shared §7，schema/app.ts只有A合入。
- [ ] 同意Git流程：bootstrap/contract-v1先四人review，后续feat/a|b|c|d/<issue-key>小分支；至少一名同伴review，owner/consumer review及lint/typecheck/test/build门槛；A自己的PR也需另一成员。
- [ ] 仓库管理员确认四人权限、main保护与计划中的required checks/owner审批落实方式；远端证据尚待提供，本次本地remote检查不能证明远端保护已启用。
- [ ] 明确后续实施授权；本次指令仅允许四份文档，不因签核模板已生成而自动开始编码。

**退出条件**：上述范围与共同设计有四人明确结论；若M/L条款延期，写明不影响H骨架。通过后可以由A搭统一骨架并在PR中验证版本、启动、DB/health与CI；不是要求尚未创建的应用先通过全套功能测试。未通过则维持BLOCKED，不擅自把draft改成frozen。

## 3. H Implementation Gate：对应功能编码前逐项冻结

| 事项 | 必须确认 | 重点成员 | 未来测试证据 |
| --- | --- | --- | --- |
| Trip/Companion | Create/Patch形状、日期窗口、澳门起点、同名ID、rename PATCH | A，B/C/D消费者 | 422无落库、保存读回、仅rename Planner不变 |
| Favorite/Targets | target ID顺序/去重、解析快照、收藏页favoriteOnly、无activeTrip禁Add | B/C，A schema | Favorite-only不入Planner、重复Add409、清除筛选、刷新收藏恢复 |
| Generate / Draft Edit | 初始生成action/mode，候选editDraft为独立分支；服务端聚合与命令回放、稳定UUID、目标不丢 | C，A/B/D | IT-01–03，确定性与无目标422 |
| Time/unknown | weekday1–7、同日窗口、lastEntry=null不保证无限制、15min编辑、unknown/status | 全体 | 闭馆、last entry、缺时长、未知交通、远距离与日终 |
| Budget | budget币种/默认MOP、门票+交通、缺FX与部分未知、H静态源不依赖M UI | A/C，D显示 | 缺FX总额null/UNKNOWN_FX；已知超预算不称可行 |
| Save/Reopen | snapshot字段、候选来源校验、多itinerary、create/overwrite、来源变更409 | D，A/C | IT-05；源Trip/POI/FX修改后旧数据仍恢复 |
| Recalculation | allPois只用snapshot、timeOverrides锁定、unknown不作0、移除stop到unscheduled不删target | C/D，B | IT-04；连续编辑保留人工时刻、地图和warning同步 |
| Version/confirm | D条件写入原子化，覆盖confirm，取消不请求，失败回滚 | D/A，C支持 | 同expectedVersion并发一成一409；version/updatedAt cancel不变 |
| Origin/Map | 每日origin首段、入口/地标、保存地图用snapshot、外部导航与失败文字顺序 | A/D，B POI | TC-10/11；地图不可用仍可读 |

所有测试均为后续验收计划，本次未编写或执行功能测试。

## 4. M/L 功能Gate：允许显式延期

- [ ] Plaza（M）：B/D确认同一publish URL的preview/confirm DTO、独立公开标题、服务端白名单、10分钟token、版本绑定、幂等与取消无公开写入；A确认存储。确认publishedAt/id在最终发布时产生，预览不虚构它们。
- [ ] B/D确认public地图只用公开POI与顺序，不能访问私有input；无整旅程复制。IT-06和递归隐私字段负例必须通过后才展示分享完成。
- [ ] Bills（M Optional）：A/D确认payer/participants、原币/保留FX、缺FX不可结算、CNY余分和净转账守恒、可选Expense DELETE；与Planner和public域隔离。
- [ ] FX UI/Match（M）：确认来源日期/静态说明、Match排序解释/无偏好示例；不把Match叫可行性，不新增无必要endpoint。
- [ ] Nearby Food（M，Optional状态待基线决定）：只用现有curated food POI、距离示例、手动Add；不自动插入日程。
- [ ] Relaxed（L Optional）：未启用时禁用UI且API返回OPTION_NOT_ENABLED；若启用再批准buffer/cap测试，不假装已实现。
- [ ] 最终URS若采用Final_v5验证方法，记录30 POI、5/10目标、约定场景10次试验、设备/cache/provider条件；数值阈值仍须明确，不把测量方法当保证。

延期记录：

| 功能/条款 | 本期批准或延期 | 责任人/复议时点/对H影响 | 四人确认记录 |
| --- | --- | --- | --- |
| Plaza M | Pending | 待填写 | 未批准 |
| Bills M Optional | Pending | 待填写 | 未批准 |
| Nearby Food M | Pending | 先确认URS版本 | 未批准 |
| Relaxed L Optional | Pending | 待填写 | 未批准 |

## 5. 建议团队会议必须给出的答案

1. 哪份URS及哪个remote是唯一基线？Final_v5_fixed中的团队署名和仍pending的说明如何记录？
2. 是否批准同路径overwrite与preview/confirm，保留现有EditCommand，不新增replaceStop/recalculate/preview URL？
3. 是否接受删除stop保留target、重新Generate会再考虑该点的明确行为？若不接受，必须另定B/D跨模块写入及事务，不让C私自删target。
4. 是否批准CandidatePlan.commands与无持久化的editDraft分支，保留Generate→Edit→Save？Saved的“应用并保存”按钮及版本写回规则是否清楚？
5. 是否批准最小新增companion PATCH与可选expense DELETE、Favorite列表用POI筛选？
6. 哪些M/L明确延期？Plaza延后不应单独挡住H骨架，但不得发布未完成脱敏确认的功能。
7. 谁是仓库管理员/合并执行人？如何提供branch protection、required checks与四人权限的实际证据？

## 6. 当前评审结论

**定向修订可提交评审 / Pending Approval。** 四项均有明确的建议规则与测试案例，但未获得A/B/C/D批准，未运行算法/API测试；原独立审核FAIL属于旧草案，不能在本次自动改判PASS。原Bootstrap Gate仍须满足，本次只进行文档定向修订，不启动骨架。IR-05–15等其余事项未作全面复审，不能标记整体就绪。

## 7. R1 四项专门批准清单（全部未批准）

- [ ] ISSUE 1 / C+D主审、A类型、B消费：同意把arrive≤start等改为feasible条件；诊断保留锁定和真实最早可达，OVERLAP/error/infeasible；同意下游可达下界公式与UI区分要求/估计。确认R1-T01–T03。
- [ ] ISSUE 2 / 四人：同意不要求先Save、CandidatePlan.commands、同generate URL的editDraft分支；命令回放验证但不建立事件存储/草稿表。首次Save保存回放结果和锁定；Saved写回才检查expectedVersion。确认R1-T04–T07。
- [ ] ISSUE 3 / C+D主审、A类型、B POI：同意结果时间LocalTime|null；未知传播不作0，越日不回卷/不自动挪天；UNKNOWN_TRAVEL→needs_review、DAY_END/error→infeasible、error优先。确认R1-T08–T11。
- [ ] ISSUE 4 / B+C+D主审、A关系：同意Stop移除不删target，Target移除不改已有快照，悬空target可用原DELETE清理；新leg mode继承目标站；恢复采用提示后重新Generate，必要时先B Add，不新增restore命令。确认R1-T12–T15。
- [ ] A/B/C/D分别对本次三份REVISED与Resolution记录相同文件SHA-256、Approve/Request Changes及理由；没有答复仍Pending。
- [ ] 团队明确：草稿离开可能丢失、Saved按钮为“应用并保存”、重新生成会清空候选手工编辑。若不接受这些UI/恢复语义，须Request Changes，不得由实现者自行另选行为。
- [ ] 测试用例目前只完成文档定义；开发后记录输入/输出/截图/提交SHA。不得预先打勾为测试通过。

待团队决定而非本次自行定案：①是否接受nullable诊断和可达下界传播；②是否接受stateless editDraft+commands而不新增URL；③是否接受重新Generate作为最小恢复（会清空当前候选手改）；④Saved应用即保存的明确交互；⑤原唯一URS/仓库/范围及剩余非阻塞问题仍沿用原待决项。
