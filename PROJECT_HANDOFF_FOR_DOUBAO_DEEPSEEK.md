# ProjectFlow AI — 项目统筹与继续调试交接说明

> 将本文件从本标题开始完整复制给豆包或 DeepSeek，即可作为后续开发与测试的上下文。  
> 本文不包含任何 API Key、客户资料或真实工程记录；不要要求用户在聊天中发送密钥。

## 1. 你的角色与当前任务边界

你正在维护一个本地运行的 Web Demo：**ProjectFlow AI — AI-Assisted Bilingual Project Engineering Workflow**。

产品定位不是聊天机器人或大型项目管理软件，而是展示以下闭环：

```text
Raw Engineering Notes
→ AI Structuring
→ Engineering Review
→ Issue / Risk / Action Tracking
→ Professional Chinese / English Communication
```

核心原则：**AI assists engineering judgment, not replaces it.** 所有 AI 生成的 Issue Draft 和 Weekly Update 都必须先由人工审核，才可作为项目记录或对外沟通内容使用。

当前阶段的产品已完成到 **V1.0 — AI Weekly Update**。后续仅处理用户明确授权的 bug、测试失败或小范围完善；**不要自行扩展功能范围**。

### 绝对不要自行开发

- Gantt、Risk Register、EC/ECN Tracker、Validation Tracker、Cost analysis
- 多项目、登录、账号、云数据库、自动邮件发送、PDF 报告
- 新的 Analysis 功能或未经明确授权的 UI 大改
- 为了“看起来更好”而修改已经冻结的 Analysis Prompt

## 2. 工作目录与启动方式

实际应用目录：

```text
C:\Users\amoy\Documents\Codex\2026-09-16\ai-assisted-project-engineering-workflow-product\outputs\engineering-workflow
```

在 PowerShell 中运行：

```powershell
Set-Location "C:\Users\amoy\Documents\Codex\2026-09-16\ai-assisted-project-engineering-workflow-product\outputs\engineering-workflow"
npm run dev
```

浏览器访问：`http://127.0.0.1:5173/`。前端为 Vite，服务端为本地 Node HTTP server，默认端口 `3001`。

主要 API：

```text
GET  /api/health
POST /api/analyze
POST /api/weekly
```

## 3. 安全与隐私规则（必须遵守）

1. API Key 仅可保存在本机服务端环境变量或 `.env.local`，绝不可放进 React/Vite 前端、代码、测试输出、日志、截图或 Git。
2. 推荐环境变量（值由用户本机已有配置提供，禁止要求其在聊天里粘贴）：

   ```ini
   LLM_PROVIDER=deepseek
   DEEPSEEK_API_KEY=...
   OPENAI_API_KEY=...
   DEEPSEEK_MODEL=...
   ```

3. `.env.local` 必须在 `.gitignore` 内。不要打印、回显、截取或验证完整密钥；只能检查“变量是否存在/服务端是否可用”。
4. 所有模型调用只能由 `server/` 发出。React 前端只能调用本地 `/api/*`。
5. 不要把真实公司、客户、料号、尺寸、成本、图纸或 NDA 信息传给外部模型。测试应使用虚构的脱敏数据。
6. 当前用户在 `127.0.0.1` 的 localStorage 中有自己的 Tracker 数据（曾有 8 条记录）。未经明确授权，**不要通过 UI 删除、导入覆盖、生成模型报告或修改这些真实本地记录**。建议使用自动化 synthetic fixtures，或使用不同 origin（例如 `localhost`）的空 localStorage 做 UI 冒烟测试。
7. 不要假设当前文件夹已经初始化为 Git 仓库。需要提交前先确认；无论是否 Git，都绝不提交密钥或 `.env.local`。

## 4. 技术架构

```text
React / Vite UI (5173)
  ├─ i18n: 中文 | English
  ├─ localStorage workspace / backup / CSV export
  └─ /api/analyze, /api/weekly

Local Node server (127.0.0.1:3001)
  ├─ provider factory (deepseek | openai | mock)
  ├─ AnalysisProvider
  │   ├─ MockAnalysisProvider       fallback / offline / tests
  │   ├─ OpenAIAnalysisProvider     optional
  │   └─ DeepSeekAnalysisProvider   current default
  └─ WeeklyReportProvider (DeepSeek)
        └─ OpenAI-compatible endpoint, structured tool output
```

DeepSeek 使用 OpenAI-compatible API；切换 provider 只可修改调用层，不能改变前端业务、IssueDraft schema 或人工审核流程。

## 5. 核心数据模型与双语原则

