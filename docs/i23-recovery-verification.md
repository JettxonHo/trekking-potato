# I23b 前端降级与恢复验证记录

日期：2026-08-09
Issue：I23b / #100
分支：`codex/100-frontend-recovery`
基线：`main@107fab4`（activation HEAD `440a603`）

## RED → GREEN

先在 `package.json` 注册 `test:recovery` 并把它纳入根 `test`，再创建测试入口而不创建
`recovery-model.js`。第一次 `npm run test:recovery` 真实失败，Node 报
`MODULE_NOT_FOUND: ../taro-app/src/pages/index/recovery-model`（退出码 1）。

最小 GREEN 增加页面私有 `recovery-model.js`，接入 I20 reducer 和现有页面/service seam，随后
`npm run test:recovery` 通过。测试没有引入第十一状态、全局 store、自动重试或新的服务端字段。

## Finding → test

| 风险/合同 finding | 行为证据 |
|---|---|
| AI 重试必须保持确定性事实、checklist、queryId，并推进 token | `assertAdviceRecovery`：同 queryId advice retry、AI namespace loading、错误/空 authority no-op |
| 重新准备必须按 result 是否存在选择骨架或局部刷新 | `assertReprepareAndRender`：`preparing + result=null` 全屏 loading；非空结果返回 `refreshing` 且保留结果 |
| 初次失败重放 pending，成功后才提升 last；新操作替换 pending | `assertRequestSlots`：wrong token 不提升、失败保留、成功 promote、confirm 替换 |
| full/place-only 天气可重试，blocked/out_of_range 不盲重试 | `assertWeatherAndSaveRecovery`：retryable issue、place-only 边界、blocked/out_of_range no-op |
| 历史保存一次 intent、同一 frozen payload/ID 串行重试 | `assertWeatherAndSaveRecovery`：in-flight guard、failure→retry byte-equivalent、new identity |
| history list 单调 token、失败保留旧项、close/stale callback 失效 | `assertHistoryListRecovery`：newer/closed response rejected |
| 真实页面接线必须经过纯 seam | `assertPageWiring` 与 `test:trip-flow`/`test:result-page` 静态边界断言 |

`trip-flow-contract-test.js` 额外验证 `refreshing` selector，并保留 location/manual fallback、
service payload 与 I20 token no-op 证据；`result-page-contract-test.js` 保留结构化结果和历史 DTO
边界。

## 代表性 mutation map

- 删除 `BEGIN_ADVICE_RETRY` token advance 或改发新的 queryId：`assertAdviceRecovery` 失败。
- 把 `selectTripFlowView` 的 skeleton 优先级恢复为所有 `preparing`：`assertReprepareAndRender` 失败。
- 只在 BaseData 失败时清除 pending：`assertRequestSlots` 失败。
- 移除 `sameHistorySaveIdentity`/in-flight guard：冻结 payload 或单请求断言失败。
- 移除 history list token/close guard：stale/newer/closed callback 断言失败。
- 删除页面 recovery require、replay、retry handler 或 prefill reset marker：`assertPageWiring` 失败。

## 命令结果

以下命令在当前工作树运行并通过：

```text
npm run test:recovery
npm run test:trip-flow
npm run test:result-page
npm run test:response
npm run test:trip-context
npm run test:history
npm test
npm run test:integration       # PASS: 56, FAIL: 0
npm run lint                   # 0 errors; 9 existing warnings
npm run typecheck
npm run build:weapp            # Webpack compiled successfully
git diff --check
```

根 `npm test` 也包含 `test:recovery`。未运行微信开发者工具或 DevTools，因此本记录不声称截图或
真实设备交互证据；视觉证据留给 I24/单独授权。

## 短交互清单（待本地 DevTools/真机执行）

1. 触发 retryable full/place-only weather：点击“重新获取天气并判断/刷新地点天气”，确认旧结果、理由、装备、来源在局部刷新期间仍可见，并以新 queryId 完成。
2. AI degraded：点击“重试 AI 补充”，确认仅发一次同 queryId advice，确定性页面/checklist 不变，历史不产生第二次保存。
3. history save：制造 `history_unavailable`，点击“重试保存历史”，确认 payload 与 `saveAttemptId` 不变；成功只清除局部错误。
4. history list：打开/重试后关闭 panel，确认旧/迟到回调不替换列表；失败时旧 items 保留。
5. history selection：选择记录，确认 flow/checklist/cache reset、panel 关闭、无网络请求，表单只预填现有 DTO，当前出发时间和攀登支持保留并显示确认提示。

## I23b Sol Review-fix round 1 — 2026-08-09

本轮只处理四个页面编排 finding，未改变十状态、服务 payload、缓存/历史 DTO 或依赖。

### RED → GREEN / mutation evidence

- 天气入口现在由 `isWeatherRecoveryEligible(flow, slots)` 与 `BEGIN_REPREPARE` 共用的状态、结果和
  `lastBaseRequest` authority 判定；`base_ready`/`advice_loading` 的 action projection 为 false，
  `complete`/`degraded`/`error` 且有有效 last snapshot 才显示并可进入局部刷新。`onWeatherRetry` 仍有同一
  guard，避免 visible no-op。
- `_beginReprepare` 不再在进入 `preparing` 时清除旧 history-save intent；replacement BaseData 的
  `_showBaseAndFetchAdvice`、reset/return/unmount 继续承担既有失效边界。失败或进行中的旧保存 intent 因而
  保持可重试。
- history list 的 empty-loading 分支只在 `historyList.length === 0` 时出现；有旧 items 时重试期间继续
  map 渲染旧列表。
- `assertMutationSensitivePageWiring` 提取 `_beginReprepare`、`onAdviceRetry`、`_saveHistory`、
  `onHistoryTap`、`onRestoreHistory` 和 `render` 的有限方法/分支，并对以下代表性删除/替换 mutation
  逐一要求 focused test RED：天气 eligibility、旧结果刷新优先级、same-query AI、base snapshot replay、
  same-base save identity、两处 stale list token guard、history prefill zero-I/O。纯 `selectRecoveryActions`
  seam 同时执行验证 action projection，避免只依赖 marker-only whole-file evidence。

### Review-fix finding → test

| finding | focused evidence |
|---|---|
| weather retry visible no-op | `assertWeatherActionEligibility` 覆盖 `base_ready`/`advice_loading` no-op、accepted terminal statuses、缺失 last authority；`selectRecoveryActions` 与 page branch assertions |
| marker-only page wiring | `assertMutationSensitivePageWiring` 的有限 method/branch extractor 与 7 代表性 mutation RED checks |
| reprepare 过早清除 save intent | `_beginReprepare` method assertion 明确禁止 `_invalidateHistorySaveIntent`；保存 identity/in-flight 行为仍由 `assertWeatherAndSaveRecovery` 覆盖 |
| history retry 隐藏旧 items | `render` branch assertion 要求 `historyLoading && historyList.length === 0`、`!historyLoading && historyList.length === 0` 与随后 `historyList.map`；生命周期测试继续证明失败保留旧 items |

未运行微信开发者工具或 DevTools；本轮不声称截图/真机交互证据。

### Review-fix 命令结果

```text
npm run test:recovery        PASS
npm run test:trip-flow       PASS
npm run test:result-page     PASS
npm run test:response        PASS
npm run test:trip-context    PASS
npm run test:history         PASS
npm test                     PASS
npm run test:integration     PASS: 56, FAIL: 0
npm run lint                 0 errors; 9 existing warnings
npm run typecheck            PASS
npm run build:weapp          Webpack compiled successfully
git diff --check             PASS
```
