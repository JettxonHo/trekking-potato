# ACTIVE TASK — #134 staging finalize storage diagnosis

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — BLOCKED_STAGING`
- Milestone: `TP-COMMUNITY-001 Community track evidence` (#8)
- GitHub Issue: `#134` (parent blockers `#123` and `#115` remain open)
- Status/Mode: `BLOCKED_STAGING / HUMAN_RUNTIME_VALIDATION`
- Controller: Sol XHigh + human operator
- Branch/base: `codex/134-track-storage-finalize` from `main@3cf9090`
- Executor: exact custom `luna-worker`, configured `gpt-5.6-luna/max`; runtime identity is recorded separately

## 1. Objective and proven reproduction

Localize and fix the staging `trackSubmission.finalize` path that returns `storage_unavailable` after a successful
reserved-path private upload. The initial authorized synthetic GPX proved `begin` success and HTTP 204 upload;
`finalize` failed and owner list/detail were not exercised in that first run. The later single diagnostic rerun proved
owner list/detail success, but `finalize` still failed and detail truthfully remained `awaiting_upload`. No
administrator, delete, timer, catalog, publication or production action occurred. Staging row S7 remains `BLOCKED`.

## 1a. #134 captured cause and final-fix checkpoint — 2026-08-12

The authorized temporary capture was the sanitized four-key shape `{event: 'track_submission_storage_failure',
stage: 'creator_temp_url', code: 'storage_unavailable', category: 'provider'}`. In the pinned runtime chain, the
underlying `@cloudbase/node-sdk` success item has no `maxAge`, while `wx-server-sdk` 4.0.2 forwards that possibly
missing value despite its public declaration requiring a number; `storage-adapter` incorrectly required a
response-side integer. The focused regression first failed on that observed runtime shape, then passed after replacing the
mandatory response check with an optional-if-present integer check bounded by requested `maxAge` (1–300), alongside
exact file ID/status/`errMsg`/temporary-URL checks. Mutations accepting over-limit or malformed explicit values fail.
All temporary diagnostics, prefixes, stage hooks and related tests are removed from the final code. Two independent
Reviews approved the diagnostic-free fix and it was uploaded to the existing staging function. Human then authorized
exactly one post-fix synthetic owner smoke. The run reached a new reservation and private upload; `finalize` returned
the public `store_unavailable` error, so the stop condition prevented list/detail and any retry. No diagnostic was
restored. The post-fix authorization is consumed; further diagnosis or staging invocation requires a new controller
scope/authorization. S7 remains `BLOCKED`.

## 1b. Transaction-bound CAS authorization — 2026-08-12

The human authorized a bounded diagnostic-free fix for the newly localized final-state write failure. Replace only
the `processing -> pending_review` and storage/parser reset CAS paths with a transaction-bound
`doc.get -> frozen owner/status/version/processing.leaseId validation -> doc.update` repository seam. Add production-
shaped pinned-SDK behavior tests and staged rollback assertions before implementation, preserve the public error/DTO,
owner isolation, immutable review object and existing cleanup contract, then run two independent Reviews. Only after
both Reviews approve may Sol deploy the diagnostic-free function to the existing staging environment. Deployment does
not authorize another function invocation, file upload, retry, delete, admin review, timer or publication.

## 1c. Transaction-bound CAS implementation checkpoint — 2026-08-12

The focused contract recorded a real RED before implementation (`updateProcessing` was absent from the production-shaped
CloudBase repository). The minimal GREEN now uses transaction-only `doc.get` and `doc.update` for finalization and
storage/parser reset paths, validates the exact owner/status/version/processing lease tuple, and leaves records unchanged
on stale conditions, a zero-update result or a thrown second step. The owner seam, root/integration/lint/typecheck/
fixture-free build and diff/security gates pass locally. No staging deployment or invocation occurred; S7 remains
`BLOCKED`, and two fresh independent Reviews remain controller-owned.

### Review-fix round 1 checkpoint — 2026-08-12

The production-shaped contract now covers three valid-condition stale-record cases: current status differs from
`processing`, current integer version differs from the expected integer, and current non-empty processing lease differs
from the expected lease. Each returns `null`, performs no transaction `doc.update`, and leaves the fake records unchanged.
Deleting each frozen expected status, version or lease field in isolation produced a focused RED; all mutations were
restored. No production implementation or deployment state changed; S7 remains `BLOCKED`.

### Transaction-bound CAS deployment checkpoint — 2026-08-12

Two fresh independent Reviews approved the implementation and Review-fix with no P0–P3 findings. Sol then uploaded
the diagnostic-free `trackSubmission` function to the existing staging environment through WeChat DevTools with
cloud-side dependency installation. A read-only download verified that the deployed owner service, repository,
storage adapter and entry source exactly match the reviewed local files. The function was not invoked and no file was
uploaded after deployment. The temporarily enabled DevTools service port was turned off. S7 remains `BLOCKED`; any
post-deploy smoke was previously gated on fresh human authorization.

### Standing synthetic-owner smoke authorization — 2026-08-12

