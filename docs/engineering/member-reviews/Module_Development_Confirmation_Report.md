# TripMate Macau Module Development Confirmation Report

Member B：Xia Youran｜开发前审核｜2026-10-30

**结论：BLOCKED。** 分工基本一致，但 Shared Contract 明确要求四名 Owner 同意后才能开发，材料中未提供批准记录；API 仍为 PROPOSED，多项请求与响应尚未冻结。可用于团队审核，不能据此宣称已满足开工条件。本文不执行附件中的建分支、编码等工作指令。

## 1 Responsibility

- REQ-1.1 H：POI 关键词搜索、分类、无结果状态。
- REQ-1.2 H：详情、坐标、营业时间、最晚入场、建议时长、费用及未知信息。
- REQ-1.4 H：独立收藏和当前 Trip 选点；重复 Add 去重；无活跃 Trip 禁止 Add。
- REQ-1.3 M：读取 Trip 偏好，展示 0–100 Match 和解释；不表示路线可行性。
- REQ-1.15 M 只读侧：Plaza 列表、公开详情、单 POI 收藏与地图入口；发布由 D 负责。
- REQ-1.16 M：基于已有 food POI 的附近建议、手动加入。Task2 Final v5 明确为 Optional，须确认工程任务单的范围表达。
- 工程责任：响应式 UI tokens、共享 UI、路由和全局样式；Home、Discover、Map、Mine 四底栏及 Trip Planning、Favorites、My Macau Trips、Plaza 首页入口；加载、空态、错误态及移动端截图。

不负责：A 的 Trip／同行人／预算／账单／Schema／API 注册；C 的生成与约束算法；D 的日程保存、编辑重算、地图实现和发布。B 只 lazy import D 的页面。不得合并 Favorite 与 Add、复制整段公开行程、伪造开放或免费信息。

依据：Playbook 第 01、02、07 章；Codex_Member_B.md 的 TASK BACKLOG、DO NOT、ACCEPTANCE CRITERIA。

## 2 File Ownership

批准开工后，B 可在以下范围创建或修改：

