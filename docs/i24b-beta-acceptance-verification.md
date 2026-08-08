# I24b 五试点核心 Beta 自动化验收记录

- Issue: `#106`
- Goal: `TP-BETA-001`
- Milestone: `M7 Acceptance`
- Branch: `codex/106-beta-acceptance`
- Base: `main@1a2f485` (activation checkpoint `bd02f42`)
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

## Acceptance coverage

`test:beta-acceptance` calls the real public `getAdvice.main` handler, production resolver/catalog, hourly weather
projection, `beta_base_v2` builder, TripContext v2 store and queryId-only advice boundary. It uses only an in-memory
CloudBase adapter and a deterministic Open-Meteo/AMap/LLM transport fixture.

| Area | Evidence |
| --- | --- |
| Five exact full pilots | Each row asserts permanent ID, canonical name, `full` capability, trusted type, fixed days, route stages, verification/status/date, route source IDs, source DTO projection, complete multi-sample hourly windows, deterministic result, minimum gear and server queryId/expiry. |
| Row isolation | Each row independently detects mutations to ID, fixed days, route type and capability; each mutated candidate ID is rejected by the public confirm path. |
| Climb | 四姑娘山二峰 uses `experienced_team`; its deterministic verdict is asserted never to be `go`. |
| Fuzzy confirmation | A fuzzy query returns `confirmation` and performs zero weather, TripContext, AI, AMap or other HTTP side effects. |
| Candidate confirmation | A permanent server candidate ID reaches the trusted base pipeline; forged route/type/days are ignored. |
| Place-only | Manual and AMap paths require explicit route type, retain reference weather semantics, return `verdict=null`, and preserve `user`/`amap` type provenance. |
| Official block | 五台山大朝台 returns `blocked`/`no_go` with `weatherSnapshot=null` and no weather request. |
| Insufficient weather | Offline weather failure yields `dataStatus=insufficient`; novice solo climb still retains its independent hard `no_go`. |
| AI boundary | Available, invalid and transport-unavailable outcomes are all exercised. Advice is queryId-only, has the exact DTO keyset, and cannot change route/weather/verdict/gear facts. Missing and stored v1 contexts return `query_context_unavailable` with zero LLM calls. |
| Private history | Save/list is openid-scoped; the same `saveAttemptId` returns the first record without a second add; legacy public UGC modes remain `ugc_disabled`. |
| I23 recovery seams | Pure reducer/recovery contracts cover same-query AI retry, explicit weather re-prepare, frozen history-save retry identity, stale history-list rejection and history prefill with zero network intent. |

The suite is representative rather than Cartesian: one focused case is used for each boundary and no mechanical
coverage score is introduced.

## Changed files

- `package.json`: registers `test:beta-acceptance` and runs it from the root `test` command.
- `scripts/beta-acceptance-contract-test.js`: table-driven public acceptance assertions and mutation-sensitive checks.
- `scripts/fixtures/beta-acceptance.js`: deterministic HTTP/CloudBase/history adapters only; no product logic or route
  data is reimplemented.
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
