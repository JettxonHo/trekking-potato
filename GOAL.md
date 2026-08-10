# TP-COMMUNITY-001 — 私有社区轨迹证据闭环

- Goal ID: `TP-COMMUNITY-001`
- Status: `ACTIVE — C05 REVIEW_ACTIVE`
- Governance: `TP-GOV-2.0.0`
- Started: `2026-08-09`
- Parent Issue: `#115`
- Release boundary: code, tests and separate staging-deployment checklist; no automatic route publication or production release

## 1. Objective

Add a private GPX/KML submission and administrator-review workflow for closed-beta users. The workflow converts a
real server-validated private file into a bounded reviewed-evidence projection. It reduces manual geometry intake but
does not decide route opening, route type, fixed days, safety, weather, verdicts or trusted-catalog publication.

## 2. Authority and reading order

Follow `AGENTS.md`, this Goal, `docs/governance/MASTER_PLAN.md`, live #115/child Issue and
`docs/tasks/ACTIVE_TASK.md`. `docs/community-track-workflow.md` is the authoritative public/data/security contract.
If code, Issue or another document conflicts with it, the executor stops and returns the conflict to Sol XHigh.

## 3. Scope

- GPX and KML local-file selection with explicit uploader rights/consent;
- server-reserved private storage path, actual object/file validation and safe bounded XML parsing;
- owner-only submission list/detail/cancel and honest cleanup-pending state;
- 30-day maximum raw retention and 180-day de-identified evidence retention with internal idempotent cleanup;
- server-only `TRACK_REVIEW_ADMIN_OPENIDS` authorization and administrator review;
- reviewed evidence projection with identity/time/raw references removed;
- tests, documentation and a separate human-controlled staging deployment checklist.

## 4. Non-scope

- scraping/importing 两步路、六只脚 or other third-party platforms;
- KMZ, remote URL ingestion, public UGC feeds or public raw-track downloads;
- automatic Place/Route/RouteVariant creation or catalog mutation;
- treating a track as proof of access, permission, opening, safety or a verdict;
- production/public release, new paid infrastructure, deletion of pre-existing data, cleanup outside the approved
  30/180 lifecycle or broad auth/storage permission changes.

## 5. Milestones and serial Issues

| Milestone | Work item | Completion condition |
|---|---|---|
| C1 Parse | C01 | bounded GPX/KML parser and reviewed projection pass security/behavior tests |
| C2 Owner API | C02 | begin/finalize/list/get/cancel use server identity and private reserved storage |
| C3 Review API | C03 | admin allowlist, raw access and review state machine are fail-closed and idempotent |
| C4 User UX | C04 | rights, upload, status, revision and cancel are usable without public UGC |
| C5 Admin UX | C05 | admin-only queue/detail/review works without exposing identity or secrets |
| C6 Acceptance | C06 | cross-layer gates, docs and human staging checklist are complete |

C01 completed through approved PR #124, C02 through PR #125, C03 through PR #126, and C04 through PR #127
(`ff5774a`); Issues #118–#121 are closed. C05/#122 is the only active child; C06 remains dependency-blocked. Each
child gets one focused branch/PR and exact allowlist.

## 6. Completion criteria

- all child Issues close through compliant PRs and latest-head CI;
- the exact mode/status/error/DTO contracts in `TRACK-SUBMISSION-1` are implemented and tested;
- raw data remains creator/service/admin private; owner/admin authorization and forged-identity tests pass;
- parser/file limits, XML safety, retry/concurrency and cleanup-pending behavior are demonstrably enforced;
- raw/evidence deadlines, internal timer idempotency and deletion-pending truthfulness are behavior-tested;
- no route catalog, operational status, deterministic result or public UGC path is mutated;
- CloudBase collection/index/env/function changes are executed only through the separately approved C06 staging step;
- final Review reports code-ready versus deployed/closed-beta-tested truthfully.

## 7. Agent routing and stop conditions

