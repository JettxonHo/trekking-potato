# 徒步薯核心 Beta 测试策略

- Goal: `TP-BETA-001`
- Status: `APPROVED`
- Updated: `2026-08-07`

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
fatalRisks、ruleNotes 或 weather/sunEvents 形态时返回 `invalid_base_data` 且 LLM 零调用；这是
I06 客户端迁移阶段的历史回归，I18 后公共 advice 不再接收或校验 client BaseData，
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

TP-D039 后的 full 试点测试采用同一 seam，并额外固定以下代表性行为：

- `reviewed_gpx` Source 必须为 tier B，逐字段说明 direct/derived 方法；单一完整社区 GPX
  可以覆盖其实际路线的几何，不要求官方 GPX或机械的第二轨迹。
- 每个 Variant 的名称、fixedDays、stage 点序和类型必须与该 GPX 实际记录一致；旧 exact
  pilot 的名称、天数、距离和海拔不得残留。
- 测试断言分日距离/升降与总量在明确舍入规则内一致、最高点来自清洗后的有效轨迹点、每个
  stage 引用 1–3 个已核对坐标系的实际采样点。
- GPX 不能把状态写成 `open`；无路线级管理事实时固定为 `unknown`，五台官方 blocked 记录
  仍单独验证且不进入 full 候选。
- 原始 GPX、平台账号、轨迹 ID 和个人时间不进入 fixture 或快照；CI 只验证派生静态数据和
  来源声明，不引入网络下载或第三方平台依赖。

I14 新增独立离线 `test:hourly-weather` 并纳入根 `test`；既有 `test:weather` 的 86 项
legacy 单点日天气契约保持不变。测试使用经 I07 `createRouteCatalog` 验证的最小合成 full
Variant 和注入式 `requestJson` fixture，不写入任何真实 pilot 数据，也不访问网络。

- 两日三采样点场景：D1 引用 A/B、D2 引用 B/C，证明每个 unique sample 只请求一次，
  每日复用统一出发时间，并按各自 `durationHours.max` 而非 min 生成窗口。
- 小时桶边界：半开活动区间只选择相交的整点桶；瞬时字段取桶起点，前一小时的降水
  概率、降水、降雪和阵风取桶终点；精确结束不多取下一桶，跨午夜保留原 stage day。
- 请求契约：只含规定 hourly 字段，显式 `Asia/Shanghai`、Celsius、mm 和 m/s；WGS84
  原样使用，GCJ-02 经共享纯函数转换，每点使用自己的 elevation。
- 响应契约：timezone、ISO time unit 和十项天气 `hourly_units` 精确匹配，数组对齐，活动桶所需值有限数。
  完整输出还要精确断言 normalized `units` 对象，以及 stage windows 和 stage sample IDs 的
  输入顺序；不把上游单位检查误当成输出契约检查。
  不机械地为每个字段复制同型坏例；一个单位反例、一个数组错位、一个活动桶缺口和一个
  非数值反例证明通用守卫有效。另用一个非法 WMO 码和一个代表性的概率越界/负气象量
  证明语义域守卫，不为所有字段复制相同测试。
- 失败原子性：一个必要 sample 网络失败、API 明确 out-of-range 或结构/单位错误时，整体
  为 `insufficient` 且没有部分小时数据；逐 sample 固定 reasons 和 retryable 语义。
  insufficient 的 evaluatedWindows 只能含 day/date/起止/duration/samplePointIds 六类
  审计元数据，不含 samples、hours、坐标或读数。
- 范围隔离：夜间未与活动区间相交的危险值不进入快照；I14 不测试 I15 阈值、I16 日落/
  climb 组合、公共 handler、AI 或 UI。

真实 TDD 首个 RED 为 `test:hourly-weather` 缺少实现模块或导出；一个真实 RED 足够，不为
流程表演制造第二个失败。GREEN 后必须运行 hourly/legacy weather、route-domain、root test、
integration、lint、typecheck、WeChat build 和 `git diff --check`。

### I15 weather-only verdict contract

I15 测试通过注入式 I14 `fetchRouteWeather` 取得 complete snapshot，再调用纯
`evaluateWeatherVerdict`；不手写另一套生产天气 shape，不访问网络。首个真实 RED 是
`test:verdict` 缺少模块或导出，一个 RED 足够。

- 基线：安全 complete snapshot 为 `go`；降水概率单独为 100% 仍为 `go`；non-complete
  输入不得被静默判成 `go`。
