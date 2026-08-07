# 当前活动任务

- Task ID: `I11`
- GitHub Issue: `#20`
- Title: 录入蓝月谷—云杉坪徒步往返线
- Status: `ACTIVE`
- Mode: `IMPLEMENTATION`
- Owner: Terra XHigh
- Reviewer: Sol XHigh
- Branch: `codex/i11-yulong-community-gpx`
- Base: `main` at `1e7fa2d`
- Goal: `TP-BETA-001`

## 1. 任务目标

把用户提供且已由 Sol 审阅的 `丽江玉龙雪山蓝月谷云杉坪徒步往返线.gpx` 与当前官方管理信息按
证据职责组合，录入一条 tier B full `RouteVariant`。社区 GPX 负责其实际单日往返几何、升降、
活动窗口、最高点和天气样点；官方管理资料只负责说明景区服务与 exact 徒步路径之间的边界。
不得继承已被 TP-D039 取代的冰川公园 3356/4506/4680m、索道、`tour` 或 `mixed` 字段。

I09 已通过 PR #80 squash merge 为 `1e7fa2d`，GitHub #18 已关闭；I11 按默认串行顺序正式激活。

## 2. 必须阅读

完成 `AGENTS.md` 全局顺序后，补充阅读：

1. `docs/product-requirements.md` 的 Beta 试点与证据职责
2. `docs/architecture.md` 的领域模型、社区 GPX 边界和静态数据 seam
3. `docs/testing-strategy.md` 的 I07/route-data 社区 GPX 合同
4. `docs/research/user-gpx-audit-2026-08-07.md`
5. `docs/decision-log.md` 的 TP-D039、TP-D041
6. GitHub #20 的最新任务合同

## 3. 允许范围

- 新增 `cloudfunctions/getAdvice/data/catalog/pilots/yulong-blue-moon-yunshanping.js`
- 新增 `scripts/route-data/yulong-blue-moon-yunshanping.test.js`
- 最小修改 `scripts/route-data-contract-test.js`，注册 fragment、测试并给既有路线断言传递相应视图
- 直接相关的 `docs/current-status.md`、`docs/testing-strategy.md`、`docs/tasks/ACTIVE_TASK.md`

## 4. 非工作范围

- 原始 GPX、平台账号、轨迹 ID、头像/缩略图、应用版本、精确活动日期/时间或个人元数据入库
- 冰川公园 3356/4506/4680m、索道、景交、旧 `tour/mixed` 变体或其他试点路线
- 把景点、索道、电瓶车或景区总体开放解释为本 exact 徒步 Variant `open`
- 声称官方推荐这条社区徒步线，或声称全轨迹均位于官方划定的已开发区域
- I07 Schema、I13 registry/resolver、生产搜索、confirm、公共响应、天气、规则、UI 或历史
- 依赖、锁文件、工作流、部署、迁移或视觉改动

## 5. 固定产品与数据合同

稳定 ID：

- `source:yulong-scenic-management-2026-08-07`
- `source:yulong-blue-moon-yunshanping-community-gpx-2026-08-07`
- `route:yulong-blue-moon-yunshanping`
- `variant:yulong-blue-moon-yunshanping-out-and-back-1d`

### 5.1 Source 职责

官方管理 Source：

- `tier='A'`、`kind='government'`、`checkedAt='2026-08-07'`。
- `title='玉龙雪山景区票务公告'`，
  `publisher='丽江玉龙雪山省级旅游开发区管理委员会'`，
  `url='https://www.lijiang.cn/article/172717.html'`。
- 只以 derived 支持 Variant `operationalStatus`，note 明确公告证明景区和相关交通服务在运行，
  但景点间正式服务、现场标识和未开发区域限制不能证明经审阅 GPX 的完整徒步路径当前 `open`。
- 不支持本路线的官方命名、纯步行身份、起终点、方向、日程、几何、最高点或天气样点。

社区 GPX Source：

- `tier='B'`、`kind='reviewed_gpx'`、`url=null`、`checkedAt='2026-08-07'`。
- `title='蓝月谷—云杉坪一日往返社区 GPX（去标识化审阅）'`，
  `publisher='第三方轨迹平台社区用户，经项目控制端审阅'`。
- `supports` 按顺序覆盖 Route 的 `canonicalName`（derived）、`routeType`（direct）、
  `summary`（derived），以及 Variant 的 `canonicalName`、`fixedDays`、`stages`、`distanceKm`、
  `ascentM`、`descentM`、`routeHighestPointElevationM`、`weatherSamplePoints`（均 derived）。
- derived note 分别说明去标识化轨迹名称规范化、实际单日往返点序、上海活动日、Haversine、
  20m 重采样、半径 2 中位滤波、最高有效点或 WGS84 样点核对。
- GPX 不支持 `open`、许可、官方推荐、索道/景交运营或全程已开发区域声明。

### 5.2 实体

- Route：`canonicalName='蓝月谷—云杉坪徒步'`，aliases `蓝月谷云杉坪徒步`、
  `玉龙雪山蓝月谷云杉坪徒步`，`routeType='trek'`；
  `placeId='place:legacy:玉龙雪山'`；summary 固定为
  `从蓝月谷附近的玉龙雪山自然保护区派出所一带出发，徒步前往云杉坪后折返，在白水山庄一带结束的一日纯步行路线。`。
  legacy Place 仅作稳定容器；不得读取其旧坐标、5596m 海拔、季节、note 或 `tour` 作为新实体事实。
