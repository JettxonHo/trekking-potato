# TP-BETA-001 当前状态

- Updated: `2026-08-06`
- Governance: `TP-GOV-2.0.0`
- Goal status: `ACTIVE`
- Active milestone: `M4 Weather and verdict` (M3 full routes remain source-blocked)
- Active task: `I14 / GitHub #23 / APPROVED — PR_PENDING`
- Branch: `codex/i14-hourly-weather`
- Base: `main` at `ea64e28`
- Planning PR: `#9` — merged
- Checkpoint PR: `#39` — merged; latest-head GitHub `quality` passed
- I04 PR: `#40` — merged; GitHub #13 closed
- I05 planning PR: `#43` — merged
- I05a PR: `#44` — merged; GitHub #41 closed and #42 unblocked
- I05b PR: `#45` — merged; GitHub #42 and parent #14 closed
- I06 planning PR: `#46` — merged; latest-head `quality` passed
- I06 implementation PR: `#47` — merged; GitHub #15 and M2 closed
- I07 planning PR: `#48` — merged; GitHub #16 remains open for implementation
- I07 implementation PR: `#49` — merged; GitHub #16 closed
- M3 source-gate PR: `#52` — merged; #50 activated, #17/#18/#20/#21/#51 blocked
- I10a implementation PR: `#53` — merged; GitHub #50 closed
- I14 planning PR: `#54` — merged; GitHub #23 implementation activated

Status semantics: TP-BETA-001 remains active. M1 and M2 are complete. I07 and I10a are complete. The
field-level audit still blocks every full pilot variant, so M3 cannot close. TP-D024 permits the
independent M4/I14 weather foundation to proceed using only I07's frozen shape and synthetic fixtures;
this does not authorize I13, real full-route data or production integration. Sol XHigh approved the
I14 implementation after one bounded review-fix round; it has not yet passed remote CI or merged.

## Completed

- Repository, product docs, architecture, tests, GitHub workflow and risk audit.
- Product and architecture decisions for TP-BETA-001.
- PR #8 reviewed and squash merged; P0-3 closeout and P0-4 investigation activation preserved.
- Governance v2, Goal and durable planning documents drafted on the planning branch.
- Independent Terra XHigh planning review completed with final `APPROVED` after all requested contract fixes.
- Controller approved and Sol XHigh squash merged planning PR #9.
- Goal activated in PR #35; 8 governance labels, M1–M7 milestones and GitHub Issues #10–#34 were created.
- I01 merged in PR #36 and GitHub #10 closed after Sol XHigh `APPROVED` review.
- I02 merged in PR #37 and GitHub #11 closed after Sol XHigh `APPROVED` review.
- I03 merged in PR #38 and GitHub #12 closed after GitHub-hosted `quality` passed and Sol XHigh
  returned `APPROVED`.
- `main` protection was applied and read back: Pull Requests and strict `quality` are required;
  force pushes and branch deletion are disabled. Extra GitHub approval count remains zero because
  independent approval is performed by Sol XHigh.
- M1 Engineering gate was closed after I01–I03 completion.
- M1 checkpoint and the frozen I04 contract passed independent Review and merged in PR #39.
- I04 response-contract implementation was committed as `37c9be3`; its offline
  `test:response` exercises public handler exits and minimal frontend phase consumption. The
  first Sol review changes were addressed before its second Review.
- I04 passed Sol XHigh second review and latest-head `quality`, merged in PR #40 as `34170ba`,
  and GitHub #13 was closed.
- I05 was split into parent #14 with backend child #41 and frontend child #42 to keep each PR
  independently verifiable; #42 remained blocked until #41 merged.
- I05 planning passed independent Review after one fix round and merged in PR #43 as `a73b840`;
  #41 was activated on that real base.
- I05a passed Sol XHigh Review and latest-head `quality`, merged in PR #44 as `1a76bc0`, and
  GitHub #41 was closed. I05b was unblocked on that real base.
- I05b passed Sol XHigh Review and latest-head `quality`, merged in PR #45 as `deb3a8c`; GitHub
  #42 and parent #14 were closed.
- Three read-only I06 interface explorations compared a minimal pure merge, a full orchestration
  adapter and a caller-oriented producer. Sol selected the scoped single-entry pure projection in
  TP-D017; no I06 business code has been dispatched or modified.
- The first independent I06 contract Review returned `CHANGES_REQUESTED`; Goal status, exact AI
  union/schema, risk/note projection, degradedReason placement and pre-LLM base validation were
  synchronized before re-review.
