# TP-CATALOG-001 — 首批可信路线目录扩充

- Goal ID: `TP-CATALOG-001`
- Status: `ACTIVE — C15 REVIEW_ACTIVE`
- Governance: `TP-GOV-2.0.0`
- Started: `2026-08-23`
- Parent Issue: `#153`
- Release boundary: reviewed catalog data and tests only; no automatic promotion, CloudBase mutation or public release

## 1. Objective

Grow the structured trusted runtime catalog from six reviewed RouteVariants to a target total of twenty-five. The
program first creates a source-and-rights ledger, then promotes small serial batches only after identity, topology,
direction, opening-status and public-contract review. Legacy builtin place names remain discovery hints and do not
count as trusted RouteVariants.

The existing six comprise five searchable `full` pilots and one safety-blocked Wutai restriction record. Therefore
the user-facing completion target is twenty-four searchable `full` variants plus that one retained restriction record;
a blocked new candidate must be replaced and cannot satisfy the target merely by occupying a ledger slot.

## 2. Authority and reading order

Follow `AGENTS.md`, this Goal, `docs/governance/MASTER_PLAN.md`, live #153 and
`docs/tasks/ACTIVE_TASK.md`. `docs/architecture.md`, `docs/community-track-workflow.md` and the new catalog-expansion
ledger own the geometry, rights and promotion boundaries. A conflict stops the affected work and returns to Sol XHigh.

## 3. Fixed human decision

- Target total: 25 reviewed records: the five existing searchable pilots, the existing Wutai restriction record, and
  nineteen new searchable `full` variants. A failed candidate is replaced through a reviewed ledger update.
- Work in serial batches of roughly four or five variants; each batch has its own child Issue, allowlist and Review.
- Prefer explicit OSM/open-data relations, first-party recordings and explicitly authorized contributor/partner files.
- A candidate never publishes automatically. Missing or ambiguous evidence remains blocked instead of being invented.
- #123 remains an independent human-runtime blocker; C15 performs no timer, retention, deletion or CloudBase action.

## 4. Required promotion evidence

- unique Place, Route and RouteVariant identity with collision-safe aliases;
- complete bounded geometry tied to the exact variant and direction, with topology review;
- durable source URL/type plus license or authorization basis;
- official/operator opening or access source with a checked-at date;
- existing route type, duration, distance/elevation, weather-sample and optional routePreview contracts;
- behavior tests at the public route-domain/data/response/result seams and two fresh exact-head Reviews.

Geometry does not prove access, permission, opening, safety, weather or a verdict. OSM-derived candidates retain ODbL
attribution and derived-database obligations. Restricted, closed, disconnected or rights-unclear candidates do not
enter the trusted catalog merely to reach the target count.

## 5. Non-scope

- scraping, cracking or bulk extraction from 两步路、六只脚、Wikiloc, Strava, AllTrails or similar platforms;
- unreviewed path-to-route generation, automatic catalog promotion or public raw-track downloads;
- private submission/evidence lookup, new external services, paid APIs, dependencies, keys or schema changes;
- CloudBase mutation/deployment, timer or destructive cleanup, real-user cohort, production/public release;
- treating legacy builtin route rows as trusted variants without the full promotion evidence above.

## 6. Milestones and serial Issues

| Milestone | Work item | Completion condition |
|---|---|---|
| C15 Plan | #153 planning slice | 25-slot source ledger, evidence status, batch order and child-Issue contracts pass Review |
| C15 Batch A | child Issue after plan merge | first evidence-rich four-to-five variants promoted through RED/GREEN and Review |
| C15 Batches B–D | serial child Issues | remaining reviewed variants reach a total of 25 without lowering evidence gates |
| C15 Closeout | controller review | catalog count, attribution, source ledger and runtime contracts reconcile truthfully |

## C15 planning checkpoint — 2026-08-23

- `docs/route-catalog-expansion.md` records exactly 25 slots: six existing pilots and nineteen provisional OSM
  relation candidates. The new rows are source identities only; none has a runtime ID or promotion verdict of `full`.
- Batch A contains five Yubeng relations. Four have a preliminary consecutive-way endpoint observation; relation
  `19700036` remains quarantined because its Chinese and English names conflict. All five still require topology,
  direction, rights/attribution and official/operator opening evidence.
- Batches B–D contain fourteen additional named OSM relations. Their member geometry, topology, exact direction,
  rights and current opening status remain `UNKNOWN`; each is explicitly `BLOCKED_CANDIDATE`.
- The Overpass candidate search was stopped after rate limiting. No candidate was silently substituted, merged or
  promoted to make the count. Child Issues are proposed in the ledger and must be separately activated after Review.
- Planning is now `READY_FOR_CONTROLLER_REVIEW`. The 19 new rows are evidence-work slots, not delivered routes; C15
  completes only when 19 new rows are promoted to searchable `full` variants or blocked rows are replaced and reviewed.

## Appendix: prior TP-COMMUNITY-001 checkpoints

`TP-COMMUNITY-001` remains incomplete at #123 for human-controlled staging rows. Its reviewed code and privacy
boundaries remain binding, but it is not the active implementation Goal and this C15 authorization does not complete
or weaken any #123 row.

## C14 private-history pagination activation — 2026-08-22

- The current history sheet reads only the newest 20 owner-private items. #150 adds explicit bounded `加载更多`
  behavior without changing the HistoryItem fields, save/delete/clear semantics or zero-I/O history prefill.
- The service contract is server-OpenID-bound keyset pagination ordered by `createdAt desc, _id desc`, with a
  versioned opaque cursor, at most 20 returned items and one read-only lookahead. Invalid cursors fail closed before
  storage access and never expose OpenID, raw database errors or unknown record fields.
