# C06 community-track staging validation

- Goal: `TP-COMMUNITY-001`
- Issue: `#123` (parent `#115`)
- Branch/base: `codex/123-track-acceptance` from `main@0e534d49` (activation head `a65a357`)
- Date: `2026-08-11`
- Scope: offline acceptance evidence plus a human-controlled staging checklist
- Runtime model visibility: `UNVERIFIED_RUNTIME_MODEL`; the configured `luna-worker` is `gpt-5.6-luna/max`, but
  runtime metadata is not exposed and is not inferred from configuration

## Decision boundary

This record is code-ready and staging-evidence preparation only. No CloudBase collection, index, rule, environment,
function or timer mutation was executed by the executor. No production/public release, route promotion, destructive
cleanup enablement, secret/OpenID disclosure, or real-user invitation is authorized by this Issue.

Human option A / TP-D056 is effective: the current mini-program displays only normalized summary, keyless reviewed
evidence and at most 500 preview points. It has no raw GPX/KML presentation or export path. Future viewer #129 is a
separate blocked Issue.

## Status rules

Every row below has exactly one status:

- `VERIFIED` means the listed offline command, deterministic repository audit or sanitized direct console/runtime
  observation was actually completed and supports only the stated claim.
- `BLOCKED` means the row requires the separately authorized human CloudBase/staging action or an explicit product
  decision; no executor pass is implied.
- `UNVERIFIED_RUNTIME_TOOL` means a local/runtime observation was not available in this execution environment; it is
  not substituted with a build or offline test result.

No real secrets, OpenIDs, production URLs, CloudBase identifiers or raw paths are present. Synthetic identities,
`example.test` URLs and reserved paths are confined to the offline fixture and are not deployment values.

## Offline acceptance evidence

| ID | Required evidence | Status | Command / boundary | Notes |
|---|---|---|---|---|
| O1 | Owner begin → exact reserved upload → immutable finalize → private list/detail, retry identity, expiry and DTO privacy | `VERIFIED` | `corepack npm@10.9.2 run test:track-acceptance` | Uses injected memory repository/storage/clock and the production owner/parser/response seams; forged owner and exact reserved-path probes are included. |
| O2 | Administrator queue/detail and `request_changes`, `reject`, `approve_evidence` with server-only authority, replay and CAS | `VERIFIED` | `corepack npm@10.9.2 run test:track-acceptance` | A table-driven decision matrix covers stable attempt replay, stale version rejection and cancel/review race. |
| O3 | Revision, cancellation, deletion-pending repair and missing-delete idempotency | `VERIFIED` | `corepack npm@10.9.2 run test:track-acceptance` | Owner/admin services share the injected repository/storage boundary; cleanup never claims success while pending. |
| O4 | Raw/record 30-day and evidence 180-day before/equal/after boundaries without deadline extension | `VERIFIED` | `corepack npm@10.9.2 run test:track-acceptance` | Literal date arithmetic is checked against independent constants; timer cleanup keeps approved evidence separate. |
| O5 | Timer-only authority, duplicate delivery, max-20 cursor/backlog and CAS repair | `VERIFIED` | `corepack npm@10.9.2 run test:track-acceptance` | The normal client/forged-event branch is rejected; 21 due records drain as 20 + 1 and duplicate delivery is zero-effect. |
| O6 | Option A poisoned `view_raw`/`rawAccess.url` has no UI/state/network/platform effect | `VERIFIED` | `corepack npm@10.9.2 run test:track-acceptance` and `corepack npm@10.9.2 run test:track-ui` | Model projections filter the server-only raw action; service requests contain no raw-link flag; source residue scans cover opener/export APIs. |
| O7 | Approval produces exact-key stored evidence, nested approved-evidence/geometry and display DTO projections | `VERIFIED` | `corepack npm@10.9.2 run test:track-acceptance` | Non-empty private provenance/note input is excluded; literal key oracles cover stored evidence, nested geometry and admin display. Provenance/note/raw/linkage mutations are expected RED. |
| O8 | Acceptance flow performs no runtime route-catalog/product-fact/public-UGC mutation | `VERIFIED` | `corepack npm@10.9.2 run test:track-acceptance` | Same-run snapshots prove only that this flow did not mutate runtime boundaries. Route/weather/verdict/history integrity is attributed to the exact production-file allowlist/diff and existing focused gates. |

