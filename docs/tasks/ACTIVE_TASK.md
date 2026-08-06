# 当前活动任务

- Task ID: `I17b`
- GitHub Issue: `#61` (parent `#26`)
- Title: 将 prepare 与 confirm 接入 TripContext
- Status: `READY_FOR_CONTROLLER_REVIEW`
- Mode: `REVIEW_PENDING`
- Owner: Terra XHigh
- Reviewer: Sol XHigh
- Branch: `codex/i17b-trip-context-wiring`
- Base: `main` at `910c00d`
- Goal: `TP-BETA-001`

## Current authorization

I16 implementation PR #59 passed Sol XHigh Review and latest-head GitHub `quality`, squash merged as
`bd6017f`, and closed #25. M4 is complete. Sol XHigh froze I17's server-owned context contract and
split the parent into independently reviewable children. The first independent
contract Review returned `CHANGES_REQUESTED` for one ownership ambiguity, one stale public-error
paragraph and two focused test gaps. All four were corrected and synchronized; the second independent
Review returned `APPROVED` with no remaining P0–P2 finding. Planning PR #62 then passed latest-head
GitHub `quality` and squash merged as `bc23dbe`. Terra completed I17a test-first. Sol's first implementation
Review returned `CHANGES_REQUESTED` for one malformed-record boundary; the focused fix now rejects an
unparsable `createdAt` and non-`beta_base_v1` snapshot without nested rule revalidation. Sol inspected
the actual fix, reran the full quality matrix and returned `APPROVED`. PR #63 passed latest-head
GitHub `quality`, squash merged as `910c00d`, and closed #60. I17b/#61 is now authorized exactly within
its allowlist on that base; I18 remains blocked.

I17b recorded a genuine contract RED for missing context metadata, then added only the handler wiring
and focused CloudBase mock coverage. Its local full matrix is green. The implementation is now
`READY_FOR_CONTROLLER_REVIEW`; Sol must independently inspect the actual diff and test evidence before
any PR, CI conclusion or merge. I18 remains blocked.

## Mandatory context

Follow the complete reading order in `AGENTS.md`, then read:

1. `GOAL.md`
2. `docs/architecture.md` sections 4–5 and the I16 composition section
3. `docs/testing-strategy.md` I17 section
4. `docs/decision-log.md` TP-D008, TP-D009, TP-D012 and TP-D030
5. Parent GitHub #26 and the assigned child Issue

## Objective and split

I17 makes each successful server-generated base result recoverable through a random, short-lived,
openid-bound `queryId`. It does not yet make `mode='advice'` queryId-only; I18 owns that cutover.

- I17a / #60: add the deep TripContext service, trusted transitional BaseData projection and offline
  store contract. No public handler change.
- I17b / #61: after I17a merges, write exactly one context for each successful prepare/base-alias/
  confirm result and add top-level `queryId/expiresAt` to the base response.
- Parent #26 closes only after both children merge and the I17 checkpoint is synchronized.

Default execution is serial: planning PR -> I17a -> I17b. No parallel work modifies the handler or
context contract.

## Frozen trust and compatibility boundary

- Only server-built base facts enter TripContext. Client `event.baseData`, coordinates, route facts,
  weather, queryId or timestamps are never merged into the stored snapshot.
- The current production resolver is still the legacy place-level path; I13 has not integrated verified
  RouteVariants. I17 therefore records an honest `place_only` snapshot and must not fabricate full route,
  hourly-weather or `go/caution/no_go` facts.
- I17 keeps the current advice handler and frontend behavior: advice still validates and consumes client
  `baseData`. That is an explicitly documented temporary limitation, not a trusted flow. I18 alone will
  load TripContext, make advice queryId-only and reject/ignore client safety facts.
- I19 alone changes private history and disables UGC. I17 does not reuse `history` or `routes` storage.

## I17a frozen internal interface

New module `cloudfunctions/getAdvice/trip-context.js` exports:

```js
createTripContextStore({
  collection,
  now = () => new Date(),
  createQueryId = () => `tctx_${crypto.randomUUID()}`,
}) -> {
  create({ openid, legacyBaseData }) -> Promise<
    | { kind:'created', queryId, expiresAt, snapshot }
    | { kind:'store_unavailable' }
  >,
  read({ openid, queryId }) -> Promise<
    | { kind:'found', queryId, expiresAt, snapshot }
    | { kind:'unavailable', code:'context_not_found'|'context_forbidden'|'context_expired' }
    | { kind:'store_unavailable' }
  >,
}
```

