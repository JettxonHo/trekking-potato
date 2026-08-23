# C15-A — 雨崩五条 OSM 候选证据审计

- Goal: `TP-CATALOG-001`
- Issue: `#155`
- Batch: `A / Yubeng`
- Audit date: `2026-08-23` (Asia/Shanghai)
- Scope: evidence and status only; no runtime `Source/Place/Route/RouteVariant` record was created
- Overall verdict: **five candidates remain `BLOCKED_CANDIDATE`; none is `ELIGIBLE_FOR_IMPLEMENTATION`**

## Executive finding

The current OSM relation pages establish five named `type=route`, `route=hiking` relations and expose their ordered
way-member lists. They do not establish a complete, permissioned, legal, safe or currently open product route. A
fresh node/way topology replay was stopped when the OSM editing API returned HTTP `429` on the first full-relation
request. The existing planning snapshot's consecutive-endpoint observation is retained as preliminary evidence only;
gaps, branches and completeness are therefore `UNKNOWN` in this audit. No distance, elevation or duration metric is
derived from incomplete evidence.

The current official local-government access notice is independently decisive for three rows: the four-agency Deqin
County notice is dated `2025-10-14` and was published/reposted on the Xiaruo Township site on `2026-04-10`. It lists
the Yubeng **Shenhu, Binghu, insect-grass and Nise routes** among undeveloped/unopened areas and prohibits tourism/
exploration there. The same official source does not provide a route-level opening notice for Shenpu or Ninong. A
scenic-area price page, a general tourism article or an OSM tag cannot substitute for a current route-level opening/
permit source. All five rows therefore remain blocked.

## Candidate verdicts

| Relation | Provisional identity and aliases | OSM direction tags | Member/topology audit | Current official access evidence | Rights/attribution | Evidence verdict |
|---:|---|---|---|---|---|---|
| `19700005` | Place `雨崩` (planned ID `UNKNOWN`); Route `雨崩冰湖线`; Variant `雨崩上村 → 雨崩冰湖`; aliases `冰湖线`, `Yubeng Binghu Route`, `REF=冰湖线`, `name:zh`, `name:zh-Hans` | `from=雨崩上村`, `to=雨崩冰湖`; no `roundtrip`/loop semantics | 11 ordered way members, all role-empty; preliminary planning snapshot observed consecutive endpoints. Full gaps/branches/completeness recheck stopped at OSM API `429`; metrics `UNKNOWN` | Four-agency Deqin County notice dated `2025-10-14`, published/reposted by Xiaruo Township site `2026-04-10`, explicitly includes `雨崩村冰湖线路` in undeveloped/unopened areas; no promotion as open | ODbL applies; future attribution/derived-database treatment and exact runtime use decision are not recorded | **`BLOCKED_CANDIDATE`** — explicit route prohibition, plus incomplete topology/rights gate |
| `19700028` | Place `雨崩` (planned ID `UNKNOWN`); Route `雨崩尼色线`; Variant `雨崩上村 → 尼色冰洞`; aliases `尼色线`, `Yubeng Nise Route`, `REF=尼色线`, `name:zh`, `name:zh-Hans` | `from=雨崩上村`, `to=尼色冰洞`; no `roundtrip`/loop semantics | 8 ordered way members, all role-empty; preliminary planning snapshot observed consecutive endpoints. Full gaps/branches/completeness recheck stopped at OSM API `429`; metrics `UNKNOWN` | Four-agency Deqin County notice dated `2025-10-14`, published/reposted by Xiaruo Township site `2026-04-10`, explicitly includes `雨崩村尼色线路` in undeveloped/unopened areas; no promotion as open | ODbL applies; future attribution/derived-database treatment and exact runtime use decision are not recorded | **`BLOCKED_CANDIDATE`** — explicit route prohibition, plus incomplete topology/rights gate |
| `19700031` | Place `雨崩` (planned ID `UNKNOWN`); Route `雨崩神瀑线`; Variant `雨崩下村 → 雨崩神瀑`; aliases `神瀑线`, `Yubeng Shenpu Route`, `REF=神瀑线`, `name:zh`, `name:zh-Hans` | `from=雨崩下村`, `to=雨崩神瀑`; no `roundtrip`/loop semantics | 4 ordered way members, all role-empty; preliminary planning snapshot observed consecutive endpoints. Full gaps/branches/completeness recheck stopped at OSM API `429`; metrics `UNKNOWN` | No current route-level official/operator opening or permit source found. General government safety notices do not prove that this exact OSM variant is open | ODbL applies; future attribution/derived-database treatment and exact runtime use decision are not recorded | **`BLOCKED_CANDIDATE`** — current access `UNKNOWN`, plus incomplete topology/rights gate |
| `19700036` | Place `雨崩` (planned ID `UNKNOWN`); Route `雨崩神湖线`; Variant `雨崩下村 → 雨崩神湖`; aliases `神湖线`, `name:zh`, `name:zh-Hans`; **identity conflict: `name:en=Yubeng Shenpu Route`** | `from=雨崩下村`, `to=雨崩神湖`; no `roundtrip`/loop semantics | 3 ordered way members, all role-empty; preliminary planning snapshot observed consecutive endpoints. Full gaps/branches/completeness recheck stopped at OSM API `429`; metrics `UNKNOWN` | Four-agency Deqin County notice dated `2025-10-14`, published/reposted by Xiaruo Township site `2026-04-10`, explicitly includes `雨崩村神湖线路` in undeveloped/unopened areas; no promotion as open | ODbL applies; identity conflict and future attribution/derived-database treatment remain unresolved | **`BLOCKED_CANDIDATE`** — identity quarantine is mandatory; explicit route prohibition and incomplete topology/rights also block |
| `19700085` | Place `雨崩` (planned ID `UNKNOWN`); Route `雨崩尼农线`; Variant `尼农村停车场 → 雨崩上村`; aliases `尼农线`, `Yubeng Ninong Route`, `REF=尼农线`, `name:zh`, `name:zh-Hans` | `from=尼农村停车场`, `to=雨崩上村`; no `roundtrip`/loop semantics | 11 ordered way members, all role-empty; preliminary planning snapshot observed consecutive endpoints. Full gaps/branches/completeness recheck stopped at OSM API `429`; metrics `UNKNOWN` | No current route-level official/operator opening or permit source found. The existence of a village/road project does not prove this walking variant is open | ODbL applies; future attribution/derived-database treatment and exact runtime use decision are not recorded | **`BLOCKED_CANDIDATE`** — current access `UNKNOWN`, plus incomplete topology/rights gate |

