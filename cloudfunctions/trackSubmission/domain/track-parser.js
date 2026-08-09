const { SaxesParser } = require('saxes')

const MAX_BYTES = 10 * 1024 * 1024
const MAX_POINTS = 50000
const MAX_SEGMENTS = 200
const MAX_DEPTH = 64
const MAX_SCALAR_UNITS = 256
const MAX_PREVIEW_POINTS = 500
const EARTH_RADIUS_M = 6371008.8

const GPX_NAMESPACES = new Set([
  'http://www.topografix.com/GPX/1/0',
  'http://www.topografix.com/GPX/1/1',
])
const KML_NAMESPACE = 'http://www.opengis.net/kml/2.2'
const GX_NAMESPACE = 'http://www.google.com/kml/ext/2.2'
const KML_UNSUPPORTED_GEOMETRY = new Set([
  'GroundOverlay',
  'LinearRing',
  'Model',
  'MultiGeometry',
  'MultiTrack',
  'NetworkLink',
  'PhotoOverlay',
  'Point',
  'Polygon',
  'Track',
])
const NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/
const RFC3339_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/

class TrackParserError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'TrackParserError'
    this.code = code
  }
}

function fail(code, message) {
  throw new TrackParserError(code, message)
}

function asBuffer(input) {
  if (Buffer.isBuffer(input)) return input
  if (input instanceof Uint8Array) return Buffer.from(input)
  if (typeof input === 'string') return Buffer.from(input, 'utf8')
  if (input && typeof input === 'object') {
    const nested = input.bytes || input.buffer || input.data
    if (nested !== undefined) return asBuffer(nested)
  }
  fail('invalid_input', 'Track input must be UTF-8 XML bytes')
}

function normalizeFormat(options, input) {
  const candidate = typeof options === 'string' ? options : options && (options.format || options.extension)
  let format = candidate
  if (!format && options && typeof options === 'object' && typeof options.filename === 'string') {
    const match = /\.([^.]+)$/.exec(options.filename.trim())
    format = match && match[1]
  }
  if (!format && input && typeof input === 'object' && typeof input.filename === 'string') {
    const match = /\.([^.]+)$/.exec(input.filename.trim())
    format = match && match[1]
  }
  if (typeof format === 'string') format = format.replace(/^\./, '').toLowerCase()
  if (format !== 'gpx' && format !== 'kml') {
    fail('unsupported_format', 'A .gpx or .kml format is required')
  }
  return format
}

function decodeUtf8(bytes) {
  if (bytes.length === 0) fail('invalid_encoding', 'Track XML is empty')
  if (bytes.length > MAX_BYTES) fail('track_size_exceeded', 'Track file exceeds 10 MiB')
  for (const byte of bytes) {
    if (byte === 0) fail('invalid_encoding', 'Only UTF-8 XML without NUL bytes is accepted')
  }

  const declaration = bytes.subarray(0, 512).toString('latin1')
  const encoding = /<\?xml\b[^>]*\bencoding\s*=\s*["']([^"']+)["']/i.exec(declaration)
  if (encoding && encoding[1].toLowerCase() !== 'utf-8') {
    fail('invalid_encoding', 'Only UTF-8 XML is accepted')
  }

  let text
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch (error) {
    fail('invalid_encoding', 'Only valid UTF-8 XML is accepted')
  }
  if (text.includes('\u0000')) fail('invalid_encoding', 'Only UTF-8 XML without NUL bytes is accepted')
  if (/<!\s*doctype\b/i.test(text) || /<!\s*entity\b/i.test(text)) {
    fail('unsafe_xml', 'DTD and ENTITY declarations are not accepted')
  }
  return text
}

function numericToken(value) {
  const token = String(value).trim()
  if (!NUMBER_PATTERN.test(token)) return null
  const number = Number(token)
  return Number.isFinite(number) ? number : null
}

function coordinate(latitude, longitude, elevation = null) {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    fail('invalid_coordinate', 'Latitude must be finite and within [-90, 90]')
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    fail('invalid_coordinate', 'Longitude must be finite and within [-180, 180]')
  }
  if (elevation !== null && !Number.isFinite(elevation)) {
    fail('invalid_elevation', 'Elevation must be finite')
  }
  return { lat: latitude, lon: longitude, elevationM: elevation }
}

