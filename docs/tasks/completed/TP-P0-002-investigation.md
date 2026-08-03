# TP-P0-002 调查阶段完成记录

- Task ID: `TP-P0-002`
- Phase: `INVESTIGATION`
- Final status: `VERIFIED`
- Controller decision: `APPROVED_FOR_IMPLEMENTATION`
- Governance version: `TP-GOV-1.0.0`
- Plan version: `1.0.0`
- Investigated main SHA: `f727d7b2e839eecfd01b85165afb013a9d7068ca`
- Investigation ACTIVE_TASK Git blob: `12619e8cbbbc884b8032465942e4a11f18c3ea9a`
- Investigation ACTIVE_TASK SHA-256: `b88c6ab9cd39977ddb7bfa600ebe0e0382d471c63232b45c4a4e83431ff8197f`
- Investigation rounds: `1`
- Controller-owned: `true`

## 结论

当前天气请求使用 `forecast_days` 扩大从今天开始的预报数组，但没有将用户选择的出发日期作为返回窗口起点。

`tripDays` 没有进入天气函数，返回天气天数与行程天数无确定性关系。

超出当前预报范围时，系统仍可能以 `ok: true` 返回从今天开始的天气数组，并通过备注说明超范围，构成静默日期错位。

## 下游影响

- `weather.days[0]` 可能是今天，而不是用户出发日；
- Prompt 接收整个错误天气数组；
- `microclimate.windMs` 使用错误的第一天；
- 前端渲染整个错误数组；
- 本地缓存保存错误日期窗口；
- 用户虽然能看到天气日期，但结果仍可能被误认为与行程对应。

## 官方能力

Open-Meteo Forecast API 支持：

- `start_date`
- `end_date`
- `timezone`

未指定日期范围时，默认序列从请求当天的当地 00:00 开始。

官方描述最多可返回 16 天预报，但实时 API 对显式日期范围的实际可用结束日可能动态变化，因此不能硬编码具体未来边界。

## 主控方案

采用方案 A（增强版）：

1. 天气请求使用 `start_date/end_date`；
2. `end_date = start_date + tripDays - 1`；
3. API 返回日期必须与期望日期数组完全一致；
4. API 拒绝或只返回部分行程时返回 `out_of_range`；
5. `tripDays` 必须由后端验证并传入天气函数；
6. Prompt、首日派生字段和前端继续复用统一后的天气数组；
7. 不修改 Prompt 和前端实现。

## 范围外事项

以下内容不在本任务内：

- 第二阶段客户端可信上下文；
- 路线类型；
- 模糊匹配确认；
- 路线模型；
- UGC；
- 前端架构重构。
