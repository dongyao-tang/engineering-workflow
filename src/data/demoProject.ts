import type {Issue,Project} from '../types';
import {emptyIssue,pair} from '../domain/issue';
export const project:Project={id:'atlas',name:'Project Atlas',phase:{zh:'NPI · 试产准备',en:'NPI · Pilot readiness'}};
export const example='今天 trial build 发现 A/B 两种组合存在 assembly interference，工程和制造一起确认可能与尺寸波动有关，明天重新测量异常件并做 mixed-build validation，目前可能影响下周试产。';
export function demoIssues():Issue[]{
 const i=emptyIssue('虚构示例 / Fictional example: pilot assembly fit concern; engineering and manufacturing to validate.','mock');
 const due=new Date();due.setDate(due.getDate()+3);
 return [{...i,id:'demo-001',riskLevel:'high',status:'in_progress',owner:pair('工程 / 制造','Engineering / Manufacturing'),
 dueDate:due.toLocaleDateString('en-CA'),reviewedAt:i.createdAt,
 issue:pair('试装配合异常待验证','Trial assembly fit concern pending validation'),
 backgroundObservation:pair('虚构样件试装发现配合不稳定。','Inconsistent fit observed during trial assembly of fictional samples.'),
 impact:pair('可能影响试产准备，需确认影响范围。','May affect pilot readiness; scope remains to be assessed.'),
 rootCauseAssumption:pair('待验证假设：零件尺寸波动。','Assumption pending validation: part dimensional variation.'),
 action:pair('复测异常件并执行混装验证。','Remeasure affected parts and perform mixed-build validation.'),
 nextStep:pair('评审验证结果，确认试产准备状态。','Review validation results and confirm pilot readiness.'),
 warnings:[pair('预置虚构演示记录，不代表真实分析结果。','Pre-authored fictional demo record; not a live analysis result.')]
 }];
}

