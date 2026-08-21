# ACTIVE TASK — #145 B-lite route-map preview

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — C12 IMPLEMENTATION_ACTIVE`
- Milestone: `C12 Route map preview` under community-track evidence (#115)
- GitHub Issue: `#145`
- Status/Mode: `IMPLEMENTATION_ACTIVE / IMPLEMENTATION`
- Controller: Sol XHigh + human operator
- Branch/base: `codex/145-route-map-preview` from `main@93a86d8`
- Executor: exact custom `luna-worker`, configured `gpt-5.6-luna` / `max`; runtime identity is separate evidence

## 1. Objective and approved design

Implement the human-approved B-lite preview inside the result summary card for a trusted full route with separately
curated reviewed GPX/KML geometry:

- one read-only Taro/WeChat `Map` thumbnail fitted to the complete route;
- route-day polylines plus start/end indicators;
- `enableZoom`, `enableScroll`, `enableRotate`, `enableOverlooking` and `showLocation` all false;
- no click-through or full-screen viewer;
- on map failure, one neutral client-drawn route-outline fallback from the same safe points;
- missing/invalid/unreviewed geometry renders no empty preview placeholder.

## 2. Additive interface contract

The only new result fact is optional `routeSnapshot.routePreview`:

```text
{
  coordinateSystem,
  bounds: { minLat, maxLat, minLon, maxLon },
  segments: [{ day, points: [{ lat, lon }] }]
}
```

Frozen invariants:

- no more than 7 ordered segments and 500 points globally; each segment has at least 2 points;
- finite latitude/longitude in legal ranges and bounds exactly contain all points;
- only full routes with an approved reviewed-GPX/reviewed-track catalog source may carry it;
- no timestamp, elevation, name/ID, OpenID, submission/evidence/file ID, path, host, URL, provenance, note or raw file;
- weather sample points are not a substitute for the complete route;
- the field is optional and additive; existing consumers and no-preview results remain unchanged.

## 3. Exact allowlist

- `cloudfunctions/getAdvice/domain/route-catalog.js`
- `cloudfunctions/getAdvice/trip-base.js`
- exact pilot catalog file(s) only if controller-approved preview geometry is available
- `taro-app/src/pages/index/result-page-model.js`
- `taro-app/src/pages/index/index.jsx`
- `taro-app/src/pages/index/index.css`
- `scripts/route-domain-contract-test.js`
- `scripts/route-data-contract-test.js`
- `scripts/result-page-contract-test.js`
- `scripts/response-contract-test.js` only if the public response seam requires it
- `GOAL.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`
- `docs/product-requirements.md`
- `docs/architecture.md`
- `docs/testing-strategy.md`
- `docs/decision-log.md`

No other path may change without controller approval. In particular: no package/lockfile, new dependency, storage,
submission/admin/retention code, environment/config, CloudBase collection or deployment file.

## 4. Pre-agreed TDD seams

Test behavior through existing public seams:

1. `createRouteCatalog` accepts one literal bounded safe preview and rejects malformed, oversized, incorrectly bounded,
   leaky or unreviewed-source previews.
2. `trip-base` carries the optional preview only for a trusted full target; blocked/place-only/absent cases omit it.
3. `buildResultPageModel` projects the exact safe shape without deriving geometry from weather samples.
4. Result JSX renders `Map` with `polyline`/`includePoints`, all interaction/location flags false, and exact fallback
   wiring. No-preview cases render neither map nor blank shell.
5. Representative removal of validation, noninteractive flags, fallback wiring or fail-closed absence must turn the
   focused contract RED.

Record a real focused RED before production edits, then minimal GREEN. Expected literals must be independent oracles;
do not duplicate production geometry algorithms in tests.

## 5. Data truth and security boundary

- Synthetic preview geometry is allowed only in tests and local visual fixtures.
- Do not fabricate a production route line. If no controller-approved de-identified preview projection is available,
  land the fail-closed infrastructure without a production pilot and report the data gate.
- Never query private submissions/evidence during normal route search and never reopen TP-D056 raw-file access.
- No external map key or new service integration is authorized. Use the pinned Taro/WeChat Map capability only.
- A route preview proves geometry only; it does not prove opening, access, safety or the displayed verdict.

## 6. Verification

Required latest-worktree gates:

- focused route-domain/route-data/result-page/response tests affected by the change;
- root `corepack npm@10.9.2 test`;
- `corepack npm@10.9.2 run test:integration`;
- `corepack npm@10.9.2 run lint` (existing warnings reported separately);
- `corepack npm@10.9.2 run typecheck`;
- `CI=1 corepack npm@10.9.2 run build:weapp`;
- `git diff --check`, exact allowlist, privacy/secret scans and official npmjs audit;
- local WeChat DevTools visual inspection with synthetic/local state only; no CloudBase call or deployment.

## 7. Stop conditions and deliverable

Stop for contract conflict, missing required scope, new dependency/key/service, private-data access, production geometry
fabrication, deployment/runtime mutation, or test evidence that cannot distinguish the frozen behavior.

Return `READY_FOR_CONTROLLER_REVIEW` with handshake, RED/GREEN/mutations, exact changed paths, gates, visual evidence,
data-source truth and remaining limitations. The executor cannot approve, merge, deploy or publish. Latest-head CI and
two fresh independent exact-head Reviews remain controller-owned.