- The frontend refresh path replaces page one; load-more appends and deduplicates, preserves existing rows/cursor on
  failure and rejects stale/closed callbacks. It is an explicit control, not auto infinite scroll.
- #150 and ACTIVE_TASK own the exact code/test/docs allowlist. No CloudBase index/config change, deployment, real
  history access, delete/clear invocation, public UGC, dependency or production release is authorized.

## C14 implementation checkpoint — 2026-08-22

- TDD first recorded a real backend RED for the missing keyset/tie-break pagination and a frontend RED for the missing
  continuation cursor. GREEN now proves owner-only 21-row paging with equal-timestamp `_id` tie-break, one-row
  lookahead, opaque versioned cursor validation, DTO privacy and zero reads for malformed cursors.
- The history sheet now replaces page one, exposes an explicit `加载更多` control, appends/deduplicates rows, preserves
  loaded rows and cursor on append failure, and rejects stale/closed callbacks. Delete/clear invalidate in-flight list
  callbacks and keep the local cursor/rows consistent; history prefill remains zero-I/O.
- Focused `test:history` and `test:recovery`, root `corepack npm@10.9.2 test`, integration `55/0`, lint (`0 errors / 9
  existing warnings`), typecheck, fixture-free WeChat build, diff check, exact allowlist and privacy/secret scans pass;
  independent Reviews remain controller-owned. Root npm audit reports 0 vulnerabilities; the pinned history
  `wx-server-sdk` audit reports pre-existing transitive findings whose breaking upgrade is outside this allowlist.
- Historical implementation head `0f6b2bf` was published in PR #151; its exact-head quality run `32569602179`
  succeeded. The review-fix round kept production behavior unchanged and hardened `test:recovery` by
  feeding the first append page only new rows, moving duplicate-ID coverage to a separate case, and proving a
  `response.data.slice()` append mutation turns the focused recovery contract RED.
- Final PR #151 head `79866a8` passed quality run `32570414955` and two fresh exact-head independent Reviews with no
  P0–P3 finding, then squash merged as `131e616`. This completes the C14 code slice; it does not prove deployment or
  live history access, and no CloudBase index/config/data action or release occurred.
- Current status: `BLOCKED_STAGING`; #123 again owns the remaining human runtime-validation rows.

## C13 approved B result-summary activation — 2026-08-22

- The detailed result page keeps only the route name as the large bold title. The overall conclusion moves to a compact
  `出发建议 · <结论>` line above it; no local-validation or prototype tag may appear in real UI.
- For a safe reviewed `routePreview`, the top card order is advice, route name, sharp map, route scope/facts, geometry
  disclaimer and legend. The white card surface receives subtle top/bottom background depth without blurring text/map.
- The following card becomes `判断依据` and lists only concrete reason messages, so the overall conclusion is not
  repeated. Missing preview geometry keeps the merged C12 fail-closed no-placeholder behavior.
- #148 owns the exact frontend/test/status allowlist in ACTIVE_TASK. History pagination is a separate serial slice;
  no model/service/server/public DTO, catalog, dependency, CloudBase, deployment or release change is authorized.

## C13 implementation checkpoint — 2026-08-22

- TDD captured a real focused RED before the presentation edits: the result-page contract rejected the missing compact
  advice kicker. GREEN now proves the approved advice → route name → conditional map → scope/facts → geometry notice/
  legend order, rejects prototype/local-validation tags and duplicated verdict content, and keeps the C12 no-preview
  conditional intact. Independent mutations for reorder, tag, duplicate verdict, verdict-tinted depth and foreground
  blur each return RED.
- The result summary now uses the route name as its only large title, a compact `出发建议 · <结论>` kicker, a neutral
  gray-on-white top/bottom depth layer with sharp foreground text/Map, and a `判断依据` card whose visible rows are
  concrete reason messages. No route/model/service/DTO/history or CloudBase behavior changed.
- Focused/root tests, offline integration `55/0`, lint (`0 errors / 9 existing warnings`), typecheck, fixture-free
  `CI=1 build:weapp` and `git diff --check` pass. This is local code evidence; DevTools visual evidence remains a
  separate controller check. No CloudBase call, deployment, production geometry, commit, push, PR or release occurred.
- Executor status: `READY_FOR_CONTROLLER_REVIEW`; Sol XHigh must inspect the actual diff and obtain two fresh exact-head
  independent Reviews before deciding mergeability. Runtime model identity remains separately unverified.

## C13 runtime review-fix checkpoint — 2026-08-22

- Controller DevTools found a WXSS compile failure on the fixture-free build. The cause was bounded to the new
  `.result-verdict-card > *` universal-child selector, which the CLI build did not reject.
- Review-fix TDD captured RED by forbidding that selector and requiring an explicit `result-verdict-content` wrapper
  containing the map stage and labels. GREEN replaces it with the explicit wrapper/z-index seam; no route/model/service
  behavior changed.
- Focused/root tests, typecheck, fixture-free `CI=1 build:weapp` and `git diff --check` pass. Controller DevTools now
  recompiles with zero errors and renders the B hierarchy from identity/location-free synthetic local state; the
  temporary visual injection was removed and the normal homepage restored.
- Executor status: `READY_FOR_CONTROLLER_REVIEW`; Draft PR #149 is open. Live GitHub metadata is authoritative for
  its current head, and the same current head must have successful quality CI plus two fresh independent Reviews
  before Sol decides mergeability. No CloudBase call, deployment or release occurred.

## C13 accessible-name and no-preview review-fix checkpoint — 2026-08-22

- Independent Review identified two bounded P2 contract gaps: an unconditional route-preview-card mutation was not
  independently rejected, and `Text aria-label` is not emitted by the current Taro/WeChat `Text` template, so a
  severity-only label could hide the concrete reason message from the reachable name.
