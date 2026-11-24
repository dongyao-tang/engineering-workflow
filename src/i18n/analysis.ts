export const analysisMessages={
 zh:{mode:'分析模式',llm:'AI 语义分析',mock:'离线 Mock',help:'一次分析生成中英文草稿 · 原始记录将发送给当前模型服务 · 必须人工审核',offline:'离线模式不执行语义分析或翻译，仅保留原文供人工填写。',review:'请检查全部字段。提取依据来自原文；推断必须结合工程判断复核。',warning:'分析提醒',extracted:'原文提取',inferred:'上下文推断',missing:'待确认',human:'人工修改',evidence:'查看依据',working:'正在分析…',healthMissing:'服务端未配置当前模型服务的 API Key。请完成本地安全配置并重启服务。',healthUnavailable:'本地分析服务尚未连接。',healthReady:'服务端已读取当前 provider 的 Key；实际可用性以分析请求为准。',retryOffline:'使用离线草稿',tooLong:'记录不能超过 12,000 个字符。',invalidTitle:'请填写有效的问题描述，不能只保留“待确认”。'},
 en:{mode:'Analysis mode',llm:'AI semantic analysis',mock:'Offline Mock',help:'One analysis, two languages · Notes are sent to the selected model provider · Human review required',offline:'Offline mode performs no semantic analysis or translation. Original notes are retained for manual entry.',review:'Review all fields. Extracted facts cite the source; inferred content requires engineering judgment.',warning:'Analysis warning',extracted:'Extracted',inferred:'Inferred',missing:'Pending',human:'Human edited',evidence:'View evidence',working:'Analyzing…',healthMissing:'The selected model provider API key is not configured on the server. Complete local setup and restart the server.',healthUnavailable:'Local analysis service is not connected.',healthReady:'Server can read the selected provider key; API availability is verified when analysis is requested.',retryOffline:'Use offline draft',tooLong:'Notes must not exceed 12,000 characters.',invalidTitle:'Enter a meaningful issue description, not just TBD.'}
};
export const analysisErrors:Record<string,{zh:string;en:string}>={
 missing_key:{zh:'服务端未配置 Key；未执行分析。',en:'Server key is missing; analysis was not run.'},
 invalid_key:{zh:'API 身份验证失败。请检查本地 Key。',en:'API authentication failed. Check the local key.'},
 access_denied:{zh:'项目或模型访问被拒绝。',en:'Project or model access was denied.'},
 insufficient_balance:{zh:'当前模型服务账户余额不足，请在 provider 控制台充值后重试。',en:'The selected model provider has insufficient balance. Add funds in its console and retry.'},
 rate_limit:{zh:'当前模型服务触发请求限流，请稍后重试。',en:'The selected model provider rate limit was reached. Try again shortly.'},
 local_limit:{zh:'已达到本地请求限制（每分钟 6 次、每次服务启动 25 次）。',en:'Local request limit reached (6/minute, 25 per server session).'},
 busy:{zh:'已有分析正在进行，请稍后重试。',en:'An analysis is already running. Try again shortly.'},
 connection:{zh:'本地服务连接失败或请求超时，原文已保留。',en:'Local connection failed or timed out. Original note retained.'},
 invalid_input:{zh:'输入或日期上下文格式无效。',en:'Invalid input or date context.'},
 invalid_response:{zh:'服务端结果格式无效，原文已保留，请重试或使用离线草稿。',en:'Invalid server result. Original retained; retry or use an offline draft.'},
 upstream_unavailable:{zh:'模型服务连接失败或超时，原文已保留。',en:'Model service unavailable or timed out. Original note retained.'},
 upstream_error:{zh:'模型服务返回错误，原文已保留。',en:'Model service returned an error. Original note retained.'},
 analysis_failed:{zh:'分析失败，原文已保留。',en:'Analysis failed. Original note retained.'}
};
