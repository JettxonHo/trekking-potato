# 社区轨迹提交与管理员审核合同

- Goal: `TP-COMMUNITY-001`
- Parent Issue: `#115`
- Contract version: `TRACK-SUBMISSION-1`
- Status: `PLANNING_ACTIVE`
- Scope: private GPX/KML submission, deterministic validation and administrator review; no catalog publication

## 1. Product outcome and trust boundary

An authenticated closed-beta user may submit one GPX or KML file that they created or are authorized to share. The
system validates and summarizes the real stored file, keeps raw geometry private and lets an allowlisted administrator
approve it as community geometry evidence. Approval is not route publication and does not establish permission,
opening status, safety, weather, route type, fixed days or a verdict.

The trusted-catalog promotion remains a separate controller-owned Issue/PR that combines reviewed geometry with
official/operator management evidence, creates explicit Source/Place/Route/RouteVariant data, runs route tests and
passes Sol Review.

Third-party platforms such as 两步路 or 六只脚 are provenance labels, not import APIs. The product does not scrape,
bulk-download or bypass platform controls. A user may upload an exported track only when they are its creator, have
creator authorization or can identify a compatible open licence.

### Exact rights and privacy copy (`track-rights-v1`)

The user interface must show the following text before `begin`; no preselected checkbox is allowed:

> 提交前请确认：这是我本人记录、已获得记录者明确授权，或采用允许本次复制和私下审核的开放许可之轨迹。
> 文件可能包含精确位置、海拔和时间等敏感信息。原始文件仅供提交者本人、系统服务和获授权管理员
> 私下审核，不会自动公开。审核通过只表示可作为几何证据，不代表路线已开放、安全或已经发布。
> 从服务端完成不可变审核快照起，原始上传、审核副本和含身份提交记录的可访问期最长 30 天；
> 去身份几何证据的可访问期最长 180 天。取消、无效或拒绝会立即尝试删除原始文件；
> 期限到达后内容立即不可读取、审核或继续使用，并进入物理删除。若云端删除失败，
> 物理清理可能延迟，但内容仍保持不可访问；系统会记录待清理并继续重试，不会宣称已删除。
> 我同意按上述保留与删除规则处理该文件。

The selected rights basis adds one exact line:

- `own_recording`: `这是我本人记录的轨迹，我有权将其提交给徒步薯作私有审核。`
- `authorized_by_creator`: `轨迹记录者已明确授权我将此文件提交给徒步薯作私有审核。`
- `open_license`: `此轨迹采用我填写的开放许可，且该许可允许本次复制与审核使用。`

The UI also states: `不要上传从第三方平台抓取、破解下载或无权再分发的轨迹。两步路、六只脚等平台仅可作为私有来源说明；请先使用平台提供的合法导出方式并确认你有权提交。`

## 2. User and administrator flows

### User

1. Choose one local `.gpx` or `.kml` file; KMZ/ZIP and remote URLs are not accepted.
2. Enter a route title, optional region/note and optional provenance page URL.
3. Select `own_recording`, `authorized_by_creator` or `open_license`, then explicitly accept `track-rights-v1`.
4. Call `begin`; upload only to the returned random reserved `cloudPath`.
5. Upload to the exact reservation path, then call `finalize(submissionId, fileID)` with the opaque CloudBase file ID
   returned by that upload. The server validates the ID against its environment and exact reserved path, bounded-reads
   the object, copies those exact bytes to a
   service-owned immutable review object, and parses that same byte buffer.
6. View only own DTOs. Cancel only while the record is `awaiting_upload`, `pending_review` or `changes_requested`;
   rejected/invalid/cancelled records may use the same action only to retry pending raw cleanup without changing status.
7. If changes are requested, create a new submission with `revisesSubmissionId`; do not overwrite reviewed history.

### Administrator

1. The Cloud Function obtains the caller OpenID from `getWXContext()` and compares it with the exact trimmed entries
   in server-only `TRACK_REVIEW_ADMIN_OPENIDS`. Client `_openid` and admin flags are ignored.
2. List/filter pending records, inspect the private normalized preview and request a fresh raw-file link only through
   `admin_get`.
3. A raw link is generated after authorization, expires in at most 300 seconds and is never persisted or logged.
4. Submit `changes_requested`, `rejected` or `approved_evidence` with the current integer `version` and a random
   `reviewAttemptId`. Replays of the same attempt return the stored result; stale versions are rejected.

`TRACK_REVIEW_ADMIN_OPENIDS` parsing is fail-closed: split on commas, trim every entry, require 1–20 unique entries,
each 6–128 characters with no whitespace/control/comma, and reject any empty or duplicate entry. Missing or malformed
configuration returns `admin_not_configured` before database, storage or URL side effects. Neither the configured set
nor the caller's OpenID is returned or logged.

## 3. Public Cloud Function contract

One new `trackSubmission` Cloud Function uses an exact discriminated mode union:

```text
mode=begin
  input  → beginAttemptId, originalFilename, declaredSizeBytes, title, region?, note?,
           provenancePlatform?, provenancePageUrl?, rightsBasis, rightsAccepted=true,
           rightsDeclarationVersion='track-rights-v1', licenseName?, licenseUrl?, revisesSubmissionId?
  output → upload_reservation | error

mode=finalize
  input  → submissionId, fileID
  output → mine | error

mode=list_mine
  input  → cursor?, limit?
  output → mine_list | error

mode=get_mine
  input  → submissionId
  output → mine | error

mode=cancel
  input  → submissionId, expectedVersion
  output → mine | error

mode=admin_list
  input  → status?, cursor?, limit?
  output → admin_list | error

mode=admin_get
  input  → submissionId, includeRawLink=false
  output → admin_detail | error

mode=admin_review
  input  → submissionId, expectedVersion, reviewAttemptId, decision, note
  output → admin_detail | error
```

Common response phases are exact: `upload_reservation`, `mine`, `mine_list`, `admin_list`, `admin_detail`, `error`.
Unknown fields do not grant authority. All modes authenticate from server context; unauthenticated calls fail before
database, storage, parser or URL side effects.

Every error has one shape:

```text
{
  phase:'error',
  error:{
    code:ErrorCode,
    message:string,
    retryable:boolean,
    retryAfterSeconds:number|null,
    nextAction:'retry'|'refresh'|'restart_upload'|'contact_admin'|null
  }
}
```

Messages are stable Simplified Chinese product copy, not SDK/XML details. `processing_in_progress` is retryable with
`retryAfterSeconds=5,nextAction='refresh'`; `storage_unavailable` and `store_unavailable` are retryable with
`nextAction='retry'`; `upload_reservation_expired` uses `nextAction='restart_upload'`; authorization, structure and
rights errors are non-retryable. A cleanup failure is represented by the returned `Mine.cleanup` state rather than a
contradictory success/error phase.

### Reservation

- `submissionId` and `_id` are the same server-generated random opaque ID.
- The creator-writable reservation is exactly `track-submissions/<submissionId>/upload.<gpx|kml>` and contains no
  OpenID. The verified service-owned object is exactly `track-reviews/<submissionId>/review.<gpx|kml>`.
  Because this path is intentionally stable, C06 must configure and verify a hard `trackSubmission` function timeout
  of at most 240 seconds, strictly below the five-minute processing lease. A stale takeover cannot be enabled in an
  environment that cannot prove this invariant; otherwise an older invocation could overwrite the winner's object.
- `beginAttemptId` is a client-generated random retry identity, scoped to the server OpenID. Same owner/attempt returns
  the first reservation byte-for-byte even when a retry changes other fields; different owners never deduplicate.
  IDs are trimmed strings of 1–80 characters. No hash/SHA is introduced.
- Upload reservation expires logically after 30 minutes. A late `finalize` returns `upload_reservation_expired` and
  never parses the object.
- `fileID` is an opaque upload receipt, not path authority. The storage adapter accepts only a `cloud:` URI with no
  query, fragment, userinfo, port, percent escape, backslash, empty/dot segment or duplicate slash; its host must equal
  the server-only `TRACK_STORAGE_FILEID_HOST` value byte-for-byte, and its pathname must equal the reserved `cloudPath`
  byte-for-byte. A suffix/prefix-only host or path match is forbidden.
- C02 freezes `validateCreatorFileId({ fileID, allowedFileHost, cloudPath })` as the single validation seam.
  `allowedFileHost` comes only from trimmed server configuration and is never returned to clients or accepted as
  input. Missing/malformed configuration fails before a temporary URL or database state change. If staging cannot
  identify the exact host from a normal CloudBase upload receipt, C02/C06 stop instead of weakening this check.
- `TRACK_STORAGE_FILEID_HOST` is one lowercase DNS host of 1–253 characters (`a-z`, digits, dot, hyphen), with no
  scheme, port, slash, whitespace, wildcard or comma. Missing/malformed configuration returns
  `storage_not_configured` before database/storage side effects.
- After validation, the server calls the CloudBase server SDK for a short-lived URL. The immutable review upload uses
  the exact bounded Buffer, and only the canonical review `fileID` returned by the server SDK is persisted. Neither a
  client URL nor a client-supplied review path is accepted.
- `revisesSubmissionId` is accepted only for the same owner and a parent in `changes_requested`. Cross-owner,
  missing and wrong-state parents all return the same `invalid_revision`. Only one non-terminal replacement may
  exist; another is allowed after the previous replacement becomes `cancelled`, `invalid` or `rejected`.

## 4. Input limits

| Field | Rule |
|---|---|
| submission/attempt IDs | server submission ID and client begin/review attempt IDs are trimmed opaque strings 1–80; expectedVersion is integer ≥1 |
| fileID/cursor | fileID is trimmed 1–1,024 characters before strict URI binding; cursor is omitted or 1–2,048 characters before decode |
| filename | basename only, 1–120 Unicode code points, final extension `.gpx` or `.kml` case-insensitive |
| declared/actual bytes | integer `1..10,485,760`; actual server-observed size is authoritative |
| title | trimmed 2–80 code points |
| region | optional trimmed 1–80 code points |
| note | optional trimmed 1–500 code points |
| provenance platform | optional `self / 2bulu / foooooot / other` |
| provenance URL | optional HTTPS URL, at most 500 characters; stored private, never fetched automatically |
| rights basis | exact `own_recording / authorized_by_creator / open_license` |
| open licence | `licenseName` 2–80 and HTTPS `licenseUrl` ≤500 are required only for `open_license` |
| track points | `2..50,000` total; max 200 segments and XML nesting depth 64 |
| coordinates | finite longitude `[-180,180]`, latitude `[-90,90]`; elevation finite when present |