- Focused TDD first captured RED for the exact safe-preview conditional, the visible `reason.message`/fallback seam,
  and a representative message-loss mutation. GREEN now keeps the preview card conditional, preserves the concrete
  reason text as the accessible content, retains severity only in its non-overriding class, and makes no aria support
  claim that the built WXML cannot carry.
- The C11 overall `verdict.label` mapping remains model-owned; only the unreferenced reason-list display helper was
  removed to keep the message-only card lint-clean.
- The optional `RESULT_PAGE_ARTIFACT=1` gate checks the built `dist/pages/index/index.js` reason subtree for the
  severity class and exact message/fallback, and checks `dist/base.wxml` for the absence of an aria-label dependency.
  Focused contract, artifact gate and the fixture-free build are local evidence only; no route/model/service/DTO/history/
  CloudBase behavior changed.
- The controller committed/published the accessibility repair in PR #149; `33d1469` is its historical implementation
  head, not a frozen current-head claim. Live GitHub metadata is authoritative; status remains
  `READY_FOR_CONTROLLER_REVIEW` pending same-head CI and both independent
  Reviews before Sol decides mergeability. No deployment or release occurred.

## C13 round-two exact-preview injection checkpoint — 2026-08-22

- The second independent Review found that an extra self-closing `<View className="route-preview-card" />` injected
  after the route name could coexist with the valid conditional preview branch without turning the focused gate RED.
- The focused oracle now counts every regular/self-closing preview-card instance and requires exactly one instance under
  the exact `routeModel.routePreview && routePreviewMap` condition. The representative duplicate injection is source-
  changing, Babel-parseable and independently RED; the unmutated valid branch remains GREEN.
- This is a test/docs-only repair inside the #148 allowlist. Draft PR #149 is open; live GitHub metadata is authoritative
  for its current head, and that same head requires successful CI plus two fresh independent Reviews before Sol decides
  mergeability. Any head change repeats both gates.

## C12 B-lite route-map preview activation — 2026-08-21

- The human selected B-lite after reviewing A/B/C prototypes: one read-only map thumbnail in the result summary card,
  auto-fit to the complete reviewed route, with route-day lines and start/end indicators. Drag, zoom, rotate,
  overlooking and current-location display remain disabled; no click-through viewer is included.
- The public interface is additive and optional. Only a bounded controller-curated reviewed geometry projection may
  populate `routePreview`; weather sample points must never be presented as the complete route, and raw GPX/KML,
  timestamps, identity, file/evidence identifiers, paths, URLs and provenance remain absent.
- Invalid/absent/unreviewed geometry renders no empty placeholder. A map failure falls back to a neutral client-drawn
  route outline using the same safe points. No production geometry may be fabricated; synthetic geometry is test-only.
- #145 owns the exact implementation/test/docs allowlist in ACTIVE_TASK. No dependency, new map key, storage/query,
  CloudBase mutation, deployment, timer, deletion, publication or production release is authorized.

## C12 Review-fix round 1 checkpoint — 2026-08-21

- Two fresh independent Reviews returned `CHANGES_REQUESTED` for the same #145 slice. The bounded repair keeps the
  exact allowlist and adds deterministic WGS84→GCJ-02 conversion for every WeChat Map-native coordinate, stable
  outside-China behavior, `enablePoi={false}`, and placement-sensitive proof that the preview stays inside the top
  result-summary card. The fallback continues to use the normalized source geometry without conversion.
- Focused RED was captured after adding the review-fix oracles: the pre-fix page lacked `enablePoi`, the summary-card
  nesting mutation was not distinguished, and coordinate-system/raw mapping, trip-base omission, and fallback-reset
  mutations were not yet covered. GREEN now covers full/blocked/place/absent BaseData boundaries, both reset seams,
  deterministic coordinate representatives, and the requested deletion mutations.
- No pilot catalog geometry was added. The current production data gate remains fail-closed because no controller-
  approved de-identified route preview projection is available. No CloudBase call, deployment, dependency/key,
  commit, push, PR or production/public release occurred; runtime model identity remains `UNVERIFIED_RUNTIME_MODEL`.
- Executor status: `READY_FOR_CONTROLLER_REVIEW`.
- Open work / Next action: the controller must commit/push the review-fix head, obtain latest-head CI and two fresh
  exact-head independent Reviews, then decide mergeability and Issue status. No approval or merge is claimed here.

## C12 Review-fix round 2 checkpoint — 2026-08-21

- Fresh re-reviews returned `CHANGES_REQUESTED`. The repair keeps the frozen allowlist and replaces the rectangle-only
  WGS84 applicability guess with an explicit trusted-route-region gate: recognized mainland province/region strings
  receive deterministic WGS84→GCJ-02 conversion; Nepal, Mongolia, Hong Kong and other non-mainland regions remain
  unchanged; a WGS84 preview without a region fails closed. This is a bounded product rule, not a global border claim.
- Focused RED was captured before production edits for Kathmandu stability and the missing region-aware Map call.
  GREEN now includes literal center/end-indicator converted-coordinate oracles, region/raw mapping mutations, Map
  center/indicator prop mutations, and initial-fallback/error-state mutations.
- No controller-approved production geometry was available. No CloudBase call, deployment, dependency/key, commit,
  push, PR or public release occurred; runtime model identity remains `UNVERIFIED_RUNTIME_MODEL` and result-page
  runtime visual evidence remains unclaimed.
- Executor status: `READY_FOR_CONTROLLER_REVIEW`.
- Current next action: controller reviews this round2 head, then obtains latest-head CI and two fresh exact-head
  independent Reviews before deciding mergeability and Issue status. No approval or merge is claimed here.

## C12 Review-fix round 3 checkpoint — 2026-08-21

