# TP-BETA-001 当前状态

- Updated: `2026-08-06`
- Governance: `TP-GOV-2.0.0`
- Goal status: `ACTIVE`
- Active milestone: `M2 Correctness`
- Active task: `I05a / GitHub #41 / READY_FOR_EXECUTOR`
- Branch: `codex/i05a-backend-confirmation`
- Base: `main` at `a73b840`
- Planning PR: `#9` — merged
- Checkpoint PR: `#39` — merged; latest-head GitHub `quality` passed
- I04 PR: `#40` — merged; GitHub #13 closed
- I05 planning PR: `#43` — merged; #41 ready and #42 blocked

Status semantics: planning is approved and TP-BETA-001 is active. I01–I03 and M1 are complete.
I04 is complete. I05a is the only implementation task Ready; I05b remains blocked until I05a
merges, and I06/later Issues remain Backlog until dependencies and exact contracts are approved.

## Completed

- Repository, product docs, architecture, tests, GitHub workflow and risk audit.
- Product and architecture decisions for TP-BETA-001.
- PR #8 reviewed and squash merged; P0-3 closeout and P0-4 investigation activation preserved.
- Governance v2, Goal and durable planning documents drafted on the planning branch.
- Independent Terra XHigh planning review completed with final `APPROVED` after all requested contract fixes.
- Controller approved and Sol XHigh squash merged planning PR #9.
- Goal activated in PR #35; 8 governance labels, M1–M7 milestones and GitHub Issues #10–#34 were created.
- I01 merged in PR #36 and GitHub #10 closed after Sol XHigh `APPROVED` review.
- I02 merged in PR #37 and GitHub #11 closed after Sol XHigh `APPROVED` review.
- I03 merged in PR #38 and GitHub #12 closed after GitHub-hosted `quality` passed and Sol XHigh
  returned `APPROVED`.
- `main` protection was applied and read back: Pull Requests and strict `quality` are required;
  force pushes and branch deletion are disabled. Extra GitHub approval count remains zero because
  independent approval is performed by Sol XHigh.
- M1 Engineering gate was closed after I01–I03 completion.
- M1 checkpoint and the frozen I04 contract passed independent Review and merged in PR #39.
- I04 response-contract implementation was committed as `37c9be3`; its offline
  `test:response` exercises public handler exits and minimal frontend phase consumption. The
  first Sol review changes are addressed on `codex/i04-response-contract`, which is again
  `READY_FOR_CONTROLLER_REVIEW`.
- I04 passed Sol XHigh second review and latest-head `quality`, merged in PR #40 as `34170ba`,
  and GitHub #13 was closed.
- I05 was split into parent #14 with backend child #41 and frontend child #42 to keep each PR
  independently verifiable; #42 is blocked by #41.
- I05 planning passed independent Review after one fix round and merged in PR #43 as `a73b840`;
  #41 was activated on that real base.

## Baseline evidence

- `node scripts/route-type-contract-test.js`: 93 pass / 0 fail
- `node scripts/weather-contract-test.js`: 86 pass / 0 fail
- `node scripts/unit-test.js`: 55 pass / 0 fail
- `node scripts/security-test.js`: 15 pass / 0 fail
- `node scripts/e2e-local.js`: offline fixture/mock E2E, 56 pass / 0 fail; covers
  `tripDays` 1/2/3 and current `trek` / `climb` route types without Open-Meteo,
  CloudBase or DeepSeek access.
- `node scripts/response-contract-test.js`: offline public-handler and frontend-source contract
  test for I04 response phases, error envelopes, compatibility consistency and phase branches.
- I01 on Node 24.18.0 + npm 10.9.2: fresh-cache root `ci` and three-project `bootstrap` pass using official npm registry locks.
- I02 on Node 24.18.0 + Corepack npm 10.9.2: root `lint` (0 errors; 10 existing
  unused-variable warnings), `typecheck`, `test`, `test:integration` and
  `build:weapp` pass; global `taro` is not required.
- PR #38 GitHub-hosted `quality`: all 12 steps passed in 50 seconds using the same root commands.

The baseline checks were rerun during M1 verification. Local Markdown links and `git diff --check` also pass.

## Agent assignments

- Sol XHigh: planning documents, Goal, GitHub orchestration and independent review.
- Luna XHigh: preferred executor, unavailable in this environment.
- Terra XHigh: authorized implementation fallback; assigned I05a / #41.
- Sol XHigh: owns I05 contracts, task routing and independent Review; #42 is not assigned.

## Open work

1. Terra XHigh implements the exact backend contract in GitHub #41.
2. Sol XHigh reviews actual code/tests and latest-head CI; #42 remains blocked until merge.

## Blockers and risks

- Root toolchain, lockfiles, offline integration, CI and branch protection are merged and verified.
- Node 24 随附的 npm 11 与 `@nutui/nutui-react-taro@3.0.20` 的不可解析可选依赖
  存在锁文件校验不兼容：npm 11 生成锁时省略该包、`npm ci` 又报缺失。I01 已按
  GitHub #10 的控制端决策固定 npm 10.9.2，并以 `engine-strict` 拒绝错误 npm。
- Five route variants still require field-level A/B evidence during I08–I12.
- Deployment and real-device validation remain outside the Goal.

## Forbidden actions during I05a

- Frontend candidate UI or request-generation changes owned by #42
- Route data field/schema edits, persistent candidate storage, queryId/TTL or permanent IDs
- Verdict/weather/rule changes, I20 reducer/service, full UGC migration, deployment or dependencies
- Deployment, database mutation, UGC deletion or production configuration

## Next action

Implement only GitHub #41; do not start #42 before #41 is approved and merged.
