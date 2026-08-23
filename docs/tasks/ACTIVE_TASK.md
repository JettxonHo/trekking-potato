# ACTIVE TASK — #153 first 25 trusted RouteVariants planning

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-CATALOG-001 / ACTIVE — C15 REVIEW_ACTIVE`
- Milestone: C15 trusted-catalog planning
- GitHub Issue: `#153`
- Status/Mode: `READY_FOR_CONTROLLER_REVIEW / REVIEW`
- Controller: Sol XHigh + human product controller
- Branch/base: `codex/153-route-catalog-25-plan` from exact `main@da25900`
- Executor: exact custom `luna-worker`, configured `gpt-5.6-luna/max`; runtime identity is separate evidence

The human approved a target total of 25 reviewed records. The existing six are five searchable `full` pilots plus one
Wutai restriction record, so completion requires nineteen new searchable `full` variants. This slice plans the
source/evidence ledger and serial batches only. It does not add production route data or promote any candidate.

## 1. Objective

Create the durable 25-slot candidate ledger and the smallest serial child-Issue plan needed to reach the target without
weakening route identity, source rights, opening-status or public-contract evidence.

## 2. Exact allowlist

- new `docs/route-catalog-expansion.md`
- `GOAL.md`
- `docs/current-status.md`
- `docs/governance/MASTER_PLAN.md`
- `docs/decision-log.md`
- `docs/tasks/ACTIVE_TASK.md`

No application, Cloud Function, route-data, test, fixture, package, lockfile, CI, config or deployment file may change
in this planning slice.

## 3. Required ledger fields

Each of 25 slots records canonical Place/Route/RouteVariant identity, existing/new status, source type and URL,
license/authorization basis, geometry status, topology result, direction, official/operator opening-status source,
checked-at date, risk/blocker, batch assignment and promotion verdict. Unknown facts remain unknown.

## 4. Fixed decisions

- Existing six structured pilots count toward the total; legacy builtin names do not.
- Batches are serial and roughly four or five variants each; every batch gets a child Issue, exact allowlist, RED/GREEN
  acceptance and independent Reviews.
- Prefer complete OSM/open-data relations, first-party recordings and explicitly authorized contributor/partner files.
- OSM/track geometry never proves route access, permission, opening, safety, weather or a verdict.
- ODbL attribution and derived-database obligations remain explicit for OSM-derived candidates.
- Disconnected, ambiguous, closed, restricted or rights-unclear candidates remain blocked rather than being promoted.

## 5. Public planning seams and verification

This docs-only slice has no implementation test seam. Its review seams are:

1. ledger completeness: exactly 25 slots and every required field present;
2. truthful source classification: primary URLs and explicit license/authorization state;
3. topology/opening separation: geometry evidence cannot satisfy operational status;
4. duplicate/identity review against existing pilots and legacy aliases;
5. serial child contracts that do not overlap production ownership.

Run Markdown/link checks available in the repository, `git diff --check`, exact allowlist and sensitive-value scans.
Existing focused `test:route-domain`, `test:route-data` and `test:result-page` are baseline/non-regression evidence only.

## 6. Non-scope and stop conditions

- No scraping, cracking or bulk extraction from two-step-road, six-foot, Wikiloc, Strava, AllTrails or similar sources.
- No candidate auto-promotion, generated unreviewed route, private submission/evidence access or public raw track.
- No dependencies, paid APIs, new map keys, schema changes, CloudBase mutation/deploy, timer, deletion or release.
- Stop if a source license, route identity/direction, topology or opening-status claim cannot be supported truthfully.
- Stop before production route-data edits. Planning must merge and the first child Issue must be separately activated.

## 7. Relationship to #123

#123 remains open and independently `BLOCKED_STAGING / HUMAN_RUNTIME_VALIDATION`. C15 does not change its ledger,
authorize runtime actions or claim that community evidence automatically creates a catalog entry.

## 8. Deliverable

Return `READY_FOR_CONTROLLER_REVIEW` with the 25-slot ledger, source-policy decision record, proposed serial child
Issues, exact changed files and verification results. Do not commit, push, open a PR, deploy or publish.

## 9. Planning checkpoint — 2026-08-23

- Ledger artifact: `docs/route-catalog-expansion.md`; exact count is `25 = 6 existing + 19 new`.
- Batch A is the five Yubeng relations; `19700036` is identity-quarantined because its OSM English name conflicts
  with its Chinese name. Batches B–D contain fourteen additional named OSM relation candidates.
- All nineteen new rows are `UNKNOWN`/`BLOCKED_CANDIDATE` for any missing topology, direction, rights or
  official/operator opening source. No unverified row is labeled promoted/full.
- These rows are candidate slots, not delivered routes. A row that cannot pass the full promotion gate must be
  replaced through a controller-reviewed ledger update; it cannot satisfy the 24-searchable-route target while blocked.
- Overpass expansion stopped after rate limiting. The ledger preserves the confirmed candidates and does not invent
  replacements. Child-Issue labels and gates are proposals only; no child Issue was opened.

## 10. Controller next action

Draft PR #154 is open; historical planning head `965afb0` is not a frozen current-head claim. Live GitHub metadata is
authoritative. Require quality CI plus two fresh independent Reviews on the same current head, repeating both gates
after any head change. Do not activate a child evidence Issue or edit runtime route data before this planning PR merges.
