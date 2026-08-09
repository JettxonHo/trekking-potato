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
- Owner list/detail always require server `_openid` and `recordExpiresAt > now`; expired/foreign/missing all return or
  project not-found without summary/review facts. List order/cursor/limits are exact and filter-independent.
- `cancel` transitions only the frozen allowed states, then attempts creator/review deletion. Terminal
  `cancelled/invalid/rejected` replay only retries deletion-pending cleanup and never fabricates deletion success.
- Exact `Mine`, `MineListItem`, `MineList`, `UploadReservation`, owner action order and all public messages/error
  metadata are frozen. No DTO/log contains OpenID, temporary URL, file path/ID, raw XML, coordinate, filename in logs,
  rights/provenance URL, SDK/XML details, secrets or future evidence-store key.
- Do not add SHA/hash, automatic catalog publication, operational-status/safety/verdict inference or speculative
  compatibility layers.

## 6. Acceptance and tests

Use TDD. Register `test:track-owner` in root `npm test`. Behavior tests must prove at least:

- unauthenticated/forged identity and invalid mode/input/rights/format/config have zero forbidden side effects;
- begin retry isolation, exact first-write response, unique-race reread and different-owner separation;
- exact fileID URI host/path binding, malformed URI/config cases and no prefix/suffix authority;
- reservation expiry, actual streamed byte limits, GET length mismatch, HEAD non-authority, overwrite/TOCTOU and
  immutable uploaded/parsed bytes;
- finalize idempotency, fresh processing response, five-minute stale lease takeover, storage/store/parser failures,
  CAS/version conflicts and no partial summary authority;
- revision same-owner/state/one-active-child transaction and pointer clearing only for allowed terminal child states;
- exact owner DTO/privacy/action rows, cursor seek/order/filter rules, limit bounds and post-deadline zero projection;
- cancel races, creator/review cleanup, deletion-pending truthfulness and idempotent cleanup retry;
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
