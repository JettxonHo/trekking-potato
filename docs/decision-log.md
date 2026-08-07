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

## 2026-08-06 — TP-D020 I07 路线领域目录完成

- Status: Accepted
- Decision: PR #49 落地单一 cold `createRouteCatalog`、175 条 legacy place-only adapter、
  full/blocked 判别记录、字段证据和离线契约测试；不接生产搜索。namespace 必须有非空稳定
  后缀，但不生成 slug、不使用哈希。I07 关闭，I08–I12 可在真实 schema 上冻结数据合同。
- Evidence: Planning PR #48、implementation PR #49、GitHub #16；两轮合同 Review、两轮实现
  Review；local lint/typecheck/test/integration/build 与 latest-head GitHub `quality` 通过。
- Why: 领域事实和旧地点提示已经可由同一深模块诚实区分，且搜索切换仍清晰留在 I13。

## 2026-08-06 — TP-D021 试点路线不以缺失几何换取进度

- Status: Accepted
- Decision: I08、I09、I10 的小朝台部分、I11 和 I12 在本轮官方来源审计后保持
  `BLOCKED: SOURCE_EVIDENCE_INCOMPLETE`。已有页面可以证明路线身份、部分点序或高程，
  但不足以同时支撑 I07 full 变体要求的完整距离、累计升降、逐日时长、
  采样坐标/海拔和当前运行状态。不用附近山峰、相邻路线、净高差、营销时长
  或单一社区笔记补齐。
- Evidence: `docs/research/pilot-route-source-audit.md`；GitHub #17–#21 的字段级解阻条件。
- Why: 这些值会直接影响天气窗口、装备和出发结论，证据不足时应返回无法判断，
  而不是把看似完整的数据写入可规划目录。

## 2026-08-06 — TP-D022 五台山禁行与小朝台分开验收

- Status: Accepted
- Decision: 原 I10 拆为两个串行子任务：I10a 只录入大朝台 tier A blocked 记录并
  建立共享离线 route-data test seam；I10b 只处理黛螺顶小朝台 full 变体。I10a 可基于
  2026-07-31 管委会官方公告标题与本次核验日期进入实现；由于官方页未披露
  生效/截止日，两个日期均保留 `null`，不声称永久禁行。I10b 继续 blocked。
- Alternatives: 等小朝台所有几何齐全后一次交付；仅凭 2024 索道答复推导大智路当前
  状态；把无截止日解释为永久。
- Why: blocked 记录与 full 行程在 I07 就是两种独立的判别分支；拆分后每个 PR
  只有一个可验收主要目标，也不需为了可用的禁行事实而伪造小朝台几何。

## 2026-08-06 — TP-D023 mixed 行程指标语义

- Status: Accepted
- Decision: `distanceKm/ascentM/descentM` 始终表达变体起终点之间的完整行程
  几何；`accessMode='mixed'` 负责告知其中存在索道/景区交通，因而累计升降不等同于
  用户纯步行负荷。索道垂直高差或终点净高差不能直接替代全行程累计升降。
- Alternatives: 不记录交通段的纯步行指标；立即引入分段 mode schema；将索道高差当作爬升。
- Why: 统一几何语义不需要在 Beta 提前增加新公共 schema，同时保持事实完整；
  access mode 与 UI 标注防止将交通爬升误读为体力强度。

## 2026-08-06 — TP-D024 来源阻塞期的交付重排

- Status: Accepted
- Decision: I14 的运行依赖收窄为已合并的 I07 stage/sample schema，不再等待五条
  真实路线数据。I14 只用小型合成变体和离线天气 fixture 验证多点、多日活动窗口，
  不新增生产路线、搜索接入或运行状态假设。数据方面先完成可独立验证的 I10a
  blocked 记录，然后在来源解阻时回到 I08/I09/I10b/I11/I12。
- Alternatives: 所有 M3 数据齐全前停止整个 Goal；提前伪造五条路线作为天气测试输入；
  与 I14 同时偷做 I13 生产 registry。
- Why: I14 只消费已冻结的 stage/sample 形状，具体山线数值不改变小时窗口
  算法。这一重排保持验收标准和产品范围，同时遵守“可继续不受影响的独立任务”
  规则。

## 2026-08-06 — TP-D025 试点数据片段与 I10a legacy Place 边界

