# ACTIVE TASK — C04 private owner track submission and status UX

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — C04 REVIEW_ACTIVE`
- Milestone: `TP-COMMUNITY-001 Community track evidence` (#8)
- GitHub Issue: `#121`
- Status/Mode: `READY_FOR_CONTROLLER_REVIEW / REVIEW`
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

## 13. Executor implementation checkpoint — 2026-08-09

- RED: after registering `test:track-ui`, the focused command failed with `MODULE_NOT_FOUND` for the missing
  `track-submission-model.js`.
- GREEN: the allowlisted model/service/page/CSS/test changes implement the frozen owner UX. Temporary reservation,
  local path and opaque file ID stay inside the injected service closure; page state contains only safe metadata and
  server-projected DTOs. Rights copy, action/error/status, expiry and stale-token behavior are contract-tested.
- Validation: `test:track-ui`, `test:trip-flow`, `test:result-page`, `test:recovery`, `test:track-owner`, root
  `npm test`, integration `55/0`, lint `0 errors / 9 existing warnings`, typecheck, `CI=1 build:weapp` and
  `git diff --check` all pass with Corepack npm `10.9.2`.
- Scope audit: only the exact eight allowlisted files changed; no new dependency, CloudBase/server/schema/config/
  deployment mutation, secret, public feed, admin UI or catalog mutation. Executor returns `READY_FOR_CONTROLLER_REVIEW`;
  no commit, push, PR, approval or merge was performed.

## 14. Independent Review round 1 contract — 2026-08-10

Verdict: `CHANGES_REQUESTED`; P0/P3 none. The existing exact eight-file implementation allowlist remains unchanged.
`GOAL.md` lifecycle status is controller-owned and is not implementation scope.

Required bounded fixes:

- make list/detail/mutation tokens strictly monotonic across repeated requests and reset; starting a revision, choosing
  a different local file or reset/back invalidates pending begin/upload/finalize responses;
- give the private service session a generation/snapshot guard so `clearSession` during an awaited choose/begin/upload/
  finalize never throws, writes into a replacement session or continues a stale chain;
- preserve a bounded non-sensitive operation intent for begin/upload, list, detail, cancel and cleanup retry so exact
  server `retry/refresh/restart_upload/contact_admin` semantics replay only the originating manual operation; a fresh
  page cannot pretend that an `awaiting_upload` reservation is resumable without its private local session;
- replace clone-all owner DTO handling with literal allowlist projection, recursively excluding unknown OpenID/admin/
  raw URL/path/fileID/evidence/coordinate/secret fields from model, view and page state;
- add mutation-sensitive executable page-orchestration or precise bounded branch assertions proving the real privacy
  copy, unchecked consent, picker/begin/upload/finalize, list/detail, revision, cancel/cleanup, reset, response dispatch
  and stale guards; representative production wiring removal or consent/copy mutation must be RED;
- cover terminal cleanup pending vs fully clean, consecutive/out-of-order request tokens, revision/reset async races,
  poisoned DTOs, and list/detail/cancel/upload operation-specific error recovery;
- meet the frozen 44px target for every new interactive control, use accessible selected semantics for rights bases,
  replace the clickable close Text with a proper control, and show/disable honest list/detail/mutation loading states.

The executor reruns the complete frozen matrix and returns `READY_FOR_CONTROLLER_REVIEW`; it must not commit, push,
open a PR, deploy or mutate CloudBase. If a required fix needs server DTO/mode changes or a ninth implementation path,
stop and return to Sol rather than expanding scope.

## 15. Review-fix executor checkpoint — 2026-08-10

- RED: the new round-1 focused probes first failed because an awaited local picker continuation wrote a late file after
  `clearSession` instead of resolving as stale.
- GREEN: model list/detail/mutation tokens are strictly monotonic; revision, new-file selection and reset/back invalidate
  upload/finalize continuations. The injected service uses generation/session snapshots for deferred choose/begin/upload/
  finalize and never throws or writes into a replacement session after clear.
- GREEN also records bounded operation intent for begin/upload/list/detail/cancel/cleanup, routes exact retry/refresh/
  restart/contact-admin semantics to the originating manual action, hides fresh-page `awaiting_upload` continuation
  without a private local reservation, and uses literal recursive owner DTO/summary projection with no poisoned extras.
  Terminal cleanup-pending and clean rows are distinct; rights are unchecked by every fresh/revision form; new controls
  meet 88rpx/44px targets with selected semantics, a close Button and honest loading/disabled state.
- Mutation evidence: focused `test:track-ui` was intentionally made RED by removing the production rights-copy render,
  forcing `checked={true}`, and removing `_trackResponse`'s stale guard; each failure was observed and the exact line
  restored before the final run.
