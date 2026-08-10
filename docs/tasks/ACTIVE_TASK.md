# ACTIVE TASK — C05 private administrator track review UX

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — C05 REVIEW_FIX_ACTIVE`
- Milestone: `TP-COMMUNITY-001 Community track evidence` (#8)
- GitHub Issue: `#122`
- Status/Mode: `REVIEW_FIX_ACTIVE / REVIEW_FIX round 3`
- Controller: Sol XHigh
- Implementation executor: exact custom Agent `luna-worker`
- Branch: `codex/122-track-admin-ui`
- Base: `main@ff5774a`
- Dependency: C04/#121 completed through approved PR #127 (`ff5774a`)

## 1. Objective

Add a private administrator queue, detail and bounded review surface on top of the merged
eight-mode `trackSubmission` contract. The surface reviews private geometry evidence only; it cannot publish routes,
change route facts/status/verdicts, reveal identities or grant administrator authority from client state.

## 2. Required reading

Read the mandatory governance sequence, live #115/#122, `docs/community-track-workflow.md` §§3 and 5–9,
`docs/development-plan.md` C05, `docs/testing-strategy.md` community gate, and the merged C03/C04 seams. The exact DTO,
error, cursor, status/action, retention and authority contracts in `TRACK-SUBMISSION-1` are frozen.

## 3. Exact allowlist

- `taro-app/src/pages/index/index.jsx`
- `taro-app/src/pages/index/index.css`
- `taro-app/src/pages/index/track-submission-model.js`
- `taro-app/src/pages/index/track-submission-service.js`
- root `package.json`
- focused additions to `scripts/track-ui-contract-test.js`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

No ninth implementation path, dependency, server/API/schema/config or deployment file may change without a
controller-owned contract update.

## 4. Frozen behavior

- Server responses are the only administrator authority. No client flag, local cache, hidden route, OpenID or
  embedded allowlist grants access. `forbidden` and `admin_not_configured` render their exact public messages and
  never expose allowlist values or create an admin session.
- An `admin_list` response may open one page-local admin session only for the current page generation. Reset/back and
  either authorization error clear it. Admin state is never persisted or mixed into owner list/detail state.
- Queue filters are omitted for all statuses or one exact `SubmissionStatus`. Changing filter resets rows/cursor and
  invalidates pending queue/detail/review responses. Append uses the exact server cursor; malformed/filter-mismatch
  errors follow the server `nextAction` without inventing authority or automatic retry.
- Consume only literal `AdminList`, `AdminListItem` and `AdminDetail` projections. Preserve only the contract's bounded
  normalized summary/preview geometry (at most 500 points, with no exact times); recursively strip `_openid`, reviewer
  identity, allowlist/config, raw URL/fileID/path, evidence-store key, any coordinate/raw-track fields outside that
  exact projection, secrets and arbitrary SDK data. Displayed approved evidence remains keyless geometry-only evidence.
- Render only the C05 subset `request_changes`, `reject`, `approve_evidence` when each is present in
  `allowedAdminActions`, preserving their server order. Always filter out `view_raw`; do not infer authority from
  status, cleanup, `rawAccess`, cached detail or locally remembered role.
- The current client must never call `admin_get(includeRawLink=true)` and must not render `rawAccess`, open/download/
  save/share/copy/cache a raw GPX/KML file or signed URL, or retain the prior injected raw-opener seam. The server-side
  raw contract remains dormant for a separate future ephemeral-viewer Issue.
- Review submits exact `submissionId`, current integer `expectedVersion`, one stable random `reviewAttemptId`, one
  decision (`changes_requested`, `rejected`, `approved_evidence`) and the visible note. Manual retry of one frozen
  review intent reuses attempt/payload; a deliberate changed decision/note creates a fresh attempt. No automatic loop.
- Review/cancel races and stale versions are server-authoritative. `version_conflict` refreshes the exact detail;
  replay returns the first stored outcome. Success updates queue/detail only through the returned exact admin DTO and
  invalidates older tokens.
