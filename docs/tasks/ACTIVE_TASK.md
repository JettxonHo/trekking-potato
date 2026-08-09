# ACTIVE TASK — C02 owner lifecycle and immutable storage snapshot

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — C02 IMPLEMENTATION_ACTIVE`
- Milestone: `TP-COMMUNITY-001 Community track evidence` (#8)
- GitHub Issue: `#119`
- Status/Mode: `IMPLEMENTATION_ACTIVE / IMPLEMENTATION`
- Controller: Sol XHigh
- Implementation executor: exact custom Agent `luna-worker`
- Branch: `codex/119-track-owner-lifecycle`
- Base: `main@b3e2cd0`
- Dependency: C01/#118 completed through approved PR #124 (`b3e2cd0`)

## 1. Goal and background

Implement the owner-only `trackSubmission` lifecycle: `begin`, `finalize`, `list_mine`, `get_mine` and `cancel`.
It turns C01's pure parser into a trustworthy private server workflow through server identity, private reservation,
immutable review bytes and exact owner DTOs. It does not add administrator modes, UI or deployment.

## 2. Required reading

Read the mandatory governance sequence, live #115/#119, `docs/community-track-workflow.md` §§3–9 and
`docs/development-plan.md` C02. `TRACK-SUBMISSION-1` is authoritative for inputs, modes, errors, records, DTOs,
state transitions, storage binding, side-effect order, expiry and tests.

## 3. Exact allowlist

- `cloudfunctions/trackSubmission/index.js`
- `cloudfunctions/trackSubmission/package.json`
- `cloudfunctions/trackSubmission/package-lock.json`
- `cloudfunctions/trackSubmission/response-contract.js`
- `cloudfunctions/trackSubmission/owner-service.js`
- `cloudfunctions/trackSubmission/storage-adapter.js`
- `cloudfunctions/trackSubmission/submission-repository.js`
- `cloudfunctions/trackSubmission/submission-lifecycle.js`
- root `package.json`
- new `scripts/track-owner-contract-test.js`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

No other file may change without a controller-owned contract update.

Controller-owned Review-fix contract files are additionally allowed only for Sol's concurrency correction:
`docs/community-track-workflow.md`, `docs/development-plan.md`, `docs/testing-strategy.md` and
`docs/decision-log.md`. The implementation executor must not broaden or rewrite those decisions.

## 4. Non-scope

Administrator modes/allowlist/evidence store/retention timer, frontend, real CloudBase collection/index/rule/env
mutation, function deployment, route catalog/publication, public raw access, new authentication, KMZ/URL import,
dependency/framework upgrades and changes to the merged C01 parser contract.

## 5. Frozen constraints

- Add only exact `wx-server-sdk@4.0.2`; preserve exact `saxes@6.0.0` and npm 10 lock generation.
- Inject database, storage, clock and random-ID seams; tests do not contact real CloudBase or public networks.
- Authenticate from `getWXContext().OPENID`; ignore client `_openid`, owner/admin flags and identity-shaped fields.
- Expose only `begin/finalize/list_mine/get_mine/cancel` and the exact response/error shapes from
  `TRACK-SUBMISSION-1`; unknown modes/authority fields grant nothing.
- `begin` validates exact inputs/rights, server-generates the random submission ID and reserved creator/review paths,
  sets immutable 30-minute upload and 30-day record deadlines, and deduplicates exact `{_openid,beginAttemptId}`.
- The same-owner retry returns the first reservation byte-for-byte even if other fields change. Duplicate-key races
  re-read that reservation. Different owners never deduplicate.
- `revisesSubmissionId` requires the same owner, parent `changes_requested`, and one active replacement pointer;
  parent lock + child creation and allowed pointer clearing are transactional.
- `TRACK_STORAGE_FILEID_HOST` is trimmed server-only config with the exact frozen DNS grammar. Missing/malformed config
  fails before database/storage side effects. `validateCreatorFileId` is the single strict host/path seam.
- `finalize` validates the exact reservation and unexpired deadline, obtains a short-lived URL, treats HEAD only as
  optional early rejection, streams at most 10 MiB, verifies GET length when present, uploads those exact bytes to the
  service-owned review path, parses that same Buffer and deletes the creator object best-effort.