The server obtains a private CloudBase temporary URL for the validated creator `fileID` with `maxAge<=300`. HTTPS `HEAD` is an optional
early rejection only: missing, malformed or oversized `Content-Length` may reject, but a successful HEAD never proves
the final size. The server performs its own streaming GET with an actual byte counter, aborts once more than 10 MiB
arrives, and requires the received bytes to match a valid GET `Content-Length` when that header is present. Chunked
responses remain acceptable only when the actual counter stays in range. The same bounded Buffer is uploaded
by the CloudBase service to the creator-inaccessible review path and passed to the parser. Summary, admin raw link and
approved evidence always reference this review object. The creator upload is then deleted best-effort; replacement of
the creator path before/during finalize cannot alter the immutable review bytes. No client URL, MIME type, coordinates,
summary or declared byte count is trusted, and no hash is needed.

## 5. Safe GPX/KML normalization

C01 uses the exact pinned runtime dependency `saxes@6.0.0` plus its lock file. Before parsing, reject UTF-16/unknown
encodings, NUL, `<!DOCTYPE` and `<!ENTITY` case-insensitively. Only UTF-8 (optional BOM) XML is accepted.
The normalized root namespace/local-name must match the reserved extension (`.gpx` → GPX root, `.kml` → KML root);
renaming one format to the other is rejected as `unsupported_format` rather than content-sniffed into a different type.

- GPX v1 accepts `gpx/trk/trkseg/trkpt` with required `lat/lon`, optional finite `ele`, and private `time` presence.
  Waypoints and routes do not become track points.
- KML accepts `kml/.../LineString/coordinates` tuples `lon,lat[,ele]` and KML 2.2 extension
  `gx:Track` in namespace `http://www.google.com/kml/ext/2.2`. Each `gx:Track` is one segment and must contain equal,
  non-zero counts of valid RFC-3339 `when` values and three-number `gx:coord` tuples `lon lat ele`; tuples are paired by source
  order and exact times stay private. A mismatch, invalid time or invalid tuple rejects the whole file.
- Supported `LineString` and `gx:Track` segments are preserved in XML document order. KMZ, `NetworkLink` and any
  geometry-bearing unsupported structure reject the whole file with `track_structure_unsupported`; the parser never
  returns a partial summary from the supported subset.
- The parser stops at byte/point/segment/depth limits and never resolves external entities, URLs or linked resources.
- Text is buffered only for supported coordinate/elevation/time elements. Ignored metadata such as KML
  `ExtendedData/description` is never accumulated. One GPX scalar/`when`/`gx:coord` is capped at 256 UTF-16 code
  units; a LineString coordinate block remains bounded by the already validated 10 MiB file and 50,000-point limit.
- Multiple valid segments are preserved. Consecutive identical points may be retained; no speculative map matching,
  smoothing or route merging occurs.

The normalized private summary is exact `track-summary-v1`:

```text
{
  summaryVersion: 'track-summary-v1',
  format: 'gpx' | 'kml',
  pointCount: integer,
  segmentCount: integer,
  bounds: { minLat, maxLat, minLon, maxLon },
  start: { lat, lon, elevationM: number | null },
  end: { lat, lon, elevationM: number | null },
  distanceM: integer,
  elevation: {
    presentPointCount: integer,
    coverage: number,
    minM: number | null,
    maxM: number | null
  },
  hasTimestamps: boolean,
  previewSegments: [{ segmentIndex: integer, points: [{ lat, lon, elevationM: number | null }] }]
}
```

- latitude/longitude are rounded to 6 decimal places, elevation to 1 decimal, coverage to 4 decimals, and distance
  to the nearest metre;
- distance is the sum of Haversine distances between consecutive points within each segment using mean Earth radius
  `6,371,008.8m`; segments are never connected to each other;
- elevation coverage is `presentPointCount / pointCount`; min/max are null only when no point has elevation;
- preview has at most 500 points. First/last of every segment are selected (a one-point segment once), then remaining
  interior points are collected in source order. If they exceed the remaining budget, choose exactly that budget at
  indices `floor(k*(N-1)/(R-1))`; for `R=1` choose `floor((N-1)/2)`. Merge selected points back into original
  segment/point order. Empty preview segments are omitted.

Exact track times are not persisted in the summary. Distance/elevation are review aids and cannot directly become
trusted catalog facts.

## 6. Persistence and DTOs

