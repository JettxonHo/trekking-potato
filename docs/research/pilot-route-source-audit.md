# 五条试点路线来源审计（规划证据）

- Scope: `TP-BETA-001` M3，I08–I12 / GitHub #17–#21
- Checked at: `2026-08-06`
- Status: planning evidence only; **不是已验证的产品数据，且不授权写入路线目录**。

## 1. 判定方法

本报告按 `docs/architecture.md` 的 `Source.supports[]` 语义整理证据。`direct` 表示来源直接
陈述字段；`derived` 只记录可重复的转换或产品分类，并不提高来源等级。只有 A/B 来源覆盖 full
`RouteVariant` 的全部核心字段（名称、天数、完整 stages、全程距离、累计升降、路线最高点、1–3
天气点、运营状态）时，Issue 才能 `READY`。无法证实的值保持未知，不能以相邻路线、附近峰顶或
营销材料补齐。

| Issue | 结论 | 原因 |
|---|---|---|
| I08 / #17 武功山 | `BLOCKED` | 官方有精确一日行程，但缺全程距离、累计升降、该版本时长及低海拔采样点。 |
| I09 / #18 四姑娘山二峰 | `BLOCKED` | 官方确有海子沟专业七日版，但日程量化、当前具体开放范围、坐标与海拔资料不足且二峰高度相互矛盾。 |
| I10 / #19 五台山 | parent `BLOCKED`；I10a `SOURCE_EVIDENCE_READY / CONTRACT_PENDING`；I10b full 变体 `BLOCKED` | 小朝台 full 变体缺当前通行、坐标、高程、时长和完整返程；官方公告标题足以让 I10a 仅声明“截至核验日禁止台顶徒步”，但规划 PR 合并前仍不授权实现。 |
| I11 / #20 玉龙雪山 | `BLOCKED` | 交通与 4680m 终点充分佐证，但栈道距离、步行升降、完整 stage 与采样点缺失。 |
| I12 / #21 贡嘎 | `BLOCKED` | 官方赛事给出三日距离及累计升降，但为 2017 历史活动；缺逐日升降/时长、采样点和当前通行状态。 |

## 2. I08 — 武功山金顶登山揽胜一日线

### 一手来源

