/**
 * 徒步薯 - 装备规则表（LLM grounding）
 *
 * 维度：季节 × 海拔 × 天数 × 纬度带
 * - 季节：summer(夏) / transitional(过渡季) / winter(冬)，按温度区间
 * - 海拔：low(<1500m) / mid(1500-3500m) / high(3500-5500m) / extreme(>5500m)
 * - 天数：1-7（数字）
 * - 纬度带：south(南方湿润) / north(北方干燥)，按秦岭-淮河线粗分
 *
 * 致命风险硬约束：对应海拔/季节的致命风险装备必入清单
 */

// 致命风险枚举
const FATAL_RISKS = {
  hypothermia: { name: '失温', gear: ['急救毯', '保暖中层（羽绒/抓绒）', '防风防雨外套'] },
  lightning: { name: '雷暴', gear: ['防雨外套', '避免金属装备（雷暴时）'] },
  altitude: { name: '高反', gear: ['充足饮水', '能量食品', '如需：乙酰唑胺（遵医嘱）'] },
  fall: { name: '滑坠', gear: ['登山杖', '防滑登山鞋', '如需：冰爪/结组绳'] },
  heat: { name: '中暑', gear: ['充足饮水（3L+）', '防晒帽', '电解质'] },
}

// 季节判定（按月，简化）
function getSeason(month) {
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 3 && month <= 5 || month >= 9 && month <= 11) return 'transitional'
  return 'winter'
}

// 海拔分级
function getElevationBand(elevation) {
  if (elevation < 1500) return 'low'
  if (elevation < 3500) return 'mid'
  if (elevation < 5500) return 'high'
  return 'extreme'
}

// 纬度带判定（秦岭-淮河线约北纬34度）
function getLatitudeBand(lat) {
  return lat > 34 ? 'north' : 'south'
}

/**
 * 获取装备规则（作为 LLM grounding）
 * @param {Object} params - { month, elevation, days, lat }
 * @returns {Object} { season, elevationBand, latitudeBand, fatalRisks, essentialGear, notes }
 */
function getGearRules(params) {
  const { month, elevation, days, lat } = params

  const season = getSeason(month)
  const elevationBand = getElevationBand(elevation)
  const latitudeBand = getLatitudeBand(lat)

  // 根据维度组合确定致命风险
  const fatalRisks = []

  // 高海拔 -> 高反风险
  if (elevationBand === 'high' || elevationBand === 'extreme') {
    fatalRisks.push(FATAL_RISKS.altitude)
  }

  // 极高海拔 -> 滑坠/技术装备
  if (elevationBand === 'extreme') {
    fatalRisks.push({ name: '滑坠', gear: ['冰爪', '结组绳', '头盔', '安全带'] })
  }

  // 冬季/高海拔 -> 失温风险
  if (season === 'winter' || elevationBand === 'high' || elevationBand === 'extreme') {
    fatalRisks.push(FATAL_RISKS.hypothermia)
  }

  // 过渡季高海拔 -> 失温风险（温差大）
  if (season === 'transitional' && (elevationBand === 'high' || elevationBand === 'extreme')) {
    if (!fatalRisks.includes(FATAL_RISKS.hypothermia)) {
      fatalRisks.push(FATAL_RISKS.hypothermia)
    }
  }

  // 夏季低海拔 -> 中暑风险
  if (season === 'summer' && elevationBand === 'low') {
    fatalRisks.push(FATAL_RISKS.heat)
  }

  // 夏季南方 -> 雷暴风险
  if (season === 'summer' && latitudeBand === 'south') {
    fatalRisks.push(FATAL_RISKS.lightning)
  }

  // 确定必备装备（致命风险装备 + 基础必备）
  const essentialGear = []

  // 基础必备（所有场景）
  essentialGear.push({ item: '登山鞋', reason: '防滑保护' })
  essentialGear.push({ item: '充足饮水', reason: '防止脱水' })
  essentialGear.push({ item: '能量食品', reason: '维持体力' })
  essentialGear.push({ item: '手机（满电）', reason: '紧急联系' })

  // 致命风险装备（硬约束必入）
  for (const risk of fatalRisks) {
    for (const item of risk.gear) {
      if (!essentialGear.find((g) => g.item === item)) {
        essentialGear.push({ item, reason: risk.name + '风险' })
      }
    }
  }

  // 推荐装备（按场景）
  const recommendedGear = []

  if (days > 1) {
    recommendedGear.push({ item: '头灯', reason: '多日徒步可能夜行' })
    recommendedGear.push({ item: '滤水器/净水片', reason: '多日补水' })
  }

  recommendedGear.push({ item: '登山杖', reason: '保护膝盖' })

  if (elevationBand === 'high' || elevationBand === 'extreme') {
    recommendedGear.push({ item: '血氧仪（可选）', reason: '监测高反' })
  }

  if (latitudeBand === 'north') {
    recommendedGear.push({ item: '防晒霜SPF50+', reason: '北方干燥紫外强' })
    recommendedGear.push({ item: '润唇膏', reason: '北方干燥' })
  } else {
    recommendedGear.push({ item: '防晒霜SPF30+', reason: '南方也需防晒' })
    recommendedGear.push({ item: '速干衣', reason: '南方潮湿速干' })
  }

  // 可选装备
  const optionalGear = [
    { item: '护膝', reason: '下坡保护' },
    { item: '雨裤', reason: '全防雨' },
    { item: '相机', reason: '记录风景' },
  ]

  if (season === 'summer') {
    optionalGear.push({ item: '防蚊液', reason: '夏季蚊虫' })
  }

  // 注释/边界处理
  const ruleNotes = []
  if (elevation >= 5000 && elevation < 5500) {
    ruleNotes.push('海拔 ' + elevation + 'm 按高海拔偏极高处理，需技术装备评估')
  }
  if (season === 'transitional' && month === 5) {
    ruleNotes.push('5月底按过渡季偏夏处理')
  }

  return {
    season,
    elevationBand,
    elevation,
    latitudeBand,
    days,
    fatalRisks: fatalRisks.map((r) => r.name),
    essential: essentialGear,
    recommended: recommendedGear,
    optional: optionalGear,
    ruleNotes,
  }
}

module.exports = { getGearRules, getSeason, getElevationBand, getLatitudeBand, FATAL_RISKS }
