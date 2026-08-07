# 徒步薯核心 Beta 架构

- Architecture scope: `TP-BETA-001`
- Status: `APPROVED`
- Updated: `2026-08-07`

## 1. 系统边界

- `taro-app/`：实际微信小程序前端。
- `cloudfunctions/getAdvice/`：路线解析、天气、规则、短期上下文和 AI 编排。
- `cloudfunctions/history/`：仅私人历史。
- `miniprogram/`：历史原生原型，不是生产入口。

依赖方向为 UI → 云函数契约 → 领域/规则纯模块 → 外部 API。LLM 位于解释层，不能反向覆盖领域事实或规则结果。

## 2. 领域模型

```text
Source
  id, tier, kind, title, publisher, url, checkedAt
  supports[] { field, method, note? }

Place
  entityKind='place', capability='place_only'
  id, canonicalName, aliases, region, kind
  referenceCoordinate { lat, lon, coordinateSystem }
  sourceStatus, sourceIds[]

Route
  entityKind='route'
  id, placeId, canonicalName, aliases, routeType
  summary, sourceIds[]

RouteVariant (verified/full)
  entityKind='route_variant', recordStatus='verified', capability='full'
  id, routeId, canonicalName, aliases, direction
  startPoint, endPoint, isLoop
  fixedDays, stages[]
  distanceKm, ascentM, descentM
  routeHighestPointElevationM, nearbyPeakElevationM
  weatherSamplePoints[1..3]
  accessMode, operationalStatus
  sourceIds[], sourceCheckedAt, verificationLevel

RouteVariant (blocked)
  entityKind='route_variant', recordStatus='blocked', capability='blocked'
  id, routeId, canonicalName, aliases
  operationalStatus='blocked', restriction
  sourceIds[], sourceCheckedAt, verificationLevel
```

`stages[]` 包含 day、起终点、距离、升降、`durationHours.min/max` 和关联采样点。
`weatherSamplePoints[]` 含独立 ID、名称、坐标、坐标系和海拔。附近山峰海拔不得代替
路线最高点或天气采样海拔；校验要求 full 变体显式提供路线最高点，不能用附近峰值兜底。

`distanceKm/ascentM/descentM` 描述从变体起点到终点的完整行程几何，不等同于
用户纯步行负荷。`accessMode='mixed'` 时，索道/景区交通段必须在路线摘要和来源
说明中明示，界面也必须同时展示 access mode；不得把索道垂直高差或终点净高差
直接当作全行程累计爬升。若来源不能覆盖完整几何，该 full 变体保持阻塞，不为
混合路线另造一套模糊的体力指标。

来源：A 为官方/政府/协会/API；B 为两个可靠独立来源或经主控审阅的社区 GPX；C 为未验证
输入。官方没有 GPX 是正常情况，不把“官方轨迹”设为门槛。`Source.supports` 逐字段记录直接
或推导证据；推导项必须写明方法，但不计算加权总分。只有 A/B 且核心字段完整的 full 变体
可输出路线结论。

### 社区 GPX 证据边界

- 经 Sol 审阅后，社区 GPX 记录为 `tier='B'`、`kind='reviewed_gpx'`，一份完整且身份清楚的
  轨迹即可支持它实际记录路线的方向、起终点、分日、距离、升降、参考时长、路线最高点和
  天气采样点；不机械要求第二条同路线轨迹。
- 规范名按轨迹真实点序和活动方式定义。GPX 与旧试点不同就建立替代 Variant，不跨路线拼字段。
- GPX 不能证明当前开放、许可、强制向导或禁令范围；这些事实由 A 级管理来源决定。未找到
  路线级当前状态时可记录 `operationalStatus='unknown'`，其含义是“尚未证明”，不是默认开放。
- GPX 分日按 `Asia/Shanghai` 的实际活动日划分；无效高程、跨夜间隔和疑似交通段必须在各
  路线审计中明确处理。坐标系必须在入库前结合 GPX 规范与实际地标完成一次合理交叉核对。
- 原始文件不进入仓库。Source 可使用 `url=null`，并通过 `checkedAt`、去标识化标题和
  `supports.method='derived'` 回链到持久审计；不得保存平台账号、轨迹 ID 或个人精确时间。

`operationalStatus` 为 `open | blocked | unknown`。只有仍有效、来源明确的 `blocked` 触发硬阻断；`unknown` 显示核验提示但不自动降级。
blocked 的 `effectiveFrom/effectiveTo=null` 只表示官方来源未披露对应边界，不表示永久
禁令；`sourceCheckedAt` 必须跟随记录并在上线/闭测前重新核验。静态条目不得从旧公告
推导当前状态。

### I07 冻结目录边界

I07 新增一个无 I/O 的深模块：

```js
createRouteCatalog({
  legacyRecords = [], sources = [], places = [], routes = [], variants = []
}) -> {
  sources, places, routes, variants,
  getById(id) // 未命中返回 null
}
```

模块内部完成规范化副本、legacy 适配、引用索引和一次性校验；只导出 factory 与供测试
识别的 `RouteCatalogValidationError`。无效静态目录抛出
`code='invalid_route_catalog'`，`issues` 只记录稳定 `code/path`。这是构建期内部错误，不新增
公共 phase 或错误码，也不建立复杂运行时降级树。