- Fresh re-reviews returned `CHANGES_REQUESTED`. The repair keeps the frozen allowlist and makes the region gate
  tri-state: canonical/anchored mainland province forms convert WGS84 to GCJ-02; explicit non-mainland forms stay
  raw; unknown, missing or conflicting/collision labels fail closed with no preview. False positives such as
  `日本山西县`, `法国四川餐厅`, `Sichuan Province` and `川西` remain unknown, while `香港·广东`,
  `尼泊尔·西藏边境` remain unknown collisions and case-normalized Hong Kong remains explicit non-mainland.
- Focused RED was captured before the classifier implementation (`classifyRoutePreviewRegion` was absent). GREEN now
  includes independent unknown-region map absence, converted center/end indicators, non-mainland stability, direct
  unknown conversion and exclusion-removal mutations. No production pilot geometry is available; the data gate
  remains fail-closed.
- No CloudBase call, deployment, dependency/key, commit, push, PR or public release occurred. Runtime model identity
  remains `UNVERIFIED_RUNTIME_MODEL`; result-page runtime visual evidence remains unclaimed.
- Executor status: `READY_FOR_CONTROLLER_REVIEW`. Current next action: controller inspects this latest worktree/head,
  obtains latest-head CI and two fresh exact-head independent Reviews, then decides mergeability and Issue status.

## C12 Review-fix round 4 checkpoint — 2026-08-21

- Correctness review identified one contract mismatch: a region matching both mainland and non-mainland forms must be
  `unknown`, not `non_mainland`. The focused contract first captured RED for `香港·广东` and `尼泊尔·西藏边境`,
  then GREEN now computes independent mainland/non-mainland matches, applies collision→unknown precedence, and omits
  Map geometry for collisions.
- A collision-guard removal mutation and direct collision geometry oracle both return RED when the guard is absent. The
  bounded canonical/mainland, explicit non-mainland-only and unknown/missing behavior remains unchanged; no production
  pilot geometry is available and the data gate remains fail-closed.
- No CloudBase call, deployment, dependency/key, commit, push, PR or public release occurred. Runtime model identity
  remains `UNVERIFIED_RUNTIME_MODEL`; result-page runtime visual evidence remains unclaimed.
- Executor status: `READY_FOR_CONTROLLER_REVIEW`. Current next action: controller inspects this latest worktree/head,
  obtains latest-head CI and two fresh exact-head independent Reviews, then decides mergeability and Issue status.

## C12 local visual verification — 2026-08-22

- WeChat DevTools rebuilt the current `taro-app` and rendered an identity-free, synthetic two-day WGS84 route on the
  iPhone 12/13 simulator. The read-only Map appeared inside the top verdict card with both route segments, start/end
  indicators, the geometry-only notice and no blank shell or card overlap.
- The synthetic result existed only as a temporary local mount fixture. It was removed immediately after capture,
  the normal homepage was rebuilt and restored, and source residue plus `git diff --check` passed. No CloudBase call,
  deployment, production geometry, private submission/evidence access or public release occurred.
- This is local presentation evidence only; it does not prove a production pilot route, route openness, safety,
  deployment or runtime model identity. PR #146 exact head `1f0b125` passed quality run `32555506608` and two fresh
  independent Reviews with no P0–P3, then squash merged as `ae86b0b`. No CloudBase or public-release action followed.

## C12 merge checkpoint — 2026-08-22

- PR #146 passed same-head quality and two independent exact-head Reviews, then squash merged into `main@ae86b0b`.
- C12 code is complete and #145 may be closed after this durable ledger reconciliation. No production pilot geometry
  was added; invalid, absent, unreviewed, unknown-region and region-collision geometry remains fail-closed.
- The Goal remains `ACTIVE — BLOCKED_STAGING` only for #123 S8–S15/S20 and S16/S18 runtime evidence. No timer,
  destructive cleanup, production/public release or real-user cohort is authorized by the C12 merge.

## C09 Review-fix round 3 checkpoint — 2026-08-20

- The focused UI contract now mutates the exact no-result `location_failed`/`route_not_found` upload branch, asserts
  that the place-only branch remains, and checks exact fallback or single `draftTitle` navigation URLs across line
  breaks. A multiline `manualLat` query-leak mutation also produces the expected base-oracle RED.
- The corrected mutation harness is nonrecursive and preserves the Unicode/control/title privacy probes. No production
  JSX/CSS behavior changed in this round; runtime model identity remains `UNVERIFIED_RUNTIME_MODEL`.
- Focused, root, integration `55/0`, lint, typecheck, fixture-free WeChat build, diff, allowlist/privacy/secret scans
  and official npmjs audit all pass. Draft PR #140 is published; its implementation head `f932857` passed GitHub
  quality before this docs-only lifecycle correction. No deployment or CloudBase mutation occurred.
- Executor status: `READY_FOR_CONTROLLER_REVIEW`.
- Open work / Next action: commit/push this docs-only correction to existing draft PR #140, then require fresh
  latest-head CI and two exact-head independent Reviews before Sol XHigh decides mergeability. No approval or merge
  is claimed.

## C10 Review-fix checkpoint — 2026-08-21

- Focused TDD RED was captured before production edits: the homepage order oracle failed on the pre-C10
  community-before-query source, and the result oracle failed on the missing default-collapsed weather state.
- GREEN is limited to the approved frontend/test allowlist. The homepage now renders query → community → history in a
  flex action stack with the decorative copy in normal flow; AI lines strip only the repeated display prefixes while
  retaining item/reason/risk/note/disclaimer/unavailable content; hourly samples use page-local keyed disclosure with
  existing name/elevation/time/count facts, an 88rpx accessible header and unchanged hourly rows.
