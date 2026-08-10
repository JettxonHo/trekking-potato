# C06 community-track staging validation

- Goal: `TP-COMMUNITY-001`
- Issue: `#123` (parent `#115`)
- Branch/base: `codex/123-track-acceptance` from `main@0e534d49` (activation head `a65a357`)
- Date: `2026-08-10`
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

- `VERIFIED` means the listed offline command or deterministic repository audit was actually run and supports the
  stated claim.
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
| S1 | Create `track_submissions` as private `ADMINONLY` collection | `BLOCKED` | Human console observation and approved staging change record; no executor mutation. |
| S2 | Create `track_review_evidence` as private `ADMINONLY` collection | `BLOCKED` | Human console observation and approved staging change record; no executor mutation. |
| S3a | Verify `track_submissions` index `_openid ASC + recordExpiresAt ASC + updatedAt DESC + _id DESC` (`unique=false`) for owner lists | `BLOCKED` | Human console/query-planner evidence for exact field order and non-unique flag. |
| S3b | Verify `track_submissions` index `status ASC + recordExpiresAt ASC + updatedAt DESC + _id DESC` (`unique=false`) for filtered admin lists | `BLOCKED` | Human console/query-planner evidence for exact field order and non-unique flag. |
| S3c | Verify `track_submissions` index `recordExpiresAt ASC + updatedAt DESC + _id DESC` (`unique=false`) for all-status admin/cleanup scans | `BLOCKED` | Human console/query-planner evidence for exact field order and non-unique flag. |
| S3d | Verify `track_submissions` index `rawExpiresAt ASC + status ASC` (`unique=false`) for raw expiry cleanup | `BLOCKED` | Human console/query-planner evidence for exact field order and non-unique flag. |
| S3e | Verify `track_submissions` index `_openid ASC + beginAttemptId ASC` (`unique=true`) for owner-attempt deduplication | `BLOCKED` | Human console/query-planner evidence for exact field order and unique constraint. |
| S3f | Verify `track_review_evidence` index `expiresAt ASC` (`unique=false`) for evidence expiry cleanup | `BLOCKED` | Human console/query-planner evidence for exact field order and non-unique flag. |
| S4 | Configure and observe the exact server-only storage file-ID host | `BLOCKED` | Human console/config evidence without recording the host value in Git or chat. |
| S5 | Configure and observe server-only `TRACK_REVIEW_ADMIN_OPENIDS` | `BLOCKED` | Human config evidence without recording an OpenID or allowlist value. |
| S6 | Configure and observe `trackSubmission` hard timeout `<=240s` (strictly below the 5-minute lease) | `BLOCKED` | Human function configuration/log evidence before stale takeover is enabled. |
| S7 | Deploy/upload the function and run private owner/admin, rejection, cancel and lease-recovery smoke | `BLOCKED` | Human-authorized staging deployment plus sanitized invocation/log evidence; no production claim. |
| S8 | Record daily timer timezone and schedule | `BLOCKED` | Human console screenshot or export with no secrets/identifiers. |
| S9 | Observe server-owned `TRIGGER_SRC=timer` with empty server OpenID | `BLOCKED` | Human timer invocation/log evidence; event body alone is not authority. |
| S10 | Reject normal-client and forged-event attempts to invoke internal cleanup | `BLOCKED` | Human staging calls/logs showing non-timer and forged branches fail closed. |
| S11 | Execute retention dry-run before enabling destructive cleanup | `BLOCKED` | Human dry-run output, due-count and no-delete proof. |
| S12 | Verify duplicate timer delivery is idempotent | `BLOCKED` | Human repeated-delivery output with unchanged facts and no duplicate evidence. |
| S13 | Verify max-20 batch and backlog drain over multiple invocations | `BLOCKED` | Human sanitized cursor/count output; no non-zero due backlog may be called complete. |
| S14 | Verify rollback procedure and orphan/residue scan | `BLOCKED` | Human rollback rehearsal and storage/database residue evidence. |
| S15 | Enable destructive cleanup only after dry-run and rollback rows pass | `BLOCKED` | Separate human authorization; executor must not enable or delete. |
| S16 | Option-A normal client smoke: summary/preview-only review and zero raw presentation/export | `UNVERIFIED_RUNTIME_TOOL` | Real WeChat runtime observation; the CLI build and poisoned-model test are not a device claim. |
| S17 | Import the normal fixture-free `taro-app/dist` in WeChat DevTools | `UNVERIFIED_RUNTIME_TOOL` | DevTools import/render observation; build success is recorded separately. |
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

## Release conclusion

`CODE_READY_FOR_CONTROLLER_REVIEW`; staging rows S1–S15 (including S3a–S3f) and S20 remain human-blocked, S16–S18 remain
`UNVERIFIED_RUNTIME_TOOL`, and only offline rows O1–O8 plus local quality gates are verified. This record does not
authorize deployment, cleanup enablement, publication or a closed-beta invitation.
