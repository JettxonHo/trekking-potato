# ACTIVE TASK — C03 fail-closed administrator review and retention

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — C03 IMPLEMENTATION_ACTIVE`
- Milestone: `TP-COMMUNITY-001 Community track evidence` (#8)
- GitHub Issue: `#120`
- Status/Mode: `IMPLEMENTATION_ACTIVE / IMPLEMENTATION`
- Controller: Sol XHigh
- Implementation executor: exact custom Agent `luna-worker`
- Branch: `codex/120-track-admin-retention`
- Base: `main@75fcd92`
- Dependency: C02/#119 completed through approved PR #125 (`75fcd92`)

## 1. Objective

Implement fail-closed administrator list/detail/review, a key-isolated de-identified reviewed-evidence record and the
internal 30/180-day retention cleanup branch. Approval creates only `community_track_candidate`; it never publishes a
route, changes operational status or assigns tier B.

## 2. Required reading

Read the mandatory governance sequence, live #115/#120, `docs/community-track-workflow.md` §§5–10 and
`docs/development-plan.md` C03. `TRACK-SUBMISSION-1` remains the authority for modes, errors, exact DTOs, records,
state/action order, retention, deletion-pending behavior and tests.

## 3. Exact allowlist

- `cloudfunctions/trackSubmission/index.js`
- `cloudfunctions/trackSubmission/package.json`
- `cloudfunctions/trackSubmission/package-lock.json`
- `cloudfunctions/trackSubmission/response-contract.js`
- new `cloudfunctions/trackSubmission/admin-service.js`
- `cloudfunctions/trackSubmission/submission-repository.js`
- `cloudfunctions/trackSubmission/submission-lifecycle.js`
- new `cloudfunctions/trackSubmission/reviewed-evidence.js`
- new `cloudfunctions/trackSubmission/retention.js`
- root `package.json`
- new `scripts/track-admin-contract-test.js`
- new `scripts/track-retention-contract-test.js`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

No other file may change without a controller-owned contract update.

## 4. Non-scope

Frontend/user/admin UI, deployment, real CloudBase collection/index/rule/env/timer mutation, production cleanup,
public raw URL, client admin flags, catalog writes/tier assignment, owner identity disclosure, new auth, new dependency,
parser changes, URL/KMZ import, third-party scraping and changes to the merged C02 owner contract.

## 5. Frozen constraints

- Parse exact server-only comma-separated `TRACK_REVIEW_ADMIN_OPENIDS`; missing, blank or malformed configuration
  fails `admin_not_configured`. Authorization uses only server `getWXContext().OPENID`; forged event roles/openids
  have zero side effects. Values never enter DTO, record, log or error detail.
- Expose only the C03 additions `admin_list`, `admin_get` and `admin_review` through the existing handler. Internal
  retention dispatch is not a public mode and requires server-owned `TRIGGER_SRC='timer'` plus empty server OpenID.
- `admin_list/admin_get` use exact admin DTOs, status/action order, server-side cursor/limit filters and logical expiry.
  Owner OpenID, rights/provenance, file IDs/paths, temporary URLs, evidence keys and raw coordinates outside the exact
  reviewed display projection never leak.
- Raw access is an explicit administrator detail action only, requires an unexpired immutable review object, and uses
  a temporary URL with maximum age 300 seconds. No list DTO contains a raw link.
- `admin_review` requires `pending_review`, unexpired raw, immutable review state `present`, exact version and a random
  `reviewAttemptId`. Same-attempt replay is first-write-wins and returns the stored result; changed payload cannot
  rewrite it. Review/cancel races resolve by status+version CAS.
- `request_changes` stores only the bounded review decision/note required by the frozen record and never creates
  evidence. `reject` enters the frozen cleanup path. `approve` creates `community_track_candidate` only.
- Approved evidence is a separate ADMINONLY record whose random `serverEvidenceKey` exists only as
  `track_review_evidence._id`. It contains no submission ID, OpenID, raw/file/provenance reference or timestamp samples.
  Submission/DTO/log/catalog never stores or returns that key; the submission stores only `evidenceExpiresAt` and the
  keyless display fields explicitly frozen for admin detail.
- `rawExpiresAt` is fixed at review snapshot plus 30 days and never extended. Approved evidence expires 180 days after
  approval. Logical expiry removes read/review authority before physical cleanup; no path silently extends either.
- Internal retention uses injected clock/storage/repositories, max 20 records per batch, exact cursor/CAS, duplicate
  delivery safety and honest deletion-pending recovery. It never relies on exactly-once timer delivery and never
  removes non-expired data.
