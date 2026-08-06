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

const HOURLY_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation_probability',
  'precipitation',
  'snowfall',
  'weather_code',
  'visibility',
  'wind_speed_10m',
  'wind_gusts_10m',
  'freezing_level_height',
]

const HOURLY_UNITS = {
  time: 'iso8601',
  temperature_2m: '°C',
  apparent_temperature: '°C',
  precipitation_probability: '%',
  precipitation: 'mm',
  snowfall: 'cm',
  weather_code: 'wmo code',
  visibility: 'm',
  wind_speed_10m: 'm/s',
  wind_gusts_10m: 'm/s',
  freezing_level_height: 'm',
}

function addIsoDays(date, amount) {
  const parts = date.split('-').map(Number)
  const value = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + amount))
  return value.toISOString().slice(0, 10)
}

function makeCatalogInput() {
  const sourceId = 'source:hourly-fixture'
  const variantId = 'variant:hourly-fixture'
  return {
    sources: [{
      id: sourceId,
      tier: 'A',
      kind: 'official',
      title: 'Hourly fixture authority',
      publisher: 'Hourly fixture authority',
      url: 'https://example.test/hourly-fixture',
      checkedAt: '2026-08-06',
      supports: FULL_EVIDENCE_FIELDS.map((field) => ({
        entityId: variantId,
        field,
        method: 'direct',
      })),
    }],
    places: [{
      entityKind: 'place',
      capability: 'place_only',
      id: 'place:hourly-fixture',
      canonicalName: 'Hourly fixture mountain',
      aliases: [],
      region: 'Fixture region',
      kind: 'mountain',
      referenceCoordinate: { lat: 30, lon: 100, coordinateSystem: 'WGS84' },
      sourceStatus: 'verified',
      sourceIds: [],
    }],
    routes: [{
      entityKind: 'route',
      id: 'route:hourly-fixture',
      placeId: 'place:hourly-fixture',
      canonicalName: 'Hourly fixture route',
      aliases: [],
      routeType: 'trek',
      summary: 'Synthetic route used only by the I14 offline contract.',
      sourceIds: [],
    }],
    variants: [{
      entityKind: 'route_variant',
      recordStatus: 'verified',
      capability: 'full',
      id: variantId,
      routeId: 'route:hourly-fixture',
      canonicalName: 'Hourly fixture two-day route',
      aliases: [],
      direction: 'out_and_back',
      startPoint: 'Fixture start',
      endPoint: 'Fixture end',
      isLoop: false,
      fixedDays: 2,
      stages: [{
        day: 1,
        startPoint: 'Fixture start',
        endPoint: 'Fixture camp',
        distanceKm: 11,
        ascentM: 900,
        descentM: 300,
        durationHours: { min: 2, max: 4 },
        weatherSamplePointIds: ['sample-b', 'sample-a'],
      }, {
        day: 2,
        startPoint: 'Fixture camp',
        endPoint: 'Fixture end',
        distanceKm: 9,
        ascentM: 300,
        descentM: 900,
        durationHours: { min: 1, max: 2 },
        weatherSamplePointIds: ['sample-c', 'sample-b'],
      }],
      distanceKm: 20,
      ascentM: 1200,
      descentM: 1200,
      routeHighestPointElevationM: 2800,
      nearbyPeakElevationM: null,
      weatherSamplePoints: [{
        id: 'sample-a',
        name: 'Fixture GCJ ridge',
        coordinate: { lat: 39.915, lon: 116.404, coordinateSystem: 'GCJ-02' },
        elevationM: 1810,
      }, {
        id: 'sample-b',
        name: 'Fixture WGS pass',
        coordinate: { lat: 30, lon: 100, coordinateSystem: 'WGS84' },
        elevationM: 2200,
      }, {
        id: 'sample-c',
        name: 'Fixture WGS descent',
        coordinate: { lat: 31, lon: 101, coordinateSystem: 'WGS84' },
        elevationM: 2600,
      }],
      accessMode: 'walk',
      operationalStatus: 'open',
      verificationLevel: 'A',
      sourceIds: [sourceId],
      sourceCheckedAt: '2026-08-06',
    }],
  }
}

function makeHourlyResponse({ startDate, endDate }) {
  const time = []
  const hourly = { time }
  for (const field of HOURLY_FIELDS) hourly[field] = []

  const dayCount = Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000)
  for (let dayOffset = 0; dayOffset <= dayCount; dayOffset++) {
    const date = addIsoDays(startDate, dayOffset)
    for (let hour = 0; hour < 24; hour++) {
      time.push(`${date}T${String(hour).padStart(2, '0')}:00`)
      hourly.temperature_2m.push(10 + hour)
      hourly.apparent_temperature.push(5 + hour)
      hourly.precipitation_probability.push(hour)
      hourly.precipitation.push(hour / 10)
      hourly.snowfall.push(hour / 100)
      hourly.weather_code.push(3)
      hourly.visibility.push(1000 + hour)
      hourly.wind_speed_10m.push(2 + hour / 10)
      hourly.wind_gusts_10m.push(4 + hour / 10)
      hourly.freezing_level_height.push(2500 + hour)
    }
  }

  return {
    timezone: 'Asia/Shanghai',
    hourly_units: { ...HOURLY_UNITS },
    hourly,
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

module.exports = {
  HOURLY_FIELDS,
  HOURLY_UNITS,
  clone,
  makeCatalogInput,
  makeHourlyResponse,
}