- apps/web/src/features/discovery/**
- apps/web/src/features/plaza/**（浏览 UI）
- apps/web/src/shared/ui/**
- apps/web/src/router/**
- apps/web/src/styles/**
- apps/api/src/features/pois/**
- apps/api/src/features/favorites/**
- apps/api/src/features/targets/**
- apps/api/src/features/plaza/plaza.read.*
- data/fixtures/pois.*（仅数据内容，不修改类型）

需 A 批准：packages/contracts/**、apps/api/prisma/**、apps/api/src/app.ts、仓库工具链、依赖／配置和 CI。合同字段修改还需合同 PR 和四人共识。其他成员模块须经对应 Owner 评审；D 主责 tests/e2e/**，B 的测试不应据此越权修改。B 自身持有 router、全局 CSS 和 UI tokens，其他成员修改需 B 审批；涉及消费者的变更仍需 PR、consumer test 和 review。

依据：SHARED_CONTRACT_v1.md 的 Protected、Shared router、Cross-module changes；Codex_Member_B.md 的 YOUR FILE OWNERSHIP。

## 3 API Contracts

统一 /api/v1、JSON UTF-8；成功 {data:T}；失败 {error:{code,message,details?}}。code/message 为字符串；details 的类型未定义，API 文档示例为 null，而合同允许省略，需统一。ID 为 UUID string；日期 YYYY-MM-DD、时间 HH:mm，Asia/Macau。

以下明确区分已知 DTO 与尚未定义的 HTTP payload，不能将推测作为合同。

| B 实现接口 | 已规定请求 | 已规定响应及缺口 |
| --- | --- | --- |
| GET /pois?search=&category= | search 关键词；category 对应 Category；分页参数未定义 | 业务对象为 POI；列表包裹、总数、分页结构未定义 |
| GET /pois/:poiId | poiId UUID string | 详情对象为 POI；需冻结 data 的明确类型及不存在处理 |
| GET /trips/:tripId/targets | tripId UUID string | 目标列表；返回 ID、POI 或关系对象未规定 |
| POST /trips/:tripId/targets | tripId；body={poiId:string} | 响应 DTO、重复添加状态码未规定 |
| DELETE /trips/:tripId/targets/:poiId | tripId、poiId UUID string | 响应和重复删除语义未规定；不得影响收藏 |
| GET /favorites/:poiId | poiId UUID string；本地演示工作区 | 状态 DTO 未规定；不可自行决定 boolean 或对象 |
| PUT /favorites/:poiId | poiId；body 未规定 | 持久化收藏；响应未规定 |
| DELETE /favorites/:poiId | poiId | 取消收藏；响应未规定；不得影响 targets |
| GET /plaza/posts | 查询／分页参数未规定 | 公共记录类型 PublishedPostPublic；列表结构未规定 |
| GET /plaza/posts/:postId | postId UUID string | 公共记录 PublishedPostPublic；须冻结明确 HTTP 返回 |

B 调用 A 的 GET /trips/:tripId：以 tripId 读取 TripConfig，主要使用 interests；活跃 Trip 的前端状态来源尚未规定。跨模块导航由 B 接入 A/C/D 提供的页面，不代表 B 接管其全部 API。D 的 POST /itineraries/:itineraryId/publish 是上游发布接口，B 不负责调用它完成发布。

### 共享数据类型

- Category = 'history'|'food'|'shopping'|'nature'。
- Money = {amountMinor:number,currency:'MOP'|'HKD'|'CNY'}；amountMinor 为整数分。
- GeoPoint = {lat:number,lng:number}。
- WeeklyWindow = {weekday:number,open:string,close:string,lastEntry:string|null}。
- POI = {id:string,name:string,category:Category,tags:string[],position:GeoPoint,address:string,openingHours:WeeklyWindow[]|null,suggestedVisitMinutes:number|null,price:Money|null,verification:'verified'|'estimated'|'unknown',sourceUrl:string|null,checkedAt:string|null}。
- openingHours:null 表示未知，[] 表示整周已知关闭；未知费用不能改成 0。weekday 编码和 checkedAt 格式尚未规定。
- TripConfig = {id:string,title:string,startDate:string,endDate:string,origin:{label:string,position:GeoPoint,source:'curated'|'manual'},dayWindows:Array<{date:string,start:string,end:string}>,interests:Category[],budget:Money|null,pace:'standard'|'relaxed'}。
- PublishedPostPublic = {id:string,title:string,publishedAt:string,days:Array<{date:string,poiIds:string[]}>}，严格白名单；不得包含 TripConfig、同行人、预算、账单或私密备注。publishedAt 格式未规定。

Match 的结果 DTO／评分规则及附近建议的距离阈值／排序未定义；文档没有专用 endpoint，不应自行增加公共 API。

依据：API_ENDPOINTS_v1.md 全表与 Cross-module rules；SHARED_CONTRACT_v1.md 的 canonical shapes。

## 4 Dependencies

- A：批准并落地 packages/contracts、Prisma 表及唯一约束、TripConfig 与偏好读取、演示工作区作用域、路由注册、骨架和工具链；B 导出 Router 交 A 注册。
- C：消费 B 的选点并生成计划；须约定 targets 如何转换为 PlannerInput.selectedPois:POI[]。不能把 favorites 或 companions 送入规划。
- D：提供已脱敏的公开快照、稳定 poiIds、日程与地图页面导出路径及公开地图接入方式；B 用 POI 详情补全公开列表中的地点信息。
- 团队：批准约 30 个澳门 POI fixture、来源和核实状态；冻结 Match 示例、路由入口与模块共享 UI 的消费方式。

技术基线保持文档原样：Vue 3／Vite／TypeScript／Tailwind CSS；Node.js／Express／TypeScript／Prisma／SQLite；Leaflet／OpenStreetMap；Vitest／Supertest／Playwright。

## 5 Integration Risks

| 问题与依据 | 影响与需确认事项 |
| --- | --- |
| SHARED_CONTRACT_v1.md：FROZEN DRAFT 且要求四人同意；API_ENDPOINTS_v1.md：PROPOSED | 开工门槛未证实满足；四人确认版本与批准记录，由 A 汇总 |
| API_ENDPOINTS_v1.md 的 POI、targets、favorites、Plaza 接口 | payload、列表分页、mutation 返回、幂等／错误码不完整；A+B 及相关消费者冻结，B 不自定 |
| PROJECT_BASELINE.md 引用 Rebuilt_v2；本地另有 Final_v5_fixed 与 Aligned_Validated | 精确 URS 基线需团队确认；Final v5 的 REQ-1.16 为 M Optional，B-07 仅写 M，不应自动变成必交 |
| Playbook 第 02 章 selectedPoiIDs 与共享 PlannerInput.selectedPois | 概念与输入形态不同；B/C/A 确认 ID 解析、目标顺序及无效 ID 处理 |
| B 工单 B-05／B-07 与合同 POI／TripConfig | 缺评分、空偏好、解释及距离规则；先冻结测试示例，Match 不得冒充可行性 |
| GET /favorites/:poiId 没有收藏列表接口 | Favorites 页面如何恢复全量收藏未规定；A+B 确认读取方案，不能私自加 endpoint |
| PublishedPostPublic 与 Task1 Proposal 的 Plaza map access | 快照仅有 date/poiIds，不含路线段；B+D 确认只读地图行为、坐标读取、失效 POI 回退，禁止借用私有日程泄漏数据 |
| Schema 归 A，Favorites／targets 写入归 B | A+B 确认关系、唯一索引和删除约束；共享类型不等于数据库 Schema 已落地 |

未发现必须重分配功能的证据；主要风险是合同未批准和数据交接未细化。建议团队先确认批准状态、URS 版本及 H 功能所需 API／存储合同；其后重新评估 READY 条件。

## 审核依据与验收核对

主依据为所附 Engineering Playbook 第 00–05、07 章及 PROJECT_BASELINE.md、SHARED_CONTRACT_v1.md、API_ENDPOINTS_v1.md、Codex_Member_B.md。补充交叉核对 Task1/D2-Team2 TripMate-Macau Proposal.docx，以及 Task2/TripMate_Task2_URS_Final_v5_fixed.docx 和 D2-TripMate_Task2_URS_Teacher_Template_Aligned_Validated.docx 的需求与范围表；不将历史原型视为功能已完成或客户签字证据。

开发后重点验收：搜索清除恢复；Favorite/Add 双向独立；重复 Add 去重；无 Trip 禁止 Add；未知信息展示；公开 JSON 白名单；移动端与空／加载／错误态；Map 与 Itinerary 单一实现。当前没有执行项目测试，也未创建分支或修改项目代码。附件中的实现命令属于后续工作说明，本次仅审核。
