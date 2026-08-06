# 当前活动任务

- Task ID: `I14`
- GitHub Issue: `#23`
- Title: 冻结多采样点小时天气与活动窗口合同
- Status: `IMPLEMENTATION_ACTIVE`
- Mode: `IMPLEMENTATION`
- Owner: Terra XHigh
- Reviewer: Sol XHigh
- Branch: `codex/i14-hourly-weather`
- Base: `main` at `ea64e28`
- Goal: `TP-BETA-001`

## Current authorization

规划 PR #54 已通过独立 Review、latest-head CI 并合并为 `ea64e28`。Terra XHigh 现在可以
在本文 implementation allowlist 内 test-first 实现；不得修改公共合同、依赖、lockfile 或
非范围。Terra 不得批准或合并自己的 PR。

## Mandatory context

实现 Agent 在激活后必须按 `AGENTS.md` 顺序读取治理文件，并额外读取：

1. `GOAL.md`
2. `docs/architecture.md` 的 I07 schema 与 I14 小时天气边界
3. `docs/testing-strategy.md` 的 I14 离线矩阵
4. `docs/decision-log.md` 的 TP-D024、TP-D026、TP-D027
5. GitHub #23 的完整任务合同

## Objective

为一个已经通过 I07 catalog 的 full RouteVariant 获取所有必要采样点的 Open-Meteo 小时
天气，只保留每日统一当地出发时间至该 stage 最大预计时长所覆盖的小时桶，并返回可供
I15/I16 消费的完整或不足状态。I14 不产生 verdict，不接入现有生产 handler。

## Implementation allowlist

- `cloudfunctions/getAdvice/hourly-weather.js`（新增纯计划/投影模块）
- `cloudfunctions/getAdvice/weather.js`（仅新增 Open-Meteo hourly adapter 与内部入口）
- `cloudfunctions/getAdvice/coordinates.js`（新增纯坐标转换模块）
- `cloudfunctions/getAdvice/geocode.js`（仅改为导入并兼容导出原转换函数）
- `scripts/hourly-weather-contract-test.js`（新增）
- `scripts/fixtures/open-meteo-hourly.js`（新增）
- `package.json`（新增 `test:hourly-weather` 并纳入根 `test`）
- `docs/architecture.md`
- `docs/testing-strategy.md`
- `docs/development-plan.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

超出 allowlist 必须停止并升级 Sol。不得修改依赖或任何 lockfile。

## Fixed internal interface

```js
fetchRouteWeather(
  { variant, date, startTimeLocal },
  { now?, requestJson? } = {},
)
```

结果为判别式内部 union：

```js
{
  ok: true,
  dataStatus: 'complete',
  source: 'Open-Meteo',
  fetchedAt,
  timezone: 'Asia/Shanghai',
  units: {
    temperatureC: '°C',
    apparentTemperatureC: '°C',
    precipitationProbabilityPct: '%',
    precipitationMm: 'mm',
    snowfallCm: 'cm',
    weatherCode: 'wmo code',
    visibilityM: 'm',
    windSpeedMs: 'm/s',
    windGustMs: 'm/s',
    freezingLevelHeightM: 'm',
  },
  evaluatedWindows,
}

{
  ok: true,
  dataStatus: 'insufficient',
  source: 'Open-Meteo',
  fetchedAt,
  timezone: 'Asia/Shanghai',
  insufficientReasons: [{
    samplePointId,
    code: 'out_of_range' | 'weather_unavailable' | 'weather_data_invalid',
    retryable,
  }],
  retryable,
  evaluatedWindows,
}

