# 徒步薯核心 Beta 架构

- Architecture scope: `TP-BETA-001`
- Status: `APPROVED`
- Updated: `2026-08-06`

## 1. 系统边界

- `taro-app/`：实际微信小程序前端。
- `cloudfunctions/getAdvice/`：路线解析、天气、规则、短期上下文和 AI 编排。
- `cloudfunctions/history/`：仅私人历史。
- `miniprogram/`：历史原生原型，不是生产入口。

依赖方向为 UI → 云函数契约 → 领域/规则纯模块 → 外部 API。LLM 位于解释层，不能反向覆盖领域事实或规则结果。

## 2. 领域模型

```text
Place
  id, canonicalName, aliases, region, kind
  referenceCoordinate { lat, lon, coordinateSystem }
  sourceStatus

Route
  id, placeId, canonicalName, routeType
  summary

RouteVariant
  id, routeId, canonicalName, direction
  startPoint, endPoint, isLoop
  fixedDays, stages[]
  distanceKm, ascentM, descentM
  routeHighestPointElevation, nearbyPeakElevation
  weatherSamplePoints[1..3]
  accessMode, operationalStatus
  sources[], sourceCheckedAt, verificationLevel
```

`stages[]` 包含 day、起终点、`durationHours.min/max` 和关联采样点。附近山峰海拔不得代替路线最高点或天气采样海拔。

来源：A 为官方/政府/协会/API；B 为两个可靠独立来源或经主控审阅的 GPX；C 为未验证输入。只有 A/B 且核心字段完整的变体可输出结论。

`operationalStatus` 为 `open | blocked | unknown`。只有仍有效、来源明确的 `blocked` 触发硬阻断；`unknown` 显示核验提示但不自动降级。

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
- I04 的 `advice` 暂时仍接收当前 `baseData`；I17 建立可信上下文，I18 移除该输入。
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
  deterministicResult: { verdict, dataStatus, reasons, evaluatedWindows },
  minimumGear: { essential, recommended, optional },
  sourceMetadata: { routeSources, weatherSource?, checkedAt }
}
```

`dataStatus` 的事实源是 `deterministicResult`。weather unavailable 是可展示的有限 base，不是伪装成通用 error。

### Advice

```js
{ mode: 'advice', queryId }
```

服务端按 `openid + queryId + expiresAt` 读取 `TripContext`。返回 `advice | error`。AI 输出仅包含解释性装备补充、风险解释、注意事项和免责声明，最终响应重新注入可信天气、结论、最低装备和原因。

## 5. TripContext

逻辑有效期约 30 分钟：

```text
queryId, openid, expiresAt
normalizedRequest
routeSnapshot
weatherSnapshot
deterministicResult
sourceMetadata
```

使用随机 ID，不使用哈希。过期和所有权检查是必要边界；Beta 不增加复杂令牌签名或存量迁移。过期记录可由后续运维清理，但逻辑过期必须立即生效。

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

## 7. TP-VERDICT-1

规则输出：

```js
{
  verdict: 'go' | 'caution' | 'no_go' | null,
  dataStatus: 'complete' | 'insufficient' | 'place_only',
  reasons: [{ code, severity, at?, observed?, message }],
  evaluatedWindows: []
}
```

优先级：硬阻断 → `no_go`；否则任一警示 → `caution`；否则 → `go`。数据不足或地点级结果 → `null`。不计算总分。

硬阻断：官方禁行；WMO `95/96/99` 雷暴；`56/57/66/67` 冻雨；阵风 `>=22m/s`；中大雪 `73/75/85/86` 伴阵风 `>=13.4m/s`；单日新雪 `>=15cm`；能见度 `<=50m` 与中大雪组合；体感 `>=41°C` 或 `<=-29°C`；新手技术攀登且独自/不确定。

警示：阵风 `13.4–22m/s`；能见度 `<=50m`；重雨码 `65/82` 连续三小时或 24 小时降水 `>=40mm`；体感 `32–41°C` 或 `-29–0°C`；普通雨雪；提前量达到 5 天；任何技术攀登；预计结束晚于日落。

降水概率不单独改变结论；冻结层高度当前仅用于解释；不从单点山峰海拔推导雪线硬阻断。

规则依据：

- [Open-Meteo Forecast API 字段与 WMO 天气码](https://open-meteo.com/en/docs)
- [Met Office 山地危险阈值说明](https://weather.metoffice.gov.uk/guides/mountain/forecast)
- [NWS 户外雷电指南](https://www.weather.gov/safety/lightning-outdoors)
- [NWS 高温分级](https://www.weather.gov/ama/heatindex)
- [NPS 攀登安全与向导建议](https://home.nps.gov/subjects/climbing/staying-safe.htm)

## 8. 确定性安全合并

规则层的最低装备、基础风险、结论和原因码为不可删除集合。AI 可增加非关键项目和解释，但不能删除、降级、改名或覆盖确定性项。AI schema 无效或调用失败时返回规则结果和明确 degraded 状态。

## 9. 前端状态

纯 reducer 管理：

```text
idle → searching → awaiting_confirmation | awaiting_route_type
     → preparing → base_ready → advice_loading → complete
                                  ↘ degraded
任何阶段 → error → 可恢复状态
```

网络服务从页面组件拆出。每次流程分配本地 request token；迟到响应和卸载后的回调不得覆盖新状态。不引入 Redux/Zustand。

## 10. 历史与 UGC

history 仅保存当前 openid 的私人查询摘要，支持读取、单项删除和清空。公共 UGC 写入与读取退出主路径；既有数据保留，不迁移、不删除。

## 11. 错误语义

- 输入错误（不可重试，需修改输入）：`invalid_date`、`invalid_trip_days`、`invalid_start_time`、`invalid_route_type`、`missing_climb_support`。
- 解析错误：`route_not_found`、`candidate_not_found`；`route_type_required` 是独立 phase，不是 error code。
- 上下文错误：`context_expired`、`context_not_found`、`context_forbidden`，均需重新 prepare；不向其他用户泄露上下文内容。
- Advice：`ai_unavailable` 可重试，且不影响已经显示的 BaseData。
- 天气：`out_of_range`、`weather_unavailable`、`weather_data_invalid` 放在 BaseData weather 状态中，`verdict=null`，允许重新 prepare。
- 未分类服务端失败：`internal_error`，默认不可在原请求上无限重试。
- 历史保存失败由 history 服务返回 `history_unavailable`，不使 getAdvice 结果失败。
- error 的 `retryable` 只表示同一操作稍后重试可能成功；需要修改输入或重新 prepare 时为 false。
