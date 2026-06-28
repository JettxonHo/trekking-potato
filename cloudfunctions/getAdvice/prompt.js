/**
 * 徒步薯 - 系统提示词与模板
 *
 * P0-pre GLM-4-Flash JSON 能力实测结论：
 * - 不带 response_format: 0/5 通过（全部缺 weatherWindow/gear/risks）
 * - 带 response_format: 0/5 通过（同上）
 * - 结论：GLM-4-Flash 无法输出复杂嵌套 JSON schema，0% 通过率
 * - 决策：升级 GLM-4.5（key 相同，模型能力更强）
 * - 平均延迟：Flash 5-11s，GLM-4.5 预计 8-15s（需实测）
 */

const SYSTEM_PROMPT = [
  '你是「徒步薯」，一个垂直于徒步领域的行前建议助手。',
  '',
  '【角色定位】只做行前决策辅助（天气窗口、装备清单、风险提示、注意事项），不做行中导航。',
  '',
  '【知识边界】路线知识可能过时或不全。不确定时必须声明。禁止编造不存在的路线细节。',
  '',
  '【输出格式（硬约束）】必须返回一个 JSON 对象。',
  'JSON 必须包含以下字段：',
  '- weatherWindow: 对象，含 days 数组（每个元素有 date/tempMin/tempMax/precipProb/windMs/recommendedWindow）',
  '- gear: 对象，含 essential/recommended/optional 三个数组（每个元素有 item 和 reason）',
  '- risks: 数组，每个元素有 risk/level/advice（level 取值 致命/高/中）',
  '- notes: 字符串数组',
  '- photoTiming: 对象，含 sunrise/sunset/goldenHour/blueHour',
  '- microclimate: 对象，含 humidity/windMs/dewPointSpread',
  '- disclaimer: 字符串',
  '',
  '【安全护栏】',
  '1. 致命风险（失温/雷暴/高反/落石/滑坠）必须在 risks 中，level 为 致命',
  '2. 不确定时声明 此信息未经核实',
  '3. essential 必须包含对应海拔/季节的致命风险防护装备',
].join('\n')

function buildMessages(params) {
  const { route, date, level, days, weather, gearRules, sunEvents, microclimate } = params
  const userContent = [
    '[行程信息]',
    '路线：' + route,
    '出发日期：' + date,
    '徒步水平：' + level,
    '天数：' + days,
    '',
    '[天气数据（来自 Open-Meteo，已按海拔修正）]',
    JSON.stringify(weather, null, 2),
    '',
    '[装备规则（grounding）]',
    JSON.stringify(gearRules, null, 2),
    '',
    '[天文时刻（suncalc 离线计算）]',
    JSON.stringify(sunEvents, null, 2),
    '',
    '[微气候原始数据]',
    JSON.stringify(microclimate, null, 2),
    '',
    '请基于以上数据，生成路书建议 JSON。',
    '必须包含 weatherWindow（含days数组）、gear（含essential/recommended/optional三个数组）、risks（数组）、notes（数组）、photoTiming、microclimate、disclaimer。',
  ].join('\n')

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ]
}

function buildDegradedResponse(weather, sunEvents, meta) {
  return {
    ok: true,
    degraded: true,
    data: {
      weatherWindow: weather || null,
      gear: { essential: [], recommended: [], optional: [] },
      risks: [],
      notes: ['AI 建议生成失败，以下为基础参考数据，请查阅专业路书或咨询有经验的驴友'],
      photoTiming: sunEvents || null,
      microclimate: null,
      disclaimer: 'AI 生成失败，以下为基础参考数据。出行前务必查阅专业路书和官方气象信息。户外活动有风险，责任自负。',
      meta: Object.assign({}, meta, { degraded: true, degradedReason: 'LLM 输出校验失败或超时' }),
    },
  }
}

module.exports = { SYSTEM_PROMPT, buildMessages, buildDegradedResponse }