{
  ok: false,
  error: 'invalid_route_weather_request',
  message,
}
```

`insufficient.evaluatedWindows[]` 只允许审计元数据：

```js
{
  day,
  date,
  startLocal,
  endLocalExclusive,
  durationHoursMax,
  samplePointIds,
}
```

insufficient 分支不得出现 `samples`、`hours`、requestCoordinate 或任何天气读数；测试必须
直接断言该字段集合，避免部分成功数据被 I15 误用。

`complete.evaluatedWindows[]` 按 stage day 输出：

```js
{
  day,
  date,
  startLocal,
  endLocalExclusive,
  durationHoursMax,
  samples: [{
    samplePointId,
    samplePointName,
    elevationM,
    requestCoordinate: { lat, lon, coordinateSystem: 'WGS84' },
    hours: [{
      bucketStartLocal,
      bucketEndLocal,
      temperatureC,
      apparentTemperatureC,
      precipitationProbabilityPct,
      precipitationMm,
      snowfallCm,
      weatherCode,
      visibilityM,
      windSpeedMs,
      windGustMs,
      freezingLevelHeightM,
    }],
  }],
}
```

`evaluatedWindows` 保持 stage day 顺序，每个 window 的 samples 保持该 stage
`weatherSamplePointIds` 顺序；这是确定性输出要求，不要求额外排序或机械评分。

字段名称和 union 不得由实现 Agent自行更改；若实际代码约束要求调整，升级 Sol 并先同步
架构、Issue 与合同。

I14 对输入只做本模块必要的最小边界校验：`date` 必须是真实 ISO 日期，
`startTimeLocal` 必须严格为 `HH:mm`，variant 必须具有 I07 `verified/full` 身份。其他
catalog 完整性由 I07 保证；不在这里复制公开输入的所有异常 case。

## Window and upstream-time rules

1. `variant` 只接受 I07 verified/full shape；I14 不重新实现完整 catalog 校验。
2. `date` 为第 1 天，stage day 通过 ISO 日历日加法获得；所有 day 使用同一规范化
   `HH:mm`。I14 不提供默认出发时间。
3. 活动区间为 `[start, start + durationHours.max)`，不得使用 min。
4. 每个与活动区间相交的本地整点桶都纳入；精确结束时不多取下一个桶。跨午夜仍属于
   原 stage day。
5. 瞬时字段（temperature、apparent、weatherCode、visibility、windSpeed、
   freezingLevelHeight）读取桶起点标签。
6. 前一小时字段（precipitationProbability、precipitation、snowfall、windGust）读取
   桶终点标签。
7. 每个被 stage 引用的 unique sample 只请求一次；未引用 sample 不请求。请求日期范围
   必须覆盖该 sample 所有桶起点及终点标签。
8. WGS84 原样复制；GCJ-02 经 `coordinates.js` 转换。请求使用 sample `elevationM`，不得
   用其他海拔或 `0` 回退。

## Open-Meteo contract

请求固定：

```text
timezone=Asia/Shanghai
temperature_unit=celsius
precipitation_unit=mm
wind_speed_unit=ms
timeformat=iso8601
hourly=temperature_2m,apparent_temperature,precipitation_probability,
       precipitation,snowfall,weather_code,visibility,
       wind_speed_10m,wind_gusts_10m,freezing_level_height
