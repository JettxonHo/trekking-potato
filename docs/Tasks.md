# 徒步薯 — 任务清单（Phase 3 Tasks）

> 基于 Spec v0.3 + Plan v0.3 | 阶段：Phase 3 Tasks
> 版本：v1.0 | 日期：2026-06-28
> 用途：Codex goal 模式输入，agent 自主执行至完成
> 约束：每个任务顺序执行，完成前一个才进下一个；每完成一个 git commit；全部完成打 tag v0.3-mvp

---

## 全局约束（所有任务通用）

1. **git 纪律**：每个任务完成 = git commit（Conventional Commits 格式：`feat:`/`fix:`/`chore:` 等）；dev 分支开发，P0 完成后建 dev，P8 合并 main
2. **凭据隔离**：所有 API key（GLM、高德）只存云函数环境变量，代码里只引用 `process.env.XXX`，绝不硬编码
3. **诚实标注**：所有数据局限（逆温层、地形遮挡、置信度递减）必须在 UI 诚实标注，不隐藏
4. **降级不隐藏**：LLM 失败时 degraded=true + UI 标红 + 风险栏强制空，不假装成功
5. **项目目录**：`/Users/ketchup/Documents/Codex/2026-06-27/qin/trekking-potato/`

---

## P0-pre：GLM-4-Flash JSON 能力调研

- [ ] **Task**: 调研 GLM-4-Flash 的 JSON 输出能力，确定 P5 的 schema 校验策略
  - Acceptance: 明确结论写入 `cloudfunctions/getAdvice/prompt.js` 注释：GLM-4-Flash 是否支持 `response_format:json_object`；用 5-10 条真实 prompt（含天气+装备规则+安全约束）实测 JSON 成功率和字段完整率；记录 timeout 上限和并发限制
  - Verify: 结论基于实测而非仅文档；JSON 成功率有统计数据（如"10 次测试 8 次成功"）
  - Files: `cloudfunctions/getAdvice/prompt.js`（注释）
  - 备注：需要调用智谱 API（用你已有的 key 配在环境变量），可用临时脚本测试

## P0：项目骨架 + 云开发环境

- [ ] **Task**: 初始化项目骨架，打通小程序+云函数开发链路
  - Acceptance: 目录结构按 Plan §2；空 getAdvice 云函数返回含 elevation 字段的 mock JSON；空 index 页按钮调用云函数弹出 mock 结果；git init + 首个 commit + tag v0.1-spec
  - Verify: 微信开发者工具真机预览，点按钮看到 mock 返回（含 elevation 字段）→ 链路通
  - Files: `miniprogram/app.js`, `miniprogram/app.json`, `miniprogram/pages/index/`, `cloudfunctions/getAdvice/index.js`, `project.config.json`, `.gitignore`, `README.md`
  - .gitignore 必含: `node_modules/`, `miniprogram_npm/`, `.env`, `project.private.config.json`, `*.log`, `.DS_Store`

## P1：地理编码模块（geocode.js）—— 含海拔 + 坐标转换

- [ ] **Task 1.1**: 编写内置热门路线表（10-15 条，含准海拔和 GCJ-02 坐标）
  - Acceptance: 至少 10 条路线，每条含 name/lat/lon/elevation（武功山金顶 1918m、四姑娘山二峰 5276m、五台山北台 3058m、喀纳斯、格聂神山、贡嘎、鳌太起点、太白山、海坨山、大五朝台等）；数据来源标注（手填/查阅）
  - Verify: 数据完整，海拔准确（抽查 3 条与公开数据对比）
  - Files: `cloudfunctions/getAdvice/data/routes.js`

- [ ] **Task 1.2**: 实现 resolveLocation(route) —— 含模糊匹配、高德 POI、海拔查询、坐标转换
  - Acceptance: 1.内置表包含匹配优先 2.未命中调高德 POI 关键字搜索（非 geocode）+ 类别筛选（风景名胜/自然地物/山峰，实测各山分类）3.编辑距离≤2 强制用户确认（防武当山/武功山假阳性）4.POI 命中后查 Open-Meteo elevation API 取海拔 5.**GCJ-02→WGS84 坐标转换**（引入 gcoord 或手写算法）后再传 Open-Meteo 6.全失败明确报错"未找到位置"
  - Verify: 输入"武功山"返回内置表 {lat,lon,elevation:1918}；输入"武当山"不误匹配武功山（编辑距离确认）；输入"不存在的xyz山"返回报错；输入"小五台"（非内置表）走高德 POI 链路返回坐标+海拔
  - Files: `cloudfunctions/getAdvice/geocode.js`, `cloudfunctions/getAdvice/data/routes.js`

## P2：天气模块（weather.js）—— 含 elevation + 递减率局限标注

