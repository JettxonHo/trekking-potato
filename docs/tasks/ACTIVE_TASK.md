# ACTIVE TASK — #143 certainty labels

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — C11 REVIEW_ACTIVE`
- Milestone: `C11 Verdict labels` under community-track evidence (#115)
- GitHub Issue: `#143`
- Status/Mode: `REVIEW_ACTIVE / REVIEW_FIX`
- Controller: Sol XHigh + human operator
- Branch/base: `codex/143-verdict-labels` from `main@e417ab8`
- Executor: exact custom `luna-worker`, configured `gpt-5.6-luna` / `max`; runtime identity is separate evidence

## 1. Objective and approved design

Replace visible internal certainty severities with the established business Chinese labels:

- `no_go` renders as `暂不建议`;
- `caution` renders as `谨慎出发`.

This is display-only. Existing reason messages, order, severity codes, color semantics, overall verdict and deterministic
safety decisions remain unchanged.

## 2. Exact allowlist

- `taro-app/src/pages/index/index.jsx`
- `scripts/result-page-contract-test.js`
- `GOAL.md` lifecycle/status only
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`
- `docs/product-requirements.md` only if durable wording needs clarification

No CSS, result model, service, Cloud Function, API, schema, route/weather/verdict/advice generator, dependency or config
file may change. Escalate before widening.

## 3. Frozen behavior and safety boundary

- The machine-readable `severity` values remain `no_go` / `caution`; only their rendered labels change.
- Every existing reason message remains visible and in the same order.
- The existing red/orange severity styling remains bound to the original severity code.
- No rules, thresholds, weather facts, route facts, cache/history payloads or public contracts change.

## 4. Pre-agreed TDD seams and acceptance

Test through `scripts/result-page-contract-test.js` and the existing result-page render seam in
`taro-app/src/pages/index/index.jsx`.

Required evidence:

- real focused RED before production edits, then minimal GREEN;
- exact visible labels `暂不建议` and `谨慎出发`, with reason content retained;
- removing either label mapping turns the focused test RED;
- focused result test, root tests, lint, typecheck, fixture-free WeChat build and diff-check pass;
- local WeChat simulator is opened for visual inspection; inability to produce the target state is reported.

## 5. Non-scope and stop conditions

No server/API/schema/storage/community workflow/route/weather/verdict/advice-generation change, CSS redesign,
dependency, CloudBase mutation, deployment, timer, deletion, publication or production release. Stop on scope expansion
or contract conflict.

## 6. Deliverable

Return `READY_FOR_CONTROLLER_REVIEW` with RED/GREEN/mutation evidence, exact files, local visual evidence and gates.
The executor cannot approve, merge, deploy or publish. Two fresh independent Reviews and latest-head CI remain required.

## 7. Executor checkpoint — 2026-08-21

- Focused TDD RED preceded the JSX edit; GREEN now verifies exact `no_go`/`caution` business labels, preserved reason
  content/order and original severity styling. Deleting either mapping independently makes the focused contract RED.
- Focused/root tests, lint, typecheck, fixture-free WeChat build and diff-check pass. Local WeChat DevTools rendered the
  result page on the iPhone 12/13 simulator with both labels visible. No deployment, CloudBase call or production action.
- Status: `READY_FOR_CONTROLLER_REVIEW`; latest-head CI, two exact-head independent Reviews and controller approval remain
  required.

## 8. Review-fix round 1 — 2026-08-21

- P2-1 focused RED covered `constructor`, `__proto__`, `toString`, other unknown strings and null/undefined/empty
  fallbacks. GREEN uses one `switch`; the frozen no_go/caution mapping mutations remain independently RED-sensitive.
- Review-fix remains the active #143 slice. The controller owns commit/push and draft-PR publication, followed by
  latest-head CI and two fresh exact-head independent Reviews; no approval, merge, deployment or CloudBase action is
  claimed.