- Validation: focused UI/trip-flow/result-page/recovery/owner contracts, root `npm test`, integration `55/0`, lint
  `0 errors / 9 existing warnings`, typecheck, `CI=1 build:weapp` and `git diff --check` all pass under Corepack npm
  `10.9.2`. No commit/push/PR/approval/merge, deployment, server/schema/config change or real CloudBase mutation.
- Scope: only the exact eight implementation allowlist files changed; controller-owned `GOAL.md` lifecycle sync remains
  outside executor scope. Executor returns `READY_FOR_CONTROLLER_REVIEW`; runtime model visibility remains
  `UNVERIFIED_RUNTIME_MODEL`.

## 16. Independent Review-fix round 1 re-review — 2026-08-10

Verdict: `CHANGES_REQUESTED`; P0/P3 none. Continue within the same exact eight-file implementation allowlist.

Required final bounded fixes:

- bind resumable upload state and every `hasUploadSession/resumeUploadFinalize` call to the exact reservation and row
  `submissionId`; an A session must hide and reject B's upload action;
- keep upload/begin/finalize busy state independent from list/detail/mutation loading so interleaved requests never
  unlock inputs, hide progress or permit a second upload/finalize; double click must cause one CloudBase upload only;
- freeze safe, exact retry arguments: list append/cursor, detail submissionId, and cancel/cleanup submissionId,
  expectedVersion and action. Main submit handles begin/upload only; an unrelated error action replays only its source;
- add an explicit file-selection-failed/cancelled transition so service invalidation and page file/reservation/session
  state remain identical after an invalid or cancelled re-pick;
- give list/detail/cancel/cleanup/upload retries honest operation-specific labels and render explicit contact-admin
  guidance; visibly disable Checkbox, rights choices, list/detail actions and submit conflicts while busy;
- use WeChat-supported interactive semantics for rights selection rather than relying on a View role that is not
  authoritative on this target;
- add behavior and production-wiring probes for A/B identity mismatch, upload double click, begin/upload interleaved
  with list/detail/mutation, append retry cursor preservation, frozen cancel/cleanup version, invalid re-pick, visible
  labels/contact guidance and removal of each operation-specific dispatch/guard. Each representative mutation is RED.

Rerun the complete frozen matrix and return `READY_FOR_CONTROLLER_REVIEW`. No commit/push/PR/deploy/CloudBase action.

## 17. Review-fix round-2 executor checkpoint — 2026-08-10

- RED: the new focused probes first observed two CloudBase `begin` calls for a double click; the expected single-flight
  contract failed with `2 !== 1` before production GREEN.
- GREEN: service generation/session state now binds resumable upload and finalize to exact `reservation.submissionId`,
  hides/rejects A/B mismatches, and single-flights begin/upload/finalize independently. Page/model `uploadBusy` is
  separate from list/detail/mutation loading and remains true across interleaved responses; progress and form locks do
  not disappear. `isUploadBusy` is observable at the injected service seam.
- GREEN: bounded retry intent preserves list append/cursor, detail submissionId and cancel/cleanup submissionId,
  expectedVersion/action. Main submit handles begin/upload only; file picker invalid/cancelled transitions invalidate
  the service and atomically clear page file/reservation/session. Operation-specific retry labels and explicit
  contact-admin guidance are visible. NutUI `RadioGroup`/`Radio` replaces non-authoritative View radio semantics;
  Checkbox, rights and list/detail actions visibly disable during upload busy.
- Mutation RED→GREEN evidence covers list retry→begin, cancel/cleanup no-op, upload token guard removal, A/B identity,
  double-click single-flight, list/detail/mutation interleaving, append cursor loss, picker invalidation and service
  single-flight removal. Every temporary mutation was restored before final gates.
- Validation: `test:track-ui`, `test:trip-flow`, `test:result-page`, `test:recovery`, `test:track-owner`, root
  `npm test`, integration `55/0`, lint `0 errors / 9 existing warnings`, typecheck, `CI=1 build:weapp` and
  `git diff --check` all pass with Corepack npm `10.9.2`.
- Scope and status: only the exact eight-file allowlist changed; `GOAL.md` remains controller-owned and unedited. No
  dependency/server/schema/config/deployment/CloudBase/public-feed/admin/catalog mutation; no commit/push/PR/approval/
  merge. Executor returns `READY_FOR_CONTROLLER_REVIEW`; runtime model visibility is `UNVERIFIED_RUNTIME_MODEL`.

## 18. Review-fix round-3 executor checkpoint — 2026-08-10

