# 当前活动任务

- Task ID: `I21`
- GitHub Issue: `#30`
- Title: 实现搜索、确认与行程输入流程
- Status: `CONTRACT_APPROVED — PLANNING_PR_OPEN / IMPLEMENTATION_PAUSED`
- Mode: `IMPLEMENTATION`（尚未激活）
- Owner: Sol XHigh
- Planned implementation Agent: Terra XHigh
- Planning branch: `codex/i21-core-flow-contract`
- Planning PR: `#90` (open; must not merge before `继续`)
- Planned implementation branch: `codex/30-core-input-flow`
- Planning base: `main` at `c5d7d7c`
- Goal: `TP-BETA-001`

> 人工停止条件：完成本合同的文档固化、GitHub 同步、独立 Review 与规划 PR 后暂停。未收到明确
> `继续` 前，不得创建实现分支、分派 Terra、写 TDD RED 或修改业务代码。

## 1. 目标与背景

用一个原子垂直 PR 将公共 `prepare/confirm` 从 I05 legacy 路径切换到 I13 永久 ID resolver，并接通
I14 小时天气、I16 确定性结论、I17/I18 可信 TripContext 与 I20 十状态 UI。用户应能输入日期、统一
每日出发时间、能力、适用天数和技术攀登支持；服务端只采用 resolver、可信路线和外部地点结果，
不得相信客户端的坐标、路线类型、天气、固定天数或结论。

I13 PR #89 已合并为 `c5d7d7c`，I14/I16/I17–I20 均已完成，依赖已满足。I21 不拆成可独立合并的
前后端半成品，因为任一方向都会让生产 `main` 出现死输入或协议不兼容。

## 2. 必读文件

完成 `AGENTS.md` 的强制顺序后，实施 Agent 再阅读：

1. GitHub #30 的同步合同
2. `docs/product-requirements.md` 的核心查询流程
3. `docs/architecture.md` 的云函数契约、BaseData、TripContext、I14–I16 与 I20/I21 状态边界
4. `docs/development-plan.md` 的 I21 依赖与原子交付
5. `docs/testing-strategy.md` 的 I21 垂直矩阵
6. `cloudfunctions/getAdvice/index.js`、`trip-context.js`、`response-contract.js`
7. `domain/catalog-resolver.js`、`weather.js`、`trip-verdict.js`、`gear-rules.js`
8. `taro-app/src/pages/index/index.jsx`、`trip-flow.js`、`get-advice-service.js`
9. 本合同允许修改的现有脚本

## 3. 允许修改的文件

实施 Agent 只可修改：

1. `cloudfunctions/getAdvice/index.js`
2. `cloudfunctions/getAdvice/trip-base.js`（新增）
3. `cloudfunctions/getAdvice/trip-context.js`
4. `cloudfunctions/getAdvice/response-contract.js`
5. `taro-app/src/pages/index/index.jsx`
6. `taro-app/src/pages/index/index.css`
7. `scripts/core-input-flow-contract-test.js`（新增）
8. `scripts/response-contract-test.js`
9. `scripts/confirmation-contract-test.js`
10. `scripts/trip-context-contract-test.js`
11. `scripts/trip-flow-contract-test.js`
12. `scripts/e2e-local.js`
13. `package.json`
14. `docs/current-status.md`
15. `docs/tasks/ACTIVE_TASK.md`

本任务跨前后端与可信快照，文件数超过通常拆分信号是原子协议切换的必要结果，不是放宽范围。
若实际实现需要 `prompt.js`、`safety-advice.js`、history、service、reducer 或其他文件，先停止并由 Sol
更新合同；不得自行扩大 allowlist。

## 4. 固定公共请求与响应

### 4.1 请求

```js
prepare: {
  mode: 'prepare', route, date, startTimeLocal, level,
  days?, climbSupport?, manualLat?, manualLon?, manualElevation?, routeType?
}

confirm: {
  mode: 'confirm', candidateId, date, startTimeLocal, level,
  days?, climbSupport?, routeType?
}

advice: { mode: 'advice', queryId }
```

- `date` 为真实且不早于 `Asia/Shanghai` 当日的 `YYYY-MM-DD`；`startTimeLocal` 精确 `HH:mm`；`level` 只允许
  `小白 | 中级 | 老手`。
- 页面默认 `startTimeLocal='08:00'`、`climbSupport='solo_or_unsure'`。技术攀登支持选择器始终可见，
  文案明确“仅技术攀登适用”；默认值可修改。
- `climbSupport` 只允许 `solo_or_unsure | experienced_team | professional_guide`。服务端只对 resolver
  确认的 `route_variant/full + climb` 强制；trek/tour、place-only 和 manual climb 不强制。
