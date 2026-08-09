# ACTIVE TASK — C04 private owner track submission and status UX

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — C04 IMPLEMENTATION_ACTIVE`
- Milestone: `TP-COMMUNITY-001 Community track evidence` (#8)
- GitHub Issue: `#121`
- Status/Mode: `IMPLEMENTATION_ACTIVE / IMPLEMENTATION`
- Controller: Sol XHigh
- Implementation executor: exact custom Agent `luna-worker`
- Branch: `codex/121-track-owner-ui`
- Base: `main@a809f54`
- Dependency: C03/#120 completed through approved PR #126 (`a809f54`)

## 1. Objective

Add the owner-facing local GPX/KML submission, exact rights/retention consent, private reserved upload/finalize, own
list/detail, revision, cancellation and cleanup-retry experience over the merged eight-mode server contract. This is
private evidence intake, not a public community feed.

## 2. Required reading

Read the mandatory governance sequence, live #115/#121, `docs/community-track-workflow.md` §§2, 3, 6–9,
`docs/development-plan.md` C04 and `docs/testing-strategy.md` community gate. The exact copy, DTOs, status/actions,
errors, retention and authority in `TRACK-SUBMISSION-1` are frozen.

## 3. Exact allowlist

- `taro-app/src/pages/index/index.jsx`
- `taro-app/src/pages/index/index.css`
- new `taro-app/src/pages/index/track-submission-model.js`
- new `taro-app/src/pages/index/track-submission-service.js`
- root `package.json`
- new `scripts/track-ui-contract-test.js`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

No other file may change without a controller-owned contract update.

## 4. Non-scope

Administrator UI, public feed/share/download, route search/result changes, visual redesign, global state library,
background or automatic retry, Cloud Function/schema/config/deployment, CloudBase collection/index/rule/env/timer/
permission mutation, catalog/tier/status publication, new dependency, KMZ/ZIP/URL import and third-party scraping.

## 5. Frozen behavior

- Before `begin`, show the exact `track-rights-v1` privacy/retention/no-publication block from the workflow plus the
  selected basis line. Consent starts unchecked on every fresh/prefilled revision form. Rights bases are exactly
  `own_recording`, `authorized_by_creator`, `open_license`; open licence requires its exact name and URL fields.
- Choose exactly one local `.gpx` or `.kml` through the supported WeChat/Taro file picker. Local extension and
  `1..10,485,760` declared size are UX checks only; the server remains authority. KMZ/ZIP/remote URL are unavailable.
- The service calls `begin`, uploads only to the exact server-returned `cloudPath`, then calls `finalize` with the
  opaque `fileID` returned by CloudBase. It never constructs, parses, persists or trusts a storage path/fileID.
- Client-generated `beginAttemptId` is stable across manual retry of one frozen begin payload. A deliberate new
  submission or revision receives a fresh attempt. No automatic retry or hidden network loop exists.
- The owner screen consumes only `UploadReservation`, `Mine`, `MineList` and exact error responses. It renders all
  eight statuses and uses only server-projected `allowedActions` in exact order; unavailable actions are hidden.
- `upload_finalize`, `refresh`, `begin_revision`, `cancel` and `retry_cleanup` are the only owner actions. Revision
  pre-fills allowed non-sensitive form fields and sends `revisesSubmissionId`, but requires a new local file, fresh
  rights selection/consent and a new attempt. It never overwrites the prior record.
- Cursor pagination and every request use monotonic page-local tokens. Stale list/detail/upload/finalize/cancel
  responses cannot overwrite a newer screen/form/session. Reset/back invalidates pending responses.
- There is no automatic processing polling. `processing_in_progress` exposes a user-triggered refresh and its stable
  server retry copy; network/store/storage failures expose only the exact `nextAction` semantics.
- Logical expiry is fail-closed in the client too: expired cached rows render unavailable and cannot expose detail,
  revision, cancel, raw or retry actions. Client time is UX only and never grants server authority.
- Cancellation is explicit. Cleanup failure remains visible through `cleanup.pending`; `retry_cleanup` invokes the
  same server `cancel` mode with the current version and never claims physical deletion before the returned state.
- No OpenID, admin state, raw URL, storage path, fileID, evidence key, exact coordinates or secret enters page state,
  local cache, logs or visible copy.

## 6. Pre-agreed TDD seams and acceptance

The TDD seams are frozen by Issue #121: a pure page-local model, an injected CloudBase/file service, and precise
production page wiring. Register `test:track-ui` in root `npm test`, record a real focused RED before GREEN, and prove:

- literal exact rights/privacy copy, no default consent, three bases, open-license requirements and reset/revision
  consent behavior;
- picker count/type/extension behavior, local filename/extension/declared-size validation and no network on invalid
  local input;
- executable `begin → exact reserved cloudPath upload → opaque fileID finalize` with request/payload literals and no
  client path construction; begin/upload/finalize failures map to exact error/next-action UI intents;
- frozen retry identity/payload for manual begin retry, fresh identity for new/revision, and zero automatic retry;
- exact eight-status label/action rows and exact server action order; deleting, inventing or reordering an action is
  RED, and the client never infers action from status/cleanup;
- own list/detail, strict cursor append/replace semantics, duplicate suppression if required by the model, stale-token
  rejection for initial load, next page, detail and mutation responses, and reset/back invalidation;
- processing manual refresh, changes-requested revision prefill/new-file/new-consent/new-attempt, active cancel,
  terminal pending cleanup retry and fully-clean terminal zero action;
- literal exact error code/message/retryability/nextAction mapping for representative restart-upload, refresh, retry,
  contact-admin and non-retryable cases; SDK/internal details never render;
- at/equal logical record expiry the model strips actions and blocks detail/mutation locally while preserving an
  honest unavailable row; server response remains authoritative for any network attempt;
- production `index.jsx` creates the injected service and connects picker/begin/upload/finalize/list/detail/revision/
  cancel/retry/refresh/reset branches to the pure model. Bounded source-wiring mutations removing each critical call
  must make `test:track-ui` RED without adding a second page state machine;
- existing trip-flow/result-page/recovery contracts and the complete repository gates remain green.

Required commands:

- `corepack npm@10.9.2 run test:track-ui`
- `corepack npm@10.9.2 run test:trip-flow`
- `corepack npm@10.9.2 run test:result-page`
- `corepack npm@10.9.2 run test:recovery`
- `corepack npm@10.9.2 run test:track-owner`
- `corepack npm@10.9.2 test`
- `corepack npm@10.9.2 run test:integration`
- `corepack npm@10.9.2 run lint`
- `corepack npm@10.9.2 run typecheck`
- `CI=1 corepack npm@10.9.2 run build:weapp`
- `git diff --check`

## 7. UX boundary

Use the existing page typography, cards, form controls, color tokens and spacing. Add a bounded owner submission entry
and private status area without changing the main route-planning/result hierarchy. Long privacy copy may use a
readable inset panel, but cannot be collapsed before consent. Accessibility: visible labels, focus behavior supported
by current components, at least 44px interactive targets, honest disabled/loading states and no color-only status.

## 8. Dependency and merge order

C03/#120 is merged and closed. C04 is the only active child and blocks C05/#122. C04/C05 remain serial because both
own the same page/model/service surface. C06/#123 remains blocked and owns all deployment/runtime mutation.

## 9. Stop conditions

Return to Sol before any new permission, public community surface, additional identity collection, new global state or
dependency, server mode/DTO/error change, storage-path assumption, browser/platform scraping, visual redesign,
CloudBase/deployment mutation or allowlist expansion. Do not silently weaken consent, privacy, retention or stale-
response handling to fit platform limitations.

## 10. Allowed autonomous choices

Page-local helper organization, internal pure event names, injected service method names, exact fixture layout and CSS
inside the current visual language are autonomous as long as the frozen public behavior and tests stay unchanged.

## 11. Deliverables

Return implementation summary, actual files, RED/GREEN, command results, mutation evidence, deviations, decisions,
known limits and a focused draft PR using `Refs #121`. The executor cannot approve or merge its own work.

## 12. Controller activation checkpoint — 2026-08-09

```text
Governance version: TP-GOV-2.0.0
Goal ID and status: TP-COMMUNITY-001 / ACTIVE — C04 IMPLEMENTATION_ACTIVE
Active milestone: TP-COMMUNITY-001 Community track evidence / C04
Active Issue and mode: #121 / IMPLEMENTATION
Current branch and base: codex/121-track-owner-ui / main@a809f54
Working tree before activation: clean
Dependency: #120 closed after approved PR #126 merged as a809f54
Implementation routing: exact custom Agent luna-worker only; Terra fallback prohibited
Pre-agreed seams: pure track-submission model, injected file/CloudBase service, exact index.jsx production wiring
```

The activation commit is controller-owned and contains no C04 implementation code. `luna-worker` must re-read the
required sources, verify branch/worktree, run baselines, report the mandatory handshake and record a real focused RED
before implementing GREEN.