- The second independent contract Review returned `APPROVED`; all four first-round findings are
  closed and no human escalation is required.
- Planning PR #46 passed latest-head GitHub `quality` and merged as `bf7ac83`; I06 implementation
  was activated on a fresh branch from that exact commit.
- I06 implementation added the single `projectSafetyAdvice` pure projection, pre-LLM base validation,
  base-only Prompt construction, and base-first UI deterministic gear/risk display. Invalid AI output,
  unavailable AI, and advice transport failure retain deterministic content; review is still pending.
- I06 final local validation passed: lint (0 errors; 10 pre-existing warnings), typecheck,
  `test:safety`, `test:response`, root `test`, offline integration, WeChat build and `git diff --check`.
- Sol XHigh first implementation Review returned `CHANGES_REQUESTED` for two bounded findings.
  P1 now distinguishes successful-but-unparseable LLM envelopes/content as `ai_output_invalid` from
  transport/service failures as `ai_unavailable`; P2 now snapshots the full projection input and
  asserts AI-only risks never enter the deterministic risk set. The corrected full local matrix is
  green.
- The second independent implementation Review returned `APPROVED`: transport/HTTP failures remain
  `ai_unavailable`, response envelope/content parse failures are `ai_output_invalid`, and the new
  tests are sensitive to both failure classes, full-input mutation and AI-only risk leakage.
- I06 implementation PR #47 matched reviewed head `d558bf5`, passed latest-head GitHub `quality`,
  and squash merged as `57ab44c`; GitHub #15 and milestone M2 were closed.
- Three read-only I07 designs compared a minimal cold catalog, an integrated repository and a
  caller-oriented dual-read seam. Sol selected the minimal cold catalog so I07 does not steal I13
  search behavior or invent legacy route facts.
- I07 contract Review first returned `CHANGES_REQUESTED` for Place status drift, C-tier evidence,
  zero-day itinerary, real legacy self-alias normalization and blocked source wording. All five were
  corrected and synchronized to GitHub #16; second Review returned `APPROVED` with
  `git diff --check` passing.
- I07 planning PR #48 matched approved head `ac31c26`, passed latest-head GitHub `quality`, and
  squash merged as `7d43b1d`. GitHub #16 intentionally remains open for the implementation PR.
- I07 implementation is ready for Sol XHigh review: a new cold `createRouteCatalog` module validates
  Source/Place/Route/full-or-blocked RouteVariant records, adapts all 175 legacy records only to
  place-only data, and does not change the production search path. Its offline test began with a
  genuine missing-module failure, then passed valid/invalid, evidence, legacy, immutability and ID
  lookup assertions.
- Sol 的第一次 I07 实现 Review 返回 `CHANGES_REQUESTED`：空 namespace 后缀未被拒绝，且
  route-domain 测试尚缺错误 namespace、variant route/source 引用、日程与采样数量的独立负例。
  Terra 先以 `source:` 无后缀写出真实失败，再加入最小非空后缀校验和这些测试；没有生成 ID、
  没有新增搜索或运行时路径。修复后的交付状态恢复为 `READY_FOR_CONTROLLER_REVIEW`，等待第二次
  Sol Review。
- Sol 的第二次 I07 实现 Review 直接检查了实际模块、测试与文档，并亲自重跑
  `test:route-domain`、lint、typecheck、root test、integration、WeChat build 和 diff check；
  全部通过。Review 结果为 `APPROVED`，当前仅等待实现 PR 的 latest-head CI 与合并。
- I07 implementation PR #49 matched reviewed head `19c3fee`, passed latest-head GitHub `quality`,
  and squash merged as `ea3b869`; GitHub #16 closed. The production search path remains unchanged
  by design, and M3 proceeds to source-backed pilot records.
- Parallel read-only source audits and Sol verification are consolidated in
  `docs/research/pilot-route-source-audit.md`. The report found an official seven-day Siguniang
  reference after the controller's initial search, but also confirmed that its D2–D6 geometry is not
  sufficient for full stages and that official pages conflict on the second-peak elevation.
- I08, I09, I10b, I11 and I12 are source-blocked with exact missing-field and unblock conditions.
  The official Wutai 2026-07-31 title supports a narrowly scoped I10a blocked record as of the audit
  date; unknown effective dates remain null and are not interpreted as a permanent ban.
- TP-D023 resolves mixed-route metrics as complete journey geometry, with access mode shown
  separately; endpoint or cableway height differences cannot substitute for cumulative ascent.
