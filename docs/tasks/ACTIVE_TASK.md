# ACTIVE TASK — I24c DevTools 验证包与最终文档

- Goal: `TP-BETA-001`
- Parent: `I24 / #33`
- GitHub Issue: `I24c / #107`
- Status/Mode: `READY_FOR_CONTROLLER_REVIEW / REVIEW_FIX`
- Controller: Sol XHigh
- Implementation Agent: exact custom Agent `luna-worker`
- Branch: `codex/107-beta-acceptance-evidence`
- Base: `main@f311d1b`
- Dependencies: I24a/#105 merged as `1a2f485`; I24b/#106 merged as `f311d1b`; I25 remains blocked until this Issue merges

## 1. Goal and user value

Deliver a reproducible local Beta acceptance checklist, evidence package and final synchronized documentation for
the current code. The package must distinguish automated proof, locally observed WeChat DevTools behavior and
unavailable runtime checks. It proves code-level closed-beta readiness only; it does not claim deployment, real
CloudBase execution, device testing or real-user beta completion.

The user explicitly authorized temporary fixture injection, page refresh and screenshot capture in the local WeChat
DevTools, and confirmed that the Mac is unlocked. This authorization is limited to reversible local validation. It
does not authorize production configuration, secrets, paid/live APIs, real data mutation, deployment or publication.

## 2. Final committed allowlist

The final committed diff may contain only:

