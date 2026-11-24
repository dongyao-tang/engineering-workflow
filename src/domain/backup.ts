import {z} from 'zod';
import {issueSchema} from './schema';
import {fields,type Issue,type Language,type Store} from '../types';
import {riskLabels,statusLabels} from '../i18n';
import {weeklyReportSchema} from './weekly';

export const BACKUP_SCHEMA_VERSION=1;
const completeIssueSchema=issueSchema.required({lifecycleIntent:true,referencedIssueId:true,lifecycleEvents:true,history:true,reviewedAt:true}).strict();
const storeSchema=z.object({version:z.literal(2),language:z.enum(['zh','en']),issues:z.array(completeIssueSchema),weeklyReport:weeklyReportSchema.nullable().optional()}).strict();
const backupSchema=z.object({schemaVersion:z.literal(BACKUP_SCHEMA_VERSION),exportedAt:z.string().datetime(),workspace:storeSchema}).strict();
const requiredIssueKeys=[...fields,'riskLevel','status','dueDate','sourceNote','sourceLanguage','provenance','warnings','lifecycleIntent','referencedIssueId','lifecycleEvents','history','id','provider','stale','createdAt','updatedAt','reviewedAt'];

export class BackupError extends Error {
 constructor(public readonly code:'invalid_json'|'invalid_schema'|'unsupported_version'|'duplicate_id'){super(code);}
}

export function validateStore(value:unknown):Store {
 if(!value||typeof value!=='object'||!('issues' in value)||!Array.isArray(value.issues))throw new BackupError('invalid_schema');
 for(const issue of value.issues){
  if(!issue||typeof issue!=='object'||requiredIssueKeys.some(key=>!Object.hasOwn(issue,key)))throw new BackupError('invalid_schema');
 }
 const parsed=storeSchema.safeParse(value);
 if(!parsed.success)throw new BackupError('invalid_schema');
 const ids=parsed.data.issues.map(issue=>issue.id);
 if(new Set(ids).size!==ids.length)throw new BackupError('duplicate_id');
 return value as Store;
}

export function backupJson(workspace:Store,at=new Date()):string {
 validateStore(workspace);
 return JSON.stringify({schemaVersion:BACKUP_SCHEMA_VERSION,exportedAt:at.toISOString(),workspace},null,2);
}

export function parseBackup(text:string):Store {
 let value:unknown;
 try{value=JSON.parse(text);}catch{throw new BackupError('invalid_json');}
 if(!value||typeof value!=='object'||!('schemaVersion' in value)||value.schemaVersion!==BACKUP_SCHEMA_VERSION)throw new BackupError('unsupported_version');
 const parsed=backupSchema.safeParse(value);
 if(!parsed.success)throw new BackupError('invalid_schema');
 return validateStore((value as unknown as {workspace:unknown}).workspace);
}

const csvValue=(value:string)=>{
 const safe=/^[\s\uFEFF]*[=+\-@]/u.test(value)?`'${value}`:value;
 return `"${safe.replaceAll('"','""')}"`;
};
export function trackerCsv(issues:Issue[],language:Language):string {
 const header=['Issue ID','Issue','Risk','Status','Owner','Due Date','Action','Next Step','Created Time','Updated Time'];
 const rows=issues.map(issue=>[
  issue.id,issue.issue[language],riskLabels[language][issue.riskLevel],statusLabels[language][issue.status],
  issue.owner[language],issue.dueDate??(language==='zh'?'待确认':'TBD'),issue.action[language],issue.nextStep[language],issue.createdAt,issue.updatedAt
 ]);
 return '\uFEFF'+[header,...rows].map(row=>row.map(csvValue).join(',')).join('\r\n')+'\r\n';
}

export function exportTimestamp(at=new Date()):string {
 const p=(n:number)=>String(n).padStart(2,'0');
 return `${at.getFullYear()}-${p(at.getMonth()+1)}-${p(at.getDate())}-${p(at.getHours())}-${p(at.getMinutes())}`;
}
