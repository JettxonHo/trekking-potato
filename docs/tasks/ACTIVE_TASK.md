# 当前活动任务

- Task ID: `I07-CONTRACT`
- GitHub Issue: `#16` — `https://github.com/JettxonHo/trekking-potato/issues/16`
- Title: 路线领域模型与旧数据适配任务合同
- Status: `CONTRACT_APPROVED`
- Mode: `REVIEW_ONLY`
- Owner: Sol XHigh
- Reviewer: Sol XHigh
- Branch: `codex/i07-route-domain-contract`
- Base: `main` at `57ab44c`
- Goal: `TP-BETA-001`

I07 的三方案设计和两轮独立合同 Review 已完成，最终结果为 `APPROVED`。GitHub #16 在
规划 PR 合并前仍不能交给 Terra；本阶段只允许创建/验证规划 PR 和下列规划文档变更。

## Objective

审查并冻结 Source/Place/Route/RouteVariant 的最小深模块接口、旧 BUILTIN_ROUTES 适配
边界、字段验证和来源/运行状态语义，使 I08–I13 可以在冻结 schema 上独立开发，同时不
提前写入五条试点数据或改变当前搜索行为。

## Planning allowlist

- `GOAL.md`
- `docs/architecture.md`
- `docs/development-plan.md`
- `docs/testing-strategy.md`
- `docs/decision-log.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

## Frozen contract

- 新增一个无 I/O 深模块，唯一生产接口为：

  ```js
  createRouteCatalog({
    legacyRecords = [], sources = [], places = [], routes = [], variants = []
  }) -> { sources, places, routes, variants, getById(id) }
  ```

  只额外导出 `RouteCatalogValidationError` 供测试识别。adapter、复制、索引和校验均为
  私有实现，不增加 query/resolve/search 接口。
- Source 字段固定为 `id/tier/kind/title/publisher/url/checkedAt/supports[]`；`tier` 为 A/B/C，
  `supports[]` 记录 `{field, method:'direct'|'derived', note?}`。来源等级由 Sol 审阅，不建立
  加权评分。
- Place 固定含 `entityKind='place'`、`capability='place_only'`、显式 ID、名称/别名/地区/
  kind、参考坐标和坐标系、`sourceStatus/sourceIds`。仅 legacy 可附加
  `activityTypeHint/legacyCandidateId`；二者不是路线事实。
- Route 固定含 `entityKind='route'`、显式 ID、placeId、名称/别名、routeType、summary 和
  sourceIds。
- RouteVariant 为两支判别 union：
  - `recordStatus='verified' / capability='full'`：A/B、open/unknown、固定日程、连续 stages、
    总距离/升降、独立路线最高点、1–3 个采样点、合法 stage 引用、accessMode 和来源。
  - `recordStatus='blocked' / capability='blocked'`：tier A 权威来源、
    `operationalStatus='blocked'`、
    restriction 理由/范围/有效期/来源；不得要求或伪造 full 行程字段。
- 新实体 ID 必须由数据文件显式提供并使用 `source:/place:/route:/variant:` 命名空间；不
  使用数组下标、哈希或展示名生成。legacy 仅以冻结规范名生成内部
  `place:legacy:<canonicalName>`，改显示名只能新增 alias；公共 I05 ID 保持
  `builtin-route:<canonicalName>` 到 I13。
- 全局 ID 唯一；route/place、variant/route、实体/source、stage/sample 引用必须存在。
  full 必须满足 `fixedDays === stages.length`、day 为 1..N、时长有序、数值有限且距离/
  升降非负。附近峰海拔不能替代必填路线最高点或采样点海拔。
- 无效静态目录抛 `RouteCatalogValidationError`，`code='invalid_route_catalog'`，issues
  只含稳定 code/path；`getById` miss 返回 null。I07 不新增公共 phase/error。
- 175 条 BUILTIN_ROUTES 只适配为 175 个 `legacy_unverified`/place-only Place，且
  Route/Variant 数均为 0；仅映射 name/aliases/location/GCJ-02 lat/lon/type hint/I05 ID。
  alias 在每个 Place 内 trim、去重并删除等于 canonicalName 的项，但跨 Place 重复 alias
  必须保留；旧 elevation/bestSeason/note 不进入新领域事实，不从 note 推断 blocked。
- I07 不修改 `data/routes.js`、`geocode.js`、`index.js` 或前端，不迁移数据库，不改变公共
  响应、confirm ID、天气、装备、AI、历史或当前搜索行为。I08–I12 分别录入数据；I13
  再建立生产聚合与搜索接入。

### Exact schema

除明确标为可空或可选的字段外，下列字段均必填；未知值不得用空字符串或伪造的 0/推导
事实占位，合法的 0 经纬度或 0 升降仍按其真实含义接受。所有名称、别名、摘要和理由必须
是 trim 后非空字符串，alias 不得为空、重复或等于自身 canonicalName。

```js
Source = {
  id: 'source:<stable-slug>',
  tier: 'A' | 'B' | 'C',
  kind: 'official' | 'government' | 'association' | 'trusted_api' |
        'reviewed_gpx' | 'reliable_secondary' | 'user_input' | 'legacy_unknown',
  title: string,
  publisher: string,
  url: string | null,
  checkedAt: 'YYYY-MM-DD',
  supports: [{
    entityId: string,
    field: string,
    method: 'direct' | 'derived',
    note?: string, // method='derived' 时必填
  }],
}