Collections `track_submissions` and `track_review_evidence` remain direct-client `ADMINONLY`.
`track_submissions` contains the private owner/review lifecycle. `track_review_evidence` contains only the exact
de-identified `ApprovedEvidence` projection and its expiry; it never contains OpenIDs, filenames, raw IDs/paths,
rights/provenance inputs, notes, leases or exact track times. Required indexes are reviewed and created during C06
deployment validation: submission `_openid ASC + recordExpiresAt ASC + updatedAt DESC + _id DESC` for owner lists,
`status ASC + recordExpiresAt ASC + updatedAt DESC + _id DESC` for filtered admin lists,
`recordExpiresAt ASC + updatedAt DESC + _id DESC` for all-status admin/cleanup scans,
`rawExpiresAt ASC + status ASC`, a **unique** `_openid ASC + beginAttemptId ASC`, and evidence
`expiresAt ASC`. C06 verifies the actual CloudBase query planner against each query; if the platform requires an
additional exact compound index, Sol updates this contract before deployment rather than weakening expiry filters.
`begin` handles a duplicate-key race by re-reading and returning that owner's first reservation. A revision parent
stores `replacementSubmissionId`; revision creation runs in one transaction that conditionally changes a same-owner
`changes_requested` parent whose pointer is null and creates the child. This is the only active-revision lock; the
pointer is cleared transactionally only when that child reaches `cancelled`, `invalid` or `rejected`.

The internal record holds `_openid`, reservation/file identifiers, original inputs, rights declaration, private
provenance, normalized summary, status/version, raw-file state, review attempts, private reviewer OpenID and audit
timestamps. It never stores a temporary download URL. Every state-changing write is a compare-and-set using exact
`_id + owner/admin authorization + status + version` (and lease/attempt identity when applicable); zero updated rows
cause a re-read and either an idempotent response or `version_conflict`, never a blind retry write.

Exact v1 persistence shape (nullable fields are stored as null, not omitted):

```text
TrackSubmissionRecord = {
  _id:submissionId, _openid, beginAttemptId,
  status:SubmissionStatus, version:integer,
  originalFilename, format:'gpx'|'kml', declaredSizeBytes,
  cloudPath, creatorFileId:string|null, uploadExpiresAt,
  reviewCloudPath, reviewFileId:string|null, actualSizeBytes:number|null,
  reviewSnapshotAt:Date|null, rawExpiresAt:Date|null, recordExpiresAt:Date,
  input:{ title, region, note, provenancePlatform, provenancePageUrl },
  rights:{ basis, declarationVersion:'track-rights-v1', licenseName, licenseUrl, acceptedAt },
  revisesSubmissionId:string|null, replacementSubmissionId:string|null,
  summary:TrackSummary|null,
  processing:{ leaseId:string|null, startedAt:string|null },
  rawFileState:{ upload:'reserved'|'present'|'deleted'|'deletion_pending',
                 review:'absent'|'present'|'deleted'|'deletion_pending' },
  review:{ attemptId:string|null,
           decision:'changes_requested'|'rejected'|'approved_evidence'|null, note:string|null,
           reviewerOpenid:string|null, reviewedAt:string|null, resultVersion:number|null },
  evidenceExpiresAt:Date|null,
  createdAt, updatedAt
}

TrackReviewEvidenceRecord = {
  _id:serverEvidenceKey,
  approvedEvidence:ApprovedEvidence,
  approvedAt:Date, expiresAt:Date
}
```

The collection stores Date values for query/order fields; DTO projectors convert them to ISO-8601 UTC strings.
`reviewerOpenid`, creator/review file IDs and paths, leases and raw state internals never enter owner/admin DTOs except
through the bounded `cleanup`, `rawAccess` and approved-evidence projections defined below.

Exact public DTOs are:

```text
SubmissionStatus = 'awaiting_upload'|'processing'|'pending_review'|'changes_requested'|
  'approved_evidence'|'rejected'|'cancelled'|'invalid'
OwnerAction = 'upload_finalize'|'refresh'|'begin_revision'|'cancel'|'retry_cleanup'
AdminAction = 'view_raw'|'request_changes'|'reject'|'approve_evidence'

UploadReservation = {
  phase:'upload_reservation', submissionId, status:'awaiting_upload', version:1,
  cloudPath, format, expiresAt,
  allowedActions:['upload_finalize','cancel']
}

Mine = {
  phase:'mine', submission:{
    submissionId, originalFilename, title, region:string|null, format,
    actualSizeBytes:number|null, rightsBasis, rightsDeclarationVersion:'track-rights-v1',
    licenseName:string|null, licenseUrl:string|null,
    summary:TrackSummary|null, status, version,
    reviewNote:string|null, revisesSubmissionId:string|null,
    cleanup:{ pending:boolean, target:'upload'|'review'|'both'|null },
    retention:{ rawExpiresAt:string|null, recordExpiresAt:string, evidenceExpiresAt:string|null },
    allowedActions:OwnerAction[],
    createdAt, updatedAt
  }
}

MineListItem = {
  submissionId, originalFilename, title, region:string|null, format,
  actualSizeBytes:number|null, status, version, reviewNote:string|null,
  revisesSubmissionId:string|null,
  cleanup:{ pending:boolean, target:'upload'|'review'|'both'|null },
  retention:{ rawExpiresAt:string|null, recordExpiresAt:string, evidenceExpiresAt:string|null },
  allowedActions:OwnerAction[], createdAt, updatedAt
}

MineList = { phase:'mine_list', items:MineListItem[], nextCursor:string|null }

AdminDetail = {
  phase:'admin_detail', submission:{
    ...Mine.submission,
    note:string|null, provenancePlatform:string|null, provenancePageUrl:string|null,
    rawAccess:{ url:string, expiresAt:string }|null,
    approvedEvidence:ApprovedEvidenceDisplay|null,
    allowedAdminActions:AdminAction[]
  }
}

AdminListItem = {
  submissionId, title, region:string|null, format, actualSizeBytes:number|null,
  rightsBasis, status, version, reviewNote:string|null,
  revisesSubmissionId:string|null, pointCount:number|null, segmentCount:number|null,
  cleanup:{ pending:boolean, target:'upload'|'review'|'both'|null },
  retention:{ rawExpiresAt:string|null, recordExpiresAt:string, evidenceExpiresAt:string|null },
  allowedAdminActions:AdminAction[], createdAt, updatedAt
}

AdminList = { phase:'admin_list', items:AdminListItem[], nextCursor:string|null }
```

