# TP-P0-004 调查结论

- Task ID: `TP-P0-004`
- Status: `SUPERSEDED_BY_I05_CONTRACT`
- Investigation completed during: `TP-BETA-001` planning audit
- No implementation included

> Superseded note (2026-08-06): GitHub #14/#41/#42、TP-D016 和
> `docs/architecture.md` 已冻结实际 I05 合同。本调查中的 `alias direct base` 仅适用于
> 不与 canonical name 冲突的唯一 alias；重复 alias 必须进入 confirmation。

## Conclusion

问题存在。后端在路线编辑距离匹配后、天气与规则之前返回 `ok: true` 和 `needsConfirm`，但前端没有确认状态或候选 UI，把该响应当作正常 base 数据，并继续尝试 advice。advice 的结构校验拒绝不完整 `baseData`，因此当前不会调用 LLM 或写历史，但用户得到错误加载/失败体验，且不完整候选可能进入前端结果与缓存路径。

## Root cause

- 响应没有统一判别式 `phase`。
- 前端以 `ok` 判断成功，没有显式处理 `needsConfirm`。
- 当前候选不是稳定 ID 驱动的确认契约。
- 规范名称与别名的全局优先级不够明确，简单地回填名称仍可能再次命中其他路线别名。

## Approved direction

1. 引入 `confirmation` phase 和候选列表。
2. 规范名称精确匹配全局优先于别名；模糊/前缀只能产生候选。
3. 用户确认提交服务端 candidate ID，服务端重新读取可信路线事实。
4. 确认前不查询天气、不生成规则、不调用 AI、不缓存、不写历史。
5. 前端提供确认、取消和修改输入，并与 `route_type_required` 分离。
6. 完整 queryId 可信上下文仍属于后续 I17，不混入最小确认修复。

## Required regression coverage

- exact/alias direct base; fuzzy candidate confirmation
- canonical-name precedence and stable candidate ID
- confirm/cancel/edit states
- no weather/rules/AI/cache/history before confirmation
- climb/tour metadata shown in candidates
- repeated submit and stale response protection

Implementation is tracked by I04–I05 after the planning gate.
