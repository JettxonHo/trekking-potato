# I24c Beta acceptance report

## Outcome

The current `main@f311d1b` is code-ready for closed-beta review under the offline acceptance contract. The complete
automated gate matrix passed, and the normal fixture-free Taro build compiled successfully. Local WeChat DevTools
observation could not be completed: the authorized Computer Use runtime reported that the Mac was locked and could
not be unlocked. The GUI rows therefore remain explicitly `UNVERIFIED_RUNTIME_TOOL`; this report does not claim
screenshots, DevTools rendering, real CloudBase execution, deployment, device testing or real-user beta completion.

This is an evidence package for `I24c / #107`, not a product-code change. The row-by-row record is
[`beta-acceptance-checklist.md`](beta-acceptance-checklist.md).

## Scope and environment

- Goal: `TP-BETA-001`, milestone `M7 Acceptance`.
- Issue/branch: `#107`, `codex/107-beta-acceptance-evidence`.
- Base: `main@f311d1b`; activation head at start: `f8731a3`.
- Node/npm/Taro: repository-pinned toolchain; Taro build reports `Taro v4.0.9`.
- Runtime model visibility: `UNVERIFIED_RUNTIME_MODEL`. The custom Agent configuration is readable at
  `~/.codex/agents/luna-worker.toml` (`luna-worker`, `gpt-5.6-luna`, `max`), but runtime metadata is not exposed and
  is not inferred from configuration.
- External boundary: all automated evidence is offline/in-memory fixture or pure contract execution. No real
  CloudBase, Open-Meteo, AMap, DeepSeek, secret, upload, preview, deploy or production mutation was attempted.

## Automated evidence

The acceptance contract independently runs all five exact full RouteVariants through public prepare/name + alias and
permanent-ID confirm paths. It checks trusted IDs, type, fixed days, capability, operational status, source DTOs,
multi-sample hourly windows, deterministic verdict/gear/safety, server-owned TripContext and queryId-only advice. It
also exercises fuzzy confirmation, manual/AMap place-only, official blocked Wutai, insufficient retryable weather,
available/invalid/unavailable AI, idempotent private history and the I23 recovery seams.

The evidence rows deliberately separate adjacent claims. `test:recovery` proves that the old deterministic result
remains visible while an eligible weather re-prepare is in progress; the directly runnable
[`repeated-prepare-probe.js`](evidence/i24/repeated-prepare-probe.js) calls the existing public offline fixture and
proves two `base` responses with distinct server query IDs and unchanged trusted route identity. The A6 automated row
is limited to candidate/confirmation contract, reducer RESET/token isolation and zero pre-confirm side effects;
actual cancel-followed-by-form-edit remains a runtime-observation row.

The focused and complete commands were run after the fixture-free build:

| Gate | Result | Notes |
|---|---|---|
| `npm run test:beta-acceptance` | PASS | `I24b five-pilot Beta acceptance contract`; expected offline LLM invalid/transport log lines are degraded-path evidence, not test failures. |
| `npm test` | PASS | Includes all registered contracts; route `91/0`, weather `86/0`, unit `55/0` remain green. |
| `npm run test:integration` | PASS | `55/0`; the current I24a baseline intentionally replaces retired advice compatibility assertions with one structured mutation assertion. |
| `npm run lint` | PASS | `0 errors / 9 existing warnings`. |
| `npm run typecheck` | PASS | TypeScript quality project completed successfully. |
| `npm run build:weapp` | PASS | Taro 4.0.9 Webpack compiled successfully. |
| `git diff --check` | PASS | No whitespace errors. |

The command-level record is [`automated-gate-matrix.md`](evidence/i24/automated-gate-matrix.md), while detailed
I24b behavior evidence remains in [`i24b-beta-acceptance-verification.md`](i24b-beta-acceptance-verification.md).

## DevTools attempt and limitations

The `computer-use:computer-use` skill was read completely before any GUI operation. A first `node_repl` call using
`@oai/sky` attempted local application discovery and returned:

> The Mac is locked and automatic unlock could not unlock it. Ask the user to unlock the Mac manually before continuing.

Following the bounded retry instruction, an app-state lookup by the Chinese display name returned `Invalid app:
微信开发者工具`. The required `list_apps()` lookup to resolve the bundle identifier returned the same locked-Mac
blocker. GUI work stopped at that point. No fixture/debug source was injected, no page state was fabricated, no
screenshot was captured, and no network or cloud action was attempted. The full attempt log is
[`runtime-tool-attempt.md`](evidence/i24/runtime-tool-attempt.md).

Accordingly, all DevTools rows are `UNVERIFIED_RUNTIME_TOOL`, including the fixture-free import smoke. The successful
CLI build is recorded separately and is not treated as runtime evidence.

## Cleanup and residue proof

Because the GUI was blocked before injection, cleanup was a no-op for source: `index.jsx` was never edited and
`local-beta-fixtures.js` was never created. The normal `taro-app/dist` was rebuilt with `npm run build:weapp` and is
untracked. A bounded scan over source, scripts, package/config paths and normal dist returned no occurrence of:

```text
VISUAL_FIXTURE
LOCAL_BETA_FIXTURE
local-beta-fixtures
debug scenario hooks
```

The final committed change is docs/evidence only. There are no fixture selectors, debug hooks, generated dist files,
package/config changes, business-code changes or screenshots in the deliverable.

## Code-ready conclusion

`READY_FOR_CONTROLLER_REVIEW`: automated acceptance and fixture-free quality gates are green; the evidence package
truthfully distinguishes code proof from unavailable GUI observation. Sol XHigh must inspect the actual diff, the two
evidence logs, the absence of temporary residue and latest-head CI before deciding whether the focused PR is
`APPROVED`, `CHANGES_REQUESTED`, `BLOCKED` or `ESCALATE_TO_HUMAN`. The unverified DevTools rows do not expand the Goal
into deployment or real beta testing.
