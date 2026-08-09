# 当前状态 — TP-COMMUNITY-001

- Updated: `2026-08-09`
- Governance: `TP-GOV-2.0.0`
- Previous Goals: `TP-BETA-001 / COMPLETE — CODE_READY`; `TP-STAGING-001 / COMPLETE — CONDITIONAL_GO`
- Current Goal: `TP-COMMUNITY-001 / ACTIVE — C04 IMPLEMENTATION_ACTIVE`
- Active task: `#121 / IMPLEMENTATION`
- Branch/base: `codex/121-track-owner-ui` from `main@a809f54`
- Environment boundary: existing `cloud1-d0gtzgqzh9c128aaf` is the only staging candidate; production is not configured
- Staging verdict: `CONDITIONAL_GO` for a bounded four-route cohort; not production
- Current work: C04 private owner track submission, status, revision and cancellation UX

## Current community-track checkpoint

- Planning PR #117 passed latest-head quality and two independent exact-head Reviews, then squash merged as `988cf8b`.
- C01 PR #124 passed latest-head quality and two independent exact-head Reviews, then squash merged as `b3e2cd0`;
  #118 is closed. C02/#119 then became the only active child; #120–#123 were dependency-blocked at that checkpoint.
- C02 PR #125 passed latest-head GitHub `quality` and two independent exact-head Reviews, then squash merged as
  `75fcd92`; #119 is closed. C03 PR #126 then passed latest-head GitHub `quality`, two exact-head independent Reviews
  and squash merged as `a809f54`; #120 is closed. C04/#121 is now active; #122–#123 remain dependency-blocked.
- #114 closed after approved PR #116 merged as `b1bc994`; key rotation/package validity are human-confirmed.
- Human approved server-only `TRACK_REVIEW_ADMIN_OPENIDS`; no value is requested or stored in Git/GitHub.
- Human approved maximum retention of 30 days for raw upload/review objects and 180 days for the separate
  de-identified reviewed-evidence record; GitHub CLI authentication is restored.
- #115 remains open as the parent Goal. C01/#118, C02/#119 and C03/#120 are complete; C04/#121 is the only active child.
- `TRACK-SUBMISSION-1` freezes GPX/KML rights, limits, private storage, owner/admin APIs, status machine, DTOs,
  cleanup-pending behavior, errors and no-catalog-publication boundary.
- Planned serial work is C01 parser → C02 owner API → C03 admin API → C04 user UX → C05 admin UX → C06 acceptance
  and human staging deployment.
- The first staging cohort still excludes Gongga; community evidence cannot change operational status.
- Contract Review-fix now closes upload overwrite/HEAD TOCTOU, exact fileID binding, `gx:Track`, processing lease,
  CAS/revision races, DTO/error/action gaps and the 30/180-day retention lifecycle. Full post-retention planning gates
  pass and live #115 is synchronized; both latest-diff independent Reviews are approved.

## C03 implementation checkpoint — 2026-08-09

- TDD RED was recorded after registering `test:track-admin` and `test:track-retention`: both focused commands exited
  1 with the real `MODULE_NOT_FOUND` for their not-yet-created contract runners.
- GREEN is limited to the exact C03 allowlist. `trackSubmission` now routes server-authenticated
  `admin_list/admin_get/admin_review`, parses the server-only `TRACK_REVIEW_ADMIN_OPENIDS` allowlist fail-closed,
  projects exact admin DTOs/actions/cursors, issues raw links only from the immutable review object with max age 300
  seconds, and uses status/version CAS plus first-write-wins review attempts. Approval writes a separate
  `track_review_evidence` record with a random internal key and only keyless de-identified display fields on the
  submission/DTO; it never mutates route/catalog/status/tier facts.
- The internal retention seam is timer-only (`TRIGGER_SRC='timer'` plus empty server OpenID), processes at most 20
  due submission/evidence records per invocation across cursor pages, marks raw targets `deletion_pending` before deletion, preserves
  approved evidence through raw expiry, removes identity records at the logical deadline and retries duplicate or
  failed delivery without extending either deadline. Logical expiry hides owner/admin projections before physical
  cleanup.
- A read-only Sol reproduction found one merged C02 P2 needed by the retention contract: a fresh revision could use an
  expired `changes_requested` parent and extend retention. The controller expanded #120 only to `owner-service.js`
  and `track-owner-contract-test.js` for this exact correction; no public contract or period changes. TDD RED was
  reproduced first (`test:track-owner` returned `upload_reservation` where the new expired/equal-now cases required
  `submission_not_found`); GREEN now samples one server clock value, rejects missing/expired parents before mutation,
  and carries `recordExpiresAt > now` through memory and CloudBase revision CAS.
- Independent C03 Review found a raw-access P1: the DTO clamped a near-deadline expiry but the storage adapter still
  requested 300 seconds from the SDK. The controller adds only `storage-adapter.js` for exact remaining-whole-seconds
  pass-through and requires mutation-sensitive admin/retention handler/CloudBase/CAS/action evidence before Review
  can resume.
- The same Review found that transactional `where(...).update()` is not a proven atomic primitive in the pinned SDK,
  and that memory approval can overwrite a cancel that wins during an awaited evidence add. Review-fix therefore
  requires transaction-bound document reads/condition checks/updates with staged rollback, plus a post-await memory
  CAS recheck that removes orphan evidence. No collection schema, mode, DTO or deployment authority changes.
- Focused C03 admin/retention, C02 owner, C01 parser, root test, offline integration `55/0`, lint (`0 errors / 9
  existing warnings`), typecheck, fixture-free `CI=1 build:weapp` and `git diff --check` all pass under Corepack
  npm `10.9.2`. No UI, deployment, real CloudBase mutation, new dependency, collection/index/rule/env change or
  catalog write was made; timer/permission/index/runtime verification remains the human-controlled C06 boundary.
- Status is `REVIEW_FIX_ACTIVE`; the same exact `luna-worker` owns only the bounded fixes and focused RED/GREEN
  evidence before returning `READY_FOR_CONTROLLER_REVIEW`. Sol XHigh owns independent Review, CI interpretation,
  merge and any PR/status updates. Runtime model visibility remains `UNVERIFIED_RUNTIME_MODEL` in this session;
  configuration is the controller-recorded exact `luna-worker` (`gpt-5.6-luna/max`).

## C03 Review-fix checkpoint — 2026-08-09

- Review-fix GREEN is complete within the controller-approved allowlist. Raw detail now requests
  `min(300, floor((rawExpiresAt-now)/1000))` from the SDK, rejects sub-second residual lifetime before any URL call,
  and validates the exact returned file, status, message, integer max age and URL. Every CloudBase multi-record
  transition uses transaction-bound document reads, frozen-condition checks and document updates; staged rollback
  and direct/query bypass probes are covered.
- Memory approval rechecks the winning status/version after the awaited evidence add and removes an orphan when a
  cancel or competing review wins. The non-transactional approval fallback is fail-closed. Admin action/cursor/order/
  limit boundaries, first-write replay without deadline extension, timer-only dispatch, and CloudBase retention /
  evidence due-query seams are contract-tested.
- RED/GREEN evidence: storage TTL, near-deadline raw access, transaction query-update bypass, approval/cancel barrier,
  and non-transactional fallback each failed before the corresponding fix and pass after it. Focused owner/parser/
  admin/retention tests, root `npm test`, offline integration `55/0`, typecheck, `CI=1 build:weapp`, and
  `git diff --check` pass under Corepack npm `10.9.2`; lint passes with `0 errors / 9 pre-existing warnings`.
- A production-shape owner probe then reproduced a valid unexpired revision being rejected when the pinned SDK
  represented `db.command.gt(date)` as `{operator:'gt', operands:[date]}`. The repository now keeps SDK query objects
  out of local frozen-condition validation and applies the sampled expiry check manually; the new owner RED/GREEN
  regression passes with the real command shape.
- No commit, push, merge, deployment, real CloudBase mutation, new dependency, collection/index/rule/env/timer
  mutation, UI, catalog write or public cleanup mode was made. Runtime model visibility remains
  `UNVERIFIED_RUNTIME_MODEL`; controller Review, CI interpretation, merge and status decisions remain with Sol XHigh.
- Executor status: `READY_FOR_CONTROLLER_REVIEW`.
- Round-1 independent Review confirms all C03 P1 findings are closed, then records two remaining P2 evidence gaps:
  30/180 expiry tests used implementation-derived dates, and Cloud cursor/due/privacy-key assertions did not reject
  several bounded mutations. Round 2 is tests plus the existing `RAW_DAYS` constant reuse only; it adds no public or
  persistent behavior and must return both exact-diff Reviews to `APPROVED` before publication.
- C03 ultimately passed two exact-head independent Reviews and latest-head GitHub `quality`; PR #126 squash merged as
  `a809f54` and #120 closed. This section is retained as implementation history, not current work.

## C03 Review-fix round-2 checkpoint — 2026-08-09

- Finalize now reuses the existing `RAW_DAYS` constant. Test-owned millisecond assertions lock 30-day review
  snapshot → raw/record expiry and 180-day approval → submission/evidence expiry; replay keeps both deadlines
  unchanged. Retention tests cover one millisecond before and exactly at both deletion edges.
- A table-driven retention matrix covers expired `awaiting_upload`, `processing` and `changes_requested` rows,
  server-derived upload IDs, empty logical admin projections, pending-before-delete and duplicate-delivery repair.
  Evidence records, nested `ApprovedEvidence`, admin list/detail and submission projections now assert literal exact
  keys and reject identity/raw/provenance/file/evidence-key linkage.
- Cloud admin list tests deep-assert status + expiry base, strict `updatedAt`/`_id` descending cursor, and
  `limit+1`; Cloud submission retention asserts all four due branches and strict ascending tuple; Cloud evidence
  retention asserts the exact expiry/id cursor, order and `limit+1`.
- The final P2 evidence guard now inspects the real post-approval identity-bearing submission record: neither
  `serverEvidenceKey` nor `evidenceKey` may exist at any depth, and its serialized content may not contain the
  random evidence record ID. Adding `patch.serverEvidenceKey=evidenceRecord._id` was a focused RED and was restored.
- Mutation RED evidence was run and restored immediately for 29/31 raw days, 179/181 evidence days, each removed
  retention due branch, broad fixed limit, reversed admin cursor comparison and added evidence provenance. Focused
  owner/admin/retention, root `npm test`, integration `55/0`, lint (`0 errors / 9 existing warnings`), typecheck,
  `CI=1 build:weapp`, syntax, `git diff --check`, allowlist and secret audits pass.
