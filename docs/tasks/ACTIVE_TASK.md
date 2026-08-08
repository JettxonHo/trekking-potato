# ACTIVE TASK — I24a 结构化 advice/history 适配与兼容字段退役

- Goal: `TP-BETA-001`
- Parent: `I24 / #33`
- GitHub Issue: `I24a / #105`
- Status/Mode: `IMPLEMENTATION_ACTIVE / IMPLEMENTATION`
- Controller: Sol XHigh
- Implementation Agent: exact custom Agent `luna-worker`
- Branch: `codex/105-structured-advice-adapter`
- Base: `main@6869a7b`
- Dependencies: planning PR #104 merged; I24b/#106 and I24c/#107 blocked

## 1. Goal

Retire the transitional BaseData compatibility projection so one structured server snapshot owns prompt grounding,
safety projection, private-history facts and TripContext. Preserve product behavior while removing dual authority.

## 2. Fixed contract

`base.data` and the stored snapshot are the same exact `beta_base_v2` object:

```js
{
  schemaVersion: 'beta_base_v2',
  requestSummary,
  routeSnapshot,
  weatherSnapshot,
  deterministicResult,
  minimumGear: { essential, recommended, optional },
  deterministicSafety: { fatalRisks, ruleNotes },
  sourceMetadata
}
```

Remove top-level `route/date/level/days/elevation/location/coords/routeType/routeTypeSource/weather/sunEvents/
gearRules/meta`. `deterministicSafety` and `minimumGear` come from the same deterministic gear-rule call.

Add a pure `advice-context` adapter. It accepts structured v2 only and derives route/request labels, bounded daily
weather, minimum gear and deterministic safety; it receives neither route-source DTOs nor sunEvents and never
stringifies the full hourly payload.

`projectSafetyAdvice` accepts exactly `minimumGear + deterministicSafety + aiOutcome`. Advice is a read-only
derivative:

- `gear`: complete deterministic gear plus deduplicated AI recommended/optional additions;
- `risks`: deterministic fatal-risk identity set plus optional AI explanations;
- `notes`: rule notes followed by AI/degraded notes;
- fixed `disclaimer`;
- `meta`: exact `generatedAt/llmModel/elapsed/degradedReason?` only.

Delete advice weather/sunEvents/photoTiming/microclimate/elevation/coords/location/weatherSource.

TripContext becomes `trip_context_v2` and accepts only v2 snapshot. No long-lived v1/v2 dual stack. A stored v1
context returns non-retryable `query_context_unavailable`, invokes the LLM zero times and leaks no version detail.

History projection uses structured fields only: full highest-point elevation and null coords; place-only reference
elevation/coordinate; blocked null elevation/coords; region/type/type-source from route/source snapshots. History DTO,
save timing, privacy and restoration semantics do not change.

## 3. Exact allowed files

- `cloudfunctions/getAdvice/index.js`
- `cloudfunctions/getAdvice/trip-base.js`
- `cloudfunctions/getAdvice/trip-context.js`
- `cloudfunctions/getAdvice/prompt.js`
- `cloudfunctions/getAdvice/safety-advice.js`
- `cloudfunctions/getAdvice/route-type.js`
- new `cloudfunctions/getAdvice/advice-context.js`
- `taro-app/src/pages/index/result-page-model.js`
- `taro-app/src/pages/index/index.jsx`
- `package.json`
- new `scripts/advice-context-contract-test.js`
- `scripts/core-input-flow-contract-test.js`
- `scripts/response-contract-test.js`
- `scripts/trip-context-contract-test.js`
- `scripts/advice-safety-contract-test.js`
- `scripts/result-page-contract-test.js`
- `scripts/trip-flow-contract-test.js`
- `scripts/route-type-contract-test.js`
- `scripts/unit-test.js`
- `scripts/e2e-local.js`
- new `docs/i24a-structured-adapter-verification.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

No other file may change without Sol expanding the contract before the edit.

## 4. Out of scope

Public mode/phase/error changes; route/weather/verdict thresholds; source catalog; history storage/DTO; cache schema;
new dependency; CI; visual redesign; fixture/acceptance work; deployment or production configuration.

## 5. TDD and acceptance

Register `test:advice-context` in root test and record a genuine RED first. Prove:

- full complete/insufficient, place-only and blocked exact v2 keys with all thirteen aliases absent;
- prompt has bounded structured weather and deterministic grounding only;
- available/invalid/unavailable AI preserves deterministic gear/risk/note facts and cannot inject route/weather/
  verdict/source;
- exact advice fields/meta allowlist and removal of legacy projection fields;
- public/persisted/read TripContext v2 equality; v1 rejection is non-retryable, zero-LLM and non-leaking;
- full/place/manual/AMap/blocked history projections, full coords null, no advice/meta contamination;
- representative deletion mutations for adapter, deterministicSafety and structured history produce focused RED.

Run focused advice-context/core-input/response/context/safety/result/flow/route/unit/integration contracts, root test,
lint, typecheck, WeChat build and diff check. Record exact commands and results.

## 6. Routing, Review and escalation

Executor: exact custom Agent `luna-worker` (`~/.codex/agents/luna-worker.toml`, `gpt-5.6-luna`, `max`). Record
runtime visibility; no Terra fallback. Stop for contract/file expansion, public API/error changes, rule/history/cache
changes, dependency, long-lived v1 compatibility, production access or lowered acceptance. Return
`READY_FOR_CONTROLLER_REVIEW`; implementation Agent cannot approve or merge.

## 7. Delivery

Deliver code, tests, `docs/i24a-structured-adapter-verification.md`, complete command evidence and a focused PR using
`Refs #105`. After latest-head quality and Sol `APPROVED`, merge and only then unblock I24b/#106.

## Executor checkpoint — 2026-08-09

The required RED was recorded before `advice-context.js` existed. The implementation now emits exact
`beta_base_v2` snapshots, uses a pure bounded structured adapter, projects advice from
`minimumGear + deterministicSafety + aiOutcome`, and derives history from route/source snapshots. TripContext
persists `trip_context_v2`; stored v1 records map to the existing non-retryable `query_context_unavailable`
without an LLM call. Focused and root contracts are green; exact command evidence and the two-removed/one-added
integration assertion accounting are recorded in `docs/i24a-structured-adapter-verification.md`.

## Review-fix round 1 checkpoint — 2026-08-09

Controller baseline `4de1ff2` is confirmed and remains outside executor scope. The bounded review fix proves
per-call deterministic gear provenance (full/place exactly once and blocked zero), covers full/catalog place/manual
`user`/AMap `amap`/blocked history capture and save projection, removes unused adapter aliases, and records the
two-removed/one-added integration assertion accounting plus in-memory mutation RED evidence in the verification
record. No production behavior or non-allowlisted file is changed.
