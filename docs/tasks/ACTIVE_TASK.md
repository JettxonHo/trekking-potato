# 当前活动任务

- Task ID: `I13`
- GitHub Issue: `#22`
- Title: 实现稳定 ID 的地点、路线与变体解析器
- Status: `IMPLEMENTATION`
- Mode: `IMPLEMENTATION`
- Owner: Sol XHigh
- Implementation Agent: Terra XHigh
- Branch: `codex/22-stable-route-resolver`
- Base: `main` at `5496956`
- Goal: `TP-BETA-001`

## 1. 目标与背景

把 I07 的 cold catalog 与六个已合并试点片段变成生产运行时可加载的静态目录，并提供一个无 I/O、
永久 ID、可注入测试的纯 resolver。它必须诚实区分：

- `route_variant/full`
- `place/place_only`
- `route_variant/blocked`

I13 冻结可信身份、搜索、消歧和旧 ID 兼容语义，但不改变当前公共 prepare/confirm 行为。I21 才会
原子接通前端输入、handler、小时天气、确定性结论和 TripContext；不得在 I13 形成半接线状态。

前置依赖已经满足：I08/I09/I11/I12 与 I10c 分别通过 PRs #79–#82/#87 合并，当前 production
catalog 应为 14 Sources、175 Places、6 Routes、6 Variants，其中 5 full、1 blocked。

## 2. 必读文件

执行 Agent 完成 `AGENTS.md` 的强制阅读顺序后，再阅读：

1. GitHub #22 的同步任务合同
2. `docs/architecture.md` 的 I07 catalog、I13 resolver 与 I21 staged-cutover 边界
3. `docs/development-plan.md` 的 I13 合同摘要和依赖关系
4. `docs/testing-strategy.md` 的 I13 production resolver contract
5. `cloudfunctions/getAdvice/domain/route-catalog.js`
6. `cloudfunctions/getAdvice/data/routes.js` 的 I05 matcher 与 `editDistance`
7. 六个 `cloudfunctions/getAdvice/data/catalog/pilots/*.js` 片段
8. `scripts/route-domain-contract-test.js`、`scripts/route-data-contract-test.js` 和
   `scripts/confirmation-contract-test.js`

## 3. 允许修改的文件

实现 Agent 只可修改：

1. `cloudfunctions/getAdvice/data/catalog/runtime-catalog.js`（新增）
2. `cloudfunctions/getAdvice/domain/catalog-resolver.js`（新增）
3. `scripts/route-resolver-contract-test.js`（新增）
4. `package.json`
5. `docs/current-status.md`
6. `docs/tasks/ACTIVE_TASK.md`

除非 Sol 先更新合同，不得修改其他文件。

## 4. 固定接口与行为

### 4.1 Production catalog

`runtime-catalog.js` 聚合：

- `BUILTIN_ROUTES`
- 六个已存在 pilot fragments
- I07 `createRouteCatalog`

模块不得访问网络、数据库、CloudBase、文件系统或环境变量，不新增依赖。它只导出
`createProductionRouteCatalog()`；每次返回一份经 I07 factory 验证的新 catalog，不导出调用方可
修改的共享 singleton，不修改 pilot fragment，也不复制它们的数据。

### 4.2 Resolver factory

```js
createCatalogResolver({ catalog }) -> {
  resolveQuery(query),
  resolveCandidateId(candidateId)
}
```

`catalog-resolver.js` 的生产导出精确为 `resolveRouteQuery` 和 `resolveRouteCandidateId`，二者绑定
模块私有的 production catalog；同时导出 `createCatalogResolver`，允许测试注入经
`createRouteCatalog` 验证的 synthetic catalog。resolver 不修改 catalog，也不把可变内部引用
交给调用者。可复用现有只读导出的 `editDistance`，但不得修改 I05 `data/routes.js`。

内部结果 union：

```text
direct       { kind: 'direct', matchStage, target }
confirmation { kind: 'confirmation', matchStage, candidates }
not_found    { kind: 'not_found' }
```

