# ACTIVE TASK — I22 可信来源与结构化结果体验

- Goal: `TP-BETA-001`
- Parent Task: `I22`
- GitHub Issue: `#31`
- Status: `CONTRACT_APPROVED — PLANNING_PR_PENDING / IMPLEMENTATION_BLOCKED`
- Mode: `PLANNING_PR`
- Owner: Sol XHigh
- Implementation Agent: none until planning PR merges
- Planning branch: `codex/i22-result-page-contract`
- Base: `main@be24b07`
- Planned execution: `I22a/#94 → I22b/#95`, serial, one child Issue/branch/PR each

## 1. Goal and user value

Turn I21's trusted structured BaseData into the core Beta result experience. The user must immediately see
the deterministic departure conclusion, its reasons and data limits, route-hourly or clearly limited weather,
minimum equipment and traceable sources. AI may arrive later and explain; it must never replace those facts.

## 2. Current evidence

- I21 PR #93 passed latest-head quality and two independent Sol Reviews, squash merged as `be24b07`, and
  GitHub #30 is closed.
- BaseData already contains `requestSummary`, `routeSnapshot`, `weatherSnapshot`, `deterministicResult`,
  `minimumGear` and `sourceMetadata` and is stored unchanged in the openid-bound TripContext.
- The current page stores some structured fields but renders `weatherWindow/gear/risks/meta` compatibility
  aliases. Advice can replace those display fields; there is no four-state verdict hero, deterministic reason
  list, multi-point hourly view or capability-specific empty state.
- `sourceMetadata.routeSourceIds` is trusted but not user-readable. Architecture requires an independent
  server Source lookup before showing titles or publishers. The validated catalog already owns those records.
- All current full pilots intentionally use `operationalStatus='unknown'`; the page must disclose that fact
  without mechanically changing TP-VERDICT-1.

## 3. Fixed product decisions

1. Verdict labels are exact: `go=建议出发`, `caution=谨慎出发`, `no_go=暂不建议`, `null=暂无法判断`.
2. `verdict` wins over `dataStatus`: an independent hard no-go remains `暂不建议` even when weather/sunset
   data is insufficient. `null` is an unavailable judgment, never a weather-danger verdict.
3. full, place-only and blocked have different result semantics; they may not share one vague empty state.
4. The page reads only structured BaseData for route, verdict, weather, minimum gear and sources. AI output
   is namespaced and additive.
5. Every full `operationalStatus='unknown'` visibly asks the user to recheck current management status before
   departure; unknown does not mean open and does not itself change the verdict.
6. Minimum gear is a page-local checklist. Check state resets on a new base and is not saved to TripContext,
   result cache or private history. Keys are simple category/index display keys; no hash is introduced.
7. No retry/recovery controls are added. Existing loading/degraded/context-unavailable states are displayed;
   I23 owns retries, history recovery and new async recovery events.
8. No broad visual redesign. Reuse the existing card language and improve only result information hierarchy.

## 4. Delivery split and dependency

Parent #31 is not handed to one executor as a cross-layer PR. It is completed by two child Issues:

```text
main@be24b07 → I22a trusted provenance → I22b structured result page → close parent #31 → unlock I23
```

I22a is independently mergeable: it additively exposes new DTO fields and intentionally corrects the existing
`routeSourceIds` inclusion of Place identity evidence. The current page ignores those IDs/fields, so this semantic
narrowing does not create a user-visible intermediate state. I22b must start from I22a's merged main so it never
infers source data client-side. Default execution is serial.

## 5. I22a / GitHub #94 task contract — trusted provenance in BaseData

### Objective

Expose the minimum user-displayable route provenance and trusted Variant status in structured BaseData,
without changing any public response phase, resolver behavior, rule, weather request or UI.

### Allowed scope

- `cloudfunctions/getAdvice/domain/catalog-resolver.js`
- new `cloudfunctions/getAdvice/domain/source-summary.js`
- `cloudfunctions/getAdvice/index.js`
- `cloudfunctions/getAdvice/trip-base.js`
- new `scripts/source-summary-contract-test.js`
- focused additions to `scripts/core-input-flow-contract-test.js`,
  `scripts/trip-context-contract-test.js` and `scripts/response-contract-test.js`
