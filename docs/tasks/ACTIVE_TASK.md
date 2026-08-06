# 当前活动任务

- Task ID: `I18`
- GitHub Issue: `#27`
- Title: 移除客户端可信 BaseData 回传并让 advice 仅接收 queryId
- Status: `APPROVED — PLANNING_PR_PENDING`
- Mode: `PLANNING`
- Owner: Sol XHigh
- Reviewer: independent Terra XHigh
- Branch: `codex/i18-query-context-contract`
- Base: `main` at `46752c0`
- Goal: `TP-BETA-001`

## 当前授权

I17 规划及实现 PR #62–#65 已合并，父 Issue #26 与子 Issues #60/#61 已关闭。服务端现在会在
成功的 `prepare` / `confirm` 后创建短期、绑定 `openid` 的 TripContext，但 `advice` 仍读取
客户端回传的 `baseData`，所以可信闭环尚未完成。

当前只授权 Sol XHigh 冻结 I18 合同、同步文档与 Issue，并提交纯规划 PR。规划合同经过独立
Review、最新 head CI 和人工既有 Goal 授权范围内的合并后，才可切换为 `IMPLEMENTATION` 并
交给 Terra XHigh。规划阶段不得修改业务代码、测试代码、依赖或 GitHub 工作流。

## 必读上下文

1. `AGENTS.md`
2. `GOAL.md`
3. `docs/architecture.md` 第 4、5、8、11 节
4. `docs/testing-strategy.md` 的 I17 与 I18 合同
5. `docs/decision-log.md` 的 TP-D030 与 TP-D031
6. GitHub Issue #27，以及已合并 PR #63、#64、#65

## 任务目标

把 advice 的可信输入从客户端 `baseData` 原子切换为服务端 TripContext：客户端只发送
`queryId`；服务端按当前 `openid` 读取一次可信快照，再由现有 AI 解释和安全投影消费该快照。
任何客户端附带的路线、日期、天气、装备或确定性结论都不参与 advice。

## 交付形态与拆分结论

I18 使用一个 Issue、一个原子实现 PR，不拆成可独立合并的前后端子任务。后端先切换会破坏
旧前端，前端先切换会破坏旧后端；保留双信任路径又违背本任务目标。实现 PR 内按
“RED 测试 → 服务端切换 → 前端调用切换 → 完整质量矩阵”串行完成。

## 冻结的公共请求与分支顺序

公共请求固定为：

```js
{ mode: 'advice', queryId }
```

- 入口只先解析 `mode` 与服务端身份 `openid`。
- `mode === 'advice'` 时，在读取或验证 `route/date/level/days/baseData/weather` 前进入 advice 分支。
- 客户端附带的旧字段静默忽略，但不得读取、校验、回退或赋予任何权限。
- 非 advice 的 `prepare` / `confirm` 顺序与 I17 写入行为保持不变。
- 未认证请求在访问 TripContext 前失败，context read 为零。

## 冻结的 TripContext 读取流程

- 使用现有 `createTripContextStore({ collection }).read({ openid, queryId })`，其中 collection
  来自 `db.collection('trip_contexts')`；每个 advice 请求恰好读取一次。
- `found` 时只把 `found.snapshot` 交给现有 Prompt、AI 和安全结果投影。
- 不对可信快照重复实现一套客户端 BaseData 校验器；存储模块继续负责记录完整性、归属与 TTL。
- 不修改 I17 的 ID、TTL、集合、记录结构或深拷贝语义。
- AI 失败或无效响应继续返回 `phase: 'advice'`、`degraded: true`，确定性事实来自可信快照。

## 冻结的公共错误语义

| 内部读取结果 | 公共响应 | retryable | 行为 |
|---|---|---:|---|
| `not_found` / `forbidden` / `expired` | `query_context_unavailable` | `false` | 提示“本次查询已失效，请重新查询”，不泄露内部差异 |
| `store_unavailable` | `context_unavailable` | `true` | 提示“暂时无法读取本次查询，请重试”，不泄露原始存储错误 |

两类错误均不得包含 `data`、`queryId`、`expiresAt`、快照或内部状态，并且不得调用 LLM。
`invalid_base_data` 从公共 advice 路径退役；若内部非 advice helper 仍使用同名字符串，不在 I18
扩大范围清理。

## 前端原子切换