`resolveCandidateId` 的 direct `matchStage='candidate_id'`；兼容 ID 使用
`matchStage='legacy_candidate_id'`。

### 4.3 Trusted target

direct target 的公共内部摘要字段固定为：

```text
candidateId, entityKind, capability, canonicalName, region, routeType, fixedDays
```

并携带 I21 后续接线需要的服务端记录：

- full：`place`、`route`、`routeVariant`
- place_only：`place`，其他两者为 `null`
- blocked：`place`、`route`、`routeVariant`

full 的摘要使用永久 Variant ID、可信 Route `routeType` 和 Variant `fixedDays`。place-only 使用永久
Place ID，`routeType=null`、`fixedDays=null`；不得把 `activityTypeHint` 作为可信路线类型。
blocked 使用永久 Variant ID、Route 类型、`fixedDays=null`，并保留可信 restriction 于
`routeVariant` 内部记录，但不能把它暴露进 candidate DTO。

target 与其嵌套记录每次返回独立副本。只做必要的数据所有权隔离，不建立复杂冻结/代理机制。

### 4.4 查询与展开

查询必须是非空字符串，否则 not_found；不增加复杂文本规范化。阶段顺序：

1. 全局 canonical exact
2. alias exact
3. prefix
4. contains
5. fuzzy（query 长度至少 4，最小 edit distance `<=2`）

只使用第一个非空阶段。匹配名称来自 Place、Route、RouteVariant 的 canonicalName/aliases：

- Place 命中：优先展开该 Place 下的 full Variants；没有 full 时展开 blocked Variants；都没有则
  返回 place-only。
- Route 命中：优先展开该 Route 下的 full Variants；没有 full 时展开 blocked Variants。
- RouteVariant 命中：展开自身。

同一层级最终按永久 target ID 去重。canonical/alias exact 展开后只有一个 target 时 direct；多个
且全部可规划时 confirmation。若 exact 展开同时含 blocked 与其他 target，或含多个 blocked target，
返回 not_found，不静默放行也不把 blocked 暴露成候选。prefix/contains/fuzzy 只保留
full/place-only candidates，blocked 不得出现；若过滤后为空则 not_found。

alias exact 在展开去重后一个 target 为 `unique_alias_exact`，多个为 `repeated_alias_exact`。
canonical/alias/prefix/contains confirmation 均按 `canonicalName` Unicode 顺序、再按 ID；fuzzy 先按
最小距离，再按相同顺序。所有 confirmation 先去重排序，再截取最多五项。

### 4.5 Candidate DTO

confirmation 的每项必须精确只有：

```js
{
  candidateId,
  entityKind,
  capability,
  canonicalName,
  region,
  routeType,
  fixedDays,
}
```

只允许两种组合：

- `route_variant/full`：`variant:*`，routeType 为可信类型，fixedDays 为正整数
- `place/place_only`：`place:*`，routeType 和 fixedDays 均为 null

不得暴露坐标、高程、天气、Source 对象、restriction、legacy activity hint 或完整实体。

### 4.6 blocked 与旧 ID

- blocked 只允许 canonical exact、唯一 alias exact、永久 Variant ID 或兼容 ID 精确 direct。
- blocked 永不进入 prefix/contains/fuzzy 或 confirmation。
- 新查询和 confirmation 永不输出 `builtin-route:*`。
- `builtin-route:<canonicalName>` 通过对应 legacy Place 展开：唯一 full → full；仅 blocked →
  blocked；无子 Variant → place-only；多个 full → not_found，要求重新搜索而不静默选择。
- 永久 candidate ID 只接受 `variant:*` full/blocked 与 `place:*` place-only。Route ID、未知、畸形
  或已移除 ID 返回 not_found。

## 5. TDD 与测试要求

先添加 `test:route-resolver` 并运行，记录缺少 resolver 模块/导出的真实 RED；一个 RED 足够。
GREEN 测试至少覆盖：

