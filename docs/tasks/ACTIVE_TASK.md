# 当前活动任务

- Task ID: `I08`
- GitHub Issue: `#17`
- Title: 录入武功山·龙山村至景区正门反穿二日徒步线
- Status: `ACTIVE`
- Mode: `IMPLEMENTATION`
- Owner: Terra XHigh
- Reviewer: Sol XHigh
- Branch: `codex/i08-wugong-community-gpx`
- Base: `main` at `1e601d9`
- Goal: `TP-BETA-001`

## 1. 任务目标

把用户提供且已由 Sol 审阅的 `武功山反穿.gpx` 转为一条与实际轨迹身份一致的 tier B full
RouteVariant，并通过现有 `test:route-data` seam 验证。它替代原 I08 的官方索道一日线，不修改
旧路线数据，也不接入 I13 生产搜索。

规划 PR #78 已合并，GitHub #17 已同步并解除 blocked；本合同现已由 Sol 正式分派给 Terra XHigh。

## 2. 必须阅读

完成 `AGENTS.md` 全局顺序后，补充阅读：

1. `docs/product-requirements.md` 的 Beta 试点与证据职责
2. `docs/architecture.md` 的领域模型、社区 GPX 边界和静态数据 seam
3. `docs/testing-strategy.md` 的 I07/route-data 社区 GPX 合同
4. `docs/research/user-gpx-audit-2026-08-07.md`
5. GitHub #17 的最新任务合同

## 3. 允许范围

- 新增 `cloudfunctions/getAdvice/data/catalog/pilots/wugongshan-reverse.js`
- 新增 `scripts/route-data/wugongshan-reverse.test.js`
- 最小修改 `scripts/route-data-contract-test.js`，注册该 fragment 和测试
- 直接相关的 `docs/current-status.md`、`docs/testing-strategy.md`、`docs/tasks/ACTIVE_TASK.md`

## 4. 非工作范围

- 原始 GPX、平台账号、轨迹 ID、精确活动日期/时间或个人元数据入库
- 原武功山官方索道一日线、其他武功山路线或五台/四姑娘/玉龙/贡嘎数据
- I07 Schema、I13 registry/resolver、生产搜索、confirm、公共响应、天气、规则、UI 或历史
- 依赖、锁文件、工作流、部署、迁移或视觉改动

## 5. 固定产品与数据合同

稳定 ID：

- `source:wugong-community-gpx-2026-08-07`
- `route:wugongshan-reverse-traverse`
- `variant:wugongshan-longshan-to-main-gate-2d`

Source：

- `tier='B'`、`kind='reviewed_gpx'`、`url=null`、`checkedAt='2026-08-07'`。
- `title='武功山反穿社区 GPX（去标识化审阅）'`，
  `publisher='第三方轨迹平台社区用户，经项目控制端审阅'`；不得写平台账号或轨迹 ID。
- `supports` 先回链 Route 的 `canonicalName/routeType/summary`，再以 `derived` 逐项支持
  Variant 的 `canonicalName`、`fixedDays`、`stages`、
  `distanceKm`、`ascentM`、`descentM`、`routeHighestPointElevationM`、
  `weatherSamplePoints`、`operationalStatus`，note 简述
  GPX 审阅或分日汇总方法。

实体：

- Route：`canonicalName='武功山反穿'`、alias `龙山村反穿武功山`、`routeType='trek'`；
  `placeId='place:legacy:武功山反穿'`，
  `summary='从龙山村进入，经武功山山脊与金顶，由景区正门退出的两日纯步行反穿路线。'`。
  legacy Place 仅作现有稳定容器；不得读取其旧海拔、参考坐标、季节、note 或活动类型提示作为
  Route/Variant 事实。
- Variant：`canonicalName='武功山·龙山村至景区正门反穿二日徒步线'`，alias
  `武功山反穿两日线`，`direction='point_to_point'`、`isLoop=false`、`fixedDays=2`、
  `accessMode='walk'`、`operationalStatus='unknown'`、`verificationLevel='B'`、
  `routeHighestPointElevationM=1915`、`nearbyPeakElevationM=null`。
- `unknown` 只表示 GPX 不证明当前开放；不得写成 `open`，也不得把未知状态变成 blocked。

分日合同采用上海活动日分别计算后汇总，不连接约 5.8 米的隔夜坐标桥：

| Day | Stage | distanceKm | ascentM | descentM | durationHours min=max |
|---:|---|---:|---:|---:|---:|
| 1 | 龙山村徒步起点 → 观音宕首日住宿点 | 14.126 | 1767.0 | 738.0 | 5.42 |
| 2 | 观音宕首日住宿点 → 武功山景区正门 | 9.539 | 433.5 | 1421.5 | 4.32 |

Variant 总量固定为各 stage 之和：`distanceKm=23.665`、`ascentM=2200.5`、
`descentM=2159.5`。参考时长只表示该审阅轨迹的实测活动窗口，不声称为所有用户的典型速度。

天气采样点全部使用 WGS84：

| ID | Name | lat | lon | elevationM |
|---|---|---:|---:|---:|
| `wugong-longshan-start` | 龙山村起点 | 27.537922 | 114.171427 | 556.0 |
| `wugong-guanyindang-overnight` | 观音宕住宿点 | 27.474087 | 114.181005 | 1596.9 |
| `wugong-jinding-high` | 金顶高点 | 27.455233 | 114.173342 | 1915.0 |

D1 引用起点与观音宕；D2 引用观音宕与金顶。两个原始 `ele=0` 不得直接进入任何字段。

## 6. 验收标准

1. 新 fragment 与现有 Wutai fragment 聚合后通过 I07 catalog；保留 175 个 legacy Place，新增
   0 个 Place；聚合总数为 3 Source、175 Place、2 Route、2 Variant，其中恰有 1 个
   full 武功山反穿和 1 个 Wutai blocked。
2. 所有稳定 ID、名称、类型、方向、分日、总量、时长、最高点、样点和 Source.supports 与本
   合同一致；旧一日 mixed 变体的名称/数值不出现。
3. `operationalStatus='unknown'`，没有把 GPX 当作开放或许可证据。
4. 测试直接证明两个 stage 的 sample 引用、总量等于分日汇总、WGS84 坐标和 tier B
   reviewed_gpx 来源；不重复 I07 的全部通用负例。
5. 原始 GPX 和个人化元数据不出现在 git diff。
6. `test:route-data`、`test:route-domain`、root test、integration、lint、typecheck、WeChat build
   和 `git diff --check` 全部通过。

## 7. 测试与实现顺序

先增加 route-data 注册/断言，记录因缺少新 fragment 或实体而产生的真实 RED；再实现最小静态
fragment 转 GREEN。默认测试离线，不读取 Downloads、不访问第三方平台或官方网页。

## 8. 允许的自主决定

Terra 可决定 JS 常量组织、测试函数命名和断言分组。不得改变任何固定 ID、数值、名称、类型、
Source 级别、坐标系、状态语义、文件边界或验收标准。

## 9. 必须升级

需要修改 I07 Schema、需要接生产 resolver、固定数据无法通过现有 catalog、GPX 与合同点序不符、
发现精确覆盖本 Variant 的官方禁行、坐标明显不合理、或修改超出 allowlist 时，停止并反馈 Sol。

## 10. 交付物

数据 fragment、聚合注册、路线测试、真实 RED/GREEN 证据、完整验证报告、直接相关文档、提交和
PR。返回包必须列出实际文件、自主实现决定、偏差、已知限制和建议 Sol 重点 Review 位置。
