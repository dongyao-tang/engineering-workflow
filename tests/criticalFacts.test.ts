import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyIssue,pair} from '../src/domain/issue';
import {distributiveOwnerLabels,parseCriticalFacts,validateCriticalFacts} from '../server/criticalFacts';

test('source-grounded fact validation repairs specific ownership and preserves source dates',()=>{
 const note='设计团队负责试验，结构团队负责此问题；负责人：结构工程师陈明。明天复测，2026-10-08 前提交结论。';
 const raw={groups:[{id:'G1',subject:'结构团队负责此问题',facts:[
  {kind:'owner',quote:'结构团队负责此问题',value:pair('结构团队','Structural Engineering team'),field:'owner',normalized:null},
  {kind:'date',quote:'明天复测',value:pair('明天','tomorrow'),field:'nextStep',normalized:'2026-10-06'},
  {kind:'date',quote:'2026-10-08 前提交结论',value:pair('2026-10-08','2026-10-08'),field:'dueDate',normalized:'2026-10-08'}
 ]}]};
 const extracted=parseCriticalFacts(raw,note);
 const issue=emptyIssue(note,'llm');issue.owner=pair('设计团队','Design team');issue.provenance.owner={kind:'extracted',evidence:['结构团队负责此问题'],rationale:pair('原文','Source')};
 issue.nextStep=pair('安排复测','Arrange retest');
 validateCriticalFacts([issue],extracted.groups,{note,referenceDate:'2026-10-05',timeZone:'Asia/Shanghai'});
 assert.equal(issue.owner.zh,'结构团队');assert.equal(issue.owner.en,'Structural Engineering team');
 assert.equal(issue.dueDate,'2026-10-08');assert.match(issue.nextStep.zh,/2026-10-06/);assert.match(issue.nextStep.en,/2026-10-06/);
 assert.ok(issue.warnings.some(w=>w.en.includes('owner/team')));
});

test('fabricated extraction quotations cannot become trusted facts',()=>{
 const note='A fit issue was observed.';
 const result=parseCriticalFacts({groups:[{id:'G1',subject:'A fit issue',facts:[{kind:'owner',quote:'Assigned to an invented team',value:pair('虚构团队','Invented team'),field:'owner',normalized:null}]}]},note);
 assert.equal(result.groups[0].facts.length,0);assert.ok(result.warnings.length);
});

test('a statement that no owner is assigned never becomes an owner identity',()=>{
 const note='问题待调查，尚未安排负责人。';
 const raw={groups:[{id:'G1',subject:'问题待调查',facts:[{kind:'owner',quote:'尚未安排负责人',value:pair('尚未安排负责人','No owner assigned'),field:'owner',normalized:null}]}]};
 const issue=emptyIssue(note,'llm');issue.owner=pair('尚未安排负责人','No owner assigned');issue.provenance.owner={kind:'extracted',evidence:['尚未安排负责人'],rationale:pair('原文','Source')};
 validateCriticalFacts([issue],parseCriticalFacts(raw,note).groups,{note});
 assert.equal(issue.owner.en,'TBD');assert.equal(issue.provenance.owner.kind,'missing');
});

test('distributive team allocation keeps the specific team for each independent issue',()=>{
 assert.deepEqual(distributiveOwnerLabels('两个问题分别由设计和测试团队处理。',2),['设计团队','测试团队']);
});

test('future dates in independent source segments stay with their own next steps',()=>{
 const note='传感器信号异常，明天复测。同时，包装破损，下周三复验。';
 const groups=[{id:'G1',subject:'传感器信号异常',facts:[]},{id:'G2',subject:'包装破损',facts:[]}];
 const first=emptyIssue(note,'llm'),second=emptyIssue(note,'llm');
 first.nextStep=pair('复测','Repeat the test');second.nextStep=pair('复验','Repeat validation');
 validateCriticalFacts([first,second],groups,{note,referenceDate:'2026-09-20',timeZone:'Asia/Shanghai'});
 assert.match(first.nextStep.en,/2026-09-21/);assert.doesNotMatch(first.nextStep.en,/2026-09-23/);
 assert.match(second.nextStep.en,/2026-09-23/);assert.doesNotMatch(second.nextStep.en,/2026-09-21/);
});
