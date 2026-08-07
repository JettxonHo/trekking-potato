# 当前活动任务

- Task ID: `I20`
- GitHub Issue: `#29`
- Title: 建立前端 reducer 状态模型与 getAdvice 服务层
- Status: `APPROVED — PLANNING_PR_PENDING`
- Mode: `PLANNING`
- Owner: Sol XHigh
- Reviewer: independent Terra XHigh
- Branch: `codex/m5-checkpoint-i20-contract`
- Base: `main` at `b7c17ea`
- Goal: `TP-BETA-001`

## 当前授权与检查点

I19 implementation PR #69 在 reviewed head `ed8800f` 上通过 GitHub `quality`（51 秒），squash
merged as `b7c17ea`，GitHub #28 已关闭。I17–I19 全部完成，M5 Trust and privacy 已关闭；此前
遗漏的 M4 GitHub milestone 也已同步关闭。

当前只授权 Sol XHigh 冻结 I20 合同、同步权威文档和 GitHub #29，并提交纯规划 PR。合同通过
独立 Review、latest-head CI 和合并后，才可切换为 `IMPLEMENTATION` 并交给 Terra XHigh。
规划阶段不得修改生产代码、测试代码、依赖、锁文件或 GitHub workflow。

一名独立 Terra XHigh 对实际七文档 diff 和当前页面/后端契约完成正式 Review。第一轮
`CHANGES_REQUESTED` 指出悬空的 RECOVER/recoverTo 与遗漏 I18/I19 的依赖图；Sol 删除 I20 的
通用 recovery、把异步恢复留给 I23，并将依赖串行修正为 I17→I18→I19→I20。第二轮 Review
为 `APPROVED`，无剩余 P0–P2、无需人工确认。

## 必读上下文

1. `AGENTS.md`
2. `GOAL.md`
3. `docs/product-requirements.md` 第 5–7 节
4. `docs/architecture.md` 第 3 节公共响应与第 9 节前端状态
5. `docs/testing-strategy.md` 的 UI 状态、可信上下文与隐私矩阵
6. `docs/decision-log.md` 的 TP-D031、TP-D032、TP-D033
7. GitHub Issue #29，以及已合并 PR #67、#69

## 任务目标

把当前页面分散的查询生命周期收敛为一个纯 reducer，并把 `getAdvice` 的
`prepare/confirm/advice` CloudBase 调用收敛到一个可注入服务模块。流程状态、当前 request token、
候选/类型确认上下文、结果和流程错误只有 reducer 一个事实来源；页面继续保留表单草稿、纯视觉
计时器、缓存适配和 I19 私人历史局部状态。

I20 只迁移当前已存在行为，不新增路线变体输入、统一出发时间、climb support、结果页改版、重试
控件或自动重试。它是 I21–I23 的状态与网络基础。

## 交付形态与拆分结论

I20 使用一个 Issue、一个原子实现 PR，不拆子 Issue。reducer、service 和最小页面接线必须同时
合并：只加模块不接页面不能消除双写，只改页面而不建立直接契约测试又不能独立证明竞态与请求体。
预计变更集中在两个新深模块、一个页面和一个聚焦测试，仍是单一可验证目标。

## 纯 reducer 公共接口

新增 `taro-app/src/pages/index/trip-flow.js`，使用项目现有 CommonJS/Node 可直接加载的模块形式：

```text
createInitialTripFlow() → TripFlowState
reduceTripFlow(state, event) → TripFlowState
selectTripFlowView(state) → derived view flags
```

`TripFlowState` 只包含：

```text
status
token
result
queryId
candidates
confirmationInput
routeTypeRequest
error
```

- `status` 严格为：`idle`、`searching`、`awaiting_confirmation`、
  `awaiting_route_type`、`preparing`、`base_ready`、`advice_loading`、`complete`、
  `degraded`、`error`。
- `token` 是 reducer 唯一拥有的单调本地序列；不发送到服务端、不持久化。
- `result` 是页面现有可渲染结果：base 到达时先保存确定性投影，advice 到达后替换为合并结果。
- `candidates/confirmationInput` 只保存一次确认所需的服务端候选与本地表单快照。
- `routeTypeRequest` 保存当前 `route_type_required` 预填所需资料。
- `error` 为局部流程错误 `{code?, message, retryable?}`；不承载 history 错误。

reducer 不执行 CloudBase、缓存、history、timer、toast、日志、天气/结论/装备规则或 JSX 映射。
它不深层校验服务端业务数据；现有候选形状检查和结果投影仍由页面/既有契约负责。

