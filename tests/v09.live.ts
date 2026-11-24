import {loadServerEnvironment} from '../server/config';
import {createAnalysisProvider} from '../server/providers/factory';
import {issueSchema} from '../src/domain/schema';
import {cases,existingPackagingIssue,referenceDate,timeZone} from './v09.goldenCases';
import type {Issue} from '../src/types';

const config=loadServerEnvironment();
if(!config.getKey()){console.log(JSON.stringify({provider:config.provider,skipped:'selected provider key missing'}));process.exit(1);}
const provider=createAnalysisProvider(config);
const results:{case:number;title:string;passed:boolean;reasons:string[];summary?:unknown}[]=[];
function check(reasons:string[],condition:boolean,message:string){if(!condition)reasons.push(message);}
const text=(i:Issue)=>[i.issue.zh,i.issue.en,i.backgroundObservation.zh,i.backgroundObservation.en,i.action.zh,i.action.en,i.nextStep.zh,i.nextStep.en].join(' ');
for(const item of cases.filter(item=>!process.env.V09_CASES||process.env.V09_CASES.split(',').includes(String(item.id)))){
 const reasons:string[]=[];
 try{
  const {drafts}=await provider.analyze({note:item.note,referenceDate,timeZone,existingIssues:item.id===7?[existingPackagingIssue]:[]});
  check(reasons,drafts.length===(item.id===1?2:1),`expected ${item.id===1?2:1} draft(s), got ${drafts.length}`);
  for(const d of drafts){check(reasons,issueSchema.safeParse(d).success,'draft failed runtime schema');check(reasons,d.issue.en!=='TBD'&&d.issue.zh!=='待确认','analysis fell back to an empty pending draft');}
  const a=drafts[0];
  if(!a){reasons.push('no draft returned');}
  else switch(item.id){
   case 1:{const assembly=drafts.find(d=>/upper cover|上盖/i.test(d.issue.en+' '+d.issue.zh));const packaging=drafts.find(d=>/packag|包装|擦伤|scratch/i.test(d.issue.en+' '+d.issue.zh));
    check(reasons,!!assembly&&!!packaging&&assembly!==packaging,'assembly and packaging were not separated');
    if(assembly){check(reasons,/3/.test(text(assembly)),'assembly count 3 missing');check(reasons,/明天|2026-09-21|measure|测量/i.test(assembly.nextStep.zh+' '+assembly.nextStep.en),'assembly next step missing');check(reasons,!/擦伤|packag|scratch/i.test(assembly.action.zh+' '+assembly.action.en),'packaging action leaked into assembly');check(reasons,/机械|mechanical/i.test(assembly.owner.zh+' '+assembly.owner.en),'mechanical team ownership clue missing');}
    if(packaging){check(reasons,/2/.test(text(packaging)),'packaging count 2 missing');check(reasons,/2026-09-23|下周三/.test(packaging.nextStep.zh+' '+packaging.nextStep.en),'packaging retest date missing');check(reasons,/包装|packaging/i.test(packaging.owner.zh+' '+packaging.owner.en),'packaging team ownership clue missing');}
    break;}
   case 2:check(reasons,a.status!=='closed','missing-data issue incorrectly closed');check(reasons,a.owner.en==='TBD'&&a.provenance.owner.kind==='missing','owner invented');check(reasons,a.dueDate===null,'due date invented');check(reasons,a.provenance.rootCauseAssumption.kind==='missing','root cause invented');break;
   case 3:check(reasons,a.status==='closed','verified historical issue not closed');check(reasons,/返工|rework/i.test(text(a)),'rework missing');check(reasons,/复检|reinspect|quality|合格/i.test(text(a)),'verification/closure evidence missing');check(reasons,a.owner.en==='TBD'&&a.provenance.owner.kind==='missing','historical action team incorrectly assigned as issue owner');break;
   case 4:check(reasons,a.status==='blocked','issue not blocked');check(reasons,/林岚/.test(a.owner.zh),'project manager owner missing');check(reasons,/定位销|locating pin|replacement/i.test(text(a)),'dependency on replacement parts missing');check(reasons,/2026-09-21/.test(text(a)),'tomorrow not resolved to 2026-09-21');check(reasons,/2026-09-23/.test(text(a)),'next Wednesday not resolved to 2026-09-23');check(reasons,a.dueDate===null,'lab reservation treated as issue due date');break;
   case 5:check(reasons,a.riskLevel==='low','low risk not recognized');check(reasons,a.status!=='closed','low-risk issue incorrectly closed');check(reasons,/刘洋/.test(a.owner.zh),'owner missing');check(reasons,a.dueDate==='2026-09-24','feedback date incorrect');break;
   case 6:check(reasons,/隔离|hold|quarantin/i.test(a.action.zh+' '+a.action.en),'lot hold containment missing');check(reasons,/上一批|previous lot|prior lot/i.test(a.action.zh+' '+a.action.en),'replacement stock containment missing');check(reasons,/可能|suspect|unconfirm|pending|hypothes/i.test(a.rootCauseAssumption.zh+' '+a.rootCauseAssumption.en),'supplier hypothesis falsely confirmed');check(reasons,a.dueDate==='2026-09-25','investigation target date incorrect');break;
   case 7:check(reasons,a.lifecycleIntent==='possible_update','existing issue update not flagged');check(reasons,a.referencedIssueId===existingPackagingIssue.id,'ATL-003 not matched to existing issue');check(reasons,a.status==='in_progress','current status not in progress');check(reasons,/2026-09-23/.test(text(a)),'next-Wednesday report date missing from issue');check(reasons,a.dueDate===null||a.dueDate==='2026-09-23','report date converted to wrong due date');check(reasons,a.lifecycleEvents.length>=2,'two state changes not retained as events');check(reasons,a.lifecycleEvents.some(e=>e.date==='2026-09-18')&&a.lifecycleEvents.some(e=>e.date==='2026-09-20'),'September 18 and current-day updates not dated separately');break;
   case 8:{const warnings=a.warnings.map(w=>w.zh+' '+w.en).join(' ');check(reasons,a.status!=='closed','contradictory closure accepted');check(reasons,/10/.test(warnings)&&/2/.test(warnings),'count contradiction not warned');check(reasons,/Closed|关闭|状态|closure/i.test(warnings),'closure-status contradiction not warned');check(reasons,/10/.test(text(a))&&/2/.test(text(a)),'conflicting counts not both retained');check(reasons,/2026-09-21/.test(text(a)),'tomorrow measurement date missing');check(reasons,a.dueDate==='2026-09-24','corrective proposal deadline incorrect');break;}
  }
  results.push({case:item.id,title:item.title,passed:reasons.length===0,reasons,summary:{drafts:drafts.length,statuses:drafts.map(d=>d.status),risks:drafts.map(d=>d.riskLevel),dueDates:drafts.map(d=>d.dueDate),intents:drafts.map(d=>d.lifecycleIntent),eventCounts:drafts.map(d=>d.lifecycleEvents.length),warningCounts:drafts.map(d=>d.warnings.length),warnings:drafts.flatMap(d=>d.warnings.map(w=>w.en)).slice(0,5),nextSteps:drafts.map(d=>d.nextStep.en),owners:drafts.map(d=>d.owner),rootCauses:drafts.map(d=>d.rootCauseAssumption),rootProvenance:drafts.map(d=>d.provenance.rootCauseAssumption.kind),dueProvenance:drafts.map(d=>d.provenance.dueDate.kind)}});
 }catch(error){results.push({case:item.id,title:item.title,passed:false,reasons:[error instanceof Error?error.message:'analysis error']});}
 console.log(JSON.stringify(results.at(-1)));
}
console.log(JSON.stringify({provider:config.provider,referenceDate,timeZone,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length}));
if(results.some(r=>!r.passed))process.exitCode=1;
