# ACTIVE TASK — I22a 可信来源摘要与路线状态

- Goal: `TP-BETA-001`
- Parent Task: `I22 / #31`
- GitHub Issue: `#94`
- Status: `IMPLEMENTATION_ACTIVE`
- Mode: `IMPLEMENTATION`
- Controller: Sol XHigh
- Implementation Agent: exact custom Agent `luna-worker`
- Branch: `codex/94-source-summaries`
- Base: `main@ac4ba9e`
- Dependency: I21/#30 and I22 planning PR #96 are merged; #95 remains blocked

## 1. Objective and value

Add trusted, user-displayable route provenance and Variant status to structured BaseData so the future result page
can show who supplied route facts, when they were checked, their A/B level and whether operation is known.

I21 exposes Source IDs only and still includes Place identity IDs in `routeSourceIds`. I22a adds display-safe DTOs
and intentionally corrects that semantic drift. The current renderer does not consume these fields, so the change
is independently mergeable and creates no user-visible intermediate state.

## 2. Allowed scope

- `cloudfunctions/getAdvice/domain/catalog-resolver.js`
- new `cloudfunctions/getAdvice/domain/source-summary.js`
- `cloudfunctions/getAdvice/index.js`
- `cloudfunctions/getAdvice/trip-base.js`
- new `scripts/source-summary-contract-test.js`
- focused additions to `scripts/core-input-flow-contract-test.js`,
  `scripts/trip-context-contract-test.js`, `scripts/response-contract-test.js`
- `package.json`
- `docs/current-status.md`, `docs/tasks/ACTIVE_TASK.md`

No other file is allowed without Sol scope approval.

## 3. Non-scope

- Frontend, CSS, screenshots or I22b work
- Source/Place/Route/Variant records or schema-validation rules
- I13 query stages, candidate DTOs or matching behavior
- I14–I16 weather/verdict logic, Prompt, safety projection or history
- Network/database calls, dependencies, hashes or identifiers
- Compatibility removal, deployment or production configuration

## 4. Frozen interface and module seam

Every `routeSnapshot` adds explicit keys:

```js
routeHighestPointElevationM: number | null
verificationLevel: 'A' | 'B' | null
operationalStatus: 'open' | 'unknown' | 'blocked' | null
sourceCheckedAt: 'YYYY-MM-DD' | null
```

- full: all four come only from the trusted Variant.
- blocked: highest point is null; the other three come only from the blocked Variant.
- every place-only origin (catalog/legacy/AMap/manual): all four are null; existing `referenceElevationM` remains.

`sourceMetadata` adds:

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

Extend `createCatalogResolver({catalog})` with `summarizeSources(sourceIds)` and export production
`resolveRouteSourceSummaries(sourceIds)` beside `resolveRouteQuery/resolveRouteCandidateId`. All three use the
same resolver-owned catalog snapshot. `source-summary.js` is only the pure seven-field projection over Source
records supplied by the resolver; it must not call `createProductionRouteCatalog()` or construct a second catalog.
`index.js` injects the production function into `createTripBaseBuilder`; tests may inject a bounded fake.

`routeSourceIds` is narrowed to Route/Variant/restriction evidence only. Place identity sources are excluded.
`routeSources[].id` follows the exact stable ID order. Do not expose `supports`, raw tracks, coordinates or personal
data. Weather source stays separate. An unknown trusted Source ID is one catalog-integrity error, not a client
fallback or repeated defensive framework.

## 5. Acceptance

- Pure no-I/O lookup returns isolated exact seven-field DTOs.
- A custom catalog passed to `createCatalogResolver` drives both target resolution and Source summaries.
- Full/blocked provenance/status comes only from Variant; all place-only keys are explicit nulls.
- `routeSources` IDs/order exactly match `routeSourceIds`.
- Synthetic Place identity evidence cannot enter route sources; legacy/catalog/AMap/manual empty cases stay honest.
- Base response and stored TripContext snapshot are deeply equal for all new fields.
- QueryId-only advice, resolver semantics, weather/verdict, minimumGear and compatibility prompt/safety do not change.

## 6. TDD and verification

Register `test:source-summary` before the module exists and record the real `MODULE_NOT_FOUND` RED. Then obtain
GREEN for:

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

Tests must inspect public behavior/DTOs rather than use broad source-regex self-proof. Do not add mechanical
coverage targets or speculative input matrices.

## 7. Dependencies, risks and decisions

The task is serial. #95 may start only after #94 passes latest-head CI, independent Sol Review and squash merge.
Main risks are mislabeling Place identity evidence, exposing internal Source supports, treating unknown as open,
or creating a second catalog/network path.

`luna-worker` may choose private helper names, function order and fixture organization. It must stop and return to
Sol for any public phase, source schema/data, I13 semantic, dependency, rule, Prompt/safety or allowlist change.

## 8. Agent routing and handoff

- Logical role: `IMPLEMENTER`
- Requested custom Agent: `luna-worker`
- Config: `~/.codex/agents/luna-worker.toml`
- Configured model: `gpt-5.6-luna`
- Reasoning: `max`
- Configuration verification: `CONFIG_VERIFIED`
- Runtime verification: record after spawn; do not claim before visible
- Terra fallback: not authorized

The result package must contain completion status, actual files, RED/GREEN evidence, all commands/results,
plan deviations, autonomous implementation choices, limitations, PR URL and review focus. The executor returns
`READY_FOR_CONTROLLER_REVIEW`; it must not approve or merge.
