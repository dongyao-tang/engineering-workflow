import {z} from 'zod';
import {validDate} from './issue';
import {localizedSchema,riskSchema,statusSchema,dueDateSchema,lifecycleEventSchema} from './schema';
import {weeklySectionKeys,type Issue,type Language,type LocalizedText,type Risk,type Status,type WeeklyPeriod,type WeeklyReport,type WeeklySectionKey} from '../types';

const dateSchema=z.string().refine(validDate);
const editableLocalizedSchema=z.object({zh:z.string().max(12000),en:z.string().max(12000)}).strict();
export const weeklyPeriodSchema=z.object({from:dateSchema,to:dateSchema}).strict().refine(period=>period.from<=period.to);
export const weeklyReportSchema=z.object({
 version:z.literal(1),period:weeklyPeriodSchema,
 sections:z.object(Object.fromEntries(weeklySectionKeys.map(key=>[key,editableLocalizedSchema])) as Record<WeeklySectionKey,typeof editableLocalizedSchema>).strict(),
 warnings:z.array(localizedSchema),trackerSnapshot:z.string(),generatedAt:z.string().datetime(),updatedAt:z.string().datetime(),reviewed:z.boolean(),reviewedAt:z.string().datetime().nullable()
}).strict();

export interface WeeklyIssueFact {
 id:string;issue:LocalizedText;backgroundObservation:LocalizedText;impact:LocalizedText;rootCauseAssumption:LocalizedText;
 action:LocalizedText;nextStep:LocalizedText;owner:LocalizedText;riskLevel:Risk;status:Status;dueDate:string|null;
 history:Pick<Issue['history'][number],'date'|'status'|'description'|'evidence'>[];createdAt:string;updatedAt:string;
}
export const weeklyIssueFactSchema=z.object({
 id:z.string().min(1).max(100),issue:localizedSchema,backgroundObservation:localizedSchema,impact:localizedSchema,rootCauseAssumption:localizedSchema,
 action:localizedSchema,nextStep:localizedSchema,owner:localizedSchema,riskLevel:riskSchema,status:statusSchema,dueDate:dueDateSchema,
 history:z.array(lifecycleEventSchema.pick({date:true,status:true,description:true,evidence:true}).strict()).max(100),createdAt:z.string().datetime(),updatedAt:z.string().datetime()
}).strict();
export const weeklyRequestSchema=z.object({projectName:z.string().min(1).max(120),period:weeklyPeriodSchema,issues:z.array(weeklyIssueFactSchema).max(150)}).strict();
export interface WeeklyRequest {projectName:string;period:WeeklyPeriod;issues:WeeklyIssueFact[]}
export const toWeeklyFacts=(issues:Issue[]):WeeklyIssueFact[]=>issues.map(issue=>({
 id:issue.id,issue:issue.issue,backgroundObservation:issue.backgroundObservation,impact:issue.impact,rootCauseAssumption:issue.rootCauseAssumption,
 action:issue.action,nextStep:issue.nextStep,owner:issue.owner,riskLevel:issue.riskLevel,status:issue.status,dueDate:issue.dueDate,
 history:issue.history.map(event=>({date:event.date,status:event.status,description:event.description,evidence:event.evidence})),createdAt:issue.createdAt,updatedAt:issue.updatedAt
}));

export function currentWeek(now=new Date()):WeeklyPeriod {
 const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
 const sunday=new Date(monday);sunday.setDate(sunday.getDate()+6);
 const date=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 return {from:date(monday),to:date(sunday)};
}

export const trackerSnapshot=(issues:Issue[])=>JSON.stringify(issues);
export const isWeeklyOutdated=(report:WeeklyReport,issues:Issue[])=>report.trackerSnapshot!==trackerSnapshot(issues);
export function editWeeklySection(report:WeeklyReport,key:WeeklySectionKey,language:Language,value:string,at=new Date().toISOString()):WeeklyReport {
 if(report.sections[key][language]===value)return report;
 return {...report,sections:{...report.sections,[key]:{...report.sections[key],[language]:value}},reviewed:false,reviewedAt:null,updatedAt:at};
}
export function markWeeklyReviewed(report:WeeklyReport,at=new Date().toISOString()):WeeklyReport {
 return {...report,reviewed:true,reviewedAt:at,updatedAt:at};
}
export const weeklyLabels={
 zh:{overallStatus:'总体状态',keyProgress:'本周关键进展',criticalIssuesRisks:'关键问题与风险',actionsOwners:'措施与负责人',decisionsSupport:'需要的决策或支持',nextWeekPriorities:'下周重点'},
 en:{overallStatus:'Overall Status',keyProgress:'Key Progress',criticalIssuesRisks:'Critical Issues & Risks',actionsOwners:'Actions & Owners',decisionsSupport:'Decisions / Support Needed',nextWeekPriorities:'Next Week Priorities'}
};
export function formatWeeklyReport(report:WeeklyReport,language:Language,projectName:string):string {
 return [projectName+' | '+(language==='zh'?'项目周报':'Weekly Project Update'),
  (language==='zh'?'周期':'Period')+`: ${report.period.from} — ${report.period.to}`,
  ...weeklySectionKeys.flatMap(key=>['',weeklyLabels[language][key],report.sections[key][language]])].join('\n');
}
