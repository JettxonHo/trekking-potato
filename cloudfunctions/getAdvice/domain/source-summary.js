/**
 * Pure projection from validated Source records to the display-safe DTO.
 *
 * Catalog lookup belongs to the resolver.  This module intentionally has no
 * production-catalog import and no I/O seam.
 */
function summarizeSource(source) {
  if (!source || typeof source !== 'object') throw new TypeError('Source record required')
  return {
    id: source.id,
    tier: source.tier,
    kind: source.kind,
    title: source.title,
    publisher: source.publisher,
    url: source.url,
    checkedAt: source.checkedAt,
  }
}

function summarizeSources(sources) {
  if (!Array.isArray(sources)) throw new TypeError('Source records required')
  return sources.map(summarizeSource)
}

module.exports = {
  summarizeSource,
  summarizeSources,
  projectSourceSummary: summarizeSource,
}
