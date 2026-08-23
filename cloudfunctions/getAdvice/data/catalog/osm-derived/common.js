const ELEVATION_SOURCE_ID = 'source:trusted-api-open-meteo-copernicus-glo90'

function points(rows) {
  return rows.map(([lat, lon, elevationM]) => ({ lat, lon, elevationM }))
}

function previewPoints(rows) {
  return rows.map(([lat, lon]) => ({ lat, lon }))
}

function versions(rows) {
  return rows.map(([id, version]) => ({ id: String(id), version }))
}

function osmStructuralSupports(variantId) {
  return [
    { entityId: variantId, field: 'fixedDays', method: 'derived', note: 'One-day classification is deterministic from the connected relation path.' },
    { entityId: variantId, field: 'stages', method: 'derived', note: 'Single ordered stage is derived from relation endpoints and geometry.' },
    { entityId: variantId, field: 'distanceKm', method: 'derived', note: 'Haversine distance over the ordered WGS84 relation geometry.' },
  ]
}

function makeOsmSource({
  sourceId,
  placeId,
  routeId,
  variantId,
  relationId,
  relationVersion,
  wayVersions,
  nodeVersions,
  checkedAt,
  canonicalName,
  extraNote,
  osmSupports = [],
}) {
  return {
    id: sourceId,
    tier: 'B',
    kind: 'open_data',
    title: `OpenStreetMap relation ${relationId} current-full route evidence`,
    publisher: 'OpenStreetMap contributors',
    url: `https://www.openstreetmap.org/relation/${relationId}`,
    checkedAt: checkedAt.slice(0, 10),
    license: 'ODbL-1.0',
    attribution: '© OpenStreetMap contributors',
    derivation: extraNote || 'Ordered walking geometry is derived from the complete current-full relation; no immutable-full claim is made.',
    provenance: {
      provider: 'OpenStreetMap',
      relationId: String(relationId),
      relationVersion,
      wayVersions: versions(wayVersions),
      nodeVersions: versions(nodeVersions),
      snapshot: 'current-full',
      checkedAt,
    },
    supports: [
      { entityId: placeId, field: 'canonicalName', method: 'direct' },
      { entityId: routeId, field: 'canonicalName', method: 'direct' },
      { entityId: variantId, field: 'canonicalName', method: 'direct' },
      ...osmSupports.map((field) => ({
        entityId: variantId,
        field,
        method: 'derived',
        note: 'Derived from the OSM relation tags and walking-member topology.',
      })),
      ...osmStructuralSupports(variantId),
      { entityId: variantId, field: 'routeGeometry', method: 'derived', note: 'OSM supplies ordered WGS84 coordinates; elevationM is joined from the trusted DEM source.' },
      { entityId: variantId, field: 'routePreview', method: 'derived', note: 'Bounded WGS84 preview projected from the full relation geometry.' },
    ],
  }
}

function makeOfficialSource({ sourceId, title, publisher, url, checkedAt, placeId, routeId, variantId, fields }) {
  return {
    id: sourceId,
    tier: 'A',
    kind: 'official',
    title,
    publisher,
    url,
    checkedAt,
    supports: [
      { entityId: placeId, field: 'canonicalName', method: 'direct' },
      { entityId: routeId, field: 'canonicalName', method: 'direct' },
      ...fields.map((field) => ({ entityId: variantId, field, method: 'direct' })),
    ],
  }
}

