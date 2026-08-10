# ACTIVE TASK — C07 community-track secondary page

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — C07 IMPLEMENTATION_ACTIVE`
- Milestone: `TP-COMMUNITY-001 Community track evidence` (#8)
- GitHub Issue: `#131`
- Status/Mode: `IMPLEMENTATION_ACTIVE / IMPLEMENTATION`
- Controller: Sol XHigh
- Implementation executor: exact custom Agent `luna-worker`
- Branch: `codex/131-community-track-page`
- Base: `main@59ef3c2`
- Dependency: C06 offline acceptance merged through approved PR #130; #123 remains `BLOCKED_STAGING`

## 1. Objective

Move the complete private community-track owner/admin workflow from the main route-query page to a dedicated
`pages/community-track/index` secondary page. Keep the homepage focused on route planning, expose one lightweight
community-track entry, and add the same choice beside the existing route-not-found/manual-coordinate fallback.

Remove the visible CLIMB SUPPORT field from the homepage. Preserve the existing conservative internal
`climbSupport='solo_or_unsure'` request value; this Issue does not change deterministic safety or the server contract.

## 2. Required reading

Read the mandatory governance sequence, live #115/#123/#131, `docs/community-track-workflow.md`, C04/C05 model and
service seams, product requirements, architecture, testing strategy, development plan and TP-D056/TP-D059.

## 3. Exact implementation allowlist

- `taro-app/src/app.config.js`
- `taro-app/src/pages/index/index.jsx`
- `taro-app/src/pages/index/index.css`
- new `taro-app/src/pages/community-track/index.jsx`
- new `taro-app/src/pages/community-track/index.css`
- `taro-app/src/pages/index/track-submission-model.js` only for a minimal reusable export if required
- `taro-app/src/pages/index/track-submission-service.js` only for a minimal reusable export if required
- `scripts/track-ui-contract-test.js`
- `GOAL.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`
- `docs/product-requirements.md`
- `docs/architecture.md`
- `docs/testing-strategy.md`
- `docs/development-plan.md`
- `docs/decision-log.md`

No Cloud Function, API, database schema, storage, index, timer, permission, env, dependency/lockfile, catalog,
route/weather/verdict/history or deployment file may change.

## 4. Frozen product and interface contract

- Register `pages/community-track/index` in Taro app configuration.
- Homepage button navigates with `Taro.navigateTo({url:'/pages/community-track/index'})`.
- The existing manual-coordinate fallback remains. A route-not-found/location-failed state additionally offers
  `提交轨迹供审核` and navigates to the same secondary page.
- The homepage no longer renders the track submission form, owner list/detail, administrator review card or visible
  CLIMB SUPPORT field.
- The secondary page owns private GPX/KML selection, exact rights/consent copy, upload/finalize, list/detail,
  revision/cancel/cleanup and the allowlisted administrator queue/detail/review flow.
- Reuse the existing `track-submission-model` and `track-submission-service` as the single state machine and I/O seam.
  Do not copy or fork reducer, DTO/privacy, retry, token, loading or CloudBase logic.
- Secondary-page unmount invalidates pending local continuations. C04/C05 loading/disabled, stale-response, exact
  reservation-ID, privacy and TP-D056 Option-A raw-inert boundaries remain unchanged.

## 5. TDD and mutation-sensitive acceptance

Record one real focused RED before implementation. The final `test:track-ui` must make representative production
mutations RED for:

- removing either homepage entry or routing it to the wrong page;
- omitting the secondary page from `app.config.js`;
- reintroducing homepage track/admin cards or visible CLIMB SUPPORT;
- bypassing the shared model/service seam;
- removing secondary-page upload/list/detail/admin-review wiring or unmount invalidation.

Required final commands:

- `corepack npm@10.9.2 run test:track-ui`
- `corepack npm@10.9.2 run test:track-acceptance`
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

## 6. Documentation and completion boundary

Synchronize product, architecture, testing, development, decision, current-status and task language. Preserve the
difference between code-ready, the partial staging evidence already verified, and the remaining blocked upload/review/
timer rows. Executor returns `READY_FOR_CONTROLLER_REVIEW`; Sol owns two independent Reviews, PR publication,
latest-head CI, merge and Goal acceptance.

## 7. Stop conditions

Stop before scope expansion, server/API/schema/dependency change, CloudBase mutation, deployment/public release,
destructive cleanup, raw viewer/export, automatic catalog publication, real-user invitation, or any file outside the
allowlist. Preserve unrelated/controller edits; do not approve or merge executor-owned work.
