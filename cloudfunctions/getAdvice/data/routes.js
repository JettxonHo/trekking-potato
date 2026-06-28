/**
 * 内置热门路线表（10-15 条）
 * 坐标系统：GCJ-02（高德标准，用于 POI 定位）
 * 海拔：手填准确值（山顶/最高点）
 * 数据来源：各山官方数据/两步路公开轨迹/维基百科，2026年查阅
 */

const BUILTIN_ROUTES = [
  {
    name: '武功山',
    aliases: ['武功山金顶', '武功山徒步', '武功山景区', '武功'],
    lat: 27.4543,
    lon: 114.1765,
    elevation: 1918,
    location: '江西省萍乡市',
    note: '经典草甸徒步，夏季午后雷暴高发',
  },
  {
    name: '四姑娘山二峰',
    aliases: ['四姑娘山', '二峰', '四姑娘', '幺妹峰二峰'],
    lat: 31.1037,
    lon: 102.9065,
    elevation: 5276,
    location: '四川省阿坝州小金县',
    note: '技术型攀登，需冰爪结组，高反风险',
  },
  {
    name: '五台山朝台',
    aliases: ['五台山', '大五朝台', '五台', '五台山大朝台'],
    lat: 39.0518,
    lon: 113.5800,
    elevation: 3058,
    location: '山西省忻州市',
    note: '多日大朝台约50km，北台叶斗峰最高',
  },
  {
    name: '喀纳斯',
    aliases: ['喀纳斯环线', '喀纳斯徒步', '喀纳斯湖'],
    lat: 48.7644,
    lon: 87.0489,
    elevation: 1374,
    location: '新疆阿勒泰地区',
    note: '夏季最美，北疆黄金窗口6-8月',
  },
  {
    name: '格聂神山',
    aliases: ['格聂', '格聂C', '格聂环线', '格聂神山C线'],
    lat: 29.6900,
    lon: 99.5800,
    elevation: 6204,
    location: '四川省甘孜州理塘县',
    note: '高海拔环线，C线最高垭口5200m',
  },
  {
    name: '贡嘎',
    aliases: ['贡嘎环线', '贡嘎山', '贡嘎徒步', '贡嘎大环线'],
    lat: 29.5950,
    lon: 101.8820,
    elevation: 7556,
    location: '四川省甘孜州',
    note: '极高海拔，需充分高海拔适应',
  },
  {
    name: '鳌太线',
    aliases: ['鳌太', '鳌山太白'],
    lat: 33.9500,
    lon: 107.7000,
    elevation: 3767,
    location: '陕西省宝鸡市',
    note: '已明令禁止穿越，死亡线，本表仅供数据参考',
  },
  {
    name: '太白山',
    aliases: ['太白', '太白山拔仙台', '拔仙台'],
    lat: 33.9550,
    lon: 107.7620,
    elevation: 3771,
    location: '陕西省宝鸡市',
    note: '秦岭主峰，高海拔，天气多变',
  },
  {
    name: '海坨山',
    aliases: ['海坨', '海陀山', '大海坨'],
    lat: 40.5400,
    lon: 115.8500,
    elevation: 2241,
    location: '河北省张家口市',
    note: '北京周边经典，冬季关闭',
  },
  {
    name: '船底顶',
    aliases: ['船底顶', '船底'],
    lat: 24.1300,
    lon: 113.3000,
    elevation: 1586,
    location: '广东省韶关市',
    note: '广东顶级徒步线，地形复杂',
  },
  {
    name: '武功山沈子村',
    aliases: ['沈子村', '武功山沈子', '沈子'],
    lat: 27.4900,
    lon: 114.1500,
    elevation: 800,
    location: '江西省萍乡市',
    note: '武功山经典入口（非山顶），海拔为起点',
  },
  {
    name: '小五台',
    aliases: ['小五台山', '小五台金河口'],
    lat: 39.9700,
    lon: 115.0500,
    elevation: 2882,
    location: '河北省张家口市',
    note: '华北经典，东台最高2882m',
  },
  {
    name: '船山',
    aliases: ['船山区', '遂宁船山'],
    lat: 30.5300,
    lon: 105.5700,
    elevation: 400,
    location: '四川省遂宁市',
    note: '低海拔丘陵地带',
  },
  {
    name: '白际山脉',
    aliases: ['白际', '白际山', '徽开古道'],
    lat: 29.7500,
    lon: 118.6000,
    elevation: 1280,
    location: '安徽省黄山市',
    note: '徽开古道，中等难度',
  },
  {
    name: '船顶石',
    aliases: ['船顶', '船顶岩'],
    lat: 23.6800,
    lon: 116.8500,
    elevation: 1050,
    location: '广东省揭阳市',
    note: '粤东高峰',
  },
]

/**
 * 模糊匹配内置路线表
 * @param {string} query - 用户输入的路线名
 * @returns {Object|null} - 匹配结果，含 needsConfirm（编辑距离<=2需确认）
 */
function matchBuiltinRoute(query) {
  if (!query) return null

  // 1. 精确匹配（名称或别名完全一致）
  for (const route of BUILTIN_ROUTES) {
    if (route.name === query || route.aliases.includes(query)) {
      return { ...route, matchType: 'exact', needsConfirm: false }
    }
  }

  // 2. 包含匹配（输入包含路线名或别名）
  for (const route of BUILTIN_ROUTES) {
    if (route.name.includes(query) || query.includes(route.name)) {
      return { ...route, matchType: 'contains', needsConfirm: false }
    }
    for (const alias of route.aliases) {
      if (alias.includes(query) || query.includes(alias)) {
        return { ...route, matchType: 'contains', needsConfirm: false }
      }
    }
  }

  // 3. 编辑距离匹配（<=2，需用户确认防假阳性）
  let bestMatch = null
  let bestDist = 3
  for (const route of BUILTIN_ROUTES) {
    const dist = editDistance(query, route.name)
    if (dist < bestDist) {
      bestDist = dist
      bestMatch = route
    }
    for (const alias of route.aliases) {
      const d = editDistance(query, alias)
      if (d < bestDist) {
        bestDist = d
        bestMatch = route
      }
    }
  }

  if (bestMatch && bestDist <= 2) {
    return { ...bestMatch, matchType: 'editDistance', editDistance: bestDist, needsConfirm: true }
  }

  return null
}

/**
 * 简单编辑距离（Levenshtein）
 */
function editDistance(a, b) {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

module.exports = { BUILTIN_ROUTES, matchBuiltinRoute, editDistance }
