# ACTIVE TASK — C03 fail-closed administrator review and retention

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — C03 REVIEW_ACTIVE`
- Milestone: `TP-COMMUNITY-001 Community track evidence` (#8)
- GitHub Issue: `#120`
- Status/Mode: `READY_FOR_CONTROLLER_REVIEW / REVIEW`
- Controller: Sol XHigh
- Implementation executor: exact custom Agent `luna-worker`
- Branch: `codex/120-track-admin-retention`
- Base: `main@75fcd92`
- Dependency: C02/#119 completed through approved PR #125 (`75fcd92`)

## 1. Objective

Implement fail-closed administrator list/detail/review, a key-isolated de-identified reviewed-evidence record and the
internal 30/180-day retention cleanup branch. Approval creates only `community_track_candidate`; it never publishes a
route, changes operational status or assigns tier B.

## 2. Required reading

Read the mandatory governance sequence, live #115/#120, `docs/community-track-workflow.md` §§5–10 and
`docs/development-plan.md` C03. `TRACK-SUBMISSION-1` remains the authority for modes, errors, exact DTOs, records,
state/action order, retention, deletion-pending behavior and tests.

## 3. Exact allowlist

- `cloudfunctions/trackSubmission/index.js`
- `cloudfunctions/trackSubmission/package.json`
- `cloudfunctions/trackSubmission/package-lock.json`
- `cloudfunctions/trackSubmission/response-contract.js`
- `cloudfunctions/trackSubmission/owner-service.js` (controller-approved expiry-contract correction only)
- `cloudfunctions/trackSubmission/storage-adapter.js` (controller-approved raw-TTL correction only)
- new `cloudfunctions/trackSubmission/admin-service.js`
- `cloudfunctions/trackSubmission/submission-repository.js`
- `cloudfunctions/trackSubmission/submission-lifecycle.js`
- new `cloudfunctions/trackSubmission/reviewed-evidence.js`
- new `cloudfunctions/trackSubmission/retention.js`
- root `package.json`
- new `scripts/track-admin-contract-test.js`
- new `scripts/track-retention-contract-test.js`
- `scripts/track-owner-contract-test.js` (controller-approved expiry regression only)
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

No other file may change without a controller-owned contract update.

## 4. Non-scope

Frontend/user/admin UI, deployment, real CloudBase collection/index/rule/env/timer mutation, production cleanup,
public raw URL, client admin flags, catalog writes/tier assignment, owner identity disclosure, new auth, new dependency,
parser changes, URL/KMZ import, third-party scraping and changes to the merged C02 owner contract except the exact
post-expiry revision correction frozen below.

## 5. Frozen constraints

- Parse exact server-only comma-separated `TRACK_REVIEW_ADMIN_OPENIDS`; missing, blank or malformed configuration
  fails `admin_not_configured`. Authorization uses only server `getWXContext().OPENID`; forged event roles/openids
  have zero side effects. Values never enter DTO, record, log or error detail.
- Expose only the C03 additions `admin_list`, `admin_get` and `admin_review` through the existing handler. Internal
  retention dispatch is not a public mode and requires server-owned `TRIGGER_SRC='timer'` plus empty server OpenID.
- `admin_list/admin_get` use exact admin DTOs, status/action order, server-side cursor/limit filters and logical expiry.
  Owner OpenID, rights/provenance, file IDs/paths, temporary URLs, evidence keys and raw coordinates outside the exact
  reviewed display projection never leak.
- Raw access is an explicit administrator detail action only, requires an unexpired immutable review object, and uses
  a temporary URL with maximum age 300 seconds. The requested SDK TTL is
  `min(300, floor((rawExpiresAt-now)/1000))`; remaining time below one whole second is `raw_unavailable`, and the DTO
  expiry equals the actual requested TTL. The storage adapter passes that exact integer TTL to the pinned SDK while
  preserving the C02 default of 300 seconds. No list DTO contains a raw link.
- `admin_review` requires `pending_review`, unexpired raw, immutable review state `present`, exact version and a random
  `reviewAttemptId`. Same-attempt replay is first-write-wins and returns the stored result; changed payload cannot
  rewrite it. Review/cancel races resolve by status+version CAS.
- Every CloudBase multi-record transition uses only transaction-bound document operations: read the exact document
  with `doc(id).get()`, validate the frozen status/version/expiry/pointer conditions, then update that same document
  with `doc(id).update()`. Transaction callbacks must not use `where(...).update()`. Approval keeps the submission and
  evidence add in one transaction; revision insert/terminal/repair keeps parent and child changes in one transaction.