新 Source/Place/Route/Variant ID 必须在数据文件显式提供，分别使用 `source:`、`place:`、
`route:`、`variant:` 命名空间；不得由数组下标、哈希或展示名称生成。legacy 例外使用冻结
身份 `place:legacy:<canonicalName>`，并保留现有 `builtin-route:<canonicalName>` 作为内部
兼容引用；I07 不把任一新 ID 暴露给客户端。

full 与 blocked 是 RouteVariant 的判别式记录：

- full 只允许 A/B，必须有正整数 fixedDays、非空完整日程、连续 day、1–3 个采样点、有效
  采样引用、逐核心字段 A/B 证据和独立路线最高点；`fixedDays === stages.length`。
- blocked 只表达禁行身份、理由、范围、有效期和 tier A 权威 access-status 证据，不要求也
  不得伪造 stages、距离、最高点或采样点；它不进入可规划候选。
- C 级、旧数据和字段不完整资料不能伪装成 full。Place 自身始终是 `place_only`。

175 条 `BUILTIN_ROUTES` 在 I07 只适配为 175 个 `legacy_unverified` Place，输出
0 Route 和 0 Variant。只映射名称、别名、地区、GCJ-02 参考坐标和非权威活动类型提示；
adapter 对每个 Place 内的 alias 做 trim、去重并删除等于 canonicalName 的 alias，但保留
跨 Place 重复 alias 供 I13 消歧。旧 `elevation/bestSeason/note` 不进入新领域事实，也不得
从自由文本推断 blocked。
`data/routes.js` 继续服务 I05 运行时，因此当前 prepare/confirm、四字段候选、临时 ID、
天气、装备和结果完全不变。

I07 不提供 query resolver，不修改 `routes.js`、`geocode.js` 或 `index.js`，不创建空的试点
注册表。I08–I12 可各自在独立数据文件调用同一 factory 验证；I13 再建立生产目录聚合、
同名优先级、永久候选 ID、blocked 精确解析和旧 I05 ID 兼容窗口。

### I10a 起的静态数据 seam

每个试点文件位于 `cloudfunctions/getAdvice/data/catalog/pilots/<slug>.js`，只导出
`{ sources, places, routes, variants }` 的普通数据片段，不自建 catalog、不做 I/O、不执行搜索。
`scripts/route-data-contract-test.js` 用既有 `BUILTIN_ROUTES` 作为 legacyRecords，聚合已入库
的试点片段后只调用一次 `createRouteCatalog`；`scripts/route-data/<slug>.test.js` 保留每条
路线的证据与字段断言。I13 将复用同一片段格式建立生产聚合，不要求数据
Issue 提前编写 registry。

I10a 的 blocked 记录引用现有 `place:legacy:五台山朝台` 作为地点容器；它不使用旧
海拔或坐标，也不把该 Place 升级为 verified。这让限制事实在不伪造新 Place 参考
坐标的情况下可以独立验证。原 I10b 小朝台 full 目标已被 TP-D039 取代；#77 负责选择
第五条社区 GPX 试点，不能把受限的五台多台顶轨迹重新包装为可规划路线。

I08 的武功山替代 Variant 同样复用现有 `place:legacy:武功山反穿` 作为稳定地点容器，避免
再创建一个同名 Place。新 Route/Variant 的几何、类型、天数和样点只来自 reviewed GPX；
不得消费 legacy Place 的旧海拔、坐标、季节、note 或类型提示。I13 需要把该 Place 下唯一的
verified Variant 解析为 full，而不是停留在 place-only。

## 3. 路线解析

匹配顺序：

1. 规范名称精确匹配
2. 别名精确匹配
3. 前缀/模糊候选

规范名精确匹配在整个目录中优先；没有规范名命中时，唯一别名精确匹配可继续定位，
重复别名必须确认。只有唯一可规划 RouteVariant 才直达 base。Place 具有多个 verified
变体或输入需要消歧时返回候选列表。候选只暴露稳定 ID、名称、地区、类型和典型天数。
用户确认后提交 ID，服务端重新读取可信记录；客户端坐标、类型和海拔不参与确认。

### I05 过渡候选

I05 在 I07 领域 schema 前只为现有 `BUILTIN_ROUTES` 建立无状态候选，分两次串行合并：
I05a 冻结服务端匹配/confirm，I05b 完成前端选择/取消/编辑。临时 ID 为
``builtin-route:${canonicalName}``，不使用数组下标、哈希或额外数据库；canonical name
未改名时稳定，跨目录永久 ID 仍属于 I13。

- canonical exact 直达；不存在 canonical exact 时，唯一 alias exact 可直达。候选阶段按
  `重复 alias exact → prefix → contains → fuzzy` 执行，只使用第一个非空阶段：先按
  candidate ID 去重，再排序，最后截取最多五条。alias/prefix/contains 阶段按
  canonicalName 的 Unicode code point 顺序；fuzzy 先按最小编辑距离、再按同一名称顺序。
  prefix 指 query 与 canonical/alias 任一方以另一方开头；contains 指 prefix 未命中后
  任一方包含另一方；fuzzy 保持长度至少 4 且编辑距离 `<=2`。
- I05 候选只含 `candidateId/canonicalName/region/routeType`，不暴露坐标、海拔或天气。
  字段固定映射为 `canonicalName=name`、`region=location`、`routeType=type`；region 在
  I05 只用于原文展示，不推导或新建行政区 schema。I07 再以加法补齐
  `entityKind/capability/fixedDays`，不得由 I05 伪造领域身份。
