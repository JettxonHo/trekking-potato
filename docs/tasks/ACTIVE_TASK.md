# ACTIVE TASK — #165 final five complete searchable routes

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-CATALOG-001 / ACTIVE — #165 BATCH4_PHASE2_RUNTIME`
- Milestone: C15-F final five-route runtime implementation
- GitHub Issue: `#165`
- Status/Mode: `PHASE2_RUNTIME_IMPLEMENTATION / READY_FOR_CONTROLLER_REVIEW`
- Controller: Sol XHigh + human product controller
- Branch/base: `codex/165-catalog-final-5` from exact `main@7ef1929493989d07f0a683aba1dfcf51837a9ff5`
- Executor: exact custom `luna-worker`, configured `gpt-5.6-luna/max`; runtime identity is separate evidence

PR #160 merged the first five runtime additions as `14830eb`, PR #162 merged the second as `f393c00`, and PR #164
merged the third as `7ef1929` after same-head CI and two Reviews. Controller freeze `5387039704` authorized the final
five runtime additions. The catalog now has twenty-five searchable `full` variants and a final gap of zero; Wutai
remains a separate non-counting restriction.

## Current #165 Phase2 contract — controller freeze `5387039704`

Exactly five complete current-full OSM relations are implemented for controller review: `7065552` v8, `17618981`
v8, `17719174` v3, `18220700` v1 and `18220701` v3. The five fragments retain ordered WGS84 full geometry,
<=500-point previews, first/last-32 runtime node manifests and complete relation/way/node version manifests in
`docs/route-data-licenses.md`. Macau uses region `澳门`; the four Shenzhen routes use `广东省深圳市`. Residential,
track and unclassified members remain disclosed boundaries while `accessMode=walk`.

Each route has exactly one bounded Open-Meteo/Copernicus DEM GLO-90 request (100 cumulative-distance samples including
endpoints, 100/100 response), deterministic Haversine/elevation/duration metrics and route-specific
`operationalStatus=unknown` rationale. ODbL/open_data and trusted-elevation attribution are visible; full geometry
and manifests are omitted from public trip/result DTOs. Runtime reconciliation is `full=25`, `gap=0`; Wutai remains
non-counting.

The current Phase2 allowlist is exactly:

1. `GOAL.md`
2. `cloudfunctions/getAdvice/data/catalog/osm-derived/7065552-coloane-seac-min-pun.js`
3. `cloudfunctions/getAdvice/data/catalog/osm-derived/17618981-kunpeng-section-4.js`
4. `cloudfunctions/getAdvice/data/catalog/osm-derived/17719174-kunpeng-section-20.js`
5. `cloudfunctions/getAdvice/data/catalog/osm-derived/18220700-meilin-country-trail.js`
6. `cloudfunctions/getAdvice/data/catalog/osm-derived/18220701-tanglangshan-country-trail.js`
7. `cloudfunctions/getAdvice/data/catalog/osm-derived/README.md`
8. `cloudfunctions/getAdvice/data/catalog/osm-derived/elevation-source.js`
9. `cloudfunctions/getAdvice/data/catalog/runtime-catalog.js`
10. `cloudfunctions/getAdvice/domain/route-catalog.js`
11. `scripts/result-page-contract-test.js`
12. `scripts/route-data-contract-test.js`
13. `scripts/route-data/osm-derived.test.js`
14. `scripts/route-domain-contract-test.js`
15. `scripts/route-resolver-contract-test.js`
16. `docs/catalog-batch4-source-evidence.md`
17. `docs/current-status.md`
18. `docs/decision-log.md`
19. `docs/governance/MASTER_PLAN.md`
20. `docs/route-catalog-expansion.md`
21. `docs/route-data-licenses.md`
22. `docs/tasks/ACTIVE_TASK.md`

TDD RED was captured before the fragments (`test:route-data` observed `15 !== 20`); the implementation is now
`READY_FOR_CONTROLLER_REVIEW`. No opening/permission/safety/legality fact is inferred, and no commit, push, PR,
merge, deployment or CloudBase action is authorized by this executor.

## Historical #165 Phase1 contract (superseded by the Phase2 freeze above)

