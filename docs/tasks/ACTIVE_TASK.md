# ACTIVE TASK — #148 approved B result-summary hierarchy

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — C13 IMPLEMENTATION_ACTIVE`
- Milestone: C13 Result summary hierarchy
- GitHub Issue: `#148`
- Status/Mode: `IMPLEMENTATION_ACTIVE / IMPLEMENTATION`
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
