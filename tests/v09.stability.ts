import {loadServerEnvironment} from '../server/config';
import {createAnalysisProvider} from '../server/providers/factory';
import {cases,existingPackagingIssue,referenceDate,timeZone} from './v09.goldenCases';
import type {Issue} from '../src/types';

const config=loadServerEnvironment();
if(!config.getKey()){console.error('Selected provider key unavailable.');process.exit(1);}
const provider=createAnalysisProvider(config);
const targets=[1,6,7,8];
let checks=0,failedChecks=0,passedRuns=0;
let fidelityWarnings=0;
const failures:{case:number;run:number;reasons:string[]}[]=[];
const has=(text:string,pattern:RegExp)=>pattern.test(text);
for(const id of targets)for(let run=1;run<=3;run++){
 const item=cases.find(c=>c.id===id)!;const reasons:string[]=[];
 let ownerSnapshot:unknown;
 const check=(ok:boolean,message:string)=>{checks++;if(!ok){failedChecks++;reasons.push(message);}};
 try{
  const {drafts}=await provider.analyze({note:item.note,referenceDate,timeZone,existingIssues:id===7?[existingPackagingIssue]:[]});
  ownerSnapshot=drafts.map(d=>({owner:d.owner,ownerEvidence:d.provenance.owner.evidence,ownerKind:d.provenance.owner.kind,dueDate:d.dueDate,dueEvidence:d.provenance.dueDate.evidence,nextStep:d.nextStep}));
  check(drafts.length===(id===1?2:1),`issue split: expected ${id===1?2:1}, got ${drafts.length}`);
  const all=(i:Issue)=>[i.issue.zh,i.issue.en,i.backgroundObservation.zh,i.backgroundObservation.en,i.impact.zh,i.impact.en,i.rootCauseAssumption.zh,i.rootCauseAssumption.en,i.action.zh,i.action.en,i.nextStep.zh,i.nextStep.en].join(' ');
  if(id===1){
   const assembly=drafts.find(d=>has(d.issue.zh+' '+d.issue.en,/上盖|upper cover|assembly interference/i));
   const packaging=drafts.find(d=>d!==assembly&&has(d.issue.zh+' '+d.issue.en,/包装|packag|擦伤|scratch/i));
   check(!!assembly&&!!packaging,'independent assembly and packaging issues not separated');
   if(assembly){check(assembly.owner.zh==='机械团队','mechanical owner generalized or changed');check(has(assembly.owner.en,/mechanical team/i),'English mechanical team generalized');check(has(all(assembly),/3/),'assembly count 3 missing');check(has(assembly.nextStep.zh+' '+assembly.nextStep.en,/2026-09-21/),'assembly measurement date changed');check(!has(assembly.action.zh+' '+assembly.action.en,/包装|packag|擦伤|scratch/i),'packaging action leaked into assembly');}
   if(packaging){check(has(packaging.owner.zh,/包装/)&&has(packaging.owner.en,/packag/i),'packaging owner changed');check(has(all(packaging),/2/),'packaging count 2 missing');check(has(packaging.nextStep.zh+' '+packaging.nextStep.en,/2026-09-23/),'packaging retest date changed');check(!has(packaging.action.zh+' '+packaging.action.en,/支架测量|bracket measurement/i),'assembly action leaked into packaging');}
  }else if(id===6){const d=drafts[0];if(d){
   check(has(all(d),/4/)&&has(all(d),/120/),'counts 4/120 changed');
   check(has(d.owner.zh,/供应商质量工程师赵磊/)&&has(d.owner.en,/赵磊/),'supplier quality owner changed');
   check(d.dueDate==='2026-09-25','investigation due date changed');
   check(has(d.action.zh+' '+d.action.en,/隔离|hold|quarantin/i)&&has(d.action.zh+' '+d.action.en,/上一批|previous lot|prior lot/i),'completed containment missing');
   check(has(d.rootCauseAssumption.zh+' '+d.rootCauseAssumption.en,/可能|怀疑|未确认|待确认|suspect|unconfirm|pending|hypothes/i)&&!has(d.rootCauseAssumption.en,/(?:^|[.;])\s*(?:the )?root cause (?:is|was|has been) confirmed/i),'unconfirmed cause upgraded to confirmed');
   check(d.status!=='closed','unconfirmed issue incorrectly closed');
  }}else if(id===7){const d=drafts[0];if(d){
   check(d.lifecycleIntent==='possible_update'&&d.referencedIssueId===existingPackagingIssue.id,'existing issue was created rather than flagged as update');
   check(d.status==='in_progress','current status changed');check(has(d.owner.zh,/孙悦/),'owner changed');
   check(has(all(d),/2026-09-23/),'report date changed');
   check(d.lifecycleEvents.length>=2&&d.lifecycleEvents.some(e=>e.date==='2026-09-18')&&d.lifecycleEvents.some(e=>e.date==='2026-09-20'),'two dated status events not retained');
   check(!has(d.nextStep.zh+' '+d.nextStep.en,/已完成运输复验|transport revalidation completed/i),'pending revalidation falsely completed');
  }}else if(id===8){const d=drafts[0];if(d){
   const warnings=d.warnings.map(w=>w.zh+' '+w.en).join(' ');
   check(d.status!=='closed','contradictory closure accepted');
   check(has(warnings,/10/)&&has(warnings,/2/),'count contradiction not warned');
   check(has(warnings,/closed|关闭|状态|closure/i),'closure contradiction not warned');
   check(has(all(d),/10/)&&has(all(d),/2/),'both conflicting counts not preserved');
   check(has(all(d),/2026-09-21/)&&d.dueDate==='2026-09-24','measurement and proposal dates conflated');
   check(has(d.owner.zh,/李伟/),'owner changed');
  }}
  fidelityWarnings+=drafts.flatMap(d=>d.warnings).filter(w=>w.en.startsWith('Factual fidelity:')).length;
 }catch(error){reasons.push(error instanceof Error?error.message:'unknown provider failure');failedChecks++;}
 if(reasons.length===0)passedRuns++;else failures.push({case:id,run,reasons});
 console.log(JSON.stringify({case:id,run,passed:reasons.length===0,reasons,...(reasons.length?{ownerSnapshot}:{})}));
}
console.log(JSON.stringify({provider:config.provider,runs:12,passedRuns,criticalFieldAccuracy:`${checks-failedChecks}/${checks}`,fidelityWarnings,failures}));
if(failures.length)process.exitCode=1;
