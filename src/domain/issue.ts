import {analysisFields,fields,type AnalysisField,type Issue,type Language,type LocalizedText,type Provenance,type SourceLanguage,type TextField} from '../types';
export const pair=(zh:string,en:string):LocalizedText=>({zh,en});
export const pending=()=>pair('待确认','TBD');
export function detectLanguage(note:string):SourceLanguage {const zh=/[\u3400-\u9fff]/u.test(note),en=/[a-zA-Z]{2,}/.test(note);return zh&&en?'mixed':zh?'zh':'en';}
export const missingProvenance=():Provenance=>({kind:'missing',evidence:[],rationale:pair('信息不足，请人工确认。','Insufficient information; human review required.')});
export function emptyIssue(note:string,provider:Issue['provider']):Issue {
 const stamp=new Date().toISOString();
 return {id:crypto.randomUUID(),provider,stale:{},createdAt:stamp,updatedAt:stamp,
 ...Object.fromEntries(fields.map(f=>[f,pending()])) as Record<TextField,LocalizedText>,
 sourceNote:note,sourceLanguage:detectLanguage(note),riskLevel:'needs_assessment',status:'open',dueDate:null,
 provenance:Object.fromEntries(analysisFields.map(f=>[f,missingProvenance()])) as Record<AnalysisField,Provenance>,warnings:[],
 lifecycleIntent:'create',referencedIssueId:null,lifecycleEvents:[],history:[]};
}
export function editExpression(issue:Issue,field:TextField,language:Language,text:string):Issue {
 if(issue[field][language]===text)return issue;
 const other=language==='zh'?'en':'zh';
 return {...issue,[field]:{...issue[field],[language]:text},stale:{...issue.stale,[field]:[other]},
 provenance:{...issue.provenance,[field]:{kind:'human',evidence:[],rationale:pair('经人工修改。','Edited by a human reviewer.')}}};
}
export const isOpen=(i:Issue)=>i.status!=='closed';
export const localDate=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function validDate(value:unknown):value is string {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(`${value}T00:00:00Z`);return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;
}
