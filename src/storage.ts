import {fields,type Issue,type Store} from './types';
import {emptyIssue,pair} from './domain/issue';
import {issueSchema} from './domain/schema';
import {validateStore} from './domain/backup';
const key='atlas-engineering-v2',legacyKey='atlas-engineering-v1';
const preImportKey='projectflow-pre-import-backup';
export function migrateLegacy(data:any):Store {
 if(data.version!==1||!['zh','en'].includes(data.language)||!Array.isArray(data.issues))throw Error('Invalid storage');
 const map={issue:'issue',backgroundObservation:'observation',impact:'impact',rootCauseAssumption:'assumption',action:'action',nextStep:'nextStep'} as const;
 const issues=data.issues.map((old:any)=>{
  if(typeof old.sourceNote!=='string'||typeof old.id!=='string'||!old.reviewedAt)throw Error('Invalid legacy record');
  const i=emptyIssue(old.sourceNote,'legacy');
  Object.assign(i,{id:old.id,createdAt:old.createdAt,updatedAt:old.updatedAt,reviewedAt:old.reviewedAt,dueDate:old.dueDate||null,
   riskLevel:old.risk==='unassessed'?'needs_assessment':old.risk,status:old.status==='inProgress'?'in_progress':old.status});
  for(const field of fields){
   if(field==='owner'){i.owner=pair(old.owner||'待确认',old.owner||'TBD');i.stale.owner=['zh','en'];continue;}
   const value=old.content?.[map[field]];if(!value||typeof value!=='object')throw Error('Invalid legacy content');
   i[field]=pair(value.zh?.text||value.en?.text||'待确认',value.en?.text||value.zh?.text||'TBD');
   i.stale[field]=(['zh','en'] as const).filter(lang=>!value[lang]||value[lang].stale||value[lang].source==='original');
  }
  i.warnings.push(pair('从旧版本迁移；原始记录和现有表达已保留，缺失译文及提取依据需复核。','Migrated from v1. Original note and expressions retained; missing translations and provenance require review.'));
  return issueSchema.parse(i) as unknown as Issue;
 });
 return {version:2,language:data.language,issues};
}
export function load(adapter:Pick<Storage,'getItem'>=localStorage):Store|null {
 const value=adapter.getItem(key);
 if(value===null){const old=adapter.getItem(legacyKey);return old?validateStore(migrateLegacy(JSON.parse(old))):null;}
 const data=JSON.parse(value);
 if(data.version!==2||!['zh','en'].includes(data.language)||!Array.isArray(data.issues))throw Error('Invalid storage');
 return validateStore({version:2,language:data.language,issues:data.issues.map((item:unknown)=>{const issue=issueSchema.parse(item);if(!issue.reviewedAt)throw Error('Unreviewed record');return issue;}),...(Object.hasOwn(data,'weeklyReport')?{weeklyReport:data.weeklyReport}:{})});
}
export function save(store:Store,adapter:Pick<Storage,'setItem'>=localStorage){validateStore(store);adapter.setItem(key,JSON.stringify(store));}
export function replaceFromBackup(store:Store,adapter:Pick<Storage,'getItem'|'setItem'>=localStorage){
 validateStore(store);
 const previous=adapter.getItem(key);
 if(previous!==null)adapter.setItem(preImportKey,previous);
 adapter.setItem(key,JSON.stringify(store));
}