function parseNumber(value, code = 'invalid_coordinate') {
  const number = numericToken(value)
  if (number === null) fail(code, 'Coordinate values must be finite numbers')
  return number
}

function parseRfc3339(value) {
  const text = value.trim()
  const match = RFC3339_PATTERN.exec(text)
  if (!match) fail('invalid_timestamp', 'Timestamps must be RFC-3339 values')
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth || hour > 23 || minute > 59 || second > 59) {
    fail('invalid_timestamp', 'Timestamps must be valid RFC-3339 values')
  }
  if (!Number.isFinite(Date.parse(text))) fail('invalid_timestamp', 'Timestamps must be valid RFC-3339 values')
  return text
}

function attributeValue(tag, localName) {
  const attributes = tag.attributes || {}
  for (const attribute of Object.values(attributes)) {
    if (attribute.local === localName && attribute.uri === '') return attribute.value
  }
  return undefined
}

function hasAncestor(stack, predicate) {
  return stack.some(predicate)
}

function parseLineCoordinates(text, onPoint) {
  const points = []
  const tokenPattern = /\S+/g
  let tokenMatch
  while ((tokenMatch = tokenPattern.exec(text)) !== null) {
    const token = tokenMatch[0]
    const fields = token.split(',')
    if (fields.length !== 2 && fields.length !== 3) {
      fail('invalid_coordinate', 'LineString coordinates must be lon,lat[,elevation] tuples')
    }
    const longitude = parseNumber(fields[0])
    const latitude = parseNumber(fields[1])
    const elevation = fields.length === 3 ? parseNumber(fields[2], 'invalid_elevation') : null
    const point = coordinate(latitude, longitude, elevation)
    onPoint()
    points.push(point)
  }
  if (points.length === 0) fail('invalid_track', 'LineString coordinates cannot be empty')
  return points
}

function parseGxCoordinate(text) {
  const fields = text.trim().split(/\s+/)
  if (fields.length !== 3) fail('invalid_coordinate', 'gx:coord must contain lon lat elevation')
  const longitude = parseNumber(fields[0])
  const latitude = parseNumber(fields[1])
  const elevation = parseNumber(fields[2], 'invalid_elevation')
  return coordinate(latitude, longitude, elevation)
}

function round(value, places) {
  const factor = 10 ** places
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor
  return Object.is(rounded, -0) ? 0 : rounded
}

