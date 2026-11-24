import {analysisFields,fields,type AnalysisField,type ExistingIssueSummary,type Issue,type LifecycleEvent} from '../src/types';
import {emptyIssue,pair,pending,missingProvenance} from '../src/domain/issue';
import {dueDateSchema,localizedSchema,provenanceSchema,riskSchema,statusSchema,lifecycleEventSchema} from '../src/domain/schema';
import type {RelativeDateHint} from './dateHints';
const object=(properties:Record<string,unknown>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const localized=object({zh:{type:'string'},en:{type:'string'}});
const provenance=object({kind:{type:'string',enum:['extracted','inferred','missing']},evidence:{type:'array',items:{type:'string'}},rationale:localized});
const event=object({date:{type:['string','null']},status:{type:['string','null'],enum:['open','in_progress','blocked','closed',null]},description:localized,evidence:{type:'string'}});
export const issueAnalysisJsonSchema=object({
 ...Object.fromEntries(fields.map(f=>[f,localized])),
 riskLevel:{type:'string',enum:['low','medium','high','needs_assessment']},
 status:{type:'string',enum:['open','in_progress','blocked','closed']},
 dueDate:{type:['string','null']},sourceLanguage:{type:'string',enum:['zh','en','mixed']},
 provenance:object(Object.fromEntries(analysisFields.map(f=>[f,provenance]))),warnings:{type:'array',items:localized},
 lifecycleIntent:{type:'string',enum:['create','possible_update']},referencedIssueId:{type:['string','null']},
 lifecycleEvents:{type:'array',items:event},
 ownerResponsibility:object({kind:{type:'string',enum:['assigned_current_or_future','historical_actor','unassigned']},evidence:{type:'string'}})
});
export const analysisJsonSchema=object({drafts:{type:'array',items:issueAnalysisJsonSchema}});
const record=(x:unknown):Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:{};
export function normalizeAnalysis(raw:unknown,note:string,existingIssues:ExistingIssueSummary[]=[],dateHints:RelativeDateHint[]=[]):Issue[] {
 const list=record(raw).drafts;
 if(!Array.isArray(list)||list.length===0){const issue=emptyIssue(note,'llm');issue.warnings.push(pair('模型未返回有效草稿列表；请人工检查原文。','No valid draft list was returned; review the source note.'));return [issue];}
 return list.slice(0,5).map(item=>normalizeIssue(item,note,existingIssues,dateHints));
}
export function normalizeIssue(raw:unknown,note:string,existingIssues:ExistingIssueSummary[]=[],dateHints:RelativeDateHint[]=[]):Issue {
 const input=record(raw),issue=emptyIssue(note,'llm');
 const warn=(field:string,reason:string)=>issue.warnings.push(pair(`${field}：${reason}；请核对原文并人工确认。`,`${field}: ${reason}; review against the original note.`));
 for(const field of fields){
  const value=record(input[field]);
  for(const lang of ['zh','en'] as const){const parsed=localizedSchema.shape[lang].safeParse(value[lang]);if(parsed.success)issue[field][lang]=parsed.data;else warn(`${field}.${lang}`,'字段缺失或格式非法 / missing or invalid field');}
 }
 const risk=riskSchema.safeParse(input.riskLevel);if(risk.success)issue.riskLevel=risk.data;else warn('riskLevel','缺失或格式非法 / missing or invalid');
 const status=statusSchema.safeParse(input.status);if(status.success)issue.status=status.data;else warn('status','使用默认 Open / defaulted to Open');
 const due=dueDateSchema.safeParse(input.dueDate);if(due.success)issue.dueDate=due.data;else warn('dueDate','日期非法或缺失 / invalid or missing date');
 if(['zh','en','mixed'].includes(input.sourceLanguage as string))issue.sourceLanguage=input.sourceLanguage as Issue['sourceLanguage'];
 const supplied=record(input.provenance);
 for(const field of analysisFields){
  const parsed=provenanceSchema.safeParse(supplied[field]);
  if(!parsed.success||parsed.data.kind==='human'){warn(field,'缺少有效的提取依据 / no valid provenance');resetField(issue,field);continue;}
  const p=parsed.data;
  // Evidence must actually occur in the original note. Do not trust model-made quotations.
  const evidence=p.evidence.filter(quote=>note.includes(quote));
  if(evidence.length!==p.evidence.length)warn(field,'引用与原文不符 / evidence not found in source');
  if(p.kind!=='missing'&&!evidence.length){warn(field,'没有可核查的原文依据 / no verifiable source evidence');resetField(issue,field);continue;}
  issue.provenance[field]={...p,evidence};
  if(p.kind==='missing')resetField(issue,field);
 }
 // Owners and dates are extraction-only. Never allow inferred identities or deadlines.
 for(const field of ['owner','dueDate'] as const){
  if(issue.provenance[field].kind!=='extracted'){
   if(issue.provenance[field].kind==='inferred')warn(field,'禁止推断负责人或日期 / owners and dates must be extracted');
   resetField(issue,field);
  }
 }
 if(issue.dueDate){
  const evidence=issue.provenance.dueDate.evidence.join(' ');
  const mentioned=dateHints.filter(h=>evidence.toLowerCase().includes(h.phrase.toLowerCase()));
  if(mentioned.length&&mentioned.every(h=>h.date!==issue.dueDate)){
   warn('dueDate','相对日期与服务端日历计算不一致 / relative date conflicts with server calendar');
   resetField(issue,'dueDate');
  }
 }
 const responsibility=record(input.ownerResponsibility);
 if(issue.provenance.owner.kind==='extracted'){
  if(responsibility.kind!=='assigned_current_or_future'||typeof responsibility.evidence!=='string'||!responsibility.evidence||!note.includes(responsibility.evidence)){
   warn('owner','未确认当前/后续责任分配，可能只是历史措施执行者 / no verifiable current or future assignment');
   resetField(issue,'owner');
  }
 }
 if(Array.isArray(input.warnings))for(const item of input.warnings.slice(0,20)){const p=localizedSchema.safeParse(item);if(p.success)issue.warnings.push(p.data);}
 if(input.lifecycleIntent==='possible_update'){
  issue.lifecycleIntent='possible_update';
  const matched=existingIssues.find(i=>i.id===input.referencedIssueId);
  issue.referencedIssueId=matched?.id??null;
  if(!matched)warn('referencedIssueId','可能是现有问题更新，但没有可靠匹配；请人工选择 Update 或 Create / no reliable match');
 }
 if(Array.isArray(input.lifecycleEvents))for(const rawEvent of input.lifecycleEvents.slice(0,20)){
  const parsed=lifecycleEventSchema.safeParse(rawEvent);
  if(!parsed.success){warn('lifecycleEvents','事件格式非法 / invalid event');continue;}
  const e=parsed.data as LifecycleEvent;
  if(!e.evidence||!note.includes(e.evidence)){warn('lifecycleEvents','事件原文依据不匹配 / event evidence not in note');continue;}
  issue.lifecycleEvents.push(e);
 }
 return issue;
}
function resetField(issue:Issue,field:AnalysisField){
 if(field==='riskLevel')issue.riskLevel='needs_assessment';
 else if(field==='status')issue.status='open';
 else if(field==='dueDate')issue.dueDate=null;
 else issue[field]=pending();
 issue.provenance[field]=missingProvenance();
}
