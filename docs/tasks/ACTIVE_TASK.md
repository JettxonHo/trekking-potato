# ACTIVE TASK — #159 Phase2 runtime catalog batch-1 review-fix

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-CATALOG-001 / ACTIVE — #159 PHASE2_REVIEW_FIX`
- Milestone: C15-C batch-1 topology-first discovery freeze / Phase2 runtime review-fix
- GitHub Issue: `#159`
- Status/Mode: `READY_FOR_CONTROLLER_REVIEW / PHASE2_REVIEW_FIX`
- Controller: Sol XHigh + human product controller
- Branch/base: `codex/159-catalog-batch1-5` from exact `main@cb50fd97b5b3333e7800a58538cc42d7fb4caf27`
- Executor: exact custom `luna-worker`, configured `gpt-5.6-luna/max`; runtime identity is separate evidence

The live #159 instruction supersedes stale 24-full-plus-Wutai wording. The corrected ledger remains exactly 25 searchable
`full` slots (five existing + twenty missing/replacement); current Phase2 runtime has ten searchable `full` variants
(five existing + five frozen batch variants), leaving a remaining gap of fifteen. Wutai is a separate non-counting
restriction. This handoff covers the bounded Phase2 review-fix and remains subject to controller review; it does not
imply deployment or release.

## 1. Candidate set

- `16162196` — 深圳三杆笔—水祖坑郊野径
- `20072118` — 深圳蝴蝶步道
- `20046643` — 深圳坪惠湿地步道
- `15852438` — 深圳阳台山蕉窝郊野径
- `17841828` — 重庆奉节三峡之巅徒步道

The exact identities, aggregate topology, official context and reject list are in
[`docs/catalog-batch1-source-evidence.md`](../catalog-batch1-source-evidence.md). Every proposal remains
`BLOCKED_PENDING_CONTROLLER_FREEZE`; this document does not promote a route.

## 2. Exact allowlist

- `GOAL.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`
- `docs/route-catalog-expansion.md`
- `docs/decision-log.md`
- new `docs/catalog-batch1-source-evidence.md`

No application, Cloud Function, runtime route data, test, fixture, dependency, config, schema or deployment file may
change. No commit, push, PR, merge, CloudBase or deployment action is authorized in this slice. Escalate before scope
expansion.

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