Sol XHigh owns design, child contracts, scheduling, independent Review, merge and Goal acceptance. Bounded
implementation uses the exact custom Agent `luna-worker` configured at `gpt-5.6-luna/max`; runtime identity is
recorded separately from configuration. Terra is not an automatic fallback. Stop for the human conditions in
`docs/community-track-workflow.md`, including permission broadening, platform-rights uncertainty and production.

---

# Historical completion record — TP-STAGING-001

- Goal ID: `TP-STAGING-001`
- Status: `COMPLETE — CONDITIONAL_GO`（approved PR #116 merged as `b1bc994`）
- Governance: `TP-GOV-2.0.0`
- Started: `2026-08-09`
- Completed Issue: `#114`
- Release boundary: validate the existing closed-beta staging environment; no production or public release

## 1. Current objective

Treat the existing `cloud1-d0gtzgqzh9c128aaf` environment as the only pre-production staging candidate and verify
the real AppID, CloudBase functions, private collections, openid ownership, live weather/AI dependencies, five-route
management status, TripContext v2 cutover and rollback boundary. This Goal may recommend a separately authorized
5–10 user closed beta, but it does not create a production environment, publish the mini-program or claim real-user
validation.

## 2. Current scope and order

1. Complete Issue #114 staging validation and publish a durable Go/No-Go report. The reviewed result is
   `CONDITIONAL_GO` for a bounded four-route cohort and became effective when PR #116 merged.
2. Rotate the `AMAP_KEY` and `LLM_KEY` before any new closed-beta invitations because the CloudBase console exposed
   their plaintext values during the authorized configuration inspection. Secret values must never enter Git,
   Issue bodies, PRs, screenshots or durable project documents. The human confirmed rotation on `2026-08-09`, and
   a fresh full-route/weather/queryId-advice smoke succeeded without inspecting the new values.
3. Keep the existing database collections and storage permissions private unless a later reviewed Issue explicitly
   changes them. Do not delete records or run an irreversible migration.
4. After #114 reaches an approved staging conclusion and merges, activate the separately scoped community-track Issue #115. That Goal
   will accept private GPX/KML submissions, require explicit uploader rights/consent, keep geometry and identity
   private during review, and require administrator approval plus official management evidence before a route can
   be promoted into the trusted catalog.

## 3. Non-scope

- production deployment, public release or a second paid CloudBase environment;
- automatic publication of user tracks as route facts;
- public UGC feeds, social features or public raw-track downloads;
- destructive cleanup, production data migration or dependency/framework upgrades;
- treating AI, a GPX/KML file or a third-party platform page as proof that a route is currently open.

## 4. Completion criteria

- AppID/environment/function/collection/storage/log evidence is recorded without secret values;
- latest local quality, integration and WeChat build gates pass;
- at least one real full-route `prepare → queryId → advice` flow and private history save/list are verified, while
  offline five-pilot coverage is clearly distinguished from live runtime evidence;
- five pilot management states are refreshed against current primary sources and any unresolved exact-route status
  remains visible as unknown or excluded from the first user cohort;
- TripContext v1 is drained without deletion, v2 is proven live, and rollback does not reintroduce v1;
- credential rotation and any remaining human-only runtime rows are either completed or explicit blockers;
- the final report states `GO`, `CONDITIONAL_GO` or `NO_GO` for a 5–10 user staging beta and does not overclaim
  production readiness.

The #114 report satisfies these criteria with `CONDITIONAL_GO`: the CloudBase package is human-confirmed for the
closed-beta window; Wugong, Siguniang, Blue Moon Valley–Yunshanping and Dangling form the initial allowlist; Gongga is
excluded; Wutai remains blocked; post-rotation AMap fallback remains a disclosed non-critical unverified row.

## 5. Agent routing and stop conditions

Sol XHigh owns environment inspection, risk decisions, contracts and final acceptance. Bounded implementation after
planning uses the exact custom Agent `luna-worker`; Terra is not an automatic fallback. Stop for human confirmation
before rotating secrets, changing permissions, creating a second environment, modifying authentication/admin
authority, deleting data, deploying production configuration or accepting material new cost.

---

# Historical completion record — TP-BETA-001

