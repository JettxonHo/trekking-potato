# 徒步薯 — Agent 执行协议

- Protocol version: `1.0.0`
- Applies to: Codex、Claude Code、Cursor Agent 及其他代码执行 Agent

## 1. 角色

- 主控：维护产品目标、规划、优先级、任务边界和最终验收。
- 执行 Agent：在授权范围内调查、实现、测试和提交证据。

执行 Agent 无权自行选择下一任务、改变产品方向、扩大范围或宣布验收完成。

## 2. 三种授权模式

### INVESTIGATION

只读分析。不得修改代码、文档、依赖或 Git 状态。输出问题真实性、证据、根因、影响、最小方案和测试设计。

### IMPLEMENTATION

根因和方案已经获主控授权。允许修改 `ACTIVE_TASK.md` 中列出的文件范围，实施最小变更并运行规定验证。

### REVIEW_FIX

仅修复主控审查指出的问题。不得借返工重新设计或扩大范围。

## 3. 标准执行流程

1. 完成同步握手
2. 检查分支和工作区
3. 阅读任务要求和相关文件
4. 复现或验证基线
5. 仅在授权为 IMPLEMENTATION / REVIEW_FIX 时修改
6. 添加或更新相关测试
7. 运行任务要求的验证与必要回归
8. 检查 Diff 是否越界
9. 输出交付报告并停止

## 4. 工作区保护

- 不得执行 `git reset --hard`、`git clean -fd` 或覆盖用户修改。
- 不得擅自 stash、rebase、merge、force push。
- 发现未解释修改时先停止并汇报。
- 不得把格式化整个仓库、升级依赖或无关重命名混入任务。

## 5. 修改边界

`ACTIVE_TASK.md` 必须给出：

- 唯一任务 ID 和目标
- 授权模式
- 允许修改文件
- 禁止范围
- 验收标准
- 必须运行的命令
- 交付格式

若实现必须修改 allowlist 外文件，先停止并说明原因，不得先改后报。

## 6. 测试与证据

- Bug 修复优先提供失败测试或可重复复现步骤。
- 测试必须检查用户可观察行为或明确契约，避免只验证内部实现。
- 相关测试通过后，还需运行任务指定的回归命令。
- 无法运行的命令必须说明原因，不能写成“已通过”。

## 7. 提交原则

除非活动任务明确授权创建提交，否则只准备工作区修改。

授权提交时：

- 一个任务一个聚焦提交
- 使用 Conventional Commits
- 提交信息不能声称尚未由主控验证的结果

## 8. 执行 Agent 交付模板

```text
Task ID:
Mode:
Plan version and hash:
Summary:
Root cause or implementation approach:
Files changed:
Tests added or updated:
Commands run and results:
Diff boundary check:
Known limitations:
Unresolved risks:
Status: READY_FOR_CONTROLLER_REVIEW
```
