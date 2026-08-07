# 当前活动任务

- Task ID: `I12`
- GitHub Issue: `#21`
- Title: 录入贡嘎西南坡·老榆林—玉龙西三日线
- Status: `APPROVED — PR_PENDING`
- Mode: `IMPLEMENTATION`
- Owner: Terra XHigh
- Reviewer: Sol XHigh
- Branch: `codex/i12-gongga-community-gpx`
- Base: `main` at `4a9577f`
- Goal: `TP-BETA-001`

## Contract approval checkpoint

- Contract head `a635082` passed independent Sol XHigh Review with no P0–P3 findings.
- The reviewer independently reproduced all three daily geometry totals, overnight-bridge exclusions,
  duration rounding, the 4873m route high, the three WGS84 high-area samples and aggregate counts.
- No human escalation is required. Terra may implement only the allowlist below; Sol retains Review and merge.

## Implementation result

- Registered the I12 test and fragment require first; `test:route-data` produced the genuine
  missing-fragment `MODULE_NOT_FOUND` RED.
- The minimum static fragment and exact route-data assertions are GREEN. `test:route-data`,
  `test:route-domain`, root `test`, `test:integration`, `lint` (0 errors; 10 existing warnings) and
  `typecheck` pass. The sandbox `build:weapp` hit the known `system-configuration` NULL-object panic;
  no build configuration changed, so Sol must rerun that command on the host.
- Sol reran `build:weapp` on the host successfully. Sol and a second independent Sol XHigh inspected
  implementation commit `e7510de` and returned `APPROVED` with no P0–P3 findings. Only the PR's
  latest-head Actions quality run remains before merge; Terra has not approved, merged or created a PR.

## 1. 任务目标

把用户提供且已由 Sol 审阅的 `2025-08-05 贡嘎西南坡.gpx` 与康定市官方路线身份、当前户外
管理边界按证据职责组合，录入一条 tier B full `RouteVariant`。社区 GPX 负责其实际三日点到点
几何、升降、活动窗口、最高点和天气样点；官方资料负责老榆林—玉龙西长线身份及当前封闭边界。

本任务不把个人实录改写成官方推荐或导航线路，也不继承已被 TP-D039 取代的 2015/2017 赛事
点序、距离、升降或名称。I11 已通过 PR #81 squash merge 为 `4a9577f`，GitHub #20 已关闭；
I12 按默认串行顺序进入纯文档合同 Review，合同批准前不得修改实现代码。

## 2. 必须阅读

完成 `AGENTS.md` 全局顺序后，补充阅读：

1. `docs/product-requirements.md` 的 Beta 试点与证据职责
2. `docs/architecture.md` 的领域模型、社区 GPX 边界和静态数据 seam
3. `docs/testing-strategy.md` 的 I07/route-data 社区 GPX 合同
4. `docs/research/user-gpx-audit-2026-08-07.md`
5. `docs/decision-log.md` 的 TP-D039、TP-D042
6. GitHub #21 的最新任务合同

## 3. 实现允许范围

合同获批后，Terra XHigh 只可修改：

- 新增 `cloudfunctions/getAdvice/data/catalog/pilots/gongga-laoyulin-yulongxi.js`
- 新增 `scripts/route-data/gongga-laoyulin-yulongxi.test.js`
- 最小修改 `scripts/route-data-contract-test.js`，注册 fragment、测试并给既有路线断言传递相应视图
- 直接相关的 `docs/current-status.md`、`docs/testing-strategy.md`、`docs/tasks/ACTIVE_TASK.md`

## 4. 非工作范围

- 原始 GPX、waypoint、全轨迹点、平台账号/对象字段、精确活动日期/时间或个人元数据入库
- 把“绕卡点”“河道硬上”“走错”“绕牦牛”等个人注记写成路线步骤、安全规则或推荐行为
- 主观删除个人绕行点后声称得到常规、标准或官方路线；冻结几何如实表示该次非导航实录
- 2015 盘盘山—各若仲—亚陇赛事、2017 四马塘—巴王海—贡嘎寺赛事或 2026 越野赛事实
- 把 2025 封闭公告自动解释为本 exact Variant `blocked`，或把 2026 旅游目录解释为 `open`
- 声称全轨迹位于自然保护区、未开发区域或已开放区域，或推导强制登山许可/向导要求
- I07 Schema、I13 registry/resolver、生产搜索、confirm、公共响应、天气、规则、UI 或历史
- 依赖、锁文件、工作流、部署、迁移或视觉改动

## 5. 固定产品与数据合同

稳定 ID：

- `source:gongga-laoyulin-yulongxi-official-2026-08-07`
- `source:gongga-outdoor-management-2026-08-07`
- `source:gongga-southwest-community-gpx-2026-08-07`
- `route:gongga-laoyulin-yulongxi`
- `variant:gongga-laoyulin-yulongxi-point-to-point-3d`

