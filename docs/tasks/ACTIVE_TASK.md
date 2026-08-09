# ACTIVE TASK — staging CloudBase deployment validation

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-STAGING-001 / COMPLETE_ON_MERGE — CONDITIONAL_GO`
- GitHub Issue: `#114`
- Status/Mode: `READY_FOR_CONTROLLER_REVIEW / CONTROLLER_REVIEW`
- Controller/executor: Sol XHigh (environment validation is not delegated implementation)
- Branch: `codex/114-staging-validation`
- Base: `main@da18b68`

## 1. Objective

Validate the existing `cloud1-d0gtzgqzh9c128aaf` environment as a pre-production staging boundary before inviting
5–10 closed-beta users. Produce durable evidence and a bounded Go/No-Go decision without calling the system
production-ready.

## 2. Authority and environment interpretation

The completed `TP-BETA-001` remains the code-ready baseline. For this Issue, the existing single `cloud1` environment
is the staging candidate because it already contains the user-configured `trip_contexts` and `history` collections,
the deployed `getAdvice` and `history` functions, and the configured mini-program AppID. No production environment is
known to exist. Creating another environment or changing this interpretation in a way that incurs cost requires human
confirmation.

## 3. Allowlist

- `GOAL.md`
- `docs/tasks/ACTIVE_TASK.md`
- `docs/current-status.md`
- new `docs/staging-deployment-validation.md`
- `docs/decision-log.md`

No product code, cloud-function code, package/lock file, route catalog, CI configuration or generated build output may
change in #114. Any production defect found by validation must become a separate Issue and PR.

## 4. Validation matrix

### Environment and identity

- exact AppID and CloudBase environment binding;
- deployed function names/status/runtime/timeout and current invocation logs;
- real openid-scoped TripContext and private history behavior;
- distinction between the one staging candidate and a nonexistent production environment.

### Data and storage

- `trip_contexts` and `history` existence and effective client permissions;
- storage bucket access policy and suitability for a later private GPX/KML submission flow;
- index observations and proportional closed-beta limits;
- no record deletion, permission mutation or irreversible migration.

### Runtime and external dependencies

- at least one real full-route `prepare → queryId → advice` flow with hourly Open-Meteo data;
- real private history save/list smoke;
- getAdvice/history recent logs and failures;
- configured key presence only, never secret values;
- current dependency audit and runtime warnings.

### Route and cutover safety

- refresh each pilot's current management status from primary official/operator sources;
- do not infer route openness from GPX/KML geometry, an adjacent attraction, a race or AI output;
- verify v2 TripContexts are created after deployment and allow old v1 records to expire naturally;
- freeze rollback to the last known-good v2 deployment, not the retired v1 contract.

## 5. Acceptance

- evidence names what was actually observed and distinguishes DevTools/live evidence from offline fixtures;
- latest root tests, integration, lint, typecheck and WeChat build pass;
- no secret value is copied into the repository, GitHub or user-facing report;
- plaintext keys observed in the console are rotated before closed-beta invitations;
- unresolved management status is disclosed and excluded from the initial cohort where necessary;
- final report returns `GO`, `CONDITIONAL_GO` or `NO_GO` for the existing staging candidate.

## 6. Stop conditions

Stop and ask the human before:

- rotating or replacing secret values;
- changing AppID, environment ID, database/storage permissions or admin identity;
- creating a second environment or accepting material cost;
- deleting/migrating records or changing production configuration;
- upgrading Taro, Node runtime or CloudBase SDK dependencies;
- claiming a route is open without exact-route primary evidence.

## 7. Session handshake — 2026-08-09

```text
Governance version: TP-GOV-2.0.0
Goal ID and status: TP-STAGING-001 / ACTIVE — STAGING_VALIDATION
Active milestone: staging cutover validation
Active Issue and mode: #114 / CONTROLLER_EXECUTION
Current branch and base commit: codex/114-staging-validation / main@da18b68
Working tree status: clean before documentation activation
Required documents read: AGENTS, GOAL, current-status, MASTER_PLAN, AGENT_EXECUTION_PROTOCOL,
  PLAN_SYNC_PROTOCOL, previous ACTIVE_TASK, product/architecture/testing/completion documents
Baseline commands run: npm test PASS; git diff --check PASS before edits
Blocking inconsistencies: previous ACTIVE_TASK still referenced completed #112 and is replaced by this contract
```

