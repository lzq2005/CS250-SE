# TripMate Macau — Conflict Resolution Matrix

日期：2026-10-31。状态：**Proposed / Pending Approval**。本文件及同目录三份文件均为评审提案，不替代 v1、不代表 A/B/C/D 或客户批准。仅创建本目录及四份 Markdown，未创建工程、安装依赖或执行 Git 写操作。

## 1. 来源与成员身份

工作区根：`E:\MUST\2609\CS250 软件工程`。以下相对路径均相对于该工作区。

| 来源 | 实际路径与正文确认结果 |
| --- | --- |
| A 报告 | `项目落地/小组成员报告-1/Member_A_Development_Confirmation.md`：正文 Member A — Li Zhiqing / Team Leader；BLOCKED |
| B 报告 | `项目落地/小组成员报告-1/Module_Development_Confirmation_Report.md`：正文 Member B — Xia Youran；BLOCKED，不能由无成员后缀的文件名推断身份 |
| C 报告 | `项目落地/小组成员报告-1/Module_Development_Confirmation_Report_Member_C.md`：正文 C · Jiang Yuancheng，2026-10-31；READY WITH QUESTIONS，但仍要求四人签核后正式编码 |
| D 报告 | `项目落地/小组成员报告-1/Module_Development_Confirmation_Report_Member_D.md`：正文 D — Peng Xin；BLOCKED |
| 原规范 | `项目落地/TripMate_Macau_Codex_Team_Package/` 下 `00_READ_FIRST.md`、`PROJECT_BASELINE.md`、`SHARED_CONTRACT_v1.md`、`API_ENDPOINTS_v1.md`、四份 `Codex_Member_?.md` 均已读取 |
| Playbook | `项目落地/TripMate_Macau_4Member_Codex_Engineering_Playbook.pdf`，19 页；核对需求、架构、合同、成员分工、协作与验收章节；包内同名 PDF 的 SHA-256 相同，非另一版本 |
| Task 1 | `Task 1/D2-Team2-TripMate Macau Proposal.pdf`：重点核对 Chapter 6 ownership/pair arrangement，A Trip/Billing、B discovery、C calculation、D itinerary/map/publishing 一致 |
| Task 2 | 下表四类 URS 已按正文核对，未用 Final/Validated 文件名推定批准 |

未发现适用的 AGENTS.md。原报告提到的附件缺失或查询失败是各自审核环境的结论，不代表本次实际没有找到原件。本次未重新验证远端 GitHub 保护规则，不沿用旧报告中的 404 作为当前配置证据。

## 2. URS 版本差异

| 实际文件 | 核对结果 | 不可推断的结论 |
| --- | --- | --- |
| `Task 2/提交/TripMate_Task2_URS_Template_Rebuilt_v2.docx` | baseline 所称 consulted 版本；内部修订到 4.0，Reviewed By 为 Pending。REQ-1.16 为 M / curated enhancement，未有 Final v5 那样独立 Optional 列；正文 Scope 仍含 optional/phased 语句 | 不能当成已签核最终版；v2 文件名不等于内部 2.0 |
| `Task 2/PartB — URS/TripMate_Task2_URS_Template_Rebuilt_v2.docx` | 与提交目录同名文件二进制哈希不同，但按段落提取的正文完全相同 | 不能仅凭二进制不同认定需求改变 |
| `Task 2/PartB — URS/TripMate_Task2_URS_Final_v5.docx` | REQ-1.13 M、1.16 M、1.17 L 均明确 Optional；有 Project Leader decision 记载；性能验证增加 30-POI、5/10 选点及每约定场景 10 次试验等方法；Reviewed By 仍 Pending，并写 Final v4 approval remains pending | 方法更明确不等于数值性能阈值或团队最终批准已确定 |
| `Task 2/提交/TripMate_Task2_URS_Final_v5_fixed.docx` | 与上述 Final_v5 按段落正文比较，仅四个 Reviewed By 从 Pending 改为 D2-Team2；仍保留 final approval pending 的说明。其 Nearby Food 为 M Optional | 团队署名不是四位成员独立签核记录，不能抹去文中 pending |
| `Task 2/PartB — URS/TripMate_Task2_URS_Teacher_Template_Aligned_Validated(4).docx` | 16 October、中英双语、修订表 Team review pending；保留 17 项、账单 optional、food M/team scope、relaxed L/optional | Validated 文件名不表示后出的最终批准版本 |

