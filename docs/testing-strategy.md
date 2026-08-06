# 徒步薯核心 Beta 测试策略

- Goal: `TP-BETA-001`
- Status: `APPROVED`
- Updated: `2026-08-06`

## 1. 原则

- 测试用户可观察行为和稳定契约，不绑内部实现。
- Bug 修复必须有能捕获原回归的测试。
- 确定性规则优先使用纯函数和离线 fixture。
- 网络、CloudBase 与 LLM 在默认 CI 中使用 fixture/mock；现有 E2E 对 Open-Meteo 的实时调用必须在 I02 移除，不把 live API 或真实部署当门禁。
- 不设机械覆盖率百分比。新增或改变的关键行为必须有对应测试。
- 深层审计和红队脚本保留为按需诊断，不进入默认 CI。

## 2. M1 后统一门禁

```bash
corepack npm@10.9.2 ci
corepack npm@10.9.2 run bootstrap
corepack npm@10.9.2 run lint
corepack npm@10.9.2 run typecheck
corepack npm@10.9.2 test
corepack npm@10.9.2 run test:integration
corepack npm@10.9.2 run build:weapp
```

I02 的离线集成测试使用 `scripts/fixtures/open-meteo-forecast.js` 和
`scripts/mocks/cloudbase.js`：只允许受控的 Open-Meteo forecast URL 返回 fixture，其他
HTTPS GET 会使测试失败；`wx-server-sdk` 在加载云函数模块时替换为 mock。该测试覆盖
`tripDays` 1、2、3 和内置路线的 `trek` / `climb` 类型；它不调用 DeepSeek。

可单独运行的稳定验证脚本包括：

```bash
node scripts/route-type-contract-test.js
node scripts/weather-contract-test.js
node scripts/unit-test.js
node scripts/response-contract-test.js
node scripts/confirmation-contract-test.js
node scripts/advice-safety-contract-test.js
node scripts/e2e-local.js
```

I04 的 `test:response` 已纳入根 `test`。它覆盖每一种 `phase` 构造、error 的
`code/message/retryable`、互斥字段，以及当前 handler 的 missing/auth/invalid、
confirmation、route-type、base、advice/degraded 出口。断言兼容字段时只验证迁移
一致性，不把这些字段确立为最终 API。

I05a 新增离线 `test:confirmation`，覆盖全局 canonical 优先、唯一/重复 alias、
prefix/contains/fuzzy 候选、稳定 ID、candidate_not_found、confirm 只读服务端事实和
确认前零天气/规则/AI 副作用。I05b 在同一命令补充页面源码契约：候选显示、最小
confirm 请求、空/畸形候选失败、取消/编辑清理，以及仅 prepare/confirm 的组件私有
单调 generation；不借此建立 I20 reducer/service。

I06 新增离线 `test:safety` 并纳入根 `test`。它首先直接验证纯投影接口：恶意 AI
payload 不能删除、移动、改名或覆盖确定性装备和风险，不能注入 verdict、路线、天气或
meta；允许的 recommended/optional 追加按精确 item 去重；风险解释只能匹配现有风险并
按固定 risk/advice/“AI 说明”格式拼接；ruleNotes、AI notes 和降级提示按冻结顺序输出；
`invalid` 与 `unavailable` 均保留完整确定性内容，只在
`data.meta.degradedReason` 返回不同稳定原因；输入对象保持不变。handler 集成用例还必须
证明正常冲突输出和 AI 失败共享同一确定性核心，缺失/畸形装备数组、装备条目、
fatalRisks、ruleNotes 或 weather/sunEvents 形态时返回 `invalid_base_data` 且 LLM 零调用，
Prompt 不读取 event 中重复的路线事实。页面源码契约验证 base 立即以同一固定格式初始化
最低装备/风险、加载态不遮挡它们，以及 advice 传输失败保留前一结果。全部测试离线，不
调用真实 DeepSeek、CloudBase 或天气服务；还要断言纯投影 data 的固定字段集合、固定
disclaimer 以及 caller-only meta，防止未知 AI 字段通过新出口回流。

I06 implementation keeps this split explicit: `test:safety` owns direct pure-projection behavior,
while `test:response` owns offline handler and page-source integration assertions. `test:integration`
only updates its existing advice-degradation fixture to ensure an unavailable AI retains deterministic
gear and risks.

I07 已新增离线 `test:route-domain` 并纳入根 `test`。测试只穿过
`createRouteCatalog/getById`：

- 全量 175 条 legacy 输入必须得到 175 Place、0 Route、0 Variant，全部 place-only 且
  `sourceStatus=legacy_unverified/sourceIds=[]`；名称、规范化后的别名、地区、参考坐标、
  活动类型提示和旧 I05 ID 可追溯，但新实体不存在
  stages、采样点、路线最高点或 blocked 推断。
- 最小合法 full fixture 覆盖三层引用、A/B 来源、fixedDays/stages、连续 day、1–3 个采样
  点、stage 引用和独立 route-highest 字段；最小 blocked fixture 在没有行程字段时仍可
  表达权威禁行且不能成为 full。
- 空稳定后缀/错误命名空间/重复 ID、悬空 place/route/source/sample 引用、C full、日程
  不一致、采样数量错误、blocked 缺失权威 access-status 证据，以及只给 nearby peak 而缺
  路线最高点都返回稳定 `invalid_route_catalog` 内部错误。
- full 的每个核心字段必须至少由一个 tier A/B Source 覆盖；全 C evidence、零天或空 stages
  必须失败。legacy alias 在单个 Place 内 trim/去重/去自身名，但跨 Place 重复 alias 保留。