- No commit, push, merge, deployment, real CloudBase mutation, new dependency, schema/public contract, UI, catalog
  write or timer/permission/index/env mutation was made. Executor status: `READY_FOR_CONTROLLER_REVIEW`; runtime
  model visibility remains `UNVERIFIED_RUNTIME_MODEL`; independent Review and merge decisions remain controller-owned.

## C01 implementation checkpoint — 2026-08-09

- The required pre-implementation RED was recorded on the clean activation head: `corepack npm@10.9.2 run
  test:track-parser` failed because the script was absent, and the direct script invocation failed with
  `MODULE_NOT_FOUND`.
- The bounded GREEN adds only the new `trackSubmission` package with exact `saxes@6.0.0`, a namespace-aware pure
  GPX/KML parser, a de-identified reviewed-geometry projector and the focused contract runner. It enforces the
  frozen UTF-8/DTD/ENTITY, depth, point/segment, coordinate/elevation, RFC-3339 pairing, Haversine, rounding and
  500-point deterministic preview rules; no handler, storage, database, network, catalog or UI path is wired.
- Focused C01, root test, offline integration `55/0`, lint (`0 errors / 9 existing warnings`), typecheck, host
  `CI=1 build:weapp` and `git diff --check` pass under the repository-approved Corepack npm `10.9.2`. The lockfile
  was generated with npm `10.9.2` using an isolated cache; the Corepack wrapper reported its local Node runtime
  separately and no npm 11 lockfile was generated.
- Current implementation state is `READY_FOR_CONTROLLER_REVIEW`: draft PR #124 is published and its latest-head
  GitHub `quality` check passed. Exact-head Review and Sol's mergeability decision remain; no deployment or merge
  has occurred.

## C01 Review-fix checkpoint — 2026-08-09

- Sol's round-1 `CHANGES_REQUESTED` is addressed within the original allowlist: bootstrap now installs the parser
  function, the subpackage does not freeze a CloudBase runtime engine, XML namespace/path checks are strict, and
  LineString/gx:coord point accounting is bounded at 50,001 before the parser retains another point.
- Independent focused assertions now lock the literal `ReviewedGeometry` schema, known Haversine radius and
  non-connected segment distance, coordinate/elevation/bounds rounding and coverage, the full floor-index preview
  formula and the 200-segment endpoint budget. Wrong-namespace `when` and GPX tracks outside the direct path are
  behavior-tested.
- The nested parser `node_modules` was moved aside and a clean `corepack npm@10.9.2 run bootstrap` completed
  successfully. The authoritative sequential clean-install command
  `test -f cloudfunctions/trackSubmission/node_modules/saxes/saxes.js && corepack npm@10.9.2 ci --prefix
  cloudfunctions/trackSubmission && corepack npm@10.9.2 run test:track-parser` passed. The parser lock was regenerated
  by npm `10.9.2` with an isolated cache and official `registry.npmjs.org` tarball URLs.
- Mutation checks are recorded: changing the Haversine radius, replacing sampling `floor` with `ceil`, or removing
  the projected `distanceM` field each makes `test:track-parser` fail; all three mutations were restored.
- Review-fix state is `READY_FOR_CONTROLLER_REVIEW`; the controller committed and published draft PR #124, whose
  latest-head GitHub `quality` check passed. Exact-head Review and mergeability remain controller-owned; no
  deployment occurred.

## C01 completion and C02 activation checkpoint — 2026-08-09

- Sol recorded exact-head `APPROVED` after two independent Reviews returned no P0–P3 findings. PR #124 squash merged
  remotely as `b3e2cd0`; only then was #118 closed and #119's dependency-blocked label removed.
- C02 uses branch `codex/119-track-owner-lifecycle` from exact merged `main@b3e2cd0`. Its controller activation is
  docs-only and changes no handler, storage, database, collection, permission, environment or deployment state.
- C02 is limited to owner modes `begin/finalize/list_mine/get_mine/cancel`, server OpenID, exact reservation/fileID
  binding, bounded server read, immutable review snapshot, CAS/lease/revision locks and exact owner DTOs. Admin modes,
  evidence retention, frontend and real CloudBase mutation remain later serial Issues.
- Implementation routing is the exact custom Agent `luna-worker`; configuration is verified as
  `gpt-5.6-luna/max`, while runtime model evidence must be recorded separately. Terra is not authorized as fallback.

## C02 implementation checkpoint — 2026-08-09

- TDD RED was recorded immediately after activation by registering `test:track-owner`: the focused command failed
  with `MODULE_NOT_FOUND` for the not-yet-created contract runner. No owner implementation existed at that point.
- GREEN is limited to the exact C02 allowlist. `trackSubmission/index.js` authenticates only server `OPENID` and
  exposes `begin/finalize/list_mine/get_mine/cancel`; owner-service/lifecycle/repository/response seams implement
  exact reservation, owner retry/race isolation, revision lock, CAS/version and five-minute processing lease.
- The storage adapter validates trimmed server-only `TRACK_STORAGE_FILEID_HOST` and exact `cloud:` host/path binding,
  performs optional HEAD plus bounded streaming GET (10 MiB actual-byte authority), uploads the same Buffer to the
  service review path, parses that Buffer, and keeps creator cleanup truthfully deletion-pending when needed.
- Focused behavior coverage includes forged identity/zero side effects, begin race/idempotency, revision lock,
  malformed binding/config, HEAD/GET length/stream limits, immutable upload/parse bytes, expiry, cursor seek/order,
  terminal cleanup retry, parser failure and CAS/lease paths. No admin mode, evidence store, UI, catalog mutation,
  collection/index/rule/env change or deployment is wired.
- Exact `wx-server-sdk@4.0.2` was added while retaining `saxes@6.0.0`; the lock was generated with Corepack npm
  `10.9.2`. Final local owner/parser/root/integration/lint/typecheck/CI host-build/diff checks pass (lint retains
  nine pre-existing warnings and no new errors). Executor status is `READY_FOR_CONTROLLER_REVIEW`; draft PR creation
  is focused on `Refs #119`, and approval/merge remain controller-owned.

## C02 review-fix round 1 checkpoint — 2026-08-09

- Sol's bounded TP-D055 correction is implemented only in the original C02 allowlist. The stable review path remains
  unchanged; code/tests export and assert the fixed-path timeout invariant (`240s < 300s` lease) without deployment
  or claiming C06 runtime verification.
- Awaiting-upload cancellation now derives the trusted creator object from server host plus reserved cloudPath,
  honors per-item CloudBase delete status/errMsg, and persists deletion-pending truthfully. Parser/reset/finalize/
  cancel writes are CAS-checked; cleanup never runs before its terminal CAS wins, and cleanup persistence failures
  return `store_unavailable` rather than a false Mine DTO with unchanged version.
- Revision child terminal transition plus parent unlock is repository-transactional with replay repair; duplicate
  begin races reread the first reservation, retries lookup the owner-scoped attempt before changed-field/config
  validation, and list queries push owner/expiry/tuple seek with limit+1 into both repository seams.
- Behavior coverage now includes the server-OpenID handler seam, CloudBase query/CAS/transaction stubs, timeout/lease
  invariant, per-item delete failures, cleanup CAS loss, revision transaction loss/replay, retry-before-validation,
  and server-side pagination. Coordinate-bearing fields remain limited to the exact `TrackSummary` projection.
- Follow-up SDK-shape correction validates `wx-server-sdk@4.0.2` delete items as `{fileID,status,errMsg}` against the
  requested file ID; only status `0` and idempotent `-503003` (storage file not exists) succeed.
- Cleanup recovery now atomically marks planned terminal/snapshot targets `deletion_pending` before deletion, advances
  only successful targets to `deleted`, and replays only pending targets without reparsing or touching immutable facts;
  fully clean terminal replay has no storage/write/version side effects.

## Completed staging checkpoint

- AppID/CloudBase binding, both deployed functions, `trip_contexts`, `history`, openid-scoped history and one real
  full-route weather/verdict/queryId/advice journey are verified.
- Recent observed `getAdvice` and `history` log rows are successful. Both functions are ordinary Node.js 16.13
  functions; `getAdvice` uses 256 MB and a 60-second timeout.
- Storage is creator/admin private. This supports a future private upload boundary but does not yet implement a
  submission or review workflow.
- Plaintext environment-variable values were exposed by the console UI during authorized inspection. Values were not
  copied into repository or GitHub content. The human confirmed both keys were rotated; a fresh post-rotation Wugong
  full-route/weather/v2-queryId/advice flow succeeded at approximately 12:22–12:24 Asia/Shanghai.
- Current official-source refresh does not justify calling any full exact Variant open. The initial allowlist is
  Wugong, Siguniang, Blue Moon Valley–Yunshanping and Dangling with visible `unknown` status and same-day manual
  confirmation. Gongga is excluded; Wutai remains blocked.
- Human confirmed the current CloudBase package covers the planned closed-beta period and approved server-only
  `TRACK_REVIEW_ADMIN_OPENIDS` for the next community-track Goal. No OpenID or secret is stored in Git.
- Successful v2 requests were observed more than 30 minutes apart. Post-rotation AMap fallback remains
  `UNVERIFIED_RUNTIME_TOOL` and is not required by the initial cohort.
- Root `npm test` is green. Current official npm audit remains root `0`, Taro `46`, and each Cloud Function `6`
  transitive advisories; no exploit is demonstrated, but production readiness is not claimed.
- Authoritative evidence and remaining gates are in `docs/staging-deployment-validation.md`.

## Historical TP-BETA-001 checkpoints

- Completion source: docs-only PR #111 from `codex/34-goal-final-review`
- Review baseline: `main@1bba5f9`; completion state entered `main` through PR #111
- I24c completion / I25 activation checkpoint (2026-08-09): PR #110 exact head `bfb9f43` passed latest-head
  GitHub `quality`; two independent final Reviews returned `APPROVED` with P0–P3 none. Sol squash merged it as
  `1bba5f9`, then closed #107 and parent #33. The durable checklist truthfully retains DevTools rows as
  `UNVERIFIED_RUNTIME_TOOL`; automated and fixture-free gates are green. I25/#34 is now the only active task and is
  owned by Sol XHigh as a Goal-wide Review, not an implementation-Agent self-approval.
