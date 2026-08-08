# Agent 模型路由迁移报告

## 1. 当前 Sol 主控状态

TP-BETA-001 处于 M6。I21/#30 合同已通过三轮独立聚焦 Review，规划 PR #90 在路由纠偏前的
latest head 已通过 quality；Sol 继续负责合同、调度、独立 Review 和合并判断。

## 2. 当前 Active Terra Agent

无。迁移检查时当前 Agent 树只有主控 `/root`。

## 3. 当前 Done Terra Agent

运行时未保留可继续通信的 Done Terra 实例。项目文档、Git 和 GitHub 中记录的既往 Terra 实现与
只读审计均视为已完成历史。

## 4. 已保留的 Terra 成果

所有既有有效代码、提交、分支、PR、测试结果和审计结论继续保留。已验收工作不因模型切换重做。

## 5. 已停止的 Terra 任务

没有 Active Terra，因而无需中断；也没有 Terra 未提交修改需要接管。

### Terra 交接检查点（无活动实例）

- Agent 任务名称：无 Active Terra 任务
- 对应 Issue：I21/#30 尚未分派给 Terra
- 当前分支或 worktree：`codex/i21-core-flow-contract`，共享主工作区
- 基准提交：`main` at `c5d7d7c`
- 最新提交：`1c1d31a`（路由纠偏前的规划分支 head）
- 已修改文件：无 Terra 未提交修改；当前未提交内容仅为 Sol 的路由迁移文档
- 已完成工作：既往已合并 Terra 成果及 I21 合同审计证据全部保留
- 未完成工作：I21 实现、测试、PR 与 Review
- 已运行测试：I21 规划基线此前通过 root test、integration `56/0`、lint、typecheck 和 host WeChat build
- 测试结果：通过；路由同步后的 latest-head CI 仍须重新运行
- 当前未提交修改：无 Terra 修改
- 阻塞项：无 Terra 交接阻塞
- 已知风险：I21 必须原子切换前后端协议，不得拆出生产半成品
- 下一步建议：合并规划 PR 后从最新 `main` 创建 I21 分支，由 `luna-worker` 先检查现有代码与合同再执行 TDD

## 6. 待转交的剩余任务

I21/#30 的边界明确垂直实现、测试和修复。原合同、allowlist、验收与测试要求保持不变。

## 7. `luna-worker` 可用性检查

- 逻辑角色：`IMPLEMENTER`
- 请求的自定义 Agent：`luna-worker`
- 配置文件：`~/.codex/agents/luna-worker.toml`
- 配置模型：`gpt-5.6-luna`
- 配置推理强度：`max`
- 当前验证：`CONFIG_VERIFIED`
- 实际运行时模型：实例创建时记录；不可见时标记 `UNVERIFIED_RUNTIME_MODEL`

## 8. 新的 Agent 分配方案

Sol 主控与独立 Review；`luna-worker` 执行 I21。Terra 不再自动回退，再次使用需要人工明确授权。

## 9. 文件和分支冲突检查

迁移时无 Active Terra、无未提交 Terra 修改。规划分支仅含 I21 文档；Luna 在规划 PR 合并后从
最新 `main` 的独立 I21 分支开始，不与 Terra 并发修改同一文件。

## 10. 下一步执行顺序

同步并复核规划 PR #90，等待 latest-head quality，通过后 squash merge；从最新 `main` 创建
`codex/30-core-input-flow`；激活 #30；创建准确自定义 Agent `luna-worker`；执行 TDD、验证和 Sol Review。

## 11. 当前阻塞项

无模型路由阻塞。若实例无法创建，立即记录 `STATUS: BLOCKED_LUNA_WORKER_UNAVAILABLE`，不得自动
回退 Terra。

## 12. 是否需要用户操作

当前不需要。部署、不可逆操作、权限/隐私变化和 Goal 外取舍仍按既有停止条件请求人工确认。
