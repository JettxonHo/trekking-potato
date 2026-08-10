# ACTIVE TASK — C06 community-track acceptance and staging evidence

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — C06 REVIEW_FIX_ACTIVE`
- Milestone: `TP-COMMUNITY-001 Community track evidence` (#8)
- GitHub Issue: `#123`
- Status/Mode: `REVIEW_FIX_ACTIVE / REVIEW_FIX round 1`
- Controller: Sol XHigh
- Implementation executor: exact custom Agent `luna-worker`
- Branch: `codex/123-track-acceptance`
- Base: `main@0e534d49`
- Dependency: C05/#122 completed through approved PR #128 (`0e534d49`)

## 1. Objective

Complete the offline owner-to-review acceptance gate, durable final documentation and a truthful staging-validation
record for `trackSubmission`. This Issue may prepare and document separately authorized human staging actions; the
executor does not deploy, mutate CloudBase, enable destructive cleanup, publish routes or claim production readiness.

Human option A / TP-D056 is frozen: the current mini-program reviews normalized summary, keyless evidence and at most
500 preview points. It contains no raw GPX/KML presentation/export path. Future viewer #129 remains blocked and is not
part of C06.

## 2. Required reading

Read the mandatory governance sequence, live #115/#123, full `docs/community-track-workflow.md`,
`docs/development-plan.md` C06, the community gate in `docs/testing-strategy.md`,
`docs/staging-deployment-validation.md`, the C01–C05 public seams and existing completion-report conventions.

## 3. Exact allowlist