- I25 audit checkpoint (2026-08-09): product/frontend/evidence, architecture/data/privacy and GitHub audits found no
  undisclosed Goal P0/P1. The repeated-prepare probe, five-pilot acceptance, root tests, integration `55/0`, lint
  (`0 errors / 9 existing warnings`), typecheck, fixture-free WeChat build and diff check pass on the report branch.
  M3/M6 stale GitHub milestones were closed; M7 remains open only for #34. The completion report discloses
  `UNVERIFIED_RUNTIME_TOOL` rows, transitive dependency advisories and Goal-external #83/#84 instead of expanding
  I25 into implementation, dependency upgrades or deployment.
- I25 final Review checkpoint (2026-08-09): PR #111 latest-head quality passed. Product/frontend/evidence and
  architecture/data/privacy exact-head Reviews both returned `APPROVED` with P0–P3 none after the single lifecycle
  metadata finding was closed. This final status commit changes no behavior; its approved merge makes the report,
  M7 and TP-BETA-001 completion state effective, after which #34 and M7 are closed.
- I24b completion / I24c activation checkpoint (2026-08-09): PR #109 review-fix head `59f7a18` and controller
  status head `28db822` passed latest-head GitHub `quality`; two independent actual-diff Reviews returned
  `APPROVED` with P0–P3 none. Sol squash merged the PR as `f311d1b` and closed #106. I24c/#107 is now the only
  active child. Its permanent deliverable is documentation and representative evidence only; authorized fixture
  hooks are local, reversible and must be absent from the final diff and fixture-free rebuild.
- I24c executor evidence checkpoint (2026-08-09): `npm run test:beta-acceptance`, `npm test`, offline integration
  `55/0`, lint (`0 errors / 9 existing warnings`), typecheck, host `build:weapp` and `git diff --check` all pass.
  The Computer Use skill was read before one bounded DevTools discovery attempt and one required app-state/list-apps
  retry; the local tool reported `The Mac is locked and automatic unlock could not unlock it. Ask the user to unlock
  the Mac manually before continuing.` No fixture was injected, no screenshot was captured, and all DevTools rows are
  recorded as `UNVERIFIED_RUNTIME_TOOL` in `docs/beta-acceptance-checklist.md`. Residue scan is clean; final changes
  are docs/evidence only.
- I24c Sol Review checkpoint (2026-08-09): PR #110 exact head `b3ff65e` passed latest-head quality and its
  docs/evidence-only scope, residue proof and truthful DevTools blocker were independently confirmed. Two Reviews
  returned `CHANGES_REQUESTED` for evidence precision only: persist the A11 repeated-prepare/new-queryId probe as a
  directly runnable artifact or exact command, narrow A6 so real cancel/edit observation remains R2
  `UNVERIFIED_RUNTIME_TOOL`, and synchronize all authority sources to the review handoff state. No production defect,
  fixture residue or human product decision was found.
- I24c Review-fix completion checkpoint (2026-08-09): the durable
  `node docs/evidence/i24/repeated-prepare-probe.js` passed, asserting two `base` responses, distinct server query IDs
  and unchanged trusted route identity from the existing public offline fixture. A6 now only claims candidate/
  confirmation, RESET/token isolation and pre-confirm side effects; real cancel-followed-by-edit remains R2
  `UNVERIFIED_RUNTIME_TOOL`. The complete required gate matrix passed. Status is `READY_FOR_CONTROLLER_REVIEW`; PR
  #110's live latest-head `quality` check is the CI fact source. I24c/#107, #33, M7 and TP-BETA-001 remain open pending
  Sol approval/merge.
- Historical I24a completion / I24b activation checkpoint (2026-08-09): PR #108 exact latest head passed GitHub `quality`;
  backend/contract and frontend/history independent Reviews both returned `APPROVED` with P0–P3 none. Sol squash
  merged it as `1a2f485` and closed #105. I24b/#106 is now the only active child; I24c/#107 remains blocked.
- Historical I24b Review-fix checkpoint (2026-08-09): controller baseline is `4808e53`; the bounded round-1 fix is limited to the
  six-file I24b allowlist. It adds public name/alias prepare plus legal permanent-ID confirmation for every pilot,
  exact seven-field route-source DTO values, stage/window/sample/hour/request alignment, insufficient retryable and
  zero-partial-window semantics, deterministic advice preservation across all AI outcomes, and mutation RED evidence
  for each frozen seam. No production behavior changed; the executor remains responsible only for the acceptance
  contract and evidence.
- I24a implementation checkpoint (2026-08-09): TDD RED for missing `advice-context.js` was recorded before the
  adapter existed. The current implementation composes exact `beta_base_v2` snapshots with
  `deterministicSafety`, removes all thirteen top-level compatibility aliases, and derives prompt, safety and
  private history facts from structured fields only. TripContext now persists `trip_context_v2`; a stored v1
  context is non-retryable `query_context_unavailable` with zero LLM calls and no version detail. Focused
  advice-context, core-input, response, TripContext, safety, route, unit, trip-flow, result-page and offline
  integration contracts are green; integration is `55/0` because the retired sun/advice compatibility assertion
  was replaced by a mutation-sensitive assertion that advice has no weather/sunEvents/photoTiming/microclimate.
  Full lint/typecheck/build/diff evidence is recorded in `docs/i24a-structured-adapter-verification.md`.
- I24b implementation checkpoint (2026-08-09): the required focused RED was recorded before the fixture existed
  (`npm run test:beta-acceptance` → `MODULE_NOT_FOUND`, exit 1). The additive acceptance contract now passes its
  five exact full pilot rows independently, including source/status, multi-sample hourly windows, mutation-sensitive
  ID/fixedDays/type/capability checks, server candidate confirmation, place-only/manual/AMap, official blocked,
  insufficient-weather hard no-go, queryId-only AI outcomes, private history idempotency and I23 recovery seams.
  `npm test`, integration `55/0`, lint `0 errors / 9 existing warnings`, typecheck, host WeChat build and
  `git diff --check` pass. No production defect was exposed. Evidence is recorded in
  `docs/i24b-beta-acceptance-verification.md`; draft PR #109 exists and its live latest-head check is the CI fact source.
- I24b Sol Review checkpoint (2026-08-09): PR #109 head `91fec62` passed latest-head quality, but two independent
  actual-test Reviews returned `CHANGES_REQUESTED` for acceptance sensitivity only. Production remains unchanged and
  no product/human decision is required. Round 1 is limited to per-pilot legal confirm, exact seven-field source DTO,
  stage-to-window sample/hour/request alignment, insufficient retry semantics, deterministic advice preservation,
  and mutation-sensitive evidence/status updates inside the existing six-file allowlist.
- I24b review-fix implementation checkpoint (2026-08-09): from controller baseline `4808e53`, the focused acceptance
  command is GREEN after adding name/alias/confirm identity coverage, exact route-source DTO checks, per-day weather
  alignment and request-count assertions, insufficient retryable/no-partial semantics, and deterministic advice
  preservation/forged-fact rejection. Focused mutation probes intentionally throw for missing/replaced samples,
  empty/out-of-window hours, request mismatch and lost deterministic gear/risk/note facts. Full command matrix,
  additive commit and controller handoff are now ready. `npm test`, integration `55/0`, lint (0 errors / 9 existing
  warnings), typecheck, host WeChat build and `git diff --check` pass. No production defect or contract ambiguity was
  exposed. Additive commit `59f7a18` is pushed to draft PR #109 and latest-head quality passed; Sol XHigh must finish
  independent Review and decide mergeability.
- I21 planning PR: `#90` — merged as `c817bbb`; latest-head quality passed in 48 seconds
- I21 implementation PR: `#93` — squash merged as `be24b07`; GitHub #30 closed
- I22 parent/children: `#31` / `#94` trusted provenance / `#95` structured result page — all closed
- I22 planning PR: `#96` — squash merged as `ac4ba9e`; latest-head quality and Sol Review passed
- I22a implementation PR: `#97` — squash merged as `6e12f25`; GitHub #94 closed
- I22b implementation PR: `#98` — squash merged as `852e86d`; GitHub #95 and parent #31 closed
- Historical I24c assignment: exact custom Agent `luna-worker` owned bounded #107; it is complete and Terra fallback
  remains unauthorized.
- I23 planning PR: `#101` — latest-head quality and independent actual-diff Review passed; squash merged as `a12ab46`
- I23a PR: `#102` — latest-head quality and independent Sol re-review passed; squash merged as `107fab4`; #99 closed
- I23b PR: `#103` — latest-head quality and two independent Sol Reviews passed; squash merged as `097c921`; #100 and parent #32 closed
- I24 planning PR: `#104` — latest-head quality and two independent Reviews passed; squash merged as `6869a7b`
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
- I21 dependency checkpoint PR: `#72` — merged as `bfd9394`; at that checkpoint #22/#30 were blocked
- I13 planning PR: `#88` — merged as `5496956`
- I13 implementation PR: `#89` — merged as `c5d7d7c`; GitHub #22 closed; M3 complete
- CI date-fixture PR: `#92` — merged as `8387554`; GitHub #91 closed; latest-head quality passed
- I21 planning PR: `#90` — merged as `c817bbb`; GitHub #30 activated for implementation
- I22 contract branch: `codex/i22-result-page-contract` from `be24b07`; pure planning is approved for PR
- M3 source refresh PR: `#73` — merged as `31eab6d`; latest-head quality passed
- User GPX audit PR: `#74` — merged as `97c6728`; latest-head quality passed
- Exact-pilot retention PR: `#75` — merged as `62ba8c5`; latest-head quality passed
- External evidence checkpoint PR: `#76` — merged as `0461874`; latest-head quality passed
- Community-GPX replan PR: `#78` — squash merged as `1e601d9`; latest-head GitHub `quality` passed
- I08 implementation PR: `#79` — squash merged as `adfa0d8`; GitHub #17 closed; latest-head
  GitHub `quality` passed
- I09 implementation PR: `#80` — squash merged as `1e7fa2d`; GitHub #18 closed; latest-head
  GitHub `quality` passed
- I11 implementation PR: `#81` — squash merged as `4a9577f`; GitHub #20 closed; latest-head
  GitHub `quality` passed
- I12 implementation PR: `#82` — squash merged as `25750df`; GitHub #21 closed; latest-head
  GitHub `quality` passed
