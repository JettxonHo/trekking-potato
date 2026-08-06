# 当前活动任务

- Task ID: `I06`
- GitHub Issue: `#15` — `https://github.com/JettxonHo/trekking-potato/issues/15`
- Title: 合并确定性安全结果并限制 AI 权限
- Status: `READY_FOR_PR`
- Mode: `REVIEW_ONLY`
- Owner: Terra XHigh (authorized Luna fallback)
- Reviewer: Sol XHigh
- Branch: `codex/i06-safety-advice`
- Base: `main` at `bf7ac83`
- Goal: `TP-BETA-001`

GitHub #15 与本文件共同冻结实施合同；独立合同 Review 与规划 PR #46 均已完成。实现
已通过两轮 Sol XHigh Review，第一轮两项 finding 已修复。仅允许控制端提交、发布 PR，
并在 latest-head `quality` 通过后决定合并；实现 Agent不得再扩大修改。

## Objective

以一个纯安全投影边界保证 AI 成功、输出无效、调用失败或传输失败时，现有
确定性装备和风险均不可被删除或覆盖；同时严格阻止任务侵入 I15、I17/I18 或 I20。

## Executor allowlist

- `cloudfunctions/getAdvice/safety-advice.js`（新增）
- `cloudfunctions/getAdvice/index.js`
- `cloudfunctions/getAdvice/prompt.js`
- `taro-app/src/pages/index/index.jsx`
- `scripts/advice-safety-contract-test.js`（新增）
- `scripts/response-contract-test.js`
- `scripts/e2e-local.js`（仅现有 advice 降级 fixture 必须同步时）
- `package.json`（仅新增 `test:safety` 并纳入 `test`，不得改依赖）
- `docs/architecture.md`
- `docs/testing-strategy.md`
- `docs/current-status.md`

## Frozen contract

- 实施阶段只新增一个无 I/O 的 `projectSafetyAdvice` 纯模块；Prompt/LLM/计时保留在现有
  编排层，公共 `phase` 信封不变。
- AI 仅能提供 recommended/optional 装备追加、既有风险解释和 notes。输出必须从白名单
  重建，不允许 raw spread/deep merge。
- available/invalid/unavailable 的内部 union、AI schema、风险记录、说明标签/顺序和
  `data.meta.degradedReason` 唯一位置均以架构文档与 GitHub #15 的精确定义为准。
- 确定性装备分类/顺序/内容和风险集合/等级/规则建议不可改；weather/sunEvents 只取
  base。AI 无效和不可用均保留完整确定性结果并使用稳定但不同的 degradedReason。
- 页面 base 到达后立即显示 `gearRules`，advice loading/transport failure 不得清空它；
  不提前建立 I20 reducer/service。
- I06 只保证现有 base 相对 AI 的权威性，不宣称客户端 `baseData` 已可信，不实现最终
  verdict/queryId/RouteVariant。
- LLM 前必须验证最低装备/风险/规则提示的完整结构及 weather/sunEvents 的 object/null
  形态；Prompt 只从该 baseData 派生，不读取 event 重复事实。

## Verification

```bash
corepack npm@10.9.2 run lint
corepack npm@10.9.2 run typecheck
corepack npm@10.9.2 run test:safety
corepack npm@10.9.2 run test:response
corepack npm@10.9.2 test
corepack npm@10.9.2 run test:integration
corepack npm@10.9.2 run build:weapp
git diff --check
```

默认测试完全离线。Terra 可决定模块内私有 helper 名称和 fixture 组织；任何公共响应、
依赖、allowlist、字段所有权或跨 Issue 变化必须停止并升级。完成后返回修改文件、测试、
偏差、实现级决策、限制和重点 Review 位置，不得 push、创建/合并 PR 或自批。
