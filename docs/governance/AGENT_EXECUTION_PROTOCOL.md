# 徒步薯 — Agent 执行协议

- Protocol version: `2.0.0`
- Governance version: `TP-GOV-2.0.0`

## 1. 角色

- Sol XHigh：策划、架构、任务合同、调度、独立 Review、合并判断和 Goal 验收。
- Luna XHigh：首选实现 Agent，当前不可用。
- Terra XHigh：经人工授权的临时实现 Agent，权限与 Luna 相同，不得自行扩大范围或批准自身 PR。

## 2. 授权模式

- `INVESTIGATION`：只读证据、根因、影响、方案和测试设计。
- `IMPLEMENTATION`：按已批准合同实现和测试。
- `REVIEW_FIX`：只修复明确 Review 意见。
- `FINAL_REVIEW`：Sol XHigh 执行 Goal 级审查，不授权普通实现。

## 3. 任务合同必备字段

每个 Issue 必须包含：目标、背景、允许范围、非范围、固定决策、验收标准、测试、依赖、风险、允许自主决策、升级条件和交付物。合同不完整不得分派。

## 4. 标准循环

1. Sol XHigh 核对 Goal、依赖和工作区，建立 Issue 合同与分支。
2. 执行 Agent完成握手、阅读指定文档、运行基线并提交简要实现计划。
3. 执行 Agent只修改 allowlist，添加测试并运行合同要求的验证。
4. 执行 Agent自检 diff、文档、失败测试和已知风险，提交结果包与 PR。
5. Sol XHigh 阅读实际 diff 和验证证据，返回 `APPROVED`、`CHANGES_REQUESTED`、`BLOCKED` 或 `ESCALATE_TO_HUMAN`。
6. 返工由原执行 Agent完成并重新验证；不能只凭“已修复”声明批准。
7. 仅在全部验收满足、CI 通过、文档同步且 Sol XHigh 明确批准后 squash merge。
8. 合并后更新 Issue、`GOAL.md`、`docs/current-status.md` 和必要决策记录。

## 5. 工作区和并发

- 禁止 `git reset --hard`、`git clean -fd`、擅自 stash、force push 或覆盖用户修改。
- 默认串行。并行必须使用隔离工作区，且不共享核心文件、Schema、公共接口、数据库结构或未完成依赖。
- 同一云函数编排、前端状态模型和公共契约不得由多个执行 Agent并行修改。

## 6. 升级条件

执行 Agent必须停止受影响工作并升级：

- 合同与代码现实不一致或出现需求缺口
- 需要改变公共接口、核心架构或主要依赖
- 需要数据迁移、部署、生产配置或额外付费
- 修改范围超出 Issue
- 测试暴露跨模块冲突
- 同一问题连续两轮修复仍未通过 Review
- 无法在不降低验收标准的情况下完成

可继续处理与风险项完全独立的任务。

## 7. 交接格式

Sol XHigh 下发包：Issue、合同、必读文档、模块、固定决策、验收、测试、分支/基线、风险和禁止范围。

执行 Agent返回包：完成情况、修改摘要、实际文件、命令与结果、计划偏差、自主实现决策、限制、PR 和重点 Review 位置。
