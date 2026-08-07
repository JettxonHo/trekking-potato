const { editDistance } = require('../data/routes')
const { createProductionRouteCatalog } = require('../data/catalog/runtime-catalog')

const PRODUCTION_RESOLVER = createCatalogResolver({
  catalog: createProductionRouteCatalog(),
})

function createCatalogResolver({ catalog }) {
  const state = createResolverState(catalog)

  return {
    resolveQuery(query) {
      if (typeof query !== 'string' || query.length === 0) return notFound()

      const canonicalExact = state.searchableEntities.filter((entity) => entity.canonicalName === query)
      if (canonicalExact.length > 0) return resolveExact(canonicalExact, 'canonical_exact', state)

      const aliasExact = state.searchableEntities.filter((entity) => entity.aliases.includes(query))
      if (aliasExact.length > 0) return resolveExact(aliasExact, null, state)

      const prefix = state.searchableEntities.filter((entity) => matchesAnyName(query, entity, prefixMatch))
      if (prefix.length > 0) return resolveNonExact(prefix, 'prefix', state)

      const contains = state.searchableEntities.filter((entity) => matchesAnyName(query, entity, containsMatch))
      if (contains.length > 0) return resolveNonExact(contains, 'contains', state)

      if (query.length < 4) return notFound()

      const fuzzy = state.searchableEntities
        .map((entity) => ({ entity, distance: minimumDistance(query, entity) }))
        .filter((match) => match.distance <= 2)
      if (fuzzy.length === 0) return notFound()

      return resolveNonExact(fuzzy.map((match) => match.entity), 'fuzzy', state, new Map(fuzzy.map((match) => [match.entity.id, match.distance])))
    },

    resolveCandidateId(candidateId) {
      if (typeof candidateId !== 'string') return notFound()

      if (candidateId.startsWith('variant:')) {
        const variant = state.variantsById.get(candidateId)
        if (!variant || (variant.capability !== 'full' && variant.capability !== 'blocked')) return notFound()
        return direct('candidate_id', targetForVariant(variant, state))
      }

      if (candidateId.startsWith('place:')) {
        const place = state.placesById.get(candidateId)
        if (!place) return notFound()
        const targets = uniqueTargets(targetsForPlace(place, state))
        if (targets.length !== 1 || targets[0].candidateId !== candidateId || targets[0].capability !== 'place_only') return notFound()
        return direct('candidate_id', targets[0])
      }

      if (!candidateId.startsWith('builtin-route:')) return notFound()
      const place = state.placesByLegacyCandidateId.get(candidateId)
      if (!place) return notFound()
      const targets = uniqueTargets(targetsForPlace(place, state))
      if (targets.length !== 1) return notFound()
      return direct('legacy_candidate_id', targets[0])
    },
  }
}

function createResolverState(catalog) {
  const snapshot = copy({
    places: Array.isArray(catalog && catalog.places) ? catalog.places : [],
    routes: Array.isArray(catalog && catalog.routes) ? catalog.routes : [],
    variants: Array.isArray(catalog && catalog.variants) ? catalog.variants : [],
  })
  const placesById = new Map(snapshot.places.map((place) => [place.id, place]))
  const routesById = new Map(snapshot.routes.map((route) => [route.id, route]))
  const variantsById = new Map(snapshot.variants.map((variant) => [variant.id, variant]))
  const routesByPlaceId = new Map()
  const variantsByRouteId = new Map()
  const placesByLegacyCandidateId = new Map()

  for (const route of snapshot.routes) addToList(routesByPlaceId, route.placeId, route)
  for (const variant of snapshot.variants) addToList(variantsByRouteId, variant.routeId, variant)
  for (const place of snapshot.places) {
    if (typeof place.legacyCandidateId === 'string') placesByLegacyCandidateId.set(place.legacyCandidateId, place)
  }

  return {
    placesById,
    routesById,
    variantsById,
    routesByPlaceId,
    variantsByRouteId,
    placesByLegacyCandidateId,
    searchableEntities: [...snapshot.places, ...snapshot.routes, ...snapshot.variants],
  }
}

function resolveExact(entities, canonicalMatchStage, state) {
  const targets = uniqueTargets(entities.flatMap((entity) => targetsForEntity(entity, state)))
  if (targets.length === 0) return notFound()

  const blockedCount = targets.filter((target) => target.capability === 'blocked').length
  if (blockedCount > 1 || (blockedCount === 1 && targets.length > 1)) return notFound()

  if (targets.length === 1) {
    return direct(canonicalMatchStage || 'unique_alias_exact', targets[0])
  }
  return confirmation(canonicalMatchStage || 'repeated_alias_exact', targets)
}