## Human/console/runtime staging rows

| ID | Required staging action or observation | Status | Human evidence required before changing status |
|---|---|---|---|
| S1 | Create `track_submissions` as private `ADMINONLY` collection | `VERIFIED` | Direct console observation on 2026-08-11: the collection exists and its mini-program permission is “所有用户不可读写”; no mutation was performed. |
| S2 | Create `track_review_evidence` as private `ADMINONLY` collection | `VERIFIED` | Direct console observation on 2026-08-11: the collection exists and its mini-program permission is “所有用户不可读写”; no mutation was performed. |
| S3a | Verify `track_submissions` index `_openid ASC + recordExpiresAt ASC + updatedAt DESC + _id DESC` (`unique=false`) for owner lists | `VERIFIED` | Direct read-only index-manager observation on 2026-08-19 confirmed the exact field order/directions and non-unique property. |
| S3b | Verify `track_submissions` index `status ASC + recordExpiresAt ASC + updatedAt DESC + _id DESC` (`unique=false`) for filtered admin lists | `VERIFIED` | Direct read-only index-manager observation on 2026-08-19 confirmed the exact field order/directions and non-unique property. |
| S3c | Verify `track_submissions` index `recordExpiresAt ASC + updatedAt DESC + _id DESC` (`unique=false`) for all-status admin/cleanup scans | `VERIFIED` | Direct read-only index-manager observation on 2026-08-19 confirmed the exact field order/directions and non-unique property. |
| S3d | Verify `track_submissions` index `rawExpiresAt ASC + status ASC` (`unique=false`) for raw expiry cleanup | `VERIFIED` | Direct read-only index-manager observation on 2026-08-19 confirmed the exact field order/directions and non-unique property. |
| S3e | Verify `track_submissions` index `_openid ASC + beginAttemptId ASC` (`unique=true`) for owner-attempt deduplication | `VERIFIED` | Direct read-only index-manager observation on 2026-08-19 confirmed the exact field order/directions and unique property. |
| S3f | Verify `track_review_evidence` index `expiresAt ASC` (`unique=false`) for evidence expiry cleanup | `VERIFIED` | Direct read-only index-manager observation on 2026-08-19 confirmed the exact field order/direction and non-unique property. |
| S4 | Configure and observe the exact server-only storage file-ID host | `VERIFIED` | Direct `trackSubmission` advanced-config observation on 2026-08-11 confirmed the exact environment-variable key and configured staging host; the value is intentionally not recorded. Runtime file-ID binding remains part of S7. |
| S5 | Configure and observe server-only `TRACK_REVIEW_ADMIN_OPENIDS` | `VERIFIED` | Direct `trackSubmission` advanced-config observation on 2026-08-11 confirmed the exact allowlist key and configured value; no OpenID or value is recorded. Runtime administrator authorization remains part of S7. |
| S6 | Configure and observe `trackSubmission` hard timeout `<=240s` (strictly below the 5-minute lease) | `VERIFIED` | Direct function configuration observation on 2026-08-11 showed a 60-second timeout and deployed `$LATEST` traffic; no configuration change was performed. |
| S7 | Deploy/upload the function and run private owner/admin, rejection, cancel and lease-recovery smoke | `VERIFIED` | The reviewed diagnostic-free function completed anonymous synthetic owner begin/upload/finalize/list/detail to `pending_review`. On 2026-08-19, direct runtime evidence also verified admin list/detail, one exact synthetic rejection and owner synchronization, one exact synthetic cancellation and owner synchronization, plus recovery of a lease stale beyond five minutes. The single real recovery invocation returned `pending_review`; owner list/detail and a read-only database check agreed, the processing lease was absent, and the normalized summary remained 2 points / 1 segment. No real identity/location, timer, public/production release or broad cleanup was involved. |
| S8 | Record daily timer timezone and schedule | `BLOCKED` | Human console screenshot or export with no secrets/identifiers. |
| S9 | Observe server-owned `TRIGGER_SRC=timer` with empty server OpenID | `BLOCKED` | Human timer invocation/log evidence; event body alone is not authority. |
| S10 | Reject normal-client and forged-event attempts to invoke internal cleanup | `BLOCKED` | Human staging calls/logs showing non-timer and forged branches fail closed. |
| S11 | Execute retention dry-run before enabling destructive cleanup | `BLOCKED` | Human dry-run output, due-count and no-delete proof. |
| S12 | Verify duplicate timer delivery is idempotent | `BLOCKED` | Human repeated-delivery output with unchanged facts and no duplicate evidence. |
| S13 | Verify max-20 batch and backlog drain over multiple invocations | `BLOCKED` | Human sanitized cursor/count output; no non-zero due backlog may be called complete. |
| S14 | Verify rollback procedure and orphan/residue scan | `BLOCKED` | Human rollback rehearsal and storage/database residue evidence. |
| S15 | Enable destructive cleanup only after dry-run and rollback rows pass | `BLOCKED` | Separate human authorization; executor must not enable or delete. |
| S16 | Option-A normal client smoke: summary/preview-only review and zero raw presentation/export | `UNVERIFIED_RUNTIME_TOOL` | Real WeChat runtime observation; the CLI build and poisoned-model test are not a device claim. |
| S17 | Import the normal fixture-free `taro-app/dist` in WeChat DevTools | `VERIFIED` | Direct DevTools observation on 2026-08-11: the project uses `dist/` as `miniprogramRoot`, rendered the homepage and secondary community-track page, and initialized CloudBase; existing non-blocking tool warnings are not treated as staging smoke evidence. |
| S18 | Real-device owner/admin private smoke and closed-beta boundary | `UNVERIFIED_RUNTIME_TOOL` | Human device evidence and explicit cohort authorization; no real-user invitation is implied here. |
| S19 | Secret/static/residue audit of changed files and generated normal build | `VERIFIED` | `rg`/source inspection plus `git diff --check`; no real secret/identity/production URL is present, and synthetic fixture values stay test-only. |
| S20 | Production/public release, route catalog promotion and public UGC publication | `BLOCKED` | Outside #123; requires a separate controller/human Issue and review. |

