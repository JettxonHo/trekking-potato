# 当前活动任务

- Task ID: `I09`
- GitHub Issue: `#18`
- Title: 录入四姑娘山二峰·海子沟两日往返线
- Status: `ACTIVE`
- Mode: `IMPLEMENTATION`
- Owner: Terra XHigh
- Reviewer: Sol XHigh
- Branch: `codex/i09-siguniang-community-gpx`
- Base: `main` at `adfa0d8`
- Goal: `TP-BETA-001`

## 1. 任务目标

把用户提供且已由 Sol 审阅的 `四姑娘二峰.gpx` 与当前官方路线/管理信息按证据职责组合，录入一条
tier B full `RouteVariant`。官方来源只负责二峰两日路线身份、5276m 路线最高点和动态管理事实；
社区 GPX 只负责实际两日几何、升降、活动窗口与天气样点。不得恢复已被 TP-D039 取代的七日路线。

I08 已通过 PR #79 合并为 `adfa0d8`，GitHub #17 已关闭；I09 按默认串行顺序正式激活。

## 2. 必须阅读

完成 `AGENTS.md` 全局顺序后，补充阅读：

1. `docs/product-requirements.md` 的 Beta 试点与证据职责
2. `docs/architecture.md` 的领域模型、社区 GPX 边界和静态数据 seam
3. `docs/testing-strategy.md` 的 I07/route-data 社区 GPX 合同
4. `docs/research/user-gpx-audit-2026-08-07.md`
5. `docs/decision-log.md` 的 TP-D039、TP-D040
6. GitHub #18 的最新任务合同

## 3. 允许范围

- 新增 `cloudfunctions/getAdvice/data/catalog/pilots/siguniang-erfeng.js`
- 新增 `scripts/route-data/siguniang-erfeng.test.js`
- 最小修改 `scripts/route-data-contract-test.js`，注册 fragment、测试并给既有路线断言传递相应视图
- 直接相关的 `docs/current-status.md`、`docs/testing-strategy.md`、`docs/tasks/ACTIVE_TASK.md`

## 4. 非工作范围

- 原始 GPX、平台账号、轨迹 ID、头像/缩略图、应用版本、精确活动日期/时间或个人元数据入库
- 旧四姑娘山二峰七日线、附近其他山峰、其他试点路线或 legacy 数据改写
- I07 Schema、I13 registry/resolver、生产搜索、confirm、公共响应、天气、规则、UI 或历史
- 把官方近似 `16km/30km`、`7h/14h` 覆盖到本 GPX 的派生几何和实测窗口
- 依赖、锁文件、工作流、部署、迁移或视觉改动

## 5. 固定产品与数据合同

稳定 ID：

- `source:siguniang-erfeng-official-route-2026-08-07`
- `source:siguniang-haizigou-management-2026-08-07`
- `source:siguniang-erfeng-community-gpx-2026-08-07`
- `route:siguniang-erfeng`
- `variant:siguniang-erfeng-haizigou-out-and-back-2d`

### 5.1 Source 职责

官方路线 Source：

- `tier='A'`、`kind='official'`、`checkedAt='2026-08-07'`。
- `title='四姑娘山二峰（海拔5276m）推荐行程'`，
  `publisher='四姑娘山风景名胜区管理局'`，`url='https://www.sgns.cn/play/line'`。
- `supports` 按顺序覆盖 Route 的 `canonicalName`（direct）、`routeType`（derived）、
  `summary`（derived），以及 Variant 的 `canonicalName`（derived）、`fixedDays`（direct）、
  `routeHighestPointElevationM`（direct）。derived note 必须说明来自官方二峰两日冲顶点序，
  页面近似距离/时长不作为 GPX 几何。

官方管理 Source：

- `tier='A'`、`kind='government'`、`checkedAt='2026-08-07'`。
- `title='四姑娘山海子沟部分户外线路4月10日起恢复开放'`，
  `publisher='阿坝藏族羌族自治州人民政府'`，
  `url='https://www.abazhou.gov.cn/abazhou/c101955/202604/a5ea16709bc94f44ac20950848ac3bf8.shtml'`。
- 只以 derived 支持 Variant `operationalStatus`，note 明确仅部分线路恢复、封闭时段动态划定、
  赛事涉及区域可能暂停手续，不能证明本 Variant 当前 `open`。

社区 GPX Source：

- `tier='B'`、`kind='reviewed_gpx'`、`url=null`、`checkedAt='2026-08-07'`。
- `title='四姑娘山二峰两日往返社区 GPX（去标识化审阅）'`，
  `publisher='第三方轨迹平台社区用户，经项目控制端审阅'`。
- `supports` 以 derived 按顺序覆盖 Variant 的 `stages`、`distanceKm`、`ascentM`、
  `descentM`、`weatherSamplePoints`；note 简述上海活动日拆分、20m 重采样、半径 2
  中位滤波、分日汇总或样点选取。
- GPX 不支持 `open`、许可、报备状态、强制向导、官方近似行程或 5276m 官方峰高。

### 5.2 实体