Reconfirm the four eligible-but-unselected #163 relations `11816203`, `17147570`, `17147572` and `17147574`; none is
pre-approved. Use at most one metadata-only discovery query and at most twenty additional sequential current-full
reads to find the fifth/replacements, excluding all searchable and previously audited IDs. Requests are at least six
seconds apart with an identifying User-Agent and stop at the first provider throttle without retry or mirror.

Propose exactly five only when identity, connected deterministic topology/direction, mode boundaries and ODbL
provenance pass. Opening, permit and safety remain `UNKNOWN`; geometry never proves them. Phase1 may modify only:

1. `GOAL.md`
2. `docs/current-status.md`
3. `docs/governance/MASTER_PLAN.md`
4. `docs/tasks/ACTIVE_TASK.md`
5. `docs/route-catalog-expansion.md`
6. `docs/decision-log.md`
7. new `docs/catalog-batch4-source-evidence.md`

No runtime, test, schema, elevation, dependency, config, CloudBase, deployment or release file may change before a
live controller comment freezes exact identities and expands the Phase2 allowlist. Deliver five proposals or a
truthful blocker; blocked candidates never count.

## Historical #163 Phase1 contract (completed; superseded)

Audit new China OSM `type=route` + `route=hiking` relations with explicit nonempty `name`, `from` and `to`. Exclude
all searchable and previously audited relations. Use exactly one metadata-only discovery query, then at most twenty
sequential current-full reads, one per relation, at least six seconds apart with an identifying User-Agent. Stop on
the first `429` or provider throttle; do not retry, switch mirrors, scrape third-party route platforms or access
private community evidence.

Propose exactly five only when identity, one connected deterministic traversal, mode boundaries and ODbL provenance
all pass. Opening, permit and safety remain `UNKNOWN`; geometry never proves them. Phase1 may modify only:

1. `GOAL.md`
2. `docs/current-status.md`
3. `docs/governance/MASTER_PLAN.md`
4. `docs/tasks/ACTIVE_TASK.md`
5. `docs/route-catalog-expansion.md`
6. `docs/decision-log.md`
7. new `docs/catalog-batch3-source-evidence.md`

No runtime, test, schema, elevation, dependency, config, CloudBase, deployment or release file may change before a
live controller comment freezes exact identities and expands the Phase2 allowlist. Deliver five proposals or a
truthful blocker; blocked candidates never count.

## Historical #161 record

### #161 Phase1 contract (historical / superseded)

Phase1 is read-only evidence work. Audit a bounded primary-source candidate pool and write
`docs/catalog-batch2-source-evidence.md`. Freeze exactly five only after identity, complete connected walking topology,
deterministic direction/loop semantics, transport-mode separation, ODbL attribution, reproducible source context and a
bounded elevation plan are all explicit. Unknown opening remains unknown; geometry never proves access or safety.

Exact Phase1 allowlist:

1. `GOAL.md`
2. `docs/current-status.md`
3. `docs/governance/MASTER_PLAN.md`
4. `docs/tasks/ACTIVE_TASK.md`
5. `docs/route-catalog-expansion.md`
6. `docs/decision-log.md`
7. new `docs/catalog-batch2-source-evidence.md`

No runtime, test, schema, dependency, config, CloudBase, deployment or release file may change before a live controller
comment freezes the exact five and expands the Phase2 allowlist. Stop on rate limiting and do not scrape third-party
route platforms or access private community evidence. Deliver `READY_FOR_CONTROLLER_REVIEW` with five proposed
identities or a truthful blocker; blocked candidates do not count.

### #161 Phase2 contract — controller freeze `5386435179`

The controller froze exactly five identities. Phase2 may modify only the following 22 paths: `GOAL.md`; the five new
OSM fragments (`18364943-menggu-sangberg.js`, `18364941-black-stone-city-hike.js`,
`19684389-huizhou-dananshan-classic.js`, `19686682-huizhou-dananshan-lahu.js`,
`20072078-maluanshan-nature-notes.js`); `cloudfunctions/getAdvice/data/catalog/osm-derived/README.md`,
`elevation-source.js`; `runtime-catalog.js`; `domain/route-catalog.js`; contract tests
`scripts/result-page-contract-test.js`, `scripts/route-data-contract-test.js`, `scripts/route-data/osm-derived.test.js`,
`scripts/route-domain-contract-test.js`, `scripts/route-resolver-contract-test.js`; and the lifecycle/evidence docs
`docs/catalog-batch2-source-evidence.md`, `docs/current-status.md`, `docs/decision-log.md`,
`docs/governance/MASTER_PLAN.md`, `docs/route-catalog-expansion.md`, `docs/route-data-licenses.md`,
`docs/tasks/ACTIVE_TASK.md`.

