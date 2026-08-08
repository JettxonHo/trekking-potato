# ACTIVE TASK — I23b 前端降级与恢复编排

- Goal: `TP-BETA-001`
- Parent: `I23 / #32`
- GitHub Issue: `I23b / #100`; I23a/#99 is closed
- Status/Mode: `REVIEW_FIX_ACTIVE / REVIEW_FIX`
- Controller: Sol XHigh
- Implementation Agent: exact custom Agent `luna-worker`
- Branch: `codex/100-frontend-recovery`
- Base: `main@107fab4`
- Dependency: I23a/#99 merged through PR #102 as `107fab4`

## 1. Objective and serial split

Complete M6 with recovery that preserves trusted facts and makes each real transient failure recoverable without
inventing a generic state machine or duplicating history.

I23 is split serially:

1. **I23a — private-history save idempotency.** Add the minimal server primitive needed before exposing a save retry.
2. **I23b — frontend recovery orchestration.** Add weather/query, AI and history controls over the accepted I20/I22
   seams. I23b starts only after I23a passes CI, Sol Review and merge.

The split is mandatory because a UI save-retry button without server idempotency can duplicate history, while a
single cross-cloud-function/page PR would mix two independently verifiable objectives.

## 2. Shared fixed decisions

- Keep the I20 ten states. Add only specific recovery events; do not add a generic `RECOVER` event or global store.
- Every query/advice recovery that starts async work first advances the reducer request token. Late query/advice
  results and cache writes cannot update a newer flow. History save and list use their own bounded identities so
  same-BaseData save callbacks survive AI retry while newer BaseData/closed/unmounted surfaces reject them.
- Deterministic route, weather snapshot, verdict, reasons, minimum gear and sources remain immutable during AI and
  history recovery. AI never becomes a fallback fact source.
- A weather/data retry replays the last base-producing `prepare` or `confirm` request and receives a new `queryId`;
  it never reuses cached BaseData as server authority. Cache/history recovery lacks that snapshot and uses visible
  form fields to begin a new `prepare`, with confirmation repeated when required.
- An AI retry uses the same non-null `queryId` only while that context remains usable. Public
  `query_context_unavailable` starts a new base-producing operation: a live query replays its last trusted
  `prepare` or permanent-ID `confirm`, while cache/history without a request snapshot starts a new `prepare`
  from the visible form. It is never retried as advice.
- Structured cache never persists or restores `queryId`, never auto-retries, and never restores an in-flight request.
- Private history selection is **form prefill only**. The user reviews and explicitly submits a new query. It is not
  exact replay: existing history does not gain `startTimeLocal` or `climbSupport`; current visible/default values stay.
- No migration, deletion, new dependency, hashing/SHA, deployment, production configuration or public UGC change.

## 3. I23a task contract — history save idempotency

### Goal

Make a sequential retry of an uncertain private-history save return the original record instead of adding a duplicate.

### Allowed scope

- `cloudfunctions/history/index.js`
- `scripts/security-test.js`
- `docs/current-status.md`, `docs/tasks/ACTIVE_TASK.md`

### Non-scope

- Taro page/reducer/result model, getAdvice, history list/delete/clear UI, dependencies or database configuration
- migration/index creation, transaction framework, cleanup job or distributed exactly-once guarantee
- changing the public `HistoryItem` list DTO or storing/exposing `queryId`

### Public save contract

`mode='save'` accepts an additive optional `saveAttemptId`:

```text
save { existing fields..., saveAttemptId?: string }
  -> { ok:true, id:string }
  | existing error envelope
```

- Missing `saveAttemptId` preserves the I19 legacy add behavior.
- A supplied ID is trimmed, non-empty and bounded to 80 characters; malformed input returns the existing
  non-retryable `invalid_history_input` envelope. Do not create a large pattern rubric.
- The server stores it only on the private record and deduplicates by exact `{_openid, saveAttemptId}` before add.
  The same ID under another openid is independent.
- A repeated sequential save returns `{ok:true,id:<existing _id>}` with no second record. Response shape does not
  expose whether a dedupe occurred. `list` continues to project only the existing explicit DTO.
- This is a proportional retry primitive, not a claim of concurrent distributed exactly-once. I23b serializes one
  save attempt per payload and reuses the same frozen payload/ID after failure.

### TDD and acceptance

