# ACTIVE TASK — I24 核心 Beta 验收

- Goal: `TP-BETA-001`
- Parent GitHub Issue: `I24 / #33`
- Status/Mode: `PLANNING_PR_OPEN / PLANNING`
- Controller: Sol XHigh
- Implementation Agent: none during planning
- Planning branch: `codex/33-beta-acceptance-plan`
- Base: `main@097c921`
- Dependency: M6 complete; I23b PR #103 merged and #100/#32 closed

## 1. Objective and authority

Make the repository demonstrably ready for the code-level core Beta without deployment or real-user testing. I24
must remove the remaining transitional BaseData authority, verify all five pilot variants through the current public
handler, and capture truthful local WeChat DevTools evidence after a fixture-free rebuild.

Read in order: `AGENTS.md`, `GOAL.md`, `docs/current-status.md`, governance protocols, this contract,
`docs/architecture.md`, `docs/testing-strategy.md`, `docs/product-requirements.md`, `docs/development-plan.md`, and
the active child Issue. The live child Issue and this file must match before implementation begins.

## 2. Mandatory serial split

1. **I24a — structured advice/history adapter and compatibility retirement.** Freeze and implement BaseData v2.
2. **I24b — automated core-Beta acceptance.** Add the current five-Variant public cross-layer contract.
3. **I24c — DevTools/manual evidence and final documentation.** Use temporary local fixtures, rebuild without them,
   import the normal output and preserve reviewable evidence.

I24a must pass CI, Sol Review and merge before I24b starts. I24b must pass CI, Sol Review and merge before I24c
starts. Child Issue numbers are assigned only after the planning PR merges. No parallel implementation is allowed.

## 3. I24a contract — structured compatibility retirement

### Goal

Make one structured snapshot the only server authority for prompt, safety projection, history projection and
TripContext. Remove the I21 transitional top-level aliases atomically rather than maintaining a second truth model.

### Fixed public snapshot

Successful `base.data` and the stored TripContext snapshot use:

```js
{
  schemaVersion: 'beta_base_v2',
  requestSummary,
  routeSnapshot,
  weatherSnapshot,
  deterministicResult,
  minimumGear: { essential, recommended, optional },
  deterministicSafety: { fatalRisks: [], ruleNotes: [] },
  sourceMetadata
}
```

- Remove the top-level aliases `route`, `date`, `level`, `days`, `elevation`, `location`, `coords`, `routeType`,
  `routeTypeSource`, `weather`, `sunEvents`, `gearRules` and `meta` from BaseData and TripContext.
- `deterministicSafety` is server-derived, immutable grounding. `fatalRisks` and `ruleNotes` are string arrays and
  are not inferred from AI output or reconstructed from the three minimum-gear arrays.
- Add a pure `advice-context` adapter that accepts only v2 structured fields. It derives prompt route/input labels,
  minimum gear, deterministic safety and a bounded daily weather summary. It must not receive route-source DTOs or
  sunEvents, stringify the full multi-sample hourly payload, or accept legacy aliases.
- `projectSafetyAdvice` accepts exactly `minimumGear`, `deterministicSafety` and `aiOutcome`. `gear` remains the full
  deterministic three-category gear plus deduplicated AI recommended/optional additions; `risks` keeps only the
  deterministic fatal-risk identity set and lets AI add explanations; `notes` contains rule notes followed by
  AI/degraded notes; `disclaimer` remains fixed. These are read-only derivatives, not a second fact authority.
- Advice `meta` is limited to `generatedAt`, `llmModel`, `elapsed` and optional fixed `degradedReason`. Delete advice
  weather, sunEvents, photoTiming, microclimate, elevation, coordinates, location and weatherSource. Deterministic
  route/weather/verdict/source facts remain only in BaseData.
- Upgrade TripContext to `trip_context_v2`. This Goal does not deploy, so do not add a long-lived v1/v2 dual stack.
  A future deployment plan must tolerate or drain the approximately 30-minute v1 context lifetime and requires
  human approval.
- Build private-history facts only from structured fields: full elevation is
  `routeSnapshot.routeHighestPointElevationM` and coordinates are null; place-only uses reference elevation and
  coordinate; blocked uses null elevation/coordinates. Region/name come from route snapshot, route type from
  `routeSnapshot.routeType`, and type source from `sourceMetadata.routeTypeSource`.