- `package.json`
- `docs/current-status.md`, `docs/tasks/ACTIVE_TASK.md`

### Non-scope

- Frontend files, CSS or screenshots
- Source/Place/Route/Variant records or schema validation rules
- I13 query stages/candidate DTOs
- I14–I16 weather/verdict logic, Prompt, safety projection or history
- New network/database calls, dependencies, hashes or identifiers
- Removing compatibility aliases

### Frozen interface

Add to every `routeSnapshot` with null for non-applicable fields:

```js
routeHighestPointElevationM: number | null
verificationLevel: 'A' | 'B' | null
operationalStatus: 'open' | 'unknown' | 'blocked' | null
sourceCheckedAt: 'YYYY-MM-DD' | null
```

- full: all four derive only from the trusted Variant.
- blocked: highest point null; the other three derive only from the blocked Variant.
- place-only/catalog/AMap/manual: all four null; reference elevation remains the existing
  `referenceElevationM`.

Add to `sourceMetadata`:

```js
routeSources: [{
  id: string,
  tier: 'A' | 'B' | 'C',
  kind: string,
  title: string,
  publisher: string,
  url: string | null,
  checkedAt: 'YYYY-MM-DD'
}]
```

The server resolves these through the existing production resolver's captured catalog snapshot. Extend
`createCatalogResolver({ catalog })` with `summarizeSources(sourceIds)` and export a production
`resolveRouteSourceSummaries(sourceIds)` delegate beside `resolveRouteQuery/resolveRouteCandidateId`.
`source-summary.js` owns only the pure seven-field projection over Source records supplied by that resolver;
it must not call `createProductionRouteCatalog()` or construct another production catalog. `index.js` passes
`resolveRouteSourceSummaries` into `createTripBaseBuilder`, whose tests may inject a bounded fake. `routeSourceIds` is narrowed to
Route/Variant/restriction evidence only; Place identity sources are not route evidence. `routeSources[].id` is
in the exact stable order of those IDs; internal `supports`, raw tracks, coordinates and personal metadata are not
returned. `weatherSource` stays separate. Unknown trusted Source IDs are a single catalog-integrity error,
not a client fallback or repeated defensive framework.

### Acceptance

- Source lookup is pure, has no I/O and returns isolated copies.
- Query resolution and Source summaries use the same resolver-owned catalog snapshot; a test proves that a
  custom catalog passed to `createCatalogResolver` drives both target resolution and source summaries.
- Full and blocked snapshots expose exact Variant provenance/status; place-only uses explicit nulls.
- Full/blocked route source DTOs contain only the seven frozen fields and match IDs/order exactly.
- A synthetic Place identity source is not mislabeled as route evidence; catalog place, legacy place,
  AMap/manual and empty source sets remain honest.
- Base response and stored TripContext snapshot are deeply equal for the new fields.
- QueryId-only advice, deterministicResult, minimumGear and compatibility prompt/safety behavior do not change.

### TDD and verification

Record a real RED by registering `test:source-summary` before the new module exists. Then run:

```text
npm run test:source-summary
npm run test:core-input-flow
npm run test:trip-context
npm run test:response
npm run test:route-resolver
npm run test:route-domain
npm run test:route-data
npm test
npm run test:integration
npm run lint
npm run typecheck
npm run build:weapp
git diff --check
```

### Executor autonomy and escalation

`luna-worker` may choose pure helper names and fixture organization. It must stop for any need to change a
public phase, source schema/data, I13 resolver semantics, dependency, rule, Prompt/safety behavior or allowlist.

### Deliverables

Code, meaningful tests, RED/GREEN and full gate evidence, updated status docs, result package and focused PR.
The executor may not approve or merge.

## 6. I22b / GitHub #95 task contract — structured result page

### Objective

Switch the production result page to an explicit pure view-model over structured BaseData, with deterministic
facts visible before AI and with full/place-only/blocked weather/source boundaries rendered honestly.

### Allowed scope