- `confirm` 只消费 `candidateId/date/level/days`，并从服务端目录重建事实。额外客户端
  route、坐标、类型、天气或 baseData 均不参与确认。
- 未知、畸形或已移除 ID 返回 `candidate_not_found`。无状态 I05 不声称提供 TTL；
  openid 归属和真实过期语义属于 I17。
- AMap 不生成 candidate ID，继续进入 `route_type_required`。旧 UGC 只暂留精确名/别名
  兼容，substring 自动命中关闭；完整退出由 I19 完成。

## 4. 云函数契约

### Prepare

```js
{ mode: 'prepare', routeQuery?, routeVariantId?, manualPlace?, routeType?, date,
  startTimeLocal, level, days?, climbSupport? }
```

- 已验证变体使用固定天数，忽略自由 `days`。
- 地点级或手动坐标允许 1–7 天，但只返回有限结果。
- `level` 固定为现有枚举：`小白 | 中级 | 老手`。
- `climbSupport` 仅对 climb 必填：`solo_or_unsure | experienced_team | professional_guide`。
- 外部地理编码无法提供可信类型时，前端使用原 `routeQuery + 用户选择的 routeType` 重新 prepare；服务端重新解析位置，不接受客户端回传的解析坐标。手动坐标属于用户输入和来源 C，同样只产生地点级结果。

解析行为：唯一精确 RouteVariant 可直达 base；Place 只有一个 verified 变体时可解析该变体；Place 有多个 verified 变体时返回这些变体供确认；无 verified 变体的旧 Place 只能返回 place-only base。模糊匹配返回显式 candidate union：

```js
{
  candidateId,
  entityKind: 'route_variant' | 'place',
  capability: 'full' | 'place_only',
  canonicalName, region, routeType, fixedDays
}
```

`candidateId` 只能引用服务端内置记录。外部地理编码不生成可由客户端伪造的 candidate ID。
Candidate 不变量：`entityKind='route_variant'` 时 `capability` 必为 `full`；`entityKind='place'` 时必为 `place_only`。其他组合是服务端数据错误，不得返回成功候选。

上述是 I07 后的最终候选形状；I05 过渡候选按本节的迁移规则仅提供已存在且可诚实
表达的四个字段。

响应是判别式 union：

```text
confirmation       { phase, candidates[] }
route_type_required{ phase, displayName, allowedTypes[] }
base               { phase, queryId, expiresAt, data: BaseData }
error              { phase, code, message, retryable }
```

### I04 迁移边界

I04 先把当前云函数的所有出口统一到上述 `phase` 判别方式，并让前端只按
`phase` 和 error 的 `code` 分支。为避免把 I05、I07、I17 和 I18 偷渡进同一 PR：

- `prepare` 成为第一阶段规范 mode；现有 `base` mode 作为内部迁移别名保留到 I20，
  但生产前端从 I04 起不再发送它。缺失或未知 mode 返回 `invalid_mode`，不再执行
  隐式同步全流程。
- I04 的 `confirmation` 只封装当前模糊命中资料；服务端稳定 `candidateId`、最终
  `candidates[]` 结构和 `confirm` 请求由 I05 实现。
- I04 的 `base` 仍是当前 BaseData；`queryId`、`expiresAt` 和最终快照结构由
  I07、I14–I17 分阶段补齐。
- I04 的 `advice` 在当时暂时接收客户端 `baseData`；I17 建立可信上下文，I18 的原子实现
  已移除该公共输入并改为 `queryId`。
- 兼容字段 `ok`、`error`、`needsConfirm`、`needsRouteType` 和旧 `data` 在 I04
  可以保留，但它们不是新前端的分支依据；删除时机由 I20 在调用面收敛后决定。

这是渐进迁移规则，不改变本节上方的最终契约。任何临时字段都不得被当作新的
长期公共事实，也不得伪造尚不存在的 candidate ID 或 queryId。

### Confirm

```js
{ mode: 'confirm', candidateId, routeType?, date, startTimeLocal, level,
  days?, climbSupport? }
```

返回 `route_type_required | base | error`。内部 place candidate 类型未知时，可在同一 candidateId 上补充用户选择的 routeType；服务端仍从记录恢复坐标。`days` 只供 place-only candidate 使用并严格校验 1–7，RouteVariant 始终忽略它并使用 `fixedDays`。确认前不得查天气、生成规则、调用 AI、缓存结果或写历史。

### BaseData

```js
{
  requestSummary: { date, startTimeLocal, level, days, climbSupport? },
  routeSnapshot: {
    entityKind, capability, placeId?, routeId?, routeVariantId?,
    canonicalName, region, routeType, fixedDays?, stages?
  },
  weatherSnapshot: {
    status: 'available' | 'unavailable',
    reason?: 'out_of_range' | 'weather_unavailable' | 'weather_data_invalid',
    retryable, samples?, fetchedAt?, source?
  } | null,
  deterministicResult: { verdict, dataStatus, reasons, dataIssues, evaluatedWindows },
  minimumGear: { essential, recommended, optional },
  sourceMetadata: { routeSources, weatherSource?, checkedAt }
}
```

`dataStatus` 的事实源是 `deterministicResult`。weather unavailable 是可展示的有限 base，不是伪装成通用 error。

### Advice

