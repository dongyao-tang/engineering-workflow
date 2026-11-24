import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyIssue,pair} from '../src/domain/issue';
import {currentWeek,editWeeklySection,formatWeeklyReport,isWeeklyOutdated,markWeeklyReviewed,toWeeklyFacts,trackerSnapshot,weeklyPeriodSchema,weeklyReportSchema,type WeeklyRequest} from '../src/domain/weekly';
import {backupJson,parseBackup} from '../src/domain/backup';
import {dashboardCounts,trackerView} from '../src/domain/tracker';
import {composeWeeklyDraft,DeepSeekWeeklyReportProvider,emptyWeeklyDraft,weeklyInstructions,weeklySignals} from '../server/weeklyReport';
import {save,load} from '../src/storage';
import {createApiServer} from '../server/http';
import type {Issue,WeeklyReport} from '../src/types';

const period={from:'2026-09-21',to:'2026-09-27'};
function makeIssue(id:string,status:Issue['status'],risk:Issue['riskLevel'],owner=pair('待确认','TBD'),dueDate:string|null=null):Issue{
 const issue=emptyIssue(`Source record ${id}`,'llm');issue.id=id;issue.issue=pair(`问题 ${id}`,`Issue ${id}`);issue.impact=pair('可能影响验证样机准备','May affect validation sample readiness');
 issue.owner=owner;issue.status=status;issue.riskLevel=risk;issue.dueDate=dueDate;issue.nextStep=pair('完成装配验证','Complete assembly validation');
 issue.createdAt='2026-09-21T04:00:00.000Z';issue.updatedAt='2026-09-25T04:00:00.000Z';issue.reviewedAt=issue.createdAt;
 return issue;
}
function request(issues:Issue[]):WeeklyRequest{return {projectName:'Project Atlas',period,issues:toWeeklyFacts(issues)};}
function model(overrides:Record<string,unknown>={}){
 return {overallStatus:pair('本周问题仍在跟踪中，项目状态待确认。','Issues remain under review this week; project status requires confirmation.'),keyProgress:[],criticalIssuesRisks:[],actionsOwners:[],decisionsSupport:[],nextWeekPriorities:[],...overrides};
}
function report(issues:Issue[]):WeeklyReport{return {version:1,period,sections:composeWeeklyDraft(model(),request(issues)).sections,warnings:[],trackerSnapshot:trackerSnapshot(issues),generatedAt:'2026-09-27T09:00:00.000Z',updatedAt:'2026-09-27T09:00:00.000Z',reviewed:false,reviewedAt:null};}
const claim=(issueId:string,zh:string,en:string)=>({issueId,zh,en});

