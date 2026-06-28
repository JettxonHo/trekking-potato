// P0-pre: GLM-4-Flash JSON 能力实测脚本
// 用法: GLM_KEY=你的key node scripts/test-glm-json.js

const https = require('https')

const GLM_KEY = process.env.GLM_KEY
if (!GLM_KEY) {
  console.error('错误: 请先设置 GLM_KEY 环境变量')
  process.exit(1)
}

const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

function buildPrompt({ useJsonFormat }) {
  const systemPrompt = `你是徒步行前建议助手。只做行前决策辅助，不做行中导航。你的路线知识可能过时不全，不确定时必须声明。你必须返回符合以下 JSON schema 的 JSON，禁止返回自然语言正文。安全护栏：致命风险必出且用强建议措辞。不确定时声明此信息未经核实。禁止编造不存在的路线细节。`
  const userPrompt = `路线：武功山\n出发日期：2026-07-05\n徒步水平：中级\n天数：1\n\n天气：7月5日 22-29C 降水概率60% 风速4m/s\n海拔：1918m\n装备规则：夏季中海拔单日南方湿润 必备防雨外套登山鞋 推荐登山杖速干衣\n\n请生成符合 schema 的路书建议 JSON。`
  const body = {
    model: 'glm-4-flash',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
  }
  if (useJsonFormat) body.response_format = { type: 'json_object' }
  return body
}

function callGLM(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const url = new URL(API_URL)
    const req = https.request({
      method: 'POST', hostname: url.hostname, path: url.pathname,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GLM_KEY}` },
      timeout: 30000,
    }, (res) => {
      let d = ''
      res.on('data', (c) => { d += c })
      res.on('end', () => resolve({ status: res.statusCode, data: d, elapsed: 0 }))
    })
    const start = Date.now()
    req.on('response', () => { /* elapsed set on end */ })
    req.on('error', reject)
    req.on('timeout', () => { reject(new Error('timeout 30s')) })
    req.write(data)
    req.end()
    req._start = start
  })
}

function validateSchema(obj) {
  const errors = []
  if (!obj.weatherWindow) errors.push('缺 weatherWindow')
  if (!obj.gear) errors.push('缺 gear')
  if (obj.gear && !Array.isArray(obj.gear.essential)) errors.push('gear.essential 非数组')
  if (!Array.isArray(obj.risks)) errors.push('risks 非数组')
  return errors
}

async function runTest() {
  console.log('=== GLM-4-Flash JSON 能力实测 ===\n')
  for (const mode of [{ label: 'A(无response_format)', fmt: false }, { label: 'B(有response_format)', fmt: true }]) {
    console.log(`--- 测试组 ${mode.label} ---`)
    let ok = 0, parseFail = 0, schemaFail = 0, unsupported = 0
    for (let i = 1; i <= 5; i++) {
      try {
        const start = Date.now()
        const res = await callGLM(buildPrompt({ useJsonFormat: mode.fmt }))
        const elapsed = Date.now() - start
        if (res.status !== 200) {
          if (res.data.includes('response_format') && mode.fmt) { unsupported++; console.log(`  #${i}: 不支持 response_format`); break }
          console.log(`  #${i}: HTTP ${res.status}`); continue
        }
        const content = JSON.parse(res.data).choices[0].message.content
        let parsed
        try { parsed = JSON.parse(content) }
        catch (e) {
          const m = content.match(/```(?:json)?\s*([\s\S]*?)```/)
          if (m) { try { parsed = JSON.parse(m[1]) } catch (e2) { parseFail++; console.log(`  #${i}: 解析失败 ${elapsed}ms`); continue } }
          else { parseFail++; console.log(`  #${i}: 解析失败 ${elapsed}ms`); continue }
        }
        const errs = validateSchema(parsed)
        if (errs.length) { schemaFail++; console.log(`  #${i}: Schema失败 ${errs.join(',')} ${elapsed}ms`) }
        else { ok++; console.log(`  #${i}: 成功 ${elapsed}ms`) }
      } catch (e) { console.log(`  #${i}: 错误 ${e.message}`) }
    }
    console.log(`  小结: 成功 ${ok}/5 解析失败 ${parseFail} Schema失败 ${schemaFail} 不支持 ${unsupported}\n`)
  }
  console.log('=== 完成，请将结果记录到 prompt.js 注释 ===')
}

runTest().catch(console.error)
