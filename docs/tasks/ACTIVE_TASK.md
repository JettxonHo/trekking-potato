# 当前活动任务

- Task ID: `I06-CONTRACT`
- GitHub Issue: `#15` — `https://github.com/JettxonHo/trekking-potato/issues/15`
- Title: 确定性安全投影任务合同
- Status: `PLANNING_PR_READY`
- Mode: `REVIEW_ONLY`
- Owner: Sol XHigh
- Reviewer: Sol XHigh
- Branch: `codex/i06-safety-merge-contract`
- Base: `main` at `deb3a8c`
- Goal: `TP-BETA-001`

GitHub #15 与本文件共同冻结实施合同；独立合同 Review 已 `APPROVED`。在本规划 PR 合并
并写入真实 base 前，仍不得进入 IMPLEMENTATION，也不得把 I06 交给 Terra。

## Objective

确认 I06 以一个纯安全投影边界保证 AI 成功、输出无效、调用失败或传输失败时，现有
确定性装备和风险均不可被删除或覆盖；同时严格阻止任务侵入 I15、I17/I18 或 I20。

## Planning allowlist

- `GOAL.md`
- `docs/architecture.md`
- `docs/development-plan.md`
- `docs/testing-strategy.md`
- `docs/decision-log.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

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

规划阶段只验证 Markdown 一致性和 `git diff --check`。实施阶段的完整验证命令与文件
allowlist 必须先写入 GitHub #15，再在真实合并基线上激活。

本阶段禁止业务代码与测试代码修改。若独立 Review 发现纯投影不能在不改公共响应或扩大
Issue 的情况下成立，状态改为 `BLOCKED` 并交回 Sol XHigh；不得以实现试探替代合同决策。