- new `taro-app/src/pages/index/result-page-model.js`
- `taro-app/src/pages/index/index.jsx`
- `taro-app/src/pages/index/index.css`
- new `scripts/result-page-contract-test.js`
- focused additions to `scripts/trip-flow-contract-test.js` and, only if the public response seam requires it,
  `scripts/response-contract-test.js`
- `package.json`
- new `docs/i22-result-page-verification.md`
- new screenshots under `docs/evidence/i22/`
- `docs/current-status.md`, `docs/tasks/ACTIVE_TASK.md`

### Non-scope

- Cloud function/domain code, route data or public phase contracts
- I14–I16 logic/thresholds, Prompt, safety projection or minimum-gear rules
- Reducer state names/count, service payloads, history schema/save timing/error behavior or queryId behavior
- Weather/AI retry buttons, history recovery, request cancellation or generic RECOVER events
- Global state library, dependency upgrade, large visual redesign, sharing or navigation

### Frozen view-model boundary

The pure CommonJS module exposes a small interface equivalent to:

```js
buildResultPageModel({ result, flowStatus, flowError })
  -> {
    route,
    verdict,
    reasons,
    dataIssues,
    weather: { kind: 'hourly' | 'reference' | 'unavailable' | 'not_applicable', ... },
    minimumGear,
    sources,
    ai: { status: 'loading' | 'ready' | 'unavailable' | 'context_expired', ... }
  }
```

The exact helper names may vary, but `trip-flow` continues to treat `result` as opaque and no eleventh state is
added. The result object retains structured base fields and an `ai` namespace; advice payload keys named
`verdict/weather/minimumGear/sourceMetadata/deterministicResult` are ignored. Existing advice returns merged
`gear/risks/notes/disclaimer`, not raw additions: the model subtracts structured minimum item names and treats
only remaining recommended/optional items as AI additions. Advice risks/notes/disclaimer stay explanatory;
advice weather/photoTiming/meta never replaces structured display facts.

The existing I19 save DTO still needs legacy elevation/location/coordinate/type values, including the full-route
representative coordinate that is not guaranteed to exist in an insufficient structured weather snapshot. At
base receipt, capture those five server compatibility values once into a private `historyContext`; pass that
context to `_saveHistory` without placing it in the displayed result or result cache, and never merge it with
advice. This is a bounded history adapter only: history schema, save timing, failure behavior and queryId exclusion
remain unchanged. `result.meta` and advice `meta` are no longer history authorities.

### Display contract

1. Order: verdict/route scope → deterministic reasons/data limits → weather → minimum gear checklist → sources
   and timestamps → AI explanation/degraded status → disclaimer/back.
2. Route header shows canonical name, region, Chinese route type, fixed days when full, and route highest point
   when non-null (including 0/negative values wherever applicable).
3. full complete weather shows every day in route order, each sample name/elevation, and each activity-window
   hour with local time, temperature/apparent temperature, precipitation probability/amount/snow, average wind,
   gust, visibility and a concise Chinese condition derived from trusted WMO `weatherCode`. Average wind and gust
   must be separately labelled. Condition groups are: 0 晴; 1–3 多云; 45/48 雾; 51–55 毛毛雨; 56/57 冻毛毛雨;
   61–65 雨; 66/67 冻雨; 71–77 雪; 80–82 阵雨; 85/86 阵雪; 95–99 雷暴; fallback 天气现象待确认.
4. full insufficient shows no partial readings; it renders data issues. place-only renders reference-point daily
   weather with an explicit non-route notice. blocked renders “官方禁行，本次未请求天气”.
5. Known data issues use fixed concise Chinese labels; an unknown code uses one generic data-insufficient label.
   There is no weighted score or mechanical rubric.
6. `minimumGear` is the only minimum checklist. AI-only recommended/optional additions are visually labelled
   “AI 补充（非最低要求）”; AI cannot add essential gear.
7. Source cards show route source title, publisher, tier/kind, checkedAt and optional URL. A null community-track
   URL remains a valid reviewed source and is not replaced with an invented link. Weather source/fetchedAt are
   separate. Internal Source IDs and `supports` are not primary user copy.