- The memory approval seam rechecks the submission after the awaited evidence add. If cancel or another review wins,
  it removes the just-added evidence and returns a conflict without overwriting the winning state. Admin service has
  no non-transactional approval fallback.
- `request_changes` stores only the bounded review decision/note required by the frozen record and never creates
  evidence. `reject` enters the frozen cleanup path. `approve` creates `community_track_candidate` only.
- Approved evidence is a separate ADMINONLY record whose random `serverEvidenceKey` exists only as
  `track_review_evidence._id`. It contains no submission ID, OpenID, raw/file/provenance reference or timestamp samples.
  Submission/DTO/log/catalog never stores or returns that key; the submission stores only `evidenceExpiresAt` and the
  keyless display fields explicitly frozen for admin detail.
- `rawExpiresAt` is fixed at review snapshot plus 30 days and never extended. Approved evidence expires 180 days after
  approval. Logical expiry removes read/review authority before physical cleanup; no path silently extends either.
- A fresh owner revision attempt against a `changes_requested` parent with `recordExpiresAt <= now` returns
  `submission_not_found` before parent/child/storage mutation. The existing same-attempt first-write replay remains
  byte-for-byte and precedes parent revalidation. Memory and CloudBase `insertRevision` both enforce the same sampled
  `now`, and the CloudBase parent CAS includes `recordExpiresAt > now`.
- Internal retention uses injected clock/storage/repositories, max 20 records per batch, exact cursor/CAS, duplicate
  delivery safety and honest deletion-pending recovery. It never relies on exactly-once timer delivery and never
  removes non-expired data.
- The C06-only deployment/index/timer/permission work remains separate. Tests are offline seams and do not mutate the
  configured staging environment.
- No SHA/hash, automatic catalog publication, opening/safety/weather/verdict inference, compatibility API or new
  persistent linkage may be introduced.

## 6. TDD acceptance matrix

Register `test:track-admin` and `test:track-retention` in root `npm test`. Record real RED before GREEN. Tests must
prove at least:

- missing/blank/malformed admin config, non-admin, forged identity/role and public timer-shaped input all fail closed
  with zero repository/storage/evidence side effects;
- exact admin config trimming/deduplication, server OpenID authorization and no allowlist disclosure;
- literal exact `AdminList/AdminListItem/AdminDetail/ApprovedEvidenceDisplay` keys, all eight status/action rows,
  strict status-bound cursor tuple/order/filter/limit and post-deadline zero projection; deleting/changing one action
  or reversing either CloudBase order must make focused tests RED;
- raw link only from the immutable review object, explicit action, unexpired deadline and maxAge 300; missing/deleted/
  expired raw is `raw_unavailable` without exposing SDK URLs/details; standard 300-second, exact whole-second,
  sub-second rejection and adapter pass-through tests detect hard-coded TTL regressions;
- review version/status/CAS, cancel race, same-attempt first-write-wins replay and different-attempt terminal rejection;
  CloudBase approval tests assert transaction-bound `doc.get/doc.update`, full status/version/raw-present/attempt CAS
  and rollback/no orphan; transaction `where().update()` or direct-db bypass mutations must be RED;
- insert-revision, terminal child/parent transition and pointer repair tests likewise require transaction-bound
  document reads/updates and prove staged rollback when evidence/child/second-parent operations fail;
- a real memory approval/cancel barrier proves cancel can win during the awaited evidence add without later approval
  overwrite or orphan evidence; removing the post-await recheck/cleanup must be RED;
- request-changes, reject and approve transition facts; approve produces no product fact beyond
  `community_track_candidate` and never mutates route/catalog/status/tier;
- evidence key isolation in both directions with mutation-sensitive literal key tests: submission/DTO/log/catalog has
  no evidence key, evidence has no submission/OpenID/raw/provenance linkage;
- exact 30-day raw and 180-day evidence boundaries, approval first-write and replay no deadline extension, day-edge
  behavior and logical zero access before physical cleanup; changing 180 days must make focused tests RED;
- fresh revision at `recordExpiresAt === now` or later has zero child/parent/storage side effects and returns
  `submission_not_found`; unexpired revision still succeeds, existing-attempt replay is unchanged, and removing the
  CloudBase expiry CAS makes the owner focused test fail;
- actual default handler timer routing plus timer authority (`TRIGGER_SRC='timer'` + empty server OpenID), forged/client
  denial, max-20 `limit+1` pagination, cursor/backlog, CAS loss, duplicate delivery, already-missing object idempotency
  and deletion-pending repair;