- I10c intake checkpoint PR #85 documented the prior wait for one new GPX; its input/review contract
  passed independent Sol XHigh Review after two documentation clarifications. Root test, integration
  (56/0), lint (0 errors; 10 existing warnings), typecheck, host WeChat build and diff check passed.
- I10c received a user-owned KML 2.2 `gx:Track`. Two independent read-only audits accepted it without
  conversion: 3,326 complete coordinate/elevation/time tuples, no route-breaking discontinuity,
  `19.067km / +1009.4m / -955.8m / 12.18h`, 4341m track high and two WGS84 weather samples.
  Route identity is `党岭村—葫芦海—卓雍措一日往返`; exact current management status remains
  `unknown`. The implementation adds only the additive internal `reviewed_track` enum, one
  de-identified static fragment and exact route-domain/route-data assertions; it stores no raw KML,
  personal timestamps, full point sequence or production parser.
- I10c recorded two real REDs: the old enum rejected a valid `reviewed_track` source, then the registered
  route-data require returned `MODULE_NOT_FOUND` before the fragment existed. The minimum GREEN preserves
  `reviewed_gpx`, restores I12's established 11-Source fragment view and fixes the final aggregate at
  `14 Sources / 175 Places / 6 Routes / 6 Variants / 5 full / 1 blocked`. Final validation passes
  route-domain, route-data, root test, integration `56/0`, lint `0 errors / 10 existing warnings`,
  typecheck, host WeChat build and `git diff --check`; it is `READY_FOR_CONTROLLER_REVIEW`.
- Sol inspected the actual seven-file implementation diff and independently reran route-domain,
  route-data, root test, integration `56/0`, lint `0 errors / 10 existing warnings`, typecheck,
  `git diff --check` and host WeChat build; all passed. A second independent Sol then re-read code,
  tests and live #77 and also returned `APPROVED`, with no P0–P3 finding. At that pre-merge checkpoint,
  I10c was `PR_PENDING` and still required latest-head GitHub `quality`.
- I10c independent contract re-review inspected the latest local diff and live GitHub #77 after four
  synchronization fixes. Result: `APPROVED`, with no P0–P3 finding. The reviewed-track enum, ordered
  supports, stable IDs, 14/175/6/6 aggregate and privacy/unknown boundaries are ready for the planning PR.
- I10c planning PR #86 matched approved contract head `9505b5e`, passed latest-head GitHub quality in
  49 seconds and squash merged as `3983102`. The implementation branch was created from that exact main;
  no business-code edit preceded the Terra handoff.