function resolveNonExact(entities, matchStage, state, distancesByEntityId = null) {
  const candidatesById = new Map()
  for (const entity of entities) {
    for (const target of targetsForEntity(entity, state)) {
      if (target.capability === 'blocked') continue
      const distance = distancesByEntityId ? distancesByEntityId.get(entity.id) : null
      const current = candidatesById.get(target.candidateId)
      if (!current || (distance !== null && distance < current.distance)) {
        candidatesById.set(target.candidateId, { target, distance })
      }
    }
  }
  if (candidatesById.size === 0) return notFound()

  const candidates = [...candidatesById.values()]
    .sort((left, right) => {
      if (matchStage === 'fuzzy' && left.distance !== right.distance) return left.distance - right.distance
      return compareTargets(left.target, right.target)
    })
    .slice(0, 5)
    .map((entry) => candidateDto(entry.target))

  return {
    kind: 'confirmation',
    matchStage,
    candidates,
  }
}

function targetsForEntity(entity, state) {
  if (entity.entityKind === 'place') return targetsForPlace(entity, state)
  if (entity.entityKind === 'route') return targetsForRoute(entity, state)
  if (entity.entityKind === 'route_variant') return [targetForVariant(entity, state)]
  return []
}

function targetsForPlace(place, state) {
  const variants = (state.routesByPlaceId.get(place.id) || []).flatMap((route) => state.variantsByRouteId.get(route.id) || [])
  const full = variants.filter((variant) => variant.capability === 'full')
  if (full.length > 0) return full.map((variant) => targetForVariant(variant, state))
  const blocked = variants.filter((variant) => variant.capability === 'blocked')
  if (blocked.length > 0) return blocked.map((variant) => targetForVariant(variant, state))
  return [targetForPlace(place)]
}

function targetsForRoute(route, state) {
  const variants = state.variantsByRouteId.get(route.id) || []
  const full = variants.filter((variant) => variant.capability === 'full')
  if (full.length > 0) return full.map((variant) => targetForVariant(variant, state))
  return variants
    .filter((variant) => variant.capability === 'blocked')
    .map((variant) => targetForVariant(variant, state))
}

function targetForPlace(place) {
  return {
    candidateId: place.id,
    entityKind: 'place',
    capability: 'place_only',
    canonicalName: place.canonicalName,
    region: place.region,
    routeType: null,
    fixedDays: null,
    place: copy(place),
    route: null,
    routeVariant: null,
  }
}

function targetForVariant(variant, state) {
  const route = state.routesById.get(variant.routeId)
  const place = route && state.placesById.get(route.placeId)
  return {
    candidateId: variant.id,
    entityKind: 'route_variant',
    capability: variant.capability,
    canonicalName: variant.canonicalName,
    region: place ? place.region : null,
    routeType: route ? route.routeType : null,
    fixedDays: variant.capability === 'full' ? variant.fixedDays : null,
    place: copy(place),
    route: copy(route),
    routeVariant: copy(variant),
  }
}

function matchesAnyName(query, entity, predicate) {
  return [entity.canonicalName, ...entity.aliases].some((name) => predicate(query, name))
}

function prefixMatch(left, right) {
  return left.startsWith(right) || right.startsWith(left)
}

function containsMatch(left, right) {
  return left.includes(right) || right.includes(left)
}

function minimumDistance(query, entity) {
  return Math.min(...[entity.canonicalName, ...entity.aliases].map((name) => editDistance(query, name)))
}

function uniqueTargets(targets) {
  const targetsById = new Map()
  for (const target of targets) {
    if (!targetsById.has(target.candidateId)) targetsById.set(target.candidateId, target)
  }
  return [...targetsById.values()]
}

function compareTargets(left, right) {
  if (left.canonicalName < right.canonicalName) return -1
  if (left.canonicalName > right.canonicalName) return 1
  if (left.candidateId < right.candidateId) return -1
  if (left.candidateId > right.candidateId) return 1
  return 0
}

function candidateDto(target) {
  return {
    candidateId: target.candidateId,
    entityKind: target.entityKind,
    capability: target.capability,
    canonicalName: target.canonicalName,
    region: target.region,
    routeType: target.routeType,
    fixedDays: target.fixedDays,
  }
}

function direct(matchStage, target) {
  return {
    kind: 'direct',
    matchStage,
    target: copy(target),
  }
}

function confirmation(matchStage, targets) {
  return {
    kind: 'confirmation',
    matchStage,
    candidates: uniqueTargets(targets)
      .sort(compareTargets)
      .slice(0, 5)
      .map((target) => candidateDto(target)),
  }
}

function notFound() {
  return { kind: 'not_found' }
}

function addToList(map, key, value) {
  const values = map.get(key) || []
  values.push(value)
  map.set(key, values)
}

function copy(value) {
  return value === null || value === undefined ? value : JSON.parse(JSON.stringify(value))
}

function resolveRouteQuery(query) {
  return PRODUCTION_RESOLVER.resolveQuery(query)
}

function resolveRouteCandidateId(candidateId) {
  return PRODUCTION_RESOLVER.resolveCandidateId(candidateId)
}

module.exports = {
  createCatalogResolver,
  resolveRouteQuery,
  resolveRouteCandidateId,
}
