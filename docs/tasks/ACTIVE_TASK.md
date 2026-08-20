# ACTIVE TASK — #137 fail-closed retention dry-run

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — C08 REVIEW_ACTIVE`
- Milestone: `C08 Retention dry-run` under community-track staging evidence (#123/#115)
- GitHub Issue: `#137`
- Status/Mode: `READY_FOR_CONTROLLER_REVIEW / REVIEW`
- Controller: Sol XHigh + human operator
- Branch/base: `codex/137-retention-dry-run` from `main@0db92b0`
- Executor: exact custom `luna-worker`, configured `gpt-5.6-luna` / `max`; runtime identity must be reported separately

## 1. Objective and current truth

Add a server-only, fail-closed retention dry-run before any timer creation or destructive cleanup gate. Existing
retention code performs real cleanup when its timer authority is satisfied; the repository has no timer configuration
and the official read-only DevTools CLI query does not expose trigger details. Staging `trackSubmission` is `Active`
with a 60-second timeout and Node.js 16.13, but timer schedule/timezone/status remain unverified.

Only exact `TRACK_RETENTION_MODE=delete` may select the existing destructive path. Missing, empty, malformed or any
other value selects dry-run. This Issue is local code/test/docs work only; S8–S15 remain `BLOCKED` until separately
reviewed staging evidence and the required human gates exist.

## 2. Exact allowlist

- `cloudfunctions/trackSubmission/retention.js`
- `scripts/track-retention-contract-test.js`
- `scripts/fixtures/track-acceptance.js` (test-only: add exact `TRACK_RETENTION_MODE=delete` to preserve the existing destructive C06 regression)
- `docs/community-track-workflow.md`
- `docs/testing-strategy.md`
- `docs/community-track-staging-validation.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`
- `GOAL.md` (controller lifecycle/status only)

No other production/test/doc/dependency/config file may change. Escalate before widening.

## 3. Frozen behavior and privacy contract

- Timer authority remains exact server-owned `TRIGGER_SRC=timer` plus empty server OpenID. Event-body values never
  grant authority.
- Only exact server env `TRACK_RETENTION_MODE=delete` can perform the existing cleanup path.
- All other/missing values perform a bounded dry-run preview/return with at most 20 total submission/evidence rows.
  Existing repository pagination may inspect one read-only continuation sentinel (including a `limit:0` evidence peek
  when exactly 20 submissions fill the budget); that extra row is excluded from counts/preview data and is never mutated.
- Dry-run may execute due-list reads only. Submission update/remove, evidence remove and storage delete calls are zero.
- Dry-run returns only fixed success/mode, bounded counts, has-more/current-time and existing opaque cursor fields.
  It never returns records, identifiers, file/path/URL values, coordinates, private inputs, env values, secrets or
  provider messages. Sanitized staging evidence must not record cursor token values.
- Exact delete mode preserves the already-tested 30/180-day behavior; this Issue does not enable or invoke it.

## 4. Pre-agreed TDD seams and acceptance

Test through:

1. `createRetentionService.handle/run` with injected repository, evidence repository, storage and clock boundaries;
2. `createTrackSubmissionHandler` internal timer routing and forged-client rejection;
3. existing production-shaped CloudBase due-list/query seams only where needed to prove read-only scanning.

Required behavior evidence:

- Real focused RED before production edits, then minimal GREEN in vertical slices.
- Missing/empty/typo mode dry-run; exact delete mode retains existing behavior.
- Before/at expiry, pending cleanup, evidence expiry and a 21-row backlog report truthful bounded counts/has-more/
  cursors while issuing zero writes/removes/deletes.
- An exact-20 submission page performs only the approved one-row evidence lookahead: 20+1 returns `hasMore=true` with a
  usable submission cursor and no evidence cursor, while 20+0 returns `hasMore=false` with both cursors `null`.
- Forged OpenID/event and non-timer environment remain fail-closed.
- Mutations that default to delete, leak a dry-run write/delete, bypass max 20/authority, or remove/mislabel the approved
  evidence lookahead must turn the focused contract RED and be restored.
- Focused retention, root tests, integration, lint, typecheck, fixture-free WeChat build, diff-check, secret/privacy
  scan and root dependency audit pass.

## 5. Non-scope and stop conditions

No CloudBase function deployment/invocation, timer creation/enablement, destructive cleanup, environment mutation,
collection/index/rule/schema/API/dependency change, broad residue scan, public/production release, real user/identity/
location data, or viewer work. Stop on any contract conflict, required scope widening or need for a new external gate.

## 6. Deliverable

Return `READY_FOR_CONTROLLER_REVIEW` with RED/GREEN/mutation evidence, exact files and full gates. The executor cannot
approve or merge. Sol requires two fresh independent Reviews and latest-head CI before merge. Deployment and any
staging dry-run invocation remain separate controller actions; delete mode and timer enablement retain later human gates.

## 7. Final Review checkpoint — 2026-08-20

- The human-authorized final round fixed the remaining carried-evidence-cursor branch: an unconsumed continuation now
  returns the exact validated opaque input token rather than the decoded cursor object.
- The natural regression `5 submissions + 15/21 evidence -> 20 submissions -> 1 submission + 6 evidence` proves exact
  token preservation, complete duplicate-free continuation, no evidence-key/identifier leakage and zero writes/deletes.
  Reverting to the decoded object produced a focused RED and was restored.
- Focused/root/integration, lint, typecheck, fixture-free build, diff/allowlist/privacy/secret scans and npmjs audit pass.
  Two fresh independent Reviews returned `APPROVED` with no P0–P3.
- Current status is `READY_FOR_CONTROLLER_REVIEW`. The next action is controller commit/push and a draft PR, followed
  by latest-head CI and two exact-head actual-diff Reviews. No deployment, timer action, CloudBase invocation, delete
  mode or data mutation is authorized.