`collection` is an injected CloudBase collection-compatible adapter. The production collection name is
`trip_contexts`; I17a itself has no global SDK initialization. Public callers do not control `now` or
`createQueryId`; they are test seams.

`create` accepts only a nonempty trusted openid and the plain legacy server BaseData object already
produced by the current prepare/confirm pipeline; otherwise it throws
`TypeError('trusted base context required')`. `read` returns `context_not_found` without storage access
for a queryId outside the frozen format. No nested schema revalidation duplicates I14/I15/I16.

## Random ID and logical TTL

- Default queryId is exactly `tctx_` plus lowercase UUID v4 text from Node `crypto.randomUUID()`.
- Do not use hashes, SHA, signatures, deterministic IDs, client IDs, collision lookup loops or fallback
  token machinery.
- `createdAt` is the injected server time in ISO UTC. `expiresAt` is exactly 1,800,000 ms later.
- A record is readable while `now < expiresAt`; equality is expired.
- Logical expiry is the correctness boundary. Do not delete on read, schedule cleanup, configure native
  TTL/indexes or migrate data in this Goal. Production collection/config creation remains deployment.

## Stored record and trusted BaseData

The service writes one document at `collection.doc(queryId)`:

```js
{
  schemaVersion: 'trip_context_v1',
  _openid: openid,
  queryId,
  createdAt,
  expiresAt,
  snapshot: TrustedBaseData,
}
```

The store owns a private, single projection from `legacyBaseData` to `TrustedBaseData`; I17b must not
reimplement or extend that projection in the handler. Its legacy input is exactly the current server-
constructed allowlist below. Arbitrary extra keys are not copied:

```js
{
  route, date, level, days, elevation, location, coords,
  routeType, routeTypeSource, weather, sunEvents, gearRules, meta,
}
```

`TrustedBaseData` is the exact projection returned as `base.data` and stored for I18. It preserves
those current legacy fields for compatibility, and additively contains:

```js
{
  ...legacyServerBaseData,
  schemaVersion: 'beta_base_v1',
  requestSummary: { date, startTimeLocal: null, level, days },
  routeSnapshot: {
    entityKind: 'place',
    capability: 'place_only',
    canonicalName, region, routeType,
    referenceCoordinate: null | { lat, lon, coordinateSystem:'GCJ-02' },
    referenceElevationM,
    sourceStatus: 'legacy_unverified' | 'unverified',
  },
  weatherSnapshot:
    | { status:'available', scope:'reference_point', source:'Open-Meteo', data }
    | { status:'unavailable', scope:'reference_point', reason:'weather_unavailable', retryable:true },
  deterministicResult: {
    verdict:null, dataStatus:'place_only', reasons:[],
    dataIssues:[{ code:'place_only_route', retryable:false }], evaluatedWindows:[],
  },
  minimumGear: { essential, recommended, optional },
  sourceMetadata: { routeSources:[], routeTypeSource, weatherSource, checkedAt },
}
```

- `deterministicResult` must come from I16 `evaluateTripVerdict` with trusted
  `{kind:'place_only'}`; do not copy a second handwritten rule.
- The private projection derives `sourceStatus='legacy_unverified'` only when
  `routeTypeSource==='builtin'`; every other current place source is `unverified`. Empty
  `routeSources` explicitly means no A/B route evidence.
- `weatherSource` is `Open-Meteo` when legacy `weather` is present and `null` when it is unavailable.
  `referenceElevationM` preserves a numeric legacy elevation and is otherwise `null`.
- `checkedAt` is the context creation time, not a claim that legacy route geometry was verified.
- `minimumGear` and compatibility `gearRules` originate from the same server rules result.
- `weatherSnapshot` is reference-point daily data, not I14 route-hourly data.
- The service deep-copies on create, before persistence, before returning the created snapshot and on
  every read. Caller or database-result mutation cannot change another view.

## Ownership, read and failure semantics

- Read uses a single `_id=queryId` lookup (for example `where({_id:queryId}).limit(1).get()`), then checks
  `_openid`, then expiry. It needs no custom compound index.
- Unknown ID -> `context_not_found`; other openid -> `context_forbidden`; owner at/after expiry ->
  `context_expired`. None includes a snapshot.
- I18 must map all three unavailable kinds to one non-leaking public `query_context_unavailable` error;
  I17 keeps them internal so ownership and expiry are independently testable.
- CloudBase read/write rejection or malformed storage result -> `store_unavailable`; raw errors and
  stored facts are never returned. No retries are hidden inside the store.

## I17a task contract — #60

### Allowlist

