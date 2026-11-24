## 在线预览
[![Deploy Status](https://github.com/dongyao-tang/engineering-workflow/actions/workflows/deploy.yml/badge.svg)](https://dongyao-tang.github.io/engineering-workflow/)
👉 https://dongyao-tang.github.io/engineering-workflow/

# ProjectFlow AI — Bilingual Engineering Analysis

当前范围：V0.9 Reliable Issue Workflow。Engineering Note → Semantic Analysis → 一个或多个双语草稿 → Human Review → Tracker。疑似已有问题更新必须由人选择 Update 或 Create New。

## 启动

需要 Node.js 22.14+。在本目录运行：

```sh
npm install
npm run check:env
npm run dev
```

前端：http://127.0.0.1:5173；本地 API：http://127.0.0.1:3001。
`npm run dev` 同时启动两个服务。生产构建 `npm run build` 只生成前端文件，不是包含后端的部署包。

## Provider 与本地密钥

服务端由 `LLM_PROVIDER` 选择模型服务，默认和当前首选为 `deepseek`：

```ini
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=...
OPENAI_API_KEY=...
```

只有被选择 provider 的 Key 会用于请求。DeepSeek 默认模型是 `deepseek-flash`，可用 `DEEPSEEK_MODEL` 覆盖；OpenAI 默认模型是 `gpt-4.1-mini`，可用 `OPENAI_MODEL` 覆盖。

推荐使用 Windows 用户环境变量。DeepSeek 运行 `Configure-DeepSeekKey.ps1`；OpenAI 运行 `Configure-LocalKey.ps1`。两个脚本都使用隐藏输入，不将 Key 放进命令参数、聊天、项目文件或前端。显示名称不会参与鉴权。

后端按当前进程环境、可选 `.env.local`、Windows 用户/系统环境读取。无需为这个应用写 `.env.local`；如果采用文件方式，该文件已被 `.gitignore` 的 `.env*` 排除。不要使用任何 `VITE_*_API_KEY`。

配置后重启 `npm run dev`。`npm run check:env` 仅返回 `serverCanReadKey` 和 `authenticationTested` 布尔值，不打印完整或部分 Key。`serverCanReadKey: true` 只表示配置存在，真实鉴权由分析请求和 live tests 验证。

React 只请求 `/api/analyze`，Vite 将它代理给本地 API。只有 `server/config.ts` 读取凭据，只有选中的服务端 provider 向对应 API 发送 Authorization。前端构建不包含服务端代码。Vite 拒绝浏览器访问 `.env*`、server、scripts、PowerShell 文件。API 只监听 loopback，校验 Host/Origin，要求 JSON 请求，不开放 CORS。

错误只返回固定错误码，不透传 provider 错误正文、请求头或异常对象。应用不记录 Key、原始记录或模型响应日志。已有审核记录继续保存在本机浏览器 localStorage；使用 AI 模式分析时，输入记录与术语约束会发送给当前选择的 provider。

## AnalysisProvider

```text
React → LLMAnalysisProvider (HTTP adapter)
      → POST /api/analyze
      → server/provider factory (LLM_PROVIDER)
      ├─ DeepSeekAnalysisProvider → DeepSeek Responses API
      │                         └─ 空/截断输出时最多两次重试，再回退到兼容函数调用
      └─ OpenAIAnalysisProvider   → OpenAI Responses API
      → shared JSON Schema + shared server validation
      → server schema validation / pending-field recovery
      → bilingual IssueDraft[] → per-draft Human Review → Tracker

Offline selection → MockAnalysisProvider → explicitly unanalysed manual draft
```

模型一次产生中文和英文，不在切换语言时调用翻译。每条记录一个 ID，风险、状态和日期共享。Owner 也保存 zh/en 表达。人工编辑某种语言后，另一语言保留并标记待复核。

只将真正独立的问题拆成多条草稿。每条依次审核、保存或跳过。服务端向模型提供现有 Tracker 的只读摘要，模型可标记 `possible_update` 并建议匹配的 ID，但不会自动覆盖或重复创建。用户选择 Update 后保留原 ID、已有字段和历史记录，并追加本次 Note 的状态事件；选择 Create New 才新增 ID。

服务端生成 `referenceDate` 与 `timeZone`，并计算相对日期提示。浏览器不能指定日期基准；错误的相对截止日期会被服务端降级为待确认。测试开始、实验室窗口等计划日期可写入观察或下一步，不必强行写进 `dueDate`。

每个字段具有 extracted / inferred / missing / human 标记、原文证据和简短双语说明。服务端验证引用确实出现在原文；无依据内容降级为待确认。负责人、日期拒绝 inferred；Owner 还必须提供“当前或后续明确分配”依据，历史措施执行者不能自动变成负责人。Schema 校验并不证明语义事实完全正确，因此仍必须人工审核。显式风险和状态优先、根因的确认程度、措施执行时态、数字完整性由提示词约束并通过真实模型验收评估。

缺字段或非法格式按字段降级；拒绝、截断或非法 JSON 返回带警告的待确认草稿，保留原始记录。认证失败、限流或网络故障显示明确错误，用户可主动切换离线模式；不会静默以 Mock 冒充 AI 结果。

旧 v1 数据迁移到 v2：保留 ID、原文、既有表达和审核时间；`unassessed` → `needs_assessment`，`inProgress` → `in_progress`。旧存储键不删除。缺失译文和旧 Owner 表达标记待复核。

## 文件

- `src/types.ts`：IssueDraft / Issue / LocalizedText / provenance
- `src/services/providers.ts`：provider 接口
- `src/services/llmAnalysisProvider.ts`：浏览器 HTTP adapter
- `src/services/mockProviders.ts`：离线模式；旧周报只作数据契约适配
- `src/components/IssueReview.tsx`：双语字段、证据、人工审核
- `src/domain/schema.ts`：前后端共享运行时校验
- `src/storage.ts`：v1 → v2 迁移
- `src/data/engineeringGlossary.ts`：工程术语约束
- `server/prompt.ts`：完整提取、有限推断、双语表达规则
- `server/analysisSchema.ts`：strict JSON Schema、服务端字段恢复
- `server/dateHints.ts`：由服务端日期基准计算相对日期
- `src/domain/lifecycle.ts`：人工确认后的 Create / Update 与历史保留
- `server/providers/responsesAnalysisProvider.ts`：OpenAI-compatible Responses API 共用调用与结果解析
- `server/providers/deepSeekAnalysisProvider.ts`：DeepSeek endpoint / model 配置
- `server/providers/openAIAnalysisProvider.ts`：OpenAI endpoint / model 配置
- `server/providers/factory.ts`：按 `LLM_PROVIDER` 选择 provider；以后可在此增加 Doubao
- `server/config.ts`：仅服务端读取密钥
- `server/http.ts`：输入校验、错误码、请求限制
- `vite.config.ts`：本地代理与私有文件访问限制

## 验证

```sh
npm test
npm run build
npm run check:env
npm run test:live
npm run test:v09
```

`npm test` 使用测试专用的合成模型响应，覆盖数据契约、恢复、引用验证、迁移、HTTP 边界，不证明真实模型的语义质量。测试 fixture 不会被生产分析器读取。

`npm run test:live` 使用用户提供的完整 A/B 记录调用当前选择的真实 provider；没有对应 Key 时明确跳过。它检查明确风险、状态、Owner、日期、A 的 32/7/200、假设措辞及措施/下一步关键内容。自动检查后仍需人工阅读中英文草稿，确认措辞和事实一致。

`npm run test:v09` 使用 2026-09-20（Asia/Shanghai）作固定基准，逐条运行 8 个新增真实模型金标案例，并输出每条通过/失败原因。它会调用付费模型；没有当前 provider Key 时退出。模型输出有波动，因此通过一次不代表所有未来输入都可靠，人工审核仍是保存前的必经步骤。

未设置真实 Key 时不能宣称模型验收通过。DeepSeek 空/截断/非法结构化输出最多重试两次，仍失败时尝试一次官方兼容 Chat Completions 函数调用；全部失败则返回带警告的待确认草稿。认证、余额或限流错误不自动重试。本地 API 每分钟最多 6 次、每次服务启动最多 25 次，且同时只允许一次分析。这些是本地调用保护，不是 provider 账户 spending limit。

## 官方参考

- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/models/gpt-4.1-mini
- https://api-docs.deepseek.com/guides/responses_api/
- https://api-docs.deepseek.com/api/create-response/
- https://api-docs.deepseek.com/guides/tool_calls/

本轮不扩展 Dashboard、Weekly Update 或其他功能。

服务端模型请求支持 HTTPS_PROXY / HTTP_PROXY；未设置时读取 Windows 已启用的 HTTP 代理。代理仅用于服务端请求，保留 TLS 证书验证。
