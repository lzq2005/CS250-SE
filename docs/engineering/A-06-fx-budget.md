# A-06 — 参考汇率、预算及未知数据处理

Owner：Member A / Li Zhiqing。对应 REQ-1.12，支持 C 的 REQ-1.6 预算输入。
开发基线：`origin/main` / `d9adfd88acadaa697e41b28c7209c9f143300fc6`。
分支：`feat/a/A-06-fx-budget`。日期：2026-11-13。

本次交付为可独立使用的参考 FX 读取边界和预算兼容性回归，不代表完整
REQ-1.12 参考换算 UI 或 C 预算算法已完成。v1.1 修订稿仍为临时实施基线，
不是四人签核或客户批准记录。

## 1. 现有实现检查

已读取 Member A 工作清单、Member A 开发确认报告、Shared Contract v1.1
REVISED_DRAFT、API v1.1 REVISED_DRAFT、现有共享类型和 C 工作清单。
同时核对原始 Task 1 Proposal、Task 2 URS；URS §6.12 要求明确静态/日期、
来源及缺失回退，不能将参考金额解释为保证成交价。

| 检查项 | main 的现有行为 | 本次处理 |
| --- | --- | --- |
| TripConfig.budget | 已为 `Money \| null` | 保留，不重复实现 |
| Money / Currency | 非负安全整数分；MOP/HKD/CNY；100 分为 1 单位 | 保留类型，补三币种回归 |
| Trip API | 创建、PATCH、GET、列表及预算校验已实现；PATCH 省略预算保持原值，显式 null 清空 | 保留业务实现 |
| Trip Setup | 已有预算和三币种输入，空值转 null，使用 BigInt 解析分币 | 保留 UI |
| Prisma | 预算与 POI 价格使用成对 nullable BigInt/currency 列；迁移有金额/币种约束 | 不改 schema 或迁移 |
| POI API | DTO 区分未知 `price:null` 与免费 `amountMinor:0`，保留原币 | 不改 B；运行已有回归 |
| FxRate | 共享字段已存在：from/to/decimalRate/asOf/source | 直接使用，不新增公共 DTO |
| PlannerInput | 已有 `fxRates:FxRate[]`，无 companions/expenses | 准备该字段，读取服务不依赖 C |
| C planning | 当前 main 目录仍是占位 README | 不引入未合并算法；真实生成/重算联调待 C 接入 |

未发现经批准的实际 FX 数据集或批准证据。POI 资料、合成测试率及历史
示例均不构成批准的 FX 来源。本次生产清单保持空数组。

## 2. 实施计划与实际修改

1. 在 A 的 billing 目录保存批准参考率清单，目前为空。
2. 新增只读 Adapter，校验可信静态数据，向 C 提供原有 `FxRate[]`。
3. 单测覆盖来源、币种、缺失、异常及快照隔离；扩展现有 Trip API 预算回归。
4. 运行 lint/typecheck/单测/build；创建独立 Draft PR，等待审核，不自动合并。

| 文件 | 内容 |
| --- | --- |
| `apps/api/src/features/billing/reference-fx-data.ts` | A 管理的静态参考率清单，未批准时为空 |
| `apps/api/src/features/billing/reference-fx.ts` | 校验、只读全量读取、精确方向查询；无网络和 DB 访问 |
| `apps/api/src/features/billing/README.md` | 导出用法与职责说明 |
| `tests/unit/reference-fx.test.ts` | 合成测试数据，仅用于测试，不作为旅行参考或 Seed |
| `tests/unit/trips.test.ts` | 三币种零值/安全整数上界/null/非法预算回归 |
| `docs/engineering/A-06-fx-budget.md` | 检查结果、接入约定、测试与剩余依赖 |

无公共 DTO、HTTP endpoint、依赖或 lockfile 变更。未修改 B/D 模块、
C generatePlan/revalidateAndRecalculate、Trip 业务代码或 app 注册。

## 3. 参考率数据源与只读 Adapter

生产读取入口为 `referenceFx`，仅装载 `reference-fx-data.ts` 的批准清单。
清单随 API 编译部署，不依赖运行时当前目录、外部 fixture 路径或数据库表。

- `referenceFx.readRates(): FxRate[]`：全量副本，当前为 `[]`。
- `referenceFx.findRate(from, to): FxRate | null`：只匹配明确方向，缺失为 null。
- `createReferenceFxAdapter(data)`：仅供服务端可信静态来源和单测注入。
  校验结构不能证明数据获批，不允许将 HTTP、客户端候选或外部 provider
  响应直接当作批准源。

校验要求：币种为 MOP/HKD/CNY；只接受跨币方向；decimalRate 为严格正数
十进制字符串，不接受指数、浮点数值、负值、零或空白；source 为非空引用文本，
可使用机构名加原始文献/发布链接，不要求所有来源只能是 URL。
asOf 必须显式为 null，或合法带 Z 的 UTC 时间戳（秒，可带 1–3 位毫秒）。
不接受非法日历日期、本地时间、偏移时区、缺少字段、未知字段、稀疏数组及
重复方向（即使数值相同）。

畸形清单会抛出 `ReferenceFxDataError`，整个清单不可用，不静默采用部分数据，
不将配置损坏伪装成正常空清单。默认实例在模块加载时校验；部署了无效清单会
阻止依赖它的模块加载，必须修正清单后重新部署。合法空清单表示正常缺失。
读取及查询都返回新副本，调用方修改不会污染来源、下一次读取或其他候选快照。

