# TP-P0-001 调查阶段完成记录

- Task ID: `TP-P0-001`
- Phase: `INVESTIGATION`
- Final status: `VERIFIED`
- Controller decision: `APPROVED_FOR_IMPLEMENTATION`
- Governance version: `TP-GOV-1.0.0`
- Plan version: `1.0.0`
- Investigated main SHA: `f161fd67227bd53291da2575c1f85eea3eff45d7`
- Investigation ACTIVE_TASK SHA-256: `a2e4dcf98354aa92e33f45cd1f398ce1ffb259e293ee706d666457ea02cd726a`
- Controller-owned: `true`

## 结论

Open-Meteo 请求没有显式传递 `wind_speed_unit`。默认返回值单位为 `km/h`，但系统将数值直接写入 `windMs`，并在 Prompt 与前端中按 `m/s` 解释。

## 影响

- 用户界面中的风速被高估 3.6 倍；
- AI Prompt 中的风速单位描述错误；
- 当前确定性装备规则未使用风速；
- 受影响的是展示层与 LLM 建议补充层；
- 本地缓存最长约 30 分钟，无需历史数据迁移。

## 主控选择方案

采用方案 A：

1. 请求参数显式添加 `wind_speed_unit=ms`；
2. 校验响应 `daily_units.wind_speed_10m_max` 为 `m/s`；
3. `windMs` 始终保存米每秒数值；
4. 返回明确的 `windUnit: "m/s"`；
5. 添加离线契约测试；
6. 不修改 Prompt 和前端现有 `m/s` 文字。

## 范围外事项

客户端回传可信天气数据属于 P1-1，不在本任务实施范围内。
