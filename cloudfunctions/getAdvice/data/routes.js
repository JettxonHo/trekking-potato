
/**
 * 内置热门路线表（50条）
 * 坐标系统：GCJ-02（高德标准，用于 POI 定位）
 * 海拔：山顶/最高点（手填准确值）
 * bestSeason：最佳季节（已有禁止标注的路线除外）
 * 数据来源：各山官方数据/两步路公开轨迹/维基百科，2026年查阅
 * 注意：标注"坐标需手输确认"的路线，用户可使用手动坐标输入功能
 */

const BUILTIN_ROUTES = [
  {
    name: '四姑娘山大峰',
    aliases: ['大峰', '四姑娘山大峰'],
    lat: 31.1037,
    lon: 102.9065,
    elevation: 5025,
    location: '四川省阿坝州小金县',
    type: 'climb',
    bestSeason: '5-10月',
    note: '入门级5000m攀登，最热门初攀',
  },
  {
    name: '四姑娘山二峰',
    aliases: ['二峰', '四姑娘山', '四姑娘'],
    lat: 31.1037,
    lon: 102.9065,
    elevation: 5276,
    location: '四川省阿坝州小金县',
    type: 'climb',
    bestSeason: '5-10月',
    note: '技术型攀登，需冰爪结组，高反风险',
  },
  {
    name: '四姑娘山三峰',
    aliases: ['三峰', '四姑娘山三峰'],
    lat: 31.1037,
    lon: 102.9065,
    elevation: 5355,
    location: '四川省阿坝州小金县',
    type: 'climb',
    bestSeason: '5-10月',
    note: '需技术攀登经验，门槛较高',
  },
  {
    name: '贡嘎环线',
    aliases: ['贡嘎', '贡嘎山', '贡嘎徒步', '贡嘎大环线'],
    lat: 29.595,
    lon: 101.882,
    elevation: 7556,
    location: '四川省甘孜州',
    type: 'trek',
    bestSeason: '5-6月,9-10月',
    note: '极高海拔，需充分高海拔适应',
  },
  {
    name: '格聂神山C线',
    aliases: ['格聂', '格聂C', '格聂环线', '格聂神山'],
    lat: 29.69,
    lon: 99.58,
    elevation: 6204,
    location: '四川省甘孜州理塘县',
    type: 'trek',
    bestSeason: '7-9月',
    note: '高海拔环线，C线最高垭口5200m',
  },
  {
    name: '雪宝顶',
    aliases: ['雪宝顶峰', '雪宝山'],
    lat: 32.69,
    lon: 103.8,
    elevation: 5440,
    location: '四川省阿坝州松潘县',
    type: 'climb',
    bestSeason: '6-9月',
    note: '岷山主峰，技术型攀登',
  },
  {
    name: '牛背山',
    aliases: ['牛背'],
    lat: 29.7933,
    lon: 102.3056,
    elevation: 3660,
    location: '四川省雅安市荥经县',
    type: 'trek',
    bestSeason: '10-4月',
    note: '360度观景平台，看贡嘎日照金山',
  },
  {
    name: '稻城亚丁',
    aliases: ['亚丁', '稻城', '牛奶海', '五色海'],
    lat: 28.42,
    lon: 100.33,
    elevation: 6032,
    location: '四川省甘孜州稻城县',
    type: 'trek',
    bestSeason: '5-10月',
    note: '仙乃日央迈勇夏诺多吉三神山',
  },
  {
    name: '哈巴雪山',
    aliases: ['哈巴', '哈巴雪峰'],
    lat: 27.368,
    lon: 100.082,
    elevation: 5396,
    location: '云南省迪庆州香格里拉市',
    type: 'climb',
    bestSeason: '5-6月,9-10月',
    note: '入门级5000m+技术攀登',
  },
  {
    name: '梅里雪山雨崩',
    aliases: ['雨崩', '雨崩村', '梅里', '冰湖', '神瀑'],
    lat: 28.42,
    lon: 98.7333,
    elevation: 3440,
    location: '云南省迪庆州德钦县',
    type: 'trek',
    bestSeason: '4-6月,9-11月',
    note: '雨崩村冰湖神瀑，转山路线',
  },
  {
    name: '玉龙雪山',
    aliases: ['玉龙'],
    lat: 27.1,
    lon: 100.18,
    elevation: 5596,
    location: '云南省丽江市',
    type: 'tour',
    bestSeason: '全年',
    note: '景区开发成熟，缆车可达4506m',
  },
  {
    name: '千湖山',
    aliases: ['千湖'],
    lat: 27.9,
    lon: 99.6,
    elevation: 3860,
    location: '云南省迪庆州香格里拉市',
    type: 'trek',
    bestSeason: '6-9月',
    note: '高山湖泊群，静谧徒步',
  },
  {
    name: '冈仁波齐',
    aliases: ['冈仁波齐峰', '冈仁波齐神山', '岗仁波齐'],
    lat: 31.069,
    lon: 81.312,
    elevation: 6638,
    location: '西藏阿里地区普兰县',
    type: 'trek',
    bestSeason: '5-10月',
    note: '神山转山，宗教意义，非攀登路线',
  },
  {
    name: '珠峰东坡嘎玛沟',
    aliases: ['嘎玛沟', '珠峰东坡'],
    lat: 27.95,
    lon: 86.9,
    elevation: 5580,
    location: '西藏日喀则定日县',
    type: 'trek',
    bestSeason: '5-6月,9-10月',
    note: '珠峰洛子马卡鲁三峰同框，坐标需手输确认',
  },
  {
    name: '墨脱徒步',
    aliases: ['墨脱'],
    lat: 29.33,
    lon: 95.33,
    elevation: 1200,
    location: '西藏林芝市墨脱县',
    type: 'trek',
    bestSeason: '10-11月',
    note: '热带到高原过渡，多雨多蚂蝗',
  },
  {
    name: '纳木错',
    aliases: ['纳木错转湖', '纳木措'],
    lat: 30.7,
    lon: 90.5,
    elevation: 4718,
    location: '西藏拉萨市当雄县',
    type: 'trek',
    bestSeason: '7-9月',
    note: '圣湖转湖，海拔高',
  },
  {
    name: '喀纳斯',
    aliases: ['喀纳斯环线', '喀纳斯徒步', '喀纳斯湖'],
    lat: 48.7644,
    lon: 87.0489,
    elevation: 1374,
    location: '新疆阿勒泰地区',
    type: 'trek',
    bestSeason: '7-9月',
    note: '北疆黄金窗口，湖光山色',
  },
  {
    name: '狼塔C线',
    aliases: ['狼塔', '狼塔穿越'],
    lat: 43.4,
    lon: 86.2,
    elevation: 3850,
    location: '新疆昌吉州',
    type: 'trek',
    bestSeason: '7-9月',
    note: '新疆最虐线路，7-9天穿越，坐标需手输确认',
  },
  {
    name: '乌孙古道',
    aliases: ['乌孙'],
    lat: 42.5,
    lon: 82.0,
    elevation: 3800,
    location: '新疆伊犁州',
    type: 'trek',
    bestSeason: '7-9月',
    note: '南北疆穿越，天堂湖，坐标需手输确认',
  },
  {
    name: '夏特古道',
    aliases: ['夏特'],
    lat: 42.7,
    lon: 80.5,
    elevation: 3500,
    location: '新疆伊犁州',
    type: 'trek',
    bestSeason: '6-9月',
    note: '翻越木扎尔特达坂，坐标需手输确认',
  },
  {
    name: '博格达大本营',
    aliases: ['博格达', '博格达峰'],
    lat: 43.8,
    lon: 88.3,
    elevation: 3800,
    location: '新疆昌吉州',
    type: 'trek',
    bestSeason: '7-8月',
    note: '天山最高峰大本营徒步',
  },
  {
    name: '喀拉峻',
    aliases: ['喀拉峻草原'],
    lat: 42.9,
    lon: 82.2,
    elevation: 2500,
    location: '新疆伊犁州特克斯县',
    type: 'trek',
    bestSeason: '6-8月',
    note: '立体草原，百里画廊',
  },
  {
    name: '年保玉则',
    aliases: ['年保玉则穿越', '年宝玉则'],
    lat: 33.5,
    lon: 101.1,
    elevation: 5369,
    location: '青海省果洛州',
    type: 'trek',
    bestSeason: '7-8月',
    note: '已禁止穿越，数据仅供参考',
  },
  {
    name: '阿尼玛卿',
    aliases: ['阿尼玛卿雪山'],
    lat: 34.8,
    lon: 99.5,
    elevation: 6282,
    location: '青海省果洛州',
    type: 'climb',
    bestSeason: '5-6月,9-10月',
    note: '四大神山之一，技术攀登',
  },
  {
    name: '青海湖',
    aliases: ['青海湖环湖', '青海湖骑行'],
    lat: 36.6,
    lon: 100.1,
    elevation: 3196,
    location: '青海省海南州',
    type: 'tour',
    bestSeason: '7-8月',
    note: '骑行徒步环湖360km',
  },
  {
    name: '腾格里沙漠',
    aliases: ['腾格里', '腾格里沙漠穿越'],
    lat: 37.5,
    lon: 104.8,
    elevation: 1300,
    location: '宁夏中卫市',
    type: 'trek',
    bestSeason: '4-5月,9-10月',
    note: '中国第四大沙漠',
  },
  {
    name: '五台山朝台',
    aliases: ['五台山', '五台', '五台山大朝台'],
    lat: 39.0518,
    lon: 113.58,
    elevation: 3058,
    location: '山西省忻州市',
    type: 'trek',
    bestSeason: '5-9月',
    note: '多日大朝台约50km，北台叶斗峰最高',
  },
  {
    name: '小五台',
    aliases: ['小五台山', '小五台金河口'],
    lat: 39.97,
    lon: 115.05,
    elevation: 2882,
    location: '河北省张家口市',
    type: 'trek',
    bestSeason: '6-9月',
    note: '华北经典，东台最高2882m',
  },
  {
    name: '海坨山',
    aliases: ['海坨', '海陀山', '大海坨'],
    lat: 40.54,
    lon: 115.85,
    elevation: 2241,
    location: '河北省张家口市',
    type: 'trek',
    bestSeason: '6-10月',
    note: '北京周边经典，冬季关闭',
  },
  {
    name: '太白山',
    aliases: ['太白', '太白山拔仙台', '拔仙台'],
    lat: 33.955,
    lon: 107.762,
    elevation: 3771,
    location: '陕西省宝鸡市',
    type: 'trek',
    bestSeason: '6-9月',
    note: '秦岭主峰，高海拔天气多变',
  },
  {
    name: '鳌太线',
    aliases: ['鳌太', '鳌山太白'],
    lat: 33.95,
    lon: 107.7,
    elevation: 3767,
    location: '陕西省宝鸡市',
    type: 'trek',
    bestSeason: '已禁止',
    note: '已明令禁止穿越，死亡线，仅供数据参考',
  },
  {
    name: '华山',
    aliases: ['华山长空栈道', '西岳华山'],
    lat: 34.48,
    lon: 110.08,
    elevation: 2154,
    location: '陕西省渭南市',
    type: 'tour',
    bestSeason: '4-10月',
    note: '五岳最险，长空栈道',
  },
  {
    name: '南太行',
    aliases: ['南太行穿越', '太行山', '郭亮村'],
    lat: 35.7,
    lon: 113.6,
    elevation: 1700,
    location: '河南省新乡市',
    type: 'trek',
    bestSeason: '4-6月,9-11月',
    note: '挂壁公路郭亮村，经典穿越',
  },
  {
    name: '神农架',
    aliases: ['神农架穿越', '神农顶'],
    lat: 31.4,
    lon: 110.5,
    elevation: 3105,
    location: '湖北省神农架林区',
    type: 'trek',
    bestSeason: '5-10月',
    note: '原始森林穿越，华中屋脊',
  },
  {
    name: '箭扣长城',
    aliases: ['箭扣', '野长城'],
    lat: 40.4,
    lon: 116.6,
    elevation: 1100,
    location: '北京市怀柔区',
    type: 'trek',
    bestSeason: '4-6月,9-11月',
    note: '野长城徒步，险峻',
  },
  {
    name: '灵山',
    aliases: ['北京灵山', '东灵山'],
    lat: 40.0,
    lon: 115.4,
    elevation: 2303,
    location: '北京市门头沟区',
    type: 'trek',
    bestSeason: '6-10月',
    note: '北京最高峰',
  },
  {
    name: '武功山',
    aliases: ['武功山金顶', '武功山徒步', '武功山景区', '武功'],
    lat: 27.4543,
    lon: 114.1765,
    elevation: 1918,
    location: '江西省萍乡市',
    type: 'trek',
    bestSeason: '5-10月',
    note: '经典草甸徒步，夏季午后雷暴高发',
  },
  {
    name: '武功山反穿',
    aliases: ['反穿武功山', '武功山反穿路线'],
    lat: 27.49,
    lon: 114.15,
    elevation: 1918,
    location: '江西省萍乡市',
    type: 'trek',
    bestSeason: '5-10月',
    note: '沈子村到金顶反穿，避开正门人流',
  },
  {
    name: '三清山',
    aliases: ['三清'],
    lat: 28.85,
    lon: 118.07,
    elevation: 1819,
    location: '江西省上饶市',
    type: 'tour',
    bestSeason: '4-11月',
    note: '世界遗产，栈道徒步',
  },
  {
    name: '黄山',
    aliases: ['黄山风景区', '天都峰', '光明顶'],
    lat: 30.13,
    lon: 118.16,
    elevation: 1864,
    location: '安徽省黄山市',
    type: 'tour',
    bestSeason: '全年',
    note: '天都峰光明顶，五岳归来不看山',
  },
  {
    name: '白际山脉',
    aliases: ['白际', '白际山', '徽开古道'],
    lat: 29.75,
    lon: 118.6,
    elevation: 1280,
    location: '安徽省黄山市',
    type: 'trek',
    bestSeason: '4-6月,9-11月',
    note: '徽开古道，中等难度',
  },
  {
    name: '船底顶',
    aliases: ['船底'],
    lat: 24.13,
    lon: 113.3,
    elevation: 1586,
    location: '广东省韶关市',
    type: 'trek',
    bestSeason: '10-4月',
    note: '广东顶级徒步线，地形复杂',
  },
  {
    name: '黄梅雪后',
    aliases: ['黄梅'],
    lat: 24.0,
    lon: 114.3,
    elevation: 1296,
    location: '广东省韶关市',
    type: 'trek',
    bestSeason: '10-4月',
    note: '广东新兴热门路线，坐标需手输确认',
  },
  {
    name: '武夷山',
    aliases: ['武夷'],
    lat: 27.7,
    lon: 117.6,
    elevation: 2158,
    location: '福建省南平市',
    type: 'tour',
    bestSeason: '4-11月',
    note: '世界文化与自然双遗产',
  },
  {
    name: '长白山',
    aliases: ['长白山天池', '白头山'],
    lat: 42.0,
    lon: 128.05,
    elevation: 2691,
    location: '吉林省延边州',
    type: 'tour',
    bestSeason: '7-9月',
    note: '天池，冬季滑雪夏季徒步',
  },
  {
    name: '大兴安岭',
    aliases: ['大兴安岭穿越'],
    lat: 51.5,
    lon: 122.0,
    elevation: 1400,
    location: '内蒙古呼伦贝尔市',
    type: 'trek',
    bestSeason: '7-9月',
    note: '森林穿越，秋色绝美',
  },
  {
    name: '凤凰山',
    aliases: ['辽东凤凰山', '辽宁凤凰山'],
    lat: 40.4,
    lon: 123.9,
    elevation: 836,
    location: '辽宁省丹东市',
    type: 'tour',
    bestSeason: '5-10月',
    note: '辽宁第一名山，险峻',
  },
  {
    name: '大五朝台',
    aliases: ['大五朝台', '大霸尖山', '中央山脉', '台湾大五朝台'],
    lat: 24.6,
    lon: 121.2,
    elevation: 3952,
    location: '台湾新竹县',
    type: 'trek',
    bestSeason: '全年',
    note: '台湾中央山脉经典纵走',
  },
  {
    name: '毕棚沟',
    aliases: ['毕棚沟穿越'],
    lat: 31.4,
    lon: 102.9,
    elevation: 4500,
    location: '四川省阿坝州理县',
    type: 'trek',
    bestSeason: '9-11月',
    note: '彩林雪山，秋季最美',
  },
  {
    name: '腾冲高黎贡山',
    aliases: ['高黎贡山', '高黎贡'],
    lat: 25.3,
    lon: 98.5,
    elevation: 4000,
    location: '云南省保山市腾冲市',
    type: 'trek',
    bestSeason: '10-3月',
    note: '南方丝绸之路，生物多样性',
  },
  {
    name: '麦理浩径',
    aliases: ['麦理浩', 'MacLehose', '麦径'],
    lat: 22.3800,
    lon: 114.2700,
    elevation: 957,
    location: '香港新界',
    type: 'trek',
    bestSeason: '10-4月',
    note: '全长100km分十段，香港最经典远足径，鸡公山最高957m',
  },
  {
    name: '凤凰径',
    aliases: ['凤凰山', '大屿山'],
    lat: 22.2500,
    lon: 113.9400,
    elevation: 934,
    location: '香港大屿山',
    type: 'trek',
    bestSeason: '10-4月',
    note: '大屿山凤凰径70km，凤凰山934m看日出',
  },
  {
    name: '港岛径',
    aliases: ['港岛远足径', '龙脊'],
    lat: 22.2600,
    lon: 114.2000,
    elevation: 552,
    location: '香港香港岛',
    type: 'trek',
    bestSeason: '10-4月',
    note: '全长50km分八段，龙脊段最美海岸线',
  },
  {
    name: '卫奕信径',
    aliases: ['卫奕信', 'Wilson Trail'],
    lat: 22.3300,
    lon: 114.1800,
    elevation: 957,
    location: '香港新界',
    type: 'trek',
    bestSeason: '10-4月',
    note: '全长78km南北贯穿香港，八仙岭大帽山',
  },
  {
    name: '大东山',
    aliases: ['大东山芒草'],
    lat: 22.3500,
    lon: 114.2000,
    elevation: 869,
    location: '香港新界大屿山',
    type: 'trek',
    bestSeason: '10-11月',
    note: '秋季芒草打卡圣地，香港第三高峰',
  },
  {
    name: '大帽山',
    aliases: ['大帽', 'Tai Mo Shan'],
    lat: 22.4000,
    lon: 114.1200,
    elevation: 957,
    location: '香港新界',
    type: 'trek',
    bestSeason: '10-4月',
    note: '香港最高峰957m，冬季偶有结冰',
  },
]

/**
 * 模糊匹配内置路线表
 */
function matchBuiltinRoute(query) {
  if (!query) return null

  // 1. 精确匹配
  for (const route of BUILTIN_ROUTES) {
    if (route.name === query || route.aliases.includes(query)) {
      return { ...route, matchType: 'exact', needsConfirm: false }
    }
  }

  // 2. 包含匹配
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

  // 3. 编辑距离匹配（<=2，仅对长度>=4的查询，防短名假阳性）
  let bestMatch = null
  let bestDist = 3
  for (const route of BUILTIN_ROUTES) {
    if (query.length < 4) break
    const dist = editDistance(query, route.name)
    if (dist < bestDist) {
      bestDist = dist
      bestMatch = route
    }
    for (const alias of route.aliases) {
      if (alias.length < 4) continue
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
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
      }
    }
  }
  return matrix[b.length][a.length]
}

module.exports = { BUILTIN_ROUTES, matchBuiltinRoute, editDistance }
