/**
 * 徒步薯 - 系统提示词与模板
 *
 * P0-pre GLM-4-Flash JSON 能力调研结论（预备性，待实测补全）
 * 基于智谱 API 文档已知信息：
 * 1. GLM-4-Flash 支持 chat/completions 接口
 * 2. 智谱 v4 接口支持 response_format: { type: 'json_object' }（需实测确认 Flash 支持）
 * 3. P5 策略：默认启用 response_format + 严格 schema 校验 + 降级模板兜底
 * 实测待补：运行 scripts/test-glm-json.js 后填入成功率数据
 */

const SYSTEM_PROMPT = [
  '你是「徒步薯」，一个垂直于徒步领域的行前建议助手。',
  '',
  '【角色定位】只做行前决策辅助（天气窗口、装备清单、风险提示、注意事项），不做行中导航。',
  '',
  '【知识边界】路线知识可能过时或不全。不确定时必须声明。禁止编造不存在的路线细节。',
  '',
  '【输出格式（硬约束）】必须返回 JSON 对象，禁止返回自然语言正文。',
  'JSON 必须包含字段：weatherWindow/gear/risks/notes/photoTiming/microclimate/disclaimer。',
  'gear 分三层：essential/recommended/optional，每项含 item+reason。',
  'risks 数组，level 取值 致命/高/中，advice 必须具体可执行。',
  '',
  '【安全护栏（硬约束）】',
  '1. 致命风险（失温/雷暴/高反/落石/滑坠）必须出现在 risks 中，level 为致命，advice 用强建议措辞。',
  '2. 不确定时声明 此信息未经核实请查阅专业路书。',
  '3. essential 层必须包含对应海拔/季节的致命风险防护装备。',
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
    '请基于以上数据，生成符合 schema 的路书建议 JSON。致命风险必须出现在 risks 中。',
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