- I10c implementation PR #87 passed main-controller and second independent Sol XHigh Review with no
  P0–P3 finding, passed latest-head GitHub `quality` in 50 seconds, squash merged as `4c17f45` and closed
  GitHub #77. The production data aggregate is now `14 Sources / 175 Places / 6 Routes / 6 Variants /
  5 full / 1 blocked`.
- Two independent I13 read-only audits confirmed that the existing handler still uses I05 four-field
  candidates, single-point daily weather and a place-only TripContext projection. TP-D044 therefore
  freezes I13 as a production-loadable static catalog plus pure permanent-ID resolver; I21 remains the
  atomic public handler/UI/hourly-weather/verdict cutover.
- Independent Sol XHigh contract Review first requested three synchronization/edge clarifications: live
  #22 export names, exact-stage sorting/blocked collisions, and the stale product checkpoint. Sol fixed all
  three, resynchronized #22, and the focused re-review returned `APPROVED` with no P0–P3 finding.
- Planning validation passes root `npm test`, integration `56/0`, lint `0 errors / 10 existing warnings`,
  typecheck, host WeChat build and `git diff --check`. No business code changed on the planning branch.
- I13 planning PR #88 matched approved contract head `c87e891`, passed latest-head GitHub `quality` in
  3m14s (all substantive steps passed; runner cleanup completed), and squash merged as `5496956`.
  GitHub #22 is active without a blocked label; the implementation branch was created from that exact main.
- I13 implementation recorded the required real RED: the new `test:route-resolver` failed with
  `MODULE_NOT_FOUND` for `catalog-resolver`. The GREEN adds only a fresh I07-validated runtime catalog and
  pure permanent-ID resolver, plus its offline contract. It proves the `14/175/6/6` aggregate, full/place-only/
  blocked expansion, deterministic query stages, blocked collision boundaries, legacy IDs, DTO minimization,
  copy isolation and no-I/O boundary. The full matrix passes: focused contracts, root test, integration `56/0`,
  lint `0 errors / 10 existing warnings`, typecheck, host `CI=1` WeChat build and diff check. No handler, UI,
  route-data, dependency, schema or public-contract file changed; I13 is `READY_FOR_CONTROLLER_REVIEW`.
- I13 REVIEW_FIX recorded a sensitive RED: permanent `place:legacy:党岭` incorrectly resolved as place-only,
  bypassing its full child. `place:*` now expands first and succeeds only for exactly one matching place-only
  target; 党岭、五台山朝台 and a synthetic multi-full Place return `not_found`, while 泰山 remains direct.
  The contract also mutates the injected validated catalog after factory creation and proves the resolver snapshot
  is unchanged. The same complete validation matrix, including host WeChat build, passes again.
- Sol XHigh inspected the complete diff through `2f457fe`, found and verified the Place-ID bypass fix, then
  independently reran focused contracts, root test, integration `56/0`, lint `0 errors / 10 warnings`,
  typecheck, host WeChat build and diff check; all passed. A second independent Sol XHigh also returned
  `APPROVED`, with no P0–P2 finding. Its P3 observation that same-name ID tie-break lacks a dedicated fixture
  is non-blocking: the deterministic comparator is directly inspectable and the suite already covers stable
  sorting; adding another synthetic permutation would be mechanical rather than risk-reducing.
- Independent I21 backend/frontend audits confirmed that the handler still uses the I05 daily-weather path,
  while I13/I14/I16/I20 provide the necessary seams. Sol froze one atomic vertical contract rather than a
  frontend-only or backend-only intermediate state.
- The first independent I21 contract Review returned `CHANGES_REQUESTED` with no human decision: live #30
  drift, incomplete compatibility projection, missing manual-coordinate boundary, BaseData/error drift,
  an unfrozen builder interface and stale I13 open work. Sol fixed all findings, synchronized #30, removed its
  obsolete `status:blocked` label and kept `CONTRACT_REVIEW — IMPLEMENTATION_PAUSED`.
- A second focused Review identified AMap/manual source ambiguity, incomplete compatibility aggregation and
  remaining authority drift. Sol split catalog/AMap/manual follow-ups, froze the multi-point hourly summary,
  synchronized the exact BaseData/response shapes and current status, then re-synced #30. Third focused Review
  returned `APPROVED` with no P0–P3 finding and no human decision.
- Planning validation passes root test, offline integration `56/0`, lint `0 errors / 10 existing warnings`,
  typecheck, host `CI=1` WeChat build and `git diff --check`. The sandbox build's macOS
  system-configuration worker panicked/hung; it was terminated and the same command succeeded outside the
  sandbox. No I21 business code or TDD RED has been started.
- On `2026-08-08`, the fixed handler date fixture crossed the real date boundary and caused #90 quality to
  fail at `test:response`; `test:confirmation` had the same masked failure. Sol created focused Bug #91.
  Runtime-verified `luna-worker` changed only the two contract tests to use the existing fixed-`now` seam.
  PR #92 passed all local gates, latest-head quality and independent Sol Review with no P0–P3 finding, then
  squash merged as `8387554`; production date validation was not changed.

Historical pre-I25 status semantics: TP-BETA-001 resumed after human decision TP-D039 replaced the exact-pilot policy.
M1–M6 are complete. I23b PR #103 passed latest-head quality and two independent Sol Reviews, squash merged as
`097c921`, and closed #100 plus parent #32. I24 planning PR #104 merged as `6869a7b`; I24a PR #108 merged as
`1a2f485` and closed #105; I24b PR #109 merged as `f311d1b` and closed #106. This paragraph records the earlier
I24c activation checkpoint; PR #110 later completed that scope as described at the top of this file.

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

- `node scripts/route-type-contract-test.js`: 91 pass / 0 fail
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
- `node scripts/route-data-contract-test.js`: I08/I09/I10a/I11/I12 aggregated data contract for 11 Sources,
  175 legacy Places, 5 Routes and 5 Variants: four tier B reviewed-GPX full Variants plus one tier A Wutai
  blocked Variant. Route-specific assertions lock each full Variant's evidence, stages, totals, WGS84 samples
  and status boundary while preserving the earlier pilots' established aggregate views.
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
  Issues therefore remained source-blocked and I13/I21 stayed inactive at that historical checkpoint.
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
  while a Sol-reviewed community track can independently provide the geometry of its actual route.
  PR #78 merged the replan as `1e601d9`. GitHub #17 is active with the full two-day Wugong contract;
  #18/#20/#21 now name their actual GPX routes and remain blocked only until route-specific contracts;
  #19/#51 closed as not planned; #22/#30 reference #77 rather than old I10b. Wutai stays blocked and,
  at that checkpoint, #77 owned the then-missing fifth plannable track; the later KML intake above
  resolves the input gap without yet completing implementation.
- I08 implementation recorded a genuine `test:route-data` RED after registering the new route-specific
  test: the absent Wugong fragment produced `MODULE_NOT_FOUND`. The minimum GREEN adds only the plain
  reviewed-GPX fragment, its catalog assertions and minimal runner registration. The focused route-data and
  route-domain contracts, root test, integration (56/0), lint (0 errors; 10 existing warnings) and
  typecheck pass. The sandbox WeChat build hit the known macOS `system-configuration` NULL-object panic,
  an environment limitation; Sol independently reran `npm run build:weapp` on the host, where Taro 4.0.9
  Webpack compiled successfully in 3.68 seconds with exit 0.
- I08 passed Sol and second independent Review with no P0–P2 findings. PR #79 latest-head `quality`
  passed, Sol recorded `APPROVED`, the PR squash merged as `adfa0d8`, and GitHub #17 closed.
- I09 source/GPX audit froze TP-D040: official route material owns the two-day climb identity and
  5276m route highest point; official management material keeps the exact Variant `unknown`; the
  reviewed GPX owns two-day geometry, activity windows and WGS84 samples, including its 5254m measured
  high sample. No raw GPX or personal metadata enters the repository.
- I09 implementation recorded a real `test:route-data` RED after registering the I09 fragment and
  route-specific assertion: the absent `siguniang-erfeng` fragment produced `MODULE_NOT_FOUND`. Its
  minimum GREEN adds only the three-source static fragment, I09 assertions and runner registration.
  The full aggregate is 6 Sources, 175 legacy Places, 3 Routes and 3 Variants (two full, one blocked);
  Wutai and Wugong keep their established aggregate views. Route-data, route-domain, root test,
  offline integration (56/0), lint (0 errors; 10 existing warnings) and typecheck pass. The sandbox
  WeChat build reproduced the known `system-configuration` NULL-object panic; Sol reran the same
  command on the host, where Taro 4.0.9 Webpack compiled successfully in 3.08 seconds with exit 0.
  Sol and a second independent Sol XHigh inspected the actual diff and returned `APPROVED` with no
  P0–P3 findings. PR #80 latest-head `quality` run 40 passed, the approved head squash merged as
  `1e7fa2d`, and GitHub #18 closed. No build or dependency configuration was changed.
- I11's GPX and current official management audit froze TP-D041. The actual one-day walk is
  `13.223km / +408.0m / -379.0m / 5.40h`, reaches a GPX high sample of 3236m and uses two WGS84
  weather points. The 12,825-point track is internally consistent and contains no required transport
  segment. A current management notice confirms the scenic-area service and signage boundary but not
  the exact walking path, so the Variant remains `unknown`. Old Glacier Park 3356/4506/4680m,
  cableway and `tour/mixed` facts stay excluded. No raw GPX or personal metadata enters the repository.
  The local and live #20 contracts passed an independent Sol XHigh Review with no P0–P3 findings;
  #20 is open without `status:blocked`, and implementation is authorized on contract head `6034bf1`.
- I11 implementation recorded a genuine `test:route-data` RED after registering the I11 fragment and
  route-specific assertion: the absent `yulong-blue-moon-yunshanping` fragment produced `MODULE_NOT_FOUND`.
  Its minimum GREEN adds only the two-source static fragment, I11 assertions and runner registration.
  The full aggregate is 8 Sources, 175 legacy Places, 4 Routes and 4 Variants (three full, one blocked);
  Wutai, Wugong and Siguniang keep their established catalog views. Route-data, route-domain, root test,
  offline integration (56/0), lint (0 errors; 10 existing warnings), typecheck and diff check pass. The
  sandbox WeChat build reproduced the known `system-configuration` NULL-object panic; Sol reran the same
  command on the host, where Taro 4.0.9 Webpack compiled successfully in 3.08 seconds with exit 0. After
  one focused Review fix locked the complete reviewed-GPX Source evidence, Sol and a second independent
  Sol XHigh inspected the actual diff and returned `APPROVED` with no P0–P3 findings. Latest-head Actions
  `quality` run 41 passed, PR #81 squash merged as `4a9577f`, and GitHub #20 closed. No dependency or
  build configuration was changed.
- I12's source and GPX audit froze TP-D042. The official 2023 route identity calls old Yulin to Gongga
  Yulong West a developed long trek, while the 2025 closure notice applies to named peaks and undeveloped/
  unopened dangerous areas without naming this exact Variant. A 2026 tourism directory follows a
  different route after the shared Riwuqie–Moxi corridor. The honest static state is therefore `unknown`,
  not inferred `open` or `blocked`. The reviewed 4067-point GPX supplies a three-day non-navigation record:
  `44.892km / +2392.1m / -1628.9m`, a 4873m route high and one WGS84 high-area sample per day. Personal
  detour waypoints and all raw/account metadata remain excluded. Contract head `a635082` passed independent
  Sol XHigh Review with no P0–P3 findings. I12 implementation first registered its route-data test and
  fragment require, recording the genuine missing-fragment `MODULE_NOT_FOUND` RED. The minimum GREEN adds
  only the three-Source static fragment, its exact entity/evidence assertions and runner registration; the
  runner continues to pass each earlier route its established aggregate view. Route-data, route-domain,
  root test, offline integration (56/0), lint (0 errors; 10 existing warnings) and typecheck pass. The
  sandbox WeChat build reproduced the known `system-configuration` NULL-object panic; no build configuration
  changed. Sol then reran `build:weapp` on the host, where Taro 4.0.9 Webpack compiled successfully.
  Sol and a second independent Sol XHigh inspected implementation commit `e7510de` and returned `APPROVED`
  with no P0–P3 findings. Latest-head Actions `quality` run 42 passed; PR #82 squash merged as
  `25750df` and GitHub #21 closed. No dependency or build configuration was changed.

The baseline checks were rerun during M1 verification. Local Markdown links and `git diff --check` also pass.

## Agent assignments

- Sol XHigh: #115 planner, public-contract owner, child-Issue author, reviewer and merge authority.
- Independent Sol reviewers: read-only product/API/security reviews of the planning diff; they do not implement or
  merge their own findings.
- `luna-worker`: assigned the bounded C04/#121 owner UX implementation under the exact page/model/service allowlist; it cannot
  approve or merge its own work.
- Terra XHigh: historical work retained; no Active Terra Agent and no automatic fallback authorization.

## Open work

1. Publish the controller-owned C04 activation checkpoint and remove #121's dependency-blocked label.
2. Dispatch exact custom `luna-worker` for test-first owner file/consent/upload/status/revision/cancel UX.
3. Keep #122–#123 blocked until each preceding approved PR merges.

## Blockers and risks

- No product/retention human decision remains. The 30/180 periods and server-only admin authority are approved.
- GitHub CLI authentication is restored. PR #117 is merged and live #115/#118–#123 match the serial plan.
- Root toolchain, lockfiles, offline integration, CI and branch protection remain merged and verified.
- Node 24 随附的 npm 11 与 `@nutui/nutui-react-taro@3.0.20` 的不可解析可选依赖
  存在锁文件校验不兼容：npm 11 生成锁时省略该包、`npm ci` 又报缺失。I01 已按
  GitHub #10 的控制端决策固定 npm 10.9.2，并以 `engine-strict` 拒绝错误 npm。
- Four supplied GPX files are suitable for their actual route identities, not the superseded exact
  pilots. Each implementation must use the reviewed derivation method and must not retain old names,
  days or geometry.
- The fifth plannable Variant is merged through #87; route-data sourcing no longer blocks I13.
- Community tracks cannot establish `open`. The static full records use `operationalStatus='unknown'` unless
  a precise official management fact is found; unknown is disclosed and does not mean open.
- I10a remains deliberately narrow: broader restriction scope still requires the missing official
  announcement body or poster.
- TP-D028 resolved the I15 accumulation ambiguity as activity-window totals. Full rolling-24h or
  natural-day accumulation would require a future weather-data contract and must not be implied now.
- TP-D029 resolves I16's sunset evidence boundary as the earliest value across each route-day's trusted
  I14 samples. If any necessary sunset cannot be calculated, the result is unavailable unless a known
  hard no-go independently applies.
- Historical constraint: I21 could not be split into frontend-only/backend-only merges and therefore shipped as
  one atomic public cutover in PR #93. It is no longer an active blocker. I22 is intentionally split because #94
  adds display-safe provenance before #95 consumes it.
- Deployment and real-device validation for this new function remain C06 human-controlled gates; prior #114 staging
  validation does not deploy or validate `trackSubmission`.

## Stop conditions during community-track planning

- Do not modify application/Cloud Function code, dependencies, CloudBase collections/indexes/rules/env or deployed
  functions in the planning PR.
- Do not weaken exact private-file binding, server OpenID/admin gates, parser limits or immutable-review authority to
  fit the current SDK. A non-implementable CloudBase seam returns to Sol/human.
- Do not scrape or bulk-import third-party platforms, expose raw tracks publicly, publish routes automatically, infer
  opening/safety from geometry, or perform cleanup outside the human-approved new-record 30/180 contract.

## Next action

Commit and publish the controller-owned C04 activation checkpoint, synchronize live #115/#121, then dispatch exact
custom `luna-worker` for the pre-agreed model/service/page-wiring TDD seams. #122 remains blocked until an approved
C04 PR is remotely verified merged.

## I21 implementation checkpoint — 2026-08-08 (initial head 69475df)

- Agent: `luna-worker` (`gpt-5.6-luna`, max); branch `codex/30-core-input-flow`; base `main@c817bbb`.
- Status: initial implementation complete locally; PR #93 then entered Sol XHigh Review-fix round 1. No Terra agent is active.
- TDD: the required missing `trip-base.js` RED was recorded before implementation; the new
  `test:core-input-flow` now passes and is included in the root `npm test` command.
- Connected path: `prepare/confirm/advice` → I13 resolver → injected `trip-base` → openid-bound
  TripContext → queryId-only advice. Full, place-only, manual, AMap follow-up and blocked paths are
  covered without changing I13/I14/I15/I16 pure modules.
- Initial changed allowlist files: `cloudfunctions/getAdvice/{index.js,trip-base.js,trip-context.js,response-contract.js}`;
  `taro-app/src/pages/index/index.jsx`; `scripts/{core-input-flow-contract-test.js,response-contract-test.js,confirmation-contract-test.js,trip-context-contract-test.js}`;
  `package.json`. Review-fix round 1 additionally updates `scripts/trip-flow-contract-test.js`; `index.css`
  and `e2e-local.js` remain unchanged.
- Validation: focused I21 contracts, root `npm test`, integration `56/0`, `lint` (0 errors, 10 existing
  warnings), `typecheck`, host Taro 4.0.9 `build:weapp`, and `git diff --check` pass.
- Remaining at the initial head: inspect final diff against the Issue allowlist, commit/push the focused PR, and return
  `READY_FOR_CONTROLLER_REVIEW`; Sol must decide `APPROVED`/`CHANGES_REQUESTED`/`BLOCKED`/`ESCALATE_TO_HUMAN`.

## I21 REVIEW_FIX round 1 checkpoint — 2026-08-08

- Review state: PR #93 received `CHANGES_REQUESTED` from Sol XHigh at head `69475df`.
  This round is additive only; no amend, rebase, force push, or force-with-lease is permitted.
- Finding-to-change map:
  - P1 weather compatibility: `trip-base.js` now projects complete route weather as the
    legacy object `{days, source, windUnit, fetchedAt, timezone, elevationCaveat, precipNote,
    dateOutOfRange, dateRangeNote}`; insufficient and blocked remain `null`. Core and response
    contracts assert the shape and the exact queryId-only advice snapshot remains immutable.
  - P1 resolver boundary: `index.js` rejects legacy `builtin-route:*`/historical builtin fallback
    candidates after I13 `not_found`, while AMap and manual route-type paths remain available.
    Response contract covers `prepare('大朝台') -> route_not_found` with no candidate leakage.
  - P1 clock: `index.js` keeps the production wall clock by default and exposes only a test seam
    for pinned Shanghai date validation. Response and confirmation contracts pin 2026-08-08 and
    retain a direct past-date `invalid_date` assertion.
  - P2 UI/input: `index.jsx` renders full-candidate server `fixedDays` as read-only text and
    preserves finite manual elevations in `[-500, 9000]`, including zero and negative values;
    the trip-flow contract exercises the parser and fallback wiring.
  - Acceptance evidence: core contract now covers trek/climb/tour, manual/AMap, strict invalid
    input side-effect counters, trusted IDs/gear, blocked weather/gear/sunset zero calls and
    compatibility risk; response covers full weather, blocked/place base and AI immutability.
- Validation after fixes: focused I21 contracts, `npm test`, offline integration `56/0`, lint
  (0 errors; existing warnings only), typecheck, host Taro 4.0.9 `build:weapp`, and diff check pass.
- Round-1 result: additive commits `4171d35` and `4827c09` are pushed to PR #93. Latest-head quality passed,
  but independent Sol re-review requested one bounded P2 test-evidence round. GitHub PR check is the current
  CI fact source; do not persist a run ID that becomes stale after the next documentation commit. Sol XHigh
  remains the only approver and merge authority. `GOAL.md` and `docs/development-plan.md` activation
  changes from `fac56d0` remain Sol-owned and are outside the Luna allowlist.

## I21 REVIEW_FIX round 2 checkpoint — 2026-08-08

- Status: `REVIEW_FIX_ACTIVE — READY_FOR_CONTROLLER_REVIEW_PENDING`; base head `4827c09`; additive commits only.
- Test/evidence commit: `71ebb95` (`test: strengthen I21 round-two evidence`). The documentation checkpoint
  is a separate additive commit; no production business file changed in this round.
- Completed: public zero-side-effect snapshots, representative manual backend negatives, three-capability
  gear projection equality, both UI manual-elevation request paths, the stale route-type fallback assertion
  and final status synchronization.
- Contract expansion: Sol added `scripts/route-type-contract-test.js` only for the exact stale test correction;
  no production route-type scope was added.
- Finding-to-test map: `response-contract-test.js` now shares a public side-effect snapshot for HTTP/weather/
  elevation/AMap, TripContext reads/writes and LLM calls across representative early exits and confirmation;
  it also covers manual string/NaN/Infinity/lat-lon/elevation negatives with zero effects. `core-input-flow-
  contract-test.js` compares all three `minimumGear` arrays to `gearRules` for full/place-only/blocked.
  `trip-flow-contract-test.js` checks both page manual-submit branches and service payload preservation for
  elevation `0` and `-20`. `route-type-contract-test.js` rejects removal of either `location_failed` or
  `route_not_found` fallback.
- Mutation evidence: an in-memory removal of the manual-elevation expression or either route fallback path
  is rejected by the new assertions; focused tests then returned GREEN.
- Validation: `test:core-input-flow`, `test:response`, `test:confirmation`, `test:trip-context`, `test:trip-flow`,
  `test:route-resolver`, `test:hourly-weather`, `test:trip-verdict`, root `npm test`, offline integration
  `56/0`, lint `0 errors / 10 existing warnings`, typecheck, host `build:weapp` and `git diff --check` all
  pass. The GitHub PR #93 latest-head `quality` check remains the CI fact source; no Actions run ID is
  persisted in this checkpoint.
- Stop rule: if the same frozen acceptance remains unsatisfied after round 2, escalate to the human instead
  of beginning a third local repair round.

## I21 final Review checkpoint — 2026-08-08

- Review result: two independent Sol XHigh reviewers returned `APPROVED`; no P0–P3 findings remain.
- Current status: `CONTROLLER_APPROVED — PR_MERGE_PENDING`.
- Merge gate: this controller-owned documentation checkpoint changes no business code; its latest-head GitHub
  quality must pass before squash merge. PR check remains the CI fact source, so no run ID is persisted here.
- Historical force-push incident remains disclosed; subsequent implementation, tests, Review-fix and controller
  commits are additive.

## I21 merge closeout / I22 planning checkpoint — 2026-08-08

- PR #93 latest head `c7bdf39` passed GitHub `quality`; Sol recorded final `APPROVED` and squash merged it as
  `be24b07`. GitHub #30 was closed manually because the PR intentionally used `Refs #30`.
