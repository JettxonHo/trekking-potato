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

## 2026-08-07 — TP-D034 I21 不合并死输入中间态

- Status: Accepted
- Decision: I21 保持一个 I13 之后的原子垂直任务，不拆分为可先合并的纯前端控件或
  纯后端强制字段。I13 的生产 resolver 必须先从服务端 catalog 恢复 entity/capability/
  routeType/fixedDays。之后 I21 在同一个 PR 接通 UI、prepare/confirm、校验、确认快照与
  TripContext requestSummary，复用 I20 状态，不新增第 11 个状态。
- Alternatives: 在 I13 前先加 time/support UI；后端先拒绝缺少新字段的当前客户端；从
  legacy 名称或候选 routeType 推断 full Variant 和固定天数；为 support 新增临时流程状态。
- Why: 前端先行会收集服务端忽略的假输入，后端先行会破坏当前主路径；legacy 数据不能诚实
  表达 full/place-only 或 fixedDays。原子接线是唯一既不伪造路线事实、又不产生 main 协议
  不兼容窗口的可独立验收单元。

## 2026-08-07 — TP-D035 路线来源刷新不降低完整字段门槛

- Status: Accepted
- Decision: 对 I08、I09、I10b、I11、I12 再执行一轮官方/一手来源刷新后，五条 full Variant
  继续保持 `SOURCE_EVIDENCE_INCOMPLETE`。局部设施距离、区域恢复公告、当季索道服务、历史赛事
  总量或单一可靠二级报道可以记录为字段线索，但不能跨变体拼接，也不能替代完整日程、全程几何、
  天气样点与精确运行范围。I13/I21 继续阻塞，不创建临时 full Variant。
- Evidence: `docs/research/pilot-route-source-audit.md` 第 8 节；四姑娘山 2026 部分海子沟恢复公告、
  玉龙雪山 2026 暑期票务/游览提示、国家体育总局 2017 与 2026 不同路线资料及各 Issue 字段缺口。
- Alternatives: 用相邻线路时长或子段距离拼完整路线；把区域/索道开放解释为 exact Variant open；
  仅凭一个二级来源或未审阅轨迹补坐标和累计升降；先实现 I13/I21 再等待数据。
- Why: 这些路线事实直接决定小时天气窗口、最低装备和确定性结论。保留可用的局部证据并明确拒绝
  外推，既避免重复调研，也不以看似完整的数据换取进度；普通可逆研究继续推进，无需额外安全机制。

## 2026-08-07 — TP-D036 GPX 几何可信度不替代 exact Variant 身份

- Status: Accepted
- Decision: 用户提供的五份 GPX 通过结构、连续性、时间/海拔覆盖和独立距离/升降复核，可作为
  各自实际轨迹的经 Sol 审阅 B 级几何候选；但它们与 I08、I09、I10b、I11、I12 的 exact Variant
  不同，不能跨变体填字段或解除 I13/I21。保持当前试点时继续 blocked；采用其中实际路线属于产品
  替换，需人工确认后重写对应 Issue 合同。原始 GPX 不入库，只保存非个人化派生审计。
- Evidence: `docs/research/user-gpx-audit-2026-08-07.md`；两路独立 Terra XHigh 只读审计；GPX
  内的点位、活动日、扩展统计和关键 waypoint；既有官方 exact Variant 点序。
- Alternatives: 只要 GPX 文件可解析就视为匹配；把局部重合路线拼入现有 Variant；默认用新 GPX
  替换产品试点；将含账号、轨迹 ID 和精确时间的原始文件直接提交仓库。
- Why: 几何质量回答“这条轨迹是否自洽”，路线身份回答“它是否是产品承诺的那条路线”，两者不能
  混为一谈。只保留派生审计既能支持决策，也避免无必要发布个人化轨迹元数据。

## 2026-08-07 — TP-D037 保留五条已批准 exact pilot Variants

- Status: Superseded by TP-D039
- Decision: TP-BETA-001 保留 I08、I09、I10b、I11、I12 已批准的五条 exact pilot Variants，
  不用本轮用户 GPX 所记录的武功山反穿、二日四姑娘二峰、五台多台顶穿越、贡嘎西南坡或
  蓝月谷—云杉坪替换它们。五份 GPX 仅作为未来候选 Variant 的调查证据；当前五条路线、I13 和
  I21 继续保持来源阻塞，直至各自满足 A/B 字段门禁。
- Evidence: 人工在 PR #74 合并并展示 A/B 方案后明确回复 `A`；TP-D036 与
  `docs/research/user-gpx-audit-2026-08-07.md` 已证明五份轨迹均为不同 Variant。
- Alternatives: 选择 `B`，以一条或多条实际 GPX Variant 替换已批准试点并重写产品、Issue 和
  验收合同；降低来源标准或跨变体拼接字段。
- Why: 保持已批准的产品范围和路线身份，避免因几何资料可用而静默改变 Beta 验收对象。进度阻塞
  透明保留，不以替换产品目标或降低事实门槛换取表面完成。

## 2026-08-07 — TP-D038 公开来源恢复结束后转为定向外部资料等待

- Status: Superseded by TP-D039
- Decision: 在两轮官方/一手来源恢复、五份用户 GPX 审阅和方案 `A` 决策后，没有一条保留的
  exact pilot Variant 达到 I07 full A/B 门禁。TP-BETA-001 标记为
  `BLOCKED — EXTERNAL_SOURCE_EVIDENCE`；I08、I09、I10b、I11、I12、I13、I21 保持 blocked，
  不启动实现 Agent。后续只处理新取得的官方路线包、管理方答复或匹配 exact Variant 的可审阅
  GPX；不重复宽泛网络搜索。
- Evidence: `docs/research/pilot-route-source-audit.md`、
  `docs/research/user-gpx-audit-2026-08-07.md`、
  `docs/research/exact-route-source-recovery-2026-08-07.md`，以及 live Issues #17/#18/#20/#21/#51/#22/#30。
- Alternatives: 继续重复相同公开搜索；以局部官方字段拼接 full；降低 A/B 门槛；提前实现 I13；
  用不同 GPX Variant 替换试点。最后一项已由人工方案 `A` 明确拒绝。
- Why: 当前缺口位于资料所有者和 exact Variant 轨迹本身，而不是仓库实现。定向请求包明确列出
  五个机构入口和所需字段，保留恢复路径；继续搜索同一公开面只会重复证据，提前编码则会伪造
  决定天气窗口与安全结论的路线事实。

## 2026-08-07 — TP-D039 官方管理事实与经审阅社区 GPX 分工，并按实际轨迹重定义试点

- Status: Accepted by human
- Decision: 官方/政府/景区/运营方来源继续负责明确禁行、限制、许可和运营事实；官方不需要
  提供 GPX。经 Sol 审阅且路线身份清楚的社区 GPX 作为 tier B `reviewed_gpx`，可独立支持它
  实际记录路线的几何、分日、距离、升降、参考时长、最高点和天气采样点。试点改为武功山·
  龙山村至景区正门反穿二日、四姑娘山二峰·海子沟两日往返、蓝月谷—云杉坪一日往返、
  贡嘎西南坡三日，以及由 #77 选择的
  第五条非明确禁行社区轨迹。类型分别为 `trek/climb/trek/trek`；蓝月谷—云杉坪记录的是
  `13.223km` 纯步行路线，没有索道或景交段，因此按徒步而不是旧冰川公园试点的 `tour` 分类。
  五台多台顶轨迹不作为 full；已合并的官方大朝台 blocked 记录保留。
- Evidence: 人工明确批准“官方管理信息 + 经审核的社区 GPX”并授权按实际 GPX 重定义试点；
  `docs/research/user-gpx-audit-2026-08-07.md` 已证明五份轨迹的质量和真实身份；I07 schema 原本已
  支持单份 Sol-reviewed GPX 作为 B 级来源，因此无需改公共 Schema。
- Data boundary: GPX 不证明当前开放。无路线级当前事实时使用 `operationalStatus='unknown'`
  并展示复核提示；明确有效的官方 blocked 仍硬阻断。原始 GPX 因平台用户元数据和转载边界不
  入库，只提交去标识化派生字段、审阅日期和方法，不引入哈希。
- Supersedes: TP-D037 的 exact-pilot 保留决定，以及 TP-D038 的外部官方轨迹等待状态。历史研究
  保留，不删除或改写为新路线证据。
- Alternatives: 继续等待并不存在的官方 GPX；把未经审阅轨迹当 C 级输入；把不同路线字段拼接；
  将五台受限轨迹计为可规划；降低到不记录来源和未知状态。
- Why: 官方管理事实与实际轨迹几何来自不同现实来源。分工后仍保持路线身份、禁行规则和逐字段
  可追溯性，同时解除不现实的官方 GPX 门槛，符合小规模闭测和比例适当的工程要求。

## 2026-08-07 — TP-D040 四姑娘山二峰的官方峰高与 GPX 高点分层表达

- Status: Accepted by Sol under TP-D039
- Decision: I09 采用官方二峰两日推荐行程、阿坝州 2026 海子沟动态管理信息与经审阅社区 GPX
  三来源组合。Route 为 `四姑娘山二峰`，Variant 为 `四姑娘山二峰·海子沟两日往返线`；
  `routeHighestPointElevationM=5276` 由官方“登顶二峰”及官方峰高直接支持，GPX 实测最高点
  `5254m` 只作为高点天气样点。Variant 为 tier B、`out_and_back`、2 日、纯步行且
  `operationalStatus='unknown'`；不使用已被 TP-D039 取代的官方七日变体。
- Geometry: 上海活动日独立计算后，D1 为 `12.995km / +1123.2m / -53.2m / 6.23h`，
  D2 为 `19.584km / +966.2m / -2040.7m / 12.98h`；总量为
  `32.579km / +2089.4m / -2093.9m`。不连接 11:25:07 停留期间约 8.5m 的隔夜桥。
- Samples: WGS84 起终点 `30.999177,102.841495,3246m`，大本营
  `31.046768,102.919293,4319m`，GPX 高点 `31.068860,102.908327,5254m`。
- Evidence: 官方线路推荐页明确二峰 5276m 和两日冲顶点序；阿坝州 2026-04-10 页面只确认
  海子沟部分线路恢复并说明封闭时段动态划定、赛事区域可能暂停手续；12,218 点 GPX 坐标、
  高程和时间完整且严格有序，起终相距约 72m。原文件的账户、轨迹 ID、头像引用、应用版本、
  精确日期/时间和全轨迹点不入库。
