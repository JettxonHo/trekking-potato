/**
 * I21 trusted BaseData builder.
 *
 * This module is deliberately transport-free: the handler resolves targets,
 * this builder composes one trusted snapshot, and TripContext persists that
 * exact beta_base_v2 snapshot.
 */
const { evaluateTripVerdict: defaultEvaluateTripVerdict } = require('./trip-verdict')
const { getGearRules: defaultGetGearRules } = require('./gear-rules')

const ROUTE_TYPES = new Set(['trek', 'climb', 'tour'])
const CLIMB_SUPPORTS = new Set(['solo_or_unsure', 'experienced_team', 'professional_guide'])
const CAPABILITIES = new Set(['full', 'blocked', 'place_only'])
const ORIGINS = new Set(['catalog', 'amap', 'manual'])

function copy(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function validTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function sourceIdsFor(target) {
  const values = [
    ...(target.route && Array.isArray(target.route.sourceIds) ? target.route.sourceIds : []),
    ...(target.routeVariant && Array.isArray(target.routeVariant.sourceIds) ? target.routeVariant.sourceIds : []),
    ...(target.routeVariant && target.routeVariant.restriction && Array.isArray(target.routeVariant.restriction.sourceIds)
      ? target.routeVariant.restriction.sourceIds : []),
  ]
  return [...new Set(values.filter((value) => typeof value === 'string'))].sort()
}

function routeSnapshotForFull(target, routeType) {
  const variant = target.routeVariant
  const route = target.route
  const place = target.place
  const snapshot = {
    entityKind: 'route_variant',
    capability: 'full',
    placeId: place && place.id ? place.id : null,
    routeId: route && route.id ? route.id : null,
    routeVariantId: variant && variant.id ? variant.id : null,
    canonicalName: variant.canonicalName,
    region: target.region || (place && place.region) || null,
    routeType,
    fixedDays: variant.fixedDays,
    stages: copy(variant.stages),
    referenceCoordinate: null,
    referenceElevationM: null,
    restriction: null,
    routeHighestPointElevationM: finite(variant.routeHighestPointElevationM) ? variant.routeHighestPointElevationM : null,
    verificationLevel: variant.verificationLevel || null,
    operationalStatus: variant.operationalStatus || null,
    sourceCheckedAt: variant.sourceCheckedAt || null,
  }
  if (variant.routePreview !== undefined) snapshot.routePreview = copy(variant.routePreview)
  return snapshot
}

function routeSnapshotForPlace(target, routeType, elevation) {
  const place = target.place || {}
  return {
    entityKind: 'place',
    capability: 'place_only',
    placeId: target.placeId || place.id || null,
    routeId: null,
    routeVariantId: null,
    canonicalName: target.name || place.canonicalName || target.route || null,
    region: target.location || target.region || place.region || null,
    routeType,
    fixedDays: null,
    stages: null,
    referenceCoordinate: target.referenceCoordinate ? copy(target.referenceCoordinate) : null,
    referenceElevationM: finite(elevation) ? elevation : null,
    restriction: null,
    routeHighestPointElevationM: null,
    verificationLevel: null,
    operationalStatus: null,
    sourceCheckedAt: null,
  }
}

function routeSnapshotForBlocked(target, routeType) {
  const variant = target.routeVariant
  const route = target.route
  const place = target.place
  return {
    entityKind: 'route_variant',
    capability: 'blocked',
    placeId: place && place.id ? place.id : null,
    routeId: route && route.id ? route.id : null,
    routeVariantId: variant && variant.id ? variant.id : null,
    canonicalName: variant.canonicalName,
    region: target.region || (place && place.region) || null,
    routeType,
    fixedDays: null,
    stages: null,
    referenceCoordinate: null,
    referenceElevationM: null,
    restriction: copy(variant.restriction),
    routeHighestPointElevationM: null,
    verificationLevel: variant.verificationLevel || null,
    operationalStatus: variant.operationalStatus || null,
    sourceCheckedAt: variant.sourceCheckedAt || null,
  }
}

function sourceMetadataFor(target, resolveRouteSourceSummaries, { routeTypeSource, weatherSource, checkedAt }) {
  const routeSourceIds = sourceIdsFor(target)
  if (routeSourceIds.length === 0) {
    return { routeSourceIds: [], routeSources: [], routeTypeSource, weatherSource, checkedAt }
  }
  if (typeof resolveRouteSourceSummaries !== 'function') throw new TypeError('route source summary resolver required')
  const routeSources = resolveRouteSourceSummaries(routeSourceIds)
  if (!Array.isArray(routeSources)
    || routeSources.length !== routeSourceIds.length
    || routeSources.some((source, index) => !source || source.id !== routeSourceIds[index])) {
    throw new Error('Route source summaries do not match route source IDs')
  }
  return { routeSourceIds, routeSources: copy(routeSources), routeTypeSource, weatherSource, checkedAt }
}

function emptyGear(fatalRisks = [], ruleNotes = []) {
  return { essential: [], recommended: [], optional: [], fatalRisks, ruleNotes }
}

function highestSample(variant) {
  const points = Array.isArray(variant.weatherSamplePoints) ? variant.weatherSamplePoints : []
  return points.reduce((current, point) => (
    !current || (finite(point.elevationM) && point.elevationM > current.elevationM) ? point : current
  ), null)
}

function normalizeReferenceResult(result) {
  if (!result) return { snapshot: null, data: null, source: null, elevationM: null }
  if (result.ok === true) {
    const data = result.data === undefined ? result : result.data
    return {
      snapshot: {
        status: 'available',
        scope: 'reference_point',
        source: result.source || (data && data.source) || 'Open-Meteo',
        data: copy(data),
      },
      data: copy(data),
      source: result.source || (data && data.source) || 'Open-Meteo',
      elevationM: finite(result.elevationM) ? result.elevationM : null,
    }
  }
  if (result.status === 'available') {
    return { snapshot: copy(result), data: copy(result.data), source: result.source || 'Open-Meteo', elevationM: result.elevationM }
  }
  if (result.status === 'unavailable') {
    return {
      snapshot: {
        status: 'unavailable',
        scope: 'reference_point',
        source: result.source || 'Open-Meteo',
        error: result.error || 'weather_unavailable',
        retryable: result.retryable !== false,
      },
      data: null,
      source: result.source || 'Open-Meteo',
      elevationM: finite(result.elevationM) ? result.elevationM : null,
    }
  }
  return {
    snapshot: result.status === 'unavailable' ? copy(result) : null,
    data: null,
    source: null,
    elevationM: finite(result.elevationM) ? result.elevationM : null,
  }
}

function invalid(code, message) {
  return { kind: 'invalid', code, message }
}

function normalizeTarget(target) {
  if (!target || typeof target !== 'object') return null
  const capability = target.capability
    || (target.entityKind === 'route_variant' && target.routeVariant && target.routeVariant.capability)
    || (target.entityKind === 'place' ? 'place_only' : null)
  const entityKind = target.entityKind
    || (capability === 'place_only' ? 'place' : 'route_variant')
  if (!CAPABILITIES.has(capability)) return null
  if (capability === 'place_only' && entityKind !== 'place') return null
  if (capability !== 'place_only' && entityKind !== 'route_variant') return null
  if (capability === 'place_only' && !ORIGINS.has(target.origin)) return null
  return { ...target, entityKind, capability }
}

/** @typedef {{ fetchRouteWeather?: Function, fetchReferenceWeather?: Function,
 *   evaluateTripVerdict?: Function,
 *   getGearRules?: Function, resolveRouteSourceSummaries?: Function,
 *   now?: Function }} TripBaseDependencies */

/** @param {TripBaseDependencies} [dependencies={}] */
function createTripBaseBuilder(dependencies = {}) {
  const fetchRouteWeather = dependencies.fetchRouteWeather
  const fetchReferenceWeather = dependencies.fetchReferenceWeather
  const evaluateTripVerdict = dependencies.evaluateTripVerdict || defaultEvaluateTripVerdict
  const getGearRules = dependencies.getGearRules || defaultGetGearRules
  const resolveRouteSourceSummaries = dependencies.resolveRouteSourceSummaries
  const now = typeof dependencies.now === 'function' ? dependencies.now : () => new Date()

  /** @param {{ target?: any, request?: any }} [options={}] */
  async function build(options = {}) {
    const { target: rawTarget, request } = options
    const target = normalizeTarget(rawTarget)
    if (!target) return invalid('invalid_target', '路线目标无效')
    const input = request || {}
    const clockValue = now()
    const clockDate = clockValue instanceof Date ? clockValue : new Date(clockValue)
    const checkedAt = clockDate.toISOString()
    if (!validDate(input.date) || !validTime(input.startTimeLocal)
      || typeof input.level !== 'string') return invalid('invalid_request', '行程输入无效')

    if (target.capability === 'blocked') {
      const variant = target.routeVariant
      const routeType = target.routeType || (target.route && target.route.routeType)
      if (!variant || !variant.restriction || !ROUTE_TYPES.has(routeType)) return invalid('invalid_target', '禁行路线事实无效')
      const deterministicResult = evaluateTripVerdict({
        routeContext: {
          kind: 'blocked',
          restriction: variant.restriction,
          sourceCheckedAt: variant.sourceCheckedAt,
        },
      })
      const gearRules = emptyGear(
        deterministicResult.reasons.filter((reason) => reason.severity === 'no_go').map((reason) => '官方禁行'),
        ['该路线存在官方禁行记录'],
      )
      const routeSnapshot = routeSnapshotForBlocked(target, routeType)
      const data = makeBaseData({
        requestSummary: { date: input.date, startTimeLocal: input.startTimeLocal, level: input.level, days: null, climbSupport: null },
        routeSnapshot,
        weatherSnapshot: null,
        deterministicResult,
        gearRules,
        sourceMetadata: sourceMetadataFor(target, resolveRouteSourceSummaries, {
          routeTypeSource: 'builtin', weatherSource: null, checkedAt,
        }),
      })
      return { kind: 'built', trustedBaseData: data }
    }

    if (target.capability === 'full') {
      const variant = target.routeVariant
      const routeType = target.routeType || (target.route && target.route.routeType)
      if (!variant || !ROUTE_TYPES.has(routeType) || !Number.isInteger(variant.fixedDays) || variant.fixedDays < 1) {
        return invalid('invalid_target', '完整路线事实无效')
      }
      if (routeType === 'climb' && !CLIMB_SUPPORTS.has(input.climbSupport)) {
        return invalid('missing_climb_support', '技术攀登必须选择队伍支持方式')
      }
      if (typeof fetchRouteWeather !== 'function') return invalid('weather_unavailable', '路线天气服务不可用')
      const sample = highestSample(variant)
      let weather = null
      try {
        const result = await fetchRouteWeather({ variant: copy(variant), date: input.date, startTimeLocal: input.startTimeLocal }, { now: clockDate })
        if (result && result.ok === true) weather = copy(result)
        else {
          weather = {
            ok: true,
            source: 'Open-Meteo',
            fetchedAt: checkedAt,
            timezone: 'Asia/Shanghai',
            dataStatus: 'insufficient',
            insufficientReasons: [{
              code: result && result.error ? result.error : 'weather_unavailable',
              retryable: result ? result.retryable !== false : true,
            }],
            evaluatedWindows: [],
          }
        }
      } catch (_error) {
        weather = {
          ok: true,
          source: 'Open-Meteo',
          fetchedAt: checkedAt,
          timezone: 'Asia/Shanghai',
          dataStatus: 'insufficient',
          insufficientReasons: [{ code: 'weather_unavailable', retryable: true }],
          evaluatedWindows: [],
        }
      }
      const weatherForVerdict = weather
      const deterministicResult = evaluateTripVerdict({
        routeContext: { kind: 'full', routeType },
        request: { level: input.level, climbSupport: input.climbSupport },
        weatherSnapshot: weatherForVerdict,
      })
      const gearRules = getGearRules({
        month: Number(input.date.slice(5, 7)),
        elevation: variant.routeHighestPointElevationM,
        days: variant.fixedDays,
        lat: sample && sample.coordinate ? sample.coordinate.lat : 34,
        routeType,
      })
      const routeSnapshot = routeSnapshotForFull(target, routeType)
      const data = makeBaseData({
        requestSummary: { date: input.date, startTimeLocal: input.startTimeLocal, level: input.level, days: variant.fixedDays, climbSupport: routeType === 'climb' ? input.climbSupport : null },
        routeSnapshot,
        weatherSnapshot: weather,
        deterministicResult,
        gearRules,
        sourceMetadata: sourceMetadataFor(target, resolveRouteSourceSummaries, {
          routeTypeSource: 'builtin', weatherSource: weather ? 'Open-Meteo' : null, checkedAt,
        }),
      })
      return { kind: 'built', trustedBaseData: data }
    }

    if (!ROUTE_TYPES.has(input.routeType) || !Number.isInteger(input.days) || input.days < 1 || input.days > 7) {
      return invalid('invalid_request', '地点级路线类型和天数无效')
    }
    const origin = target.origin || 'manual'
    const coordinate = target.referenceCoordinate
      || (target.place && target.place.referenceCoordinate)
      || null
    if (!coordinate || !finite(coordinate.lat) || !finite(coordinate.lon)) return invalid('invalid_target', '地点坐标无效')
    let referenceResult = { snapshot: null, data: null, source: null, elevationM: null }
    if (typeof fetchReferenceWeather === 'function') {
      try {
        referenceResult = normalizeReferenceResult(await fetchReferenceWeather({
          coordinate: copy(coordinate), elevationM: target.referenceElevationM, date: input.date,
          days: input.days, route: target.name || target.route || (target.place && target.place.canonicalName),
        }, { now: clockDate }))
      } catch (_error) {
        referenceResult = {
          snapshot: { status: 'unavailable', scope: 'reference_point', source: 'Open-Meteo', error: 'weather_unavailable', retryable: true },
          data: null,
          source: 'Open-Meteo',
          elevationM: null,
        }
      }
    }
    const elevation = finite(target.referenceElevationM)
      ? target.referenceElevationM
      : (finite(referenceResult.elevationM) ? referenceResult.elevationM : null)
    let gearRules = getGearRules({
      month: Number(input.date.slice(5, 7)),
      elevation: finite(elevation) ? elevation : 0,
      days: input.days,
      lat: coordinate.lat,
      routeType: input.routeType,
    })
    if (!finite(elevation)) {
      gearRules = {
        ...gearRules,
        ruleNotes: [...(gearRules.ruleNotes || []), '地点级参考，未按完整路线海拔评估'],
      }
    }
    const deterministicResult = evaluateTripVerdict({ routeContext: { kind: 'place_only' } })
    const routeSnapshot = routeSnapshotForPlace({
      ...target,
      name: target.name || (target.place && target.place.canonicalName),
      location: target.location || target.region,
      referenceCoordinate: coordinate,
    }, input.routeType, elevation)
    const data = makeBaseData({
      requestSummary: { date: input.date, startTimeLocal: input.startTimeLocal, level: input.level, days: input.days, climbSupport: null },
      routeSnapshot,
      weatherSnapshot: referenceResult.snapshot,
      deterministicResult,
      gearRules,
      sourceMetadata: sourceMetadataFor(target, resolveRouteSourceSummaries, {
        routeTypeSource: origin === 'amap' ? 'amap' : 'user',
        weatherSource: referenceResult.source,
        checkedAt,
      }),
    })
    return { kind: 'built', trustedBaseData: data }
  }

  return { build }
}

function makeBaseData({ requestSummary, routeSnapshot, weatherSnapshot, deterministicResult, gearRules, sourceMetadata }) {
  return {
    schemaVersion: 'beta_base_v2',
    requestSummary: copy(requestSummary),
    routeSnapshot: copy(routeSnapshot),
    weatherSnapshot: copy(weatherSnapshot),
    deterministicResult: copy(deterministicResult),
    minimumGear: {
      essential: copy(gearRules.essential || []),
      recommended: copy(gearRules.recommended || []),
      optional: copy(gearRules.optional || []),
    },
    deterministicSafety: {
      fatalRisks: copy(gearRules.fatalRisks || []),
      ruleNotes: copy(gearRules.ruleNotes || []),
    },
    sourceMetadata: copy(sourceMetadata),
  }
}

module.exports = { createTripBaseBuilder }