test('Empty Tracker yields a complete bilingual draft without a model request',()=>{
 const draft=emptyWeeklyDraft();assert.equal(Object.keys(draft.sections).length,6);assert.match(draft.sections.overallStatus.en,/no issues/i);
});
test('Closed issue with in-period closure can enter Key Progress',()=>{
 const issue=makeIssue('closed','closed','medium');issue.history=[{date:'2026-09-24',status:'closed',description:pair('复验通过并关闭','Verified and closed'),evidence:'verified'}];
 const draft=composeWeeklyDraft(model({keyProgress:[claim('closed','复验通过并关闭。','Verification passed and the issue was closed.')]}),request([issue]));
 assert.match(draft.sections.keyProgress.en,/closed/);assert.equal(weeklySignals(request([issue]))[0].closedThisPeriod,true);
});
test('Closed issue cannot reappear as an outstanding action or next-week priority',()=>{
 const issue=makeIssue('closed-action','closed','low');issue.nextStep=pair('无需后续措施。','No further action required.');
 const draft=composeWeeklyDraft(model({actionsOwners:[claim('closed-action','继续处理。','Continue work.')],nextWeekPriorities:[claim('closed-action','继续处理。','Continue work.')]}),request([issue]));
 assert.equal(draft.sections.actionsOwners.en,'None recorded.');assert.equal(draft.sections.nextWeekPriorities.en,'None recorded.');
});
test('Historical closure outside the selected period is not reported as this-week progress',()=>{
 const issue=makeIssue('old-closure','closed','medium');issue.history=[{date:'2026-09-15',status:'closed',description:pair('已关闭','Closed'),evidence:'old'}];
 const draft=composeWeeklyDraft(model({keyProgress:[claim('old-closure','已关闭。','Closed.')] }),request([issue]));
 assert.equal(draft.sections.keyProgress.en,'None recorded.');assert.match(draft.warnings[0].en,/outside the selected period/);
});
test('Unsupported management support request is omitted rather than invented',()=>{
 const issue=makeIssue('no-support','blocked','high');
 const draft=composeWeeklyDraft(model({decisionsSupport:[claim('no-support','请求管理层批准新资源。','Request management approval for new resources.')]}),request([issue]));
 assert.equal(draft.sections.decisionsSupport.en,'None currently identified.');assert.match(draft.warnings[0].en,/lacks explicit Tracker evidence/);
});
test('High Risk enters Critical Issues with exact current fields',()=>{
 const issue=makeIssue('high','open','high',pair('机械团队','Mechanical team'),'2026-09-26');
 const draft=composeWeeklyDraft(model({criticalIssuesRisks:[claim('high','可能影响样机准备。','May affect sample readiness.')]}),request([issue]));
 assert.match(draft.sections.criticalIssuesRisks.en,/High.*Mechanical team.*2026-09-26/);
});
test('Blocked issue is identified without changing its current status',()=>{
 const issue=makeIssue('blocked','blocked','high');issue.history=[{date:'2026-09-23',status:'open',description:pair('已建立','Opened'),evidence:'opened'}];
 const draft=composeWeeklyDraft(model({criticalIssuesRisks:[claim('blocked','当前等待外部输入。','Currently waiting for external input.')]}),request([issue]));
 assert.match(draft.sections.criticalIssuesRisks.en,/Blocked/);assert.equal(weeklySignals(request([issue]))[0].blocked,true);
});
test('Historical Blocked state is not mistaken for current In Progress',()=>{
 const issue=makeIssue('transition','in_progress','medium');issue.history=[{date:'2026-09-22',status:'blocked',description:pair('测试受阻','Test blocked'),evidence:'blocked'},{date:'2026-09-25',status:'in_progress',description:pair('已恢复测试','Testing resumed'),evidence:'resumed'}];
 const draft=composeWeeklyDraft(model({keyProgress:[claim('transition','问题从受阻推进至进行中。','The issue progressed from Blocked to In Progress.')],criticalIssuesRisks:[claim('transition','仍需验证。','Validation remains pending.')]}),request([issue]));
 assert.match(draft.sections.keyProgress.en,/Blocked to In Progress/);assert.match(draft.sections.criticalIssuesRisks.en,/In progress/);
 assert.equal(weeklySignals(request([issue]))[0].statusEventsThisPeriod.length,2);
});
test('Missing Owner and Due Date remain TBD rather than invented',()=>{
 const issue=makeIssue('missing','open','needs_assessment');
 const draft=composeWeeklyDraft(model({criticalIssuesRisks:[claim('missing','仍需评估。','Assessment remains pending.')]}),request([issue]));
 assert.match(draft.sections.criticalIssuesRisks.en,/Owner: TBD \| Due: TBD/);
});
test('Unsupported numbers, dates, owner, status and risk produce factual warnings',()=>{
 const issue=makeIssue('fidelity','open','low',pair('机械团队','Mechanical team'),'2026-09-26');
 const draft=composeWeeklyDraft(model({criticalIssuesRisks:[claim('fidelity','发现 99 件。负责人：包装团队。','99 units. Owner: Packaging team. Due Date: 2026-09-29. Current status is Closed. Risk: High.')]}),request([issue]));
 const warnings=draft.warnings.map(w=>w.en).join(' ');
 assert.match(warnings,/number 99/);assert.match(warnings,/date 2026-09-29/);assert.match(warnings,/Owner claim/);assert.match(warnings,/Current status/);assert.match(warnings,/Risk level/);
});
test('Tracker IDs are not mistaken for quantities, while lot-size defect drift is flagged',()=>{
 const issue=makeIssue('W-003','in_progress','medium');issue.backgroundObservation=pair('抽检发现 4 件划伤。','Inspection found 4 scratched brackets.');issue.action=pair('同批 120 件已隔离。','The same lot of 120 units was placed on hold.');
 const draft=composeWeeklyDraft(model({overallStatus:pair('W-003 已隔离 120 件。','W-003: the same lot of 120 scratched brackets was placed on hold.')}),request([issue]));
 const warnings=draft.warnings.map(w=>w.en).join(' ');
 assert.doesNotMatch(warnings,/number 003/);assert.match(warnings,/Quantity 120.*defective units/);
});
test('Actions and next-week priorities use recorded Next Step without model-added plans',()=>{
 const issue=makeIssue('plans','open','medium');
 const draft=composeWeeklyDraft(model({nextWeekPriorities:[claim('plans','自行新增试验。','Run a new unrecorded test.')],actionsOwners:[claim('plans','额外采购。','Purchase extra units.')]}),request([issue]));
 assert.doesNotMatch(draft.sections.nextWeekPriorities.en,/unrecorded test/);
 assert.doesNotMatch(draft.sections.actionsOwners.en,/Purchase extra/);
 assert.match(draft.sections.nextWeekPriorities.en,/Complete assembly validation/);
});
test('Unknown issue reference is removed and reported',()=>{
 const draft=composeWeeklyDraft(model({keyProgress:[claim('fabricated','新问题已解决。','A new issue was resolved.')]}),request([makeIssue('known','open','low')]));
 assert.equal(draft.sections.keyProgress.en,'None recorded.');assert.match(draft.warnings[0].en,/absent/);
});
test('Both Chinese and English are required by structured output',()=>{
 const issue=makeIssue('bilingual','open','low');
 assert.throws(()=>composeWeeklyDraft(model({keyProgress:[{issueId:'bilingual',zh:'有进展'}]}),request([issue])));
 const draft=composeWeeklyDraft(model({keyProgress:[claim('bilingual','有进展。','Progress recorded.')] }),request([issue]));
 assert.match(draft.sections.keyProgress.zh,/有进展/);assert.match(draft.sections.keyProgress.en,/Progress/);
});
test('Human edit survives localStorage roundtrip',()=>{
 const issues=[makeIssue('saved','open','medium')];let current=editWeeklySection(report(issues),'overallStatus','zh','人工修改后的总体状态。');
 const values=new Map<string,string>();const adapter={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
 save({version:2,language:'zh',issues,weeklyReport:current},adapter);
 current=load(adapter)!.weeklyReport!;assert.equal(current.sections.overallStatus.zh,'人工修改后的总体状态。');
});
test('An in-progress empty textarea edit remains persistable and needs review',()=>{
 const issues=[makeIssue('blank','open','medium')],edited=editWeeklySection(report(issues),'overallStatus','zh','');
 assert.equal(weeklyReportSchema.safeParse(edited).success,true);assert.equal(edited.reviewed,false);
});
test('An edited report remains unchanged when a replacement generation fails',async()=>{
 const issues=[makeIssue('preserve','open','medium')],edited=editWeeklySection(report(issues),'overallStatus','zh','保留的人工修改');
 const provider=new DeepSeekWeeklyReportProvider({getKey:()=> 'test-key',model:'test-model'},async()=>{throw Error('network');});
 await assert.rejects(provider.generate(request(issues)));assert.equal(edited.sections.overallStatus.zh,'保留的人工修改');
});
test('Mark as Reviewed works and later editing returns Needs Review',()=>{
 const original=report([makeIssue('review','open','low')]);const reviewed=markWeeklyReviewed(original,'2026-09-27T10:00:00.000Z');
 assert.equal(reviewed.reviewed,true);assert.equal(reviewed.reviewedAt,'2026-09-27T10:00:00.000Z');
 const edited=editWeeklySection(reviewed,'nextWeekPriorities','en','Updated by reviewer.');assert.equal(edited.reviewed,false);assert.equal(edited.reviewedAt,null);
});
test('Tracker update makes report Outdated without rewriting its text',()=>{
 const issues=[makeIssue('stale','open','low')],original=report(issues),changed=[{...issues[0],status:'blocked' as const}];
 assert.equal(isWeeklyOutdated(original,issues),false);assert.equal(isWeeklyOutdated(original,changed),true);
 assert.deepEqual(original.sections,report(issues).sections);
});
test('Tracker Filter and Sort do not change full weekly data source',()=>{
 const issues=[makeIssue('A','open','high'),makeIssue('B','closed','low')];
 const filtered=trackerView(issues,{status:'open',risk:'high'},'risk');assert.equal(filtered.length,1);
 assert.equal(toWeeklyFacts(issues).length,2);assert.equal(dashboardCounts(issues).total,2);
});
test('Copy format uses the currently selected language and all six sections',()=>{
 const value=report([makeIssue('copy','open','low')]);const zh=formatWeeklyReport(value,'zh','Project Atlas'),en=formatWeeklyReport(value,'en','Project Atlas');
 assert.match(zh,/总体状态/);assert.match(zh,/需要的决策或支持/);assert.match(en,/Overall Status/);assert.match(en,/Next Week Priorities/);
 assert.doesNotMatch(en,/总体状态/);
});
test('Weekly draft and edits are included in JSON backup and restored',()=>{
 const issues=[makeIssue('backup','open','medium')],weeklyReport=editWeeklySection(report(issues),'keyProgress','en','Reviewed wording pending.');
 const workspace={version:2 as const,language:'en' as const,issues,weeklyReport};
 assert.deepEqual(parseBackup(backupJson(workspace)),workspace);assert.equal(weeklyReportSchema.safeParse(weeklyReport).success,true);
});
test('Weekly period defaults to Monday–Sunday and rejects inverted dates',()=>{
 assert.deepEqual(currentWeek(new Date(2026,8,27)),period);assert.equal(weeklyPeriodSchema.safeParse({from:'2026-09-28',to:'2026-09-21'}).success,false);
});
test('Weekly prompt is separate from Analysis and mandates current Tracker grounding',()=>{
 assert.match(weeklyInstructions,/CURRENT TRACKER ONLY/);assert.match(weeklyInstructions,/current status/);assert.match(weeklyInstructions,/history/);
});
test('DeepSeek weekly tool response is parsed and provider failures remain bounded',async()=>{
 const issues=[makeIssue('api','open','medium')],output=model({keyProgress:[claim('api','有进展。','Progress recorded.')]});
 const ok=async()=>new Response(JSON.stringify({choices:[{message:{tool_calls:[{function:{name:'submit_weekly_update',arguments:JSON.stringify(output)}}]}}]}),{status:200});
 const provider=new DeepSeekWeeklyReportProvider({getKey:()=> 'test-key',model:'test-model'},ok as typeof fetch);
 assert.match((await provider.generate(request(issues))).sections.keyProgress.en,/Progress recorded/);
 const bad=new DeepSeekWeeklyReportProvider({getKey:()=> 'test-key',model:'test-model'},(async()=>new Response('{', {status:200})) as typeof fetch);
 await assert.rejects(bad.generate(request(issues)));
});
test('Local weekly API validates period and Tracker facts before invoking its independent provider',async()=>{
 let calls=0;const server=createApiServer({async analyze(){throw Error('Analysis must not run');}},()=>true,'deepseek',{async generate(input){calls++;assert.equal(input.issues[0].status,'blocked');return emptyWeeklyDraft();}});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const port=(server.address() as {port:number}).port,url=`http://127.0.0.1:${port}/api/weekly`;
 const payload=request([makeIssue('route','blocked','high')]);
 try{
  const good=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});assert.equal(good.status,200);assert.match((await good.json()).sections.overallStatus.en,/no issues/i);
  const bad=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,period:{from:'2026-09-27',to:'2026-09-21'}})});assert.equal(bad.status,400);
  const foreign=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://other.example'},body:JSON.stringify(payload)});assert.equal(foreign.status,403);
  assert.equal(calls,1);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