- 旧 `mode='base'` alias 删除；缺失、未知或 `base` 均为 `invalid_mode`。
- 新错误码 `invalid_level`、`invalid_start_time`、`invalid_manual_place`、
  `missing_climb_support`、`route_not_found` 均 `retryable:false`。保留既有 phase/error envelope；
  不得新增另一种错误形状。
- `advice` 仍只读取 `queryId`，客户端附带的 route/base/weather 等字段不读取、不校验、不回退使用。

`route_type_required.data` 是显式 union：

```js
{ resolutionKind: 'catalog_place', candidateId, name, region, input, routeTypeOptions }
{ resolutionKind: 'amap_place', route, name, location, input, routeTypeOptions }
{ resolutionKind: 'manual_place', route, name, location, lat, lon, elevation, input, routeTypeOptions }
```

其中 `input` 是服务端接收的 `{date,startTimeLocal,level,days,climbSupport}` 快照。catalog Place 不暴露
坐标，用户选择类型后再次 `confirm` 同一 candidateId；AMap Place 不回传坐标，选择类型后使用原
route 再次 `prepare`，由服务端重新解析；只有用户已明确提交 manual coordinates 时才返回
manual_place 并沿相同坐标再次 `prepare`。三者复用 `awaiting_route_type`，不得靠字段猜测来源。

### 4.2 Resolver 与输入顺序

- `prepare` 先严格校验 route/date/time/level 的输入形状，再调用 `resolveRouteQuery(route)`。
- `confirm` 先严格校验 candidateId/date/time/level，再调用 `resolveRouteCandidateId(candidateId)`。
- `confirmation` 精确返回 I13 七字段 DTO，并保存完整
  `{date,startTimeLocal,level,days,climbSupport}` 前端快照；确认只提交 candidateId 加该输入快照。
- unknown/stale/malformed candidate 返回 `route_not_found`，不得降级为客户端坐标或 candidate DTO
  事实。`prepare` 的 resolver `not_found` 可进入现有 AMap/manual fallback，且只能产生 place-only；
  外部服务明确无结果映射 `route_not_found`，服务不可用保留 `location_failed`。
- 一旦任一 manual coordinate 字段出现，manualLat/manualLon 必须成对提供为有限 number，纬度在
  `[-90,90]`、经度在 `[-180,180]`；manualElevation 可省略，提供时必须为 `[-500,9000]` 的有限
  number。部分、字符串、NaN、Infinity 或越界统一 `invalid_manual_place`，且不得调用 elevation、
  天气、规则或 TripContext。该边界只校验真实客户端入口，不建立重复的内部防御层。
- confirmation、所有输入错误和 route_not_found 必须在天气、装备、结论、AI、TripContext、cache 与
  history 副作用前返回。

## 5. 三种可信 target 编排

### 5.1 full

- `days` 只取服务端 Variant `fixedDays`；忽略客户端值，不因其非法而拒绝。
- 使用 Variant、date、startTimeLocal 调用 I14 `fetchRouteWeather`，并把 complete/insufficient 原始
  snapshot 交给 I16。
- `routeContext={kind:'full',routeType}`；climb 时把合法 support 交给 I16。
- 最低装备只用服务端事实：月份、Variant `routeHighestPointElevationM`、最高海拔 reviewed weather
  sample 的纬度、fixedDays 与 Route routeType。
- I14 `insufficient` 仍返回成功的有限 base；`deterministicResult.verdict` 按 I16 为 null 或已有独立
  hard no-go，不改写成通用天气错误。

### 5.2 place-only 与 external/manual

- 用户必须明确 routeType，days 必须提供且只接受 1–7；不得使用 Place `activityTypeHint`。
- catalog Place 使用服务端参考坐标/高程；external/manual 只采用服务端 geocode 结果或当前请求中
  已校验的明确手动输入，仍标记 place-only。
- 可继续调用 legacy reference-point daily weather 和通用 gear；I16 固定返回
  `verdict:null/dataStatus:'place_only'`。不得生成 Variant、stages、route highest 或 full 来源声明。
- manual/user-selected climb 仍是 place-only，因此不强制 climbSupport。

### 5.3 blocked

- 合法 date/startTimeLocal/level 之后直接构造 blocked base；days 与 climbSupport 归一为 null。
- 不调用 daily/hourly weather、I15、日落或 gear rules；I16 仅用可信 restriction 输出
  `no_go/complete/official_route_blocked`。
- `minimumGear={essential:[],recommended:[],optional:[]}`，`weatherSnapshot=null`。

## 6. BaseData、TripContext 与过渡展示

`trip-base.js` 是可注入依赖的深模块，统一负责 target-to-BaseData 编排与一次性兼容展示投影；
`index.js` 只负责认证、public mode、resolver 分发、持久化和 advice 调度。BaseData 的权威字段为：