- Focused mutation probes for reorder, handler removal, prefix restoration, default-open, shared-toggle and decorative
  overlap all return RED when isolated and the restored worktree is GREEN. Root tests, integration `55/0`, lint
  (0 errors/9 existing warnings), typecheck, fixture-free WeChat build, diff/allowlist/secret scans all pass.
- Local WeChat DevTools rebuilt and rendered the iPhone 12/13 simulator homepage; source-tree accessibility order is
  query before community before history. No fixture, CloudBase call, deployment or production action occurred;
  result-page runtime visual evidence remains unclaimed. Runtime model identity remains `UNVERIFIED_RUNTIME_MODEL`.
- Executor status: `READY_FOR_CONTROLLER_REVIEW`; draft PR #142 is published. GitHub is authoritative for the current
  head and quality result. Sol XHigh may decide mergeability only when that current head has successful quality and two
  fresh exact-head independent Reviews; any head change repeats those gates. No approval or merge is claimed.

## Staging finalize Bug authorization — 2026-08-12

- The initial human-authorized synthetic staging evidence proved owner reservation and private upload HTTP 204, then
  `finalize` returned `storage_unavailable`; owner list/detail were not exercised in that first run.
- Focused Bug #134 may add privacy-safe, stage-enum-only temporary diagnostics, deploy only to the existing staging
  function, rerun the same synthetic GPX once, and apply a minimal storage-boundary fix only if the captured cause is
  inside its exact allowlist. OpenID, file IDs, paths, hosts, signed URLs, payloads, bytes, coordinates, secrets and
  arbitrary provider messages must never be logged or persisted.
- The single diagnostic rerun was consumed: begin/upload and owner list/detail succeeded, while `finalize` still
  returned `storage_unavailable` and the detail truthfully showed `awaiting_upload`.
- After two independent Reviews approved the diagnostic-free fix, it was uploaded to the existing staging function.
  Human then authorized exactly one post-fix synthetic owner smoke. That run reached a new reservation and private
  upload, but `finalize` returned the public `store_unavailable` error. The stop condition prevented list/detail or
  any retry. No temporary diagnostic was restored. That authorization is consumed; any diagnosis or additional
  staging invocation needs a new controller scope/authorization. S7 remains blocked.
- Read-only diagnosis localized the new `store_unavailable` to the final processing-state database transition after
  immutable review upload. The human authorized a bounded transaction-bound document CAS fix for final/reset paths,
  production-shaped and rollback tests, two fresh independent Reviews, and diagnostic-free staging deployment only.
  No post-deploy invocation, upload, retry, delete, review, timer or publication is authorized by this increment.
- The transaction-bound fix and mutation-sensitive stale status/version/lease Review-fix passed two fresh independent
  Reviews. Sol uploaded the diagnostic-free function to existing staging and verified deployed-source equality by
  read-only download; it was not invoked afterward. The human now grants standing authorization for the same bounded
  privacy-safe synthetic owner smoke after reviewed staging changes: one new synthetic attempt per run, stop on the
  first failure, and no automatic retry. This covers only
  `begin -> private upload -> finalize -> owner list -> owner detail`; it never covers deletion, administrator review,
  timers, publication, production or real identity/location data. S7 remains blocked until runtime evidence passes.
- The first run under this standing authorization reached a fresh reservation and private upload, but `finalize` still
  returned public `store_unavailable`; the run stopped before owner list/detail and did not retry. The standing
  authorization remains in force for later reviewed staging changes; this failed attempt does not authorize diagnosis
  or any broader action.
- The human now authorizes one bounded transaction-stage diagnosis increment for that failure. It may add only a
  temporary fixed-enum observation at transaction start, document get, frozen-condition match, document update and
  commit boundaries; it must never record identity, record/file IDs, paths, payloads, file content, coordinates,
  secrets, arbitrary provider messages or stacks. The increment requires focused RED/GREEN, full local gates and two
  independent Reviews before staging deployment. After deployment, the standing authorization permits exactly one
  fresh synthetic-owner attempt; the observation must then be removed, re-reviewed and replaced by a diagnostic-free
  fix only if the captured cause remains inside #134's existing allowlist.
- The fixed-enum capture localized the failure to the transaction document update. Pinned-SDK reproduction then
  proved that a parsed summary was flattened into `summary.*` beneath an existing `summary: null`; the reviewed
  diagnostic-free fix replaces the top-level summary with `db.command.set`. After full local gates and two fresh
  independent Reviews, Sol uploaded that diagnostic-free function to existing staging. One standing-authorized,
  identity-free/location-free synthetic owner run then passed reservation, private upload, finalization to
  `pending_review`, owner list and owner detail without retry. This verifies only that bounded owner path; S7 remains
  blocked pending administrator/rejection/cancel/lease-recovery evidence.
- On 2026-08-19, the remaining S7 runtime slices passed with anonymous synthetic data: administrator list/detail,
  one exact rejection with owner synchronization, one exact cancellation with owner synchronization, and recovery of
  one stale processing lease through the authenticated owner finalize path. Finalization returned `pending_review`;
  owner list/detail and a read-only database check agreed, the processing lease was cleared and the normalized summary
  remained 2 points / 1 segment. The same read-only console session verified all six required indexes with exact field
  order/direction and uniqueness. S3a–S3f and S7 are now `VERIFIED`; #134 is closed. No timer, production/public release,
  real identity or real location was involved. Only the two exact synthetic cleanup actions previously authorized by
  the human were performed.
- No additional deletion or administrator mutation is authorized by this checkpoint beyond the two exact synthetic
  actions recorded above. Timer, permission/schema/API expansion, production deployment, publication and real-user
  data remain unauthorized. Temporary diagnostics must stay removed.

## C07 implementation checkpoint — 2026-08-10

- The bounded frontend moves the owner/admin track orchestration and render into
  `taro-app/src/pages/community-track/index.jsx`; the existing `track-submission-model` and
  `track-submission-service` remain the single state/I/O seams.