```js
{ mode: 'advice', queryId }
```

服务端按 `openid + queryId + expiresAt` 读取 `TripContext`。返回 `advice | error`。AI 输出仅包含解释性装备补充、风险解释、注意事项和免责声明，最终响应重新注入可信天气、结论、最低装备和原因。客户端即使附带旧 `baseData`、route、date、level、days 或 weather，服务端也不读取、不校验且不回退使用。

## 5. TripContext

I17 split: #60 implements the injected storage service; #61 wires successful base creation. The
service owns ID generation, snapshot construction, persistence, ownership and logical expiry:

```js
createTripContextStore({ collection, now?, createQueryId? })
  -> { create({openid, legacyBaseData}), read({openid, queryId}) }
```

Default IDs use `tctx_${crypto.randomUUID()}`. Logical lifetime is exactly 30 minutes; equality with
`expiresAt` is expired. No hash, signature, collision lookup loop, read-time deletion, scheduled cleanup,
native TTL or production index is required for correctness.

Stored documents use:

```text
schemaVersion, _openid, queryId, createdAt, expiresAt, snapshot
```

The current runtime has not integrated I13's verified RouteVariant catalog. The I17a store therefore
owns one private projection from the current server-created legacy base allowlist
(`route/date/level/days/elevation/location/coords/routeType/routeTypeSource/weather/sunEvents/gearRules/meta`)
to an honest transitional `TrustedBaseData`. Arbitrary extra keys are not copied. The projection
preserves those legacy fields for I18's prompt/safety compatibility and additively provides
`requestSummary`, place-only `routeSnapshot`, reference-point `weatherSnapshot`, I16's null/place-only
`deterministicResult`, `minimumGear` and `sourceMetadata`. I17b only passes `legacyBaseData` into this
service and uses its returned snapshot unchanged; the handler does not own a second projection. This
does not claim route-hourly weather or a full route verdict.

The exact snapshot returned in `base.data` is the snapshot persisted by the store. Create/read boundaries
deep-copy it so later caller or mock/SDK mutation does not change another view. Unknown, foreign and
expired reads are internally distinguishable but return no snapshot; I18 maps all three to one public,
non-leaking unavailable error.

I17b creates the injected `trip_contexts` collection store only after the existing server BaseData is
complete, then returns its created snapshot unchanged as `base.data` with `queryId/expiresAt` at the top
level. A write failure returns the retryable public `context_unavailable` error and no partial base. The
I17 handler performs no TripContext read. I17 initially left advice on its legacy client-`baseData` path;
I18 atomically changes both server and production frontend to remove that client authority.

### I18 advice 读取边界

I18 在认证并读取 `mode` 后优先处理 advice，发生在普通 route/date/level/days 校验之前。每个
advice 请求恰好调用一次现有 `TripContextStore.read({ openid, queryId })`：

- `found`：`snapshot` 是 Prompt、AI 调用和 `projectSafetyAdvice` 的唯一事实输入；不再套用
  客户端 BaseData validator，也不重建第二份可信投影。
- `not_found`、`forbidden`、`expired`：统一返回不可重试 `query_context_unavailable`，固定提示
  重新查询。响应不暴露记录是否存在、归属或过期原因。
- `store_unavailable`：返回可重试 `context_unavailable`，不返回底层存储错误。

失败响应都没有 `data/queryId/expiresAt/snapshot` 且不会调用 LLM。I06 的
`invalid_base_data` 只描述历史客户端迁移阶段，从 I18 公共 advice 路径退役。可信 context 下
AI 不可用或输出无效仍走现有 degraded advice；确定性路线、天气、装备与风险均来自 snapshot。

## 6. 小时天气

Open-Meteo 固定 `timezone=Asia/Shanghai`、`wind_speed_unit=ms`，请求：

```text
temperature_2m, apparent_temperature
precipitation_probability, precipitation, snowfall
weather_code, visibility
wind_speed_10m, wind_gusts_10m
freezing_level_height
```

每个变体最多三个必要采样点。每个行进日只评估用户出发时间至该 stage 最大预计时长；无关夜间天气不得影响结论。任一必要采样点的活动窗口不完整时，天气数据状态为 `insufficient`。

### I14 冻结边界

I14 不接入当前 legacy 单点 `prepare` 路径，也不修改公共 `prepare/confirm/advice`
响应。I13 尚未把 cold catalog 接入生产解析，因此 I14 只新增供后续编排调用的内部接口：

```js
fetchRouteWeather(
  { variant, date, startTimeLocal },
  { now?, requestJson? } = {},
)
  -> { ok: true, dataStatus: 'complete', ...hourlySnapshot }
   | { ok: true, dataStatus: 'insufficient', insufficientReasons, retryable, ...auditFields }
   | { ok: false, error: 'invalid_route_weather_request', message }
```

`variant` 必须是已经通过 I07 catalog 的 full RouteVariant。I14 只消费
`fixedDays/stages/weatherSamplePoints`，不重复 I07 的来源、引用和完整 schema 校验。
`date` 是第 1 日当地日期，所有 stage 使用同一个已规范化 `HH:mm`
`startTimeLocal`；公开输入校验和错误映射属于 I16/I21。

