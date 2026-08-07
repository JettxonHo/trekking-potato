# 当前活动任务

- Task ID: `I10c`
- GitHub Issue: `#77`
- Title: 录入党岭村—葫芦海—卓雍措 reviewed-track 第五试点
- Status: `READY_FOR_CONTROLLER_REVIEW`
- Mode: `IMPLEMENTATION`
- Owner: Sol XHigh
- Implementation Agent: Terra XHigh
- Branch: `codex/77-dangling-track-data`
- Base: `main` at `3983102`
- Goal: `TP-BETA-001`

## 1. 目标与背景

把用户明确拥有、经 Sol 审阅的党岭 KML 录入为第五条 tier B full RouteVariant，解除 I13 的
最后一个路线数据依赖。KML 只提供其实际记录路线的几何；官方/政府资料负责地点身份和管理边界。

两次独立审阅均确认该 KML 的 3,326 组坐标、高程和时间完整、连续且无需转 GPX。路线冻结为
`党岭村—葫芦海—卓雍措一日往返`，当前没有一手证据证明 exact Variant 处于持续开放或当前禁行，
所以 `operationalStatus='unknown'`。完整审阅见
`docs/research/dangling-kml-audit-2026-08-07.md` 和 TP-D043。

## 2. 必读文件

执行 Agent 完成 `AGENTS.md` 的强制阅读顺序后，再阅读：

1. GitHub #77 的同步任务合同
2. `docs/research/dangling-kml-audit-2026-08-07.md`
3. `docs/architecture.md` 的领域模型、社区轨迹边界和静态数据 seam
4. `docs/testing-strategy.md` 的 I10c route-domain/route-data 要求
5. `cloudfunctions/getAdvice/domain/route-catalog.js`
6. 既有四个 full pilot fragment、各自测试和 `scripts/route-data-contract-test.js`

不得读取或提交原始 KML；实现只消费本合同已冻结的去标识化派生字段。

## 3. 允许修改的文件

实现 Agent 只可修改下列文件：

1. `cloudfunctions/getAdvice/domain/route-catalog.js`
2. `scripts/route-domain-contract-test.js`
3. `cloudfunctions/getAdvice/data/catalog/pilots/dangling-huluhai-zhuoyongcuo.js`（新增）
4. `scripts/route-data/dangling-huluhai-zhuoyongcuo.test.js`（新增）
5. `scripts/route-data-contract-test.js`
6. `docs/current-status.md`
7. `docs/tasks/ACTIVE_TASK.md`

除非 Sol 先更新合同，不得修改其他文件。

## 4. 固定数据合同

### 4.1 稳定 ID 与 Source

- `source:dangling-route-identity-2026-08-07`
  - tier `A`，kind `government`
  - 标题：`以政协之智 展政协之为——丹巴县政协以小微协商助力党岭景区摩托车载客等乱象整治`
  - 发布者：`政协甘孜藏族自治州委员会`
  - URL：`https://www.gzzzx.gov.cn/go-a855.htm`
  - 只支持 Route `canonicalName / routeType / summary` 的派生身份；明确说明 exact 点序来自
    reviewed track。
- `source:dangling-winter-management-2026-08-07`
  - tier `A`，kind `government`
  - 标题：`甘孜：丹巴党岭的迷途引路人`
  - 发布者：`丹巴县人民政府（县融媒体中心）`
  - URL：`https://www.danba.gov.cn/ttxw/article/680325`
  - 只支持 Variant `operationalStatus` 的派生 `unknown`：页面证明 2025-11-15 起的当次冬季
    关闭，但不证明 2026-08-07 仍封闭；未找到一手当前开放原文。
- `source:dangling-huluhai-zhuoyongcuo-reviewed-track-2026-08-07`
  - tier `B`，kind `reviewed_track`
  - 标题：`党岭村—葫芦海—卓雍措一日 KML 轨迹（用户自有，去标识化审阅）`
  - 发布者：`用户本人，经项目控制端审阅`
  - URL：`null`
  - 支持 Route `canonicalName / routeType / summary`，以及 Variant `canonicalName / fixedDays /
    stages / distanceKm / ascentM / descentM / routeHighestPointElevationM / weatherSamplePoints`。
  - `method` 和 `note` 必须与审阅方法一致，不得声称 KML 直接证明开放状态。

