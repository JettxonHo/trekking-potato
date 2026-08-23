/**
 * I07 static route-domain catalog.
 *
 * This module intentionally has no query or I/O API. I08–I12 can use it to
 * validate sourced records, while I13 remains responsible for production
 * search and resolver integration.
 */
const SOURCE_TIERS = new Set(['A', 'B', 'C'])
const SOURCE_KINDS = new Set([
  'official',
  'government',
  'association',
  'trusted_api',
  'open_data',
  'reviewed_gpx',
  'reviewed_track',
  'reliable_secondary',
  'user_input',
  'legacy_unknown',
])
const PLACE_KINDS = new Set(['mountain', 'scenic_area', 'trail_area', 'cultural_site', 'unknown'])
const ROUTE_TYPES = new Set(['trek', 'climb', 'tour'])
const COORDINATE_SYSTEMS = new Set(['GCJ-02', 'WGS84'])
const DIRECTIONS = new Set(['loop', 'out_and_back', 'point_to_point'])
const ACCESS_MODES = new Set(['walk', 'scenic_transport', 'mixed'])
const FULL_STATUSES = new Set(['open', 'unknown'])
const ROUTE_PREVIEW_KEYS = new Set(['coordinateSystem', 'bounds', 'segments'])
const ROUTE_PREVIEW_POINT_KEYS = new Set(['lat', 'lon'])
const ROUTE_PREVIEW_BOUND_KEYS = new Set(['minLat', 'maxLat', 'minLon', 'maxLon'])
const ROUTE_GEOMETRY_KEYS = new Set(['coordinateSystem', 'points'])
const ROUTE_GEOMETRY_POINT_KEYS = new Set(['lat', 'lon', 'elevationM'])
const OSM_PROVENANCE_KEYS = new Set(['provider', 'relationId', 'relationVersion', 'wayVersions', 'nodeVersions', 'snapshot', 'checkedAt'])
const OSM_VERSION_KEYS = new Set(['id', 'version'])
const MAX_ROUTE_PREVIEW_SEGMENTS = 7
const MAX_ROUTE_PREVIEW_POINTS = 500
const MAX_ROUTE_GEOMETRY_POINTS = 10000
const FULL_EVIDENCE_FIELDS = [
  'canonicalName',
  'fixedDays',
  'stages',
  'distanceKm',
  'ascentM',
  'descentM',
  'routeHighestPointElevationM',
  'weatherSamplePoints',
  'operationalStatus',
]
const BLOCKED_FORBIDDEN_FIELDS = [
  'direction',
  'startPoint',
  'endPoint',
  'isLoop',
  'fixedDays',
  'stages',
  'distanceKm',
  'ascentM',
  'descentM',
  'routeHighestPointElevationM',
  'nearbyPeakElevationM',
  'weatherSamplePoints',
  'accessMode',
  'routePreview',
]

class RouteCatalogValidationError extends Error {
  constructor(issues) {
    super('Invalid route catalog')
    this.name = 'RouteCatalogValidationError'
    this.code = 'invalid_route_catalog'
    this.issues = issues
  }
}

function createRouteCatalog({ legacyRecords = [], sources = [], places = [], routes = [], variants = [] } = {}) {
  const issues = []
  const normalizedSources = normalizeCollection(sources, 'sources', normalizeSource, issues)
  const normalizedPlaces = [
    ...normalizeLegacyRecords(legacyRecords, issues),
    ...normalizeCollection(places, 'places', normalizePlace, issues),
  ]
  const normalizedRoutes = normalizeCollection(routes, 'routes', normalizeRoute, issues)
  const normalizedVariants = normalizeCollection(variants, 'variants', normalizeVariant, issues)

  const entityEntries = [
    ...normalizedSources.map((source, index) => ({ value: source, path: `sources[${index}].id`, namespace: 'source:' })),
    ...normalizedPlaces.map((place, index) => ({ value: place, path: place._path || `places[${index}].id`, namespace: 'place:' })),
    ...normalizedRoutes.map((route, index) => ({ value: route, path: `routes[${index}].id`, namespace: 'route:' })),
    ...normalizedVariants.map((variant, index) => ({ value: variant, path: `variants[${index}].id`, namespace: 'variant:' })),
  ]
  const allById = validateIds(entityEntries, issues)
  const sourceById = new Map(normalizedSources.map((source) => [source.id, source]))
  const placeById = new Map(normalizedPlaces.map((place) => [place.id, place]))
  const routeById = new Map(normalizedRoutes.map((route) => [route.id, route]))

  validateEntitySources(normalizedPlaces, 'places', sourceById, issues)
  validateEntitySources(normalizedRoutes, 'routes', sourceById, issues)
  validateEntitySources(normalizedVariants, 'variants', sourceById, issues)
  validateRoutes(normalizedRoutes, placeById, issues)
  validateVariants(normalizedVariants, routeById, sourceById, issues)
  validateSourceClaims(normalizedSources, allById, normalizedPlaces, normalizedRoutes, normalizedVariants, issues)

  if (issues.length > 0) throw new RouteCatalogValidationError(issues)

  for (const entity of [...normalizedSources, ...normalizedPlaces, ...normalizedRoutes, ...normalizedVariants]) {
    delete entity._path
  }
  const catalogById = new Map([
    ...normalizedSources,
    ...normalizedPlaces,
    ...normalizedRoutes,
    ...normalizedVariants,
  ].map((entity) => [entity.id, entity]))

  return {
    sources: normalizedSources,
    places: normalizedPlaces,
    routes: normalizedRoutes,
    variants: normalizedVariants,
    getById(id) {
      return catalogById.get(id) || null
    },
  }
}

