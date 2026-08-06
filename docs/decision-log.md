# 徒步薯决策记录

> 记录需要长期保存的产品、架构和治理决策。状态为 Accepted 的决策只有控制者或 Sol XHigh 经授权后可变更。

## 2026-08-06 — TP-D001 核心 Beta 边界

- Status: Accepted
- Decision: Goal 结束于代码闭测就绪，不包含部署、真实用户测试或生产发布。
- Why: 先建立可信闭环和工程门禁，避免把环境操作与产品正确性混成一个验收目标。

## 2026-08-06 — TP-D002 确定性结论与 AI 边界

- Status: Accepted
- Decision: 规则引擎输出 go/caution/no_go；数据不足为独立 null。AI 只异步解释，不能更改可信结果。
- Alternatives: 仅展示事实；AI 综合决定。
- Why: 保留明确用户价值，同时让关键事实可测试、可审计和可降级。

## 2026-08-06 — TP-D003 路线模型与试点

- Status: Accepted
- Decision: 引入 Place/Route/RouteVariant；每地一个代表变体；A/B 来源才能完整判断；旧记录为有限地点结果。
- Why: 单一山峰坐标和最高海拔无法代表路线、逐日时长和天气窗口。

## 2026-08-06 — TP-D004 时间模型

- Status: Accepted
- Decision: verified 变体固定天数；用户选择一个当地时间应用到每天；逐日最大时长决定天气窗口。
- Why: 保持输入简单，同时避免任意天数破坏逐日路线语义。

## 2026-08-06 — TP-D005 五台山调整

- Status: Accepted
- Decision: 使用黛螺顶小朝台作为试点，保留大朝台为官方禁行记录。
- Why: 2026-07-31 官方全域禁止台顶徒步，不能把大朝台包装为当前可执行路线。

## 2026-08-06 — TP-D006 路线证据政策

- Status: Accepted
- Decision: 官方事实优先；缺失几何可用两个独立可靠来源或经 Sol XHigh 审阅的 GPX，逐字段保留来源和置信度。
- Why: 仅官方资料无法补齐多数路线几何，单一非官方来源又不足以支撑安全判断。

## 2026-08-06 — TP-D007 攀登支持

- Status: Accepted
- Decision: climb 必选 solo_or_unsure、experienced_team、professional_guide。新手独自/不确定为 no_go，其余 climb 最低 caution。
- Why: 区分新手独攀与有可靠支持的情形，避免一刀切。

## 2026-08-06 — TP-D008 隐私与 UGC

- Status: Accepted
- Decision: openid 仅隔离私人历史和短期上下文；不采集资料；停用公共 UGC 主路径；不删除存量数据。
- Why: 满足闭测便利而不扩大隐私和迁移范围。

## 2026-08-06 — TP-D009 服务端可信上下文

- Status: Accepted
- Decision: prepare 保存约 30 分钟 TripContext，advice 仅凭 openid + queryId 读取；使用随机 ID，不使用哈希。
- Why: 阻止客户端决定天气和规则，同时保持 Beta 实现简单。

## 2026-08-06 — TP-D010 工程治理

- Status: Accepted
- Decision: main + `codex/` 短分支 + squash；一 Issue 一 PR；无 dev 分支；M1 先于业务开发；约 400 行/10 文件仅为拆分信号。
- Why: 与仓库实际历史一致，提供可审查边界但不机械化。

## 2026-08-06 — TP-D011 Agent 模型路由

- Status: Accepted
- Decision: Sol XHigh 主控；Luna XHigh 首选实现但当前不可用；人工授权 Terra XHigh 代行。实现 Agent不得批准或合并自身 PR。
- Why: 保持规划与执行职责分离，并诚实记录当前工具能力。

## 2026-08-06 — TP-D012 比例化安全工程

- Status: Accepted
- Decision: 不做过度防御；除重大核心风险外不引入哈希/SHA；不反复处理基本不可能 case；rubric 只辅助判断。
- Why: 项目目标是可靠产品，不是安全攻防论文。清晰所有权、少量边界和契约测试优先。

## 2026-08-06 — TP-D013 Goal 激活与 GitHub 执行面

- Status: Accepted
- Decision: 控制者批准并合并规划 PR #9；TP-BETA-001 激活。建立 M1–M7、8 个治理标签和 I01–I25（GitHub #10–#34）。I01–I03 为首批完整合同，I04–I25 在依赖完成后由 Sol XHigh 补齐并标记 Ready。
- Why: 让长期 Goal、任务依赖和执行授权存在于可恢复的仓库与 GitHub 事实源中，同时防止 Backlog 一句话任务被提前实现。

## 2026-08-06 — TP-D014 M1 工程门禁完成

- Status: Accepted
- Decision: PR #36–#38 完成固定工具链、离线质量命令和 GitHub `quality`；`main` 要求 PR 与严格 `quality`，禁止 force push 和删除，不机械要求额外 GitHub 审批人数。M1 关闭，M2 从 I04 开始。
- Why: 线上检查与本地命令已经用同一入口验证，Sol XHigh 独立 Review 仍是批准事实源。