- Status: Accepted
- Decision: I10a 建立的数据 seam 使每条路线文件只导出 plain
  `{ sources, places, routes, variants }`；离线 runner 聚合这些片段和现有
  `BUILTIN_ROUTES`，再一次性调用 `createRouteCatalog`。I10a 的大朝台 Route 引用
  `place:legacy:五台山朝台`，不创建无可追溯参考坐标的 verified Place，也不消费
  该 legacy Place 的旧海拔/坐标作为限制事实。I13 以后复用同一片段格式。
- Alternatives: 每个数据文件返回一个独立 catalog；提前维护中央 registry；用旧五台山坐标
  冒充新 verified Place。
- Why: 可聚合的 plain fragment 既不把 I13 生产搜索偷进数据 PR，又能在同一目录
  检查里发现跨文件重复和引用错误；复用 legacy Place 只是稳定身份容器，不新增
  任何安全事实。

## 2026-08-06 — TP-D026 I14 隔离路线小时天气接口

- Status: Accepted
- Decision: I14 只基于已冻结的 I07 full Variant shape 建立内部
  `fetchRouteWeather({ variant, date, startTimeLocal }, options)`；使用合成 catalog fixture，
  不等待真实 pilot 数据，不接当前 legacy `prepare`，不修改公共 response。模块对每个被
  stage 引用的 unique sample 最多请求一次，任一必要 sample 失败时整体
  `dataStatus='insufficient'`，不向 I15 返回部分可判定数据。旧单点 daily `fetchWeather`
  保持兼容。GCJ-02 算法提取到无 I/O 的共享 `coordinates.js`，`geocode.js` 继续兼容导出。
- Alternatives: 等 I08–I12 全部解阻后才开发；直接把 cold catalog 接进 `index.js`；把全部
  小时逻辑追加到既有 daily 函数；复制一份坐标算法；由调用方注入生产坐标转换器。
- Why: 天气窗口算法只依赖 stage/sample 契约，等待真实路线没有正确性收益；提前接生产
  会偷做 I13/I16。单独深模块保持 legacy 路径稳定，共享纯坐标函数避免 CloudBase 模块加载
  副作用和双实现漂移。

## 2026-08-06 — TP-D027 I14 小时桶与上游有效时间

- Status: Accepted
- Decision: 每日活动区间固定为半开区间
  `[startTimeLocal, startTimeLocal + durationHours.max)`，保留所有与之相交的当地整点小时桶。
  温度、体感、天气码、能见度、平均风和冻结层使用桶起点的瞬时标签；降水概率、降水、
  降雪和阵风使用桶终点的“前一小时”标签。快照显式记录桶起止，不扫描无关整日或夜间。
  必要桶、数组、数值、时区或单位不完整时整体 insufficient。
- Alternatives: 只选落在区间内的原始标签；对所有字段统一取桶起点；对所有字段统一取
  桶终点；为边界前后机械增加一小时并让 I15 猜测含义。
- Evidence: Open-Meteo 官方 Forecast API 将大多数小时变量定义为标记时刻瞬时值，将
  precipitation、snowfall 和 wind gust 定义为前一小时累计/最大值。
- Why: 规范化小时桶让 I15 直接评估真实活动时段，并明确处理上游混合时间语义；它只在
  小时数据固有分辨率内保守覆盖相交桶，不把无关夜间风险混入结果。

## 2026-08-06 — TP-D028 I15 活动窗口累计与 weather-only 边界

- Status: Accepted
- Decision: I15 是只消费 I14 complete snapshot 的纯天气规则模块；官方禁行、climb support、
  预报提前量、日落和 `insufficient/place_only → verdict=null` 留给 I16 最终组合。由于 I14
  按 TP-D027 只返回活动窗口相交桶，Beta 的 `40mm` 降水和 `15cm` 新雪规则明确改写为
  单 stage、单 sample 的规范化活动桶累计，不再称为完整 24 小时或自然日累计。跨午夜但
  仍属同一 stage 时可累计，不跨 sample/stage 拼接，不把缺失夜间当零。
- Alternatives: 让 I15 把活动桶冒充完整日累计；回改 I14 扫描自然日；增加滚动 24 小时
  lookback；请求 Open-Meteo daily 聚合；在多个 sample 间相加；推迟到 I16 临时决定。
