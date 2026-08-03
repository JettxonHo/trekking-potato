# 当前活动任务

- Task ID: `TP-P0-004`
- Title: 调查模糊路线匹配是否形成完整的用户确认闭环
- Status: `READY`
- Authorized mode: `INVESTIGATION`
- Priority: `P0`
- Controller-owned: `true`
- Activation condition: 本任务进入 `main`，并收到主控明确的开始调查指令
- Primary objective: 确认后端返回 `needsConfirm` 时，前端是否进入明确的路线确认状态；确认用户能否查看候选路线、地区、类型和来源，并通过确认、取消或修改输入完成闭环；确认只有用户明确确认后的可信规范路线才能继续查询天气、生成规则和建议，避免缺失 base 数据、重复模糊匹配、错误路线建议或绕过确认。

## 背景

主计划要求：

> 后端返回 `needsConfirm` 时，前端必须进入确认状态，用户明确确认路线后才能查询天气和生成建议。

前序 `TP-P0-003` 已保证模糊匹配候选能够携带：

- 规范路线名称；
- 坐标；
- 海拔；
- 路线类型；
- 类型来源；
- 匹配方式。

但前序任务明确没有实施完整的模糊匹配确认交互闭环。

当前需要调查：

- 前端是否识别 `needsConfirm`；
- 候选响应是否会被误当成正常 base 响应；
- 是否会携带缺失的天气和规则数据进入 advice 阶段；
- 用户确认后如何重新提交；
- 重新提交是否会再次触发同一模糊匹配；
- 是否存在无限确认循环；
- 取消、修改路线和加载状态是否完整；
- 候选路线类型是否向用户可见；
- 确认后的路线身份是否来自服务端可信路线数据。

以上均为待调查问题，不得在读取代码前写成既定事实。

## 必须回答的问题

1. 内置路线匹配当前有哪些匹配方式；
2. 哪些匹配方式会产生 `needsConfirm`；
3. 编辑距离阈值如何计算；
4. 一个输入是否可能命中多个候选；
5. 当前返回单个候选还是候选列表；
6. 候选对象包含哪些字段；
7. 是否包含规范路线名称；
8. 是否包含地区；
9. 是否包含坐标和海拔；
10. 是否包含路线类型和类型来源；
11. `needsConfirm` 在后端哪个阶段返回；
12. 返回确认状态前是否已经查询天气；
13. 返回确认状态前是否已经生成规则；
14. 返回确认状态前是否调用 LLM；
15. 前端 `_submitBase` 是否识别 `needsConfirm`；
16. 前端是否把确认响应当作正常 base 数据；
17. 前端是否随后调用 advice 阶段；
18. 缺失天气或规则时 advice 阶段如何处理；
19. 当前用户界面是否展示候选路线；
20. 是否展示候选地区和路线类型；
21. 用户是否有明确的“确认”按钮；
22. 用户是否有“不是这条”或取消入口；
23. 用户修改路线文本后是否清除候选状态；
24. 确认后提交的是原始输入还是规范路线名称；
25. 确认后是否重新走服务端精确匹配；
26. 是否可能再次产生 `needsConfirm`；
27. 是否可能形成确认循环；
28. 确认后的 routeType 和 routeTypeSource 如何保存；
29. 确认后的坐标和海拔是否由客户端直接决定；
30. 用户能否篡改候选中的坐标或类型；
31. 缓存是否保存未确认候选；
32. 历史是否保存未确认候选；
33. 取消确认后 loading、error 和 result 状态是否正确恢复；
34. 页面卸载或重复点击时是否可能产生并发 advice 请求；
35. 外部位置的 `route_type_required` 与模糊路线 `needsConfirm` 是否被清晰区分；
36. 手动坐标弹窗是否会误用于模糊路线确认；
37. 最小修复需要修改哪些文件；
38. 应增加哪些确定性契约与回归测试。

## 允许读取范围

可读取但不得修改：

- `cloudfunctions/getAdvice/data/routes.js`
- `cloudfunctions/getAdvice/geocode.js`
- `cloudfunctions/getAdvice/index.js`
- `cloudfunctions/getAdvice/route-type.js`
- `cloudfunctions/getAdvice/weather.js`
- `cloudfunctions/getAdvice/gear-rules.js`
- `cloudfunctions/getAdvice/prompt.js`
- `taro-app/src/pages/index/index.jsx`
- `cloudfunctions/history/index.js`
- `scripts/route-type-contract-test.js`
- `scripts/weather-contract-test.js`
- `scripts/unit-test.js`
- `scripts/e2e-local.js`
- 与 `needsConfirm`、编辑距离、base/advice 编排、前端状态、缓存和历史直接相关的文件

读取额外文件时必须说明其与确认闭环的直接关系。

## 允许修改范围

无。

