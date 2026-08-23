# C15 — 首批 25 个可信 RouteVariant 证据台账

- Goal: `TP-CATALOG-001`
- Parent Issue: `#165` (final five-route evidence/freeze batch; planning and merged batches retained below)
- Status: `PHASE2_RUNTIME_IMPLEMENTATION_READY_FOR_CONTROLLER_REVIEW`
- Snapshot checked: `2026-08-24` (runtime merge truth through PR #164 / `main@7ef1929`; earlier source windows remain recorded below)
- Scope: the target remains exactly 25 searchable `full` slots: five existing pilots plus twenty missing/replacement
  slots. Current Phase2 runtime has twenty-five searchable `full` variants (five existing plus five each from #159,
  #161, #163 and #165), leaving a remaining gap of zero. The Wutai restriction is a separate non-counting record.
- Runtime impact: PR #160 merged the first five additions, PR #162 merged the next five as `f393c00`, and PR #164
  merged the third five as `7ef1929`. The controller freeze `5387039704` authorized the final #165 five for Phase 2;
  current catalog truth is twenty-five searchable `full` variants with a remaining gap of zero. Wutai remains a
  separate non-counting blocked restriction.

## #165 Phase2 final five — controller freeze `5387039704`

The historical Phase 1 evidence report is superseded by this bounded runtime checkpoint. The exact complete relations
now represented in the searchable catalog are:

| Relation/version | Canonical RouteVariant | Deterministic direction | Full points | Region / disclosed mode |
|---|---|---|---:|---|
| `7065552` v8 | `路環石面盆古道` | `路環黑沙馬路 → 路環竹灣馬路` | 118 | `澳门`; residential×1 disclosed |
| `17618981` v8 | `鲲鹏径第4段` | `阳台山麻磡二号登山口 → 阳台山王京坑登山口` | 285 | `广东省深圳市`; track×1 + unclassified×1 disclosed |
| `17719174` v3 | `鲲鹏径第20段` | `东涌社区 → 大鹏山大雁顶` | 140 | `广东省深圳市`; path×4 |
| `18220700` v1 | `梅林山郊野径` | `梅林水库涂鸦墙 → 梅坳` | 995 | `广东省深圳市`; path×4 |
| `18220701` v3 | `塘朗山郊野径` | `塘朗山龙珠门 → 梅林水库涂鸦墙` | 499 | `广东省深圳市`; unclassified×3 disclosed |

All five retain complete ordered WGS84 relation geometry, a preview of at most 500 points and OSM current-full
relation/way/node version provenance; complete manifests are in [`docs/route-data-licenses.md`](route-data-licenses.md).
Each uses one bounded Open-Meteo/Copernicus DEM GLO-90 request with at most 100 cumulative-distance samples and
deterministic elevation metrics/duration. OSM/open_data carries ODbL-1.0 and adjacent
[`OpenStreetMap contributors`](https://www.openstreetmap.org/copyright) attribution; the shared trusted source
supports only the elevation-derived fields and joined `elevationM` component. `operationalStatus=unknown` with a
route-specific rationale remains conservative, with no opening, permission, legality or safety inference. Full
`routeGeometry` and manifests stay out of public DTOs. Runtime reconciliation is now `full=25`, `gap=0`; Wutai is
non-counting. Handoff: **`READY_FOR_CONTROLLER_REVIEW`**.
The five OSM source cards use batch-completion/as-of `2026-08-23T16:13:29Z` after current-full request starts
`16:10:38Z`–`16:13:28Z`; per-route elevation response timestamps remain independent and unchanged.

## #165 final-batch activation — 2026-08-24 (historical pre-freeze checkpoint)

Issue #165 owned the final five-route serial batch. The historical Phase1 started with the four #163 eligible alternates
`11816203`, `17147570`, `17147572` and `17147574`, then may run one bounded metadata query and at most twenty new
current-full reads for the fifth/replacements. Every candidate remains uncounted until an exact controller freeze.

## #163 Batch3 activation — 2026-08-23 (historical; superseded by later batches)

Issue #163 owned the next exact five-route serial batch. Its Phase1 bounded evidence and controller freeze are retained
below; Phase2 represented the frozen five before #165 completed. Historical truth at that checkpoint was `full=20`,
`gap=5`, Wutai non-counting.

## #161 Phase2 runtime reconciliation — 2026-08-23

The pre-freeze rows below remain historical evidence decisions. Controller freeze `5386435179` assigns replacement
slots 22–26 to the five complete current-full OSM variants now present in runtime:

| Replacement slot | Runtime variant | Relation / direction | Capability / status |
|---:|---|---|---|
| 22 | `variant:osm-18364943-menggu-sangberg` | 18364943 · 猛古村 → 桑伯格 | `full` / `operationalStatus=unknown` |
| 23 | `variant:osm-18364941-black-stone-city-hike` | 18364941 · 桑丹四 → 桑伯格 | `full` / `operationalStatus=unknown` |
| 24 | `variant:osm-19684389-huizhou-dananshan-classic` | 19684389 · 大王庙 → 龙岩寺路口 | `full` / `operationalStatus=unknown` |
| 25 | `variant:osm-19686682-huizhou-dananshan-lahu` | 19686682 · 惠东县多祝镇永和村 → 惠东县多祝镇百木洋 | `full` / `operationalStatus=unknown` |
| 26 | `variant:osm-20072078-maluanshan-nature-notes` | 20072078 · 马峦山郊野公园北门 → 土地庙三岔口 | `full` / `operationalStatus=unknown` |

These five retain complete relation geometry, bounded previews, ODbL/open-data provenance, trusted elevation
derivation and disclosed track/road members. Runtime searchable count is `full=15`, remaining gap `10`; the separate
Wutai restriction remains outside the count. Detailed metrics/manifests are in
[`docs/catalog-batch2-source-evidence.md`](catalog-batch2-source-evidence.md) and
[`docs/route-data-licenses.md`](route-data-licenses.md).

## 1. How to read this ledger

The identity column uses the canonical name observed in the existing runtime pilot or the OSM relation. New rows are
**provisional source identities**, not runtime IDs: `planned ID = UNKNOWN` until a child Issue completes collision,
rights, topology, direction, metrics and opening-status review. `UNKNOWN` means that this slice did not establish the
fact. `BLOCKED` means that the candidate cannot be promoted while that fact is unknown or contradictory.

The OSM rows were read as `type=route` with `route=hiking` or `route=foot` relation metadata. For the five Yubeng
relations, `out body geom` member order was checked for consecutive way-endpoint continuity; this is only a preliminary
topology observation. No OSM geometry, GPX/KML file, contributor account, raw track or platform export was copied into
the repository.

## 2. Exactly-25-slot ledger

| Slot | Batch | Existing/new | Place / Route / RouteVariant canonical identity | Source type + primary URL | License / authorization | Geometry / topology | Direction | Official/operator opening source + checkedAt | Risk / blocker | Promotion verdict |
|---:|---|---|---|---|---|---|---|---|---|---|
| 01 | baseline | existing | Place `place:legacy:武功山反穿` · Route `route:wugongshan-reverse-traverse` · Variant `variant:wugongshan-longshan-to-main-gate-2d` — `武功山·龙山村至景区正门反穿二日徒步线` | `reviewed_gpx` tier B; primary URL `UNKNOWN (url=null in pilot)` | Prior controller-reviewed community GPX; original rights declaration/URL is not retained in runtime. Reuse authorization `UNKNOWN` for any new derivation. | Existing reviewed geometry in pilot; source is not re-opened in C15. Topology `UNKNOWN` in this planning slice. | `point_to_point` (runtime fact; no new audit) | `UNKNOWN` route-level opening source; pilot `sourceCheckedAt=2026-08-07`. | Legacy pilot has no retained public provenance URL; current access remains unknown. | `EXISTING_BASELINE — full pilot remains; no C15 promotion claim` |
| 02 | baseline | existing | Place `place:legacy:四姑娘山二峰` · Route `route:siguniang-erfeng` · Variant `variant:siguniang-erfeng-haizigou-out-and-back-2d` — `四姑娘山二峰·海子沟两日往返线` | `official` + `government` + `reviewed_gpx` tier A/B; primary URLs <https://www.sgns.cn/play/line>, <https://www.abazhou.gov.cn/abazhou/c101955/202604/a5ea16709bc94f44ac20950848ac3bf8.shtml> | Existing pilot records official/government pages and a reviewed GPX; GPX rights basis is not re-established here. | Existing reviewed full geometry; topology `UNKNOWN` for C15. | `out_and_back` (runtime fact; no new audit) | Official route/management pages above; checked `2026-08-07`; source says only partial/dynamic opening, so runtime status remains `unknown`. | Current exact-variant opening and dynamic restrictions need fresh operator evidence before any new variant. | `EXISTING_BASELINE — full pilot remains; no C15 promotion claim` |
| 03 | baseline | existing | Place `place:legacy:玉龙雪山` · Route `route:yulong-blue-moon-yunshanping` · Variant `variant:yulong-blue-moon-yunshanping-out-and-back-1d` — `蓝月谷—云杉坪徒步往返线` | `government` + `reviewed_gpx` tier A/B; primary URL <https://www.lijiang.cn/article/172717.html>; GPX URL `UNKNOWN (url=null)` | Existing reviewed GPX was controller-reviewed; source rights are not re-verified in C15. | Existing reviewed full geometry; topology `UNKNOWN` for C15. | `out_and_back` (runtime fact; no new audit) | Scenic-management notice <https://www.lijiang.cn/article/172717.html>; checked `2026-08-07`; services do not prove the exact full walking path is open. | Access mode, transport boundary and exact current opening still require operator confirmation. | `EXISTING_BASELINE — full pilot remains; no C15 promotion claim` |
| 04 | baseline | existing | Place `place:legacy:贡嘎西南坡` · Route `route:gongga-laoyulin-yulongxi` · Variant `variant:gongga-laoyulin-yulongxi-point-to-point-3d` — `贡嘎西南坡·老榆林—玉龙西三日线` | `government` + `reviewed_gpx` tier A/B; primary URLs <https://www.kangding.gov.cn/lt_gzjh/article/585685>, <https://www.kangding.gov.cn/ttxw/article/678900>; GPX URL `UNKNOWN (url=null)` | Existing GPX is a prior controller-reviewed community artifact; no new rights or public URL inferred. | Existing reviewed full geometry; topology `UNKNOWN` for C15. | `point_to_point` (runtime fact; no new audit) | Government management notice <https://www.kangding.gov.cn/ttxw/article/678900>; checked `2026-08-07`; it does not prove this exact variant open. | The notice is time-bounded/area-bounded; exact variant status and access authorization remain unknown. | `EXISTING_BASELINE — full pilot remains; no C15 promotion claim` |
| 05 | baseline | existing | Place `place:legacy:党岭` · Route `route:dangling-huluhai-zhuoyongcuo` · Variant `variant:dangling-huluhai-zhuoyongcuo-out-and-back-1d` — `党岭村—葫芦海—卓雍措一日往返` | `government` + `reviewed_track` tier A/B; primary URLs <https://www.gzzzx.gov.cn/go-a855.htm>, <https://www.danba.gov.cn/ttxw/article/680325>; KML URL `UNKNOWN (url=null)` | Existing user-owned KML was reviewed by the controller; no new reuse authorization is assumed. | Existing reviewed full geometry; topology `UNKNOWN` for C15. | `out_and_back` (runtime fact; no new audit) | Management article <https://www.danba.gov.cn/ttxw/article/680325>; checked `2026-08-07`; winter closure history does not prove current opening. | Opening boundary and rights provenance need a fresh, route-level check. | `EXISTING_BASELINE — full pilot remains; no C15 promotion claim` |
| R-WUTAI | restriction | existing restriction | Place `place:legacy:五台山朝台` · Route `route:wutai-grand-pilgrimage` · Variant `variant:wutai-grand-pilgrimage` — `五台山大朝台禁行记录` | `official` tier A; primary URLs <https://www.wtsykfwzx.com/ztzl_show.aspx?id=84>, <https://www.wtsykfwzx.com/tzzn_show.aspx?id=1129> | First-party scenic-area sources; rights are not the issue because this is a restriction record. | Blocked record intentionally has no geometry/topology. | `UNKNOWN` by blocked schema (direction is not represented). | Official prohibition notice <https://www.wtsykfwzx.com/tzzn_show.aspx?id=1129>; checked `2026-08-06`. | Scope/effective dates are not supplied by the notice; do not infer permanent closure. | `NON_COUNTING_RESTRICTION — never a searchable slot` |
| 07 | A / Yubeng | new | Place `雨崩` (planned ID `UNKNOWN`) · Route `雨崩冰湖线` / relation `19700005` (planned ID `UNKNOWN`) · Variant `雨崩上村 → 雨崩冰湖` (planned ID `UNKNOWN`) | OSM `type=route`, `route=hiking`, `network=lwn`; <https://www.openstreetmap.org/relation/19700005> | ODbL applies; attribution and derived-database decision remain unresolved; no raw geometry copied. See [Yubeng evidence audit](yubeng-route-evidence.md). | 11 ordered way members, all role-empty; preliminary endpoint continuity only. Full gaps/branches/completeness audit stopped on OSM API `429`; metrics `UNKNOWN`. | `from=雨崩上村`, `to=雨崩冰湖`; return/loop semantics `UNKNOWN`. | [Four-agency Deqin County notice dated `2025-10-14`, published/reposted on Xiaruo Township site `2026-04-10`](https://www.deqin.gov.cn/zfxxgk_deqin_xrx/fdzdgknr/tzgg/202604/20260410_239871.html) lists the matching `冰湖线路` as undeveloped/unopened; checked `2026-08-23`. | Explicit route prohibition; topology, direction, rights/attribution and any reopening/permit source remain incomplete. | `BLOCKED_CANDIDATE` |
| 08 | A / Yubeng | new | Place `雨崩` (planned ID `UNKNOWN`) · Route `雨崩尼色线` / relation `19700028` (planned ID `UNKNOWN`) · Variant `雨崩上村 → 尼色冰洞` (planned ID `UNKNOWN`) | OSM `type=route`, `route=hiking`, `network=lwn`; <https://www.openstreetmap.org/relation/19700028> | ODbL applies; attribution and derived-database decision remain unresolved; no raw geometry copied. See [Yubeng evidence audit](yubeng-route-evidence.md). | 8 ordered way members, all role-empty; preliminary endpoint continuity only. Full gaps/branches/completeness audit stopped on OSM API `429`; metrics `UNKNOWN`. | `from=雨崩上村`, `to=尼色冰洞`; return/loop semantics `UNKNOWN`. | [Four-agency Deqin County notice dated `2025-10-14`, published/reposted on Xiaruo Township site `2026-04-10`](https://www.deqin.gov.cn/zfxxgk_deqin_xrx/fdzdgknr/tzgg/202604/20260410_239871.html) lists the matching `尼色线路` as undeveloped/unopened; checked `2026-08-23`. | Explicit route prohibition; topology, direction, rights/attribution and any reopening/permit source remain incomplete. | `BLOCKED_CANDIDATE` |
| 09 | A / Yubeng | new | Place `雨崩` (planned ID `UNKNOWN`) · Route `雨崩神瀑线` / relation `19700031` (planned ID `UNKNOWN`) · Variant `雨崩下村 → 雨崩神瀑` (planned ID `UNKNOWN`) | OSM `type=route`, `route=hiking`, `network=lwn`; <https://www.openstreetmap.org/relation/19700031> | ODbL applies; attribution and derived-database decision remain unresolved; no raw geometry copied. See [Yubeng evidence audit](yubeng-route-evidence.md). | 4 ordered way members, all role-empty; preliminary endpoint continuity only. Full gaps/branches/completeness audit stopped on OSM API `429`; metrics `UNKNOWN`. | `from=雨崩下村`, `to=雨崩神瀑`; return/loop semantics `UNKNOWN`. | No current route-level official/operator opening or permit source found; checked `2026-08-23`. General safety notices are not positive opening evidence. | Current access `UNKNOWN`; topology, direction and rights/attribution remain incomplete. | `BLOCKED_CANDIDATE` |
| 10 | A / Yubeng | new | Place `雨崩` (planned ID `UNKNOWN`) · Route `雨崩神湖线` / relation `19700036` (planned ID `UNKNOWN`) · Variant `雨崩下村 → 雨崩神湖` (planned ID `UNKNOWN`) | OSM `type=route`, `route=hiking`, `network=lwn`; <https://www.openstreetmap.org/relation/19700036> | ODbL applies; attribution and derived-database decision remain unresolved; no raw geometry copied. See [Yubeng evidence audit](yubeng-route-evidence.md). | 3 ordered way members, all role-empty; preliminary endpoint continuity only. Full gaps/branches/completeness audit stopped on OSM API `429`; metrics `UNKNOWN`. | `from=雨崩下村`, `to=雨崩神湖`; `name:en=Yubeng Shenpu Route` conflicts with Chinese identity. Return/loop semantics `UNKNOWN`. | [Four-agency Deqin County notice dated `2025-10-14`, published/reposted on Xiaruo Township site `2026-04-10`](https://www.deqin.gov.cn/zfxxgk_deqin_xrx/fdzdgknr/tzgg/202604/20260410_239871.html) lists the matching `神湖线路` as undeveloped/unopened; checked `2026-08-23`. | **Identity quarantine remains mandatory**; explicit route prohibition, topology, direction and rights/attribution are unresolved. | `BLOCKED_CANDIDATE` |
| 11 | A / Yubeng | new | Place `雨崩` (planned ID `UNKNOWN`) · Route `雨崩尼农线` / relation `19700085` (planned ID `UNKNOWN`) · Variant `尼农村停车场 → 雨崩上村` (planned ID `UNKNOWN`) | OSM `type=route`, `route=hiking`, `network=lwn`; <https://www.openstreetmap.org/relation/19700085> | ODbL applies; attribution and derived-database decision remain unresolved; no raw geometry copied. See [Yubeng evidence audit](yubeng-route-evidence.md). | 11 ordered way members, all role-empty; preliminary endpoint continuity only. Full gaps/branches/completeness audit stopped on OSM API `429`; metrics `UNKNOWN`. | `from=尼农村停车场`, `to=雨崩上村`; return/loop semantics `UNKNOWN`. | No current route-level official/operator opening or permit source found; checked `2026-08-23`. A road/project notice does not prove the walking variant is open. | Current access `UNKNOWN`; topology, direction and rights/attribution remain incomplete. | `BLOCKED_CANDIDATE` |
| 12 | B / scenic relations | new | Place `黄山` (planned ID `UNKNOWN`) · Route `黄山路线` / relation `18970848` (planned ID `UNKNOWN`) · Variant `云谷寺 → 慈光阁` (planned ID `UNKNOWN`) | OSM `type=route`, `route=hiking`, `network=nwn`; <https://www.openstreetmap.org/relation/18970848>; v5 / changeset `164770803` | ODbL applies; durable attribution and derived-database treatment remain `UNKNOWN`; no raw geometry copied. | 80 ordered way members; 5 endpoint gaps, 1 graph component, 9 branch nodes, 5 endpoints; duplicate refs; walking/cableway/shuttle/road boundary unresolved; see [scenic evidence](scenic-route-evidence.md). | OSM `from=云谷寺`, `to=慈光阁`; product direction/return semantics `UNKNOWN`. | Huangshan Committee 2026 operating notice plus official 2025 transport/path notices; exact current opening of this complete walking relation `UNKNOWN`; checked `2026-08-23`. | General gates/transport do not prove exact relation open or complete. | `BLOCKED_CANDIDATE` |
| 13 | B / scenic relations | new | Place `泰山` (planned ID `UNKNOWN`) · Route `泰山红门登山道` / relation `19818868` (planned ID `UNKNOWN`) · Variant `泰山红门登山道` (planned ID `UNKNOWN`) | OSM `type=route`, `route=foot`; <https://www.openstreetmap.org/relation/19818868>; v17 / changeset `182353010` | ODbL applies; durable attribution and derived-database treatment remain `UNKNOWN`; no raw geometry copied. | 64 ordered way members (1 `gate` role); 15 endpoint gaps, 4 graph components, 17 branch nodes, 7 endpoints; duplicate refs; mode boundary unresolved; see [scenic evidence](scenic-route-evidence.md). | No OSM `from`/`to`; product direction `UNKNOWN`. | 2026-04 Tai'an government notice describes Hongmen walking line, separate cableway/shuttle; exact relation-level opening/permission `UNKNOWN`; checked `2026-08-23`. | Disconnected/duplicated relation, missing direction and rights gate block promotion. | `BLOCKED_CANDIDATE` |
| 14 | B / scenic relations | new | Place `三清山` (planned ID `UNKNOWN`) · Route `三清山路线` / relation `18970781` (planned ID `UNKNOWN`) · Variant `三清山路线` (planned ID `UNKNOWN`) | OSM `type=route`, `route=hiking`, `network=nwn`; <https://www.openstreetmap.org/relation/18970781>; v3 / changeset `164770889` | ODbL applies; durable attribution and derived-database treatment remain `UNKNOWN`; no raw geometry copied. | 43 ordered way members; 12 endpoint gaps, 1 graph component, 16 branch nodes, 8 endpoints; duplicate refs; mode boundary unresolved; see [scenic evidence](scenic-route-evidence.md). | No OSM `from`/`to`; product direction `UNKNOWN`. | Sanqing operator ticket/cableway HTTPS was not TLS-reproducible during Review and is excluded from verified primary evidence; HTTP was not used as a substitute. A secondary 2026-08 reopening report is context only; exact relation-level walking opening remains `UNKNOWN`; checked `2026-08-23`. | Secondary reopening context is not positive route authority; generic scenic/cableway facts do not identify this relation. | `BLOCKED_CANDIDATE` |
| 15 | B / scenic relations | new | Place `峨眉山` (planned ID `UNKNOWN`) · Route `峨眉山登顶路（经万年寺）` / relation `13567761` (planned ID `UNKNOWN`) · Variant `经万年寺登顶` (planned ID `UNKNOWN`) | OSM `type=route`, `route=hiking`, `network=rwn`; <https://www.openstreetmap.org/relation/13567761>; v4 / changeset `159094401` | ODbL applies; durable attribution and derived-database treatment remain `UNKNOWN`; no raw geometry copied. | 29 ordered way members; 1 endpoint gap, 1 graph component, 1 branch node, 3 endpoints; distinct from slot 16; see [scenic evidence](scenic-route-evidence.md). | No OSM `from`/`to`; `经万年寺` identity only; product direction `UNKNOWN`. | 2026-05 Emei Committee notice confirms general/high-area operation and transport controls; exact relation-level walking opening `UNKNOWN`; checked `2026-08-23`. | Similar stem/transport facts do not prove this exact walking variant or rights. | `BLOCKED_CANDIDATE` |
| 16 | B / scenic relations | new | Place `峨眉山` (planned ID `UNKNOWN`) · Route `峨眉山登顶路（经一线天）` / relation `13567762` (planned ID `UNKNOWN`) · Variant `经一线天登顶` (planned ID `UNKNOWN`) | OSM `type=route`, `route=hiking`, `network=rwn`; <https://www.openstreetmap.org/relation/13567762>; v4 / changeset `159094401` | ODbL applies; durable attribution and derived-database treatment remain `UNKNOWN`; no raw geometry copied. | 29 ordered way members; 1 endpoint gap, 1 graph component, 1 branch node, 3 endpoints; distinct from slot 15; see [scenic evidence](scenic-route-evidence.md). | No OSM `from`/`to`; `经一线天` identity only; product direction `UNKNOWN`. | 2026-05 Emei Committee notice confirms general/high-area operation and transport controls; exact relation-level walking opening `UNKNOWN`; checked `2026-08-23`. | Similar stem/transport facts do not prove this exact walking variant or rights. | `BLOCKED_CANDIDATE` |
| 17 | C / highland & gorge | new | Place `鳌太` (planned ID `UNKNOWN`) · Route `鳌太线` / relation `10548040` (planned ID `UNKNOWN`) · Variant `鳌太线` (planned ID `UNKNOWN`) | OSM `type=route`, `route=hiking`, `network=rwn`; <https://www.openstreetmap.org/relation/10548040>; relation v7 | ODbL applies; no raw geometry copied. | 54 ways / 6,542 used nodes; 1 component, 24 branches, 13 endpoints, cycle rank 7, 12 order gaps; modes 48 path/4 track/1 steps/1 footway. | No `from`/`to`; direction `UNKNOWN`. | No route-level official/operator source; checked `2026-08-23` (prior pass). | Branch/gap topology and high-risk access context block promotion. | `BLOCKED_CANDIDATE` |
| 18 | C / highland & gorge | new | Place `大瓦山` (planned ID `UNKNOWN`) · Route `大瓦山徒步线` / relation `12390533` (planned ID `UNKNOWN`) · Variant `白熊沟 → 五池村` (planned ID `UNKNOWN`) | OSM relation page <https://www.openstreetmap.org/relation/12390533>; fresh full status 200 but body unavailable | ODbL applies; no raw geometry copied. | Version, way/node scale, components, branches, endpoints, cycle rank, order and mode are `UNKNOWN` because the body was not retained; no second request. | Ledger `from=白熊沟`, `to=五池村`; traversal `UNKNOWN`. | No route-level official/operator source; checked `2026-08-23`. | `SOURCE_PAYLOAD_UNAVAILABLE`; cannot establish topology/provenance. | `BLOCKED_CANDIDATE` |
| 19 | C / highland & gorge | new | Place `七藏沟` (planned ID `UNKNOWN`) · Route `七藏沟徒步` / relation `12390888` (planned ID `UNKNOWN`) · Variant `卡卡沟 → 黄龙机场` (planned ID `UNKNOWN`) | OSM `type=route`, `route=hiking`, `network=lwn`; <https://www.openstreetmap.org/relation/12390888>; relation v2 | ODbL applies; no raw geometry copied. | 10 ways / 488 used nodes; 1 component, 1 branch, 3 endpoints, cycle rank 0, 0 order gaps; one duplicate way ref (forward/backward); modes 8 path/2 track. | Explicit `from=卡卡沟`, `to=黄龙机场`; duplicate member branch prevents freeze-safe traversal. | No route-level official/operator source; checked `2026-08-23`. | Duplicate/branch topology blocks promotion. | `BLOCKED_CANDIDATE` |
| 20 | C / highland & gorge | new | Place `虎跳峡` (planned ID `UNKNOWN`) · Route `虎跳峡徒步` / relation `18731549` (planned ID `UNKNOWN`) · Variant `虎跳峡徒步` (planned ID `UNKNOWN`) | OSM `type=route`, `route=hiking`, `network=nwn`; <https://www.openstreetmap.org/relation/18731549>; relation v6 | ODbL applies; no raw geometry copied. | 17 ways / 941 used nodes; 1 component, 0 branches, 2 endpoints, cycle rank 0, 2 order gaps; modes 8 path/6 unclassified/2 service/1 residential. | No `from`/`to`; 14 connected member pairs/2 gaps; direction and complete walking traversal `UNKNOWN`. | No route-level official/operator source; checked `2026-08-23`. | Mixed road/service members, order gaps and missing direction block promotion. | `BLOCKED_CANDIDATE` |
| 21 | C / highland & gorge | new | Place `虎跳峡` (planned ID `UNKNOWN`) · Route `中虎跳徒步线` / relation `18731550` (planned ID `UNKNOWN`) · Variant `中虎跳徒步线` (planned ID `UNKNOWN`) | OSM `type=route`, `route=hiking`, `network=rwn`; <https://www.openstreetmap.org/relation/18731550>; relation v2 | ODbL applies; no raw geometry copied. | 8 ways / 326 used nodes; 1 component, 1 branch, 3 endpoints, cycle rank 0, 1 order gap; modes 7 path/1 ladder. | No `from`/`to`; 6 connected pairs/1 gap; direction `UNKNOWN`. | No route-level official/operator source; checked `2026-08-23`. | Branch/gap topology and missing direction block promotion. | `BLOCKED_CANDIDATE` |
| 22 | D / river & local | new | Place `漓江` (planned ID `UNKNOWN`) · Route `漓江路線` / relation `18952585` (planned ID `UNKNOWN`) · Variant `杨堤 → 兴坪` (planned ID `UNKNOWN`) | OSM `type=route`, `route=hiking`, `network=nwn`; <https://www.openstreetmap.org/relation/18952585>; relation v15 | ODbL applies; no raw geometry copied. | 28 ways / 439 used nodes; 1 component, 0 branches, 2 endpoints, cycle rank 0, 2 order gaps; modes 13 footway/2 path/1 tertiary/7 unclassified/1 service/1 residential/3 ferry. | Explicit `from=杨堤`, `to=兴坪`; ferry/road members and gaps prevent pure-walking traversal. | No route-level official/operator source; checked `2026-08-23`. | Mixed ferry/road transport and order gaps block promotion. | `BLOCKED_CANDIDATE` |
| 23 | D / river & local | new | Place `龙脊` (planned ID `UNKNOWN`) · Route `龙脊天路` / relation `19017834` (planned ID `UNKNOWN`) · Variant `龙脊天路` (planned ID `UNKNOWN`) | OSM `type=route`, `route=hiking`, `network=lwn`; <https://www.openstreetmap.org/relation/19017834>; relation v1 | ODbL applies; no raw geometry copied. | 1 footway / 87 used nodes; 1 component, 0 branches, 2 endpoints, cycle rank 0, 0 order gaps. | No `from`/`to`, roundtrip or oneway; endpoints unnamed; direction `UNKNOWN` despite clean walking path. | No route-level official/operator source; checked `2026-08-23`. | Deterministic direction/endpoint identity missing. | `BLOCKED_CANDIDATE` |
| 24 | D / river & local | new | Place `赵公山` (planned ID `UNKNOWN`) · Route `赵公山西环线` / relation `20737376` (planned ID `UNKNOWN`) · Variant `赵公山西环线` (planned ID `UNKNOWN`) | OSM `type=route`, `route=hiking`, `network=lwn`; <https://www.openstreetmap.org/relation/20737376>; relation v3 | ODbL applies; no raw geometry copied. | 3 ways / 139 used nodes; 1 component, 1 branch, 1 endpoint, cycle rank 1, 1 order gap; all modes path. | No `from`/`to` or loop tag; cycle plus dangling branch is not a deterministic loop. | No route-level official/operator source; checked `2026-08-23`. | Branch/gap topology and missing loop/direction semantics block promotion. | `BLOCKED_CANDIDATE` |
| 25 | D / river & local | new | Place `赵公山` (planned ID `UNKNOWN`) · Route `赵公山东线` / relation `20739619` (planned ID `UNKNOWN`) · Variant `赵公山东线` (planned ID `UNKNOWN`) | OSM `type=route`, `route=hiking`, `network=lwn`; <https://www.openstreetmap.org/relation/20739619>; relation v1 | ODbL applies; no raw geometry copied. | 2 ways / 76 used nodes; 1 component, 0 branches, 2 endpoints, cycle rank 0, 0 order gaps; both modes path. | No `from`/`to`, roundtrip or oneway; endpoints unnamed; direction `UNKNOWN` despite clean walking path. | No route-level official/operator source; checked `2026-08-23`. | Deterministic named direction/endpoints missing. | `BLOCKED_CANDIDATE` |
| 26 | replacement pool | new/replacement | Reserved replacement slot; candidate identity is assigned only after the controller freezes a discovery batch (see [C15-C source evidence](catalog-batch1-source-evidence.md)). | OSM/open-data source required; no runtime ID yet. | ODbL/authorization review required; no raw geometry copied. | `UNKNOWN` until the frozen candidate receives a complete topology audit. | `UNKNOWN` until a deterministic walking direction is independently supported. | `UNKNOWN` until an official/operator source is checked. | This slot is intentionally unfilled; a blocked candidate cannot satisfy the count. | `UNASSIGNED_REPLACEMENT_SLOT` |

Ledger count check: searchable slots are `01–05` plus `07–26` = `25` (`5 existing + 20 missing/replacement`). The
`R-WUTAI` row is a separate non-counting restriction record and is not part of the searchable total. No legacy
builtin place-only row is counted. The 20 new rows are evidence-work slots, not delivered routes; any row that stays
blocked must be replaced through a reviewed ledger update.

## #161 Batch2 evidence checkpoint — 2026-08-23

See [`docs/catalog-batch2-source-evidence.md`](catalog-batch2-source-evidence.md). The first new OSM full read
(`10548040`, relation v7) returned a connected graph with 24 branch nodes, 13 endpoints, cycle rank 7 and 12
ordered-member gaps, so it is `BLOCKED_CANDIDATE`. The next request (`12390533`) returned HTTP `429`; the mandated
stop rule prevented retries and any broad replacement search. No row reached `PROPOSED_FOR_CONTROLLER_FREEZE` (`0/5`),
and no candidate counts toward the ten current searchable `full` routes or the 25-slot target. Rows not read remain
`UNKNOWN`/blocked until a controller re-authorizes bounded source research.

## #161 controller-authorized fresh pass checkpoint — 2026-08-23

The fresh pass (comment `5386298463`) read only the eight unresolved rows once each, sequentially at a minimum
five-second interval with an identifying User-Agent. Seven full bodies returned HTTP 200; `12390533` returned 200
but its body was not retained and was not re-requested. `19017834` and `20739619` are connected, branch-free,
walking-only paths, but endpoint names/direction are unresolved; the other rows fail branch/order or mixed ferry/road
gates. No row reached `PROPOSED_FOR_CONTROLLER_FREEZE` (`0/5`), and no ledger slot or runtime count changed.

## #161 controller-authorized replacement discovery checkpoint — 2026-08-23

Comment `5386337561` authorized one metadata-only China `route=hiking` relation query followed by at most twenty
sequential current-full reads. The Overpass metadata response was HTTP 200 with 111 tagged relations; all twenty
selected full reads returned HTTP 200 at the required six-second interval and no throttle occurred. The durable
aggregate evidence is [`docs/catalog-batch2-source-evidence.md`](catalog-batch2-source-evidence.md).

Exactly five replacement identities are now labelled `PROPOSED_FOR_CONTROLLER_FREEZE`: relations `18364943`
`猛古村-桑伯格徒步线路`, `18364941` `黑石城徒步`, `19684389` `惠州大南山精华线`, `19686682`
`惠州大南山拉胡线` and `20072078` `马峦山自然笔记步道`. Each has explicit OSM `from`/`to`, a connected
branch-free two-endpoint graph, orientable member order and a disclosed route=hiking walk/road boundary. Exact
opening/operator permission remains `UNKNOWN`; ODbL attribution and derived-database review remain required.

These were proposals only at the evidence checkpoint; that historical state is superseded by the Phase2 reconciliation
above. The current searchable runtime is `full=15`, remaining gap `10`, and R-WUTAI remains a separate non-counting
restriction. Slots 22–26 are now assigned to the five frozen runtime variants; no deployment, CloudBase, commit or push
action is implied by the local implementation.

## 3. Source, rights and promotion policy

1. **OSM/open data is candidate geometry, not a route verdict.** A relation page and a connected way sequence can
   establish only that a public OSM relation was observed at the checked time. Geometry does not prove that a path is
   complete, legally accessible, open today, safe, permitted, or suitable for a user. `from`/`to` tags do not by
   themselves establish an out-and-back/loop semantic or a product direction contract.
2. **ODbL is explicit.** OSM data is made available under the Open Data Commons Open Database License; any later
   derived database must preserve required attribution and satisfy the applicable share-alike/notice obligations.
   The future runtime Source must link the relation/source snapshot and record the applicable attribution decision.
   This planning file contains links and metadata only; it does not copy OSM geometry into the repository.
3. **First-party/operator status controls opening.** A current scenic-area, government, land-manager or authorized
   operator source is required for `operationalStatus`. A historical notice, an OSM tag, a user track or a scenic
   marketing page cannot be promoted to `open`. If no route-level current source exists, keep `UNKNOWN` and block.
4. **Tracks require rights.** A first-party recording or contributor/partner file is admissible only with explicit
   creator/partner authorization or a compatible open licence. The existing reviewed GPX/KML pilots have their own
   prior controller evidence; this slice does not infer reuse rights from them. No third-party platform scraping,
   bulk extraction, bypassing, or raw-track download is allowed.
5. **Promotion is serial and manual.** A child Issue may promote only after unique Place/Route/RouteVariant identity,
   complete geometry/topology, direction and metrics, source/license notes, official/operator opening evidence,
   public DTO/result contracts and focused tests all pass. There is no candidate auto-publish path. A blocked row may
   be replaced only by a controller-approved ledger update; it may not be silently renamed or merged.

Reference policy pages: <https://www.openstreetmap.org/copyright>,
<https://opendatacommons.org/licenses/odbl/>, and the repository's
`docs/architecture.md` / `docs/community-track-workflow.md` source and publication boundaries.

## 4. Serial child-Issue proposal

These are proposed labels only; no child GitHub Issue is opened by this planning slice. The controller assigns the next
Issue numbers after this ledger is reviewed.

| Proposed child | Slots | Work contract | RED/GREEN and independent Review | Stop condition |
|---|---|---|---|---|
| `C15-A / Yubeng evidence` | 07–11 | Reconcile OSM relation identity and ODbL notice; audit all member topology and exact direction; obtain first-party/operator opening source; keep 10 quarantined if the Chinese/English name conflict remains. Only after all core facts are field-complete may a route-data fragment be proposed. | Add focused route-domain/data/result-page contract for the new fragment; capture genuine RED before the fragment; GREEN must prove no candidate leakage, exact IDs, attribution and unknown-status behavior. Two independent Reviews at exact head. | Any relation disconnected/ambiguous, no compatible rights, no route-level opening source, or any public-contract mismatch blocks the slot and the batch. |
| `C15-B / scenic relations` | 12–16 | Review Huangshan, Taishan, Sanqing and both Emei relations separately; do not merge similarly named routes. Confirm start/end, access mode, complete geometry, operator status and ODbL treatment. | Same focused route-domain/data/result-page gates; no runtime catalog edits outside the child allowlist; two independent Reviews. | Missing exact identity, incomplete geometry, unclear transport/foot segments, rights uncertainty or missing current opening source keeps the row `BLOCKED`. |
| `C15-C / highland & gorge` | 17–21 | Review Ao-Tai, Washan, Qizanggou and Tiger Leaping relations; give extra legality/access scrutiny to management-sensitive routes; disambiguate slots 20/21. | Same tests and exact-head Reviews; no scraping or bulk extraction. | Any access/legal ambiguity, duplicate/containment identity, disconnected geometry or missing operator evidence blocks promotion. |
| `C15-D / river & local` | 22–25 | Audit Li River transport/foot boundary, Longji identity against legacy aliases, and both Zhaogongshan relation boundaries; derive no metrics until topology is complete. | Same tests and exact-head Reviews; attribution and source links must be durable. | Mixed transport, alias collision, incomplete relation, rights gap or unknown opening source keeps the row `BLOCKED`. |

Each child Issue must declare its own application/data/test allowlist before implementation. No child may modify this
ledger, runtime catalog, deployment or public release state without a controller-approved plan-sync update.

## 5. Verification performed for this planning slice

- Read-only baseline before docs edits: `test:route-domain`, `test:route-data`, `test:result-page` all passed on Node
  `v24.18.0` / pinned npm `10.9.2`.
- C15-A evidence remains recorded in `docs/yubeng-route-evidence.md`; all five Yubeng rows are blocked.
- C15-B OSM source audit: all five scenic relation/full endpoints returned successfully once on `2026-08-23`.
  Ordered member IDs/roles and endpoint/graph topology summaries are in `docs/scenic-route-evidence.md`; no nodes,
  coordinates or raw geometry were copied. Duplicate members, endpoint gaps and branches remain blocking facts.
- C15-B official-source audit: Huangshan, Taishan and Emei operator/government pages were checked for current entrance/
  opening and transport context. Sanqing operator ticket/cableway HTTPS was not TLS-reproducible during Review and is
  excluded from verified primary evidence; HTTP was not used as a substitute. Its secondary reopening report is context
  only. None binds a complete, rights-cleared OSM walking variant; cableway, shuttle and road facts remain separate.
  All five rows stay `BLOCKED_CANDIDATE`.
- Controller-handoff checks: `git diff --check`, exact allowlist, sensitive-value scan, 25-row/required-column count
  and the three focused non-regression commands pass. The repository has no Markdown/link checker installed; static
  URL syntax inspection found no malformed token. No commit, push, child Issue, PR, deployment or runtime data
  mutation was performed by the executor.

## 8. #159 Phase2 runtime slice (controller freeze 5385785828)

The first five missing/replacement slots are now represented as runtime full variants for controller review only:
16162196 complete relation, 20072118, 20046643, 20739620 complete walking loop (with a disclosed residential member),
and 17841828 赤甲楼方向入口 → 三峡之巅. Existing full=5 plus these five yields exactly full=10; Wutai remains the
separate blocked non-counting restriction. Each row keeps `operationalStatus=unknown`, complete ordered OSM WGS84
geometry, a ≤500-point preview, ODbL/open_data provenance, and deterministic metric/elevation evidence. See
`docs/route-data-licenses.md` for the full relation manifests and the Open-Meteo/Copernicus derivation boundary.
This checkpoint is implementation evidence, not a merge, deployment or Goal acceptance decision.

## #163 Batch3 Phase1 evidence checkpoint — 2026-08-23

The bounded third-batch report is [`docs/catalog-batch3-source-evidence.md`](catalog-batch3-source-evidence.md). One
metadata-only China Overpass request returned 111 tagged relations; excluding the 55 prior searchable/audited IDs left
74 new rows. Twenty current-full reads then completed once each at the required six-second interval, all HTTP 200 and
without a throttle. Exactly five identities are proposed for controller freeze: `7060545`, `7060546`, `7060560`,
`17147571` and `17147573`. The first three are closed footway/steps loops; the latter two are branch-free, ordered
footway/steps chains with distinct named endpoints. Four other clean chains remain alternates and same-label/stale
identity rows are held; all topology/mode failures remain blocked.

These five are proposals only and do not change the ledger count: runtime truth remains searchable `full=15`, remaining
gap `10`, with Wutai separate and non-counting. ODbL relation/full URLs and attribution obligations are recorded in the
evidence report. Opening, permission, safety and derived-database treatment remain `UNKNOWN` pending controller review.
No runtime, test, schema, elevation, CloudBase, deployment, commit or push action occurred. Handoff is
`READY_FOR_CONTROLLER_REVIEW`.

## #163 Phase2 runtime reconciliation — controller freeze `5386726512` / correction `5386727268`

The Phase1 proposal state above is superseded by the controller freeze. The exact five frozen relations are now
represented as searchable `full` RouteVariants; historical blocked rows remain in the ledger as evidence and are not
silently renamed. Runtime slot reconciliation is:

| Batch | Frozen runtime variants | Current contribution |
|---|---|---:|
| baseline | five existing reviewed pilots | 5 full |
| #159 | `16162196`, `20072118`, `20046643`, `20739620`, `17841828` | 5 full |
| #161 | `18364943`, `18364941`, `19684389`, `19686682`, `20072078` | 5 full |
| #163 | `7060545`, `7060546`, `7060560`, `17147571`, `17147573` | 5 full |
| restriction | `R-WUTAI` | non-counting blocked |

The ledger target remains exactly 25 searchable slots (`5 existing + 20 missing/replacement`); current runtime is
`full=20`, remaining gap `5`. #163 Macau variants use region `澳门`; both Sha Tin variants use region `香港`, share
bare canonical `沙田郊野徑` (resolver confirmation) and retain only direct endpoint-qualified aliases. Complete OSM
geometry, <=500 previews, ODbL/open-data provenance, one bounded Open-Meteo/Copernicus DEM GLO-90 request per route,
version manifests and route-specific unknown-status rationales are recorded in
[`docs/route-data-licenses.md`](route-data-licenses.md) and [`docs/catalog-batch3-source-evidence.md`](catalog-batch3-source-evidence.md).
Full `routeGeometry` is internal and omitted from public trip/result DTOs. Handoff: `READY_FOR_CONTROLLER_REVIEW`;
no deployment, CloudBase, commit, push or PR action occurred.

## #165 Batch4 Phase1 evidence checkpoint — 2026-08-24 (historical; superseded by Phase2 above)

The historical evidence-only batch re-read the four eligible-but-unselected #163 alternates once, made one metadata-only
China `route=hiking` Overpass query, then read exactly twenty new current-full OSM relations once each with an
identifying User-Agent and at least six seconds between starts. All requests returned HTTP 200; no throttle, retry,
mirror, third-party/private source, elevation query or raw geometry copy occurred. Full aggregate detail is in
[`docs/catalog-batch4-source-evidence.md`](catalog-batch4-source-evidence.md).

Exactly five identities are **`PROPOSED_FOR_CONTROLLER_FREEZE`** and remain uncounted: `7065552` 路環石面盆古道,
`17618981` 鲲鹏径第4段, `17719174` 鲲鹏径第20段, `18220700` 梅林山郊野径 and `18220701` 塘朗山郊野径.
Each has one connected, branch-free, ordered walking relation with distinct named endpoints. Residential, track and
unclassified members are disclosed road boundaries; primary/secondary/cycleway/branch/gap rows are blocked. No
OSM-only row proves current opening, permission, safety, legality or ODbL-derived-database treatment, so those facts
remain `UNKNOWN` pending controller freeze and a later implementation gate.

The ledger remains exactly 25 searchable slots: runtime `full=20`, remaining gap `5`; Wutai is a separate
non-counting blocked restriction. This checkpoint is **`READY_FOR_CONTROLLER_REVIEW`** and does not authorize runtime,
elevation, deployment, CloudBase, commit or push work.