- The C06-only deployment/index/timer/permission work remains separate. Tests are offline seams and do not mutate the
  configured staging environment.
- No SHA/hash, automatic catalog publication, opening/safety/weather/verdict inference, compatibility API or new
  persistent linkage may be introduced.

## 6. TDD acceptance matrix

Register `test:track-admin` and `test:track-retention` in root `npm test`. Record real RED before GREEN. Tests must
prove at least:

- missing/blank/malformed admin config, non-admin, forged identity/role and public timer-shaped input all fail closed
  with zero repository/storage/evidence side effects;
- exact admin config trimming/deduplication, server OpenID authorization and no allowlist disclosure;
- exact `AdminList/AdminListItem/AdminDetail/ApprovedEvidenceDisplay` keys, eight status/action rows, cursor order,
  filters/limits and post-deadline zero projection;
- raw link only from the immutable review object, explicit action, unexpired deadline and maxAge 300; missing/deleted/
  expired raw is `raw_unavailable` without exposing SDK URLs/details;
- review version/status/CAS, cancel race, same-attempt first-write-wins replay and different-attempt terminal rejection;
- request-changes, reject and approve transition facts; approve produces no product fact beyond
  `community_track_candidate` and never mutates route/catalog/status/tier;
- evidence key isolation in both directions with mutation-sensitive literal key tests: submission/DTO/log/catalog has
  no evidence key, evidence has no submission/OpenID/raw/provenance linkage;
- exact 30-day raw and 180-day evidence boundaries, no deadline extension, day-edge behavior and logical zero access
  before physical cleanup;
- timer authority (`TRIGGER_SRC='timer'` + empty server OpenID), forged/client denial, max-20 `limit+1` pagination,
  cursor/backlog, CAS loss, duplicate delivery, already-missing object idempotency and deletion-pending repair;
- approved raw cleanup preserves evidence; evidence expiry deletes only the de-identified record; terminal immediate
  cleanup follows the merged C02 pending-before-delete invariant;
- exact handler and CloudBase repository/evidence transaction/query seams are behavior-tested; the merged C01/C02
  focused tests and all repository gates remain green.

Required commands:

- `corepack npm@10.9.2 run test:track-admin`
- `corepack npm@10.9.2 run test:track-retention`
- `corepack npm@10.9.2 run test:track-owner`
- `corepack npm@10.9.2 run test:track-parser`
- `corepack npm@10.9.2 test`
- `corepack npm@10.9.2 run test:integration`
- `corepack npm@10.9.2 run lint`
- `corepack npm@10.9.2 run typecheck`
- `CI=1 corepack npm@10.9.2 run build:weapp`
- `git diff --check`

## 7. Dependency and merge order

C02/#119 is merged. C03 is the only active child and blocks C04/#121. No parallel work may modify
`cloudfunctions/trackSubmission`, its package/lock, response contract or lifecycle while C03 is active.

## 8. Escalation and stop conditions

Stop and return to Sol if CloudBase cannot implement fail-closed server allowlist, status/version review CAS,
key-isolated evidence or timer-only cleanup through injected seams; if exact DTO/error/retention/public authority must
change; if a new dependency, collection schema outside the frozen records, permission broadening, destructive staging
operation, catalog write or deployment is required. Do not choose a weaker trust boundary silently.

## 9. Allowed autonomous choices

Internal pure helper layout, injected seam names, test fixture organization and implementation sequencing inside the
exact files are allowed. Public modes/fields/errors/messages, retention periods, evidence linkage, authority, action
order, side-effect order and dependencies are frozen.

## 10. Deliverables

Return code, exact tests, actual files, RED/GREEN, full command results, deviations, autonomous decisions, known
limits/risks and a focused draft PR using `Refs #120`. The executor cannot approve or merge its own PR.

## 11. Controller activation checkpoint — 2026-08-09

```text
Governance version: TP-GOV-2.0.0
Goal ID and status: TP-COMMUNITY-001 / ACTIVE — C03 IMPLEMENTATION_ACTIVE
Active milestone: TP-COMMUNITY-001 Community track evidence / C03
Active Issue and mode: #120 / IMPLEMENTATION
Current branch and base: codex/120-track-admin-retention / main@75fcd92
Working tree before activation: clean
Dependency: #119 closed after approved PR #125 merged as 75fcd92
Implementation routing: exact custom Agent luna-worker only; Terra fallback prohibited
```

The activation commit is controller-owned and contains no C03 implementation code. `luna-worker` must re-read all
required sources, verify the branch/worktree, run baselines, report the mandatory handshake and capture a real focused
RED before implementing GREEN.