8. AI loading displays only inside the AI section; it never skeleton-hides deterministic cards. Degraded copy is
   “AI 补充暂不可用，以上确定性结果仍有效” or an exact equivalent with the same meaning.
9. Bump the result cache key/version and ignore old compatibility-only cache; do not migrate it. New structured
   cache restore is allowed, but a cached non-terminal AI state such as `loading` must normalize to `unavailable`
   because restore has no queryId/request to resume; it must never remain permanently loading. Checklist state is
   never persisted; it resets only for a different base/queryId, return-to-search or cache restore—not for a new
   result object produced by advice on the same query.
10. Existing “返回重新查询” remains. Context unavailable keeps the base result and message; retry controls wait
    for I23.

### Acceptance and test sensitivity

- Pure behavior tests cover all four verdicts, including `no_go + dataStatus=insufficient`.
- Full fixtures cover multiple days, two samples, zero numeric values, average wind/gust, visibility and snow.
- Representative WMO codes prove normal cloud, freezing rain/snow and thunderstorm labels without enumerating a
  mechanical cross-product.
- Insufficient/place-only/blocked weather unions have distinct tests and copy.
- Mutation/injection tests prove advice cannot alter verdict, reasons, weather, minimum gear, route or sources.
- A/B Source, null URL, stable order, no internal fields, `operationalStatus=unknown`, restriction and null/zero
  elevations are covered.
- Checklist toggle/reset and cache version behavior are covered through pure helpers/page wiring: the same
  queryId/base retains checks across advice started/succeeded/failed/context unavailable; a different base/queryId
  or return-to-search clears them; cache restore starts unchecked and normalizes stale AI loading to unavailable.
  Do not use a UI testing dependency or broad source-regex self-proof.
- Existing I20 token, I18 queryId-only and I19 private-history tests remain green.
- History tests prove advice/meta injection cannot change the captured save DTO, while full/place-only save,
  ordinary AI degradation and `query_context_unavailable` retain the existing I19 behavior.
- In the installed WeChat DevTools, capture exactly these representative states using a local debug/mock session:
  full/go; full/caution with AI degraded; blocked/no_go; place-only/null. The verification document records each
  fixture's capability, verdict, dataStatus, AI state and visible assertions. No production mock switch may be
  committed. If DevTools cannot run, report the exact blocker before claiming completion.

### TDD and verification

Record a real RED by registering `test:result-page` before the module exists. Then run:

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

### Executor autonomy and escalation

`luna-worker` may choose card composition, spacing and local CSS within the current design language. It must stop
for any need to change structured server fields, verdict copy, source hiding, I20 states, history schema/timing/recovery behavior,
dependencies, route facts or allowlist. It may not trade away an hourly/sample dimension for a simpler mockup.

### Deliverables

Code, behavior tests, RED/GREEN and full gate evidence, four visual evidence states, verification doc, status docs,
result package and focused PR. The executor may not approve or merge.

## 7. Review, merge and stop rules

- Sol must independently review each child against its exact live Issue body and actual diff.
- Results are only `APPROVED`, `CHANGES_REQUESTED`, `BLOCKED` or `ESCALATE_TO_HUMAN`.
- Latest-head CI and Sol `APPROVED` are required before squash merge.
- Child branches use `codex/<issue-number>-<slug>` from latest main. No amend, rebase or force push after Review
  starts; fixes are additive commits.
- Stop and ask the human for hiding sources/unknown status, changing the four verdict meanings, a broad visual
  redesign, deployment/production configuration, new paid service, or two failed Review-fix rounds.
- No ordinary human decision is currently required. Planning Review may refine implementable details without
  changing product scope.

## 8. Planning completion gate

Before implementation:

1. Keep child GitHub Issues #94/#95 linked to parent #31 with these complete contracts.
2. Synchronize parent #31 and both child bodies with the reviewed documents.
3. Obtain independent Sol contract `APPROVED` with no unresolved P0–P3 findings.
4. Run root test, integration, lint, typecheck, WeChat build and diff check on this pure planning branch.
5. Create a planning PR, require latest-head quality, obtain Sol approval and squash merge.
6. From the merged main, activate only I22a and verify exact `luna-worker` routing before dispatch.
