# TP-BETA-001 开发计划

- Status: `ACTIVE — M2 / I04`
- Updated: `2026-08-06`

## 1. 依赖图

```text
I01 → I02 → I03 → I04 → I05a → I05b → I06
I04 → I07 → I08..I12 → I13
I07 + I08..I12 → I14 → I15 → I16
I15 + I16 → I17 → I18 → I19
I04 + I17 → I20
I13 + I16 + I20 → I21 → I22
I19 + I22 → I23
I19 + I23 → I24 → I25
```

默认串行。I08–I12 只有在 I07 schema 合并后，且使用隔离 worktree、数据文件不重叠时，最多两路并行。

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
| I10 | #19 | 五台山数据 | 小朝台 + blocked 大朝台 |
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
#42（I05b 前端闭环）。规划 PR #43 已合并；#41 基于 `main@a73b840` 激活，#42 仍
blocked。以下 M1 合同保留为历史记录。

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

## 4. Issue 合同生成规则

I06–I25 在进入 Ready 前，Sol XHigh 必须基于已合并前置工作补齐文件 allowlist、精确验收、测试命令和当前基准提交。I05a/I05b 的冻结合同在 GitHub #41/#42；规划 PR 合并后仍需写回各自真实基准才可 Ready。不得用本表的一句话目标直接分派。

## 5. 合并顺序与里程碑门

每个里程碑最后一个 PR 合并后更新 `GOAL.md` 和 `docs/current-status.md`。I05a 与 I05b
串行、分别 Review/合并，父 #14 在两者完成后关闭。M3 数据 schema 未冻结不得并行
路线数据；M7 前不做重复全局 Review。
