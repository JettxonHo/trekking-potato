const assert = require('node:assert/strict')
const { createTripBaseBuilder } = require('../../cloudfunctions/getAdvice/trip-base')

const IDS = [
  'variant:osm-16162196-sanganbi-shuizukeng',
  'variant:osm-20072118-die-butterfly-trail',
  'variant:osm-20046643-pinghui-wetland-trail',
  'variant:osm-20739620-zhaogongshan-loop',
  'variant:osm-17841828-three-gorges-summit',
  'variant:osm-18364943-menggu-sangberg',
  'variant:osm-18364941-black-stone-city-hike',
  'variant:osm-19684389-huizhou-dananshan-classic',
  'variant:osm-19686682-huizhou-dananshan-lahu',
  'variant:osm-20072078-maluanshan-nature-notes',
  'variant:osm-7060545-coloane-trail',
  'variant:osm-7060546-hac-sa-reservoir-family-trail',
  'variant:osm-7060560-hac-sa-reservoir-fitness-trail',
  'variant:osm-17147571-sha-tin-fotan-shing-mun',
  'variant:osm-17147573-sha-tin-wai-pass',
  'variant:osm-7065552-coloane-seac-min-pun',
  'variant:osm-17618981-kunpeng-section-4',
  'variant:osm-17719174-kunpeng-section-20',
  'variant:osm-18220700-meilin-country-trail',
  'variant:osm-18220701-tanglangshan-country-trail',
]