- Extend `test:history` first with a RED for two same-user saves using one ID creating two records.
- Prove same ID/same openid returns one record and stable id; same ID/different openid creates separate private records.
- Prove same owner/ID with a different later payload is first-write-wins and does not mutate the original record.
- Prove missing ID keeps legacy behavior, malformed supplied ID is rejected before database add, storage errors retain
  `history_unavailable`, and list DTO never exposes `saveAttemptId`.
- Run `npm run test:history`, root `npm test`, integration, lint, typecheck, WeChat build and diff check.

## 4. I23b task contract — frontend recovery orchestration

### Allowed scope

- new `taro-app/src/pages/index/recovery-model.js`
- `taro-app/src/pages/index/trip-flow.js`
- `taro-app/src/pages/index/result-page-model.js`
- `taro-app/src/pages/index/index.jsx`, `taro-app/src/pages/index/index.css`
- new `scripts/recovery-contract-test.js`
- focused `scripts/trip-flow-contract-test.js`, `scripts/result-page-contract-test.js`
- `package.json`
- new `docs/i23-recovery-verification.md`
- `docs/current-status.md`, `docs/tasks/ACTIVE_TASK.md`

No Cloud Function, route/weather/verdict rule, response contract, service payload, cache schema, history list DTO,
dependency or broad visual redesign is allowed.

### Recovery matrix

| Situation | Visible action | Request authority | Required outcome |
|---|---|---|---|
| full route `dataStatus='insufficient'` with retryable weather issue | 重新获取天气并判断 | replay last base-producing prepare/confirm | new token and new queryId; old result remains visible while refreshing |
| place-only reference weather unavailable with retryable issue | 刷新地点天气 | replay last base-producing prepare/confirm | new token and new queryId; still remains place-only |
| ordinary prepare/confirm transport or server error with `retryable=true` | 重试查询 | replay that base-producing operation | same frozen input, new token |
| AI transport/error or retryable `context_unavailable` after BaseData | 重试 AI 补充 | same current queryId | deterministic page/checklist stay; result AI becomes loading; no extra history save |
| `query_context_unavailable` | 重新准备行程 | replay last base-producing prepare/confirm | old BaseData remains visible while refreshing; never call advice with expired id |
| structured cache restore | 重新查询 | new `prepare` only after user action | no queryId restore and no automatic request |
| history save `history_unavailable`/transport failure | 重试保存历史 | same frozen payload and saveAttemptId | at most one sequential private record; main result unchanged |
| history list failure | 重试加载 | new list request | preserve current list while loading/failing; stale/closed callbacks ignored |
| history item selected | 预填表单 | no request | close panel, prefill existing DTO fields, preserve current/default time/support; user submits explicitly |

Blocked results and non-retryable `out_of_range` weather do not show a weather retry. Non-retryable input, route resolution and internal errors
do not gain blind retry. Existing route/manual fallback remains the recovery for `location_failed/route_not_found`;
I23 does not change their public retryable flags.

### Reducer and page boundary

- Add `BEGIN_ADVICE_RETRY`, accepted only when `status='degraded'`, result/queryId are non-null, AI is
  `unavailable`, and the event represents either an advice-degraded outcome with no flow error or an advice error
  whose `retryable=true`. `internal_error`/other `retryable=false` errors and cache results with `queryId=null` are
  ineligible. An accepted event advances token, enters existing `advice_loading`, preserves queryId/checklist,
  stores an event result whose only change is `ai.status='loading'`, and clears flow error. All other combinations
  are no-op.
- Add `BEGIN_REPREPARE`, accepted only from `complete | degraded | error` when a bounded current-token
  `pendingBaseRequest` or `lastBaseRequest` is available. Result may be null: an accepted event always advances
  token, clears the old queryId/error and enters existing `preparing`; no eleventh state or new reducer field is
  allowed. With result=null the normal full loading screen remains; with a result,
  selector/page must expose `refreshing=true`, keep the result page visible and show a local refresh indicator.
- Keep two page-private request slots. `pendingBaseRequest` is captured immediately before each current-token
  `prepare`/permanent-ID `confirm` call and retained on failure. On BaseData success it is promoted to
  `lastBaseRequest` and cleared. Retryable operation failure uses pending; weather/context recovery uses lastBase.
  Cache/history prefill clears both and starts a new prepare from visible form fields; no result/cache weather or
  advice field may enter the request.
- `result-page-model` (or the bounded recovery model) marks only `ai.status='loading'` for an AI retry. It cannot
  rewrite structured fields. Retry success/degraded/context-expiry reuse existing reducer outcomes under the new token.
