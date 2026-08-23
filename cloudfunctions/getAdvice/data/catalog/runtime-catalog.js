const { BUILTIN_ROUTES } = require('../routes')
const { createRouteCatalog } = require('../../domain/route-catalog')
const wutai = require('./pilots/wutai')
const wugongshanReverse = require('./pilots/wugongshan-reverse')
const siguniangErfeng = require('./pilots/siguniang-erfeng')
const yulongBlueMoonYunshanping = require('./pilots/yulong-blue-moon-yunshanping')
const gonggaLaoyulinYulongxi = require('./pilots/gongga-laoyulin-yulongxi')
const danglingHuluhaiZhuoyongcuo = require('./pilots/dangling-huluhai-zhuoyongcuo')
const osm16162196 = require('./osm-derived/16162196-sanganbi-shuizukeng')
const osm20072118 = require('./osm-derived/20072118-die-butterfly-trail')
const osm20046643 = require('./osm-derived/20046643-pinghui-wetland-trail')
const osm20739620 = require('./osm-derived/20739620-zhaogongshan-loop')
const osm17841828 = require('./osm-derived/17841828-three-gorges-summit')
const osm18364943 = require('./osm-derived/18364943-menggu-sangberg')
const osm18364941 = require('./osm-derived/18364941-black-stone-city-hike')
const osm19684389 = require('./osm-derived/19684389-huizhou-dananshan-classic')
const osm19686682 = require('./osm-derived/19686682-huizhou-dananshan-lahu')
const osm20072078 = require('./osm-derived/20072078-maluanshan-nature-notes')
const elevationSource = require('./osm-derived/elevation-source')

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
  osm18364943,
  osm18364941,
  osm19684389,
  osm19686682,
  osm20072078,
]

function createProductionRouteCatalog() {
  const fragments = PILOT_FRAGMENTS.reduce((combined, fragment) => ({
    sources: [...combined.sources, ...fragment.sources],
    places: [...combined.places, ...fragment.places],
    routes: [...combined.routes, ...fragment.routes],
    variants: [...combined.variants, ...fragment.variants],
  }), { sources: [], places: [], routes: [], variants: [] })
  fragments.sources.push(elevationSource)

  return createRouteCatalog({
    legacyRecords: BUILTIN_ROUTES,
    ...fragments,
  })
}

module.exports = {
  createProductionRouteCatalog,
}