function normalizeCollection(value, name, normalizer, issues) {
  if (!Array.isArray(value)) {
    addIssue(issues, 'invalid_type', name)
    return []
  }
  return value.map((entry, index) => normalizer(entry, `${name}[${index}]`, issues))
}

function normalizeLegacyRecords(value, issues) {
  if (!Array.isArray(value)) {
    addIssue(issues, 'invalid_type', 'legacyRecords')
    return []
  }
  return value.map((record, index) => normalizeLegacyPlace(record, `legacyRecords[${index}]`, issues))
}

function normalizeSource(source, path, issues) {
  const value = objectOrEmpty(source, path, issues)
  const supports = Array.isArray(value.supports)
    ? value.supports.map((support, index) => normalizeSupport(support, `${path}.supports[${index}]`, issues))
    : invalidArray(value.supports, `${path}.supports`, issues)

  const normalized = {
    id: validateId(value.id, 'source:', `${path}.id`, issues),
    tier: validateEnum(value.tier, SOURCE_TIERS, `${path}.tier`, issues),
    kind: validateEnum(value.kind, SOURCE_KINDS, `${path}.kind`, issues),
    title: validateText(value.title, `${path}.title`, issues),
    publisher: validateText(value.publisher, `${path}.publisher`, issues),
    url: validateNullableUrl(value.url, `${path}.url`, issues),
    checkedAt: validateDate(value.checkedAt, `${path}.checkedAt`, issues),
    supports,
    _path: path,
  }
  if (value.license !== undefined) normalized.license = validateText(value.license, `${path}.license`, issues)
  if (value.attribution !== undefined) normalized.attribution = validateText(value.attribution, `${path}.attribution`, issues)
  if (value.derivation !== undefined) normalized.derivation = validateText(value.derivation, `${path}.derivation`, issues)
  if (value.provenance !== undefined) normalized.provenance = normalizeOsmProvenance(value.provenance, `${path}.provenance`, issues)
  if (value.kind === 'open_data') {
    if (normalized.license !== 'ODbL-1.0') addIssue(issues, 'missing_required', `${path}.license`)
    if (!normalized.attribution) addIssue(issues, 'missing_required', `${path}.attribution`)
    if (!normalized.provenance) addIssue(issues, 'missing_required', `${path}.provenance`)
  }
  return normalized
}

function normalizeOsmProvenance(value, path, issues) {
  const provenance = objectOrEmpty(value, path, issues)
  rejectUnknownKeys(provenance, OSM_PROVENANCE_KEYS, path, issues)
  return {
    provider: validateExact(provenance.provider, 'OpenStreetMap', `${path}.provider`, issues),
    relationId: validateText(provenance.relationId, `${path}.relationId`, issues),
    relationVersion: validatePositiveInteger(provenance.relationVersion, `${path}.relationVersion`, issues),
    wayVersions: normalizeVersionManifest(provenance.wayVersions, `${path}.wayVersions`, issues),
    nodeVersions: normalizeVersionManifest(provenance.nodeVersions, `${path}.nodeVersions`, issues),
    snapshot: validateExact(provenance.snapshot, 'current-full', `${path}.snapshot`, issues),
    checkedAt: validateTimestamp(provenance.checkedAt, `${path}.checkedAt`, issues),
  }
}

function normalizeVersionManifest(value, path, issues) {
  if (!Array.isArray(value)) return invalidArray(value, path, issues)
  if (value.length === 0) addIssue(issues, 'invalid_value', path)
  const ids = new Set()
  return value.map((entry, index) => {
    const entryPath = `${path}[${index}]`
    const manifest = objectOrEmpty(entry, entryPath, issues)
    rejectUnknownKeys(manifest, OSM_VERSION_KEYS, entryPath, issues)
    const id = validateText(manifest.id, `${entryPath}.id`, issues)
    if (ids.has(id)) addIssue(issues, 'duplicate_id', `${entryPath}.id`)
    ids.add(id)
    return { id, version: validatePositiveInteger(manifest.version, `${entryPath}.version`, issues) }
  })
}

function normalizeSupport(support, path, issues) {
  const value = objectOrEmpty(support, path, issues)
  const method = validateEnum(value.method, new Set(['direct', 'derived']), `${path}.method`, issues)
  const normalized = {
    entityId: validateText(value.entityId, `${path}.entityId`, issues),
    field: validateText(value.field, `${path}.field`, issues),
    method,
  }
  if (method === 'derived') {
    normalized.note = validateText(value.note, `${path}.note`, issues)
  } else if (value.note !== undefined) {
    normalized.note = validateText(value.note, `${path}.note`, issues)
  }
  return normalized
}

