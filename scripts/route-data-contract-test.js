const { BUILTIN_ROUTES } = require('../cloudfunctions/getAdvice/data/routes')
const { createRouteCatalog } = require('../cloudfunctions/getAdvice/domain/route-catalog')
const wutai = require('../cloudfunctions/getAdvice/data/catalog/pilots/wutai')
const wugongshanReverse = require('../cloudfunctions/getAdvice/data/catalog/pilots/wugongshan-reverse')
const siguniangErfeng = require('../cloudfunctions/getAdvice/data/catalog/pilots/siguniang-erfeng')
const yulongBlueMoonYunshanping = require('../cloudfunctions/getAdvice/data/catalog/pilots/yulong-blue-moon-yunshanping')
const gonggaLaoyulinYulongxi = require('../cloudfunctions/getAdvice/data/catalog/pilots/gongga-laoyulin-yulongxi')
const danglingHuluhaiZhuoyongcuo = require('../cloudfunctions/getAdvice/data/catalog/pilots/dangling-huluhai-zhuoyongcuo')
const osm16162196 = require('../cloudfunctions/getAdvice/data/catalog/osm-derived/16162196-sanganbi-shuizukeng')
const osm20072118 = require('../cloudfunctions/getAdvice/data/catalog/osm-derived/20072118-die-butterfly-trail')
const osm20046643 = require('../cloudfunctions/getAdvice/data/catalog/osm-derived/20046643-pinghui-wetland-trail')
const osm20739620 = require('../cloudfunctions/getAdvice/data/catalog/osm-derived/20739620-zhaogongshan-loop')
const osm17841828 = require('../cloudfunctions/getAdvice/data/catalog/osm-derived/17841828-three-gorges-summit')
const elevationSource = require('../cloudfunctions/getAdvice/data/catalog/osm-derived/elevation-source')
const { runWutaiTests } = require('./route-data/wutai.test')
const { runWugongshanReverseTests } = require('./route-data/wugongshan-reverse.test')
const { runSiguniangErfengTests } = require('./route-data/siguniang-erfeng.test')
const { runYulongBlueMoonYunshanpingTests } = require('./route-data/yulong-blue-moon-yunshanping.test')
const { runGonggaLaoyulinYulongxiTests } = require('./route-data/gongga-laoyulin-yulongxi.test')
const { runDanglingHuluhaiZhuoyongcuoTests } = require('./route-data/dangling-huluhai-zhuoyongcuo.test')
const { runOsmDerivedTests } = require('./route-data/osm-derived.test')

const PILOT_FRAGMENTS = [
  wutai,
  wugongshanReverse,
  siguniangErfeng,
  yulongBlueMoonYunshanping,
  gonggaLaoyulinYulongxi,
  danglingHuluhaiZhuoyongcuo,
  osm16162196,
  osm20072118,
  osm20046643,
  osm20739620,
  osm17841828,
  { sources: [elevationSource], places: [], routes: [], variants: [] },
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
  const placeIds = new Set(fragment.places.map((place) => place.id))
  const routeIds = new Set(fragment.routes.map((route) => route.id))
  const variantIds = new Set(fragment.variants.map((variant) => variant.id))
  return {
    ...catalog,
    sources: catalog.sources.filter((source) => sourceIds.has(source.id)),
    places: catalog.places.filter((place) => placeIds.has(place.id) || place.id.startsWith('place:legacy:')),
    routes: catalog.routes.filter((route) => routeIds.has(route.id)),
    variants: catalog.variants.filter((variant) => variantIds.has(variant.id)),
  }
}

async function main() {
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
  runGonggaLaoyulinYulongxiTests({
    catalog: createFragmentCatalogView(catalog, combineFragments([
      wutai,
      wugongshanReverse,
      siguniangErfeng,
      yulongBlueMoonYunshanping,
      gonggaLaoyulinYulongxi,
    ])),
    fragment: gonggaLaoyulinYulongxi,
  })
  runDanglingHuluhaiZhuoyongcuoTests({
    catalog: createFragmentCatalogView(catalog, combineFragments(PILOT_FRAGMENTS.slice(0, 6))),
    fragment: danglingHuluhaiZhuoyongcuo,
  })
  await runOsmDerivedTests({ catalog })
  console.log('PASS: I08/I09/I10a/I11/I12/I10c 试点路线数据契约')
}

main().catch((error) => {
  console.error('FAIL: ' + error.message)
  process.exitCode = 1
})
