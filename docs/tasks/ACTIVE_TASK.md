# 当前活动任务

- Task ID: `I05b`
- GitHub Issue: `#42` — `https://github.com/JettxonHo/trekking-potato/issues/42`
- Parent: `#14`
- Title: 前端候选确认闭环与局部竞态保护
- Status: `READY_FOR_EXECUTOR`
- Mode: `IMPLEMENTATION`
- Owner: Terra XHigh (authorized Luna fallback)
- Reviewer: Sol XHigh
- Branch: `codex/i05b-frontend-confirmation`
- Base: `main` at `1a76bc0`
- Goal: `TP-BETA-001`

完整任务合同以 GitHub #42 为准；本文件记录执行指针和不能遗漏的边界。

## Objective

在现有 Taro 首页消费 I05a 的 `confirmation/candidates` 与 `mode='confirm'` 契约，完成
候选查看、选择、取消和编辑闭环，并以组件私有单调 generation 防止旧 prepare/confirm
响应覆盖新查询或用户取消。不得提前实现 I20 的 reducer/service。

## Executor allowlist

- `taro-app/src/pages/index/index.jsx`
- `taro-app/src/pages/index/index.css`（仅候选 Popup、行和按钮的必要样式）
- `scripts/confirmation-contract-test.js`
- `scripts/response-contract-test.js`
- `docs/testing-strategy.md`
- `docs/current-status.md`

## Frozen contract

- prepare confirmation 保存 1–5 个候选及当次 `date/level/days` 快照，打开独立候选
  Popup；不得显示结果或调用 advice/cache/history。
- 每行展示 canonicalName、region 与中文 routeType；不默认、不自动选择。
- 点击候选只发送 `mode/candidateId/date/level/days`，不得发送 route、坐标、海拔、
  routeType、天气或 baseData。
- confirm 返回 base 后复用已有 base→advice 流程；route_type_required/error 沿用 I04。
- 取消、关闭、编辑路线或新 prepare 均清空候选/快照，且不调用 confirm。
- 组件私有单调 request generation 只保护 prepare/confirm；旧回调不得覆盖新查询、取消
  或编辑后的状态。不得扩大到 advice/history 通用竞态或新全局状态库。
- 空或畸形 candidates 显示稳定错误，不进入 base。

## Verification

```bash
corepack npm@10.9.2 run lint
corepack npm@10.9.2 run typecheck
corepack npm@10.9.2 run test:confirmation
corepack npm@10.9.2 test
corepack npm@10.9.2 run test:integration
corepack npm@10.9.2 run build:weapp
git diff --check
```

默认测试完全离线。Agent 可决定本地 state/helper 名称与当前设计体系内的小幅样式值；
任何后端合同、依赖、reducer/service、公共竞态范围、allowlist 或产品文案实质变化必须
停止并升级。完成后提交并返回 `READY_FOR_CONTROLLER_REVIEW`，不得 push、创建/合并
PR 或自批。
