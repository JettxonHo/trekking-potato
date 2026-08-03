# 当前活动任务

- Task ID: `TP-P0-002`
- Title: 调查天气窗口是否从出发日期开始并严格对应行程天数
- Status: `READY`
- Authorized mode: `INVESTIGATION`
- Priority: `P0`
- Controller-owned: `true`
- Activation condition: 本任务进入 `main`，并收到主控明确的开始调查指令
- Primary objective: 确认天气请求、后端归一化、AI Prompt 和前端展示是否真正使用用户选择的出发日期与行程天数；确认超出可用预报范围时是否错误展示当前天气，并形成最小修复方案和测试设计。

## 背景

主计划要求：

1. 天气窗口必须从用户选择的出发日期开始；
2. 返回天数必须严格对应用户选择的行程天数；
3. 如果完整行程超出天气 API 的可用预报范围，系统不得用当前日期天气冒充出行日期天气；
4. 超范围情况必须返回明确、可供前端处理的 `out_of_range` 状态。

当前实现疑似只根据出发日扩大请求天数，但返回数组仍从 API 的第一天开始；前端和 Prompt 可能继续使用整个数组或第一天数据。

本任务只调查、建立证据并设计修复方案，不授权修改产品代码。

## 必须回答的问题

1. 用户输入的 `date` 和 `tripDays` 在前端如何构造并发送；
2. 云函数如何校验和归一化 `date`、`tripDays`；
3. `fetchWeather` 如何计算 `daysAhead` 和 `forecastDays`；
4. Open-Meteo 返回的 `daily.time` 从哪一天开始；
5. 当前代码是否根据用户出发日定位对应数组索引；
6. 当前代码是否按 `tripDays` 截取天气窗口；
7. 选择未来日期时，结果中的第一天天气是否仍是当前日期；
8. `tripDays=1/2/3/...` 时前端实际展示多少天；
9. Prompt 收到的是整个天气数组还是行程窗口；
10. `microclimate.windMs` 等首日派生字段使用的是当前日还是出发日；
11. 超出预报范围时当前返回什么数据和状态；
12. `dateOutOfRange` 是否仍携带并展示当前可用天气；
13. 前端是否把超范围天气当作正常天气卡片展示；
14. 过去日期、当天、预报范围边界和部分覆盖行程分别如何处理；
15. 本地缓存或历史记录是否保存错误日期窗口；
16. 最小正确修复应修改哪些文件；
17. 应添加哪些日期契约与回归测试。

## 允许读取范围

可读取但不得修改：

- `cloudfunctions/getAdvice/weather.js`
- `cloudfunctions/getAdvice/index.js`
- `cloudfunctions/getAdvice/prompt.js`
- `taro-app/src/pages/index/index.jsx`
- `scripts/weather-contract-test.js`
- `scripts/unit-test.js`
- `scripts/e2e-local.js`
- 与日期、行程天数、天气窗口直接相关的数据验证、缓存或测试代码
- Open-Meteo 官方 Forecast API 文档
- Open-Meteo 官方 API 实际响应

如果需要读取额外文件，必须说明它与日期窗口数据流的直接关系。

## 允许修改范围

无。

本任务为只读调查，不允许修改任何仓库文件。

不得：

- 修改 `weather.js`；
- 修改日期计算；
- 修改天气数组；
- 修改 Prompt；
- 修改前端；
- 添加测试；
- 创建提交；
- 创建 PR；
- 修改依赖或 lock 文件；
- 处理路线类型；
- 处理路线确认；
- 处理安全规则；
- 处理可信上下文；
- 重构天气模块；
- 开始其他 P0/P1 任务。

## 必须完成的代码证据

必须指出并提供文件路径和行号：

### 输入层

- 出发日期输入的位置；
- 行程天数输入的位置；
- 提交参数的字段名称；
- 日期格式及其校验规则；
- 行程天数的边界规则。

### 后端编排

