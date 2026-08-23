# C15-B — 黄山、泰山、三清山、峨眉山五条 OSM 候选证据审计

- Goal: `TP-CATALOG-001`
- Issue: `#157`
- Batch: `B / scenic relations`
- Audit date: `2026-08-23` (Asia/Shanghai)
- Scope: evidence and status only; no runtime `Source/Place/Route/RouteVariant` record was created
- Overall verdict: **five candidates remain `BLOCKED_CANDIDATE`; none is `ELIGIBLE_FOR_IMPLEMENTATION`**

## Executive finding

The five OSM relations were read once from their primary relation/full endpoints. Relation identity and ordered way
members are reproducible, but the member lists are not field-complete route geometry: all five relations contain ordered
endpoint gaps, every relation has branch nodes, Huangshan/Taishan/Sanqing contain duplicate way members, and Taishan
has four disconnected graph components. The relation metadata does not establish a product direction, a complete
walkable variant, or a walking/road/cableway/shuttle boundary. No distance, elevation or duration metric is derived.

Available official sources establish some scenic-area entrances and transport context, but they do not map the exact OSM
relation to one currently open, permissioned walking variant. The Sanqing operator ticket/cableway HTTPS source was not
TLS-reproducible during Review, so it is excluded from verified primary evidence; HTTP is unsafe and was not used as a
substitute. Where a source names a cableway, shuttle, road or a general scenic area, that fact is recorded as a separate
access mode and is not substituted for walking-path evidence. The two Emei relations share a long stem but diverge in
their middle members and remain separate variants.

ODbL attribution and the future derived-database treatment are not yet decided for a runtime catalog projection. This
is an independent promotion gate. All five rows therefore remain blocked even where a general scenic area or entrance
is currently operating.

## Candidate verdicts