1. production catalog 精确 `14/175/6/6`、`5 full/1 blocked`。
2. 真实党岭与武功山 Place/Route/Variant 名称展开并去重到唯一 full 永久 ID。
3. synthetic multi-Variant Place/Route 返回稳定 confirmation。
4. canonical exact 全局优先于 alias；唯一/重复 alias、prefix、contains、fuzzy 的首个非空阶段；
   canonical/alias confirmation 也使用冻结排序。
5. fuzzy 阈值、距离优先、名称/ID 稳定排序、去重后最多五项。
6. legacy 泰山等无子 Variant Place 为 place-only，null type/days，且不泄露旧事实。
7. 五台 Place/Route/Variant 精确解析为 blocked；非精确候选排除 blocked；synthetic exact 的
   blocked+其他 target 或多个 blocked target 返回 not_found。
8. 永久 ID 恢复服务端事实；旧 builtin ID 的 full/blocked/place-only 与多 full stale 语义。
9. candidate DTO 精确七字段且不含坐标、高程、天气、来源或 restriction。
10. 修改输入、一次 target/candidate/嵌套记录不会污染 catalog 或下一次解析。
11. registry/resolver 无网络、数据库和外部 I/O 依赖。

最终必须通过：

```text
npm run test:route-resolver
npm run test:confirmation
npm run test:response
npm run test:trip-context
npm run test:route-domain
npm run test:route-data
npm test
npm run test:integration
npm run lint
npm run typecheck
npm run build:weapp
git diff --check
```

## 6. 非范围与禁止事项

- 不修改 `index.js`、`geocode.js`、`data/routes.js`、TripContext、response contract 或当前 handler。
- 不修改前端页面、reducer、service、history、天气、结论、装备或 AI。
- 不修改 pilot fragment、I07 schema 或现有 I05 tests/四字段公共行为。
- 不新增公共 phase/error/input 字段；保留当前 public 请求键 `route`，输入演进属于 I21。
- 不引入数据库、缓存、网络查询、新依赖、哈希、slug/index ID 或数据迁移。
- 不把 blocked 当候选，不把 place hint 当可信 routeType，不从 legacy 坐标生成 full 路线事实。
- 不机械扩展 impossible-case 测试或通用安全框架。

## 7. 允许自主决定与升级条件

Terra 可自行决定局部 helper 名称、内部索引结构、文件内函数顺序、测试 fixture 排版和复制实现，
前提是不改变冻结接口、顺序、返回字段和边界。

遇到以下情况必须停止并交回 Sol：需要修改 allowlist；改变 result union、候选字段、ID/匹配/blocked
语义；需要公共 handler/UI 接线；需要新依赖或 Schema 变化；生产目录不能得到冻结计数；测试暴露
跨模块缺陷；无法在不降低验收标准下完成。

部署、生产配置、数据迁移、权限/隐私变化和不可逆操作不在授权内。

## 8. 验收与交付物

- production catalog 与纯 resolver 可由后续 I21 直接导入。
- 永久 ID、三种能力、搜索/消歧、blocked 和兼容 ID 语义全部由真实测试证明。
- 当前 public handler 与 I05 回归保持不变；没有中间态或双可信路径。
- 全部指定命令通过，无隐藏失败、Goal 外修改或未经记录的风险。
- Terra 返回结果包：完成情况、修改摘要、实际文件、RED/GREEN、命令结果、计划差异、自主实现
  决策、限制、PR 和重点 Review 位置。
- Terra 只可提交 `READY_FOR_CONTROLLER_REVIEW`；不得批准或合并自己的 PR。

## 9. 当前下一步

独立 Sol XHigh 合同 Review 已返回 `APPROVED`，P0–P3 均无剩余 finding。规划 PR #88 通过
latest-head quality 并 squash merged as `5496956`；GitHub #22 已同步且无 blocked 标签。
Terra XHigh 现在按本合同开始 test-first 实现，完成后只提交 `READY_FOR_CONTROLLER_REVIEW`。