- `date` 和 `tripDays` 的解析位置；
- 调用 `fetchWeather` 的参数；
- 返回基础天气数据的位置；
- Prompt 使用天气数据的位置；
- 首日天气派生字段的位置。

### 天气模块

- 当前时间的生成位置；
- `daysAhead` 的计算；
- `forecastDays` 的计算；
- API 请求参数；
- `daily.time` 的处理方式；
- 天气数组的构建循环；
- 是否存在按出发日期切片；
- 是否存在按行程天数切片；
- 超范围状态的构造方式。

### 前端

- `weatherWindow` 的接收和缓存；
- 天气数组的渲染循环；
- `dateOutOfRange` 的展示方式；
- 是否仍展示超范围返回的天气卡片；
- 是否显示天气日期，用户能否识别日期错位。

### 测试

确认现有测试是否覆盖：

- 今天出发；
- 未来第 N 天出发；
- 多日行程；
- 预报范围最后一天；
- 行程部分超出范围；
- 出发日期完全超出范围；
- 过去日期；
- 夏令时或时区边界；
- Prompt 中的第一天天气；
- 前端显示天数。

## 官方 API 证据

只允许引用 Open-Meteo 官方文档或官方 API 响应。

必须确认：

1. `forecast_days` 的语义；
2. `past_days` 是否相关；
3. `daily.time` 默认从哪一天开始；
4. 可用预报范围和最大可请求天数；
5. API 是否支持直接指定 `start_date` 和 `end_date`；
6. 超出可用范围时 API 的行为；
7. 时区参数如何影响 `daily.time`。

报告必须记录：

- 官方页面标题；
- 实际访问地址；
- 访问时间；
- 支持结论的官方段落；
- 不得只引用搜索摘要。

## API 契约实验

在网络允许时，至少执行以下实验，响应只能保存到 `/tmp`：

1. 默认 `forecast_days` 请求；
2. 显式 `start_date/end_date` 请求；
3. 接近预报上限的日期请求；
4. 超出可用预报范围的日期请求。

每个实验必须记录：

- 完整命令；
- curl 退出码；
- HTTP 或 API 错误；
- `daily.time`；
- 返回天数；
- 请求日期与返回日期的关系。

不得伪造实时结果。

## 必须分析的场景

至少分析以下场景：

| 场景 | 预期调查重点 |
|---|---|
| 今天出发，1 天 | 是否只返回今天 |
| 今天出发，3 天 | 是否只返回连续 3 天 |
| 未来 2 天出发，1 天 | 第一天天气是否为出发日 |
| 未来 2 天出发，3 天 | 是否从出发日连续返回 3 天 |
| 预报范围最后一天出发，1 天 | 是否可完整覆盖 |
| 预报范围最后一天出发，2 天 | 是否因行程不完整而 out_of_range |
| 完全超出范围 | 是否仍返回当前天气 |
| 过去日期 | 是否被输入层或后端拒绝 |

不要假设预期实现，必须依据产品原则、官方能力和当前代码形成建议。

## 完整数据流

必须逐层绘制：

```text
Date picker / tripDays input
→ frontend submit params
→ cloud function validation
→ fetchWeather(date)
→ daysAhead / forecastDays
→ Open-Meteo request
→ daily.time and daily arrays
→ weather.js normalization
→ base response
→ Prompt / microclimate
→ frontend weatherWindow
→ frontend rendered dates
→ local cache/history

```

每个箭头必须说明：

- 输入值；
- 输出值；
- 日期范围；
- 天数；
- 是否切片；
- 是否存在错位；
- 是否存在静默降级。

## 最小修复方案设计

本轮不修改代码，但至少比较：

### 方案 A：API 请求直接使用 `start_date/end_date`

分析：

- 是否能直接请求完整行程窗口；
- 超出可用范围时如何识别；
- 是否减少本地索引错误；
- 与 Open-Meteo 限制是否兼容。

### 方案 B：请求较大窗口后在本地按日期切片

分析：

