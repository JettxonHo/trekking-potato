# TP-BETA-001 — 徒步薯核心 Beta

- Goal ID: `TP-BETA-001`
- Status: `ACTIVE`
- Governance: `TP-GOV-2.0.0`
- Started: `2026-08-06`
- Release boundary: code-ready for closed beta; no deployment or publication

The controller approved planning PR #9 on `2026-08-06`. The Goal is active at M1; business implementation remains gated until I01–I03 complete.

## 1. Objective

Deliver a reproducible, reviewable WeChat mini-program that uses verified route context, hourly weather, and deterministic rules to produce `go`, `caution`, `no_go`, or an explicit unavailable state. AI may explain but cannot change trusted facts or verdicts.

## 2. Background and current state

The Taro app and two CloudBase functions are the current product. Wind units, trip date windows, and route type propagation are fixed. Fuzzy confirmation, route variants, hourly evaluation, trusted second-stage context, private-only history, explicit UI state, and engineering gates remain.

Current verified offline baselines are route type `93/0`, weather `86/0`, and unit `55/0`. The legacy E2E cannot run until dependencies and stale assumptions are repaired.

## 3. Read first

Follow the mandatory order in `AGENTS.md`; it is the only file that defines session reading order. After the governance and active-task files, read the product, architecture, development, testing, workflow and collaboration documents named by the active Issue.

## 4. Scope

In scope: minimal engineering gates; fuzzy confirmation; deterministic safety merge; `Place / Route / RouteVariant`; five verified pilot variants and one blocked record; multi-point hourly weather; deterministic verdicts; server-owned `queryId`; private history and public UGC shutdown; explicit frontend states; final integrated review.

Out of scope: deployment, publication, live beta research, native apps, multilingual, social/community, payment, H5 sharing, in-trip navigation, rescue coordination, climbing instruction, Taro major upgrades, destructive data migration, and broad visual redesign.

## 5. Milestones

| Milestone | Issues | Done when |
|---|---|---|
| M1 Engineering gate | I01–I03 | Fresh install, unified commands, CI and PR protection work |
| M2 Correctness | I04–I06 | Response phases, confirmation and deterministic safety merge are tested |
| M3 Route domain | I07–I13 | Domain model and five sourced variants are usable; legacy places are limited |
| M4 Weather and verdict | I14–I16 | Hourly windows and `TP-VERDICT-1` are deterministic |
| M5 Trust and privacy | I17–I19 | `queryId` is server-owned; history is private; public UGC is disabled |
| M6 Core UX | I20–I23 | Explicit states, inputs, results and recovery form a complete flow |
| M7 Acceptance | I24–I25 | Full validation, documentation sync and Goal report are complete |

The exact Issue contracts and dependency graph are defined in `docs/development-plan.md`.

## 6. Agent routing

Sol XHigh owns design, contracts, scheduling, review, merge decisions, escalations and final acceptance. Luna XHigh is the preferred executor but is unavailable. The controller authorized Terra XHigh as the current executor. Implementation Agents cannot change Goal scope, public contracts, architecture, dependency policy, or acceptance criteria and cannot merge their own PRs.

## 7. PR and quality rules

One Issue, one primary objective, one `codex/<issue-id>-<slug>` branch, one focused PR, squash merge. About 400 non-generated changed lines or 10 files is a reviewability signal rather than a mechanical limit. Every changed behavior needs a meaningful test. Default gates are install, lint, typecheck, unit, integration, and WeChat build once M1 defines them.

## 8. Stop conditions

Stop and request human confirmation for deployment, production configuration, secrets, destructive or irreversible data operations, authentication/privacy changes not already authorized by TP-D008, major stack replacement, material new cost, Goal-level product trade-offs, or inability to meet route source policy. I19's non-destructive private-history and UGC-path closure is already authorized. Escalate to Sol XHigh for contract drift, public API changes, major dependencies, cross-module failures, scope growth, or two failed review-fix rounds.

## 9. Completion

The Goal is complete only when I01–I25 are closed with compliant review evidence, `main` quality gates are green, five verified variants and the Wutai blocked record meet source policy, all trusted/degraded flows are testable, documentation matches implementation, no Goal P0/P1 blocker is hidden, and a final report records milestones, PRs, tests, decisions, limitations, risks, debt, follow-ups, and release recommendation. Deployment and real-device beta execution are not required.
