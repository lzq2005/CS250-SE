# TripMate Macau — Engineering Documentation

本目录归档开发准备、四人确认、接口冲突分析、技术复审及定向修订。**当前为 Proposed / Pending Approval；尚未冻结统一接口，尚未完成正式 Implementation，也没有已运行并通过的软件测试证据。**

## Current Review Package

以下是当前建议交给 B/C/D 审核的修订材料，属于待批准方案：

- [Shared Contract v1.1 REVISED DRAFT](contract-review/SHARED_CONTRACT_v1.1_REVISED_DRAFT.md)
- [API v1.1 REVISED DRAFT](contract-review/API_ENDPOINTS_v1.1_REVISED_DRAFT.md)
- [Revised Team Approval Checklist](contract-review/Team_Approval_Checklist_REVISED.md)
- [Review Issues Resolution / 15 planned acceptance examples](contract-review/Review_Issues_Resolution.md)

原独立技术审核的 FAIL 结论针对旧 DRAFT。后续修订提出了四项解决建议，不等于审核已改判 PASS 或四人已经批准。仍需收集 B/C/D 及 A 对同一修订的明确结论。

## Four-Member Review Reports

| 原作者/责任成员 | 原报告 | 历史结论 |
| --- | --- | --- |
| Member A — Li Zhiqing / Team Leader | [Member A report](member-reviews/Member_A_Development_Confirmation.md) | BLOCKED |
| Member B — Xia Youran | [Member B report](member-reviews/Module_Development_Confirmation_Report.md) | BLOCKED |
| Member C — Jiang Yuancheng | [Member C report](member-reviews/Module_Development_Confirmation_Report_Member_C.md) | READY WITH QUESTIONS；仍要求批准 |
| Member D — Peng Xin | [Member D report](member-reviews/Module_Development_Confirmation_Report_Member_D.md) | BLOCKED |

上述身份按报告正文确认，未因 B 文件名没有成员后缀而误判。文件逐字节保留；本次由 A 协调整理归档，不把 B/C/D 报告或全队工作归为 A 独自完成。技术协调文件由 A 侧与 Codex 协作形成，不代表其他成员已接受方案。

## Baseline and Personal Work Orders

- [Read First](baseline/00_READ_FIRST.md)
- [Project Baseline v1](baseline/PROJECT_BASELINE.md)
- [Shared Contract v1](baseline/SHARED_CONTRACT_v1.md)
- [API Endpoints v1](baseline/API_ENDPOINTS_v1.md)
- Work orders: [A](baseline/Codex_Member_A.md), [B](baseline/Codex_Member_B.md), [C](baseline/Codex_Member_C.md), [D](baseline/Codex_Member_D.md)
- [Engineering Playbook PDF](baseline/TripMate_Macau_4Member_Codex_Engineering_Playbook.pdf)

目录调整只用于文档导航，没有创建 apps/web、apps/api、packages/contracts 等工程。原文中的 docs/...、Windows路径及当时状态属于历史上下文，未改写成当前实现事实。

## Review History

1. 四人分别完成开发前确认；历史结论见各自报告。
2. [Conflict Resolution Matrix](contract-review/Conflict_Resolution_Matrix.md)：整理职责、接口及基线差异。
3. v1.1初稿：[Shared](contract-review/SHARED_CONTRACT_v1.1_DRAFT.md)、[API](contract-review/API_ENDPOINTS_v1.1_DRAFT.md)、[Checklist](contract-review/Team_Approval_Checklist.md)。
4. [Independent Technical Review](contract-review/Contract_v1.1_Independent_Technical_Review.md)：旧稿 FAIL；1项BLOCKER及3项HIGH等问题。
5. 当前REVISED草案提出Arrival/锁定冲突、候选编辑保存、未知/越日时间、Stop/Target删除恢复的定向方案；其余审核事项没有自动关闭。

## Progress and Traceability

- [Development Progress — 2026-10-31](progress/Development_Progress_2026-10-31.md)
- [Source Manifest and exclusions](SOURCE_MANIFEST.md)：原文件路径、归属、SHA-256、未收录资料及原因。

Task 1 / Task 2 的仓库归档记录与批准状态在进度报告中分别记录；文件名 Final、团队署名和归档提交不等于客户签核。没有单元、集成、系统或E2E测试已通过的声明。

## Publication Status

本轮已完成本地整理；团队remote、分支main与旧提交在本地可识别，但当前无法连接远端或确认写权限。**尚未commit、push或创建PR**。网络/权限恢复后应先获取最新main并检查是否出现正式目录或同名不同内容，再建立 `docs/development-readiness-20261031` 文档分支。不得直接推main或force push。