- At/equal `recordExpiresAt` or `rawExpiresAt`, cached UI fails closed: no detail/review/raw action. Client time is UX
  only and cannot grant access; network responses remain server authority.
- The admin surface is visually separated from the owner card, private, accessible with existing controls and honest
  loading/disabled states. It is not a public moderation page and displays no uploader/reviewer identity.

## 5. TDD and acceptance

Extend the existing pure page-local model, injected service and precise production page seam. Before production edits,
add focused tests that fail on the missing administrator behavior, then implement the minimum GREEN. Prove:

- forbidden/admin-not-configured zero-authority behavior and no client-side role flag;
- exact literal admin list/detail/approved-evidence projections with poisoned DTO privacy mutations RED;
- status filter reset, strict cursor append/replace, duplicate/stale response rejection and generation reset;
- exact filtering of `view_raw`/`rawAccess`, zero `includeRawLink` request/open/download/save/share/copy behavior, and
  no URL/path/content in state/view/log/cache;
- exact action ordering, review-note/decision/version/attempt identity, same-attempt replay, version-conflict refresh and
  no action outside `allowedAdminActions`;
- owner/admin state and error intents remain isolated; C04 rights/upload/status/revision/cancel behavior does not
  regress;
- precise `index.jsx` wiring for admin entry/list/filter/detail/review/reset and honest loading/disabled controls;
  representative production call/guard/URL-privacy/action removals must make `test:track-ui` RED.

Required commands:

- `corepack npm@10.9.2 run test:track-ui`
- `corepack npm@10.9.2 run test:trip-flow`
- `corepack npm@10.9.2 run test:result-page`
- `corepack npm@10.9.2 run test:recovery`
- `corepack npm@10.9.2 run test:track-owner`
- `corepack npm@10.9.2 run test:track-admin`
- `corepack npm@10.9.2 run test:track-retention`
- `corepack npm@10.9.2 test`
- `corepack npm@10.9.2 run test:integration`
- `corepack npm@10.9.2 run lint`
- `corepack npm@10.9.2 run typecheck`
- `CI=1 corepack npm@10.9.2 run build:weapp`
- `git diff --check`

## 6. Non-scope and stop conditions

No server/API/schema change, deployment, CloudBase collection/index/rule/env/timer/permission mutation, admin allowlist
value in client/GitHub, public moderation/feed/raw download, identity display, catalog/tier/status publication, route
search/result change, global state library, new dependency or broad visual redesign. Stop and return to Sol if the UI
needs broader raw permissions, embedded identity/allowlist, a new server field/mode, automatic catalog action or a
ninth implementation path.

## 7. Completion and merge order

Executor returns `READY_FOR_CONTROLLER_REVIEW` with RED/GREEN/mutation evidence, exact changed files, full gates,
allowlist/secret audit and runtime-model visibility. It must not commit, push, open/approve/merge a PR, deploy or mutate
CloudBase. Sol owns independent Reviews, publication, latest-head CI and merge. C06/#123 remains blocked until C05 is
remotely verified merged.

## 8.1 Independent Review round 1 — 2026-08-10

Verdict: `CHANGES_REQUESTED`; P0/P3 none. Continue only within the exact existing allowlist.

Required unambiguous fixes:

- bind raw requests to exact admin generation/submission and one single-flight operation; reset, filter change,
  authorization loss, page unload or a newer request must prevent any late download/open side effect;
- distinguish recovery intents: `invalid_cursor + refresh` starts the first page without the stale cursor;
  `version_conflict + refresh` fetches the exact detail and never replays the stale review; ordinary retryable review
  failures alone may reuse the frozen attempt/payload; raw failure preserves a URL-free exact raw intent;
- enforce the contract's global 500-point normalized preview limit across all segments and strip timestamps/unknown
  point fields; literal 500/501 and multi-segment mutations must be RED;
- queue `request_changes` must first open detail for its required note (or otherwise have an honest note input), and
  every visually disabled row/detail action must also fail closed in its handler;
- add precise production behavior/wiring probes for the raw call and late guard, cursor recovery, version-conflict
  detail refresh, queue action routing and review-loading guards. Representative removal must make `test:track-ui` RED.