- factory 不修改输入；普通 ID miss 返回 null。测试不绑定内部 Map、排序或复制实现。
- 既有 route-type、confirmation、response、unit、integration 全部继续运行，证明 I05
  四字段候选、`builtin-route:*`、confirm 和运行时行为没有变化。

I10a 已建立离线 `test:route-data` 入口并纳入根 `test`。共享 runner 汇总各路线的独立数据
断言文件，与现有 `BUILTIN_ROUTES` legacyRecords 聚合后调用 I07 `createRouteCatalog`。
首个五台山用例固定验证 tier A blocked 记录、权威 Source 与
restriction/operationalStatus evidence 的连接、禁止 full 行程字段，以及官方未披露边界的
`effectiveFrom/effectiveTo=null` 和核验日期；还直接证明 tier B restriction source、缺
restriction evidence 与 blocked 记录偷加 full 字段均被拒绝。后续每个 full 路线 Issue 只能
新增自己的数据和断言文件，不并发修改 runner。来源页可访问性不作为默认 CI 的实时网络门禁；
CI 验证入库的来源元数据和领域契约，人工/发布前清单负责复核动态运行状态。

## 3. 测试层级

- 单元：路线匹配、Schema、坐标、天气解析、活动窗口、结论、装备合并、reducer。
- 契约：prepare/confirm/advice union、错误码、单位、日期和 TripContext。
- 集成：mock CloudBase/Open-Meteo/DeepSeek 的完整编排。
- UI 状态：确认、取消、重复提交、迟到响应、降级和恢复，通过纯 reducer/服务测试覆盖。
- 构建：Taro 微信生产构建。
- 人工清单：微信开发者工具与真机待人工授权执行；清单准备是 Goal 要求，真实执行不是。

## 4. 关键矩阵

### 路线确认

- I05 过渡期：全局规范名精确直达；无规范名命中时唯一别名精确直达；重复别名、
  前缀、包含和模糊只返回候选。
- I05 候选只展示 ID、`canonicalName=name`、`region=location` 和 `routeType=type`；
  不展示坐标、海拔、天气或客户端可修改的路线事实。
- I05 候选只取第一个非空匹配阶段，去重/排序后最多五条；确认只提交 ID。
- 确认前无天气、规则、AI、缓存、历史。
- 确认提交 candidate ID，服务端恢复可信事实。
- 取消、修改和新提交清除 I05 候选；迟到 prepare/confirm 不覆盖新状态。
- `route_type_required` 不与 confirmation 混淆。

### I07 后最终候选

- 候选在 I05 四字段上以加法补齐 `entityKind`、`capability` 和典型天数。
- place-only 确认保留并校验用户 1–7 天；RouteVariant 忽略自由天数并使用 fixedDays。
- candidate 只允许 route_variant/full 或 place/place_only 两种组合。
- I05 无状态 candidate ID 只验证未知/已移除记录；TTL 与 openid 归属在 I17 验证。

### 路线模型

- 地点、路线、变体 ID 唯一且引用有效。
- `nearbyPeakElevation` 不写入路线最高点或天气海拔。
- fixedDays 与 stages 一致；采样点 1–3 个且逐日引用有效。
- A/B verified 记录必备字段完整；C 级或 place-only 不产生结论。
- 五台山 blocked 记录不可规划。
- I07 只验证 cold catalog；生产搜索、永久 candidate ID 和 blocked 精确解析由 I13 覆盖。

### 天气与结论

- 时区、日期、活动小时和多采样点长度一致。
- 夜间雷暴不影响白天窗口；活动小时单点雷暴触发 no_go。
- 阵风 13.4/22、体感 32/41/-29/0、能见度 50、新雪 15、降水 40 边界。
- 降水概率单独不改变结论。
- 提前量 5 天为 caution。
- 小时缺口、单位错误或必要采样点失败 → `verdict=null`。
- climb + 新手 + solo → no_go；有经验队伍或向导 → 至少 caution。
- trek/tour 新手在安全完整天气下不机械降级。

### 可信上下文和隐私

- advice 只接受 queryId。
- 上下文按 openid 隔离，过期后要求重新 prepare。
- 客户端伪造 weather/routeType/baseData 不影响可信结果。
- 私人历史只返回当前 openid；支持单项删除和清空。
- 手动地点查询不产生公共 UGC；旧公共数据不进入解析路径。

### 状态与降级

- base 先显示，AI 后补充。
- AI 失败不删除 verdict、reasons、天气或最低装备。
- 天气失败显示有限路线结果和重试。
- 历史失败不影响本次结果。
- request token 阻止旧响应覆盖新查询。
- 页面卸载后不继续更新状态。

## 5. PR 验证要求

GitHub Actions workflow `quality` runs for every pull request. Its sole job is
also named `quality`; it uses Node 24, Corepack npm 10.9.2, and the npm cache
keyed from the root, Taro, and two CloudBase function lockfiles. The workflow
runs the complete M1 command sequence above without changing those commands.

PR 描述列出实际命令、退出码和结果摘要。无法运行的命令必须写明原因及影响，不能写成通过。Sol XHigh 会阅读测试本身，不能只凭通过数量批准。

## 6. M7 人工验证清单

- 五个试点各完成一次输入到结果流程。
- 模糊候选的确认、取消和修改。
- 天气、AI、历史分别模拟失败。
- 装备 checklist 勾选与重新查询。
- 来源、时间、置信度和地点级限制可见。
- 微信生产构建可被开发者工具导入。
