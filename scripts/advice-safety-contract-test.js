/** I24a deterministic safety projection contract. */
const { projectSafetyAdvice } = require('../cloudfunctions/getAdvice/safety-advice')

const minimumGear = {
  essential: [{ item: '冲锋衣', reason: '防风雨' }],
  recommended: [{ item: '登山杖', reason: '减轻膝盖负担' }],
  optional: [{ item: '相机', reason: '记录风景' }],
}
const deterministicSafety = { fatalRisks: ['雷暴'], ruleNotes: ['午后注意避雷'] }

function main() {
  const input = {
    minimumGear,
    deterministicSafety,
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
        essential: [], risks: [], verdict: 'go', weather: { forged: true }, meta: { unsafe: true },
      },
    },
  }
  const snapshot = JSON.stringify(input)
  const projected = projectSafetyAdvice(input)
  if (JSON.stringify(Object.keys(projected.data).sort()) !== JSON.stringify(['disclaimer', 'gear', 'notes', 'risks'].sort())) throw new Error('advice data exact fields failed')
  if (JSON.stringify(projected.data.gear.essential) !== JSON.stringify(minimumGear.essential)) throw new Error('essential changed')
  if (JSON.stringify(projected.data.gear.recommended) !== JSON.stringify([minimumGear.recommended[0], { item: '头灯', reason: '天黑备用' }])) throw new Error('recommended merge failed')
  if (JSON.stringify(projected.data.gear.optional) !== JSON.stringify([minimumGear.optional[0], { item: '哨子', reason: '紧急联络' }])) throw new Error('optional merge failed')
  if (JSON.stringify(projected.data.risks) !== JSON.stringify([{
    risk: '雷暴风险', level: '致命',
    advice: '本风险由海拔/季节规则判定，请查阅专业路书获取具体应对措施；AI 说明：尽早下撤',
  }])) throw new Error('risk identity/merge failed')
  if (JSON.stringify(projected.data.notes) !== JSON.stringify(['规则提示：午后注意避雷', 'AI 说明：随身携带雨具'])) throw new Error('notes order failed')
  if (projected.data.disclaimer !== '装备和风险由确定性规则生成，AI 仅补充解释。出行前请核实官方气象、路线开放状态和现场条件；户外活动有风险。') throw new Error('disclaimer changed')
  if (JSON.stringify(input) !== snapshot) throw new Error('projection mutated input')

  const invalid = projectSafetyAdvice({ minimumGear, deterministicSafety, aiOutcome: {
    status: 'available', value: { gearAdditions: { recommended: [{ item: '空字段', reason: '' }], optional: [] }, riskExplanations: [], notes: [] },
  } })
  const unavailable = projectSafetyAdvice({ minimumGear, deterministicSafety, aiOutcome: { status: 'unavailable' } })
  if (!invalid.degraded || invalid.degradedReason !== 'ai_output_invalid') throw new Error('invalid AI not degraded')
  if (!unavailable.degraded || unavailable.degradedReason !== 'ai_unavailable') throw new Error('unavailable AI not degraded')
  if (JSON.stringify(invalid.data) !== JSON.stringify(unavailable.data)) throw new Error('degraded deterministic core differs')
  if (JSON.stringify(unavailable.data.notes) !== JSON.stringify(['规则提示：午后注意避雷', 'AI 说明暂不可用，当前仅展示确定性规则结果。'])) throw new Error('degraded note failed')

  let unknownStatusThrows = false
  try { projectSafetyAdvice({ minimumGear, deterministicSafety, aiOutcome: { status: 'unexpected' } }) } catch (_error) { unknownStatusThrows = true }
  if (!unknownStatusThrows) throw new Error('unknown AI status must throw')
  let legacyThrows = false
  try { projectSafetyAdvice({ minimumGear, deterministicSafety, aiOutcome: { status: 'unavailable' }, weather: {} }) } catch (_error) { legacyThrows = true }
  if (!legacyThrows) throw new Error('legacy projection fields must be rejected')
  console.log('PASS: I24a structured deterministic safety projection contract')
}

try { main() } catch (error) { console.error('FAIL: ' + error.message); process.exitCode = 1 }