本任务为只读调查，不允许修改任何仓库文件。

不得：

- 修改路线匹配；
- 修改编辑距离阈值；
- 修改后端响应；
- 修改前端；
- 添加确认弹窗；
- 添加测试；
- 修改 Prompt；
- 修改天气；
- 修改路线类型规则；
- 创建分支；
- 创建提交；
- push；
- 创建 PR；
- 部署云函数；
- 构建或发布前端；
- 修改依赖或 lock 文件；
- 实施 `queryId`；
- 开始路线数据模型升级；
- 开始确定性安全合并；
- 开始其他任务。

## 必须完成的代码证据

所有结论必须提供：

```text
文件路径
起止行号
输入
匹配方式
候选响应字段
前端接收字段
状态变化
下一次请求参数
是否调用天气
是否调用规则
是否调用 advice
是否缓存
是否写历史
结论
```

### 匹配层

确认：

* 精确名称匹配；
* 别名匹配；
* 包含匹配；
* 编辑距离匹配；
* 编辑距离算法；
* 编辑距离阈值；
* 候选排序；
* 是否只返回首个候选；
* `matchType` 的所有可能值；
* `needsConfirm` 的设置条件；
* 精确、别名和包含匹配是否也可能需要确认；
* 编辑距离候选是否保留完整路线对象；
* 输入已经等于规范名称时是否一定走精确匹配。

### 解析层

确认：

* `resolveLocation` 如何处理 `matchBuiltinRoute` 返回值；
* 是否重建候选对象；
* 候选中保留哪些字段；
* `needsConfirm` 在内置、UGC和高德路径中的含义是否一致；
* 高德的 `needsConfirm` 是否与编辑距离确认使用同一字段；
* `matchType === 'editDistance'` 是否是唯一判定条件；
* `routeType / routeTypeSource` 是否始终存在。

### 后端编排

确认：

* `needsConfirm` 在天气请求前还是后返回；
* 是否在规则计算前返回；
* base 阶段确认响应的完整结构；
* 是否携带 `phase`；
* `ok` 当前为 true 还是 false；
* advice 阶段是否接受确认响应作为 `baseData`；
* `validateBaseData` 会如何处理；
* 确认响应缺少哪些正常 base 字段；
* 是否存在服务端“已确认”参数；
* 是否存在绕过编辑距离再次匹配的机制。

### 前端

确认：

* `_submitBase` 对 `ok:false` 的处理；
* `_submitBase` 对 `ok:true + needsConfirm:true` 的处理；
* 是否设置 `result`；
* 是否设置 `showResult`；
* 是否启动 advice loading；
* 是否调用 `_fetchAdvice`；
* 是否存在候选确认 state；
* 是否存在候选弹窗或卡片；
* 是否存在确认、取消、修改按钮；
* 候选路线名称、地区、类型和来源是否可见；
* 用户确认后调用哪个函数；
* 确认后发送哪些参数；
* 用户编辑路线文本是否清除候选；
* 多次点击提交是否可能并发；
* 请求失败后状态是否可恢复。

### 缓存与历史

确认：

* 确认响应是否可能进入 result cache；
* 未确认候选是否会在页面重启后恢复；
* 未确认候选是否可能写入历史；
* 确认后缓存保存原始输入还是规范路线名；
* 历史保存原始输入还是规范路线名；
* routeType 和 routeTypeSource 是否保存；
* 取消确认是否清除临时候选状态。

## 只读复现实验

只允许在 `/tmp` 创建：

```text
/tmp/tp-p0-004-confirmation-repro.js
```

不得写入仓库。

脚本要求：

* 使用 Node 内置模块和仓库现有模块；
* 不访问真实网络；
* 不调用真实云服务；
* 必要时 mock `wx-server-sdk`；
* 输出结构化 JSON；
* 不修改任何仓库文件。

至少复现：

1. 精确匹配一个 `trek`；
2. 精确匹配一个 `climb`；
3. 精确匹配一个 `tour`；
4. 别名匹配；
5. 包含匹配；
6. 编辑距离匹配；
7. 一个不会匹配的输入；
8. 编辑距离候选的：
   * name
   * matchType
   * needsConfirm
   * type
   * typeSource
   * lat
   * lon
   * elevation
9. 使用规范路线名重新提交后是否变为精确匹配；
10. 原始模糊输入重复提交是否持续返回确认；
11. 将确认响应作为 advice `baseData` 时的实际处理结果；
12. `route_type_required` 与编辑距离 `needsConfirm` 的响应差异。

如果无法直接调用云函数入口：

* 不得修改生产导出；
* 可结合公开纯函数和静态代码证据；
* 必须明确实验限制。

报告必须包含：

```text
临时脚本路径
核心逻辑
执行命令
退出码
真实输出摘要
工作区检查
```