function normalizePlace(place, path, issues) {
  const value = objectOrEmpty(place, path, issues)
  const canonicalName = validateText(value.canonicalName, `${path}.canonicalName`, issues)
  const aliases = normalizeAliases(value.aliases, `${path}.aliases`, issues)
  validateAliasesAgainstCanonicalName(aliases, canonicalName, `${path}.aliases`, issues)
  const normalized = {
    entityKind: validateExact(value.entityKind, 'place', `${path}.entityKind`, issues),
    capability: validateExact(value.capability, 'place_only', `${path}.capability`, issues),
    id: validateId(value.id, 'place:', `${path}.id`, issues),
    canonicalName,
    aliases,
    region: validateText(value.region, `${path}.region`, issues),
    kind: validateEnum(value.kind, PLACE_KINDS, `${path}.kind`, issues),
    referenceCoordinate: normalizeCoordinate(value.referenceCoordinate, `${path}.referenceCoordinate`, issues),
    sourceStatus: validateEnum(value.sourceStatus, new Set(['verified', 'unverified', 'legacy_unverified']), `${path}.sourceStatus`, issues),
    sourceIds: normalizeIdArray(value.sourceIds, `${path}.sourceIds`, issues),
    _path: path,
  }
  if (value.activityTypeHint !== undefined || value.legacyCandidateId !== undefined) {
    addIssue(issues, 'forbidden_field', `${path}.${value.activityTypeHint !== undefined ? 'activityTypeHint' : 'legacyCandidateId'}`)
  }
  if (value.routePreview !== undefined) addIssue(issues, 'forbidden_field', `${path}.routePreview`)
  return normalized
}

function normalizeLegacyPlace(record, path, issues) {
  const value = objectOrEmpty(record, path, issues)
  const canonicalName = legacyText(value.name, `${path}.name`, issues)
  const aliases = normalizeLegacyAliases(value.aliases, canonicalName, `${path}.aliases`, issues)
  const activityTypeHint = ROUTE_TYPES.has(value.type) ? value.type : undefined
  const normalized = {
    entityKind: 'place',
    capability: 'place_only',
    id: `place:legacy:${canonicalName}`,
    canonicalName,
    aliases,
    region: legacyText(value.location, `${path}.location`, issues),
    kind: 'unknown',
    referenceCoordinate: {
      lat: validateCoordinateNumber(value.lat, -90, 90, `${path}.lat`, issues),
      lon: validateCoordinateNumber(value.lon, -180, 180, `${path}.lon`, issues),
      coordinateSystem: 'GCJ-02',
    },
    sourceStatus: 'legacy_unverified',
    sourceIds: [],
    legacyCandidateId: `builtin-route:${canonicalName}`,
    _path: `${path}.id`,
  }
  if (activityTypeHint) normalized.activityTypeHint = activityTypeHint
  return normalized
}

function normalizeRoute(route, path, issues) {
  const value = objectOrEmpty(route, path, issues)
  const canonicalName = validateText(value.canonicalName, `${path}.canonicalName`, issues)
  const aliases = normalizeAliases(value.aliases, `${path}.aliases`, issues)
  validateAliasesAgainstCanonicalName(aliases, canonicalName, `${path}.aliases`, issues)
  if (value.routePreview !== undefined) addIssue(issues, 'forbidden_field', `${path}.routePreview`)
  return {
    entityKind: validateExact(value.entityKind, 'route', `${path}.entityKind`, issues),
    id: validateId(value.id, 'route:', `${path}.id`, issues),
    placeId: validateId(value.placeId, 'place:', `${path}.placeId`, issues),
    canonicalName,
    aliases,
    routeType: validateEnum(value.routeType, ROUTE_TYPES, `${path}.routeType`, issues),
    summary: validateText(value.summary, `${path}.summary`, issues),
    sourceIds: normalizeIdArray(value.sourceIds, `${path}.sourceIds`, issues),
    _path: path,
  }
}

function normalizeVariant(variant, path, issues) {
  const value = objectOrEmpty(variant, path, issues)
  if (value.recordStatus === 'blocked') return normalizeBlockedVariant(value, path, issues)
  return normalizeFullVariant(value, path, issues)
}

