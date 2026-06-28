// P0-pre: GLM JSON 能力实测脚本（已切 GLM-4.5）
// 用法: GLM_KEY=你的key node scripts/test-glm-json.js

const https = require('https')

const GLM_KEY = process.env.GLM_KEY
if (!GLM_KEY) { console.error('错误: 请先设置 GLM_KEY'); process.exit(1) }

const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const MODEL = 'glm-4.7'

const systemPrompt = '你是徒步建议助手。必须返回JSON对象，包含字段：weatherWindow(含days数组)、gear(含essential/recommended/optional三个数组)、risks(数组)、notes(数组)、photoTiming、microclimate、disclaimer。致命风险必须在risks中。'
const userPrompt = '路线：武功山\n日期：2026-07-05\n水平：中级\n天数：1\n天气：7月5日 22-29C 降水60% 风速4m/s\n海拔：1918m\n装备规则：夏季中海拔单日 必备防雨外套\n请生成路书建议JSON。'

function callGLM(useFmt) {
  return new Promise((resolve, reject) => {
    const body = { model: MODEL, messages: [{role:'system',content:systemPrompt},{role:'user',content:userPrompt}], temperature: 0.3 }
    if (useFmt) body.response_format = { type: 'json_object' }
    const data = JSON.stringify(body)
    const start = Date.now()
    const req = https.request({
      method:'POST', hostname:'open.bigmodel.cn', path:'/api/paas/v4/chat/completions',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${GLM_KEY}`,'Content-Length':Buffer.byteLength(data)},
      timeout: 30000,
    }, (res) => {
      let d=''
      res.on('data',c=>d+=c)
      res.on('end',()=>resolve({status:res.statusCode,data:d,elapsed:Date.now()-start}))
    })
    req.on('error',reject)
    req.on('timeout',()=>{req.destroy();reject(new Error('timeout 30s'))})
    req.write(data); req.end()
  })
}

function validateSchema(obj) {
  const errors = []
  if (!obj.weatherWindow) errors.push('缺weatherWindow')
  if (!obj.gear) { errors.push('缺gear') }
  else {
    if (!Array.isArray(obj.gear.essential)) errors.push('gear.essential非数组')
    if (!Array.isArray(obj.gear.recommended)) errors.push('gear.recommended非数组')
    if (!Array.isArray(obj.gear.optional)) errors.push('gear.optional非数组')
  }
  if (!Array.isArray(obj.risks)) errors.push('risks非数组')
  return errors
}

async function run() {
  console.log(`=== GLM-4.5 JSON 能力实测 ===\n`)
  for (const [label, fmt] of [['A(无response_format)', false], ['B(有response_format)', true]]) {
    console.log(`--- 测试组 ${label} ---`)
    let ok=0, pf=0, sf=0
    for (let i=1;i<=5;i++) {
      try {
        const res = await callGLM(fmt)
        if (res.status!==200) { console.log(`  #${i}: HTTP ${res.status} ${res.data.substring(0,80)}`); continue }
        const content = JSON.parse(res.data).choices[0].message.content
        let parsed
        try { parsed = JSON.parse(content) }
        catch(e) {
          const m = content.match(/```(?:json)?\s*([\s\S]*?)```/)
          if (m) { try { parsed = JSON.parse(m[1]) } catch(e2) { pf++; console.log(`  #${i}: 解析失败 ${res.elapsed}ms`); continue } }
          else { pf++; console.log(`  #${i}: 解析失败 ${res.elapsed}ms`); continue }
        }
        const errs = validateSchema(parsed)
        if (errs.length) { sf++; console.log(`  #${i}: Schema失败 ${errs.join(',')} ${res.elapsed}ms`) }
        else { ok++; console.log(`  #${i}: 成功 ${res.elapsed}ms`) }
      } catch(e) { console.log(`  #${i}: 错误 ${e.message}`) }
    }
    console.log(`  小结: 成功${ok}/5 解析失败${pf} Schema失败${sf}\n`)
  }
  console.log('=== 完成 ===')
}
run().catch(console.error)
