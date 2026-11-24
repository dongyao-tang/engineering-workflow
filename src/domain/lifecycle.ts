import {analysisFields,fields,type Issue,type LifecycleEvent} from '../types';

export function createReviewedIssue(draft:Issue,reviewedAt:string):Issue {
 return {...draft,lifecycleIntent:'create',referencedIssueId:null,reviewedAt,updatedAt:reviewedAt,
  history:draft.lifecycleEvents.map(event=>({...event,sourceNote:draft.sourceNote}))};
}

export function updateReviewedIssue(previous:Issue,draft:Issue,reviewedAt:string):Issue {
 const next:Issue={...previous,sourceNote:draft.sourceNote,sourceLanguage:draft.sourceLanguage,
  warnings:[...previous.warnings,...draft.warnings],updatedAt:reviewedAt,reviewedAt,
  history:[...previous.history],lifecycleIntent:'create',referencedIssueId:null,lifecycleEvents:[]};
 for(const field of fields){
  if(draft.provenance[field].kind!=='missing'){
   next[field]=draft[field];next.provenance[field]=draft.provenance[field];next.stale[field]=draft.stale[field]??[];
  }
 }
 for(const field of analysisFields.filter(f=>!fields.includes(f as typeof fields[number]))){
  if(draft.provenance[field].kind==='missing')continue;
  if(field==='riskLevel')next.riskLevel=draft.riskLevel;
  if(field==='status')next.status=draft.status;
  if(field==='dueDate')next.dueDate=draft.dueDate;
  next.provenance[field]=draft.provenance[field];
 }
 if(!next.history.length)next.history.push({date:null,status:previous.status,description:previous.issue,evidence:'',sourceNote:previous.sourceNote});
 const events:LifecycleEvent[]=draft.lifecycleEvents.length?draft.lifecycleEvents:[{date:null,status:draft.status,description:draft.issue,evidence:''}];
 next.history.push(...events.map(event=>({...event,sourceNote:draft.sourceNote})));
 return next;
}
