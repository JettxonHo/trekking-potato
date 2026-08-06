# 当前活动任务

- Task ID: `I15`
- GitHub Issue: `#24`
- Title: 冻结 TP-VERDICT-1 小时天气规则引擎合同
- Status: `IMPLEMENTATION_ACTIVE`
- Mode: `IMPLEMENTATION`
- Owner: Terra XHigh
- Reviewer: Sol XHigh
- Branch: `codex/i15-weather-verdict`
- Base: `main` at `8a4d2c4`
- Goal: `TP-BETA-001`

## Current authorization

I15 规划 PR #56 已通过独立 Terra XHigh 两轮 Review 和 latest-head GitHub `quality`，并
squash 合并为 `8a4d2c4`。Terra XHigh 现在仅获授权在本文 allowlist 和冻结合同内 test-first
实现；不得改变阈值、reason 契约、I15/I16 边界或自行批准/合并 PR。

## Mandatory context

实现 Agent 激活后必须按 `AGENTS.md` 顺序读取治理文件，并额外读取：

1. `GOAL.md`
2. `docs/architecture.md` 的 I14 快照和 I15 规则边界
3. `docs/testing-strategy.md` 的 I15 测试矩阵
4. `docs/decision-log.md` 的 TP-D027、TP-D028
5. GitHub #24 的完整任务合同

## Objective

新增无 I/O、无 AI 的纯规则模块，只对 I14 `dataStatus='complete'` 的规范化小时天气快照
计算天气部分的 `go | caution | no_go` 和稳定原因。I16 再把该结果与路线禁行、技术攀登
支持、预报提前量、日落及 `verdict=null` 语义组合为最终公开结论。

## Implementation allowlist

- `cloudfunctions/getAdvice/weather-verdict.js`（新增纯规则模块）
- `scripts/weather-verdict-contract-test.js`（新增离线契约测试）
- `scripts/fixtures/weather-verdict.js`（可选；只构造经 I14 投影的合成天气）
- `package.json`（只新增 `test:verdict` 并纳入根 `test`）
- `docs/architecture.md`
- `docs/testing-strategy.md`
- `docs/development-plan.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

不得修改 `index.js`、I14 模块/fixture、I07 schema、真实路线、依赖清单/锁文件、前端或其他
文件。若实现发现必须修改 I14 或公共接口，停止并升级 Sol。

## Frozen internal interface

```js
evaluateWeatherVerdict(completeWeatherSnapshot)
  -> {
    verdict: 'go' | 'caution' | 'no_go',
    dataStatus: 'complete',
    reasons: WeatherReason[],
  }