## Offline command matrix

The focused acceptance command and existing child contracts are distinct evidence. A passing local gate means
`READY_FOR_CONTROLLER_REVIEW`, not deployed or device-tested:

| Command | Result |
|---|---|
| `corepack npm@10.9.2 run test:track-acceptance` | `PASS` |
| `corepack npm@10.9.2 run test:track-parser` | `PASS` |
| `corepack npm@10.9.2 run test:track-owner` | `PASS` |
| `corepack npm@10.9.2 run test:track-admin` | `PASS` |
| `corepack npm@10.9.2 run test:track-retention` | `PASS` |
| `corepack npm@10.9.2 run test:track-ui` | `PASS` |
| `corepack npm@10.9.2 test` | `PASS` |
| `corepack npm@10.9.2 run test:integration` | `PASS 55/0` |
| `corepack npm@10.9.2 run lint` | `PASS 0 errors / 9 existing warnings` |
| `corepack npm@10.9.2 run typecheck` | `PASS` |
| `CI=1 corepack npm@10.9.2 run build:weapp` | `PASS` |
| `git diff --check` | `PASS` |

## TDD and mutation evidence boundary

The acceptance script was a test/fixture-only addition on top of already merged C01–C05 seams. Its initial skeleton
ran directly `GREEN` before the later independent literal expectations and mutation probes; no missing-script or
artificial failure was fabricated. This is recorded as `TDD_DEVIATION_INITIAL_GREEN`: the first new vertical slice was
not a production behavior repair, and the focused gate contains independent literal oracles plus mutation probes that
fail when reserved-path binding, forged identity, DTO
privacy, raw action/request, review version/attempt, retention arithmetic, timer authority, max-20 pagination or
catalog facts are weakened. No production defect was discovered; any future defect must be a separate Bug Issue.

## #134 staging finalize diagnosis / final-fix checkpoint — 2026-08-12