- 如何定位出发日索引；
- 如何确保完整覆盖 `tripDays`；
- 如何处理缺失日期；
- 是否更容易出现时区与边界错误。

必须给出推荐方案与理由。
推荐方案必须满足：

- 出发日是返回天气的第一天；
- 返回天数严格等于 `tripDays`；
- 完整行程无法覆盖时返回明确 `out_of_range`；
- 不用当前天气冒充未来行程天气；
- Prompt、首日派生字段和前端使用同一窗口；
- 可通过确定性测试验证。

## 测试设计

只设计测试，不添加测试。
每项测试必须包含：

```text
测试名称
固定当前时间
输入 date
输入 tripDays
Mock API daily.time
预期返回状态
预期返回日期
预期返回天数
Prompt 或前端关键断言
防止的回归
建议放置文件

```

必须覆盖前述全部边界场景。

测试设计应考虑如何固定或注入当前时间，避免测试随运行日期漂移。

## 基线验证

调查开始前运行：

```bash
git status --short
git branch --show-current
git log -1 --oneline
./scripts/agent-context-check.sh

node scripts/weather-contract-test.js
node scripts/unit-test.js
node scripts/e2e-local.js
```

预期已知基线：

```text
weather-contract-test:
PASS 6 / FAIL 0

unit-test:
PASS 28 / FAIL 0

e2e-local:
exit 1
Cannot find module 'wx-server-sdk'

```

如实际结果不同，必须记录，不能修改代码让其通过。
## 验收标准

1. 明确判断日期窗口问题是否存在；
2. 给出代码、官方文档和 API 响应三类证据；
3. 明确当前第一天天气对应哪一天；
4. 明确当前返回天数与 `tripDays` 的关系；
5. 明确超范围时是否错误展示当前天气；
6. 明确 Prompt、首日派生字段和前端的影响；
7. 给出完整日期数据流；
8. 给出推荐修复方案；
9. 给出建议修改文件清单；
10. 给出可重复、固定时间的测试设计；
11. 工作区保持完全干净；
12. 不产生提交；
13. 状态只能为 `READY_FOR_CONTROLLER_REVIEW`。

## 调查报告格式

```text
# TP-P0-002 调查报告

## 状态
READY_FOR_CONTROLLER_REVIEW
或具体 BLOCKED 状态

## 同步握手
- Governance version：
- Plan version：
- Task ID：
- Authorized mode：
- MASTER_PLAN SHA-256：
- ACTIVE_TASK SHA-256：
- ACTIVE_TASK Git blob：
- 当前分支：
- 当前 HEAD：
- 初始工作区：

## 结论
- 问题是否存在：
- 严重程度：
- 一句话根因：
- 当前第一天天气对应：
- 当前返回天数规则：
- 超范围当前行为：

## 输入与校验证据
- 前端日期：
- 前端行程天数：
- 提交参数：
- 后端校验：

## 天气模块证据
- daysAhead：
- forecastDays：
- 请求参数：
- daily.time：
- 数组构建：
- 出发日切片：
- tripDays 切片：
- 超范围处理：

## 下游影响
- base response：
- Prompt：
- microclimate：
- frontend：
- cache/history：

## 官方文档证据
- forecast_days：
- start_date/end_date：
- 可用范围：
- timezone：
- 官方来源：
- 访问时间：

## API 实验
逐项列出命令、退出码、返回日期和错误。

## 场景矩阵
逐项给出当前行为与正确预期。

## 完整数据流
使用文本箭头描述。

## 根因

## 方案比较
### 方案 A
### 方案 B
### 推荐方案

## 建议测试
逐项列出固定时间、输入、Mock、断言和防止的回归。

## 预计修改文件
只列路径与修改目的，不修改文件。

## 风险与未决问题

## 命令执行结果
列出真实退出码。

## 额外读取文件
列出路径及读取理由。

## 最终工作区
粘贴 `git status --short` 的完整输出。

```

## 下一任务

无。

执行 Agent 不得自行创建实施任务。调查完成后必须等待主控审查。