不计算倒数、三角换算或汇总，不自动填充 1:1，不输出实时率或转换金额。
所有小数文本和引用原样保留，不用 Number/parseFloat 处理汇率。

## 4. C 接入约定与未知处理

后端从 `apps/api/src/features/billing/reference-fx.ts` 导入 `referenceFx`，
在现有输入组装器中将 `referenceFx.readRates()` 赋给 `PlannerInput.fxRates`。
Trip 使用 `readTrip(tx, tripId)`，targets/POIs 使用 B 的只读服务并遵守一致性
读取；不要通过 HTTP 自调用，不导入对方 Router，不加载 companions/expenses。
本次没有代建 C 的组装器或 generate endpoint。

| 情况 | A 提供的数据 / C 与展示层必须遵守的规则 |
| --- | --- |
| budget=null | 保留 null；C 的成本汇总币种按 Contract 为 MOP；不表示预算为零 |
| budget.amountMinor=0 | 已知零预算，不得转成 null |
| POI.price=null / leg.estimatedCost=null | 保持未知；C 输出 UNKNOWN_PRICE，不能按 0 计算完整总额 |
| 已知免费 Money(0, currency) | 保留零与原币，不得改为未知 |
| 成本与目标币种相同 | 不依赖 FX，不需要查找或构造同币率 |
| 跨币方向未批准/缺失 | 列表中没有该率，查询为 null；C 输出 UNKNOWN_FX，总额为 null |
| 只有反向率或两段间接率 | 仍视为该直接方向缺失，不自动倒数或推导 |
| source=null | 共享类型虽然允许 null，但不是可用跨币参考率；Adapter 拒绝整份无效清单 |
| asOf=null 且 source 有效 | 静态参考，消费方明确标记 **Static reference**；不得补当前时间 |
| asOf 有值 | 显示实际来源日期；不声称它是实时或保证成交价 |
| 部分价格/FX 未知 | 完整总额仍为 null；C 继续检查已知成本下界是否超预算，不能把部分和当总额 |

UNKNOWN_PRICE/UNKNOWN_FX/BUDGET 的生成、状态优先级、精确分币换算与预算比较
属于 C；本次没有实现或验收这些算法。保存/重开应继续使用原有 input 快照，
不得因参考清单后来更新而替换历史 FX；候选来源一致性检查由 C/D 后续接入。

## 5. 验证

环境：Node 24.18.0、npm 11.16.0；`npm ci --ignore-scripts --no-audit --no-fund`，
然后生成 Prisma Client、构建 contracts。未修改依赖文件。

所有数据库验证仅使用新建临时 SQLite。完整单测中的 bootstrap 用例依赖
已初始化的 `DATABASE_URL`，因此先对临时数据库运行 `npm run db:setup`，
仅应用仓库已有两份迁移。其他 DB 用例自行创建/清理临时库。
未访问正式/既有演示数据库，未执行正式 Seed 或正式迁移，也未新增迁移。

| 命令 / 检查 | 结果 |
| --- | --- |
| `npm run db:generate` | 通过，仅生成本工作区 Prisma Client |
| `npm run lint` | 通过 |
| `npm run typecheck` | API/Web/contracts/测试类型检查通过 |
| `npm test -- --maxWorkers=2` | 12 个文件、257 项全部通过 |
| `npm run build` | contracts/API/Web 生产构建通过 |
| `git diff --check` | 通过 |

测试包含全部六种跨币方向、来源与 UTC 日期、空生产清单、缺失方向、
不推导反向/交叉率、原始十进制精度、异常数据、重复/稀疏清单及副本隔离；
同时覆盖现有 Trip、POI、Prisma、Favorites/Targets 与 app 注册回归。
这些测试不调用 C 占位目录中的算法，不能作为完整规划联调证据。

首次直接 `npm test` 为 256 通过、1 失败：bootstrap 测试在未初始化的本工作区
默认库中找不到 DemoWorkspace。改为显式新建临时数据库、应用已有迁移后，
全量重跑得到上述 257/257。没有通过修改业务逻辑或跳过测试处理该环境问题。

## 6. 剩余依赖与组长确认事项

1. **批准数据源与具体率值**：确认发布机构/原始引用、每个直接 from→to 方向、
   十进制率、asOf（静态时显式 null）、适用的演示基准及批准人/日期/证据链接。
   在同一审核 PR 中提交清单与批准证据后才能启用；本 PR 没有填入任何实际率值。
2. **更新策略**：确定静态参考是否允许长期沿用、何时重新审核。当前无自动刷新、
   无时效保证、无静默回退或擅自设定的过期阈值。
3. **C 联调**：C 接入 fxRates 及源一致性校验，验证 UNKNOWN_FX、UNKNOWN_PRICE、
   部分成本下界、同币无 FX、非同币精确舍入；这需要 C 的真实实现可用。
4. **REQ-1.12 后续 UI**：来源、日期、Static reference、不可用提示及真实参考换算
   展示尚未交付；当前只保留已有预算输入 UI。本 PR 不宣称完整 A-06/TC-12 验收。

Draft PR 保持开放，等待 A/C 评审；不自动合并，不向其他成员发送消息。
