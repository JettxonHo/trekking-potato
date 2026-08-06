# TP-BETA-001 开发计划

- Status: `ACTIVE — M4 / I15 approved, PR pending; M3 full routes source-blocked`
- Updated: `2026-08-06`

## 1. 依赖图

```text
I01 → I02 → I03 → I04 → I05a → I05b → I06
I04 → I07 → I10a
I10a → {I08, I09, I10b, I11, I12} → I13
I07 → I14 → I15 → I16
I15 + I16 → I17 → I18 → I19
I04 + I17 → I20
I13 + I16 + I20 → I21 → I22
I19 + I22 → I23
I19 + I23 → I24 → I25
```

默认串行。I10a 先建立共享 route-data test seam 和可独立证明的大朝台 blocked
记录。I08、I09、I10b、I11、I12 在来源证据齐全且使用隔离 worktree、数据文件不
重叠时，最多两路并行。I14 只依赖已冻结的 I07 schema，可在 full 试点数据阻塞期使用
合成变体和离线 fixture 独立实现；它不解锁 I13，也不改变任何真实路线事实。

## 2. Issue 清单

| ID | GitHub | Objective | Primary deliverable |
|---|---|---|---|
| I01 | #10 | 统一工具链和固定依赖 | Node 24、根命令、锁文件 |
| I02 | #11 | 修复离线 E2E 和本地质量命令 | lint/typecheck/test/integration/build |
| I03 | #12 | GitHub 最小门禁 | Actions、模板、标签、保护 |
| I04 | #13 | 判别式云函数响应 | prepare/confirm/advice union |
| I05 | #14 (parent), #41/#42 | 模糊路线确认闭环 | I05a 服务端 ID/confirm + I05b 前端确认 |
| I06 | #15 | 确定性安全合并 | AI 不可覆盖规则项 |
| I07 | #16 | 领域模型与旧数据适配 | Place/Route/Variant schema |
| I08 | #17 | 武功山数据 | 可追溯 verified variant |
| I09 | #18 | 四姑娘山二峰数据 | climb variant |
| I10 | #19 parent; #50/#51 | 五台山数据 | I10a blocked 大朝台 + I10b 小朝台 |
| I11 | #20 | 玉龙雪山数据 | 4680 tour variant |
| I12 | #21 | 贡嘎数据 | 三日点到点 variant |
| I13 | #22 | 稳定 ID 搜索解析 | 地点/路线/变体区分 |
| I14 | #23 | 多点小时天气 | 活动窗口契约 |
| I15 | #24 | TP-VERDICT-1 | 纯规则和原因码 |
| I16 | #25 | 攀登支持、日落和数据不足 | 输入与组合规则 |
| I17 | #26 | 服务端 TripContext | queryId + 所有权/过期 |
| I18 | #27 | 移除可信 baseData 回传 | advice 仅 queryId |
| I19 | #28 | 私人历史和停用 UGC | read/delete/clear only |
| I20 | #29 | 前端 reducer 与服务层 | 显式状态和竞态保护 |
| I21 | #30 | 搜索确认输入流程 | variant/date/time/support |
| I22 | #31 | 结果体验 | verdict/hourly/checklist/sources |
| I23 | #32 | 降级与恢复 | weather/AI/history 独立恢复 |
| I24 | #33 | Beta 综合验证 | 回归、构建、人工清单、文档 |
| I25 | #34 | Goal 最终 Review | 完成报告和验收结论 |

## 3. 第一批任务合同

I01–I03 已分别通过 PR #36、#37、#38 合并，M1 已关闭。I04 通过 PR #40 合并并关闭
GitHub #13。I05 由父 Issue #14 跟踪，拆为串行 #41（I05a 服务端候选/confirm）和
#42（I05b 前端闭环）：规划 PR #43、实现 PR #44/#45 均已合并，父子 Issues 已关闭。
I06 规划 PR #46 已合并为 `bf7ac83`，#15 在该真实 base 激活并交给 Terra XHigh。
实现 PR #47 通过两轮 Sol Review 和 latest-head `quality`，合并为 `57ab44c`；M2 已关闭。
以下 M1 合同保留为历史记录。

### I01 — 统一工具链、固定依赖与锁文件

- Agent：Terra XHigh；模式 `IMPLEMENTATION`。
- 目标：全新检出可确定性安装并从根目录运行现有测试。
- 允许：新增根 `package.json`、新增 `.node-version`、根 `.gitignore`、`taro-app/package.json`、两个 `cloudfunctions/*/package.json`、根及三个子项目共四个 `package-lock.json`、`README.md`、`docs/current-status.md`。
- 禁止：业务逻辑、UI、云函数行为、CI、Taro 升级、测试框架或重大依赖。
- 固定：Node 24 LTS；Taro 4.0.9；`wx-server-sdk` 从 `latest` 改为 `4.0.2`；其余现有版本范围不借本 Issue 升级；npm lockfile 入库；不使用 npm workspaces，避免改变 CloudBase 子项目部署语义。根 `bootstrap` 依次执行三个 `npm ci --prefix` 子项目安装。
- 验收：不依赖全局 Taro；`npm ci && npm run bootstrap` 安装根和三个子项目；根命令调度现有测试；路线 93/0、天气 86/0、单元 55/0 保持。
- 测试：安装验证及三个现有脚本。
- 自主：npm 脚本内部组合与名称细节。
- 升级：任何框架升级、测试重写或重大依赖。
- 交付：清单、锁文件、测试证据、文档、PR。

