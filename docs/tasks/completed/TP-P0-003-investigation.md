# TP-P0-003 调查阶段完成记录

- Task ID: `TP-P0-003`
- Phase: `INVESTIGATION`
- Final status: `VERIFIED`
- Controller decision: `APPROVED_FOR_IMPLEMENTATION`
- Governance version: `TP-GOV-1.0.0`
- Plan version: `1.0.0`
- Investigated main SHA: `d8447a753a3594bd8f584c0893c4505216b400ae`
- Investigation ACTIVE_TASK SHA-256: `e2916b4defc2cbf61dd07490809225f805d53aafd1054525aa545fdd061e695b`
- Investigation ACTIVE_TASK Git blob: `6d0719d190ff8396abfde661c50fb3ad23b42fea`
- Investigation rounds: `1`
- Controller-owned: `true`

## 数据结论

- 内置路线总数：175
- `trek`：153
- `climb`：14
- `tour`：8
- 缺失类型：0
- 非法类型：0

## 根因

`matchBuiltinRoute` 保留了路线类型，但 `resolveLocation` 重建定位对象时没有复制 `type`。

下游使用 `loc.type || 'trek'`，将“类型未知”和“类型是 trek”混为一谈。

手动坐标路径同样硬编码为 `trek`。

## 安全影响

全部内置 `climb` 路线在生产调用链中进入规则层时都会变成 `trek`，导致滑坠风险和技术装备缺失。

Prompt、前端、缓存与历史记录均没有显式路线类型。

## 主控方案

采用严格路线类型契约：

1. 合法类型为 `trek / climb / tour`；
2. 解析边界允许 `unknown`；
3. `unknown` 不得进入规则层；
4. 内置路线透传可信类型；
5. 外部和旧 UGC 路线无法确认时要求用户选择；
6. 手动坐标必须明确选择类型；
7. `climb` 必须确定性触发滑坠风险和核心技术装备；
8. `tour` 使用 trek 基线但保持独立类型；
9. 类型进入 base、Prompt、前端、缓存和历史；
10. 完整服务端可信上下文仍由 P1-1 处理。

## 范围外事项

- 模糊路线确认闭环：`TP-P0-004`
- 路线数据模型升级：`TP-P0-005`
- 确定性安全项最终合并：`TP-P0-006`
- 服务端 `queryId` 可信上下文：`P1-1`
- UGC 授权和审核：`P1-2`