### 5.1 Source 职责

官方路线身份 Source：

- `tier='A'`、`kind='government'`、`checkedAt='2026-08-07'`。
- `title='在全省山地徒步旅游发展座谈会上的发言'`，
  `publisher='康定市人民政府办公室'`，
  `url='https://www.kangding.gov.cn/lt_gzjh/article/585685'`。
- 以 derived 支持 Route `canonicalName`、`routeType`、`summary`：页面直接称“老榆林至贡嘎山
  玉龙西”为已开发长线并将其归入山地徒步，但项目规范名和内部三日点序结合 reviewed GPX 形成。
- 不支持三日、exact 点序、几何、最高点、天气样点、当前开放、预约、许可或保护区分区。

官方管理 Source：

- `tier='A'`、`kind='government'`、`checkedAt='2026-08-07'`。
- `title='康定市关于禁止开展登山、徒步等户外活动的公告'`，
  `publisher='四川贡嘎山国家级自然保护区管理局、康定市教育和体育局、康定市文化广播电视和旅游局'`，
  `url='https://www.kangding.gov.cn/ttxw/article/678900'`。
- 只以 derived 支持 Variant `operationalStatus`：公告自 2025-11-20 起封闭点名山峰及全市未开发、
  未开放危险区域，恢复另行公告；但未点名本 exact Variant，且 2023 官方材料将老榆林—玉龙西
  称为已开发长线，因此不能从公开资料判定 `open` 或 `blocked`，固定为 `unknown`。
- 2026-05-20 康定市旅游目录只列共享老榆林—日乌且—莫溪沟走廊、随后转向贡嘎寺—草科的
  不同线路；它不作为 Source 入库，也不默示恢复本 exact Variant。

社区 GPX Source：

- `tier='B'`、`kind='reviewed_gpx'`、`url=null`、`checkedAt='2026-08-07'`。
- `title='贡嘎西南坡·老榆林—玉龙西三日社区 GPX（去标识化审阅）'`，
  `publisher='第三方轨迹平台社区用户，经项目控制端审阅'`。
- `supports` 按顺序覆盖 Route 的 `canonicalName`（derived）、`routeType`（direct）、
  `summary`（derived），以及 Variant 的 `canonicalName`、`fixedDays`、`stages`、`distanceKm`、
  `ascentM`、`descentM`、`routeHighestPointElevationM`、`weatherSamplePoints`（均 derived）。
- derived note 分别说明实际点序、三个上海活动日、不连接隔夜坐标桥、Haversine、20m 重采样、
  半径 2 中位滤波、有效最高轨迹点，以及按每个活动日轨迹高区选择 WGS84 样点。
- GPX 不支持 `open/blocked`、许可、预约、官方推荐、保护区分区或导航正确性。

### 5.2 实体

- Route：`canonicalName='贡嘎山·老榆林—玉龙西穿越'`，aliases `贡嘎西南坡`、
  `贡嘎西南坡穿越`，`routeType='trek'`，`placeId='place:legacy:贡嘎西南坡'`；summary 固定为
  `从老榆林方向进入，经格西草原、日乌且、莫西沟和玉龙西垭口，到玉龙西一带退出的三日点到点社区实录徒步路线。`。
  legacy Place 仅作稳定容器；不得读取其旧坐标、4800m 海拔、季节、note 或附近主峰事实。
- Variant：`canonicalName='贡嘎西南坡·老榆林—玉龙西三日线'`，aliases
  `贡嘎西南坡三日线`、`老榆林—玉龙西三日穿越`；`direction='point_to_point'`、`isLoop=false`、
  `startPoint='老榆林徒步起点区域'`、`endPoint='玉龙西出山点'`、`fixedDays=3`、
  `accessMode='walk'`、`operationalStatus='unknown'`、`verificationLevel='B'`、
  `routeHighestPointElevationM=4873`、`nearbyPeakElevationM=null`。

### 5.3 三日几何与天气样点

合同按 `Asia/Shanghai` 分为三个活动日，不连接两个隔夜坐标桥。每个活动日独立使用半径
`6371008.8m` 的 Haversine；20m 等距重采样后以半径 2 中位滤波高程并累计正负变化。时长为
包含停留的首末活动窗口，向上取整到整分钟后换算为两位小时，不表示移动时间或建议用时。

| Day | Stage | distanceKm | ascentM | descentM | durationHours min=max | sample |
|---:|---|---:|---:|---:|---:|---|
| 1 | 老榆林徒步起点区域 → 上日乌且营地 | 20.638 | 1171.6 | 92.7 | 11.77 | `gongga-riwuqie-camp-high` |
| 2 | 上日乌且营地 → 莫西沟营地 | 14.069 | 600.8 | 972.9 | 10.82 | `gongga-riwuqie-pass-high` |
| 3 | 莫西沟营地 → 玉龙西出山点 | 10.185 | 619.7 | 563.3 | 7.98 | `gongga-yulongxi-pass-high` |