```js
{
  schemaVersion: 'beta_base_v1',
  requestSummary: { date, startTimeLocal, level, days, climbSupport },
  routeSnapshot: {
    entityKind, capability, placeId, routeId, routeVariantId,
    canonicalName, region, routeType, fixedDays, stages,
    referenceCoordinate, referenceElevationM, restriction
  },
  weatherSnapshot,
  deterministicResult,
  minimumGear: { essential, recommended, optional },
  sourceMetadata: { routeSourceIds, routeTypeSource, weatherSource, checkedAt }
}
```

不适用字段使用 `null`，不伪造事实：full 有三层永久 ID；place-only 的 route/variant/fixedDays/stages/
restriction 为 null；blocked 保留三层 ID 与 restriction，但 fixedDays/stages 为 null。

`TripContextStore.create` 精确改为 `create({openid,trustedBaseData})`，验证对象与
`schemaVersion='beta_base_v1'` 后深拷贝保存，不再重建 legacy place-only 投影。create 返回、数据库记录和
read 返回保持隔离副本；随机 queryId、openid 绑定和 30 分钟 TTL 不变。

I21 为当前 I20 renderer 与 I18 advice 暂时保留现有顶层兼容字段：
`route/date/level/days/elevation/location/coords/routeType/routeTypeSource/weather/sunEvents/gearRules/meta`。
它们必须在 `trip-base.js` 内由同一次服务端编排单向生成，不再次查询、不读取客户端 BaseData，也不
反向进入天气或结论。`minimumGear` 与兼容 `gearRules` 共享同一次 `getGearRules` 输出；后者完整保留
`fatalRisks/ruleNotes` 以满足现有 prompt/safety。full complete weather 从 I14 hours 按日生成只读
`tempMin/tempMax/precipProb/windMs/confidence` 摘要，insufficient 为 null；place-only 保留 reference
daily weather；blocked 为 null。full/blocked 的 `sunEvents=null`，因为 full 日落已在 I16 内求值且
blocked 不求值；place-only 可保留参考点 sunEvents。blocked 的兼容 gearRules 由 trusted
`official_route_blocked` 结果生成空装备、`fatalRisks:['官方禁行']` 与单条规则提示。
I22/I24 负责移除或最终收敛；I21 不修改 prompt/safety 形成第二条路径。

兼容字段固定映射：route/date/level 取 routeSnapshot/requestSummary；days 为 full fixed、place user、
blocked null；elevation/coords 为 full 最高点与最高 reviewed sample、place reference、blocked null；
location 为 region；routeType/routeTypeSource 取前述服务端映射；meta 精确为
`{source:'base',capability,dataStatus}`。full complete 的每个日摘要把该日所有样点小时展平：tempMin=floor
最低 temperatureC，tempMax=ceil 最高 temperatureC，precipProb=最高 precipitationProbabilityPct，
windMs=最高 windSpeedMs；该日存在 forecast_lead_time 原因则 confidence=`参考`，否则 `正常`。

place-only 优先使用可信/外部 elevation；缺失时调用现有 elevation lookup。lookup 失败不伪造海拔，
referenceElevationM/elevation 保持 null、weather unavailable；通用 gear 仅使用 `getGearRules` 的海拔 0
中性环境基线并追加“地点级参考，未按完整路线海拔评估”规则提示，0 不写入 routeSnapshot 或顶层
elevation。这样保留基础/类型装备，但不会把中性计算输入冒充路线事实。

模块生产出口精确为：

```js
createTripBaseBuilder({
  fetchRouteWeather, fetchReferenceWeather, getReferenceSunEvents,
  evaluateTripVerdict, getGearRules, now
}) -> {
  build({ target, request })
}
```

`target` 只允许 I13 的 `route_variant/full|blocked`，或 handler 规范化的 `place/place_only`。place-only
增加内部 `origin='catalog'|'amap'|'manual'`；catalog 保留永久 place ID，amap/manual 的 ID 为 null，只
携带已校验参考点。`routeTypeSource` 固定为 full/blocked=`builtin`、catalog/manual 用户选择=`user`、
外部地理编码且用户确认=`amap`。builder 不调用 resolver。`build` 返回
`{kind:'built',trustedBaseData}` 或 `{kind:'invalid',code,message}`，不返回 public response envelope，
不持久化，也不调用 AI。公共通用输入校验、resolver 和 errorResponse mapping 留在 `index.js`；
target-aware days/support/manual 编排由 builder 负责。

## 7. 前端与状态约束

