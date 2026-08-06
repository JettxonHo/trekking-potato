# 当前活动任务

- Task ID: `I07-CONTRACT`
- GitHub Issue: `#16` — `https://github.com/JettxonHo/trekking-potato/issues/16`
- Title: 路线领域模型与旧数据适配任务合同
- Status: `CONTROLLER_CONTRACT_DESIGN`
- Mode: `REVIEW_ONLY`
- Owner: Sol XHigh
- Reviewer: Sol XHigh
- Branch: `codex/i07-route-domain-contract`
- Base: `main` at `57ab44c`
- Goal: `TP-BETA-001`

I07 尚处于控制端设计阶段。GitHub #16 仍是 preliminary backlog，不能直接交给 Terra。
本阶段只允许只读代码审计和下列规划文档变更。

## Objective

定义 Place/Route/RouteVariant 的最小深模块接口、旧 BUILTIN_ROUTES/UGC 适配边界、
字段验证和来源/运行状态语义，使 I08–I13 可以在冻结 schema 上独立开发，同时不提前
写入五条试点数据或改变当前搜索行为。

## Planning allowlist

- `GOAL.md`
- `docs/architecture.md`
- `docs/development-plan.md`
- `docs/testing-strategy.md`
- `docs/decision-log.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

## Frozen contract

- I07 只建立领域 schema、纯目录/适配模块和验证契约，不写 I08–I12 的五条试点数据。
- 旧 175 条 BUILTIN_ROUTES 必须继续可搜索并适配为 place-only/legacy 能力，不伪造
  RouteVariant、来源等级、路线最高点或逐日 stage。
- 不迁移或删除数据库，不改变公共响应、confirm ID、天气、装备、AI、历史或前端行为。
- Schema 必须为 I08–I13 提供稳定 ID、引用完整性、verified/place-only/blocked 能力和
  来源追踪，但不增加哈希、外部依赖或机械评分。
- 精确模块接口、文件 allowlist、错误行为和测试 seam 必须经三方案设计与独立 Review 后
  才能冻结；本文件当前不是实施授权。

## Verification

本规划阶段只运行只读审计、Markdown 一致性检查和 `git diff --check`。实施命令与新增测试
入口必须在 GitHub #16 合同冻结后再写入。

禁止实现试探。若现有 175 条数据无法在不伪造路线事实的情况下适配，必须把冲突写入
合同并由 Sol 选择迁移边界；涉及数据迁移、公共契约或产品取舍时升级人工确认。