function haversine(first, second) {
  const toRadians = (degrees) => degrees * (Math.PI / 180)
  const latitudeDelta = toRadians(second.lat - first.lat)
  const longitudeDelta = toRadians(second.lon - first.lon)
  const firstLatitude = toRadians(first.lat)
  const secondLatitude = toRadians(second.lat)
  const a = (Math.sin(latitudeDelta / 2) ** 2)
    + (Math.sin(longitudeDelta / 2) ** 2 * Math.cos(firstLatitude) * Math.cos(secondLatitude))
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function previewSegments(segments) {
  const selected = new Set()
  const interior = []
  let order = 0
  segments.forEach((segment, segmentIndex) => {
    if (segment.length === 1) {
      selected.add(`${segmentIndex}:0`)
    } else if (segment.length > 1) {
      selected.add(`${segmentIndex}:0`)
      selected.add(`${segmentIndex}:${segment.length - 1}`)
      for (let pointIndex = 1; pointIndex < segment.length - 1; pointIndex += 1) {
        interior.push({ segmentIndex, pointIndex, order })
        order += 1
      }
    }
  })

  const endpointCount = selected.size
  const remaining = MAX_PREVIEW_POINTS - endpointCount
  if (remaining > 0 && interior.length <= remaining) {
    interior.forEach((item) => selected.add(`${item.segmentIndex}:${item.pointIndex}`))
  } else if (remaining > 0 && interior.length > 0) {
    if (remaining === 1) {
      const item = interior[Math.floor((interior.length - 1) / 2)]
      selected.add(`${item.segmentIndex}:${item.pointIndex}`)
    } else {
      for (let index = 0; index < remaining; index += 1) {
        const selectedInteriorIndex = Math.floor(index * (interior.length - 1) / (remaining - 1))
        const item = interior[selectedInteriorIndex]
        selected.add(`${item.segmentIndex}:${item.pointIndex}`)
      }
    }
  }

  return segments.map((segment, segmentIndex) => {
    const points = segment
      .map((point, pointIndex) => ({ point, pointIndex }))
      .filter(({ pointIndex }) => selected.has(`${segmentIndex}:${pointIndex}`))
      .map(({ point }) => ({
        lat: round(point.lat, 6),
        lon: round(point.lon, 6),
        elevationM: point.elevationM === null ? null : round(point.elevationM, 1),
      }))
    return { segmentIndex, points }
  }).filter((segment) => segment.points.length > 0)
}

function summarize(format, segments, hasTimestamps) {
  const points = segments.flat()
  if (points.length < 2) fail('track_points_invalid', 'A track must contain 2 to 50,000 points')
  if (points.length > MAX_POINTS) fail('track_points_exceeded', 'A track may contain at most 50,000 points')
  if (segments.length === 0 || segments.length > MAX_SEGMENTS) {
    fail('track_segments_invalid', 'A track must contain 1 to 200 segments')
  }

  const latitudes = points.map((point) => point.lat)
  const longitudes = points.map((point) => point.lon)
  const elevations = points.map((point) => point.elevationM).filter((elevation) => elevation !== null)
  let distance = 0
  segments.forEach((segment) => {
    for (let index = 1; index < segment.length; index += 1) distance += haversine(segment[index - 1], segment[index])
  })

  return {
    summaryVersion: 'track-summary-v1',
    format,
    pointCount: points.length,
    segmentCount: segments.length,
    bounds: {
      minLat: round(Math.min(...latitudes), 6),
      maxLat: round(Math.max(...latitudes), 6),
      minLon: round(Math.min(...longitudes), 6),
      maxLon: round(Math.max(...longitudes), 6),
    },
    start: {
      lat: round(points[0].lat, 6),
      lon: round(points[0].lon, 6),
      elevationM: points[0].elevationM === null ? null : round(points[0].elevationM, 1),
    },
    end: {
      lat: round(points[points.length - 1].lat, 6),
      lon: round(points[points.length - 1].lon, 6),
      elevationM: points[points.length - 1].elevationM === null
        ? null
        : round(points[points.length - 1].elevationM, 1),
    },
    distanceM: Math.round(distance),
    elevation: {
      presentPointCount: elevations.length,
      coverage: round(elevations.length / points.length, 4),
      minM: elevations.length ? round(Math.min(...elevations), 1) : null,
      maxM: elevations.length ? round(Math.max(...elevations), 1) : null,
    },
    hasTimestamps: Boolean(hasTimestamps),
    previewSegments: previewSegments(segments),
  }
}

function parseTrack(input, suppliedOptions = {}) {
  const options = input && typeof input === 'object' && !Buffer.isBuffer(input) && !(input instanceof Uint8Array)
    ? { ...input, ...(typeof suppliedOptions === 'string' ? { format: suppliedOptions } : suppliedOptions) }
    : suppliedOptions
  const bytes = asBuffer(input && typeof input === 'object' && !Buffer.isBuffer(input) && !(input instanceof Uint8Array)
    ? (input.bytes || input.buffer || input.data)
    : input)
  const format = normalizeFormat(options, input)
  const text = decodeUtf8(bytes)
  const segments = []
  const stack = []
  let root = null
  let hasTimestamps = false
  let sawRoot = false
  let pointCount = 0

  function reservePoint() {
    pointCount += 1
    if (pointCount > MAX_POINTS) fail('track_points_exceeded', 'A track may contain at most 50,000 points')
  }

  function addSegment(segment) {
    if (segment.length === 0) fail('invalid_track', 'Track segments cannot be empty')
    if (segments.length >= MAX_SEGMENTS) fail('track_segments_exceeded', 'A track may contain at most 200 segments')
    segments.push(segment)
  }

  function addPoint(segment, point) {
    reservePoint()
    segment.push(point)
  }

  function currentPoint() {
    for (let index = stack.length - 1; index >= 0; index -= 1) {
      if (stack[index].kind === 'gpx-point') return stack[index]
    }
    return null
  }

  function currentGpxSegment() {
    for (let index = stack.length - 1; index >= 0; index -= 1) {
      if (stack[index].kind === 'gpx-segment') return stack[index]
    }
    return null
  }

  const parser = new SaxesParser({ xmlns: true, fragment: false })
  parser.on('error', (error) => {
    throw new TrackParserError('malformed_xml', error.message)
  })
  parser.on('opentag', (tag) => {
    if (stack.length >= MAX_DEPTH) fail('xml_depth_exceeded', 'XML nesting depth exceeds 64')

    if (!sawRoot) {
      sawRoot = true
      root = tag
      if (format === 'gpx' && !(tag.local === 'gpx' && GPX_NAMESPACES.has(tag.uri))) {
        fail('unsupported_format', 'The file extension and XML root do not match')
      }
      if (format === 'kml' && !(tag.local === 'kml' && tag.uri === KML_NAMESPACE)) {
        fail('unsupported_format', 'The file extension and XML root do not match')
      }
    }

    const parent = stack[stack.length - 1]
    if (parent && parent.capture) fail('track_structure_unsupported', 'Supported scalar elements cannot contain child elements')

    const frame = { tag, kind: 'ignored', text: null, capture: false }
    if (format === 'gpx') {
      const isGpx = tag.uri === root.uri
      if (tag.local === 'trk' && isGpx) {
        if (!parent || parent.tag.local !== 'gpx' || parent.tag.uri !== root.uri) {
          fail('track_structure_unsupported', 'trk must be a direct child of gpx')
        }
        frame.kind = 'gpx-track'
      } else if (tag.local === 'trkseg' && isGpx) {
        if (!parent || parent.kind !== 'gpx-track') {
          fail('track_structure_unsupported', 'trkseg must be inside trk')
        }
        frame.kind = 'gpx-segment'
        frame.segment = []
      } else if (tag.local === 'trkpt' && isGpx) {
        if (!parent || parent.kind !== 'gpx-segment') {
          fail('track_structure_unsupported', 'trkpt must be inside trkseg')
        }
        const latitude = parseNumber(attributeValue(tag, 'lat'))
        const longitude = parseNumber(attributeValue(tag, 'lon'))
        frame.kind = 'gpx-point'
        frame.point = coordinate(latitude, longitude)
      } else if ((tag.local === 'ele' || tag.local === 'time') && isGpx && parent && parent.kind === 'gpx-point') {
        if (parent[tag.local] !== undefined) fail('track_structure_unsupported', `${tag.local} may appear only once`)
        frame.kind = tag.local === 'ele' ? 'gpx-ele' : 'gpx-time'
        frame.text = ''
        frame.capture = true
      }
    } else {
      if ((tag.uri === KML_NAMESPACE && KML_UNSUPPORTED_GEOMETRY.has(tag.local))
        || (tag.uri === GX_NAMESPACE && tag.local === 'MultiTrack')) {
        fail('track_structure_unsupported', `KML ${tag.local} geometry is not supported`)
      }
      if (tag.uri === KML_NAMESPACE && tag.local === 'LineString') {
        if (hasAncestor(stack, (ancestor) => ancestor.kind === 'kml-line' || ancestor.kind === 'kml-gx-track')) {
          fail('track_structure_unsupported', 'Nested KML geometries are not supported')
        }
        frame.kind = 'kml-line'
        frame.coordinatesSeen = false
        frame.segment = null
      } else if (tag.uri === KML_NAMESPACE && tag.local === 'coordinates') {
        if (!parent || parent.kind !== 'kml-line' || parent.coordinatesSeen) {
          fail('track_structure_unsupported', 'coordinates must be inside one LineString')
        }
        parent.coordinatesSeen = true
        frame.kind = 'kml-coordinates'
        frame.text = ''
        frame.capture = true
      } else if (tag.uri === GX_NAMESPACE && tag.local === 'Track') {
        if (hasAncestor(stack, (ancestor) => ancestor.kind === 'kml-line' || ancestor.kind === 'kml-gx-track')) {
          fail('track_structure_unsupported', 'Nested KML geometries are not supported')
        }
        frame.kind = 'kml-gx-track'
        frame.whens = []
        frame.coords = []
      } else if (tag.uri === KML_NAMESPACE && tag.local === 'when' && parent && parent.kind === 'kml-gx-track') {
        frame.kind = 'gx-when'
        frame.text = ''
        frame.capture = true
      } else if (tag.local === 'when' && parent && parent.kind === 'kml-gx-track') {
        fail('track_structure_unsupported', 'gx:Track when values must use the KML namespace')
      } else if (tag.uri === GX_NAMESPACE && tag.local === 'coord' && parent && parent.kind === 'kml-gx-track') {
        frame.kind = 'gx-coord'
        frame.text = ''
        frame.capture = true
      } else if (tag.uri === KML_NAMESPACE && tag.local === 'coordinates') {
        fail('track_structure_unsupported', 'coordinates outside LineString are not supported')
      } else if (tag.uri === GX_NAMESPACE && tag.local === 'coord') {
        fail('track_structure_unsupported', 'gx:coord outside gx:Track is not supported')
      }
    }

    stack.push(frame)
  })
  parser.on('text', (textChunk) => {
    const frame = stack[stack.length - 1]
    if (!frame || !frame.capture) return
    frame.text += textChunk
    if (frame.kind !== 'kml-coordinates' && frame.text.length > MAX_SCALAR_UNITS) {
      fail('track_scalar_exceeded', 'Track scalar values are limited to 256 UTF-16 code units')
    }
  })
  parser.on('closetag', (tag) => {
    const frame = stack.pop()
    if (!frame) fail('malformed_xml', 'Unexpected XML closing tag')
    if (format === 'gpx') {
      if (frame.kind === 'gpx-ele') {
        const point = currentPoint()
        const elevation = parseNumber(frame.text.trim(), 'invalid_elevation')
        point.point.elevationM = elevation
        point.ele = true
      } else if (frame.kind === 'gpx-time') {
        const point = currentPoint()
        parseRfc3339(frame.text)
        point.time = true
        hasTimestamps = true
      } else if (frame.kind === 'gpx-point') {
        const segment = currentGpxSegment()
        addPoint(segment.segment, frame.point)
      } else if (frame.kind === 'gpx-segment') {
        addSegment(frame.segment)
      }
    } else if (frame.kind === 'kml-coordinates') {
      frame.parent = stack[stack.length - 1]
      frame.parent.segment = parseLineCoordinates(frame.text, reservePoint)
    } else if (frame.kind === 'kml-line') {
      if (!frame.coordinatesSeen || !frame.segment) fail('invalid_track', 'LineString must contain coordinates')
      addSegment(frame.segment)
    } else if (frame.kind === 'gx-when') {
      const track = stack[stack.length - 1]
      track.whens.push(parseRfc3339(frame.text))
    } else if (frame.kind === 'gx-coord') {
      const track = stack[stack.length - 1]
      reservePoint()
      track.coords.push(parseGxCoordinate(frame.text))
    } else if (frame.kind === 'kml-gx-track') {
      if (frame.whens.length === 0 || frame.coords.length === 0 || frame.whens.length !== frame.coords.length) {
        fail('track_pairing_invalid', 'gx:Track requires paired when and gx:coord values')
      }
      hasTimestamps = true
      addSegment(frame.coords)
    }
    if (tag && frame.tag && (tag.local !== frame.tag.local || tag.uri !== frame.tag.uri)) {
      fail('malformed_xml', 'Unexpected XML closing tag')
    }
  })

  try {
    parser.write(text).close()
  } catch (error) {
    if (error instanceof TrackParserError) throw error
    fail('malformed_xml', error.message)
  }
  if (!sawRoot) fail('malformed_xml', 'XML document has no root element')
  if (stack.length !== 0) fail('malformed_xml', 'XML document is not balanced')
  return summarize(format, segments, hasTimestamps)
}

module.exports = {
  TrackParserError,
  parseTrack,
}