## 8. Validation checkpoint — 2026-08-09

- The Taro production interface is opened from `taro-app` with AppID `wx5a3fb7bfbe985a60` and initializes the exact
  `cloud1-d0gtzgqzh9c128aaf` environment. The repository still contains a separate legacy native project config;
  cleanup Issue #83 / stale conflicting PR #84 remains outside this Issue.
- CloudBase currently exposes one environment only. `getAdvice` and `history` are normal ordinary cloud functions on
  Node.js 16.13, 256 MB; `getAdvice` has a 60-second timeout. Recent observed invocations for both functions returned
  successful status codes.
- `trip_contexts` and `history` exist with administrator-only direct database access. The live UI created current v2
  TripContexts and successfully saved/listed private history for the current openid. No record was deleted.
- The storage bucket is private to each creator and administrators. This is compatible with a future private
  submission workflow, but no community upload path or storage permission change is part of #114.
- A real Wugong full-route query rendered multi-point hourly Open-Meteo data, a deterministic `no_go` result, trusted
  route/weather sources and an asynchronous AI explanation. Offline `test:beta-acceptance` covers all five pilots;
  the report must not present that fixture-backed matrix as five live cloud invocations.
- Console inspection exposed environment-variable values in plaintext. Values were not copied into project files or
  Issue text. Both external-service keys must be rotated before inviting closed-beta users.
- Current audits remain: root production dependencies report zero advisories; the Taro tree reports 46 transitive
  advisories and each Cloud Function tree reports 6. No current exploit was demonstrated, but dependency reachability
  and runtime upgrades remain deployment-stage debt and block any production-readiness claim.

Status remains `VALIDATION_ACTIVE`; route-source refresh, current v2 behavior and the final command matrix are now
recorded. Human credential rotation, the post-rotation smoke, the final drain timestamp and the first-cohort route
allowlist remain open.

## 9. Local gate checkpoint — 2026-08-09

- `npm test` — PASS, including five-pilot Beta acceptance.
- `npm run test:integration` — PASS `55/0`; this remains the legacy offline pipeline and is not mislabeled live.
- `npm run lint` — PASS with `0` errors and `9` existing warnings.
- `npm run typecheck` — PASS.
- `CI=1 npm run build:weapp` — PASS with Taro `4.0.9`.
- Official npm audit results: root `0`; Taro app `46`; `getAdvice` `6`; `history` `6` transitive advisories.

The controller has also created blocked follow-up Issue #115 for the approved private community-track direction. It
cannot enter implementation until #114 closes. The human has approved the server-only
`TRACK_REVIEW_ADMIN_OPENIDS` authority mechanism and instructed the first cohort to exclude Gongga; no identifier or
secret value may enter GitHub or repository documents.

## 10. Final validation checkpoint — 2026-08-09

- The human confirmed `AMAP_KEY` and `LLM_KEY` were rotated and the current package covers the closed-beta period.
- A fresh normal DevTools Wugong request after rotation returned full route data, multi-point hourly weather, a
  deterministic `no_go`, a new v2 query context and successful queryId-only AI advice around 12:22–12:24 CST.
- Successful v2 requests were observed at approximately 11:48 and 12:24 CST, exceeding the logical 30-minute context
  window. No records were deleted and rollback remains v2-only.
- The first cohort is frozen to Wugong, Siguniang, Blue Moon Valley–Yunshanping and Dangling with management status
  still visible as `unknown`; Gongga is excluded and Wutai Grand Pilgrimage remains blocked.
- Post-rotation AMap fallback is `UNVERIFIED_RUNTIME_TOOL` because the local runtime tool could not reliably edit the
  nested route field. It is not required by the four-route cohort and is not claimed as verified.
- Result: `READY_FOR_CONTROLLER_REVIEW — CONDITIONAL_GO`. This does not authorize production/public release or the
  deployment of the community submission function.
- Final branch-local gates pass: `npm test`; integration `55/0`; lint `0 errors / 9 existing warnings`; typecheck;
  `CI=1 npm run build:weapp`; and `git diff --check`.
