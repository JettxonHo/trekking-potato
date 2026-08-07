const { BUILTIN_ROUTES } = require('../cloudfunctions/getAdvice/data/routes')
const { createRouteCatalog } = require('../cloudfunctions/getAdvice/domain/route-catalog')
const wutai = require('../cloudfunctions/getAdvice/data/catalog/pilots/wutai')
const wugongshanReverse = require('../cloudfunctions/getAdvice/data/catalog/pilots/wugongshan-reverse')
const siguniangErfeng = require('../cloudfunctions/getAdvice/data/catalog/pilots/siguniang-erfeng')
const yulongBlueMoonYunshanping = require('../cloudfunctions/getAdvice/data/catalog/pilots/yulong-blue-moon-yunshanping')
const gonggaLaoyulinYulongxi = require('../cloudfunctions/getAdvice/data/catalog/pilots/gongga-laoyulin-yulongxi')
const { runWutaiTests } = require('./route-data/wutai.test')
const { runWugongshanReverseTests } = require('./route-data/wugongshan-reverse.test')
const { runSiguniangErfengTests } = require('./route-data/siguniang-erfeng.test')
const { runYulongBlueMoonYunshanpingTests } = require('./route-data/yulong-blue-moon-yunshanping.test')
const { runGonggaLaoyulinYulongxiTests } = require('./route-data/gongga-laoyulin-yulongxi.test')

const PILOT_FRAGMENTS = [
  wutai,
  wugongshanReverse,
  siguniangErfeng,
  yulongBlueMoonYunshanping,
  gonggaLaoyulinYulongxi,
]

function combineFragments(fragments) {
  return fragments.reduce((combined, fragment) => ({
    sources: [...combined.sources, ...fragment.sources],
    places: [...combined.places, ...fragment.places],
    routes: [...combined.routes, ...fragment.routes],
    variants: [...combined.variants, ...fragment.variants],
  }), { sources: [], places: [], routes: [], variants: [] })
}

function createFragmentCatalogView(catalog, fragment) {
  const sourceIds = new Set(fragment.sources.map((source) => source.id))
  const routeIds = new Set(fragment.routes.map((route) => route.id))
  const variantIds = new Set(fragment.variants.map((variant) => variant.id))
  return {
    ...catalog,
    sources: catalog.sources.filter((source) => sourceIds.has(source.id)),
    routes: catalog.routes.filter((route) => routeIds.has(route.id)),
    variants: catalog.variants.filter((variant) => variantIds.has(variant.id)),
  }
}

function main() {
  const fragments = combineFragments(PILOT_FRAGMENTS)
  const catalog = createRouteCatalog({ legacyRecords: BUILTIN_ROUTES, ...fragments })

  runWutaiTests({
    catalog: createFragmentCatalogView(catalog, wutai),
    createRouteCatalog,
    fragment: wutai,
  })
  runWugongshanReverseTests({
    catalog: createFragmentCatalogView(catalog, combineFragments([wutai, wugongshanReverse])),
  })
  runSiguniangErfengTests({
    catalog: createFragmentCatalogView(catalog, combineFragments([
      wutai,
      wugongshanReverse,
      siguniangErfeng,
    ])),
  })
  runYulongBlueMoonYunshanpingTests({
    catalog: createFragmentCatalogView(catalog, combineFragments([
      wutai,
      wugongshanReverse,
      siguniangErfeng,
      yulongBlueMoonYunshanping,
    ])),
  })
  runGonggaLaoyulinYulongxiTests({ catalog, fragment: gonggaLaoyulinYulongxi })
  console.log('PASS: I08/I09/I10a/I11/I12 试点路线数据契约')
}

try {
  main()
} catch (error) {
  console.error('FAIL: ' + error.message)
  process.exitCode = 1
}
