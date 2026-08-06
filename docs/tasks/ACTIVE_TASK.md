# 当前活动任务

- Task ID: `M3-DATA-CONTRACTS`
- GitHub Issues: `#17–#21`, I10 children `#50/#51`
- Title: 五条试点路线来源与数据任务合同
- Status: `READY_FOR_PLANNING_PR`
- Mode: `REVIEW_ONLY`
- Owner: Sol XHigh
- Reviewer: Sol XHigh
- Branch: `codex/i08-i12-route-data-contracts`
- Base: `main` at `ea3b869`
- Goal: `TP-BETA-001`

I07 已通过 PR #48/#49 合并，GitHub #16 关闭。当前只允许 Sol XHigh 和明确分配的
来源 Agent 做只读来源审计、调研报告、数据文件拆分和任务合同设计；本文件不授权任何
路线数据或测试代码实现。

## Objective

为武功山、四姑娘山二峰、五台山、玉龙雪山和贡嘎五个独立数据 Issue 冻结可执行合同：
明确规范路线、Source claims、未知字段处理、数据/测试文件、共享测试 seam、合并顺序和
并发边界。来源不能满足 A/B 时保持 Issue blocked，不得猜测数据或降低验证等级。

## Planning allowlist

- `docs/architecture.md`
- `docs/testing-strategy.md`
- `docs/development-plan.md`
- `docs/decision-log.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`
- `docs/research/pilot-route-source-audit.md`

本阶段禁止新增/修改 route data、测试代码、package scripts、运行时模块、依赖或锁文件。
GitHub #17–#21 可更新为更精确的 preliminary/ready 合同，但在规划 PR 合并前不得分派实现。
来源审计 Agent 可在 `docs/research/pilot-route-source-audit.md` 中固化五条路线的一手来源、
字段证据、冲突、缺口和解阻条件；该报告是调研产物，不授权写入业务数据。

## Frozen inputs

- `createRouteCatalog` 的真实实现与验证语义以
  `cloudfunctions/getAdvice/domain/route-catalog.js` 为准；长期字段定义以
  `docs/architecture.md` 为准。当前任务不得修改 I07 schema。
- 每条数据 Issue 必须提供显式 Source/Place/Route/Variant ID，不使用哈希或运行时生成器。
- full 变体只能使用 A/B 证据并覆盖 I07 要求的每个核心字段；derived claim 必须说明方法。
- 缺失距离、爬升、路线最高点、逐日路段或采样点时，不以附近山峰、营销文案或单一用户
  笔记填充。来源不足即保持 backlog/blocked，并把缺口写入 Issue。
- 五台山大朝台只允许 tier A 官方禁行记录；不进入可规划候选，不伪造 full 行程字段。
- 本轮只写静态数据和离线测试合同。生产目录聚合、同名优先级和搜索接入仍属于 I13。

## Fixed pilot identities

| Issue | Required record | Type/days | Special boundary |
|---|---|---|---|
| I08 / #17 | 武功山金顶登山揽胜一日线 | `trek`, 1 day | 成熟景区单日 full variant |
| I09 / #18 | 四姑娘山二峰·海子沟专业登山线 | `climb`, official 7 days | 不把二峰海拔当全部 stage/sample 海拔 |
| I10 / #19 | 黛螺顶小朝台·大智路 + 大朝台禁行记录 | `trek`, 1 day + blocked | 两种 Variant 分支并存 |
| I11 / #20 | 玉龙雪山冰川公园 4680 观景线 | `tour`, 1 day | 景区交通与步行混合，不表述为登顶 |
| I12 / #21 | 环贡嘎·全国徒步大会三日精华线 | `trek`, 3 days | 点到点逐日路段 |

## Revised file and test partition

- 来源审计后，I10 拆为 #50 / I10a blocked 大朝台和 #51 / I10b full 小朝台。I10a 先建立共享
  离线 route-data runner、根测试入口和五台山数据/断言文件；其中只允许 tier A
  blocked 记录，不包含小朝台 full 行程。
- I08、I09、I10b、I11、I12 各自只能新增一个独立数据文件和一个独立断言文件；
  共享 runner 自动发现这些测试。生产静态 registry 由 I13 建立，数据 Issue 不争用
  统一运行时文件。
- I10a 合并后，只有文件完全不重叠且来源合同已经 `APPROVED` 的两个数据 Issue 可在隔离
  worktree 并行。共享文档由 Sol 串行更新，不让实现 Agent 并发修改。
- 约 400 行/10 文件仍只是 Review 信号；每条路线的数据、来源和断言必须保持一个独立 PR。

## Source audit still required

每个 Issue 在进入 `READY` 前必须列出：来源 URL、发布者、查阅日期、tier/kind、支持的实体
字段、direct/derived 方法、来源间冲突、仍未知字段和 Sol 的 A/B 判定。网页当前状态可能
变化，必须在线复核；搜索摘要或聚合转载不能作为字段证据。

## Planning completion criteria

1. #17–#21 均有完整任务合同或明确的 `BLOCKED` 来源缺口。
2. 每条可执行合同含唯一文件 allowlist、非范围、字段级来源、验收、测试、依赖、风险、
   Agent 自主范围、升级条件和交付物。
3. 共享测试 seam 与 I10a 首先串行的原因明确；后续最多两路并行且无共享文件。
4. 合同与 `GOAL.md`、产品、架构、测试和决策文档一致，并通过独立 Review。
5. 合同-only PR 合并前不创建任何路线数据，不把来源调查结果宣称为已验证产品事实。

## Next action

创建纯规划 PR；在 latest-head `quality` 通过、PR head 与已审阅提交一致且 Sol
`APPROVED` 后合并。
