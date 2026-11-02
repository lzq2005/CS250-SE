# TripMate Macau — CS250 Software Engineering

TripMate Macau 是 CS250 Software Engineering 的澳门旅行规划课程项目。项目拟帮助用户整理旅行信息、浏览及选择景点、生成行程并处理时间与路线约束。

本个人仓库保存课程项目文档的脱敏展示副本。需求描述和评估计划不代表功能已经实现或测试通过。

## 项目文档

| 作业 | 文档 | 内容 |
| --- | --- | --- |
| Task 1 — Project Proposal | [项目提案](docs/task-1/TripMate_Macau_Project_Proposal.pdf) | 问题诊断、拟议方案、工作计划、功能 ownership 和评估计划；33 页 |
| Task 2 — Requirements | [需求规格说明](docs/task-2/TripMate_Macau_Requirements.pdf) | 需求来源、功能需求、非功能需求、领域需求及范围说明；37 页 |

两份 PDF 已移除成员姓名、学号和个人元数据，保留作业正文、需求编号、图表、贡献职责及原有审核状态。课程提交原件另行保留，GitHub 归档不替代 Moodle 提交。

Task 2 采用现有 URS 展示版本，保留其修订记录及“最终批准仍待完成”的说明；修订表的团队署名不代表最终批准已经完成。

## 范围与状态

当前 URS 定义澳门旅行规划的需求。Travel Bill、Nearby Food Suggestions 和 Relaxed Pace 在当前需求基线中为 Optional。需求定义、实现完成和验收结果分别记录，不将计划中的功能标为已经完成。

历史文档归档提交只包含 README 和两份项目 PDF。自2026-11-02起，本仓库另含隔离分支开发的应用骨架；问卷原始数据和既有历史原件不随本次骨架提交。

## 目录

```text
README.md
docs/
├─ task-1/
│  └─ TripMate_Macau_Project_Proposal.pdf
└─ task-2/
   └─ TripMate_Macau_Requirements.pdf
```

## 仓库

[lzq2005/CS250-SE](https://github.com/lzq2005/CS250-SE)

## Project Bootstrap — Temporary Implementation Baseline

组长于2026-11-02授权开始实施，B/C/D尚未批准全部规范。参见 [Implementation Decisions](docs/engineering/implementation-decisions.md)。历史Proposal/URS与文档目录保留；本次仅骨架，不代表17项REQ已实现。

Node 24（或22.12+）与npm；在仓库根目录：

```sh
npm install
npm run db:generate
npm run db:setup
npm run dev
```

可选复制 `.env.example` 为 `.env` 修改本地端口/数据库。默认web http://127.0.0.1:5173，API http://127.0.0.1:3001/api/v1/health；SQLite文件位于apps/api/prisma/dev.db，不提交数据库。Vite代理/api至API。先退出旧进程再改端口；Playwright smoke使用默认端口。

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

生产构建API可用 `npm start`；web构建输出apps/web/dist，需要部署服务器反代/api。CI使用npm ci，生成Prisma client、迁移、检查、构建与浏览器smoke。不要把迁移元数据/DB连通当作Trip业务存储实现。尚未实现的业务路径返回404。运行验证记录见 [Bootstrap Verification](docs/engineering/bootstrap-verification.md)。

- apps/web：Vue健康状态页面及模块占位
- apps/api：Express app/server、SQLite探测及模块接入口
- packages/contracts：临时v1.1修订稿类型
- tests/unit、tests/e2e：HTTP边界及真实浏览器smoke
- data/fixtures：B后续提供来源可查数据

B/C/D分别在自己的分支实现Discovery/Planner/Itinerary与Map等，不在本骨架中代做。