- Evidence: Open-Meteo 官方 Forecast API 把 precipitation/snowfall 定义为标记时刻前一小时
  累计；I14 已把它们投影到规范化桶终点。两个独立 Terra XHigh 只读审计均确认 I14 快照
  无法重建完整 24h/自然日，但可以确定性计算活动桶累计。
- Why: 该解释优先保持已确认的“只评估活动时段”边界，不让行程结束后的无关夜间天气改变
  结论，也不扩大天气 I/O。明确改名避免数据能力虚假声明；每个路线采样点独立判断，仍能
  保持安全阈值、可解释性和离线测试。若未来产品确需完整滚动 24 小时，应作为新的天气
  数据合同和独立 Issue 设计，不能在 I15 内猜测。

## 2026-08-06 — TP-D029 I16 组合优先级与日落证据边界

- Status: Accepted
- Decision: I16 以单一纯函数组合 trusted route context、I14 availability、I15 weather
  reasons、climb support、forecast lead time 和 geometric sunset。官方 blocked route 和
  `小白 + climb + solo_or_unsure` 是独立硬 no-go；其余情况下任何必要天气或日落数据不完整
  都返回 `verdict=null`，并把缺失事实放在无 severity 的 `dataIssues`，不伪造成天气危险。
  日落按每个 route-day 所有 I14 WGS84 采样点的最早值判断，任一点失败则无法证明最早值；
  预计结束严格晚于该值才 caution。预报提前量按 `fetchedAt` 的上海日历日逐 route day 计算，
  `>=5` 天 caution。I16 不接 public handler，也不解释 blocked 日期或 full route 状态。
- Alternatives: 只用起点/终点日落；取采样点平均或最晚日落；缺少日落仍允许 `go`；把缺失
  日落作为 caution；在 I16 引入新的路线端点 schema或外部服务；用客户端 clock 计算提前量。
- Evidence: I14 已提供活动 window、每点 WGS84 `requestCoordinate` 和服务端 `fetchedAt`；
  现有 `suncalc` 依赖可以离线计算几何日落。两次独立只读审计都确认 endpoint 不在 I07/I14
  合同内，不能在 I16 临时推断。
- Why: 最早采样点日落是现有可信事实内可解释且保守的 envelope。缺少任一点时不能证明
  最早值，明确 unavailable 比假装安全或虚构危险更诚实；硬 no-go 仍优先，避免数据缺失掩盖
  已知禁行或新手独攀事实。分离 `reasons` 与 `dataIssues` 让 UI 后续能准确解释风险和可用性。

## 2026-08-06 — TP-D030 I17 短期上下文与渐进可信迁移

- Status: Accepted
- Decision: I17 拆为 I17a 深存储模块和 I17b base 接线。使用 Node
  `crypto.randomUUID()` 生成 `tctx_<uuid>`，以 `_openid` 绑定，逻辑 TTL 固定 30 分钟；不
  使用哈希/SHA、签名、碰撞查询循环、自动删除或生产 TTL/index 配置。当前生产解析仍是
  legacy place path，因此存储和返回的 BaseData 以加法方式明确为 place-only：保留 legacy
  字段供 I18 过渡，同时补齐 request/route/reference-weather/null-verdict/minimum-gear/source
  结构。I17 只创建上下文，I18 才从它恢复 advice 并移除客户端 `baseData` 权限。
- Alternatives: 在 I17 一次性改成 queryId-only advice；等 M3 五条路线全部解阻；复用 history
  集合；只存旧 baseData 而不标明 place-only；加入签名/hash/复杂 TTL 清理；存储失败仍返回
  没有 queryId 的成功 base。
- Why: 两个子任务各自可独立证明，且不会把存储正确性、公共切换和 Prompt 改造混成一个 PR。
  place-only 投影诚实反映当前数据能力，又让服务端快照具备最终 BaseData 的迁移字段。短时
  记录无需迁移或清理才能保证逻辑过期；创建失败不能伪装成功，否则 I18 无法安全继续。
- Review clarification: I17a 的同一个深模块独占从当前 server-only legacy BaseData 白名单到
  TrustedBaseData 的投影；`create({openid, legacyBaseData})` 在内部构造、存储并返回该快照。
  I17b 不得在 handler 另写 builder。这样 #60 能独立证明精确投影，#61 只证明生命周期接线。

## 2026-08-06 — TP-D031 I18 原子 queryId-only advice 切换