Human-bound platform decision:

- fixed Taro/WeChat `openDocument` requires a downloaded local path and supports document types only, not GPX/KML.
  Do not replace it with persistent save, clipboard, generic share or another path that lets raw data outlive the
  30-day access boundary. Implement and test the lifecycle guards and an injected opener seam, but stop before choosing
  a new raw display/export capability. Sol will request one bounded human decision after the independent fixes close.

Rerun the full required matrix and return `READY_FOR_CONTROLLER_REVIEW` for the independent fixes plus an explicit
`BLOCKED_RAW_OPEN_DECISION` for the remaining platform seam. No commit, push, PR, deploy or CloudBase action.

## 8.2 Executor checkpoint — 2026-08-10

- Required TDD RED occurred before implementation: focused `test:track-ui` failed on the missing `listAdmin` seam after
  C05 probes were added. GREEN now covers the server-response-only admin session, literal recursive projections,
  filter/cursor generation invalidation, explicit raw opener/expiry and frozen review attempt/payload.
- Representative mutation probes were run and restored: removing the explicit raw request, expiry fail-closed guard,
  poisoned action projection or `allowedAdminActions` page guard each made `test:track-ui` RED.
- Required commands are GREEN under Corepack npm `10.9.2`: focused UI/trip-flow/result-page/recovery/owner/admin/
  retention, root `npm test`, integration `55/0`, lint `0 errors / 9 existing warnings`, typecheck,
  fixture-free `CI=1 build:weapp` and `git diff --check`.
- Admin retry intents are operation-tagged (`admin_list`/`admin_detail`/`admin_review`), authorization loss advances
  all admin generation/tokens, and review notes are bounded to 500 characters across model/service/input. Equality
  expiry probes confirm detail/raw-access copy/actions fail closed at `recordExpiresAt`/`rawExpiresAt`.
- Executor remains `READY_FOR_CONTROLLER_REVIEW`; no commit/push/PR/merge/deploy or CloudBase mutation. Runtime model
  visibility is `UNVERIFIED_RUNTIME_MODEL`; `~/.codex/agents/luna-worker.toml` is configuration-verified as
  `gpt-5.6-luna/max` without a runtime identity claim.

## 8.3 Review-fix executor checkpoint — 2026-08-10

- Independent Review round 1 fixes are GREEN within this allowlist. Focused RED was recorded and restored for global
  `501 !== 500`, raw same-flight `2 !== 1`, late opener guard (`true !== false`), stale version-conflict replay,
  queue `request_changes` detail routing, invalid-cursor first-page recovery, review/raw loading fail-closed guards,
  and filter invalidation. Final focused result: `PASS: C05 track-submission UI contract`.
- Raw operations bind the exact admin generation and submission in model/page/service, single-flight identical
  requests, and invalidate on reset, filter, authorization loss, unmount, newer submission or newer generation before
  opener invocation. The URL stays inside the injected opener closure; raw errors carry only `{submissionId}`.
  Version conflicts clear frozen review intent and refresh exact detail; invalid cursors omit the stale cursor; queue
  `request_changes` opens detail for its required note. No stale review replay or automatic retry loop is introduced.
- Required matrix is GREEN: all focused owner/admin/retention/UI suites, root `npm test`, integration `55/0`, lint
  `0 errors / 9 existing warnings`, typecheck, fixture-free `CI=1 build:weapp`, and `git diff --check`.
- Executor result is `READY_FOR_CONTROLLER_REVIEW` with explicit `BLOCKED_RAW_OPEN_DECISION`: the existing Taro/WeChat
  `openDocument` seam cannot honestly present GPX/KML without a human choice. No save/clipboard/share/new viewer,
  server/API/schema/dependency/config/catalog/deployment change, commit, push, PR or CloudBase action was made.
- Changed implementation/test/docs paths stay within the exact allowlist; controller-owned `GOAL.md` was not edited.
  Runtime model visibility remains `UNVERIFIED_RUNTIME_MODEL`; `~/.codex/agents/luna-worker.toml` is verified as
  `gpt-5.6-luna/max` configuration only.