- Goal ID: `TP-BETA-001`
- Status: `COMPLETE — CODE_READY`（approved PR #111 merged）
- Governance: `TP-GOV-2.0.0`
- Started: `2026-08-06`
- Release boundary: code-ready for closed beta; no deployment or publication

The controller approved planning PR #9 on `2026-08-06`. M1–M5 are complete. Under TP-D039,
official/operator material governs management and restriction facts while Sol-reviewed community tracks
may provide geometry for the routes they actually record. Five full reviewed-track Variants and one Wutai
blocked record are merged through PRs #79–#82/#87. I13's permanent-ID catalog resolver merged through
PRs #88/#89 as `c5d7d7c`, closing #22 and M3. I20's reducer/service seam merged through PRs #70/#71.
M6 is complete. The human released the earlier pause and replaced the temporary Terra fallback with the exact
custom Agent `luna-worker`. I21 implementation and two bounded Review-fix rounds passed two independent Sol final
reviews, latest-head quality, and squash merged through PR #93 as `be24b07`; GitHub #30 is closed.
I22b PR #98 then passed two bounded Review-fix rounds, complete local WeChat DevTools visual evidence,
latest-head quality and independent Sol Review, and squash merged as `852e86d`; #95 and parent #31 are closed.
I23a private-history idempotency merged through PR #102 as `107fab4`; I23b bounded recovery passed two independent
final Reviews and merged through PR #103 as `097c921`. #99, #100 and parent #32 are closed. I24 planning PR #104
merged as `6869a7b`; its serial children then merged through PRs #108–#110. I24c/#107 and parent #33 are closed at
`main@1bba5f9`, with unavailable DevTools rows truthfully retained as `UNVERIFIED_RUNTIME_TOOL`. The Sol-owned
I25/#34 Goal-wide Review is approved; PR #111 merge makes the completion report and M7 code-ready conclusion effective.

## 1. Objective

Deliver a reproducible, reviewable WeChat mini-program that uses verified route context, hourly weather, and deterministic rules to produce `go`, `caution`, `no_go`, or an explicit unavailable state. AI may explain but cannot change trusted facts or verdicts.

## 2. Background and current state

The Taro app and two CloudBase functions are the current product. Engineering gates, wind units,
trip date windows, route type propagation, fuzzy confirmation, hourly evaluation and deterministic
safety composition, trusted second-stage context and private-only history are complete. Five reviewed
community tracks are merged as full RouteVariants; the fifth route's planning PR #86 froze its contract,
and implementation PR #87 passed main-controller and second independent Sol Review plus latest-head
quality, then squash merged as `4c17f45` and closed #77. The RouteVariant-backed input/result experience
remains. I20's explicit reducer and getAdvice service seam is complete. I13 now owns the production catalog
and pure resolver;
I21's dependency was satisfied and its public cutover is merged through PR #93. I22 planning PR #96 merged as
`ac4ba9e`; I22a PR #97 passed latest-head quality and independent Sol Review, merged as `6e12f25`, and closed #94.
I22b merged through PR #98 as `852e86d`. I23a/I23b merged through PRs #102/#103, completing the recovery flow.
I24's serial #105 compatibility cleanup, #106 automated acceptance and #107 DevTools evidence package are complete.
I25/#34 completed the Goal-wide Review with two independent `APPROVED` results and no P0–P3 finding. Its docs-only
PR #111 makes the code-ready completion verdict effective when merged.

Current verified baselines are route type `91/0`, weather `86/0`, unit `55/0`, and offline integration `55/0` after
I24a retires two legacy advice weather/sun checks and replaces them with one structured non-exposure check. The
GitHub `quality` check runs install, lint, typecheck, tests, integration, and the WeChat build on every PR.

## 3. Read first

Follow the mandatory order in `AGENTS.md`; it is the only file that defines session reading order. After the governance and active-task files, read the product, architecture, development, testing, workflow and collaboration documents named by the active Issue.

## 4. Scope

In scope: minimal engineering gates; fuzzy confirmation; deterministic safety merge; `Place / Route / RouteVariant`; five curated pilot variants whose geometry may come from reviewed community tracks, plus one official blocked record; multi-point hourly weather; deterministic verdicts; server-owned `queryId`; private history and public UGC shutdown; explicit frontend states; final integrated review.

