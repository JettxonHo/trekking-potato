# ACTIVE TASK — I25 Goal 统一 Review 与完成报告

- Goal: `TP-BETA-001`
- GitHub Issue: `I25 / #34`
- Status/Mode: `APPROVED — COMPLETE_ON_MERGE / FINAL_REVIEW_COMPLETE`
- Controller and reviewer of record: Sol XHigh
- Branch: `codex/34-goal-final-review`
- Base: `main@1bba5f9`
- Dependencies: I01–I24 complete; #105/#106/#107 and parent #33 closed; deployment and real beta remain out of scope

## 1. Objective

Perform the one Goal-wide final Review required after all implementation and I24 acceptance work. Decide whether
`TP-BETA-001` meets its code-ready completion standard across product scope, architecture, data provenance, public
contracts, tests, GitHub workflow, documentation, known risks and maintainability. Produce a durable completion
report without mixing ordinary implementation fixes into the report PR.

This task is controlled and authored by Sol XHigh. `luna-worker` does not approve the Goal or write implementation
code in I25. Independent read-only reviewers may audit bounded dimensions and return findings; Sol integrates the
evidence and owns the final verdict.

## 2. Final committed allowlist

- new `docs/goal-completion-report.md`
- `README.md`
- `GOAL.md`
- `docs/product-requirements.md`
- `docs/architecture.md`
- `docs/current-status.md`
- `docs/development-plan.md`
- `docs/testing-strategy.md`
- `docs/decision-log.md`
- `docs/tasks/ACTIVE_TASK.md`
- `docs/beta-acceptance-report.md` only if its post-merge status needs factual synchronization

No production code, existing test, fixture, route data, dependency, CI, package/config or generated output may change
in the I25 report PR. A required code correction becomes a separate focused Issue/PR and blocks completion until it
merges and the affected review is repeated.

## 3. Required review dimensions

Sol must review and record:

1. Goal, milestone and Issue completion, including replacement child #77 and parent/child closures.
2. PR compliance: focused scope, required Review/CI evidence and merged state for the Goal delivery chain.
3. Product requirements: five exact full pilots, official Wutai blocked record, confirmation/place/blocked/insufficient
   flows, four verdict labels, minimum gear, private history, recovery and AI explanatory boundary.
4. Architecture: structured `beta_base_v2`, trusted server `queryId`, TripContext v2/openid/TTL, deterministic weather
   and verdict ownership, source DTOs, ten-state frontend and no duplicate compatibility implementation.
5. Route/source integrity: exact current pilot IDs, source tier/status policy, reviewed community track boundary,
   no inference that `unknown` means open, and no stale superseded pilot identity.
6. Quality: final `main` commands, CI state, build, contract/integration coverage, residue checks and visible failures.
7. Security/privacy in proportion to actual risk: server-owned facts, openid-private history, disabled public UGC,
   queryId-only advice and no secret/production/deployment change; do not introduce speculative hardening or hashes.
8. Performance/stability/maintainability: material regressions, duplicate modules, temporary paths, stale compatibility,
   recovery/race handling and documented deployment boundary.
9. Documentation consistency across README, Goal, product, architecture, plans, tests, decisions, status, acceptance
   checklist/report and actual implementation.
10. Known limitations, technical debt, unverified runtime evidence and the recommendation for entering deployment.

## 4. GitHub audit

- Enumerate all Goal Issues and support/replacement Issues; explain any issue that remains open.
- Confirm all planned implementation parents/children are correctly closed before #34.
- Confirm no Goal PR remains open and record the key merged PR chain rather than hiding planning/review PRs.
- Treat GitHub live metadata as the fact source for state and latest checks; do not persist a self-staling current run
  ID as a completion condition.
- Close #34 only after the approved report PR merges.

## 5. Final commands

Run from clean `main@1bba5f9` before writing the conclusion, and rerun on the report branch when documentation is done:

- `node docs/evidence/i24/repeated-prepare-probe.js`
- `npm run test:beta-acceptance`
- `npm test`
- `npm run test:integration`
- `npm run lint`
- `npm run typecheck`
- `npm run build:weapp`
- `git diff --check`

Also run focused route-domain/data and any directly relevant privacy/recovery contracts needed to validate report
claims. Record exact outcomes and existing warning counts. Do not hide expected degraded-path logs or failures.

## 6. Report requirements

`docs/goal-completion-report.md` must include:

- final verdict and the exact code-ready boundary;
- completed milestones and delivered features;
- Issues and Pull Requests summary;
- final test/build/CI results;
- key product and technical decisions and architecture changes;
- resolved problems;
- current known limitations;
- residual risks and technical debt;
- incomplete/out-of-scope items;
- recommended next work;
- explicit release/deployment-stage recommendation.

The report must distinguish `UNVERIFIED_RUNTIME_TOOL` from a failed behavior and from a verified GUI pass. It must not
claim deployment, real CloudBase, device execution or real-user beta. If the completion verdict is conditional, state
the exact condition and whether it is inside or outside this Goal.

## 7. Stop and escalation conditions

Return `BLOCKED` or `ESCALATE_TO_HUMAN` rather than completing when there is an undisclosed P0/P1, failed required
main gate, unresolved architecture conflict, missing trusted route evidence, incorrect Issue/PR state, product trade-off,
production/deployment operation, or a code fix needed inside the Goal. Do not lower acceptance or relabel a missing
runtime observation as passed.

P2/P3 documentation-only findings may be fixed in this report PR if they remain within the allowlist and do not alter
product behavior or architecture. Any ordinary code change requires a new Issue/PR.

## 8. Delivery and approval

Use additive commits only. Create one focused draft PR with `Refs #34`; do not auto-close the Issue. Obtain latest-head
quality and at least two independent read-only final-review inputs covering different dimensions. Sol must inspect the
actual final diff and evidence, then return one of `APPROVED`, `CHANGES_REQUESTED`, `BLOCKED` or
`ESCALATE_TO_HUMAN`. Only an approved squash merge may close #34, mark M7/Goal complete and publish the final report
to the user. Deployment is a separate future stage and requires human authorization.

## 9. Controller activation checkpoint — 2026-08-09

I24c PR #110 merged as `1bba5f9` after latest-head quality and two independent `APPROVED` Reviews. #107 and parent
#33 are closed. The I25 branch starts from that exact main. The final Review is Sol-owned; no implementation Agent is
assigned, and Terra fallback is irrelevant to this read-only/report task.

## 10. Controller review checkpoint — 2026-08-09

Three bounded audits covered product/frontend/evidence, architecture/data/privacy and GitHub state. No undisclosed
Goal P0/P1 was found. Documentation lifecycle drift was synchronized within the expanded docs-only allowlist; stale
M3/M6 milestones were closed while M7 remains open for #34. Final local gates pass, and
`docs/goal-completion-report.md` records the code-ready verdict, dependency advisories, unavailable runtime rows,
Goal-external #83/#84 and deployment-stage follow-ups. The task is ready for its focused PR, latest-head quality and
independent final report Review; it is not complete or deploy-authorized yet.

## 11. Final approval checkpoint — 2026-08-09

PR #111 passed latest-head quality. Two independent exact-head Reviews returned `APPROVED` with P0–P3 none after
the only lifecycle-metadata finding was fixed. This final docs-only status commit makes I25, M7 and TP-BETA-001
complete when the approved PR merges. Sol then closes #34 and M7; no deployment, production or real-beta authority
is created by that merge.