The human now authorizes future runs of the same bounded, privacy-safe synthetic owner smoke without per-run
reconfirmation. Each run may create exactly one new synthetic attempt and execute only
`begin -> private upload -> finalize -> owner list -> owner detail`; it must stop on the first failure and must not
automatically retry. The fixture must contain no real identity or real location. This standing authorization does not
cover deletion, administrator review, timers, publication, production, real-user data, diagnostics or scope expansion.
Each run still requires a reviewed staging change or an explicit controller decision to run, sanitized evidence, and
truthful ledger synchronization. S7 remains `BLOCKED` until the corresponding runtime behavior is actually observed.

The first run under this standing authorization reached `upload_reservation` and completed the private upload, then
`finalize` returned public `store_unavailable`. The stop rule prevented owner list/detail and retry. No diagnostic,
delete, administrator, timer, publication or production action occurred; the service port was turned off afterward.
The standing authorization remains valid for a later reviewed staging change, while this run leaves S7 `BLOCKED`.

### Transaction-stage diagnosis authorization — 2026-08-12

The human authorizes one bounded temporary observation increment to distinguish transaction start, transaction
document get, frozen owner/status/version/processing-lease match, document update and commit outcomes. The observation
may contain only one fixed event name plus fixed stage/result enums and the existing public error code. It must never
contain OpenID, submission/attempt/file IDs, storage paths or hosts, URLs, payloads, bytes, coordinates, rights or note
text, secrets, environment values, arbitrary provider messages or stacks. Tests must make stage mislabeling and any
extra key/value leakage RED. The executor must run focused RED/GREEN and all local gates, then stop for two independent
Reviews before deployment. Only an approved increment may be uploaded to the existing staging function. The standing
authorization then permits one fresh five-stage synthetic-owner attempt, stopping on the first failure with no retry.
After capture, remove all observation code/tests, write a regression RED for the captured cause, obtain fresh Reviews
and deploy only a diagnostic-free fix. No delete, admin review, timer, publication, production, permission, schema,
API/DTO/error or dependency change is authorized.

### Transaction-stage observation implementation checkpoint — 2026-08-12

The focused owner contract first went RED because the production-shaped repository emitted no observation. The minimal
GREEN now emits exactly `{event, stage, result, code}` through the existing repository seam at transaction start,
document get, frozen-condition match, document update and commit. `start/started` is emitted inside each initialized
callback attempt; callback-null and rejected-update paths end `commit/committed`, callback/init failures end
`commit/not_attempted`, and only a post-callback commit failure ends `commit/failed`. A real fake commit failure keeps
the original records unchanged. Default-handler wiring, custom repository/service bypass, and throwing-observer
isolation are executable tests. Stage/result values are fixed allowlists; the public code remains `store_unavailable`;
the event is `track_submission_transaction_observation`; no identity, ID, path, payload, bytes, secret, message or
stack is included. Stage mislabel and extra-key mutations each produced focused RED and were restored. No staging upload
or invocation occurred; two fresh Reviews remain required.

### Transaction-stage observation staging attempt — 2026-08-12

Two fresh independent Reviews approved the observation increment with no P0–P3. The reviewed repository and entry
files were uploaded incrementally to the existing staging function and it returned to `Active`; no deployed-source
equality is claimed because the local DevTools whole-function upload/download helpers failed before completing their
local operation. One standing-authorized smoke was started and stopped at the first failure. DevTools automation
dropped the non-ASCII synthetic title, so `begin` returned public `invalid_input`. No private upload, `finalize`, owner
list/detail, transaction observation, delete, administrator action, timer, publication or production action occurred,
and the service port was disabled afterward. Do not automatically retry this run. S7 remains `BLOCKED`; the temporary
fixed-enum observation remains pending a later explicitly initiated run and must be removed after the first useful
transaction-stage capture.

### Transaction-stage capture and diagnostic-free final-fix checkpoint — 2026-08-12

A later standing-authorized run used an ASCII-only synthetic title and a fresh two-point GPX with no real identity or
location. `begin` and the private upload succeeded; `finalize` returned public `store_unavailable`, so the run stopped
without owner list/detail or retry. The fixed-enum capture was exactly `start/started`, `doc_get/found`,
`condition_match/matched`, `doc_update/failed`, `commit/not_attempted`, all with public code `store_unavailable`.
No identifier, path, payload, private input, provider message or secret was recorded; the service port was disabled.

Local pinned-SDK diagnosis found that a new submission stores `summary: null`, while an ordinary object update flattens
the parsed summary into `summary.*` paths. The database cannot create those child paths beneath an existing null parent.
The focused contract first went RED on that exact serializer shape. The minimal GREEN wraps only a non-null parsed
summary with `db.command.set`, producing a single top-level `$set.summary` replacement while preserving the transaction
document get, frozen owner/status/version/lease checks and document update. Reverting to the ordinary patch makes the
focused contract RED and was restored. All temporary transaction observation code, entry wiring and observation tests
are removed from the diagnostic-free candidate. The complete local gate matrix passed and two fresh independent
Reviews returned `APPROVED` with no P0–P3. Sol then uploaded only the diagnostic-free function to existing staging.
The subsequent standing-authorized synthetic run used a fresh two-point GPX with no real identity or location and
passed `begin -> private upload -> finalize -> owner list -> owner detail`: finalization and detail both reported
`pending_review`, and the list returned normally. There was no retry, deletion, administrator action, timer,
publication or production action. This verifies only the bounded owner slice; S7 remains `BLOCKED` for the remaining
administrator/rejection/cancel/lease-recovery evidence.