All timestamps are ISO-8601 UTC strings. List `limit` is integer `1..20`, default 10. Results order by
`updatedAt DESC, submissionId DESC`. Cursor is server-produced base64url JSON containing only this tuple plus the
admin status filter; it never contains an OpenID and is rejected on malformed/filter-mismatch input. Owner queries
always add server OpenID before cursor/order conditions.

`admin_list.status` is omitted for all statuses or is exactly one `SubmissionStatus`; arrays, comma-separated values
and unknown strings are `invalid_input`. Cursor comparison is strict lexicographic seek on the frozen descending
tuple: `updatedAt < cursor.updatedAt OR (updatedAt == cursor.updatedAt AND submissionId < cursor.submissionId)`.

`allowedActions` and `allowedAdminActions` are server projections of the status/action matrix below and use the exact
order shown there. Clients hide any action not listed. They do not infer additional authority from status, cleanup,
the presence of rawAccess or locally remembered administrator state.

Every owner/admin list query requires `recordExpiresAt > now`; evidence lookup requires `expiresAt > now`. Owner/admin
detail performs the same server-clock check after read: an expired record returns `submission_not_found`, exactly like
a deleted/foreign record; `raw_unavailable` is reserved for a still-unexpired detail whose immutable raw object is
missing. Expired records, summary, review note and evidence are never projected while physical cleanup is pending.
Client time and hidden buttons are not security controls.

`admin_detail` excludes uploader/reviewer OpenIDs and the admin allowlist. `rawAccess` is returned only when
`includeRawLink=true`, is made from the immutable review object, expires in at most 300 seconds and is not returned
for missing/deleted raw state. No admin-only internal note exists in v1: the exact `reviewNote` submitted by the admin
is visible to the owner after review.

```text
ApprovedEvidence = {
  evidenceVersion:'reviewed-track-evidence-v1',
  sourceKind:'community_track_candidate', reviewStage:'admin_approved',
  title, region:string|null, format,
  geometry:ReviewedGeometry,
  reviewedOn:'YYYY-MM-DD',
  limitations:['geometry_only','not_operational_status','not_route_publication']
}

ApprovedEvidenceDisplay = {
  evidenceVersion:'reviewed-track-evidence-v1',
  sourceKind:'community_track_candidate', reviewStage:'admin_approved',
  title, region:string|null, format,
  geometry:ReviewedGeometry,
  reviewedOn:'YYYY-MM-DD',
  limitations:['geometry_only','not_operational_status','not_route_publication']
}

ReviewedGeometry = {
    summaryVersion:'track-summary-v1', pointCount, segmentCount, bounds, start, end,
    distanceM, elevation, previewSegments
}
```

ApprovedEvidence is private input to a future Sol/controller review; it is not tier A/B and is not a catalog/public
DTO. Its `serverEvidenceKey` exists only as the evidence collection's internal `_id` and is never copied to the
identity-bearing submission, owner/admin DTO, log or future runtime catalog. Only the separate catalog PR may assign
tier B after Sol review. `ApprovedEvidenceDisplay` is derived only from the submission's existing summary,
title/region/format and reviewed date; it contains no evidence-store key and is never used to address
`track_review_evidence`. Approved evidence excludes OpenIDs, reviewer identity, raw paths/IDs/URLs, exact track
times, provenance account/page and user note. A future catalog PR
must create its own public Source projection and cannot copy `serverEvidenceKey` into runtime catalog data.

## 7. Status machine and cleanup

```text
awaiting_upload → processing → pending_review
                            ↘ invalid
pending_review → changes_requested | rejected | approved_evidence | cancelled
changes_requested → cancelled (a replacement uses a new submission)
awaiting_upload → cancelled
```

- `finalize` is idempotent for terminal parse outcomes; concurrent `processing` returns `processing` without a second
  parser run. A replay on `pending_review` or `invalid` retries only raw targets already marked `deletion_pending`,
  never reparses or changes summary/review facts, and never touches a target already `deleted`. Claiming processing
  writes random private `processing.leaseId`, `processing.startedAt` and increments version. A lease is fresh for 5
  minutes. A retry after 5 minutes may conditionally replace the stale lease; a fresh
  lease returns retryable `processing_in_progress` with `nextAction='refresh'` and `retryAfterSeconds=5`. The frozen
  fixed review path is safe only with the separately verified `function timeout <=240s < 300s lease` invariant; C02
  does not claim deployed takeover safety, and C06 must stop rather than weaken this relationship.
