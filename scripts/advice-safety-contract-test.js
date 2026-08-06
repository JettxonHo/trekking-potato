/**
 * I06 deterministic safety projection contract (offline).
 */
const { projectSafetyAdvice } = require('../cloudfunctions/getAdvice/safety-advice')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const deterministicBase = {
  gearRules: {
    essential: [{ item: '冲锋衣', reason: '防风雨' }],
    recommended: [{ item: '登山杖', reason: '减轻膝盖负担' }],
    optional: [{ item: '相机', reason: '记录风景' }],
    fatalRisks: ['雷暴'],
    ruleNotes: ['午后注意避雷'],
  },
  weather: { days: [{ windMs: 6.2 }] },
  sunEvents: { sunrise: '05:40', sunset: '19:10' },
}

function main() {
  const input = {
    ...deterministicBase,
    aiOutcome: {
      status: 'available',
      value: {
        gearAdditions: {
          recommended: [
            { item: '  登山杖  ', reason: '试图覆盖确定性项' },
            { item: '  头灯  ', reason: '  天黑备用  ' },
            { item: '头灯', reason: '重复项' },
          ],
          optional: [
            { item: '相机', reason: '试图移动确定性项' },
            { item: '哨子', reason: '紧急联络' },
            { item: '头灯', reason: '跨分类重复项' },
          ],
        },
        riskExplanations: [
          { risk: '雷暴风险', explanation: '  尽早下撤  ' },
          { risk: '虚构风险', explanation: '不应进入确定性风险集合' },
        ],
        notes: ['  随身携带雨具  '],
        essential: [],
        risks: [],
        verdict: 'go',
        weather: { days: [] },
        meta: { unsafe: true },
      },
    },
  }
  const inputSnapshot = JSON.stringify(input)
  const projected = projectSafetyAdvice(input)

  assert(JSON.stringify(Object.keys(projected.data).sort()) === JSON.stringify([
    'disclaimer', 'gear', 'microclimate', 'notes', 'photoTiming', 'risks', 'sunEvents', 'weather',
  ].sort()), '投影 data 必须只含冻结字段')
  assert(JSON.stringify(projected.data.gear.essential) === JSON.stringify(deterministicBase.gearRules.essential), 'AI 不得覆盖必备装备')
  assert(JSON.stringify(projected.data.gear.recommended) === JSON.stringify([
    deterministicBase.gearRules.recommended[0], { item: '头灯', reason: '天黑备用' },
  ]), 'AI 只能按顺序追加去重后的推荐装备')
  assert(JSON.stringify(projected.data.gear.optional) === JSON.stringify([
    deterministicBase.gearRules.optional[0], { item: '哨子', reason: '紧急联络' },
  ]), 'AI 不得移动或重复确定性装备')
  assert(JSON.stringify(projected.data.risks) === JSON.stringify([{
    risk: '雷暴风险',
    level: '致命',
    advice: '本风险由海拔/季节规则判定，请查阅专业路书获取具体应对措施；AI 说明：尽早下撤',
  }]), '风险集合、顺序和长度必须只来自 fatalRisks，AI-only 风险不得出现')
  assert(JSON.stringify(projected.data.notes) === JSON.stringify([
    '规则提示：午后注意避雷', 'AI 说明：随身携带雨具',
  ]), '规则提示必须先于 AI notes 输出')
  assert(projected.data.photoTiming === deterministicBase.sunEvents && projected.data.sunEvents === deterministicBase.sunEvents, 'photoTiming/sunEvents 必须只来自 base')
  assert(projected.data.weather === deterministicBase.weather && projected.data.microclimate.windMs === 6.2, 'weather 和微气候必须只来自 base')
  assert(projected.data.disclaimer === '装备和风险由确定性规则生成，AI 仅补充解释。出行前请核实官方气象、路线开放状态和现场条件；户外活动有风险。', '免责声明必须是冻结文本')
  assert(!Object.prototype.hasOwnProperty.call(projected.data, 'meta') && !Object.prototype.hasOwnProperty.call(projected.data, 'degradedReason'), '投影 data 不得包含 caller-only meta 或第二原因位置')
  assert(projected.degraded === false && projected.degradedReason === undefined, '合法 AI outcome 不应降级')
  assert(JSON.stringify(input) === inputSnapshot, '投影不得修改完整 project 参数（含 aiOutcome）')

  const invalidOutcome = projectSafetyAdvice({
    ...deterministicBase,
    aiOutcome: {
      status: 'available',
      value: {
        gearAdditions: { recommended: [{ item: '空字段', reason: '' }], optional: [] },
        riskExplanations: [],
        notes: [],
      },
    },
  })
  const unavailableOutcome = projectSafetyAdvice({
    ...deterministicBase,
    aiOutcome: { status: 'unavailable' },
  })
  assert(invalidOutcome.degraded === true && invalidOutcome.degradedReason === 'ai_output_invalid', '畸形 available outcome 必须降级为 ai_output_invalid')
  assert(unavailableOutcome.degraded === true && unavailableOutcome.degradedReason === 'ai_unavailable', 'LLM 不可用必须降级为 ai_unavailable')
  assert(JSON.stringify(invalidOutcome.data) === JSON.stringify(unavailableOutcome.data), 'invalid 与 unavailable 必须保留相同完整确定性核心')
  assert(JSON.stringify(invalidOutcome.data.notes) === JSON.stringify([
    '规则提示：午后注意避雷', 'AI 说明暂不可用，当前仅展示确定性规则结果。',
  ]), '降级提示必须位于规则提示之后且使用冻结文本')

  let unknownStatusThrows = false
  try {
    projectSafetyAdvice({ ...deterministicBase, aiOutcome: { status: 'unexpected' } })
  } catch (error) {
    unknownStatusThrows = true
  }
  assert(unknownStatusThrows, '未知 aiOutcome status 必须抛给顶层 internal_error')

  console.log('PASS: I06 安全投影契约')
}

try {
  main()
} catch (error) {
  console.error('FAIL: ' + error.message)
  process.exitCode = 1
}