## 2026-08-06 — TP-D015 判别式响应渐进迁移

- Status: Accepted
- Decision: I04 只统一 `phase` 信封和 error 语义，规范第一阶段 mode 为 `prepare`，仅暂留显式 `base` 别名和旧响应字段作为兼容信息；缺失/未知 mode 返回 `invalid_mode`。稳定 candidate ID、confirm 行为、最终 BaseData、queryId 和移除客户端 baseData 仍分别属于 I05、I07/I14–I17 与 I18；I04 不伪造这些事实。
- Alternatives: 一次性实现最终云函数契约；只增加类型声明而不改运行时出口。
- Why: 一次性切换会把多个独立 Issue 塞进一个 PR；只写声明又无法消除现有运行时的含混分支。渐进信封既可验证，又保持后续任务边界。

## 2026-08-06 — TP-D016 I05 候选身份与拆分

- Status: Accepted
- Decision: I05 拆为串行 I05a（#41 服务端候选/confirm）和 I05b（#42 前端闭环），父 #14 只在两者完成后关闭。I05 使用 ``builtin-route:${canonicalName}`` 作为无状态临时 ID，不用 index、哈希或额外存储；canonical exact 全局优先，唯一 alias exact 可直达，重复 alias/prefix/contains/fuzzy 必须确认。真实 TTL/归属留 I17，永久目录 ID 留 I13。
- Alternatives: 一个跨后端/UI的大 PR；数组下标 ID；提前建立候选数据库；所有 alias 一律确认。
- Why: 两次合并可独立验证信任边界和交互；canonical name 当前唯一且比 index 稳定；额外存储会侵入 I17；唯一可信 alias 直达符合既有架构并避免无价值确认。

## 2026-08-06 — TP-D017 I06 单入口安全投影

- Status: Accepted
- Decision: I06 使用一个无 I/O 的纯 `projectSafetyAdvice` 边界，从确定性
  `gearRules/weather/sunEvents` 和判别式 AI outcome 白名单重建 advice。AI 只允许追加
  recommended/optional 装备、匹配既有风险的显式解释和 notes；正常、无效输出和不可用
  路径共享同一投影。前端在 base 后立即显示现有确定性装备/风险，AI 加载或传输失败不
  清空它们。此处的确定性数据只对 AI 只读；客户端 `baseData` 信任问题仍由 I17/I18 处理。
- Alternatives: 对原始 AI 输出做深合并；只修改 Prompt；把 Prompt、LLM 调用、校验、
  投影和公共响应全部吸收到一个新适配器；仅在调用方零散覆盖受保护字段。
- Why: 原始合并和 Prompt 约束都无法形成可测试的权限边界；大适配器会把 I06 扩成编排
  重构；调用方零散修补容易让正常与降级路径漂移。单入口纯投影让策略局部、可验证且不
  提前侵入 I17/I18 或 I20。

## 2026-08-06 — TP-D018 M2 正确性里程碑完成

- Status: Accepted
- Decision: I04–I06 已完成并关闭 M2。公共响应以 `phase` 判别；模糊输入必须由稳定候选
  ID 确认；AI advice 只能通过单入口白名单投影补充解释，正常、无效输出、服务不可用和
  前端传输失败均保留现有确定性装备与风险。LLM 可达但输出/信封不可解析为
  `ai_output_invalid`，传输/HTTP/服务失败为 `ai_unavailable`。
- Evidence: PR #40、#43–#47；I04–I06 Issues 已关闭；latest-head GitHub `quality` 与本地
  lint/typecheck/test/integration/build 通过。
- Limitation: 当前 baseData 仍由客户端回传；I06 只建立 AI 相对 base 的只读边界，真正
  服务端可信上下文仍属于 I17/I18。
- Why: M2 的三个用户可观察正确性不变量均已独立测试和 Review，剩余信任与领域能力有
  清晰后续 Issue，不应把 M2 完成与 I17/I18 混为一谈。

## 2026-08-06 — TP-D019 I07 冷目录与判别式路线记录

- Status: Accepted
- Decision: I07 采用单一 `createRouteCatalog` 深模块，集中 Source/Place/Route/RouteVariant
  规范化、legacy 适配和静态引用校验，但不接入现有搜索运行链路。full 与 blocked 是
  RouteVariant 的判别式记录：full 要求 A/B 与完整行程；blocked 只保留权威限制事实，
  不伪造日程、几何、最高点或天气采样。175 条旧扁平记录只生成
  `legacy_unverified`、place-only Place，不伪造 verification level 或来源。
- Alternatives: I07 同时实现 query resolver 和 dual-read 生产切换；预建五个空 pilot
  registry 文件并把 I07 拆为 schema/adapter 两个 Issue；让 blocked 复用 full 结构；把
  legacy elevation 和 note 映射为路线事实。
- Why: cold catalog 让 I08–I12 在冻结 schema 上独立验证，同时保持 I05 公共契约零变化；
  搜索接入本来属于 I13。blocked 强填 full 字段或转换 legacy 自由文本都会制造并不存在的
  安全事实。schema、adapter 与测试是一个可独立验收目标，无需为机械规模拆分。