| Publisher | Tier / kind | 直达链接 | direct 证据 |
|---|---|---|---|
| 萍乡武功山景区 | A / official | [登山揽胜一日游](https://www.wugongshan.cn/page/strategyList%21info.htm?id=1068) | 官方名称；游客服务中心起终的 1 日混合索道/徒步线路；石鼓寺、中庵索道、紫极宫、好汉坡、星空栈道、吊马桩、金顶、金顶索道、许愿桥、猴谷、尽心桥等点序。 |
| 萍乡武功山景区 | A / official | [景区首页](https://www.wugongshan.cn/index.htm) | 景区位于江西萍乡；官网游客服务中心地址。 |
| 萍乡武功山景区 | A / official | [金顶资料](https://www.wugongshan.cn/page/strategyList%21info.htm?id=1311) | 金顶/白鹤峰海拔 `1918.3m`。 |
| 萍乡武功山景区 | A / official | [索道说明](https://www.wugongshan.cn/page/strategyList%21info.htm?id=1208) | 中庵、金顶两段索道的存在与中间步行关系。 |
| 萍乡武功山景区 | A / official | [一日徒步游](https://www.wugongshan.cn/page/strategyList%21info.htm?id=104) | 另一条一日线路的 7 小时往返说明；**不是本条混合线路的时长证据**。 |
| 高德地图 | A / trusted_api | [金顶观景平台 POI](https://www.amap.com/place/B0KR5UV83H)；[坐标系说明](https://lbs.amap.com/faq/advisory/others/39838) | 金顶 `27.452098,114.178584`，高德坐标系为 `GCJ-02`。 |

### 字段判定

| 字段 | 结论 | 方法 |
|---|---|---|
| `Route.canonicalName` | `武功山登山揽胜一日游` | direct，官方标题。项目名“武功山金顶登山揽胜一日线”只能作为 product alias。 |
| `routeType` | `trek` | derived，官方明确登山/徒步段；`accessMode` 必须保留 mixed。 |
| `fixedDays`、起终点、`direction`、`isLoop` | `1`、游客服务中心起终、`loop`、`true` | direct/derived，官方同一线路起终相同。 |
| `stages[0]` 点序与 `accessMode` | 如上官方点序；`mixed` | direct/derived。 |
| `routeHighestPointElevationM` | `1918.3` | direct：该路线实际到达金顶，且官方给出金顶高度；不是以附近峰顶代替。 |
| 金顶天气点 | 该坐标、`GCJ-02`、`1918.3m` | direct：高德坐标 + 官方高度。 |
| `operationalStatus` | `unknown` | 官方售票/索道资料表明设施存在，但非查询当日的通行承诺。 |

**未知与冲突：** 全日 `distanceKm`、`ascentM`、`descentM`、该线路 `durationHours`、石鼓寺实际
步道入口坐标/高度和额外天气采样点均未找到。不得将官方另一线路的 7 小时，或任何单段/峰顶高度
移植进此变体。

**最小解阻路径：** 取得景区/政府提供的本路线导览图、高程剖面或可下载原始轨迹；或取得与官方点序
一致、可由 Sol 审阅的 GPX。它必须覆盖全程里程、累计升降、分段时长与至少一个有坐标及海拔的低/中
海拔采样点。

## 3. I09 — 四姑娘山二峰·海子沟专业登山线

### 一手来源

| Publisher | Tier / kind | 直达链接 | direct 证据 |
|---|---|---|---|
| 四姑娘山景区官网 | A / official | [海子沟](https://www.sgns.cn/understand/hzg) | 海子沟全长 `19.2km`、沟口在四姑娘山镇；可宿营，是攀登大/二峰的必经地；户外活动须报备。该 19.2km 是沟长，不是二峰七日全程。 |
| 四姑娘山景区官网 | A / official | [专业登山路线—海子沟](https://www.sgns.cn/outdoors/mountaineering) | 官方 7 日参考行程：D1 四姑娘山镇→老牛院子→毛狗洞设营；D2–D6 攀登二姑娘山及附近山峰；D7 返回。页面称二姑娘山 `5276m`，并说明可徒步或骑马至营地。 |
| 四姑娘山景区官网 | A / official（历史资料） | [专业化线路](https://www.sgns.cn/info/weichat/463-2015-04-21-02-11-48) | 旧版海子沟专业线路页也记载七日结构，但称二姑娘山 `5454m`；与当前官方资料冲突，不能作为路线最高点。 |
| 四姑娘山景区官网 | A / official | [二峰推荐行程](https://www.sgns.cn/play/line) | **不同的两日版本**：D1 `16km/约7h` 至二峰大本营，D2 `30km/约14h` 登顶后返镇；页面称二峰 `5276m`。不能与七日版混用。 |
| 四姑娘山景区官网 | A / official | [2026-04-07 联合公告](https://www.sgns.cn/info/notice/6463-2026-04-07-02-15-19) | 自 2026-04-10 起海子沟“部分”户外徒步、登山线路恢复；仍可能动态关闭，且未点名二峰七日线。 |
| 阿坝州人民政府 | A / government | [海子沟部分户外线路恢复](https://www.abazhou.gov.cn/abazhou/c101955/202604/a5ea16709bc94f44ac20950848ac3bf8.shtml) | 交叉佐证“部分”线路恢复；年度封闭区域/时段动态划定，赛事区域会暂停户外手续。 |

### 字段判定

| 字段 | 结论 | 方法 |
|---|---|---|
| `Route.canonicalName` | `四姑娘山二峰·海子沟专业登山线` | derived，项目名；官网原文为“专业登山路线—海子沟”。 |
| `routeType`、`fixedDays` | `climb`、`7` | derived/direct，官方“攀登”且 D1–D7 明示。 |
| 初步 stage | D1 老牛园子→毛狗洞营地；D2–D6 攀登；D7 返回 | direct，但不足以成为具有距离、升降、时长和天气点的 schema stage。 |
| `operationalStatus` | `unknown` | 只确认“部分线路”恢复，未确认该线。 |

**冲突与未知：** 同一官方站点给出二峰 `5454m`（七日页）和 `5276m`（两日页），所以不能填
路线最高点。官方没有给七日版每日距离、升降、时长、各日营地/返回点的完整路线，也没有可用天气点
坐标与海拔；“登二峰及附近山峰”也不等同于仅二峰的固定变体。

**最小解阻路径：** 取得 2026 仍有效、明确只覆盖二峰的官方 7 日行程/登山许可材料，包含日程、营地、
报备/向导要求和当前开放范围；再取得权威高程/坐标资料或经 Sol 审阅的同一路线 GPX。应先由官方纠正
或确认二峰高度，才可填路线最高点。官方仅“建议聘请专业登山领队”的材料不能被提升为该精确变体的
强制向导规则。

## 4. I10 — 黛螺顶小朝台·大智路 + 五台山大朝台禁行

### 一手来源

| Publisher | Tier / kind | 直达链接 | direct 证据 |
|---|---|---|---|
| 五台山风景名胜区管理委员会 | A / official | [黛螺顶资料](https://www.wtsykfwzx.com/ztzl_show.aspx?id=84) | 黛螺顶即“小朝台”；大智路通向黛螺顶，`508m`、`1080` 级台阶；亲登五座台顶称“大朝台”。 |
| 五台山风景名胜区管理委员会 | A / official | [全域禁止台顶徒步公告](https://www.wtsykfwzx.com/tzzn_show.aspx?id=1129) | 标题明确“全域禁止台顶徒步”，发布时间 `2026-07-31 15:15:42`。网页正文未返回，因此只能支持标题本身的狭义限制，不能外推路线、日期或例外。 |

### 字段判定

| 记录/字段 | 结论 | 方法 |
|---|---|---|
| 小朝台名称、`accessMode` | `黛螺顶小朝台·大智路`、`walk` | derived/direct。 |
| 小朝台起终点、距离 | 大智路入口→黛螺顶，`0.508km` | derived/direct。返程未证实。 |
| 小朝台 `fixedDays=1`、`direction=point_to_point` | 仅项目推定 | 不足以掩盖缺失的时长、升降、坐标和路线最高点。 |
| 大朝台 blocked 名称、状态 | `五台山大朝台禁行记录`、`blocked` | derived/direct：官方定义大朝台且公告禁止台顶徒步。 |
| restriction | `reason/scope=全域禁止台顶徒步`；`effectiveFrom=null`；`effectiveTo=null` | direct/derived；发布时间只是 Source 元数据，不推导生效日；`null` 不是永久禁行声明。 |

**未知与最小解阻：** 小朝台缺当前大智路通行状态、起终点坐标/高程、累计升降、最高点、时长和天气点；
故 I10b full 记录 `BLOCKED`。按 TP-D022，I10a 可独立实现严格限定在公告标题的 tier A
blocked 记录：`restriction.scope` 只写“台顶徒步”，不得有任何 full itinerary 字段，
`effectiveFrom/effectiveTo` 均为 `null`，`sourceCheckedAt=2026-08-06`。未取得正文/海报时不得
把限制扩大为具体古道、山间野路、起止日期或例外规则。

## 5. I11 — 玉龙雪山冰川公园 4680 观景线

### 来源

| Publisher | Tier / kind | 直达链接 | direct 证据 |
|---|---|---|---|
| 丽江玉龙旅游股份有限公司 | A / official | [2025 年年报](https://static.cninfo.com.cn/finalpage/2026-03-24/1225026384.PDF) | 运营冰川公园索道；下站 `3356m`、上站 `4506m`、长度 `2968m`、垂直高差 `1150m`；冰川公园在主峰东坡。 |
| 丽江市融媒体中心转载《中国旅游报》 | B / reliable_secondary | [4680 游客路径报道](https://www.lijiang.cn/article/149215.html) | 游客先到 `4506m`，再沿坡道步行至 `4680m`；`4680m` 是游客可到最高点；有风时索道可临时停运。 |
| 玉龙雪山管委会（新华网发布） | A / government | [2026 暑期服务](https://www.yn.xinhuanet.com/20260724/3a75b512868a480bb9221d103aa6de1f/c.html) | 2026-07-24 的上站服务，确认 `4506m` 冰川公园索道上站近期仍在服务。 |
| 玉龙雪山管委会（新华网发布） | A / government | [2026 五一服务](https://www.yn.xinhuanet.com/20260502/443201592bd54c4ca834366569cda5df/c.html) | `3356m` 下站至 `4680m` 观景台的服务覆盖；不是栈道距离/升降数据。 |
| 丽江网 | A / official relay | [2026-07-13 索道预约通知](https://www.lijiang.cn/news/travel/article/176690.html) | 冰川公园索道在该日期有预约运行安排。 |
| 玉龙雪山省级自然保护区管护局 / 《云南林业》 | A / government | [《云南林业》页面](https://lcj.yn.gov.cn/lyzz/2026/202601/files/basic-html/page78.html) | 管护局文章列玉龙雪山主峰 `5590.2m`；与其他官方材料中的 `5596m` 不影响 `4680m` 为本路线最高游客点的判断。 |

### 字段判定

| 字段 | 结论 | 方法 |
|---|---|---|
| 名称、类型 | `玉龙雪山冰川公园 4680 观景线`、`tour` | derived，组合官方景点/游客终点与项目固定分类。 |
| `accessMode` | `mixed` | direct：索道至 4506m、坡道步行至 4680m。 |
| `routeHighestPointElevationM` | `4680` | direct；绝不使用主峰高度。 |
| `nearbyPeakElevationM` | `null` | 主峰材料存在 `5596m` 与其他官方资料的 `5590.2m` 冲突，且都非路线最高点。 |
| 索道段 | `2.968km`，`3356m → 4506m`，高差 `1150m` | direct；只属于交通段，不能作为完整 mixed route 距离或爬升。 |
| 4506→4680 高程差 | `174m` | derived 的端点相减；不等于完整 `ascentM`。 |
| `operationalStatus` | `unknown` | 存在近期运营证据，但索道受天气临时调整，无法作静态当日开放承诺。 |

**未知与最小解阻：** TP-D023 已冻结 `mixed` 路线指标为完整行程几何；仍需取得
运营方的 4506–4680 栈道长度、上下行预计时长、坐标和高程资料，或取得两份可靠独立测绘/
经审阅 GPX；当天再用官方渠道核验索道与平台状态。此前不得创建 full variant。

## 6. I12 — 环贡嘎·全国徒步大会三日精华线

### 一手来源

| Publisher | Tier / kind | 直达链接 | direct 证据 |
|---|---|---|---|
| 国家体育总局 / 中国体育报 | A / government | [2017 徒步中国·全国徒步大会贡嘎山站](https://www.sport.gov.cn/n20001280/n20745751/n20767277/c21369944/content.html) | 官方主办/承办背景；D1 四马塘停车场→巴王海→魏石达→下子梅村 `16km`；D2 下子梅营地往返贡嘎寺 `13km`；D3 下子梅→上子梅→盘山路→子梅垭口→上木居 `22.1km`；总 `51.3km`、累计上升 `3390m`、下降 `2491m`。 |
| 康定市人民政府 | A / government | [2026 旅游线路](https://www.kangding.gov.cn/kdlyxl/article/107031) | 当前政府旅游目录提及贡嘎寺、巴望海等其他徒步/观光线路；不确认 2017 赛事的同一路线开放。 |

### 字段判定

| 字段 | 结论 | 方法 |
|---|---|---|
| 名称、类型、天数 | `环贡嘎·全国徒步大会三日精华线`、`trek`、`3` | 名称/类型 derived；三日 direct。应注明其为 2017 赛事版本。 |
| `stages` 起终点和距离 | 16 / 13 / 22.1km，点序如上 | direct。D2 是下子梅往返贡嘎寺。 |
| `distanceKm`、`ascentM`、`descentM` | `51.3`、`3390`、`2491` | direct 的赛事全程合计。 |
| `direction` | `point_to_point` | derived，首日四马塘、终日上木居不相同。 |
| `operationalStatus` | `unknown` | 2017 赛事页面不是 2026 通行许可。 |

**未知与最小解阻：** 没有每日升降、每日时长、路线最高点、准确天气点/坐标/高度，也没有当前赛事路线的
开放状态或许可要求。应取得康定/景区/自然保护管理方的当前通行确认，及相同点序的官方高程资料或经 Sol
审阅 GPX；然后才能把赛事数据提升为 current full variant。

## 7. 共通实施约束

1. 该审计不允许任何 Issue 以 C 级或“看起来合理”的数值生成 verified/full 记录。
2. 不得把地图、索道或相邻线路的数据错当成完整地面路线数据；尤其 I08 的其他一日线、I09 的两日线、
   I11 的索道段和 I12 的历史赛事。
3. `operationalStatus='unknown'` 是诚实的静态目录状态；实时限制属于后续查询时的官方状态核验，不能由
   静态来源表假装解决。
4. I10a 大朝台是当前唯一 `SOURCE_EVIDENCE_READY`、但仍为 `CONTRACT_PENDING` 的路线数据子任务；规划 PR 合并前不授权实现。它必须遵守 blocked schema，不得附加距离、
   行程、海拔或天气采样字段。