- Status: Accepted
- Decision: I18 用一个 Issue 和一个原子实现 PR 同时切换服务端与生产前端。advice 公共请求
  精确为 `{mode:'advice', queryId}`；入口在读取普通查询字段前分流，按当前 `openid` 读取一次
  I17 TripContext，只把 `found.snapshot` 交给 Prompt、AI 和安全投影。额外旧客户端字段静默
  忽略且不读取，不保留 `baseData` 回退。unknown、foreign、expired 统一为不可重试
  `query_context_unavailable`；存储读取失败为可重试 `context_unavailable`。前端 history 参数
  留在本地，queryId 不持久化，advice success/fail 都受 generation 保护。上下文失效在前端
  独立显示重新查询消息并保留 base，不标成 AI degraded；新的恢复控件留给 I23。
- Alternatives: 拆成可独立合并的后端/前端 PR；保留一段双协议或双信任回退；继续校验客户端
  BaseData；把 unknown/foreign/expired 暴露为不同错误；为 queryId 增加哈希、签名或攻击评分。
- Why: 任一前后端中间态都会让 main 的协议不兼容；双信任回退又直接违背 I18 目标。现有
  store 已拥有 ID、归属、TTL、完整性和深拷贝边界，advice 重复校验会制造第二套真相。
  统一不可用语义既不泄露归属信息，也让用户动作明确；聚焦回归足以证明权限边界，无需过度
  防御或机械安全 rubric。

## 2026-08-06 — TP-D032 I19 私人历史与公共 UGC 非破坏性停用

- Status: Accepted
- Decision: I19 以一个原子实现 PR 同时收敛 history 云函数、getAdvice geocode 和生产前端。
  history 身份只取服务端 openid；list 返回显式公共 DTO；delete 用 `_id + openid` 一次条件
  删除，只在 `stats.removed===1` 时成功，零删除对未知和他人记录统一为 `history_not_found`；
  clear 返回实际删除量，只删除当前用户历史且空操作成功。
  旧 `saveRoute/listRoutes` 保留为认证后的 `ugc_disabled` tombstone，geocode 与前端移除公共
  routes 读写。既有 routes/history 数据不迁移、不批改、不删除。历史失败是局部、非阻断的；
  queryId 永不进入历史。
- Alternatives: 分成可独立合并的后端、geocode 与 UI PR；保留只读 UGC 回退；删除存量 UGC；
  先读文档再检查 owner；引入哈希、签名、深层输入评分或机械隐私 rubric。
- Why: 三处入口必须共同关闭才能兑现“停用公共 UGC”，而条件删除可直接提供原子归属边界，
  无需额外认证层。公共 DTO 和统一错误语义足以隔离私人数据；保留存量避免未经授权的破坏性
  操作，也为将来人工决定保留回滚空间。聚焦真实数据边界比枚举基本不可能的攻击组合更可维护。

## 2026-08-07 — TP-D033 I20 reducer 与 getAdvice adapter 边界

- Status: Accepted
- Decision: I20 用一个原子 PR 建立纯 `trip-flow` reducer、可注入 getAdvice adapter 和当前页面
  的最小接线。reducer 唯一拥有 10 个流程状态、单调本地 request token、候选/类型上下文、
  可渲染 result 与流程 error；页面删除同义 lifecycle flags 和 `_requestGeneration`，继续拥有
  表单草稿、视觉 timer、缓存适配与 I19 history 局部状态。service 精确封装
  `prepare/confirm/advice`，其中 advice 只发送 queryId。RESET、取消、返回和新查询推进 token；
  旧异步事件无副作用。普通 advice 失败为 degraded，query context 不可用保留 result 并进入 error。
  I20 不提前定义通用 RECOVER/recoverTo；I23 的异步恢复动作必须用推进 token 的新事件开始。
- Alternatives: 只提取网络调用而保留页面状态；增加 flow controller/subscription；把全部页面数据
  搬入 reducer；转换函数组件或引入 Redux/Zustand；把 I21–I23 一并实现。
- Why: 两个小深模块分别集中状态复杂度和远程协议，而页面仍是唯一编排调用方；额外 controller
  只有一个消费者且会过早增加生命周期接口。保留旧 flags 会制造双重真相，全面重写又会扩大
  回归面。该边界能直接测试 base-first、竞态与 I18 信任约束，同时不偷做后续产品体验。