- `prepare` / `confirm` 成功后把完整 base response 和当前 request generation 交给结果流程。
- 从 base 顶层读取 `queryId`；确定性展示继续使用 `baseResponse.data`。
- advice 云调用的 `data` 必须字面量为 `{ mode: 'advice', queryId }`，不得展开表单参数。
- 路线、日期、等级、天数等只作为本地 history 参数继续传给 `_saveHistory`；不得持久化 `queryId`。
- advice 的 success 与 fail 回调都要先核对 generation，迟到响应不得覆盖新查询。
- `query_context_unavailable` 必须走独立前端分支：停止 advice loading，保留已经显示的
  确定性 base，在结果视图内显示服务端“本次查询已失效，请重新查询”消息并保留现有
  “返回重新查询”动作；不把 result 标成 degraded、不追加 `AI_UNAVAILABLE_NOTE`、不写
  history。新增按钮或额外重试控件属于 I23。

## 实现阶段允许范围

- `cloudfunctions/getAdvice/index.js`
- `cloudfunctions/getAdvice/response-contract.js`
- `taro-app/src/pages/index/index.jsx`
- `scripts/response-contract-test.js`
- `scripts/confirmation-contract-test.js`
- `docs/architecture.md`
- `docs/testing-strategy.md`
- `docs/development-plan.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

规划 PR 可额外同步 `GOAL.md` 与 `docs/decision-log.md`。不得修改 `trip-context.js`、Prompt、
`safety-advice.js`、history 云函数、依赖清单、锁文件、共享 E2E mock 或 GitHub 工作流。

## TDD 与最小回归矩阵

先提交能真实失败的 RED，再实现 GREEN：

1. 成功 `prepare` 获得真实 `queryId` 后，owner 仅以 `{ mode, queryId }` 获取 advice；Prompt 与结果来自存储快照。
2. 在 advice event 的旧字段上设置会抛错的 getter，调用仍成功，证明入口和 handler 都未读取它们。
3. unknown、foreign、expired 各一例，公开响应完全一致为 `query_context_unavailable`，无 data、无 LLM。
4. context read 失败一例，返回可重试 `context_unavailable`，无 data、无 LLM、无原始错误。
5. 可信 context 下 AI 失败一例，仍返回 degraded advice，装备、风险与天气来自快照。
6. 保持 prepare/confirm 零 context read，且原有创建、TTL、归属、深拷贝测试继续通过。
7. 前端静态合同证明 advice 请求只有 `mode/queryId`、history 参数仅本地使用、success/fail
   都有 generation guard；`query_context_unavailable` 单独保留 base 并显示重新查询消息，
   不设置 degraded、不追加 AI unavailable note、不写 history，并在结果视图保留现有返回动作。

不得增加 token 熵、哈希、攻击排列组合或机械覆盖率门槛。

## 完整验证命令

```text
npm run test:trip-context
npm run test:response
npm run test:confirmation
npm run test:integration
npm run lint
npm run typecheck
npm test
npm run build:weapp
git diff --check
```

## 可验证验收标准

- advice 的唯一可信请求参数是 `queryId`，服务端只消费当前用户的一次可信快照读取。
- 客户端旧事实字段即使存在也不会被读取或影响 Prompt、装备、天气、安全风险和最终输出。
- unknown、foreign、expired 不可区分；存储不可用可重试；所有失败都无敏感泄露且不调用 LLM。
- prepare/confirm 的成功创建与失败零写入行为无回归。
- 前端确定性 base 先展示，AI 异步解释；迟到 advice 不覆盖新查询；历史不保存 `queryId`。
- 全部指定测试、质量命令和微信构建通过，文档与代码一致。

## 自主决策与升级条件

Terra 可自行决定测试 fixture、局部 helper 命名和不改变契约的重排。以下情况必须停止并交回
Sol：需要修改公共契约、TripContext schema/TTL/ID、引入依赖、改变历史数据结构、扩大到
I19/I20/I23、降低验收标准，或连续两轮修复仍未通过 Review。涉及部署、生产配置、数据删除、
不可逆迁移、认证/隐私边界变化时必须请求人工确认。

## 交付物

- RED/GREEN 证据、实现代码与最小测试。
- 修改文件清单、完整本地验证结果、偏差与已知限制。
- 与实现直接相关的文档更新。
- PR 描述与重点 Review 位置。
