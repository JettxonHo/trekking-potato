# ACTIVE TASK — #155 Yubeng candidate evidence audit

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-CATALOG-001 / ACTIVE — C15-A REVIEW_ACTIVE`
- Milestone: C15-A first trusted-catalog evidence batch
- GitHub Issue: `#155`
- Status/Mode: `READY_FOR_CONTROLLER_REVIEW / REVIEW`
- Controller: Sol XHigh + human product controller
- Branch/base: `codex/155-yubeng-evidence` from exact `main@d36d70a`
- Executor: exact custom `luna-worker`, configured `gpt-5.6-luna/max`; runtime identity is separate evidence

Planning PR #154 merged the 25-slot candidate ledger without promoting any candidate. This serial slice audits five
Yubeng OSM relations and returns evidence verdicts only. It stops before production route-data changes.

## 1. Candidate set

- `19700005` — 雨崩冰湖线
- `19700028` — 雨崩尼色线
- `19700031` — 雨崩神瀑线
- `19700036` — 雨崩神湖线; identity-quarantined because `name:en` conflicts
- `19700085` — 雨崩尼农线

## 2. Exact allowlist

- `GOAL.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`
- `docs/route-catalog-expansion.md`
- `docs/decision-log.md`
- new `docs/yubeng-route-evidence.md`

No application, Cloud Function, runtime route-data fragment, test, fixture, package, lockfile, CI, config, schema or
deployment file may change. Escalate before any scope expansion.

## 3. Required evidence per candidate

1. exact Place/Route/RouteVariant identity, aliases and direction semantics;
2. full OSM member/topology audit with gaps, branches, roles and endpoint order recorded;
3. bounded metrics only if derived from reviewed complete geometry;
4. ODbL attribution/derived-database treatment and durable relation/source links;
5. current first-party scenic-area/government/operator access or opening evidence with checked-at date;
6. explicit blocker and evidence verdict: `ELIGIBLE_FOR_IMPLEMENTATION` or `BLOCKED_CANDIDATE`.

OSM geometry never proves permission, opening, legality, safety, weather or suitability. A candidate with any missing
core field remains blocked. Relation `19700036` cannot leave quarantine until its identity conflict is resolved.

## 4. Research boundary

- Use primary OSM API/relation data for relation identity/topology and official/operator/government sources for access.
- Do not scrape or bulk-download from 两步路、六只脚、Wikiloc, Strava, AllTrails or similar platforms.
- Do not access private community submissions/evidence or copy raw GPX/KML/coordinates into public UI.
- Stop on rate limiting rather than retrying broadly or inventing evidence.

### C15-A evidence checkpoint — 2026-08-23

- Durable report: `docs/yubeng-route-evidence.md`; ledger rows 07–11 reconcile to the five relation IDs and link the
  report.
- Current relation pages/member endpoints provide identity, aliases, `from`/`to` tags and ordered all-way members.
  The OSM full API returned HTTP `429` on the first request, so the full node/way gap/branch/completeness audit is
  `UNKNOWN`; the planning endpoint observation is explicitly preliminary and no metrics were derived.
- A four-agency Deqin County notice dated `2025-10-14`, published/reposted on the Xiaruo Township site on `2026-04-10`,
  blocks matching Binghu/Nise/Shenhu routes. Shenpu and Ninong have no current route-level opening/permit evidence.
  All five rows are `BLOCKED_CANDIDATE`; no route-data edit is authorized.

## 5. Verification and deliverable

- verify exact five-row ledger reconciliation and nonempty evidence fields;
- run repository Markdown/link checks if available, `git diff --check`, exact allowlist and sensitive-value scans;
- rerun focused `test:route-domain`, `test:route-data`, `test:result-page` as non-regression evidence;
- return `READY_FOR_CONTROLLER_REVIEW` with exact sources, verdicts, blockers and changed files.

No commit, push, PR, child Issue, runtime route-data edit, CloudBase action, deployment or release. A later controller-
activated implementation Issue may promote only field-complete candidates after this evidence slice merges.

## 6. Controller next action

Draft PR #156 is open; evidence head `a4ebe74` is historical first-publication evidence only. Live GitHub metadata is
authoritative. Require quality CI plus two fresh independent Reviews on the same current head, repeating both gates
after any head change. Since no candidate is eligible, do not activate a route-data implementation child from this
batch; after merge, choose a reviewed replacement set or the next evidence batch.
