# I24c Beta acceptance checklist

- Goal: `TP-BETA-001`
- Issue: `I24c / #107` (parent `#33`)
- Branch/base: `codex/107-beta-acceptance-evidence` from `main@f311d1b` (activation head `f8731a3`)
- Run date: `2026-08-09`
- Evidence boundary: offline contract tests and a best-effort local WeChat DevTools attempt only. This is code-level
  readiness evidence; it is not deployment, real CloudBase, device, or real-user beta evidence.
- Runtime visibility: `UNVERIFIED_RUNTIME_MODEL`; `~/.codex/agents/luna-worker.toml` is configured as
  `luna-worker` / `gpt-5.6-luna` / `max`, but the current runtime does not expose model metadata.

## Status and evidence rules

Each row has exactly one status:

- `VERIFIED` means the listed command was actually run and its linked evidence supports the stated behavior.
- `UNVERIFIED_RUNTIME_TOOL` means execution was attempted but the named local runtime blocker prevented observation.

No screenshot was created. The local GUI attempt and exact blocker are recorded in
[`runtime-tool-attempt.md`](evidence/i24/runtime-tool-attempt.md). Automated evidence is summarized in
[`automated-gate-matrix.md`](evidence/i24/automated-gate-matrix.md) and the earlier I24b contract record
[`i24b-beta-acceptance-verification.md`](i24b-beta-acceptance-verification.md).

## Automated contract evidence

| ID | Required behavior | Status | Exact command / interaction | Evidence and notes |
|---|---|---|---|---|
| A1 | `variant:wugongshan-longshan-to-main-gate-2d` from public name/alias prepare through trusted structured base/result | `VERIFIED` | `npm run test:beta-acceptance` | The test asserts permanent ID, `trek`, fixed 2 days, source DTOs, operational status, aligned multi-sample hourly windows, deterministic verdict, minimum gear and server `queryId`. |
| A2 | `variant:siguniang-erfeng-haizigou-out-and-back-2d` from input through structured result | `VERIFIED` | `npm run test:beta-acceptance` | The test asserts permanent ID, `climb`, fixed 2 days, experienced-team support and a verdict that is never `go`; it also checks deterministic gear/safety. |
| A3 | `variant:yulong-blue-moon-yunshanping-out-and-back-1d` from input through structured result | `VERIFIED` | `npm run test:beta-acceptance` | The test asserts permanent ID, `trek`, fixed 1 day, source/status, aligned hourly samples and deterministic result. |
| A4 | `variant:gongga-laoyulin-yulongxi-point-to-point-3d` from input through structured result | `VERIFIED` | `npm run test:beta-acceptance` | The test asserts permanent ID, `trek`, fixed 3 days, source/status, aligned hourly samples and deterministic result. |
| A5 | `variant:dangling-huluhai-zhuoyongcuo-out-and-back-1d` from input through structured result | `VERIFIED` | `npm run test:beta-acceptance` | The test asserts permanent ID, `trek`, fixed 1 day, source/status, aligned hourly samples and deterministic result. |
| A6 | Candidate/confirmation contract, reducer RESET/token isolation and no early weather/context/AI side effects | `VERIFIED` | `npm run test:confirmation`, `npm run test:trip-flow` and `npm run test:beta-acceptance` | These contracts prove candidate/confirmation rendering, RESET cancellation/token isolation and fuzzy pre-confirm zero side effects. They do not prove a real cancel-followed-by-form-edit interaction; that remains R2 `UNVERIFIED_RUNTIME_TOOL`. |
| A7 | Manual and AMap place-only paths require explicit type and remain `verdict=null` | `VERIFIED` | `npm run test:core-input-flow` and `npm run test:beta-acceptance` | Manual provenance is `user`, AMap provenance is `amap`, both are `place_only`, and reference weather is not promoted to a route verdict. |
| A8 | Official 五台山大朝台 is a separate blocked record, `no_go`, with no weather request | `VERIFIED` | `npm run test:beta-acceptance` and `npm run test:result-page` | The blocked response has `capability=blocked`, `operationalStatus=blocked`, `weatherSnapshot=null`, and the blocked weather notice. |
| A9 | Result labels `go`, `caution`, `no_go`, and `verdict=null` remain distinct from `dataStatus` | `VERIFIED` | `npm run test:result-page` and `npm run test:core-input-flow` | Result-page contract checks all four labels, including `no_go + insufficient` and place-only `null`; data completeness is asserted independently. |
| A10 | AI ready, invalid/unavailable outcomes, and same-query retry preserve route/weather/verdict/gear/checklist facts | `VERIFIED` | `npm run test:beta-acceptance`, `npm run test:recovery`, `npm run test:result-page` | Available, invalid and transport-unavailable outcomes keep deterministic facts; recovery asserts advice retry keeps the same `queryId` and checklist. |
| A11 | Weather re-prepare keeps the old deterministic result visible during refresh and obtains a replacement query authority | `VERIFIED` | `npm run test:recovery`; `node docs/evidence/i24/repeated-prepare-probe.js`; `npm run test:beta-acceptance` | `test:recovery` proves old-result visibility during `preparing + result` refresh. The durable public-fixture probe asserts two `base` responses, distinct server query IDs and unchanged trusted route identity; it does not claim old-result rendering. |
| A12 | Private history save retry is idempotent; list retry rejects stale/closed responses; selection is zero-network prefill | `VERIFIED` | `npm run test:history`, `npm run test:recovery`, `npm run test:result-page`, `npm run test:beta-acceptance` | Tests assert frozen `saveAttemptId`/payload, openid scoping, stale list guards, and restore code without `cloud.callFunction`, `getAdvice`, or queryId restore. |
| A13 | Checklist survives same-query advice events and resets on a different base/query, back, or cache restore | `VERIFIED` | `npm run test:result-page` and `npm run test:recovery` | Result-page lifecycle assertions cover same-base/same-query advice events and reset boundaries. |
| A14 | Source, operational status, local time/window, hourly sample alignment and data-status semantics are structured | `VERIFIED` | `npm run test:beta-acceptance`, `npm run test:result-page`, `npm run test:hourly-weather` | Full pilots assert seven-field source DTOs, status, Shanghai timezone, stage/window/sample/hour alignment, and complete/insufficient/place-only semantics. |
| A15 | Normal fixture-free WeChat build completes | `VERIFIED` | `npm run build:weapp` | Taro 4.0.9 Webpack compiled successfully after no fixture was injected. This proves build output only, not DevTools import. |