- GitHub #19 is now a blocked parent with #50 I10a and #51 I10b. #17/#18/#20/#21 and #51 carry
  `status:blocked` plus exact source gaps; at that checkpoint #50 remained contract-pending until
  source-gate PR #52 merged.
- TP-D024 allows I14 to proceed from I07's frozen stage/sample contract with synthetic offline
  fixtures while real pilot data remains blocked. It does not authorize I13 or production route data.
- The first independent source-gate contract Review returned `CHANGES_REQUESTED` for five document
  consistency findings: stale I08-first wording, I10a status drift, an effective-date contradiction,
  AMap tier drift and an incorrect Yulong publisher. All were corrected. Second Review returned
  `APPROVED`; no human decision is required.
- Sol reran the complete planning-branch quality matrix after the contract changes: lint passed with
  0 errors and 10 existing warnings; typecheck, root test, 56/0 offline integration, WeChat build and
  `git diff --check` all passed.
- Source-gate PR #52 matched reviewed head `8961998`, passed latest-head GitHub `quality` in 48 seconds,
  received Sol `APPROVED`, and squash merged as `7b708f2`. GitHub #50 is activated from that exact base.
- I10a implementation recorded a real two-step RED: the planned `test:route-data` command first lacked
  a root script, then the new runner lacked the Wutai data fragment. The minimum GREEN adds only the
  Wutai plain data fragment, shared offline runner and Wutai-specific assertions. It aggregates 175
  legacy Places with 1 Route and 1 tier A blocked Variant (0 full Variant and 0 verified Place), while
  retaining the existing production search path. Direct negative checks reject a tier B restriction
  source, missing restriction evidence and a blocked record with `fixedDays`.
- I10a PR #53 matched reviewed head `d112ffe`, passed latest-head GitHub `quality` in 50 seconds,
  received Sol `APPROVED`, and squash merged as `9021f31`; GitHub #50 closed.
- Two Terra XHigh read-only I14 audits compared module and testing seams. Both found #23's stale
  I08–I12 dependency and stale #50 activity facts; Sol resolved them in this contract branch and
  synchronized the exact frozen contract to GitHub #23. The
  selected design isolates an internal route-hourly interface, keeps legacy daily production behavior
  unchanged, normalizes mixed Open-Meteo valid-time semantics into explicit hourly buckets, and shares
  a pure coordinate conversion module.
- The first formal I14 contract Review returned `CHANGES_REQUESTED` for three bounded findings:
  GitHub #23 authority drift, an underspecified insufficient-window shape, and missing semantic domains
  for external weather numbers. Sol synchronized #23, froze metadata-only insufficient windows, and
  added WMO/probability/non-negative guards with representative tests. A final synchronization check
  also required direct assertions for normalized units and deterministic output order.
- The final independent Review read both the actual diff and live #23, returned `APPROVED`, and found
  no remaining P0–P2 issue or human decision. At that review checkpoint no implementation file had
  been modified or authorized.
- I14 planning PR #54 matched approved head `0da38c8`, passed latest-head GitHub `quality` in 51
  seconds, and squash merged as `ea64e28`. Implementation is now authorized only on the exact
  allowlist and internal union frozen in #23.
- I14 implementation completed the required real TDD RED with the new hourly module absent, then
  added only the isolated route-hourly adapter, pure GCJ-02 helper extraction, synthetic I07-validated
  catalog/weather fixtures and offline contract. The final local matrix passes `test:hourly-weather`,
  legacy weather (86/0), route-domain, lint (0 errors; 10 pre-existing warnings), typecheck, root test,
  integration (56/0), WeChat build and `git diff --check`. It remains `READY_FOR_CONTROLLER_REVIEW`.
- Sol's first I14 implementation Review returned `CHANGES_REQUESTED` for two P1 boundary cases: a
  catalog-valid sub-minute fractional duration produced a non-normalized local audit time, and a
  non-range Open-Meteo service error was classified as invalid data. The bounded REVIEW_FIX now rounds
  duration minutes conservatively upward while retaining the original duration field, maps only explicit
  non-range upstream errors to retryable `weather_unavailable`, and directly covers the weather-module
  injected entry. The complete local matrix turned green again and returned I14 for the second Review.
- Sol's second Review inspected the real code and regression-test diff, then independently reran
  hourly-weather, legacy weather (86/0), route-domain, lint (0 errors; 10 pre-existing warnings),
  typecheck, root test, integration (56/0), WeChat build and diff checks. All passed; result is
  `APPROVED — PR_PENDING`, with latest-head GitHub `quality` still required before merge.

## Baseline evidence