function normalizeFullVariant(value, path, issues) {
  const canonicalName = validateText(value.canonicalName, `${path}.canonicalName`, issues)
  const aliases = normalizeAliases(value.aliases, `${path}.aliases`, issues)
  validateAliasesAgainstCanonicalName(aliases, canonicalName, `${path}.aliases`, issues)
  const normalized = {
    entityKind: validateExact(value.entityKind, 'route_variant', `${path}.entityKind`, issues),
    recordStatus: validateExact(value.recordStatus, 'verified', `${path}.recordStatus`, issues),
    capability: validateExact(value.capability, 'full', `${path}.capability`, issues),
    id: validateId(value.id, 'variant:', `${path}.id`, issues),
    routeId: validateId(value.routeId, 'route:', `${path}.routeId`, issues),
    canonicalName,
    aliases,
    direction: validateEnum(value.direction, DIRECTIONS, `${path}.direction`, issues),
    startPoint: validateText(value.startPoint, `${path}.startPoint`, issues),
    endPoint: validateText(value.endPoint, `${path}.endPoint`, issues),
    isLoop: validateBoolean(value.isLoop, `${path}.isLoop`, issues),
    fixedDays: validatePositiveInteger(value.fixedDays, `${path}.fixedDays`, issues),
    stages: normalizeStages(value.stages, `${path}.stages`, issues),
    distanceKm: validatePositiveNumber(value.distanceKm, `${path}.distanceKm`, issues),
    ascentM: validateNonNegativeNumber(value.ascentM, `${path}.ascentM`, issues),
    descentM: validateNonNegativeNumber(value.descentM, `${path}.descentM`, issues),
    routeHighestPointElevationM: validateFiniteNumber(value.routeHighestPointElevationM, `${path}.routeHighestPointElevationM`, issues),
    nearbyPeakElevationM: validateNullableFiniteNumber(value.nearbyPeakElevationM, `${path}.nearbyPeakElevationM`, issues),
    weatherSamplePoints: normalizeSamplePoints(value.weatherSamplePoints, `${path}.weatherSamplePoints`, issues),
    accessMode: validateEnum(value.accessMode, ACCESS_MODES, `${path}.accessMode`, issues),
    operationalStatus: validateEnum(value.operationalStatus, FULL_STATUSES, `${path}.operationalStatus`, issues),
    verificationLevel: validateEnum(value.verificationLevel, new Set(['A', 'B']), `${path}.verificationLevel`, issues),
    sourceIds: normalizeIdArray(value.sourceIds, `${path}.sourceIds`, issues),
    sourceCheckedAt: validateDate(value.sourceCheckedAt, `${path}.sourceCheckedAt`, issues),
    ...(value.routeGeometry === undefined
      ? {}
      : { routeGeometry: normalizeRouteGeometry(value.routeGeometry, `${path}.routeGeometry`, issues) }),
    ...(value.routePreview === undefined
      ? {}
      : { routePreview: normalizeRoutePreview(value.routePreview, `${path}.routePreview`, issues, value.fixedDays) }),
    ...(value.operationalStatusRationale === undefined
      ? {}
      : { operationalStatusRationale: validateText(value.operationalStatusRationale, `${path}.operationalStatusRationale`, issues) }),
    _path: path,
  }
  return normalized
}

function normalizeBlockedVariant(value, path, issues) {
  const canonicalName = validateText(value.canonicalName, `${path}.canonicalName`, issues)
  const aliases = normalizeAliases(value.aliases, `${path}.aliases`, issues)
  validateAliasesAgainstCanonicalName(aliases, canonicalName, `${path}.aliases`, issues)
  const normalized = {
    entityKind: validateExact(value.entityKind, 'route_variant', `${path}.entityKind`, issues),
    recordStatus: 'blocked',
    capability: validateExact(value.capability, 'blocked', `${path}.capability`, issues),
    id: validateId(value.id, 'variant:', `${path}.id`, issues),
    routeId: validateId(value.routeId, 'route:', `${path}.routeId`, issues),
    canonicalName,
    aliases,
    operationalStatus: validateExact(value.operationalStatus, 'blocked', `${path}.operationalStatus`, issues),
    restriction: normalizeRestriction(value.restriction, `${path}.restriction`, issues),
    verificationLevel: validateExact(value.verificationLevel, 'A', `${path}.verificationLevel`, issues),
    sourceIds: normalizeIdArray(value.sourceIds, `${path}.sourceIds`, issues),
    sourceCheckedAt: validateDate(value.sourceCheckedAt, `${path}.sourceCheckedAt`, issues),
    _path: path,
  }
  for (const field of BLOCKED_FORBIDDEN_FIELDS) {
    if (value[field] !== undefined) addIssue(issues, 'forbidden_field', `${path}.${field}`)
  }
  return normalized
}

function normalizeRestriction(restriction, path, issues) {
  const value = objectOrEmpty(restriction, path, issues)
  return {
    reason: validateText(value.reason, `${path}.reason`, issues),
    scope: validateText(value.scope, `${path}.scope`, issues),
    effectiveFrom: validateNullableDate(value.effectiveFrom, `${path}.effectiveFrom`, issues),
    effectiveTo: validateNullableDate(value.effectiveTo, `${path}.effectiveTo`, issues),
    sourceIds: normalizeIdArray(value.sourceIds, `${path}.sourceIds`, issues),
  }
}

function normalizeStages(value, path, issues) {
  if (!Array.isArray(value)) return invalidArray(value, path, issues)
  if (value.length === 0) addIssue(issues, 'invalid_value', path)
  return value.map((stage, index) => {
    const stagePath = `${path}[${index}]`
    const item = objectOrEmpty(stage, stagePath, issues)
    return {
      day: validatePositiveInteger(item.day, `${stagePath}.day`, issues),
      startPoint: validateText(item.startPoint, `${stagePath}.startPoint`, issues),
      endPoint: validateText(item.endPoint, `${stagePath}.endPoint`, issues),
      distanceKm: validatePositiveNumber(item.distanceKm, `${stagePath}.distanceKm`, issues),
      ascentM: validateNonNegativeNumber(item.ascentM, `${stagePath}.ascentM`, issues),
      descentM: validateNonNegativeNumber(item.descentM, `${stagePath}.descentM`, issues),
      durationHours: normalizeDuration(item.durationHours, `${stagePath}.durationHours`, issues),
      weatherSamplePointIds: normalizeIdArray(item.weatherSamplePointIds, `${stagePath}.weatherSamplePointIds`, issues),
    }
  })
}