```

- 输入必须是 I14 的 `{ ok:true, dataStatus:'complete' }` 快照。
- 非 complete 输入是编排错误；纯函数抛出 `TypeError('complete weather snapshot required')`，
  不得把它静默解释为 `go` 或在 I15 生成 `verdict=null`。
- I15 不复制 `evaluatedWindows` 到输出。I16 从可信 I14 快照把 windows 注入最终
  `deterministicResult`，避免两份天气事实漂移。
- I15 不重新验证 I14 已保证的所有字段、单位和数组 case，只做运行本模块所需的 complete
  身份边界。

`WeatherReason` 固定为：

```js
{
  code: WeatherReasonCode,
  severity: 'caution' | 'no_go',
  at: {
    day,
    date,
    samplePointId,
    startLocal,
    endLocalExclusive,
  },
  observed: { /* rule-specific frozen keys below */ },
  message: string,
}
```

`message` 使用代码内固定中文文案；动态数值只放在 `observed`，不得拼接成不可稳定测试的
自由文本。

固定文案：

| code | message |
|---|---|
| `thunderstorm` | `活动时段存在雷暴` |
| `freezing_rain` | `活动时段存在冻雨或冻毛毛雨` |
| `extreme_wind_gust` | `活动时段阵风达到危险等级` |
| `heavy_snow_with_wind` | `活动时段中大雪伴随强阵风` |
| `heavy_snow_with_low_visibility` | `活动时段中大雪伴随极低能见度` |
| `activity_window_snowfall` | `活动窗口累计新雪达到危险阈值` |
| `extreme_heat` | `活动时段体感温度达到极端高温` |
| `extreme_cold` | `活动时段体感温度达到极端低温` |
| `strong_wind_gust` | `活动时段阵风较强` |
| `low_visibility` | `活动时段能见度极低` |
| `heavy_rain_three_hours` | `活动时段出现连续重雨` |
| `activity_window_precipitation` | `活动窗口累计降水达到警示阈值` |
| `apparent_heat` | `活动时段体感温度偏高` |
| `apparent_cold` | `活动时段体感温度偏低` |
| `rain_or_snow` | `活动时段存在雨雪天气` |

## Frozen weather rules

### `no_go`

| code | condition | observed |
|---|---|---|
| `thunderstorm` | WMO `95/96/99` | `{ weatherCode }` |
| `freezing_rain` | WMO `56/57/66/67` | `{ weatherCode }` |
| `extreme_wind_gust` | `windGustMs >= 22` | `{ windGustMs, thresholdMs:22 }` |
| `heavy_snow_with_wind` | WMO `73/75/85/86` 且同桶 `windGustMs >= 13.4` | `{ weatherCode, windGustMs, thresholdMs:13.4 }` |
| `heavy_snow_with_low_visibility` | WMO `73/75/85/86` 且同桶 `visibilityM <= 50` | `{ weatherCode, visibilityM, thresholdM:50 }` |
| `activity_window_snowfall` | 同 stage、同 sample 的活动桶 `snowfallCm` 之和 `>=15` | `{ snowfallCm, thresholdCm:15, bucketCount }` |
| `extreme_heat` | `apparentTemperatureC >= 41` | `{ apparentTemperatureC, thresholdC:41 }` |
| `extreme_cold` | `apparentTemperatureC <= -29` | `{ apparentTemperatureC, thresholdC:-29 }` |

### `caution`

| code | condition | observed |
|---|---|---|
| `strong_wind_gust` | `13.4 <= windGustMs < 22` | `{ windGustMs, lowerMs:13.4, upperMs:22 }` |
| `low_visibility` | `visibilityM <= 50`；同桶已命中雪+低能见度组合时不重复 | `{ visibilityM, thresholdM:50 }` |
| `heavy_rain_three_hours` | 同 stage、同 sample 中 WMO `65/82` 连续三个相邻小时桶 | `{ weatherCodes, consecutiveBuckets:3 }` |
| `activity_window_precipitation` | 同 stage、同 sample 的活动桶 `precipitationMm` 之和 `>=40` | `{ precipitationMm, thresholdMm:40, bucketCount }` |
| `apparent_heat` | `32 <= apparentTemperatureC < 41` | `{ apparentTemperatureC, lowerC:32, upperC:41 }` |
| `apparent_cold` | `-29 < apparentTemperatureC <= 0` | `{ apparentTemperatureC, lowerC:-29, upperC:0 }` |
| `rain_or_snow` | WMO `51/53/55/61/63/65/71/73/75/77/80/81/82/85/86` | `{ weatherCode }` |

冻结雨 `56/57/66/67` 与雷暴 `95/96/99` 不再生成泛化 `rain_or_snow`。命中
`heavy_snow_with_wind` 或 `heavy_snow_with_low_visibility` 的同一桶不再作为泛化雪或普通低
能见度候选；其他独立桶仍可生成自己的原因。

`precipitationProbabilityPct` 不能单独改变结论；`windSpeedMs`、`temperatureC` 和
`freezingLevelHeightM` 在 I15 不参与阈值。

## Activity-window accumulation decision

I14 冻结为只返回与活动区间相交的整点桶，不能从该快照恢复完整自然日或滚动 24 小时。
I15 因此把 Beta 的两个累计规则明确为“单 stage、单 sample 的规范化活动桶累计”：

- 累计降水 `>=40mm` → caution；
- 累计新雪 `>=15cm` → no_go。

不得把未返回小时当零，不得跨 sample、跨 stage 或跨 route day 相加，也不得重新请求或扫描
无关夜间。跨午夜但仍属于同一 stage 的桶可以累计。I14 已按小时分辨率保守纳入所有相交桶，
I15 直接求和，不再按首尾分钟比例缩放。文档和原因不得继续把这两个 Beta 规则称为完整
“24 小时降水”或“单日新雪”。

## Multi-sample, consecutive and precedence semantics

- 每个 `window.samples[]` 是独立路线位置；任一 sample 命中即可升级结论。不得平均、投票或
  把不同 sample 的降水/雪量拼接。
- 连续重雨必须在同一 window/sample 内按 `bucketStartLocal` 每次恰好相邻一小时；跨午夜允许，
  跨 stage 或跨 sample 禁止。超过三小时只生成一个原因。
- 任一 `no_go` 原因 → `no_go`；否则任一 caution → `caution`；否则 `go`。不计算分数。
- 原因去重键为 `day + code`。同一天同 code 只保留一个代表性命中；跨天保留。
- 数值型 code 选择更危险的观测（风/热/累计取最大，低能见度/严寒取最小）；组合、WMO 和
  连续规则选择冻结 window/sample 顺序中的最早命中；并列按 sample 顺序、桶时间。
- 单桶规则的 `at` 使用该桶的 `bucketStartLocal/bucketEndLocal`；连续三小时规则使用首次
  匹配的第一个桶起点和第三个桶终点；累计规则使用所属 window 的
  `startLocal/endLocalExclusive`。数值规则最终选中的危险观测同时决定 `observed` 和 `at`，
  不得从不同候选拼接位置和值。
- 最终排序：`no_go` 在前，再按 day、触发起始时间、冻结 sample 顺序和下表 code 顺序。

固定 code 顺序：

```text
thunderstorm
freezing_rain
extreme_wind_gust
heavy_snow_with_wind
heavy_snow_with_low_visibility
activity_window_snowfall
extreme_heat
extreme_cold
strong_wind_gust
low_visibility
heavy_rain_three_hours
activity_window_precipitation
apparent_heat
apparent_cold
rain_or_snow
```

排序只用于稳定展示，不是加权或机械评分。

## Out of scope

- 官方禁行、blocked route、climb support、能力等级、队伍/向导、预报提前量和日落；由 I16
  与可信 route/weather facts 组合。
- `insufficient/place_only → verdict=null` 的最终公开语义；由 I16 处理。
- 公共 handler/response、I13 catalog 接线、I17 queryId、装备、AI、历史或前端。
- 修改 I14 窗口、单位、上游请求、数据不足语义或坐标转换。
- 加权总分、概率单独阻断、实时网络测试、缓存、依赖、部署或迁移。

## TDD requirement

1. 先新增 I15 契约测试并运行 `test:verdict`；真实 RED 必须是模块/导出缺失。
2. fixture 从 I14 `fetchRouteWeather` 的离线注入边界生成 complete snapshot，不手写另一套
   生产天气 shape。
3. 一个真实 RED 足够；实现最小 GREEN 后运行完整矩阵。

## Required tests

- 安全天气为 `go`；单独 `precipitationProbabilityPct=100` 仍为 `go`。
- 阵风 `13.399/13.4/21.999/22`，高温 `31.999/32/40.999/41`，低温
  `-29.001/-29/-28.999/0`，能见度 `50.001/50`。
- WMO 雷暴、冻雨和普通雨雪集合使用表驱动；不为同型 case 复制实现分支。
- 中大雪分别与 `13.4m/s` 阵风、`50m` 能见度组合；同桶泛化原因抑制敏感。
- 同 sample 的两桶/三桶/中断重雨；不得跨 sample 拼成三小时。
- 单 window/sample 累计 `39.999/40mm` 与 `14.999/15cm`；不得跨 sample 或 stage 拼接；
  同 stage 跨午夜可累计。
- 多 sample 中任一点升级结论，不被其他安全点抵消；同一天重复 code 的危险观测选择、跨天
  保留和固定排序。
- 所有 code 的固定中文 `message` 精确映射。
- 输入深度不变、相同输入重复输出一致；一个 non-complete 输入守卫。

## Acceptance

1. `test:verdict` 独立运行并纳入根 `test`。
2. 所有冻结边界、组合、累计、连续、去重和排序语义与本合同一致。
3. 输出无随机数、当前时间、I/O、AI、路线推断或加权分数；输入不被修改。
4. I14 hourly、legacy weather、route-domain、root test、integration、lint、typecheck 和 WeChat
   build 保持通过。
5. 实际 diff 仅包含激活后的 allowlist；文档不再把活动窗口累计误称完整 24h/自然日累计。

完整验证命令：

```bash
corepack npm@10.9.2 run test:verdict
corepack npm@10.9.2 run test:hourly-weather
corepack npm@10.9.2 run test:weather
corepack npm@10.9.2 run test:route-domain
corepack npm@10.9.2 test
corepack npm@10.9.2 run test:integration
corepack npm@10.9.2 run lint
corepack npm@10.9.2 run typecheck
corepack npm@10.9.2 run build:weapp
git diff --check
```

## Agent autonomy and escalation

Terra 可自行决定私有 helper、候选收集和常量组织；不得改变接口、code、阈值、包含边界、
reason 形状、去重/排序、累计范围、I15/I16 边界或测试强度。

发现下列情况必须停止并升级 Sol：

- I14 complete snapshot 无法满足合同而需要修改其接口或请求。
- 需要把 blocked route、climb、日落、预报提前量或 `verdict=null` 偷入 I15。
- 需要修改公共 handler、I07 schema、依赖或真实路线。
- 同一问题连续两轮修复仍未通过 Review，或需要降低验收标准。

## Required result package

- 完成情况、修改摘要和实际文件。
- RED 命令/失败原因、GREEN 与完整验证结果。
- 与合同的偏差、自主实现级决策和已知限制。
- PR 链接与建议 Sol 重点 Review 位置。