- approved raw cleanup preserves evidence; evidence expiry deletes only the de-identified record; terminal immediate
  cleanup follows the merged C02 pending-before-delete invariant;
- exact handler and CloudBase repository/evidence transaction/query seams are behavior-tested; Cloud retention and
  evidence tests assert the due `$or`, strict ascending cursor tuple, both orderings and `limit+1`, and a fixed broad
  limit mutation must be RED. The merged C01/C02 focused tests and all repository gates remain green.

Required commands:

- `corepack npm@10.9.2 run test:track-admin`
- `corepack npm@10.9.2 run test:track-retention`
- `corepack npm@10.9.2 run test:track-owner`
- `corepack npm@10.9.2 run test:track-parser`
- `corepack npm@10.9.2 test`
- `corepack npm@10.9.2 run test:integration`
- `corepack npm@10.9.2 run lint`
- `corepack npm@10.9.2 run typecheck`
- `CI=1 corepack npm@10.9.2 run build:weapp`
- `git diff --check`

## 7. Dependency and merge order

C02/#119 is merged. C03 is the only active child and blocks C04/#121. No parallel work may modify
`cloudfunctions/trackSubmission`, its package/lock, response contract or lifecycle while C03 is active.

## 8. Escalation and stop conditions

Stop and return to Sol if CloudBase cannot implement fail-closed server allowlist, status/version review CAS,
key-isolated evidence or timer-only cleanup through injected seams; if exact DTO/error/retention/public authority must
change; if a new dependency, collection schema outside the frozen records, permission broadening, destructive staging
operation, catalog write or deployment is required. Do not choose a weaker trust boundary silently.

## 9. Allowed autonomous choices

Internal pure helper layout, injected seam names, test fixture organization and implementation sequencing inside the
exact files are allowed. Public modes/fields/errors/messages, retention periods, evidence linkage, authority, action
order, side-effect order and dependencies are frozen.

## 10. Deliverables

Return code, exact tests, actual files, RED/GREEN, full command results, deviations, autonomous decisions, known
limits/risks and a focused draft PR using `Refs #120`. The executor cannot approve or merge its own PR.

## 11. Controller activation checkpoint — 2026-08-09

```text
Governance version: TP-GOV-2.0.0
Goal ID and status: TP-COMMUNITY-001 / ACTIVE — C03 IMPLEMENTATION_ACTIVE
Active milestone: TP-COMMUNITY-001 Community track evidence / C03
Active Issue and mode: #120 / IMPLEMENTATION
Current branch and base: codex/120-track-admin-retention / main@75fcd92
Working tree before activation: clean
Dependency: #119 closed after approved PR #125 merged as 75fcd92
Implementation routing: exact custom Agent luna-worker only; Terra fallback prohibited
```

The activation commit is controller-owned and contains no C03 implementation code. `luna-worker` must re-read all
required sources, verify the branch/worktree, run baselines, report the mandatory handshake and capture a real focused
RED before implementing GREEN.

## 12. Executor implementation checkpoint — 2026-08-09

```text
TDD RED: test:track-admin and test:track-retention both exited 1 with real MODULE_NOT_FOUND before their runners existed.
GREEN: focused admin/retention contracts and all required repository gates pass.
Status: READY_FOR_CONTROLLER_REVIEW
Runtime model visibility: UNVERIFIED_RUNTIME_MODEL
```

The bounded GREEN adds only the allowlisted handler/admin/reviewed-evidence/retention/repository/lifecycle seams and
focused runners. It keeps server OpenID/admin configuration fail-closed, raw access explicit and ≤300 seconds, review
CAS/attempt replay immutable, evidence keys isolated to the evidence record, and timer cleanup limited to
`TRIGGER_SRC='timer'` with empty server OpenID, max-20 cursor/CAS and pending-before-delete recovery. No UI,
deployment, real CloudBase mutation, new dependency, catalog write or public cleanup mode was added. Sol XHigh owns
independent Review, CI interpretation, PR/merge and final status decisions.

## 13. Controller scope correction — post-expiry owner revision

Read-only Sol reproduction confirmed a merged C02 P2: a fresh revision could use an expired same-owner
`changes_requested` parent, mutate its replacement pointer/version and create a child with a new 30-day deadline.
This violates the already-frozen rule that all direct owner/admin mutations act not-found at logical expiry.