function normalizeDuration(value, path, issues) {
  const duration = objectOrEmpty(value, path, issues)
  const min = validatePositiveNumber(duration.min, `${path}.min`, issues)
  const max = validatePositiveNumber(duration.max, `${path}.max`, issues)
  if (Number.isFinite(min) && Number.isFinite(max) && min > max) addIssue(issues, 'invalid_value', path)
  return { min, max }
}

function normalizeSamplePoints(value, path, issues) {
  if (!Array.isArray(value)) return invalidArray(value, path, issues)
  if (value.length < 1 || value.length > 3) addIssue(issues, 'invalid_value', path)
  const ids = new Set()
  return value.map((sample, index) => {
    const samplePath = `${path}[${index}]`
    const item = objectOrEmpty(sample, samplePath, issues)
    const id = validateText(item.id, `${samplePath}.id`, issues)
    if (ids.has(id)) addIssue(issues, 'duplicate_id', `${samplePath}.id`)
    ids.add(id)
    return {
      id,
      name: validateText(item.name, `${samplePath}.name`, issues),
      coordinate: normalizeCoordinate(item.coordinate, `${samplePath}.coordinate`, issues),
      elevationM: validateFiniteNumber(item.elevationM, `${samplePath}.elevationM`, issues),
    }
  })
}

function normalizeCoordinate(value, path, issues) {
  const coordinate = objectOrEmpty(value, path, issues)
  return {
    lat: validateCoordinateNumber(coordinate.lat, -90, 90, `${path}.lat`, issues),
    lon: validateCoordinateNumber(coordinate.lon, -180, 180, `${path}.lon`, issues),
    coordinateSystem: validateEnum(coordinate.coordinateSystem, COORDINATE_SYSTEMS, `${path}.coordinateSystem`, issues),
  }
}

function normalizeAliases(value, path, issues) {
  if (!Array.isArray(value)) return invalidArray(value, path, issues)
  const aliases = []
  const seen = new Set()
  for (const [index, alias] of value.entries()) {
    const normalized = validateText(alias, `${path}[${index}]`, issues)
    if (seen.has(normalized)) addIssue(issues, 'duplicate_value', `${path}[${index}]`)
    seen.add(normalized)
    aliases.push(normalized)
  }
  return aliases
}

function normalizeLegacyAliases(value, canonicalName, path, issues) {
  if (!Array.isArray(value)) {
    addIssue(issues, 'invalid_type', path)
    return []
  }
  const aliases = []
  const seen = new Set()
  for (const [index, alias] of value.entries()) {
    if (typeof alias !== 'string') {
      addIssue(issues, 'invalid_type', `${path}[${index}]`)
      continue
    }
    const normalized = alias.trim()
    if (!normalized || normalized === canonicalName || seen.has(normalized)) continue
    seen.add(normalized)
    aliases.push(normalized)
  }
  return aliases
}

function validateAliasesAgainstCanonicalName(aliases, canonicalName, path, issues) {
  for (const [index, alias] of aliases.entries()) {
    if (alias === canonicalName) addIssue(issues, 'invalid_value', `${path}[${index}]`)
  }
}

function normalizeIdArray(value, path, issues) {
  if (!Array.isArray(value)) return invalidArray(value, path, issues)
  const ids = []
  const seen = new Set()
  for (const [index, id] of value.entries()) {
    const normalized = validateText(id, `${path}[${index}]`, issues)
    if (seen.has(normalized)) addIssue(issues, 'duplicate_value', `${path}[${index}]`)
    seen.add(normalized)
    ids.push(normalized)
  }
  return ids
}

function validateIds(entries, issues) {
  const allById = new Map()
  for (const entry of entries) {
    const { id } = entry.value
    if (!id.startsWith(entry.namespace)) addIssue(issues, 'invalid_namespace', entry.path)
    if (allById.has(id)) addIssue(issues, 'duplicate_id', entry.path)
    else allById.set(id, entry.value)
  }
  return allById
}

function validateEntitySources(entities, name, sourceById, issues) {
  for (const [index, entity] of entities.entries()) {
    const path = entity._path || `${name}[${index}]`
    for (const [sourceIndex, sourceId] of entity.sourceIds.entries()) {
      if (!sourceById.has(sourceId)) addIssue(issues, 'missing_reference', `${path}.sourceIds[${sourceIndex}]`)
    }
  }
}

function validateRoutes(routes, placeById, issues) {
  for (const [index, route] of routes.entries()) {
    const path = route._path || `routes[${index}]`
    if (!placeById.has(route.placeId)) addIssue(issues, 'missing_reference', `${path}.placeId`)
  }
}

