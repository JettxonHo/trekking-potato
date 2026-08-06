# 当前活动任务

- Task ID: `I05-CONTRACT`
- Parent Issue: `#14` — `https://github.com/JettxonHo/trekking-potato/issues/14`
- Planned child Issues: `#41` (I05a backend), `#42` (I05b frontend)
- Status: `CONTROLLER_PLANNING_REVIEW`
- Mode: `REVIEW`
- Owner and reviewer: Sol XHigh
- Branch: `codex/i05-confirmation-contract`
- Base: `main` at `34170ba`
- Goal: `TP-BETA-001`

当前任务只固化 I05 拆分和公共合同，不授权实现。#41 在本规划 PR 合并并写回真实 base
前保持 `APPROVED_PENDING_PLANNING_PR`；#42 保持 `BLOCKED_BY_I05A`。实现合同的权威
全文分别在 GitHub #41/#42，产品与迁移决策在 `docs/architecture.md` 和
`docs/decision-log.md`。

## Planning scope

- `docs/architecture.md`
- `docs/development-plan.md`
- `docs/testing-strategy.md`
- `docs/decision-log.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`
- `docs/tasks/completed/TP-P0-004-investigation.md`（仅补 superseded 注记）
- GitHub parent #14 and child #41/#42 contracts

## Frozen split

1. I05a / #41：服务端 candidate ID、匹配优先级、confirmation payload、confirm 信任边界和离线契约测试。
2. I05b / #42：在 #41 合并后实现前端候选展示、选择、取消、编辑和局部迟到响应保护。
3. 两个任务串行、各自独立 PR/Review；父 #14 在两者完成后验收关闭，I06 才能解锁。

## Stop conditions

- 在规划 PR 合并前修改业务代码
- 要求 I05 引入 I07 schema、I13 永久 ID、I17 存储/TTL 或 I20 reducer/service
- 需要哈希、数组下标 ID、数据迁移、部署或新依赖
- GitHub #14/#41/#42 与仓库合同出现未解决冲突

## Completion

规划 PR 通过独立 Review 与 `quality` 并合并；之后 Sol XHigh 从真实 main 创建 I05a
分支，将 #41 与本文件更新为 Ready，才可分派 Terra XHigh。
