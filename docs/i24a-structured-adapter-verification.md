# I24a 结构化适配器验证记录

- Goal: `TP-BETA-001`
- Issue: `I24a / #105`
- Branch: `codex/105-structured-advice-adapter`
- Base: `main@6869a7b`
- Activation head: `6d366fb`
- Agent: `luna-worker` (`gpt-5.6-luna`, `max`); runtime model metadata: `UNVERIFIED_RUNTIME_MODEL`
- Status: `READY_FOR_CONTROLLER_REVIEW`
- Date: `2026-08-09`

## TDD evidence

The root `test:advice-context` script was registered before the adapter existed. The first run was a genuine
RED:

```text
npm run test:advice-context
Error: Cannot find module '../cloudfunctions/getAdvice/advice-context'
```

The minimum GREEN adds the pure `advice-context` adapter and its contract test. The test covers complete,
insufficient, place-only and blocked snapshots, the exact eight-key `beta_base_v2` top-level shape, all thirteen
legacy aliases, bounded daily weather, route/source isolation, AI grounding, and representative deletion
mutations. `advice-safety-contract-test.js` rejects the old projection input and keeps deterministic facts when
AI output is invalid or unavailable. `result-page-contract-test.js` exercises full/place/blocked structured
history derivation, including full highest-point elevation with null coordinates.

## Validation matrix

All commands below were run from repository root and exited `0` unless noted. `npm run lint` reports nine
pre-existing warnings and zero errors.

| Gate | Result |
| --- | --- |
| `npm run test:advice-context` | PASS |
| `npm run test:core-input-flow` | PASS |
| `npm run test:response` | PASS |
| `npm run test:trip-context` | PASS |
| `npm run test:safety` | PASS |
| `npm run test:result-page` | PASS |
| `npm run test:trip-flow` | PASS |
| `npm run test:route` | PASS (`91/0`) |
| `npm run test:unit` | PASS (`55/0`) |
| `npm run test:integration` | PASS (`55/0`) |
| `npm test` | PASS |
| `npm run lint` | PASS (0 errors, 9 existing warnings) |
| `npm run typecheck` | PASS |
| `npm run build:weapp` | PASS (`taro build --type weapp`) |
| `git diff --check` | PASS |

The offline integration count is `55/0` rather than the former `56/0`: one retired assertion for advice
`photoTiming`/`microclimate` compatibility fields was removed. It was replaced by a mutation-sensitive assertion
that the advice DTO contains neither weather, sunEvents, photoTiming nor microclimate; no integration path or
rule threshold was removed.

## Contract outcome

- `trip-base.js` emits only `schemaVersion`, `requestSummary`, `routeSnapshot`, `weatherSnapshot`,
  `deterministicResult`, `minimumGear`, `deterministicSafety` and `sourceMetadata`.
- `minimumGear` and `deterministicSafety` are copied from the same deterministic gear-rule result.
- `advice-context.js` consumes exact v2 snapshots and exposes only bounded labels, daily weather, minimum gear and
  deterministic safety to `prompt.js`; no raw hourly payload, route-source DTO or sun event is passed to the LLM.
- `projectSafetyAdvice` accepts exactly `minimumGear + deterministicSafety + aiOutcome` and returns only
  `gear/risks/notes/disclaimer`; the handler adds the restricted `meta` allowlist.
- `trip-context.js` persists `trip_context_v2` and rejects `beta_base_v1`. Stored v1 records map to the existing
  non-retryable `query_context_unavailable` path without an LLM call or version detail.
- Frontend history context uses structured route/source fields: full elevation is the route highest point with null
  coordinates; place-only uses reference elevation/coordinate; blocked uses null elevation/coordinates.

## Scope and limitations

Only the I24a allowlist was changed. Route/weather/verdict thresholds, public phase/error codes, history DTO/storage,
cache schema, dependencies, CI, UI styling, deployment and production configuration were not changed. This is
local offline evidence; it does not claim CloudBase, paid LLM, WeChat DevTools or real-device execution.