The authorized synthetic owner smoke reached reservation and private upload (HTTP 204), then `finalize` returned the
public `storage_unavailable` response and reset the record to `awaiting_upload`. The temporary capture recorded only
the fixed shape `{event, stage, code, category}` with values `track_submission_storage_failure`, `creator_temp_url`,
`storage_unavailable` and `provider`; it contained no identifiers, paths, hosts, URLs, payloads, bytes or provider
messages. Review of the pinned runtime chain found that the underlying `@cloudbase/node-sdk` success item has no
`maxAge`, while `wx-server-sdk` 4.0.2 forwards that possibly missing value despite its public declaration requiring a
number; the adapter incorrectly rejected that observed shape. The local fix keeps request `maxAge` strict at
1–300 and validates the exact file ID, status, non-empty `errMsg` and temporary URL; response `maxAge` may be omitted,
but any returned value must be an integer no greater than requested. Temporary diagnostics and their tests are removed
from the final code. The diagnostic-free fix passed two independent Reviews and was uploaded to the existing staging
function. Human then authorized one post-fix synthetic owner smoke: a new reservation and private upload succeeded,
but `finalize` returned public `store_unavailable`. The run stopped without list/detail, retry, deletion, review,
timer or publication, and diagnostics remained absent. That authorization is consumed. S7 remains `BLOCKED`; any
diagnosis or additional staging invocation requires a new controller scope/authorization.

The subsequently authorized transaction-bound CAS increment recorded a focused RED before implementation, then GREEN
with transaction-only `doc.get`/exact owner-status-version-processing-lease validation/`doc.update` for finalization and
storage/parser resets. Production-shaped tests cover stale conditions, zero-update results, thrown second steps and
absence of partial commits. Two fresh independent Reviews approved the result with no P0–P3. The diagnostic-free
function was then uploaded through WeChat DevTools with cloud-side dependency installation, and a read-only download
proved the deployed owner/repository/storage/entry source equals the reviewed local source. No function invocation or
file upload followed deployment. The human now grants standing authorization for the same privacy-safe synthetic owner
smoke without per-run reconfirmation: one new attempt, the exact five owner stages, stop on first failure and no retry.
Deletion, administrator review, timers, publication, production and real identity/location data remain excluded. S7
remains `BLOCKED` until direct runtime evidence passes.

The first run under this standing authorization used a fresh synthetic attempt and reached reservation/private upload,
then `finalize` returned public `store_unavailable`. It stopped before owner list/detail and did not retry. The service
port was disabled afterward; no diagnostic, deletion, administrator review, timer, publication or production action
occurred. The standing authorization remains available only for one attempt after a later reviewed staging change.

The newly authorized transaction-stage observation increment recorded a focused RED before implementation because the
production-shaped repository emitted no event. GREEN now emits only `{event, stage, result, code}` for the fixed event
`track_submission_transaction_observation`; `start/started` is emitted inside each initialized callback attempt, while
callback-null and rejected-update paths end `commit/committed`, callback/init failures end `commit/not_attempted`, and
only a post-callback commit failure ends `commit/failed`. A real fake commit failure preserves the original records;
default-handler wiring, custom repository/service bypass and throwing-observer isolation are executable tests. Stage
mislabel and extra-key leakage mutations produced RED and were restored. No staging upload or invocation occurred; two
fresh independent Reviews remain required and S7 remains `BLOCKED`.

Two fresh independent Reviews subsequently approved that observation increment. The reviewed repository and entry
files were incrementally uploaded to the existing staging function and the function returned to `Active`; no
deployed-source-equality claim is made because the local DevTools whole-function upload/download helpers did not
complete successfully. The one standing-authorized smoke stopped at `begin` with public `invalid_input` because the
DevTools automation input dropped the non-ASCII synthetic title and submitted an empty title. No private file upload,
`finalize`, owner list/detail, transaction observation, deletion, administrator action, timer, publication or
production action occurred. The service port was disabled and the run was not retried. This is not evidence for or
against the staged transaction/storage behavior; S7 stays `BLOCKED`, and the temporary fixed-enum observation remains
pending a later explicitly initiated run.

