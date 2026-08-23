# 徒步薯 Trekking Potato — 主控规划

- Plan ID: `TP-MASTER-PLAN`
- Plan version: `2.1.0`
- Governance version: `TP-GOV-2.0.0`
- Updated on: `2026-08-23`
- Maintainer: 项目主控
- Status: `ACTIVE`

> 本文件是长期产品方向和优先级的事实源。当前执行范围、里程碑与状态以根目录 `GOAL.md` 为准。

## 1. 产品定位

徒步薯是微信小程序形态的徒步行前可行性检查工具，面向已经有目的地、具备基本户外判断能力的用户。它把路线事实、行程时间、天气、确定性安全规则和最低装备整理成可解释结果。

AI 负责解释、归纳和非关键补充，不负责决定路线身份、类型、天气、安全触发条件、最低装备或出发结论。

## 2. 产品原则

优先顺序：

1. 单位、日期和数据完整性
2. 路线身份、类型和变体语义
3. 确定性安全规则
4. 异常、降级与恢复
5. 核心交互效率
6. 视觉与传播
7. 新平台和商业扩张

安全工程应与实际风险成比例，不用复杂机制代替清晰的数据所有权、权限边界和契约测试。

## 3. 已完成基础

- P0-1：Open-Meteo 风速固定为 `m/s`。
- P0-2：天气窗口严格对应出发日期和 1–7 天行程。
- P0-3：`trek / climb / tour` 贯穿解析、规则、建议和展示。
- P0-4 调查：已确认模糊候选缺少前端确认闭环，详细证据待固化为任务完成记录。

## 4. 当前路线图

`TP-BETA-001` 与 `TP-STAGING-001` 已完成。`TP-COMMUNITY-001` 的社区轨迹实现已合并，但其运行时证据台账
仍作为独立的 `BLOCKED_STAGING` Goal 保留。当前 `TP-CATALOG-001 / C15` 负责可信路线目录扩充；它不改变
以下社区轨迹能力或人控门禁：

1. 私有 GPX/KML 提交与安全解析；
2. 创建者自己的状态/取消；
3. server-only 管理员 allowlist 与审核；
4. 去身份的 reviewed-evidence projection；
5. raw 最长 30 天、去身份证据最长 180 天的可审计清理；
6. 独立 catalog promotion 与 deployment 门禁。

历史 Beta Goal 分为：

1. 工程门禁
2. 路线确认和确定性安全正确性
3. `Place / Route / RouteVariant` 模型与可信试点
4. 多采样点小时天气和三档结论
5. 服务端可信上下文与私人历史
6. 核心前端状态和交互
7. Beta 验收与统一 Review

详细 Issue、依赖和完成标准只在 `GOAL.md` 与 `docs/development-plan.md` 定义。

## 5. 产品边界

当前 Goal 不包含：

- iOS/Android 原生壳、多语言、公共社区/feed、付费
- H5 分享和大规模视觉重构
- 行中导航、救援调度和攀登技术教学
- 自动路线发布、第三方平台抓取或公共 raw-track 下载
- 生产发布或公共闭测；staging 部署仍需单独人工门禁
- 删除存量数据或不可逆迁移

## 6. C15 首批 25 个可信 RouteVariant 目录扩充

当前路线目录扩充沿用既有 `Place / Route / RouteVariant` 结构，不把 175 条 legacy builtin 名称当作可信变体。
`#159` 已把运行目录提升到十条 searchable `full` routes；`#161` 第二个五条串行批次通过 PR #162
合并为 `f393c00`。当前运行目录为二十条 searchable `full` routes，剩余五条；`#163` 第三批五条已按控制器冻结
进入 Phase2 runtime review。
`docs/route-catalog-expansion.md` 仍固定 exactly-25 searchable `full` slots，五台山限制记录以 `R-WUTAI`
单列且不计入 searchable total。
新候选先保留为 `UNKNOWN`/`BLOCKED_CANDIDATE`，不自动写入 runtime catalog。任何候选无法通过完整证据门禁时，
必须经 Review 更换，不能以 blocked 槽位凑数。首批五个 proposed identities 记录在
`docs/catalog-batch1-source-evidence.md`，须先由 controller freeze 才能进入后续实现 Issue。

`#161` Phase1 bounded pass stopped after the second new OSM full-relation request returned HTTP `429`. The
successful first read (`10548040`) was topology-blocked; no candidate was proposed or counted. See
`docs/catalog-batch2-source-evidence.md`. A fresh source pass or replacement requires controller direction; no
runtime/elevation or Phase2 implementation is implied.

The controller-authorized #161 fresh pass then read only the eight unresolved OSM full relations once each with a
five-second interval and identifying User-Agent. Seven payloads were usable and one (`12390533`) was status-only 200;
the aggregate evidence still produced zero passing identities. Two simple walking paths lacked deterministic named
direction, while the remaining rows were blocked by topology/order, mixed transport or missing payload provenance.
The durable result is in `docs/catalog-batch2-source-evidence.md`; no route is counted or frozen.