- Route：`canonicalName='四姑娘山二峰'`、alias `四姑娘山二峰登山`、`routeType='climb'`；
  `placeId='place:legacy:四姑娘山二峰'`；summary 固定为
  `从四姑娘山镇海子沟方向进入，经锅庄坪、打尖包至二峰大本营，次日登顶二峰后返回海子沟起点区域的两日高海拔攀登路线。`。
  legacy Place 仅作稳定容器；不得读取其旧坐标、海拔、季节、note 或类型提示作为新实体事实。
- Variant：`canonicalName='四姑娘山二峰·海子沟两日往返线'`，aliases
  `四姑娘山二峰两日线`、`海子沟二峰往返`；`direction='out_and_back'`、`isLoop=false`、
  `startPoint='海子沟徒步起点'`、`endPoint='海子沟徒步终点'`、`fixedDays=2`、
  `accessMode='walk'`、`operationalStatus='unknown'`、`verificationLevel='B'`、
  `routeHighestPointElevationM=5276`、`nearbyPeakElevationM=null`。
- 5276m 表示官方二峰登顶路线的真实最高点；GPX 实测高点 5254m 只用于天气样点。不得把
  5276 写成 nearby peak，也不得用 GPX 5254 静默覆盖官方路线最高点。

### 5.3 分日与天气样点

分日合同采用 `Asia/Shanghai` 活动日分别计算，不连接 11:25:07 停留期间约 8.5m 的隔夜桥。
距离按日 Haversine；20m 等距重采样后以半径 2 中位滤波高程并累计正负变化。时长为包含停留的
首末活动窗口，向上取整到整分钟后换算为两位小时，不表示移动时间或普遍建议用时。

| Day | Stage | distanceKm | ascentM | descentM | durationHours min=max |
|---:|---|---:|---:|---:|---:|
| 1 | 海子沟徒步起点 → 二峰大本营 | 12.995 | 1123.2 | 53.2 | 6.23 |
| 2 | 二峰大本营 → 海子沟徒步终点（经二峰高点往返） | 19.584 | 966.2 | 2040.7 | 12.98 |

Variant 总量固定为 stage 之和：`distanceKm=32.579`、`ascentM=2089.4`、
`descentM=2093.9`。

天气采样点全部使用 WGS84：

| ID | Name | lat | lon | elevationM |
|---|---|---:|---:|---:|
| `siguniang-haizigou-start` | 海子沟起终点 | 30.999177 | 102.841495 | 3246.0 |
| `siguniang-erfeng-base-camp` | 二峰大本营 | 31.046768 | 102.919293 | 4319.0 |
| `siguniang-erfeng-high` | 二峰高点 | 31.068860 | 102.908327 | 5254.0 |

D1 引用起终点与大本营；D2 引用大本营、高点、起终点。实际 D2 终点距 D1 起点约 72m，复用
低点天气样点但不声称它们是同一轨迹点。

## 6. 验收标准

1. 新 fragment 与 Wutai、Wugong fragment 聚合后通过 I07 catalog；保留 175 个 legacy Place，
   新增 0 个 Place；总数为 6 Source、175 Place、3 Route、3 Variant，其中 2 full、1 blocked。
2. 三类 Source 的字段职责、稳定 ID、名称、类型、方向、分日、总量、时长、最高点、样点和
   `Source.supports` 与本合同一致；旧七日/附近峰数据和官方近似里程不得出现为本 Variant 字段。
3. `routeHighestPointElevationM=5276` 由官方路线 Source 支持；高点天气样点保留 GPX 实测
   `5254`；`operationalStatus='unknown'` 由动态管理 Source 支持。
4. 测试直接证明两个 stage 的 sample 引用、总量等于分日汇总、WGS84、三来源职责、tier B
   full 状态和 `unknown` 边界；不重复 I07 的全部通用负例。
5. 既有 Wutai 与 Wugong 断言仍在各自既定视图通过；不修改它们的测试文件。
6. 原始 GPX、个人化元数据、全轨迹点和精确时间不出现在 git diff。
7. `test:route-data`、`test:route-domain`、root test、integration、lint、typecheck、WeChat build
   和 `git diff --check` 全部通过。

## 7. 测试与实现顺序

先注册新的 I09 测试/fragment require，记录缺少模块或实体的真实 RED；再实现最小静态 fragment
转 GREEN。默认测试离线，不读取 Downloads、不访问外部页面。生产 fragment 不包含 GPX 解析器。

## 8. 允许的自主决定

Terra 可决定 JS 常量组织、测试函数命名、断言分组和 runner 中既有 fragment view 的最小组合方式。
不得改变固定 ID、数值、名称、来源职责、坐标系、最高点分工、状态语义、文件边界或验收标准。

## 9. 必须升级

需要修改 I07 Schema、接生产 resolver、固定数据无法通过 catalog、GPX 与合同点序不符、发现精确
覆盖本 Variant 的当前禁行、官方页面不再支持二峰两日身份/5276m、或修改超出 allowlist 时，停止
并反馈 Sol。不得通过降低来源、测试或状态标准继续。

## 10. 交付物

数据 fragment、聚合注册、路线测试、真实 RED/GREEN 证据、完整验证报告、直接相关文档、提交和
Draft PR。返回包必须列出实际文件、自主实现决定、偏差、已知限制和建议 Sol 重点 Review 位置。
