const { BUILTIN_ROUTES } = require('../cloudfunctions/getAdvice/data/routes')
const { createRouteCatalog } = require('../cloudfunctions/getAdvice/domain/route-catalog')
const wutai = require('../cloudfunctions/getAdvice/data/catalog/pilots/wutai')
const { runWutaiTests } = require('./route-data/wutai.test')

const PILOT_FRAGMENTS = [wutai]

function combineFragments(fragments) {
  return fragments.reduce((combined, fragment) => ({
    sources: [...combined.sources, ...fragment.sources],
    places: [...combined.places, ...fragment.places],
    routes: [...combined.routes, ...fragment.routes],
    variants: [...combined.variants, ...fragment.variants],
  }), { sources: [], places: [], routes: [], variants: [] })
}

function main() {
  const fragments = combineFragments(PILOT_FRAGMENTS)
  const catalog = createRouteCatalog({ legacyRecords: BUILTIN_ROUTES, ...fragments })

  runWutaiTests({ catalog, createRouteCatalog, fragment: wutai })
  console.log('PASS: I10a 试点路线数据契约')
}

try {
  main()
} catch (error) {
  console.error('FAIL: ' + error.message)
  process.exitCode = 1
}
