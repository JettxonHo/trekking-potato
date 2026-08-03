# 当前活动任务

- Task ID: `TP-GOV-001`
- Title: 固化主控与执行 Agent 的规划同步机制
- Status: `REVIEW`
- Authorized mode: `REVIEW_FIX`
- Primary objective: 完成治理文件的 Git 持久化，移除仓库内重复的安装源，并提交主控—执行 Agent 治理基线。
- Controller-owned: `true`

## 当前约束

在主控将本任务置为 `DONE` 并下发下一任务前：

- 不得修改产品代码
- 不得开始风速单位修复
- 不得重构现有文档
- 不得创建新的功能任务并自行执行

## 本轮允许修改范围

- AGENTS.md
- CLAUDE.md
- docs/governance/**
- docs/tasks/ACTIVE_TASK.md
- scripts/agent-context-check.sh
- docs/trekking-potato-agent-governance/**（仅允许删除）

## 本轮验收标准

1. 最终治理文件全部被 Git 跟踪；
2. 暂存安装目录已从仓库工作区删除；
3. 不存在第二份 `MASTER_PLAN.md`；
4. 同步脚本执行成功；
5. 没有产品代码变化；
6. 创建一个聚焦治理提交；
7. 不推送远端；
8. 任务状态仍保持 `REVIEW`，等待主控最终验收。

## 验证清单

1. 根目录存在 `AGENTS.md`
2. 根目录存在 `CLAUDE.md`
3. 存在 `docs/governance/MASTER_PLAN.md`
4. 存在 `docs/governance/AGENT_EXECUTION_PROTOCOL.md`
5. 存在 `docs/governance/PLAN_SYNC_PROTOCOL.md`
6. Agent 能按指定顺序读取文件
7. Agent 能输出主计划和活动任务的 SHA-256
8. Agent 明确当前仅允许调查治理落库情况
9. Agent 不修改任何产品代码

## 交付格式

```text
Task ID: TP-GOV-001
Governance files present:
Plan version:
MASTER_PLAN SHA-256:
ACTIVE_TASK SHA-256:
Broken references:
Conflicts found:
Status: READY_FOR_CONTROLLER_REVIEW
```

## 下一任务候选

主控验收本任务后，候选任务为：

- `TP-P0-001`：调查 Open-Meteo 风速单位与前端 `m/s` 标注是否一致。

这只是候选项，不构成执行授权。