const EXPECTED = {
  'variant:osm-16162196-sanganbi-shuizukeng': { count: 897, first: [22.6624162, 114.4996587], last: [22.6977536, 114.4291095], aliases: ['三杆笔水祖坑徒步'], direction: 'point_to_point', startPoint: '三杆笔', endPoint: '水祖坑', relationVersion: 6, firstWay: ['775673080', 7], firstNode: ['11091229573', 1], duration: 6.66 },
  'variant:osm-20072118-die-butterfly-trail': { count: 138, first: [22.6399587, 114.3297848], last: [22.6578917, 114.3411226], aliases: ['深圳蝴蝶步道', '马峦山蝴蝶步道'], direction: 'point_to_point', startPoint: '朴树口', endPoint: '马峦山北门', relationVersion: 2, firstWay: ['1280449576', 1], firstNode: ['1531041784', 2], duration: 1.1 },
  'variant:osm-20046643-pinghui-wetland-trail': { count: 186, first: [22.7253741, 114.3954554], last: [22.7102382, 114.4006842], aliases: ['坪惠湿地公园步道', '坪山湿地步道'], direction: 'point_to_point', startPoint: '聚龙山湿地生态园北门', endPoint: '坪山湿地公园南门', relationVersion: 3, firstWay: ['1464139174', 1], firstNode: ['13430496177', 1], duration: 0.62 },
  'variant:osm-20739620-zhaogongshan-loop': { count: 211, first: [30.9639991, 103.5380078], last: [30.9639991, 103.5380078], aliases: ['赵公山东北徒步环线'], direction: 'loop', startPoint: '未命名环线起终点', endPoint: '未命名环线起终点', relationVersion: 1, firstWay: ['483583238', 7], firstNode: ['4689853814', 2], duration: 4.76 },
  'variant:osm-17841828-three-gorges-summit': { count: 413, first: [31.0412584, 109.574918], last: [31.0313051, 109.6254474], aliases: ['三峡之巅步道', '赤甲楼至三峡之巅'], direction: 'point_to_point', startPoint: '赤甲楼方向入口', endPoint: '三峡之巅', relationVersion: 1, firstWay: ['548313909', 5], firstNode: ['8200991706', 2], duration: 5.1 },
  'variant:osm-18364943-menggu-sangberg': { count: 124, first: [31.5895042, 102.7909033], last: [31.6322799, 102.7939707], aliases: ['猛古村至桑伯格徒步线路'], direction: 'point_to_point', startPoint: '猛古村', endPoint: '桑伯格', relationVersion: 1, firstWay: ['1299385594', 5], firstNode: ['12353587126', 1], duration: 3.9, checkedAt: '2026-08-23T13:54:36Z' },
  'variant:osm-18364941-black-stone-city-hike': { count: 93, first: [31.6330211, 102.8192944], last: [31.6317709, 102.7941201], aliases: ['黑石城徒步线路'], direction: 'point_to_point', startPoint: '桑丹四', endPoint: '桑伯格', relationVersion: 1, firstWay: ['1339771039', 1], firstNode: ['12292979149', 1], duration: 2.5, checkedAt: '2026-08-23T13:54:36Z' },
  'variant:osm-19684389-huizhou-dananshan-classic': { count: 254, first: [22.9197573, 114.8586983], last: [22.9200593, 114.8969306], aliases: ['大南山精华线'], direction: 'point_to_point', startPoint: '大王庙', endPoint: '龙岩寺路口', relationVersion: 2, firstWay: ['1435939573', 1], firstNode: ['1583698720', 1], duration: 4.95, checkedAt: '2026-08-23T13:54:36Z' },
  'variant:osm-19686682-huizhou-dananshan-lahu': { count: 678, first: [22.9508159, 114.9275011], last: [22.9507221, 114.927029], aliases: ['大南山拉胡线'], direction: 'point_to_point', startPoint: '惠东县多祝镇永和村', endPoint: '惠东县多祝镇百木洋', relationVersion: 3, firstWay: ['1436114865', 1], firstNode: ['12114395883', 1], duration: 6.63, checkedAt: '2026-08-23T13:54:36Z' },
  'variant:osm-20072078-maluanshan-nature-notes': { count: 94, first: [22.6450105, 114.3396273], last: [22.6560267, 114.3403834], aliases: ['马峦自然笔记步道'], direction: 'point_to_point', startPoint: '马峦山郊野公园北门', endPoint: '土地庙三岔口', relationVersion: 1, firstWay: ['135644191', 10], firstNode: ['1321557953', 3], duration: 0.48, checkedAt: '2026-08-23T13:54:36Z' },
  'variant:osm-7060545-coloane-trail': { count: 762, first: [22.1240825, 113.5672684], last: [22.1240825, 113.5672684], aliases: ['Coloane Trail', 'Trilho de Coloane'], direction: 'loop', startPoint: '路環高頂馬路', endPoint: '路環高頂馬路', relationVersion: 11, firstWay: ['827077156', 4], firstNode: ['2697520714', 4], duration: 2.8, checkedAt: '2026-08-23T15:16:11Z', mode: 'footway×4 + steps×2', region: '澳门' },
  'variant:osm-7060546-hac-sa-reservoir-family-trail': { count: 279, first: [22.1245616, 113.5715626], last: [22.1245616, 113.5715626], aliases: ['Hac Sá Reservoir Family Trail', 'Circuito da Barragem de Hác-Sá'], direction: 'loop', startPoint: '黑沙馬路', endPoint: '黑沙馬路', relationVersion: 10, firstWay: ['1049280410', 1], firstNode: ['1536076576', 2], duration: 0.98, checkedAt: '2026-08-23T15:16:19Z', mode: 'footway×13 + steps×4', region: '澳门' },
  'variant:osm-7060560-hac-sa-reservoir-fitness-trail': { count: 186, first: [22.1241242, 113.5711307], last: [22.1241242, 113.5711307], aliases: ['Hac Sá Reservoir Fitness Trail', 'Circuito de Manutenção da Barragem de Hác-Sá'], direction: 'loop', startPoint: '路環黑沙馬路', endPoint: '路環黑沙馬路', relationVersion: 7, firstWay: ['777711503', 2], firstNode: ['7236294685', 2], duration: 0.58, checkedAt: '2026-08-23T15:16:26Z', mode: 'footway×8 + steps×3', region: '澳门' },
  'variant:osm-17147571-sha-tin-fotan-shing-mun': { count: 259, first: [22.3911172, 114.1848842], last: [22.3948972, 114.1681653], aliases: ['港鐵火炭站至城門郊野公園郊野徑', 'MTR Fo Tan Station to Shing Mun Country Park country trail'], direction: 'point_to_point', startPoint: '港鐵火炭站 MTR Fo Tan Station', endPoint: '城門郊野公園 Shing Mun Country Park', relationVersion: 1, firstWay: ['185051734', 19], firstNode: ['1232304178', 3], duration: 0.98, checkedAt: '2026-08-23T15:16:33Z', mode: 'footway×8 + steps×4', region: '香港' },
  'variant:osm-17147573-sha-tin-wai-pass': { count: 159, first: [22.3689441, 114.1970221], last: [22.3562432, 114.1992747], aliases: ['沙田圍至沙田坳郊野徑', 'Sha Tin Wai to Sha Tin Pass country trail'], direction: 'point_to_point', startPoint: '沙田圍 Sha Tin Wai', endPoint: '沙田坳 Sha Tin Pass', relationVersion: 6, firstWay: ['185040571', 17], firstNode: ['1102085105', 5], duration: 0.77, checkedAt: '2026-08-23T15:16:41Z', mode: 'footway×6 + steps×1', region: '香港' },
  'variant:osm-7065552-coloane-seac-min-pun': { count: 118, first: [22.1175612, 113.5556786], last: [22.1172184, 113.5667588], aliases: ['Coloane Seac Min Pun Ancient Path', 'Caminho Antigo de Seac Min Pun de Coloane'], direction: 'point_to_point', startPoint: '路環黑沙馬路', endPoint: '路環竹灣馬路', relationVersion: 8, firstWay: ['1030267557', 1], firstNode: ['1941039429', 2], duration: 0.6, checkedAt: '2026-08-23T16:13:29Z', mode: 'footway×3 + steps×3 + residential×1', region: '澳门' },
  'variant:osm-17618981-kunpeng-section-4': { count: 285, first: [22.6398415, 113.9501072], last: [22.6337579, 113.9656341], aliases: ['Kunpeng Trail Section 4', '鲲鹏4段'], direction: 'point_to_point', startPoint: '阳台山麻磡二号登山口', endPoint: '阳台山王京坑登山口', relationVersion: 8, firstWay: ['1305347020', 2], firstNode: ['11313769053', 1], duration: 2.84, checkedAt: '2026-08-23T16:13:29Z', mode: 'path×6 + steps×4 + footway×8 + track×1 + unclassified×1', region: '广东省深圳市' },
  'variant:osm-17719174-kunpeng-section-20': { count: 140, first: [22.4986436, 114.5704975], last: [22.5207977, 114.5841795], aliases: ['Kunpeng Trail Section 20', '鲲鹏20段'], direction: 'point_to_point', startPoint: '东涌社区', endPoint: '大鹏山大雁顶', relationVersion: 3, firstWay: ['1077209491', 3], firstNode: ['9877056793', 1], duration: 2.42, checkedAt: '2026-08-23T16:13:29Z', mode: 'path×4', region: '广东省深圳市' },
  'variant:osm-18220700-meilin-country-trail': { count: 995, first: [22.5824958, 114.0110536], last: [22.5759136, 114.0531497], aliases: ['Meilin Mountain Trail'], direction: 'point_to_point', startPoint: '梅林水库涂鸦墙', endPoint: '梅坳', relationVersion: 1, firstWay: ['682267931', 7], firstNode: ['6389238287', 2], duration: 2.35, checkedAt: '2026-08-23T16:13:29Z', mode: 'path×4', region: '广东省深圳市' },
  'variant:osm-18220701-tanglangshan-country-trail': { count: 499, first: [22.5669281, 113.9772813], last: [22.5823293, 114.0110495], aliases: ['Tanglang Mountain Trail'], direction: 'point_to_point', startPoint: '塘朗山龙珠门', endPoint: '梅林水库涂鸦墙', relationVersion: 3, firstWay: ['553085838', 2], firstNode: ['5339279745', 1], duration: 3.69, checkedAt: '2026-08-23T16:13:29Z', mode: 'unclassified×3 + steps×6 + footway×1 + path×3', region: '广东省深圳市' },
}

