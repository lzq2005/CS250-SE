# TripMate Macau — Development Progress 2026-10-31

资料截止日期：2026-10-31；本次本地整理/核验日期：2026-11-01（Asia/Shanghai）。记录人：Member A — Li Zhiqing，Team Leader；本次为文档整理，不代表单独完成全队成果。状态：**Documentation prepared locally / Contract v1.1 Proposed / Pending Team Approval**。

## 1. Project Overview

CS250 Software Engineering，D2-Team2 / Vibecoding。TripMate Macau 聚焦澳门旅行配置、POI发现与选择、启发式行程生成、时间/交通编辑重算、地图、保存重开及有限Plaza分享。费用结算独立于规划，不涉及真正支付。

本次工作仅归档开发准备和接口协调证据，没有新建项目骨架、编写功能代码、安装开发依赖或冻结接口。历史原型不作为当前统一实现已完成的证据。

## 2. Task 1 / Task 2 Completion Background

工作区存在Task 1 Proposal与多个Task 2 URS及提交目录文件。已核对个人文档仓库本地Git提交 `f3940be6546eb3a15dd487e2ece03ac6bfd30eb9`，消息为“docs: archive anonymized TripMate Macau Task 1 and Task 2”，跟踪了：

- [Task 1 archival copy](https://github.com/lzq2005/CS250-SE/blob/f3940be6546eb3a15dd487e2ece03ac6bfd30eb9/docs/task-1/TripMate_Macau_Project_Proposal.pdf)：33页。
- [Task 2 archival copy](https://github.com/lzq2005/CS250-SE/blob/f3940be6546eb3a15dd487e2ece03ac6bfd30eb9/docs/task-2/TripMate_Macau_Requirements.pdf)：37页，保留多处Pending表述。

这是本地可核对的既有仓库归档记录，远端链接本轮未能在线访问验证；不是本轮向个人仓库上传，也不证明Moodle提交成功或客户最终批准。课程提交原件保留原处，不在本次重复公开上传。

工程baseline曾consult `TripMate_Task2_URS_Template_Rebuilt_v2`。另有 `Final_v5` 和 `Final_v5_fixed`：Nearby Food在v5被明确列为M Optional；fixed版虽将四处Reviewed By改为D2-Team2，仍保留“Final v4 approval remains pending”。因此**唯一正式批准URS未验证**，不能把任一不确定版本重命名为“已批准最终版”。

## 3. Four-Member Responsibilities

| 成员 | 功能主责及REQ |
| --- | --- |
| A Li Zhiqing | Trip/Preferences/Companion；1.5、1.11输入、1.12、1.13；支持1.14；协调contracts/schema/API注册与CI |
| B Xia Youran | POI Search/Details/Match/Favorite/Targets、UI/router、Plaza读；1.1–1.4、1.16、1.15读 |
| C Jiang Yuancheng | Generate/Constraints/Warnings/Reusable Recalculation；1.6、1.7、1.17、支持1.8 |
| D Peng Xin | Itinerary Editor/Map/Save/Version/Publish/E2E；1.8–1.10、1.14、1.15发、1.11展示 |

四人原始报告的作者归属保持不变，详见[文档索引](../README.md)。A负责归档协调，不替代其他owner的功能、测试或批准责任。

## 4. Development Readiness Review

A/B/D历史报告为BLOCKED，C为READY WITH QUESTIONS且同样要求共同签核。资料方向基本一致，但共享契约原先仍为FROZEN DRAFT/PROPOSED，不能据标题视为冻结。

已完成的是四份确认报告及交叉分析，不是web/API/DB已可启动、接口已实现或系统已验收。当前尚缺针对同一最新版的四人审批回执。

## 5. Contract Conflict Identification

统一分析涵盖Trip ID与偏好、Targets ID→完整POI、C规划结果→D、D调用C重算、保存输入快照、版本竞争、Plaza脱敏确认、Favorite/Add独立，以及公共文件owner。主要结论没有要求重分配四人模块。

冲突矩阵把开工门槛、H契约补充与可延期M/L区分，未把所有细节都判成全局Blocker。

## 6. Contract v1.1 Draft and Revision

历史链路完整保留：v1规范→四人报告→冲突矩阵→Shared/API v1.1初稿与Checklist→独立审核→REVISED定向修订与Resolution。

当前建议审核版本为[Shared REVISED](../contract-review/SHARED_CONTRACT_v1.1_REVISED_DRAFT.md)、[API REVISED](../contract-review/API_ENDPOINTS_v1.1_REVISED_DRAFT.md)、[Checklist REVISED](../contract-review/Team_Approval_Checklist_REVISED.md)及[Resolution](../contract-review/Review_Issues_Resolution.md)。均仍为Proposed / Pending Approval，不修改或替换历史草案，不宣称已经取得B/C/D同意。

## 7. Technical Review Findings

独立审核对旧DRAFT结论为FAIL：1项BLOCKER（arrive≤start与保留锁定冲突的互斥规则），3项HIGH（先保存才能编辑改变流程、未知/跨午夜结果不完整、悬空target无法删除恢复）。另有MEDIUM/LOW待处理项。

该FAIL针对旧文本；后来有修订方案不意味着审核员已重新给出PASS。URL少、DTO齐也不能代替业务一致性证明。

## 8. Issues Resolved in Draft

“Resolved in Draft”在此仅表示形成了建议文本，不表示实现或验证完毕：

1. Arrival晚于锁定start时保留要求值，返回OVERLAP/error/infeasible，D区分要求与最早可达，不能静默调锁定。
2. 未保存候选可以先编辑；候选增加commands，原generate路径增加editDraft分支，保存时用C回放核验；Saved写回才检查expectedVersion。
3. 诊断时间允许null；单纯未知needs_review，已知越窗/越日infeasible；不把未知当0、不把次日00:45伪装当天。
4. Stop删除与Target移除分域；明确重新Generate的恢复取舍；悬空target可用原DELETE清理。

Resolution定义了R1-T01–T15共15个计划验收示例。**这些是尚未执行的测试计划；未运行、未通过单元测试、API/集成测试、系统测试或E2E测试。** 本轮文档链接/哈希/内容检查不是软件测试。

## 9. Pending Team Approval

A/B/C/D须对同一修订明确Approve/Request Changes，特别确认nullable诊断、editDraft+commands、Saved“应用并保存”及重新生成会清空手改的恢复方式。没有回执仍为Pending，不能用原确认报告、组长协调或生成清单替代同意。

精确URS、范围/可选项、技术版本、公共文件维护人及PR治理亦未因本次文档归档自动获批。M分期不等于从Core验收删除，Plaza/Match/FX与Bills/Food/Relaxed的不同范围须按选定基线确认。IR-05–15没有整体关闭。

本轮目标remote已匹配 `https://github.com/MUST-Workspace/D2-team2-project`；GitHub连接器当前账号为lzq2005，但团队仓库读取404、权限查询未给有效permission；本地Git ls-remote先网络解析失败、再次检查无法连接github.com:443。**写权限和最新远端main未验证。** 404不证明仓库不存在，也不证明无任何权限。本地main旧HEAD为 `14e3521ac9fb2a1c64fdc5093382dd9c1c93afc7`，不能称为最新远端版本。

因权限/连通性门槛未通过，目前只整理本地工作副本，未创建提交分支、未commit/push/开PR。计划分支为 `docs/development-readiness-20261031`，恢复后先fetch最新main，检查同名/目录变化，再依正常PR流程提交；不直接推main、不force push。

本地文档检查结果：22份原件复制的SHA-256逐一相符；52个Markdown相对链接均存在；常见Token/私钥/API Key、邮箱及学号模式扫描未命中。已执行git status、remote、branch与git diff --check；跟踪文件diff无空白错误。对未跟踪新文件另用git diff --no-index --check检查，发现11处原文件已有的Markdown行末双空格硬换行，分布在A报告、D报告和独立审核报告；逐项确认是原文语义并保留，没有为消除警告改写历史文件。没有修改仓库持久Git配置。正式暂存时还需明确处理core.autocrlf，避免Git自动换行转换破坏原件字节追溯。

## 10. Next Development Milestones

1. B/C/D和A审核最新修订及四项取舍，记录同版本结论；针对新增接口/空值语义再复核。
2. 网络/组织仓库授权恢复后，核实身份和写权限、fetch main，在独立docs分支提交本次文档并创建PR；不自动合并。
3. 完成基线与共同批准后，才冻结统一规范；本次仅归档，不负责冻结。
4. 获准后由A搭统一GitHub工程骨架，B审核shell/router，D配合CI/E2E环境，C审核算法边界；其后四人按功能owner、小Issue/PR并行。
5. 有真实实现后再执行并记录相应单元、API、集成、系统/E2E与失败场景证据；不得提前宣称Implementation完成或测试通过。