function validateVariants(variants, routeById, sourceById, issues) {
  for (const [index, variant] of variants.entries()) {
    const path = variant._path || `variants[${index}]`
    if (!routeById.has(variant.routeId)) addIssue(issues, 'missing_reference', `${path}.routeId`)
    if (variant.recordStatus === 'blocked') validateBlockedVariant(variant, path, sourceById, issues)
    else validateFullVariant(variant, path, sourceById, issues)
  }
}

function validateFullVariant(variant, path, sourceById, issues) {
  if (variant.fixedDays !== variant.stages.length) addIssue(issues, 'invalid_value', `${path}.stages`)
  if (variant.isLoop !== (variant.direction === 'loop')) addIssue(issues, 'invalid_value', `${path}.isLoop`)

  const sampleIds = new Set(variant.weatherSamplePoints.map((sample) => sample.id))
  for (const [stageIndex, stage] of variant.stages.entries()) {
    if (stage.day !== stageIndex + 1) addIssue(issues, 'invalid_value', `${path}.stages[${stageIndex}].day`)
    if (stage.weatherSamplePointIds.length === 0) addIssue(issues, 'invalid_value', `${path}.stages[${stageIndex}].weatherSamplePointIds`)
    for (const [sampleIndex, sampleId] of stage.weatherSamplePointIds.entries()) {
      if (!sampleIds.has(sampleId)) {
        addIssue(issues, 'missing_reference', `${path}.stages[${stageIndex}].weatherSamplePointIds[${sampleIndex}]`)
      }
    }
  }

  const hasConservativeUnknownRationale = variant.operationalStatus === 'unknown'
    && typeof variant.operationalStatusRationale === 'string'
    && variant.operationalStatusRationale.length > 0
  const hasOpenDataRouteGeometry = Boolean(variant.routeGeometry)
    && variant.id.startsWith('variant:osm-')
    && variant.sourceIds.some((sourceId) => {
      const source = sourceById.get(sourceId)
      return source?.kind === 'open_data'
        && source.provenance?.provider === 'OpenStreetMap'
        && source.supports.some((support) => support.entityId === variant.id && support.field === 'routeGeometry')
    })
  const allowsUnknownWithoutOpeningEvidence = hasOpenDataRouteGeometry && hasConservativeUnknownRationale
  if (variant.operationalStatus === 'unknown' && hasOpenDataRouteGeometry && !hasConservativeUnknownRationale) {
    addIssue(issues, 'missing_required', `${path}.operationalStatusRationale`)
  }
  const evidenceFields = (variant.nearbyPeakElevationM === null
    ? FULL_EVIDENCE_FIELDS
    : [...FULL_EVIDENCE_FIELDS, 'nearbyPeakElevationM'])
    .filter((field) => field !== 'operationalStatus' || variant.operationalStatus === 'open' || !allowsUnknownWithoutOpeningEvidence)
  for (const field of evidenceFields) {
    if (!hasEvidence(variant.id, field, variant.sourceIds, sourceById, new Set(['A', 'B']))) {
      addIssue(issues, 'missing_evidence', `${path}.evidence.${field}`)
    }
  }
  if (variant.routeGeometry && !hasEvidence(variant.id, 'routeGeometry', variant.sourceIds, sourceById, new Set(['A', 'B']))) {
    addIssue(issues, 'missing_evidence', `${path}.evidence.routeGeometry`)
  }
  if (variant.routePreview && !hasReviewedPreviewEvidence(variant, sourceById)) {
    addIssue(issues, 'missing_evidence', `${path}.evidence.routePreview`)
  }
}

function hasReviewedPreviewEvidence(variant, sourceById) {
  return variant.sourceIds.some((sourceId) => {
    const source = sourceById.get(sourceId)
    return source
      && source.tier === 'B'
      && (source.kind === 'reviewed_gpx' || source.kind === 'reviewed_track' || source.kind === 'open_data')
      && source.supports.some((support) => support.entityId === variant.id && support.field === 'routePreview')
  })
}

function normalizeRouteGeometry(value, path, issues) {
  const geometry = objectOrEmpty(value, path, issues)
  rejectUnknownKeys(geometry, ROUTE_GEOMETRY_KEYS, path, issues)
  const coordinateSystem = validateExact(geometry.coordinateSystem, 'WGS84', `${path}.coordinateSystem`, issues)
  if (!Array.isArray(geometry.points)) return invalidArray(geometry.points, `${path}.points`, issues)
  if (geometry.points.length < 2 || geometry.points.length > MAX_ROUTE_GEOMETRY_POINTS) {
    addIssue(issues, 'invalid_value', `${path}.points`)
  }
  const points = geometry.points.map((rawPoint, index) => {
    const pointPath = `${path}.points[${index}]`
    const point = objectOrEmpty(rawPoint, pointPath, issues)
    rejectUnknownKeys(point, ROUTE_GEOMETRY_POINT_KEYS, pointPath, issues)
    return {
      lat: validateCoordinateNumber(point.lat, -90, 90, `${pointPath}.lat`, issues),
      lon: validateCoordinateNumber(point.lon, -180, 180, `${pointPath}.lon`, issues),
      elevationM: validateFiniteNumber(point.elevationM, `${pointPath}.elevationM`, issues),
    }
  })
  return { coordinateSystem, points }
}

