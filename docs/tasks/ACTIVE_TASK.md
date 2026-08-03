# 当前活动任务

- Task ID: `TP-P0-001`
- Title: 修复 Open-Meteo 风速单位与系统 `m/s` 契约（方案 A）
- Status: `REVIEW`
- Authorized mode: `IMPLEMENTATION`
- Priority: `P0`
- Controller-owned: `true`
- Primary objective: 在 Open-Meteo 请求边界显式固定风速单位为 m/s，校验响应单位元数据，保证 windMs、Prompt 和前端展示遵循同一单位契约，并添加防回归测试。

## 背景

调查阶段已确认：Open-Meteo 请求未显式传递 `wind_speed_unit`，API 默认返回 `km/h`，系统将数值直接写入 `windMs` 并在 Prompt 与前端按 `m/s` 解释。

调查结论已由主控验收（`VERIFIED`），授权采用方案 A 实施。调查阶段归档见 `docs/tasks/completed/TP-P0-001-investigation.md`。

## 允许修改范围

- docs/tasks/ACTIVE_TASK.md
- docs/tasks/completed/TP-P0-001-investigation.md
- cloudfunctions/getAdvice/weather.js
- scripts/weather-contract-test.js
- scripts/unit-test.js

## 禁止修改范围

- cloudfunctions/getAdvice/index.js
- cloudfunctions/getAdvice/prompt.js
- taro-app/src/pages/index/index.jsx
- package.json
- package-lock.json
- docs/governance/**
- 其他产品代码

## 实施要求

1. Open-Meteo 请求参数显式添加 `wind_speed_unit=ms`；
2. 校验响应 `daily_units.wind_speed_10m_max` 严格等于 `m/s`，缺失或错误单位返回确定性错误 `weather_data_invalid`；
3. `windMs` 始终保存米每秒数值，不做额外乘除换算；
4. 返回天气对象包含 `windUnit: "m/s"`；
5. 添加离线契约测试（不访问真实网络、不增加第三方依赖）；
6. 不修改 Prompt 和前端现有 `m/s` 文字。

## 验收标准

1. 请求 URL 显式包含 `wind_speed_unit=ms`；
2. 只接受 `daily_units.wind_speed_10m_max === "m/s"`；
3. 缺失或错误单位返回确定性错误；
4. `windMs` 不做额外乘除换算；
5. 返回天气对象包含 `windUnit: "m/s"`；
6. Prompt 仍输出正确的 `m/s`；
7. 新契约测试通过；
8. 原单元测试通过；
9. 已知 e2e 环境失败原因不发生变化；
10. 不修改 Prompt、前端或编排代码；
11. PR 只包含允许文件；
12. 最终状态为 `REVIEW`，等待主控审查。

## 下一任务

无。
执行 Agent 不得自行创建下一任务。实施结果必须由主控审查，之后才能决定是否建立后续任务。
