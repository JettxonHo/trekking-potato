# 当前活动任务

- Task ID: `I10a`
- GitHub Issue: `#50`
- Title: 录入五台山大朝台官方禁行记录与数据测试入口
- Status: `IMPLEMENTATION_ACTIVE`
- Mode: `IMPLEMENTATION`
- Owner: Terra XHigh
- Reviewer: Sol XHigh
- Branch: `codex/i10a-wutai-blocked-record`
- Base: `main` at `7b708f2`
- Goal: `TP-BETA-001`

## Mandatory context

在检查实现代码前，按 `AGENTS.md` 顺序读取治理文档，然后读取：

1. `docs/architecture.md` 的 I07 目录边界和 I10a 数据 seam。
2. `docs/research/pilot-route-source-audit.md` 的 I10 章节。
3. `docs/testing-strategy.md` 的 I07/I10a 离线测试策略。
4. GitHub #50 完整任务合同。

## Objective

录入一条严格限定于 2026-07-31 官方公告标题的五台山大朝台 tier A
blocked 记录，并建立后续试点数据共用的离线 `test:route-data` seam。本任务
不创建任何 full 行程，不改变生产搜索。

## Allowlist

- `cloudfunctions/getAdvice/data/catalog/pilots/wutai.js`
- `scripts/route-data-contract-test.js`
- `scripts/route-data/wutai.test.js`
- `package.json`
- `docs/current-status.md`
- `docs/testing-strategy.md`
- `docs/tasks/ACTIVE_TASK.md`

修改 allowlist 外任何文件前必须停止并升级 Sol。

## Required data shape

`wutai.js` 只导出 plain `{ sources, places, routes, variants }` 片段；不自建 catalog、不做
I/O、不执行搜索。`route-data-contract-test.js` 聚合现有 `BUILTIN_ROUTES` 和已入库片段，
只调用一次 I07 `createRouteCatalog`。路线专属断言放在 `scripts/route-data/wutai.test.js`。

### Stable IDs

- `source:wutai-dailuoding-2021`
- `source:wutai-no-summit-hiking-2026-07-31`
- `route:wutai-grand-pilgrimage`
- `variant:wutai-grand-pilgrimage`

### Sources

两个 Source 均为 `tier='A'`、`kind='official'`、`checkedAt='2026-08-06'`：

- `source:wutai-dailuoding-2021`：
  - title: `黛螺顶`
  - publisher: `五台山风景名胜区管理委员会`
  - url: `https://www.wtsykfwzx.com/ztzl_show.aspx?id=84`
  - 直接支持大朝台路线身份。
- `source:wutai-no-summit-hiking-2026-07-31`：
  - title: `五台山风景名胜区管理委员会关于全域禁止台顶徒步的公告`
  - publisher: `五台山风景名胜区管理委员会`
  - url: `https://www.wtsykfwzx.com/tzzn_show.aspx?id=1129`
  - 直接支持 restriction 文字，派生支持 blocked 模型状态。

### Route and Variant

- Route 引用 `place:legacy:五台山朝台`；不新建/升级 verified Place，不消费 legacy 海拔或坐标。
- Route:
  - `canonicalName='五台山大朝台'`
  - `aliases=['五台山朝台']`
  - `routeType='trek'`
  - `summary='亲登五座台顶的大朝台路线；当前只保留官方禁行记录，不提供可规划行程。'`
- Variant:
  - `canonicalName='五台山大朝台禁行记录'`
  - `aliases=['五台山大朝台']`
  - `recordStatus='blocked'`
  - `capability='blocked'`
  - `operationalStatus='blocked'`
  - `verificationLevel='A'`
  - `restriction.reason='五台山风景名胜区管理委员会关于全域禁止台顶徒步的公告'`
  - `restriction.scope='台顶徒步'`
  - `restriction.effectiveFrom=null`
  - `restriction.effectiveTo=null`
  - `sourceCheckedAt='2026-08-06'`

两个 null 表示官方页未披露边界，不表示永久禁令。不得将 restriction 扩大为具体
古道、野路、起止日或例外。

## Out of scope

- 黛螺顶小朝台 full 变体。
- 任何距离、stages、海拔、坐标、天气采样点或装备数据。
- I13 生产 registry、搜索、confirm 或公共响应。
- 修改 `data/routes.js`、I07 schema、依赖或锁文件。
- 实时网络测试、公告抓取器、部署或数据迁移。

## Test-first requirement

1. 在数据/测试模块存在前，先运行预定 `test:route-data` 入口并记录真实 RED。
2. 实现最小 GREEN，不修改 I07 来迁就新数据。
3. 正例覆盖聚合目录、稳定 ID、来源字段、blocked 分支、legacy Place 引用。
4. 有效负例至少直接证明 tier B/C 限制源、缺 restriction evidence 或偷加 full 字段时失败；不重复 I07 全部通用矩阵。

## Acceptance

1. 根级 `test:route-data` 可独立运行并纳入根 `test`。
2. 聚合目录仍产生 175 个 legacy Place，新增 1 Route 和 1 blocked Variant，不新增 full Variant 或 verified Place。
3. 大朝台记录通过 I07 schema、引用和 tier A evidence 校验。
4. blocked 记录不含 I07 禁止的任何 full itinerary 字段。
5. 日期、restriction 和 checkedAt 与本合同精确一致；测试不访问网络。
6. 现有 route-domain、root test、integration、lint、typecheck 和 WeChat build 保持通过。

## Validation commands

```bash
corepack npm@10.9.2 run test:route-data
corepack npm@10.9.2 run test:route-domain
corepack npm@10.9.2 run lint
corepack npm@10.9.2 run typecheck
corepack npm@10.9.2 test
corepack npm@10.9.2 run test:integration
corepack npm@10.9.2 run build:weapp
git diff --check
```

## Executor autonomy

Terra 可决定 runner 的最小发现/调用细节、测试函数命名和模块内常量组织；不得改变
ID、数据值、source tier、文件边界或验收标准。

## Escalate immediately

需改 I07 schema、需生产 registry/搜索、无法引用现有 legacy Place、需新坐标/海拔事实、
需扩大 restriction 范围、测试暴露跨模块缺陷，或任何修改超出 allowlist。

## Required result package

- 完成情况与修改摘要。
- 实际修改文件。
- RED 命令/失败原因、GREEN 与完整验证命令/结果。
- 与合同的偏差、自主实现级决策、已知限制。
- PR 链接与建议 Sol 重点 Review 位置。
