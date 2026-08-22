# ACTIVE TASK — #150 private history cursor pagination

- Governance: `TP-GOV-2.0.0`
- Goal: `TP-COMMUNITY-001 / ACTIVE — C14 REVIEW_ACTIVE`
- Milestone: C14 History pagination
- GitHub Issue: `#150`
- Status/Mode: `REVIEW_ACTIVE / REVIEW`
- Controller: Sol XHigh + human controller
- Branch/base: `codex/150-history-pagination` from exact `main@9de9013`
- Executor: exact custom `luna-worker`, configured `gpt-5.6-luna/max`; runtime identity is separate evidence

## 1. Objective and frozen contract

Add explicit, bounded cursor pagination to the existing owner-private history sheet:

1. `list` remains authenticated only by server OpenID and returns the unchanged public HistoryItem DTO;
2. default/max page size is 20 and storage reads at most `limit + 1` records;
3. stable keyset order is `createdAt desc, _id desc`;
4. request accepts an optional bounded/versioned opaque cursor and success adds only `nextCursor: string|null`;
5. malformed, oversized or extra-field cursors fail closed before database access;
6. page one replaces the list; explicit `加载更多` appends unique IDs and preserves rows/cursor on failure;
7. concurrent, stale and closed-panel callbacks cannot overwrite or append;
8. delete, clear and zero-I/O history prefill retain their existing product behavior.

## 2. Exact allowlist

- `cloudfunctions/history/index.js`
- `scripts/security-test.js`
- `taro-app/src/pages/index/recovery-model.js`
- `scripts/recovery-contract-test.js`
- `taro-app/src/pages/index/index.jsx`
- `taro-app/src/pages/index/index.css`
- `GOAL.md`
- `docs/current-status.md`
- `docs/tasks/ACTIVE_TASK.md`
- `docs/architecture.md`
- `docs/testing-strategy.md`
- `docs/decision-log.md`

No other path may change without controller approval.

## 3. TDD seams

- Record a real focused backend RED before production edits for 21+ owner records, equal-timestamp `_id` tie-break,
  foreign-record exclusion, bounded next cursor and malformed-cursor zero reads.
- Record a real focused frontend lifecycle RED before page edits for replace versus append, ID dedupe, preserved rows/
  cursor on append failure, and stale/closed callback invalidation.
- Require the rendered `加载更多` control to carry the current cursor through its exact handler; loading more must not
  replace the list, and `nextCursor:null` must stop additional calls.
- Representative mutations removing the owner filter, tie-break/second order, cursor rejection, append semantics,
  stale guard or load-more handler must each turn the appropriate focused gate RED.

## 4. Non-scope and stop conditions

No history schema migration, public UGC, auto infinite scroll, result/route/weather/verdict behavior, community-track
data, dependency/config, CloudBase index/config mutation, deployment, real history read, delete/clear invocation,
publication or production release. Stop for any required out-of-allowlist path or runtime/data action.

## 5. Verification and delivery

- focused `test:history` and `test:recovery`;
- root `corepack npm@10.9.2 test` and integration `55/0`;
- lint, typecheck and fixture-free `CI=1 build:weapp`;
- `git diff --check`, exact allowlist and privacy/secret scans.

Executor delivers `READY_FOR_CONTROLLER_REVIEW`. Sol XHigh inspects the actual diff and obtains two fresh independent
Reviews before any commit/push/PR/merge decision. No executor may approve or merge its own work.

## Executor checkpoint — 2026-08-22

- Real TDD REDs were captured before backend/frontend production edits. Focused `test:history` and `test:recovery`
  now pass owner/order/cursor/DTO/privacy, append/dedupe/failure, stale/closed, delete/clear and page-handler mutation
  gates.
- The current worktree contains only the six implementation/test paths plus this exact documentation allowlist. Root
  `corepack npm@10.9.2 test`, integration `55/0`, lint (`0 errors / 9 existing warnings`), typecheck, fixture-free
  WeChat build, diff check, exact allowlist and privacy/secret scans also pass. Independent Reviews remain controller
  work. Root npm audit is clean; the pinned history `wx-server-sdk` audit has pre-existing transitive findings requiring
  an out-of-allowlist breaking upgrade. Historical implementation head `0f6b2bf` is PR #151 (`OPEN`/`DRAFT`) with
  successful exact-head quality run `32569602179`. Review-fix round 1 is limited to this test/docs allowlist: append
  inputs now contain only new rows, duplicate-ID coverage is a separate case, and a `response.data.slice()` mutation
  is required to turn focused recovery RED. Draft PR #151 is open; live GitHub metadata is authoritative, and the same
  current head must pass quality plus two fresh independent Reviews. Any head change repeats both gates. No CloudBase/
  data action, deployment or release is authorized.