Out of scope: deployment, publication, live beta research, native apps, multilingual, social/community, payment, H5 sharing, in-trip navigation, rescue coordination, climbing instruction, Taro major upgrades, destructive data migration, and broad visual redesign.

## 5. Milestones

| Milestone | Status | Issues | Done when |
|---|---|---|---|
| M1 Engineering gate | Complete | I01–I03 | Fresh install, unified commands, CI and PR protection work |
| M2 Correctness | Complete | I04–I06 | Response phases, confirmation and deterministic safety merge are tested |
| M3 Route domain | Complete | I07–I13 | Domain model, five sourced variants, blocked record and permanent resolver are merged |
| M4 Weather and verdict | Complete | I14–I16 | Hourly windows and `TP-VERDICT-1` are deterministic |
| M5 Trust and privacy | Complete | I17–I19 | `queryId` is server-owned; history is private; public UGC is disabled |
| M6 Core UX | Complete | I20–I23 | Explicit states, inputs, results and recovery form a complete flow |
| M7 Acceptance | Complete on PR #111 merge | I24–I25 | Full validation, documentation sync and Goal report are complete |

The exact Issue contracts and dependency graph are defined in `docs/development-plan.md`. I10a's
official Wutai blocked record remains complete; the former small-pilgrimage full route is superseded,
and #77 delivered the reviewed KML-backed fifth plannable pilot. I13 PR #89 merged as `c5d7d7c` and
closed #22, completing M3. I21 planning PR #90 merged as `c817bbb`; implementation PR #93 merged as
`be24b07` and closed #30. I22 planning PR #96 merged as `ac4ba9e`; #94 merged as `6e12f25`; #95 and parent
#31 closed after PR #98 merged as `852e86d`. I23a/#99 and I23b/#100 then merged through PRs #102/#103 and parent
#32 closed. I24 planning PR #104 merged as `6869a7b`; I24a PR #108 merged as `1a2f485`; I24b PR #109 merged as
`f311d1b`; I24c PR #110 merged as `1bba5f9`, closing #107 and parent #33. I25/#34 Review is complete; the controller
closes #34 and M7 after approved PR #111 merges.

## 6. Agent routing

Sol XHigh owns design, contracts, scheduling, review, merge decisions, escalations and final acceptance. The
bounded implementation executor is the custom Agent named `luna-worker`, loaded from
`~/.codex/agents/luna-worker.toml` and configured for `gpt-5.6-luna` with `max` reasoning. Terra's completed
work remains valid history, but Terra is no longer an automatic fallback and requires new explicit human
authorization. Implementation Agents cannot change Goal scope, public contracts, architecture, dependency
policy, or acceptance criteria and cannot merge their own PRs.

## 7. PR and quality rules

One Issue, one primary objective, one `codex/<issue-id>-<slug>` branch, one focused PR, squash merge. About 400 non-generated changed lines or 10 files is a reviewability signal rather than a mechanical limit. Every changed behavior needs a meaningful test. Default gates are install, lint, typecheck, unit, integration, and WeChat build once M1 defines them.

## 8. Stop conditions

Stop and request human confirmation for deployment, production configuration, secrets, destructive or irreversible data operations, authentication/privacy changes not already authorized by TP-D008, major stack replacement, material new cost, Goal-level product trade-offs, or inability to meet route source policy. I19's non-destructive private-history and UGC-path closure is already authorized. Escalate to Sol XHigh for contract drift, public API changes, major dependencies, cross-module failures, scope growth, or two failed review-fix rounds.

## 9. Completion

The Goal is complete only when I01–I25 plus replacement child #77 are closed with compliant review evidence, `main` quality gates are green, five verified variants and the Wutai blocked record meet the hybrid source policy, all trusted/degraded flows are testable, documentation matches implementation, no Goal P0/P1 blocker is hidden, and a final report records milestones, PRs, tests, decisions, limitations, risks, debt, follow-ups, and release recommendation. Deployment and real-device beta execution are not required.