## 8.4 Review-fix round 2 executor checkpoint — 2026-08-10

- TDD RED preceded production edits: append `admin.loading` allowed `reject`/`approve_evidence` review and `view_raw`
  reducer transitions. GREEN adds the same fail-closed `admin.loading` guard to model review/raw requests and page
  review/raw/retry/error handlers. Focused `test:track-ui` is restored GREEN.
- Behavior tests prove append/loading causes zero raw/reject/approve I/O, `admin_not_configured` clears an opened admin
  session plus pending detail/raw/review state, and the exact `componentWillUnmount` seam calls
  `invalidateAdminRaw`. Removing each guard or the unmount invalidation makes the focused contract RED.
- Current review result is `READY_FOR_CONTROLLER_REVIEW` for this bounded round only. Raw presentation remains
  `BLOCKED_RAW_OPEN_DECISION`; the injected opener is unchanged and no save/clipboard/share/viewer or raw persistence
  is selected. Publication, merge, deployment and C06/#123 unlock remain controller-owned gates.
- Full required matrix, allowlist/secret audit and runtime-model visibility must be rerun on this latest head before
  Sol XHigh review. No commit, push, PR, merge, deploy or CloudBase mutation is permitted.

## 9. Human decision and Review-fix round 3 — 2026-08-10

- The human selected option A: complete the private community-submission and administrator-review loop using only the
  normalized summary, keyless approved evidence and at most 500 preview points. The C05 client does not present raw
  GPX/KML. A safe ephemeral track viewer is a separate future Issue after this loop; it is not part of #122.
- Remove the current frontend raw capability completely within the existing allowlist: no `view_raw` button/copy,
  no `rawAccess` projection, no `ADMIN_RAW_*` state/retry intent, no `openAdminRaw`/injected opener, no
  `includeRawLink=true`, and no Taro open/download/save/share/clipboard path. The server/API/schema remain unchanged.
- TDD must first make the focused contract RED against the current raw rendering/request path. GREEN must prove that
  a poisoned server DTO containing `view_raw` and `rawAccess.url` still yields only the three review actions, no raw
  text/URL/state, and zero raw network or platform I/O. Representative reintroduction of the action, request, URL
  projection or opener call must make `test:track-ui` RED.
- Preserve all approved C05 queue/detail/review, pagination, expiry, stale-response and loading behavior. Rerun the
  full required matrix, allowlist/secret audit and two independent Reviews. No commit, push, PR, merge, deployment or
  CloudBase mutation until Sol publishes the reviewed head.

## 9.1 Executor checkpoint — 2026-08-10

- TDD RED preceded production edits: the option-A behavior tests failed against the old `admin_get` request because it
  still included `includeRawLink: false`; the failure was restored to GREEN after the raw client path was removed.
- GREEN now projects only the three review actions in server order, filters `view_raw`, omits `rawAccess`, removes
  `ADMIN_RAW_*` reducer/retry state and `openAdminRaw`/injected opener, and sends `admin_get` without any raw-link field.
  The page contains no raw open/download/save/share/clipboard path; poisoned `view_raw`/`rawAccess.url` is inert.
- Mutation-sensitive reintroduction of the action, request field, raw projection and opener each made focused
  `corepack npm@10.9.2 run test:track-ui` RED; restored result is `PASS: C05 track-submission UI contract`.
- Full required matrix passes on this head: focused suites, root tests, integration `55/0`, lint `0 errors / 9 existing
  warnings`, typecheck, fixture-free WeChat build and `git diff --check`. Allowlist and secret/static audits pass.
- Result: `READY_FOR_CONTROLLER_REVIEW`. `BLOCKED_RAW_OPEN_DECISION` is retired for C05 option A because raw rendering is
  removed; any future ephemeral viewer is a separate Issue. No server/API/schema/storage/retention/dependency/deploy/
  CloudBase/commit/push/PR/merge action is authorized; runtime identity remains `UNVERIFIED_RUNTIME_MODEL` and the
  exact `luna-worker` TOML is configuration-verified as `gpt-5.6-luna/max`.
