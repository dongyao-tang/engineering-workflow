# V0.9 — Reliable Issue Workflow: Analysis Core Test Report

测试日期：2026-09-26。真实模型：DeepSeek（由本地服务端调用）。所有金标测试使用固定 `referenceDate=2026-09-20`、`timeZone=Asia/Shanghai`，输入为虚构记录。此报告只评估 Analysis Core，不代表未测试的真实工程记录均能自动正确处理；草稿仍须人工审核后才能进入 Tracker。

## 最终结论

**Analysis Core — V0.9 Stable（在当前金标集与下述重复测试范围内）**。最后一轮重点稳定性测试 **12/12** 通过，共 **96/96** 项关键字段断言通过；随后完整回归 **8/8** 通过。整条 `TBD` 降级草稿现在明确算失败，最终回归没有出现。达到通过条件后停止继续调 Prompt。

| 指标 | 最终结果 | 验证重点 |
|---|---:|---|
| Critical Field Accuracy | 96/96 | 4 个高波动案例 × 3 次，检查负责人/团队、数量、日期、状态、根因确认程度、Issue 数量与更新意图等 |
| Fact Preservation | 12/12；回归 8/8 | 明确事实未在最终草稿中发生关键漂移；服务端纠正时保留 `analysisWarning` |
| Multi-Issue Split Accuracy | 4/4 | Case 1 重复 3 次，加完整回归 1 次；装配与包装保持两条 Issue |
| Update Detection | 4/4 | Case 7 重复 3 次，加完整回归 1 次；均为 `possible_update`，未静默新建或覆盖 |
| Missing Information Hallucination | 0 次关键字段编造 | 最终 Case 2 的 Owner、Due Date、Root Cause 保持 TBD/null；泛化的待调查表述不填入具体技术方法 |
| Contradiction Handling | 4/4 | Case 8 重复 3 次，加完整回归 1 次；数量与关闭状态冲突均要求人工核实 |
| 最终失败 Case | 0 | 最终 8 案例回归全部通过 |

## 8 个金标案例

| Case | 最终结果 | 关键检查 |
|---|---|---|
| 1. 中英混合、两个独立问题 | Pass | 两条 Issue；`机械团队` / Mechanical team 与包装团队分别归属；3 台、2 台及 09-21 / 09-23 计划日期保留。 |
| 2. 缺 Owner / Due / Root Cause | Pass | 三个未提供字段保持待确认 / null；状态未关闭；不是整条 TBD 降级草稿。 |
| 3. 历史 Closed | Pass | 保留返工、复检及正式关闭；历史文件修订团队不被提升为当前 Owner。 |
| 4. Blocked、相对日期 | Pass | 保留定位销替换件依赖与 Blocked；09-21 测试计划、09-23 实验室窗口不误作 Issue 截止日。 |
| 5. 低风险未关闭 | Pass | Risk Low、状态未关闭；刘洋及 09-24 反馈日期保留。 |
| 6. Containment、根因未确认 | Pass | 隔离 120 件、改用合格库存为已完成措施；供应商猜测仍是待验证假设；赵磊及 09-25 保留。 |
| 7. 更新 ATL-003 | Pass | 标记 `possible_update`，匹配现有 Issue；两次状态事件和 09-23 报告计划保留，当前 In Progress。 |
| 8. 矛盾信息 | Pass | 分别提示“10 台正常 vs 2 台无法锁紧”和“Closed vs 后续测量/方案/缺关闭依据”；保留 09-21 与 09-24 两种日期用途。 |

## 事实保真机制

分析流程为 **Extract Critical Facts → Compose Bilingual Drafts → Server-side Factual Validation → Human Review**。关键事实提取必须给出原文引文；服务端拒绝不在原文中的引文，核对负责人、团队、数量、明确风险/状态、日期和确认程度。可核实的负责人或日期若被草稿泛化/遗漏，服务端以原文证据纠正并保留 `analysisWarning`。历史执行者、明确“未分配负责人”、测试开始日与实验室窗口不会被当作当前负责人或可问责截止日。同一 Issue 的中英文表达仍属于同一对象。

重点测试最终出现 **13 条事实保真复核提醒**，包括无效引文被拒绝和草稿纠正记录；这些提醒不是 13 项最终关键字段失败。人工审核仍是进入 Tracker 前的必要步骤。DeepSeek 偶发空或无效结构化输出时，服务端有有限重试与兼容工具调用；若仍失败，保留原文并返回待确认草稿，金标测试将其判为失败。

验证命令：`npx tsx tests/v09.stability.ts`、`npm run test:v09`、`npm test`、`npm run build`。本轮没有实现 Delete / Undo、Filter / Sort、Weekly Update、Gantt 或其他功能。
