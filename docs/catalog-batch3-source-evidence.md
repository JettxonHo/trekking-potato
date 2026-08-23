# C15-E / Issue #163 — Batch 3 source evidence (Phase 1 + Phase 2)

Status: `PHASE2_RUNTIME_IMPLEMENTATION_READY_FOR_CONTROLLER_REVIEW` (runtime slice complete; controller review pending).

The Phase 1 portion of this report records one bounded discovery pass for the third five-route batch. That
docs-only checkpoint did not create route data, elevation samples, geometry fragments, tests, schema changes or a
public-release claim; it is historical and is superseded by the controller-authorized Phase 2 implementation
checkpoint below. Current reconciled truth is `full=20`, remaining gap `5` toward the 25-slot ledger: the five
frozen identities now have runtime fragments, bounded elevation provenance and contract-test coverage.

## Phase 1 scope and guardrails (historical; superseded by Phase 2 below)

- Controller authorization was Issue [#163](https://github.com/JettxonHo/trekking-potato/issues/163) on branch
  `codex/163-catalog-batch3-5` from `main@f393c0028625dc2deff0f26544cbf65f85f23038`.
- The one metadata request was a single Overpass query against the China ISO area, selecting only
  `type=route`, `route=hiking` relations with nonempty `name`, `from` and `to` tags. The request used the identifying
  User-Agent `trekking-potato/163-batch3-evidence (OSM primary-source audit)`. The response was HTTP 200 with 111
  tagged relations; local exclusion of the 55 previously searchable/audited relation IDs left 74 new metadata rows.
  No second Overpass request, mirror, Overpass fallback or broad web search was used.
- The first 20 locally selected IDs were read once each from the OSM current-full endpoint, sequentially with at least
  six seconds between request starts. Every response was HTTP 200; no 429/throttle occurred, so the pass completed at
  the twenty-read ceiling. Bodies were held ephemerally for aggregate analysis only and no raw nodes, coordinates or
  geometry were copied into the repository.
- The exclusion set is the 55 unique IDs recorded in the prior batch reports: ten runtime OSM variants, five Yubeng
  rows, five scenic rows, nine first/fresh #161 rows, fifteen #161 replacement rows and eleven #159 reject/replacement
  rows. The exact IDs are listed in the exclusion ledger below.

## Aggregate gate

For each full response I derived only relation identity/tags, relation version/timestamp, way-member and graph-node
counts, connected components, branch/end-point counts, cycle rank (`E − V + C`), adjacent member-order gaps,
duplicate way references, orientability of the member chain and highway-mode counts. A route=hiking relation supplies
the user walking mode. `path`, `footway`, `steps`, `ladder`, `pedestrian` and `bridleway` are walking members;
`track`, `tertiary`, `unclassified`, `residential` and `service` are retained as disclosed road/track boundaries;
primary/secondary/trunk roads, cycleways, ferries, cableways, shuttles, vehicle-only members and unknown modes block.
Promotion also requires collision-safe identity and a deterministic direction: a closed graph must be explicit, while
an open chain must have exactly two endpoints and distinct named `from`/`to` tags.

| ID / identity | relation | topology/order aggregate | modes | verdict |
|---|---|---|---|---|
| `7060545` 路環步行徑 Trilho de Coloane | v11 · 6 ways / 761 graph nodes | C1/B0/E0, cycleRank 1, gaps 0, duplicate 0, orientable (reverse); `from=路環高頂馬路`, `to=路環高頂馬路` | footway×4, steps×2 | **`PROPOSED_FOR_CONTROLLER_FREEZE`** — explicit connected closed loop |
| `7060546` 黑沙水庫家樂徑 Circuito da Barragem de Hác-Sá | v10 · 17 / 278 | C1/B0/E0, cycleRank 1, gaps 0, duplicate 0, orientable (reverse); `from=黑沙馬路`, `to=黑沙馬路` | footway×13, steps×4 | **`PROPOSED_FOR_CONTROLLER_FREEZE`** — explicit connected closed loop |
| `7060560` 黑沙水庫健康徑 Circuito de Manutenção da Barragem de Hác-Sá | v7 · 11 / 185 | C1/B0/E0, cycleRank 1, gaps 0, duplicate 0, orientable (forward); `from=路環黑沙馬路`, `to=路環黑沙馬路` | footway×8, steps×3 | **`PROPOSED_FOR_CONTROLLER_FREEZE`** — explicit connected closed loop |
| `7060604` 九澳高頂家樂徑 Trilho do Altinho de Ká-Hó | v7 · 4 / 120 | C1/B1/E1, cycleRank 1, gaps 1, duplicate 0, not orientable | footway×3, steps×1 | `BLOCKED_CANDIDATE` — branch, dangling endpoint and order gap |
| `7060614` 九澳水庫環湖徑 Circuito da Barragem de Ká Hó | v4 · 4 / 159 | C2/B0/E4, cycleRank 0, gaps 1, duplicate 0, not orientable | footway×4 | `BLOCKED_CANDIDATE` — disconnected graph and order gap |
| `7060808` 黑沙龍爪角家樂徑 Trilho do Morro de Hác-Sá | v2 · 1 / 264 | C1/B0/E2, cycleRank 0, gaps 0, duplicate 0, orientable (forward); `from=黑沙兵房路`, `to=黑沙兵房路` | footway×1 | `HELD_OUT_DIRECTION_IDENTITY` — same endpoint labels on an open chain do not establish a deterministic direction |
| `7060809` 黑沙龍爪角海岸徑 Trilho à Beira-Mar de Long Chao Kok | v4 · 4 / 121 | C1/B1/E3, cycleRank 0, gaps 1, duplicate 0, not orientable | footway×3, steps×1 | `BLOCKED_CANDIDATE` — branch, three endpoints and order gap |
| `7060967` 大潭山步行徑 Trilho da Taipa Grande | v7 · 22 / 245 | C1/B4/E1, cycleRank 3, gaps 2, duplicate 0, not orientable | steps×11, footway×11 | `BLOCKED_CANDIDATE` — branched multi-cycle graph and order gaps |
| `11216261` 青衣自然徑 Tsing Yi Nature Trails | v9 · 61 / 428 | C1/B11/E6, cycleRank 4, gaps 6, duplicate 0, not orientable | footway×38, steps×23 | `BLOCKED_CANDIDATE` — branches, six endpoints, cycles and order gaps |
| `11311824` 路環健康徑 Circuito de Manutenção de Coloane | v3 · 7 / 94 | C1/B0/E2, cycleRank 0, gaps 0, duplicate 0, orientable (forward); `from=路環高頂馬路`, `to=路環高頂馬路` | footway×4, steps×3 | `HELD_OUT_DIRECTION_IDENTITY` — same-label open chain; no deterministic direction despite clean graph |
| `11311825` 金像步行徑 Trilho do Óscar | v3 · 4 / 128 | C1/B1/E1, cycleRank 1, gaps 0, duplicate 0, orientable (forward) | steps×2, footway×2 | `BLOCKED_CANDIDATE` — branch and dangling endpoint |
| `11816203` 鳳凰徑第十段 Lantau Trail Section 10 | v5 · 16 / 402 | C1/B0/E2, cycleRank 0, gaps 0, duplicate 0, orientable (reverse); `水口 Shui Hau → 東涌道 Tung Chung Road` | footway×1, unclassified×11, service×4 | `ELIGIBLE_ALTERNATE_NOT_SELECTED` — topology/direction pass; disclosed unclassified/service walking-road members |
| `11894162` （旧）中部郊野径（梅林徒步线） | v22 · 34 / 1,324 | C1/B0/E2, cycleRank 0, gaps 0, duplicate 0, orientable (forward); explicit endpoints | unclassified×4, steps×7, footway×6, path×17 | `HELD_OUT_STALE_IDENTITY` — relation name explicitly marks a former route |
| `14021391` 印洲塘郊遊徑 Double Haven Country Trail | v13 · 47 / 1,547 | C1/B1/E3, cycleRank 0, gaps 3, duplicate 0, not orientable | footway×45, steps×1, path×1 | `BLOCKED_CANDIDATE` — branch, three endpoints and order gaps |
| `17147569` 沙田郊野徑 Sha Tin Country Trail | v6 · 12 / 251 | C2/B0/E4, cycleRank 0, gaps 2, duplicate 0, not orientable | tertiary×4, unclassified×2, service×2, footway×4 | `BLOCKED_CANDIDATE` — disconnected graph and order gaps |
| `17147570` 沙田郊野徑 Sha Tin Country Trail | v2 · 18 / 470 | C1/B0/E2, cycleRank 0, gaps 0, duplicate 0, orientable (reverse); `排頭街 Pai Tau Street → 城門郊野公園 Shing Mun Country Park` | footway×10, steps×6, unclassified×1, service×1 | `ELIGIBLE_ALTERNATE_NOT_SELECTED` — topology/direction pass; disclosed unclassified/service members |
| `17147571` 沙田郊野徑 Sha Tin Country Trail | v1 · 12 / 259 | C1/B0/E2, cycleRank 0, gaps 0, duplicate 0, orientable (reverse); `港鐵火炭站 MTR Fo Tan Station → 城門郊野公園 Shing Mun Country Park` | footway×8, steps×4 | **`PROPOSED_FOR_CONTROLLER_FREEZE`** — distinct endpoint identity and pure walking members |
| `17147572` 沙田郊野徑 Sha Tin Country Trail | v3 · 27 / 325 | C1/B0/E2, cycleRank 0, gaps 0, duplicate 0, orientable (forward); `梅子林路 Mui Tsz Lam Road → 小瀝源 Siu Lek Yuen` | footway×17, steps×10 | `ELIGIBLE_ALTERNATE_NOT_SELECTED` — topology/direction pass; same family kept as alternate |
| `17147573` 沙田郊野徑 Sha Tin Country Trail | v6 · 7 / 159 | C1/B0/E2, cycleRank 0, gaps 0, duplicate 0, orientable (reverse); `沙田圍 Sha Tin Wai → 沙田坳 Sha Tin Pass` | footway×6, steps×1 | **`PROPOSED_FOR_CONTROLLER_FREEZE`** — distinct endpoint identity and pure walking members |
| `17147574` 沙田郊野徑 Sha Tin Country Trail | v2 · 8 / 34 | C1/B0/E2, cycleRank 0, gaps 0, duplicate 0, orientable (forward); `沙田頭新村 Sha Tin Tau New Village → 望夫石 Amah Rock` | footway×6, steps×2 | `ELIGIBLE_ALTERNATE_NOT_SELECTED` — topology/direction pass; same family kept as alternate |

The selected five are therefore exactly `7060545`, `7060546`, `7060560`, `17147571` and `17147573`. The four
`ELIGIBLE_ALTERNATE_NOT_SELECTED` rows remain evidence only and are not counted. The two same-label open chains are
not proposed because a graph that is not closed cannot use identical `from`/`to` labels as a deterministic direction.

## Selected identity and reproducible sources

| relation | deterministic identity | current-full observation | primary source |
|---|---|---|---|
| `7060545` | 路環步行徑 Trilho de Coloane · `路環高頂馬路 → 路環高頂馬路` · closed loop | v11, `2025-01-13T06:08:15Z`, changeset `161296407` | [relation](https://www.openstreetmap.org/relation/7060545) · [current full](https://api.openstreetmap.org/api/0.6/relation/7060545/full.json) |
| `7060546` | 黑沙水庫家樂徑 Circuito da Barragem de Hác-Sá · `黑沙馬路 → 黑沙馬路` · closed loop | v10, `2025-01-13T06:08:15Z`, changeset `161296407` | [relation](https://www.openstreetmap.org/relation/7060546) · [current full](https://api.openstreetmap.org/api/0.6/relation/7060546/full.json) |
| `7060560` | 黑沙水庫健康徑 Circuito de Manutenção da Barragem de Hác-Sá · `路環黑沙馬路 → 路環黑沙馬路` · closed loop | v7, `2025-01-13T06:08:15Z`, changeset `161296407` | [relation](https://www.openstreetmap.org/relation/7060560) · [current full](https://api.openstreetmap.org/api/0.6/relation/7060560/full.json) |
| `17147571` | 沙田郊野徑 Sha Tin Country Trail · `港鐵火炭站 MTR Fo Tan Station → 城門郊野公園 Shing Mun Country Park` | v1, `2024-02-04T11:09:00Z`, changeset `147049133` | [relation](https://www.openstreetmap.org/relation/17147571) · [current full](https://api.openstreetmap.org/api/0.6/relation/17147571/full.json) |
| `17147573` | 沙田郊野徑 Sha Tin Country Trail · `沙田圍 Sha Tin Wai → 沙田坳 Sha Tin Pass` | v6, `2024-02-19T13:51:27Z`, changeset `147651401` | [relation](https://www.openstreetmap.org/relation/17147573) · [current full](https://api.openstreetmap.org/api/0.6/relation/17147573/full.json) |

These are OSM/open-data observations, not official opening or safety evidence. The selected rows keep
`operationalStatus=unknown`; current operator permission, route-specific closure status, access restrictions and
derived-database treatment remain controller gates. Any later runtime representation must carry ODbL-1.0 treatment and
visible adjacent attribution to [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), and must repeat
the exact relation/way/node provenance audit before implementation.

## Exclusion ledger (55 prior IDs)

`16162196`, `20072118`, `20046643`, `20739620`, `17841828`, `18364943`, `18364941`, `19684389`, `19686682`,
`20072078`; `19700005`, `19700028`, `19700031`, `19700036`, `19700085`; `18970848`, `19818868`, `18970781`,
`13567761`, `13567762`; `10548040`, `12390533`, `12390888`, `18731549`, `18731550`, `18952585`, `19017834`,
`20737376`, `20739619`; `12338590`, `18908973`, `19505439`, `20072066`, `20078357`, `20084108`, `20084551`,
`12389867`, `12390304`, `17822607`, `17584113`, `20045601`, `18624640`, `18624653`, `18157384`; `12390841`,
`20072034`, `20045604`, `20045602`, `20072101`, `20068997`, `20069017`, `20069060`, `15852438`, `12336480`,
`19908413`.

## Phase 1 handoff (historical checkpoint; superseded by Phase 2 below)

At this checkpoint the bounded pass produced exactly five proposed identities and no counted routes. The historical
snapshot was searchable `full=15`, remaining gap `10`, with Wutai separate and non-counting; no runtime, test,
schema, elevation, CloudBase, deployment, commit, push or PR action was taken during Phase 1. The controller then
froze these identities in comments `5386726512`/`5386727268` and authorized Phase 2. Phase 2 has since generated
the five runtime fragments, one bounded elevation request per route and focused contract coverage; current truth is
searchable `full=20`, remaining gap `5`. **`READY_FOR_CONTROLLER_REVIEW` (historical Phase 1 handoff; superseded below).**

## Phase 2 runtime implementation checkpoint (controller freeze 5386726512 / correction 5386727268)

The frozen five were implemented from one current-full OSM relation read each (HTTP 200; no throttle/retry) and one bounded Open-Meteo elevation request each. Complete relation geometry is retained for catalog audit; runtime node manifests are bounded first/last 32 while complete manifests are recorded in `docs/route-data-licenses.md`. Public trip/result DTOs omit internal `routeGeometry` and expose only the <=500-point `routePreview`.

| Relation / variant | Region | Full points (unique graph) | Direction / endpoints | Distance km | Ascent / descent / highest m | Duration h | Elevation samples | OSM checkedAt | Mode disclosure |
|---|---|---:|---|---:|---:|---:|---:|---|---|
| 7060545-coloane-trail | 澳门 | 762 (761) | loop 路環高頂馬路 → 路環高頂馬路 | 7.432 | 568 / 568 / 148 | 2.80 | 100/same response | 2026-08-23T15:16:11Z | footway×4 + steps×2 |
| 7060546-hac-sa-reservoir-family-trail | 澳门 | 279 (278) | loop 黑沙馬路 → 黑沙馬路 | 2.721 | 177 / 177 / 132 | 0.98 | 99/same response | 2026-08-23T15:16:19Z | footway×13 + steps×4 |
| 7060560-hac-sa-reservoir-fitness-trail | 澳门 | 186 (185) | loop 路環黑沙馬路 → 路環黑沙馬路 | 1.546 | 114 / 114 / 100 | 0.58 | 97/same response | 2026-08-23T15:16:26Z | footway×8 + steps×3 |
| 17147571-sha-tin-fotan-shing-mun | 香港 | 259 (259) | point_to_point 港鐵火炭站 MTR Fo Tan Station → 城門郊野公園 Shing Mun Country Park | 2.008 | 285 / 127 / 427 | 0.98 | 99/same response | 2026-08-23T15:16:33Z | footway×8 + steps×4 |
| 17147573-sha-tin-wai-pass | 香港 | 159 (159) | point_to_point 沙田圍 Sha Tin Wai → 沙田坳 Sha Tin Pass | 1.621 | 218 / 13 / 302 | 0.77 | 88/same response | 2026-08-23T15:16:41Z | footway×6 + steps×1 |

All five variants keep `operationalStatus=unknown` with a route-specific rationale; no opening or safety status is inferred from OSM geometry. OSM source cards are `open_data`/ODbL-1.0 with visible OpenStreetMap attribution and support only identity, walking topology, geometry, route preview and deterministic structural fields. Open-Meteo/Copernicus DEM GLO-90 is a separate shared trusted source for elevation metrics and weather sample points; checkedAt is `2026-08-23T15:18:56.109Z`.

Production catalog checkpoint: searchable full variants `20` (prior 15 + this five), blocked Wutai restriction remains separate/non-counting, remaining gap `5` toward the 25-slot ledger. Resolver tests assert both Sha Tin endpoint-qualified aliases resolve directly while bare `沙田郊野徑` remains confirmation. Focused route-domain/data/resolver/result tests pass; full gates are pending controller review.

**`READY_FOR_CONTROLLER_REVIEW`** — no commit, push, PR, deployment or CloudBase action.