Each new variant retains complete ordered current-full OSM geometry, <=500 WGS84 preview points, relation/way/node
version provenance, one <=100-point Open-Meteo/Copernicus elevation request, deterministic metrics and route-specific
`operationalStatus=unknown` rationale. Road/track members are disclosed; no opening, operator, safety or deployment
claim is inferred. TDD RED preceded production edits; focused contracts pass. Handoff is
`READY_FOR_CONTROLLER_REVIEW` with runtime truth `full=15`, `gap=10`, Wutai non-counting.

## #161 Phase1 checkpoint — 2026-08-23

- Report: [`docs/catalog-batch2-source-evidence.md`](../catalog-batch2-source-evidence.md).
- The first new OSM full read (`10548040`) returned HTTP 200 but failed topology/direction gates; the second request
  (`12390533`) returned HTTP `429`. The stop condition was honored without retry or broad replacement search.
- Result is a truthful shortfall: `0/5 PROPOSED_FOR_CONTROLLER_FREEZE`; searchable runtime remains `full=10`,
  `gap=15`, with Wutai outside the count. No candidate, geometry, elevation or metric was promoted.
- Executor status: `READY_FOR_CONTROLLER_REVIEW`; controller direction is required before any renewed research or
  Phase2 allowlist expansion.

## #161 controller-authorized fresh pass checkpoint — 2026-08-23

- Comment `5386298463` permitted only `12390533`, `12390888`, `18731549`, `18731550`, `18952585`, `19017834`,
  `20737376` and `20739619`, each at most once, sequentially with a minimum five-second interval and identifying
  User-Agent. No throttle occurred; the first status-only 200 (`12390533`) was not re-requested.
- No candidate passed all gates: `19017834`/`20739619` lack deterministic named direction, while other rows fail
  topology/order, mixed transport or payload provenance. Result is `0/5 PROPOSED_FOR_CONTROLLER_FREEZE`.
- Report updated at `docs/catalog-batch2-source-evidence.md`; runtime remains `full=10`, `gap=15`, Wutai outside
  the count. No Phase2 allowlist expansion, test/runtime/schema/elevation change or deployment occurred.

## #161 controller-authorized replacement discovery checkpoint — 2026-08-23

- Comment `5386337561` authorized exactly one metadata-only China hiking-relation Overpass query, then at most twenty
  sequential current-full reads with an identifying User-Agent and a six-second interval. The query returned HTTP 200
  with 111 metadata records; all twenty selected full reads returned HTTP 200 and no 429/throttle occurred.
- Exactly five identities are `PROPOSED_FOR_CONTROLLER_FREEZE`: `18364943` 猛古村-桑伯格徒步线路, `18364941` 黑石城徒步,
  `19684389` 惠州大南山精华线, `19686682` 惠州大南山拉胡线 and `20072078` 马峦山自然笔记步道. Each has a
  connected branch-free, orderable two-endpoint graph and an explicit route=hiking walk mode with road boundaries
  disclosed where present. Opening/operator permission remain `UNKNOWN`.
- This remains docs-only Phase1. Searchable runtime stays `full=10`, gap `15`, with Wutai non-counting; no runtime,
  schema, test, elevation, CloudBase, deployment, commit or push action occurred. Handoff is
  `READY_FOR_CONTROLLER_REVIEW`.

## Historical #159 record

### #159 Phase1 candidate set (historical / superseded)

The six-document, discovery-only candidate list below is retained as historical provenance. It was superseded by the
controller's Phase2 freeze (`5385785828`) for the bounded runtime slice. The current frozen set is
`16162196`, `20072118`, `20046643`, `20739620` and `17841828`; the searchable ledger is `full=10` with `gap=15`,
and the Wutai restriction remains non-counting.