- `node scripts/route-type-contract-test.js`: 93 pass / 0 fail
- `node scripts/weather-contract-test.js`: 86 pass / 0 fail
- `node scripts/unit-test.js`: 55 pass / 0 fail
- `node scripts/security-test.js`: 15 pass / 0 fail
- `node scripts/e2e-local.js`: offline fixture/mock E2E, 56 pass / 0 fail; covers
  `tripDays` 1/2/3 and current `trek` / `climb` route types without Open-Meteo,
  CloudBase or DeepSeek access.
- `node scripts/response-contract-test.js`: offline public-handler and frontend-source contract
  test for I04 response phases, error envelopes, compatibility consistency and phase branches; I06
  extends it with pre-LLM zero-call, base-only Prompt, outcome ownership, and base-first UI assertions.
- `node scripts/advice-safety-contract-test.js`: I06 pure projection contract for deterministic
  gear/risk ownership, exact additions, notes ordering, unavailable/invalid degradation and immutability.
- `node scripts/route-domain-contract-test.js`: I07 cold catalog contract for valid full/blocked
  fixtures, 175 legacy place-only adaptation, nonempty namespace suffix/error namespace, evidence/
  reference/itinerary/sample-count failures, input isolation and `getById` miss semantics.
- `node scripts/route-data-contract-test.js`: I10a aggregated data contract for 175 legacy Places,
  one Wutai Route, one tier A blocked Variant, zero full Variants, and focused evidence/field failures.
- `node scripts/confirmation-contract-test.js`: offline I05a contract for canonical/alias and
  candidate-stage matching, four-field candidate exposure, `candidate_not_found`, confirm server
  fact recovery, zero pre-confirm side effects and disabled UGC substring auto-hit; I05b source
  checks cover selection/cancel/edit and prepare/confirm generation protection.
- I01 on Node 24.18.0 + npm 10.9.2: fresh-cache root `ci` and three-project `bootstrap` pass using official npm registry locks.
- I02 on Node 24.18.0 + Corepack npm 10.9.2: root `lint` (0 errors; 10 existing
  unused-variable warnings), `typecheck`, `test`, `test:integration` and
  `build:weapp` pass; global `taro` is not required.
- PR #38 GitHub-hosted `quality`: all 12 steps passed in 50 seconds using the same root commands.

The baseline checks were rerun during M1 verification. Local Markdown links and `git diff --check` also pass.

## Agent assignments

- Sol XHigh: planning documents, Goal, GitHub orchestration and independent review.
- Luna XHigh: preferred executor, unavailable in this environment.
- Sol XHigh: owns #23/I14 architecture, contract, independent implementation Review and merge decision.
- Terra XHigh: I14 implementation owner; delivery is `READY_FOR_CONTROLLER_REVIEW` on
  `codex/i14-hourly-weather`.
- Terra XHigh source agents: completed read-only official-source audits and the durable evidence report.

## Open work

1. Create I14 PR, verify latest-head GitHub `quality`, then squash merge and close #23 if green.
2. Continue source acquisition independently; never fill blocked full variants with adjacent data.

## Blockers and risks

- Root toolchain, lockfiles, offline integration, CI and branch protection are merged and verified.
- Node 24 随附的 npm 11 与 `@nutui/nutui-react-taro@3.0.20` 的不可解析可选依赖
  存在锁文件校验不兼容：npm 11 生成锁时省略该包、`npm ci` 又报缺失。I01 已按
  GitHub #10 的控制端决策固定 npm 10.9.2，并以 `engine-strict` 拒绝错误 npm。
- Five full route variants still lack complete field-level A/B evidence. Exact gaps and acceptable
  remediation are recorded in the research report and must not be filled from adjacent routes.
- I09's seven-day identity is now official, but D2–D6 detail and the 5276m/5454m official conflict
  remain unresolved. I12 is a 2017 event record and lacks current access evidence.
- I10a remains deliberately narrow: broader restriction scope still requires the missing official
  announcement body or poster.
- I14 must not silently resolve the separate I15 question of how the 24-hour precipitation and daily
  snowfall thresholds interact with activity-only windows; Sol will freeze that in I15's contract.
- Deployment and real-device validation remain outside the Goal.

## Forbidden actions during I14 implementation

- Any file outside the activated #23 allowlist, dependency or lockfile change
- Real route data, stable search I13, verdict/queryId/history/UI or public handler implementation
- Deployment, database mutation, UGC deletion, migration or production configuration

## Next action

Create the approved I14 PR; do not merge until latest-head GitHub `quality` passes.