```

成功响应必须有 `timezone='Asia/Shanghai'`，hourly 数组与 `time` 等长对齐，且
`hourly_units.time='iso8601'`，十个天气字段单位分别为
`°C/°C/%/mm/cm/wmo code/m/m/s/m/s/m`。只有活动桶所需值必须为有限数；不为同型
不可能 case 重复建立机械负例。

活动桶读数的最小语义域固定为：

- `weatherCode` 是整数且属于
  `0,1,2,3,45,48,51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99`；
- `precipitationProbabilityPct` 为 `0–100` 的有限数；
- `precipitationMm/snowfallCm/visibilityM/windSpeedMs/windGustMs` 为非负有限数；
- `temperatureC/apparentTemperatureC/freezingLevelHeightM` 为有限数。

任何违反都将对应 sample 归为 `weather_data_invalid`。实现使用通用验证，不为每个不可能
case 重复分支；测试只需一个非法 WMO 码和一个代表性的范围/非负反例证明守卫敏感。

任一必要 sample 请求失败、必要桶缺失、时间错位、单位/时区错误或选中值非数值时，
整体 insufficient 且不返回任何带读数的部分窗口。每个失败 sample 产生一条去重的
`insufficientReasons[]`；Open-Meteo 明确日期范围错误映射
`out_of_range/retryable=false`，网络或服务失败映射
`weather_unavailable/retryable=true`，结构、单位或时间错误映射
`weather_data_invalid/retryable=true`。顶层 `retryable` 为任一 reason 可重试；不得暴露
原始上游 reason，也不得用单一优先级隐藏多 sample 的不同失败。

## Out of scope

- 修改 `index.js`、公共 response contract 或前端。
- I13 registry/search/production catalog 接线。
- I15 阈值、原因码、24 小时累计或 verdict。
- I16 climb support、日落、公开时间输入校验和 `verdict=null` 组合。
- 真实路线数据、当前运行状态、AI、queryId、历史或 UI。
- 实时网络测试、缓存、重试循环、新天气源、依赖、部署或迁移。

## TDD requirement

1. 先新增合成 full catalog fixture、hourly fixture 和契约测试，运行预定
   `test:hourly-weather`；真实 RED 应为模块或导出缺失。
2. 一个真实 RED 足够，不制造第二个失败来表演流程。
3. 实现最小 GREEN；旧 `fetchWeather` 的 86 项 daily 语义保持不变。
4. 合成 Variant 必须通过 I07 `createRouteCatalog`，不能直接伪装成 production route。

## Required test cases

- 两日、三个 unique samples：D1 A/B，D2 B/C；B 只请求一次。
- 每日同一出发时间，分别使用 stage max；不读取无关夜间。
- 非整点边界、精确结束、跨午夜和 bucket start/end 字段来源。
- URL hourly 字段、日期范围、timezone 与所有显式单位。
- WGS84 原样和一个 GCJ-02 已知转换；直接导入 hourly 模块不加载 CloudBase。
- ISO 时间格式和十项天气单位正例；一个错误单位负例。
- 完整快照的 normalized `units` 对象精确相等；windows 与 samples 保持冻结输入顺序。
- 一个数组错位、一个必要桶缺口、一个选中值非数值。
- 一个非法 WMO 码和一个代表性的概率越界或负气象量。
- 一个必要 sample 网络失败时整体 insufficient 且无部分数据。
- API 明确范围错误与普通网络失败的 reason/retryable 区分；混合失败保留逐 sample 原因。
- 输入对象和上游 response 不被修改。

## Acceptance

1. `test:hourly-weather` 独立运行并纳入根 `test`。
2. frozen internal union、窗口、小时桶和 valid-time 映射与本文精确一致。
3. 每个必要 sample 最多一次请求，总数不超过三；未引用 sample 零请求。
4. 任一必要数据失败时原子地返回 insufficient，不泄漏局部可判定 hours。
   insufficient 的 evaluatedWindows 只能包含冻结的六个审计字段。
5. 旧 daily weather、geocode 导出和当前生产 handler 行为无变化。
6. 不存在真实路线、I13、I15、I16 或公共接口范围扩张。
7. 全部本地门禁和 latest-head GitHub `quality` 通过。

## Validation commands

```bash
corepack npm@10.9.2 run test:hourly-weather
corepack npm@10.9.2 run test:weather
corepack npm@10.9.2 run test:route-domain
corepack npm@10.9.2 run lint
corepack npm@10.9.2 run typecheck
corepack npm@10.9.2 test
corepack npm@10.9.2 run test:integration
corepack npm@10.9.2 run build:weapp
git diff --check
```

## Executor autonomy

Terra 可决定纯模块内部函数命名、fixture 常量组织、URL 参数构造和 Promise 聚合细节；
不得改变输出 union、窗口/桶语义、字段/单位、坐标职责、失败原子性、allowlist 或非范围。

## Escalate immediately

- 需要修改 I07 schema、公共 handler/response、真实路线、I13/I15/I16 或依赖。
- Open-Meteo 实际字段/单位与冻结合同不兼容，或必须更换/增加天气源。
- 无法把 GCJ 提取限制为纯函数零行为移动。
- 无法在不返回部分可判定数据的情况下处理必要 sample 失败。
- 同一问题连续两轮修复仍不能通过 Review，或需要降低验收标准。

I15 中“24 小时降水/单日新雪”与活动窗口的组合语义尚未冻结，不属于 I14；不得在本
Issue 中提前扫描整日。Sol 必须在 I15 合同中单独解决。

## Required result package

- 完成情况与修改摘要。
- 实际修改文件。
- RED 命令/失败原因、GREEN 与完整验证结果。
- 与合同的偏差、自主实现级决策和已知限制。
- PR 链接与建议 Sol 重点 Review 位置。