- Human authorization on live #121 permits this final bounded repair only. The exact eight-file allowlist remains
  unchanged and `GOAL.md` stays controller-owned. TDD RED was recorded after adding deferred A→B service tests and
  invalid-cursor page-branch assertions: focused `test:track-ui` failed because B inherited A's pending upload result.
- GREEN binds upload/finalize in-flight slots to exact `submissionId`: same-ID calls reuse one pending operation, while a
  different ID during A's pending operation returns `invalid_state` without a second storage or CloudBase call.
- GREEN preserves ordinary list retry `append`/`cursor`; `invalid_cursor` with `nextAction=refresh` now forces the first
  page (`append=false`, `cursor=null`) instead of replaying a stale cursor.
- Mutation RED→GREEN evidence: removing upload guard, finalize guard, or invalid-cursor first-page branch each made
  `test:track-ui` fail; each exact implementation was restored. Same-ID reuse, A→B rejection and ordinary append/cursor
  retry are executable assertions.
- Final frozen matrix exits 0 under Corepack npm `10.9.2`: focused UI/trip-flow/result-page/recovery/owner, root
  `npm test`, integration `55/0`, lint `0 errors / 9 existing warnings`, typecheck, `CI=1 build:weapp`, and
  `git diff --check`. No commit/push/PR/merge, deployment, server/schema/config or CloudBase mutation. Runtime model
  visibility remains `UNVERIFIED_RUNTIME_MODEL`; executor status is `READY_FOR_CONTROLLER_REVIEW`.

## 19. Review-fix round-4 executor checkpoint — 2026-08-10

- Human authorization on live #121 limits this compatibility repair to the existing exact eight-file allowlist;
  controller-owned `GOAL.md` remains untouched. TDD RED was recorded before GREEN when `test:track-ui` rejected the
  missing WeChat `CheckboxGroup` production binding. The focused contract now requires group `onChange` reading
  `detail.value`, upload-busy controls and distinct cancel/cleanup dispatch branches.
- GREEN renders the installed Taro `CheckboxGroup` around the rights `Checkbox`; the handler derives the literal
  `track-rights-v1` selection from the group's `detail.value` array. While `uploadBusy`, list refresh, row detail,
  load-more and row actions are visibly disabled and their handlers fail closed. `cancel` and `retry_cleanup` remain
  separate server-projected branches. No dependency or platform API change was made.
- Mutation-sensitive focused probes each produced RED and were restored: moving/removing the group callback, reading
  the wrong consent field, removing refresh/detail guards, removing list/load-more disabled expressions, removing row
  class/`aria-disabled` or its detail `onClick`, removing the action upload-busy guard, and deleting either cancel or
  cleanup branch.
- Full frozen matrix exits 0 under Corepack npm `10.9.2`: focused UI/trip-flow/result-page/recovery/owner, root
  `npm test`, integration `55/0`, lint `0 errors / 9 existing warnings`, typecheck, `CI=1 build:weapp`, and
  `git diff --check`. Exact allowlist remains unchanged; no commit/push/PR/merge, deploy or CloudBase mutation.
  Runtime model visibility remains `UNVERIFIED_RUNTIME_MODEL`; executor status is `READY_FOR_CONTROLLER_REVIEW`.

## 20. Local final Review checkpoint — 2026-08-10

- Two independent Sol reviewers inspected the complete round-4 worktree and returned `APPROVED` with no P0–P3
  findings. They independently verified the installed Taro `CheckboxGroup` contract, upload-busy interaction guards,
  distinct cancel/cleanup wiring, exact-ID single-flight behavior, invalid-cursor recovery, privacy projection and
  the full local gate matrix.
- These approvals are pre-publication worktree evidence, not GitHub latest-head evidence and not a merge decision.
  Remaining controller work is one focused draft PR with `Refs #121`, latest-head `quality`, two exact-head Reviews,
  and only then a Sol ready/squash-merge decision. #121 remains open and #122–#123 remain dependency-blocked.

## 21. Publication checkpoint — 2026-08-10

- Controller commit `22107f4` is published as draft PR #127 over exact base `main@a809f54`; the PR is OPEN,
  MERGEABLE/CLEAN and uses `Refs #121`. GitHub latest-head `quality` run `31327348582` passed.
- The first exact-head Review found only this durable-status lag; it found no product, privacy, compatibility, test or
  scope defect. This additive docs-only checkpoint records the live PR/CI facts without claiming approval, merge,
  Issue closure, deployment or real CloudBase execution.
- PR #127's live GitHub latest-head `quality` check is the authoritative current head/CI fact source. Remaining gate:
  that live check and both exact-head Reviews must pass before Sol decides ready/squash merge. #121 remains open and
  #122–#123 remain dependency-blocked.