- Alternatives: 用 GPX 5254m 覆盖官方峰高；把官方 5276m 改写为 nearby peak；采用官方近似
  `16/30km` 与 `7/14h` 覆盖实测窗口；把“部分恢复”解释为 exact Variant `open`；恢复七日线。
- Why: 路线最高点与天气采样点承担不同语义。分层保留官方地形事实和传感器实测值，避免静默
  混写；官方与 GPX 的行程差异透明保留，不影响本次实际轨迹的确定性几何。

## 2026-08-07 — TP-D041 蓝月谷—云杉坪实际徒步与景区管理信息分层

- Status: Accepted by Sol under TP-D039
- Decision: I11 采用一份当前景区管理公告与经审阅社区 GPX。Route 为
  `蓝月谷—云杉坪徒步`，Variant 为 `蓝月谷—云杉坪徒步往返线`；社区 GPX 负责单日纯步行
  往返身份、几何、活动窗口、最高点和 WGS84 样点。管委会公告只负责说明景区和相关交通服务
  正在管理运行、游客须按现场标识且不得进入未开发区域；它没有确认这条 exact GPX 路径，故
  `operationalStatus='unknown'`。不把两个景点或交通产品的开放解释为完整徒步路径 `open`。
- Geometry: 单一上海活动日为 `13.223km / +408.0m / -379.0m / 5.40h`；起终相距约
  `93.274m`，记录为 `out_and_back` 而不是 `loop`。路线最高点为 GPX 的最高有效点 `3236m`，
  不继承旧冰川公园 3356/4506/4680m 或附近主峰海拔。
- Samples: WGS84 蓝月谷低区 `27.129605,100.246169,2916m` 与云杉坪高点
  `27.146977,100.224182,3236m`。终点 `27.129857,100.247068,2941m` 复用低区天气样点，
  但不声称起终是同一个轨迹点。
- Evidence: 12,825 点 GPX 的坐标、高程和时间完整且严格有序，无非正/非有限高程，最大相邻
  间距约 33.26m；冻结算法与导出统计量级一致。2026 景区票务公告确认景区服务与现场管理边界，
  不提供 exact 徒步路径图或通行承诺。原文件的 author、创建者字段、轨迹/缩略图 ID、应用版本、
  精确时间和全轨迹点不入库。
- Alternatives: 继续沿用旧冰川公园 `tour/mixed`；把景区或两个景点开放解释为 exact 路线开放；
  让 GPX 自行证明运营状态；为同一管理结论堆叠多份公告；只用模糊地点级结果。
- Why: 两个来源各自只承担其能证明的事实，既能录入真实路线，也保留现场管理不确定性。一个直接
  相关的官方管理 Source 已足以表达状态边界；增加重复公告不会提高 exact 路径可信度。

## 2026-08-07 — TP-D042 贡嘎老榆林—玉龙西社区实录与当前管理边界分层

- Status: Accepted by Sol under TP-D039
- Decision: I12 采用康定市 2023 年官方长线身份、2025 年户外封闭管理公告与经审阅社区 GPX。
  Route 规范为 `贡嘎山·老榆林—玉龙西穿越`，Variant 为
  `贡嘎西南坡·老榆林—玉龙西三日线`。官方明确称老榆林至贡嘎山玉龙西为已开发长线；封闭公告
  只覆盖点名山峰及未开发、未开放危险区域，没有点名本 exact Variant。2026 旅游目录又列出一条
  共享老榆林—日乌且—莫溪沟走廊、随后转向贡嘎寺—草科的不同线路，不能默示本路线恢复或开放。
  因此 `operationalStatus='unknown'`，不自动推导 `open` 或 `blocked`，目录录入无需人工阻塞。
- Geometry: 按三个 `Asia/Shanghai` 活动日独立计算并排除两个隔夜坐标桥：D1
  `20.638km / +1171.6m / -92.7m / 11.77h`，D2
  `14.069km / +600.8m / -972.9m / 10.82h`，D3
  `10.185km / +619.7m / -563.3m / 7.98h`；Variant 总量为
  `44.892km / +2392.1m / -1628.9m`。时长按首末活动窗口向上取整到整分钟。
- Samples: 每个活动日取一个实际高区 WGS84 样点：上日乌且营地
  `29.791363,101.836397,4305m`、日乌且垭口轨迹高点
  `29.771295,101.806582,4873m`、玉龙西垭口轨迹高点
  `29.650335,101.738087,4475m`。全轨最高有效点约 `4872.5m`，按整米记录
  `routeHighestPointElevationM=4873`；不使用 nearby peak 或 waypoint 的 4879.3m 标记值。
- Personal-track boundary: GPX 中“绕卡点”“河道硬上”“走错”“绕牦牛”等 waypoint 文字、
  具体 waypoint 和导航/推荐含义全部排除。没有可信几何边界可主观修剪；冻结距离与升降如实包含
  该次个人绕行，只表达非导航实录。若未来需要常规或官方路线，必须以新的可信资料独立定义。
- Evidence: 4067 个轨迹点的坐标、正且有限高程和时间完整且严格有序，最大相邻间距约 21.642m；
  官方路线身份页、三部门联署封闭公告与 reviewed GPX 的字段职责互不替代。原始轨迹、waypoint、
  作者/账号、平台对象字段、精确时间/速度和全点序不入库。
- Alternatives: 把封闭公告的概括范围自动映射为 exact `blocked`；把后发旅游目录当恢复公告；
  将个人绕行主观删点后称为标准路线；继承 2015/2017/2026 不同赛事；用相邻 waypoint 高程替代
  实际轨迹最高点；因不确定性重新阻塞已经由 TP-D039 允许的 `unknown` 记录。
- Why: 路线身份、实录几何和当前管理范围是三个不同事实层。分层既保留官方安全边界，也不把
  概括公告扩大成未经证实的禁行判定；非导航产品只需要诚实行程量级和逐日天气高区，不需要伪造
  一条从个人 GPX 中“清洗”出的官方导航线。

## 2026-08-07 — TP-D043 用户自有 KML 作为通用 reviewed track，并冻结党岭第五试点

- Status: Accepted by Sol under human-approved TP-D039
- Decision: 用户明确确认新文件是其本人轨迹。经两次独立只读审阅，该 KML 2.2
  `gx:Track` 可作为第五条 full Variant 的 tier B 几何证据，无需转换为 GPX。Route 冻结为
  `党岭·葫芦海—卓雍措徒步`，Variant 冻结为 `党岭村—葫芦海—卓雍措一日往返`，类型
  `trek`、1 日、纯步行、`out_and_back`。新增内部 Source kind `reviewed_track`，本条使用该
  kind；既有四条 `reviewed_gpx` 保持兼容，不迁移、不改名。
- Geometry: `3326` 组坐标、高程与时间完整配对；独立派生为
  `19.067km / +1009.4m / -955.8m / 12.18h`，最高有效轨迹点约 `4341.2m`，按整米记录
  `4341m`。低区起点与卓雍措方向轨迹高点构成两个 WGS84 天气样点。轨迹无断点、交通桥或
  影响几何的高程异常；一处瞬时速度异常不对应空间跳点，不作过度清洗。
- Management boundary: 一手资料支持党岭、葫芦海和卓雍措身份及当地徒步管理活动；官方资料
  还证明 2025-11-15 起的当次冬季关闭，但未找到可访问的 2026 当前开放原文。历史季节性关闭
  不能永久化为当前 `blocked`，二手恢复消息也不能升级为 `open`，故记录
  `operationalStatus='unknown'` 并要求出发前复核。
- Data boundary: 原始 KML 不入库；平台账号、创作者字段、轨迹/缩略图 ID、精确个人日期时间和
  完整点序全部排除。静态 fragment 只保存派生量、两个必要天气样点、审阅日期和逐字段方法。
- Interface boundary: `reviewed_track` 是内部 Source enum 的 additive 扩展，表达经审阅的地理
  轨迹证据，不按 KML/TCX/FIT 扩张格式专用枚举。它不新增上传、生产解析、公共响应字段、依赖、
  数据迁移或部署；现有 `reviewed_gpx` 继续有效。
- Evidence: 人工明确说明轨迹归本人所有；`docs/research/dangling-kml-audit-2026-08-07.md`；
  丹巴县政府和甘孜州政协一手资料；两名独立 Agent 的 KML 结构/连续性/身份审阅均返回
  `APPROVED FOR CONTRACT`。
- Alternatives: 要求用户将 KML 转 GPX；把 KML 错记为 `reviewed_gpx`；新增
  `reviewed_kml` 并让枚举随格式增长；把旧冬季公告当永久禁令；依据二手恢复消息标记 open。
- Why: KML 已完整承载同等轨迹证据，转换不会增加可信度。通用 reviewed-track 语义既透明又
  向后兼容；将几何和管理事实分层，可以完成第五条真实试点而不伪造开放状态。

## 2026-08-07 — TP-D044 I13 先建立纯 resolver，I21 再原子切换公共流程

- Status: Accepted by Sol after two independent read-only audits
- Decision: I13 交付生产可加载的静态 catalog registry 与纯 permanent-ID resolver，但不修改
  当前 handler、geocode、TripContext、天气/结论编排或 UI。I21 再一次性接通 prepare/confirm、
  `startTimeLocal/climbSupport`、fixed days、小时天气、规则结论、可信快照和前端展示。
- Resolver: Place/Route 名称展开到子 Variant，同一层级按 target ID 去重；匹配阶段沿用 I05。
  新候选只输出 `variant:*` 或 `place:*` 与七字段 DTO。place-only 的 `routeType/fixedDays` 均为
  null，不把 legacy 活动类型提示升级为可信事实。blocked 只允许唯一精确解析且永不成为候选；
  exact 阶段若同时含 blocked 与其他 target 或多个 blocked，则 not_found 并要求重新搜索。
- Compatibility: `builtin-route:*` 保留为输入兼容，不再输出；唯一 full、仅 blocked、无子 Variant
  分别映射到对应可信 target，多个 full 时按 stale/not_found 处理并要求重新搜索。
- Alternatives: I13 直接切换公共 handler；把 I13/I21 合并成一个超大 PR；先让 UI 收集但服务端
  忽略新输入；把 legacy 活动类型当成可信 routeType；继续输出临时 ID。
- Why: 当前 handler 仍使用单点日天气、自由 days 和 place-only TripContext，前端也尚未提供技术
  攀登所需输入。提前接 resolver 不能诚实生成 full base，而合并 I13/I21 会失去独立可验证边界。
  纯 resolver 先冻结可信身份和匹配语义，随后由 I21 原子完成公共行为切换。