- `cloudfunctions/getAdvice/trip-context.js` (new)
- `scripts/trip-context-contract-test.js` (new)
- `package.json` (only `test:trip-context` and root `test`)
- `docs/architecture.md`
- `docs/testing-strategy.md`
- `docs/development-plan.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

### TDD and tests

1. Add `test:trip-context` before the module exists; genuine RED is missing module/export.
2. In-memory collection implements only `doc().set()` and `_id` query needed by production.
3. Two default creates produce distinct UUID-shaped IDs; fixed time proves exact +30 minutes.
4. Owner read at expiry minus 1 ms succeeds; equality expires; unknown and cross-user return their
   exact unavailable codes and no snapshot; no delete occurs.
5. Mutating original nested base data after create, returned created snapshot, first read and mock DB
   result does not change a later read.
6. Write/read failure becomes `store_unavailable` without raw error text.
7. Exact transitional place-only snapshot proves route/weather/result/gear/source honesty and does not
   contain client queryId, arbitrary extra legacy keys or full-route claims. One invalid trusted-base
   guard is enough.
8. A malformed queryId returns `context_not_found` with zero collection query calls. Do not expand this
   into a token-attack suite.

### Out of scope and escalation

No handler, response, existing mocks, frontend, dependencies, CloudBase config, history, route data,
I14/I15/I16 modification, deployment or migration. Terra may choose private helpers only. Escalate any
need to change the union, TTL, snapshot shape, persistence operation or dependency.

## I17b task contract — #61

### Allowlist

- `cloudfunctions/getAdvice/index.js`
- `cloudfunctions/getAdvice/response-contract.js`
- `scripts/response-contract-test.js`
- `scripts/confirmation-contract-test.js`
- `scripts/mocks/cloudbase.js`
- `docs/architecture.md`
- `docs/testing-strategy.md`
- `docs/development-plan.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

### Handler behavior

1. Build the existing server base facts first; call the merged I17a service exactly once only after all
   geo/weather/rules work succeeds. Pass them as `legacyBaseData`; use the returned snapshot unchanged.
2. Successful `prepare`, compatibility `base` and valid `confirm` each persist and return:

```js
{ phase:'base', queryId, expiresAt, data:created.snapshot, ok:true }
```

3. `confirmation`, `route_type_required`, validation/auth/weather errors and `advice` perform zero
   TripContext writes. I17 performs zero TripContext reads in the handler.
4. Client `baseData/queryId/coords/routeType/weather/timestamps` never alter the stored or returned
   trusted snapshot beyond the already-authorized current manual-place input path.
5. Create `store_unavailable` maps to public
   `context_unavailable` with `retryable:true`; return no partial base, data, queryId, expiry or DB text.
6. `baseResponse` requires the context metadata and keeps `queryId/expiresAt` outside `data`.
7. Current advice/baseData path remains byte-for-behavior compatible and does not read the new store.

### Tests

- Stateful focused mocks track collections, writes and stored snapshots without external services. For
  context writes they accept only `collection('trip_contexts').doc(queryId).set({data: record})` and
  record both the collection name and document; a wrong collection or write operation must fail.
- Prepare/base/confirm happy paths prove one write and matching top-level metadata; confirm proves client
  spoof fields do not enter the record.
- Existing confirmation/route-type/error/no-auth/advice cases prove zero writes at their exit points.
- One write failure proves public error and zero partial base. Do not mechanically clone the same failure
  for prepare, base and confirm.
- Existing response, confirmation, route, integration and build contracts remain green.

### Out of scope and escalation

No context read in advice, frontend queryId use, public query read errors, history/UGC, route catalog,
hourly weather/verdict integration, dependency/config, deployment or migration. Any need to alter advice
authority, public non-base phases or database configuration is an escalation to Sol.

## Full validation for both children

```bash
corepack npm@10.9.2 run test:trip-context
corepack npm@10.9.2 run test:response
corepack npm@10.9.2 run test:confirmation
corepack npm@10.9.2 run test:trip-verdict
corepack npm@10.9.2 run test:verdict
corepack npm@10.9.2 run test:hourly-weather
corepack npm@10.9.2 run test:weather
corepack npm@10.9.2 run test:route-domain
corepack npm@10.9.2 test
corepack npm@10.9.2 run test:integration
corepack npm@10.9.2 run lint
corepack npm@10.9.2 run typecheck
corepack npm@10.9.2 run build:weapp
git diff --check
```

## Parent completion

I17 completes only when #60 and #61 merge, parent #26 closes, base responses expose a persisted
server-owned context, all quality gates pass and documents still state that I18 is required before
advice becomes queryId-only. No human decision is currently required.