- new `docs/beta-acceptance-checklist.md`
- new `docs/beta-acceptance-report.md`
- new files under `docs/evidence/i24/`
- `README.md`
- `GOAL.md`
- `docs/product-requirements.md`
- `docs/architecture.md`
- `docs/development-plan.md`
- `docs/testing-strategy.md`
- `docs/decision-log.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

No other committed file may change without Sol expanding this contract before the edit.

## 3. Temporary local validation scope

Temporary, uncommitted work is allowed only in:

- `taro-app/src/pages/index/index.jsx`
- temporary `taro-app/src/pages/index/local-beta-fixtures.js`
- generated `taro-app/dist`

The fixture may expose a local-only scenario selector or inject deterministic page state needed to exercise the
existing rendering and recovery paths. It must not add a package, port, network service, secret, production switch,
public contract or alternate business-rule implementation. The fixture is a validation adapter, not a second product.

Before any GUI action, the executor must read the `computer-use:computer-use` skill completely. It must operate only
the local WeChat DevTools project and must not sign in to, upload, preview, deploy or mutate a real cloud environment.

All temporary source/debug hooks must be restored to the accepted base before the implementation commit. Generated
`taro-app/dist` is never committed.

## 4. Required checklist

The checklist must cover, without inventing evidence:

1. Each of the five exact pilot RouteVariants from input through structured result:
   - `variant:wugongshan-longshan-to-main-gate-2d`
   - `variant:siguniang-erfeng-haizigou-out-and-back-2d`
   - `variant:yulong-blue-moon-yunshanping-out-and-back-1d`
   - `variant:gongga-laoyulin-yulongxi-point-to-point-3d`
   - `variant:dangling-huluhai-zhuoyongcuo-out-and-back-1d`
2. Fuzzy confirmation, cancellation and editing; manual/AMap place-only; official Wutai blocked behavior.
3. The four result labels (`go`, `caution`, `no_go`, `verdict=null`) while showing that data completeness is an
   independent axis.
4. AI ready, unavailable and explicit retry while route/weather/verdict/minimum-gear facts and checklist state stay
   deterministic.
5. Weather re-prepare with the old deterministic result still visible until replacement BaseData arrives, followed
   by a new `queryId`.
6. Private-history save retry, list retry/stale-response protection and history selection as zero-network form prefill.
7. Checklist lifecycle across same-query advice events and reset on a different base, back action or cache restore.
8. Visible route source, operational status, local time/window and data-status semantics.
9. A normal fixture-free build/import smoke in WeChat DevTools when that runtime action is available.

五台山大朝台 remains a separate blocked record, not a sixth plannable pilot.

## 5. Evidence status and screenshot policy

Every required row must record exactly one truthful status:

- `VERIFIED`: the stated command or GUI behavior was actually executed and the linked evidence supports the claim.
- `UNVERIFIED_RUNTIME_TOOL`: execution was attempted but a named local tool/runtime blocker prevented observation;
  record the exact blocker and do not describe the row as passed.

I24c may be code-ready with honestly recorded `UNVERIFIED_RUNTIME_TOOL` rows because GUI execution is best-effort,
but no unexecuted row may be relabeled `VERIFIED`. Since the Mac is now unlocked and fixture use is authorized, the
executor must make a real DevTools attempt before using that status.

Keep a small representative screenshot set rather than one image per click. A screenshot may support several rows
only when its visible content actually proves them. Use complete-page frames where the relevant verdict, reasons,
weather, equipment, sources or degraded state would otherwise be split across the viewport. Do not fabricate, crop
away required assertions or claim hidden content.

## 6. Cleanup and fixture-free proof

After collecting the needed local evidence, perform this sequence:

1. Restore both allowed temporary source paths exactly to the accepted base; remove the temporary module if created.
2. Rebuild the normal fixture-free `taro-app/dist`.
3. Search source, scripts, package/config files and normal dist for bounded residue markers, including
   `VISUAL_FIXTURE`, `LOCAL_BETA_FIXTURE`, `local-beta-fixtures` and fixture/debug scenario hooks.
4. If WeChat DevTools remains usable, import or refresh the normal fixture-free dist and record the smoke result.
5. Run the complete automated gate matrix in section 8.
6. Confirm the final diff is docs/evidence only and contains no generated build output.

Residue checks should target realistic fixture markers and imports; do not add speculative security machinery,
hashing/SHA or mechanical scans unrelated to this task.

## 7. Documentation deliverables

- `docs/beta-acceptance-checklist.md`: row-by-row status, exact command/interaction, evidence link and blocker/notes.
- `docs/beta-acceptance-report.md`: scope, environment, automated results, representative observed flows, limitations,
  cleanup proof and code-ready conclusion.
- `docs/evidence/i24/`: only the minimum useful screenshots or text evidence needed by the checklist.
- Synchronize README, Goal, product, architecture, development, testing, decisions, current status and active-task
  documents so they agree that I24a/I24b are complete, I24c is the active evidence phase, deployment/real beta remain
  out of scope, and GUI evidence is not equivalent to production validation.

Do not create a new architectural decision unless a hard-to-reverse trade-off actually arises. Routine execution
facts belong in the checklist/report/current-status rather than a new ADR.

## 8. Required validation

After temporary fixture cleanup, run and record:

- `npm run test:beta-acceptance`
- `npm test`
- `npm run test:integration`
- `npm run lint`
- `npm run typecheck`
- `npm run build:weapp`
- `git diff --check`

All failures remain visible. The expected current baselines include offline integration `55/0` and lint with zero
errors plus the existing warnings; do not lower a gate or rewrite a failing result as success.

## 9. Non-work scope and stop conditions

Do not:

- change business code, existing tests, route data, dependencies, CI, public contracts, schema or deterministic rules;
- commit fixtures, debug selectors, generated dist, package/config changes or screenshots that do not prove their claim;
- use real CloudBase, paid/live APIs, secrets, production configuration, preview/upload/deploy or real user data;
- perform migration, deletion, publication, device/real-user beta, hashing/SHA or broad visual redesign;
- start I25, approve or merge the executor's own PR.

Stop and return the exact blocker for any production defect, required permanent file outside the allowlist, inability
to remove fixture residue, need for a real external service, evidence whose truth cannot be established, public
contract conflict or lowered acceptance. A bounded GUI/tool failure becomes `UNVERIFIED_RUNTIME_TOOL`; it does not
authorize a workaround that expands scope.

## 10. Allowed autonomous decisions

`luna-worker` may choose temporary fixture object names, local scenario order, representative screenshot grouping,
checklist table layout and evidence filenames. It may not change the five pilots, product facts, acceptance meaning,
public behavior, final allowlist, proof threshold or Goal boundary.

## 11. Delivery and Review

Use additive commits only; do not amend, rebase or force push. Create one focused draft PR using `Refs #107`, not an
auto-close keyword. The executor returns `READY_FOR_CONTROLLER_REVIEW` with:

- committed and temporary files touched;
- fixture injection/removal and residue proof;
- checklist status summary and screenshot paths;
- exact commands/results;
- runtime/model visibility;
- deviations, blockers, limitations and重点 Review locations;
- PR URL and exact latest head.