## 2026-08-07 — TP-D045 I21 输入、快照与过渡展示边界

- Status: Accepted by Sol; independently reviewed and approved; implementation paused by human
- Decision: I21 使用单一垂直 PR 接通 I13/I14/I16、TripContext 和现有十状态 UI。每日时间默认
  `08:00`；技术攀登支持选择器始终可见并默认 `solo_or_unsure`，但只对 trusted full climb 强制。
  place-only/manual climb 不升级为 full，也不强制 support。
- Target behavior: full 使用 fixedDays；place-only 严格 1–7 并要求用户 routeType；blocked 校验
  date/time/level 后以 days/support null 直接 no-go、零天气。full gear 的高度/纬度取可信路线最高点
  与最高海拔 reviewed sample；blocked minimum gear 为空。
- Data: TripContext 直接深拷贝 handler 的 structured BaseData。full weatherSnapshot 原样保存 I14；
  reference place 使用明确 wrapper；blocked 为 null。为避免 I21 到 I22 之间破坏现有结果/AI，可由
  同一服务端事实生成兼容展示投影，但不得形成第二可信路径。
- Contract: 新增 `invalid_level/invalid_start_time/missing_climb_support/route_not_found`；删除已超过
  I20 迁移期的 public `mode='base'` alias。confirmation input 包含全部五项输入，不新增 reducer 状态。
- Alternatives: 新增第十一状态；后端或前端先行；隐藏 support 直到解析后再发第二次输入请求；继续
  hard-code place-only TripContext；保留 base alias；由 legacy activity hint 决定类型。
- Why: 默认值保守且可修改，避免死输入和额外状态；structured snapshot 让 I18 advice 继续只信
  queryId，兼容投影只解决短暂展示迁移，不改变领域事实。
- Follow-up: `route_type_required` 用 `catalog_place/amap_place/manual_place` 判别 union；三者分别
  再次 confirm 永久 candidate ID、只以原 route 重做服务端解析、或再次 prepare 用户自己的坐标。
  因此 routeTypeSource 可诚实映射为 user/amap/user。I21 的来源元数据只保存现有 Source IDs，不在
  resolver 缺少 Source records 时伪造展示资料。
- Compatibility detail: structured fields remain authoritative, but compatibility aliases are generated from
  the same orchestration rather than pretending every legacy field is recoverable from the reduced structure.
  The same gear evaluation yields minimumGear and gearRules; full daily summaries derive only from complete I14
  hours; full/blocked sunEvents are null. This avoids modifying prompt/safety in an input-flow Issue.
- Manual boundary: partial, non-number, non-finite or out-of-range manual coordinates/elevation return the single
  non-retryable `invalid_manual_place` code before downstream calls. This is the real client boundary, not a
  general defensive framework.

## 2026-08-08 — TP-D046 实现路由切换到准确自定义 Agent `luna-worker`

- Status: Human-directed; accepted and active
- Decision: 停止把 Terra 作为自动实现回退。后续边界明确实现必须创建准确名称
  `luna-worker` 的自定义 Agent，使其加载 `~/.codex/agents/luna-worker.toml`；该配置声明
  `gpt-5.6-luna` 与 `max` 推理强度，逻辑角色为 `IMPLEMENTER`。Sol 继续负责合同、调度、独立
  Review 与合并判断。未经人工再次明确授权，不得创建新的 Terra 实现 Agent。
- Migration: 路由检查时当前 Agent 树不存在 Active Terra，工作区也没有 Terra 未提交修改，因此
  无需中断或生成运行中交接。历史 Terra 提交、PR、测试和审计证据全部保留且不重做。I21 合同、
  范围、验收和测试不因模型切换而改变。
- Verification: `~/.codex/agents/luna-worker.toml` 已核对名称、模型和推理强度。首次实例成功执行
  #91，运行时角色元数据确认为 `gpt-5.6-luna` / `max`，记录为 `RUNTIME_VERIFIED`；该 Agent
  返回 `READY_FOR_CONTROLLER_REVIEW`，PR #92 由独立 Sol Review 后合并。未来若 Agent 不可发现或
  无法启动，状态为 `BLOCKED_LUNA_WORKER_UNAVAILABLE`，不得自动回退 Terra。
- Why: 自定义 Agent 已由人工安装验证；用准确 Agent 名称可加载固定配置，也避免把逻辑角色名或
  单独模型字符串误当成可执行 Agent。保留历史成果并只迁移未完成工作，可以避免重复实现和分支覆盖。

## 2026-08-08 — TP-D047 I22 分为可信来源摘要与结构化结果页

- Status: Accepted; two independent Sol contract Reviews approved with no P0–P3 findings
- Context: I21 已通过 PR #93 合并真实 structured BaseData，但现有结果页仍以 compatibility
  `weather/gearRules/meta` 投影为展示事实源；AI advice 会替换对应 legacy display fields。现有
  `sourceMetadata` 只有 Source IDs，无法诚实展示标题、发布者和核验日期；full Variant 的
  `operationalStatus='unknown'`、verification level 与路线最高点也没有进入 structured snapshot。
- Decision: parent I22/#31 拆为串行 I22a/#94 与 I22b/#95。I22a 以向后兼容方式在服务端补齐精简 route Source DTO，
  并把可信 Variant 的 `routeHighestPointElevationM/verificationLevel/operationalStatus/sourceCheckedAt`
  放入 `routeSnapshot`；同时有意修正 I21 实现仍混入 Place identity source 的 `routeSourceIds` 语义，
  现有 renderer 不受影响。I22b 新增纯 result-page model，使页面只从 structured fields 渲染四态结论、
  原因/数据问题、多日多点小时天气、地点级/禁行边界、最低装备 checklist 与来源。AI 只进入独立
  命名空间；I20 十状态不变。
- Source boundary: route source DTO 精确为 `{id,tier,kind,title,publisher,url,checkedAt}`，由同一
  production resolver 持有的 catalog snapshot 服务端 lookup；resolver 同时暴露 query/candidate/source
  三个查询，纯投影模块不得另建 production catalog。`routeSourceIds` 只含 Route/Variant/restriction evidence，不混入
  Place identity source，DTO 顺序匹配这些 IDs；不公开 `supports`、原始轨迹或个人
  数据，不从 ID 文本推断内容，不把 Open-Meteo 伪造成 route Source。
- Compatibility: I22 页面与新 cache 停止消费 legacy aliases；服务端 aliases 暂留给 prompt/safety 和
  一次性捕获的私有 I19 history adapter，后者不渲染、不缓存、不与 advice 合并，history schema/时机不变。
  I24 在结构化 AI adapter 具备证据后统一清理。I22 只提升 cache key/version并忽略旧 cache，不做迁移；
  cache restore 把无法恢复请求的 AI loading 归一为 unavailable。I23 继续独占重试、恢复与新异步事件。
- UI detail: full 小时天气包含 trusted WMO condition 的少量可解释分组；checklist 只在不同 base/queryId
  或重新查询时清空，同一查询的 AI 生命周期保持勾选。视觉证据固定为 full/go、full/caution+AI
  degraded、blocked/no_go、place-only/null，避免四张图重复一个 verdict。
- Alternatives: 直接显示 Source ID；让客户端查 URL/推导标题；一个跨层大 PR；立即删除所有服务端
  compatibility；为结果页增加第十一流程状态；隐藏 unknown 开放状态。
- Why: additive backend child 可独立验证和合并，随后 UI child 能只消费稳定事实；这满足可追溯性
  与开放状态披露，同时避免破坏 queryId-only AI、扩大 reducer 或把恢复行为偷渡进 I22。不存在需
  人工重新选择的产品方向；隐藏来源、隐藏 unknown 或改变四态文案才需要升级。

## 2026-08-09 — TP-D048 I23 先冻结历史幂等，再接前端恢复

- Status: Accepted; planning PR #101 merged as `a12ab46`, I23a PR #102 merged as `107fab4`, I23b activated
- Context: I22b merged a structured deterministic result page. Existing AI/weather/history failures are isolated,
  but there are no explicit recovery controls. A history save may have committed even when its callback fails, so
  exposing a naïve retry can duplicate a private record. Combining history Cloud Function, reducer, result page and
  list orchestration in one PR would also obscure two different correctness boundaries.
- Decision: split I23/#32 serially into I23a then I23b. I23a adds an optional private `saveAttemptId` and deduplicates
  sequential saves by `{_openid, saveAttemptId}` while keeping legacy save and the public list DTO unchanged. I23b
  adds specific token-advancing recoveries without an eleventh state: same-queryId AI retry while valid; replay of
  the last base-producing prepare/confirm for context expiry, retryable full/place-reference weather and ordinary
  query retry; form-based prepare for cache/history prefill; frozen-payload history save retry; token-guarded list reload.
- Request boundary: the page captures a pending request before every prepare/confirm and promotes it to last-base
  only after BaseData success. Initial operation failure retries pending; weather/context refresh retries last-base.
  Reprepare with an existing result keeps the complete deterministic page/checklist visible with a local refreshing
  indicator instead of allowing the existing full-screen loading selector to hide it.
- History boundary: selecting a private record only prefills existing DTO fields and performs no request. The user
  explicitly submits a fresh query after flow/checklist/cache reset. `startTimeLocal` and `climbSupport` remain the current/default form values because
  I23 does not expand stored personal data or claim exact replay. Adding those fields later requires a separate human
  privacy/product decision.
- Idempotency boundary: `saveAttemptId` is a non-security retry key, not authentication or authority. It is not a
  queryId, is not exposed by list, uses no hash/SHA, requires no migration/index/cleanup task and does not promise
  concurrent distributed exactly-once. I23b serializes one save and its user-triggered retries with the exact frozen
  payload/ID; save completion is tied to current BaseData/attempt ID rather than the AI request token, so same-base AI
  retry preserves isolation while replacement/reset/unmount invalidates stale completion. This addresses the real
  uncertain-response duplicate risk proportionally.
- Alternatives: expose retry without dedupe; use queryId as history identity; derive a hash from the payload; store
  new replay fields; auto-retry in the background; add a generic RECOVER state/event; ship one cross-layer PR.
- Why: the selected split is independently testable and keeps trust ownership intact. A new base-producing
  prepare/confirm is the only honest way to refresh weather or an expired context, while a still-valid queryId is the narrow authority for AI retry.
  Form prefill serves the existing product need without silently expanding private storage.

