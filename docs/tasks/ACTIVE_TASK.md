# 当前活动任务

- Task ID: `I16`
- GitHub Issue: `#25`
- Title: 冻结攀登支持、日落、提前量与数据不足组合合同
- Status: `READY_FOR_CONTROLLER_REVIEW`
- Mode: `IMPLEMENTATION`
- Owner: Terra XHigh
- Reviewer: Sol XHigh
- Branch: `codex/i16-trip-verdict`
- Base: `main` at `8412535`
- Goal: `TP-BETA-001`

## Current authorization

I15 implementation PR #57 passed Sol XHigh Review and latest-head GitHub `quality`, then squash
merged as `ade3bdd`; GitHub #24 is closed. Sol XHigh is authorized to freeze I16's internal
composition contract and tests before implementation. This planning branch may change only durable
contracts and governance state. An independent Terra XHigh reviewed the actual seven-document diff
and synchronized GitHub #25, returning `APPROVED` with no P0–P2 finding. Planning PR #58 then passed
latest-head GitHub `quality` and squash merged as `8412535`. Terra XHigh completed the bounded
test-first implementation on this branch and returned it for Sol XHigh's independent Review; it cannot
change or approve the contract.

Sol's first implementation Review found no P0/P1 production defect and requested only two focused
test-sensitivity fixes. The REVIEW_FIX establishes an Asia/Shanghai-versus-UTC midnight tracer and
executes the default local sunset adapter path without pinning astronomical minutes. The bounded fix is
ready for Sol's second independent Review; it does not change production behavior or this contract.

## Mandatory context

Follow the complete reading order in `AGENTS.md`, then read:

1. `GOAL.md`
2. `docs/architecture.md` sections 4, 7 and 8
3. `docs/testing-strategy.md` I14–I16 sections
4. `docs/decision-log.md` TP-D027 through TP-D029
5. GitHub #25

## Objective

Add one deterministic, no-I/O trip-level composition module that combines trusted route context,
I14 weather availability, I15 weather reasons, technical-climb support, forecast lead time and
geometric sunset into the final internal result. It must distinguish actual risk from missing data:
`verdict=null` means unavailable, never dangerous weather.

## Implementation allowlist after activation

- `cloudfunctions/getAdvice/trip-verdict.js` (new pure composition module)
- `cloudfunctions/getAdvice/sun-events.js` (only add the frozen sunset reference adapter)
- `scripts/trip-verdict-contract-test.js` (new offline contract test)
- `scripts/fixtures/trip-verdict.js` (optional; test data only)
- `package.json` (only add `test:trip-verdict` and include it in root `test`)
- `docs/architecture.md`
- `docs/testing-strategy.md`
- `docs/development-plan.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

Do not modify `index.js`, `hourly-weather.js`, `weather-verdict.js`, route catalog/schema, pilot data,
dependencies/lockfiles, public response envelopes, frontend, history, AI or equipment. I16 does not
wire the production handler; I17 and later Issues consume this frozen internal result.

## Frozen internal interface

```js
evaluateTripVerdict(
  { routeContext, request, weatherSnapshot },
  { evaluateWeatherVerdict?, getSunsetReference? } = {},
) -> {
  verdict: 'go' | 'caution' | 'no_go' | null,
  dataStatus: 'complete' | 'insufficient' | 'place_only',
  reasons: TripReason[],
  dataIssues: DataIssue[],
  evaluatedWindows: EvaluatedWindow[],
}
```

The two optional functions are test seams. Production defaults are I15's
`evaluateWeatherVerdict` and `sun-events.js#getSunsetReference`; they are not caller-controlled
business policy.

Trusted `routeContext` is a normalized server-side union:

```js
{ kind: 'full', routeType: 'trek' | 'climb' | 'tour' }
{ kind: 'place_only' }
{
  kind: 'blocked',
  restriction: { reason, scope, sourceIds },
  sourceCheckedAt,
}
```

