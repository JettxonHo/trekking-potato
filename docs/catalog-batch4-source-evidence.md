# C15-F / Issue #165 — Batch 4 source evidence (Phase 1 → Phase 2)

Status: `PHASE2_RUNTIME_IMPLEMENTATION_READY_FOR_CONTROLLER_REVIEW` (the Phase 1 report below is historical and has
been superseded by the controller freeze and bounded runtime implementation).

Issue #165 is the final five-route discovery slice for the fixed 25 searchable `full` RouteVariant slots. The
historical Phase 1 runtime truth was `full=20`, remaining gap `5`; the Wutai restriction is a separate blocked,
non-counting record. The controller subsequently froze exactly five relations and Phase 2 now represents them in
runtime, so current truth is `full=25`, remaining gap `0`. The Phase 1 proposal language remains below for provenance;
it does not replace the Phase 2 source/geometry manifest in `docs/route-data-licenses.md`.

## Scope, source and stop rules

- Controller scope was Issue [#165](https://github.com/JettxonHo/trekking-potato/issues/165), branch
  `codex/165-catalog-final-5` from `main@7ef1929493989d07f0a683aba1dfcf51837a9ff5`. Phase 1 allowed only this
  report and the lifecycle checkpoint documents; no runtime, schema, tests, elevation, dependency, CloudBase,
  deployment or release files were changed.
- Primary OSM requests used the identifying User-Agent `trekking-potato/165-batch4-evidence (OSM primary-source audit)`.
  The full source for relation `R` is the OSM relation page
  `https://www.openstreetmap.org/relation/R` and the current-full payload
  `https://api.openstreetmap.org/api/0.6/relation/R/full.json`; both are reproducible primary sources. OSM data is
  ODbL-1.0 data. Any later derived database must preserve the applicable notice/share-alike obligations and show the
  adjacent attribution link [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
- Four previously eligible-but-unselected #163 alternates were each read exactly once from current-full, with at
  least six seconds between starts: `11816203` (16:06:41Z), `17147570` (16:06:50Z), `17147572` (16:06:57Z), and
  `17147574` (16:07:05Z). Every response was HTTP 200; no 429/throttle or retry occurred.
- One metadata-only China query was sent to `https://overpass-api.de/api/interpreter` at 16:08:46Z (HTTP 200,
  finished 16:08:55Z). It selected `type=route`, `route=hiking` relations with nonempty `name`, `from` and `to`
  tags inside the China ISO area and returned 111 rows. The prior-audit exclusion set (including all #163 rows and
  the four alternates) left 47 new metadata rows for this bounded pass. No second metadata query, mirror, broad web
  search or third-party/private source was used.
- Exactly twenty new current-full reads were then issued once each, sequentially with a six-second minimum between
  request starts. All were HTTP 200 and none was throttled. The raw response bodies were held only in an ephemeral
  `/tmp` audit directory and no raw node list, coordinate sequence or geometry was copied into the repository. The
  request starts are recorded in the table below for reproducibility.

## Promotion gate used for aggregate review

The aggregate pass derived only relation tags/version/timestamp, way-member and graph-node counts, connected
components, branch/end-point counts, cycle rank (`E − V + C`), ordered-member gaps, duplicate way references,
orientability and highway-mode counts. `route=hiking` is the user walking mode. `path`, `footway`, `steps`, `ladder`,
`pedestrian` and `bridleway` are walking members. `track`, `tertiary`, `unclassified`, `residential` and `service`
are retained only as disclosed road/track boundaries. `primary`, `secondary`, `trunk`, `construction`, `cycleway`,
ferry, cableway, shuttle, vehicle-only and unknown modes block. Promotion also requires one connected graph, zero
branches, no duplicate refs or order gaps, and either an explicit closed loop or exactly two endpoints with distinct
nonempty `from`/`to` identity. These are topology/source gates only; current opening, permission, safety and legal
access remain `UNKNOWN`.

## Four #163 alternates re-read

| relation / identity | current-full observation | topology/order | modes | verdict |
|---|---|---|---|---|
| [`11816203`](https://www.openstreetmap.org/relation/11816203) 鳳凰徑第十段 Lantau Trail Section 10 | v5 · `2024-12-04T04:57:28Z`; 16 ways / 402 graph nodes | C1/B0/E2, cycleRank 0, gaps 0, duplicate 0, orientable reverse; `水口 Shui Hau → 東涌道 Tung Chung Road` | footway×1 + unclassified×11 + service×4 | `ELIGIBLE_ALTERNATE_NOT_SELECTED`; road/service boundary disclosed |
| [`17147570`](https://www.openstreetmap.org/relation/17147570) 沙田郊野徑 Sha Tin Country Trail | v2 · `2024-08-27T09:33:58Z`; 18 / 470 | C1/B0/E2, cycleRank 0, gaps 0, duplicate 0, orientable reverse; `排頭街 Pai Tau Street → 城門郊野公園 Shing Mun Country Park` | footway×10 + steps×6 + unclassified×1 + service×1 | `ELIGIBLE_ALTERNATE_NOT_SELECTED`; same-family alternate; road/service boundary disclosed |
| [`17147572`](https://www.openstreetmap.org/relation/17147572) 沙田郊野徑 Sha Tin Country Trail | v3 · `2024-12-17T16:56:18Z`; 27 / 325 | C1/B0/E2, cycleRank 0, gaps 0, duplicate 0, orientable forward; `梅子林路 Mui Tsz Lam Road → 小瀝源 Siu Lek Yuen` | footway×17 + steps×10 | `ELIGIBLE_ALTERNATE_NOT_SELECTED`; same-family alternate |
| [`17147574`](https://www.openstreetmap.org/relation/17147574) 沙田郊野徑 Sha Tin Country Trail | v2 · `2025-04-28T14:11:58Z`; 8 / 34 | C1/B0/E2, cycleRank 0, gaps 0, duplicate 0, orientable forward; `沙田頭新村 Sha Tin Tau New Village → 望夫石 Amah Rock` | footway×6 + steps×2 | `ELIGIBLE_ALTERNATE_NOT_SELECTED`; same-family alternate |

All four pass the aggregate topology and walking-mode screen, but remain unselected because the bounded final five
are chosen below and same-family identity collisions are safer when retained as explicit alternates. None has a
route-level current opening, permission, safety or ODbL-derived-database decision.

## Twenty new current-full reads

The source for every row is the relation page linked in the first column and its corresponding current-full endpoint
(`https://api.openstreetmap.org/api/0.6/relation/<id>/full.json`). `C/B/E` means components/branch nodes/endpoints;
`cycle` is cycle rank. `start` is the UTC request start, not an OSM edit timestamp.

| relation / identity | relation version · OSM timestamp | ways / graph nodes | C/B/E · cycle · gaps · dup · order | from → to | highway modes | verdict · current-full request start (UTC) |
|---|---|---:|---|---|---|---|
| [`7065552`](https://www.openstreetmap.org/relation/7065552) 路環石面盆古道 Caminho Antigo de Seac Min Pun de Coloane | v8 · `2025-01-13T06:08:15Z` | 7 / 118 | C1/B0/E2 · 0 · 0 · 0 · orientable | 路環黑沙馬路 → 路環竹灣馬路 | footway×3 + steps×3 + residential×1 | **`PROPOSED_FOR_CONTROLLER_FREEZE`**; 16:10:38Z |
| [`17606656`](https://www.openstreetmap.org/relation/17606656) 鲲鹏径第1段 | v10 · `2024-10-28T06:14:23Z` | 10 / 305 | C1/B0/E2 · 0 · 0 · 0 · orientable | 凤凰山飞云顶 → 九围湿地彩绘路入口 | steps×1 + footway×4 + path×2 + service×1 + residential×2 | `ELIGIBLE_ALTERNATE_NOT_SELECTED`; 16:10:45Z |
| [`17614381`](https://www.openstreetmap.org/relation/17614381) 鲲鹏径第3段 | v7 · `2025-09-01T05:03:35Z` | 22 / 226 | C1/B0/E2 · 0 · 0 · 0 · orientable | 宝石路尖岗山公园东北口 → 阳台山麻磡二号登山口 | footway×5 + path×1 + tertiary×10 + primary×4 + cycleway×2 | `BLOCKED_CANDIDATE` — primary/cycleway; 16:10:52Z |
| [`17618981`](https://www.openstreetmap.org/relation/17618981) 鲲鹏径第4段 | v8 · `2024-10-28T06:14:23Z` | 20 / 285 | C1/B0/E2 · 0 · 0 · 0 · orientable | 阳台山麻磡二号登山口 → 阳台山王京坑登山口 | path×6 + steps×4 + footway×8 + track×1 + unclassified×1 | **`PROPOSED_FOR_CONTROLLER_FREEZE`**; track/unclassified disclosed; 16:11:00Z |
| [`17632503`](https://www.openstreetmap.org/relation/17632503) 鲲鹏径第7段 | v10 · `2025-11-24T14:44:35Z` | 14 / 342 | C1/B0/E2 · 0 · 0 · 0 · orientable | 茶光紫涧园 → 梅林水库绿道涂鸦墙 | path×6 + unclassified×1 + steps×6 + footway×1 | `ELIGIBLE_ALTERNATE_NOT_SELECTED`; 16:11:07Z |
| [`17666241`](https://www.openstreetmap.org/relation/17666241) 鲲鹏径第9段 | v47 · `2026-05-03T14:49:40Z` | 88 / 579 | C1/B0/E2 · 0 · 0 · 0 · orientable | 深圳边检总站医院后山 → 东湖公园（西南门） | footway×52 + path×8 + steps×7 + service×10 + unclassified×1 + tertiary×2 + cycleway×8 | `BLOCKED_CANDIDATE` — cycleway member; 16:11:14Z |
| [`17686764`](https://www.openstreetmap.org/relation/17686764) 鲲鹏径第11段 | v5 · `2026-04-28T05:50:58Z` | 23 / 593 | C1/B0/E2 · 0 · 0 · 0 · orientable | 望桐新路登山口 → 谭仙公庙 | path×10 + service×1 + tertiary×2 + footway×4 + steps×5 + residential×1 | `ELIGIBLE_ALTERNATE_NOT_SELECTED`; road/service boundary disclosed; 16:11:45Z |
| [`17689375`](https://www.openstreetmap.org/relation/17689375) 鲲鹏径第12段 | v14 · `2026-04-10T11:44:30Z` | 50 / 978 | C1/B0/E2 · 0 · 0 · 0 · orientable | 谭仙公庙 → 马峦山西北门 | path×15 + footway×10 + steps×4 + service×6 + unclassified×4 + residential×3 + secondary×8 | `BLOCKED_CANDIDATE` — secondary members; 16:11:52Z |
| [`17692434`](https://www.openstreetmap.org/relation/17692434) 鲲鹏径第13段 | v7 · `2026-03-08T14:40:08Z` | 19 / 544 | C1/B0/E2 · 0 · 0 · 0 · orientable | 马峦山西北门 → 庚子首义旧址 | path×12 + footway×1 + service×1 + unclassified×1 + tertiary×4 | `ELIGIBLE_ALTERNATE_NOT_SELECTED`; tertiary/service boundary disclosed; 16:12:00Z |
| [`17692451`](https://www.openstreetmap.org/relation/17692451) 鲲鹏径第15段 | v2 · `2024-10-28T00:01:21Z` | 12 / 199 | C1/B0/E2 · 0 · 0 · 0 · orientable | 犁壁山45号界碑 → 葵涌生态公园 | path×6 + steps×3 + footway×1 + track×1 + primary×1 | `BLOCKED_CANDIDATE` — primary member; 16:12:08Z |
| [`17704621`](https://www.openstreetmap.org/relation/17704621) 鲲鹏径第16段 | v5 · `2026-02-20T15:49:58Z` | 27 / 469 | C1/B3/E3 · 1 · 2 · 0 · not orientable | 葵涌生态公园 → 金沙大道深圳国家基因库 | primary×7 + cycleway×7 + tertiary×5 + construction×2 + residential×2 + unclassified×1 + path×2 + service×1 | `BLOCKED_CANDIDATE` — branches, gaps, cycleway/primary/construction; 16:12:19Z |
| [`17717124`](https://www.openstreetmap.org/relation/17717124) 鲲鹏径第17段 v3 | v3 · `2024-10-28T06:14:23Z` | 23 / 508 | C1/B0/E2 · 0 · 1 · 0 · not orientable | 金沙大道深圳国家基因库 → 鹅公村 | tertiary×14 + primary×2 + residential×2 + unclassified×1 + path×4 | `BLOCKED_CANDIDATE` — primary and order gap; 16:12:27Z |
| [`17717235`](https://www.openstreetmap.org/relation/17717235) 鲲鹏径第18段 | v3 · `2024-10-28T07:00:48Z` | 23 / 383 | C1/B0/E2 · 0 · 0 · 0 · orientable | 鹅公村 → 西涌旅游度假区（4号门） | path×5 + residential×5 + service×1 + unclassified×1 + primary×4 + tertiary×7 | `BLOCKED_CANDIDATE` — primary members; 16:12:34Z |
| [`17719141`](https://www.openstreetmap.org/relation/17719141) 鲲鹏径第19段 | v3 · `2024-10-28T07:00:48Z` | 22 / 275 | C1/B0/E2 · 0 · 0 · 0 · orientable | 西涌旅游度假区（4号门） → 东涌社区 | tertiary×8 + unclassified×3 + path×5 + track×3 + footway×1 + residential×1 + service×1 | `ELIGIBLE_ALTERNATE_NOT_SELECTED`; tertiary/track/road boundary disclosed; 16:12:42Z |
| [`17719174`](https://www.openstreetmap.org/relation/17719174) 鲲鹏径第20段 | v3 · `2024-10-28T07:00:48Z` | 4 / 140 | C1/B0/E2 · 0 · 0 · 0 · orientable | 东涌社区 → 大鹏山大雁顶 | path×4 | **`PROPOSED_FOR_CONTROLLER_FREEZE`**; 16:12:53Z |
| [`17903553`](https://www.openstreetmap.org/relation/17903553) 阳台山环线郊野径 | v24 · `2024-10-28T09:03:05Z` | 78 / 1,484 | C1/B0/E0 · 1 · 2 · 0 · not orientable | 阳台山大浪胜利大营救广场 → same | path×18 + steps×22 + footway×21 + cycleway×8 + service×2 + residential×4 + track×1 + unclassified×1 + construction×1 | `BLOCKED_CANDIDATE` — order gaps, cycleway/construction; 16:13:00Z |
| [`18072368`](https://www.openstreetmap.org/relation/18072368) 马峦山环线 | v11 · `2026-07-07T10:06:39Z` | 49 / 1,850 | C1/B1/E1 · 1 · 1 · 0 · not orientable | 华大时空中心 → same | path×25 + service×10 + cycleway×5 + tertiary×2 + unclassified×2 + residential×3 + steps×2 | `BLOCKED_CANDIDATE` — branch/dangling endpoint/order gap/cycleway; 16:13:08Z |
| [`18220700`](https://www.openstreetmap.org/relation/18220700) 梅林山郊野径 | v1 · `2024-10-28T13:39:29Z` | 4 / 995 | C1/B0/E2 · 0 · 0 · 0 · orientable | 梅林水库涂鸦墙 → 梅坳 | path×4 | **`PROPOSED_FOR_CONTROLLER_FREEZE`**; 16:13:17Z |
| [`18220701`](https://www.openstreetmap.org/relation/18220701) 塘朗山郊野径 | v3 · `2025-11-24T14:44:35Z` | 13 / 499 | C1/B0/E2 · 0 · 0 · 0 · orientable | 塘朗山龙珠门 → 梅林水库涂鸦墙 | unclassified×3 + steps×6 + footway×1 + path×3 | **`PROPOSED_FOR_CONTROLLER_FREEZE`**; unclassified road boundary disclosed; 16:13:28Z |
| [`18544915`](https://www.openstreetmap.org/relation/18544915) 路環東北步行徑系統 Rede de Trilhos do Nordeste de Coloane | v2 · `2025-01-16T14:23:43Z` | 11 / 432 | C1/B7/E3 · 3 · 4 · 0 · not orientable | 路環九澳高頂馬路 → same | footway×7 + steps×4 | `BLOCKED_CANDIDATE` — branches, cycles and order gaps; 16:13:35Z |

The ten clean rows not selected (`17606656`, `17632503`, `17686764`, `17692434`, `17719141` plus the four
#163 alternates) remain explicit alternates rather than silently becoming counted routes. Rows with a primary,
secondary, cycleway, construction, branch, disconnected/dangling endpoint or order gap are blocked as shown.

## Exact five proposed for controller freeze

The bounded pass therefore proposes exactly these five identities:

1. **`7065552` 路環石面盆古道** — `路環黑沙馬路 → 路環竹灣馬路`, connected branch-free ordered path; one
   residential member is disclosed as a road boundary, while route access mode remains walking.
2. **`17618981` 鲲鹏径第4段** — `阳台山麻磡二号登山口 → 阳台山王京坑登山口`, connected branch-free ordered
   path; one track and one unclassified member are disclosed.
3. **`17719174` 鲲鹏径第20段** — `东涌社区 → 大鹏山大雁顶`, connected branch-free ordered pure-path route.
4. **`18220700` 梅林山郊野径** — `梅林水库涂鸦墙 → 梅坳`, connected branch-free ordered pure-path route.
5. **`18220701` 塘朗山郊野径** — `塘朗山龙珠门 → 梅林水库涂鸦墙`, connected branch-free ordered path; three
   unclassified members are disclosed as road boundaries.

Each relation and its current-full endpoint are the primary OSM/open-data evidence. Any Phase 2 implementation must
re-read the exact full relation, record relation/way/node versions and checkedAt, preserve ODbL attribution, and
produce a bounded WGS84 preview of at most 500 points without exposing full geometry in public DTOs. Elevation is not
requested in this Phase 1; a later controller-authorized Phase 2 may make one Open-Meteo/Copernicus DEM GLO-90 request
per route with at most 100 cumulative-distance samples (including endpoints), record the sampling/checkedAt and
derive distance, ascent, descent, highest and deterministic duration without an LLM or runtime provider. Until then,
`operationalStatus=unknown`; OSM geometry/tags do not prove current opening, permission, legality or safety.

## Prior-audit exclusion ledger and handoff

The metadata query excluded all IDs in the prior #159/#161/#163 evidence ledgers and the current searchable runtime,
including the 55 IDs listed in `docs/catalog-batch3-source-evidence.md`, all #163 relation rows and the four alternates
re-read above. This avoids duplicate identity promotion; blocked, held and alternate rows do not count toward the
25-slot target. The full prior lists remain in the linked reports rather than being recopied here.

No candidate is counted and no runtime fragment was generated. Lifecycle truth remains `full=20`, gap `5`, Wutai
non-counting. **`READY_FOR_CONTROLLER_REVIEW`** — controller must freeze or reject the exact five before any Phase 2
allowlist, elevation request or runtime implementation.

## Phase 2 controller freeze and runtime reconciliation — comment `5387039704`

The Phase 1 proposal set above was frozen for implementation by the controller. The runtime now contains exactly
these five complete current-full OSM relations, with no geometry trimming or invented endpoints:

Runtime OSM provenance uses the truthful batch-completion/as-of timestamp **`2026-08-23T16:13:29Z`**, after all five
current-full responses completed. The per-route request-start labels in the Phase 1 table above (`16:10:38Z` through
`16:13:28Z`) are retained as request metadata and are not relabeled as completion times. The independent
`elevationCheckedAt` values from the one-per-route Open-Meteo/Copernicus research remain unchanged.

| Relation/version | Runtime identity | Direction | Full points | Mode boundary | Region |
|---|---|---|---:|---|---|
| `7065552` v8 | `路環石面盆古道` | `路環黑沙馬路 → 路環竹灣馬路` | 118 | footway×3 + steps×3 + residential×1 (disclosed) | `澳门` |
| `17618981` v8 | `鲲鹏径第4段` | `阳台山麻磡二号登山口 → 阳台山王京坑登山口` | 285 | path×6 + steps×4 + footway×8 + track×1 + unclassified×1 (disclosed) | `广东省深圳市` |
| `17719174` v3 | `鲲鹏径第20段` | `东涌社区 → 大鹏山大雁顶` | 140 | path×4 | `广东省深圳市` |
| `18220700` v1 | `梅林山郊野径` | `梅林水库涂鸦墙 → 梅坳` | 995 | path×4 | `广东省深圳市` |
| `18220701` v3 | `塘朗山郊野径` | `塘朗山龙珠门 → 梅林水库涂鸦墙` | 499 | unclassified×3 + steps×6 + footway×1 + path×3 (unclassified disclosed) | `广东省深圳市` |

Each route uses one bounded Open-Meteo/Copernicus DEM GLO-90 request (100 cumulative-distance samples including
endpoints, 100/100 response) and deterministic Haversine/elevation/duration derivation. OSM current-full relation,
way and complete node version observations are recorded in [`docs/route-data-licenses.md`](route-data-licenses.md);
runtime keeps only bounded first/last node manifests. The shared trusted source supports elevation-derived fields and
the elevation component joined into `routeGeometry`; OSM supports ordered WGS84 coordinates, identity, topology and
preview projection. ODbL-1.0 and adjacent [`OpenStreetMap contributors`](https://www.openstreetmap.org/copyright)
attribution remain visible. `operationalStatus=unknown` with route-specific rationale is intentional: no opening,
permission, legality or safety claim is inferred. Full `routeGeometry` and manifests are omitted from public trip and
result DTOs. Runtime ledger is now `full=25`, `gap=0`; Wutai remains a separate non-counting blocked restriction.

This Phase 2 checkpoint is `READY_FOR_CONTROLLER_REVIEW`. No deployment, CloudBase mutation, merge, commit, push or
PR action is implied by the implementation handoff.
