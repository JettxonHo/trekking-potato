# TP-BETA-001 — 徒步薯核心 Beta

- Goal ID: `TP-BETA-001`
- Status: `ACTIVE — M6 I22a IMPLEMENTATION_ACTIVE`
- Governance: `TP-GOV-2.0.0`
- Started: `2026-08-06`
- Release boundary: code-ready for closed beta; no deployment or publication

The controller approved planning PR #9 on `2026-08-06`. M1–M5 are complete. Under TP-D039,
official/operator material governs management and restriction facts while Sol-reviewed community tracks
may provide geometry for the routes they actually record. Five full reviewed-track Variants and one Wutai
blocked record are merged through PRs #79–#82/#87. I13's permanent-ID catalog resolver merged through
PRs #88/#89 as `c5d7d7c`, closing #22 and M3. I20's reducer/service seam merged through PRs #70/#71.
M6 is now at I22a implementation. The human released the earlier pause, replaced the temporary Terra
fallback with the exact custom Agent `luna-worker`, and planning PR #90 merged as `c817bbb`. I21 implementation
and two bounded Review-fix rounds passed two independent Sol final reviews, latest-head quality, and squash
merged through PR #93 as `be24b07`; GitHub #30 is closed.

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
I21's dependency was satisfied and its public cutover is merged through PR #93. I22 now owns the result
experience over I21's trusted structured BaseData; implementation remains blocked until its planning contract
passes Review and merges from `main@be24b07`.

Current verified baselines are route type `91/0`, weather `86/0`, unit `55/0`, and offline integration `56/0`. The GitHub `quality` check runs install, lint, typecheck, tests, integration, and the WeChat build on every PR.

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
| M6 Core UX | Active — I22a implementation | I20–I23 | Explicit states, inputs, results and recovery form a complete flow |
| M7 Acceptance | Pending | I24–I25 | Full validation, documentation sync and Goal report are complete |

The exact Issue contracts and dependency graph are defined in `docs/development-plan.md`. I10a's
official Wutai blocked record remains complete; the former small-pilgrimage full route is superseded,
and #77 delivered the reviewed KML-backed fifth plannable pilot. I13 PR #89 merged as `c5d7d7c` and
closed #22, completing M3. I21 planning PR #90 merged as `c817bbb`; implementation PR #93 merged as
`be24b07` and closed #30. I22 planning PR #96 merged as `ac4ba9e`; #94 is the only active implementation task,
and #95 remains blocked until #94 is accepted and merged.

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