## 场景矩阵

至少填写：

| 场景            | 后端响应 | 前端当前行为 | 正确预期 |
| ------------- | ---- | ------ | ---- |
| 精确 trek       |      |        |      |
| 精确 climb      |      |        |      |
| 精确 tour       |      |        |      |
| 别名匹配          |      |        |      |
| 包含匹配          |      |        |      |
| 编辑距离模糊匹配      |      |        |      |
| 用户确认候选        |      |        |      |
| 用户取消候选        |      |        |      |
| 用户修改路线文本      |      |        |      |
| 重复提交原模糊输入     |      |        |      |
| 提交规范路线名       |      |        |      |
| 模糊 climb 候选   |      |        |      |
| 模糊 tour 候选    |      |        |      |
| 外部位置需要类型选择    |      |        |      |
| advice 收到确认响应 |      |        |      |
| 页面缓存恢复        |      |        |      |
| 历史记录          |      |        |      |

每项说明：

* 用户输入；
* 匹配方式；
* 候选路线；
* routeType；
* 用户可见信息；
* 是否明确确认；
* 下一次请求；
* 是否查询天气；
* 是否调用规则；
* 是否调用 LLM；
* 是否缓存；
* 是否写历史；
* 是否存在错误建议风险。

## 完整数据流

必须绘制：

```text
Route text input
→ frontend onSubmit
→ base cloud request
→ matchBuiltinRoute
→ exact / alias / contains / editDistance
→ resolveLocation
→ needsConfirm response
→ frontend base success handler
→ confirmation state or normal base state
→ user confirm / cancel / edit
→ confirmed request
→ exact canonical route resolution
→ routeType and routeTypeSource
→ gear rules
→ weather
→ base response
→ advice request
→ Prompt / degraded response
→ result
→ cache
→ history
```

每一层标明：

```text
字段
输入
输出
可信来源
是否需要用户确认
是否允许客户端修改
状态名称
异常处理
是否继续下一阶段
```

## 影响判断

### 错误路线风险

* 用户输入错误时是否可能直接获得另一条路线的建议；
* 候选地区是否足以帮助用户判断；
* 同名或近似名称是否可能跨省误匹配；
* climb 或 tour 候选是否可能被错误接受。

### 编排完整性

* 确认响应是否缺失天气或规则；
* 前端是否可能仍进入 advice；
* advice 是否确定性拒绝；
* 是否产生无意义 loading、错误提示或降级结果。

### 用户体验

* 用户是否理解系统匹配到哪条路线；
* 用户是否能够确认或拒绝；
* 取消后是否能继续编辑；
* 加载状态是否结束；
* 是否存在重复弹窗或无限循环。

### 数据可信度

* 用户确认后，坐标和类型是否重新由服务端解析；
* 是否直接信任客户端候选对象；
* 是否需要服务端短期 token；
* 最小 P0 修复与 P1-1 `queryId` 的边界。

### 缓存与历史

* 未确认候选是否持久化；
* 错误候选是否可能写入历史；
* 修复后旧缓存是否自然过期；
* 是否需要历史迁移。

## 方案比较

本轮不修改代码，至少比较：

### 方案 A：前端显式确认后使用规范路线名重新发起 base 请求

分析：

* 前端保存候选的规范路线名、地区、类型和来源；
* 用户确认后只提交规范路线名；
* 服务端重新执行精确匹配；
* 天气、规则和类型重新由服务端生成；
* 是否能避免客户端直接决定坐标和类型；
* 是否会再次进入模糊匹配；
* 最小修改文件；
* 测试难度。

### 方案 B：确认响应携带服务端短期确认令牌

分析：

* 令牌保存候选路线身份；
* 用户确认后提交令牌；
* 服务端直接恢复候选；
* 与后续 P1-1 `queryId` 的关系；
* 实施复杂度；
* 是否超出当前 P0 最小修复范围。

### 方案 C：客户端直接回传候选坐标和类型

分析：

* 实施成本；
* 客户端篡改风险；
* 是否违反可信路线事实原则；
* 是否应被拒绝。

必须给出推荐方案。

推荐方案必须满足：

1. 未确认时不查询天气；
2. 未确认时不生成规则；
3. 未确认时不调用 LLM；
4. 前端明确显示候选名称、地区和类型；
5. 用户有确认、取消和修改入口；
6. 用户确认后由服务端重新获得可信路线事实；
7. 客户端不能直接决定坐标、海拔或类型；
8. 确认后不会再次进入同一模糊匹配循环；
9. 未确认候选不进入缓存和历史；
10. `route_type_required` 与模糊确认状态保持区分；
11. 能通过离线确定性测试验证；
12. 不提前实施完整 P1-1 可信上下文架构。

## 测试设计

只设计，不新增测试。

每项测试必须包含：