| Relation | Provisional identity and aliases | OSM direction / relation state | Complete-topology result | Official access evidence (walking vs transport) | Rights / verdict |
|---:|---|---|---|---|---|
| `18970848` | Place `黄山` (planned ID `UNKNOWN`); Route `黄山路线`; Variant `云谷寺 → 慈光阁`; aliases `Huangshan Trail`, `name`, `from`, `to` | `type=route`, `route=hiking`, `network=nwn`; `from=云谷寺`, `to=慈光阁`; v5, changeset `164770803` | 80 way members; 5 ordered endpoint gaps; 1 graph component; 9 branch nodes; 5 graph endpoints; duplicate way refs | The [2026 Spring Festival operating notice](https://hsgwh.huangshan.gov.cn/xwzx/tzgg/9318819.html) gives general scenic opening and says walking-entry gates stop admitting at 15:00 during that period. The [official transport page](https://hsgwh.huangshan.gov.cn/lyfw/lyfw/jqhc/9197913.html) identifies 慈光阁 as a walking entrance and lists shuttle stops at 慈光阁/云谷寺. A [2025 path notice](https://hsgwh.huangshan.gov.cn/xwzx/tzgg/9244616.html) opened 云谷寺—白鹅岭 but temporarily closed 慈光阁—玉屏楼; no current notice found that proves this exact relation is an uninterrupted open walk. Cableways, shuttle buses and mountain roads are separate from the walking candidate. | ODbL applies; attribution/derived-database decision `UNKNOWN`. Gaps, branches, duplicate members and exact current walking status block promotion. **`BLOCKED_CANDIDATE`** |
| `19818868` | Place `泰山` (planned ID `UNKNOWN`); Route `泰山红门登山道`; Variant `泰山红门登山道`; alias `Taishan Hongmen Route` | `type=route`, `route=foot`; no `from`/`to`; one member role `gate`; v17, changeset `182353010` | 64 way members; 15 ordered endpoint gaps; 4 graph components; 17 branch nodes; 7 graph endpoints; duplicate way refs | The [2026-04-29 Tai'an government notice](https://gxq.taian.gov.cn/art/2026/4/29/art_350045_10332904.html) describes the Hongmen visitor-center walking line as open for the holiday, about 9.5 km/7,863 steps, with a night-quota caveat. It separately describes Zhongtianmen cableway, shuttle lines and other entrances. The [Tai Shan committee route page](https://tsgw.taian.gov.cn/art/2021/5/26/art_363479_10320188.html) identifies the Hongmen sightseeing route, but neither source proves that this OSM relation's disconnected/duplicated member set is the exact current walkable variant. | ODbL applies; attribution/derived-database decision `UNKNOWN`. Missing direction, disconnected components, gaps/branches and exact relation-to-operator mapping block promotion. **`BLOCKED_CANDIDATE`** |
| `18970781` | Place `三清山` (planned ID `UNKNOWN`); Route `三清山路线`; Variant `三清山路线`; alias `Mount Sanqing Trail` | `type=route`, `route=hiking`, `network=nwn`; no `from`/`to`; v3, changeset `164770889` | 43 way members; 12 ordered endpoint gaps; 1 graph component; 16 branch nodes; 8 graph endpoints; duplicate way refs | The operator's 2026 ticket/cableway HTTPS source was not TLS-reproducible during Review and is excluded from verified primary evidence; HTTP is unsafe and was not used as a substitute. A [2026-08-11 secondary report](https://jx.ifeng.com/c/8vTp6otkYlK) reproduces an operator/government reopening notice as context only; it does not identify which OSM members correspond to an open walking variant. | ODbL applies; attribution/derived-database decision `UNKNOWN`; exact variant, direction, mode boundary and current route-level opening remain unknown. **`BLOCKED_CANDIDATE`** |
| `13567761` | Place `峨眉山` (planned ID `UNKNOWN`); Route `峨眉山登顶路（经万年寺）`; Variant `经万年寺登顶`; aliases `Road to Golden Peak (via Wannian Temple)`, `name:zh` | `type=route`, `route=hiking`, `network=rwn`; no `from`/`to`; v4, changeset `159094401` | 29 way members; 1 ordered endpoint gap; 1 graph component; 1 branch node; 3 graph endpoints; no duplicate way refs | The [2026-05-22 Emei Scenic Area Committee notice](https://www.leshan.gov.cn/lsswszf/zzzqgsgg/808058894643269.html) says the scenic area remains open while the Golden Peak area has visitor limits and reduced sightseeing-bus/Golden-Peak-cableway capacity; it also anticipates separate Qingyin Pavilion/Wannian Temple tickets. A previously recorded 2025 government route URL returned HTTP `404` during Review and is excluded from evidence. Cableway, sightseeing bus and road segments remain separate. | ODbL applies; attribution/derived-database decision `UNKNOWN`. The relation has a topology gap and no exact current route-level opening/permission binding. **`BLOCKED_CANDIDATE`** |
| `13567762` | Place `峨眉山` (planned ID `UNKNOWN`); Route `峨眉山登顶路（经一线天）`; Variant `经一线天登顶`; aliases `Road to Golden Peak (via Yixiantian)`, `name:zh` | `type=route`, `route=hiking`, `network=rwn`; no `from`/`to`; v4, changeset `159094401` | 29 way members; 1 ordered endpoint gap; 1 graph component; 1 branch node; 3 graph endpoints; no duplicate way refs | The same [2026-05-22 official Emei notice](https://www.leshan.gov.cn/lsswszf/zzzqgsgg/808058894643269.html) is only general scenic/high-area operating evidence. It does not state that the Yixiantian OSM relation is the current permitted walk, and the relation has no `from`/`to` tags. Cableway, sightseeing bus and road segments are not walking evidence. | ODbL applies; attribution/derived-database decision `UNKNOWN`. The relation remains distinct from `13567761`; missing direction, a topology gap and no exact route-level opening/permission binding block promotion. **`BLOCKED_CANDIDATE`** |

`from`/`to` tags, where present, are OSM metadata and do not prove one-way travel, return transport, loop closure or
product day structure. No candidate receives metrics because the complete reviewed walking geometry and mode boundary
are not established.

## OSM identity and ordered-member evidence

The primary OSM relation endpoint was read on 2026-08-23. The full-relation response was consumed once per candidate;
no raw nodes, coordinates or way geometry were copied into this report. The sequences below preserve only ordered way
identifiers and roles.

| Relation | OSM relation page | Version / timestamp / changeset | Ordered way members (role shown in parentheses) |
|---:|---|---|---|
| `18970848` | [OSM relation 18970848](https://www.openstreetmap.org/relation/18970848) | v5 / `2025-04-10T13:59:58Z` / `164770803` | `145504312 → 137555287 → 1376363970 → 142032054 → 142032054 → 1376363970 → 137555287 → 64621356 → 1376135946 → 64621344 → 1376135956 → 64621402 → 64621385 → 64621383 → 713332496 → 713332494 → 713332497 → 37095167 → 64621367 → 64621332 → 64621354 → 133585062 → 64621384 → 64621384 → 64621327 → 64621365 → 64621397 → 64621380 → 1376135947 → 345689544 → 1376135948 → 586364892 → 586364893 → 586364895 → 345689540 → 345689543 → 345689542 → 586364883 → 586364881 → 586364882 → 586364884 → 345689545 → 345689541 → 277332930 → 586364888 → 586364887 → 586364886 → 586364889 → 60095490 → 60095485 → 64621330 → 1376135950 → 712507349 → 64621338 → 64621345 → 64621359 → 64621387 → 64621323 → 64621328 → 60095497 → 64621366 → 64621358 → 60095487 → 1376360652 → 1376135954 → 1376135955 → 302866556 → 64621377 → 713332513 → 713332512 → 174709173 → 1300675691 → 1376135957 → 586364898 → 586364897 → 586364896 → 64621341 → 64621333 → 64621368 → 64621329` |
| `19818868` | [OSM relation 19818868](https://www.openstreetmap.org/relation/19818868) | v17 / `2026-05-07T18:55:51Z` / `182353010` | `225403836(gate) → 225403836 → 225026053 → 676032650 → 479406146 → 479406146 → 479406146 → 479406147 → 374513962 → 1449489175 → 374513961 → 1449489176 → 1449489174 → 1449707824 → 1449489172 → 1449707823 → 1449489173 → 231869937 → 231869931 → 231869938 → 231869939 → 1456538243 → 1456538244 → 376182675 → 1449871715 → 1452949834 → 1452949835 → 713403067 → 1456631162 → 1452949837 → 1452949836 → 1452949879 → 1452949880 → 1449893619 → 1449871715 → 713403066 → 225025646 → 1449707856 → 1449707855 → 1463549991 → 1449650443 → 1463549990 → 225025645 → 225025648 → 169049694 → 1449707820 → 225011515 → 1456078095 → 169049691 → 169049690 → 169049693 → 169049696 → 169049687 → 169049698 → 169049683 → 1463549993 → 1449899725 → 169049685 → 1456610860 → 1104709749 → 1449546711 → 169049678 → 1449650446 → 231870107` |
| `18970781` | [OSM relation 18970781](https://www.openstreetmap.org/relation/18970781) | v3 / `2025-04-10T14:01:49Z` / `164770889` | `908345945 → 908345944 → 362866948 → 1376357821 → 921204406 → 908345941 → 908345942 → 921204405 → 483438935 → 362866876 → 908345939 → 908345938 → 483438932 → 492610240 → 492610238 → 362866782 → 921204410 → 492090672 → 1376357820 → 484174981 → 484007350 → 484007349 → 492602598 → 499574305 → 921204409 → 1376357822 → 492605922 → 385707113 → 908345940 → 362866782 → 499574306 → 501207696 → 908346481 → 499577308 → 483438928 → 483438926 → 492605920 → 492605927 → 492090666 → 492090671 → 1376357818 → 1376357818 → 492090670` |
| `13567761` | [OSM relation 13567761](https://www.openstreetmap.org/relation/13567761) | v4 / `2024-11-13T14:39:51Z` / `159094401` | `1013471821 → 1013471822 → 1013471820 → 1013476038 → 1013471814 → 1013471813 → 1013476040 → 1013471815 → 1013471816 → 1013471817 → 1013471818 → 1013476041 → 111978123 → 1013476042 → 1013471808 → 1013476046 → 1013471806 → 989298434 → 989298433 → 247729062 → 1013471851 → 75768096 → 1257304244 → 1257304246 → 1257304245 → 75768098 → 1013476044 → 1013476045 → 28623870` |
| `13567762` | [OSM relation 13567762](https://www.openstreetmap.org/relation/13567762) | v4 / `2024-11-13T14:39:51Z` / `159094401` | `1013471821 → 1013471822 → 1013471820 → 1013476038 → 1013471814 → 1013471813 → 1013476040 → 1013471815 → 1013471816 → 1013471817 → 1013471818 → 1013476041 → 111978123 → 1013476042 → 1013471808 → 1013476046 → 1013471806 → 989298434 → 989298433 → 1013476055 → 989298432 → 75768095 → 1257304244 → 1257304246 → 1257304245 → 75768098 → 1013476044 → 1013476045 → 28623870` |

### Topology replay summary

The audit checked ordered way endpoints and an undirected node graph from the full relation response. A join is counted
as a gap when no orientation of the adjacent way endpoints matches. Branch nodes have graph degree greater than two;
graph endpoints have degree one. These are topology observations, not product metrics.

| Relation | Way members / roles | Ordered endpoint gaps | Graph components | Branch nodes | Graph endpoints | Duplicate way refs |
|---:|---|---:|---:|---:|---:|---|
| `18970848` | 80 / all role-empty | 5 | 1 | 9 | 5 | `142032054`, `1376363970`, `137555287`, `64621384` |
| `19818868` | 64 / 63 role-empty + 1 `gate` | 15 | 4 | 17 | 7 | `225403836`, `479406146`, `1449871715` |
| `18970781` | 43 / all role-empty | 12 | 1 | 16 | 8 | `362866782`, `1376357818` |
| `13567761` | 29 / all role-empty | 1 | 1 | 1 | 3 | none |
| `13567762` | 29 / all role-empty | 1 | 1 | 1 | 3 | none |

The two Emei relations share the first 19 way members and the final seven members, but `13567761` uses
`1013471851 → 75768096` in its middle while `13567762` uses `1013476055 → 989298432 → 75768095`. This is an
identity distinction, not permission to merge or to assume that either branch is the currently permitted walk.

## Mode boundary and official access evidence

The OSM `route=hiking`/`route=foot` tag is a candidate identity only. For this audit, the mode ledger is:

- **Walking:** only a complete, connected, direction-reviewed set of footway/path members can support a walking
  variant. None of the five passes that gate; all walking metrics are `UNKNOWN`.
- **Cableway:** Huangshan Yungu/Yuping, Taishan Zhongtianmen/Taohuayuan and Emei Golden-Peak/Wannian cableways are
  separate transport alternatives. Sanqing cableway/ticketing status is excluded from verified evidence because its
  operator HTTPS source was not TLS-reproducible; no HTTP substitute was used. A cableway endpoint or ticket does not
  turn a walking relation into a cableway route.
- **Shuttle/road:** Huangshan south-gate/Ciguang/Yungu shuttle and Taishan Tianwai/Taohuayu/transfer-center buses,
  plus Emei sightseeing buses and scenic roads, are access transport. They are excluded from walking geometry and
  require separate operator evidence if ever modelled.

### Huangshan (`18970848`)

The [Huangshan Scenic Area Committee's 2026 Spring Festival notice](https://hsgwh.huangshan.gov.cn/xwzx/tzgg/9318819.html)
records general opening hours, a 15:00 walking-entry cutoff for that holiday window, strong-name reservation and
separate cableway hours. The [official transport page](https://hsgwh.huangshan.gov.cn/lyfw/lyfw/jqhc/9197913.html)
labels 慈光阁 as a walking entrance and lists the shuttle transfer to 云谷寺/慈光阁. A [2025-03 path notice](https://hsgwh.huangshan.gov.cn/xwzx/tzgg/9244616.html) explicitly reopened 云谷寺—白鹅岭 while temporarily
closing 慈光阁—玉屏楼 for maintenance. These facts distinguish entrances, walking paths, cableways and shuttle
roads, but no current route-level notice binds the full `云谷寺 → 慈光阁` OSM relation. Access for this exact
variant is `UNKNOWN`; the candidate is blocked.

### Taishan (`19818868`)

The [2026-04-29 Tai'an government holiday notice](https://gxq.taian.gov.cn/art/2026/4/29/art_350045_10332904.html)
describes the Hongmen walking line as an operating visitor route (about 9.5 km/7,863 steps) and separately lists
shuttle transfer and cableway options. It also states that 0:00–5:00 entry can close when the night quota is reached.
The [Tai Shan committee's Hongmen route page](https://tsgw.taian.gov.cn/art/2021/5/26/art_363479_10320188.html)
confirms the cultural route identity. These are current-area and route-description facts, not proof that the OSM
relation's four components and duplicate members are one complete permitted walk. Exact relation-level access remains
`UNKNOWN`; the candidate is blocked.

### Sanqing (`18970781`)

The operator's 2026 ticket/cableway HTTPS source was not TLS-reproducible during Review and is excluded from verified
primary evidence; HTTP is unsafe and was not used as a substitute. A [2026-08-11 secondary report](https://jx.ifeng.com/c/8vTp6otkYlK)
reproduces an operator/government reopening notice as context only, not positive route authority. The report could not
establish that the generic OSM relation maps to an open official walking section; access and mode boundary are `UNKNOWN`
and the candidate is blocked.

### Emei (`13567761`, `13567762`)

The [2026-05-22 Emei Scenic Area Committee notice](https://www.leshan.gov.cn/lsswszf/zzzqgsgg/808058894643269.html)
says the scenic area remains open while Golden Peak has a daily 8,000-person limit and reduced sightseeing-bus/
Golden-Peak-cableway capacity during works; it also describes forthcoming Qingyin Pavilion/Wannian Temple mid-mountain
tickets. A previously recorded 2025 Emei government route URL returned HTTP `404` during Review and is excluded from
the evidence set. The remaining primary source does not bind the exact OSM member sequences or certify either walking
branch. Both Emei rows remain distinct, walking-only candidates with access `UNKNOWN`; cableway, bus and road transport
are not substituted. Both are blocked.

## ODbL and source treatment

The relation pages are OpenStreetMap open-data sources. The [OSM copyright page](https://www.openstreetmap.org/copyright)
identifies the [Open Data Commons ODbL](https://opendatacommons.org/licenses/odbl/) and its attribution, notice and
share-alike obligations. This report stores durable relation links, tags, versions, member identifiers and topology
counts only. It does not copy nodes, coordinates, raw geometry, GPX/KML, contributor accounts or third-party track
exports. A future implementation Issue must decide the exact attribution and derived-database form before any runtime
projection; until then rights are `UNKNOWN` for promotion.

## Required next gate

No row may enter runtime route data from this report. A later controller-activated implementation Issue would need a
fresh, rate-limited OSM topology/mode audit; collision-safe identity and direction; explicit ODbL attribution/
derived-database treatment; and a current route-level first-party/operator opening or permit source for the exact
walking variant. Cableway, shuttle and road facts must remain separate. Until every core field is complete, all five
rows remain `BLOCKED_CANDIDATE` and do not count toward the 24 searchable `full` target.
