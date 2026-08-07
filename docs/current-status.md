# TP-BETA-001 当前状态

- Updated: `2026-08-07`
- Governance: `TP-GOV-2.0.0`
- Goal status: `ACTIVE — COMMUNITY_GPX_REPLAN`
- Active milestone: `M3 Route domain` (four route tracks selected; fifth waits #77)
- Active task: `I08 / #17 / IMPLEMENTATION`
- Branch: `codex/i08-wugong-community-gpx`
- Base: `main` at `1e601d9`
- Implementation assignment: Terra XHigh; Sol XHigh independently reviews and merges
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
- I14 implementation PR: `#55` — merged; GitHub #23 closed
- I15 planning PR: `#56` — merged; GitHub #24 implementation activated
- I15 implementation PR: `#57` — merged; GitHub #24 closed
- I16 planning PR: `#58` — merged; GitHub #25 implementation activated
- I16 implementation PR: `#59` — merged; GitHub #25 and M4 closed
- I17 planning PR: `#62` — merged
- I17a implementation PR: `#63` — merged; GitHub #60 closed
- I17b implementation PR: `#64` — merged; GitHub #61 closed
- I17 completion PR: `#65` — merged; GitHub #26 closed
- I18 planning PR: `#66` — merged
- I18 implementation PR: `#67` — merged as `5c69195`; GitHub #27 closed; latest-head quality passed
- I19 planning PR: `#68` — merged as `72ab196`; attempt 3 latest-head quality passed in 50 seconds
- I19 implementation PR: `#69` — merged as `b7c17ea`; GitHub #28 and M5 closed
- I20 planning PR: `#70` — merged as `7fc295f`; GitHub #29 implementation activated
- I20 implementation PR: `#71` — merged as `9d70f7c`; GitHub #29 closed
- I21 dependency checkpoint PR: `#72` — merged as `bfd9394`; #22/#30 remain blocked
- M3 source refresh PR: `#73` — merged as `31eab6d`; latest-head quality passed
- User GPX audit PR: `#74` — merged as `97c6728`; latest-head quality passed
- Exact-pilot retention PR: `#75` — merged as `62ba8c5`; latest-head quality passed
- External evidence checkpoint PR: `#76` — merged as `0461874`; latest-head quality passed
- Community-GPX replan PR: `#78` — squash merged as `1e601d9`; latest-head GitHub `quality` passed

Status semantics: TP-BETA-001 resumed after human decision TP-D039 replaced the exact-pilot policy.
M1 and M2 are complete. I07 and I10a are complete. Four reviewed community tracks can now receive
route-data contracts; #77 still blocks the fifth full pilot, so M3 cannot close. TP-D024 permits the
independent weather/verdict foundation to proceed using only I07's frozen shape and synthetic fixtures;
M4 is complete through I14–I16 without authorizing I13 or real full-route data. M5 is complete: I17
creates server-owned short-lived contexts, I18 completed the atomic queryId-only advice cutover, and
I19 completed private history plus non-destructive public UGC shutdown. I20 completed the pure reducer
and getAdvice service seam. M6 remains blocked at I21 until the four supplied-track Variants plus
#77's fifth Variant are merged and I13 resolves them from the production catalog.

## Completed

- Repository, product docs, architecture, tests, GitHub workflow and risk audit.
- Product and architecture decisions for TP-BETA-001.
- TP-D039 community-GPX replan passed independent documentation Review after one bounded wording
  correction. Local lint (0 errors/10 existing warnings), typecheck, full root test, integration
  (56/0), host-environment WeChat build and `git diff --check` pass.
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
- I14 PR #55 matched approved head `ed618b2`, passed latest-head GitHub `quality` in 56 seconds and
  squash merged as `f771b41`; #23 closed. The branch was not self-approved or self-merged by Terra.
- Two independent Terra XHigh read-only I15 audits agreed that I14's activity-only snapshot cannot
  honestly reconstruct a complete rolling 24h or natural-day total. TP-D028 therefore freezes the Beta
  `40mm/15cm` rules as per-stage, per-sample activity-bucket accumulations and keeps I15 weather-only.
- I15's first independent contract Review found stale Goal state, undefined reason time spans, missing
  executable validation commands and unfrozen messages. Sol fixed all four and resynchronized #24; the
  second Review returned `APPROVED` with no remaining P0–P2 finding. At that checkpoint implementation
  remained forbidden until the planning PR passed latest-head CI and merged.
- I15 planning PR #56 matched approved head `925c09c`, passed latest-head GitHub `quality` in 54 seconds
  and squash merged as `8a4d2c4`. The exact implementation allowlist and contract in #24 are now active.
- I15 implementation adds the isolated `evaluateWeatherVerdict` pure module and its offline contract
  test. The test crossed I14's injected hourly-weather boundary before the evaluator, recorded one
  genuine missing-module RED, then passed GREEN coverage for every frozen threshold, combination,
  accumulation, representative-selection, sorting, message, immutability and non-complete-boundary
  rule. The full local command matrix is green; the task awaits Sol XHigh's independent code Review.
- Sol XHigh's first I15 implementation Review returned `CHANGES_REQUESTED` only for test sensitivity:
  it requested exact `at` spans for a same-stage cross-midnight heavy-rain run, scalar bucket,
  accumulation window and numeric representative. Terra added those I14-derived assertions without
  changing production rules, then returned the task to `READY_FOR_CONTROLLER_REVIEW`.
- Sol's second implementation Review inspected the review-fix diff and independently reran verdict,
  hourly/legacy weather, route-domain, root test, integration (56/0), lint (0 errors; 10 existing
  warnings), typecheck, WeChat build and diff checks. All passed; result is `APPROVED — PR_PENDING`.
- I15 implementation PR #57 matched approved head `0253cd7`, passed latest-head GitHub `quality`,
  and squash merged as `ade3bdd`; #24 closed. I16 can now freeze the remaining M4 composition rules.
- Two independent Terra XHigh read-only I16 audits reviewed the available I07/I14/I15 shapes,
  climbing matrix, forecast-day calculation and existing local `suncalc` seam. Sol selected a narrow
  normalized route-context union, Shanghai calendar-day lead calculation and the earliest sunset
  across each window's trusted weather samples. Missing sunset remains a data-availability issue,
  not a danger reason; independent blocked/novice-climb hard no-go facts retain precedence.
- Formal independent contract Review checked the actual seven-document diff and synchronized GitHub
  #25. It returned `APPROVED` with no P0–P2 finding; the existing normalized blocked boundary,
  proportional TypeError guards, data-issue ordering and all-sample earliest-sunset policy are
  implementable without changing I14/I15 or requesting human direction.
- I16 planning PR #58 matched approved head `1347037`, passed latest-head GitHub `quality` in 50
  seconds and squash merged as `8412535`. The exact allowlist and contract in #25 are now active.
- I16 implementation recorded a genuine missing-module RED, then added only the pure trip composition
  module, the frozen local sunset adapter and an offline I14/I15-crossing contract test. Its final local
  matrix passes the I16/I15/I14/legacy weather/route-domain contracts, root test, integration (56/0),
  lint (0 errors; 10 existing warnings), typecheck, WeChat build and `git diff --check`. It is
  `READY_FOR_CONTROLLER_REVIEW`; no public handler, route data, dependency or frontend change occurred.
- Sol's first I16 implementation Review found no P0/P1 production defect, but returned
  `CHANGES_REQUESTED` for two test-sensitivity gaps. The bounded REVIEW_FIX moves the fixture clock
  across the Shanghai/UTC midnight and proves a UTC-sliced implementation fails by adding a spurious
  day-one forecast warning; it also exercises the real local sunset adapter and default I16 path without
  locking astronomical minutes. No production behavior changed. The focused and complete local matrices
  are green again, so I16 is returned as `READY_FOR_CONTROLLER_REVIEW` for Sol's second Review.
- Sol's second Review inspected the implementation and REVIEW_FIX, confirmed the UTC-date mutation
  fails the new boundary test, then independently reran I16/I15/I14 focused tests and the complete
  root/integration/lint/typecheck/WeChat-build/diff matrix. All passed; result is
  `APPROVED — PR_PENDING`.
- I16 implementation PR #59 matched approved head `1dcc717`, passed latest-head GitHub `quality` in
  54 seconds, and squash merged as `bd6017f`; #25 and M4 closed.
- Two independent Terra XHigh read-only I17 audits inspected the current handler, response contract,
  CloudBase mocks and I17/I18 boundary. Sol split parent #26 into #60 I17a store and #61 I17b handler
  integration so ownership/TTL and public writes remain independently verifiable. The chosen design
  uses random UUIDs, exact 30-minute logical TTL and an honest transitional place-only snapshot; it
  does not use hashes, complex cleanup or pretend the legacy resolver is a verified route.
- The first formal I17 contract Review returned `CHANGES_REQUESTED`: it found an ambiguous ownership
  seam for the TrustedBaseData projection, a stale public-error paragraph and two focused missing test
  assertions. Sol assigned the private legacy-to-trusted projection exclusively to the I17a store,
  staged I17/I18 public errors, added malformed-ID zero-query coverage and froze the exact
  `trip_contexts/doc().set()` mock boundary. The second independent Review returned `APPROVED` with no
  remaining P0–P2 finding; #26/#60/#61 match the local contract. No implementation has started.
- I17 planning PR #62 matched approved head `176c8a8`, passed latest-head GitHub `quality` in 64 seconds
  and squash merged as `bc23dbe`. #60 is active on a fresh branch from that exact base; #61 remains
  blocked and no handler change is authorized in I17a.
- I17a recorded a genuine TDD RED because the new `trip-context` module did not exist. Its GREEN adds
  only the injected storage seam, random `tctx_<uuid-v4>` IDs, exact 30-minute logical expiry,
  `_openid` ownership, legacy-to-place-only TrustedBaseData projection and offline contract coverage.
  It performs no handler, response, mock, frontend, dependency, configuration or production-data work.
  The completed local matrix is green; #60 is `READY_FOR_CONTROLLER_REVIEW` and awaits Sol's actual-diff
  review before any PR, CI or merge.
- Sol's first I17a implementation Review returned `CHANGES_REQUESTED` for one malformed-record P1:
  an unparsable `createdAt` or a snapshot without `schemaVersion='beta_base_v1'` could previously reach
  `found`. The bounded `REVIEW_FIX` first recorded both sensitive RED cases, then added only those two
  stored-record checks. It does not revalidate I14–I16 nested data; the focused test and complete local
  matrix are green again, so #60 is returned as `READY_FOR_CONTROLLER_REVIEW`.
- Sol's second I17a Review inspected the actual REVIEW_FIX, confirmed the previous corrupt-record probe
  now returns `store_unavailable`, and independently reran trip-context, root test, integration (56/0),
  lint (0 errors; 10 existing warnings), typecheck, WeChat build and diff checks. All passed; result is
  `APPROVED — PR_PENDING` with only latest-head GitHub `quality` remaining.
- I17a PR #63 matched approved head `e7eb232`, passed latest-head GitHub `quality` in 41 seconds and
  squash merged as `910c00d`; #60 closed. The store core is now available to #61, whose only purpose is
  base-response lifecycle wiring. #61 is active on a fresh branch and I18 remains blocked.
- I17b recorded a genuine RED because `baseResponse` accepted a base result without trusted context
  metadata. Its GREEN creates the I17a store only after server geo/weather/rules complete, writes once
  via `trip_contexts.doc(queryId).set({data: record})`, returns the stored projection unchanged with
  top-level `queryId/expiresAt`, and maps one write failure to retryable `context_unavailable` without
  partial data. Stateful response/confirmation mocks prove prepare/base/confirm lifecycle writes,
  zero-write exits, zero handler reads and client-spoof isolation. I17b's complete local matrix is
  green and it is `READY_FOR_CONTROLLER_REVIEW`; no advice/queryId cutover, frontend, dependency,
  production configuration or I17a-store modification occurred.
- The first independent I17b audit found no code/test P0 or P1 and one governance-only P2: the branch
  diff contains Sol's pre-dispatch `GOAL.md` activation checkpoint although that file is not in Terra's
  executor allowlist. The contract now records commit `6eacf76` as a separately authored controller-
  only status update; Terra commit `97372dd` remains within its allowlist. The corrected governance
  boundary passed second independent Review with `APPROVED` and no remaining P0–P2 finding.
- Sol inspected the actual handler/response/mock diff and independently reran response, confirmation,
  trip-context, root test, integration (56/0), lint (0 errors; 10 existing warnings), typecheck, WeChat
  build and diff checks. All passed; I17b is `APPROVED — PR_PENDING` with only latest-head GitHub
  `quality` remaining.
- I17b PR #64 matched approved head `e50e661`, passed latest-head GitHub `quality` in 51 seconds and
  squash merged as `ef245de`; #61 closed. Both I17 children are merged. Parent #26 remains open only
  until this pure documentation checkpoint passes Review, CI and merge; I18 is not yet authorized.
- The first independent I17 checkpoint Review found one P2: closed child Issues #60/#61 still displayed
  historical `PR_PENDING` status. Their bodies now retain the frozen contract but prepend authoritative
  DONE records for PRs #63/#64, merge commits `910c00d`/`ef245de` and latest-head quality 41s/51s.
  Re-review returned `APPROVED` with no remaining P0–P2 finding. The unchanged-code root test,
  integration (56/0), lint (0 errors; 10 existing warnings), typecheck and WeChat build all pass.
- I17 completion PR #65 matched approved head `8f37590`, passed latest-head GitHub `quality` in 59
  seconds and squash merged as `46752c0`; parent #26 was closed. I17 is complete.
- Two independent Terra XHigh read-only I18 audits confirmed one atomic vertical implementation is the
  smallest safe merge unit. They froze a queryId-only read path, unified non-leaking public errors, a
  focused RED/GREEN matrix and frontend success/fail generation guards. No human blocker was found.
- The first formal I18 contract Review returned `CHANGES_REQUESTED` for a missing visible frontend
  context-expiry branch and an inaccurate store-factory invocation. The contract now requires an
  in-result reprepare message with the existing return action, no degraded/AI note/history write, and
  the actual injected collection factory. Re-review returned `APPROVED` with no remaining P0–P2.
- The approved I18 planning head passed `git diff --check`, lint (0 errors; 10 existing warnings),
  typecheck, root test, integration (56/0) and the WeChat production build before PR submission.
- I18 planning PR #66 matched approved head `5b1e360`, passed latest-head GitHub `quality` in 57 seconds
  and squash merged as `270e442`. #27 is active for Terra implementation from that exact base.
- I18 implementation recorded a real RED in `test:response`: an advice request with only `queryId` and
  throwing legacy `route/date/level/days/baseData/weather` getters failed before the server cutover. Its
  GREEN moves the handler's advice branch ahead of all ordinary request-field reads, restores one
  openid-bound TripContext snapshot, and sends only that snapshot to Prompt, AI and safety projection.
  The response contract now maps unknown/foreign/expired to the same non-retryable
  `query_context_unavailable` envelope and storage reads to retryable `context_unavailable` without raw
  errors or an LLM call.
- The matching production-page cutover forwards top-level base `queryId` and generation to advice, sends
  exactly `{ mode: 'advice', queryId }`, retains only local form data for history, and rejects stale
  success/failure callbacks. Its distinct context-expired branch retains the deterministic result,
  displays the server reprepare message, and does not record AI degradation or history. The full local
  I18 matrix passed: TripContext, response and confirmation contracts; integration `56/0`; lint with
  `0` errors and `10` existing warnings; typecheck; root test; WeChat build; and `git diff --check`.
  Terra returned `READY_FOR_CONTROLLER_REVIEW` at implementation commit `c5b2201`; no PR has been
  created, approved or merged.
- Sol reran the full matrix and inspected the actual code. An additional independent audit found one P1
  that existing tests missed: confirm history params contain no route, so the I18 local-history split
  would save a successful confirmed route as “未知路线”. Review is `CHANGES_REQUESTED`; the fix is
  limited to restoring `base.route` in local historyParams without changing either network request.
  Two P2 cleanups also applied: update the stale cloud-function header and explicitly prove unauthenticated
  advice performs zero context reads. Remote #27 was synchronized before the fix assignment.
- REVIEW_FIX `2a4c85c` restores the server-resolved route only in local historyParams, while confirm and
  advice network payloads remain frozen and queryId stays out of history. It also fixes the handler header
  and proves unauthenticated advice performs zero reads. Sol inspected the patch and reran the complete
  matrix; independent re-review found no remaining P0–P2. Formal result: `APPROVED — PR_PENDING`.

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
- `node scripts/route-data-contract-test.js`: I08/I10a aggregated data contract for 3 Sources, 175 legacy
  Places, 2 Routes and 2 Variants: one tier B reviewed-GPX Wugong full Variant plus one tier A Wutai
  blocked Variant. It directly checks the Wugong two-day samples, totals, WGS84 points, unknown state and
  evidence, while the Wutai-specific assertions retain their blocked-only catalog view.
- `node scripts/weather-verdict-contract-test.js`: I15 weather-only contract. It derives complete
  snapshots via injected I14 transport, verifies all TP-VERDICT-1 weather rules and leaves I16
  composition paths outside its scope.
- `node scripts/confirmation-contract-test.js`: offline I05a contract for canonical/alias and
  candidate-stage matching, four-field candidate exposure, `candidate_not_found`, confirm server
  fact recovery, zero pre-confirm side effects and disabled UGC substring auto-hit; I05b source
  checks cover selection/cancel/edit and prepare/confirm generation protection.
- I17b extends `test:response` and `test:confirmation` with strict stateful `trip_contexts` mocks:
  successful lifecycle writes and returned metadata, write-failure public error/no partial base,
  zero-write exits, zero handler reads and confirm spoof isolation. The complete local matrix passes:
  root test, integration 56/0, lint 0 errors/10 existing warnings, typecheck, WeChat build and diff check.
- I01 on Node 24.18.0 + npm 10.9.2: fresh-cache root `ci` and three-project `bootstrap` pass using official npm registry locks.
- I02 on Node 24.18.0 + Corepack npm 10.9.2: root `lint` (0 errors; 10 existing
  unused-variable warnings), `typecheck`, `test`, `test:integration` and
  `build:weapp` pass; global `taro` is not required.
- PR #38 GitHub-hosted `quality`: all 12 steps passed in 50 seconds using the same root commands.
- I18 passed Sol Review after bounded REVIEW_FIX, then PR #67 passed latest-head GitHub `quality` in
  3 minutes 15 seconds and merged as `5c69195`; #27 is closed.
- Two independent Terra read-only I19 audits mapped the production history/UGC paths and verified the
  installed CloudBase SDK supports conditional query removal with `stats.removed`. No human-confirm
  blocker was found: the contract retains all real routes/history data and changes only code paths.
- Two independent formal I19 contract Reviews returned `APPROVED` after Sol froze `stats.removed`
  success semantics, save-failure retry and delete-control propagation tests, and corrected the Issue
  summary. There are no remaining P0–P2 findings or human-confirm items.
- GitHub Actions incident caused PR #68 attempts 1–2 to receive no hosted runner and execute zero steps.
  After GitHub reported recovery, attempt 3 completed every quality step in 50 seconds and PR #68 merged
  as `72ab196`. GitHub auto-closed #28 from wording in the planning PR; Sol reopened it because I19
  implementation remains active.
- I19 implementation recorded real RED coverage for the old history DTO leak and geocode public-routes
  access, then completed the private history DTO/ownership/delete/clear contract, authenticated UGC
  tombstones, zero geocode UGC reads, and the frontend local history error/delete/clear/degraded-save
  paths. Focused tests, root test, integration (56/0), lint and typecheck are green. In this sandbox,
  WeChat build triggers a macOS `system-configuration` panic and hangs; Sol verified outside the sandbox
  with `env CI=1 npm run build:weapp` that it exits 0. The latest reviewed head compiled in 5.32s. No
  dependency or build-config change was made to conceal the sandbox-only phenomenon.
- Sol's first implementation Review returned `CHANGES_REQUESTED` because history panel failures and the
  result-page save hint shared one state and could leak across surfaces. Terra split `historyError` from
  `historySaveError` and added a sensitive regression. Sol's second Review inspected the actual diff and
  independently reran root test, integration (56/0), lint, typecheck, the latest-head WeChat build and
  diff check; all passed. Result: `APPROVED — PR_PENDING`.
- I19 PR #69 matched reviewed head `ed8800f`, completed every latest-head GitHub `quality` step in 51
  seconds and squash merged as `b7c17ea`; #28 closed. M5 and the previously omitted M4 GitHub milestones
  are now closed.
- Two read-only I20 audits were assigned to map the reducer/service boundary and sensitive test seam.
  The architecture audit recommends one atomic Issue with a pure `trip-flow` module, one injected
  getAdvice adapter and minimal page wiring; no global library, visual rewrite or I21–I23 behavior.
- The first formal I20 contract Review returned `CHANGES_REQUESTED` for an incomplete RECOVER/recoverTo
  design and a dependency graph that omitted I18/I19. Sol removed generic recovery from I20, required
  future I23 async recovery to start with a new token, and corrected the graph to I17→I18→I19→I20.
  Second Review returned `APPROVED` with no remaining P0–P2 or human-confirm item.
- I20 planning PR #70 matched reviewed head `6ed5c67`, passed every latest-head GitHub quality step in
  48 seconds and squash merged as `7fc295f`. #29 is activated for Terra implementation on that exact base.
- I20 implementation recorded a genuine `test:trip-flow` RED because the frozen reducer module was
  absent. Its GREEN adds only the pure 10-state/token reducer, injected queryId-only getAdvice service,
  minimal page wiring and direct contract coverage; I05/I18 static page checks now point to that seam,
  rather than preserving `_requestGeneration`. A bounded P1 review fix removed the remaining page-level
  `showManualCoords` source, and made `location_failed`/local manual fallback carry their error through
  `ROUTE_TYPE_REQUIRED` into the existing `awaiting_route_type` state. Focused
  trip-flow/confirmation/response, history, integration (56/0), root test, lint (0 errors; 10 existing
  warnings), typecheck and diff check pass.
  Sol first returned `CHANGES_REQUESTED` for that remaining dual flow source. After Terra's bounded
  reducer-only fix, Sol independently re-read the actual diff and reran the focused contracts, private
  history, integration (56/0), root test, lint (0 errors; 10 existing warnings), typecheck and diff check;
  all pass. Sol also reran the WeChat build outside the sandbox, where it completed successfully.
  Second Review is `APPROVED — PR_PENDING`, with no remaining P0–P2 or human-confirm item and only
  latest-head GitHub `quality` outstanding.
- I20 PR #71 matched reviewed head `daa2f02`, completed latest-head `quality` in 51 seconds and squash
  merged as `9d70f7c`; #29 closed. The local main was then fast-forwarded over HTTPS after GitHub CLI's
  post-merge SSH refresh failed; the remote merge itself had already succeeded.
- Sol and an independent Terra XHigh performed the I21 dependency audit. The production handler still
  ignores `startTimeLocal/climbSupport`, TripContext still records a null start time, and the I05 legacy
  candidate has no `entityKind/capability/fixedDays`. A frontend-only slice would collect dead input;
  a backend-only slice would break the current client. TP-D034 therefore keeps I21 atomic after I13 and
  marks #30 `BLOCKED_BY_I13`; no business implementation has been assigned.
- A 2026-08-07 primary-source refresh rechecked all five required full variants and added a durable
  evidence appendix. It found useful current-management and partial-geometry facts, including
  Siguniang's partial Haizigou reopening, Yulong's current seasonal cableway service and a reliable
  secondary report of the 4506–4680 boardwalk segment. None supplies the complete same-variant
  itinerary, geometry, sampling points and current operating scope required by I07; all five data
  Issues therefore remain source-blocked and I13/I21 stay inactive.
- The source-refresh checkpoint passed an independent Terra XHigh document Review after one bounded
  correction round. Local lint (0 errors/10 existing warnings), typecheck, root test, integration
  (56/0), WeChat build and `git diff --check` all pass.
- User-provided GPX source recovery was reviewed by Sol and two independent Terra XHigh read-only
  audits. All five files are structurally usable tracks, but they represent different variants:
  Wugong reverse traverse, two-day Siguniang Second Peak, multi-terrace Wutai traverse, Gongga
  southwest slope and Blue Moon Valley/Yunshanping. Under the then-active TP-D037 contracts, none could
  populate those old exact pilot Variants. The derived, non-personalized evidence is in
  `docs/research/user-gpx-audit-2026-08-07.md`.
- At that checkpoint, human decision `A` retained all five then-approved exact pilot Variants. That
  interim decision was later superseded by TP-D039 below.
- A second high-trust recovery pass checked official pages, PDFs, maps/APIs and downloadable-track
  surfaces. It found no public GPX/KML, complete elevation profile or itinerary capable of completing
  any full Variant. The durable negative result and five exact request packets are in
  `docs/research/exact-route-source-recovery-2026-08-07.md`.
- Human approval TP-D039 supersedes TP-D037/TP-D038: official material now governs management facts,
  while a Sol-reviewed community GPX can independently provide the geometry of its actual route.
  PR #78 merged the replan as `1e601d9`. GitHub #17 is active with the full two-day Wugong contract;
  #18/#20/#21 now name their actual GPX routes and remain blocked only until route-specific contracts;
  #19/#51 closed as not planned; #22/#30 reference #77 rather than old I10b. Wutai stays blocked and
  #77 owns the missing fifth plannable GPX.
- I08 implementation recorded a genuine `test:route-data` RED after registering the new route-specific
  test: the absent Wugong fragment produced `MODULE_NOT_FOUND`. The minimum GREEN adds only the plain
  reviewed-GPX fragment, its catalog assertions and minimal runner registration. The focused route-data and
  route-domain contracts, root test, integration (56/0), lint (0 errors; 10 existing warnings) and
  typecheck pass. The sandbox WeChat build hit the known macOS `system-configuration` NULL-object panic;
  host-environment rerun is required before final validation can be claimed.

The baseline checks were rerun during M1 verification. Local Markdown links and `git diff --check` also pass.

## Agent assignments

- Sol XHigh: planning documents, Goal, GitHub orchestration and independent review.
- Luna XHigh: preferred executor, unavailable in this environment.
- Sol XHigh: owns the community-GPX replan, route contracts, task activation and independent Review.
- Terra XHigh: assigned I08/#17 on `codex/i08-wugong-community-gpx`; no I21 assignment while I13 is blocked.
- Terra XHigh source agents: completed official-source audits, GPX Review, the external request packet
  and a read-only replacement-Variant mapping review.

## Open work

1. Re-run I08/#17 WeChat build on the host, then independently Review the focused implementation on the
   merged `1e601d9` base.
2. Freeze and implement I09/I11/I12 as focused route-data PRs after I08.
3. Obtain one additional non-blocked GPX for #77; all five full Variants still gate I13.

## Blockers and risks

- Root toolchain, lockfiles, offline integration, CI and branch protection are merged and verified.
- Node 24 随附的 npm 11 与 `@nutui/nutui-react-taro@3.0.20` 的不可解析可选依赖
  存在锁文件校验不兼容：npm 11 生成锁时省略该包、`npm ci` 又报缺失。I01 已按
  GitHub #10 的控制端决策固定 npm 10.9.2，并以 `engine-strict` 拒绝错误 npm。
- Four supplied GPX files are suitable for their actual route identities, not the superseded exact
  pilots. Each implementation must use the reviewed derivation method and must not retain old names,
  days or geometry.
- The fifth plannable Variant is missing. #77 remains blocked until another non-restricted GPX is
  supplied and reviewed; the Wutai summit track cannot fill it.
- GPX cannot establish `open`. The four static full records use `operationalStatus='unknown'` unless
  a precise official management fact is found; unknown is disclosed and does not mean open.
- I10a remains deliberately narrow: broader restriction scope still requires the missing official
  announcement body or poster.
- TP-D028 resolved the I15 accumulation ambiguity as activity-window totals. Full rolling-24h or
  natural-day accumulation would require a future weather-data contract and must not be implied now.
- TP-D029 resolves I16's sunset evidence boundary as the earliest value across each route-day's trusted
  I14 samples. If any necessary sunset cannot be calculated, the result is unavailable unless a known
  hard no-go independently applies.
- I21 cannot be split into a frontend-only or backend-only merge while I13 is missing: either direction
  creates a dead input or protocol-incompatible main.
- I13 cannot infer full RouteVariants from the existing legacy candidate fields. All five required
  pilots need complete A/B route evidence before the planned I13 production resolver is activated.
- Deployment and real-device validation remain outside the Goal.

## Forbidden actions while I21 is blocked

- UI, cloud function, reducer, service or TripContext changes for I21
- Temporary fifth variants, cross-route fields, unreviewed GPX, nearby-peak geometry or treating
  absence of an official notice as `open`
- I22/I23 work that depends on the absent trusted I21 result

## Next action

Terra XHigh completes I08/#17 host-build evidence and returns a draft PR plus full RED/GREEN and quality
evidence. Sol XHigh then reviews the actual diff and latest-head CI before any merge. Keep
#22/#30 blocked until #77 and all five full Variant PRs are complete.