- Every transition uses exact authorization/status/version/lease CAS. Processing claims a random five-minute lease;
  fresh retry returns `processing_in_progress`, stale retry may take over, and pre-snapshot storage failure returns the
  record to `awaiting_upload`. Parser failures become `invalid` and begin cleanup.
- The fixed review path is safe only when C06 configures a hard function timeout at most 240 seconds, strictly below
  the 300-second lease. C02 must encode/test this deployment invariant without deploying; an environment that cannot
  prove it cannot enable stale takeover.
- Owner list/detail always require server `_openid` and `recordExpiresAt > now`; expired/foreign/missing all return or
  project not-found without summary/review facts. List order/cursor/limits are exact and filter-independent.
- Before any destructive deletion, the first successful terminal/snapshot CAS atomically marks every planned target
  `deletion_pending`. Success advances it to `deleted`; a failure or interrupted second CAS leaves an honest,
  recoverable pending state. `finalize` replay on `pending_review/invalid` and terminal `cancel` replay retry only
  exact pending targets, never reparse, never touch `deleted`, and a fully clean replay has zero side effects.
- `cancel` transitions only the frozen allowed states, then attempts creator/review deletion. A syntactically valid
  stale `expectedVersion` is accepted only for terminal `cancelled/invalid/rejected` cleanup replay; the service uses
  the current stored version and never fabricates deletion success.
- Cancelling `awaiting_upload` derives the creator file identity from the trusted host plus reserved cloudPath, so an
  upload completed before finalize is still deleted. The returned per-item CloudBase result must match the requested
  fileID: status `0` succeeds, exact pinned-SDK status `-503003` (`storage file not exists`) is idempotent success, and
  every other non-zero/missing/mismatched result fails. A cleanup state CAS/store failure returns `store_unavailable`,
  never a false `cleanup.pending=false` Mine.
- Child terminal transition plus parent revision-pointer clearing is one repository transaction. Parser-invalid and
  cancel paths must not delete shared objects or clear the parent before that transaction wins; replay repairs only
  through the same transactional invariant.
- Exact `Mine`, `MineListItem`, `MineList`, `UploadReservation`, owner action order and all public messages/error
  metadata are frozen. No DTO/log contains OpenID, temporary URL, file path/ID, raw XML or coordinate data outside the
  exact `TrackSummary` projection, filename in logs, rights/provenance URL, SDK/XML details, secrets or future
  evidence-store key.
- Do not add SHA/hash, automatic catalog publication, operational-status/safety/verdict inference or speculative
  compatibility layers.

## 6. Acceptance and tests

Use TDD. Register `test:track-owner` in root `npm test`. Behavior tests must prove at least:

- unauthenticated/forged identity and invalid mode/input/rights/format/config have zero forbidden side effects;
- begin retry isolation, exact first-write response, unique-race reread and different-owner separation;
- retry lookup occurs after validating only the owner-scoped attempt ID and before revalidating changed request
  fields/config, so even an otherwise-invalid retry returns the first reservation byte-for-byte;
- exact fileID URI host/path binding, malformed URI/config cases and no prefix/suffix authority;
- reservation expiry, actual streamed byte limits, GET length mismatch, HEAD non-authority, overwrite/TOCTOU and
  immutable uploaded/parsed bytes;
- finalize idempotency, fresh processing response, five-minute stale lease takeover, storage/store/parser failures,
  CAS/version conflicts, no partial summary authority, and pending-review/invalid cleanup replay without reparsing;
- hard runtime timeout/lease ordering, parser-invalid/reset/cleanup CAS loss, no pre-CAS destructive cleanup and
  actual pinned-SDK per-item delete shapes (`0`, idempotent `-503003`, other failure and fileID mismatch);
- revision same-owner/state/one-active-child transaction and pointer clearing only for allowed terminal child states;
- literal exact-key `Mine/MineListItem/MineList` privacy projections and all eight status/action rows; cursor
  seek/order/filter rules, limit bounds and post-deadline zero projection;
- actual handler `getWXContext().OPENID` wiring and exact CloudBase repository query/transaction/update shapes,
  including owner+attempt `limit(1)`, both `updatedAt DESC`/`_id DESC` orderings, the two strict cursor `lt` branches
  with exact values, child/parent CAS conditions, and server-side `limit+1` rather than an in-memory 1,000-row cap;
- cancel races, atomic pre-delete pending state, creator/review cleanup, cleanup-CAS loss then replay, fully-clean
  zero-side-effect terminal replay, deletion-pending truthfulness and idempotent cleanup retry;