### I02 — 离线 E2E 与本地质量命令

- 依赖：I01；Agent：Terra XHigh。
- 允许：根 `package.json`/lock、`scripts/e2e-local.js`、新增 ESLint 配置、JS typecheck 配置、测试 mock/fixture、直接相关文档；生产文件只允许无行为变化的类型注释，且须在 PR 单独列出。
- 禁止：改变业务行为迁就旧测试；默认运行深层红队；机械覆盖率线。
- 固定：沿用现有 Node 脚本，不新增 Jest/Vitest；ESLint 使用 flat config 检查 `cloudfunctions/**/*.js`、`taro-app/src/**/*.{js,jsx}` 和 `scripts/**/*.js`；TypeScript 使用 `allowJs + checkJs + noEmit + skipLibCheck` 检查两个云函数和 Taro src，允许为类型通过增加无行为变化的 JSDoc；默认命令不运行 live 网络、DeepSeek、deep-audit 或 redteam-audit；E2E 的 Open-Meteo 与 CloudBase 必须改为 fixture/mock。
- 验收：根级 `lint`、`typecheck`、`test`、`test:integration`、`build:weapp` 有真实命令；E2E 使用当前日期与类型契约；失败返回非零。
- 升级：发现公共接口或跨模块产品缺陷。
- 交付：测试、配置、运行报告、PR。

### I03 — GitHub 最小门禁

- 依赖：I01、I02；Agent：Terra XHigh。
- 允许：`.github` workflow/templates；精简标签、里程碑、main 保护。
- 禁止：部署、发布、密钥、收费服务、复杂评分自动化。
- 固定标签：`type:feature`、`type:bug`、`type:docs`、`type:chore`、`priority:P0`、`priority:P1`、`priority:P2`、`status:blocked`。里程碑固定为 M1–M7，名称与 `GOAL.md` 一致。
- 固定 main 规则：require pull request、require 名为 `quality` 的 check、禁止 force push、禁止删除；不要求额外 GitHub 审批人数，独立批准由 Sol XHigh 在 PR Review 中承担。
- 验收：PR 运行统一 `quality` check；main 规则与上述固定配置一致；模板包含关联 Issue、方案、范围、测试、风险、兼容、回滚、遗留项。
- 交付：配置、线上验证证据、PR。

## 4. I06 冻结合同摘要

- 一项 Issue、一个实现 PR：后端白名单投影和前端立即显示最低装备共同构成“AI 成败不
  影响确定性内容”的同一用户可观察不变量，不再人为拆分。
- 新增单一纯投影模块；LLM/Prompt/计时仍在现有云函数编排层。正常、AI schema 无效和
  AI 不可用三条路径必须使用同一投影。
- AI 只追加 recommended/optional 装备、匹配既有风险的解释和 notes；不能决定
  essential、风险集合/等级/规则建议、weather、sunEvents、route、verdict 或 meta。
- 页面在 base 阶段立即用 `gearRules` 初始化装备和风险；loading 或 advice 传输失败不得
  清空这些内容。本任务不建立 reducer/service。
- 实现 allowlist、精确 schema、验收与命令以 GitHub #15 和
  `docs/tasks/ACTIVE_TASK.md` 为准；任何公共响应、依赖或跨 Issue 扩张必须升级。

## 5. I07 冻结合同摘要

- I07 保持一个 Issue/PR：schema、legacy 适配和契约测试共同证明旧扁平数据没有被伪造成
  RouteVariant；拆开会留下无法独立验收的半成品。
- 新增一个 `createRouteCatalog` 深模块。它构建 Source/Place/Route/RouteVariant 的只读
  规范化目录，集中校验 ID、引用、full/blocked 判别、固定日程、采样点和来源证据。
- full 变体必须 A/B 且核心字段完整；blocked 记录只需权威禁行证据，不伪造行程字段。
  Place 始终是 place-only。
- 175 条旧记录只适配为 175 个 `legacy_unverified` Place、0 Route、0 Variant；旧海拔、
  季节、note 和类型不能变成路线最高点、采样海拔、来源或运行状态。adapter 只在单个
  Place 内规范化 alias，保留跨 Place 歧义。
- I07 是 cold catalog：不接 `routes.js/geocode.js/index.js`，不改变 I05 候选、confirm 或
  公共响应。数据录入属于 I08–I12，生产聚合与搜索接入属于 I13。