```text
测试名称
用户输入
匹配方式
后端第一阶段响应
前端状态
用户操作
确认后请求参数
期望匹配方式
是否查询天气
是否调用规则
是否调用 advice
期望缓存
期望历史
防止的回归
建议测试文件
```

至少覆盖：

1. 精确匹配直接进入 base；
2. 别名匹配直接进入 base；
3. 包含匹配行为；
4. 编辑距离返回确认状态；
5. 确认页面展示规范路线名；
6. 展示地区；
7. 展示 trek 类型；
8. 展示 climb 类型；
9. 展示 tour 类型；
10. 用户确认后提交规范路线名；
11. 规范名称重新匹配为 exact；
12. 用户取消；
13. 用户修改输入；
14. 重复提交不产生并发；
15. 未确认不调用天气；
16. 未确认不调用规则；
17. 未确认不调用 advice；
18. 未确认不写缓存；
19. 未确认不写历史；
20. confirmation 与 route_type_required 分离；
21. advice 拒绝不完整 baseData；
22. 页面卸载时不继续状态更新；
23. 错误路线不能通过客户端回传坐标或类型绕过。

## 预计修改文件

只列出未来实施可能涉及的文件和目的，不得修改。

必须区分：

```text
必须修改
可能修改
不应修改
```

不得把以下内容混入当前实施范围：

* 完整 `queryId` 架构；
* 路线数据模型升级；
* 最终确定性安全合并；
* UGC 授权和审核；
* 天气逻辑；
* 路线类型规则重构；
* 大型前端状态管理重构。

## 基线验证

调查开始前执行：

```bash
git status --short
git branch --show-current
git log -1 --oneline
./scripts/agent-context-check.sh
node scripts/route-type-contract-test.js
node scripts/weather-contract-test.js
node scripts/unit-test.js
node scripts/e2e-local.js
```

预期：

```text
route-type-contract-test:
PASS 93 / FAIL 0
weather-contract-test:
PASS 86 / FAIL 0
unit-test:
PASS 55 / FAIL 0
e2e-local:
exit 1
Cannot find module 'wx-server-sdk'
```

如结果不同，必须记录，不得修改代码让其通过。

## 验收标准

1. 明确所有路线匹配方式；
2. 明确 `needsConfirm` 的唯一或全部触发条件；
3. 明确确认响应的真实字段；
4. 明确确认返回发生在天气、规则和 LLM 的哪个阶段；
5. 明确前端当前如何处理确认响应；
6. 明确是否会错误进入 advice；
7. 明确用户当前是否有确认、取消和修改入口；
8. 明确确认后应提交什么；
9. 明确如何避免再次触发相同模糊匹配；
10. 明确 routeType 和 routeTypeSource 如何保留；
11. 明确未确认候选的缓存和历史行为；
12. 给出完整确认数据流；
13. 给出最小修复方案；
14. 给出确定性测试设计；
15. 工作区保持完全干净；
16. 不产生提交；
17. 最终状态只能为 `READY_FOR_CONTROLLER_REVIEW`。

## 调查报告格式

```text
# TP-P0-004 调查报告
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
- needsConfirm 触发方式：
- 当前是否有确认 UI：
- 当前是否会错误进入 advice：
- 是否存在确认循环：
- 是否存在错误路线建议风险：
## 匹配层
- exact：
- alias：
- contains：
- editDistance：
- 阈值：
- 候选数量：
- 候选字段：
## 后端编排
- needsConfirm 返回阶段：
- 是否查询天气：
- 是否生成规则：
- 是否调用 LLM：
- response shape：
- advice 对该响应的处理：
- 服务端已确认机制：
## 前端
- 接收分支：
- 当前状态变化：
- 是否展示候选：
- 是否展示地区：
- 是否展示路线类型：
- 确认入口：
- 取消入口：
- 修改入口：
- 确认后请求：
- 并发与 loading：
## 缓存与历史
- 未确认缓存：
- 未确认历史：
- 确认后缓存：
- 确认后历史：
- 旧缓存：
## 只读复现实验
列出脚本、命令、退出码和真实输出。
## 场景矩阵
逐项给出当前行为、正确预期和风险。
## 完整数据流
使用文本箭头描述。
## 用户与安全影响
## 根因
## 方案比较
### 方案 A
### 方案 B
### 方案 C
### 推荐方案
## 建议测试
逐项给出输入、响应、状态、用户操作和后续请求断言。
## 预计修改文件
区分必须修改、可能修改和不应修改。
## 风险与未决问题
## 命令执行结果
列出真实退出码。
## 额外读取文件
列出路径和读取理由。
## 最终工作区
粘贴 git status --short 完整输出。
```

## 下一任务

无。

执行 Agent 不得自行创建实施任务。调查完成后必须等待主控审查。