- `pages/community-track/index` is registered. The homepage keeps one `社区轨迹` entry and the existing
  route-not-found/location-failed manual fallback adds `提交轨迹供审核`; the homepage no longer renders track/admin
  cards or visible CLIMB SUPPORT and requests retain `climbSupport='solo_or_unsure'`.
- The focused contract recorded a real missing-page RED before implementation and is GREEN after mutation-sensitive
  route/config/homepage/secondary-page/unmount assertions. Local gates are code evidence only; staging upload/review,
  timer, deployment and runtime model visibility remain separate and unverified.

## C07 review-fix round 1 checkpoint — 2026-08-10

- The focused UI contract now asserts element-level handlers for both homepage entries, the secondary submit button,
  owner list actions and owner detail actions. Each isolated binding-removal mutation produced a real RED and was
  restored to GREEN; the final output is `PASS: C04/C05/C07 track-submission UI contract`.
- Production implementation remains unchanged. The required local gates remain code evidence only, with runtime model
  identity `UNVERIFIED_RUNTIME_MODEL` and #123 staging upload/review/timer rows still blocked.
- Executor status: `READY_FOR_CONTROLLER_REVIEW`.
- Open work / Next action: draft PR #132 is published; wait for latest-head CI and two exact-head actual-diff Reviews.
  Sol XHigh then decides whether to mark ready and merge. No approval or merge is claimed in this checkpoint.

## C07 review-fix round 2 authorization — 2026-08-10

- The human approved a clearer disclosure hierarchy on the secondary page: rename the owner card to `提交私有轨迹`,
  remove the long rights/platform text from the top, keep a concise private-review and exact 30/180-day summary plus
  consent before submission, and place the complete unchanged explanation below the submit button in a collapsed,
  user-expandable disclosure.
- This is a bounded presentation change only. The rights text, consent requirement, retention periods, uploader
  validation, owner/admin workflow, TP-D056 Option A and all server/data contracts remain unchanged.
- The local Review-fix requires a real focused RED, final full gates, two fresh independent Reviews and latest-head
  GitHub quality before Sol may reconsider mergeability.

## C07 review-fix round 2 checkpoint — 2026-08-10

- The focused UI contract recorded a real RED before the page edit, then returned GREEN after the owner-card title,
  concise pre-submit privacy summary, consent ordering and collapsed full-policy disclosure were implemented.
- Six isolated production mutations (rights placement, summary removal, consent reorder, platform-copy placement,
  disclosure default and toggle handler) each produced RED and were restored. The unchanged `RIGHTS_COPY` and
  `RIGHTS_PLATFORM_COPY` remain below submission; no model/service/server behavior changed.
- The full required matrix, integration `55/0`, lint (0 errors/9 existing warnings), typecheck, fixture-free WeChat
  build and `git diff --check` pass. Runtime model identity remains `UNVERIFIED_RUNTIME_MODEL`; #123 staging rows
  remain `BLOCKED_STAGING`.
- Executor status: `READY_FOR_CONTROLLER_REVIEW`.
- Open work / Next action: round 2 is published to existing draft PR #132. Live GitHub PR metadata is the dynamic
  source for the current head and quality result; the final docs-only status sync still requires latest-head CI and
  two exact-head independent Reviews before Sol XHigh decides mergeability. No approval or merge is claimed here.

## C07 merge checkpoint — 2026-08-10

- PR #132 exact head passed GitHub quality and two independent exact-head Reviews with no P0–P3, then squash merged
  to `main@86fafb6`; #131 closed only after the remote merge was confirmed.
- C07 is complete. The Goal remains `ACTIVE — BLOCKED_STAGING` because #123 still lacks the separately controlled
  upload/review/delete/timer runtime evidence. No deployment, cleanup enablement, production release or Goal-level
  completion is claimed.

## 6. Completion criteria

- all child Issues close through compliant PRs and latest-head CI;
- the exact mode/status/error/DTO contracts in `TRACK-SUBMISSION-1` are implemented and tested;
- raw data remains creator/service/admin private; owner/admin authorization and forged-identity tests pass;
- parser/file limits, XML safety, retry/concurrency and cleanup-pending behavior are demonstrably enforced;
- raw/evidence deadlines, internal timer idempotency and deletion-pending truthfulness are behavior-tested;
- no route catalog, operational status, deterministic result or public UGC path is mutated;
- CloudBase collection/index/env/function changes are executed only through the separately approved C06 staging step;
- final Review reports code-ready versus deployed/closed-beta-tested truthfully.

C06 evidence must retain the honest test-order note `TDD_DEVIATION_INITIAL_GREEN`: existing C01–C05 public seams
already supplied the required behavior, so the new vertical acceptance skeleton ran GREEN before its independent
literal-oracle and mutation probes were added. No artificial failure or missing-script RED is manufactured.

## 7. Agent routing and stop conditions

Sol XHigh owns design, child contracts, scheduling, independent Review, merge and Goal acceptance. Bounded
implementation uses the exact custom Agent `luna-worker` configured at `gpt-5.6-luna/max`; runtime identity is
recorded separately from configuration. Terra is not an automatic fallback. Stop for the human conditions in
`docs/community-track-workflow.md`, including permission broadening, platform-rights uncertainty and production.

---

# Historical completion record — TP-STAGING-001

- Goal ID: `TP-STAGING-001`
- Status: `COMPLETE — CONDITIONAL_GO`（approved PR #116 merged as `b1bc994`）
- Governance: `TP-GOV-2.0.0`
- Started: `2026-08-09`
- Completed Issue: `#114`
- Release boundary: validate the existing closed-beta staging environment; no production or public release

## 1. Current objective