## 2026-08-09 — TP-D049 I24 分为结构清理、自动化验收与 DevTools 证据

- Status: Accepted by Sol for planning Review; no human product decision required
- Context: M6 completed through PR #103. Main quality is green, but the old `test:integration` still exercises a
  three-location daily-weather pipeline rather than the five RouteVariant public flow. TP-D047 also deliberately
  left thirteen top-level BaseData compatibility aliases for prompt/safety/history until I24.
- Decision: keep #33 as the M7 parent and split it serially into I24a/I24b/I24c. I24a upgrades BaseData and
  TripContext atomically to v2, adds `deterministicSafety`, derives prompt/safety/history only from structured fields,
  and deletes all thirteen aliases. I24b adds a fixture-backed `test:beta-acceptance` for the five pilots and
  representative public failure/recovery boundaries. I24c executes the local DevTools matrix, imports a normal
  fixture-free build, packages limited evidence and synchronizes release-facing documentation.
- Structured boundary: `beta_base_v2` exact fields are request/route/weather/verdict/minimumGear/
  deterministicSafety/source metadata. A pure advice adapter makes a bounded weather summary rather than sending the
  complete hourly snapshot to the LLM. The advice DTO retains only gear/risks/notes/disclaimer/meta; deterministic
  facts remain exclusively in BaseData. History context derives from route/source fields; full coordinates become
  null because the old highest-weather-sample coordinate was not route identity.
- Compatibility: no long-lived v1/v2 dual stack is added. This Goal does not deploy, so the future deployment plan
  records a roughly 30-minute TripContext drain/cutover requirement and requires human production approval.
- Evidence boundary: I24b is test/fixture-only and must split any discovered production bug. I24c may inject local
  temporary fixtures because deployment is excluded, but final source/config/dist must be rebuilt fixture-free and
  pass residue checks. The reproducible checklist and truthful per-row status are required; representative DevTools
  screenshots are added when the runtime is available. GUI unavailability is disclosed as
  `UNVERIFIED_RUNTIME_TOOL` and does not by itself expand the code-ready Goal into executed beta testing.
- Alternatives: leave aliases indefinitely; mix cleanup and final evidence in one PR; call the legacy integration
  test sufficient; run real CloudBase/real API/true beta as part of this Goal; maintain a permanent dual-version
  adapter.
- Why: three independently reviewable PRs keep a public contract cleanup out of the evidence PR, make final cross-layer
  coverage honest, and preserve the code-ready boundary without inventing production/deployment obligations.

## 2026-08-09 — TP-D050 Goal 完成边界与部署前门禁

- Status: Accepted by Sol for I25 final report Review; effective on the approved report merge
- Context: I01–I24 and replacement #77 are complete. Final production, product and test audits found no P0/P1 defect;
  main gates are green. I24 DevTools rows remain `UNVERIFIED_RUNTIME_TOOL`. Official npm audit reports no root
  vulnerability, but transitive Taro/NutUI and CloudBase SDK trees contain critical/high advisories with no
  demonstrated current application reachability. Deferred Issue #83/PR #84 removes the historical native entry but
  is outside TP-BETA-001 and its old PR is conflicted.
- Decision: accept TP-BETA-001 as code-ready for closed-beta preparation after the I25 report PR is approved and
  merged. Do not call it deployed, production-ready or real-beta verified. Keep #83/#84 as disclosed Goal-external
  maintainability debt rather than merging stale unrelated work. Treat dependency reachability/upgrade, normal
  DevTools R1–R3, staging CloudBase/openid/permission/live-API smoke, route-status refresh, context drain and device
  testing as separately authorized deployment-stage gates.
- Alternatives: block the code-ready Goal on every transitive advisory or unavailable GUI row; silently ignore the
  risks; merge the stale #84 cleanup into I25; upgrade Taro/SDKs without a focused Issue.
- Why: the Goal explicitly ends at code readiness and excludes deployment. Proportional review found no current
  exploit or P0/P1 behavior defect, while honest disclosure and separate deployment gates preserve safety without
  over-defensive scope expansion.

## 2026-08-09 — TP-D051 现有 cloud1 仅作为 staging 候选

- Status: Accepted for `TP-STAGING-001`; production remains nonexistent
- Context: The owner authorized the remaining deployment validation after creating `trip_contexts` and `history`,
  deploying `getAdvice` and `history`, configuring the current keys and completing an owner-reported real-device
  smoke. Console inspection found only one CloudBase environment, `cloud1-d0gtzgqzh9c128aaf`, already referenced by
  the Taro app. Creating a second environment may add cost and would require a new AppID/environment/configuration
  decision.
- Decision: Treat the existing environment as the pre-production staging candidate for the 5–10 user closed-beta
  preparation. Do not call it production and do not create a second environment inside #114. Keep the environment ID
  embedded configuration as disclosed staging debt; externalize it in a focused release-config Issue before a real
  production environment exists.
- Safety boundary: The console renders external-service environment-variable values in plaintext. Values are never
  copied into project artifacts, but both keys are treated as exposed and must be rotated before new users are
  invited. Rotation and any permission/configuration change remain human-confirmed actions.
- Route boundary: A reviewed GPX/KML proves geometry, not current management status. Exact-route official/operator
  evidence is required to mark a Variant open. Unknown status stays visible; Gongga is excluded from the recommended
  first cohort pending exact confirmation; Wutai stays blocked.
- Alternatives: create a second paid staging/production pair immediately; relabel the existing environment as
  production; silently keep the observed credentials; infer route openness from geometry or adjacent attractions.
- Why: Reusing the only existing environment for a tightly bounded staging beta is proportional and reversible.
  Separating production authority, rotating exposed keys and refusing to infer open status preserve the real trust
  boundaries without expanding the validation Issue into infrastructure migration.

## 2026-08-09 — TP-D052 受限闭测白名单与社区审核管理员边界

- Status: Accepted by human; staging decision pending #114 Review/merge
- Context: The human confirmed both exposed external-service keys were rotated, the current CloudBase package remains
  valid for the planned closed beta, `trip_contexts` and `history` are configured, and a real-device smoke has been
  completed. A fresh post-rotation DevTools Wugong full-route/weather/v2-queryId/advice flow also succeeded. Exact
  opening evidence remains unavailable for every full Variant, and post-rotation arbitrary AMap fallback was not
  independently captured.
- Decision: Return `CONDITIONAL_GO` for a controlled 5–10 user staging beta after #114 approval and merge. The initial
  plannable cohort is Wugong, Siguniang, Blue Moon Valley–Yunshanping and Dangling; retain visible `unknown` status and
  require same-day official/operator confirmation. Exclude Gongga. Keep Wutai Grand Pilgrimage blocked. Do not depend
  on arbitrary AMap place fallback for this cohort.
- Community authority: Accept private community GPX/KML submissions only through the future #115 workflow. Use the
  server-only environment variable `TRACK_REVIEW_ADMIN_OPENIDS` as the initial administrator allowlist. Never store,
  log or publish its values. Uploader tracks remain creator/admin private and do not enter the trusted route catalog
  until administrator review plus separate official management evidence pass.
- Safety boundary: This decision does not authorize production/public release, public raw-track access, automatic
  route publication, data deletion, permission broadening or function deployment. #115 remains a separately reviewed
  implementation and deployment sequence.
- Why: A four-route, warning-preserving cohort exercises the proven trusted-route path without presenting unknown
  management status as open. A server-only admin allowlist is proportionate for 5–10 users and keeps uploader identity
  and raw geometry private while avoiding a premature public moderation system.

## 2026-08-09 — TP-D053 社区轨迹采用私有 reservation、服务端解析与独立 catalog promotion

- Status: Accepted by Sol under human-approved #115 direction; pending planning PR Review/merge
- Context: Users can reduce manual geometry intake by submitting their own or authorized GPX/KML. The existing storage
  is creator/admin private, CloudBase server SDK can issue expiring private URLs, and the human approved a server-only
  administrator OpenID allowlist. Raw XML and geometry are untrusted, potentially personal and may be large.
- Decision: Use one new `trackSubmission` function plus direct-client-ADMINONLY `track_submissions` and, after
  approval, de-identified `track_review_evidence` collections. `begin`
  creates a random reservation; upload returns an opaque CloudBase `fileID`; `finalize` validates its exact
  server-configured storage host and reserved path, then uses actual streaming bytes as authority. It copies those
  same bounded bytes to a service-owned immutable review object before parsing. Parse only bounded UTF-8 GPX track,
  KML LineString and paired KML 2.2 `gx:Track` with pinned `saxes@6.0.0`; reject DTD/ENTITY and unsupported structures.
  Owner/admin DTOs are explicit; a 300-second raw URL is admin-only and never persisted. Use unique owner-attempt
  reservation, integer CAS versions, five-minute processing leases and random review attempt IDs; no SHA/hash.
- Publication boundary: `approved_evidence` is only a private, de-identified geometry review result. A later
  controller-owned catalog PR must combine it with official/operator management evidence. No submitted file can
  decide operational status, weather, safety, route type/fixed days or a verdict.
- Rights boundary: Do not scrape/import third-party platforms. A platform label/link is private provenance only;
  uploader must declare own recording, creator authorization or a compatible open licence.
- Alternatives: direct database upload, client parsing/trusted summaries, public bucket, administrator flag from the
  client, automatic catalog insertion, bulk platform scraping, DOM parser with entity support, SHA dedupe.
- Why: Exact upload binding plus immutable snapshot closes creator overwrite/HEAD TOCTOU risks; leases and CAS make
  crashes and retries recoverable. Supporting the already audited `gx:Track` format avoids rejecting a real project
  input. Private review and separate promotion preserve user privacy and route governance while materially reducing
  manual geometry work.

## 2026-08-09 — TP-D054 社区轨迹 raw 30 天与去身份证据 180 天保留

- Status: Accepted by human; pending #115 planning PR Review/merge
- Context: Raw GPX/KML contains precise location, elevation and timestamps. Keeping the same identity-bearing record
  for 180 days would not satisfy a de-identification claim, while best-effort deletion without a scheduler would not
  make the approved periods operationally enforceable.
- Decision: Set one immutable `rawExpiresAt` at server review-snapshot creation plus 30 days; never extend it on
  revision, retry or review. Approved geometry is copied into separate ADMINONLY `track_review_evidence` with no
  OpenID/raw/provenance linkage and expires 180 days after approval. Its random server-side storage key is never
  copied into the identity-bearing submission, owner/admin DTO, log or later runtime catalog. A daily CloudBase timer performs max-20,
  cursor/CAS, duplicate-safe cleanup, gated by server-owned `TRIGGER_SRC='timer'` plus empty server OpenID; no public
  cleanup mode exists. Cancelled/invalid/rejected raw objects are deleted
  immediately when possible, and deletion failures remain honestly pending. C06 must verify timer timezone, dry-run,
  duplicate delivery, rollback and expiry indexes before enabling destructive cleanup in staging.
