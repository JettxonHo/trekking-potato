# ACTIVE TASK — #141 mobile presentation cleanup

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — C10 REVIEW_FIX`
- Milestone: `C10 Presentation cleanup` under community-track evidence (#115)
- GitHub Issue: `#141`
- Status/Mode: `READY_FOR_CONTROLLER_REVIEW / REVIEW_FIX`
- Controller: Sol XHigh + human operator
- Branch/base: `codex/141-ui-hierarchy` from `main@7a07757`
- Executor: exact custom `luna-worker`, configured `gpt-5.6-luna` / `max`; runtime identity is separate evidence

## 1. Objective and approved design

Apply the human-annotated mobile hierarchy fixes without changing trusted data or workflow contracts:

1. homepage primary query button before secondary `社区轨迹`, with `历史查询` below both and no text overlap;
2. one `AI 补充说明` section heading, with repeated per-line AI prefixes removed while substantive content remains;
3. each hourly weather location independently toggles, is collapsed by default, and shows an existing-fact header
   (location, elevation, hour range/count) before its unchanged hourly rows.

## 2. Exact allowlist

- `taro-app/src/pages/index/index.jsx`
- `taro-app/src/pages/index/index.css`
- `scripts/result-page-contract-test.js`
- `scripts/track-ui-contract-test.js`
- `GOAL.md` lifecycle/status only
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`
- `docs/product-requirements.md`, `docs/testing-strategy.md`, `docs/decision-log.md` only if a durable contract needs sync

No result-page model, service, Cloud Function, API, schema, weather/verdict/advice generator, dependency or config file
may change. Escalate before widening.

## 3. Frozen behavior and safety boundary

- Query, community and history handlers keep their existing meanings; only order/spacing changes.
- Deterministic verdict, minimum gear, weather data, sources and AI/deterministic ownership remain unchanged.
- Prefix cleanup is display-only and cannot discard item, reason, risk, note, disclaimer or unavailable-state content.
- Weather disclosure is page-local presentation state; it never mutates cached/result weather data and computes no new
  weather or safety summary.
- Each disclosure target is at least 88rpx tall, exposes expanded state, and toggles only its own sample.

## 4. Pre-agreed TDD seams and acceptance

Test through:

1. `scripts/track-ui-contract-test.js` for exact homepage element order, handlers and spacing contract;
2. `scripts/result-page-contract-test.js` for display-prefix cleanup and independent disclosure behavior;
3. the existing page render and result model as the only production seams.

Required evidence:

- real focused RED before production edits, then minimal GREEN;
- representative reorder, prefix restoration, default-open/shared-toggle and missing-handler mutations turn tests RED;
- focused UI/result, root tests, integration, lint, typecheck, fixture-free WeChat build and diff-check pass;
- local WeChat project is opened/run for visual inspection; inability to inspect is reported, not fabricated.

## 5. Non-scope and stop conditions

No server/API/schema/storage/community workflow/route/weather/verdict/advice-generation change, dependency, CloudBase
mutation, deployment, timer, deletion, publication or production release. Stop on scope expansion or contract conflict.

## 6. Deliverable

Return `READY_FOR_CONTROLLER_REVIEW` with RED/GREEN/mutation evidence, exact files, local visual evidence and full gates.
The executor cannot approve, merge, deploy or publish. Two fresh independent Reviews and latest-head CI remain required.

## 7. Executor checkpoint — 2026-08-21

- Status: `READY_FOR_CONTROLLER_REVIEW` after focused RED/GREEN, mutation-sensitive UI/result contracts and the full
  local gate matrix.
- Visual boundary: local WeChat DevTools rebuilt and rendered the iPhone 12/13 homepage action hierarchy; no fixture,
  CloudBase call, deployment or result-page runtime claim was made.
- Controller next action: commit/push the bounded Review-fix, then obtain latest-head CI and two fresh exact-head
  independent Reviews before Sol XHigh decides mergeability; approval and merge remain controller-owned.