- I21 is complete on `main`; its ten-state flow, trusted structured BaseData, queryId-only advice and compatibility
  projection are now real dependencies rather than planning assumptions.
- I22 parent #31 and children #94/#95 are open. Current read-only evidence shows the page still consumes compatibility aliases while
  structured verdict/hourly/minimum-gear fields are available, and route sources expose only IDs. Planning must
  establish a trusted server source-summary lookup before a user-facing source card can claim traceability.
- No implementation Agent is active. `luna-worker` may be dispatched only after the I22 contract passes independent
  Review and its planning PR merges; Terra remains unauthorized as an automatic fallback.

## I22 contract Review checkpoint — 2026-08-08

- Parent #31 is split serially into #94 trusted provenance and #95 structured result page. The live Issue bodies
  and repository documents define the same scope, allowlists, interfaces, tests and merge order.
- First Review requested bounded corrections for the single resolver-owned source catalog seam, Place-source
  semantics, structured-cache cutover, checklist lifetime, WMO condition labels, history compatibility isolation,
  exact four-state visual evidence and stale status copy. Sol resolved them without changing product scope.
- The private `historyContext` preserves the existing I19 save DTO without rendering/caching compatibility facts or
  allowing advice meta to change them. Restored non-terminal AI loading normalizes to unavailable; I23 retry scope
  remains untouched.
- Two independent Sol XHigh second-round reviews returned `APPROVED` with no P0–P3 findings. No human product
  decision is required.
- Pure-planning baseline: root `npm test`, integration `56/0`, lint `0 errors / 10 existing warnings`, typecheck,
  host Taro 4.0.9 `build:weapp` and `git diff --check` pass. No implementation Agent is active.
- Planning PR #96 is open. Its GitHub PR check remains the CI fact source rather than a commit/run ID persisted in
  this self-updating status file. Current gate is independent actual-diff Review and unchanged-head squash merge.

## I22 planning merge / I22a activation checkpoint — 2026-08-08

- Planning PR #96 latest head passed GitHub quality and independent actual-diff Review with no P0–P3 findings;
  Sol squash merged it as `ac4ba9e`.
- Active Issue is only #94. Branch `codex/94-source-summaries` starts from exact `main@ac4ba9e`; #95 remains
  dependency-blocked and may not be implemented in parallel.
- Routing verification: logical role `IMPLEMENTER`; requested custom Agent `luna-worker`; config
  `~/.codex/agents/luna-worker.toml`; configured model `gpt-5.6-luna`; reasoning `max`; configuration status
  `CONFIG_VERIFIED`. Runtime status is recorded after spawn; Terra remains unauthorized as an automatic fallback.
- Active allowlist is the server resolver/source-summary/BaseData seam, focused tests, package command and two
  status documents defined in #94/ACTIVE_TASK. No frontend, route data, rules, Prompt/safety/history or dependency work.

## I22a implementation checkpoint — 2026-08-08

- Agent: exact custom `luna-worker`; runtime model/reasoning remains `UNVERIFIED_RUNTIME_MODEL` in this session
  because runtime metadata was not exposed. Configuration remains `CONFIG_VERIFIED` for `gpt-5.6-luna` / `max`.
- TDD: `test:source-summary` was registered before the implementation module and produced the real
  `MODULE_NOT_FOUND` RED. GREEN now covers the pure seven-field projection, resolver-owned Source snapshot,
  custom catalog lookup, copy isolation and unknown-ID integrity error.
- Implementation: `createCatalogResolver` owns one catalog Source snapshot and exposes `summarizeSources`; the
  production resolver exports `resolveRouteSourceSummaries`. `trip-base` receives that function through injection,
  adds Variant provenance/status fields, emits display-safe `routeSources`, and excludes Place identity evidence from
  `routeSourceIds`. `index.js` injects the production function; compatibility fields and queryId-only advice remain unchanged.
- Focused GREEN: source-summary, core-input-flow, trip-context and response contracts pass. Route resolver/domain/data,
  root test, integration `56/0`, lint `0 errors / 10 existing warnings`, typecheck, host WeChat build and diff check pass.
- Scope check: only the #94 allowlist changed; no frontend, route data/schema, I13 query semantics, weather/verdict,
  Prompt/safety/history, dependency, network, deployment or production configuration change. Status is
  `READY_FOR_CONTROLLER_REVIEW`; PR/CI and independent Sol Review remain required.

## I22a merge / I22b activation checkpoint — 2026-08-08

- PR #97 latest head passed GitHub quality and independent Sol re-review with no P0–P3 findings; Sol squash merged
  it as `6e12f25` and closed #94.
- Active Issue is only #95. Branch `codex/95-structured-result-page` starts from exact `main@6e12f25`; parent #31
  remains open, while I23/#32 remains blocked.
- Routing: logical role IMPLEMENTER; exact custom Agent `luna-worker`; config
  `~/.codex/agents/luna-worker.toml`; configured `gpt-5.6-luna` / `max`; `CONFIG_VERIFIED`. Runtime visibility is
  recorded by the spawned agent. Terra is not an authorized fallback.
- No implementation Agent is active until this controller activation commit is pushed. The #95 allowlist is
  frontend result model/page/CSS, focused tests, verification evidence, package command and two status documents.

## I22b implementation handoff checkpoint — 2026-08-08

- #95 implementation is complete within the allowlist on `codex/95-structured-result-page`: pure CommonJS
  structured result projection, deterministic route/verdict/reasons/dataIssues/weather/source/minimum-gear cards,
  AI-only additive namespace, private five-field history capture, checklist lifetime and versioned cache behavior.
