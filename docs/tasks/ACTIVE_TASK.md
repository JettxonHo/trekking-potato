# 当前活动任务

- Task ID: `TP-P0-001`
- Title: 调查 Open-Meteo 风速单位与系统 `m/s` 契约是否一致
- Status: `READY`
- Authorized mode: `INVESTIGATION`
- Priority: `P0`
- Controller-owned: `true`
- Activation condition: 本任务进入 `main`，并收到主控明确的开始调查指令
- Primary objective: 确认 Open-Meteo 返回的风速单位、后端内部字段、AI Prompt 和前端展示是否存在单位契约不一致，并形成最小修复方案与测试设计。

## 背景

当前天气请求疑似未显式指定 Open-Meteo 的风速单位，但后端字段和前端界面将返回值解释为 `m/s`。

本任务只负责确认问题、建立证据和设计修复方案，不授权修改产品代码。

## 调查问题

必须回答：

1. 当前 Open-Meteo 请求是否显式传递 `wind_speed_unit`；
2. 未显式传递时，官方默认风速单位是什么；
3. API 响应中的单位元数据是什么；
4. 返回值进入系统后被保存为什么字段；
5. 该字段如何传入 AI Prompt；
6. 前端最终展示的单位是什么；
7. 是否存在数值未转换但单位文字被标记为 `m/s` 的情况；
8. 该问题会影响哪些用户判断、风险提示或装备建议；
9. 最小正确修复应修改哪些文件；
10. 应添加哪些契约测试和回归测试。

## 允许读取范围

可读取但不得修改：

- `cloudfunctions/getAdvice/weather.js`
- `cloudfunctions/getAdvice/index.js`
- `cloudfunctions/getAdvice/prompt.js`
- `taro-app/src/pages/index/index.jsx`
- `scripts/unit-test.js`
- `scripts/e2e-local.js`
- 与上述文件直接引用的数据契约、测试或配置文件
- Open-Meteo 官方天气 API 文档
- Open-Meteo 官方 API 实际响应

如果实际路径与上述名称不同，只允许定位等价文件，不得修改。

## 允许修改范围

无。

本任务为只读调查，不允许修改任何仓库文件。

不得：

- 修改天气请求；
- 修改单位文字；
- 添加测试；
- 创建提交；
- 修改依赖；
- 修改 lock 文件；
- 更新 README、Spec、Plan 或 Tasks；
- 处理日期窗口；
- 处理路线类型；
- 处理模糊匹配；
- 处理安全规则合并；
- 重构天气模块；
- 开始其他 P0/P1 任务。

## 必须完成的证据

### 代码证据

必须指出：

- 请求参数构造位置；
- 风速字段命名位置；
- Prompt 数据使用位置；
- 前端单位展示位置；
- 现有测试是否覆盖单位契约。

每项证据必须包含文件路径和行号。

### 官方文档证据

必须引用 Open-Meteo 官方文档，确认：

- `wind_speed_unit` 支持的参数值；
- 默认风速单位；
- 如何请求 `m/s`。

不得仅引用搜索摘要、博客、论坛或模型记忆。

### API 响应证据

在网络条件允许时，分别请求：

1. 不带 `wind_speed_unit`；
2. 带 `wind_speed_unit=ms`。

使用相同坐标和相同天气变量，比较响应中的单位元数据。

示例只用于说明调查方式，可以根据当前 API 文档调整参数：

```bash
curl -sS "https://api.open-meteo.com/v1/forecast?latitude=31.23&longitude=121.47&daily=wind_speed_10m_max&forecast_days=1"

curl -sS "https://api.open-meteo.com/v1/forecast?latitude=31.23&longitude=121.47&daily=wind_speed_10m_max&wind_speed_unit=ms&forecast_days=1"

```

必须记录响应中的单位字段，不得只比较数值大小。
如网络不可用，报告失败命令和错误，不得伪造实时结果；官方文档证据仍必须完成。

## 基线验证

开始调查前运行：

```bash
git status --short
git branch --show-current
git log -1 --oneline
./scripts/agent-context-check.sh
node scripts/unit-test.js
```

可尝试：

```bash
node scripts/e2e-local.js
```

如果某项命令依赖缺失、凭据、网络或本地环境而无法运行，必须记录真实错误，不得写成通过。
不得为了让基线通过而修改代码。

## 验收标准

1. 明确判断问题是否真实存在；
2. 结论同时具有代码、官方文档和 API 契约证据；
3. 绘制完整数据流：


```text
Open-Meteo request
→ API response units
→ weather normalization
→ getAdvice base data
→ AI Prompt
→ frontend display

```

4. 说明用户可观察影响；
5. 判断是否影响安全建议；
6. 给出最小修复方案；
7. 给出应修改的文件清单；
8. 给出测试用例设计；
9. 记录兼容性风险和历史缓存影响；
10. 仓库工作区保持完全干净；
11. 不产生提交；
12. 状态只能为 `READY_FOR_CONTROLLER_REVIEW`。

## 调查报告格式

```text
# TP-P0-001 调查报告

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
- 当前分支：
- 当前 HEAD：
- 初始工作区状态：

## 结论
- 问题是否存在：
- 严重程度：
- 一句话根因：

## 代码证据
### 请求参数
- 文件：
- 行号：
- 当前行为：

### 后端字段和数据流
- 文件：
- 行号：
- 当前行为：

### Prompt
- 文件：
- 行号：
- 当前行为：

### 前端展示
- 文件：
- 行号：
- 当前行为：

### 现有测试
- 覆盖情况：
- 缺口：

## 官方文档证据
- 默认单位：
- 可选单位：
- 请求 m/s 的正确参数：
- 官方来源：

## API 响应证据
### 默认请求
- 命令：
- 单位元数据：
- 关键响应：

### wind_speed_unit=ms
- 命令：
- 单位元数据：
- 关键响应：

## 完整数据流
用文本箭头描述。

## 用户影响
- 显示影响：
- Prompt 影响：
- 风险判断影响：
- 装备建议影响：
- 缓存或历史数据影响：

## 根因
说明契约在哪一层断裂。

## 最小修复建议
- 必须修改：
- 不应顺带修改：
- 是否需要数据转换：
- 是否需要契约字段：

## 建议测试
逐项给出测试输入、断言和防止的回归。

## 预计修改文件
只列路径和修改目的，不修改文件。

## 风险与未决问题

## 命令执行结果
逐项列出真实结果。

## 最终工作区
粘贴 `git status --short` 完整输出。

```

## 下一任务

无。

执行 Agent 不得自行创建实施任务。调查结果必须由主控审查，之后才能决定是否建立修复任务。
