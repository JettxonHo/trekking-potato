const DETERMINISTIC_RISK_ADVICE = '本风险由海拔/季节规则判定，请查阅专业路书获取具体应对措施'
const DEGRADED_NOTE = 'AI 说明暂不可用，当前仅展示确定性规则结果。'
const DISCLAIMER = '装备和风险由确定性规则生成，AI 仅补充解释。出行前请核实官方气象、路线开放状态和现场条件；户外活动有风险。'

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype
}

function nonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function trimText(value) {
  return value.trim()
}

function validGearItem(value) {
  return isPlainObject(value) && nonEmptyText(value.item) && nonEmptyText(value.reason)
}

function validAiExplanation(value) {
  if (!isPlainObject(value) || !isPlainObject(value.gearAdditions)
    || !Array.isArray(value.gearAdditions.recommended)
    || !Array.isArray(value.gearAdditions.optional)
    || !Array.isArray(value.riskExplanations)
    || !Array.isArray(value.notes)) return false

  for (const item of value.gearAdditions.recommended.concat(value.gearAdditions.optional)) {
    if (!validGearItem(item)) return false
  }
  for (const risk of value.riskExplanations) {
    if (!isPlainObject(risk) || !nonEmptyText(risk.risk) || !nonEmptyText(risk.explanation)) return false
  }
  return value.notes.every(nonEmptyText)
}

function normalizeAiOutcome(aiOutcome) {
  if (!isPlainObject(aiOutcome)) throw new Error('未知 aiOutcome status')

  if (aiOutcome.status === 'available') {
    return validAiExplanation(aiOutcome.value)
      ? { status: 'available', value: aiOutcome.value }
      : { status: 'invalid' }
  }
  if (aiOutcome.status === 'invalid' || aiOutcome.status === 'unavailable') return { status: aiOutcome.status }
  throw new Error('未知 aiOutcome status')
}

function copyDeterministicGear(minimumGear) {
  return {
    essential: minimumGear.essential.map((item) => ({ item: item.item, reason: item.reason })),
    recommended: minimumGear.recommended.map((item) => ({ item: item.item, reason: item.reason })),
    optional: minimumGear.optional.map((item) => ({ item: item.item, reason: item.reason })),
  }
}

function appendGearAdditions(gear, additions) {
  const deterministicItems = new Set()
  for (const category of ['essential', 'recommended', 'optional']) {
    for (const item of gear[category]) deterministicItems.add(trimText(item.item))
  }

  const addedItems = new Set()
  for (const category of ['recommended', 'optional']) {
    for (const addition of additions[category]) {
      const item = trimText(addition.item)
      if (deterministicItems.has(item) || addedItems.has(item)) continue
      gear[category].push({ item, reason: trimText(addition.reason) })
      addedItems.add(item)
    }
  }
}

function withoutOneRiskSuffix(value) {
  const text = trimText(value)
  return text.endsWith('风险') ? text.slice(0, -2) : text
}

function buildRisks(fatalRisks, explanations) {
  const explanationByRisk = new Map()
  for (const explanation of explanations) {
    const key = withoutOneRiskSuffix(explanation.risk)
    const list = explanationByRisk.get(key) || []
    list.push(trimText(explanation.explanation))
    explanationByRisk.set(key, list)
  }

  return fatalRisks.map((name) => {
    const matchingExplanations = explanationByRisk.get(withoutOneRiskSuffix(name)) || []
    let advice = DETERMINISTIC_RISK_ADVICE
    for (const explanation of matchingExplanations) advice += '；AI 说明：' + explanation
    return { risk: name + '风险', level: '致命', advice }
  })
}

/**
 * Rebuild advice from deterministic base fields and the exact I24a AI union.
 * The caller is responsible for attaching server metadata and the public response envelope.
 */
function projectSafetyAdvice(input) {
  if (!isPlainObject(input)
    || JSON.stringify(Object.keys(input).sort()) !== JSON.stringify(['aiOutcome', 'deterministicSafety', 'minimumGear'].sort())
    || !isPlainObject(input.minimumGear)
    || !isPlainObject(input.deterministicSafety)
    || !Array.isArray(input.minimumGear.essential)
    || !Array.isArray(input.minimumGear.recommended)
    || !Array.isArray(input.minimumGear.optional)
    || !Array.isArray(input.deterministicSafety.fatalRisks)
    || !Array.isArray(input.deterministicSafety.ruleNotes)) {
    throw new TypeError('structured safety projection input required')
  }
  const { minimumGear, deterministicSafety, aiOutcome } = input
  const outcome = normalizeAiOutcome(aiOutcome)
  const gear = copyDeterministicGear(minimumGear)
  const aiExplanation = outcome.status === 'available' ? outcome.value : null

  if (aiExplanation) appendGearAdditions(gear, aiExplanation.gearAdditions)

  const notes = deterministicSafety.ruleNotes.map((note) => '规则提示：' + trimText(note))
  if (aiExplanation) {
    for (const note of aiExplanation.notes) notes.push('AI 说明：' + trimText(note))
  } else {
    notes.push(DEGRADED_NOTE)
  }

  const data = {
    gear,
    risks: buildRisks(deterministicSafety.fatalRisks, aiExplanation ? aiExplanation.riskExplanations : []),
    notes,
    disclaimer: DISCLAIMER,
  }

  if (outcome.status === 'invalid') return { data, degraded: true, degradedReason: 'ai_output_invalid' }
  if (outcome.status === 'unavailable') return { data, degraded: true, degradedReason: 'ai_unavailable' }
  return { data, degraded: false, degradedReason: undefined }
}

module.exports = { projectSafetyAdvice }
