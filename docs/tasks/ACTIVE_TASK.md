# 当前活动任务

- Task ID: `TP-P0-002`
- Title: 使用 start_date/end_date 使天气窗口严格对应出发日期与行程天数
- Status: `REVIEW`
- Authorized mode: `IMPLEMENTATION`
- Priority: `P0`
- Controller-owned: `true`
- Activation condition: 调查报告经主控验收为 `VERIFIED`，主控选择方案 A（增强版）并授权实施
- Primary objective: 使用 Open-Meteo start_date/end_date 请求严格对应用户出发日期和行程天数的天气窗口；验证返回日期连续且完整，在完整窗口不可获得时返回确定性的 out_of_range，并添加固定时间的离线回归测试。

## 背景

调查阶段（已归档至 `docs/tasks/completed/TP-P0-002-investigation.md`）确认：

1. 天气窗口锚定在"今天"而不是用户选择的出发日期；
2. `tripDays` 从未进入天气层，返回天数与行程天数无确定性关系；
3. 超出预报范围时仍以 `ok: true` 返回从今天开始的天气数组，构成静默日期错位；
4. 过去日期被静默接受。

主控决策：`APPROVED_FOR_IMPLEMENTATION`，采用方案 A（增强版）。

## 核心契约

```text
weather.days[0].date === 用户选择的出发日期
weather.days.length === tripDays
weather.days 中的日期必须连续、完整并严格对应整个行程
完整窗口不可获得时：
  result.ok === false
  result.error === "out_of_range"
```

不得再根据固定的"10 天"或"16 天"常量判断 Open-Meteo 实际可用边界。Open-Meteo 的实时可用范围由服务端动态决定；以 API 错误响应和返回日期完整性为最终依据。

## 允许修改范围

只允许修改：

- `docs/tasks/ACTIVE_TASK.md`
- `docs/tasks/completed/TP-P0-002-investigation.md`
- `cloudfunctions/getAdvice/weather.js`
- `cloudfunctions/getAdvice/index.js`
- `scripts/weather-contract-test.js`
- `scripts/unit-test.js`

## 明确禁止修改

- `cloudfunctions/getAdvice/prompt.js`
- `taro-app/src/pages/index/index.jsx`
- `scripts/e2e-local.js`
- `package.json`
- `package-lock.json`
- `docs/governance/**`
- 其他产品代码

## 实施要求

### weather.js

1. 新增纯函数日期辅助：`isValidIsoDate`、`addIsoDays`、`diffIsoDays`、`getDateInTimeZone`，只接受真实存在的 `YYYY-MM-DD`，使用 UTC 日历运算，`getDateInTimeZone` 使用 `Intl.DateTimeFormat().formatToParts()`，产品时区固定 `Asia/Shanghai`；辅助函数可导出供离线测试使用。
2. `fetchWeather` 签名扩展为 `fetchWeather(lat, lon, elevation, dateStr, tripDays, options)`，`options.now` 仅用于确定性测试。
3. 严格验证日期与天数：非法日期返回 `invalid_date`；`tripDays` 必须为 1–7 整数，否则返回 `invalid_trip_days`；出发日期早于 `Asia/Shanghai` 今天时确定性拒绝；不得静默截断或修正非法值。
4. 请求窗口：`startDate = dateStr`，`endDate = addIsoDays(startDate, tripDays - 1)`，并生成完整期望日期数组。
5. Open-Meteo 请求保留 `latitude`、`longitude`、`elevation`、`daily`、`wind_speed_unit=ms`、`timezone=Asia/Shanghai`；删除 `forecast_days`，新增 `start_date`、`end_date`；不得同时发送 `forecast_days` 与 `start_date/end_date`。
6. API 错误 reason 明确表示 `start_date` 或 `end_date` 超出允许范围时返回 `out_of_range`（附 `requestedStartDate`、`requestedEndDate`）；不得向客户端暴露原始 reason，不得从 reason 解析并硬编码预报边界，不得回退请求今天开始的天气。
7. 构建 `days` 前严格验证：`daily.time` 必须是数组；长度不足（含部分覆盖）返回 `out_of_range`；日期缺失、乱序或起点错误返回 `weather_data_invalid`；不得使用 `slice` 掩盖错误起点。
8. 循环严格基于 `tripDays`，最终必须满足 `days[0].date === startDate` 且 `days.length === tripDays`。
9. `confidence` 使用相对今天的实际提前量：`leadDays = diffIsoDays(todayStr, daily.time[i])`，`leadDays >= 5` 为 `参考`，否则为 `正常`；不得继续使用 `i >= 5`。
10. 成功结果保持既有字段兼容：`days`、`source`、`windUnit`、`fetchedAt`、`elevationUsed`、`elevationCaveat`、`precipNote`，可保留 `dateOutOfRange: false`、`dateRangeNote: ''`；成功结果不得出现 `dateOutOfRange: true` 并同时携带今天开始的天气数组。

