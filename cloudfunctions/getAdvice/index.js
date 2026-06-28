// P0 骨架：返回含 elevation 的 mock 数据
// P5 将替换为真实实现（调 GLM + Open-Meteo + 高德 POI）

exports.main = async (event) => {
  const { route, date, level, days } = event

  // 输入校验
  if (!route || !date || !level) {
    return { ok: false, error: 'missing_params', message: '缺少必要参数' }
  }

  // mock 数据（含 elevation 字段）
  return {
    ok: true,
    degraded: false,
    data: {
      weatherWindow: {
        days: [
          { date: '2026-07-05', tempMin: 18, tempMax: 26, precipProb: 0.6, windMs: 4, recommendedWindow: '清晨6-9点' },
          { date: '2026-07-06', tempMin: 17, tempMax: 25, precipProb: 0.4, windMs: 3, recommendedWindow: '清晨6-9点' },
        ],
        source: 'Open-Meteo (mock)',
        fetchedAt: new Date().toISOString(),
      },
      gear: {
        essential: [{ item: '防雨外套', reason: '午后雷暴高发（mock）' }],
        recommended: [{ item: '登山杖', reason: '长下坡保护膝盖（mock）' }],
        optional: [],
      },
      risks: [{ risk: '午后雷暴', level: '致命', advice: '必须在12点前下撤（mock）' }],
      notes: ['mock 数据，P5 替换为真实建议'],
      photoTiming: { sunrise: '05:12', sunset: '19:34', goldenHour: '05:30-06:30', blueHour: '04:50-05:10' },
      microclimate: { humidity: 0.85, windMs: 3.2, dewPointSpread: 2.1 },
      disclaimer: '本建议由 AI 生成，仅供参考（mock）',
      meta: {
        generatedAt: new Date().toISOString(),
        weatherSource: 'Open-Meteo (mock)',
        llmModel: 'glm-4-flash (mock)',
        elevation: 1918,
        coords: { lat: 27.4543, lon: 114.1765 },
      },
    },
  }
}