The controller therefore adds only `owner-service.js` and `track-owner-contract-test.js` to this Issue for the exact
expiry correction; `submission-repository.js` was already allowlisted. No mode, DTO, error, retention period or public
authority changes. `luna-worker` must record RED/GREEN for the exact boundary and rerun the complete matrix before the
checkpoint may return to `READY_FOR_CONTROLLER_REVIEW`.

## 14. Executor expiry-correction checkpoint — 2026-08-09

```text
TDD RED: after adding the expired and equal-now fresh-revision cases, test:track-owner returned upload_reservation
instead of submission_not_found and the parent mutation remained possible.
GREEN: owner-service samples one clock value and rejects missing/expired changes_requested parents before mutation;
memory and CloudBase insertRevision require recordExpiresAt > now, with the CloudBase CAS condition carrying expiry.
Coverage: expired/equal-now zero child/pointer/version/storage effects, unexpired success, same-attempt replay stability,
and CloudBase expired CAS no-update/no-add.
Focused owner: PASS. Full required matrix: PASS (integration 55/0; lint 0 errors/9 existing warnings).
Status: READY_FOR_CONTROLLER_REVIEW
Runtime model visibility: UNVERIFIED_RUNTIME_MODEL
```

No C02 public mode, DTO, error, deadline, identity or storage behavior changed outside this exact controller-approved
post-expiry revision correction. No commit, push, merge, deployment or real CloudBase mutation was performed.

## 15. Sol Review-fix round 1 — raw TTL and contract sensitivity

Independent Review found that admin detail clamped only the displayed raw expiry while the storage adapter still asked
the SDK for a fixed 300-second URL. Near `rawExpiresAt`, that could preserve raw access beyond the 30-day privacy
boundary. The controller adds only `storage-adapter.js` for exact remaining-whole-seconds pass-through; the existing
owner contract test may cover adapter behavior. This is not a new mode, retention period or deployment change.

The same round must make the frozen matrix mutation-sensitive: eight actions and strict cursor order, approval
CAS/transaction/rollback and cancel race, 180-day first-write/no-extension, actual handler timer dispatch, and exact
CloudBase retention/evidence pagination/query shapes. No mechanical coverage target or new framework is required.

Pinned SDK inspection confirms `getTempFileURL` returns exact item fields `fileID`, `status`, `errMsg`, `maxAge` and
`tempFileURL`. The adapter therefore validates exactly one matching item, status `0`, non-empty URL/message and an
integer returned `maxAge <= requested TTL`; malformed/mismatched responses fail `storage_unavailable`.

Independent Review also found that query updates inside the pinned SDK transaction wrapper are not a safe atomic
primitive. This round replaces every transactional `where(...).update()` in the repository with transaction-bound
document get/condition validation/update, and adds staged rollback evidence. The memory approval seam must also close
the await race described above. These are correctness fixes inside the existing records/modes, not schema or public
contract changes.

## 16. Executor Review-fix checkpoint — 2026-08-09

```text
TDD RED: storage TTL, near-deadline raw access, transaction query-update bypass, memory approval/cancel barrier,
non-transactional approval fallback, and a valid unexpired revision using the pinned SDK command shape
`{operator:'gt', operands:[date]}` each failed before its corresponding Review-fix implementation.
GREEN: exact raw TTL pass-through/validation, transaction-bound document CAS with staged rollback, post-await memory
approval CAS/orphan cleanup, fail-closed approval, exact admin action/cursor/order/limit/replay boundaries, timer
routing and CloudBase retention/evidence query seams now pass focused contracts. Local frozen-condition checks no
longer interpret SDK query command objects; sampled expiry is validated explicitly before the document CAS.
Focused: test:track-owner PASS; test:track-parser PASS; test:track-admin PASS; test:track-retention PASS.
Full gates: root npm test PASS; integration PASS 55/0; lint PASS (0 errors / 9 pre-existing warnings); typecheck PASS;
CI=1 build:weapp PASS; git diff --check PASS (Corepack npm 10.9.2).
Files: only the existing C03 allowlist plus controller-approved storage-adapter.js were touched; GOAL.md remains a
controller-owned concurrent documentation change. No commit, push, merge, deployment, real CloudBase mutation, new
dependency or collection/index/rule/env/timer mutation was performed.
Status: READY_FOR_CONTROLLER_REVIEW
Runtime model visibility: UNVERIFIED_RUNTIME_MODEL
```

Sol XHigh owns independent Review, CI interpretation, mergeability and final status. The executor does not approve,
merge or publish a PR.

## 17. Sol Review-fix round 2 — exact lifecycle, privacy keys and Cloud query shape