- TDD evidence includes the real pre-module `MODULE_NOT_FOUND` RED and focused GREEN. Required focused/full/
  integration/lint/typecheck/host-build/diff commands pass; offline integration is `56/0`, lint has no errors and
  only the repository's existing warnings.
- Visual status is `UNVERIFIED_RUNTIME_TOOL`, not accepted as complete: WeChat DevTools exists, but Computer Use
  returned `The Mac is locked and automatic unlock could not unlock it. Ask the user to unlock the Mac manually
  before continuing.` No screenshots or production mock switch were fabricated. An unlocked-Mac rerun must add the
  four fixture screenshots under `docs/evidence/i22/`.
- Handoff: `READY_FOR_CONTROLLER_REVIEW_WITH_VISUAL_BLOCKER`; Sol XHigh owns independent review, CI interpretation,
  approval and merge. I23/retry/recovery remains blocked and untouched.

## I22b REVIEW_FIX round 1 checkpoint — 2026-08-08

- PR #98 review P1s are addressed additively on the same branch. The root `npm test` now runs
  `test:result-page`; a temporary mutation showed the pre-fix root command missed that contract (root exit 0 versus
  focused exit 1), then GREEN was restored.
- `result-page-model.js` exposes a small executable checklist/history orchestration seam, and `index.jsx` calls it
  for base receipt, advice lifecycle, return/cache resets and history DTO construction. The fixture covers same
  base/query retention, different base/query reset, onBack/cache restore reset, success/degraded single-save
  intents, context-unavailable zero-save and five-field history isolation from advice/meta.
- Mac locked remains the independent visual blocker; four screenshots are still intentionally absent and status is
  `READY_FOR_CONTROLLER_REVIEW_WITH_VISUAL_BLOCKER`. No backend, schema, dependency, service, reducer-state or
  retry/recovery files changed.

## I22b REVIEW_FIX round 2 checkpoint — 2026-08-08

- Final review-fix evidence now crosses the production page boundary: `trip-flow-contract-test.js` extracts real
  `index.jsx` method/branch bodies and checks lifecycle calls plus success/degraded save calls and the
  context-unavailable no-save invariant.
- Independent mutations deleting each key cache/base/advice/reset/lifecycle/intent/save call, or inserting a
  context-branch `_saveHistory`, all returned focused RED; the restored head is GREEN. No production logic changed.
- The result-page fixture wording now uses an advice event with a new result object. Four DevTools screenshots remain
  intentionally absent because Mac is locked (`UNVERIFIED_RUNTIME_TOOL`). Final handoff status is
  `READY_FOR_CONTROLLER_REVIEW_WITH_VISUAL_BLOCKER`; no round 3 will be started autonomously.

## I22b local visual verification checkpoint — 2026-08-09

- The human explicitly authorized local WeChat DevTools fixture injection and screenshot capture, then unlocked the
  Mac. Sol XHigh captured and inspected the required `full/go`, `full/caution + AI degraded`, `blocked/no_go` and
  `place-only/null` states under `docs/evidence/i22/`.
- The screenshots show the deterministic verdict/capability boundaries, hourly or reference-weather semantics,
  official no-weather blocked behavior, minimum gear/source cards and the independent AI degraded message.
- After independent review found the initial full-route framing incomplete, Sol recaptured `full/go` and
  `full/caution + AI degraded` as complete-page simulator frames; each now shows the verdict, reasons, weather,
  minimum gear, sources and AI section together.
- Temporary local fixture code was removed and the normal WeChat build passed afterward. No production mock,
  service-port change or debug adapter remains. At that checkpoint the status was `READY_FOR_FINAL_REVIEW`, and I23
  remained blocked until #98 approval and merge; the following checkpoint records that completion.

## I22 merge closeout / I23 contract checkpoint — 2026-08-09

- Independent final visual re-review returned `APPROVED` with no P0–P3 findings. PR #98 latest-head quality passed,
  Sol squash merged it as `852e86d`, and closed #95 plus parent #31. I22 is complete on main.
- I23/#32 is split into serial #99 I23a history-save idempotency and #100 I23b frontend recovery. This is pure planning;
  no implementation Agent is active and no business file has changed on `codex/i23-recovery-contract`.
- I23a freezes optional private `saveAttemptId` dedupe by openid without queryId, hash/SHA, migration, index or list
  DTO change. It addresses sequential retry after an uncertain save response, not distributed exactly-once.
- I23b keeps ten states. Same-queryId advice retry and new-base prepare/confirm recovery each advance the token;
  page-private pending and last-base request slots separate initial failure retry from weather/context refresh.
  Reprepare keeps an existing deterministic page visible with a local refreshing indicator; cache/history never
  restore queryId or auto-retry. History selection resets flow/checklist/cache and only prefills existing private
  fields; current/default time and climb support remain visible for user confirmation.
- Read-only audit baseline `main@852e86d` passed trip-flow, result-page, history, response and integration `56/0`.
  The audit found no human decision under this bounded design. Live #32/#99/#100 are synchronized; independent
  contract Review returned APPROVED with no P0–P3 findings. Planning PR #101 is open; its live latest-head GitHub
  check is the CI fact source, and actual-diff approval/merge remain before I23a dispatch.

## I23 planning merge / I23a activation checkpoint — 2026-08-09

- Planning PR #101 latest-head quality passed and independent actual-diff Review returned `APPROVED` with no P0–P3
  findings; Sol squash merged it as `a12ab46`.
- Active Issue is only #99 on `codex/99-history-save-idempotency` from exact `main@a12ab46`. #100 remains
  dependency-blocked and may not run in parallel.
- I23a allowlist is only `cloudfunctions/history/index.js`, `scripts/security-test.js` and the two status documents.
  No frontend, dependency, index/migration, queryId/list DTO, production configuration or I23b recovery work is active.
- Routing before spawn: logical role `IMPLEMENTER`; requested custom Agent `luna-worker`; config
  `~/.codex/agents/luna-worker.toml`; configured model `gpt-5.6-luna`; reasoning `max`; configuration status
  `CONFIG_VERIFIED`; runtime model is recorded by the executor. Terra remains unauthorized as an automatic fallback.

## I23a implementation checkpoint — 2026-08-09

- TDD recorded the required real RED first: the new same-owner/same-`saveAttemptId` sequential retry assertion
  failed against the pre-change handler with `same owner and saveAttemptId must not add a duplicate`.
- GREEN is limited to the #99 allowlist. `mode='save'` trims and validates an optional non-empty ID up to 80
  characters, stores it only on the private record, looks up the exact server `{_openid, saveAttemptId}` pair
  before add, and returns the first existing record ID without a dedupe marker. Missing IDs retain legacy add;
  malformed IDs return the existing non-retryable `invalid_history_input` before database add. `list` remains the
  explicit DTO and never exposes `saveAttemptId`, `_id`, `_openid` or `queryId`; lookup/add failures map to
  `history_unavailable` without raw errors.
- Focused GREEN (`npm run test:history`) proves stable same-owner retry IDs, first-write-wins payloads, independent
  owners, distinct IDs, validation-before-add, lookup/add error mapping, legacy missing-ID behavior and DTO/privacy
  boundaries. Root `npm test`, integration `56/0`, lint (0 errors; 9 existing warnings), typecheck, host WeChat
  build and `git diff --check` pass.
- Actual files changed: `cloudfunctions/history/index.js`, `scripts/security-test.js`, this status document and
  `docs/tasks/ACTIVE_TASK.md`. No frontend, dependencies, indexes/migrations, queryId, list DTO or production
  configuration changed. Draft PR #102 exists and its live latest-head check is the CI fact source.
- Sol Review returned `CHANGES_REQUESTED` with no P0/P1 and no production implementation finding. Round 1 is limited
  to four test-sensitivity gaps: explicit missing-ID legacy double-add, a representative non-string invalid ID,
  exact duplicate response shape without a dedupe flag, and valid-ID lookup followed by add-failure error mapping.
  Controller owns PR/status description cleanup. No third-party, migration, index or business change is authorized.

## I23a REVIEW_FIX round 1 implementation checkpoint — 2026-08-09

- Added only the four requested behavior assertions in `scripts/security-test.js`: missing-ID legacy saves perform
  two adds and return two IDs; non-string `saveAttemptId=123` is rejected before add; a deduplicated response is
  exactly `{ok:true,id:<first>}`; and an empty valid-ID lookup followed by add failure maps to the fixed retryable
  `history_unavailable` envelope.
- Mutation/RED sensitivity is recorded before handoff: temporarily forcing no-ID lookups made focused history test
  fail on the two-record legacy invariant; accepting non-string IDs failed the before-add assertion; adding a
  `deduped` response field failed the exact-shape assertion; and rethrowing save errors failed the fixed-envelope
  assertion. Each temporary mutation was reverted immediately; `cloudfunctions/history/index.js` has no final diff.
- Focused GREEN (`npm run test:history`) passes all six sections. The production handler remains unchanged from
  reviewed commit `4cada73`; only this test and status documentation are in the Review-fix diff.
- Required local matrix passes: `npm test`, integration `56/0`, lint (0 errors; 9 existing warnings), typecheck,
  host WeChat `build:weapp`, and `git diff --check`. Additive commit `877cd6c` is pushed; fresh latest-head GitHub
  `quality` passed in 44 seconds (run `31272070159`, job `93139614802`). No production handler change is pending.

## I23a merge / I23b activation checkpoint — 2026-08-09

- PR #102 final head passed latest-head quality and independent Sol re-review returned `APPROVED` with no P0–P3
  findings. Sol squash merged it as `107fab4` and closed #99.
- I23a now provides the accepted sequential history-save retry primitive. Its bounded limitation remains explicit:
  it does not promise simultaneous distributed exactly-once and adds no index, migration, lock, hash or queryId.
- Active Issue is only #100 on `codex/100-frontend-recovery` from exact `main@107fab4`. The fixed allowlist is the
  page-local recovery model/reducer/result model/page/CSS, focused tests/package, verification doc and two status docs.
- Routing before spawn: logical role `IMPLEMENTER`; requested custom Agent `luna-worker`; config
  `~/.codex/agents/luna-worker.toml`; configured `gpt-5.6-luna` / `max`; configuration status `CONFIG_VERIFIED`;
  runtime visibility is recorded by the executor. Terra remains unauthorized as an automatic fallback.

## I23b implementation checkpoint — 2026-08-09