同一工程事实只保存一条 Issue；中文与英文不是两条记录，也不是切换时临时机器翻译。

```ts
interface LocalizedText {
  zh: string;
  en: string;
}

interface IssueDraft {
  issue: LocalizedText;
  backgroundObservation: LocalizedText;
  impact: LocalizedText;
  rootCauseAssumption: LocalizedText;
  action: LocalizedText;
  nextStep: LocalizedText;
  riskLevel: "low" | "medium" | "high" | "needs_assessment";
  status: "open" | "in_progress" | "blocked" | "closed";
  owner: LocalizedText;
  dueDate: string | null;
  sourceNote: string;
  sourceLanguage: "zh" | "en" | "mixed";
}
```

枚举值和日期只存一份，UI 通过 i18n 显示。中文术语必须使用工程项目语境：

```text
Action → 措施（不可译为“行动”）
Next Step → 下一步
Owner → 负责人
Due Date → 截止日期
Risk Level → 风险等级
Root Cause / Assumption → 根因 / 待验证假设
Background / Observation → 背景 / 观察
```

术语库位于 `src/data/engineeringGlossary.ts`，用于约束专业表达，**不是逐词替换器**。NPI、DFM、BOM、FAI、EC/ECN、MP 等缩写应保留行业用法。

## 6. 已冻结：V0.9 Analysis Core

当前标记：**V0.9 Stable within current golden-test scope**。

除非新功能引入了已证实的 regression，禁止改动下列内容：

- DeepSeek Analysis Prompt
- Critical Fact extraction
- bilingual draft generation
- factual validation
- existing issue update detection
- AnalysisProvider 架构

分析流程是：

```text
Engineering Note
→ Extract Critical Facts
→ Compose structured bilingual IssueDraft[]
→ Factual Validation
→ Human Review
→ Create New / Update existing Tracker Issue
```

能力与约束：

- 支持中、英文和中英混合输入。
- 一个 Note 可以得到多个真正独立的 `IssueDraft`；同一问题的现象、影响、措施不可被错误拆开。
- 已有 Issue 的后续描述应识别为 `possible existing issue update`，由人工确认 Update 或 Create New；不可静默覆盖或重复新建。
- relative date 必须使用服务端提供的 `referenceDate` 与 `timezone`，模型不可自行猜“今天”。
- 区分 Extract 与 Infer：原文有的事实必须提取；允许有限项目表达推断，但绝不可虚构 Owner、Due Date、根因、数据、措施或确认状态。
- 信息不足使用 `TBD`、`Pending assessment`、`Pending validation` 等，不得编造。
- 明显矛盾必须生成 `analysisWarning`，保留原始事实，要求人工确认；不可擅自选一个版本。
- Critical Facts 包括：人名、Owner、团队/部门、供应商/客户角色、数值/比例/尺寸、日期、Risk、Status、产品/测试/验证名称，以及 confirmed/suspected/pending 的确认状态。
- 叙述字段可以专业化改写，但不可把 `Mechanical Team / 机械团队` 泛化成 `Engineering Team / 工程团队`，不可改变数值、日期、责任主体或“怀疑/已确认”状态。

风险优先级：原文明确等级优先；否则仅在影响充分时判断；不足时 `needs_assessment`。状态优先原文，语义不确定时默认为 Open 并人工复核。

## 7. Tracker Lifecycle（已完成）

### Delete / Undo

- Closed 表示真实存在且处理/验证完成，必须保留项目历史。
- Delete 仅用于错误、重复、测试或不应存在的记录；有中英确认文案。
- 删除后可在约 10 秒内 Undo。
- Undo 必须原样恢复同一个 Issue ID、全部字段、status history、`createdAt` 与 `updatedAt`；不可“重新创建”。
- Dashboard 删除后立即基于完整 Tracker 重算，Undo 后恢复。

### Filter / Sort

- Filter：Status（All/Open/In Progress/Blocked/Closed）和 Risk（All/High/Medium/Low/Needs Assessment），可组合。
- Sort：Risk（High → Medium → Low → Needs Assessment）；Due Date（最近/最晚，null/TBD 最后）；Created Time（新/旧）。
- Filter / Sort 仅影响表格显示，不得修改原始 Issue 数据。
- Dashboard 永远基于完整 Tracker，而不是过滤后的屏幕结果。

## 8. V0.9.5 Persistence / Backup / Recovery（已完成）