- 精确边界：阵风 `13.399/13.4/21.999/22`，体感
  `31.999/32/40.999/41/-29.001/-29/-28.999/0`，能见度 `50.001/50`。
- WMO：表驱动覆盖雷暴、冻雨和普通雨雪集合；中大雪与 `13.4m/s` 阵风或 `50m`
  能见度组合为 no_go，并验证同桶泛化原因抑制。
- 连续：重雨码 `65/82` 两桶、三个相邻桶和中断；不得跨 sample 或 stage 拼成连续三小时。
- 累计：单 stage/sample 活动桶 `39.999/40mm` 和 `14.999/15cm`；不跨 sample/stage
  拼接，同 stage 跨午夜可累计。测试和文案不得将其称为完整 24h/自然日累计。
- 聚合：任一 sample 可升级结论且不被其他安全点抵消；同日同 code 的危险观测选择、跨日
  保留、固定排序、输入不变和重复调用完全一致。
- 范围：不测试 I16 的 official blocked、climb support、预报提前量、日落或
  `insufficient/place_only → verdict=null` 组合。

GREEN 后运行 `test:verdict`、hourly/legacy weather、route-domain、root test、integration、
lint、typecheck、WeChat build 和 diff check。不为 I14 已保证的每种坏字段复制防御测试。

### I16 trip-level verdict contract

I16's offline `test:trip-verdict` composes I14-derived complete and insufficient snapshots with I15.
The first real RED is a missing `trip-verdict` module/export. Astronomy edges use an injected local
sunset seam; tests do not depend on a real date's solar output or any network.

- Terminal capability: official blocked is no-go and calls neither I15 nor sunset; place-only is
  `null/place_only`; full insufficient is `null/insufficient` and skips both evaluators.
- Weather preservation: I15 go/caution/no-go outcomes and reason objects remain unchanged within the
  final stable sequence.
- Climb table: all 3 levels x 3 support choices; only novice solo/unsure adds the climb hard no-go,
  the other eight remain at least caution. trek/tour stay weather-driven even if support is supplied.
- Lead time: `fetchedAt` near Shanghai midnight proves the per-route-day 4/5-day boundary without
  using host timezone or client time.
- Sunset: finish equal to sunset, one minute later, cross-midnight, multiple-sample earliest/tie order,
  and one unavailable sample. Coordinates asserted at the seam are exactly I14 WGS84 values.
- Precedence: known hard no-go survives unavailable data; caution does not turn unavailable into
  danger. Weather issues and sunset issues are data facts without severity.
- Quality: exact reason/data-issue ordering, repeatability and deep input immutability. One internal
  invalid-climb-support guard plus one route-kind/level/weather boundary assertion are sufficient;
  do not replicate impossible-case defenses for every nested field.

GREEN 后运行 trip-verdict、verdict、hourly/legacy weather、route-domain、root test、integration、
lint、typecheck、WeChat build 和 diff check。公共 handler、queryId、真实路线、AI、装备和 UI
仍不属于 I16 测试。

### I17 TripContext contract

I17 is serial: #60 proves the deep store, then #61 proves public base creation. `test:trip-context`
starts with a genuine missing-module/export RED and uses one minimal in-memory CloudBase-compatible
collection; no network or real database is used.

- ID/TTL: two default creates yield distinct `tctx_<uuid-v4>` IDs; a fixed server clock proves exactly
  1,800,000 ms. Read at expiry minus 1 ms succeeds and equality expires.
- Ownership: owner succeeds; unknown, cross-user and expired records return their exact internal code
  with no snapshot. One case each is sufficient; do not expand into token-attack testing.
- Format boundary: one malformed queryId returns not-found without calling the collection query. This is
  a focused operation-boundary test, not an entropy or attack rubric.
- Isolation: mutate the input, created snapshot, one read result and mock database result in turn;
  later reads retain the originally persisted nested facts.
- Availability: one write rejection and one read rejection map to store-unavailable without raw errors;
  the module never deletes records or silently retries.
- Snapshot: exact additive place-only BaseData shows legacy compatibility plus request, route,
  reference-point weather, null verdict, minimum gear and source metadata; no full-route fact appears.
- Handler lifecycle: successful prepare/base alias/confirm each write exactly once through
  `collection('trip_contexts').doc(queryId).set({data: record})`, expose matching top-level ID/expiry and
  reuse the store's returned projection unchanged. `baseResponse` rejects a call that lacks context
  metadata. The mock rejects a wrong collection or write operation. Confirmation, route-type-required,
  auth/validation/weather errors and advice write zero contexts; I17 performs zero context reads in
  the handler.
