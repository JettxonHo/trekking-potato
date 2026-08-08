# ACTIVE TASK — I24b 五试点核心 Beta 自动化验收

- Goal: `TP-BETA-001`
- Parent: `I24 / #33`
- GitHub Issue: `I24b / #106`
- Status/Mode: `REVIEW_FIX_ACTIVE / REVIEW_FIX`
- Controller: Sol XHigh
- Implementation Agent: exact custom Agent `luna-worker`
- Branch: `codex/106-beta-acceptance`
- Base: `main@1a2f485`
- Dependencies: I24a/#105 merged through PR #108 as `1a2f485`; I24c/#107 remains blocked

## Implementation checkpoint (2026-08-09)

- The required TDD RED was recorded before the fixture existed: `npm run test:beta-acceptance` exited 1 with
  `MODULE_NOT_FOUND: ./fixtures/beta-acceptance`.
- The focused contract is now GREEN. It calls the real public `getAdvice.main` path with deterministic offline
  CloudBase/Open-Meteo/AMap/LLM adapters and verifies the five exact pilots, row-isolated ID/fixedDays/type/capability
  mutations, confirmation/place-only/blocked/insufficient boundaries, queryId-only AI outcomes, private history
  idempotency and I23 recovery seams.
- Required local commands pass: `npm run test:beta-acceptance`, `npm test`, `npm run test:integration` (`55/0`),
  `npm run lint` (0 errors / 9 existing warnings), `npm run typecheck`, `npm run build:weapp` and `git diff --check`.
- No production defect or contract ambiguity was exposed. Evidence: `docs/i24b-beta-acceptance-verification.md`.
- The executor is `READY_FOR_CONTROLLER_REVIEW`; Sol XHigh must inspect the actual diff, create/review the focused
  draft PR (`Refs #106`) and decide mergeability. I24c/#107 remains blocked until that merge.

## 1. Goal and user value

Add an honest, deterministic offline acceptance contract for the current five full pilot RouteVariants and the
representative non-full/degraded boundaries of the public Beta pipeline. This suite must prove code readiness without
claiming deployment, live APIs, real CloudBase, device execution or user testing.

The existing `test:integration` remains a legacy three-route daily-weather baseline. I24b adds a separate root
`test:beta-acceptance` for the current `prepare/confirm -> queryId -> advice` architecture; it does not rename or
inflate the legacy suite.

## 2. Exact pilot rows

Each row is independently asserted against its own permanent ID and expected facts:

| Permanent RouteVariant ID | Route type | Fixed days | Required row-specific evidence |
| --- | --- | ---: | --- |
| `variant:wugongshan-longshan-to-main-gate-2d` | `trek` | 2 | full structured result and multi-sample hourly window |
| `variant:siguniang-erfeng-haizigou-out-and-back-2d` | `climb` | 2 | climb support propagated; deterministic verdict at least caution |
| `variant:yulong-blue-moon-yunshanping-out-and-back-1d` | `trek` | 1 | full structured result and exact source/status facts |
| `variant:gongga-laoyulin-yulongxi-point-to-point-3d` | `trek` | 3 | point-to-point full result and three route-day windows |
| `variant:dangling-huluhai-zhuoyongcuo-out-and-back-1d` | `trek` | 1 | reviewed-track full result and exact source/status facts |

五台山大朝台 is a separate official blocked record, not a sixth plannable pilot. 五台山小朝台 was superseded by
TP-D039 and must not re-enter the matrix.

## 3. Exact allowed files