`from`/`to` are OSM relation tags, not a product-level proof of one-way travel, out-and-back behavior, loop closure,
return transport or day structure. The five rows have no OSM `roundtrip`, distance, ascent, descent or duration tag
that can close the product contract. No route metrics are included in this report.

## OSM identity and ordered-member evidence

The relation viewer and its member endpoint were read on 2026-08-23. Each relation is `type=route`, `route=hiking`,
`network=lwn`, and each member is a `way` with an empty role. The IDs below preserve the relation's current ordered
member list; they are identifiers only, not copied geometry.

| Relation | OSM relation page | Version / changeset shown by viewer | Ordered way members |
|---:|---|---|---|
| `19700005` | [OSM relation 19700005](https://www.openstreetmap.org/relation/19700005) | v3 / changeset `173137930` | `1437114336 → 292590550 → 292590525 → 292590557 → 1059587753 → 1059587754 → 292590520 → 1084007803 → 1437119403 → 1437114338 → 1437114339` |
| `19700028` | [OSM relation 19700028](https://www.openstreetmap.org/relation/19700028) | v1 / changeset `173137004` | `1437114336 → 292590550 → 292590525 → 1069604722 → 1069604721 → 1069223622 → 1069223621 → 1437115560` |
| `19700031` | [OSM relation 19700031](https://www.openstreetmap.org/relation/19700031) | v1 / changeset `173137136` | `1059587750 → 157107114 → 292590536 → 1059587743` |
| `19700036` | [OSM relation 19700036](https://www.openstreetmap.org/relation/19700036) | v1 / changeset `173137249` | `281341486 → 292590570 → 292590583` |
| `19700085` | [OSM relation 19700085](https://www.openstreetmap.org/relation/19700085) | v2 / changeset `173143500` | `1058948546 → 1058948544 → 1058948545 → 1058948548 → 1058948547 → 255866886 → 1058948561 → 1058948562 → 255866887 → 255866888 → 255866889` |

The planning ledger recorded a preliminary consecutive-way-endpoint observation for all five rows. During this
evidence pass, the OSM API endpoint
`https://api.openstreetmap.org/api/0.6/relation/<id>/full.json` returned HTTP `429` on the first full-relation
request. Per the Issue stop condition, no broad retry or alternate bulk extraction was attempted. Consequently:

- endpoint continuity is **preliminary only**, not a complete topology approval;
- node-level gaps, branch degree, way completeness, disconnected components and direction reversal are `UNKNOWN`;
- no raw nodes, coordinates, GPX/KML, geometry or platform export was copied into the repository;
- a later implementation Issue must repeat the full topology audit after an allowed, rate-limited OSM read succeeds.

## Official/operator access evidence

### Direct matching prohibition (three rows)

The [four-agency Deqin County notice dated 2025-10-14, published/reposted on the Xiaruo Township site on
2026-04-10](https://www.deqin.gov.cn/zfxxgk_deqin_xrx/fdzdgknr/tzgg/202604/20260410_239871.html) is signed by the
Deqin County Culture and Tourism Bureau, Forestry and Grassland Bureau, Emergency Management Bureau, and the Deqin
Branch of the Diqing Prefecture Ecology and Environment Bureau. It lists `雨崩村神湖、冰湖、虫草线路、尼色线路`
under undeveloped areas without tourism facilities/safety guarantees and prohibits tourism/exploration there. This is
government access control, not an inference from OSM geometry. It blocks `19700005` (冰湖), `19700028` (尼色) and
`19700036` (神湖) from promotion. It does not authorize a different route or establish a reopening date.

The [Deqin County Culture and Tourism Bureau notice dated 2026-03-18](https://www.deqin.gov.cn/zfxxgk_deqin_whhlyj/fdzdgknr/tzgg/202603/20260318_239184.html)
is a contemporaneous county notice titled “关于禁止在未开发区域开展旅游、探险等活动的通告”. Its page links the
official notice PDF; it reinforces the prohibition boundary but does not provide a route-level opening record for any
of these five variants.

### No positive route-level opening evidence (two rows)

The [Deqin County police safety notice dated 2026-05-27](https://www.deqin.gov.cn/zfxxgk_deqin_gaj/fdzdgknr/gzdt/202605/20260527_241211.html)
describes safety controls at Yubeng entrances and core hiking nodes and warns against undeveloped routes. It is useful
current safety context, but it does not say that the Shenpu or Ninong OSM relation is open, permitted, complete or
appropriate for the product. Therefore `19700031` and `19700085` retain access `UNKNOWN` and remain blocked.

The [Deqin County 2026 Yubeng tourism-road project notice](https://www.deqin.gov.cn/zfxxgk_deqin_jtysj/fdzdgknr/tzgg/202607/20260710_242727.html)
sets future repair works for the Xidang road. Road works and a village access project are not route-level permission
or opening evidence for the Ninong walking variant and are not used as a promotion basis.

## ODbL and source treatment

The five relation pages are OSM open-data sources. The [OSM copyright and license page](https://www.openstreetmap.org/copyright)
states that OSM data is licensed under the [Open Data Commons ODbL](https://opendatacommons.org/licenses/odbl/),
requires credit to OpenStreetMap and its contributors, and imposes notice/share-alike obligations when data is altered
or built upon. This report records durable relation links and metadata only. It does **not** decide the future runtime
derived-database form, attribution placement, or share-alike notice for a catalog fragment; that decision remains an
implementation-issue gate. Until that gate is resolved, rights/attribution is `UNKNOWN` for promotion.

No contributor account was used as evidence or copied; no private submission or third-party track was accessed. This
evidence slice did not newly fetch or copy raw geometry or exact coordinates after the full API returned `429`. No
third-party route platform was scraped or used as evidence.

## Required next gate

No row may enter a runtime catalog from this report. A later controller-activated implementation Issue would need, at
minimum, a successful rate-limited full OSM member/node audit, complete topology and direction review, a collision-safe
identity decision, explicit ODbL attribution/derived-database treatment, and a current route-level official/operator
opening or permit source. Until every field is complete, the row remains `BLOCKED_CANDIDATE` and does not count toward
the 24 searchable `full` target.