- Generate one non-security `saveAttemptId` per new BaseData without hashing; attach it when the first eligible
  success/degraded history payload is built. On save failure freeze that complete payload for explicit retry. Advice
  retry never creates a second history intent for the same BaseData.
- History-save completion is keyed by the current BaseData/saveAttemptId, not the trip-flow token: it may complete
  during a same-base AI retry, but a replacement BaseData, return/reset or unmount invalidates it. Only one save call
  for that payload may be in flight; explicit retry starts after the previous call has failed.
- History selection advances/reset flow and checklist, clears the result cache, closes the panel and only then pre-fills
  existing DTO fields. It performs zero I/O and preserves the current visible/default start time and climb support,
  with copy telling the user to confirm them before submitting.
- History list uses its own local monotonic request token. Opening/retrying advances it; closing the panel and unmounting
  invalidate it. Delete/clear retain their existing explicit user actions and are not expanded into background retries.

### TDD and acceptance

Register `test:recovery` and record a real RED before implementation. Behavior evidence must prove:

- AI retry advances token, sends exactly one advice call with the same queryId, keeps deterministic data/checklist,
  prevents a second history write and ignores old advice/cache callbacks. The independent same-base save callback
  remains eligible and cannot mutate the deterministic result.
- Expired context and retryable full/place-only weather replay the base-producing operation for a new queryId;
  cached/blocked results never auto retry and do not use an old queryId.
- `BEGIN_ADVICE_RETRY` rejects wrong status, null result/queryId, non-`unavailable` AI, retryable=false/internal
  errors and cache results; it accepts both advice-degraded-without-error and retryable advice-error examples.
  `BEGIN_REPREPARE` rejects wrong states or absent current-token request and accepts complete/degraded/error with
  either null or non-null result. Preparing with result=null shows full loading; preparing with a result keeps
  verdict, reasons, weather/data boundary, minimum gear, sources and checklist visible with a local refresh indicator
  and never shows the skeleton in their place. Removing that render priority must make the focused test RED.
- Pending request supports initial prepare/confirm failure retry; only successful BaseData promotes it to last-base.
  Starting a different request replaces pending, while reset/history prefill clears both.
- Save retry uses byte-for-byte equivalent frozen payload plus the same `saveAttemptId`; successful retry clears only
  its local error. A new BaseData gets a different ID without testing statistical uniqueness mechanically.
- History list retry preserves existing items on failure and ignores callbacks after a newer request, panel close or
  unmount. History selection resets flow/checklist/cache, only prefills, starts zero network calls and preserves
  current/default time/support.
- Actual `index.jsx` branches call the pure seams; mutation-sensitive page-wiring assertions must fail if a token
  advance, same-query AI call, request-snapshot replay, same-base save identity/no-second-save invariant or stale-list
  guard is removed.
- Root `npm test` includes `test:recovery`; all existing I18–I22 contracts, integration `56/0`, lint, typecheck,
  WeChat build and diff check pass.

`docs/i23-recovery-verification.md` records the real RED/GREEN, finding-to-test and representative mutation map,
the exact commands/results, and a short local interaction checklist for weather refresh with old result visible,
AI retry with deterministic content visible, history save/list retry and zero-I/O history prefill. Do not claim
DevTools evidence if it was not run; screenshots are deferred to I24 unless Sol separately authorizes a fixture capture.

## 5. Autonomy, escalation and delivery

`luna-worker` may choose private helper names and minimal retry-button copy within the fixed meanings. It must stop for
new states, public error/phase changes, history DTO or new stored user fields, CloudBase index/migration, dependencies,
automatic background retries, route/weather/verdict changes, or any proposal to store time/support for exact replay.

Each child returns code, tests, RED/GREEN evidence, all gates, status docs, a focused PR and
`READY_FOR_CONTROLLER_REVIEW`. It cannot approve or merge. Routing: logical role `IMPLEMENTER`; exact custom Agent
`luna-worker`; config `~/.codex/agents/luna-worker.toml`; configured `gpt-5.6-luna` / `max`; runtime status recorded
after spawn; Terra fallback unauthorized.

## 6. Activation gate

Planning PR #101 passed latest-head quality and independent actual-diff Review, then squash merged as `a12ab46`.
I23a/#99 then passed latest-head quality and independent Sol re-review, merged through PR #102 as `107fab4`, and
closed. I23b/#100 is now the only active implementation contract. The controller activation commit contains only
status/routing changes; the executor begins with a clean I23b business-code baseline.