function normalizeRoutePreview(value, path, issues, expectedDays) {
  const preview = objectOrEmpty(value, path, issues)
  rejectUnknownKeys(preview, ROUTE_PREVIEW_KEYS, path, issues)
  const coordinateSystem = validateEnum(preview.coordinateSystem, COORDINATE_SYSTEMS, `${path}.coordinateSystem`, issues)

  const boundsValue = objectOrEmpty(preview.bounds, `${path}.bounds`, issues)
  rejectUnknownKeys(boundsValue, ROUTE_PREVIEW_BOUND_KEYS, `${path}.bounds`, issues)
  const bounds = {
    minLat: validateCoordinateNumber(boundsValue.minLat, -90, 90, `${path}.bounds.minLat`, issues),
    maxLat: validateCoordinateNumber(boundsValue.maxLat, -90, 90, `${path}.bounds.maxLat`, issues),
    minLon: validateCoordinateNumber(boundsValue.minLon, -180, 180, `${path}.bounds.minLon`, issues),
    maxLon: validateCoordinateNumber(boundsValue.maxLon, -180, 180, `${path}.bounds.maxLon`, issues),
  }
  if (Number.isFinite(bounds.minLat) && Number.isFinite(bounds.maxLat) && bounds.minLat > bounds.maxLat) {
    addIssue(issues, 'invalid_value', `${path}.bounds`)
  }
  if (Number.isFinite(bounds.minLon) && Number.isFinite(bounds.maxLon) && bounds.minLon > bounds.maxLon) {
    addIssue(issues, 'invalid_value', `${path}.bounds`)
  }

  if (!Array.isArray(preview.segments)) {
    addIssue(issues, 'invalid_type', `${path}.segments`)
    return { coordinateSystem, bounds, segments: [] }
  }
  if (preview.segments.length === 0 || preview.segments.length > MAX_ROUTE_PREVIEW_SEGMENTS) {
    addIssue(issues, 'invalid_value', `${path}.segments`)
  }
  const segments = []
  let pointCount = 0
  let previousDay = 0
  /** @type {{ minLat: number, maxLat: number, minLon: number, maxLon: number } | null} */
  let actualBounds = null
  for (const [segmentIndex, rawSegment] of preview.segments.entries()) {
    const segmentPath = `${path}.segments[${segmentIndex}]`
    const segment = objectOrEmpty(rawSegment, segmentPath, issues)
    rejectUnknownKeys(segment, new Set(['day', 'points']), segmentPath, issues)
    const day = validatePositiveInteger(segment.day, `${segmentPath}.day`, issues)
    if (day <= previousDay || (Number.isInteger(expectedDays) && day > expectedDays)) {
      addIssue(issues, 'invalid_value', `${segmentPath}.day`)
    }
    previousDay = day
    if (!Array.isArray(segment.points)) {
      addIssue(issues, 'invalid_type', `${segmentPath}.points`)
      segments.push({ day, points: [] })
      continue
    }
    if (segment.points.length < 2) addIssue(issues, 'invalid_value', `${segmentPath}.points`)
    pointCount += segment.points.length
    if (pointCount > MAX_ROUTE_PREVIEW_POINTS) addIssue(issues, 'invalid_value', `${path}.segments`)
    const points = segment.points.map((rawPoint, pointIndex) => {
      const pointPath = `${segmentPath}.points[${pointIndex}]`
      const point = objectOrEmpty(rawPoint, pointPath, issues)
      rejectUnknownKeys(point, ROUTE_PREVIEW_POINT_KEYS, pointPath, issues)
      const normalized = {
        lat: validateCoordinateNumber(point.lat, -90, 90, `${pointPath}.lat`, issues),
        lon: validateCoordinateNumber(point.lon, -180, 180, `${pointPath}.lon`, issues),
      }
      if (Number.isFinite(normalized.lat) && Number.isFinite(normalized.lon)) {
        actualBounds = actualBounds || {
          minLat: normalized.lat, maxLat: normalized.lat, minLon: normalized.lon, maxLon: normalized.lon,
        }
        actualBounds.minLat = Math.min(actualBounds.minLat, normalized.lat)
        actualBounds.maxLat = Math.max(actualBounds.maxLat, normalized.lat)
        actualBounds.minLon = Math.min(actualBounds.minLon, normalized.lon)
        actualBounds.maxLon = Math.max(actualBounds.maxLon, normalized.lon)
      }
      return normalized
    })
    segments.push({ day, points })
  }
  if (actualBounds && (
    bounds.minLat !== actualBounds.minLat
    || bounds.maxLat !== actualBounds.maxLat
    || bounds.minLon !== actualBounds.minLon
    || bounds.maxLon !== actualBounds.maxLon
  )) {
    addIssue(issues, 'invalid_value', `${path}.bounds`)
  }
  return { coordinateSystem, bounds, segments }
}

function rejectUnknownKeys(value, allowed, path, issues) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) addIssue(issues, 'forbidden_field', `${path}.${key}`)
  }
}

