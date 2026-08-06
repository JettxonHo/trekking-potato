# 当前活动任务

- Task ID: `I05a`
- GitHub Issue: `#41` — `https://github.com/JettxonHo/trekking-potato/issues/41`
- Parent: `#14`
- Title: 服务端路线候选与 confirm 契约
- Status: `READY_FOR_EXECUTOR`
- Mode: `IMPLEMENTATION`
- Owner: Terra XHigh (authorized Luna fallback)
- Reviewer: Sol XHigh
- Branch: `codex/i05a-backend-confirmation`
- Base: `main` at `a73b840`
- Goal: `TP-BETA-001`

完整任务合同以 GitHub #41 为准；本文件记录执行指针和不能遗漏的边界。

## Objective

为 `BUILTIN_ROUTES` 建立可由服务端重新解析的无状态 candidate ID、确定匹配阶段和
`mode='confirm'`，使 prefix/contains/fuzzy/歧义 alias 不再自动进入 base，客户端
附带的路线事实不能改变确认结果。

## Executor allowlist

- `cloudfunctions/getAdvice/data/routes.js`（只改 helper，不改 175 条数据字段）
- `cloudfunctions/getAdvice/geocode.js`
- `cloudfunctions/getAdvice/index.js`
- `cloudfunctions/getAdvice/response-contract.js`
- `scripts/route-type-contract-test.js`、`scripts/response-contract-test.js`、`scripts/unit-test.js`
- 可新增 `scripts/confirmation-contract-test.js`
- 根 `package.json`（只接入 `test:confirmation`）
- `docs/testing-strategy.md`、`docs/current-status.md`

## Frozen contract

- ID：``builtin-route:${canonicalName}``；不用 index、哈希、随机存储或新 schema。
- 直达：全局 canonical exact；无 canonical 时唯一 alias exact。
- 候选阶段：重复 alias exact → prefix → contains → fuzzy；只用第一非空阶段；先按 ID
  去重，再按 #41 的确定规则排序，最后最多五条。
- Candidate 字段固定为 `candidateId/canonicalName/region/routeType`，分别映射旧记录的
  ID helper、`name/location/type`；不含 coords/elevation/weather/baseData。
- Confirm 只使用 `candidateId/date/level/days`；其他客户端事实不参与。未知/畸形/
  已移除 ID 为 `candidate_not_found`、不可重试。
- AMap 不生成 candidate；UGC exact/alias 暂留，substring 自动命中关闭。
- 真实 TTL/归属、永久 ID、领域 schema 和前端闭环分别留 I17、I13、I07、I05b。

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

默认测试完全离线。Agent 只可决定纯 helper 命名与内部组织；任何合同、allowlist、
数据字段、持久化、依赖或后续 Issue 边界变化必须停止并升级。完成后提交并返回
`READY_FOR_CONTROLLER_REVIEW`，不得 push、创建/合并 PR 或自批。
