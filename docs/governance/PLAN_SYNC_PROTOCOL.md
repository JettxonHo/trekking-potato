# 徒步薯 — 规划与上下文同步协议

- Protocol version: `2.0.0`
- Governance version: `TP-GOV-2.0.0`

## 1. 同步事实源

- 当前 Goal：`GOAL.md`
- 长期方向：`docs/governance/MASTER_PLAN.md`
- 当前状态：`docs/current-status.md`
- 当前任务：GitHub Issue 与 `docs/tasks/ACTIVE_TASK.md`
- 关键决策：`docs/decision-log.md`

不使用文件哈希作为激活条件。分支名、真实基准提交、Goal ID、Issue ID、治理版本和干净工作区足以完成同步。

## 2. 更新顺序

1. Sol XHigh 记录决策及原因。
2. 更新受影响的产品、架构或测试文档。
3. 必要时更新 `GOAL.md` 的状态，不在多个文件重复定义新范围。
4. 更新 GitHub Issue 和 `ACTIVE_TASK.md`。
5. 执行 Agent重新完成会话握手。

重要长期事实不得只存在于聊天中。

## 3. 检查点

无法可靠获得上下文比例时，在以下节点更新 `docs/current-status.md`：

- 每个里程碑完成
- 一批相关 Issues 完成
- 重大产品或架构决策完成
- 进入新阶段、准备全局 Review 或发生 Agent/会话交接
- 早期信息开始难以稳定召回

检查点记录 Goal、里程碑、Issues/PR、Agent 分配、分支与提交、测试、决策、阻塞、风险、下一步和禁止范围。

## 4. 恢复流程

压缩、重启或交接后重新读取：`AGENTS.md`、`GOAL.md`、`docs/current-status.md`、`docs/decision-log.md`、当前阶段文档、开放 Issues 与 PR。不得仅依赖模型摘要继续。

## 5. 漂移处理

若 Goal、Issue、文档和代码冲突，输出 `SYNC_BLOCKED`，列出具体冲突、可继续的独立工作和需要 Sol XHigh 或人工决定的事项。