### index.js

1. 严格验证 `tripDays`：未提供默认 1；提供时必须能严格转换为 1–7 的整数；不接受 0、负数、小数、8 及以上、`"1abc"`、`NaN`；非法时返回 `invalid_trip_days`。
2. 在地理编码和天气请求前验证 `date` 为真实 `YYYY-MM-DD`；非法时返回 `invalid_date`；复用 `weather.js` 导出的日期校验函数。
3. 将 `tripDays` 传入 `fetchWeather`。
4. `invalid_date`、`invalid_trip_days`、`out_of_range`、`weather_data_invalid` 必须原样传播为 `ok: false`，可附带 `requestedStartDate`、`requestedEndDate`，不得转换为 `weather = null` 后继续生成建议；不得暴露 Open-Meteo 原始 reason；普通网络超时等既有降级行为不扩大处理。
5. 不修改 `buildMessages` 调用、`microclimate` 构造、降级规则、base response 成功结构和 advice 阶段。

### scripts/weather-contract-test.js

保持离线、无第三方依赖、测试结束恢复 `https.get`、失败退出 1，保留原有风速单位契约测试，使用固定时间 `{ now: FIXED_NOW }`，覆盖请求日期范围、单日行程、未来三日行程、风速数值贯穿、API 范围错误、部分覆盖、错误起点、缺失中间日期、日期乱序、过去日期、非法日期、非法 `tripDays`、`confidence` 提前量语义和原风速契约。

### scripts/unit-test.js

保留原有 28 项测试，新增 Prompt 日期窗口契约测试：构造三日行程窗口，断言 Prompt 包含全部行程日期且不包含窗口外日期的天气摘要；不修改 `prompt.js`。

## 必须运行的命令

```bash
node scripts/weather-contract-test.js
node scripts/unit-test.js
node scripts/e2e-local.js
```

已知基线：`e2e-local` 只允许保持既有环境失败（缺少 `wx-server-sdk`），不得安装依赖。

## 验收标准

1. `tripDays` 被后端严格归一化为 1–7 的整数；
2. `fetchWeather` 接收 `date` 和 `tripDays`；
3. 请求包含 `start_date`；
4. 请求包含正确的 `end_date`；
5. 请求不再包含 `forecast_days`；
6. 返回第一日严格等于出发日；
7. 返回长度严格等于 `tripDays`；
8. 日期必须连续、无缺失、无乱序；
9. 部分覆盖返回 `out_of_range`；
10. API 明确范围错误返回 `out_of_range`；
11. 完全超出范围不返回当前天气数组；
12. 过去日期被确定性拒绝；
13. Prompt 自动只收到行程窗口；
14. `microclimate.windMs` 自动对应出发日；
15. 前端自动只渲染 `tripDays` 天；
16. 风速 `m/s` 契约保持通过；
17. 新天气契约测试全部通过；
18. 原单元测试通过；
19. e2e 仅保留既有环境失败；
20. PR 只包含授权文件；
21. 最终状态为 `REVIEW`。

## 禁止事项

- 不得修改 Prompt 实现；
- 不得修改前端；
- 不得修改路线逻辑；
- 不得修改风速单位契约；
- 不得添加依赖；
- 不得修改 lock 文件；
- 不得修复 `wx-server-sdk` 环境；
- 不得硬编码 Open-Meteo 实际可用结束日期；
- 不得将 16 天当作永远可用的固定边界；
- 不得修改 MASTER_PLAN 或治理协议；
- 执行 Agent 不得将状态置为 `VERIFIED` 或 `DONE`。

## 交付状态

实施、测试与边界检查全部通过后，将 `Status` 更新为 `REVIEW`，保持 `Authorized mode: IMPLEMENTATION` 与 `Controller-owned: true`，等待主控代码审查。

## 下一任务

无。

执行 Agent 不得自行创建下一任务。