活动区间为 `[start, start + stage.durationHours.max)`。I14 把它投影为所有与区间相交的
当地整点小时桶，保留 stage day、原始起止时间和采样点身份。一个 `07:30–11:30`
窗口对应 `07:00–08:00` 至 `11:00–12:00` 共五个桶；一个 `07:00–12:00`
窗口对应五个桶，不额外读取 `12:00–13:00`。跨午夜按 ISO 日历日推进，不依赖云函数
主机时区；固定 `Asia/Shanghai`，不构造 DST 分支。

Open-Meteo 多数字段是标记时刻的瞬时值，而 `precipitation_probability`、
`precipitation`、`snowfall` 和 `wind_gusts_10m` 描述前一小时。为避免边界偏移，每个
规范化小时桶的温度、体感、天气码、能见度、平均风和冻结层取桶起点标签；降水概率、
降水、降雪和阵风取桶终点标签。快照记录 `bucketStartLocal/bucketEndLocal`，下游 I15
只消费规范化桶，不重新解释上游时间标签。

每个被至少一个 stage 引用的采样点只发一次请求，按它涉及的最早桶起点和最晚桶终点
确定 `start_date/end_date`；未被 stage 引用的 sample 不请求。I07 已限制必要采样点最多
三个，因此直接并发最多三次，不增加缓存、轮询、并发配置或依赖。GCJ-02 坐标先经共享
纯坐标模块转为 WGS84；WGS84 原样复制。每个请求使用 sample 自身 `elevationM`，不得
回退到 Place、路线最高点、附近峰顶或 `0`。

输入边界只做本模块实际需要的最小校验：真实 ISO 日期、严格 `HH:mm` 和 I07
`verified/full` 身份；失败统一为内部 `invalid_route_weather_request`，不在 I14 复制公开
输入的完整错误矩阵。

响应必须明确返回 `timezone='Asia/Shanghai'`，所有 hourly 数组与 `time` 对齐，且时间格式/
单位为：

```text
time iso8601
temperature_2m °C              apparent_temperature °C
precipitation_probability %    precipitation mm
snowfall cm                     weather_code wmo code
visibility m                    wind_speed_10m m/s
wind_gusts_10m m/s              freezing_level_height m
```

完整快照把上述天气单位映射到对应规范化字段名的 `units` 对象；windows 保持 stage day
顺序，window 内 samples 保持 stage 的 sample ID 顺序，不额外引入排序规则。

任一必要采样请求失败、必要桶缺失、时间错位、选中值非数值、时区或单位不符时，整体
`dataStatus='insufficient'`，不返回可供规则使用的部分小时数据。每个失败采样点记录一条
`insufficientReasons[] { samplePointId, code, retryable }`，code 仅使用
`out_of_range | weather_unavailable | weather_data_invalid`；顶层 `retryable` 为任一原因
可重试。这样多采样点同时出现不同失败时不需要机械优先级，也不暴露原始上游 reason。
insufficient 的 `evaluatedWindows` 只保留
`day/date/startLocal/endLocalExclusive/durationHoursMax/samplePointIds`；不得含 `samples`、
`hours`、坐标或任何天气读数。

选中桶的数值还必须满足下游安全判断需要的最小语义域：天气码是 Open-Meteo/WMO
允许集合 `0,1,2,3,45,48,51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99`
中的整数；降水概率在 `0–100`；降水、降雪、能见度、平均风和阵风为非负有限数；温度、
体感和冻结层为有限数。违反时归入该 sample 的 `weather_data_invalid`。这是一条通用外部
数据边界，不为每个字段复制防御分支或测试。
I15 只对 `complete` 快照计算阈值，I16 再组合为
`verdict=null/dataStatus='insufficient'`。I14 本身不产生 verdict、风险原因、日落判断或
公共错误码。

## 7. TP-VERDICT-1

I15 是 weather-only 深模块：

```js
evaluateWeatherVerdict(completeWeatherSnapshot)
  -> { verdict: 'go' | 'caution' | 'no_go', dataStatus: 'complete', reasons }
```

它只接受 I14 `complete` 快照，无 I/O、无当前时间、无路线推断；non-complete 是内部编排
错误而不是 `go`。I16 把 I15 结果与可信路线、攀登支持、预报提前量和日落组合，并从 I14
注入 `evaluatedWindows`，最终形成：

```js
{
  verdict: 'go' | 'caution' | 'no_go' | null,
  dataStatus: 'complete' | 'insufficient' | 'place_only',
  reasons: [{ code, severity, at, observed, message }],
  dataIssues: [],
  evaluatedWindows: [],
}
```

I15 硬阻断：WMO `95/96/99` 雷暴；`56/57/66/67` 冻雨；阵风 `>=22m/s`；
中大雪 `73/75/85/86` 与同桶阵风 `>=13.4m/s` 或能见度 `<=50m` 的组合；单 stage、
单 sample 的活动桶累计新雪 `>=15cm`；体感 `>=41°C` 或 `<=-29°C`。

I15 警示：阵风 `13.4 <= gust <22m/s`；能见度 `<=50m`；同 stage/sample 的重雨码
`65/82` 连续三个相邻小时桶；单 stage/sample 活动桶累计降水 `>=40mm`；体感
`32 <= apparent <41°C` 或 `-29 < apparent <=0°C`；普通雨雪
`51/53/55/61/63/65/71/73/75/77/80/81/82/85/86`。