建议四人选择一份精确路径及 SHA-256 作为需求引用基线，保留差异记录。本草案仅建议 Bills、Food、Relaxed 可明确延期；Food 是否正式采用 v5 Optional 仍待批准。Task 1 较广的 Bills 承诺与 Task 2 的 Optional 收窄必须留痕。

## 3. 四人职责交叉结论

| Owner | REQ（统一为 REQ-1.x） | 边界结论 |
| --- | --- | --- |
| A | 1.5 H、1.11 H 输入/起点、1.12 M、1.13 M optional；支持 1.14 H | Trip/Companion/Billing；contracts/schema/API 注册与基础 CI；不接管算法/地图 |
| B | 1.1 H、1.2 H、1.3 M、1.4 H、1.16 M（Optional 待版本确认）；1.15 M 浏览 | POI、Favorite、Targets、UI/router；不做第二套地图或发布写入 |
| C | 1.6 H、1.7 H、1.17 L optional；支持 1.8 H | 唯一 generate/revalidate，纯函数；不保存日程、不校验 DB version |
| D | 1.8 H、1.9 H、1.10 H、1.14 H、1.15 M 发布；1.11 H 地图展示 | 编辑/确认/版本/持久化/地图/E2E；不复制算法、不改 B router |

四人没有需要重新分工的直接冲突。C 的 READY WITH QUESTIONS 与其余 BLOCKED 是就绪判断粒度不同，不构成已授权开工。真正重复风险在公共 shell、router、DB、Plaza 共用文件和 D 复制 C 算法；遗漏风险在 DTO、收藏列表恢复、保存输入快照与先前手工编辑保留，而非新增业务模块。

## 4. 统一问题矩阵

P0＝开始统一骨架前必须达成的共同决定；P1＝对应 H 功能编码/集成前必须冻结；P2＝相关 M/L 实施前解决，可显式延期。SC＝Shared Contract 草案，API＝API 草案。所有修改均需四人最终批准；“评审”列列出重点 owner/消费者，不替代四人批准。