- Storage/network failure before immutable snapshot creation conditionally returns the same lease to
  `awaiting_upload`, increments version and returns retryable `storage_unavailable`. A parser/input failure transitions
  to `invalid`, increments version and starts cleanup. If the process crashes or the store write fails after claim,
  the five-minute lease provides bounded takeover; a retry never trusts a prior partial summary.
- The immutable review object is the sole parse/review authority. If its upload succeeds but the subsequent record
  write fails, stale-lease retry rewrites the same service-owned review path from a newly bounded-read creator upload;
  partial/orphan review objects are never surfaced by DTO and are listed for C06 cleanup inspection.
- `admin_review` requires `pending_review`, `now < rawExpiresAt` and an immutable review object in `present` state,
  except replay of the same stored `reviewAttemptId`. The first successful
  attempt stores the exact attempt ID, decision, note and resulting version; replay returns that first stored result
  even if the client changes decision/note. A different attempt after a terminal review returns `invalid_state`.
  Review and owner cancel compete through the same status/version CAS, so exactly one transition wins. It never
  publishes or modifies the route catalog.
- `cancel` is owner-only and valid only in the three documented states. Before any destructive deletion, the first
  successful terminal/snapshot CAS atomically records every planned raw target as
  `rawFileState.upload/review='deletion_pending'` and increments `version`. Server deletion is attempted only after
  that recoverable state exists; success advances the target to `deleted`, while failure leaves it pending.
  For `awaiting_upload`, the server derives the creator object identity only from the validated server storage host
  and the reserved `cloudPath`; it never needs or accepts a client fileID to clean an object uploaded before finalize.
  CloudBase per-file deletion results are authoritative and must match the requested fileID. Status `0` is success;
  the exact pinned-SDK status `-503003` (`storage file not exists`) is also an idempotent success because the target is
  already absent. Any other non-zero status, missing/mismatched item or malformed result is a deletion failure. If the
  cleanup state cannot be persisted with CAS, return `store_unavailable` rather than a Mine projection that falsely
  claims deletion.
- Replaying `cancel` on `cancelled`, `invalid` or `rejected` is an idempotent cleanup retry: a syntactically valid stale
  `expectedVersion` is accepted only for this terminal replay, the service reads the current version, and it retries
  only targets whose current state is exactly `deletion_pending`. It does not change status, review facts or version
  unless pending cleanup state changes, and a fully clean replay has zero storage/database side effects. Replaying the
  same rejecting `admin_review` attempt follows the same rule. Cleanup covers creator upload and immutable review
  objects separately; success sets their internal states to `deleted` and the public `cleanup.pending=false`.
- `begin` sets `recordExpiresAt=createdAt+30 days`. The immutable review snapshot atomically sets
  `reviewSnapshotAt`, `rawExpiresAt=reviewSnapshotAt+30 days` and `recordExpiresAt=rawExpiresAt` exactly once.
  Revision, review, retry and status changes never extend either deadline. `pending_review`, `changes_requested` and
  `approved_evidence` may expose `view_raw` only while the review object is present and `now < rawExpiresAt`.
- Approval transactionally writes a separate `TrackReviewEvidenceRecord` with a random server-only `_id`,
  `approvedAt=reviewedAt` and `expiresAt=approvedAt+180 days`. The submission stores only `evidenceExpiresAt`, and
  admin detail derives an `ApprovedEvidenceDisplay` without the store key. The owner detail remains the exact `Mine`
  DTO above and receives no approved-evidence object. The key is never returned, logged or
  persisted beside `_openid`; the evidence record is geometry-only and cannot retain/rejoin owner/raw provenance.
- A CloudBase timer invokes an **internal**, non-public retention event once per day. It processes at most 20 due
  records per invocation with a stable cursor and exact version CAS. The handler enters this branch only when the
  server-owned environment value is exactly `TRIGGER_SRC='timer'` **and** server context has no OpenID; the event body
  alone never grants timer authority. SDK/client calls can use only the eight public modes, and any client attempt to
  send the internal event is rejected as `invalid_mode`.
  Timer delivery may repeat, so delete and transition operations are idempotent and never depend on exactly-once
  execution.
- At `rawExpiresAt`, owner/admin projections immediately become unavailable and cleanup removes creator and immutable
  review objects. A still-pending or changes-requested submission is not silently approved/rejected and no
  unobservable review note is created; it simply expires and disappears from owner/admin queries. An approved
  submission keeps its still-unexpired de-identified evidence, but raw access ends. At `recordExpiresAt`, the
  identity-bearing submission record is physically deleted. If storage/database deletion fails, the internal
  deletion-pending job remains inaccessible to product callers and retries on later timer delivery; C06 must not claim
  physical deletion passed while due backlog is non-zero.
