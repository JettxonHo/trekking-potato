# C15-D / #161 — 第二批路线证据审计（2026-08-23）

## Handoff verdict

`READY_FOR_CONTROLLER_REVIEW` with **5/5**
`PROPOSED_FOR_CONTROLLER_FREEZE` identities from the controller-authorized replacement discovery (comment
[`5386337561`](https://github.com/JettxonHo/trekking-potato/issues/161#issuecomment-5386337561)). The earlier fresh pass
(comment
[`5386298463`](https://github.com/JettxonHo/trekking-potato/issues/161#issuecomment-5386298463)) read only the eight
unresolved ledger relations, sequentially, once each, with an identifying User-Agent and a six-second interval.
All seven responses whose bodies were retained returned HTTP 200; the first request (`12390533`) also returned HTTP
200 but its body was not retained, so it is deliberately `UNKNOWN` rather than being re-requested. No provider
throttle occurred in this fresh pass. The earlier pass's `10548040` read remains a closed, topology-blocked record.

The replacement discovery was Phase1 evidence-only: at that checkpoint it did not count a candidate or authorize
Phase2. The historical runtime truth was ten searchable `full` variants plus the separate non-counting Wutai
restriction; that statement is superseded by the Phase2 implementation checkpoint below.

## Scope, provenance and rights boundary

- Fresh OSM requests were restricted to `12390533`, `12390888`, `18731549`, `18731550`, `18952585`, `19017834`,
  `20737376` and `20739619`, in that order. A response body was saved only outside the repository for aggregate
  topology checks; no node coordinates, ordered geometry, contributor identity, third-party track or private
  submission was copied into this report or the repository.
- The request User-Agent was `trekking-potato/161-evidence-audit (https://github.com/JettxonHo/trekking-potato)`.
  The seven retained full responses were written at approximately `2026-08-23T13:40:35Z` through
  `2026-08-23T13:41:17Z`; the status-only `12390533` request was immediately before that sequence. No request was
  retried and no alternate OSM endpoint, Overpass query or broad search was used.
- Every retained relation has a current-full source URL in its row and an observed relation version. This is a
  current snapshot only; no immutable historical full-geometry claim is made. OSM is open data under the
  [ODbL](https://www.openstreetmap.org/copyright). A later implementation pass would need an explicit bounded
  relation/way/node version manifest, <=500-point preview and <=100-point elevation plan; none was generated here.
- No new official/operator/government endpoint was queried after the controller limited this pass to the eight OSM
  full relations. Existing ledger context remains `UNKNOWN`; no opening, permit, safety or legality claim is inferred
  from OSM geometry or tags.

## Fresh candidate verdicts

### `12390533` — 大瓦山徒步线

- **OSM identity/direction:** relation tags in the existing ledger identify proposed `白熊沟 → 五池村`; this fresh
  full endpoint returned HTTP 200, but its body was not retained. No second request is permitted, so relation version,
  member names, topology, mode boundary and ordered traversal are all `UNKNOWN`.
- **Source:** [OSM relation page](https://www.openstreetmap.org/relation/12390533); current-full status-only response;
  ODbL applies. No official/operator route context was added.
- **Verdict:** `BLOCKED_CANDIDATE / SOURCE_PAYLOAD_UNAVAILABLE`. It cannot be proposed or counted without the full
  topology and provenance evidence.

### `12390888` — 七藏沟徒步

- **OSM identity/direction:** relation v2, tags `from=卡卡沟`, `to=黄龙机场`, `route=hiking`, `network=lwn`;
  `10` members (`10` ways; roles: eight empty, one `forward`, one `backward`).
- **Topology/order:** `488` returned/used graph nodes, `1` component, `1` branch node, `3` endpoints, cycle rank
  `0`, `0` member-order gaps and `9` connected adjacent pairs. One way reference is duplicated as forward/backward
  members, so the aggregate is not a branch-safe simple path despite explicit from/to tags.
- **Mode boundary:** `8 path` and `2 track` ways; no cableway, shuttle or ferry member observed. The duplicate
  forward/backward member and branch require route semantics to be resolved before a walking variant can be claimed.
- **Source:** [OSM relation page](https://www.openstreetmap.org/relation/12390888) ·
  [current full response](https://api.openstreetmap.org/api/0.6/relation/12390888/full.json), checked approximately
  `2026-08-23T13:40:35Z`; ODbL applies. Official/operator route-level opening remains `UNKNOWN`.
- **Verdict:** `BLOCKED_CANDIDATE` — branch/duplicate-reference topology is not freeze-ready.

### `18731549` — 虎跳峡徒步

- **OSM identity/direction:** relation v6, tags `route=hiking`, `network=nwn`, `sac_scale=mountain_hiking`,
  `name=虎跳峡徒步`; no `from`/`to` or loop tag. `17` way members, all role-empty.
- **Topology/order:** `941` returned/used graph nodes, `1` component, `0` branch nodes, `2` endpoints, cycle rank
  `0`, `2` member-order gaps and `14` connected adjacent pairs. The graph therefore is not a complete ordered
  traversal as represented by this relation.
- **Mode boundary:** `8 path`, `6 unclassified`, `2 service`, `1 residential`. Several road/service members are
  mixed into the hiking relation; they are not silently reclassified as pure walking.
- **Source:** [OSM relation page](https://www.openstreetmap.org/relation/18731549) ·
  [current full response](https://api.openstreetmap.org/api/0.6/relation/18731549/full.json), checked approximately
  `2026-08-23T13:40:42Z`; ODbL applies. No exact route-level operator source was added.
- **Verdict:** `BLOCKED_CANDIDATE` — missing deterministic direction, two order gaps and mixed road/service modes.

### `18731550` — 中虎跳徒步线

- **OSM identity/direction:** relation v2, tags `route=hiking`, `network=rwn`, `name=中虎跳徒步线`; no `from`/`to`
  or loop tag. `8` way members, all role-empty.
- **Topology/order:** `326` returned/used graph nodes, `1` component, `1` branch node, `3` endpoints, cycle rank
  `0`, `1` member-order gap and `6` connected adjacent pairs.
- **Mode boundary:** `7 path`, `1 ladder`; no cableway, shuttle or ferry member observed, but the branch and gap
  prevent a deterministic simple walking traversal.
- **Source:** [OSM relation page](https://www.openstreetmap.org/relation/18731550) ·
  [current full response](https://api.openstreetmap.org/api/0.6/relation/18731550/full.json), checked approximately
  `2026-08-23T13:40:49Z`; ODbL applies. Official/operator route-level opening remains `UNKNOWN`.
- **Verdict:** `BLOCKED_CANDIDATE` — branch/gap topology and missing direction.

### `18952585` — 漓江路线

- **OSM identity/direction:** relation v15, tags `from=杨堤`, `to=兴坪`, `name=漓江路線`, `route=hiking`,
  `network=nwn`; `28` way members, all role-empty.
- **Topology/order:** `439` returned/used graph nodes, `1` component, `0` branch nodes, `2` endpoints, cycle rank
  `0`, `2` member-order gaps and `25` connected adjacent pairs. Explicit from/to is not enough while the relation
  sequence has gaps.
- **Mode boundary:** `13 footway`, `2 path`, `1 tertiary`, `7 unclassified`, `1 service`, `1 residential` and
  `3 ferry` ways. Ferry and vehicle-road members are transport boundaries, not pure walking geometry; no silent
  reclassification is allowed.
- **Source:** [OSM relation page](https://www.openstreetmap.org/relation/18952585) ·
  [current full response](https://api.openstreetmap.org/api/0.6/relation/18952585/full.json), checked approximately
  `2026-08-23T13:40:56Z`; ODbL applies. No exact route-level access source was added.
- **Verdict:** `BLOCKED_CANDIDATE` — ferry/road mixing and order gaps block a walking variant.

### `19017834` — 龙脊天路

- **OSM identity/direction:** relation v1, tags `name=龙脊天路`, `network=lwn`, `route=hiking`; one role-empty way
  member whose way is also named `龙脊天路`. No `from`/`to`, `roundtrip`, `oneway` or endpoint node names were
  present; direction and endpoint identities are therefore `UNKNOWN`.
- **Topology/order:** `87` returned/used graph nodes, `1` component, `0` branch nodes, `2` endpoints, cycle rank
  `0`, `0` member-order gaps and no adjacent pair to validate (single way). The geometry is a connected simple path,
  but a deterministic product direction cannot be established from this relation alone.
- **Mode boundary:** one `footway`; no cableway, shuttle, ferry or road member observed.
- **Source:** [OSM relation page](https://www.openstreetmap.org/relation/19017834) ·
  [current full response](https://api.openstreetmap.org/api/0.6/relation/19017834/full.json), checked approximately
  `2026-08-23T13:41:03Z`; ODbL applies. No exact official/operator context was added.
- **Verdict:** `BLOCKED_CANDIDATE` — direction/from/to identity remains unresolved; no proposal is made despite
  clean aggregate walking topology.

### `20737376` — 赵公山西环线

- **OSM identity/direction:** relation v3, tags `name=赵公山西环线`, `ref=B线`, `route=hiking`, `network=lwn`;
  no `from`/`to` or loop tag. `3` role-empty way members.
- **Topology/order:** `139` returned/used graph nodes, `1` component, `1` branch node, `1` endpoint, cycle rank
  `1`, `1` member-order gap and `1` connected adjacent pair. The cycle plus dangling branch is not a deterministic
  closed loop.
- **Mode boundary:** all `3` members are `path`; no cableway, shuttle, ferry or road member observed.
- **Source:** [OSM relation page](https://www.openstreetmap.org/relation/20737376) ·
  [current full response](https://api.openstreetmap.org/api/0.6/relation/20737376/full.json), checked approximately
  `2026-08-23T13:41:10Z`; ODbL applies. Official/operator route-level opening remains `UNKNOWN`.
- **Verdict:** `BLOCKED_CANDIDATE` — branch/gap topology and missing loop/direction semantics.

### `20739619` — 赵公山东线

- **OSM identity/direction:** relation v1, tags `name=赵公山东线`, `ref=A线`, `route=hiking`, `network=lwn`;
  no `from`/`to`, `roundtrip` or `oneway` tag. `2` role-empty way members; both endpoint nodes are unnamed.
- **Topology/order:** `76` returned/used graph nodes, `1` component, `0` branch nodes, `2` endpoints, cycle rank
  `0`, `0` member-order gaps and `1` connected adjacent pair. The graph is a connected simple path, but relation
  order alone does not establish named start/end direction for a searchable contract.
- **Mode boundary:** both members are `path` (relation also tags `highway=path`); no cableway, shuttle, ferry or road
  member observed.
- **Source:** [OSM relation page](https://www.openstreetmap.org/relation/20739619) ·
  [current full response](https://api.openstreetmap.org/api/0.6/relation/20739619/full.json), checked approximately
  `2026-08-23T13:41:17Z`; ODbL applies. No exact official/operator context was added.
- **Verdict:** `BLOCKED_CANDIDATE` — deterministic named direction/endpoints are unresolved.

## Prior bounded pass retained

The earlier pre-authorization pass read `10548040` once and stopped on HTTP `429` for the next relation. Its current
full relation v7 was `鳌太线` (`54` ways, `6,542` used nodes, `1` component, `24` branches, `13` endpoints, cycle
rank `7`, `12` order gaps; modes `48 path`, `4 track`, `1 steps`, `1 footway`). It remains
`BLOCKED_CANDIDATE`; no new request was made under this fresh authorization.

## Controller-authorized replacement discovery — comment `5386337561`

The controller authorized one metadata-only Overpass query followed by at most twenty sequential current-full OSM
reads. The metadata query was sent once to `https://overpass-api.de/api/interpreter` at approximately
`2026-08-23T13:49:01Z`:

```text
[out:json][timeout:90];
area["ISO3166-1"="CN"]->.cn;
relation(area.cn)["type"="route"]["route"="hiking"]["name"]["from"]["to"];
out tags;
```

It returned HTTP 200 with 111 relation-tag records and no member geometry. Existing searchable relations and every
relation already audited in #153/#155/#157/#159/#161 were excluded. The twenty selected IDs were read once each, in
this order: `12338590`, `18908973`, `19505439`, `18364943`, `18364941`, `20072066`, `20072078`, `20078357`,
`20084108`, `20084551`, `12389867`, `12390304`, `17822607`, `19684389`, `19686682`, `17584113`, `20045601`,
`18624640`, `18624653`, `18157384`. All twenty current-full responses returned HTTP 200 between
`2026-08-23T13:52:15Z` and `2026-08-23T13:54:36Z`; the six-second spacing and identifying User-Agent were recorded
by the executor, and no throttle occurred. Responses remain outside the repository; no coordinates, ordered node
geometry, GPX/KML, contributor identity or private submission was copied here.

For this pass, `route=hiking` is the explicit user access mode (`walk`). `path`, `footway`, `steps`, `ladder`,
`pedestrian` and `bridleway` are walking members. Following the controller's refinement, `tertiary`, `unclassified`,
`residential`, `service` and `track` are retained as disclosed road segments rather than silently reclassified;
`primary`, `secondary`, `trunk`, `cycleway`, ferry, cableway, shuttle/vehicle-only, and unknown highway members are
mode blockers. A relation had to have one connected graph, zero branch nodes, exactly two endpoints (or an explicit
closed-loop contract), zero member-order gaps, no duplicate way references, and an orientable member chain. Exact
current opening/permit evidence was not queried under this bounded authorization, so every proposal keeps
`operationalStatus=unknown`.

### Exactly five proposed identities

These five rows are `PROPOSED_FOR_CONTROLLER_FREEZE` only. They are not counted and are not eligible for runtime work
until the controller freezes them and a later implementation slice rechecks all promotion fields.

| Relation / identity (`from` → `to`) | OSM current-full and topology at checkedAt | Mode boundary and ordered traversal | Verdict / remaining unknown |
|---|---|---|---|
| `18364943` — `猛古村-桑伯格徒步线路` (`猛古村` → `桑伯格`) | [relation page](https://www.openstreetmap.org/relation/18364943) · [full.json](https://api.openstreetmap.org/api/0.6/relation/18364943/full.json); v1 (2024-12-03); 2 way members / 124 used graph nodes; C1/B0/E2, cycleRank 0, gaps 0, duplicate refs 0. | `path×2`; no road, cableway, shuttle or ferry. Member chain is orientable in reverse relation-member order; OSM tags provide the named endpoints. | **`PROPOSED_FOR_CONTROLLER_FREEZE`**. Exact opening, operator permission and derived-database treatment remain `UNKNOWN`; ODbL applies. |
| `18364941` — `黑石城徒步` (`桑丹四` → `桑伯格`) | [relation page](https://www.openstreetmap.org/relation/18364941) · [full.json](https://api.openstreetmap.org/api/0.6/relation/18364941/full.json); v1 (2024-12-03); 2 way members / 93 used graph nodes; C1/B0/E2, cycleRank 0, gaps 0, duplicate refs 0. | `path×1`, disclosed `track×1`; route=hiking sets walk access, with the track retained as a transport-boundary disclosure. No cableway, shuttle or ferry. Member chain is orientable in reverse relation-member order. | **`PROPOSED_FOR_CONTROLLER_FREEZE`**. Track access, exact opening, operator permission and derived-database treatment remain `UNKNOWN`; ODbL applies. |
| `19684389` — `惠州大南山精华线` (`大王庙` → `龙岩寺路口`) | [relation page](https://www.openstreetmap.org/relation/19684389) · [full.json](https://api.openstreetmap.org/api/0.6/relation/19684389/full.json); v2 (2025-10-06); 11 way members / 254 used graph nodes; C1/B0/E2, cycleRank 0, gaps 0, duplicate refs 0. | `path×8`, disclosed `tertiary×1` and `unclassified×2`; no cableway, shuttle or ferry. Member chain is orientable in forward relation-member order. | **`PROPOSED_FOR_CONTROLLER_FREEZE`**. Road walking access, exact opening, operator permission and derived-database treatment remain `UNKNOWN`; ODbL applies. |
| `19686682` — `惠州大南山拉胡线` (`惠东县多祝镇永和村` → `惠东县多祝镇百木洋`) | [relation page](https://www.openstreetmap.org/relation/19686682) · [full.json](https://api.openstreetmap.org/api/0.6/relation/19686682/full.json); v3 (2025-10-07); 12 way members / 678 used graph nodes; C1/B0/E2, cycleRank 0, gaps 0, duplicate refs 0. | `path×8`, disclosed `unclassified×3` and `service×1`; no cableway, shuttle or ferry. Member chain is orientable in forward relation-member order. | **`PROPOSED_FOR_CONTROLLER_FREEZE`**. Road/service walking access, exact opening, operator permission and derived-database treatment remain `UNKNOWN`; ODbL applies. |
| `20072078` — `马峦山自然笔记步道` (`马峦山郊野公园北门` → `土地庙三岔口`) | [relation page](https://www.openstreetmap.org/relation/20072078) · [full.json](https://api.openstreetmap.org/api/0.6/relation/20072078/full.json); v1 (2026-01-12); 1 way member / 94 used graph nodes; C1/B0/E2, cycleRank 0, gaps 0, duplicate refs 0. | Disclosed `tertiary×1` road member; route=hiking provides the walking user mode and no cableway, shuttle or ferry is present. The single-member chain is orientable in forward order. | **`PROPOSED_FOR_CONTROLLER_FREEZE`**. Tertiary-road walking access, exact opening, operator permission and derived-database treatment remain `UNKNOWN`; ODbL applies. |

All five OSM relation/full sources are open data under the [ODbL](https://www.openstreetmap.org/copyright). The
metadata and full responses establish identity/topology only; they do not establish current opening or safety.

### Held-out or blocked reads from the same bounded pool

The following fifteen reads are retained so the controller can see the complete bounded decision. None is a silent
replacement or countable slot.

| Relation / name | Aggregate result | Verdict |
|---|---|---|
| `12338590` 清水溪溯溪线 | v5; 14 ways / 274 nodes; C2/B0/E4, cycleRank 0, gaps 1; `path×9`, `track×3`, 2 unknown highway members. | `BLOCKED_CANDIDATE` — disconnected graph, order gap and unknown mode. |
| `18908973` 庚子首义步道 | v2; 32 / 961; C2/B0/E4, cycleRank 0, gaps 1; tertiary/unclassified/secondary/service mixed with path/steps/footway. | `BLOCKED_CANDIDATE` — disconnected/order gap and major-road mode boundary. |
| `19505439` 丰碑之路 | v4; 61 / 1,282; C16/B2/E35, cycleRank 0, gaps 17; steps/service/unclassified/secondary/track/residential/tertiary mixed. | `BLOCKED_CANDIDATE` — branch/disconnected topology and road mix. |
| `20072066` 坪大诗歌步道 | v2; 9 / 350; C1/B0/E2, cycleRank 0, gaps 0; unclassified×2/cycleway×1/path×5/steps×1. | `BLOCKED_CANDIDATE` — cycleway mode boundary unresolved. |
| `20078357` 江岭相思步道 | v1; 14 / 526; C1/B0/E2, cycleRank 0, gaps 0; unclassified×9/path×5, with member ways carrying `route=mtb`. | `HELD_OUT_MODE_BOUNDARY` — topology/direction pass, but MTB-marked path and nine road members are not selected for this five-row freeze. |
| `20084108` 叠翠湖郊野径 | v2; 16 / 136; C1/B16/E2, cycleRank 0, gaps 0; duplicate way refs; steps/service/path/footway. | `BLOCKED_CANDIDATE` — dense branch/duplicate topology. |
| `20084551` 小三洲远足径 | v1; 9 / 158; C1/B0/E2, cycleRank 0, gaps 0; path×4/unclassified×4/secondary×1. | `BLOCKED_CANDIDATE` — secondary-road mode boundary. |
| `12389867` 徽杭古道 | v3; 14 / 629; C2/B0/E4, cycleRank 0, gaps 1; service/unclassified/track/residential mixed with path/steps. | `BLOCKED_CANDIDATE` — disconnected/order-gap topology. |
| `12390304` 武功山徒步 | v14; 15 / 1,012; C1/B8/E2, cycleRank 4, gaps 4; footway/path. | `BLOCKED_CANDIDATE` — branches, cycles and order gaps. |
| `17822607` 长穿毕 | v3; 36 / 1,562; C1/B12/E3, cycleRank 6, gaps 6; path/footway mixed with unclassified/tertiary/service/residential. | `BLOCKED_CANDIDATE` — branches/cycles/order gaps and road mix. |
| `17584113` 五园连通 | v17; 58 / 1,059; C1/B8/E3, cycleRank 5, gaps 4; unclassified/service/path/footway/steps/cycleway. | `BLOCKED_CANDIDATE` — branches/cycles/order gaps and cycleway mode. |
| `20045601` 山河步道 | v1; 21 / 316; C1/B2/E2, cycleRank 1, gaps 1; path/residential/unclassified/steps/service. | `BLOCKED_CANDIDATE` — branch/cycle/order-gap topology. |
| `18624640` 翠微径第1段 | v8; 9 / 267; C1/B0/E2, cycleRank 0, gaps 0; tertiary×9; orientable. | `HELD_OUT_MODE_BOUNDARY` — topology/direction pass, but all-tertiary road geometry is retained as an unselected alternate. |
| `18624653` 翠微径第2段 | v12; 37 / 357; C1/B0/E2, cycleRank 0, gaps 0; tertiary/secondary/service/trunk/unclassified/primary/residential. | `BLOCKED_CANDIDATE` — trunk/primary/secondary road boundary. |
| `18157384` 凤凰径第1段 | v4; 24 / 531; C1/B0/E2, cycleRank 0, gaps 0; steps/path/unclassified/primary/tertiary. | `BLOCKED_CANDIDATE` — primary-road mode boundary. |

The two `HELD_OUT_MODE_BOUNDARY` rows are not proposals and do not count; they are retained only to make the
bounded selection auditable. If a controller applies a stricter interpretation of disclosed road members, it may
replace `18364941`, `19684389`, `19686682` or `20072078` with one of these alternates only after a new freeze
decision; this executor made no such substitution.

### Replacement discovery handoff

The five proposals above are the only rows labelled `PROPOSED_FOR_CONTROLLER_FREEZE`; they do not change the
searchable count (`full=10`, remaining gap `15`) or the separate non-counting Wutai restriction. The exact route
opening/operator, ODbL derived-database treatment, metric/elevation provenance and any runtime public projection
remain controller-gated unknowns. No runtime, schema, test, fragment, elevation, deployment, commit or push was
performed.

## Reproducible audit method (aggregate only)

For each retained full response, relation way members were joined by shared node IDs into an undirected graph;
connected components, degree-1 endpoints, degree-greater-than-2 branch nodes and `E − V + C` cycle rank were
computed from returned way node references. Consecutive relation-member ways were checked for a shared endpoint;
the count of non-connecting pairs is reported as `gaps`. Way `highway`, `aerialway`, `railway` and `route` tags were
classified into walking, road and transport boundaries. No raw node coordinates or member geometry were retained.
This is a topology screen, not proof of completeness, legality, opening, safety or suitability.

## #161 Phase2 implementation checkpoint — controller freeze 5386435179

The controller froze exactly the five identities above for a bounded implementation slice. Runtime now contains full=15 searchable variants (the ten prior full variants plus these five) and remaining gap=10 toward the 25-path ledger. The separate Wutai restriction remains blocked and non-counting.

Each fragment preserves the complete current-full relation traversal in WGS84: 18364943 has 124 points, 18364941 93, 19684389 254, 19686682 678, and 20072078 94. Previews are deterministic bounded projections (<=500 points; 500 for 19686682) with endpoints retained. OSM sources record relation/way/node versions and batch-completion/as-of `2026-08-23T13:54:36Z`, after the full-read window `2026-08-23T13:52:15Z`–`2026-08-23T13:54:36Z`; `2026-08-23T13:49:01Z` is retained only as the metadata-only discovery-query time. Complete used-node manifests are in docs/route-data-licenses.md, while runtime manifests are package-bounded. OSM sources remain open data under ODbL with adjacent © OpenStreetMap contributors and https://www.openstreetmap.org/copyright attribution.

One authorized Open-Meteo Elevation API request per route returned the same number of cumulative-distance-equidistant samples (100, 93, 100, 100, 94 respectively; endpoints included) at 2026-08-23T14:14:49.683Z–14:14:54.944Z. Copernicus DEM GLO-90 values were linearly interpolated onto full OSM points. Stored deterministic metrics are:

| Relation | Distance km | Ascent m | Descent m | Highest m | Duration h | Transport disclosure |
|---|---:|---:|---:|---:|---:|---|
| 18364943 | 5.868 | 1462.515568 | 27.515568 | 4141.781601 | 3.90 | path×2 |
| 18364941 | 3.287 | 1006.608475 | 62.608475 | 4131 | 2.50 | path×1 + track×1 |
| 19684389 | 11.537 | 1238.953517 | 1092.953517 | 1062.807184 | 4.95 | path×8 + tertiary×1 + unclassified×2 |
| 19686682 | 17.953 | 1286.241375 | 1288.241375 | 1247.563198 | 6.63 | path×8 + unclassified×3 + service×1 |
| 20072078 | 1.571 | 49.806638 | 195.806638 | 218 | 0.48 | tertiary×1 |

All five variants keep operationalStatus=unknown with route-specific rationale; no opening/operator/safety claim is inferred. Full geometry and version manifests stay in the catalog audit seam and are omitted from trip-base/public result DTOs. The runtime source count is 27: 10 OSM open_data sources + 16 prior source cards + 1 shared trusted elevation source; no official source is fabricated for this batch.

Implementation evidence is bounded to the frozen allowlist and awaits controller review; no deploy, commit, push or PR action was taken.