Round-1 Review closes all P1 findings but proves the remaining P2 tests can still self-confirm mutated implementation
values. The bounded round 2 changes no mode, DTO, record, collection, period or authority. It must:

- use test-owned literal millisecond expectations to prove review snapshot → raw/record expiry is exactly 30 days and
  approval → submission/evidence expiry is exactly 180 days, including before-edge retention and at-edge deletion;
- remove the duplicate finalize literal by using the existing `RAW_DAYS` constant, while making 29/31 and 179/181
  mutations RED and preserving first-write/replay no-extension;
- table-drive expired `awaiting_upload`, `processing` and `changes_requested` cleanup, including the server-derived
  upload file ID, logical zero projection, pending-before-delete and duplicate-delivery repair;
- lock literal exact keys for the evidence record, nested `ApprovedEvidence`, admin list/detail projections and the
  identity-bearing submission exclusion. Adding submission/OpenID/raw/provenance/file/evidence-key linkage must RED;
- call Cloud admin list with both status and cursor and assert the complete strict descending tuple, status/expiry
  base and `limit+1`; reversing either seek comparison must RED;
- deep-assert all four Cloud retention due branches, the strict ascending record cursor, and the exact evidence
  expiry/id cursor, order and `limit+1`; deleting any due branch or using a broad fixed limit must RED.

This is the final bounded evidence round for these exact findings. Full local gates and both independent actual-diff
Reviews remain required before any commit or PR decision.

## 18. Executor Review-fix round-2 checkpoint — 2026-08-09

```text
TDD RED/GREEN: test-owned literal 30/180-day expiry, before-edge/at-edge cleanup, replay no-extension, expired
awaiting_upload/processing/changes_requested cleanup, literal evidence/admin/submission keys, Cloud admin status+
cursor DESC, Cloud retention due branches/ASC tuple, evidence expiry/id cursor and limit+1 assertions all pass.
Mutation RED: RAW_DAYS 29/31; EVIDENCE_DAYS 179/181; deleting either retention due branch; broad limit; admin lt→gt;
and adding evidence provenance each failed its focused contract and was restored immediately.
Implementation: finalize imports/reuses RAW_DAYS; no public/schema/period/authority behavior changed.
Focused: test:track-owner PASS; test:track-parser PASS; test:track-admin PASS; test:track-retention PASS.
Full gates: root npm test PASS; integration PASS 55/0; lint PASS (0 errors / 9 pre-existing warnings); typecheck PASS;
CI=1 build:weapp PASS; node --check changed/new JS PASS; git diff --check PASS.
Files: existing C03 allowlist only plus controller-owned GOAL.md concurrent documentation change; no commit, push,
merge, deployment, real CloudBase mutation, dependency or collection/index/rule/env/timer mutation.
Status: READY_FOR_CONTROLLER_REVIEW
Runtime model visibility: UNVERIFIED_RUNTIME_MODEL
```

Sol XHigh owns both independent actual-diff Reviews, CI interpretation, mergeability and final status. The executor
does not approve, merge or publish a PR.

## 19. Executor final P2 evidence checkpoint — 2026-08-09

```text
Test: after approval, retrieves the real identity-bearing submission record and asserts exact-own-key absence plus
recursive absence of serverEvidenceKey/evidenceKey; serialized submission content excludes the random evidence row ID.
Mutation RED: temporary `patch.serverEvidenceKey = evidenceRecord._id` made test:track-admin fail; the mutation was
restored immediately. No production code changed in this final round.
Focused: test:track-admin PASS; test:track-retention PASS; test:track-owner PASS; root npm test PASS; git diff --check PASS.
Status: READY_FOR_CONTROLLER_REVIEW
Runtime model visibility: UNVERIFIED_RUNTIME_MODEL
```

No commit, push, PR, deployment or real CloudBase mutation was performed. Sol XHigh retains independent Review,
mergeability and final status authority.

## 20. Controller publication checkpoint — 2026-08-09

- Additive implementation commit `d62bf4e` was pushed normally and published as draft PR #126 with `Refs #120`.
- PR #126 targets `main@75fcd92`; its initial latest-head GitHub `quality` check passed. GitHub live PR metadata is
  the CI fact source rather than a copied run identifier.
- Pre-publication actual-worktree Reviews both returned `APPROVED` with P0–P3 none. Fresh Reviews must inspect the
  current PR latest head after this additive status commit and latest-head CI; prior approvals do not authorize merge.
- #120 remains open, #121 remains dependency-blocked, and no deployment or real CloudBase mutation is authorized.