- new `scripts/beta-acceptance-contract-test.js`
- new `scripts/fixtures/beta-acceptance.js`
- `package.json`
- new `docs/i24b-beta-acceptance-verification.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

No other file may change without Sol expanding the contract before the edit.

## 4. Work scope

- Register `test:beta-acceptance` and include it in root `npm test`.
- Use fixed clocks and offline adapters only. Exercise the real public `getAdvice.main` handler, production resolver,
  production catalog, structured `beta_base_v2` composition, server TripContext and queryId-only advice boundary.
- Use table-driven pilot data while retaining row-specific failure messages and assertions.
- Reuse production pure history/recovery modules and the history handler through offline mocks where required; do not
  duplicate a second product implementation inside fixtures.
- Record real RED, GREEN, command results, coverage boundaries and known limitations in the verification document.

## 5. Non-work scope

- No production code, existing test, route-data, dependency, CI, visual/CSS or DevTools change.
- No public mode/phase/error/DTO/schema change.
- No route identity, geometry, source tier/status, weather threshold, verdict, minimum-gear or AI-authority change.
- No deployment, paid/live API, real CloudBase mutation, device testing, production configuration, secret, migration,
  public UGC, hashing/SHA or broad refactor.
- No mechanical Cartesian product, coverage score or duplicated end-to-end framework.

If the suite exposes a production defect, preserve the RED evidence and stop. Sol must create a separate focused Bug
Issue/PR; I24b may resume only after that dependency merges.

## 6. Frozen acceptance matrix

### 6.1 Five full pilots

For every exact row, public `mode=prepare` uses the row's canonical user-facing name or reviewed alias, then public
`mode=confirm` uses that row's permanent server candidate ID. Direct permanent-ID `prepare` is not a public contract
and must not be added for the test. Both paths use fixed offline clock/adapters and must prove:

- response phase is `base`, schema is exact `beta_base_v2`, and `queryId`/expiry are server-produced;
- permanent ID, canonical name, capability=`full`, trusted route type and fixed days match the row;
- route verification/operational status and display-safe route sources are present and match the production catalog;
- route days drive multi-sample hourly requests/windows; no client route/weather fact becomes authoritative;
- deterministic result, minimum gear and deterministic safety are present;
- advice accepts only that `queryId`, preserves deterministic facts and never changes the route/weather/verdict/source.

The 四姑娘 row additionally passes a valid climb-support choice and proves the deterministic verdict is never `go`.
Each row must fail independently if its stable ID, route type, fixed days or capability is mutated.

### 6.2 Representative boundaries

Use one representative per behavior rather than a Cartesian product:

- fuzzy prepare returns confirmation and causes zero weather, TripContext-write and AI side effects;
- confirm uses the server candidate ID and reaches the same trusted base pipeline;
- manual and AMap place-only results keep `verdict=null`, reference weather semantics and `user`/`amap` provenance;
- official Wutai blocked returns `no_go`, `weatherSnapshot=null`, and performs zero weather calls;
- insufficient weather keeps data completeness independent from any valid hard `no_go` verdict;
- valid, invalid and transport-unavailable AI outcomes cannot alter deterministic route/weather/verdict/gear facts;
- advice request is queryId-only and a missing/legacy context causes zero LLM calls;
- private-history save/list boundary remains openid-scoped and retry idempotency returns the first record;
- I23 pure recovery seams prove explicit weather re-prepare, same-query AI retry, frozen history-save retry identity,
  stale history-list rejection and history prefill with zero network intent.

## 7. TDD and tests

1. Add the root script and a deliberately incomplete acceptance entry first.
2. Record a genuine focused RED before the fixture/adapter is complete; a missing fixture/module or missing required
   pilot row is acceptable, but a fabricated assertion failure is not.
3. Implement the minimum offline fixture and behavior assertions.
4. Demonstrate representative mutation sensitivity for row ID/fixedDays/type/capability and at least one trusted
   queryId/deterministic-authority boundary.
5. Run:
   - `npm run test:beta-acceptance`
   - `npm test`
   - `npm run test:integration`
   - `npm run lint`
   - `npm run typecheck`
   - `npm run build:weapp`
   - `git diff --check`

All failures must remain visible. The legacy integration baseline is currently `55/0`; I24b does not mechanically
change its count.

## 8. Dependencies, risks and stop conditions

- I24a is satisfied by PR #108 / `1a2f485`; I24c/#107 remains blocked until I24b merges.
- The acceptance script may become large because it spans five public rows and representative boundaries. Prefer
  small fixture helpers and descriptive row assertions; do not introduce a framework or abstract every case.
- Stop for any required file outside the allowlist, production behavior defect, live-network need, public contract
  mismatch, dependency, route/source ambiguity, lowered acceptance or a second failed Review-fix round.
- Deployment, real CloudBase/device/beta activity and product trade-offs require human authorization and remain
  outside this Issue.

## 9. Allowed autonomous decisions

`luna-worker` may choose fixture helper names, table organization, fixed timestamps and focused assertion wording.
It may not change the pilot set, public behavior, production modules, acceptance rows, dependency policy or Goal
boundary. Contract ambiguity must return to Sol instead of being guessed.

## 10. Deliverables and Review

Deliver the new acceptance script and fixture, package registration, verification document, current-task/status
checkpoint, exact RED/GREEN evidence and a focused PR using `Refs #106` rather than auto-closing the Issue.

The executor returns `READY_FOR_CONTROLLER_REVIEW` with changed files, commands/results, deviations, autonomous
implementation decisions, limitations and Review focus. It cannot approve or merge. Sol must inspect actual tests,
latest-head GitHub quality and independent Review before squash merge. Only the approved merge may unblock #107.

## 11. Sol Review-fix round 1 — 2026-08-09

PR #109 exact head `91fec62` passed latest-head `quality`, but two independent actual-test Reviews returned
`CHANGES_REQUESTED`. No production defect or human/product decision is involved. This round remains within the same
six-file allowlist and may change only the new acceptance test/fixture plus verification/current-task/status docs.

The executor must close these evidence gaps without changing production or existing tests:

1. Every pilot must use its name/alias for public `prepare` and its own permanent ID for a legal public `confirm`;
   both results reassert ID/type/fixedDays/capability/source/status. Invalid-ID confirm remains covered.
2. Route-source summaries must prove the exact seven-field DTO and expected values. Each route day must align its
   `stage.weatherSamplePointIds` with the matching evaluated-window sample IDs; every sample has non-empty hours
   within `[startLocal,endLocalExclusive)`, and request count equals the distinct stage sample IDs.
3. Insufficient weather proves its reason, `retryable=true` and zero partial evaluated windows.
4. Available, invalid and unavailable AI each preserve deterministic essential/recommended/optional gear, fatal
   risks and rule notes in public advice; forged deterministic content has no authority.
5. Focused mutations for missing/replaced sample, empty/out-of-window hours, request-count mismatch, and lost
   deterministic advice facts must produce RED before final GREEN.

Use additive commits only. This is Review-fix round 1; a second failed round may be bounded by Sol, but a repeated
finding after two rounds requires human escalation under the Goal stop condition.
