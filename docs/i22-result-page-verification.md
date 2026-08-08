# I22b 结构化结果页验证记录

- Issue: `#95 / I22b`
- Branch: `codex/95-structured-result-page`
- Base: `main@6e12f25`; activation `8bf0ef6`
- Model boundary: `taro-app/src/pages/index/result-page-model.js`
- Visual verification status: `VERIFIED_LOCAL_DEVTOOLS`

## Fixture capability matrix

| Fixture | capability | verdict | dataStatus | AI state | Required visible assertions | Screenshot |
| --- | --- | --- | --- | --- | --- | --- |
| full/go | `full` | `go / 建议出发` | `complete` | `ready` | route name/region/type/fixed days/highest point; hourly weather; minimum gear; route/weather sources | [full-go.png](evidence/i22/full-go.png) |
| full/caution + AI degraded | `full` | `caution / 谨慎出发` | `complete` | `unavailable` | deterministic reasons remain; AI supplement unavailable copy; minimum gear and weather remain visible; no AI verdict/weather override | [full-caution-ai-degraded.png](evidence/i22/full-caution-ai-degraded.png) |
| blocked/no_go | `blocked` | `no_go / 暂不建议` | `complete` | `unavailable` | official restriction; `官方禁行，本次未请求天气`; no weather readings; route source card | [blocked-no-go.png](evidence/i22/blocked-no-go.png) |
| place-only/null | `place_only` | `null / 暂无法判断` | `place_only` | `ready` | place reference weather only; explicit non-complete-route boundary; no route-hourly claim; zero elevation preserved | [place-only-null.png](evidence/i22/place-only-null.png) |

The pure contract fixture covers all four rows and asserts the visible model facts, including `no_go + insufficient`,
known/unknown data-issue labels, source URL `null`, WMO normal/freezing/snow/thunderstorm groups, checklist state,
cache normalization and private history-context isolation.

## Local DevTools visual verification — 2026-08-09

After explicit human authorization and Mac unlock, Sol XHigh injected deterministic fixtures only into the local
WeChat DevTools runtime, refreshed the page and captured all four required states. Each image was inspected against
the visible assertions above. The full/caution capture is intentionally scrolled to the AI card so the degraded copy
is visible; the other three captures show the deterministic result and capability boundary directly.

The temporary fixture module and cache adapter were removed immediately after capture, and the normal WeChat build
was rerun successfully. No fixture switch, production mock, service-port change or runtime debug code remains in the
repository.

## Automated evidence

- `npm run test:result-page` — PASS
- `npm run test:trip-flow` — PASS
- `npm run test:core-input-flow` — PASS
- `npm run test:response` — PASS
- `npm run test:confirmation` — PASS
- `npm run test:trip-context` — PASS
- `npm run test:hourly-weather` — PASS
- `npm run test:trip-verdict` — PASS
- `npm test` — PASS
- `npm run test:integration` — PASS (`56/0`)
- `npm run lint` — PASS (`0` errors; existing warnings only)
- `npm run typecheck` — PASS
- `npm run build:weapp` — PASS (host build)
- `git diff --check` — PASS

## REVIEW_FIX round 1 evidence

- Root-test mutation probe: a temporary throw at the top of `scripts/result-page-contract-test.js` left `npm test`
  green (`exit 0`), while `npm run test:result-page` failed on that throw (`exit 1`). This proves the old root
  command omitted the structured result-page contract.
- GREEN repair: root `test` now ends with `npm run test:result-page`; with the mutation removed, both root `npm test`
  and the focused command execute and pass the result-page contract.
- The executable page-local lifecycle seam is `createChecklistLifecycle`/`applyChecklistLifecycleEvent`. Its fixture
  applies advice started/succeeded/failed/context-unavailable to one base/query and preserves checked items; a
  different base, different queryId, return-to-search or cache restore clears them. The page calls this seam on
  actual base/advice/reset/cache paths; Trip-flow remains the only query state machine.
- `historyResultForAdviceOutcome` produces exactly two write intents for success and ordinary degraded outcomes and
  `null` for context-unavailable. `buildHistorySavePayload` is the page's actual history DTO seam and reads only
  the captured elevation/location/coords/routeType/routeTypeSource; forged advice/meta values are ignored by the
  fixture.

## REVIEW_FIX round 2 evidence

- `scripts/trip-flow-contract-test.js` now extracts the actual `index.jsx` method/branch bodies and asserts the
  concrete lifecycle/save calls: cache restore, return-to-search, onBack, base receipt, advice start/success/failure,
  context-unavailable and success/degraded history writes. The context-unavailable branch is explicitly required to
  contain no `_saveHistory` call.
- Independent source mutations each produced RED (`exit 1`) before restoration: deleting cache restore, return,
  onBack, base receipt, advice start/success/failure, success/degraded intent/save calls, or context lifecycle; and
  inserting `_saveHistory` into context-unavailable. The unmutated focused test is GREEN (`exit 0`).
- The result-page fixture now describes an advice `advice_succeeded` event carrying a new result object; it does not
  claim that a second `base_received` with the same object reference represents a new result.
