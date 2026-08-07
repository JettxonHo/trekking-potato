const { BUILTIN_ROUTES } = require('../routes')
const { createRouteCatalog } = require('../../domain/route-catalog')
const wutai = require('./pilots/wutai')
const wugongshanReverse = require('./pilots/wugongshan-reverse')
const siguniangErfeng = require('./pilots/siguniang-erfeng')
const yulongBlueMoonYunshanping = require('./pilots/yulong-blue-moon-yunshanping')
const gonggaLaoyulinYulongxi = require('./pilots/gongga-laoyulin-yulongxi')
const danglingHuluhaiZhuoyongcuo = require('./pilots/dangling-huluhai-zhuoyongcuo')

const PILOT_FRAGMENTS = [
  wutai,
  wugongshanReverse,
  siguniangErfeng,
  yulongBlueMoonYunshanping,
  gonggaLaoyulinYulongxi,
  danglingHuluhaiZhuoyongcuo,
]

function createProductionRouteCatalog() {
  const fragments = PILOT_FRAGMENTS.reduce((combined, fragment) => ({
    sources: [...combined.sources, ...fragment.sources],
    places: [...combined.places, ...fragment.places],
    routes: [...combined.routes, ...fragment.routes],
    variants: [...combined.variants, ...fragment.variants],
  }), { sources: [], places: [], routes: [], variants: [] })

  return createRouteCatalog({
    legacyRecords: BUILTIN_ROUTES,
    ...fragments,
  })
}

module.exports = {
  createProductionRouteCatalog,
}