Variant 总量严格为 stage 汇总：`distanceKm=44.892`、`ascentM=2392.1`、`descentM=1628.9`。
全段逐点距离 `44.918km` 包含约 `15.140m` 与 `11.237m` 的两个隔夜桥，只作审计对照；导出
统计 `45.266km / +2338.9m / -1584.2m` 也只作量级对照，不覆盖冻结算法。

天气样点全部使用 GPX 1.1 WGS84 语义下各活动日实际高区点：

| ID | Name | lat | lon | elevationM | stage |
|---|---|---:|---:|---:|---:|
| `gongga-riwuqie-camp-high` | 上日乌且营地高点 | 29.791363 | 101.836397 | 4305 | D1 |
| `gongga-riwuqie-pass-high` | 日乌且垭口轨迹高点 | 29.771295 | 101.806582 | 4873 | D2 |
| `gongga-yulongxi-pass-high` | 玉龙西垭口轨迹高点 | 29.650335 | 101.738087 | 4475 | D3 |

每个 stage 只引用表中对应的一个样点。样点用于行前天气走廊，不是导航点；Variant 起点实录为
`29.916882,101.958587,3227.2m`，终点为 `29.644566,101.719698,3969.2m`，起终直线距离
`38.058km`。全轨最高有效 `trkpt` 为约 `4872.5m`，按整米冻结为 `4873m`；相邻 waypoint 的
`4879.3m` 不是轨迹点，不得替代路线最高点。

## 6. 数据质量、个人绕行与隐私边界

- GPX 1.1，1 个 track、1 个 segment、4067 个有序点；坐标、正且有限高程和时间覆盖率 100%。
- 时间严格递增；最大相邻间距约 `21.642m`，没有空间断轨或应删除的交通段。
- Waypoint 含“绕卡点”“河道硬上”“走错”“绕牦牛”等个人实录。其文字、具体 waypoint 与
  导航/推荐含义全部排除；没有可复核边界可安全修剪点序，因此冻结几何诚实包含当次绕行并明确
  仅为非导航实录。未来常规/官方路线必须由新的可信资料定义。
- 原文件中的 author/name、创建者/原创建者字段、轨迹/缩略图 ID、产品版本、标签/运动统计、
  精确日期/时间/速度、全轨迹点和全部 waypoint 均排除。

## 7. 验收标准

1. 新 fragment 与 Wutai、Wugong、Siguniang、Yulong fragment 聚合后通过 I07 catalog；保留
   175 个 legacy Place，新增 0 个 Place；总数为 11 Source、175 Place、5 Route、5 Variant，
   其中 4 full、1 blocked。
2. 三类 Source 的字段职责、稳定 ID、名称、类型、方向、三日总量、时长、最高点、样点和
   `Source.supports` 与本合同一致；不同年份赛事数据与个人 waypoint 不得成为实体事实。
3. 测试直接证明三个 stage 的 sample 引用、总量等于 stage 汇总、WGS84、tier B full、
   `routeHighestPointElevationM=4873` 及官方管理 `unknown` 边界；不重复 I07 全部通用负例。
4. `unknown` 不得解释为 `open`、天气危险或已禁行；测试锁定公告 note 没有越权映射 exact 范围。
5. 既有 Wutai、Wugong、Siguniang、Yulong 断言仍在各自既定视图通过；不修改它们的测试文件。
6. 原始 GPX、个人/平台元数据、全轨迹点、waypoint 文字和精确时间不出现在 git diff。
7. `test:route-data`、`test:route-domain`、root test、integration、lint、typecheck、WeChat build
   和 `git diff --check` 全部通过。

## 8. 测试与实现顺序

先注册新的 I12 测试/fragment require，记录缺少模块或实体的真实 RED；再实现最小静态 fragment
转 GREEN。默认测试离线，不读取 Downloads、不访问外部页面。生产 fragment 不包含 GPX 解析器。

## 9. 允许的自主决定

Terra 可决定 JS 常量组织、测试函数命名、断言分组和 runner 中既有 fragment view 的最小组合方式。
不得改变固定 ID、数值、名称、来源职责、坐标系、最高点、状态语义、文件边界或验收标准。

## 10. 必须升级

需要修改 I07 Schema、接生产 resolver、固定数据无法通过 catalog、GPX 与合同点序不符、发现精确
覆盖本 Variant 的当前禁行/开放、官方来源内容发生实质变化、或修改超出 allowlist 时，停止并反馈
Sol。不得通过降低来源、测试或状态标准继续。

## 11. 交付物

合同 Review 通过后，交付数据 fragment、聚合注册、路线测试、真实 RED/GREEN 证据、完整验证报告、
直接相关文档、提交和 Draft PR。返回包必须列出实际文件、自主实现决定、偏差、已知限制和建议 Sol
重点 Review 位置。