function validateBlockedVariant(variant, path, sourceById, issues) {
  const variantSourceIds = new Set(variant.sourceIds)
  if (variant.restriction.sourceIds.length === 0) addIssue(issues, 'invalid_value', `${path}.restriction.sourceIds`)
  for (const [sourceIndex, sourceId] of variant.restriction.sourceIds.entries()) {
    if (!variantSourceIds.has(sourceId)) addIssue(issues, 'missing_reference', `${path}.restriction.sourceIds[${sourceIndex}]`)
  }
  for (const field of ['operationalStatus', 'restriction']) {
    if (!hasEvidence(variant.id, field, variant.restriction.sourceIds, sourceById, new Set(['A']))) {
      addIssue(issues, 'missing_evidence', `${path}.evidence.${field}`)
    }
  }
}

function hasEvidence(entityId, field, sourceIds, sourceById, allowedTiers) {
  return sourceIds.some((sourceId) => {
    const source = sourceById.get(sourceId)
    return source
      && allowedTiers.has(source.tier)
      && source.supports.some((support) => support.entityId === entityId && support.field === field)
  })
}

function validateSourceClaims(sources, allById, places, routes, variants, issues) {
  const entities = new Map([...places, ...routes, ...variants].map((entity) => [entity.id, entity]))
  for (const [sourceIndex, source] of sources.entries()) {
    for (const [supportIndex, support] of source.supports.entries()) {
      const sourcePath = source._path || `sources[${sourceIndex}]`
      const path = `${sourcePath}.supports[${supportIndex}].entityId`
      if (!allById.has(support.entityId) || !entities.has(support.entityId)) {
        addIssue(issues, 'missing_reference', path)
        continue
      }
      const entity = entities.get(support.entityId)
      if (!entity.sourceIds.includes(source.id)) addIssue(issues, 'unlinked_source', path)
    }
  }
}

function objectOrEmpty(value, path, issues) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  addIssue(issues, 'invalid_type', path)
  return {}
}

function invalidArray(_value, path, issues) {
  addIssue(issues, 'invalid_type', path)
  return []
}

function validateId(value, namespace, path, issues) {
  const id = validateText(value, path, issues)
  if (!id.startsWith(namespace)) addIssue(issues, 'invalid_namespace', path)
  else if (id.length === namespace.length) addIssue(issues, 'invalid_id', path)
  return id
}

function validateExact(value, expected, path, issues) {
  if (value !== expected) addIssue(issues, 'invalid_value', path)
  return value
}

function validateEnum(value, allowed, path, issues) {
  if (!allowed.has(value)) addIssue(issues, 'invalid_value', path)
  return value
}

function validateText(value, path, issues) {
  if (typeof value !== 'string') {
    addIssue(issues, 'invalid_type', path)
    return ''
  }
  if (!value || value !== value.trim()) addIssue(issues, 'invalid_value', path)
  return value
}

function legacyText(value, path, issues) {
  if (typeof value !== 'string') {
    addIssue(issues, 'invalid_type', path)
    return ''
  }
  const normalized = value.trim()
  if (!normalized) addIssue(issues, 'invalid_value', path)
  return normalized
}

function validateBoolean(value, path, issues) {
  if (typeof value !== 'boolean') addIssue(issues, 'invalid_type', path)
  return value
}

function validateCoordinateNumber(value, lowerBound, upperBound, path, issues) {
  if (!Number.isFinite(value) || value < lowerBound || value > upperBound) addIssue(issues, 'invalid_value', path)
  return value
}

function validatePositiveInteger(value, path, issues) {
  if (!Number.isInteger(value) || value <= 0) addIssue(issues, 'invalid_value', path)
  return value
}

function validatePositiveNumber(value, path, issues) {
  if (!Number.isFinite(value) || value <= 0) addIssue(issues, 'invalid_value', path)
  return value
}

function validateNonNegativeNumber(value, path, issues) {
  if (!Number.isFinite(value) || value < 0) addIssue(issues, 'invalid_value', path)
  return value
}

function validateFiniteNumber(value, path, issues) {
  if (!Number.isFinite(value)) addIssue(issues, value === undefined ? 'missing_required' : 'invalid_value', path)
  return value
}

function validateNullableFiniteNumber(value, path, issues) {
  if (value === null) return null
  return validateFiniteNumber(value, path, issues)
}

function validateNullableUrl(value, path, issues) {
  if (value === null) return null
  return validateText(value, path, issues)
}

function validateDate(value, path, issues) {
  if (typeof value !== 'string') {
    addIssue(issues, 'invalid_type', path)
    return ''
  }
  if (!isIsoDate(value)) addIssue(issues, 'invalid_value', path)
  return value
}

function validateTimestamp(value, path, issues) {
  if (typeof value !== 'string') {
    addIssue(issues, 'invalid_type', path)
    return ''
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime()) || !value.endsWith('Z')) addIssue(issues, 'invalid_value', path)
  return value
}

function validateNullableDate(value, path, issues) {
  if (value === null) return null
  return validateDate(value, path, issues)
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function addIssue(issues, code, path) {
  issues.push({ code, path })
}

module.exports = {
  createRouteCatalog,
  RouteCatalogValidationError,
}