- 保持 I20 十个状态和纯 reducer；不引入全局状态库或第十一状态。
- candidate validator 同时接受 I13 的合法 full 与 place-only 七字段组合，拒绝 blocked/畸形组合。
- place-only candidate 复用 `awaiting_route_type`；full candidate 直接确认，fixedDays 只读展示。catalog
  Place 的类型提交再次调用 confirm；AMap Place 只用原 route+类型再次 prepare；manual Place 才用
  原手工坐标+类型再次 prepare。
- `confirmationInput` 精确保留五项输入；confirm 不复制 candidate routeType/fixedDays/坐标。
- 新查询、候选取消、手动弹窗取消、返回和卸载继续推进/校验 token；迟到 prepare/confirm/advice 不得
  更新 UI、cache 或 history。
- `BASE_RECEIVED → base_ready → ADVICE_STARTED` 顺序不变；AI 失败仍保留确定性 base 并 degraded。
- `route_not_found` 与 `location_failed` 可打开无坐标的手动 fallback；其他不可重试输入错误保持 error。
- history schema 本任务不增加 time/support，且只在当前 token 的终态写入。

## 8. TDD 与验证

先注册并运行 `test:core-input-flow`，记录缺少 `trip-base.js` 模块/导出的一个真实 RED；随后实现最小
GREEN。聚焦测试至少覆盖：

1. full trek/climb/tour、place-only、manual/external、blocked 的 target-to-base 联通。
2. full 忽略客户端 days；place-only/manual 严格 1–7；blocked days/support 为 null。
3. 三种 climb support 到达 I16；缺失/非法只对 full climb 报错。
4. invalid date/time/level/days/support/manual place、route_not_found、confirmation 的零副作用计数。
5. I13 七字段 candidate、五项输入 snapshot、confirm 仅 ID 恢复与 place-only 类型选择。
6. full 原样 I14 snapshot、permanent IDs、gear trusted inputs；insufficient 仍返回 base。
7. blocked no-go/restriction/空 gear/null weather 与零天气/I15/日落调用。
8. TripContext 精确持久化 handler trusted BaseData、所有权/TTL/深拷贝与 advice queryId-only。
9. 页面默认值、请求透传、fixedDays 只读、十状态与迟到响应无副作用。
10. 现有 place-only fallback、AI degraded、私人 history 和 build 不回归。
11. full/place-only/blocked 均能通过 queryId-only advice，不进入 internal_error；compatibility gearRules
    与 minimumGear 三个数组逐项一致，且 AI 结果不能修改 deterministicResult。

最终必须通过：

```text
npm run test:core-input-flow
npm run test:response
npm run test:confirmation
npm run test:trip-context
npm run test:trip-flow
npm run test:route-resolver
npm run test:hourly-weather
npm run test:trip-verdict
npm test
npm run test:integration
npm run lint
npm run typecheck
npm run build:weapp
git diff --check
```

## 9. 非范围与禁止事项

- 不修改 I13 resolver/runtime catalog、I07 schema、pilot fragments、`data/routes.js` 或可信路线事实。
- 不修改 I14–I16 pure modules及阈值，不重解释天气或安全原因。
- 不修改 history schema/云函数、UGC、AI 权限边界或 queryId 所有权/TTL。
- 不实现 I22 结果页重构、I23 恢复控件、视觉大改、Taro 升级、部署、迁移或生产配置。
- 不新增状态库、主要依赖、哈希/SHA、客户端可信路线事实或重复 legacy/full 运行路径。
- 不为基本不可能的 case 建通用防御框架，不用机械覆盖率或 rubric 代替行为验证。

## 10. 自主决定、升级与交付

Terra 可自行决定 `trip-base.js` 内私有 helper 名称、函数顺序、测试 fixture 排版和 CSS 局部布局，
前提是不改变冻结出口、日天气摘要规则、公共请求、错误码、三类 target、BaseData 权威字段、状态数
与信任边界。

若需要修改 allowlist、公共字段/错误语义、resolver/schema、I14–I16、prompt/safety/history、主要依赖，
或发现无法在一个原子 PR 中保持 `main` 可用，必须停止交回 Sol。部署、不可逆操作、权限/隐私变化、
主要栈替换和 Goal 外产品取舍必须人工确认。

交付包必须包含：完成状态、实际文件、真实 RED/GREEN、测试命令与结果、计划偏差、自主实现决策、
限制、PR 和重点 Review 位置。Terra 只能提交 `READY_FOR_CONTROLLER_REVIEW`，不得批准或合并自己的 PR。

## 11. 当前下一步

合同已通过第三次聚焦独立 Review，P0–P3 无剩余 finding。规划 PR #90 已创建并等待 latest-head
quality；该 PR 不合并，实施模式不激活。等待人工明确
`继续` 后，Sol 才能合并规划 PR、创建实现分支并向 Terra 下发本合同。