The final committed PR must be docs/evidence only. Sol independently inspects actual screenshots, evidence claims,
the final diff, cleanup proof and latest-head CI before returning `APPROVED`, `CHANGES_REQUESTED`, `BLOCKED` or
`ESCALATE_TO_HUMAN`. Only an approved merge may close #107 and parent #33 and unblock I25.

## 12. Controller activation checkpoint — 2026-08-09

I24b/#106 passed latest-head quality and two independent actual-diff Reviews, then PR #109 squash merged as
`f311d1b`. The I24c branch starts from that exact main. The requested Agent is the exact custom `luna-worker`; its
configuration is `gpt-5.6-luna` with `max` reasoning. Runtime metadata must be recorded as observed and never inferred
from configuration. Terra fallback is not authorized.

## 13. Executor evidence checkpoint — 2026-08-09

The executor ran the complete post-cleanup command matrix: `test:beta-acceptance`, root `npm test`, offline
integration (`55/0`), lint (`0 errors / 9 existing warnings`), typecheck, host WeChat `build:weapp` and
`git diff --check`; all passed. The `computer-use:computer-use` skill was read in full before the authorized local
runtime attempt. One bounded discovery plus one app-state/list-apps retry encountered the exact blocker
`The Mac is locked and automatic unlock could not unlock it. Ask the user to unlock the Mac manually before
continuing.` No temporary fixture source or screenshot was created. The row-by-row evidence is in
`docs/beta-acceptance-checklist.md` and the report in `docs/beta-acceptance-report.md`; all DevTools rows remain
`UNVERIFIED_RUNTIME_TOOL`, and the final diff is docs/evidence only.

## 14. Sol Review-fix round 1 — 2026-08-09

PR #110 exact head `b3ff65e` passed latest-head GitHub `quality`. Two independent actual-evidence Reviews found no
production, residue, allowlist or GUI-truth defect, but returned `CHANGES_REQUESTED` for three bounded corrections:

1. Replace the placeholder `node -e repeated prepare probe` evidence with a directly runnable, durable artifact under
   `docs/evidence/i24/` (preferred) or an exact copy-paste command. It must call the existing public offline fixture,
   assert both responses are `base`, assert distinct server `queryId` values and unchanged trusted route identity,
   print a clear PASS result, and be executed once. It must not become a second product implementation or alter root
   tests/package configuration. The checklist must distinguish `test:recovery` evidence for old-result visibility
   from this probe's evidence for replacement query authority.
2. Narrow A6's automated `VERIFIED` wording to what the contracts actually prove: candidate/confirmation contract,
   reducer RESET/token isolation and zero pre-confirm side effects. Actual cancellation followed by form editing is
   not automatically proven and must remain in R2 as `UNVERIFIED_RUNTIME_TOOL`; do not add production/UI code or
   claim that observation occurred.
3. After the correction and complete revalidation, synchronize `GOAL.md`, `docs/current-status.md`, this file, live
   #107 and parent #33 to `READY_FOR_CONTROLLER_REVIEW`. Record PR #110 and its live latest-head check as the CI fact
   source. Do not mark I24c, #107, #33, M7 or the Goal complete before Sol approval and merge.

This is Review-fix round 1. The final committed diff remains inside the existing docs/evidence allowlist; temporary
fixture scope stays unused. Use additive commits only and do not amend, rebase or force push. Rerun the durable probe,
`npm run test:beta-acceptance`, `npm test`, integration, lint, typecheck, build and diff check; then update PR #110 and
return `READY_FOR_CONTROLLER_REVIEW`. A repeated evidence-integrity finding after a second bounded round requires
human escalation under the Goal stop condition.

## 15. Executor Review-fix completion — 2026-08-09

The durable probe now lives at `docs/evidence/i24/repeated-prepare-probe.js` and directly calls the existing public
offline acceptance fixture. It asserts two `base` responses, distinct server query IDs and unchanged trusted route
identity, and was executed successfully. The checklist separates this replacement-authority proof from
`test:recovery`'s old-result visibility proof; A6 is narrowed to candidate/confirmation, RESET/token isolation and
pre-confirm side effects, while real cancel-followed-by-edit remains runtime `UNVERIFIED_RUNTIME_TOOL`.

The complete Review-fix gate matrix passed. PR #110 and its live latest-head `quality` check remain the CI fact source;
this task is `READY_FOR_CONTROLLER_REVIEW`. I24c/#107, parent #33, M7 and the Goal remain open and incomplete pending
Sol approval and merge.
