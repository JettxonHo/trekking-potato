function clonePoint(point) {
  return {
    lat: point.lat,
    lon: point.lon,
    elevationM: point.elevationM,
  }
}

function projectReviewedGeometry(summary) {
  if (!summary || typeof summary !== 'object') {
    throw new TypeError('TrackSummary is required')
  }
  return {
    summaryVersion: summary.summaryVersion,
    pointCount: summary.pointCount,
    segmentCount: summary.segmentCount,
    bounds: {
      minLat: summary.bounds.minLat,
      maxLat: summary.bounds.maxLat,
      minLon: summary.bounds.minLon,
      maxLon: summary.bounds.maxLon,
    },
    start: clonePoint(summary.start),
    end: clonePoint(summary.end),
    distanceM: summary.distanceM,
    elevation: {
      presentPointCount: summary.elevation.presentPointCount,
      coverage: summary.elevation.coverage,
      minM: summary.elevation.minM,
      maxM: summary.elevation.maxM,
    },
    previewSegments: summary.previewSegments.map((segment) => ({
      segmentIndex: segment.segmentIndex,
      points: segment.points.map(clonePoint),
    })),
  }
}

module.exports = {
  projectReviewedGeometry,
}