- 实现 allowlist 和完整验收以 GitHub #16 与 `docs/tasks/ACTIVE_TASK.md` 为准。
- Terra 已交付 test-first 实现与第一次 Review 的最小修复：空 namespace 后缀必须失败，且 I07
  测试策略列出的 namespace、引用、日程和采样数量负例均已直接覆盖。状态恢复为
  `READY_FOR_CONTROLLER_REVIEW`。Sol 第二次 Review 和完整本地矩阵均通过，结果为
  `APPROVED`；在实现 PR 合并前，I08–I12 仍不得启动。
- I07 实现 PR #49 以 reviewed head `19c3fee` 通过 latest-head `quality`，squash merged 为
  `ea3b869`，GitHub #16 已关闭。Source/Place/Route/full-or-blocked Variant schema 现已冻结；
  I08–I12 必须先完成逐路线来源审阅与独立文件合同，再开始数据实现。

## 6. Issue 合同生成规则

I06–I25 在进入 Ready 前，Sol XHigh 必须基于已合并前置工作补齐文件 allowlist、精确验收、测试命令和当前基准提交。I05a/I05b 的冻结合同与真实基准已作为历史保存在 GitHub #41/#42；后续任务不得用本表的一句话目标直接分派。

## 7. I08–I12 来源门

- 字段级证据和直达来源以 `docs/research/pilot-route-source-audit.md` 为调研事实源。
- I08、I09、I10b、I11、I12 均是 `BLOCKED: SOURCE_EVIDENCE_INCOMPLETE`；任何实现 Agent
  不得仅凭 Issue 中的部分数值创建 full 变体。
- I10a 已通过 PR #53 合并并关闭 #50：只新增大朝台 tier A blocked 记录和共享
  `test:route-data` seam，未创建 full 变体或接入生产搜索。
- I08、I09、I10b、I11、I12 继续等待各自字段级来源解阻。I14 已从最新 main 建立独立
  合同，不使用上述阻塞路线的伪造数据。

## 8. I14 冻结合同摘要

- 运行依赖仅为 I07 full RouteVariant 的 `stages/weatherSamplePoints` shape；测试内构造并
  经 catalog 验证的合成变体，不创建 pilot 数据，不接 I13 生产目录。
- 新增内部路线小时天气接口；旧单点 daily weather 与当前公共 handler 保持不变。
- 每日统一 `HH:mm` 出发，使用 `durationHours.max` 形成半开活动区间；规范化所有相交的
  当地整点小时桶，并区分桶起点瞬时字段与桶终点“前一小时”字段。
- 每个被 stage 引用的 unique sample 最多一个 Open-Meteo 请求，总数最多三个。请求固定
  `Asia/Shanghai`、Celsius、mm、m/s 和十个冻结 hourly 字段；sample elevation 不回退。
- 任一必要采样请求、桶、数值、单位或时区不完整时整体 insufficient，不返回部分可判定
  小时数据；I14 不生成 verdict、阈值原因、日落或 climb 组合。
- 坐标转换抽为共享无 I/O 纯模块，`geocode.js` 保持原导出与行为。实现 allowlist、精确
  union、TDD 和验收以 GitHub #23 与 `docs/tasks/ACTIVE_TASK.md` 为准。

I14 已在 PR #55 通过 Sol 独立 Review 和 latest-head CI，squash 合并为 `f771b41`，#23
关闭。其 contract/history 由 GitHub #23、PR #54/#55 和决策记录保存；当前活动合同已切换 I15。

## 9. I15 冻结合同摘要

- I15 新增 weather-only 纯函数，只消费 I14 complete snapshot，返回天气部分
  `go/caution/no_go` 与稳定原因；I16 负责 blocked route、climb、预报提前量、日落、
  `verdict=null` 和最终 windows 组合。
- 固定 WMO、阵风、体感、能见度、中大雪组合、连续重雨和累计阈值，不计算加权分。
- I14 不保留完整自然日/滚动 24h，因此 `40mm/15cm` 明确为单 stage/sample 的活动桶累计；
  不跨地点/阶段相加，也不重新扫描无关夜间。
- 原因以 day+code 去重，保留更危险或最早代表性事实，并按冻结顺序稳定输出。
- 精确接口、原因码、边界矩阵、allowlist 和 TDD 以 GitHub #24 与当前
  `docs/tasks/ACTIVE_TASK.md` 为准。

I15 implementation is now ready for Sol XHigh Review. It contains only the pure evaluator, its
offline I14-derived contract test and the root test entry; it does not expose a public handler or
implement I16 composition.

## 10. 合并顺序与里程碑门

每个里程碑最后一个 PR 合并后更新 `GOAL.md` 和 `docs/current-status.md`。I05a 与 I05b
已按串行顺序分别 Review/合并并关闭父 #14。M3 路线的字段来源合同未冻结不得并行该数据；
M7 前不做重复全局 Review。
