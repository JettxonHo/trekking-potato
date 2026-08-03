# 徒步薯 — 主控与执行 Agent 规划同步协议

- Sync protocol version: `1.0.0`
- Goal: 保证主控和执行 Agent 使用同一份规划与当前任务，避免会话记忆、复制提示词或旧文档造成漂移。

## 1. 单一事实源

- 产品和技术规划：`docs/governance/MASTER_PLAN.md`
- 执行规则：`docs/governance/AGENT_EXECUTION_PROTOCOL.md`
- 当前唯一任务：`docs/tasks/ACTIVE_TASK.md`
- Agent 自动入口：根目录 `AGENTS.md`；Claude Code 入口为 `CLAUDE.md`

`AGENTS.md` 和 `CLAUDE.md` 只负责引导，不复制主计划正文。

## 2. 版本与哈希握手

每个 Agent 会话开始时，必须计算并报告：

```bash
sha256sum docs/governance/MASTER_PLAN.md docs/tasks/ACTIVE_TASK.md
```

macOS 可使用：

```bash
shasum -a 256 docs/governance/MASTER_PLAN.md docs/tasks/ACTIVE_TASK.md
```

主控在下发任务时应提供或确认：

- Plan version
- Master plan hash
- Active task ID
- Active task hash
- 授权模式

只要任一项不一致，执行 Agent 不得修改代码。

## 3. 更新顺序

规划变更只能按以下顺序进行：

1. 主控提出变更理由
2. 主控更新 `MASTER_PLAN.md` 并递增版本
3. 主控更新 `ACTIVE_TASK.md` 或任务状态
4. 重新计算哈希
5. 执行 Agent 在下一轮重新握手

禁止只在聊天提示词中改变长期规划而不更新仓库权威文档。

## 4. 会话恢复

执行 Agent 在上下文压缩、切换模型、重启终端或长时间中断后，必须重新读取四个治理文件并重新报告哈希，不得依赖之前记忆继续执行。

## 5. 漂移处理

发现以下情况时立即停止：

- 聊天指令与 `ACTIVE_TASK.md` 冲突
- `MASTER_PLAN.md` 版本未更新但内容哈希变化
- 活动任务存在两个主要目标
- 多个任务同时标记为 active
- Agent 入口文件引用不存在路径
- 代码行为与主计划的关键假设冲突

输出 `SYNC_BLOCKED`，列出冲突和建议由主控决定的事项。
