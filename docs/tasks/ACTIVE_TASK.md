# ACTIVE TASK — private community track planning

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / PLANNING_PR_OPEN`
- GitHub Issue: `#115`
- Status/Mode: `READY_FOR_CONTROLLER_REVIEW / CONTROLLER_PLANNING`
- Controller: Sol XHigh
- Implementation executor after planning merge: exact custom Agent `luna-worker`
- Branch: `codex/115-community-track-planning`
- Base: `main@b1bc994`

## 1. Objective

Freeze the product, API, data, security, privacy, test and deployment contracts for private community GPX/KML
submission and administrator review. A reviewed submission may become tier-B geometry evidence, but it cannot make a
route searchable, mark it open, change a verdict or mutate the trusted route catalog.

## 2. Human-approved decisions

- `TRACK_REVIEW_ADMIN_OPENIDS` is the initial server-only comma-separated administrator allowlist.
- Its values are configured outside Git/GitHub and must never be returned, logged or persisted in submission DTOs.
- The creator may write only the reserved upload object. The immutable review object is service-written and readable
  only by the CloudBase service/allowlisted administrators; neither object is public.
- The initial closed-beta route allowlist excludes Gongga; this feature does not change that staging decision.
- Community tracks may reduce manual geometry work after review, but official/operator evidence remains required for
  management/opening facts.
- Human approved raw-object retention of at most 30 days from immutable snapshot creation and de-identified reviewed
  evidence retention of at most 180 days from approval. These deadlines are not extended by retries or revisions.

## 3. Planning allowlist

- `GOAL.md`
- `README.md`
- `docs/governance/MASTER_PLAN.md`
- `docs/product-requirements.md`
- `docs/architecture.md`
- `docs/development-plan.md`
- `docs/testing-strategy.md`
- `docs/decision-log.md`
- `docs/current-status.md`
- `docs/staging-deployment-validation.md` (lifecycle status only)
- `docs/tasks/ACTIVE_TASK.md`
- new `docs/community-track-workflow.md`

No application code, Cloud Function code, package/lock file, route catalog, CI, CloudBase permission, collection,
index, secret or deployed function changes belong in this planning PR.

## 4. Frozen parent boundary

The parent Goal is split serially:

1. C01 pure bounded GPX/KML parser and reviewed-evidence projection.
2. C02 owner-side `trackSubmission` lifecycle, private storage binding and persistence.
3. C03 administrator authorization and review state transitions.
4. C04 user submission/status/cancel interface.
5. C05 administrator review interface.
6. C06 cross-layer acceptance, deployment checklist and documentation sync.

C01 may add the exact `saxes@6.0.0` runtime dependency to the new Cloud Function package only. C02–C05 are serial
because they share the function/page contracts. Deployment, new collection/index creation, storage-rule changes and
environment-variable configuration remain human-executed C06 gates after their code PRs pass Review.

## 5. Mandatory contract source

`docs/community-track-workflow.md` owns the detailed mode union, record/DTO schemas, status machine, file limits,
privacy projection, cleanup semantics, errors, test matrix and stop conditions. Product, architecture, development
and testing documents must reference rather than redefine conflicting alternatives.

## 6. Planning acceptance

- all public inputs/outputs and error codes are discriminated and server-owned identity is explicit;
- rights declaration, privacy, raw-file access, retention/cancel and no-publication copy are frozen;
- GPX/KML limits and safe XML behavior are objective and testable;
- owner/admin state transitions, retries, optimistic concurrency and side effects are explicit;
- child Issues are independently verifiable and mergeable in a serial order;
- planning docs pass full repository gates and independent Sol Review before implementation starts.

## 7. Stop conditions

Stop and ask the human before public raw-file access, third-party platform scraping/import, new paid infrastructure,
storage/database permission broadening, authentication changes, production deployment, automatic route publication,
deletion outside the approved new-record 30/180 timer contract or any use of submitted geometry as evidence that a
route is open.

## 8. Session handshake — 2026-08-09

```text
Governance version: TP-GOV-2.0.0
Goal ID and status: TP-COMMUNITY-001 / PLANNING_PR_OPEN
Active milestone: community-track contract planning
Active Issue and mode: #115 / CONTROLLER_PLANNING
Current branch and base commit: codex/115-community-track-planning / main@b1bc994
Working tree status: clean before planning activation
Required documents read: AGENTS, GOAL, current-status, MASTER_PLAN, AGENT_EXECUTION_PROTOCOL,
  PLAN_SYNC_PROTOCOL, prior ACTIVE_TASK, live #115, product/architecture/development/testing documents
Baseline commands run: inherited approved #114 latest-head quality and full local gates; planning branch diff clean
Blocking inconsistencies: none; #114 closed, admin mechanism approved, no secret value required for planning
```

## 9. Contract Review-fix checkpoint — 2026-08-09

- Two independent read-only reviews returned `CHANGES_REQUESTED`, with no P0/product-direction defect. The bounded
  findings were upload overwrite/HEAD TOCTOU, exact CloudBase fileID authority, stale processing recovery, CAS/revision
  races, real KML `gx:Track`, incomplete DTO/error/action contracts, missing rights/privacy copy and raw retention.
- The planning diff now freezes strict `TRACK_STORAGE_FILEID_HOST + reserved path` validation, bounded streaming GET,
  service-owned immutable review bytes, unique `_openid+beginAttemptId`, parent revision lock, five-minute processing
  lease, all state-changing CAS, exact record/list/detail/error/action projections, and namespace-aware paired
  KML 2.2 `gx:Track` support.
- Exact `track-rights-v1` user copy now separates own recording, creator authorization and compatible open licence;
  it forbids scraping/bypassing 两步路、六只脚 and states that approval is private geometry evidence only.
- Child C01–C06 contracts now include exact allowlists, dependencies, acceptance and stop boundaries. No implementation,
  dependency, CloudBase or deployment change has occurred.
- Full planning gates pass on the post-retention diff: root `npm test`; integration `55/0`; lint
  `0 errors / 9 existing warnings`; typecheck; `CI=1 npm run build:weapp`; and `git diff --check`.
- Human approved the 30/180-day retention decision and GitHub CLI authentication is restored. The contract now uses a
  separate de-identified evidence collection plus an internal daily timer/CAS cleanup path; no public cleanup mode is
  introduced. Live #115 is synchronized. Two independent latest-diff Reviews returned `APPROVED`; draft planning PR
  #117 is open and its initial exact head passed `quality`. Remaining work is latest-head quality and exact-head
  metadata Review for this additive status commit, then controller merge.