- Alternatives: keep raw indefinitely; retain identity-bearing submissions for 180 days; rely on manual cleanup;
  expose an admin/client cleanup mode; reset deadlines on revision; archive expired evidence.
- Why: Separate stores make the 180-day object genuinely de-identified. An immutable deadline limits privacy exposure,
  while idempotent scheduled cleanup is compatible with repeated timer delivery and avoids pretending best-effort
  manual operations enforce a maximum period.

## 2026-08-09 — TP-D055 固定审核对象路径依赖严格短于 lease 的函数超时

- Status: Accepted by Sol during C02 Review-fix; C06 runtime verification required
- Context: C02 keeps one service-owned review object at the stable per-submission path. A five-minute stale lease
  takeover is unsafe if an older invocation can still run and overwrite that path after the new worker wins. Using a
  lease-specific path would isolate writers but would also create externally stored loser objects whose failed
  deletion cannot be represented inside the approved 30-day cleanup model without a new orphan-job store.
- Decision: Keep the stable review path and require the deployed `trackSubmission` function hard timeout to be at
  most 240 seconds, strictly below the 300-second lease. C06 must configure and observe this before stale takeover is
  enabled; if CloudBase cannot prove the inequality, deployment stops. C02 also makes child terminal transition and
  parent revision unlock transactional, treats the exact pinned-SDK per-item deletion result as authoritative,
  accepts only status `0` or exact not-found status `-503003` for the requested fileID as success, derives
  pre-finalize creator cleanup from trusted host/path, atomically marks every planned target `deletion_pending` before
  destructive deletion, retries only exact pending targets, and refuses to return a false clean projection when the
  post-delete cleanup CAS cannot be persisted.
- Alternatives: lease-specific review paths plus a new durable orphan cleanup collection; disabling takeover;
  trusting a pre-upload lease check despite a race window; leaving timeout implicit.
- Why: The hard runtime limit makes an old worker impossible before takeover while preserving one review authority
  and the already approved retention schema. Explicit deployment verification is safer than an undocumented timing
  assumption and avoids expanding C02 into a new cleanup data model.

## 2026-08-10 — TP-D056 C05 仅审核标准化轨迹，原始文件查看器独立建设

- Status: Accepted by human for C05/#122
- Context: The reviewed C05 client could request a 300-second signed raw URL and pass it to an injected opener, but
  WeChat `openDocument` requires a local supported document type and does not support GPX/KML. Download/save/share or
  clipboard alternatives would let the raw file escape the 30-day access boundary. The normalized summary, keyless
  approved evidence and bounded 500-point preview are already sufficient for the first private review loop.
- Decision: C05 renders only `request_changes`, `reject` and `approve_evidence`; it always filters `view_raw` and
  never requests `admin_get(includeRawLink=true)`, renders `rawAccess`, or opens/downloads/saves/shares/copies/caches
  raw GPX/KML or signed URLs. The server-side raw action and retention contract remain private and unchanged for a
  separately scoped future ephemeral viewer. That viewer must be reviewed for lifetime, memory, navigation and
  export boundaries before implementation.
- Alternatives: keep the unusable direct `openDocument` path; download and hand off to another app; expand C05 with
  an in-app viewer. The first is false capability, the second cannot enforce retention, and the third would mix a new
  rendering/security surface into an already reviewed admin workflow.
- Why: Option A closes submission and administrator review now without overstating platform support or weakening the
  human-approved privacy lifecycle. A separate viewer can later choose a genuinely ephemeral, testable design without
  blocking the private evidence workflow.

## 2026-08-10 — TP-D057 C06 离线纵向验收与 staging 证据分界

- Status: Prepared on C06/#123 for controller review; no deployment or CloudBase mutation
- Context: C01–C05 public parser, owner, admin, retention and UI seams already implement the frozen
  `TRACK-SUBMISSION-1` behavior. C06 must show that those seams compose without writing the route catalog or leaking
  private submission data, while separating deterministic offline proof from human-controlled staging/runtime work.
- Decision: Register `test:track-acceptance` with an injected in-memory fixture and table-driven owner→admin→retention/UI
  scenarios. Use independent literal DTO/privacy/retention/catalog oracles and mutation probes, including Option A
  poisoned `view_raw`/`rawAccess` zero-effect checks. Record each staging/runtime row only as `VERIFIED`, `BLOCKED` or
  `UNVERIFIED_RUNTIME_TOOL` in `docs/community-track-staging-validation.md`; never infer deployment, timer, index,
  permission or real-device evidence from offline tests or a build.
- TDD note: the acceptance skeleton ran GREEN immediately because its required underlying seams were already present.
  This is recorded as `TDD_DEVIATION_INITIAL_GREEN`; no missing-script or artificial RED was fabricated. The later
  independent oracles and mutation probes provide a truthful failure signal for the new gate.
- Alternatives: copy production business logic into a large end-to-end mock; call CloudBase from default tests; label
  unexecuted staging rows verified; manufacture an initial RED. Each would make the evidence less trustworthy or cross
  the C06 executor boundary.
- Why: injected boundaries keep the gate deterministic and offline, literal oracles detect wiring regressions, and the
  explicit status vocabulary preserves the difference between code-ready review and deployed/closed-beta evidence.

## 2026-08-10 — TP-D058 C06 Review-fix 的证据精确性、KML 纵向路径与 index 分界

- Status: Prepared on C06/#123 Review-fix round 1; no deployment or CloudBase mutation
- Context: Independent Review required the acceptance package to prove exact stored/display privacy shapes and a KML
  path, while keeping O8 within the evidence C06 actually owns. Staging index verification must be partial-safe and
  match the authoritative field order/unique flags exactly.
- Decision: Freeze literal key sets for the stored evidence record, nested `ApprovedEvidence`/`ReviewedGeometry` and
  admin display DTO. Seed non-empty private provenance and note inputs, then assert representative provenance/note/raw/
  linkage mutations are rejected. Add `shareFileMessage` to the Option A static residue/mutation boundary and cover a
  KML `.kml` reservation → finalize/parser → owner/admin DTO path using the existing seams.
- O8 boundary: C06 asserts only that its own flow does not mutate the runtime catalog/product-fact/public-UGC
  boundaries. Route/weather/verdict/history integrity is attributed to the exact allowlist/diff and existing focused
  gates; an in-run before/after snapshot is not claimed to detect a source mutation that predates the run.
- Staging evidence: replace the single index row with six rows: owner list, filtered admin list, all-status admin/cleanup,
  raw expiry, unique owner-attempt and evidence expiry. Each records exact field order plus `unique=true|false`, and all
  remain `BLOCKED` until human query-planner evidence exists.
- Why: exact-key oracles make privacy failures visible without duplicating business logic, and explicit runtime/index
  boundaries prevent a local acceptance pass from being mistaken for catalog integrity or deployed CloudBase proof.

## 2026-08-10 — TP-D059 社区轨迹迁入二级页并简化路线查询主页

- Status: Accepted by human for C07/#131
- Context: C04/C05 placed the complete owner submission and administrator review workflow directly on the route-query
  homepage. That proved the private workflow but made the primary product page long and mixed route planning with a
  lower-frequency community contribution task. The same page also displayed CLIMB SUPPORT even though the current
  product can preserve its conservative default without asking most users to make that specialist choice.
- Decision: Register a dedicated `pages/community-track/index` secondary page and move the complete owner/admin UI
  there while reusing the existing `track-submission-model` and `track-submission-service` as the only state/I/O
  seams. The homepage keeps one deliberate community-track entry; the existing route-not-found/manual-coordinate
  fallback adds a second `提交轨迹供审核` choice. Remove the visible CLIMB SUPPORT field but keep the internal
  `solo_or_unsure` request default so deterministic safety and the server contract do not change. TP-D056 Option A
  remains in force: no client raw GPX/KML presentation or export.
- Alternatives: keep the full workflow inline; replace the manual fallback with upload; remove `climbSupport` from
  requests; duplicate the track reducer/service under the new page. These respectively keep the homepage cluttered,
  remove a useful deterministic fallback, change a safety contract, or create two divergent private-workflow states.
- Why: a secondary page restores a clear primary journey while retaining discoverability at the two moments when a
  user is most likely to contribute. Reusing the reviewed deep module preserves privacy, retries and concurrency
  behavior, and the conservative hidden default avoids turning a visual simplification into a safety-policy change.
- Implementation checkpoint: C07 now registers and renders the independent secondary page, removes the owner/admin
  workflow from the homepage, preserves both bounded entry paths and passes the focused mutation-sensitive UI contract.
  This is local code-ready evidence only; it does not verify runtime model identity, CloudBase behavior or staging.

## 2026-08-21 — TP-D060 C12 B-lite 只读路线预览与坐标边界

- Status: Prepared on C12/#145 Review-fix; ready for controller review, no deployment or CloudBase mutation
- Context: The human-approved B-lite result-page slice needs a small, noninteractive route thumbnail without turning
  weather sample points or private submission files into route geometry. WeChat Map accepts GCJ-02 coordinates, while
  the bounded reviewed projection may declare either WGS84 or GCJ-02.
- Decision: Carry only the optional, fail-closed `routePreview` shape for trusted full variants with reviewed-track
  evidence. Convert WGS84 points deterministically to GCJ-02 before every Map-native coordinate prop, leave existing
  GCJ-02 and outside-China coordinates stable, disable all map interaction/location/POI flags, and keep a neutral
  client-drawn fallback from the normalized source points. Invalid, absent, blocked/place-only or unreviewed previews
  render no placeholder; no production pilot geometry is added until a controller-approved projection exists.
- Alternatives: pass raw WGS84 into Map; derive a line from weather samples; fetch a map service/key; expose the raw
  GPX/KML or an interactive viewer. These would misrepresent coordinate systems, route completeness, privacy or the
  approved B-lite scope.
- Why: deterministic conversion and separate source/fallback boundaries preserve visual correctness without adding a
  service dependency, while the explicit data gate keeps local synthetic tests distinct from production route truth.

## 2026-08-21 — TP-D061 C12 WGS84 转换按可信路线地区限定