Treat the existing `cloud1-d0gtzgqzh9c128aaf` environment as the only pre-production staging candidate and verify
the real AppID, CloudBase functions, private collections, openid ownership, live weather/AI dependencies, five-route
management status, TripContext v2 cutover and rollback boundary. This Goal may recommend a separately authorized
5–10 user closed beta, but it does not create a production environment, publish the mini-program or claim real-user
validation.

## 2. Current scope and order

1. Complete Issue #114 staging validation and publish a durable Go/No-Go report. The reviewed result is
   `CONDITIONAL_GO` for a bounded four-route cohort and became effective when PR #116 merged.
2. Rotate the `AMAP_KEY` and `LLM_KEY` before any new closed-beta invitations because the CloudBase console exposed
   their plaintext values during the authorized configuration inspection. Secret values must never enter Git,
   Issue bodies, PRs, screenshots or durable project documents. The human confirmed rotation on `2026-08-09`, and
   a fresh full-route/weather/queryId-advice smoke succeeded without inspecting the new values.
3. Keep the existing database collections and storage permissions private unless a later reviewed Issue explicitly
   changes them. Do not delete records or run an irreversible migration.
4. After #114 reaches an approved staging conclusion and merges, activate the separately scoped community-track Issue #115. That Goal
   will accept private GPX/KML submissions, require explicit uploader rights/consent, keep geometry and identity
   private during review, and require administrator approval plus official management evidence before a route can
   be promoted into the trusted catalog.

## 3. Non-scope

- production deployment, public release or a second paid CloudBase environment;
- automatic publication of user tracks as route facts;
- public UGC feeds, social features or public raw-track downloads;
- destructive cleanup, production data migration or dependency/framework upgrades;
- treating AI, a GPX/KML file or a third-party platform page as proof that a route is currently open.

## 4. Completion criteria

- AppID/environment/function/collection/storage/log evidence is recorded without secret values;
- latest local quality, integration and WeChat build gates pass;
- at least one real full-route `prepare → queryId → advice` flow and private history save/list are verified, while
  offline five-pilot coverage is clearly distinguished from live runtime evidence;
- five pilot management states are refreshed against current primary sources and any unresolved exact-route status
  remains visible as unknown or excluded from the first user cohort;
- TripContext v1 is drained without deletion, v2 is proven live, and rollback does not reintroduce v1;
- credential rotation and any remaining human-only runtime rows are either completed or explicit blockers;
- the final report states `GO`, `CONDITIONAL_GO` or `NO_GO` for a 5–10 user staging beta and does not overclaim
  production readiness.

The #114 report satisfies these criteria with `CONDITIONAL_GO`: the CloudBase package is human-confirmed for the
closed-beta window; Wugong, Siguniang, Blue Moon Valley–Yunshanping and Dangling form the initial allowlist; Gongga is
excluded; Wutai remains blocked; post-rotation AMap fallback remains a disclosed non-critical unverified row.

## 5. Agent routing and stop conditions

Sol XHigh owns environment inspection, risk decisions, contracts and final acceptance. Bounded implementation after
planning uses the exact custom Agent `luna-worker`; Terra is not an automatic fallback. Stop for human confirmation
before rotating secrets, changing permissions, creating a second environment, modifying authentication/admin
authority, deleting data, deploying production configuration or accepting material new cost.

---

# Historical completion record — TP-BETA-001

- Goal ID: `TP-BETA-001`
- Status: `COMPLETE — CODE_READY`（approved PR #111 merged）
- Governance: `TP-GOV-2.0.0`
- Started: `2026-08-06`
- Release boundary: code-ready for closed beta; no deployment or publication

The controller approved planning PR #9 on `2026-08-06`. M1–M5 are complete. Under TP-D039,
official/operator material governs management and restriction facts while Sol-reviewed community tracks
may provide geometry for the routes they actually record. Five full reviewed-track Variants and one Wutai
blocked record are merged through PRs #79–#82/#87. I13's permanent-ID catalog resolver merged through
PRs #88/#89 as `c5d7d7c`, closing #22 and M3. I20's reducer/service seam merged through PRs #70/#71.
M6 is complete. The human released the earlier pause and replaced the temporary Terra fallback with the exact
custom Agent `luna-worker`. I21 implementation and two bounded Review-fix rounds passed two independent Sol final
reviews, latest-head quality, and squash merged through PR #93 as `be24b07`; GitHub #30 is closed.
I22b PR #98 then passed two bounded Review-fix rounds, complete local WeChat DevTools visual evidence,
latest-head quality and independent Sol Review, and squash merged as `852e86d`; #95 and parent #31 are closed.
I23a private-history idempotency merged through PR #102 as `107fab4`; I23b bounded recovery passed two independent
final Reviews and merged through PR #103 as `097c921`. #99, #100 and parent #32 are closed. I24 planning PR #104
merged as `6869a7b`; its serial children then merged through PRs #108–#110. I24c/#107 and parent #33 are closed at
`main@1bba5f9`, with unavailable DevTools rows truthfully retained as `UNVERIFIED_RUNTIME_TOOL`. The Sol-owned
I25/#34 Goal-wide Review is approved; PR #111 merge makes the completion report and M7 code-ready conclusion effective.

## 1. Objective

Deliver a reproducible, reviewable WeChat mini-program that uses verified route context, hourly weather, and deterministic rules to produce `go`, `caution`, `no_go`, or an explicit unavailable state. AI may explain but cannot change trusted facts or verdicts.

## 2. Background and current state