- Write failure returns retryable `context_unavailable` with no partial base. Client-spoofed safety facts
  do not enter the stored snapshot. Existing advice still consumes client baseData until I18, and the
  test names that as a compatibility limitation rather than trusted behavior.

After each child, run trip-context, response, confirmation, I16/I15/I14, legacy weather, route-domain,
root test, integration, lint, typecheck, WeChat build and diff check. Mocks implement only operations
needed by the active code; no external emulator or mechanical entropy score is introduced.

### I18 queryId-only advice contract

I18 使用一个原子实现 PR。`test:response` 的内存 `trip_contexts` mock 扩展为能按
`where({_id}).limit(1).get()` 读取 I17 创建的记录，但不建立外部数据库或双可信兼容路径。
先提交真实 RED，再按服务端、前端、完整矩阵转绿：

- prepare 获得真实 queryId，owner 只发送 `{mode:'advice', queryId}` 即成功；Prompt 与投影
  中的路线、天气、装备、风险均来自已存 snapshot，read 恰好一次。
- 在旧 `baseData/route/date/level/days/weather` 属性上设置一个会抛错的 getter；请求仍成功。
  这个聚焦用例证明入口与 handler 都不再读取客户端事实，不扩展为攻击排列组合。
- unknown、foreign、expired 各一例，公共 envelope 完全一致为不可重试
  `query_context_unavailable`，无 data、无 LLM；读取异常一例返回可重试
  `context_unavailable`，同样无 data、无原始错误和 LLM。
- 可信 context 下 AI 失败仍返回 `phase:'advice'`、`degraded:true`，确定性内容来自 snapshot。
- confirm/prepare 保持零 context read；I17 的创建、TTL、归属、完整性与深拷贝测试不修改。
- 页面源码合同要求 advice 请求字面量只有 mode/queryId，表单 history 参数不进入网络体也不
  保存 queryId，并且 success/fail 都先检查 generation，迟到 advice 不能覆盖新查询。
  `query_context_unavailable` 必须有独立分支：保留确定性 base、显示重新查询消息、不设置
  degraded、不追加 `AI_UNAVAILABLE_NOTE`、不写 history，并证明结果视图内消息与既有返回动作
  可见；不得让当前 generic advice-error 分支吞掉该语义。

I18 implementation has run `test:trip-context`、`test:response`、`test:confirmation`、root test、
integration、lint、typecheck、WeChat build 和 diff check successfully before controller review；不增加
哈希、token 熵、机械覆盖率或不成比例的 impossible-case 防御。

### I19 private history and UGC shutdown contract

I19 已把现有 `scripts/security-test.js` 收敛为聚焦 history/privacy 的 `test:history`，并纳入
默认 `npm test`。实现记录了两个真实 RED：旧 list 透传数据库字段而不能满足显式 DTO，旧 geocode
即使在 routes 读取异常后回退 AMap 也仍触达公共集合；最小 GREEN 分别收敛为 DTO 与零读取。测试证明：

- A/B 用户保存和读取严格隔离，伪造客户端 openid 无效，公共 DTO 不包含数据库内部字段。
- 自有单删只在 `stats.removed===1` 时成功；零删除对他人和未知 id 的公开结果相同且不影响
  对方记录；clear 返回实际删除量且只删除当前用户，空 clear 成功，预置 routes 数据保持不变。
- save/list/delete/clear 各一个代表性存储失败统一为通用 `history_unavailable`；不扩展成异常
  排列组合。
- 旧 `saveRoute/listRoutes` 固定 `ugc_disabled` 且对 routes 零访问；内置可信匹配未命中后
  geocode 直接走 AMap，confirmation 路径不读取公共 UGC。
- 页面无 `saveRoute`，queryId 不入 history；首次保存失败后同一参数仍会再次调用服务端；历史
  失败不阻断主结果或清空已有列表，单删和清空只在成功后改变本地列表，删除控件不触发
  restore，清空有一次确认。
- 普通 advice 失败保存确定性降级摘要，`query_context_unavailable` 保持零 history。

