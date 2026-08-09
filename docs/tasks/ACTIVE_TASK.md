# ACTIVE TASK — C05 private administrator track review UX

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — C05 IMPLEMENTATION_ACTIVE`
- Milestone: `TP-COMMUNITY-001 Community track evidence` (#8)
- GitHub Issue: `#122`
- Status/Mode: `IMPLEMENTATION_ACTIVE / IMPLEMENTATION`
- Controller: Sol XHigh
- Implementation executor: exact custom Agent `luna-worker`
- Branch: `codex/122-track-admin-ui`
- Base: `main@ff5774a`
- Dependency: C04/#121 completed through approved PR #127 (`ff5774a`)

## 1. Objective

Add a private administrator queue, detail, explicit raw-file access and bounded review surface on top of the merged
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
  invalidates pending queue/detail/review/raw responses. Append uses the exact server cursor; malformed/filter-mismatch
  errors follow the server `nextAction` without inventing authority or automatic retry.
- Consume only literal `AdminList`, `AdminListItem` and `AdminDetail` projections. Strip unknown fields recursively,
  including `_openid`, reviewer identity, allowlist/config, raw URL/fileID/path, evidence-store key, exact coordinates,
  secrets and arbitrary SDK data. Displayed approved evidence remains keyless geometry-only evidence.
- Render only `allowedAdminActions` in exact server order: `view_raw`, `request_changes`, `reject`,
  `approve_evidence`. Hide unavailable actions; do not infer authority from status, cleanup, `rawAccess`, cached detail
  or locally remembered role.
- `view_raw` is an explicit user gesture. It calls `admin_get(includeRawLink=true)` only then, keeps the returned URL
  inside the injected service closure, immediately hands it to an injected opener, and never stores/logs/renders/
  caches/copies the URL. Enforce the returned expiry before opening; failure remains an exact manual retry/refresh.
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
- explicit raw request/opener flow, expiry boundary, no URL in state/view/log/cache and no request without user action;
- exact action ordering, review-note/decision/version/attempt identity, same-attempt replay, version-conflict refresh and
  no action outside `allowedAdminActions`;
- owner/admin state and error intents remain isolated; C04 rights/upload/status/revision/cancel behavior does not
  regress;
- precise `index.jsx` wiring for admin entry/list/filter/detail/raw/review/reset and honest loading/disabled controls;
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