## Implementation checkpoint — 2026-08-09

- TDD RED: before the handler change, `npm run test:history` failed the new same-owner/same-ID sequential retry
  assertion because the second save added a duplicate record.
- GREEN: `saveAttemptId` is optional, trimmed, non-empty and limited to 80 characters; malformed supplied IDs
  return `invalid_history_input` before add. Valid IDs are stored privately and deduplicated by exact server
  `{_openid, saveAttemptId}` lookup. A sequential repeat returns the first record ID, preserves first-write-wins,
  keeps same IDs independent across owners and creates distinct IDs normally. Missing IDs keep legacy behavior.
- Tests now cover the required retry, owner, payload, validation, storage-error and list-DTO boundaries. Required
  local commands pass: `npm run test:history`, `npm test`, `npm run test:integration` (`56/0`), `npm run lint`
  (0 errors; 9 existing warnings), `npm run typecheck`, `npm run build:weapp`, and `git diff --check`.
- Allowlist remains exact: `cloudfunctions/history/index.js`, `scripts/security-test.js`,
  `docs/current-status.md`, and this file. Status: `READY_FOR_CONTROLLER_REVIEW`; no PR/merge or I23b dispatch
  has been performed by the executor.

## Sol Review-fix round 1 — 2026-08-09

Verdict: `CHANGES_REQUESTED`; P0/P1 none, no production implementation finding, no human decision.

Only `scripts/security-test.js` plus the two status documents may change unless a new failing test proves a production
defect. Add behavior evidence for:

1. two same-owner saves without `saveAttemptId` create two records, two distinct IDs and two add calls;
2. one representative non-string supplied ID returns non-retryable `invalid_history_input` before add;
3. a sequential duplicate response deep-equals exactly `{ok:true,id:<first id>}` with no dedupe marker;
4. a valid ID with no existing record followed by add failure returns retryable `history_unavailable` without raw error.

Use additive commits and normal push only. Re-run focused/full gates and latest-head Actions; return
`READY_FOR_CONTROLLER_REVIEW`. Do not broaden into a format matrix, change the correct handler without a demonstrated
need, amend/force-push, approve or merge.

## Review-fix round 1 implementation checkpoint — 2026-08-09

- Added only the four requested assertions to `scripts/security-test.js`: legacy no-ID double-add with distinct IDs,
  representative non-string ID rejection before add, exact dedupe response shape, and empty lookup followed by add
  failure mapping.
- Mutation/RED sensitivity ran before final GREEN. Temporary mutations for no-ID dedupe, non-string acceptance,
  a response `deduped` flag, and rethrown save errors each produced a focused RED. All temporary production edits
  were reverted; no production handler change is part of this round.
- Focused history contract is GREEN. The final diff remains within `scripts/security-test.js` and the two status
  documents. Required local gates pass: `npm run test:history`, `npm test`, integration `56/0`, lint (0 errors;
  9 existing warnings), typecheck, `build:weapp`, and `git diff --check`; additive commit `877cd6c` latest-head
  GitHub `quality` passed in 44 seconds (run `31272070159`, job `93139614802`).

## I23b implementation checkpoint — 2026-08-09

- RED/GREEN evidence is recorded in `docs/i23-recovery-verification.md`. Registration-only RED was a real
  `MODULE_NOT_FOUND` for `recovery-model.js`; focused recovery behavior is now GREEN.
- The implementation keeps I20's ten states/fields. `BEGIN_ADVICE_RETRY` requires degraded + non-null result/
  queryId + unavailable AI and accepted advice degradation/retryable advice error; it advances token and changes
  only the AI namespace. `BEGIN_REPREPARE` requires a bounded current-token recovery authority, clears queryId/error,
  and preserves a non-null result with a local refreshing selector/indicator.
- Page-private pending/last snapshots are captured before every prepare/confirm, retained on failure, promoted only
  on BaseData success, replayed from the proper authority, and cleared on reset/history prefill. Cache/history never
  restore queryId or auto-retry. Save retry freezes one payload plus one non-security attempt ID and keys callbacks
  by BaseData/attempt rather than trip token; list retry uses a separate monotonic identity and closed/unmounted
  callbacks cannot replace items. History selection resets flow/checklist/cache and only prefills existing DTO fields,
  preserving current/default start time and climb support with confirmation copy.
- Required commands pass: `test:recovery`, `test:trip-flow`, `test:result-page`, `test:response`, `test:trip-context`,
  `test:history`, root `npm test`, integration `56/0`, lint (0 errors; 9 existing warnings), typecheck,
  `build:weapp`, and `git diff --check`. No DevTools evidence is claimed.