## 事件与转移

同步事件：

```text
BEGIN_SEARCH        idle/complete/degraded/error → searching，token + 1，清空旧流程结果
BEGIN_PREPARE       awaiting_confirmation/awaiting_route_type/error → preparing，token + 1
RESET               any → idle，token + 1，清空流程资料
RESTORE_CACHED      idle → complete | degraded，token + 1，恢复缓存 result
```

异步完成事件必须携带 `token`：

```text
CONFIRMATION_REQUIRED searching → awaiting_confirmation
ROUTE_TYPE_REQUIRED  searching/preparing → awaiting_route_type
BASE_RECEIVED        searching/preparing → base_ready
ADVICE_STARTED       base_ready → advice_loading
ADVICE_SUCCEEDED     advice_loading → complete | degraded
ADVICE_FAILED        advice_loading → degraded
FLOW_FAILED          searching/preparing → error
CONTEXT_UNAVAILABLE  advice_loading → error（保留 result）
```

任何异步事件 token 与当前 state.token 不一致，或不适用于当前 status，必须返回同一个 state 对象且
无副作用。`RESET`、开始新查询、候选取消、手动弹窗取消和 `onBack` 都推进 token；组件卸载继续用
生命周期标记阻止 setState。这样迟到 prepare/confirm/advice 不得更新 result、cache 或 history。

状态语义固定为：自由输入发起的现有 `prepare` RPC 在途为 `searching`；候选确认或手动类型完成后
的 follow-up 请求在途为 `preparing`；`base_ready` 必须先于 `advice_loading` 成为可直接测试的
转移，保证 base 不依赖 AI。

`query_context_unavailable` 是 `CONTEXT_UNAVAILABLE`：进入 `error` 但保留确定性 result，不标记
degraded、不追加 AI unavailable note、不写 history。普通 advice error/transport failure 是
`ADVICE_FAILED`：进入 degraded、保留确定性 result，并延续 I19 的私人降级历史保存。
I20 不定义 `RECOVER` 或恢复目标；error 的可重试事实保留在 `error.retryable`，I23 设计恢复动作时
必须以推进 token 的新事件启动新异步请求。

## 视图派生与页面边界

`selectTripFlowView` 从 reducer state 派生当前页面需要的控制量：

- `loading`：`searching | preparing`
- `adviceLoading`：`base_ready | advice_loading`
- `showResult`：`result !== null`
- `showCandidatePopup`：`awaiting_confirmation`
- `showManualCoords`：`awaiting_route_type`
- `errorMessage`：`error && error.message`

以下旧字段从页面顶层 state 删除，不得与 reducer 双写：`loading`、`showResult`、`adviceLoading`、
`error`、`showCandidatePopup`、`candidates`、`candidateSnapshot`、`pendingResolvedLocation`、
`_requestGeneration`。

以下继续留在页面：

- 表单草稿、日期、等级、天数和手动坐标/类型控件值。
- `manualContextActive` 及缓存适配；缓存恢复通过 `RESTORE_CACHED` 进入 reducer。
- `funnyMsg/adviceStage/daysBounce` 与既有 timers。
- `showHistory/historyList/historyLoading/historyError/historySaveError` 及 history 云函数调用。
- `buildBaseSafetyResult` 和现有可渲染 result 投影；I22 才改变结果内容与视觉。

I20 不把 class 组件改成函数组件，不改 CSS，不引入 Context/Redux/Zustand，不新增第 11 个状态。

## getAdvice 服务接口

新增 `taro-app/src/pages/index/get-advice-service.js`：

```text
createGetAdviceService({ callFunction }) → {
  prepare(input),
  confirm(input),
  advice(queryId)
}
```

`callFunction` 由页面注入；生产调用固定 `name:'getAdvice'`。方法用 Promise 返回非抛出的 union：

```text
{ kind:'response', result }
{ kind:'transport_failure' }
```

请求体只包含已冻结字段且跳过 `undefined`：

```text
prepare → { mode:'prepare', route, date, level, days,
            manualLat?, manualLon?, manualElevation?, routeType?,
            startTimeLocal?, climbSupport? }
confirm → { mode:'confirm', candidateId, date, level, days?, routeType?,
            startTimeLocal?, climbSupport? }
advice  → { mode:'advice', queryId }
```

I20 不在 UI 新增 `startTimeLocal/climbSupport`；service 只为 I21 的已冻结字段留接口。service 不生成
token、不校验或复制业务规则、不调用 history/cache、不自动重试。advice 不接受或回退
`baseData/route/date/days/weather`，延续 I18 信任边界。