### Allowed scope

- `cloudfunctions/getAdvice/index.js`, `trip-base.js`, `trip-context.js`, `prompt.js`, `safety-advice.js`
- new `cloudfunctions/getAdvice/advice-context.js`
- `cloudfunctions/getAdvice/route-type.js` only if removing its test-only legacy `gearRules` validator is required
- bounded `taro-app/src/pages/index/result-page-model.js` / `index.jsx` history and advice consumption
- new `scripts/advice-context-contract-test.js`; bounded updates to core-input, response, TripContext, safety,
  result-page, trip-flow, route-type, unit and offline-integration contracts; `package.json`
- architecture/testing/decision/current-status/active-task documentation

The child Issue must replace this category list with an exact file allowlist before dispatch.

### Non-scope

- Public mode/phase/error changes, route/weather/verdict rules, source catalog changes, history collection schema,
  cache schema migration, dependencies, deployment, production configuration, UI redesign or I24 acceptance fixture.

### TDD and acceptance

- Register `test:advice-context` in root `npm test` and record a real RED before implementation.
- Prove full complete/insufficient, place-only and blocked v2 inputs; deterministic facts never enter AI authority.
- Prove bounded weather prompt data, exact deterministic-safety grounding and AI result narrowing.
- Prove all 13 aliases are absent from base and stored/read context. A stored `trip_context_v1` read by the v2 runtime
  returns exact non-retryable `query_context_unavailable`, calls the LLM zero times and leaks no storage/version detail.
- Prove full/place/blocked history projection, including full coordinates null, and no advice/meta contamination.
- Re-run response, core input, TripContext, result page, recovery, history, root, integration, lint, typecheck,
  WeChat build and diff check. Update the child Issue/PR/status docs with RED/GREEN and exact results.

## 4. I24b contract — automated five-pilot acceptance

### Goal

Add a deterministic, offline, table-driven contract for the current public Beta pipeline. This supplements rather
than renames or inflates the legacy `test:integration` baseline.

### Required behavior

- Add `scripts/beta-acceptance-contract-test.js`, register `test:beta-acceptance`, and include it in root `npm test`.
- For each of the five trusted pilot variants, drive the public server handler far enough to prove permanent route
  identity, fixed days, route type, structured route snapshot, expected capability, weather request shape and a
  server-created queryId. Use fixed clocks and offline adapters; do not call real APIs.
- Table-driven facts cover these exact IDs and names:
  - `variant:wugongshan-longshan-to-main-gate-2d` — 武功山·龙山村至景区正门反穿二日徒步线
  - `variant:siguniang-erfeng-haizigou-out-and-back-2d` — 四姑娘山二峰·海子沟两日往返线
  - `variant:yulong-blue-moon-yunshanping-out-and-back-1d` — 蓝月谷—云杉坪徒步往返线
  - `variant:gongga-laoyulin-yulongxi-point-to-point-3d` — 贡嘎西南坡·老榆林—玉龙西三日线
  - `variant:dangling-huluhai-zhuoyongcuo-out-and-back-1d` — 党岭村—葫芦海—卓雍措一日往返
  五台山小朝台目标已被 TP-D039 取代；五台山大朝台只作为 blocked 记录。
- Representative non-Cartesian cases additionally cover fuzzy confirmation then confirm, place-only manual/AMap,
  the official 五台山大朝台 blocked record, insufficient weather with independent verdict semantics, queryId-only
  advice, AI failure leaving deterministic output valid, private-history save/list boundary and I23 recovery seams.
- Assert capability and data-status boundaries rather than screenshot/CSS details. Existing focused suites remain.
- If this test exposes a production defect, stop and create a focused Bug Issue/PR. Do not modify production code
  inside the acceptance-test PR.

### Allowed scope

- new acceptance test and its offline fixtures/adapters
- focused test helpers only when necessary
- `package.json`
- acceptance/testing/current-status/active-task documentation

No production handler, page, rule, catalog data, dependency, CI, deployment or visual fixture change is allowed.

### Acceptance

