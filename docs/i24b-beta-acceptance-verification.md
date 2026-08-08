# I24b 五试点核心 Beta 自动化验收记录

- Issue: `#106`
- Goal: `TP-BETA-001`
- Milestone: `M7 Acceptance`
- Branch: `codex/106-beta-acceptance`
- Base: `main@1a2f485` (activation checkpoint `bd02f42`; review-fix controller baseline `4808e53`)
- Executor: custom `luna-worker`, logical role `IMPLEMENTER`
- Config: `~/.codex/agents/luna-worker.toml` (`gpt-5.6-luna`, `max`)
- Runtime model visibility: `UNVERIFIED_RUNTIME_MODEL` (the executor does not infer or impersonate runtime metadata)
- Evidence boundary: offline, deterministic and code-only; no deployment, real CloudBase mutation, live API, device run or user test

## TDD evidence

The focused command was registered before the fixture existed. The first real run was intentionally red:

```text
$ npm run test:beta-acceptance
Error: Cannot find module './fixtures/beta-acceptance'
exit 1 (MODULE_NOT_FOUND)
```

The minimum fixture and behavior contract were then added. The focused command is now green:

```text
$ npm run test:beta-acceptance
[getAdvice:advice] DeepSeek 调用失败: LLM response content is not JSON
[getAdvice:advice] DeepSeek 调用失败: LLM网络错误: offline LLM transport
PASS: I24b five-pilot Beta acceptance contract
exit 0
```

The two logged AI failures are intentional offline invalid/transport outcomes. They verify degraded advice while
preserving deterministic facts; they are not hidden test failures.

The review-fix contract keeps the original RED and adds mutation-sensitive RED probes inside the focused GREEN run:

- Each pilot is prepared once by its public canonical name and once by a public reviewed alias, then confirmed with
  its own permanent server candidate ID. Every path reasserts the trusted ID, type, fixed days, capability, source
  IDs/DTO and operational status; a forged or mutated candidate remains rejected.
- Route-source projections are compared field-for-field against the seven-field display DTO (`id`, `tier`, `kind`,
  `title`, `publisher`, `url`, `checkedAt`). Every route day compares stage sample IDs with its evaluated window,
  requires non-empty hourly buckets beginning inside the active window, and checks one request per distinct sample.
- Focused mutations for a missing/replaced sample, empty/out-of-window hour and request-count mismatch are each
  required to throw. Advice mutations removing deterministic gear, fatal risks or rule notes also throw.
- Insufficient weather asserts coded retryable reasons, `retryable=true`, and zero usable/partial evaluated-window
  samples while preserving an independent climb hard `no_go` rule.
- Available, invalid and unavailable AI modes all retain deterministic essential/recommended/optional gear, fatal
  risks and rule notes. Forged client deterministic facts are ignored.

## Acceptance coverage

`test:beta-acceptance` calls the real public `getAdvice.main` handler, production resolver/catalog, hourly weather
projection, `beta_base_v2` builder, TripContext v2 store and queryId-only advice boundary. It uses only an in-memory
CloudBase adapter and a deterministic Open-Meteo/AMap/LLM transport fixture.

| Area | Evidence |
| --- | --- |
| Five exact full pilots | Each row uses public name + alias prepare and legal permanent-ID confirm; all three paths assert permanent ID, canonical name, `full` capability, trusted type, fixed days, route stages, verification/status/date, exact seven-field source DTOs, complete aligned multi-sample hourly windows, deterministic result, minimum gear and server queryId/expiry. |
| Row isolation | Each row independently detects mutations to ID, fixed days, route type and capability; each mutated candidate ID is rejected by the public confirm path. |
| Climb | 四姑娘山二峰 uses `experienced_team`; its deterministic verdict is asserted never to be `go`. |
| Fuzzy confirmation | A fuzzy query returns `confirmation` and performs zero weather, TripContext, AI, AMap or other HTTP side effects. |
| Candidate confirmation | A permanent server candidate ID reaches the trusted base pipeline; forged route/type/days are ignored. |
| Place-only | Manual and AMap paths require explicit route type, retain reference weather semantics, return `verdict=null`, and preserve `user`/`amap` type provenance. |
| Official block | 五台山大朝台 returns `blocked`/`no_go` with `weatherSnapshot=null` and no weather request. |
| Insufficient weather | Offline weather failure yields `dataStatus=insufficient`, coded retryable reasons, `retryable=true` and zero usable/partial windows; novice solo climb still retains its independent hard `no_go`. |
| AI boundary | Available, invalid and transport-unavailable outcomes are all exercised. Advice is queryId-only, has the exact DTO keyset, preserves each deterministic gear category/fatal risk/rule note, ignores forged facts and cannot change route/weather/verdict/gear facts. Missing and stored v1 contexts return `query_context_unavailable` with zero LLM calls. |
| Private history | Save/list is openid-scoped; the same `saveAttemptId` returns the first record without a second add; legacy public UGC modes remain `ugc_disabled`. |
| I23 recovery seams | Pure reducer/recovery contracts cover same-query AI retry, explicit weather re-prepare, frozen history-save retry identity, stale history-list rejection and history prefill with zero network intent. |

The suite is representative rather than Cartesian: one focused case is used for each boundary and no mechanical
coverage score is introduced.

## Review-fix command evidence

The review-fix head was validated after the new assertions and docs were synchronized:

```text
$ npm run test:beta-acceptance
PASS: I24b five-pilot Beta acceptance contract

$ npm test
PASS: all registered contracts (route 91/0, weather 86/0, unit 55/0, I24b green)

$ npm run test:integration
PASS: 55/0

$ npm run lint
0 errors, 9 pre-existing warnings

$ npm run typecheck
PASS

$ npm run build:weapp
Compiled successfully (Taro 4.0.9)

$ git diff --check
PASS
```

## Changed files

- `package.json`: registers `test:beta-acceptance` and runs it from the root `test` command.
- `scripts/beta-acceptance-contract-test.js`: table-driven public acceptance assertions and mutation-sensitive checks.
- `scripts/fixtures/beta-acceptance.js`: deterministic HTTP/CloudBase/history adapters plus immutable expected public
  pilot aliases and seven-field source DTO values; no product logic or route data is reimplemented.
- `docs/i24b-beta-acceptance-verification.md`: this evidence record.
- `docs/current-status.md` and `docs/tasks/ACTIVE_TASK.md`: implementation checkpoint and task status.

No production module, existing test, route-data fragment, dependency, lockfile, CI workflow, visual file, public
contract or persistent data was changed.

## Required command matrix

| Command | Result |
| --- | --- |
| `npm run test:beta-acceptance` | PASS |
| `npm test` | PASS; existing route/unit baselines remain `91/0` and `55/0` |
| `npm run test:integration` | PASS `55/0` |
| `npm run lint` | PASS; 0 errors, 9 pre-existing warnings |
| `npm run typecheck` | PASS |
| `npm run build:weapp` | PASS (`Taro 4.0.9`) |
| `git diff --check` | PASS |

## Limitations and review boundary

This is an offline acceptance contract, not proof of live weather availability, CloudBase permissions, deployment
configuration, WeChat runtime behavior or real-user outcomes. DevTools interaction and screenshots are I24c and remain
blocked until this Issue is reviewed and merged. The verification fixture must not be promoted to production runtime.

No production defect was exposed by this suite. Any future production failure must be split into a focused Bug Issue;
the I24b PR must not absorb unrelated behavior changes.