- TDD RED was recorded before implementation: after registering `test:recovery`, the first
  `npm run test:recovery` failed with Node `MODULE_NOT_FOUND` for the not-yet-created `recovery-model.js`.
- GREEN adds only the #100 allowlist. `recovery-model.js` owns bounded pending/last base-request snapshots,
  retryable-event guards, non-security history save identity/frozen payload, and independent history-list tokens.
  `trip-flow.js` keeps the ten states/fields and adds only `BEGIN_ADVICE_RETRY` and `BEGIN_REPREPARE`; a non-null
  result in `preparing` stays rendered under `refreshing` instead of the skeleton. `index.jsx` replays existing
  prepare/confirm/advice seams, preserves deterministic facts/checklist, serializes same-base history retry,
  guards stale list callbacks, and treats history selection as zero-network form prefill. `result-page-model.js`
  exposes `refreshing` and optionally attaches the accepted `saveAttemptId`; CSS is limited to recovery indicators.
- Focused behavior tests pass: `test:recovery`, `test:trip-flow`, `test:result-page`. Recovery tests cover event
  eligibility/no-op, token advancement, same-query AI, new-query replay, request slots, old-result refresh,
  frozen history payload/identity, list stale/close guards, weather boundaries and actual page wiring.
- Required local matrix passes: `npm run test:response`, `npm run test:trip-context`, `npm run test:history`,
  root `npm test`, integration `56/0`, lint (0 errors; 9 existing warnings), typecheck, WeChat build and
  `git diff --check`. No DevTools or screenshot evidence was run; it is deferred to I24 unless separately authorized.
- Actual files changed remain within the allowlist: page/reducer/result/CSS, recovery test and focused test,
  package script, verification doc, and these two status documents. No Cloud Function, service payload, cache
  schema, history DTO, dependency, route/weather/verdict rule or production configuration changed.
- Status: `READY_FOR_CONTROLLER_REVIEW`; additive commit/PR and latest-head Actions remain controller-owned.

## I23b Sol Review / Review-fix round 1 — 2026-08-09

- Draft PR #103 at implementation head `45c454a` passed latest-head GitHub `quality`, but two independent read-only
  Reviews returned `CHANGES_REQUESTED`. No P0 or human/product/architecture decision is involved.
- Fix the four bounded page-orchestration findings only: gate weather recovery controls by the same reducer/request
  eligibility used by the click handler; replace marker-only wiring evidence with mutation-sensitive focused page
  evidence; keep the old BaseData history-save intent valid until replacement BaseData actually arrives; and keep
  existing history items visible while a list retry is loading.
- The old history save error/retry action must remain usable across a failed reprepare, while replacement BaseData,
  reset/return and unmount still invalidate it. A visible recovery button must never silently no-op because its event
  is ineligible.
- Review-fix remains inside #100's existing allowlist. No Cloud Function, public contract, dependency, cache/history
  schema, eleventh state, automatic retry or visual redesign is authorized. Use additive commits and normal push,
  update the verification/status evidence, run the complete required matrix and latest-head Actions, then return
  `READY_FOR_CONTROLLER_REVIEW` for a fresh Sol Review.

## I23b Review-fix round 1 implementation checkpoint — 2026-08-09

- Fixed weather recovery rendering and click handling by introducing the executable page-local
  `isWeatherRecoveryEligible`/`selectRecoveryActions` seam. It requires a retryable deterministic weather issue,
  terminal `complete`/`degraded`/`error` state and a valid `lastBaseRequest`; `base_ready` and `advice_loading`
  therefore expose no silent no-op action.
- Removed only the early `_invalidateHistorySaveIntent()` from `_beginReprepare`. Failed/in-flight old BaseData
  save intent remains available through reprepare failure; replacement BaseData, reset/return and unmount retain
  their existing invalidation boundaries.
- History list rendering now shows existing items while a refresh is loading and uses the empty loading copy only
  when there are no items. Lifecycle token/error preservation is unchanged.
- Replaced whole-file marker-only page evidence with bounded method/branch extraction plus executable action
  projection. Focused mutations for eligibility, refreshing priority, same-query advice, snapshot replay, same-base
  save identity, stale list guards and zero-I/O history prefill are required to fail the wiring assertions.
- Review-fix remains within the frozen #100 allowlist. No Cloud Function, public contract, cache/history schema,
  dependency or new flow state changed. Status remains `READY_FOR_CONTROLLER_REVIEW` pending additive commit,
  normal push, latest-head Actions and fresh Sol review.
- Review-fix local gates are GREEN: focused recovery/trip-flow/result-page/response/trip-context/history, root
  `npm test`, integration `56/0`, typecheck, WeChat build and `git diff --check`; lint has 0 errors and 9 existing
  warnings. No DevTools/screenshot evidence was run.

## I23b Sol re-review / Review-fix round 2 — 2026-08-09

- PR #103 exact head `42b4e8d` passed latest-head GitHub `quality` in 39 seconds. Frontend Review returned
  `APPROVED`; backend/lifecycle Review closed every prior production and identity finding but found one remaining P2:
  a non-empty history list stays visible during retry yet lacks a simultaneous local loading indication.
- Round 2 is limited to showing a small history-refreshing hint when `historyLoading` and existing items coexist,
  plus mutation-sensitive render evidence and truthful status/verification sync. The empty-list loading state and
  all list lifecycle/token behavior remain unchanged.
- This is the final permitted fix round for this same frozen finding. If it does not pass exact-head independent
  re-review, stop and escalate to the human rather than starting round 3. No other implementation or contract change
  is authorized.

## I23b Review-fix round 2 implementation checkpoint — 2026-08-09

- Added only a local `history-meta` hint, `正在刷新历史…`, when `historyLoading === true` and existing history
  items are present. The prior items remain rendered in the same branch; the empty-list loading state is unchanged.
- Extended `assertMutationSensitivePageWiring` so removing that non-empty hint makes `test:recovery` RED while the
  existing `historyList.map` evidence remains required. No new state, CSS, request, identity, schema or dependency
  was introduced.
- Focused recovery is GREEN. The frozen matrix and `git diff --check` are recorded in the verification doc; no
  DevTools/screenshot evidence was run. This is the final bounded round and is ready for one additive commit,
  normal push and latest-head Actions; if the same finding repeats, escalate to the human.
- Final-round local results: `npm test` PASS; integration `56/0`; lint 0 errors/9 existing warnings; typecheck,
  `build:weapp`, `git diff --check`, and focused trip-flow/result-page/recovery/response/trip-context/history PASS.

## M6 completion / I24 planning checkpoint — 2026-08-09

- PR #103 exact latest head passed GitHub `quality`; two independent Sol Reviews returned `APPROVED` with no
  P0–P3 finding. Sol squash merged it as `097c921` and closed #100 plus parent #32. M6 is complete.
- Independent I24 audits confirm that current local gates pass, but the existing offline integration suite still
  exercises the legacy three-route daily-weather pipeline rather than all five RouteVariant public
  `prepare -> queryId -> advice` flows. Existing I22 screenshots also predate I23 recovery controls.
- I24/#33 is split into three serial, independently reviewable children after this planning PR merges:
  I24a retires BaseData compatibility aliases through structured `beta_base_v2` advice/history adapters; I24b adds
  a table-driven five-pilot public acceptance contract; I24c performs temporary-fixture DevTools validation,
  fixture-free rebuild/import, evidence capture and final documentation sync.
- I24a must merge before I24b, and I24b before I24c. A failure found by I24b in production code becomes a focused
  Bug Issue/PR instead of expanding the test PR. I24c fixture code is temporary and cannot remain in source,
  package/config or normal build output.
- No human product decision is currently required. Real CloudBase, real paid APIs, device testing, deployment and
  real beta users remain outside TP-BETA-001. A locked or unavailable local DevTools runtime is reported as
  `UNVERIFIED_RUNTIME_TOOL`; it cannot be disguised as passed evidence and does not by itself expand the code-ready
  Goal into mandatory executed GUI testing.
- Current planning branch is `codex/33-beta-acceptance-plan` from exact `main@097c921`. Two independent actual-diff
  Reviews returned `APPROVED` with no P0–P3 finding, and draft planning PR #104 is open. The next action is to pass
  latest-head quality, perform final Sol metadata/diff verification and merge it. Only then may Sol create the three
  child Issues and activate I24a for exact custom Agent `luna-worker`.

## I24 planning merge / I24a activation checkpoint — 2026-08-09

- Planning PR #104 exact latest head passed GitHub `quality`; two independent actual-diff Reviews returned
  `APPROVED` with no P0–P3 finding. Sol squash merged it as `6869a7b`.
- Parent #33 now owns serial child Issues: I24a/#105, I24b/#106 and I24c/#107. #106 and #107 carry
  `status:blocked`; they cannot start before their predecessors pass CI, Sol Review and merge.
- Active branch is `codex/105-structured-advice-adapter` from exact `main@6869a7b`. This controller activation edits
  only Goal/status/task/development documents; no I24a production or test implementation has started.
- Routing before spawn: logical role `IMPLEMENTER`; requested custom Agent `luna-worker`; config
  `~/.codex/agents/luna-worker.toml`; configured model `gpt-5.6-luna`; reasoning `max`; configuration status
  `CONFIG_VERIFIED`; runtime visibility must be reported by the executor. Terra remains unauthorized.

## Historical I24a completion / I24b activation checkpoint — 2026-08-09

- I24a PR #108 passed latest-head GitHub `quality`; two independent final Reviews returned `APPROVED` with no
  P0–P3 finding. Sol squash merged it as `1a2f485` and closed #105.
- I24b/#106 is activated serially from exact `main@1a2f485` on `codex/106-beta-acceptance`. Its allowlist is limited
  to one new acceptance script, one new fixture module, package registration, one verification document and the two
  current-state documents. Production, existing tests, route data, dependencies, CI and visual files are forbidden.
- At this earlier activation checkpoint I24c/#107 was still dependency-blocked. The later I24b merge moved the active
  scope to I24c; any production defect found by acceptance remains a separate focused Bug Issue/PR and cannot be
  repaired inside the evidence PR.
- Routing before spawn: logical role `IMPLEMENTER`; exact custom Agent `luna-worker`; config
  `~/.codex/agents/luna-worker.toml`; configured model `gpt-5.6-luna`; reasoning `max`; `CONFIG_VERIFIED`;
  runtime model visibility must be reported by the executor. Terra remains unauthorized.
