# ACTIVE TASK — I22b 结构化 BaseData 核心结果页

- Goal: `TP-BETA-001`
- Parent: `I22 / #31`
- GitHub Issue: `#95`
- Status/Mode: `IMPLEMENTATION_ACTIVE / IMPLEMENTATION`
- Controller: Sol XHigh
- Implementation Agent: exact custom Agent `luna-worker`
- Branch: `codex/95-structured-result-page`
- Base: `main@6e12f25`
- Dependency: I22a/#94 merged; #31 closes only after this child is accepted

## 1. Objective

Render the core Beta result from trusted structured BaseData: immediate deterministic conclusion, reasons/data
limits, hourly or honestly limited weather, minimum equipment checklist and traceable sources. AI is asynchronous
and additive only; it cannot replace facts.

## 2. Allowed scope

- new `taro-app/src/pages/index/result-page-model.js`
- `taro-app/src/pages/index/index.jsx`, `taro-app/src/pages/index/index.css`
- new `scripts/result-page-contract-test.js`
- focused `scripts/trip-flow-contract-test.js` and, only if required, `scripts/response-contract-test.js`
- `package.json`
- new `docs/i22-result-page-verification.md`
- new screenshots under `docs/evidence/i22/`
- `docs/current-status.md`, `docs/tasks/ACTIVE_TASK.md`

No other file is allowed without Sol approval.

## 3. Non-scope

- Cloud functions/domain/route data/public phases or structured server fields
- I14–I16 logic, Prompt, safety projection or minimum-gear rules
- Reducer state names/count, service payloads or queryId behavior
- History schema/save timing/error behavior
- Weather/AI retry, history recovery, cancellation or generic RECOVER events
- Global state/dependencies, broad redesign, sharing/navigation or deployment

## 4. Fixed product and authority rules

- Labels: `go=建议出发`, `caution=谨慎出发`, `no_go=暂不建议`, `null=暂无法判断`.
- verdict, `dataStatus` and AI degraded are independent. `no_go + insufficient` stays 暂不建议 plus data notice.
- Page facts come only from `requestSummary/routeSnapshot/weatherSnapshot/deterministicResult/minimumGear/sourceMetadata`.
- full unknown operation is visible without changing verdict; place-only is non-route reference; blocked says
  “官方禁行，本次未请求天气”.
- Minimum checklist is page-local, not cached/saved. It survives advice events/new result objects for the same
  base/queryId, and resets only on a different base/queryId, return-to-search or cache restore. No hash.
- I23 owns retry/recovery. Keep only the existing return-to-search action.

## 5. Pure result-model and history boundary

Add a CommonJS boundary equivalent to:

```js
buildResultPageModel({ result, flowStatus, flowError })
  -> { route, verdict, reasons, dataIssues,
       weather: { kind: 'hourly'|'reference'|'unavailable'|'not_applicable', ... },
       minimumGear, sources,
       ai: { status: 'loading'|'ready'|'unavailable'|'context_expired', ... } }
```

Trip-flow keeps result opaque and remains at ten states. Advice lives under `ai`. Existing advice returns merged
`gear/risks/notes/disclaimer`; compare item names with structured `minimumGear` and label only extra recommended/
optional items as AI additions. Ignore advice verdict/weather/photoTiming/meta and forged structured keys;
risks/notes/disclaimer remain explanation-only. AI cannot add essential minimum gear.

I19 history still needs the existing compatibility elevation/location/coords/type values. Capture exactly those
five values once at base receipt into private `historyContext`; pass it to `_saveHistory` without rendering/caching
it and never merge it with advice. `result.meta`/advice meta are not history authorities. History schema, save
timing, failure behavior and queryId exclusion stay unchanged.

## 6. Display contract

Order: verdict/route scope; deterministic reasons/data issues; weather; minimum checklist; route/weather sources;
AI explanation/degraded; disclaimer/back. Show canonical route name, region, Chinese type, full fixedDays and
highest point when non-null, including numeric zero.

- full complete: every route day, sample name/elevation and every activity-window hour in order; local time,
  temperature/apparent temperature, precipitation probability/amount/snow, average wind, gust, visibility and
  trusted WMO condition. Wind and gust are distinct.