I14 只保留活动窗口，不能声称获得完整自然日或滚动 24 小时。Beta 的 `40mm/15cm` 规则
因此明确是规范化活动桶累计；跨午夜但仍属同一 stage 时可累计，不跨 sample/stage 拼接，
不把未返回小时当零，也不为此重新扫描无关夜间。Open-Meteo 的降水/降雪本身是前一小时
累计，I15 直接对 I14 已映射到桶的值求和，不再次解释有效时间。

每个原因包含确定位置 `at { day,date,samplePointId,startLocal,endLocalExclusive }` 和规则专属
`observed` 数值。去重键为 `day + code`；数值规则保留更危险观测，组合/WMO/连续规则保留
冻结顺序中的最早命中。输出先列 `no_go`，再按 day、触发时间、sample 顺序和冻结 code
顺序稳定排列。该排序不是评分；结论只按任一硬阻断、任一警示、无命中三级聚合。

官方禁行、新手技术攀登、提前量达到 5 天、预计结束晚于日落和
`insufficient/place_only → verdict=null` 属于 I16 最终组合。降水概率不单独改变 I15 结论；
冻结层高度当前仅用于解释；不从单点山峰海拔推导雪线硬阻断。完整 code、reason shape、
排序表和测试边界以当前 GitHub #24 与 `docs/tasks/ACTIVE_TASK.md` 为准。

### I16 trip-level composition contract

I16 adds one deterministic internal boundary:

```js
evaluateTripVerdict(
  { routeContext, request, weatherSnapshot },
  { evaluateWeatherVerdict?, getSunsetReference? } = {},
) -> { verdict, dataStatus, reasons, dataIssues, evaluatedWindows }
```

`routeContext` is server-normalized as `full`, `place_only`, or `blocked`; it does not accept client
route facts or coordinates. `blocked` is an independent official no-go and does not call weather.
`place_only` returns `null/place_only`. A full route consumes I14; an insufficient snapshot does not
call I15 or sunset and normally returns `null/insufficient`. The independent novice technical-climb
hard rule remains no-go even when weather or sunset is unavailable.

For complete weather, I16 preserves I15 reasons, then adds only technical-climb, forecast-lead and
sunset facts. Technical climbing is at least caution; `小白 + solo_or_unsure` is no-go. Forecast lead
is calculated per route day from `weatherSnapshot.fetchedAt` converted to the `Asia/Shanghai`
calendar date; `leadDays >= 5` is caution.

Sunset is calculated offline for every trusted WGS84 `requestCoordinate` in an I14 window. The
earliest geometric sunset is selected, with I14 sample order as the tie-break. A route ending strictly
after that route-day sunset is caution; equality is not. One missing sample means the earliest value
cannot be established, so the result becomes unavailable unless an independent no-go exists. Missing
facts are `dataIssues` without severity, never fabricated weather risks. I16 does not infer an endpoint,
use a nearby peak, read the client clock, add a score, or wire the public handler.

Reason order is stable: I16 global hard reasons, I15's existing sequence, generic technical-climb,
forecast warnings in window order, then sunset warnings in window order. The exact normalized union,
reason messages, data-issue shapes and error guards are frozen in GitHub #25 and
`docs/tasks/ACTIVE_TASK.md`.

规则依据：