- Tracker 每次有效变更自动写入 localStorage；无保存按钮。
- 保存 Issues、ID、status history、时间戳、Owner、Due Date、Risk、双语正文等。
- `schemaVersion: 1` 用于 Backup；内部 Store 目前版本为 `2`。
- **Export Backup / 导出备份**：JSON 完整恢复用途，文件名含日期。
- **Import Backup / 导入备份**：先做 JSON/schema 验证；无效文件不可崩溃、不可覆盖当前数据；有效文件先确认，再 Replace current workspace。导入前会保留临时备份/快照以降低误操作风险。
- **Export Tracker / 导出 Tracker**：CSV 阅读、Excel 处理和人工分享用途，不用于恢复。UI 中文优先导中文，English 优先导英文；支持中文字符与 `null` Due Date。
- localStorage 为空或损坏时应用不可白屏；损坏数据会防止静默覆写。
- Engineering Note 输入区已放置外部 AI 隐私提示。

## 9. V1.0 AI Weekly Update（已完成）

范围仅为：

```text
Current Tracker
→ AI Weekly Update Draft
→ Human Review / Edit
→ Mark as Reviewed
→ Copy report
```

### 固定约束

- 周报只能基于当前 Tracker，不能从 source note、想象项目背景或外部信息补充事实。
- 读取**完整 Tracker**，不受当前表格 Filter / Sort 影响。
- 必须同时生成中文和英文；切换语言瞬间显示已有另一语言内容，不重调模型。
- 编辑是当前语言字段的编辑，不做自动翻译；UI 需提醒用户另一语言不会自动同步。
- 新生成的报告状态为 `AI Draft — Review Required`。点击 Mark as reviewed 后才成为 reviewed；任何后续编辑都会重新变为需要复核。
- Report 保存 Tracker snapshot。Tracker 有任何变动即显示 Outdated/stale，但绝不自动重生或覆盖人工编辑。
- 用户触发 regenerate 时，如果已有内容，必须确认；模型错误时保留旧报告并显示错误。
- 空 Tracker 可生成显式“无项目问题/No tracker issues”的本地周报，不需要浪费 API 调用。

### 周报的六个固定章节

1. Overall Status
2. Key Progress
3. Critical Issues / Risks
4. Actions / Owners
5. Decisions / Support Needed
6. Next Week Priorities

Actions / Owners 与 Next Week Priorities 使用 Tracker 已记录的 `nextStep`、Owner、Due Date；避免模型杜撰计划。Decisions / Support Needed 只有 Tracker 有明确证据才出现，否则为 None / 无。

专业含义：

- Overall Status 是完整 tracker 的项目级判断，不等于单个 Issue 风险。
- Blocked + milestone/shipment/validation impact 可导致 At Risk / High Risk，但单一 low risk 不应自动让项目红。
- 已关闭问题只有在所选时间段内有 closed history 时，才能作为 Key Progress；不可留在 Open Actions。
- 周报是决策草稿，不是事实最终版本；人审仍是必经步骤。

## 10. 主要文件地图

### 前端与领域层

```text
src/App.tsx                         页面编排、Tracker / Weekly 工作流
src/types.ts                        核心类型
src/storage.ts                      localStorage workspace
src/domain/issue.ts                 Issue 领域操作
src/domain/lifecycle.ts             Delete / Undo 等生命周期
src/domain/schema.ts                数据校验
src/domain/tracker.ts               Filter / Sort
src/domain/backup.ts                JSON backup / import / CSV
src/domain/weekly.ts                周报 domain、snapshot、编辑状态、格式化
src/components/IssueReview.tsx      AI Draft 人工审核
src/components/WeeklyUpdate.tsx     周报生成、编辑、审核、复制 UI
src/data/engineeringGlossary.ts     工程术语库
src/i18n/index.ts                   UI 文案
src/i18n/analysis.ts                分析字段、风险、状态本地化
src/services/providers.ts           前端 provider contracts
src/services/mockProviders.ts       Mock fallback / tests
src/services/llmAnalysisProvider.ts 分析 API client
src/services/weeklyReportProvider.ts 周报 API client
```

### 服务端

```text
server/index.ts                     HTTP routes、provider wiring
server/http.ts                      host/origin/json/rate protection
server/config.ts                    仅服务端环境变量加载
server/prompt.ts                    Analysis prompt（冻结）
server/criticalFacts.ts             Analysis factual extraction（冻结）
server/analysisSchema.ts            Analysis schema validation（冻结）
server/weeklyReport.ts              周报 prompt、structured compose、validation
server/providers/factory.ts         provider selection
server/providers/deepSeekAnalysisProvider.ts  DeepSeek Analysis（冻结）
server/providers/openAIAnalysisProvider.ts    OpenAI Analysis（可选）
server/transport.ts                 OpenAI-compatible transport
server/context.ts / dateHints.ts    reference date/timezone helpers
```