| ID/优先级/类别 | 成员与原始定义 | 原因与推荐最小解决方案 | SC / API 是否变更；新增 URL？ | 重点评审；编码/测试影响 |
| --- | --- | --- | --- | --- |
| CR-01 P0 真阻塞 | 全体；00_READ_FIRST 第2条、SC 开头、PDF p14：四人批准才冻结 | 无签核证据；四人逐项决定基线、技术、ownership、demo 边界，空白批准栏保持 Pending | 流程澄清；不加 URL | 四人；批准后才能 bootstrap |
| CR-02 P0 真阻塞 | A/B；baseline consulted v2，B 报告 Final v5 Optional；两仓库 remote | 建议唯一应用仓库用 `MUST-Workspace/D2-team2-project`，个人 `lzq2005/CS250-SE` 仅文档；精确 URS 由团队选择，不能自行认定 v5 获批 | SC 治理说明；API 否 | 四人及管理员；避免四人落在不同仓库/范围 |
| CR-03 P0 ownership | A/B/D；PDF bootstrap router 桩 vs B 独占 router | A 组装 bootstrap，B 提供/审核 shell/router；补公共 client/state/server/DB/error/seed owner，不重新分配功能 | SC 是；API 否 | A/B/D；公共文件串行合入，owner review |
| CR-04 P1 补定义 | A/B/C/D；TripConfig 存在但 trips/generate body 未定义 | Trip 请求与实体分离；生成适配器在后端读取 A 配置、B targets/POIs、A FX，并返回输入快照+结果；不能把 PlannerInput 直接当任意 HTTP body | SC/API 是；不加 URL | A/B/C/D；负例 400/404/422，改 Companion 不变规划输入 |
| CR-05 P1 补定义 | B/C；targets 返回未定，SC `selectedPois:POI[]` | targets 明确返回 `{tripId,poiIds}`；B 内部解析批准 POIs 给 C，稳定去重顺序；全部失败显式报错，不过滤丢失 ID | SC/API 是；不加 URL | B/C，A schema；Favorite-only、重复 Add、悬空 ID |
| CR-06 P1 澄清非算法冲突 | C/D；D 报告 expectedVersion 不在 RecalculationInput | 正常分层：HTTP `{expectedVersion,command}` → D 原子版本检查 → C 纯函数 → D 保存；版本不是算法参数 | SC/API 补外层 DTO；不加 URL | C/D，A；并发同版本仅一个成功，另一个 409 |
| CR-07 P1 语义/非必新增 API | D；D-04 替换/覆盖；URS 1.9 System Input = Delete POI or replace saved plan request | “覆盖保存计划”不等于算法编辑 stop。沿用三种 EditCommand；现有 POST itineraries 区分 create/overwrite 并确认。单 POI 自动替换不推导为必做功能；若团队真要求 replaceStop，另提范围和算法变更 | SC/API 补 Save union；不加 URL、不扩 EditCommand | A/C/D，B 确认 targets 语义；覆盖确认/取消/409、禁止静默替换 |
| CR-08 P1 补行为 | B/C/D；removeStop 与目标完整性 | 删除 stop 只从当前日程移至 unscheduled（用户移除原因），不删 B targets/Favorite；重规划会重新考虑目标，UI 明示；移除 target 是 B 的独立操作 | SC/API 说明；不加 URL | B/C/D；当前集合无丢失、重规划说明、账单不级联删 |
| CR-09 P1 补类型 | A/C/D；SavedItinerary 仅 result，allPois 未定、原人工时间如何保留未定 | D 存 PlannerInput 快照、result 和 timeOverrides；C 重算 allPois 仅取快照选中 POIs，不是全澳门 POI，也无需 HTTP 全量接口；保存与展示都不读可变源配置替代快照 | SC/API 是；不加 URL | A/C/D；源 Trip/POI/FX 变化后仍可重开，连续两次编辑保留先前锁定 |
| CR-10 P1 时间/unknown | 全体；WeeklyWindow.weekday、null、15min、status 未精确定义 | 周一1至周日7；同日不跨午夜，每日一个窗口；手工时刻15min，生成分钟精度；unknown 保守警告、不作0；固定状态判定 | SC 是；API 引用校验；不加 URL | 全体；边界、last-entry、未知时长/小时、澳门点 |
| CR-11 P1 预算依赖 | A/C/D；C预算检查H、A完整 FX UI M | H 先用批准的静态参考 FX/缺失回退；预算币种或默认 MOP 汇总；未知总额 null，known excess 不声称预算满足；不需为后台读取 FX 新增接口 | SC 是，API 行为补充；不加 FX URL | A/C/D；混币/缺FX/已知超预算、无FX核心仍可用 |
| CR-12 P1 补定义 | A/B；无 Companion DTO，A 验收改名；B Favorites 页面无列表恢复协议 | 最小新增 companion PATCH；收藏页用 GET pois 的 `favoriteOnly=true` 筛选和同一列表 DTO，无须额外 GET favorites。Companion 删除不在本版擅自扩充 | SC/API 是；仅新增 companion PATCH 路径 | A/B；重命名不变 Planner、刷新恢复收藏、跨Trip引用拒绝 |
| CR-13 P1 数据/实现内解决 | B/C/D；POI 来源、Match、地图坐标、PlannedStop UUID | 保留 v1 主模型，加可空 bookingNote；C 确定性 stop UUID；B 提供来源数据；D 从保存快照读坐标，公开地图仅用公开 POI。Match/附近距离示例可在模块内定义并 review，无需专属 endpoint | SC 最小补字段；API 只沿用 POI；不新增地图/Match URL | B/C/D，A 类型；UUID稳定、未知说明、地图失败回退 |
| CR-14 P2 Plaza 协议缺口 | B/D；单 POST publish、D-07 要求 preview→confirm | 同一路径 `action:preview` 生成服务端白名单及短期 token；`action:confirm` 校验 token/version/title 后才公开。title 用独立公开标题，不自动复制私人 Trip title。字段白名单保持原样 | SC/API 是；不加 preview URL | B/D，A schema；preview 无公开写入、取消无状态变化、过期/版本变化拒绝、隐私负例 |
| CR-15 P2 可选费用 | A/D；无 Expense/Settlement DTO、Task1 费用删除验收 | 补独立 DTO、保留账单FX、确定性分币；按原有 Expense API 加 DELETE 满足原评估，M未选择就延期整个费用模块；不传 C、不发布 | SC/API 是；可选 Expense DELETE 路径 | A/D；三币、子集、多payer、缺FX、守恒、删除不影响行程 |
| CR-16 P2 可选/不必改API | B/C；Food M vs M Optional，Relaxed L | 保留 M/L，是否交付由基线决定；standard 默认，未启用 relaxed 显式422；不提前设计 stopCap 字段或专用接口 | SC 行为，API 422；无新 URL | 四人；范围批准与未实现选项禁用 |
| CR-17 P0流程/P1检查 | 全体；PDF peer review/CI/唯一owner、报告未能验证保护 | 小Issue分支、至少一同伴、owner+consumer review、CI全绿；本地 remote 已核对，远端保护由管理员给证据，不因旧404断言不存在 | SC 治理；API 否 | 四人/管理员；CI配置骨架内落地，不能要求骨架创建前已有应用测试通过 |