- `16162196` — 深圳三杆笔—水祖坑郊野径
- `20072118` — 深圳蝴蝶步道
- `20046643` — 深圳坪惠湿地步道
- `15852438` — 深圳阳台山蕉窝郊野径
- `17841828` — 重庆奉节三峡之巅徒步道

The exact identities, aggregate topology, official context and reject list are in
[`docs/catalog-batch1-source-evidence.md`](../catalog-batch1-source-evidence.md). Every proposal remains
`BLOCKED_PENDING_CONTROLLER_FREEZE`; this document does not promote a route.

## 2. Phase1 exact allowlist (historical / superseded)

- `GOAL.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`
- `docs/route-catalog-expansion.md`
- `docs/decision-log.md`
- new `docs/catalog-batch1-source-evidence.md`

No application, Cloud Function, runtime route data, test, fixture, dependency, config, schema or deployment file may
change. No commit, push, PR, merge, CloudBase or deployment action is authorized in this slice. Escalate before scope
expansion.

## 2A. Historical #159 Phase2 review-fix allowlist (superseded)

The controller-frozen Phase2 runtime review-fix uses this exact 25-path allowlist (including the 20739620 replacement):

1. `GOAL.md`
2. `docs/current-status.md`
3. `docs/governance/MASTER_PLAN.md`
4. `docs/tasks/ACTIVE_TASK.md`
5. `docs/route-catalog-expansion.md`
6. `docs/decision-log.md`
7. `docs/catalog-batch1-source-evidence.md`
8. `docs/route-data-licenses.md`
9. `cloudfunctions/getAdvice/data/catalog/runtime-catalog.js`
10. `cloudfunctions/getAdvice/domain/route-catalog.js`
11. `scripts/route-data-contract-test.js`
12. `scripts/route-domain-contract-test.js`
13. `scripts/route-resolver-contract-test.js`
14. `scripts/result-page-contract-test.js`
15. `scripts/route-data/osm-derived.test.js`
16. `taro-app/src/pages/index/index.jsx`
17. `taro-app/src/pages/index/index.css`
18. `cloudfunctions/getAdvice/data/catalog/osm-derived/README.md`
19. `cloudfunctions/getAdvice/data/catalog/osm-derived/common.js`
20. `cloudfunctions/getAdvice/data/catalog/osm-derived/elevation-source.js`
21. `cloudfunctions/getAdvice/data/catalog/osm-derived/16162196-sanganbi-shuizukeng.js`
22. `cloudfunctions/getAdvice/data/catalog/osm-derived/17841828-three-gorges-summit.js`
23. `cloudfunctions/getAdvice/data/catalog/osm-derived/20046643-pinghui-wetland-trail.js`
24. `cloudfunctions/getAdvice/data/catalog/osm-derived/20072118-die-butterfly-trail.js`
25. `cloudfunctions/getAdvice/data/catalog/osm-derived/20739620-zhaogongshan-loop.js`

The current review-fix may change only these paths. It does not authorize dependency, CloudBase, deployment, release,
commit, push or PR actions; any required scope expansion must be escalated before editing.

## 2B. Current #161 Phase2 implementation allowlist — controller freeze `5386435179`

The active #161 Phase2 slice supersedes the historical #159 list above. Its exact paths are: `GOAL.md`; the five new
OSM fragments under `cloudfunctions/getAdvice/data/catalog/osm-derived/` (`18364943-menggu-sangberg.js`,
`18364941-black-stone-city-hike.js`, `19684389-huizhou-dananshan-classic.js`,
`19686682-huizhou-dananshan-lahu.js`, `20072078-maluanshan-nature-notes.js`); `README.md`; `elevation-source.js`;
`runtime-catalog.js`; `domain/route-catalog.js`; tests `scripts/result-page-contract-test.js`,
`scripts/route-data-contract-test.js`, `scripts/route-data/osm-derived.test.js`,
`scripts/route-domain-contract-test.js`, `scripts/route-resolver-contract-test.js`; and lifecycle/evidence docs
`docs/catalog-batch2-source-evidence.md`, `docs/current-status.md`, `docs/decision-log.md`,
`docs/governance/MASTER_PLAN.md`, `docs/route-catalog-expansion.md`, `docs/route-data-licenses.md`,
`docs/tasks/ACTIVE_TASK.md`.

