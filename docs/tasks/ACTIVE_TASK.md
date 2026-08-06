# 当前活动任务

- Task ID: `TP-PLAN-001`
- Title: 固化 TP-BETA-001 策划、治理和执行合同
- Status: `READY_FOR_CONTROLLER_REVIEW`
- Mode: `IMPLEMENTATION`
- Owner: Sol XHigh
- Branch: `codex/tp-beta-planning`
- Goal: `TP-BETA-001`

## Objective

在不修改业务代码的前提下，建立治理 v2、根 `GOAL.md`、产品/架构/开发/测试/协作文档、当前状态和首批任务合同，并归档冲突的旧 MVP 文档。

## Allowlist

- `README.md`
- `taro-app/README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `GOAL.md`
- `docs/**/*.md`

## Out of scope

- 业务代码、测试代码、依赖、lock 文件和 `.github`
- GitHub Issues I01–I25 的实际实现
- 部署、发布和数据操作

## Acceptance

- 权威层级和必读顺序一致。
- 产品、架构、Goal、开发与测试文档没有相互冲突。
- 模型实际可用性和 Terra fallback 被诚实记录。
- 首批 I01–I03 合同达到可直接分派程度。
- 旧 Spec/Plan/Tasks 被明确归档。
- 链接、关键术语、Goal ID 和治理版本检查通过。
- 规划 PR 展示给控制者后，编码继续保持暂停。

## Verification

- Independent planning review: `APPROVED` by Terra XHigh after three fix rounds.
- Markdown local links: pass.
- `git diff --check`: pass.
- Route type contracts: 93 pass / 0 fail.
- Weather contracts: 86 pass / 0 fail.
- Unit tests: 55 pass / 0 fail.
- Existing security baseline: 15 pass / 0 fail.
