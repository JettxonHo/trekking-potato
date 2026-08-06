# 当前活动任务

- Task ID: `I04`
- GitHub Issue: `#13` — `https://github.com/JettxonHo/trekking-potato/issues/13`
- Title: 建立判别式云函数响应契约
- Status: `READY_FOR_EXECUTOR`
- Mode: `IMPLEMENTATION`
- Owner: Terra XHigh (authorized Luna fallback)
- Reviewer: Sol XHigh
- Branch: `codex/i04-response-contract`
- Base: `main` at `900b79e`
- Goal: `TP-BETA-001`

PR #39 已合并且 GitHub #13 已写回真实 base；本文件现在是 I04 的实现授权。

## Objective

把当前 `getAdvice` 云函数的所有公共出口统一为可以仅凭 `phase` 判别的响应信封，
让生产前端使用 `phase` 和 error `code`，同时以渐进方式保留必要兼容字段。该任务
只建立迁移契约，不提前实现候选 ID、confirm、最终领域快照或可信 queryId。

## Background and value

现有调用方混合判断 `ok`、`error`、`needsConfirm`、`needsRouteType` 和隐式字段；
部分正常 advice 甚至没有 `phase`。I04 是 I05 路线确认、I07 领域模型和 I20 前端
状态机的共同边界，必须先让所有响应具备稳定且互斥的阶段语义。

## Allowlist

- `cloudfunctions/getAdvice/index.js`
- 可新增 `cloudfunctions/getAdvice/response-contract.js`
- `taro-app/src/pages/index/index.jsx`，只允许最小调用与分支迁移
- `scripts/response-contract-test.js`，以及为调用 handler 所需的离线 mock/fixture
- `scripts/e2e-local.js`，仅允许增加 response phase 回归断言
- 根 `package.json`，只增加 `test:response` 并纳入现有 `test`
- `docs/architecture.md`、`docs/testing-strategy.md`、`docs/current-status.md`

如果必须修改 allowlist 之外的文件，先停止并交回 Sol XHigh。

## Out of scope

- I05 的稳定 candidate ID、最终 `candidates[]` 和 `mode='confirm'` 行为
- I07 的 `Place / Route / RouteVariant` 或最终 BaseData
- I14–I16 的天气、结论与规则行为
- I17/I18 的 TripContext、queryId、过期/所有权检查或移除客户端 `baseData`
- I19 的历史/UGC，I20 的 reducer/服务层，任何视觉重做
- 依赖升级、新运行时依赖、部署、数据库或生产配置

## Fixed contract decisions

1. 新前端第一阶段请求使用 `mode='prepare'`。服务端在迁移期仍接受 `mode='base'`
   作为等价别名；I04 后的生产前端不得再发送 `base`。
2. 每个返回值必须有且只有一个权威 `phase`：
   `confirmation | route_type_required | base | advice | error`。
   I04 的运行时形状冻结为：
   - `confirmation { phase, message, data }`（兼容 `ok/needsConfirm` 可选）
   - `route_type_required { phase, displayName, allowedTypes, data }`
     （兼容 `ok/error/needsRouteType` 可选）
   - `base { phase, data }`（兼容 `ok` 可选）
   - `advice { phase, degraded, data }`（兼容 `ok` 可选）
   - `error { phase, code, message, retryable }`（兼容 `ok/error` 可选，日期窗口可选）
3. `phase='error'` 必须含非空 `code`、用户可见 `message` 和 boolean `retryable`。
   现有 error 路径保持原错误码；固定映射为：
   - `weather_data_invalid: true`
   - `no_auth`、`missing_params`、`invalid_mode`、`invalid_trip_days`、`invalid_date`、
     `invalid_route_type`、`location_failed`、`out_of_range`、`invalid_base_data`、
     `internal_error`: `false`
   本表之外不得由实现 Agent 新增或改判；发现遗漏 code 必须升级。
