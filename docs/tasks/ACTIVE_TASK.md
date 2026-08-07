# 当前活动任务

- Task ID: `I19`
- GitHub Issue: `#28`
- Title: 实现私人历史、清空历史并停用公共 UGC 主路径
- Status: `IMPLEMENTATION`
- Mode: `IMPLEMENTATION`
- Owner: Terra XHigh
- Reviewer: Sol XHigh
- Branch: `codex/i19-private-history-implementation`
- Base: `main` at `72ab196`
- Goal: `TP-BETA-001`

## 当前授权

I18 规划 PR #66 与实现 PR #67 已合并；#27 已关闭。PR #67 的 latest-head GitHub `quality`
通过（3 分 15 秒），squash commit 为 `5c69195`。queryId-only advice 可信闭环已完成。

I19 规划 PR #68 已通过两名独立 Terra Review 与 attempt 3 latest-head `quality`（50 秒），并
squash merged as `72ab196`。当前授权 Terra XHigh 在本合同 allowlist 内按 TDD 实施 I19；不得
改变合同、扩大范围、批准或合并自己的 PR。Sol XHigh 保留独立 Review、返工指令和合并判断。

两名独立 Terra XHigh 已复核当前合同为 `APPROVED`，无剩余 P0–P2、无需人工确认。Review
曾要求并已关闭三项：以 `stats.removed` 冻结条件删除结果、补保存失败同参重试/删除不冒泡
回归，以及修正开发计划中的旧操作摘要。

## 必读上下文

1. `AGENTS.md`
2. `GOAL.md`
3. `docs/product-requirements.md` 第 6–7 节
4. `docs/architecture.md` 第 9–11 节
5. `docs/testing-strategy.md` 的“可信上下文和隐私”与 I19 合同
6. `docs/decision-log.md` 的 TP-D008、TP-D031、TP-D032
7. GitHub Issue #28，以及已合并 PR #66、#67、#68

## 任务目标

把 history 云函数收敛为当前 `openid` 的私人查询历史，支持保存、读取、单项删除和清空；
同时从生产前端、history 云函数和 getAdvice geocode 三个入口停用公共 UGC 写入与读取。
既有 `routes` 和 `history` 数据保留原状，不迁移、不批量修改、不删除。

## 交付形态与拆分结论

I19 使用一个 Issue、一个原子实现 PR。后端先停用会让旧前端继续产生无意义的静默 UGC
调用；只改前端会让云函数和 geocode 继续读写不可信公共路线；删除/清空又依赖后端 DTO 与
前端控件共同闭环。不得保留双协议或临时公共 UGC 回退。

## 私人 history 公共契约

所有 mode 先读取 `cloud.getWXContext().OPENID`。客户端传入的 `openid` 永远无权覆盖服务端
身份；history 不保存 `queryId`。

```text
save   { mode, route, date, days, level, elevation?, location?, coords?,
         routeType?, routeTypeSource?, summary?, degraded? }
       → { ok:true, id } | error

list   { mode, limit? }
       → { ok:true, data: HistoryItem[] } | error

delete { mode, id }
       → { ok:true } | history_not_found | error

clear  { mode }
       → { ok:true, removed } | error
```

`HistoryItem` 只包含：

```text
id, route, date, days, level, elevation, location, summary,
degraded, coords, routeType, routeTypeSource
```

不得返回 `_id`、`_openid`、`queryId` 或未知数据库字段。`save` 延续现有字段白名单、长度限制
和轻量归一化；只新增非空 route/date 的现实边界，不建立深层或重复安全 rubric。

## 归属、删除与清空

- `save` 写入的 `_openid` 只来自服务端身份。
- `list` 固定 `where({ _openid: openid })`，最多 20 条，并投影为公共 DTO。
- `delete` 使用一次条件删除 `where({ _id: id, _openid: openid }).remove()`；只在
  `result.stats.removed === 1` 时成功，`removed === 0` 对未知和他人记录都返回相同不可重试
  `history_not_found`，不先无条件读取文档。
- `clear` 使用 `where({ _openid: openid }).remove()`，返回实际 `result.stats.removed`；空历史也
  成功并返回 `removed: 0`。
- 清空是用户在 UI 明确确认后发起的自身历史操作；Agent 不执行任何真实数据删除。

## 错误语义

错误统一返回 `{ ok:false, error, message, retryable }`，不得拼接数据库原始错误或回显未知 mode：

| error | retryable | 语义 |
|---|---:|---|
| `no_auth` | false | 无服务端身份 |
| `invalid_history_input` | false | save 缺少必要摘要字段 |
| `missing_id` | false | delete 缺 id |
| `history_not_found` | false | delete 未删除当前用户记录；不区分未知或他人 |
| `history_unavailable` | true | save/list/delete/clear 的存储失败 |
| `ugc_disabled` | false | 旧公共 UGC mode 已停用 |
| `invalid_mode` | false | 未知 mode |

## 公共 UGC 非破坏性停用

- history 只实现 `save/list/delete/clear`；旧 `saveRoute/listRoutes` 保留为显式 tombstone，认证
  后固定返回 `ugc_disabled`，对 `routes` 集合零读、零写、零更新、零删除。