所有 Source `checkedAt='2026-08-07'`。

`supports` 顺序、method 与 note 冻结如下，route-data test 必须原样断言：

1. 身份 A 级 Source
   - Route `canonicalName` / `derived`：`页面同时明确葫芦海、卓雍措与党岭徒步旅游身份；exact 点序与规范名由 reviewed track 补足。`
   - Route `routeType` / `derived`：`页面将相关活动描述为登山徒步；不以页面缺失的几何推导行程。`
   - Route `summary` / `derived`：`页面的党岭—葫芦海—卓雍措区域身份与 reviewed track 实际点序结合形成。`
2. 管理 A 级 Source
   - Variant `operationalStatus` / `derived`：`页面证明党岭区域徒步线路自 2025-11-15 起进入当次冬季关闭；未证明 2026-08-07 仍封闭，且未找到一手当前开放原文，故记录 unknown。`
3. reviewed-track B 级 Source
   - Route `canonicalName` / `derived`：`KML 实际点序经党岭村、葫芦海与卓雍措地标核对后规范化。`
   - Route `routeType` / `direct`：无 note。
   - Route `summary` / `derived`：`由 KML 的单日纯步行往返形态和地标点序派生。`
   - Variant `canonicalName` / `derived`：`由 KML 的单日往返形态与实际地标点序派生。`
   - Variant `fixedDays` / `derived`：`按 Asia/Shanghai 活动日为一日。`
   - Variant `stages` / `derived`：`单一活动日连续轨迹；参考时长按首末时间向上取整到整分钟。`
   - Variant `distanceKm` / `derived`：`对连续 WGS84 轨迹点使用半径 6371008.8m 的 Haversine。`
   - Variant `ascentM` / `derived`：`20m 等距重采样后以半径 2 中位滤波高程，累计正向变化。`
   - Variant `descentM` / `derived`：`20m 等距重采样后以半径 2 中位滤波高程，累计负向变化。`
   - Variant `routeHighestPointElevationM` / `derived`：`来自 KML 最高有效轨迹点 4341.2m，按整米记录。`
   - Variant `weatherSamplePoints` / `derived`：`按 KML WGS84 语义与地标交叉核对，选择低区起点和卓雍措方向轨迹高点。`

### 4.2 Route

- ID：`route:dangling-huluhai-zhuoyongcuo`
- Place：复用 `place:legacy:党岭`；不得消费该 legacy Place 的旧坐标、高程、季节、类型提示或 note。
- 规范名：`党岭·葫芦海—卓雍措徒步`
- aliases：`['党岭葫芦海卓雍措', '党岭卓雍措往返']`
- routeType：`trek`
- summary：`从党岭村出发，经葫芦海到卓雍措湖畔方向后返回党岭村区域的一日社区实录徒步路线。`
- sourceIds：身份 A 级 Source + reviewed-track Source。

### 4.3 RouteVariant

- ID：`variant:dangling-huluhai-zhuoyongcuo-out-and-back-1d`
- 规范名：`党岭村—葫芦海—卓雍措一日往返`
- aliases：`['党岭葫芦海卓雍措一日线', '党岭村—卓雍措往返']`
- `recordStatus='verified'`、`capability='full'`
- `direction='out_and_back'`、`isLoop=false`、`fixedDays=1`
- startPoint：`党岭村徒步起点区域`
- endPoint：`党岭村徒步终点区域`
- 单一 stage：
  - day `1`
  - 起终点同上
  - `distanceKm=19.067`
  - `ascentM=1009.4`
  - `descentM=955.8`
  - `durationHours={ min: 12.18, max: 12.18 }`
  - 样点 IDs：`dangling-village-trailhead`、`dangling-zhuoyongcuo-track-high`
- Variant 总量与 stage 相同。
- `routeHighestPointElevationM=4341`、`nearbyPeakElevationM=null`
- `accessMode='walk'`
- `operationalStatus='unknown'`
- `verificationLevel='B'`
- sourceIds：管理 A 级 Source + reviewed-track Source。
- `sourceCheckedAt='2026-08-07'`

### 4.4 天气样点

两个样点均为实际 KML WGS84 点：