- It never accepts client coordinates, route type, route facts or restriction facts as trusted data.
- `blocked` and `place_only` are terminal route capabilities and do not require weather.
- A full route requires `request.level` in `小白 | 中级 | 老手` and an I14 weather snapshot.
- A climb additionally requires `climbSupport` in
  `solo_or_unsure | experienced_team | professional_guide`.
- Invalid normalized internal inputs throw stable `TypeError`; public request validation/error mapping
  remains outside I16.

Frozen guard messages, evaluated in route-kind order, are:

```text
trusted route context required
valid level required
climbSupport required for climb
route weather snapshot required
```

The first applies when `routeContext` is not one of the three normalized variants. The latter three
apply only to `kind='full'`; blocked/place-only do not inspect irrelevant request or weather fields.

## Frozen output shapes

`TripReason` uses I15's reason vocabulary shape:

```js
{
  code: string,
  severity: 'caution' | 'no_go',
  at: null | { day, date, samplePointId, startLocal, endLocalExclusive },
  observed: object,
  message: string,
}
```

I15 reasons are copied without reinterpretation. I16 adds only:

| code | severity | observed | message |
|---|---|---|---|
| `official_route_blocked` | no_go | `{ reason, scope, sourceIds, sourceCheckedAt }` | `该路线存在官方禁行记录` |
| `novice_climb_solo_or_unsure` | no_go | `{ level:'小白', climbSupport:'solo_or_unsure' }` | `新手独自或支持不确定时不建议进行技术攀登` |
| `technical_climb` | caution | `{ routeType:'climb', climbSupport }` | `技术攀登最低按谨慎出发处理` |
| `forecast_lead_time` | caution | `{ leadDays, thresholdDays:5 }` | `预报提前量较长，临近出发需重新确认` |
| `expected_finish_after_sunset` | caution | `{ endLocalExclusive, sunsetLocal }` | `预计结束时间晚于几何日落` |

Global reasons use `at=null`. Forecast reasons use the affected window and
`samplePointId=null`. Sunset reasons identify the sample that produced the earliest sunset.

`DataIssue` is separate from risk reasons and has no severity:

```js
{ samplePointId, code: 'out_of_range' | 'weather_unavailable' | 'weather_data_invalid', retryable }
{ code: 'place_only_route', retryable: false }
{ day, date, samplePointId, code: 'sunset_reference_unavailable', retryable: false }
```

I14 insufficient reasons are copied without changing retryability. Data issues are deterministically
deduplicated by `(code, day, date, samplePointId, retryable)`, keeping the first occurrence. Their
order is I14 reason order followed by sunset failures in window/sample order; place-only has its one
fixed issue. They never become caution/no_go reasons.

## Composition and precedence

1. `blocked` returns `no_go/complete`, only `official_route_blocked`, no weather/sunset evaluation,
   and empty windows. I16 does not reinterpret unknown restriction dates; the trusted route context
   already states that this record is blocked.
2. `place_only` returns `null/place_only`, no risk reasons, a `place_only_route` data issue, no weather/
   sunset evaluation, and empty windows.
3. A full route with I14 `insufficient` does not call I15 or sunset. It returns
   `null/insufficient`, except the independent hard fact `小白 + climb + solo_or_unsure` still returns
   `no_go/insufficient`. I14 audit windows and data issues remain visible.
4. A full route with I14 `complete` calls I15 exactly once and preserves its verdict/reasons. It then
   adds climb, lead-time and sunset facts.
5. Final verdict precedence is: any hard no-go reason -> `no_go`; else data status other than complete
   -> `null`; else any caution reason -> `caution`; otherwise `go`. There is no score.
6. Unknown full-route `operationalStatus` is not a risk rule. I16 consumes only the normalized union
   above and never infers danger from missing route metadata.

Final reason order is stable: I16 global no-go reasons, then I15 reasons in their existing order,
then `technical_climb`, forecast warnings by route-day order, and sunset warnings by route-day order.
When the novice hard rule fires, the generic `technical_climb` warning is suppressed.

## Forecast lead-time semantics

- Convert `weatherSnapshot.fetchedAt` to the `Asia/Shanghai` calendar date without using host timezone
  or the client clock.
