# Issue 与 Pull Request 工作流

- Version: `2.0.0`
- Applies to: `TP-BETA-001`

## 1. Issue 是任务事实源

每个 Issue 只解决一个主要目标，进入 Ready 前必须具备任务合同：

```markdown
## Goal and user value
## Background and relation to TP-BETA-001
## Allowed scope and file/module allowlist
## Out of scope
## Fixed architecture and implementation constraints
## Verifiable acceptance criteria
## Required tests and commands
## Dependencies and merge order
## Known risks
## Executor autonomy
## Escalation conditions
## Deliverables
```

`docs/tasks/ACTIVE_TASK.md` 只保存当前 Issue 指针、模式、分支、基线、allowlist 和验收摘要。完整合同保存在 Issue。

## 2. 分支和提交

- 从最新 `main` 创建 `codex/<issue-id>-<slug>`。
- 一个 Issue 一个分支和 PR，使用 Conventional Commits。
- 不建立 dev，不 force push，不混入无关格式化、升级或重构。
- squash merge；PR 合并后更新 Issue、Goal 状态和当前状态。

## 3. PR 描述

每个 PR 必须包含：

1. 关联 Issue
2. 问题背景与用户价值
3. 实现方案和主要修改
4. 明确未修改内容
5. 实际测试命令、退出码和结果
6. UI 任务的截图或交互证据
7. 风险和兼容影响
8. 回滚方式
9. 已知限制和未处理项
10. 文档同步情况

禁止使用“完成相关功能”“修复若干问题”等空描述。

## 4. 执行 Agent 自检

- 合同验收是否全部满足
- diff 是否越界或包含无关变更
- 是否有重复、临时、注释掉或不可达代码
- 测试是否真正覆盖改变的行为
- 所有要求命令是否运行且结果诚实
- 文档和风险是否同步

自检结果为 `READY_FOR_CONTROLLER_REVIEW`，不能写 `APPROVED`。

## 5. Sol XHigh Review

必须阅读实际代码和测试，从正确性、简单性、架构、权限/安全、性能和回归六方面检查。结果：

- `APPROVED`：全部合并条件满足
- `CHANGES_REQUESTED`：具体可修复问题
- `BLOCKED`：合同、依赖或架构冲突
- `ESCALATE_TO_HUMAN`：高风险或产品取舍

两轮修复仍未通过时，停止继续局部打补丁，由 Sol XHigh 重新做根因或架构判断。

## 6. 合并条件

验收完整、要求测试和构建通过、文档同步、无阻塞风险、Sol XHigh 明确批准，且没有待人工确认操作。低风险 Goal 内 PR 可由 Sol XHigh squash merge；部署和数据操作永不随 PR 自动执行。

## 7. 规模与并发

约 400 行非生成代码或 10 个文件是拆分提示，不是机械红线。超出时 PR 说明为何仍是一个不可分割目标。默认串行；只有隔离 worktree、无共享接口/文件/Schema/依赖时才允许并行。