- the merged C01 parser contract and all repository gates remain green.

Required commands:

- `corepack npm@10.9.2 run test:track-owner`
- `corepack npm@10.9.2 run test:track-parser`
- `corepack npm@10.9.2 test`
- `corepack npm@10.9.2 run test:integration`
- `corepack npm@10.9.2 run lint`
- `corepack npm@10.9.2 run typecheck`
- `CI=1 corepack npm@10.9.2 run build:weapp`
- `git diff --check`

## 7. Dependency and merge order

C01/#118 is merged. C02 is the only active child and blocks C03/#120. No parallel work may modify
`cloudfunctions/trackSubmission` or its package/lock while C02 is active.

## 8. Risks and escalation

Stop and return to Sol if exact CloudBase `fileID` host/path binding cannot be implemented without weakening the
contract; if trustworthy bounded server bytes or immutable snapshot require broader permissions; if transaction/CAS
semantics cannot implement revision or owner isolation; if a new dependency/public mode/DTO/error/auth rule is
needed; or if real CloudBase mutation/deployment becomes necessary. Independent implementation work must not continue
through one of these affected boundaries.

## 9. Allowed autonomous choices

Internal pure helper layout, injected seam names and focused fixture organization are allowed inside the exact files.
Public modes, fields, messages, errors, state/action order, limits, side-effect order and dependency choices are not.

## 10. Deliverables

Return code, updated exact lockfile, focused tests, docs checkpoint, actual files, RED/GREEN and full gate results,
deviations, autonomous implementation decisions, limits/risks and a focused draft PR using `Refs #119`. The executor
must not approve or merge its own PR.

## 11. Controller activation checkpoint — 2026-08-09

```text
Governance version: TP-GOV-2.0.0
Goal ID and status: TP-COMMUNITY-001 / ACTIVE — C02 IMPLEMENTATION_ACTIVE
Active milestone: TP-COMMUNITY-001 Community track evidence / C02
Active Issue and mode: #119 / IMPLEMENTATION
Current branch and base: codex/119-track-owner-lifecycle / main@b3e2cd0
Working tree before activation: clean
Dependency: #118 closed after approved PR #124 merged as b3e2cd0
Implementation routing: exact custom Agent luna-worker only; Terra fallback prohibited
```

The activation commit is controller-owned and contains no implementation code. `luna-worker` must re-read all
required sources, verify the branch/worktree, run baselines, record a concise handshake, then create the focused test
and capture a real RED before implementing GREEN.

## 12. Sol Review-fix round 1 — 2026-08-09

Two independent Reviews returned `CHANGES_REQUESTED`. The bounded fix must close: uploaded-before-finalize cancel
cleanup; per-item delete status and truthful cleanup CAS failures; parser/reset cleanup ordering; transactional child
terminal + parent unlock; revision duplicate first-write-wins; retry-before-revalidation; server-side cursor seek;
handler/CloudBase seam behavior tests; and the fixed-path runtime-timeout invariant. No public DTO, user flow,
retention period, dependency, admin mode, UI, deployment or catalog boundary changes.

## 12. Executor implementation checkpoint — 2026-08-09

- The required RED was captured after registering `test:track-owner`: `corepack npm@10.9.2 run test:track-owner`
  failed with `MODULE_NOT_FOUND` before the runner or owner modules existed.
- GREEN remains within this file allowlist. The handler is server-OpenID-only and exposes only the five owner modes;
  injected repository/storage/clock/ID/parser seams keep tests offline. The implementation covers exact begin
  reservation/idempotency/race/revision, strict fileID host/path binding, bounded actual-byte download and immutable
  review copy/parse, processing lease/takeover, CAS/version, expiry/cursor DTOs and cancel deletion-pending retry.
- `wx-server-sdk@4.0.2` is the only added dependency; C01 `saxes@6.0.0` and npm 10.9.2 lock generation remain exact.
  No admin/evidence/retention timer/UI/catalog/CloudBase mutation/deployment path was added.
- Focused behavior test and complete local repository gate matrix are GREEN: owner/parser/root/integration, lint
  (nine pre-existing warnings, zero errors), typecheck, `CI=1` host build, diff-check, allowlist and residue scans all
  pass. Executor status is `READY_FOR_CONTROLLER_REVIEW`; latest-head CI and controller approval remain pending.