- At evidence `expiresAt`, every evidence read immediately acts not-found and the timer physically deletes the
  de-identified evidence record. It is not archived, published or
  copied into the runtime catalog. Promotion before expiry still requires a separate controller-owned catalog PR,
  whose public Source is independent from this submission/evidence record.
- `cancelled`, `invalid` and `rejected` start raw cleanup immediately rather than waiting for day 30. Their private
  outcome record remains owner-visible only until `recordExpiresAt`; before that deadline a failed cleanup is visible
  and owner-retryable. At/after the deadline the product projection disappears, while an internal pending job remains
  timer-retryable until physical deletion succeeds. Orphaned reservation/review objects are part of the same timer
  scan and must be reported during C06 staging validation.

### Status/action matrix

| Status | Owner label | Exact owner actions | Exact admin actions |
|---|---|---|---|
| awaiting_upload | 等待上传 | `['upload_finalize','cancel']` | `[]` |
| processing | 正在校验 | `['refresh']` | `[]` |
| pending_review | 等待审核 | `['cancel']` | raw 未到期且存在时 `['view_raw','request_changes','reject','approve_evidence']`，否则 `[]` |
| changes_requested | 需要修改 | `['begin_revision','cancel']` | raw 未到期且存在时 `['view_raw']`，否则 `[]` |
| approved_evidence | 已批准为几何证据 | `[]` | raw 未到期且存在时 `['view_raw']`，否则 `[]` |
| rejected | 未通过审核 | cleanup pending 时 `['retry_cleanup']`，否则 `[]` | `[]` |
| cancelled | 已取消 | cleanup pending 时 `['retry_cleanup']`，否则 `[]` | `[]` |
| invalid | 文件无效 | cleanup pending 时 `['retry_cleanup']`，否则 `[]` | `[]` |

Unavailable actions are hidden, not merely disabled. `processing` is not cancellable because the bounded function may
be copying the immutable object; the owner can cancel if a retry returns the record to `awaiting_upload`. `rejected`
and `invalid` are already terminal and therefore do not transition to cancelled. Ten minutes before an unexpired raw
deadline the detail DTO may show the existing `retention.rawExpiresAt`; v1 adds no notification service. At and after
the deadline list/detail no longer returns the record, all direct owner/admin mutations act not-found, and C04/C05
must not offer revision, cancel, review or raw access from cached data.

## 8. Errors

Public error codes are bounded and contain no raw SDK/XML/URL details:

```text
invalid_mode, unauthenticated, forbidden, admin_not_configured, storage_not_configured,
invalid_input, invalid_rights_declaration, unsupported_format,
upload_reservation_expired, file_missing, file_size_invalid,
upload_binding_invalid, invalid_revision, invalid_cursor,
xml_unsafe, xml_invalid, track_structure_unsupported,
track_limits_exceeded, coordinate_invalid, submission_not_found,
invalid_state, version_conflict, processing_in_progress,
raw_unavailable, storage_unavailable, store_unavailable, processing_failed
```

Internal logs may include request/submission IDs and stable internal error categories, but never OpenIDs, secrets,
temporary URLs, raw XML, coordinates, filenames, user notes or rights/provenance page data.

Exact public mapping:

| Code | Message | Retry / nextAction |
|---|---|---|
| invalid_mode | 请求模式不受支持 | false / null |
| unauthenticated | 请先登录后重试 | false / null |
| forbidden | 无权执行此操作 | false / null |
| admin_not_configured | 审核功能尚未配置 | false / contact_admin |
| storage_not_configured | 轨迹存储尚未配置 | false / contact_admin |
| invalid_input | 提交信息不完整或格式错误 | false / null |
| invalid_rights_declaration | 请确认轨迹权利声明 | false / null |
| unsupported_format | 仅支持 GPX 或 KML 文件 | false / null |
| upload_reservation_expired | 上传已过期，请重新选择文件 | false / restart_upload |
| file_missing | 未找到已上传文件 | false / restart_upload |
| file_size_invalid | 文件大小无效或超过 10 MB | false / restart_upload |
| upload_binding_invalid | 上传文件与本次提交不匹配 | false / restart_upload |
| invalid_revision | 无法基于该记录重新提交 | false / null |
| invalid_cursor | 列表已更新，请刷新后重试 | true / refresh |
| xml_unsafe | 文件包含不允许的 XML 结构 | false / restart_upload |
| xml_invalid | 无法解析轨迹文件 | false / restart_upload |
| track_structure_unsupported | 轨迹结构暂不支持 | false / restart_upload |
| track_limits_exceeded | 轨迹点数、分段或结构超过限制 | false / restart_upload |
| coordinate_invalid | 轨迹包含无效坐标或高程 | false / restart_upload |
| submission_not_found | 未找到该提交 | false / null |
| invalid_state | 当前状态不允许此操作 | false / null |
| version_conflict | 记录已更新，请刷新后重试 | true / refresh |
| processing_in_progress | 正在校验轨迹，请稍后刷新 | true / refresh（5 秒） |
| raw_unavailable | 原始文件暂不可用 | true / retry |
| storage_unavailable | 文件服务暂不可用，请稍后重试 | true / retry |
| store_unavailable | 提交服务暂不可用，请稍后重试 | true / retry |
| processing_failed | 轨迹处理未完成，请重新上传 | false / restart_upload |

