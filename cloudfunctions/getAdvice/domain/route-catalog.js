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

  return {
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
  return {
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
    _path: path,
  }
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

  const evidenceFields = variant.nearbyPeakElevationM === null
    ? FULL_EVIDENCE_FIELDS
    : [...FULL_EVIDENCE_FIELDS, 'nearbyPeakElevationM']
  for (const field of evidenceFields) {
    if (!hasEvidence(variant.id, field, variant.sourceIds, sourceById, new Set(['A', 'B']))) {
      addIssue(issues, 'missing_evidence', `${path}.evidence.${field}`)
    }
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
