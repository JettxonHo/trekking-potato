# 当前活动任务

- Task ID: `I01`
- GitHub Issue: `#10` — `https://github.com/JettxonHo/trekking-potato/issues/10`
- Title: 统一工具链、固定依赖与锁文件
- Status: `READY_FOR_EXECUTOR`
- Mode: `IMPLEMENTATION`
- Owner: Terra XHigh (authorized Luna fallback)
- Reviewer: Sol XHigh
- Branch: `codex/i01-toolchain-locks`
- Base: activation PR merge commit on `main`
- Goal: `TP-BETA-001`

## Objective

使全新检出可确定性安装，并从根目录运行现有测试；建立 Node 24、固定依赖和锁文件基础。

## Allowlist

- 新增根 `package.json`
- 新增 `.node-version`
- 根 `.gitignore`
- `taro-app/package.json`
- `cloudfunctions/getWeatherData/package.json`
- `cloudfunctions/generateAdvice/package.json`
- 根及三个子项目共四个 `package-lock.json`
- `README.md`
- `docs/current-status.md`

## Out of scope

- 业务逻辑、UI 和云函数行为
- CI 与 GitHub 配置
- Taro 升级
- 测试框架或重大依赖
- 部署、发布和数据操作

## Acceptance

- `npm ci && npm run bootstrap` 可安装根和三个子项目。
- 不依赖全局 Taro。
- 根命令可调度现有测试。
- 路线 93/0、天气 86/0、单元 55/0 保持通过。
- diff 不包含业务行为变化。

## Verification

- 完整合同以 GitHub #10 为准。
- 必跑：`npm ci`、`npm run bootstrap`、根测试调度命令、三个现有测试脚本。
- 执行 Agent 交付状态只能为 `READY_FOR_CONTROLLER_REVIEW`。