## 实现阶段允许范围

- `taro-app/src/pages/index/index.jsx`
- 新增 `taro-app/src/pages/index/trip-flow.js`
- 新增 `taro-app/src/pages/index/get-advice-service.js`
- 新增 `scripts/trip-flow-contract-test.js`
- `scripts/confirmation-contract-test.js`
- `scripts/response-contract-test.js`
- `package.json`
- `docs/architecture.md`
- `docs/testing-strategy.md`
- `docs/development-plan.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

规划 PR 可额外同步 `GOAL.md` 与 `docs/decision-log.md`。不得修改 CSS、Taro app/config、云函数、
history、路线目录/schema/data、天气/结论/AI/Prompt/安全模块、依赖、锁文件、workflow 或真实数据。

## TDD 与最小敏感矩阵

新增根命令 `test:trip-flow` 并纳入默认 `npm test`。先让该命令因新模块缺失产生真实 RED，再
实现 GREEN。测试直接加载 reducer/service，不用字符串测试替代核心行为：

1. 初始 state 字段和值精确；状态集合没有第 11 个值。
2. search → confirmation；candidate begin prepare → base_ready → advice_loading → complete。
3. search/preparing → route type required；手动 follow-up 可进入 preparing。
4. base_ready 时 result 已存在；advice normal/degraded/transport failure 都保留确定性 result。
5. `query_context_unavailable` 进入 error，result 保留且不变成 degraded。
6. 新查询、RESET、候选/手动取消推进 token；各选一个旧 success 与旧 failure 代表事件证明返回
   同一 state 对象。不要为每个状态机械排列所有事件。
7. 缓存恢复进入 complete/degraded；onBack/卸载后的旧 advice 不触发页面 cache/history 路径。
8. service fake 捕获三种精确请求体；advice 只有 mode/queryId，额外旧事实不能进入请求。
9. service success 与 transport failure 使用冻结 union；不把 raw transport error 作为用户消息。
10. 页面不再直接发送 `getAdvice`，不再拥有 `_requestGeneration` 或上述流程控制旧字段；history
    调用和局部状态保持。

既有 confirmation/response 测试中针对 `_requestGeneration` 的静态断言应迁移到 reducer 直接行为，
不得为了通过测试保留废弃的双重竞态机制。完整验证：

```text
npm run test:trip-flow
npm run test:confirmation
npm run test:response
npm run test:history
npm run test:integration
npm run lint
npm run typecheck
npm test
npm run build:weapp
git diff --check
```

## 可验证验收标准

- 10 个流程状态及合法转移由纯 reducer 直接测试，页面没有同义控制字段双写。
- request token 只有 reducer 一个所有者；迟到/取消/返回/卸载响应不能改变 UI、cache 或 history。
- base result 在 advice 前可渲染；AI 普通失败为 degraded，context 不可用为保留 base 的 error。
- 三个 getAdvice 请求只经 service，公共请求体符合 I18 与当前 prepare/confirm 契约。
- I19 私人历史、I05 confirmation、手动上下文、缓存恢复和当前视觉行为无回归。
- 聚焦与完整质量矩阵、文档和 latest-head CI 全部通过。

## I21–I23 非工作范围

- I21：稳定 RouteVariant 搜索接入、日期/时间、climb support 和输入交互。
- I22：verdict、小时天气、最低装备 checklist、来源和视觉结果页。
- I23：重试按钮、独立恢复动作、自动重试、历史恢复体验与进一步竞态 UX。

I20 只提供这些后续任务可消费的状态与 service seam，不提前实现其产品行为。

## 自主决策与升级条件

Terra 可决定 reducer 内部 helper、事件常量名称、测试 fixture 与不改变接口的页面接线顺序。
以下必须停止并交回 Sol：需要新增状态/全局库/依赖，修改服务端公共契约，改变 queryId/安全投影/
history 语义，无法移除页面双写，必须大规模重写页面或视觉，发现 I20 无法与当前 cache/manual
流程兼容，或连续两轮 Review 修复仍未通过。

## 交付物

- RED/GREEN 证据、两个新模块、最小页面接线和聚焦 contract test。
- 修改文件、偏差、自主实现决策、已知限制和重点 Review 位置。
- 完整测试与构建报告、直接相关文档、PR 描述和回滚说明。
- Terra 不得推送、批准或合并自己的 PR；Sol 决定合并。