The Taro app and two CloudBase functions are the current product. Engineering gates, wind units,
trip date windows, route type propagation, fuzzy confirmation, hourly evaluation and deterministic
safety composition, trusted second-stage context and private-only history are complete. Five reviewed
community tracks are merged as full RouteVariants; the fifth route's planning PR #86 froze its contract,
and implementation PR #87 passed main-controller and second independent Sol Review plus latest-head
quality, then squash merged as `4c17f45` and closed #77. The RouteVariant-backed input/result experience
remains. I20's explicit reducer and getAdvice service seam is complete. I13 now owns the production catalog
and pure resolver;
I21's dependency was satisfied and its public cutover is merged through PR #93. I22 planning PR #96 merged as
`ac4ba9e`; I22a PR #97 passed latest-head quality and independent Sol Review, merged as `6e12f25`, and closed #94.
I22b merged through PR #98 as `852e86d`. I23a/I23b merged through PRs #102/#103, completing the recovery flow.
I24's serial #105 compatibility cleanup, #106 automated acceptance and #107 DevTools evidence package are complete.
I25/#34 completed the Goal-wide Review with two independent `APPROVED` results and no P0–P3 finding. Its docs-only
PR #111 makes the code-ready completion verdict effective when merged.

Current verified baselines are route type `91/0`, weather `86/0`, unit `55/0`, and offline integration `55/0` after
I24a retires two legacy advice weather/sun checks and replaces them with one structured non-exposure check. The
GitHub `quality` check runs install, lint, typecheck, tests, integration, and the WeChat build on every PR.

## 3. Read first

Follow the mandatory order in `AGENTS.md`; it is the only file that defines session reading order. After the governance and active-task files, read the product, architecture, development, testing, workflow and collaboration documents named by the active Issue.

## 4. Scope

In scope: minimal engineering gates; fuzzy confirmation; deterministic safety merge; `Place / Route / RouteVariant`; five curated pilot variants whose geometry may come from reviewed community tracks, plus one official blocked record; multi-point hourly weather; deterministic verdicts; server-owned `queryId`; private history and public UGC shutdown; explicit frontend states; final integrated review.

Out of scope: deployment, publication, live beta research, native apps, multilingual, social/community, payment, H5 sharing, in-trip navigation, rescue coordination, climbing instruction, Taro major upgrades, destructive data migration, and broad visual redesign.

## 5. Milestones

| Milestone | Status | Issues | Done when |
|---|---|---|---|
| M1 Engineering gate | Complete | I01–I03 | Fresh install, unified commands, CI and PR protection work |
| M2 Correctness | Complete | I04–I06 | Response phases, confirmation and deterministic safety merge are tested |
| M3 Route domain | Complete | I07–I13 | Domain model, five sourced variants, blocked record and permanent resolver are merged |
| M4 Weather and verdict | Complete | I14–I16 | Hourly windows and `TP-VERDICT-1` are deterministic |
| M5 Trust and privacy | Complete | I17–I19 | `queryId` is server-owned; history is private; public UGC is disabled |
| M6 Core UX | Complete | I20–I23 | Explicit states, inputs, results and recovery form a complete flow |
| M7 Acceptance | Complete on PR #111 merge | I24–I25 | Full validation, documentation sync and Goal report are complete |

The exact Issue contracts and dependency graph are defined in `docs/development-plan.md`. I10a's
official Wutai blocked record remains complete; the former small-pilgrimage full route is superseded,
and #77 delivered the reviewed KML-backed fifth plannable pilot. I13 PR #89 merged as `c5d7d7c` and
closed #22, completing M3. I21 planning PR #90 merged as `c817bbb`; implementation PR #93 merged as
`be24b07` and closed #30. I22 planning PR #96 merged as `ac4ba9e`; #94 merged as `6e12f25`; #95 and parent
#31 closed after PR #98 merged as `852e86d`. I23a/#99 and I23b/#100 then merged through PRs #102/#103 and parent
#32 closed. I24 planning PR #104 merged as `6869a7b`; I24a PR #108 merged as `1a2f485`; I24b PR #109 merged as
`f311d1b`; I24c PR #110 merged as `1bba5f9`, closing #107 and parent #33. I25/#34 Review is complete; the controller
closes #34 and M7 after approved PR #111 merges.

## 6. Agent routing

Sol XHigh owns design, contracts, scheduling, review, merge decisions, escalations and final acceptance. The
bounded implementation executor is the custom Agent named `luna-worker`, loaded from
`~/.codex/agents/luna-worker.toml` and configured for `gpt-5.6-luna` with `max` reasoning. Terra's completed
work remains valid history, but Terra is no longer an automatic fallback and requires new explicit human
authorization. Implementation Agents cannot change Goal scope, public contracts, architecture, dependency
policy, or acceptance criteria and cannot merge their own PRs.

## 7. PR and quality rules

One Issue, one primary objective, one `codex/<issue-id>-<slug>` branch, one focused PR, squash merge. About 400 non-generated changed lines or 10 files is a reviewability signal rather than a mechanical limit. Every changed behavior needs a meaningful test. Default gates are install, lint, typecheck, unit, integration, and WeChat build once M1 defines them.

## 8. Stop conditions

Stop and request human confirmation for deployment, production configuration, secrets, destructive or irreversible data operations, authentication/privacy changes not already authorized by TP-D008, major stack replacement, material new cost, Goal-level product trade-offs, or inability to meet route source policy. I19's non-destructive private-history and UGC-path closure is already authorized. Escalate to Sol XHigh for contract drift, public API changes, major dependencies, cross-module failures, scope growth, or two failed review-fix rounds.

## 9. Completion

The Goal is complete only when I01–I25 plus replacement child #77 are closed with compliant review evidence, `main` quality gates are green, five verified variants and the Wutai blocked record meet the hybrid source policy, all trusted/degraded flows are testable, documentation matches implementation, no Goal P0/P1 blocker is hidden, and a final report records milestones, PRs, tests, decisions, limitations, risks, debt, follow-ups, and release recommendation. Deployment and real-device beta execution are not required.