The controller then authorized one metadata-only China hiking-relation Overpass query and at most twenty sequential
current-full reads (comment `5386337561`). The query returned 111 tagged relations; all twenty selected full reads
returned HTTP 200 with no throttle. Exactly five topology/direction-clean identities are recorded as
  `PROPOSED_FOR_CONTROLLER_FREEZE`: `18364943`, `18364941`, `19684389`, `19686682` and `20072078`. Their road members
are disclosed under route=hiking walk access; opening/operator permission remains `UNKNOWN`. The subsequent controller
freeze authorized Phase2 implementation with complete ordered geometry, bounded previews and one-request elevation
derivations. PR #162 passed exact-head CI and two fresh Reviews, then merged as `f393c00`; runtime truth was `full=15`,
remaining gap `10`; Wutai remains non-counting. Issue #163 now has a controller-frozen Phase2 runtime slice and
current truth `full=20`, remaining gap `5`.

### 来源与权利边界

- OSM `type=route` + `route=hiking/foot` relation 只提供开放数据几何候选。OSM 的 ODbL 署名、通知和适用的
  派生数据库义务必须随任何后续 Source/数据投影记录；规划阶段只保留关系页链接与元数据，不复制原始几何。
- first-party、operator 或明确授权的 contributor/partner track 才能进入几何审阅。GPX/KML/OSM 几何不证明开放、
  许可、合法性、安全、天气或结论；当前开放状态必须由官方/运营方来源独立支持。
- 不抓取、绕过或批量提取两步路、六只脚、Wikiloc、Strava、AllTrails 等平台。来源权利、身份、拓扑、方向或
  开放状态缺失时维持 `UNKNOWN` 并阻塞，不为达到 25 条而补造。

### 串行批次

批次按独立 child Issue、冻结 allowlist、真实 RED/GREEN、两次 exact-head Review 串行推进。Batch A 的五条雨崩
关系和历史 B/C/D 关系仍是证据记录；#159 的首批 discovery freeze 另外提出五个 topology-first replacement
identities，须由 controller 冻结后才可实现。任何 disconnected、ambiguous、rights-unclear 或缺少 current
operator source 的 row 都不能 promotion。#123 的人控 staging blocker 仍独立存在，C15 不授予 CloudBase、
定时器、删除、部署或公共发布权限。

## 7. 验收权

执行 Agent只能交付 Review。Sol XHigh 负责 PR 级批准与合并判断；Goal 是否达到人工验收由项目控制者决定。

### #159 Phase2 controller-freeze evidence checkpoint

The first five runtime RouteVariants are an implementation review slice only: 16162196 complete relation, 20072118,
20046643, 20739620 complete loop, and 17841828 lower entrance → summit. OSM/ODbL and Open-Meteo/Copernicus source
boundaries, deterministic metrics, full geometry and bounded previews are documented in `docs/route-data-licenses.md`.
Unknown opening status remains conservative; road membership is disclosed and no provider/network/deployment authority is
granted. Controller review and merge remain separate decisions.

### #163 Batch3 Phase1 evidence checkpoint (completed; historical pre-freeze)

Issue #163's bounded evidence pass completed one metadata-only Overpass query (111 tagged relations; 74 after the
55-ID prior-audit exclusion) and exactly twenty sequential current-full reads, all HTTP 200 with no throttle. Five
new identities are proposed for controller freeze: `7060545`, `7060546`, `7060560`, `17147571` and `17147573`.
Their OSM aggregate topology is connected, branch-safe and deterministic (three explicit loops and two distinct
endpoint chains); no route is counted before a controller freeze. Opening/permission/safety and ODbL derived-database
treatment remain review gates. Durable evidence is `docs/catalog-batch3-source-evidence.md`; no runtime, elevation,
CloudBase or deployment action was authorized in this phase.

### #163 Phase2 runtime implementation checkpoint

Controller freeze comments `5386726512` and `5386727268` authorize exactly relations `7060545` v11, `7060546` v10,
`7060560` v7, `17147571` v1 and `17147573` v6. Each has complete current-full OSM ordered WGS84 geometry, <=500
preview, relation/way/node provenance and one <=100-point Open-Meteo/Copernicus DEM GLO-90 elevation request. Macau
variants use region `澳门`; Hong Kong Sha Tin variants use region `香港`, share bare canonical `沙田郊野徑` (resolver
confirmation) and retain direct endpoint-qualified aliases. All operational statuses remain unknown with route-specific
rationales; no opening or safety claim is inferred. Full geometry/manifests are internal and omitted from public DTOs.

The bounded Phase2 runtime checkpoint is `32 sources / 190 places / 21 routes / 21 variants`, capabilities
`full=20, blocked=1`, and source decomposition `15 OSM open_data + 16 prior source cards + 1 shared trusted elevation
source`. Focused route-domain/data/resolver/result contracts pass after real TDD RED; lifecycle handoff is
`READY_FOR_CONTROLLER_REVIEW`. No deployment, CloudBase, commit, push or PR action occurred.