Place = {
  entityKind: 'place',
  capability: 'place_only',
  id: 'place:<stable-slug>',
  canonicalName: string,
  aliases: string[],
  region: string,
  kind: 'mountain' | 'scenic_area' | 'trail_area' | 'cultural_site' | 'unknown',
  referenceCoordinate: {
    lat: number,
    lon: number,
    coordinateSystem: 'GCJ-02' | 'WGS84',
  },
  sourceStatus: 'verified' | 'unverified' | 'legacy_unverified',
  sourceIds: string[],
  activityTypeHint?: 'trek' | 'climb' | 'tour', // legacy adapter only
  legacyCandidateId?: 'builtin-route:<canonicalName>', // legacy adapter only
}

Route = {
  entityKind: 'route',
  id: 'route:<stable-slug>',
  placeId: string,
  canonicalName: string,
  aliases: string[],
  routeType: 'trek' | 'climb' | 'tour',
  summary: string,
  sourceIds: string[],
}

FullVariant = {
  entityKind: 'route_variant',
  recordStatus: 'verified',
  capability: 'full',
  id: 'variant:<stable-slug>',
  routeId: string,
  canonicalName: string,
  aliases: string[],
  direction: 'loop' | 'out_and_back' | 'point_to_point',
  startPoint: string,
  endPoint: string,
  isLoop: boolean,
  fixedDays: number,
  stages: [{
    day: number,
    startPoint: string,
    endPoint: string,
    distanceKm: number,
    ascentM: number,
    descentM: number,
    durationHours: { min: number, max: number },
    weatherSamplePointIds: string[],
  }],
  distanceKm: number,
  ascentM: number,
  descentM: number,
  routeHighestPointElevationM: number,
  nearbyPeakElevationM: number | null,
  weatherSamplePoints: [{
    id: string, // variant 内唯一的局部 ID
    name: string,
    coordinate: { lat: number, lon: number, coordinateSystem: 'GCJ-02' | 'WGS84' },
    elevationM: number,
  }],
  accessMode: 'walk' | 'scenic_transport' | 'mixed',
  operationalStatus: 'open' | 'unknown',
  verificationLevel: 'A' | 'B',
  sourceIds: string[],
  sourceCheckedAt: 'YYYY-MM-DD',
}