Record a real RED, then prove each table row can fail independently on an incorrect stable ID/fixed day/type or
capability. Run the new focused command, all existing root/integration gates, lint, typecheck, WeChat build and diff
check. The PR remains test-only plus documentation.

## 5. I24c contract — DevTools evidence and release documentation

### Goal

Deliver a reproducible local Beta verification package and, when the local DevTools runtime is available, capture
representative evidence without leaving fixture/debug artifacts or claiming deployment, real CloudBase, real device
or real-user validation. Checklist and import instructions are required; GUI execution is best-effort evidence under
the approved code-ready Goal boundary.

### Authorized local workflow

- Temporary local fixture injection in WeChat DevTools is authorized only for this evidence task. It may exercise
  the five pilots, four verdict labels/data-status independence, AI ready/unavailable, fuzzy confirmation/cancel/edit,
  place-only, blocked, checklist persistence, weather/AI/history recovery and history prefill.
- If DevTools is available, capture a small representative evidence set under `docs/evidence/i24/`. In every case,
  record the complete reproducible matrix and each row's `VERIFIED` or `UNVERIFIED_RUNTIME_TOOL` status in
  `docs/beta-acceptance-checklist.md` / `docs/beta-acceptance-report.md`. Evidence must visibly support each claimed
  assertion; do not manufacture or relabel screenshots.
- Remove every temporary fixture/debug hook and rebuild normally. If DevTools is available, import that fixture-free
  output and record the smoke result; otherwise keep the import steps and exact blocker. Always search source,
  scripts, package/config and normal build output for fixture residues.
- Sync README, Goal, product, architecture, testing, development plan, decision log and current status to the actual
  accepted behavior. Do not mark I24 complete until every required row has an honest
  `VERIFIED` or `UNVERIFIED_RUNTIME_TOOL` status, and never describe an unexecuted row as verified.

### Boundaries and blockers

- No deployment, production configuration, secrets, paid external calls, real CloudBase mutation, real device or
  real beta-user testing. Any such request is `ESCALATE_TO_HUMAN`.
- A locked/unavailable Mac or DevTools produces `UNVERIFIED_RUNTIME_TOOL` for the affected rows. Record the exact
  blocker and never substitute build output for visual evidence. It does not by itself block code-ready completion
  when the reproducible checklist, fixture instructions, normal build and limitations are complete.
- Only temporary fixture/evidence/docs changes are allowed. The final PR cannot contain fixture logic in source,
  scripts, package/config or normal build output; generated screenshots and verification docs are the durable output.

### Acceptance

The checklist covers all five pilots plus representative confirmation, place-only, blocked, data-insufficient,
AI-degraded, retry and history flows. Normal fixture-free root tests, integration, lint, typecheck, WeChat build and
diff check pass. A second reviewer inspects any captured screenshots, all evidence-status claims, and no-residue
proof. Unexecuted rows stay disclosed and cannot be described as verified.

## 6. Routing, Review and stop rules

For every implementation child record before spawn:

```text
Logical role: IMPLEMENTER
Requested custom Agent: luna-worker
Config: ~/.codex/agents/luna-worker.toml
Configured model: gpt-5.6-luna
Reasoning: max
Runtime status: RUNTIME_VERIFIED or UNVERIFIED_RUNTIME_MODEL
```

Terra is not an authorized fallback. `luna-worker` must inspect existing work, follow the exact child allowlist,
use additive commits, run the frozen matrix, return the standard result package and stop at
`READY_FOR_CONTROLLER_REVIEW`. It cannot approve or merge.

Sol independently inspects actual code/evidence and returns only `APPROVED`, `CHANGES_REQUESTED`, `BLOCKED`, or
`ESCALATE_TO_HUMAN`. A child merges only after latest-head CI and `APPROVED`. Stop for public-contract expansion,
new stored personal fields, dependencies, production access, destructive action, architecture conflict, lowered
acceptance or two unsuccessful fix rounds for the same contract.

## 7. Activation gate

No I24 implementation is active. Two independent actual-diff Reviews approved the pure-document contract with no
P0–P3 finding; parent #33 is synchronized and draft planning PR #104 is open. Merge it only after the live latest-head
quality check and final Sol verification. Then create three child Issues from these contracts, assign their exact
allowlists and dependency labels, and activate only I24a. Do not dispatch I24b or I24c early.
