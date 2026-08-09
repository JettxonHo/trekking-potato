# Staging deployment validation

- Goal: `TP-STAGING-001`
- Issue: `#114`
- Environment: `cloud1-d0gtzgqzh9c128aaf`
- Date: `2026-08-09`
- Status: `IN_PROGRESS — CONDITIONAL_NO_GO`

## 1. Decision boundary

`cloud1-d0gtzgqzh9c128aaf` is the only observed CloudBase environment and is treated as the pre-production staging
candidate. It is not production. This validation may authorize a later 5–10 user closed beta, but it does not publish
the mini-program, create a second environment, migrate data or authorize a public beta.

Current provisional verdict: **CONDITIONAL_NO_GO**. Core live dependencies work, but credentials must be rotated and
route-management eligibility for the first user cohort must be frozen before invitations are sent.

## 2. Environment inventory

| Area | Observed state | Result |
|---|---|---|
| Mini-program project | `taro-app`, AppID `wx5a3fb7bfbe985a60` | Verified |
| CloudBase binding | `taro-app/src/app.js` initializes `cloud1-d0gtzgqzh9c128aaf` | Verified; hard-coded staging debt |
| Environments | One environment, `cloud1`, personal plan, observed expiry `2026-08-30 23:59:59` | Staging only; renewal/expiry blocker for any longer beta |
| Functions | `getAdvice`, `history`; status normal; ordinary functions; Node.js 16.13 | Live but runtime is legacy debt |
| Function resources | 256 MB; `getAdvice` timeout 60 seconds | Verified for current smoke |
| Direct database ACL | `trip_contexts` and `history` are administrator-only | Correct: clients use Cloud Functions |
| Storage ACL | only file creator and administrators may read/write | Private-by-default; suitable for future private submissions |
| Known legacy collection | `routes` still exists | Not used by current trusted catalog; do not treat as public UGC |
| Production environment | none observed | Not configured or validated |

## 3. Real runtime evidence

### Verified live

- WeChat DevTools opened the normal `taro-app` project rather than the historical native prototype.
- Cloud development initialized successfully with no runtime error.
- A real `武功山反穿` query resolved to the full two-day trusted RouteVariant.
- The result contained two activity windows and multiple hourly weather sample points from Open-Meteo.
- Deterministic rules returned `no_go` for the observed weather. AI loaded later as an explanation and did not replace
  the deterministic result.
- A server-owned query context was created, advice succeeded, and current v2 records appeared in `trip_contexts`.
- Private history save/list succeeded for the current openid. The UI displayed the new record and older private
  records; no delete or clear operation was performed.
- Recent CloudBase log rows observed for both functions returned successful invocation status codes.

### Human evidence

The project owner reports that `trip_contexts` and `history` were created and a real-device smoke test was completed.
This is recorded as owner-supplied evidence. The controller did not independently reproduce the physical-device run.

### Offline evidence, not live-cloud evidence

`npm run test:beta-acceptance` exercises all five exact pilots plus blocked/place-only/insufficient/advice/history and
recovery boundaries using the repository's deterministic offline harness. This provides broad contract coverage but
must not be described as five successful live CloudBase/phone journeys.

## 4. Credentials and configuration

The CloudBase function configuration page rendered both external-service secret values in plaintext during the
authorized inspection. No value is reproduced or stored here. Treat both values as exposed and rotate them before
inviting any new user. After rotation, run one real place-resolution request, one full-route base request and one
queryId-only advice request, then verify the latest function logs.

Additional configuration debt:

- the environment ID is embedded in `taro-app/src/app.js` instead of selected by a staging/release configuration;
- the Cloud Functions run on Node.js 16.13;
- the personal environment's observed package expiry is close to the planned beta date;
- the repository still contains the old native mini-program entry covered by open Issue #83 and conflicting PR #84.

None of these should be silently changed inside #114.

## 5. Database, storage and cutover

### Collections

- `trip_contexts`: current observed records were created after the latest function deployment and use the v2 code
  path proven by successful advice.
- `history`: current live save/list works through the Cloud Function and openid ownership boundary.
- existing `_id` and `_openid` indexes are sufficient for the observed 5–10 user staging load. A speculative compound
  index is not required unless CloudBase reports an actual query/index failure.

### TripContext v1 → v2

No destructive migration is required. The v2 deployment rejects a legacy v1 context as
`query_context_unavailable`, and contexts expire after approximately 30 minutes. Cutover procedure:

1. stop uploading a v1 function build;
2. wait at least 30 minutes after the last v1 deployment/call before inviting beta users;
3. confirm new `trip_contexts` records are created by the v2 build and queryId advice succeeds;
4. leave expired records to normal retention/cleanup; do not delete them as part of cutover;
5. rollback only to the last known-good v2 build. Do not roll back to v1 after v2 contexts are in use.

The observed current records were post-deployment v2 requests, so the functional cutover is working. The remaining
human gate is to record the final 30-minute drain timestamp before invitations.

### Storage boundary for the next feature

The current creator/admin-only storage policy is the correct default for raw GPX/KML. A later submission feature may
allow an authenticated creator to upload a private file, while a server-side review function and administrators can
read it. Approved raw files must not become public automatically. A separately generated, privacy-scrubbed reviewed
artifact may be promoted only through the future route-governance workflow.

## 6. Route-management refresh

Geometry evidence and current operational status are separate facts. The existing five full variants honestly expose
`operationalStatus=unknown`; that state must remain visible unless exact-route primary evidence supports a stronger
value.

| Pilot | Current primary-source observation | Staging cohort decision |
|---|---|---|
| 武功山·龙山村至景区正门反穿二日线 | The official scenic site is operating, but also publishes a prohibition on non-developed-area crossings. No exact official notice was found that approves this reverse Variant. | Keep `unknown`; require manual pre-trip confirmation. |
| 四姑娘山二峰·海子沟两日线 | The official site lists current Haizigou entry hours and requires outdoor registration. This does not by itself prove the exact summit route is open on a given day. | Keep `unknown`; require registration/operator confirmation. |
| 蓝月谷—云杉坪一日线 | Current summer ticket material covers Blue Moon Valley and Yunshanping; an earlier notice temporarily closed a downstream Blue Moon Valley area. Exact walking-connection status remains unproven. | Keep `unknown`; require same-day attraction confirmation. |
| 贡嘎西南坡·老榆林—玉龙西三日线 | Kangding's official notice closes undeveloped/unopened risky areas from 2025-11-20 until a later reopening notice. The exact Variant is not named, so `blocked` cannot be inferred mechanically, but open status is not established. | Exclude from the first live cohort until exact operator/authority confirmation. |
| 党岭村—葫芦海—卓雍措一日线 | Current government material confirms the place and management context, not exact-route opening. | Keep `unknown`; require local operator confirmation. |
| 五台山大朝台 | Existing official restriction record remains authoritative. | Keep blocked; never offer as plannable. |

## 7. Dependency and runtime risk

The current official npm audit results are:

- root production tree: `0` advisories;
- Taro app production tree: `46` transitive advisories (`4 critical`, `24 high`, `13 moderate`, `5 low`);
- each Cloud Function tree: `6` transitive advisories (`5 high`, `1 moderate`) through the pinned CloudBase SDK tree.

No direct application exploit was demonstrated in this validation. These findings do not require an unreviewed Taro
or SDK upgrade before a tightly limited staging smoke, but they block a production-readiness claim. Before production,
create focused reachability/upgrade Issues and revalidate the full quality and device matrix.

Observed DevTools warnings are currently non-blocking: gray-release base library 3.17.1, SharedArrayBuffer deprecation,
`getSystemInfo` migration guidance and a webview `scroll-view` padding warning.

## 8. Local quality evidence

Executed on `main@da18b68` before the docs-only validation diff:

- `npm test` — PASS, including route `91/0`, weather `86/0`, unit `55/0` and five-pilot Beta acceptance;
- `npm run test:integration` — PASS `55/0` (legacy fixture pipeline, not five live cloud routes);
- `npm run lint` — PASS with `0` errors and `9` existing warnings;
- `npm run typecheck` — PASS;
- `CI=1 npm run build:weapp` — PASS with Taro `4.0.9`;
- `git diff --check` — PASS after the staging documentation activation.

## 9. Remaining gates

- [ ] Human rotates both external-service keys and confirms completion without posting their values.
- [ ] Re-run post-rotation AMap, real weather/base and queryId advice smoke plus function-log check.
- [ ] Record an exact 30-minute v1 drain timestamp.
- [ ] Confirm the CloudBase personal package will remain valid for the full planned beta window.
- [ ] Freeze the initial route allowlist; recommended: exclude Gongga until exact opening evidence exists.
- [ ] Decide whether the owner's existing real-device smoke is sufficient or capture one fresh post-rotation device run.

Until these gates close, do not invite external testers. Community-track Issue #115 may be planned in parallel, but
its implementation, deployment and permission changes remain blocked behind this staging decision and the human
administrator-identity decision.
