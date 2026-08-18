# ACTIVE TASK — #123 community-track staging completion

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — BLOCKED_STAGING`
- Milestone: `TP-COMMUNITY-001 Community track evidence` (#8)
- GitHub Issue: `#123` (parent `#115` remains open; focused Bug #134 is closed)
- Status/Mode: `READY_FOR_CONTROLLER_REVIEW / DOCUMENTATION_RECONCILIATION`
- Controller: Sol XHigh + human operator
- Branch/base: `codex/123-s7-staging-evidence` from `main@ac600e5`
- Runtime model: configuration is `luna-worker` / `gpt-5.6-luna` / `max`; runtime identity remains
  `UNVERIFIED_RUNTIME_MODEL`

## 1. Objective and current truth

Synchronize the authoritative staging ledger after direct sanitized evidence closed the #134 finalize blocker and
completed the remaining S3/S7 runtime rows. This is a documentation-only reconciliation. It must not modify application
or Cloud Function code, dependencies, CloudBase data/configuration, indexes, timers or deployment state.

PR #135 merged the reviewed diagnostic-free finalization/CAS fix to `main@ac600e5`. On 2026-08-19, anonymous synthetic
staging evidence then verified:

- private administrator list/detail;
- one exact `pending_review -> rejected` transition and owner synchronization;
- one exact `awaiting_upload -> cancelled` transition and owner synchronization;
- recovery of one processing lease stale beyond five minutes through one authenticated owner finalize invocation;
- resulting owner list/detail and database agreement on `pending_review`, no processing lease and a 2-point / 1-segment
  normalized summary;
- all six required indexes with exact field order, direction and unique/non-unique property.

No real identity/location, timer, public/production release or broad cleanup was involved. Only the two exact synthetic
cleanup actions previously authorized by the human were performed. Sanitized evidence is recorded in live #123/#134;
#134 is closed. S3a–S3f and S7 are `VERIFIED`.

## 2. Exact documentation allowlist

- `GOAL.md`
- `docs/community-track-staging-validation.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

No production code, test, dependency, lockfile, CloudBase configuration or other document may change in this increment.

## 3. Frozen evidence and privacy contract

- Record only statuses, bounded counts, field names/order/direction/uniqueness and sanitized workflow outcomes.
- Never record OpenID, submission/attempt/file IDs, storage paths/hosts, signed URLs, request IDs, credentials, private
  inputs, raw bytes, coordinates or provider messages.
- Preserve the distinction between merged code, staging deployment, direct runtime evidence, real-device evidence,
  timer/cleanup authorization and production/public release.
- Do not rewrite historical failed checkpoints; add the latest closure checkpoint and update only current pointers.
- Do not mark a row `VERIFIED` without direct evidence supporting the whole stated row.

## 4. Remaining staging rows

- `S8–S15`: `BLOCKED`. These cover timer schedule/authority, forged-client rejection, retention dry-run, duplicate
  delivery, max-20 backlog, rollback/residue checks and destructive cleanup enablement.
- `S16` and `S18`: `UNVERIFIED_RUNTIME_TOOL`. A build or DevTools simulator is not a real-device claim.
- `S20`: `BLOCKED` and outside #123. Production/public release and catalog/public-UGC promotion require a separate
  controller/human Issue.

Read-only inspection may proceed without mutating external state. Any timer creation/enablement, destructive cleanup,
data deletion beyond an already exact authorized synthetic action, real-user invitation or production/public release
must stop at its separate human gate.

## 5. Execution order for this increment

1. Preserve the clean merged base and create the docs-only #123 evidence branch.
2. Reconcile S3a–S3f and S7 to `VERIFIED` with sanitized direct evidence.
3. Update Goal/current-status/active-task pointers so #123, not closed #134, is the only active community-track task.
4. Run Markdown/diff/privacy/allowlist checks.
5. Commit, push and publish a draft PR for Sol XHigh Review. Passing checks do not authorize merge.
6. After merge, continue remaining staging rows serially. Read-only timer configuration inspection may be planned next;
   timer invocation, retention deletion and cleanup enablement remain separate controlled actions.

## 6. Non-scope and stop conditions

No code or test change; no function deployment/invocation; no collection/index/rule/env mutation; no timer enablement;
no retention cleanup; no production/public release; no route catalog mutation; no raw viewer/export; no real-user data.
Stop on any need to widen beyond the four documentation paths or to claim runtime/device evidence not directly observed.

## 7. Deliverable

Return `READY_FOR_CONTROLLER_REVIEW` with the exact four-file diff, sanitized runtime evidence, documentation/diff/
privacy/allowlist checks and the remaining blocked rows. Sol XHigh owns independent Review, mergeability and the next
runtime authorization boundary. The Goal and #123/#115 remain open.