- Status: Prepared on C12/#145 Review-fix round 2; ready for controller review, no deployment or CloudBase mutation
- Context: A rectangle-only mainland test would also classify Kathmandu, Ulaanbaatar and Hong Kong as GCJ-02
  territory. The trusted full route already carries a curated region label; the preview must not guess country
  boundaries from coordinates alone.
- Decision: Apply deterministic WGS84→GCJ-02 conversion only when the trusted route region matches an explicit
  mainland province/region vocabulary. Keep WGS84 coordinates unchanged for explicit non-mainland regions and other
  supplied labels; fail closed when a WGS84 preview has no region. GCJ-02 input remains unchanged. This is a bounded
  product applicability rule, not a claim of globally exact mainland borders.
- Alternatives: keep the broad rectangle; add a hand-maintained country polygon; call a geocoding/map service; or
  convert every WGS84 point. The first misclassifies non-mainland locations, the second creates fragile border data,
  the third adds an unauthorized dependency/key, and the fourth misplaces outside-mainland geometry.
- Why: trusted region provenance gives an explainable applicability gate without coordinate-only country guessing or
  new infrastructure, while fail-closed absence preserves the data truth boundary.

## 2026-08-21 — TP-D062 C12 路线地区三态分类与冲突优先级

- Status: Superseded by C12/#145 Review-fix round 4; no deployment or CloudBase mutation
- Context: A mainland-only vocabulary must not treat text containing a province name as proof of mainland geography.
  Collision labels such as `香港·广东` and `尼泊尔·西藏边境` match both region classes and must remain unknown, while
  unknown or missing labels must not produce Map-native coordinates.
- Decision: Classify the trusted route region as `mainland`, `non_mainland` or `unknown`. Only canonical/anchored
  mainland province/region forms receive deterministic WGS84→GCJ-02 conversion. Explicit non-mainland-only forms
  remain raw WGS84; when mainland and non-mainland matches both exist, classify as unknown and render no preview.
  Unknown, missing and unrecognized aliases also fail closed. This bounded vocabulary intentionally rejects false
  positives and makes no global country-boundary claim.
- Alternatives: classify by substring, accept every English/abbreviated alias, infer from coordinates, or let unknown
  labels render raw. These options admit false positives, misplace Map coordinates or turn missing provenance into
  apparent route evidence.
- Why: anchored trusted labels and explicit three-state conflict handling provide an explainable, deterministic
  applicability gate without a geocoder, border polygon, external service/key or fabricated production geometry.

## 2026-08-22 — TP-D063 C13 结果摘要 B 版层级与中性景深

- Status: Accepted by human for C13/#148 implementation; ready for controller review, no deployment or CloudBase mutation
- Context: The merged C12 map preview was visually subordinate to a large verdict title, repeated the overall conclusion
  in the following reason card, and the prototype's depth treatment risked blurring or color-tinting foreground content.
- Decision: Keep the detailed result page's top summary card white. Render a compact `出发建议 · <结论>` kicker, then
  the route name as the only large bold title; when a safe `routePreview` exists, place the sharp read-only map directly
  below the name, followed by route scope/facts and the geometry notice/legend. Use neutral gray top/bottom pseudo-element
  depth only, with direct children above the blur. Rename the next card to `判断依据` and render concrete reason messages
  without a visible severity/verdict repetition. Preserve C12 conditional no-preview behavior.
- Alternatives: retain the large verdict heading; tint the card by verdict; blur the whole card; derive or alter route,
  weather or verdict data. These would weaken hierarchy, couple visual treatment to business severity, blur trusted content
  or cross the presentation-only boundary.
- Evidence: focused result-page contract records RED before edits and GREEN plus removal/reorder/tag/duplicate/tint/blur
  mutations after edits; root tests, offline integration `55/0`, lint, typecheck, fixture-free WeChat build and diff-check
  pass. Runtime model identity and DevTools visual evidence remain separate/unverified; no public/data/deployment action occurred.

## 2026-08-22 — TP-D064 C13 WXSS universal-selector review fix

- Status: Prepared on controller runtime Review; ready for controller re-review, no deployment or CloudBase mutation
- Context: WeChat DevTools rejected the new `.result-verdict-card > *` universal-child selector even though the CLI WXSS
  build passed, leaving the simulator blank. The compile failure was isolated to this C13 selector.
- Decision: Use an explicit `result-verdict-content` wrapper for all top-card foreground text, Map and labels, and apply
  `position/z-index` only to that named class. Keep the neutral gray pseudo-element depth behind it; do not broaden the
  selector or alter route/map/model behavior.
- Evidence: focused TDD RED forbids the universal selector and requires wrapper containment; GREEN passes focused/root
  tests, typecheck, fixture-free WeChat build and diff-check. DevTools recompilation and screenshot remain controller-owned.

## 2026-08-22 — TP-D065 C13 reason accessible-name and no-preview review fix

- Status: Prepared on C13/#148 independent Review-fix; ready for controller re-review, no deployment or CloudBase mutation
- Context: Review found that an unconditional route-preview-card mutation was not explicitly rejected, and the current
  Taro/WeChat `Text` template does not emit `aria-label` in generated WXML. A severity-only aria label could therefore
  replace the concrete reason message in environments that honor it while remaining unreachable in the target template.
- Decision: Keep the preview card behind the existing safe `routeModel.routePreview && routePreviewMap` condition. Use the
  exact `reason.message || '确定性规则提示'` Text content as the reachable name, retain severity only in the existing
  `reason-*` class for non-overriding presentation, and make no unsupported aria claim.
- The C11 overall `verdict.label` mapping remains model-owned; the unreferenced reason-list display helper is removed
  solely to keep this message-only presentation lint-clean.
- Evidence: focused TDD RED/GREEN covers the source hierarchy, explicit unconditional-preview and message-loss mutations,
  plus an opt-in `RESULT_PAGE_ARTIFACT=1` gate that checks generated `dist/pages/index/index.js` for the reason class/
  message seam and `dist/base.wxml` for no aria-label reliance. No model/service/DTO/history/geometry/dependency/
  CloudBase/deployment change occurred. The controller committed/published the accessibility repair in PR #149;
  `33d1469` is historical implementation-head evidence. Live GitHub metadata is authoritative for the current head,
  which still requires same-head CI and two independent Reviews before mergeability is decided.

## 2026-08-22 — TP-D066 C13 exact-preview injection test hardening

- Status: Prepared on C13/#148 second independent Review; test/docs-only repair, no deployment or CloudBase mutation
- Context: A self-closing `route-preview-card` inserted after the route name could coexist with the valid conditional
  preview branch while the focused oracle remained GREEN.
- Decision: Count both regular and self-closing preview-card instances and require exactly one instance under the exact
  `routeModel.routePreview && routePreviewMap` condition. Keep the production branch unchanged.
- Evidence: The duplicate injection is source-changing and Babel-parseable; the pre-fix oracle control was GREEN and the
  new mutation-sensitive gate is RED for that injected source while the valid source is GREEN. Draft PR #149 is open;
  live GitHub metadata is authoritative for its current head, which requires same-head CI and two independent Reviews.

## 2026-08-22 — TP-D067 C14 private history keyset pagination

- Status: Historical implementation head `0f6b2bf` is published as PR #151 (`OPEN`/`DRAFT`); no deployment, CloudBase
  mutation or real history access
- Context: The private history sheet previously read only the newest 20 owner rows and had no continuation path. Offset
  paging would drift when new saves arrive and would not define equal-timestamp behavior.
- Decision: Keep server OpenID as the sole owner boundary. Query a maximum 20-row page with one read-only lookahead in
  stable `createdAt desc, _id desc` order. Continue with a bounded versioned opaque cursor containing only the seek
  tuple; malformed, oversized, non-string or extra-field cursors fail closed before storage access. Preserve the public
  HistoryItem DTO and add only `nextCursor: string|null` on success. The client refreshes page one, explicitly appends
  unique IDs on `加载更多`, keeps rows/cursor on append failure, and invalidates stale/closed/delete/clear callbacks.
- Alternatives: offset/skip pagination, automatic infinite scroll, exposing database fields, or signing cursors with a
  new secret. These add instability, interaction cost, privacy surface or unnecessary key management; the bounded
  owner/keyset contract is sufficient for this private list.
- Evidence: Focused TDD RED/GREEN covers 21-row owner pagination, equal-timestamp tie-break, one-row lookahead,
  malformed-cursor zero reads, append/failure, stale/closed and page-handler mutations. Review-fix round 1 keeps the
  first append fixture to new rows, adds a separate duplicate-ID case, and dynamically proves that replacing the merge
  helper with `response.data.slice()` makes focused recovery RED. Root tests, integration `55/0`, lint, typecheck,
  fixture-free WeChat build, diff/allowlist/privacy scans and root npm audit pass locally; independent Reviews remain
  controller-owned. Quality run `32569602179` succeeded on historical PR head `0f6b2bf`; Draft PR #151 is open and
  live GitHub metadata is authoritative for the current head. That same head requires successful quality plus two
  fresh exact-head Reviews, and any head change repeats both gates. The pinned history `wx-server-sdk` audit has
  pre-existing transitive findings whose breaking upgrade is outside this slice. No deployment, CloudBase/data action
  or release is authorized.

## 2026-08-23 — TP-D068 C15 exactly-25 ledger and OSM/open-data source gate

- Status: Draft PR #154 open for `#153` planning Review; docs-only, no runtime catalog/data mutation, deployment or
  release. Live GitHub metadata is authoritative for current-head CI and Review gates.
- Context: The human fixed a target total of 25 trusted RouteVariants: six existing structured pilots plus about
  nineteen new candidates. A route count without identity, rights, topology, direction and current access evidence
  would turn a discovery list into an unsafe recommendation surface.
- Decision: Freeze `docs/route-catalog-expansion.md` as an exactly-25-slot ledger. Existing six pilots remain the
  baseline. Nineteen new rows are provisional OSM relation identities, split into serial batches A–D of roughly
  four/five. Every row carries Place/Route/RouteVariant identity, source URL/type, license/authorization, geometry/
  topology, direction, official/operator opening source plus checked-at date, blocker, batch and verdict. Missing
  facts are written `UNKNOWN`; promotion is `BLOCKED_CANDIDATE`, never inferred or auto-published.
- Source policy: OSM `route=hiking/foot` relations are open-data geometry candidates under ODbL, with attribution and
  applicable derived-database obligations. A connected way sequence does not prove completeness, opening, legality,
  safety, direction semantics or suitability. First-party/operator status controls opening; first-party or explicitly
  authorized/open-licensed tracks control geometry rights. Third-party scraping/bulk extraction remains forbidden.