- [ ] **Task 2.1**: 实现 fetchWeather(lat, lon, elevation, date)
  - Acceptance: 调 Open-Meteo Forecast API，传 elevation 参数；返回 7 天逐日 tempMin/tempMax/precipProb/windMs；第 5 天后标注 confidence:"参考"；precipProb 在中国区域标注 note:"来自 GFS 集合，验证度低于欧美"；超时/失败返回明确错误
  - Verify: 输入四姑娘山二峰坐标+海拔 5276，返回温度应明显低于网格点 3000m 温度（验证海拔修正生效）；**先实测 Open-Meteo 从腾讯云的连通性和延迟**（国际 API，记录实际响应时间）
  - Files: `cloudfunctions/getAdvice/weather.js`

- [ ] **Task 2.2**: 递减率局限标注数据
  - Acceptance: 返回数据含 `elevationCaveat: "Open-Meteo 用标准递减率线性修正，逆温层/辐射冷却场景温度可能反向偏差，山区微气候仅供参考"`；前端据此渲染警示
  - Verify: 返回 JSON 含 elevationCaveat 字段
  - Files: `cloudfunctions/getAdvice/weather.js`

## P3：天文时刻模块（sun-events.js）—— suncalc + 地形遮挡标注

- [ ] **Task 3.1**: 实现 calcSunEvents(lat, lon, date)
  - Acceptance: 引入 suncalc（纯 JS）；返回 sunrise/sunset/goldenHour/blueHour；返回数据含 `terrainCaveat: "未考虑地形遮挡，山谷实际日出可能晚 1-2 小时"`
  - Verify: 输入武功山+7月5日，与 timeanddate.com 对比天文时刻一致；返回含 terrainCaveat
  - Files: `cloudfunctions/getAdvice/sun-events.js`

## P4：装备规则表 + Prompt 工程

- [ ] **Task 4.1**: 编写 gear-rules.js（季节×海拔×天数×纬度带）
  - Acceptance: 维度完整——季节（夏/过渡季/冬，按温度区间）、海拔（低<1500/中1500-3500/高3500-5500/极高>5500，边界用备注如"5276m 按高海拔偏极高处理"）、天数（1-7 数字）、纬度带（南方湿润/北方干燥，按秦岭-淮河线粗分）；致命风险硬约束枚举（失温/高反/雷击/滑坠，对应装备必入清单）；覆盖云南 4000m 和新疆 4000m 的差异化
  - Verify: 抽查 4 个组合（夏季低海拔单日南方 / 冬季高海拔多日北方）规则合理且差异化；致命风险装备在对应组合中出现
  - Files: `cloudfunctions/getAdvice/gear-rules.js`

- [ ] **Task 4.2**: 编写 prompt.js（system prompt + 模板 + 降级模板）
  - Acceptance: system prompt 含角色/知识边界/JSON schema 约束/安全护栏；模板注入 route/date/level/days/weather/gear-rules/sun-events；降级模板含 degraded:true + 风险栏强制空 + 预置通用建议
  - Verify: 模板渲染后变量正确注入（无占位符残留）；降级模板 JSON 合法
  - Files: `cloudfunctions/getAdvice/prompt.js`

## P5：核心云函数 getAdvice（咽喉切片）—— 并行 + 严格校验 + 分步加载

- [ ] **Task 5.1**: 串联全链路 + Promise.all 并行
  - Acceptance: resolveLocation → Promise.all([fetchWeather, calcSunEvents]) → callGLM；callGLM 传完整 context（含 weather+gear+sun+route+date+level+days）；如 P0-pre 确认支持 response_format 则启用
  - Verify: 端到端"武功山/7月5日/1天/中级"返回完整 JSON
  - Files: `cloudfunctions/getAdvice/index.js`

- [ ] **Task 5.2**: JSON schema 校验 + 分层降级
  - Acceptance: 核心字段（weatherWindow/gear/risks）缺失或类型错 → 降级（degraded:true + 风险栏空 + 顶部横幅）；非核心字段（notes/photoTiming/microclimate）缺失 → 默认值填充不降级；校验逻辑有单元覆盖
  - Verify: 构造 LLM 返回缺 risks → 触发降级 degraded:true；构造缺 notes → 不降级用默认值；构造合法 JSON → 正常通过
  - Files: `cloudfunctions/getAdvice/index.js`

- [ ] **Task 5.3**: 超时处理 + 分步加载
  - Acceptance: 云函数超时设 25 秒（云函数配置）；前端分步加载——云函数先返回 geo+weather+sun（第一阶段，<8s 渲染），GLM 结果异步增量更新（第二阶段）；超时返回 {ok:false,error:'timeout'} 前端显示"生成超时，请重试"
  - Verify: 正常请求天气先出建议后出；mock GLM 延迟 20s 验证天气先渲染、建议后出；mock GLM 超时验证 25s 报错
  - Files: `cloudfunctions/getAdvice/index.js`, `miniprogram/pages/result/result.js`

