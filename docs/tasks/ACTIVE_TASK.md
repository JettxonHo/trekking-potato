# ACTIVE TASK — #139 route-search contribution fallback

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — C09 REVIEW_ACTIVE`
- Milestone: `C09 Search contribution UX` under community-track evidence (#115)
- GitHub Issue: `#139`
- Status/Mode: `READY_FOR_CONTROLLER_REVIEW / REVIEW_FIX`
- Controller: Sol XHigh + human operator
- Branch/base: `codex/139-route-upload-fallback` from `main@b582d2c`
- Executor: exact custom `luna-worker`, configured `gpt-5.6-luna` / `max`; runtime identity is separate evidence

## 1. Objective and current truth

Close the route-search dead end without weakening trusted-route boundaries. A unique full route still proceeds
directly; multiple trusted candidates remain selectable; ambiguous or missing routes additionally offer the existing
private GPX/KML submission flow. Submission is an evidence contribution, not immediate advice or automatic publication.

## 2. Exact allowlist

- `taro-app/src/pages/index/index.jsx`
- `taro-app/src/pages/index/index.css`
- `taro-app/src/pages/community-track/index.jsx`
- `taro-app/src/pages/community-track/index.css` only if needed for bounded title-prefill presentation
- `scripts/track-ui-contract-test.js`
- `docs/product-requirements.md`
- `docs/architecture.md`
- `docs/testing-strategy.md`
- `docs/decision-log.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`
- `GOAL.md` controller lifecycle/status only

No model/service/server/API/schema/storage/retention/dependency/config file may change. Escalate before widening.

## 3. Frozen behavior and privacy contract

- Unique full RouteVariant behavior is unchanged.
- Multiple trusted candidates render their existing distinct selection controls plus one final
  `都不是，上传我的轨迹` action.
- Place-only and no-result/location-failed states distinguish limited/manual advice from
  `上传 GPX/KML，补充完整路线`; modify-query/manual-coordinate options remain available.
- Contribution navigation targets only `/pages/community-track/index` and carries at most the bounded original search
  text as an editable draft title. It never carries or infers coordinates, file paths/IDs, consent, identity, admin
  state, raw URL or publication state.
- The secondary page validates and decodes the draft title fail-closed. File selection and consent remain explicit;
  consent stays unchecked and no local upload session is created by navigation.
- Visible copy states that private review does not immediately create full advice and does not automatically publish a
  searchable route.

## 4. Pre-agreed TDD seams and acceptance

Test through:

1. `scripts/track-ui-contract-test.js` executable/source-bounded homepage candidate/no-result bindings;
2. existing trip-flow/getAdvice confirmation and error state, without a second state machine;
3. exact `Taro.navigateTo` target/query and the community page's bounded title-prefill handling.

Required evidence:

- Real focused RED before production edits, then minimal vertical GREEN.
- Candidate route controls and upload fallback bind to distinct correct handlers.
- No-result/location-failed upload remains available alongside manual/modify choices.
- Exact navigation carries only encoded bounded title text; malformed/oversized input fails closed.
- Secondary page prefill never changes consent/file/session/admin state.
- Representative mutations removing either upload entry, misrouting a candidate, leaking extra state or claiming
  automatic publication turn the focused contract RED and are restored.
- Focused UI, confirmation, trip-flow, community acceptance, root tests, integration, lint, typecheck, fixture-free
  WeChat build, diff-check, allowlist and privacy scans pass.

## 5. Non-scope and stop conditions

No automatic catalog promotion/RouteVariant creation, server/API/schema/storage/admin/retention change, public UGC,
raw viewer/download, deployment, CloudBase mutation, timer action, data deletion, production/public release or real
identity/location data. Stop on any scope expansion or contract conflict.

## 6. Deliverable

Return `READY_FOR_CONTROLLER_REVIEW` with RED/GREEN/mutation evidence, exact files and full gates. Round 3 is complete:
the exact no-result mutation preserves the place-only branch, exact fallback/single-`draftTitle` URL forms reject
multiline coordinate leakage, and all required local gates pass. The executor cannot approve or merge. The controller's
draft PR #140 already exists and implementation head `f932857` passed quality. The next action is to commit/push this
docs-only lifecycle correction to that PR, then require fresh latest-head CI and two fresh exact-head independent
Reviews before merge.