- For every evaluated window, calculate integer calendar-day difference from that fetched date to
  `window.date`.
- `leadDays >= 5` is caution; 4 days is not. A multi-day route can therefore warn only on its later
  days.
- One warning is emitted per affected route day in frozen window order.

## Sunset semantics

- For each complete evaluated window, call
  `getSunsetReference({ date: window.date, coordinate: sample.requestCoordinate })` for every trusted
  I14 sample. Coordinates are already WGS84; I16 does not convert or infer an endpoint.
- The adapter returns
  `{ ok:true, timezone:'Asia/Shanghai', sunsetLocal:'HH:mm' }` or
  `{ ok:false, code:'sunset_unavailable' }` and performs no network I/O.
- Select the earliest geometric sunset among all samples in that window; ties keep I14 sample order.
  This is a conservative route-sample envelope, not a claim about the start, endpoint or nearby peak.
- Compare complete local ISO minutes. `endLocalExclusive` strictly later than the route-day sunset is
  caution; equality is not. Cross-midnight completion is later than that route day's sunset.
- If any required sample cannot provide a valid sunset, the earliest sunset is unknown: mark the
  whole result `insufficient`, add a data issue for each failed sample, and return `verdict=null`
  unless an independent no-go reason exists. Do not invent a weather danger reason.

## TDD requirement

1. Add `test:trip-verdict` first and run it before the module exists; the genuine RED must be the
   missing module/export.
2. Use I14-derived complete/insufficient snapshots rather than a second production weather shape.
3. Inject the I15 and sunset seams only to prove call boundaries and exact astronomy edges.
4. One real RED is enough; do not manufacture repeated failure rituals.

## Required tests

- Terminal contexts: blocked remains no_go and calls neither I15 nor sunset; place-only is
  `null/place_only`; full I14 insufficient is `null/insufficient` and calls neither evaluator.
- I15 preservation: complete `go`, `caution` and `no_go` pass through, with I15 reasons as an unchanged
  stable subsequence.
- Climb matrix: three levels by three support values. Only `小白 + solo_or_unsure` adds the climb
  hard no-go; the other eight are at least caution. trek/tour do not degrade when support is supplied.
  Missing/invalid climb support proves the single internal guard.
- Forecast boundary: a `fetchedAt` near Shanghai midnight proves 4 versus 5 calendar days and later-day
  warning order.
- Sunset: equality, one minute later, cross-midnight, multiple-sample earliest selection/tie order,
  and one unavailable sample. Tests use injected exact sunset values, not real astronomical dates.
- Mixed precedence: independent no-go survives weather or sunset insufficiency; caution cannot turn
  insufficiency into danger; reason/data-issue order is stable.
- Same input produces the same deep-equal output and neither input nor nested weather data is mutated.

## Acceptance and full validation

1. `test:trip-verdict` runs alone and is included in root `test`.
2. The module has no I/O, current-time read, AI, score, client-trusted route/weather or nearby-peak
   inference; production sunset calculation is local through the existing dependency.
3. I14/I15 outputs are consumed without modifying their frozen contracts.
4. Actual diff stays inside the activated allowlist and public handler behavior remains unchanged.
5. All commands pass:

```bash
corepack npm@10.9.2 run test:trip-verdict
corepack npm@10.9.2 run test:verdict
corepack npm@10.9.2 run test:hourly-weather
corepack npm@10.9.2 run test:weather
corepack npm@10.9.2 run test:route-domain
corepack npm@10.9.2 test
corepack npm@10.9.2 run test:integration
corepack npm@10.9.2 run lint
corepack npm@10.9.2 run typecheck
corepack npm@10.9.2 run build:weapp
git diff --check
```

## Agent autonomy and escalation

Terra may choose private helpers and constants inside the allowlist. It may not change the union,
precedence, reason/data-issue shapes, thresholds, sunset policy, test strength, dependencies or public
interfaces. Escalate if the implementation requires a public handler change, new schema/dependency,
route-data interpretation, external service, a product trade-off, or scope outside the allowlist.
