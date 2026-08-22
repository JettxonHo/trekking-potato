# ACTIVE TASK — #148 approved B result-summary hierarchy

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — C13 REVIEW_ACTIVE`
- Milestone: C13 Result summary hierarchy
- GitHub Issue: `#148`
- Status/Mode: `REVIEW_ACTIVE / REVIEW_FIX`
- Controller: Sol XHigh + human controller
- Branch/base: `codex/148-result-summary-b` from exact `main@b25e521`
- Executor: exact custom `luna-worker`, configured `gpt-5.6-luna/max`; runtime identity is separate evidence

## 1. Objective and frozen design

Implement the human-approved B layout inside the detailed query result page's top summary card:

1. compact `出发建议 · <结论>` above the route name;
2. route name is the only large bold title;
3. no local/prototype/validation tag in real UI;
4. when safe `routePreview` exists: advice → route name → sharp Map → scope/facts → geometry notice/legend;
5. white card surface with subtle top/bottom background depth; foreground text and Map are unaffected;
6. following card title is `判断依据`, containing reason messages only and no repeated overall verdict;
7. no-preview results retain C12 fail-closed behavior with no blank shell.

## 2. Exact allowlist

- `taro-app/src/pages/index/index.jsx`
- `taro-app/src/pages/index/index.css`
- `scripts/result-page-contract-test.js`
- `GOAL.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`
- `docs/decision-log.md`

No other path may change without controller approval.

## 3. TDD seams

- Use the existing result-page render contract; record real focused RED before production JSX/CSS edits.
- Assert exact hierarchy/order, compact advice copy, route-name-only large title, no prototype tag, no duplicated overall
  verdict in `判断依据`, white/depth/sharp-content CSS layering, and C12 no-preview absence.
- Representative order, duplicate-verdict, tag, foreground-blur and no-preview mutations must make the focused gate RED.
- Expected values must be independent literals; do not duplicate production algorithms.

## 4. Non-scope and stop conditions

No verdict/weather/route logic, result model/service/public DTO, geometry generation, catalog data, history pagination,
dependency/config, CloudBase, deployment, private evidence access, timer, deletion, publication or production release.
Stop for any required out-of-allowlist path, public contract change or data/runtime action.

## 5. Verification and delivery

- focused `test:result-page`;
- root `corepack npm@10.9.2 test`;
- integration `55/0`, lint, typecheck, fixture-free `CI=1 build:weapp`;
- `git diff --check`, exact allowlist and privacy/secret scans;
- local WeChat DevTools visual inspection using synthetic/local state only, with a viewable screenshot artifact.

Executor delivers `READY_FOR_CONTROLLER_REVIEW`. Sol XHigh performs actual-diff review and two fresh independent
Reviews before any merge decision. No executor may approve or merge its own work.

## Implementation checkpoint — 2026-08-22

- Focused RED was captured before JSX/CSS edits; focused GREEN now proves the approved order, route-name-only title,
  no prototype/local tag, message-only `判断依据`, neutral gray depth/sharp foreground and fail-closed no-preview path.
- Mutation probes for advice removal, scope reorder, duplicate verdict, prototype tag, verdict-tinted depth and
  foreground blur each fail the focused gate. Full local matrix is green: root tests, integration `55/0`, lint
  (`0 errors / 9 existing warnings`), typecheck, fixture-free WeChat build and `git diff --check`.
- Actual implementation files are the three code/test paths in the allowlist plus the four lifecycle/decision docs;
  no model/service/server/public DTO/history/dependency/CloudBase/deployment/private-evidence action occurred.
- Status: `READY_FOR_CONTROLLER_REVIEW`; local DevTools visual evidence and controller-owned Reviews remain pending.

## Runtime review-fix checkpoint — 2026-08-22

- Controller DevTools found a WXSS compile error from the new universal child selector. Focused RED now forbids
  `.result-verdict-card > *` and requires the explicit `result-verdict-content` foreground wrapper.
- GREEN keeps the Map and start/end labels inside that wrapper and moves z-index there. Focused/root tests, typecheck,
  fixture-free WeChat build and `git diff --check` pass. Controller DevTools now recompiles with zero errors and renders
  the B hierarchy from identity/location-free synthetic local state; the temporary injection was removed and the normal
  homepage restored. Draft PR #149 is open; live GitHub metadata is authoritative, and its same current head requires
  successful quality CI plus two fresh independent Reviews before Sol decides mergeability.

## Accessible-name and no-preview review-fix checkpoint — 2026-08-22

- Independent Review identified two P2 contract gaps: unconditional route-preview-card injection was not independently
  mutation-sensitive, and `aria-label` on Taro `Text` is absent from the generated WeChat template. A severity-only
  label could therefore override or misstate the concrete reason message.
- Focused RED was captured first. GREEN now requires the safe `routeModel.routePreview && routePreviewMap` wrapper,
  keeps `reason.message || '确定性规则提示'` as the visible/reachable Text content, retains severity only in the
  existing `reason-*` class and makes no unsupported aria claim. The message-loss and unconditional-preview mutations
  return RED.
- The C11 overall `verdict.label` mapping remains in the result model; only the unreferenced reason-list display helper
  was removed, avoiding a new lint warning while preserving the message-only UI.
- `RESULT_PAGE_ARTIFACT=1 node scripts/result-page-contract-test.js` is the executable build-artifact gate; it inspects
  generated `dist/pages/index/index.js` for the reason class/message seam and `dist/base.wxml` for no aria-label reliance.
  No model, service, DTO, geometry, history, dependency, CloudBase or deployment path changed.
- Status: `READY_FOR_CONTROLLER_REVIEW`; the controller committed/published this review-fix at exact head `33d1469`
  on PR #149. Live GitHub metadata is authoritative; same-head CI and two fresh independent Reviews remain required
  before Sol decides mergeability. No deployment occurred.

## Round-two exact-preview injection checkpoint — 2026-08-22

- The focused contract now counts every `<View className="route-preview-card">` and self-closing preview-card form,
  requiring exactly one instance immediately under the safe `routeModel.routePreview && routePreviewMap` condition.
- A representative self-closing card injected after the route name is source-changing, Babel-parseable and independently
  RED; the valid unmutated branch remains GREEN. This is a test/docs-only repair; production JSX/CSS is unchanged.
- Exact controller-published head `33d1469` on PR #149 remains the live head. Same-head CI and two independent Reviews
  are still required before Sol decides mergeability.