## 2. Exact allowlist

- `cloudfunctions/trackSubmission/storage-adapter.js`
- `cloudfunctions/trackSubmission/owner-service.js`
- `cloudfunctions/trackSubmission/submission-repository.js`
- `cloudfunctions/trackSubmission/index.js` only if dependency injection is required
- `scripts/track-owner-contract-test.js`
- `docs/community-track-staging-validation.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`
- `GOAL.md` controller lifecycle status only

No other path may change without controller scope correction.

## 3. Frozen diagnostic and privacy contract

- Before production edits, extend the existing owner/storage behavior seam so temporary diagnostics distinguish
  creator temporary-URL, creator GET/byte collection and immutable review-upload failures while the public response
  remains `storage_unavailable` and the record truthfully returns to `awaiting_upload`.
- Diagnostics may emit only a fixed event name, a fixed stage enum, the existing public error code and a bounded
  allowlisted provider/network category. They must use one unique temporary prefix for removal.
- Never emit or retain OpenID, submission/begin-attempt/file IDs, cloud path, filename, storage host, temporary URL,
  request payload, file bytes, coordinates, rights/provenance/note, secret/env values, stack trace or arbitrary
  provider message. Tests must make representative leakage and stage-mislabel mutations RED.
- After root-cause capture, remove all temporary diagnostics. A stable non-sensitive event may remain only if the
  implementation test and independent Review justify it; otherwise final code has no debug log.

## 4. Execution order

1. Complete mandatory handshake and clean-baseline gates; preserve the existing three staging-evidence document edits.
2. Record focused RED before implementation, then minimal GREEN for the sanitized stage diagnostics.
3. Run focused/root/integration/lint/typecheck/fixture-free WeChat build/diff/security gates and independent Review.
4. Deploy only the reviewed diagnostic increment to the existing staging `trackSubmission` function.
5. Rerun the same synthetic GPX once. Do not delete the temporary submission, enable timers, review it or publish it.
6. If the captured cause is within this allowlist, write the regression RED before the minimal fix, remove temporary
   diagnostics, rerun all gates/Reviews and deploy only the diagnostic-free final staging fix. At that phase the run
   stopped until fresh human authorization was recorded; the later standing authorization below supersedes only that
   per-run confirmation requirement. Never restore the diagnostic event. Otherwise stop and escalate.
7. The one subsequently authorized post-fix smoke has been consumed: begin/upload succeeded and `finalize` returned
   `store_unavailable`; list/detail were not called. It stopped without retry or diagnostic restoration. Diagnosis or
   broader staging action still requires a new controller scope; later same-scope synthetic smoke follows the standing
   authorization below.
8. For the newly authorized transaction-bound CAS fix, record a real focused RED against the CloudBase repository
   public seam, implement the minimum repository/owner orchestration change, rerun the full gates, and obtain two fresh
   independent Reviews. Sol may then deploy only the approved diagnostic-free function. Under the standing synthetic-
   owner authorization, run at most one fresh attempt through the five authorized owner stages, stop on any failure,
   and synchronize only sanitized evidence; do not broaden the run.
9. The first standing-authorized attempt stopped at `finalize` with `store_unavailable` after successful begin/upload.
   Do not retry or diagnose under this run. Preserve the standing authorization for a future reviewed staging change.
10. After the transaction-stage capture, diagnostic removal, serializer regression fix, full gates and two fresh
    approvals, Sol uploaded the diagnostic-free function. The next standing-authorized attempt completed all five
    owner stages and reached `pending_review` without retry. Preserve S7 as `BLOCKED`; do not infer administrator,
    rejection, cancel, lease-recovery, cleanup, timer or publication evidence from this owner-only success.

## 5. Non-scope and stop conditions

No production/public deployment, deletion, cleanup enablement, administrator review, evidence approval, timer,
permission, collection/index/env/schema/API/DTO/error/dependency change, raw viewer/export, catalog promotion, real-user
data or route fact is authorized. Stop on any such need, on allowlist expansion, or if the observed cause cannot be
fixed without weakening privacy or the immutable-review contract.

## 6. Deliverable

The executor returns `READY_FOR_CONTROLLER_REVIEW` with exact RED/GREEN commands, changed files, sanitized diagnostic
shape, full gate results, security/residue audit and known limitations. Sol owns staging deployment, root-cause
interpretation, independent Reviews, mergeability and Issue status. #123/#115 remain open until their separate staging
rows are truthfully complete.