- Batch A evidence: five Yubeng relations (`19700005`, `19700028`, `19700031`, `19700036`, `19700085`) were observed
  from OSM metadata on `2026-08-23`; preliminary endpoint continuity was checked for each. `19700036` has a Chinese/
  English name mismatch and remains quarantined. The Overpass candidate search was stopped after rate limiting; no
  replacement or promotion was invented.
- Alternatives rejected: counting legacy builtin names as variants; treating OSM geometry as proof of opening/safety;
  copying third-party tracks without rights; running all batches in parallel; or filling unknown rows with invented
  metrics/status. Those would weaken route identity, legal attribution or the controlled promotion boundary.
- Consequences: Child Issues must independently audit topology, direction, rights, official opening and public
  contracts before any route-data fragment changes. The existing six contain five searchable `full` pilots and one
  Wutai restriction record, so blocked new candidates must be replaced until nineteen new searchable `full` variants
  pass Review; ledger occupancy alone does not satisfy the target. #123 remains a separate human-runtime blocker. No
  child Issue or PR was opened by the executor planning slice; controller review and plan-sync are required before
  implementation.

## 2026-08-23 — TP-D069 C15-A Yubeng evidence audit remains blocked

- Status: Draft PR #156 open for #155 evidence Review; no runtime catalog, CloudBase, deployment or public-release
  action occurred. Live GitHub metadata is authoritative for the current-head CI and Review gates.
- Evidence artifact: `docs/yubeng-route-evidence.md`; ledger rows 07–11 reconcile to relations `19700005`, `19700028`,
  `19700031`, `19700036` and `19700085`.
- OSM relation pages and member endpoints establish current names, aliases, `from`/`to` tags, versions and ordered
  way-member IDs. The first full OSM API request returned HTTP `429`; the executor stopped rather than retrying. The
  planning endpoint-continuity observation remains preliminary; node-level gaps, branches, completeness, direction
  reversal and metrics are `UNKNOWN`.
- Current government access evidence: a four-agency Deqin County notice dated `2025-10-14`, published/reposted on the
  Xiaruo Township site on `2026-04-10`, names the matching Yubeng Binghu, Nise and Shenhu routes as undeveloped/
  unopened, blocking `19700005`, `19700028` and `19700036`. No current route-level
  opening/permit source was found for Shenpu (`19700031`) or Ninong (`19700085`), so both remain `UNKNOWN` and blocked.
- Decision: all five rows remain `BLOCKED_CANDIDATE`; none is `ELIGIBLE_FOR_IMPLEMENTATION`. ODbL attribution and
  derived-database treatment remain an explicit future implementation gate. A later child Issue must re-run the full
  topology, identity, rights and current-access checks before proposing any runtime route-data change.

## 2026-08-23 — TP-D070 C15-B scenic OSM evidence remains blocked

- Status: Draft PR #158 open for #157 evidence Review; no runtime catalog, CloudBase, deployment, child Issue or
  public-release action occurred. Live GitHub metadata is authoritative for current-head CI and Review gates. The
  evidence report is `docs/scenic-route-evidence.md` and ledger rows 12–16 reconcile to it.
- Context: The next five provisional rows are Huangshan `18970848`, Taishan `19818868`, Sanqing `18970781` and two
  distinct Emei relations `13567761`/`13567762`. A relation tag or a general scenic-area notice cannot establish a
  complete, currently permitted walking variant.
- OSM evidence: one primary full-relation read per candidate succeeded on `2026-08-23`. Ordered way IDs/roles and
  topology summaries record endpoint gaps in all five; Huangshan, Taishan and Sanqing have duplicate way refs, and
  Taishan has four graph components. No node, coordinate or raw geometry was copied and no metrics were derived.
- Access/mode decision: official Huangshan, Taishan and Emei sources provide only general entrance/opening, cableway,
  shuttle or road context. The Sanqing operator ticket/cableway HTTPS source was not TLS-reproducible during Review and
  is excluded from verified primary evidence; HTTP was not used as a substitute, and its secondary reopening report is
  context only. Walking, cableway, shuttle and road segments remain separate; exact relation-level opening/permission
  is `UNKNOWN`. The Emei relations share a stem but diverge in the middle sequence and must not be merged.
- Rights decision: ODbL attribution, notice/share-alike handling and the runtime derived-database form remain an
  implementation-issue gate. Missing rights, topology, direction or exact operator access blocks promotion.
- Consequence: all five rows remain `BLOCKED_CANDIDATE`; none is `ELIGIBLE_FOR_IMPLEMENTATION` or counted toward the
  searchable target. A later implementation Issue must repeat a rate-limited topology/mode audit and resolve every
  core field before any route-data change.

## 2026-08-23 — TP-D071 C15-C exact-25 searchable count and discovery freeze

- Status: Issue `#159` docs-only discovery freeze; no runtime catalog/data, CloudBase, deployment, commit or push action
  occurred. Executor status is `READY_FOR_CONTROLLER_REVIEW`; live controller metadata is authoritative.
- Decision: Correct the C15 completion denominator to exactly 25 searchable `full` slots: five existing searchable
  pilots plus twenty missing/replacement slots. Keep the Wutai restriction as `R-WUTAI`, a separate non-counting
  record. Blocked rows never satisfy the target merely by occupying a slot.
- Evidence boundary: stop the topology-first pass after twenty bounded OSM full-relation reads (one duplicate
  verification). The durable
  report `docs/catalog-batch1-source-evidence.md` proposes exactly five identities: `16162196`, `20072118`,
  `20046643`, `15852438` and `17841828`. Each has a connected, branch-free, duplicate-reference-free aggregate
  graph in this pass, with walking paths kept separate from road/cableway/shuttle modes. Ordered-member gaps, missing
  direction tags, ODbL derived-database treatment and exact current operator opening remain explicit `UNKNOWN` gates;
  all five are `BLOCKED_PENDING_CONTROLLER_FREEZE` and are not counted or runtime-eligible.
- Official-source rule: Shenzhen planning/operator pages and Chongqing government/scenic notices establish route-family
  identity or operating context only; they do not turn an OSM relation into an `open` runtime variant. HTTP, secondary
  reports, cableway/shuttle notices and road access are not substitutes for route-level walking evidence.
- Alternatives rejected: retaining stale `24 searchable + Wutai` wording; counting Wutai as a searchable slot; filling
  the twenty-slot gap with disconnected/road-mixed/branching candidates; or implementing runtime rows before the
  controller freezes exactly five identities and a later child Issue closes every promotion gate.

## 2026-08-23 — TP-D072 #159 Phase2 frozen five runtime evidence

- The controller freeze `5385785828` authorizes a bounded runtime slice for 16162196 (complete relation, not the
  earlier truncated mainline), 20072118, 20046643, 20739620 complete loop, and 17841828 lower entrance → summit.
- Route geometry and distance come from ordered current-full OSM relations. OSM `open_data` sources carry ODbL-1.0,
  adjacent attribution and relation/way/node version observations; no immutable-full claim or contributor identity is
  made. The full manifests are retained in `docs/route-data-licenses.md` while runtime source manifests are bounded.
- Elevation/ascent/descent/highest use one ≤100-point cumulative-distance sample per route from Open-Meteo/Copernicus
  DEM GLO-90 and deterministic interpolation; no runtime provider or query URL is stored. `operationalStatus=unknown`
  is retained with a conservative rationale rather than inferred from geometry or elevation. The 20739620 residential
  member is disclosed and user `accessMode=walk` remains explicit.
- Consequence: focused domain/data/resolver/result tests are green and the slice is `READY_FOR_CONTROLLER_REVIEW`.
  No merge, deploy, release, CloudBase action or public searchable-count acceptance is implied.

## 2026-08-23 — TP-D073 #159 Phase2 bounded review-fix truth corrections

- The review RED was recorded before editing: typecheck rejected the optional 207 `official` argument and the
  normalized variant's post-assignment `operationalStatusRationale`. Defaults/object construction fixed only those
  seam errors.
- The unknown-status evidence exception is intentionally narrow: a non-empty rationale can suppress only the opening
  support requirement for a variant carrying both `routeGeometry` and an `open_data` source. Existing and reviewed
  geometry variants retain the normal operational-status evidence requirement. OSM supports relation coordinates,
  order and applicable identity/topology; Open-Meteo/Copernicus supports the joined routeGeometry elevation component
  and elevation-derived fields, not opening or route coordinates.
- Identity/attribution corrections are durable: 207 uses neutral `未命名环线起终点` and only the specific alias
  `赵公山东北徒步环线`; 161 is explicitly the complete relation without the truncated-mainline alias; 20046643's
  park context source no longer claims variant endpoints. Visible OSM attribution includes
  `openstreetmap.org/copyright`; elevation attribution is gated by exact trusted source id/kind/publisher.
- Review-fix gates pass (focused, root, offline integration `55/0`, lint, typecheck, WeChat build, diff/allowlist/
  sensitive scans). Root audit is clean; Cloud Function audit findings are pre-existing transitive vulnerabilities
  requiring an out-of-scope dependency upgrade. No commit, push, PR, deploy or dependency change was performed.

## 2026-08-23 — TP-D074 #159 Phase2 review-fix round 2 source/evidence corrections

- Controller review required removal of the 20072118 runtime official block. The linked Shenzhen planning PDF is
  retained only as documented context; it does not bind the exact relation or establish current opening. The source
  ledger therefore drops the associated runtime official source, while the direct OSM identity/topology evidence stays.
- The 16162196 official record now uses the verified title `深圳市绿道网（“鹏城万里”多层次户外步道体系）专项规划
  （2024–2035年）` and joint publisher `深圳市城市管理和综合执法局、深圳市规划和自然资源局`; supports remain
  limited to the fields directly reproducible from that document (`canonicalName`, `startPoint`, `endPoint`).
- Unknown operational-status evidence is fail-closed unless the variant ID is `variant:osm-*`, its linked source is
  OpenStreetMap with `kind=open_data`, that same source supports `field=routeGeometry` for the exact entity, and the
  rationale is non-empty. Legacy/non-OSM and cross-source mutations are explicit RED fixtures.
- The exact production catalog shape is now `22` sources (`180` places, `11` routes, `11` variants in the resolver
  contract fixture; the runtime variants remain `full=10`, `blocked=1`), and OSM-derived tests pin the deterministic
  duration formula plus relation/first-way/first-node version anchors. No commit, push, PR, merge, deploy, CloudBase or
  dependency action is authorized.