实现已运行 `test:history`、route、confirmation、response、integration、root test、lint、
typecheck 与 diff check。本沙箱的 WeChat build 会触发 macOS `system-configuration` panic 并挂起；
Sol 在沙箱外以 `env CI=1 npm run build:weapp` 验证 exit 0；最新返工 head 的 Webpack 5.32s 成功。未改变依赖或
构建配置来规避该环境现象；deep/redteam/live 网络脚本不进入默认门禁。

## 3. 测试层级

- 单元：路线匹配、Schema、坐标、天气解析、活动窗口、结论、装备合并、reducer。
- 契约：prepare/confirm/advice union、错误码、单位、日期和 TripContext。
- 集成：mock CloudBase/Open-Meteo/DeepSeek 的完整编排。
- UI 状态：确认、取消、重复提交、迟到响应、降级和恢复，通过纯 reducer/服务测试覆盖。
- 构建：Taro 微信生产构建。
- 人工清单：微信开发者工具与真机待人工授权执行；清单准备是 Goal 要求，真实执行不是。

### I20 reducer and service contract

I20 新增 `test:trip-flow` 并纳入默认 root test。核心测试直接加载纯 reducer 与注入 fake 的
getAdvice service，不以页面字符串扫描代替状态行为。代表性矩阵覆盖：10 状态初值与合法主路径、
base_ready 先于 advice、normal/degraded/context-unavailable 分流、缓存恢复、RESET/取消/返回推进
token、旧 success/failure 同对象 no-op，以及 prepare/confirm/advice 精确请求体。它还直接证明
`location_failed`/本地手动 fallback 可携带 error 进入唯一的 `awaiting_route_type`，不增加状态或
字段。只为页面接线保留少量静态断言：生产 getAdvice 不再直调、旧 lifecycle flags（包括
`showManualCoords`）和 `_requestGeneration` 已移除，history 局部路径保持。不要机械排列每个状态与每个事件。

I20 不测试 I21 的新输入交互、I22 的新结果视觉或 I23 的重试控件；这些在各自 Issue 验收。
I20 不机械测试尚不存在的通用 RECOVER；I23 的每个异步恢复动作必须另行证明先推进 token。

I20 implementation 的首个真实 RED 是 `test:trip-flow` 缺少 `trip-flow` 模块；GREEN 直接覆盖
reducer、注入 service 和最小页面边界。它证明 base_ready 先于 advice、normal/degraded/context
unavailable 分流、new query/RESET/候选取消/手动取消/onBack 的 token no-op，以及 token 和卸载标记
阻断迟到的 UI/cache/history side effect。`test:confirmation` 与 `test:response` 只更新了既有页面
静态 seam，移除了已退役 `_requestGeneration` 断言；核心竞态行为只由 reducer 直接验证。

### I21 依赖门与未来矩阵

I13 未合并时不新增 I21 生产测试或控件：没有可信 resolver 的“前端字段通过”不能证明
输入影响了天气、结论或快照。I13 合并后，I21 的代表性垂直矩阵必须同时证明：

- `date/startTimeLocal/level/days/climbSupport` 的客户端提示与服务端严格校验，输入失败时
  不执行天气、规则、AI、TripContext 或 history 副作用。
- full Variant 只使用服务端 `fixedDays`，忽略客户端自由天数；place-only/手动地点仍严格保留 1–7 天。
- climb 的三种 support 都可通过，缺失/非法 support 为 `missing_climb_support`；trek/tour 不强制。
- confirmation 快照保留全部输入，confirm 仍只用 candidate ID 让服务端恢复路线事实；advice 仍只有 queryId。
- place-only 仍为 limited/null verdict；I20 token 竞态、I19 history 和 I18 信任边界不回归。

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
- 阵风 13.4/22、体感 32/41/-29/0、能见度 50、活动窗口新雪 15、活动窗口降水 40 边界。
- 降水概率单独不改变结论。
- 提前量 5 天为 caution。
- 小时缺口、单位错误或必要采样点失败 → `verdict=null`。
- climb + 新手 + solo → no_go；有经验队伍或向导 → 至少 caution。
- trek/tour 新手在安全完整天气下不机械降级。

### 可信上下文和隐私

- advice 只接受 queryId。
- 上下文按 openid 隔离，过期后要求重新 prepare。
- 客户端伪造 weather/routeType/baseData 不影响可信结果。
- 私人历史只返回当前 openid 的显式 DTO；支持单项删除和清空，跨用户操作不可区分也不生效。
- 手动地点查询不产生公共 UGC；旧 UGC mode 明确停用，旧公共数据不进入解析路径且不被删除。

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
