const assert = require('node:assert/strict')

const {
  parseTrack,
  TrackParserError,
} = require('../cloudfunctions/trackSubmission/domain/track-parser')
const { projectReviewedGeometry } = require('../cloudfunctions/trackSubmission/domain/evidence-projection')

const GPX_NS = 'http://www.topografix.com/GPX/1/1'

function gpxDocument(points, extra = '') {
  const body = points.map((point) => {
    const elevation = point.elevation === undefined ? '' : `<ele>${point.elevation}</ele>`
    const time = point.time === undefined ? '' : `<time>${point.time}</time>`
    return `<trkpt lat="${point.lat}" lon="${point.lon}">${elevation}${time}</trkpt>`
  }).join('')
  return `<?xml version="1.0" encoding="UTF-8"?><gpx xmlns="${GPX_NS}"><metadata>${extra}</metadata><trk><trkseg>${body}</trkseg></trk></gpx>`
}

function gpxSegmentsDocument(segments) {
  const body = segments.map((points) => {
    const pointsXml = points.map((point) => {
      const elevation = point.elevation === undefined ? '' : `<ele>${point.elevation}</ele>`
      const time = point.time === undefined ? '' : `<time>${point.time}</time>`
      return `<trkpt lat="${point.lat}" lon="${point.lon}">${elevation}${time}</trkpt>`
    }).join('')
    return `<trkseg>${pointsXml}</trkseg>`
  }).join('')
  return `<?xml version="1.0" encoding="UTF-8"?><gpx xmlns="${GPX_NS}"><trk>${body}</trk></gpx>`
}

function kmlLineStringDocument(points) {
  const coordinates = points.map((point) => `${point.lon},${point.lat}`).join(' ')
  return `<kml xmlns="http://www.opengis.net/kml/2.2"><LineString><coordinates>${coordinates}</coordinates></LineString></kml>`
}

function gxTrackDocument(points) {
  const values = points.map((point) => `<when>2024-01-01T00:00:00Z</when><gx:coord>${point.lon} ${point.lat} 1000</gx:coord>`).join('')
  return `<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2"><gx:Track>${values}</gx:Track></kml>`
}

function expectError(input, options, code) {
  assert.throws(
    () => parseTrack(input, options),
    (error) => error instanceof TrackParserError && error.code === code,
    `expected parser error ${code}`,
  )
}

function pointList(count, offset = 0) {
  return Array.from({ length: count }, (_, index) => ({
    lat: (30 + offset + index / 100000).toFixed(8),
    lon: (100 + offset + index / 100000).toFixed(8),
  }))
}