1. `dangling-village-trailhead`
   - 名称：`党岭村徒步起点区域`
   - coordinate：`{ lat: 31.075586, lon: 101.403937, coordinateSystem: 'WGS84' }`
   - elevationM：`3383`
2. `dangling-zhuoyongcuo-track-high`
   - 名称：`卓雍措方向轨迹高点`
   - coordinate：`{ lat: 31.051365, lon: 101.359981, coordinateSystem: 'WGS84' }`
   - elevationM：`4341`

不得增加第三样点、使用 legacy 坐标或把第二个样点写成未经证实的垭口。

## 5. TDD 与测试要求

按以下顺序留下可说明的 RED/GREEN 证据：

1. 在 `scripts/route-domain-contract-test.js` 增加最小 `reviewed_track` 正例，先证明旧 enum 拒绝，
   再在 `SOURCE_KINDS` additive 加入 `reviewed_track`；现有 `reviewed_gpx` 测试必须继续通过。
2. 注册新的 route-data test 与 fragment require，在 fragment 尚不存在时运行
   `npm run test:route-data`，得到预期 `MODULE_NOT_FOUND` RED。
3. 添加最小静态 fragment 达到 GREEN，不编写 KML parser 或通用 registry。

最终必须通过：

```text
npm run test:route-domain
npm run test:route-data
npm test
npm run test:integration
npm run lint
npm run typecheck
npm run build:weapp
git diff --check
```

route-data test 必须深比较三条 Sources（含有序 supports 方法和说明）、Route、Variant 与 fragment
边界，并固定最终聚合为：14 Sources、175 Places、6 Routes、6 Variants、5 full、1 blocked。
先前路线应继续获得各自既定的聚合视图，避免机械改写它们的历史计数断言。

## 6. 非范围与禁止事项

- 不提交、复制、转换或在测试中读取原始 KML。
- 不保存账户、轨迹 ID、头像/缩略图、精确个人日期时间或完整点序。
- 不新增生产 KML/GPX parser、上传入口、数据库、依赖或公共响应字段。
- 不修改既有四条 `reviewed_gpx` Source，不做迁移或全局重命名。
- 不修改 `routes.js` 的 legacy 党岭记录，不使用其中不准确的坐标和海拔。
- 不把历史冬季关闭永久化为 `blocked`，也不把二手恢复消息写成 `open`。
- 不启动 I13、I21、I22 或 I23，不修改 UI、云函数 handler、搜索、天气或规则行为。
- 不为一个孤立速度采样增加复杂清洗或防御分支。

## 7. 允许自主决定与升级条件

Terra 可自行决定测试 helper 名称、断言组织和不改变冻结值的局部数据排版。

遇到以下情况必须停止并交回 Sol：需要改变任一稳定 ID、字段值、Source 职责、Source enum 方案、
公共接口、架构、依赖、allowlist；现有目录无法在不降低验证标准下接收合同；测试暴露跨模块问题；
路线管理资料与合同发生新的实质冲突。

部署、生产配置、数据迁移、权限/隐私边界变化和不可逆操作不在授权内。

## 8. 验收与交付物

- `reviewed_track` 以最小 additive 方式进入内部目录且 `reviewed_gpx` 保持兼容。
- 新 fragment 通过 I07 全部验证，五条 full + 一条 blocked 聚合成立。
- 数据、supports、测试与本合同逐字段一致；没有原始或个人轨迹元数据。
- 全部指定命令通过，无隐藏失败或 Goal 外修改。
- Terra 返回结果包：完成情况、修改摘要、实际文件、RED/GREEN 证据、完整测试结果、计划差异、
  自主决定、限制、PR 和重点 Review 位置。
- Terra 只可提交 `READY_FOR_CONTROLLER_REVIEW`；不得批准或合并自己的 PR。

## 9. 当前下一步

独立 Sol XHigh Review 已返回 `APPROVED`，P0–P3 均无剩余 finding。规划 PR #86 通过
latest-head quality 并 squash merged 为 `3983102`。Terra XHigh 已按本合同完成握手、两步真实
RED/GREEN、实现、验证和结果包，并标记 `READY_FOR_CONTROLLER_REVIEW`；现在仅由 Sol 独立审查。