BlockedVariant = {
  entityKind: 'route_variant',
  recordStatus: 'blocked',
  capability: 'blocked',
  id: 'variant:<stable-slug>',
  routeId: string,
  canonicalName: string,
  aliases: string[],
  operationalStatus: 'blocked',
  restriction: {
    reason: string,
    scope: string,
    effectiveFrom: 'YYYY-MM-DD' | null,
    effectiveTo: 'YYYY-MM-DD' | null,
    sourceIds: string[],
  },
  verificationLevel: 'A',
  sourceIds: string[],
  sourceCheckedAt: 'YYYY-MM-DD',
}
```

full 的 `sourceIds` 所指 Source，其 `supports` 合集必须针对该 variant ID 覆盖
`canonicalName/fixedDays/stages/distanceKm/ascentM/descentM/routeHighestPointElevationM/
weatherSamplePoints/operationalStatus`；设置 nearby peak 时还必须覆盖
`nearbyPeakElevationM`。每个上述字段至少要有一个 tier A/B Source 的 claim；仅由 tier C
覆盖的 full 无效。blocked 必须由 tier A Source 针对该记录覆盖
`operationalStatus/restriction`，且 restriction sourceIds 是 variant sourceIds 的非空子集。
这只是字段证据完整性，不按来源数量或权重计算评级；A/B 的真实性仍由 Sol 在数据 Issue
Review 中判断。

经纬度必须有限且位于地理范围；`fixedDays` 必须是正整数，stages 必须非空，stage day
必须为整数且恰为 `1..fixedDays`。距离必须大于 0，升降非负，时长满足
`0 < min <= max`，`isLoop` 必须与 direction 一致。full 的每个 stage 至少引用一个存在的
采样点。Source claim 的 entityId 必须存在，且该 Source 必须被对应实体的 sourceIds 引用。
blocked 分支不得携带 full 专属字段；legacy Place 固定 `sourceIds=[]`，不得携带
elevation、bestSeason、note 或伪造的 Source。

## Implementation allowlist after planning PR merge

- `cloudfunctions/getAdvice/domain/route-catalog.js`（新增）
- `scripts/route-domain-contract-test.js`（新增）
- `package.json`（仅新增 `test:route-domain` 并纳入根 `test`）
- `docs/architecture.md`
- `docs/development-plan.md`
- `docs/testing-strategy.md`
- `docs/decision-log.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

不允许修改锁文件、依赖、`data/routes.js`、`geocode.js`、`index.js`、response/confirmation、
天气、规则、AI、历史、前端或任何 I08–I13 数据/运行时实现。若实现需要这些文件，必须
停止并交回 Sol，不得自行扩张。

## Acceptance criteria

1. catalog 可表达一个最小合法 full fixture 与一个不带行程字段的合法 blocked fixture。
2. 全量 legacy 适配数量精确为 175/0/0，全部为 place-only/legacy_unverified 且 sourceIds
   为空；单 Place 内 alias 规范化而跨 Place 歧义保留，不产生路线海拔、采样、stage、
   source 或 blocked 事实。
3. ID/引用、A/B full 的逐核心字段 A/B evidence、正整数固定日程、采样点、blocked tier A
   权威来源和 nearby-vs-route-highest 不变量有敏感失败测试；全 C evidence、零天和空
   stages 必须失败；错误统一为内部 `invalid_route_catalog`。
4. factory 不修改调用输入，catalog 的规范化数据不与输入共享可变嵌套对象；ID miss
   返回 null。
5. I05 四字段候选、`builtin-route:*`、confirm 和所有现有运行时行为保持不变。
6. 不新增依赖、公共响应、公共错误码、数据库操作或试点事实。

## Verification

规划 Review 阶段运行 Markdown 一致性检查和 `git diff --check`。实施阶段必须运行：

```bash
corepack npm@10.9.2 run test:route-domain
corepack npm@10.9.2 run lint
corepack npm@10.9.2 run typecheck
corepack npm@10.9.2 test
corepack npm@10.9.2 run test:integration
corepack npm@10.9.2 run build:weapp
```

实施使用测试先行：先提交能因模块缺失/行为缺失而失败的领域契约测试，再写最小实现使其
通过。不得仅测试对象字面量或重复实现生产校验逻辑。

禁止实现试探。若现有 175 条数据无法在不伪造路线事实的情况下适配，或必须改变公共
契约/运行调用方，实施 Agent 必须停止并交回 Sol。涉及数据迁移、产品取舍或来源政策
变化时升级人工确认。
