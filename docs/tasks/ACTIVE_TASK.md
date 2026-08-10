# ACTIVE TASK — #123 community-track staging evidence

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — BLOCKED_STAGING`
- Milestone: `TP-COMMUNITY-001 Community track evidence` (#8)
- GitHub Issue: `#123`
- Status/Mode: `BLOCKED_STAGING / HUMAN_RUNTIME_VALIDATION`
- Controller: Sol XHigh + human operator
- Base: `main@86fafb6`
- Dependency status: C01–C07 code/UI work is merged; #131 is closed

## 1. Current objective

Complete only the remaining sanitized staging evidence in
`docs/community-track-staging-validation.md`. This task does not authorize production/public release, route-catalog
promotion, raw-track viewing/export, real-user invitation or destructive cleanup.

## 2. Authoritative staging boundary

The durable source of truth is `docs/community-track-staging-validation.md`. It currently marks S1–S15/S20
`BLOCKED` and S16–S18 `UNVERIFIED_RUNTIME_TOOL`. A controller comment reported partial console/runtime observations,
but those observations have not been reconciled against each row's exact evidence requirement and therefore do not
promote any row. Secret, OpenID and storage-host values must not be written to Git, GitHub or chat.

C07 PR #132 passed latest-head quality and two independent exact-head Reviews, squash merged as `86fafb6`, and #131
closed after merge confirmation. Its tests and DevTools rendering are code/UI evidence only, not staging upload,
review, deletion, timer or production evidence.

## 3. Remaining blocking evidence

- First reconcile collection, exact index, storage-host, administrator allowlist, timeout and DevTools observations
  row-by-row. “Non-empty env” does not prove exact S4/S5, and a compile does not prove S17 import/render.
- Upload a bounded GPX/KML through the real staging client and verify owner begin/upload/finalize/list/detail.
- Exercise allowlisted administrator `request_changes`, `reject` and `approve_evidence` without exposing identity,
  raw paths, OpenIDs or evidence-store keys.
- Verify cancellation, deletion-pending recovery, parser failure and lease recovery with sanitized logs.
- Record the daily timer schedule/timezone and prove server-owned `TRIGGER_SRC=timer` authority with empty server
  OpenID; reject normal-client and forged-event attempts.
- Run retention dry-run before any destructive action, then verify duplicate delivery, max-20 backlog drain,
  rollback and orphan/residue checks.
- Keep destructive cleanup disabled until every prerequisite above passes and the human explicitly authorizes it.
- Record normal WeChat runtime/device evidence for TP-D056 Option A: summary/preview only and zero raw presentation.
- Preserve every untouched row's current `BLOCKED` or `UNVERIFIED_RUNTIME_TOOL` status, including S20.

## 4. Evidence rules

- Update each affected S-row in `docs/community-track-staging-validation.md` only from direct human/runtime evidence.
- Use exactly `VERIFIED`, `BLOCKED` or `UNVERIFIED_RUNTIME_TOOL`; never promote a row from local tests or inference.
- Sanitize screenshots and logs. Do not record secret values, OpenIDs, storage hosts, signed URLs or private file IDs.
- A failed delete remains deletion-pending; do not claim cleanup complete while any due backlog or residue remains.
- Community evidence cannot establish route opening, safety, fixed days, weather, verdict or catalog publication.

## 5. Stop conditions

Stop before production/public release, destructive cleanup enablement, real-user invitation, route publication,
raw-file viewer/export, schema/API/product expansion or any action outside the separately approved staging row. A new
code defect or product choice requires a new focused Issue and allowlist.

## 6. Completion boundary

The current status is `BLOCKED_STAGING`, not code failure. After the remaining runtime rows are truthfully verified,
Sol must obtain fresh review of the sanitized evidence and an explicit human decision before closing #123 or parent
#115. Until then the Goal remains active and no production-readiness claim is allowed.
