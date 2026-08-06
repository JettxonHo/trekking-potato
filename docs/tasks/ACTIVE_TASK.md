# 当前活动任务

- Task ID: `I03`
- GitHub Issue: `#12` — `https://github.com/JettxonHo/trekking-potato/issues/12`
- Title: 建立 GitHub 最小工程门禁
- Status: `READY_FOR_EXECUTOR`
- Mode: `IMPLEMENTATION`
- Owner: Terra XHigh (authorized Luna fallback)
- Reviewer and protection applier: Sol XHigh
- Branch: `codex/i03-github-gates`
- Base: `main` at `fd706af`
- Goal: `TP-BETA-001`

## Objective

让 Pull Request 自动运行 I02 的统一质量命令，并在该 PR 验证成功后为 `main` 建立最小保护规则。

## Allowlist

- `.github/workflows/quality.yml`
- `.github/ISSUE_TEMPLATE/**`
- `.github/pull_request_template.md`
- `docs/current-status.md`、`docs/testing-strategy.md`、`docs/issue-and-pr-workflow.md`
- 只读核验既有标签、M1–M7 和目标保护配置

## Out of scope

- 业务代码、依赖、质量命令语义或验收标准变化
- 部署、发布、密钥、生产配置和收费服务
- 复杂自动化、机械评分或额外 GitHub 审批人数
- 实现 Agent 合并自身 PR、应用保护或关闭 #12

## Acceptance

- I03 PR 触发名为 `quality` 的 check，并运行 install/bootstrap、lint、typecheck、test、test:integration、build:weapp。
- Issue/PR 模板覆盖合同与交付说明字段。
- PR 合并后由 Sol XHigh 应用并回读：require PR、require `quality`、禁止 force push 和删除。
- 不包含部署、密钥或付费集成。

## Verification

- 完整合同以 GitHub #12 为准。
- PR 使用 `Refs #12`，不得提前关闭 Issue。
- 执行 Agent 交付状态只能为 `READY_FOR_CONTROLLER_REVIEW`；Sol 完成线上保护回读后关闭 #12。