- Variant：`canonicalName='蓝月谷—云杉坪徒步往返线'`，aliases
  `蓝月谷云杉坪一日往返`、`丽江玉龙雪山蓝月谷云杉坪徒步往返线`；
  `direction='out_and_back'`、`isLoop=false`、
  `startPoint='玉龙雪山自然保护区派出所附近'`、`endPoint='白水山庄附近'`、`fixedDays=1`、
  `accessMode='walk'`、`operationalStatus='unknown'`、`verificationLevel='B'`、
  `routeHighestPointElevationM=3236`、`nearbyPeakElevationM=null`。

### 5.3 单日与天气样点

合同采用 `Asia/Shanghai` 单一活动日计算。距离使用半径 `6371008.8m` 的 Haversine；20m 等距
重采样后以半径 2 中位滤波高程并累计正负变化。时长为包含停留的首末活动窗口，向上取整到整分钟
后换算为两位小时，不表示移动时间或普遍建议用时。

| Day | Stage | distanceKm | ascentM | descentM | durationHours min=max |
|---:|---|---:|---:|---:|---:|
| 1 | 玉龙雪山自然保护区派出所附近 → 白水山庄附近（经云杉坪往返） | 13.223 | 408.0 | 379.0 | 5.40 |

Variant 总量与唯一 stage 相同：`distanceKm=13.223`、`ascentM=408.0`、`descentM=379.0`。

天气采样点全部使用 WGS84：

| ID | Name | lat | lon | elevationM |
|---|---|---:|---:|---:|
| `yulong-blue-moon-start` | 蓝月谷起点区域 | 27.129605 | 100.246169 | 2916.0 |
| `yulong-yunshanping-high` | 云杉坪高点 | 27.146977 | 100.224182 | 3236.0 |

D1 按上述顺序引用两个样点。实际终点 `27.129857,100.247068,2941m` 距起点约 `93.274m`，
可以复用低区天气样点，但不得声称起终是同一个轨迹点，也不得把变体标为 `loop`。

## 6. 数据质量与隐私边界

- GPX 1.1，1 个 track、1 个 segment、12,825 个有序点；坐标、高程和时间覆盖率 100%。
- 时间严格递增；无非正或非有限高程；最大相邻间距约 33.26m，没有需要拆除的跳点或交通段。
- 导出统计约为 `13.284km / +410m / -386m`，与冻结算法量级一致；合同统一使用冻结算法。
- 原文件中的 author/name、`CreaterId/CreaterName/CreaterIcon`、`TrackId`、`ThumbnailId`、
  `ProductVersion`、精确活动时间和全轨迹点全部排除。

## 7. 验收标准

1. 新 fragment 与 Wutai、Wugong、Siguniang fragment 聚合后通过 I07 catalog；保留 175 个
   legacy Place，新增 0 个 Place；总数为 8 Source、175 Place、4 Route、4 Variant，其中
   3 full、1 blocked。
2. 两类 Source 的字段职责、稳定 ID、名称、类型、方向、单日总量、时长、最高点、样点和
   `Source.supports` 与本合同一致；旧冰川公园、索道和 4680m 字段不得出现为本 Route/Variant 事实。
3. `routeHighestPointElevationM=3236` 与高点天气样点由 reviewed GPX 支持；
   `operationalStatus='unknown'` 由官方管理边界支持，不得解释为 `open`、危险或禁行。
4. 测试直接证明 stage 的 sample 引用、总量等于 stage 汇总、WGS84、两来源职责、tier B full
   状态和 `unknown` 边界；不重复 I07 的全部通用负例。
5. 既有 Wutai、Wugong、Siguniang 断言仍在各自既定视图通过；不修改它们的测试文件。
6. 原始 GPX、个人化元数据、全轨迹点和精确时间不出现在 git diff。
7. `test:route-data`、`test:route-domain`、root test、integration、lint、typecheck、WeChat build
   和 `git diff --check` 全部通过。

## 8. 测试与实现顺序

先注册新的 I11 测试/fragment require，记录缺少模块或实体的真实 RED；再实现最小静态 fragment
转 GREEN。默认测试离线，不读取 Downloads、不访问外部页面。生产 fragment 不包含 GPX 解析器。

## 9. 允许的自主决定

Terra 可决定 JS 常量组织、测试函数命名、断言分组和 runner 中既有 fragment view 的最小组合方式。
不得改变固定 ID、数值、名称、来源职责、坐标系、最高点、状态语义、文件边界或验收标准。

## 10. 必须升级

需要修改 I07 Schema、接生产 resolver、固定数据无法通过 catalog、GPX 与合同点序不符、发现精确
覆盖本 Variant 的当前禁行/开放、官方公告不再支持管理边界、或修改超出 allowlist 时，停止并反馈
Sol。不得通过降低来源、测试或状态标准继续。

## 11. 交付物

数据 fragment、聚合注册、路线测试、真实 RED/GREEN 证据、完整验证报告、直接相关文档、提交和
Draft PR。返回包必须列出实际文件、自主实现决定、偏差、已知限制和建议 Sol 重点 Review 位置。