- 删除 history 云函数内的 UGC/Haversine/全表扫描实现。
- 删除 geocode 的 CloudBase `routes` 读取；内置可信匹配未命中后直接走 AMap。
- 删除手动坐标提交后的 `saveRoute` 调用；手动查询本身保持不变。
- 保留 `routeTypeSource:'ugc'` 作为旧私人历史的兼容显示值，不重新激活公共 UGC。
- 不接触真实 `routes` 记录、数据库权限、索引、配置或部署。

## 前端私人历史行为

- 正常 advice（包括服务端 AI degraded advice）成功后保存一次私人历史。
- advice 传输失败或普通 advice error 时，确定性 base 仍可用，保存一次 `degraded:true` 的私人
  历史；`query_context_unavailable` 继续遵守 I18：不写 history。
- history save 的云失败或 `{ok:false}` 只显示非阻断提示“历史未保存，不影响本次结果”，
  不改变当前路线、天气、结论、装备或风险；失败不得锁死后续相同查询的保存机会。
- 打开 history 面板不先清空旧列表；list 失败保留当前列表并显示局部 `historyError`。
- 每条记录提供独立删除动作；只在服务端成功后从本地列表移除，失败保持列表。
- 删除控件必须阻止该次交互冒泡到历史行的 restore，不关闭历史面板、不触发查询恢复。
- 清空前使用一次原生确认；只在服务端成功后清空本地列表，失败保持列表。
- restore 行为与 I18 的手动上下文恢复规则不变；不提前引入 I20 reducer/service。

## 实现阶段允许范围

- `cloudfunctions/history/index.js`
- `cloudfunctions/getAdvice/geocode.js`
- `taro-app/src/pages/index/index.jsx`
- `taro-app/src/pages/index/index.css`
- `scripts/security-test.js`
- `scripts/route-type-contract-test.js`
- `scripts/confirmation-contract-test.js`
- `scripts/response-contract-test.js`
- `package.json`
- `docs/architecture.md`
- `docs/testing-strategy.md`
- `docs/development-plan.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

规划 PR 可额外同步 `GOAL.md` 与 `docs/decision-log.md`。不得修改路线目录/schema、TripContext、
天气/结论规则、AI/Prompt、安全投影、依赖或锁文件、非默认 deep/redteam 脚本、工作流、数据库
配置或任何真实数据。

## TDD 与最小回归矩阵

先以现有行为记录真实 RED，再实施 GREEN：

1. user A/B 分别 save/list，只看到自己的 HistoryItem；伪造 event `_openid` 无效，响应无内部字段。
2. A 删除自己的记录且 `stats.removed === 1` 时成功；`removed === 0` 的 B/未知 id 得到完全
   相同 `history_not_found`，B 记录保留。删除控件不触发 restore 或关闭面板。
3. A clear 返回实际删除数量且只删除 A 的 history；B history 与预置 `routes` 存量保持原样；
   空 clear 成功并返回 `removed:0`。
4. save/list/delete/clear 各一个代表性存储失败映射到同一 `history_unavailable` 通用消息；不扩展
   为异常排列组合。
5. `saveRoute/listRoutes` 都返回 `ugc_disabled`，且 mock 对任何 `routes` 访问会使测试失败。
6. 精确命中的旧 UGC fixture 不能被 geocode 读取，内置未命中直接走 AMap；confirmation 路径
   全程对公共 `routes` 零读取。
7. 页面无 `saveRoute`；history save 首次 `{ok:false}` 或云失败都非阻断，同一参数再次保存仍会
   重新调用服务端；普通 advice 失败保存确定性摘要；`query_context_unavailable` 仍零 history。
8. history 面板 list/delete/clear 的成功和失败分支符合本合同，清空有确认，queryId 不入 history。

将现有 `scripts/security-test.js` 收敛为聚焦 history/privacy 契约，注册 `test:history` 并纳入默认
`npm test`。不把 `deep-audit`、`redteam-audit` 或 live 网络脚本加入默认门禁。

## 完整验证命令

```text
npm run test:history
npm run test:route
npm run test:confirmation
npm run test:response
npm run test:integration
npm run lint
npm run typecheck
npm test
npm run build:weapp
git diff --check
```

## 可验证验收标准

- 私人历史所有持久化操作按服务端 openid 隔离，公共响应不泄露内部身份或数据库字段。
- 当前用户可读取、单删、清空自己的历史；跨用户不可见、不可删、不可被清空。
- 手动查询、history 旧 mode 和 geocode 都不再读写公共 UGC；存量数据未改动。
- 历史失败不影响主查询结果；前端只在服务端成功后乐观更新列表。
- 默认 quality 矩阵包含聚焦 history 契约，全部指定测试、构建和文档检查通过。

## 自主决策与升级条件

Terra 可决定局部 helper 名称、mock 结构和不改变公共契约的最小 JSX/CSS 布局。以下情况必须
停止并交回 Sol：需要删除/迁移/批量修改真实 `routes` 或 `history` 数据，修改认证/数据库权限
或生产配置，引入依赖，改变 queryId/路线/天气/结论契约，发现其他生产 UGC 入口，扩大为用户
资料或公共替代功能，或连续两轮修复仍未通过 Review。TP-D008 已授权本合同内的非破坏性
隐私收敛，无需额外人工确认。

## 交付物

- RED/GREEN 证据、实现代码、聚焦隐私测试与完整验证报告。
- 修改文件清单、偏差、自主决策、限制和重点 Review 位置。
- 与实现直接相关的文档更新。
- PR 描述与回滚说明；不得自行批准或合并。
