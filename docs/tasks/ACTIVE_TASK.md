# ACTIVE TASK — C01 bounded GPX/KML parser

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — C01 READY_FOR_CONTROLLER_REVIEW`
- Milestone: `TP-COMMUNITY-001 Community track evidence` (#8)
- GitHub Issue: `#118`
- Status/Mode: `READY_FOR_CONTROLLER_REVIEW / REVIEW_FIX`
- Controller: Sol XHigh
- Implementation executor: exact custom Agent `luna-worker`
- Branch: `codex/118-track-parser`
- Base: `main@988cf8b`

## 1. Goal and background

Implement the pure bounded GPX/KML parser and private reviewed-geometry projection frozen by
`TRACK-SUBMISSION-1`. This is the first serial child of #115 and supplies verified geometry to later private APIs;
it does not approve, publish or classify a route.

## 2. Required reading

Read the mandatory governance sequence, live #118, `docs/community-track-workflow.md` §§4, 6, 9 and
`docs/development-plan.md` C01. The workflow document is authoritative for parser inputs, limits, calculation and
privacy projection.

## 3. Exact allowlist

- new `cloudfunctions/trackSubmission/package.json`
- new `cloudfunctions/trackSubmission/package-lock.json`
- new `cloudfunctions/trackSubmission/domain/track-parser.js`
- new `cloudfunctions/trackSubmission/domain/evidence-projection.js`
- root `package.json`
- new `scripts/track-parser-contract-test.js`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`

No other file may change without a controller-owned contract update.

## 4. Non-scope

Handler, CloudBase SDK/storage/database/network, UI, catalog mutation, route approval/tier assignment, KMZ/ZIP,
remote URL ingestion, map matching, deployment and any dependency except the exact parser below.

## 5. Frozen constraints

- Pin exactly `saxes@6.0.0` in the new function package and lock file.
- Fatal UTF-8 decoding; reject DTD/ENTITY; namespace-aware GPX track, KML LineString and KML 2.2 `gx:Track` only.
- Enforce XML depth 64, actual points 2..50,000, segments <=200, finite legal coordinates/elevation and paired
  `when/gx:coord`.
- Use the frozen Haversine, rounding and deterministic preview sampling. Remove exact times and identity/provenance
  fields from `ReviewedGeometry`.
- No hash/SHA, speculative compatibility layer or second catalog/domain implementation.

## 6. Acceptance and tests

- Record a real failing RED before implementation, then mutation-sensitive GREEN.
- Positive fixtures cover GPX, KML LineString, audited paired `gx:Track`, namespaces and BOM.
- Negative/boundary fixtures cover malformed/unsafe XML, unsupported encoding/structure, depth, segments,
  50,000-point edge, non-finite/out-of-range values, pairing/time failures and deterministic sampling mutations.
- `TrackSummary` and `ReviewedGeometry` match exact schemas and contain no raw time, owner, filename, path, note or
  provenance.
- Run `npm run test:track-parser` (executor may choose this exact script name), root `npm test`,
  `npm run test:integration`, `npm run lint`, `npm run typecheck`, `CI=1 npm run build:weapp`, `git diff --check`
  and latest-head GitHub `quality`.

## 7. Dependency and merge order

Planning PR #117 is merged. C01 blocks #119/C02 and every later child. No community-track task runs in parallel.

## 8. Risks and escalation

Stop and return to Sol before changing XML library/version, supporting KMZ/URL/map matching, weakening limits,
adding CloudBase/network, modifying a public/data contract or touching a file outside the allowlist.

## 9. Allowed autonomous choices

The executor may choose internal pure-function decomposition, test fixture organization and npm script wiring within
the allowlist, without changing frozen outputs, algorithms or limits.

## 10. Deliverables and result package

Return code, exact lockfile, focused tests, docs checkpoint, command results, actual changed files, deviations,
implementation-level decisions, known limits/risks and a focused draft PR using `Refs #118` rather than `Closes`.
The executor must not approve or merge its own PR.

## 11. Controller activation checkpoint — 2026-08-09

```text
Governance version: TP-GOV-2.0.0
Goal ID and status: TP-COMMUNITY-001 / ACTIVE — C01 IMPLEMENTATION_ACTIVE
Active milestone: TP-COMMUNITY-001 Community track evidence / C01
Active Issue and mode: #118 / IMPLEMENTATION
Current branch and base: codex/118-track-parser / main@988cf8b
Working tree before activation: clean
Planning dependency: PR #117 merged as 988cf8b
Implementation routing: exact custom Agent luna-worker only; Terra fallback prohibited
```

The activation commit is controller-owned and contains no implementation code. `luna-worker` must re-read all
required sources, verify the branch/worktree and run baseline commands before recording the first RED.

The activation instructions above are historical. Sol's round-1 Review-fix is the current execution state; no
scope, dependency, public contract, parser library or runtime engine was changed.

## 12. Implementation checkpoint — 2026-08-09

```text
RED: corepack npm@10.9.2 run test:track-parser -> exit 1 (missing script); direct runner -> MODULE_NOT_FOUND
GREEN: focused parser/projection contract PASS
Toolchain: npm 10.9.2 (isolated cache for lock generation); no npm 11 lockfile generation
Local gates: root test PASS; integration 55/0; lint 0 errors/9 existing warnings; typecheck PASS;
  CI=1 build:weapp PASS; git diff --check PASS
Status: historical checkpoint superseded by the completed REVIEW_FIX checkpoint below (READY_FOR_CONTROLLER_REVIEW)
```

The implementation remains limited to the allowlist and has no handler, storage, database, network, UI, catalog or
deployment wiring. The focused contract covers GPX, KML LineString and paired KML 2.2 `gx:Track`, safe UTF-8 XML,
all frozen parser limits, deterministic preview sampling and privacy-safe `ReviewedGeometry` projection.

## 13. Review-fix completion checkpoint — 2026-08-09

```text
Review: round 1 CHANGES_REQUESTED addressed within the original allowlist
Focused/mutation: PASS; radius, floor and projection-schema mutations each RED then restored
Clean install: corepack npm@10.9.2 run bootstrap PASS after moving ignored trackSubmission/node_modules; explicit
  `test -f .../saxes.js && corepack npm@10.9.2 ci --prefix cloudfunctions/trackSubmission && focused` PASS
Toolchain: npm 10.9.2 lock regenerated with official registry.npmjs.org and isolated cache
Local gates: focused/root/integration 55/0/lint 0 errors+9 existing warnings/typecheck/build/diff PASS
Status: READY_FOR_CONTROLLER_REVIEW; latest-head GitHub quality and PR remain controller-owned
```

The round-1 fixes add no handler, storage, database, network, UI, catalog or deployment behavior and preserve the
exact `saxes@6.0.0` dependency and frozen parser outputs.