### 自动化测试

```text
tests/analysis.test.ts
tests/criticalFacts.test.ts
tests/v09.goldenCases.ts
tests/v09.live.ts
tests/v09.stability.ts
tests/tracker.test.ts
tests/backup.test.ts
tests/weekly.test.ts
tests/weekly.live.ts
```

## 11. Golden tests 与测试标准

V0.9 的 8 个金标场景覆盖：

1. 中英混合 Note 中两个独立 Issue
2. 缺 Owner / Due Date / Root Cause
3. 明确 Closed 的历史问题
4. Blocked 和自然语言日期
5. 低风险但未关闭
6. containment 已做、根因未确认
7. 已有 Issue 的第二次状态更新
8. 数量与状态矛盾

事实保真稳定性重点覆盖：多 Issue/团队名称、containment + 未确认根因、existing issue update、contradiction handling；允许专业句式不同，不允许关键事实漂移。

当前最近已知验证结果：

```text
npm test                 89 passed, 0 failed
npm run build            passed
npm run test:v09         8 passed, 0 failed
npm run test:weekly:live passed（DeepSeek synthetic fixture）
```

这些是上一轮记录的结果。任何修改后按影响范围重新执行：

```powershell
npm run build
npm test
npm run test:v09
npm run test:weekly:live
```

`test:v09` 和 `test:weekly:live` 会调用配置的真实 provider，可能消耗 API 额度；仅在需要回归验证时运行，且只能使用测试 fixture，不能使用用户现有 Tracker 数据。若没有配置模型，运行普通 `npm test` 与 build 仍应可用。

## 12. 已知边界与后续排查方法

1. **不要因为单次模型文风差异就调 Analysis Prompt。** 只有能复现、符合 golden/regression 定义的 Critical Fact 错误，才可最小范围修复，并必须重跑 V0.9 回归。
2. Weekly provider 和 Analysis provider 是不同职责。修复周报事实问题时优先修改 `server/weeklyReport.ts` 或 weekly tests，禁止碰冻结的 analysis 代码。
3. 周报 provider 目前主要接入 DeepSeek。若未来要支持 OpenAI 周报，应新增 `OpenAIWeeklyReportProvider`，保持相同 structured schema，不应改动前端工作流。
4. 浏览器 Clipboard 权限可能影响手工“Copy report”验证；代码使用 `navigator.clipboard.writeText`。先检查浏览器权限和 HTTPS/localhost 行为，不要因此改报告数据。
5. 周报事实约束已尽力将状态、风险、负责人、日期、next step 从 Tracker 强制引用；仍须人审，不能声称模型输出绝对正确。
6. 未确认 Git 仓库状态。任何文件修改前先检查工作区，保留用户已有改动；禁止 `reset --hard`、覆盖 `.env.local` 或清空 localStorage。

## 13. 给后续开发代理的执行规程

1. 先阅读本文件，然后在真实应用目录检查 `package.json`、相关测试与目标文件；不要凭摘要重写文件。
2. 明确复述本次用户实际授权的范围。若请求与冻结范围冲突，先说明影响、提出最小修复方案，不要擅自大改。
3. 每次只做小而可验证的改动。优先补一个会失败的自动化测试，再修复代码。
4. 修改后至少运行 `npm run build` 与 `npm test`；如果影响 Weekly，运行 `npm run test:weekly:live`（确认可消耗 API 额度）；如果触及 Analysis 才运行 `npm run test:v09`。
5. 不要通过关键词/案例硬编码来“刷过” golden tests；应使用语义结构化输出、schema validation 与通用 factual fidelity 原则。
6. 最终报告必须列出：修改文件、原因、测试命令与结果、未修改的冻结模块、已知限制。不要把密钥、原始用户工程信息或整个环境变量内容写入报告。
7. 如果用户只要求诊断，先诊断，不实施改动。若要用真实模型调试，请使用合成脱敏 fixture，除非用户明确授权使用自己的数据。

## 14. 当前状态结论

当前应用具备可演示且可日常试用的基础闭环：

```text
Engineering Note
→ Semantic bilingual Issue Draft(s)
→ Human Review
→ Tracker / history / lifecycle
→ local persistence / backup / CSV
→ bilingual AI Weekly Update Draft
→ Human Review / Copy
```

下一步不应自动开始任何新模块。等待用户提供实际 bug、测试输出或明确的下一阶段需求后，再以最小变更继续。