- new `scripts/track-acceptance-contract-test.js`
- new `scripts/fixtures/track-acceptance.js`
- new `docs/community-track-staging-validation.md`
- root `package.json`
- `README.md`
- `GOAL.md`
- `docs/architecture.md`
- `docs/product-requirements.md`
- `docs/testing-strategy.md`
- `docs/development-plan.md`
- `docs/decision-log.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

No production page, Cloud Function, existing contract-test, dependency/lockfile, CloudBase config, fixture switch or
deployment file may change. A discovered production defect becomes a separate focused Bug Issue; it is not repaired in
this acceptance/evidence PR.

## 4. Frozen offline acceptance

Register `test:track-acceptance` in root `package.json` and root `test`. Use injected in-memory storage/database/time
and existing public parser, owner, admin, retention and page-model/service seams; do not duplicate their business logic.
The table-driven fixture must prove:

- owner begin → exact reserved upload → finalize → private list/detail, including retry identity, expiry and DTO privacy;
- revision after `changes_requested`, cancel/cleanup-pending recovery and stale/version conflict boundaries;
- administrator queue/detail/review for `request_changes`, `reject`, `approve_evidence`, with server-only authority,
  stable review attempt/replay and cancel/review race behavior;
- human option A: poisoned `view_raw`/`rawAccess.url` is inert in the client; no `includeRawLink`, opener, download,
  save, share, clipboard, state, log or cache path exists;
- approval creates a keyless de-identified geometry display and separate evidence record, with no OpenID, raw,
  provenance, submission/evidence-key or reviewer linkage across the public/client boundary;
- literal raw/record 30-day and evidence 180-day before/equal/after boundaries, no deadline extension, timer-only
  authority, duplicate delivery, max-20/backlog, CAS/deletion-pending repair and missing-delete idempotency;
- the acceptance flow itself does not mutate the loaded route catalog, history or public-UGC source state. The
  unchanged weather/verdict implementation is established by the exact no-production-file allowlist/diff plus its
  existing focused contracts, not by pretending a before/after snapshot can detect a pre-run source mutation.

Representative mutations must turn the focused gate RED: forged owner/admin identity, reserved-path mismatch, exact
evidence/privacy-key or provenance leak, client raw action/request or `shareFileMessage` reintroduction, review
version/attempt weakening, 30/180 drift, timer authority bypass and max-20 removal. Do not claim that a pre-run
production-source mutation is caught by a same-process before/after snapshot.

## 5. Staging validation record

Create `docs/community-track-staging-validation.md` with one authoritative row per required runtime action. Each row is
exactly `VERIFIED`, `BLOCKED` or `UNVERIFIED_RUNTIME_TOOL`; no unexecuted row is called verified. Separate automated
offline evidence from human/console/runtime evidence.

Rows include:

- private ADMINONLY `track_submissions` and `track_review_evidence` collections;
- exact unique owner-attempt and owner/admin list plus raw/record/evidence expiry indexes;
- `TRACK_STORAGE_FILEID_HOST`, server-only `TRACK_REVIEW_ADMIN_OPENIDS` and function timeout `<=240s`, without values;
- function upload and private owner/admin/rejection/cancel/lease-recovery smoke;
- daily timer timezone, server-owned `TRIGGER_SRC=timer`, empty server OpenID, normal-client and forged-event rejection;
- pre-enable dry-run, duplicate delivery, max-20/backlog drain, rollback and residue proof;
- option-A client smoke confirming summary/preview-only review and zero raw presentation/export;
- normal fixture-free WeChat build/import and real-device boundaries.

Human confirmation is required before any collection/index/rule/env/function/timer mutation. Destructive cleanup stays
disabled until its dry-run and rollback rows are verified. Secrets/OpenIDs/URLs/fileIDs/raw paths never enter Git,
GitHub, screenshots or logs.

## 6. Required commands

- `corepack npm@10.9.2 run test:track-acceptance`
- `corepack npm@10.9.2 run test:track-parser`
- `corepack npm@10.9.2 run test:track-owner`
- `corepack npm@10.9.2 run test:track-admin`
- `corepack npm@10.9.2 run test:track-retention`
- `corepack npm@10.9.2 run test:track-ui`
- `corepack npm@10.9.2 test`
- `corepack npm@10.9.2 run test:integration`
- `corepack npm@10.9.2 run lint`
- `corepack npm@10.9.2 run typecheck`
- `CI=1 corepack npm@10.9.2 run build:weapp`
- `git diff --check`

## 7. Documentation and completion boundary

Synchronize README/product/architecture/testing/development/current status and Goal language to distinguish:

- implemented and independently tested code;
- staging runtime rows actually verified by the human/tool;
- deployment/publication/real-user beta still unauthorized or unverified;
- residual dependency/tooling debt and future viewer #129.

Do not mark TP-COMMUNITY-001 complete inside executor work. Executor returns `READY_FOR_CONTROLLER_REVIEW`; Sol owns
independent Reviews, PR publication/latest-head CI/merge, human runtime coordination and Goal acceptance. #115/#123
close only after the approved PR merges and required closeout facts are synchronized.

C06 executor evidence note: the focused acceptance skeleton was direct GREEN because the C01–C05 public seams were
already implemented. This honest order is recorded as `TDD_DEVIATION_INITIAL_GREEN`; no missing-script or artificial
RED is manufactured. Independent literal oracles and mutation probes were added afterward to demonstrate that the new
gate detects owner/privacy, Option A raw, retention/timer and catalog-wiring regressions.

## 8. Stop conditions

Stop and escalate before paid infrastructure, permission broadening, production/public release, real-user invitation,
secret/OpenID disclosure, destructive deletion of pre-existing data, automatic catalog promotion, route fact/status/
safety/verdict mutation, raw viewer/export implementation, dependency upgrade or any file outside the allowlist.

## 9. Independent Review round 1 — 2026-08-10

Verdict: `CHANGES_REQUESTED`; no production defect and no human product decision.

- Add independent literal exact-key oracles for stored evidence record, nested approved evidence/geometry and display
  DTO. Use non-empty private provenance input and prove a representative provenance/note/raw/linkage field leak makes
  `test:track-acceptance` RED. Include `shareFileMessage` in the option-A source residue/mutation boundary.
- Add one KML vertical scenario through begin → `.kml` reservation/upload → finalize/parser → owner/admin DTO with
  literal format/summary/snapshot assertions. Reuse the existing parser and services; do not copy parsing logic.
- Narrow O8 to what C06 actually proves: no runtime mutation by the acceptance flow, exact production-file allowlist,
  and explicit attribution to existing route/weather/verdict/history gates. Do not claim same-run snapshots catch a
  source mutation that occurred before the run.
- Split the staging index row into the six exact index definitions from the authoritative workflow, including field
  order and the unique flag, so partial runtime verification can be recorded truthfully.
- Keep `TDD_DEVIATION_INITIAL_GREEN` honest, rerun every required command and mutation probe, and return within the
  same allowlist. No production file, dependency, deploy or CloudBase mutation is authorized.
