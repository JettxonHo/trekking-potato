# ACTIVE TASK — #123 remaining staging validation (C14 merged)

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — BLOCKED_STAGING`
- Milestone: remaining staging evidence under community-track evidence (#115)
- GitHub Issue: `#123`
- Status/Mode: `BLOCKED_STAGING / HUMAN_RUNTIME_VALIDATION`
- Controller: Sol XHigh + human operator
- Branch/base: C14 merged to exact `main@131e616`; no active implementation branch
- Executor: none active; any new bounded implementation requires exact custom `luna-worker`, configured
  `gpt-5.6-luna/max`, while runtime identity remains separate evidence

Current authority: C14/#150 is code-complete through PR #151 and this documentation closeout only reconciles that
fact. Active execution is limited to the human-controlled #123 staging ledger. S8–S15/S20 remain `BLOCKED`, and
S16/S18 remain `UNVERIFIED_RUNTIME_TOOL`.

## 1. Objective

Complete the remaining truthful staging-validation rows for the private community-track workflow without weakening
the existing privacy, authority, retention or Option-A boundaries. Code readiness, local tests and merged pull
requests are evidence, but they do not substitute for direct runtime observations.

## 2. Authoritative evidence

- `docs/community-track-staging-validation.md` is the row-by-row runtime evidence ledger.
- A row changes only from direct, sanitized runtime evidence matching its stated proof requirement.
- Existing verified S1–S7/S17 evidence remains unchanged.
- S8–S15/S20 remain `BLOCKED`; S16/S18 remain `UNVERIFIED_RUNTIME_TOOL`.
- Partial screenshots, local builds, synthetic tests or successful CI do not promote a runtime row.

## 3. Human-controlled remaining work

1. Record timer timezone/schedule and server-owned timer authority.
2. Prove normal-client and forged-event cleanup attempts fail closed.
3. Run the authorized retention dry-run before any destructive cleanup enablement.
4. Verify duplicate delivery, maximum-20 batches, backlog drain, rollback and residue handling.
5. Obtain real WeChat runtime evidence for Option-A presentation and the owner/admin private flow.
6. Keep production/public release and route-catalog promotion blocked unless separately authorized.

Each CloudBase collection/index/rule/env/function/timer mutation or destructive action requires the human authority
defined by #123 and the staging ledger. This file does not grant it.

## 4. Frozen privacy and safety boundaries

- Private raw GPX/KML remains owner/admin-only and is never a public route artifact.
- Option A exposes normalized summary, keyless evidence and at most 500 preview points; no raw presentation/export.
- Community tracks never prove opening, access, permission, route type, fixed days, weather safety or a verdict.
- No automatic Place/Route/RouteVariant creation or catalog promotion.
- No production/public release, real-user cohort invitation, cleanup enablement or deletion is authorized here.
- Secrets, OpenIDs, file IDs, storage paths, coordinates and private payloads must not enter durable evidence.

## 5. C14 completion record

- PR #151 final exact head `79866a8` passed quality run `32570414955` and two fresh exact-head independent Reviews
  with no P0–P3 finding, then squash merged as `131e616`.
- History now uses owner-bound, bounded keyset pagination with explicit `加载更多`; the public HistoryItem fields
  remain unchanged and malformed cursors fail before storage reads.
- This proves reviewed code behavior only. No history Cloud Function deployment, CloudBase index/config/data mutation,
  real history access, delete/clear invocation or client release occurred.
- #150 may close after this documentation-only reconciliation merges.

## 6. Stop and next action

Stop before any runtime mutation not explicitly authorized by the human controller. Do not dispatch an implementation
executor while the active state remains `BLOCKED_STAGING / HUMAN_RUNTIME_VALIDATION`.

Next action: merge the documentation-only C14 closeout, close #150, then continue #123 row by row under its live
human gates. Goal completion remains blocked until the authoritative ledger supports it.