- Allowlist remains exact and no public/service/cache/history schema/dependency/Cloud Function changes were made.
  Status: `READY_FOR_CONTROLLER_REVIEW`; controller owns additive commit, focused draft PR, Actions wait, review and merge.

## Sol Review-fix round 1 — 2026-08-09

Verdict: `CHANGES_REQUESTED`; P0 none; no human decision.

The executor must make the smallest bounded corrections inside the existing #100 allowlist:

1. Render weather recovery only when both the deterministic weather issue and the same state/request authority used
   by `BEGIN_REPREPARE` are eligible. `base_ready` and `advice_loading` must not expose a silent no-op button;
   `complete/degraded/error` plus a valid last-base request must enter `preparing` and replay it.
2. Replace marker-only whole-file `source.includes` evidence with a bounded executable page seam or precise
   method/branch wiring assertions. Representative removal mutations must RED for button eligibility, old-result
   refresh priority, same-query advice, base snapshot replay, same-base history intent, stale list guards and
   zero-I/O history prefill. Do not add a second state machine or UI framework.
3. Do not invalidate `_historySaveIntent` when reprepare merely starts. Preserve a failed/in-flight old-BaseData
   intent through reprepare and reprepare failure. Invalidate it, and clear its old local error, only when replacement
   BaseData arrives or on the already-authorized reset/return/unmount boundaries.
4. While history list retry is loading, keep existing items rendered alongside the loading indication. Use an empty
   loading state only when no items exist, with focused render evidence.

Use additive commits and normal push only. Update `docs/i23-recovery-verification.md`, this task and
`docs/current-status.md`; re-run every command in the frozen matrix and latest-head Actions. Return
`READY_FOR_CONTROLLER_REVIEW`; do not approve or merge PR #103.

## I23b Review-fix round 1 implementation checkpoint — 2026-08-09

- Weather retry controls now use the bounded `isWeatherRecoveryEligible`/`selectRecoveryActions` seam, requiring
  retryable weather facts plus accepted terminal flow status and valid last-base authority; base-ready/advice-loading
  cannot expose a no-op button.
- `_beginReprepare` no longer invalidates the old history-save intent at start. Replacement BaseData and the existing
  reset/return/unmount paths remain the only local invalidation boundaries.
- History list retry/loading keeps existing items rendered; the loading empty state is selected only for an empty list.
- `recovery-contract-test.js` now uses bounded method/branch assertions and executable action projection, with RED
  mutation checks for all review representatives: weather eligibility, old-result/list loading priority, same-query
  AI, snapshot replay, same-base history intent, stale list guards and zero-I/O prefill.
- Scope remains the frozen #100 allowlist; no Cloud Function/public contract/cache/history schema/dependency/new
  state/automatic retry/visual redesign. Pending additive commit, normal push, latest-head Actions and controller
  review; executor must return `READY_FOR_CONTROLLER_REVIEW` and cannot approve or merge.
- Review-fix local matrix is GREEN: focused recovery/trip-flow/result-page/response/trip-context/history, root
  `npm test`, integration `56/0`, lint 0 errors/9 existing warnings, typecheck, `build:weapp`, and `git diff --check`.
  No DevTools or screenshot evidence was run.

## Sol Review-fix round 2 — 2026-08-09

Verdict on exact head `42b4e8d`: `CHANGES_REQUESTED`; no P0/P1 and no human/product/architecture decision yet.
All prior weather eligibility, page wiring, old-result refresh, history-save identity and stale-list findings are
closed. Make only this final correction:

- When `historyLoading === true` and `historyList.length > 0`, render a small local “正在刷新历史…” indication
  together with the existing items. Keep the empty-list loading state for `historyList.length === 0`; do not hide,
  disable or replace the old list.
- Extend the focused render/mutation assertion so removing this non-empty loading indication makes
  `test:recovery` RED while the old items remain required.
- Synchronize this task, `docs/current-status.md`, `docs/i23-recovery-verification.md`, and the live #100/PR #103
  status. Re-run the frozen full matrix and latest-head Actions.

Use one additive commit and normal push. Do not modify recovery identities, reducers, network behavior, schemas,
dependencies or styling beyond the minimal existing-class hint. This is the final round for this finding; a repeat
failure must return `ESCALATE_TO_HUMAN`, not start round 3. The implementer cannot approve or merge.
