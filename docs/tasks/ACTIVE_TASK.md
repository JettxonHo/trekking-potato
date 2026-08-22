# ACTIVE TASK — #145 B-lite route-map preview

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — C12 REVIEW_FIX`
- Milestone: `C12 Route map preview` under community-track evidence (#115)
- GitHub Issue: `#145`
- Status/Mode: `REVIEW_FIX / REVIEW_FIX`
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

## 7.1 Review-fix round 1 checkpoint

- Two fresh independent Reviews returned `CHANGES_REQUESTED`. The bounded repair adds deterministic WGS84→GCJ-02
  conversion before every WeChat Map-native coordinate, preserves outside-China coordinates, keeps the fallback on
  normalized source geometry, nests the preview inside the top result-summary card, disables POI display, and covers
  full/blocked/place/absent trip-base boundaries plus both fallback-reset seams.
- Focused RED was captured against the pre-fix result-page contract; GREEN now includes representative coordinate
  oracles and raw/offset/nesting/POI/reset deletion mutations. No production pilot geometry is available, so the data
  gate remains fail-closed and no catalog file was changed.
- Executor status: `READY_FOR_CONTROLLER_REVIEW`. Runtime model identity remains `UNVERIFIED_RUNTIME_MODEL`. No
  CloudBase call, deployment, dependency/key, commit, push, PR, merge or public release occurred.
- Next action: controller-owned commit/push, latest-head CI and two fresh exact-head independent Reviews; only the
  controller may decide mergeability and Issue status.

## 7.2 Review-fix round 2 checkpoint

- Fresh re-reviews returned `CHANGES_REQUESTED`. The repair remains within the exact allowlist and uses the trusted
  full route's curated `region` as the coordinate applicability gate: recognized mainland province/region labels get
  deterministic WGS84→GCJ-02 conversion; Nepal, Mongolia, Hong Kong and other non-mainland labels remain unchanged;
  WGS84 without a region fails closed. This is intentionally bounded and does not claim global border exactness.
- Focused RED was captured before production edits for inside-rectangle non-mainland stability and the missing
  region-aware Map call. GREEN adds independent center/end-indicator converted-coordinate oracles, region/raw/offset
  mutations, Map center/indicator prop mutations, and initial/error fallback state mutations.
- No production pilot geometry is available, so the data gate remains fail-closed and no catalog file changed. No
  CloudBase call, deployment, dependency/key, commit, push, PR, merge or public release occurred; runtime identity
  remains `UNVERIFIED_RUNTIME_MODEL`.
- Executor status: `READY_FOR_CONTROLLER_REVIEW`. Current next action is controller review of this round2 head,
  latest-head CI, and two fresh exact-head independent Reviews; only the controller may decide mergeability/status.

## 7.3 Review-fix round 3 checkpoint

- Fresh re-reviews returned `CHANGES_REQUESTED`. The repair remains inside this exact allowlist and uses a tri-state
  trusted-region classifier: canonical/anchored mainland province forms receive deterministic WGS84→GCJ-02 mapping;
  explicit non-mainland forms remain raw; unknown, missing and conflicting/collision labels fail closed with no map.
  Unrecognized aliases and false positives (`日本山西县`, `法国四川餐厅`, `Sichuan Province`, `川西`) remain unknown;
  collision cases (`香港·广东`, `尼泊尔·西藏边境`) remain unknown, while case-normalized Hong Kong remains
  explicit non-mainland.
- Focused RED preceded the classifier implementation (`classifyRoutePreviewRegion` was absent). GREEN includes an
  unknown-region geometry absence oracle, independent converted center/end-indicator oracles, direct unknown/raw
  mapping and non-mainland exclusion-removal mutations. No production pilot geometry is available; the data gate
  remains fail-closed.
- No CloudBase call, deployment, dependency/key, commit, push, PR, merge or public release occurred. Runtime
  identity remains `UNVERIFIED_RUNTIME_MODEL`; result-page runtime visual evidence remains unclaimed.
- Executor status: `READY_FOR_CONTROLLER_REVIEW`. Current next action is controller inspection of this latest
  worktree/head, latest-head CI and two fresh exact-head independent Reviews; only the controller may decide
  mergeability and Issue status.

## 7.4 Review-fix round 4 checkpoint

- Correctness review identified one contract mismatch: when a trusted region matches both mainland and non-mainland
  forms, the result must be `unknown` and produce no Map geometry. The classifier now computes both matches first;
  mainland-only converts WGS84, non-mainland-only remains raw, and neither or both fail closed.
- Focused RED preceded the production edit for `香港·广东` and `尼泊尔·西藏边境`; GREEN adds direct collision map
  absence assertions and a collision-guard removal mutation that turns the focused contract RED. No production pilot
  geometry is available, so the data gate remains fail-closed.
- No CloudBase call, deployment, dependency/key, commit, push, PR, merge or public release occurred. Runtime
  identity remains `UNVERIFIED_RUNTIME_MODEL`; result-page runtime visual evidence remains unclaimed.
- Executor status: `READY_FOR_CONTROLLER_REVIEW`. Current next action is controller inspection of this latest
  worktree/head, latest-head CI and two fresh exact-head independent Reviews; only the controller may decide
  mergeability and Issue status.

## 7.5 Controller local visual verification

- WeChat DevTools rendered an identity-free synthetic two-day WGS84 route on the iPhone 12/13 simulator. The Map was
  visibly nested in the top verdict card with two route segments, start/end indicators and the geometry-only notice;
  no blank shell or overlap was observed.
- The temporary local mount fixture was removed immediately after capture, the normal homepage was rebuilt/restored,
  and no fixture residue remains in source. This is local presentation evidence only—not production geometry,
  deployment, openness, safety, private-data access or release evidence.
- Status remains `READY_FOR_CONTROLLER_REVIEW`. Controller next action: commit/push, Draft PR, exact-head CI and two
  fresh exact-head independent Reviews before any mergeability or Issue-status decision.

## 7. Stop conditions and deliverable

Stop for contract conflict, missing required scope, new dependency/key/service, private-data access, production geometry
fabrication, deployment/runtime mutation, or test evidence that cannot distinguish the frozen behavior.

Return `READY_FOR_CONTROLLER_REVIEW` with handshake, RED/GREEN/mutations, exact changed paths, gates, visual evidence,
data-source truth and remaining limitations. The executor cannot approve, merge, deploy or publish. Latest-head CI and
two fresh independent exact-head Reviews remain controller-owned.