function haversineKm(a, b) {
  const radiusM = 6371008.8
  const radians = (value) => value * Math.PI / 180
  const latDelta = radians(b.lat - a.lat)
  const lonDelta = radians(b.lon - a.lon)
  const sinLat = Math.sin(latDelta / 2)
  const sinLon = Math.sin(lonDelta / 2)
  const h = sinLat * sinLat + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * sinLon * sinLon
  return (radiusM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))) / 1000
}

function assertClose(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: ${actual} !== ${expected}`)
}

function assertFrozenGeometryShape(variant) {
  const expected = EXPECTED[variant.id]
  const geometry = variant.routeGeometry.points
  assert.equal(geometry.length, expected.count, `${variant.id} full geometry count must remain exact`)
  assert.deepEqual([geometry[0].lat, geometry[0].lon], expected.first, `${variant.id} start endpoint must remain exact`)
  assert.deepEqual([geometry[geometry.length - 1].lat, geometry[geometry.length - 1].lon], expected.last, `${variant.id} end endpoint must remain exact`)
  if (variant.isLoop) assert.deepEqual(geometry[0], geometry[geometry.length - 1], `${variant.id} loop must close`)
}

function assertFrozenIdentity(variant) {
  const expected = EXPECTED[variant.id]
  assert.deepEqual(variant.aliases, expected.aliases, `${variant.id} aliases must remain exact and collision-safe`)
  assert.equal(variant.direction, expected.direction, `${variant.id} direction must remain deterministic`)
  assert.equal(variant.startPoint, expected.startPoint, `${variant.id} start identity must remain exact`)
  assert.equal(variant.endPoint, expected.endPoint, `${variant.id} end identity must remain exact`)
}

function assertFrozenDuration(variant) {
  const expected = EXPECTED[variant.id]
  const derived = Math.round((variant.distanceKm / 4 + variant.ascentM / 600) * 100) / 100
  assert.equal(derived, expected.duration, `${variant.id} duration formula must remain distanceKm/4 + ascentM/600 with runtime rounding`)
  assert.equal(variant.stages[0].durationHours.min, derived, `${variant.id} minimum duration must use the deterministic formula`)
  assert.equal(variant.stages[0].durationHours.max, derived, `${variant.id} maximum duration must use the deterministic formula`)
}

function assertFrozenSourceTimestamp(variant, source) {
  const expected = EXPECTED[variant.id]
  if (!expected.checkedAt) return
  assert.equal(source.provenance.checkedAt, expected.checkedAt, `${variant.id} OSM checkedAt must remain the batch-completion timestamp`)
}

async function runOsmDerivedTests({ catalog }) {
  const variants = IDS.map((id) => catalog.getById(id))
  assert.equal(variants.filter(Boolean).length, IDS.length, '当前 OSM 衍生目录必须包含二十条可搜索 full variant')
  for (const variant of variants) {
    const expected = EXPECTED[variant.id]
    const geometry = variant.routeGeometry.points
    assertFrozenIdentity(variant)
    assertFrozenGeometryShape(variant)
    assertFrozenDuration(variant)
    let distance = 0
    let ascent = 0
    let descent = 0
    let highest = -Infinity
    for (let index = 0; index < geometry.length; index += 1) {
      highest = Math.max(highest, geometry[index].elevationM)
      if (index === 0) continue
      distance += haversineKm(geometry[index - 1], geometry[index])
      const delta = geometry[index].elevationM - geometry[index - 1].elevationM
      if (delta > 0) ascent += delta
      else descent -= delta
    }
    assert.equal(Math.floor(distance * 1000) / 1000, variant.distanceKm, `${variant.id} distance must be Haversine floor`)
    assertClose(ascent, variant.ascentM, `${variant.id} ascent must sum adjacent DEM deltas`)
    assertClose(descent, variant.descentM, `${variant.id} descent must sum adjacent DEM deltas`)
    assertClose(highest, variant.routeHighestPointElevationM, `${variant.id} highest elevation must be max DEM point`)
    assert.equal(variant.capability, 'full')
    assert.equal(variant.accessMode, 'walk')
    assert.equal(variant.operationalStatus, 'unknown')
    assert.equal(variant.routeGeometry.coordinateSystem, 'WGS84')
    assert.ok(variant.routeGeometry.points.length >= 2, 'full geometry must retain an ordered path')
    assert.ok(variant.routePreview.segments.every((segment) => segment.points.length >= 2))
    assert.ok(variant.routePreview.segments.reduce((sum, segment) => sum + segment.points.length, 0) <= 500)
    const previewPoints = variant.routePreview.segments.flatMap((segment) => segment.points)
    assert.deepEqual(previewPoints[0], { lat: expected.first[0], lon: expected.first[1] })
    assert.deepEqual(previewPoints[previewPoints.length - 1], { lat: expected.last[0], lon: expected.last[1] })
    const previewBounds = {
      minLat: Math.min(...previewPoints.map((point) => point.lat)),
      maxLat: Math.max(...previewPoints.map((point) => point.lat)),
      minLon: Math.min(...previewPoints.map((point) => point.lon)),
      maxLon: Math.max(...previewPoints.map((point) => point.lon)),
    }
    assert.deepEqual(variant.routePreview.bounds, previewBounds, `${variant.id} preview bounds must derive from preview projection`)
    const fullBounds = {
      minLat: Math.min(...geometry.map((point) => point.lat)),
      maxLat: Math.max(...geometry.map((point) => point.lat)),
      minLon: Math.min(...geometry.map((point) => point.lon)),
      maxLon: Math.max(...geometry.map((point) => point.lon)),
    }
    for (const [key, value] of Object.entries(fullBounds)) {
      assert.ok(key.startsWith('min') ? variant.routePreview.bounds[key] <= value : variant.routePreview.bounds[key] >= value, `${variant.id} preview bounds must enclose full geometry ${key}`)
    }
    assert.equal(variant.stages.length, 1)
    assert.equal(variant.stages[0].distanceKm, variant.distanceKm)
    assert.equal(variant.stages[0].ascentM, variant.ascentM)
    assert.equal(variant.stages[0].descentM, variant.descentM)
    const openDataSource = variant.sourceIds
      .map((sourceId) => catalog.getById(sourceId))
      .find((source) => source && source.kind === 'open_data')
    assert.ok(openDataSource, `${variant.id} must link an OSM open_data source`)
    assert.equal(openDataSource.license, 'ODbL-1.0')
    assert.match(openDataSource.attribution, /OpenStreetMap contributors/)
    assert.equal(openDataSource.provenance.provider, 'OpenStreetMap')
    assert.equal(openDataSource.provenance.snapshot, 'current-full')
    if (expected.mode) assert.match(openDataSource.derivation, new RegExp(expected.mode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    if (expected.region) {
      const place = catalog.getById(variant.routeId && catalog.getById(variant.routeId).placeId)
      assert.equal(place.region, expected.region, `${variant.id} region must preserve the frozen non-mainland region`)
    }
    assert.equal(openDataSource.provenance.relationVersion, expected.relationVersion, `${variant.id} relation version must remain exact`)
    assert.deepEqual(
      [openDataSource.provenance.wayVersions[0].id, openDataSource.provenance.wayVersions[0].version],
      expected.firstWay,
      `${variant.id} first way version must remain exact`,
    )
    assert.deepEqual(
      [openDataSource.provenance.nodeVersions[0].id, openDataSource.provenance.nodeVersions[0].version],
      expected.firstNode,
      `${variant.id} first node version must remain exact`,
    )
    assert.ok(openDataSource.provenance.relationVersion > 0)
    assert.ok(openDataSource.provenance.wayVersions.length > 0)
    assert.ok(openDataSource.provenance.nodeVersions.length > 0)
    assert.match(openDataSource.provenance.checkedAt, /Z$/)
    assertFrozenSourceTimestamp(variant, openDataSource)
    if (variant.id === 'variant:osm-20046643-pinghui-wetland-trail') {
      assert.equal(
        variant.sourceIds.some((sourceId) => {
          const source = catalog.getById(sourceId)
          return source && source.kind === 'official'
        }),
        false,
        '20046643 contextual park page must not claim the exact route as an official source',
      )
    }
    if (variant.id === 'variant:osm-20072118-die-butterfly-trail') {
      assert.equal(
        variant.sourceIds.some((sourceId) => {
          const source = catalog.getById(sourceId)
          return source && source.kind === 'official'
        }),
        false,
        '20072118 contextual planning PDF must not claim the exact relation as an official source',
      )
    }
    if (variant.id === 'variant:osm-16162196-sanganbi-shuizukeng') {
      const officialSource = variant.sourceIds
        .map((sourceId) => catalog.getById(sourceId))
        .find((source) => source && source.kind === 'official')
      assert.ok(officialSource, '16162196 must retain its official planning identity source')
      assert.equal(officialSource.title, '深圳市绿道网（“鹏城万里”多层次户外步道体系）专项规划（2024–2035年）')
      assert.equal(officialSource.publisher, '深圳市城市管理和综合执法局、深圳市规划和自然资源局')
      assert.deepEqual(
        officialSource.supports
          .filter((support) => support.entityId === variant.id)
          .map((support) => support.field)
          .sort(),
        ['canonicalName', 'endPoint', 'startPoint'],
        '16162196 official source must retain only direct variant identity/direction supports',
      )
    }
    const openDataFields = new Set(openDataSource.supports
      .filter((support) => support.entityId === variant.id)
      .map((support) => support.field))
    assert.equal(openDataFields.has('ascentM'), false, 'OSM must not claim elevation metrics')
    assert.equal(openDataFields.has('descentM'), false, 'OSM must not claim elevation metrics')
    assert.equal(openDataFields.has('routeHighestPointElevationM'), false, 'OSM must not claim DEM maxima')
    assert.equal(openDataFields.has('weatherSamplePoints'), false, 'OSM must not claim DEM samples')
    assert.equal(openDataFields.has('operationalStatus'), false, 'OSM must not claim opening status')
    const expectedOsmIdentityFields = variant.id === 'variant:osm-20739620-zhaogongshan-loop'
      ? ['direction', 'isLoop', 'accessMode']
        : variant.id === 'variant:osm-17841828-three-gorges-summit'
        ? ['isLoop', 'accessMode']
        : ['direction', 'startPoint', 'endPoint', 'isLoop', 'accessMode']
    for (const field of expectedOsmIdentityFields) {
      assert.equal(openDataFields.has(field), true, `${variant.id} OSM source must support ${field} without official overclaim`)
    }
    assert.match(variant.operationalStatusRationale, /unknown/)
    const elevationSource = variant.sourceIds
      .map((sourceId) => catalog.getById(sourceId))
      .find((source) => source && source.kind === 'trusted_api')
    assert.ok(elevationSource, `${variant.id} must link the trusted elevation source`)
    assert.match(elevationSource.publisher, /Copernicus DEM GLO-90/)
    const elevationFields = new Set(elevationSource.supports
      .filter((support) => support.entityId === variant.id)
      .map((support) => support.field))
    assert.equal(elevationFields.has('ascentM'), true)
    assert.equal(elevationFields.has('descentM'), true)
    assert.equal(elevationFields.has('routeHighestPointElevationM'), true)
    assert.equal(elevationFields.has('weatherSamplePoints'), true)
    assert.equal(elevationFields.has('routeGeometry'), true, 'trusted elevation source must claim only the elevation component joined into routeGeometry')
  }

  assert.equal(catalog.getById(IDS[0]).distanceKm, 17.088, '16162196 must use complete relation distance floor')
  assert.equal(catalog.getById(IDS[3]).direction, 'loop')
  assert.equal(catalog.getById(IDS[3]).isLoop, true)
  const zhaogongSource = catalog.getById(catalog.getById(IDS[3]).sourceIds
    .find((sourceId) => sourceId.startsWith('source:osm-')))
  assert.match(zhaogongSource.derivation, /residential/)

  const zhaogongAliasMutation = { ...variants[3], aliases: ['赵公山环线'] }
  assert.throws(() => assertFrozenIdentity(zhaogongAliasMutation), undefined, 'broad Zhao Gong Shan alias mutation must turn the identity contract RED')
  const zhaogongStartMutation = { ...variants[3], startPoint: '赵公山东北环线起点' }
  assert.throws(() => assertFrozenIdentity(zhaogongStartMutation), undefined, 'fabricated Zhao Gong Shan endpoint mutation must turn the identity contract RED')
  const sanganbiAliasMutation = { ...variants[0], aliases: ['三杆笔水祖坑徒步', '三杆笔—水祖坑主线'] }
  assert.throws(() => assertFrozenIdentity(sanganbiAliasMutation), undefined, 'truncated mainline alias mutation must turn the identity contract RED')
  const finalBatchIds = [
    'variant:osm-7065552-coloane-seac-min-pun',
    'variant:osm-17618981-kunpeng-section-4',
    'variant:osm-17719174-kunpeng-section-20',
    'variant:osm-18220700-meilin-country-trail',
    'variant:osm-18220701-tanglangshan-country-trail',
  ]
  for (const finalBatchId of finalBatchIds) {
    const finalBatchVariant = variants.find((variant) => variant.id === finalBatchId)
    const omittedAlias = { ...finalBatchVariant, aliases: finalBatchVariant.aliases.slice(0, -1) }
    assert.throws(() => assertFrozenIdentity(omittedAlias), undefined, `${finalBatchId} alias omission must turn the identity contract RED`)
    const changedAlias = { ...finalBatchVariant, aliases: finalBatchVariant.aliases.map((alias, index) => index === 0 ? `${alias} (mutated)` : alias) }
    assert.throws(() => assertFrozenIdentity(changedAlias), undefined, `${finalBatchId} alias change must turn the identity contract RED`)
  }

  const truncated = { ...variants[0], routeGeometry: { ...variants[0].routeGeometry, points: variants[0].routeGeometry.points.slice(0, -1) } }
  assert.throws(() => assertFrozenGeometryShape(truncated), undefined, 'removing 16162196 final detour point must turn the frozen geometry contract RED')
  const offset = { ...variants[0], routeGeometry: { ...variants[0].routeGeometry, points: variants[0].routeGeometry.points.map((point, index) => index === 0 ? { ...point, lat: point.lat + 0.001 } : point) } }
  assert.throws(() => assertFrozenGeometryShape(offset), undefined, 'offsetting a frozen endpoint must turn the geometry contract RED')
  const durationMutation = { ...variants[1], stages: [{ ...variants[1].stages[0], durationHours: { min: 1.11, max: 1.11 } }] }
  assert.throws(() => assertFrozenDuration(durationMutation), undefined, 'mutating duration must turn the deterministic formula contract RED')
  const timestampVariant = variants.find((variant) => EXPECTED[variant.id].checkedAt)
  const timestampSource = timestampVariant.sourceIds
    .map((sourceId) => catalog.getById(sourceId))
    .find((source) => source && source.kind === 'open_data')
  const timestampMutation = { ...timestampSource, provenance: { ...timestampSource.provenance, checkedAt: '2026-08-23T13:49:01Z' } }
  assert.throws(
    () => assertFrozenSourceTimestamp(timestampVariant, timestampMutation),
    undefined,
    'mutating the full-source checkedAt must turn the source provenance contract RED',
  )
  const finalBatchRequestStarts = ['16:10:38Z', '16:11:00Z', '16:12:53Z', '16:13:17Z', '16:13:28Z']
  for (const [index, finalBatchId] of finalBatchIds.entries()) {
    const finalBatchVariant = variants.find((variant) => variant.id === finalBatchId)
    const finalBatchSource = finalBatchVariant.sourceIds
      .map((sourceId) => catalog.getById(sourceId))
      .find((source) => source && source.kind === 'open_data')
    const staleStartMutation = {
      ...finalBatchSource,
      provenance: { ...finalBatchSource.provenance, checkedAt: `2026-08-23T${finalBatchRequestStarts[index]}` },
    }
    assert.throws(
      () => assertFrozenSourceTimestamp(finalBatchVariant, staleStartMutation),
      undefined,
      `${finalBatchId} pre-completion request-start timestamp must turn the source provenance contract RED`,
    )
  }

  const poisonVariant = variants[0]
  const route = catalog.getById(poisonVariant.routeId)
  const place = catalog.getById(route.placeId)
  const builder = createTripBaseBuilder({
    fetchRouteWeather: async () => ({ ok: false, error: 'offline', retryable: true }),
    resolveRouteSourceSummaries: (sourceIds) => sourceIds.map((sourceId) => {
      const source = catalog.getById(sourceId)
      return { id: source.id, tier: source.tier, kind: source.kind, title: source.title, publisher: source.publisher, url: source.url, checkedAt: source.checkedAt }
    }),
    now: () => new Date('2026-08-23T00:00:00.000Z'),
  })
  const built = await builder.build({
    target: { entityKind: 'route_variant', capability: 'full', routeVariant: { ...poisonVariant, routeGeometry: { poison: 'must not cross seam' } }, route, place, routeType: 'trek' },
    request: { date: '2026-08-24', startTimeLocal: '08:00', level: '中级' },
  })
  assert.equal(built.kind, 'built')
  assert.equal(Object.hasOwn(built.trustedBaseData.routeSnapshot, 'routeGeometry'), false, 'trip-base must not expose internal routeGeometry')
}

module.exports = { runOsmDerivedTests }
