# 当前活动任务

- Task ID: `I21`
- GitHub Issue: `#30`
- Title: 实现搜索、确认与行程输入流程
- Status: `BLOCKED_BY_I13`
- Mode: `INVESTIGATION`
- Owner: Sol XHigh
- Implementation Agent: 未分配
- Branch: `codex/i21-input-flow-planning`
- Base: `main` at `9d70f7c`
- Goal: `TP-BETA-001`

## 当前检查点

I20 planning/implementation 通过两轮 Sol Review 和 latest-head GitHub `quality`，分别合并为
PR #70/#71；#29 已关闭，`main` 为 `9d70f7c`。I20 的 10-state reducer、单调 token 与
queryId-only service 是后续 UI 的唯一流程基础。

I21 当前只授权调查与合同同步，不授权业务实现。I13 尚未能把 cold catalog 接入生产
resolver，因为五条 full pilot Variant 仍缺少完整 A/B 字段证据。当前 I05 legacy 候选不能
提供 `entityKind/capability/fixedDays`，不得被 I21 当作已验证 RouteVariant。

## I21 补充阅读

首先完整遵循 `AGENTS.md` 的强制启动阅读顺序，包括 MASTER_PLAN、执行协议与计划同步协议。
完成全局顺序后，再为 I21 补充阅读：

1. `GOAL.md`
2. `docs/current-status.md`
3. `docs/decision-log.md` 的 TP-D021、TP-D024、TP-D033、TP-D034
4. `docs/product-requirements.md` 的核心流程、路线与时间
5. `docs/architecture.md` 的匹配、prepare/confirm、BaseData 和前端状态
6. `docs/testing-strategy.md` 的 I07/I13/I20/I21 矩阵
7. GitHub #22/#30 与 `docs/research/pilot-route-source-audit.md`

## 阻塞条件

I21 必须等待 I13 合并后才能进入 IMPLEMENTATION。I13 继续依赖 I08、I09、I10b、I11、I12；
五条必需 full Variant 都必须满足 I07 A/B 几何、日程、采样点和运行状态要求，
再验证并激活生产 resolver。
不能用附近山峰、净高差、相邻线路、营销时长、无审阅 GPX 或单一用户笔记补齐。

## I13 合并后的 I21 原子目标

在一个主分支兼容的垂直 PR 中，让用户基于服务端恢复的可信 RouteVariant/Place 输入
`date/startTimeLocal/level/days/climbSupport`，经 prepare/confirm 进入 I20 `preparing`，并将实际
服务端采用的请求写入 TripContext `requestSummary`。

## 冻结的实现边界

- full RouteVariant 只使用服务端 `fixedDays`，忽略客户端自由 `days`。
- place-only/手动地点保留严格 1–7 天，必须继续输出 limited/null verdict。
- `startTimeLocal` 必须为 `HH:mm`；`level` 只允许 `小白|中级|老手`。
- 只有服务端确定的 climb 要求
  `solo_or_unsure|experienced_team|professional_guide`；非法或缺失统一为
  `missing_climb_support`，trek/tour 不强制。
- confirmation 快照加法保存 date/time/level/days/support；confirm 只以 candidate ID 恢复路线事实。
- advice 仍精确只接受 queryId；history 不新增 time/support 持久化字段。
- 复用 I20 现有状态/token，不新增第 11 个状态；不提前实现 I22 结果页或 I23 恢复控件。
- 新输入的服务端失败必须在 geocode/weather/rules/AI/TripContext/history 前结束。

## 未来验收与测试

1. 客户端与服动端对 date/time/level/days/support 的代表性正反例一致，输入失败零后续副作用。
2. full 变体的 fixedDays 和 place-only 自由天数由服务端事实区分。
3. climb 三种 support 均能到达结论编排；trek/tour 不要求 support。
4. 候选保存完整输入快照，选择后仍以服务端 candidate ID 恢复事实。
5. 快速重提、取消、confirm 和迟到响应继续满足 I20 token 不变量。
6. `TripContext.requestSummary` 反映服务端实际采用值，advice 仍只发 queryId。

## 当前允许与禁止

当前允许：补充可验证的 A/B 路线来源、修正调研事实、维护 Issue 依赖和文档检查点。

当前禁止：修改 UI、云函数、reducer、service、history、路线 schema/生产数据、天气/结论规则、
依赖、工作流或建立任何临时 full Variant。未解锁前不分配 Terra implementation。

## 升级与人工确认

若现有路线资料继续无法满足 A/B 来源政策，必须请求人工提供可审阅 GPX/第二可靠来源，
或由人工明确修改试点/来源政策。未获授权不降低标准、不改用 C 级、不伪造路线事实。