No dependency, config, UI production, CloudBase, deployment, release, commit, push or PR action is authorized. The
five fragments must preserve complete current-full geometry, <=500-point previews, ODbL provenance/version manifests,
one <=100-point Open-Meteo/Copernicus elevation request, deterministic metrics, route-specific unknown-status rationale
and disclosed road/track members. Handoff is `READY_FOR_CONTROLLER_REVIEW` with `full=15`, `gap=10`, Wutai
non-counting.

## 3. Evidence contract

For each candidate record exact identity/aliases/direction; aggregate topology/gaps/branches/duplicate refs; metrics
only from complete reviewed geometry; ODbL attribution/derived-database treatment; and current first-party/operator
access/opening evidence with checked-at date. Separate walking paths from cableway, shuttle and road segments.

Verdict is `ELIGIBLE_FOR_IMPLEMENTATION` only if every core field is complete. Otherwise keep `BLOCKED_CANDIDATE`.
Geometry never proves permission, opening, safety, weather or suitability.

## 4. Research and safety boundary

- Use primary OSM data for identity/topology and official scenic-area/operator/government sources for access.
- Do not scrape/bulk-download third-party route platforms or access private community evidence.
- Do not copy raw geometry/coordinates into public UI or infer metrics from incomplete data.
- Stop on rate limiting instead of retrying broadly or inventing evidence.

## 5. Verification and deliverable

- reconcile exact five ledger rows to the evidence report;
- run available Markdown/link checks, `git diff --check`, exact allowlist and sensitive scans;
- rerun `test:route-domain`, `test:route-data`, `test:result-page` as non-regression evidence;
- return `READY_FOR_CONTROLLER_REVIEW` with sources, verdicts, blockers and changed files.

### C15-C discovery checkpoint — 2026-08-23

- The bounded full-relation pass stopped after twenty reads (one duplicate verification), without retrying a rate-limited
  endpoint.
- Exactly five proposed identities are recorded in `docs/catalog-batch1-source-evidence.md`; all remain
  `BLOCKED_PENDING_CONTROLLER_FREEZE` and `operationalStatus=UNKNOWN` until a controller freezes the set and a later
  child Issue closes identity, topology, direction, rights, opening and public-contract gates.
- Aggregate topology for the five proposals is connected, branch-free and duplicate-reference-free in this pass; road,
  cableway and shuttle members are excluded or separately labeled. Ordered-member gaps and missing route tags are not
  silently promoted to a direction or opening claim.
- No commit, push, PR, runtime edit, CloudBase action, deployment or release was performed.

### Historical C15-B evidence checkpoint — 2026-08-23

- `docs/scenic-route-evidence.md` is the durable report for rows 12–16. One primary OSM full-relation read per row
  succeeded; ordered way IDs/roles and endpoint/graph summaries are recorded without copying raw geometry.
- Huangshan, Taishan and Sanqing contain duplicate way refs; ordered endpoint gaps occur in all five (5/15/12/1/1),
  and Taishan has four graph components. General operator/government pages establish entrances, cableways, shuttles,
  road access or area controls only. Sanqing operator ticket/cableway HTTPS was not TLS-reproducible during Review and
  is excluded from verified primary evidence; HTTP was not used as a substitute. None proves the exact OSM walking
  relation is complete and currently permitted.
- The two Emei relations share a stem but diverge in the middle way sequence and remain distinct. ODbL attribution and
  derived-database treatment remain unresolved. All five verdicts are `BLOCKED_CANDIDATE`; no runtime child is opened.
- Local baseline and handoff checks are green: `test:route-domain`, `test:route-data`, `test:result-page`,
  `git diff --check`. Exact allowlist/sensitive scans and 25-row reconciliation remain required before handoff.

The executor performed no commit, push, PR, child Issue, runtime route-data edit, CloudBase action, deployment or
release. The controller subsequently published Draft PR #158. A later separately activated implementation Issue may
promote only field-complete candidates after this evidence slice merges.

## Historical C15-B controller next action