- WMO groups: 0 晴; 1–3 多云; 45/48 雾; 51–55 毛毛雨; 56/57 冻毛毛雨; 61–65 雨; 66/67 冻雨;
  71–77 雪; 80–82 阵雨; 85/86 阵雪; 95–99 雷暴; otherwise 天气现象待确认.
- full insufficient: no partial readings, only data issues. place-only: daily reference-point weather plus
  explicit non-complete-route notice. blocked: restriction plus no-weather copy.
- Known data issues use concise fixed Chinese labels; unknown codes use one generic data-insufficient label,
  with no score/rubric.
- `minimumGear` is the only minimum checklist. AI-only recommended/optional additions show
  “AI 补充（非最低要求）”.
- Source cards show title/publisher/tier/kind/checkedAt/optional URL. Null community URL stays null. Weather source
  and fetchedAt are separate. IDs/supports are not primary user copy.
- AI loading appears only in the AI section. Degraded copy states AI supplement is unavailable while the
  deterministic result remains valid.
- Bump result cache key/version and invalidate, never migrate, old compatibility-only cache. Restored structured
  cache starts with unchecked gear and normalizes non-terminal AI loading to unavailable because no request resumes.

## 7. Acceptance and test sensitivity

- Four verdicts, including `no_go + insufficient`, are independent axes.
- Full fixtures cover multiple days, two samples, all hours, numeric zeros, wind/gust/visibility/snow and
  representative WMO normal/freezing/snow/thunderstorm conditions.
- Insufficient/place-only/blocked weather and copy are distinct.
- Deterministic reason order, known/unknown data issues and A/B/null-URL sources are visible; unknown operation,
  restriction and null/zero elevations are covered.
- Mutation/injection evidence proves advice cannot alter verdict, reasons, weather, minimum gear, route or sources.
- AI gear difference never duplicates minimum items or adds essential gear.
- Checklist retains state across same-query advice started/succeeded/failed/context unavailable, resets for a
  different base/queryId or return-to-search, and cache restore begins unchecked.
- Old cache is ignored; restored structured AI loading becomes unavailable.
- Advice/meta injection cannot change captured history DTO; existing full/place save, ordinary degraded save and
  context-unavailable zero-save behavior remain.
- Existing I20 token, I18 queryId-only and I19 private-history contracts remain green.

## 8. TDD, commands and visual evidence

Register `test:result-page` before the module exists and record real `MODULE_NOT_FOUND` RED. Then run:

```text
npm run test:result-page
npm run test:trip-flow
npm run test:core-input-flow
npm run test:response
npm run test:confirmation
npm run test:trip-context
npm run test:hourly-weather
npm run test:trip-verdict
npm test
npm run test:integration
npm run lint
npm run typecheck
npm run build:weapp
git diff --check
```

Use installed WeChat DevTools local debug/mock to capture exactly: full/go; full/caution + AI degraded;
blocked/no_go; place-only/null. `docs/i22-result-page-verification.md` records each fixture capability, verdict,
dataStatus, AI state and visible assertions. Never commit a production mock switch. If DevTools cannot run, report
the exact blocker before claiming visual completion.

## 9. Autonomy, escalation and delivery

`luna-worker` may choose private helper names, card composition, spacing and local CSS in the current design
language. Stop for server-field/verdict-copy/source-hiding/reducer/history-schema/recovery/dependency/route-fact or
allowlist changes, or a proposal to drop an hourly/sample dimension.

I23 starts only after #95 passes latest-head CI, independent Sol Review and merge.

Routing: logical role IMPLEMENTER; custom Agent `luna-worker`; config `~/.codex/agents/luna-worker.toml`;
configured `gpt-5.6-luna` / `max`; `CONFIG_VERIFIED`; runtime status recorded after spawn; Terra fallback unauthorized.

Deliver code, tests, real RED/GREEN, all gates, four screenshots, verification/status docs, result package and
focused PR. Return `READY_FOR_CONTROLLER_REVIEW`; do not approve or merge.
