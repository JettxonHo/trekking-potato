# 当前活动任务

- Task ID: `I02`
- GitHub Issue: `#11` — `https://github.com/JettxonHo/trekking-potato/issues/11`
- Title: 修复离线 E2E 并建立本地质量命令
- Status: `READY_FOR_EXECUTOR`
- Mode: `IMPLEMENTATION`
- Owner: Terra XHigh (authorized Luna fallback)
- Reviewer: Sol XHigh
- Branch: `codex/i02-quality-commands`
- Base: `main` at `868c181`
- Goal: `TP-BETA-001`

## Objective

让离线集成测试与根级 lint、typecheck、test、test:integration、build:weapp 命令真实可运行，且任何失败都以非零状态暴露。

## Allowlist

- 根 `package.json` 与 `package-lock.json`
- `scripts/e2e-local.js`
- 新增 `eslint.config.js`
- 新增 `tsconfig.quality.json`（或同等单一 JS typecheck 配置）
- `scripts/fixtures/**` 与 `scripts/mocks/**`
- `README.md`、`docs/testing-strategy.md`、`docs/current-status.md`
- 生产文件仅允许在 `cloudfunctions/getAdvice/**/*.js`、`cloudfunctions/history/**/*.js`、`taro-app/src/**/*.{js,jsx}` 增加无行为变化的 JSDoc/类型注释，并在 PR 单独列出

## Out of scope

- 改变业务行为迁就旧测试或修改公共接口
- 默认运行 live 网络、DeepSeek、deep-audit 或 redteam-audit
- Jest、Vitest、机械覆盖率线或新的全局状态/框架
- Taro、NutUI、Node/npm 策略变更
- CI、部署、发布和数据操作

## Acceptance

- 根级 `lint`、`typecheck`、`test`、`test:integration`、`build:weapp` 都是可执行的真实命令。
- E2E 使用 fixture/mock，不访问 live Open-Meteo、CloudBase 或 DeepSeek，并使用当前 `tripDays`、`routeType` 契约。
- 失败命令返回非零，不隐藏失败。
- 不为通过测试改变业务行为。

## Verification

- 完整合同以 GitHub #11 为准。
- 使用 I01 固定的 Node 24.18.0 与 Corepack npm 10.9.2。
- 必跑五个根质量命令和三个原始基线脚本。
- 执行 Agent 交付状态只能为 `READY_FOR_CONTROLLER_REVIEW`。