- [ ] **Task 5.4**: meta 注入
  - Acceptance: 返回 JSON 含 meta:{generatedAt, weatherSource:'Open-Meteo', llmModel, elevation, coords:{lat,lon}}
  - Verify: 返回 JSON 含完整 meta
  - Files: `cloudfunctions/getAdvice/index.js`

## P6：前端输入页（index）—— 含天数数字输入

- [ ] **Task 6.1**: 输入表单
  - Acceptance: 路线名（文本输入）、出发日期（日期选择器，禁止过去日期）、天数（数字输入框 1-7）、徒步水平（三级单选 初级/中级/高级）；输入校验（空路线/过去日期/未选水平天数有兜底提示）；提交按钮调 wx.cloud.callFunction('getAdvice')；loading 态；错误态友好提示
  - Verify: 真机预览填表提交看到 loading→跳转结果页；空提交有提示；过去日期不可选
  - Files: `miniprogram/pages/index/index.wxml`, `index.wxss`, `index.js`

## P7：前端结果页（result）—— 含海拔标注 + 降级标红 + 分步渲染

- [ ] **Task 7.1**: 正常态渲染（全字段）
  - Acceptance: 顶部"本数据基于海拔 XXXXm"；天气窗口卡片（7 天，第 5 天后标"参考"）；elevationCaveat 警示（逆温层标注）；装备清单（必备/推荐/可选分层，每项配理由）；风险提示（致命风险红色加粗）；出片时机（标注 terrainCaveat 地形遮挡）；微气候原始数据；免责声明+时间戳+海拔+来源
  - Verify: 真机预览 P5 正常 JSON 渲染全字段；海拔标注显示；caveat 警示可见
  - Files: `miniprogram/pages/result/result.wxml`, `result.wxss`, `result.js`

- [ ] **Task 7.2**: 降级态渲染
  - Acceptance: degraded=true 时顶部红色横幅"AI 生成失败，以下为基础参考"；风险栏标红"AI 不可用，请查专业路书"；装备栏显示通用预置建议
  - Verify: 传 degraded=true JSON，验证红色横幅+风险栏标红；传残缺 JSON 验证不白屏崩溃
  - Files: `miniprogram/pages/result/result.wxml`, `result.wxss`

- [ ] **Task 7.3**: 分步加载渲染
  - Acceptance: 第一阶段（geo+weather+sun）到达时立即渲染天气/天文卡片；第二阶段（GLM 建议）到达时增量渲染装备/风险/注意事项；两阶段间有 loading 指示
  - Verify: mock 分步返回，天气先出建议后出，用户等待中有反馈
  - Files: `miniprogram/pages/result/result.js`

## P8：集成测试 + 部署

- [ ] **Task 8.1**: 端到端测试（含非 happy path）
  - Acceptance: 3 条内置表路线跑通（武功山/四姑娘山二峰/五台山朝台）；2 条非内置表路线跑通（如小五台/大白山，验证高德 POI+elevation 兜底）；异常输入有兜底（空路线/过去日期/无效水平/小众地名/边界海拔）；四姑娘山二峰温度明显低于网格点（海拔修正可见）
  - Verify: 5 条路线真机跑通无崩溃；异常输入不白屏；海拔修正数据可见
  - Files: 无新文件，测试记录写入 README

- [ ] **Task 8.2**: 建议质量验证
  - Acceptance: 重点查遗漏型错误（如二峰没提冰爪/结组绳 = 致命）；至少 1 条路线找有经验驴友 review；"建议合理"有明确 rubric（致命装备是否齐全/风险是否覆盖/天气数据是否合理）
  - Verify: review 记录写入 README；遗漏型错误清零
  - Files: README.md（review 记录）

- [ ] **Task 8.3**: 部署 + 验收 + 打 tag
  - Acceptance: 云函数部署云端；真机全链路验收；合并 dev→main；打 tag v0.3-mvp；朋友可扫码使用
  - Verify: 朋友扫码打开小程序，输入路线获取建议成功
  - Files: 无新文件

---

## 完成标志

全部任务完成 = 以下条件同时满足：
1. 所有 P0-pre 到 P8 任务打勾
2. git 仓库有完整提交历史，tag v0.3-mvp 存在
3. 真机可扫码使用，输入武功山/日期/天数/水平能获取完整建议
4. 非内置表路线能走通高德 POI 兜底
5. 降级态（LLM 失败）不白屏、有标红提示
6. 海拔数据可见、递减率局限有标注、地形遮挡有标注
7. 所有 API key 在环境变量、代码零硬编码 key