- [Open-Meteo Forecast API 字段与 WMO 天气码](https://open-meteo.com/en/docs)
- [Met Office 山地危险阈值说明](https://weather.metoffice.gov.uk/guides/mountain/forecast)
- [NWS 户外雷电指南](https://www.weather.gov/safety/lightning-outdoors)
- [NWS 高温分级](https://www.weather.gov/ama/heatindex)
- [NPS 攀登安全与向导建议](https://home.nps.gov/subjects/climbing/staying-safe.htm)

## 8. 确定性安全合并

规则层的最低装备、基础风险、结论和原因码为不可删除集合。AI 可增加非关键项目和解释，但不能删除、降级、改名或覆盖确定性项。AI schema 无效或调用失败时返回规则结果和明确 degraded 状态。

### I06 过渡投影边界

I06 在 TP-VERDICT-1、RouteVariant 和可信 `queryId` 落地前，先收紧当前 advice 编排中
AI 相对于既有 `gearRules/weather/sunEvents` 的权限。这里的“可信”仅表示这些字段对 AI
只读，不表示客户端 `baseData` 已成为服务端可信事实；后者仍由 I17/I18 解决。

新增一个无 I/O 的单入口纯模块：

```js
projectSafetyAdvice({ gearRules, weather, sunEvents, aiOutcome })
  -> { data, degraded, degradedReason }
```

`data` 固定只含 `gear/risks/notes/photoTiming/microclimate/disclaimer/weather/sunEvents`；
caller 再附加 server meta。模块不生成 `weatherWindow`、route meta 或公共响应信封。

`aiOutcome` 是精确的内部判别式 union：

```js
{ status: 'available', value: AiExplanation }
{ status: 'invalid' }
{ status: 'unavailable' }
```

未知 status 属于编程错误并抛给顶层 `internal_error`。`available.value` 必须包含下方全部
容器和数组，空数组合法；已知字段或任一条目的形态错误时整个 outcome 变为 `invalid`。
数组条目中的文本必须是 trim 后非空字符串；未知字段直接丢弃，不因越权字段存在而逐项
增加错误分支。云函数入口继续负责 Prompt、LLM 调用、计时和公共响应封装；投影模块只从
白名单字段重新构造结果，不对原始 AI 对象做浅合并或展开。

AI 内部 schema 只允许：

```js
{
  gearAdditions: {
    recommended: [{ item, reason }],
    optional: [{ item, reason }]
  },
  riskExplanations: [{ risk, explanation }],
  notes: [String]
}
```

- 确定性 `essential/recommended/optional` 的内容、分类和顺序保持不变；AI 只能在
  recommended/optional 尾部追加。以 trim 后的 item 精确去重，任一确定性分类命中时
  确定性项获胜；不做模糊同义词或额外哈希。
- 风险集合、顺序和身份只来自 `gearRules.fatalRisks` 字符串。每个 `name` 固定投影为
  `{ risk: name + '风险', level: '致命', advice: '本风险由海拔/季节规则判定，请查阅专业路书获取具体应对措施' }`。
  AI 只能为 trim 后移除一个末尾“风险”即可精确匹配的现有 name 追加
  `；AI 说明：${explanation.trim()}`；AI 独有风险丢弃。前端 base 阶段使用同一固定记录，
  但不含 AI 说明。
- `gearRules.ruleNotes` 依次输出为 `规则提示：${note.trim()}`；合法 AI notes 随后依次输出为
  `AI 说明：${note.trim()}`。invalid/unavailable 则在规则提示之后追加同一条
  `AI 说明暂不可用，当前仅展示确定性规则结果。`，差异只由 degradedReason 表达。
- weather/sunEvents 只来自当前 base；photoTiming 只由 sunEvents 生成，microclimate
  只由 weather 生成，disclaimer 固定为
  `装备和风险由确定性规则生成，AI 仅补充解释。出行前请核实官方气象、路线开放状态和现场条件；户外活动有风险。`。
  AI 提供的 verdict、dataStatus、
  reasons、route、weather、sunEvents、meta、gearRules 或 degraded 字段均被丢弃。
- `invalid` 与 `unavailable` 都返回完整确定性内容并标记 degraded，原因分别为
  `ai_output_invalid` 与 `ai_unavailable`。不为此新增公共 error code；不合法 base 仍使用
  I06 历史迁移阶段使用 `invalid_base_data`；I18 queryId-only advice 后该公共路径退役。未预期
  的编程错误仍为 `internal_error`。
- 投影的 degradedReason 由 caller 仅写入现有 `data.meta.degradedReason`；非降级时该字段
  省略。公共响应继续只在 advice 顶层使用现有 `degraded` 布尔值，不再生成第二个
  `data.degradedReason`。
- 投影不得修改输入对象。正常 AI 和降级路径必须经过同一投影，不维护两套安全合并规则。
- advice Prompt 只从已通过本期结构校验的 baseData 派生，不再混入 event 中重复的
  route/date/level/days。此处保留的是 I06 历史实现说明；I18 删除该客户端事实入口。

I06 客户端迁移阶段在调用 LLM 前确认 `gearRules.essential/recommended/optional` 均为数组且每项是
`{ item, reason }` 非空字符串对象，`fatalRisks` 与 `ruleNotes` 均为字符串数组，weather
和 sunEvents 各自只能为 object 或 null；否则返回 `invalid_base_data` 且 LLM 调用次数为零。
I18 改为直接消费经 I17 store 完整性边界恢复的 snapshot，不复制这套客户端 validator，也不
扩展为深层天气语义审计；I14 负责最终小时天气 schema。

前端收到 base 后立即从现有 `gearRules` 显示最低装备和致命风险；`advice_loading` 只表示
解释仍在生成，不得用骨架屏遮掉已经存在的确定性内容。advice 成功后使用服务端投影的完整
结果；AI schema 无效、调用失败或 advice 传输失败时保留先前确定性内容并显示降级状态。
页面内只做 I06 所需的局部初始化，不提前引入 I20 reducer/service 或全局状态库。

I06 implementation on `codex/i06-safety-advice` follows this boundary with
`cloudfunctions/getAdvice/safety-advice.js`: handler paths construct only the three documented
`aiOutcome` cases, then attach `degradedReason` only to server `meta`. The implementation passed a
two-round independent Sol XHigh review and merged in PR #47; it does not establish I17/I18
server-owned base trust.

## 9. 前端状态

纯 reducer 管理：

```text
idle → searching → awaiting_confirmation | awaiting_route_type
     → preparing → base_ready → advice_loading → complete
                                  ↘ degraded
任何阶段 → error → 可恢复状态
```

网络服务从页面组件拆出。每次流程分配本地 request token；迟到响应和卸载后的回调不得覆盖新状态。不引入 Redux/Zustand。I18 过渡实现继续使用页面私有 generation：prepare/confirm 成功把完整 base response 交给结果流程，从顶层取 `queryId`，advice 网络体精确为 `{ mode: 'advice', queryId }`；表单参数仅供本地历史保存且 history 不存 queryId。advice 的 success 和 fail 都必须先拒绝旧 generation。`query_context_unavailable` 保留已显示 base，在结果视图展示“本次查询已失效，请重新查询”并保留现有“返回重新查询”动作，但不设置 degraded、不追加 AI unavailable note 且不写 history；新的恢复控件留给 I23。

I20 已将该过渡实现收敛为两个深模块：纯 `trip-flow` reducer 唯一拥有 10 个状态、本地
单调 token、候选/类型确认上下文、可渲染 result 与流程 error；可注入 getAdvice service 唯一
封装 `prepare/confirm/advice` 请求。页面只保留表单、视觉 timer、缓存适配和 history 局部状态，
不得同时保留 `loading/showResult/adviceLoading/error/showCandidatePopup/showManualCoords` 或私有 generation。
自由输入 prepare 在途为 searching，候选/类型 follow-up 在途为 preparing。base 到达先进入
base_ready，再启动 advice_loading。普通 advice 失败进入 degraded；query context 不可用进入
保留 result 的 error。RESET、新查询、取消和返回均推进 token，旧 token 的异步事件原样忽略。
I20 不新增重试控件、全局状态库、业务 validator 或第 11 个状态。
`ROUTE_TYPE_REQUIRED` 可在不增加状态或字段的前提下携带 local fallback error：`location_failed`
或本地手动上下文无效都进入同一个 `awaiting_route_type`，由 reducer 派生手动坐标 Popup。
I20 也不定义通用 RECOVER 事件；错误只保留 code/message/retryable 与既有 result。I23 后续新增
恢复动作时，凡会启动异步请求都必须先推进 token。

I21 是 I13 后的原子垂直接线，不能在 resolver 缺失时只合并前端控件或只强制后端字段。
它必须在同一个主分支兼容变更中把 UI、`prepare/confirm`、服务端校验、确认快照与
TripContext `requestSummary` 接通。服务端 resolver 恢复的 `entityKind/capability/routeType/fixedDays`
是决定固定天数、place-only 1–7 天和 climb support 要求的唯一事实源；前端不从名称或
legacy 候选推断。这一接线不新增流程状态，只扩展 I20 的 `confirmationInput` 快照和已冻结请求字段。

页面在 reducer 的 `BASE_RECEIVED` 后先提交可渲染的 `base_ready`，仅在当前 token 仍匹配时才
写入 cache、转移到 `ADVICE_STARTED` 并发起 advice。advice 的成功、普通失败与 transport failure
同样只在当前 token 下写 cache/history；`query_context_unavailable` 只转为保留 base 的 flow error，
不写 history。候选取消、手动弹窗取消和 `onBack` 统一使用 `RESET` 推进 token；卸载继续用
生命周期标记阻断组件更新。

## 10. 历史与 UGC

history 仅保存当前 openid 的私人查询摘要，支持保存、读取、单项删除和清空。身份只来自
`cloud.getWXContext().OPENID`，客户端字段不能覆盖；history 不保存 `queryId`。

公共请求为 `save | list | delete | clear`。`list` 固定按 openid 查询最多 20 条，只返回
`id, route, date, days, level, elevation, location, summary, degraded, coords, routeType,
routeTypeSource`，不得透传 `_id`、`_openid` 或未知数据库字段。`delete` 用
`where({_id:id, _openid:openid}).remove()` 一次条件删除；只有 `result.stats.removed === 1` 才
成功，零删除对未知和他人记录统一返回 `history_not_found`。`clear` 用
`where({_openid:openid}).remove()`，返回实际 `result.stats.removed`，空历史也成功并返回
`removed:0`。

旧 `saveRoute/listRoutes` 是认证后的 tombstone，固定返回 `ugc_disabled`，不得访问 `routes`
集合。geocode 不再从 CloudBase `routes` 读取，内置可信匹配未命中后直接走 AMap；手动坐标
查询不再写公共路线。`routeTypeSource:'ugc'` 只作为旧私人历史兼容显示值。既有 routes 和
history 数据保留，不迁移、不删除。

前端只有服务端成功后才从本地列表删除或清空；删除控件不冒泡到历史恢复动作。清空前使用
一次原生确认。list 失败保留当前列表并显示局部错误。历史保存失败只提示“历史未保存，不影响
本次结果”，不改变主结果，也不能把同一参数永久标成已保存；普通 advice 失败保存
`degraded:true` 的确定性摘要，`query_context_unavailable` 保持零历史。

## 11. 错误语义

- 输入错误（不可重试，需修改输入）：`invalid_date`、`invalid_trip_days`、`invalid_start_time`、`invalid_route_type`、`missing_climb_support`。
- 解析错误：`route_not_found`、`candidate_not_found`；`route_type_required` 是独立 phase，不是 error code。
- 上下文错误：创建或读取存储失败公开 `context_unavailable`（`retryable=true`）；创建失败不
  返回半成品 base。`context_expired`、`context_not_found`、`context_forbidden` 只是存储模块
  内部状态。I18 将不存在、他人所属和过期统一公开为 `query_context_unavailable`
  （`retryable=false`，需重新 prepare），不泄露上下文是否存在或属于谁。
- Advice：`ai_unavailable` 可重试，且不影响已经显示的 BaseData。
- 天气：`out_of_range`、`weather_unavailable`、`weather_data_invalid` 放在 BaseData weather 状态中，`verdict=null`，允许重新 prepare。
- 未分类服务端失败：`internal_error`，默认不可在原请求上无限重试。
- 历史 save/list/delete/clear 存储失败统一为可重试 `history_unavailable`，使用通用消息且不
  暴露原始数据库错误；`history_not_found`、`ugc_disabled` 和输入错误不可重试。任何历史失败
  都不使 getAdvice 的确定性结果失败。
- error 的 `retryable` 只表示同一操作稍后重试可能成功；需要修改输入或重新 prepare 时为 false。
