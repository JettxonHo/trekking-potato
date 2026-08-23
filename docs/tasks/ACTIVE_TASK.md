# ACTIVE TASK — #157 scenic-area route candidate evidence audit

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-CATALOG-001 / ACTIVE — C15-B REVIEW_ACTIVE`
- Milestone: C15-B scenic-area evidence batch
- GitHub Issue: `#157`
- Status/Mode: `READY_FOR_CONTROLLER_REVIEW / REVIEW`
- Controller: Sol XHigh + human product controller
- Branch/base: `codex/157-scenic-evidence` from exact `main@50d3a0e`
- Executor: exact custom `luna-worker`, configured `gpt-5.6-luna/max`; runtime identity is separate evidence

Planning PR #154 merged the ledger; PR #156 proved all five Yubeng candidates blocked. This serial evidence slice
audits ledger rows 12–16 and stops before any runtime route-data change.

## 1. Candidate set

- `18970848` — 黄山路线（OSM `from=云谷寺`, `to=慈光阁`）
- `19818868` — 泰山红门登山道
- `18970781` — 三清山路线
- `13567761` — 峨眉山登顶路（经万年寺）
- `13567762` — 峨眉山登顶路（经一线天）

## 2. Exact allowlist

- `GOAL.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`
- `docs/route-catalog-expansion.md`
- `docs/decision-log.md`
- new `docs/scenic-route-evidence.md`

No application, Cloud Function, runtime route data, test, fixture, dependency, config, schema or deployment file may
change. Escalate before scope expansion.

## 3. Evidence contract

For each candidate record exact identity/aliases/direction; full ordered topology/gaps/branches; metrics only from
complete reviewed geometry; ODbL attribution/derived-database treatment; and current first-party scenic-area/operator
access/opening evidence with checked-at date. Separate walking paths from cableway, shuttle and road segments. The two
Emei relations remain distinct unless primary evidence proves otherwise.

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

### C15-B evidence checkpoint — 2026-08-23

- `docs/scenic-route-evidence.md` is the durable report for rows 12–16. One primary OSM full-relation read per row
  succeeded; ordered way IDs/roles and endpoint/graph summaries are recorded without copying raw geometry.
- Huangshan, Taishan and Sanqing contain duplicate way refs; ordered endpoint gaps occur in all five (5/15/12/1/1),
  and Taishan has four graph components. General operator/government pages establish entrances, cableways, shuttles,
  road access or area controls only; none proves the exact OSM walking relation is complete and currently permitted.
- The two Emei relations share a stem but diverge in the middle way sequence and remain distinct. ODbL attribution and
  derived-database treatment remain unresolved. All five verdicts are `BLOCKED_CANDIDATE`; no runtime child is opened.
- Local baseline and handoff checks are green: `test:route-domain`, `test:route-data`, `test:result-page`,
  `git diff --check`. Exact allowlist/sensitive scans and 25-row reconciliation remain required before handoff.

No commit, push, PR, child Issue, runtime route-data edit, CloudBase action, deployment or release. A later separately
activated implementation Issue may promote only field-complete candidates after this evidence slice merges.

## 6. Controller next action

Draft PR #158 is open; evidence head `7fcdd48` is historical first-publication evidence only. Live GitHub metadata is
authoritative. Require same-current-head quality CI plus two fresh independent Reviews. No candidate is eligible, so
do not activate a route-data implementation child from this batch; after merge, select reviewed replacements or the
next evidence batch.