## 5. 对 D 的三个重点判断

1. **EditCommand**：现有三种命令能覆盖时间、交通、删除 H 场景；没有证据要求把 saved-plan overwrite 塞进算法命令。`expectedVersion` 不属于 C 纯函数是合理设计。需要补外层请求和状态语义，不必新增重算 HTTP API。
2. **Overwrite**：需求真实存在，不能只靠 UI 对话框宣称完成；需要明确确认、旧版本检查和原子写入。但可在现有 `POST /trips/:tripId/itineraries` 增加 overwrite 分支，不必新增 PUT/overwrite URL。取消不发请求，后台拒绝没有 confirmed 的覆盖。
3. **Plaza Preview**：缺的是双阶段协议，不是 URL 数量；保留 publish 路径，以 action 区分 preview/confirm。该功能为 M，其细节可以在 H 开工时显式延期，不能独自阻塞所有骨架；若本次批准整份 v1.1，按草案预先明确即可。

## 6. 最小变更边界与就绪结论

本提案只建议两类额外路径：H 同行人改名 PATCH；若选做费用则 M Expense DELETE。其余沿用全部 v1 URL，只补参数、返回和行为。新增 DTO/响应包装可能破坏未经统一的 mock，四人必须一起更新；“不新增 URL”不等于“不修改公共契约”。

本次输出：同目录 Conflict Matrix、Shared Contract draft、API draft、Approval Checklist。源规范/报告保持原样。**当前仍为 BLOCKED / Pending Approval**：已有可审查方案，但未有四人选择基线、唯一仓库和批准草案的证据。完成清单的 Bootstrap Gate 后可申请进入骨架阶段；后续各功能 Gate 不应被误当成全部骨架前置条件。
