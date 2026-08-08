# ACTIVE TASK — I24b 五试点核心 Beta 自动化验收

- Goal: `TP-BETA-001`
- Parent: `I24 / #33`
- GitHub Issue: `I24b / #106`
- Status/Mode: `IMPLEMENTATION_ACTIVE / IMPLEMENTATION`
- Controller: Sol XHigh
- Implementation Agent: exact custom Agent `luna-worker`
- Branch: `codex/106-beta-acceptance`
- Base: `main@1a2f485`
- Dependencies: I24a/#105 merged through PR #108 as `1a2f485`; I24c/#107 remains blocked

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

For every exact row, public `mode=prepare` with the permanent ID and fixed offline clock/adapters must prove:

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