Only `processing_in_progress` sets `retryAfterSeconds=5`; every other row uses null. The table is a public product
contract, while localized copy changes later require a reviewed contract update rather than leaking SDK text.

## 9. Test and Review requirements

- parser fixtures cover GPX/KML LineString/KML 2.2 `gx:Track` positive cases, the existing audited style of paired
  `when/gx:coord`, BOM, malformed XML, DTD/entity, encoding, depth, segments, 50,000-point edge, non-finite/
  out-of-range coordinates, pairing/time failures, unsupported KML structures and deterministic sampling;
- owner contracts prove server OpenID, forged identity rejection, DTO projection, begin retry isolation, reserved-path
  and exact environment/bucket/fileID binding, expiry, actual streaming-size authority, immutable-byte snapshot,
  unique begin race, revision lock, processing lease takeover, finalize idempotency, CAS conflicts,
  cancel/delete-pending and zero side effects on invalid input;
- admin contracts prove fail-closed missing config, exact allowlist parsing, non-admin zero side effects, 300-second
  raw link, optimistic version/review retry, cancel/review races, state transitions and no identity/secret leakage;
- retention contracts use an injected clock and duplicate timer events to prove immutable 30-day raw and 180-day
  evidence deadlines, no deadline extension, no early deletion, day-boundary behavior, max-20 pagination/CAS,
  awaiting-upload/processing/pending/changes expiry and post-deadline zero read/review/revision/cancel projection,
  backlog across multiple invocations, approved raw removal without evidence loss, terminal immediate cleanup, evidence
  expiry deletion, exact server-owned `TRIGGER_SRC='timer'` plus empty-OpenID authority, forged event/client inability
  to invoke cleanup, honest deletion-pending recovery, and proof that submission/DTO/log contain no evidence-store key
  while evidence records contain no submission/OpenID/raw/provenance linkage;
- frontend contracts prove explicit rights copy, local extension/declared-size precheck without treating it as trust,
  upload/finalize recovery, all eight status/action rows, cursor pagination, own-status/revision/cancel/cleanup retry,
  admin separation, exact error actions and no public feed;
- cross-layer acceptance proves no mutation/import of the trusted route catalog and no operational-status/verdict
  inference from a submission;
- every implementation PR uses TDD, full root/integration/lint/typecheck/build gates, latest-head CI and independent
  Sol Review. The executor cannot approve or merge its own PR.

## 10. Deployment and stop boundary

Code completion does not deploy the function. C06 requires human-controlled creation of `track_submissions`,
`track_review_evidence` and their indexes (including unique owner + begin attempt and both expiry scans), verified
creator/admin-private storage rules, configuration of `TRACK_REVIEW_ADMIN_OPENIDS` plus exact current
`TRACK_STORAGE_FILEID_HOST`, Cloud Function upload, a daily CloudBase `timer` trigger with its console timezone
recorded, and a dry-run/duplicate-delivery retention check before enabling deletion,
private owner/admin smoke, rejection/cancel cleanup check, processing-lease recovery, rollback instructions and
secret/residue review.
The deployed `trackSubmission` hard timeout must be configured and observed at no more than 240 seconds; the
five-minute stale-processing takeover is forbidden until that strict inequality is verified.
Never ask the human to paste an OpenID into chat or Git; configure it directly in CloudBase.

Stop for human decision if CloudBase cannot expose a trustworthy server-observed object length before download, if
private raw access needs broader storage permissions, if platform terms do not permit the proposed export/share, if
review needs identity disclosure, or if the team wants automatic catalog publication, public community pages,
production rollout, bulk import/scraping or cleanup outside the approved new-record 30/180 lifecycle.

## 11. Implementation references

- CloudBase private storage/access rules: <https://docs.cloudbase.net/storage/data-permission> and
  <https://docs.cloudbase.net/storage/security-rules>
- CloudBase server temporary-file contract (`fileID`, `maxAge`, `tempFileURL`):
  <https://docs.cloudbase.net/api-reference/server/node-sdk/storage>
- CloudBase upload returns `fileID`, and uploading the same `cloudPath` overwrites the existing object:
  <https://docs.cloudbase.net/storage/sdk>
- CloudBase timer triggers support scheduled maintenance and use a seven-field cron configuration:
  <https://docs.cloudbase.net/cloud-function/timer-trigger>
- CloudBase exposes server environment `TRIGGER_SRC=timer` for timer invocations:
  <https://docs.cloudbase.net/cloud-function/function-configuration/env>
- KML 2.2 extension `gx:Track` namespace, `when`/`gx:coord` cardinality and coordinate syntax:
  <https://developers.google.com/kml/documentation/kmlreference#gxtrack>
- Saxes evented XML parser and DTD/entity behavior: <https://www.npmjs.com/package/saxes>

These references support SDK/parser capability only. The stricter 10 MiB, UTF-8, DTD/entity rejection, 300-second
admin URL and no-publication rules are project contracts, not claims that the upstream SDK enforces them for us.
