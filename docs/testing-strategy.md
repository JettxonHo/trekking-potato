# 徒步薯核心 Beta 测试策略

- Goal: `TP-BETA-001`
- Status: `APPROVED`
- Updated: `2026-08-06`

## 1. 原则

- 测试用户可观察行为和稳定契约，不绑内部实现。
- Bug 修复必须有能捕获原回归的测试。
- 确定性规则优先使用纯函数和离线 fixture。
- 网络、CloudBase 与 LLM 在默认 CI 中使用 fixture/mock；现有 E2E 对 Open-Meteo 的实时调用必须在 I02 移除，不把 live API 或真实部署当门禁。
- 不设机械覆盖率百分比。新增或改变的关键行为必须有对应测试。
- 深层审计和红队脚本保留为按需诊断，不进入默认 CI。

## 2. M1 后统一门禁

```bash
npm ci
npm run bootstrap
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build:weapp
```

在 I01/I02 完成前，真实基线命令为：

```bash
node scripts/route-type-contract-test.js   # 93/0
node scripts/weather-contract-test.js      # 86/0
node scripts/unit-test.js                  # 55/0
node scripts/e2e-local.js                   # 当前缺 wx-server-sdk，预期失败
```

## 3. 测试层级

- 单元：路线匹配、Schema、坐标、天气解析、活动窗口、结论、装备合并、reducer。
- 契约：prepare/confirm/advice union、错误码、单位、日期和 TripContext。
- 集成：mock CloudBase/Open-Meteo/DeepSeek 的完整编排。
- UI 状态：确认、取消、重复提交、迟到响应、降级和恢复，通过纯 reducer/服务测试覆盖。
- 构建：Taro 微信生产构建。
- 人工清单：微信开发者工具与真机待人工授权执行；清单准备是 Goal 要求，真实执行不是。

## 4. 关键矩阵

### 路线确认

- 规范名和别名直接解析。
- 模糊、前缀只返回候选。
- 候选展示 ID 之外的名称、地区、类型、天数。
- 确认前无天气、规则、AI、缓存、历史。
- 确认提交 candidate ID，服务端恢复可信事实。
- place-only 确认保留并校验用户 1–7 天；RouteVariant 忽略自由天数并使用 fixedDays。
- candidate 只允许 route_variant/full 或 place/place_only 两种组合。
- 取消或修改输入清除候选。
- `route_type_required` 不与 confirmation 混淆。

### 路线模型

- 地点、路线、变体 ID 唯一且引用有效。
- `nearbyPeakElevation` 不写入路线最高点或天气海拔。
- fixedDays 与 stages 一致；采样点 1–3 个且逐日引用有效。
- A/B verified 记录必备字段完整；C 级或 place-only 不产生结论。
- 五台山 blocked 记录不可规划。

### 天气与结论

- 时区、日期、活动小时和多采样点长度一致。
- 夜间雷暴不影响白天窗口；活动小时单点雷暴触发 no_go。
- 阵风 13.4/22、体感 32/41/-29/0、能见度 50、新雪 15、降水 40 边界。
- 降水概率单独不改变结论。
- 提前量 5 天为 caution。
- 小时缺口、单位错误或必要采样点失败 → `verdict=null`。
- climb + 新手 + solo → no_go；有经验队伍或向导 → 至少 caution。
- trek/tour 新手在安全完整天气下不机械降级。

### 可信上下文和隐私

- advice 只接受 queryId。
- 上下文按 openid 隔离，过期后要求重新 prepare。
- 客户端伪造 weather/routeType/baseData 不影响可信结果。
- 私人历史只返回当前 openid；支持单项删除和清空。
- 手动地点查询不产生公共 UGC；旧公共数据不进入解析路径。

### 状态与降级

- base 先显示，AI 后补充。
- AI 失败不删除 verdict、reasons、天气或最低装备。
- 天气失败显示有限路线结果和重试。
- 历史失败不影响本次结果。
- request token 阻止旧响应覆盖新查询。
- 页面卸载后不继续更新状态。

## 5. PR 验证要求

PR 描述列出实际命令、退出码和结果摘要。无法运行的命令必须写明原因及影响，不能写成通过。Sol XHigh 会阅读测试本身，不能只凭通过数量批准。

## 6. M7 人工验证清单

- 五个试点各完成一次输入到结果流程。
- 模糊候选的确认、取消和修改。
- 天气、AI、历史分别模拟失败。
- 装备 checklist 勾选与重新查询。
- 来源、时间、置信度和地点级限制可见。
- 微信生产构建可被开发者工具导入。