A later standing-authorized ASCII-only synthetic run reached reservation and private upload, then stopped when
`finalize` returned public `store_unavailable`. The fixed-enum transaction sequence was `start/started`,
`doc_get/found`, `condition_match/matched`, `doc_update/failed`, `commit/not_attempted`. This proves the transaction
started, read the document and matched the frozen tuple, but its document update failed before commit. No identifier,
path, payload, private input, provider message or secret was retained, and the DevTools service port was disabled.
Pinned-SDK local diagnosis then reproduced the cause: the initial `summary: null` conflicts with the SDK's flattened
`summary.*` update shape. The diagnostic-free candidate uses `db.command.set` only for the non-null parsed summary so
the transaction replaces the top-level value. A pinned serializer regression was RED before the fix and GREEN after;
the ordinary-patch mutation is RED. All temporary observation code/tests are removed. The complete local gates and two
fresh independent Reviews then passed, and Sol uploaded only the diagnostic-free function to existing staging through
WeChat DevTools. A single fresh, standing-authorized synthetic run completed `begin/upload/finalize/list/detail`:
finalize and detail reported `pending_review`, while the owner list returned normally. The run used no real identity or
location, did not retry, and performed no delete, administrator, timer, publication or production action. This closes
the owner-only finalize/list/detail portion but not administrator, rejection, cancel or lease recovery; S7 therefore
stays `BLOCKED`.

## S3/S7 direct staging closure checkpoint — 2026-08-19

The remaining S7 slices were exercised only against anonymous synthetic records. Administrator list/detail succeeded;
one exact `pending_review` record was rejected and synchronized to the owner, and one exact `awaiting_upload` record
was cancelled and synchronized to the owner. A separate synthetic record with a processing lease stale beyond five
minutes was then finalized once through the authenticated Mini Program owner path. The call returned `pending_review`
with no public error. Owner list/detail and a read-only database check agreed; the processing lease was absent and the
normalized summary remained 2 points / 1 segment. The initial local harness attempt did not reach CloudBase because a
browser-scoped clipboard was not the macOS system clipboard; the corrected system-clipboard channel was verified with
a non-sensitive sentinel before the single real function invocation. No retry was issued to CloudBase.

The same read-only console session verified all six required indexes with their exact field order, direction and
unique/non-unique property. No index was created or edited. Sanitized evidence is recorded in live #123 and #134;
#134 was closed only after the runtime blocker passed. S3a–S3f and S7 are now `VERIFIED`. S8–S15 remain `BLOCKED`,
S16/S18 remain `UNVERIFIED_RUNTIME_TOOL`, and S20 remains `BLOCKED`. No timer, production/public release, real identity
or real location was involved; only the two exact synthetic cleanup actions previously authorized by the human were
performed.

## Release conclusion

`CODE_READY_FOR_CONTROLLER_REVIEW`; sanitized direct observation verifies S1–S7 and S17 in addition to offline rows
O1–O8 and local quality gates. S8–S15 and S20 remain `BLOCKED`; S16 and S18 remain
`UNVERIFIED_RUNTIME_TOOL`. The S7 evidence does not authorize timer activation, destructive retention cleanup,
publication, production or a closed-beta invitation.

## C08 retention dry-run implementation checkpoint — 2026-08-20

The local #137 contract now selects the existing destructive path only for exact server
`TRACK_RETENTION_MODE='delete'`; the C06 offline fixture sets that value explicitly so its 30/180-day delete regression
remains intentional. Missing, empty, typo and other values select the fail-closed `dry_run` path. Focused evidence
covers before/equal expiry, pending cleanup, evidence expiry, exact-20 submission/evidence lookahead and exhausted
cursor, 21-row submission and evidence backlogs, mixed bounded pagination, forged/non-timer authority and a
production-shaped due-list seam. Dry-run returns only the fixed mode/count/has-more/current-time/opaque-cursor DTO, with
a combined preview count no greater than 20. Existing repository pagination may issue one read-only continuation
lookahead row (including a `limit:0` evidence peek when 20 submissions fill the budget); it is excluded from counts and
preview data and is never mutated or deleted. Submission update/remove, evidence remove and storage delete remain zero.
This is offline code evidence only: no CloudBase function was invoked, no timer was created/enabled, no staging
configuration changed and no data was deleted. S8–S15 remain `BLOCKED` until the separate human-controlled timer,
dry-run, rollback and cleanup rows are directly observed.