4. 当前模糊命中映射为 `confirmation`，类型待选映射为
   `route_type_required`；后者不是 error。不得为二者伪造 candidate ID 或 queryId。
   - 在 I05 前，前端收到 `confirmation` 后只展示返回 `message` 并允许用户修改后
     重新提交；不得读取 base 字段、调用 advice、写缓存或写历史。
   - `route_type_required` 在 I04 迁移期必须同时包含顶层 `displayName`、
     `allowedTypes=['trek','climb','tour']`，以及现有前端所需的 `data`：
     `name/lat/lon/elevation/location/routeTypeOptions`。前端按 phase 进入现有类型选择
     流程，不得默认类型或触发 advice。
5. base 与 advice 成功出口分别为 `base` 和 `advice`；AI 降级仍是可展示的
   `advice`，不得映射成 error。
6. 兼容字段 `ok/error/needsConfirm/needsRouteType/data` 可以保留，并与新信封一致；
   新前端不得再靠这些字段区分 phase。不得新增新的长期兼容层。
7. 缺失或未识别 mode 都返回 `phase='error'` 与稳定 `code='invalid_mode'`，不得落入
   同步全流程。仅显式 `base` 作为 `prepare` 的迁移别名。
8. 不改变天气、装备、AI、路线解析和数据内容，只改变响应包装、模式入口和最小消费逻辑。

## Acceptance criteria

- `prepare` 的当前运行时出口只可能是 `confirmation`、
  `route_type_required`、`base` 或 `error`；`advice` 只可能是 `advice` 或 `error`。
- 所有原有早退、校验失败、确定性天气错误和未分类捕获路径都由统一 error 构造器
  返回稳定的 `code/message/retryable`。
- 当前模糊匹配在天气、规则或 AI 前返回 `confirmation`；当前类型待选返回
  `route_type_required`，二者互不混淆。
- 生产前端发送 `prepare`，并仅以 `phase`/`code` 做成功、类型待选和错误分支；
  base 后异步 advice 的用户行为不变。
- 契约测试证明每个变体必有合法 phase，error 字段完整，变体专有字段不会出现在
  其他新变体中；兼容字段若存在则与权威字段一致。
- 现有路线 `93/0`、天气 `86/0`、单元 `55/0`、集成 `56/0` 不回退，微信构建通过。

## Required verification

```bash
corepack npm@10.9.2 run lint
corepack npm@10.9.2 run typecheck
corepack npm@10.9.2 run test:response
corepack npm@10.9.2 test
corepack npm@10.9.2 run test:integration
corepack npm@10.9.2 run build:weapp
git diff --check
```

默认测试必须离线，不访问 Open-Meteo、CloudBase、DeepSeek 或已部署环境。

## Dependencies and merge order

- Depends on I01–I03, all complete on `main` at `6ee02c9` before this checkpoint.
- Unlocks I05 and I07 after merge; contributes with I17 to I20.
- Must be implemented serially; no concurrent changes to `getAdvice` orchestration or index page.

## Risks

- 隐式旧字段可能隐藏未记录调用面；保留一致兼容字段降低一次性破坏风险。
- 若把 final candidate/queryId 结构塞入 I04，会产生跨 Issue 假实现和错误信任边界。
- 若测试只测构造器而不测 handler 出口，仍可能遗漏直接返回的旧形状。

## Executor autonomy

- 可决定构造器函数名、JSDoc 类型和测试 helper 组织方式。
- 可决定如何在代码中集中表达已冻结的 retryable 映射，但不得改变映射值。
- 不得改变 phase 集合、公共 mode、错误码、业务 payload、依赖或后续 Issue 边界。

## Escalation conditions

- 发现还有未记录的生产调用方或必须改变业务 payload 才能统一信封。
- 需要新增依赖、修改公共领域/天气契约、实现 confirm/queryId 或扩大 allowlist。
- 同一 Review 问题连续两轮仍不能通过，或只能降低验收标准才能继续。

## Deliverables

- 运行时响应契约与最小前端迁移
- 覆盖构造器和实际 handler 出口的离线测试
- 兼容字段与 retryable 映射说明
- 直接相关文档同步
- PR 使用 `Refs #13`，由 Terra 返回 `READY_FOR_CONTROLLER_REVIEW`；不得自行合并