Draft PR #158 is open; evidence head `7fcdd48` is historical first-publication evidence only. Live GitHub metadata is
authoritative. Require same-current-head quality CI plus two fresh independent Reviews. No candidate is eligible, so
do not activate a route-data implementation child from this batch; after merge, select reviewed replacements or the
next evidence batch.

### Phase2 implementation handoff — Issue #159 / controller freeze 5385785828

- Runtime slice is limited to the frozen five IDs: 16162196 complete relation (17.088 km), 20072118 (朴树口 → 马峦山北门), 20046643 (聚龙山湿地生态园北门 → 坪山湿地公园南门), 20739620 complete loop with disclosed residential member, and 17841828 (赤甲楼方向入口 → 三峡之巅).
- Each variant has complete ordered WGS84 geometry, ≤500-point preview, deterministic distance/elevation/ascent/descent/highest/duration, open_data/ODbL and applicable official/trusted-api provenance. Operational status stays unknown.
- Runtime data contains no elevation network/provider key or query URL; one bounded Open-Meteo research request per route is documented. Focused gates pass; executor handoff is `READY_FOR_CONTROLLER_REVIEW` and no merge/deploy/release is implied.

### Phase2 bounded review-fix checkpoint — 2026-08-23

- Initial typecheck RED was captured with exactly two errors: `official` was inferred as required for the optional 207
  fragment source, and post-assignment `operationalStatusRationale` was absent from the normalized variant inference.
  Both were repaired minimally at the shared seam.
- Unknown-status exemption is restricted to `routeGeometry` + `open_data` + non-empty rationale. Existing source
  evidence behavior remains unchanged; missing rationale and reviewed-geometry/opening-source mutations are RED.
- OSM source supports now cover only relation-backed identity/topology fields; Open-Meteo/Copernicus explicitly
  supports the elevation component joined into routeGeometry. 207's endpoint is neutral/unnamed and its broad alias
  is removed; 161 is the complete relation without the historical mainline alias; 20046643 official context does not
  claim variant endpoints.
- UI attribution separates OSM/ODbL (`openstreetmap.org/copyright`) from the exact trusted elevation source gate.
- Validation: focused contracts, root `npm test`, offline integration `55/0`, lint 0 errors/9 existing warnings,
  typecheck, host WeChat build, root audit, diff-check, allowlist and sensitive scans pass. Cloud Function audit
  exposes pre-existing transitive vulnerabilities requiring an out-of-scope dependency upgrade. No commit, push, PR,
  deploy or CloudBase action occurred.

## #163 Batch3 Phase1 completion checkpoint — 2026-08-23

- The one authorized metadata-only Overpass query returned HTTP 200 with 111 tagged `route=hiking` relations. After
  excluding the 55 IDs already searchable or audited in prior reports, 74 new rows remained. Twenty and only twenty
  current-full OSM reads were performed once each, sequentially with an identifying User-Agent and at least six seconds
  between starts; all returned HTTP 200, with no 429/throttle and no retry or alternate source.
- Exactly five identities are `PROPOSED_FOR_CONTROLLER_FREEZE`: `7060545` 路環步行徑, `7060546` 黑沙水庫家樂徑,
  `7060560` 黑沙水庫健康徑, `17147571` 沙田郊野徑 (港鐵火炭站 → 城門郊野公園), and `17147573` 沙田郊野徑
  (沙田圍 → 沙田坳). Aggregate evidence, selected alternates and blocked rows are in
  `docs/catalog-batch3-source-evidence.md`; no raw geometry was copied.
- This remains Phase1 evidence-only. Runtime stays searchable `full=15`, remaining gap `10`, and Wutai remains a
  separate non-counting restriction. No runtime/test/schema/elevation/CloudBase/deploy/commit/push/PR work occurred.
  Executor status: `READY_FOR_CONTROLLER_REVIEW`.

## Historical #163 Phase2 implementation allowlist — controller freeze `5386726512` / correction `5386727268` (superseded)

The controller expanded the allowlist to exactly these 22 paths for the bounded runtime slice:

1. `GOAL.md`
2. `cloudfunctions/getAdvice/data/catalog/osm-derived/7060545-coloane-trail.js`
3. `cloudfunctions/getAdvice/data/catalog/osm-derived/7060546-hac-sa-reservoir-family-trail.js`
4. `cloudfunctions/getAdvice/data/catalog/osm-derived/7060560-hac-sa-reservoir-fitness-trail.js`
5. `cloudfunctions/getAdvice/data/catalog/osm-derived/17147571-sha-tin-fotan-shing-mun.js`
6. `cloudfunctions/getAdvice/data/catalog/osm-derived/17147573-sha-tin-wai-pass.js`
7. `cloudfunctions/getAdvice/data/catalog/osm-derived/README.md`
8. `cloudfunctions/getAdvice/data/catalog/osm-derived/elevation-source.js`
9. `cloudfunctions/getAdvice/data/catalog/runtime-catalog.js`
10. `cloudfunctions/getAdvice/domain/route-catalog.js`
11. `scripts/result-page-contract-test.js`
12. `scripts/route-data-contract-test.js`
13. `scripts/route-data/osm-derived.test.js`
14. `scripts/route-domain-contract-test.js`
15. `scripts/route-resolver-contract-test.js`
16. `docs/catalog-batch3-source-evidence.md`
17. `docs/current-status.md`
18. `docs/decision-log.md`
19. `docs/governance/MASTER_PLAN.md`
20. `docs/route-catalog-expansion.md`
21. `docs/route-data-licenses.md`
22. `docs/tasks/ACTIVE_TASK.md`

The historical freeze covered relations `7060545` v11, `7060546` v10, `7060560` v7, `17147571` v1 and `17147573` v6.
Complete ordered relation geometry was required; full point manifests were retained in `docs/route-data-licenses.md`,
while runtime node manifests were bounded first/last 32. Each route had exactly one bounded Open-Meteo/Copernicus
DEM GLO-90 request (<=100 cumulative-distance samples, endpoints included), deterministic Haversine/DEM metrics and
duration, OSM/ODbL attribution, route-specific `operationalStatus=unknown` rationale and no official opening claim.
Macau variants used region `澳门`; Hong Kong variants used region `香港`. The two Sha Tin variants shared bare
canonical `沙田郊野徑` (confirmation) and used only direct endpoint-qualified aliases. Full `routeGeometry` was
internal and did not cross the trip/result DTO seam; `routePreview` was the bounded public projection.

TDD RED was captured before production edits (`npm run test:route-data` observed `10 !== 15`); focused
route-domain/data/resolver/result contracts then passed. At that checkpoint, runtime truth was `full=20`, `gap=5`,
and Wutai remained non-counting. No dependency, CloudBase, deployment, commit, push or PR action was authorized in
that handoff. Executor status was `READY_FOR_CONTROLLER_REVIEW`.

## Historical Issue #165 Phase1 evidence handoff — final five (2026-08-24; superseded by Phase2)

- Scope was evidence/docs-only on `codex/165-catalog-final-5` from `main@7ef1929493989d07f0a683aba1dfcf51837a9ff5`.
  The exact seven-path Phase1 allowlist is this file, `GOAL.md`, `docs/current-status.md`,
  `docs/governance/MASTER_PLAN.md`, `docs/route-catalog-expansion.md`, `docs/decision-log.md` and the new
  `docs/catalog-batch4-source-evidence.md`; runtime, tests, schema, elevation, dependency, CloudBase and deployment
  files remain forbidden.
- Four #163 alternates were re-read once; one metadata-only Overpass query returned 111 rows and exactly twenty new
  current-full relation reads then completed once each with an identifying User-Agent and six-second minimum interval.
  All responses were HTTP 200, with no throttle/retry. No raw geometry, third-party/private evidence or elevation
  request was used.
- Exactly five uncounted identities were **`PROPOSED_FOR_CONTROLLER_FREEZE`**: `7065552`, `17618981`, `17719174`,
  `18220700` and `18220701`. Each was connected, branch-free and order-safe with deterministic named endpoints;
  disclosed road/track members do not become vehicle transport. All opening, permission, safety, legal and ODbL
  derived-database facts remain `UNKNOWN`. Other clean rows are explicit alternates; blocked rows are not counted.
- At that historical checkpoint, runtime truth was searchable `full=20`, gap `5`; Wutai was separate and
  non-counting. Handoff was **`READY_FOR_CONTROLLER_REVIEW`**. No Phase 2 allowlist or implementation authority was
  implied.