function run() {
  const timestamp = '2024-01-01T00:00:00Z'
  const gpx = `\uFEFF${gpxDocument([
    { lat: 30, lon: 100, elevation: '1000.04', time: timestamp },
    { lat: 30.001, lon: 100.001, elevation: '1010.06', time: '2024-01-01T01:00:00+00:00' },
  ], '<name>metadata is ignored</name>')}`
  const gpxSummary = parseTrack(gpx, { format: 'gpx' })
  assert.deepEqual(Object.keys(gpxSummary).sort(), [
    'bounds', 'distanceM', 'elevation', 'end', 'format', 'hasTimestamps', 'pointCount',
    'previewSegments', 'segmentCount', 'start', 'summaryVersion',
  ].sort())
  assert.equal(gpxSummary.summaryVersion, 'track-summary-v1')
  assert.equal(gpxSummary.format, 'gpx')
  assert.equal(gpxSummary.pointCount, 2)
  assert.equal(gpxSummary.segmentCount, 1)
  assert.equal(gpxSummary.hasTimestamps, true)
  assert.deepEqual(gpxSummary.start, { lat: 30, lon: 100, elevationM: 1000 })
  assert.deepEqual(gpxSummary.end, { lat: 30.001, lon: 100.001, elevationM: 1010.1 })
  assert.deepEqual(gpxSummary.bounds, { minLat: 30, maxLat: 30.001, minLon: 100, maxLon: 100.001 })
  assert.equal(gpxSummary.elevation.coverage, 1)
  assert.equal(gpxSummary.elevation.presentPointCount, 2)
  assert.equal(gpxSummary.elevation.minM, 1000)
  assert.equal(gpxSummary.elevation.maxM, 1010.1)
  assert.equal(gpxSummary.previewSegments[0].points.length, 2)

  const gpxWithNonTrackGeometry = `<gpx xmlns="${GPX_NS}"><wpt lat="40" lon="110"/><rte><rtept lat="41" lon="111"/></rte><trk><trkseg><trkpt lat="30" lon="100"/><trkpt lat="30.001" lon="100.001"/></trkseg></trk></gpx>`
  assert.equal(parseTrack(gpxWithNonTrackGeometry, { format: 'gpx' }).pointCount, 2)
  expectError(`<gpx xmlns="${GPX_NS}"><metadata><trk><trkseg><trkpt lat="30" lon="100"/><trkpt lat="30" lon="100"/></trkseg></trk></metadata></gpx>`, { format: 'gpx' }, 'track_structure_unsupported')

  const lineString = '<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:x="urn:metadata"><Document><Placemark><name>x</name><LineString><tessellate>1</tessellate><coordinates>100,30,1000 100.01,30.01 100.02,30.02,1010</coordinates></LineString></Placemark><Placemark><LineString><coordinates>101,31 101.01,31.01</coordinates></LineString></Placemark></Document></kml>'
  const kmlSummary = parseTrack(lineString, { filename: 'route.KML' })
  assert.equal(kmlSummary.format, 'kml')
  assert.equal(kmlSummary.pointCount, 5)
  assert.equal(kmlSummary.segmentCount, 2)
  assert.equal(kmlSummary.hasTimestamps, false)
  assert.deepEqual(kmlSummary.previewSegments.map((segment) => segment.segmentIndex), [0, 1])
  assert.equal(kmlSummary.elevation.presentPointCount, 2)

  const gxTrack = '<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2"><Document><Placemark><gx:Track><when>2024-02-01T00:00:00Z</when><gx:coord>100 30 1000</gx:coord><when>2024-02-01T00:01:00Z</when><gx:coord>100.001 30.001 1001</gx:coord></gx:Track></Placemark></Document></kml>'
  const gxSummary = parseTrack(gxTrack, { format: 'kml' })
  assert.equal(gxSummary.pointCount, 2)
  assert.equal(gxSummary.segmentCount, 1)
  assert.equal(gxSummary.hasTimestamps, true)
  assert.deepEqual(gxSummary.start, { lat: 30, lon: 100, elevationM: 1000 })

  const knownDistance = parseTrack(gpxSegmentsDocument([[
    { lat: 0, lon: 0 },
    { lat: 0, lon: 1 },
  ]]), { format: 'gpx' })
  assert.equal(knownDistance.distanceM, 111195)
  const disconnectedDistance = parseTrack(gpxSegmentsDocument([
    [{ lat: 0, lon: 0 }, { lat: 0, lon: 1 }],
    [{ lat: 0, lon: 10 }, { lat: 0, lon: 11 }],
  ]), { format: 'gpx' })
  assert.equal(disconnectedDistance.distanceM, 222390)

  const rounded = parseTrack(gpxDocument([
    { lat: '30.1234564', lon: '100.1234564', elevation: '100.04' },
    { lat: '30.1234566', lon: '100.1234566', elevation: '101.06' },
  ]), { format: 'gpx' })
  assert.deepEqual(rounded.bounds, {
    minLat: 30.123456, maxLat: 30.123457, minLon: 100.123456, maxLon: 100.123457,
  })
  assert.deepEqual(rounded.start, { lat: 30.123456, lon: 100.123456, elevationM: 100 })
  assert.deepEqual(rounded.end, { lat: 30.123457, lon: 100.123457, elevationM: 101.1 })
  assert.deepEqual(rounded.elevation, { presentPointCount: 2, coverage: 1, minM: 100, maxM: 101.1 })

  const noElevation = parseTrack(gpxDocument([
    { lat: 0, lon: 0 },
    { lat: 0, lon: 1 },
  ]), { extension: '.gpx' })
  assert.equal(noElevation.elevation.presentPointCount, 0)
  assert.equal(noElevation.elevation.coverage, 0)
  assert.equal(noElevation.elevation.minM, null)
  assert.equal(noElevation.elevation.maxM, null)

  const sampled = parseTrack(gpxDocument(pointList(600)), { format: 'gpx' })
  assert.equal(sampled.previewSegments.length, 1)
  assert.equal(sampled.previewSegments[0].points.length, 500)
  assert.deepEqual(sampled.previewSegments[0].points[0], { lat: 30, lon: 100, elevationM: null })
  assert.deepEqual(sampled.previewSegments[0].points[499], { lat: 30.00599, lon: 100.00599, elevationM: null })
  const sampledInteriorIndices = sampled.previewSegments[0].points
    .map((point) => Math.round((point.lat - 30) * 100000))
  const expectedSampledIndices = [
    0,
    ...Array.from({ length: 498 }, (_, index) => 1 + Math.floor(index * 597 / 497)),
    599,
  ]
  assert.deepEqual(sampledInteriorIndices, expectedSampledIndices)

  const endpointSegments = Array.from({ length: 200 }, (_, index) => [
    { lat: 10 + index / 1000, lon: 20 + index / 1000 },
    { lat: 10.0001 + index / 1000, lon: 20.0001 + index / 1000 },
  ])
  const endpointSummary = parseTrack(gpxSegmentsDocument(endpointSegments), { format: 'gpx' })
  assert.equal(endpointSummary.pointCount, 400)
  assert.equal(endpointSummary.segmentCount, 200)
  assert.equal(endpointSummary.previewSegments.length, 200)
  assert.equal(endpointSummary.previewSegments.reduce((total, segment) => total + segment.points.length, 0), 400)
  assert.equal(endpointSummary.previewSegments.every((segment) => segment.points.length === 2), true)

  const reviewed = projectReviewedGeometry(gpxSummary)
  assert.deepEqual(Object.keys(reviewed).sort(), [
    'summaryVersion', 'pointCount', 'segmentCount', 'bounds', 'start', 'end', 'distanceM', 'elevation',
    'previewSegments',
  ].sort())
  assert.deepEqual(Object.keys(reviewed.bounds).sort(), ['minLat', 'maxLat', 'minLon', 'maxLon'].sort())
  assert.deepEqual(Object.keys(reviewed.start).sort(), ['lat', 'lon', 'elevationM'].sort())
  assert.deepEqual(Object.keys(reviewed.end).sort(), ['lat', 'lon', 'elevationM'].sort())
  assert.deepEqual(Object.keys(reviewed.elevation).sort(), ['presentPointCount', 'coverage', 'minM', 'maxM'].sort())
  assert.deepEqual(Object.keys(reviewed.previewSegments[0]).sort(), ['segmentIndex', 'points'].sort())
  assert.deepEqual(Object.keys(reviewed.previewSegments[0].points[0]).sort(), ['lat', 'lon', 'elevationM'].sort())
  assert.equal(Object.prototype.hasOwnProperty.call(reviewed, 'hasTimestamps'), false)
  assert.equal(JSON.stringify(reviewed).includes('2024-01-01'), false)
  assert.equal(JSON.stringify(reviewed).includes('owner'), false)
  reviewed.bounds.minLat = -1
  assert.equal(gpxSummary.bounds.minLat, 30)

  expectError(gpxDocument([{ lat: 30, lon: 100 }]), { format: 'gpx' }, 'track_points_invalid')
  expectError(gpxDocument([{ lat: 30, lon: 100 }, { lat: 30, lon: 100 }]).replace('</gpx>', ''), { format: 'gpx' }, 'malformed_xml')
  expectError('<!DOCTYPE gpx [ <!ENTITY x "x"> ]>' + gpxDocument([
    { lat: 30, lon: 100 }, { lat: 30, lon: 100 },
  ]), { format: 'gpx' }, 'unsafe_xml')
  expectError(gpxDocument([{ lat: 30, lon: 100 }, { lat: 30, lon: 100 }]).replace('encoding="UTF-8"', 'encoding="UTF-16"'), { format: 'gpx' }, 'invalid_encoding')
  expectError(Buffer.from([0xc3, 0x28]), { format: 'gpx' }, 'invalid_encoding')
  expectError(Buffer.alloc(10 * 1024 * 1024 + 1, 0x20), { format: 'gpx' }, 'track_size_exceeded')
  expectError(gpxDocument([{ lat: 30, lon: 100 }, { lat: 30, lon: 100 }]), { format: 'kml' }, 'unsupported_format')
  expectError('<kml xmlns="http://www.opengis.net/kml/2.2"><Point><coordinates>100,30</coordinates></Point></kml>', { format: 'kml' }, 'track_structure_unsupported')
  expectError('<kml xmlns="http://www.opengis.net/kml/2.2"><NetworkLink><Link><href>https://example.test</href></Link></NetworkLink></kml>', { format: 'kml' }, 'track_structure_unsupported')
  expectError('<kml xmlns="http://www.opengis.net/kml/2.2"><Track><coordinates>100,30 100.1,30.1</coordinates></Track></kml>', { format: 'kml' }, 'track_structure_unsupported')
  expectError('<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2"><gx:MultiTrack><gx:Track><when>2024-01-01T00:00:00Z</when><gx:coord>100 30 1000</gx:coord><when>2024-01-01T00:01:00Z</when><gx:coord>100.1 30.1 1001</gx:coord></gx:Track></gx:MultiTrack></kml>', { format: 'kml' }, 'track_structure_unsupported')
  expectError('<kml xmlns="http://www.opengis.net/kml/2.2"><LineString><coordinates>100,30 100.1,NaN</coordinates></LineString></kml>', { format: 'kml' }, 'invalid_coordinate')
  expectError(gpxDocument([{ lat: 90.1, lon: 100 }, { lat: 30, lon: 100 }]), { format: 'gpx' }, 'invalid_coordinate')
  expectError(gpxDocument([{ lat: 30, lon: 100, elevation: 'Infinity' }, { lat: 30, lon: 100 }]), { format: 'gpx' }, 'invalid_elevation')
  expectError(gpxDocument([{ lat: 30, lon: 100 }, { lat: 30, lon: 100, time: 'not-a-time' }]), { format: 'gpx' }, 'invalid_timestamp')
  expectError('<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2"><gx:Track><when>2024-01-01T00:00:00Z</when><gx:coord>100 30 1000</gx:coord><when>2024-01-01T00:01:00Z</when></gx:Track></kml>', { format: 'kml' }, 'track_pairing_invalid')
  expectError('<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2"><gx:Track><x:when xmlns:x="urn:wrong">2024-01-01T00:00:00Z</x:when><gx:coord>100 30 1000</gx:coord><gx:coord>100.1 30.1 1001</gx:coord></gx:Track></kml>', { format: 'kml' }, 'track_structure_unsupported')
  expectError('<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2"><gx:Track><when>2024-01-01T00:00:00Z</when><gx:coord>100 30</gx:coord></gx:Track></kml>', { format: 'kml' }, 'invalid_coordinate')

  const deep = `<gpx xmlns="${GPX_NS}">${'<x>'.repeat(64)}<trk><trkseg><trkpt lat="30" lon="100"/><trkpt lat="30" lon="100"/></trkseg></trk>${'</x>'.repeat(64)}</gpx>`
  expectError(deep, { format: 'gpx' }, 'xml_depth_exceeded')

  const manySegments = `<gpx xmlns="${GPX_NS}"><trk>${Array.from({ length: 201 }, () => '<trkseg><trkpt lat="30" lon="100"/></trkseg>').join('')}</trk></gpx>`
  expectError(manySegments, { format: 'gpx' }, 'track_segments_exceeded')

  const exactlyMax = parseTrack(gpxDocument(pointList(50000)), { format: 'gpx' })
  assert.equal(exactlyMax.pointCount, 50000)
  expectError(gpxDocument(pointList(50001)), { format: 'gpx' }, 'track_points_exceeded')

  const kmlExactlyMax = parseTrack(kmlLineStringDocument(pointList(50000)), { format: 'kml' })
  assert.equal(kmlExactlyMax.pointCount, 50000)
  expectError(kmlLineStringDocument(pointList(50001)), { format: 'kml' }, 'track_points_exceeded')
  const kmlCoordinatePrefix = pointList(50000).map((point) => `${point.lon},${point.lat}`).join(' ')
  expectError(`<kml xmlns="http://www.opengis.net/kml/2.2"><LineString><coordinates>${kmlCoordinatePrefix} 100.1,30.1 bad</coordinates></LineString></kml>`, { format: 'kml' }, 'track_points_exceeded')
  const gxExactlyMax = parseTrack(gxTrackDocument(pointList(50000)), { format: 'kml' })
  assert.equal(gxExactlyMax.pointCount, 50000)
  expectError(gxTrackDocument(pointList(50001)), { format: 'kml' }, 'track_points_exceeded')
  const gxValuePrefix = pointList(50000).map((point) => `<when>2024-01-01T00:00:00Z</when><gx:coord>${point.lon} ${point.lat} 1000</gx:coord>`).join('')
  expectError(`<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2"><gx:Track>${gxValuePrefix}<when>2024-01-01T00:00:00Z</when><gx:coord>100.1 30.1 1000</gx:coord><when>2024-01-01T00:00:00Z</when><gx:coord>bad</gx:coord></gx:Track></kml>`, { format: 'kml' }, 'track_points_exceeded')

  expectError(gpxDocument([{ lat: 30, lon: 100, elevation: '1'.repeat(257) }, { lat: 30, lon: 100 }]), { format: 'gpx' }, 'track_scalar_exceeded')
  console.log('PASS: C01 parser/projection contract (GPX, KML, gx:Track, limits, safety, sampling, privacy)')
}

run()