- Validation completed without network research: focused four contracts, root `npm test`, typecheck, lint (0 errors/9
  existing warnings), host WeChat build, `git diff --check`, exact allowlist and added-line sensitive scans all pass.

## 2026-08-23 — TP-D075 activate #161 second five-route evidence batch

- PR #160 passed same-head quality and two independent Reviews, then squash merged as `14830eb`. The runtime catalog
  truth is ten searchable `full` variants plus the separate non-counting Wutai restriction; fifteen searchable routes
  remain toward the human-required total of twenty-five.
- Issue #161 owns the next serial batch of exactly five. Phase1 is restricted to primary-source evidence and the seven
  documentation paths in `docs/tasks/ACTIVE_TASK.md`; no candidate enters runtime or counts before a controller freeze
  and separately authorized test-first Phase2.
- Geometry does not prove opening, permission or safety. Rate limiting, identity ambiguity, disconnected/mixed-mode
  topology, non-reproducible sources or unclear rights keep a candidate blocked and require replacement.

## 2026-08-23 — TP-D076 #161 Batch2 evidence stopped on OSM rate limit

- Status: `READY_FOR_CONTROLLER_REVIEW`; evidence-only, no runtime/catalog/test/CloudBase/deployment action.
- The bounded pass read relation `10548040` current-full once (relation v7) and derived only aggregate topology. Its
  connected graph has 24 branch nodes, 13 endpoints, cycle rank 7 and 12 ordered-member gaps; it is blocked despite
  walking-class way modes. The next relation full request (`12390533`) returned HTTP `429`.
- The executor stopped immediately per #161. No retry, alternate OSM endpoint, Overpass query, third-party platform,
  private evidence or official-source expansion followed. Result is a truthful `0/5 PROPOSED_FOR_CONTROLLER_FREEZE`;
  unqueried rows remain `UNKNOWN`/blocked and the runtime count stays `full=10` with Wutai non-counting.
- `docs/catalog-batch2-source-evidence.md` is the durable report. Controller direction is required before another
  bounded research pass or any Phase2 implementation allowlist is opened.

## 2026-08-23 — TP-D077 #161 controller-authorized fresh OSM pass remains short

- Status: `READY_FOR_CONTROLLER_REVIEW`; evidence-only. Comment `5386298463` authorized exactly eight unresolved
  relations, one request each, sequentially at a minimum five-second interval with an identifying User-Agent.
- Seven full responses returned HTTP 200 and one (`12390533`) returned HTTP 200 without a retained body; it was not
  re-requested. No throttle occurred in this fresh pass and no alternate endpoint, Overpass or broad search was used.
- `19017834` and `20739619` are connected branch-free walking paths but have no deterministic named endpoint/direction.
  `12390888`, `18731549`, `18731550`, `18952585` and `20737376` fail branch/order or mixed transport gates; the
  status-only `12390533` lacks topology/provenance. Result remains `0/5 PROPOSED_FOR_CONTROLLER_FREEZE`.
- `docs/catalog-batch2-source-evidence.md` records relation versions, way/node scale, components, branches,
  endpoints, cycle rank, mode mix, order gaps, ODbL URLs and blockers. No candidate counts toward ten current full
  routes; Wutai remains a non-counting restriction; no Phase2/elevation/runtime action occurred.

## 2026-08-23 — TP-D078 #161 bounded replacement discovery proposes exactly five

- Controller comment `5386337561` authorized one metadata-only Overpass query for China `type=route` + `route=hiking`
  relations carrying nonempty `name`, `from` and `to`, followed by at most twenty sequential current-full OSM reads
  with a six-second interval and identifying User-Agent. The metadata query returned HTTP 200 with 111 records; all
  twenty selected full reads returned HTTP 200 and no throttle occurred. No retries, alternate mirrors, third-party
  route platforms, private evidence, elevation requests or geometry copies were used.
- Exactly five rows reached `PROPOSED_FOR_CONTROLLER_FREEZE`: `18364943` 猛古村-桑伯格徒步线路,
  `18364941` 黑石城徒步, `19684389` 惠州大南山精华线, `19686682` 惠州大南山拉胡线 and `20072078`
  马峦山自然笔记步道. Each has explicit OSM from/to identity, one connected branch-free two-endpoint graph, zero
  order gaps/duplicate way references and an orientable member chain. Route=hiking establishes the user walk mode;
  tertiary/unclassified/residential/service/track members remain disclosed road segments, while cableway, ferry,
  cycleway and major-road boundaries remain blockers. ODbL provenance is recorded by relation/full URLs.
- This remains evidence-only. Every proposal keeps opening/operator permission and derived-database treatment
  `UNKNOWN`; the runtime count remains searchable `full=10`, remaining gap `15`, and Wutai is non-counting. No ledger
  slot is counted and no runtime/schema/test/elevation/CloudBase/deployment/commit/push action occurred. Durable detail:
  `docs/catalog-batch2-source-evidence.md`; executor handoff is `READY_FOR_CONTROLLER_REVIEW`.

## 2026-08-23 — TP-D079 #161 Phase2 frozen five implementation checkpoint

- Controller comment `5386435179` froze exactly relations `18364943`, `18364941`, `19684389`, `19686682` and `20072078` for implementation. This supersedes the earlier Phase1 proposal-only checkpoint; the frozen set is now represented in runtime with complete current-full ordered WGS84 geometry and <=500-point previews.
- One bounded Open-Meteo Elevation API request per route returned 100/93/100/100/94 samples with endpoints included. Copernicus DEM GLO-90 elevations were interpolated onto full OSM points; Haversine floor and deterministic duration (`distanceKm/4 + ascentM/600`) are covered by focused tests. No retry or runtime network integration was added.
- OSM/open-data sources retain ODbL, adjacent OpenStreetMap attribution, relation/way/node version provenance and route-specific mode disclosures (`track`, `tertiary`, `unclassified`, `service`). All five operational statuses remain `unknown`; no opening/operator/safety claim is inferred and no official source is fabricated.
- TDD RED was captured before production edits. Focused route-data, route-domain, resolver and result-page contracts pass; runtime catalog counts are `[27 sources, 185 places, 16 routes, 16 variants]` with source decomposition `10 OSM open_data + 16 prior source cards + 1 shared trusted elevation source` and capabilities `{full:15, blocked:1}`. Lifecycle truth is `full=15`, remaining gap `10`; Wutai remains non-counting. Handoff: `READY_FOR_CONTROLLER_REVIEW`; no commit, push, PR, deploy or CloudBase action.

## 2026-08-23 — TP-D080 merge #161 and activate #163 third catalog batch

- PR #162 exact head `4e575b8` passed quality run `32646797982` and two fresh exact-head independent Reviews, then
  squash merged as `f393c00`; Issue #161 closed. Runtime truth is fifteen searchable `full` variants plus the
  separate non-counting Wutai restriction, leaving ten routes toward the fixed target of 25.
- Issue #163 owns the next serial batch of exactly five. Phase1 is docs/evidence-only: one metadata discovery query
  and at most twenty sequential current-full reads, with an immediate stop on the first throttle. Blocked candidates
  do not count and no route enters runtime before a live controller freeze.
- This activation grants no runtime, elevation, dependency, config, CloudBase, deployment, deletion or release action.

## 2026-08-23 — TP-D081 #163 Batch3 bounded evidence proposes exactly five

- The single authorized metadata-only Overpass query selected China `type=route`, `route=hiking` relations with
  nonempty `name`/`from`/`to`. It returned HTTP 200 with 111 tagged relations; after excluding 55 previously
  searchable/audited relation IDs, 74 new metadata rows remained. Exactly twenty current-full OSM reads followed,
  sequentially with an identifying User-Agent and at least six seconds between starts; all twenty were HTTP 200 and
  no throttle occurred. No retry, mirror, third-party/private source, elevation request or raw geometry copy was used.
- Five identities are `PROPOSED_FOR_CONTROLLER_FREEZE`: `7060545` 路環步行徑 (closed footway/steps loop), `7060546`
  黑沙水庫家樂徑 (closed footway/steps loop), `7060560` 黑沙水庫健康徑 (closed footway/steps loop), `17147571`
  沙田郊野徑 (港鐵火炭站 → 城門郊野公園; footway/steps) and `17147573` 沙田郊野徑 (沙田圍 → 沙田坳;
  footway/steps). Four additional clean chains remain alternates; same-label open chains, stale/former identity,
  branch/gap/disconnected graphs are held or blocked as documented in the report.
- These are evidence proposals only and do not count toward the catalog: runtime remains searchable `full=15`, gap
  `10`, with Wutai separate and non-counting. ODbL relation/full source URLs and visible attribution obligations are
  recorded in `docs/catalog-batch3-source-evidence.md`; opening, permission, safety and derived-database treatment
  remain `UNKNOWN`. Handoff: `READY_FOR_CONTROLLER_REVIEW`; no runtime, tests, elevation, CloudBase, deploy, commit,
  push or PR action occurred.

## 2026-08-23 — TP-D082 #163 Phase2 frozen five runtime implementation

- Controller freeze comments `5386726512` and correction `5386727268` authorized exact relations `7060545` v11,
  `7060546` v10, `7060560` v7, `17147571` v1 and `17147573` v6. Each was read once from OSM current-full and has
  complete ordered WGS84 geometry, bounded <=500 preview, relation/way/node version provenance and a single bounded
  Open-Meteo/Copernicus DEM GLO-90 elevation request (<=100 cumulative-distance samples, endpoints included).
- Macau variants use region `澳门`; the two Sha Tin variants use region `香港`, share bare canonical `沙田郊野徑`
  (resolver confirmation) and retain only direct endpoint-qualified aliases. All five keep
  `operationalStatus=unknown` with route-specific rationales; no opening or safety fact is inferred from geometry.
  OSM/ODbL and trusted-elevation source boundaries are separate, with visible attribution; full `routeGeometry` and
  manifests remain internal and are omitted from public DTOs.
- TDD RED preceded production edits (`npm run test:route-data` observed `10 !== 15`). Focused
  route-domain/data/resolver/result contracts pass; resolver shape is `[32 sources, 190 places, 21 routes, 21 variants]`
  with capabilities `{full:20, blocked:1}`. Lifecycle truth is `full=20`, remaining gap `5`; Wutai remains a separate
  non-counting restriction. Handoff: `READY_FOR_CONTROLLER_REVIEW`; no commit, push, PR, merge, deployment, CloudBase
  or dependency action occurred.