## Runtime-observation rows

| ID | Required local observation | Status | Attempt / exact blocker | Evidence and notes |
|---|---|---|---|---|
| R1 | Import fixture-enabled local build, exercise representative full/blocked/place-only and degraded result screens, and capture visible verdict/reasons/weather/gear/source content | `UNVERIFIED_RUNTIME_TOOL` | Read `computer-use:computer-use` fully; `node_repl + @oai/sky` `list_apps()` returned: `The Mac is locked and automatic unlock could not unlock it. Ask the user to unlock the Mac manually before continuing.` | No fixture was injected and no screenshot exists. Automated contracts above must not be relabeled as visual evidence. |
| R2 | Observe fuzzy confirmation, cancellation/edit, weather refresh, AI retry, history save/list retry, selection prefill and checklist reset in DevTools | `UNVERIFIED_RUNTIME_TOOL` | A bounded app-state retry first returned `Invalid app: 微信开发者工具`; the required `list_apps()` follow-up returned the same locked-Mac blocker above. | No GUI interaction was performed after the blocker; no screenshot exists. |
| R3 | Refresh/import the normal fixture-free `taro-app/dist` in DevTools | `UNVERIFIED_RUNTIME_TOOL` | DevTools discovery was blocked by the locked Mac before an import could be attempted. | `npm run build:weapp` is separately `VERIFIED`; it is not an import/runtime claim. |

## Cleanup proof

- No temporary fixture file was created because the authorized GUI runtime was unavailable before injection.
- `taro-app/src/pages/index/index.jsx` remained unchanged; `taro-app/src/pages/index/local-beta-fixtures.js` did not
  exist; generated `taro-app/dist` was rebuilt normally and is untracked.
- A bounded residue scan over `taro-app/src`, `scripts`, `package.json`, `taro-app/config`, and `taro-app/dist` found
  no `VISUAL_FIXTURE`, `LOCAL_BETA_FIXTURE`, `local-beta-fixtures`, or debug scenario marker.
- Final diff is restricted to the documentation/evidence allowlist; generated `dist` and fixture source are not
  committed.