function makeFragment({
  slug,
  relationId,
  canonicalName,
  aliases,
  region,
  placeKind = 'trail_area',
  referenceCoordinate,
  direction,
  startPoint,
  endPoint,
  isLoop,
  distanceKm,
  ascentM,
  descentM,
  highestM,
  duration,
  routeGeometry,
  routePreview,
  weatherSamples,
  relationVersion,
  wayVersions,
  nodeVersions,
  checkedAt,
  official = null,
  summary,
  extraNote,
  osmSupports = [],
}) {
  const placeId = `place:osm-${slug}`
  const routeId = `route:osm-${slug}`
  const variantId = `variant:osm-${slug}`
  const osmSourceId = `source:osm-${slug}`
  const osmSource = makeOsmSource({
    sourceId: osmSourceId,
    placeId,
    routeId,
    variantId,
    relationId,
    relationVersion,
    wayVersions,
    nodeVersions,
    checkedAt,
    canonicalName,
    extraNote,
    osmSupports,
  })
  const officialSource = official
    ? makeOfficialSource({
      sourceId: official.id,
      title: official.title,
      publisher: official.publisher,
      url: official.url,
      checkedAt: official.checkedAt,
      placeId,
      routeId,
      variantId,
      fields: official.fields,
    })
    : null
  const identitySourceIds = [osmSourceId, ...(officialSource ? [officialSource.id] : [])]
  const sourceIds = [...identitySourceIds, ELEVATION_SOURCE_ID]
  return {
    sources: [osmSource, ...(officialSource ? [officialSource] : [])],
    places: [{
      entityKind: 'place',
      capability: 'place_only',
      id: placeId,
      canonicalName,
      aliases,
      region,
      kind: placeKind,
      referenceCoordinate: { ...referenceCoordinate, coordinateSystem: 'WGS84' },
      sourceStatus: 'verified',
      sourceIds: identitySourceIds,
    }],
    routes: [{
      entityKind: 'route',
      id: routeId,
      placeId,
      canonicalName,
      aliases,
      routeType: 'trek',
      summary,
      sourceIds: identitySourceIds,
    }],
    variants: [{
      entityKind: 'route_variant',
      recordStatus: 'verified',
      capability: 'full',
      id: variantId,
      routeId,
      canonicalName,
      aliases,
      direction,
      startPoint,
      endPoint,
      isLoop,
      fixedDays: 1,
      stages: [{
        day: 1,
        startPoint,
        endPoint,
        distanceKm,
        ascentM,
        descentM,
        durationHours: { min: duration, max: duration },
        weatherSamplePointIds: weatherSamples.map((sample) => sample.id),
      }],
      distanceKm,
      ascentM,
      descentM,
      routeHighestPointElevationM: highestM,
      nearbyPeakElevationM: null,
      weatherSamplePoints: weatherSamples,
      accessMode: 'walk',
      operationalStatus: 'unknown',
      operationalStatusRationale: 'Current opening evidence is not verified; status remains unknown and no opening is inferred from route geometry.',
      verificationLevel: 'B',
      sourceIds,
      sourceCheckedAt: checkedAt.slice(0, 10),
      routeGeometry,
      routePreview,
    }],
  }
}

function makeElevationSource({ variantIds, checkedAt }) {
  return {
    id: ELEVATION_SOURCE_ID,
    tier: 'A',
    kind: 'trusted_api',
    title: 'Open-Meteo Elevation API — Copernicus DEM GLO-90',
    publisher: 'Open-Meteo / Copernicus DEM GLO-90',
    url: 'https://open-meteo.com/en/docs/elevation-api',
    checkedAt: checkedAt.slice(0, 10),
    attribution: 'Elevation: Open-Meteo Elevation API · Copernicus DEM GLO-90.',
    derivation: 'For each relation, cumulative-distance-equal sampling selected at most 100 WGS84 points including first and last; one request returned the same point count. Elevations were linearly interpolated along the ordered OSM geometry; ascent/descent/highest are deterministic sums/maxima.',
    supports: variantIds.flatMap((entityId) => [
      { entityId, field: 'ascentM', method: 'derived', note: 'Copernicus DEM GLO-90 samples via Open-Meteo.' },
      { entityId, field: 'descentM', method: 'derived', note: 'Copernicus DEM GLO-90 samples via Open-Meteo.' },
      { entityId, field: 'routeHighestPointElevationM', method: 'derived', note: 'Copernicus DEM GLO-90 samples via Open-Meteo.' },
      { entityId, field: 'weatherSamplePoints', method: 'derived', note: 'Copernicus DEM GLO-90 samples via Open-Meteo.' },
      { entityId, field: 'routeGeometry', method: 'derived', note: 'Open-Meteo supplies the elevationM component; OSM remains authoritative for ordered coordinates.' },
    ]),
  }
}

module.exports = {
  ELEVATION_SOURCE_ID,
  makeElevationSource,
  makeFragment,
  points,
  previewPoints,
}
