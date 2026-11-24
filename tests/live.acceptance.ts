// Explicit opt-in real API tests. No model fixtures; skipped when the server has no key.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadServerEnvironment} from '../server/config';
import {createAnalysisProvider} from '../server/providers/factory';
import {caseA,caseB} from './acceptanceCases';
import {fields} from '../src/types';
const config=loadServerEnvironment(),provider=createAnalysisProvider(config);
for(const [name,note,risk,status,owner,due] of [
 ['A',caseA,'high','open','供应商质量工程师赵磊','2026-09-19'],
 ['B',caseB,'medium','in_progress','包装工程师孙悦','2026-09-21']
])test(`LIVE ${config.provider} semantic acceptance ${name}`,{skip:!config.getKey(),timeout:70000},async()=>{
 const {drafts}=await provider.analyze({note,referenceDate:'2026-09-16',timeZone:'Asia/Shanghai'});assert.equal(drafts.length,1);const issue=drafts[0];
 assert.equal(issue.riskLevel,risk);assert.equal(issue.status,status);assert.equal(issue.owner.zh.replace(/[\s。]/g,''),owner);assert.equal(issue.dueDate,due);
 assert.equal(issue.sourceNote,note);assert.equal(issue.reviewedAt,undefined);
 for(const f of fields){assert.ok(issue[f].zh.trim());assert.ok(issue[f].en.trim());assert.notEqual(issue[f].en,'TBD');}
 if(name==='A'){
  for(const number of ['32','7','200'])assert.ok(issue.backgroundObservation.en.includes(number));
  assert.match(issue.rootCauseAssumption.en,/suspect|hypothes|investigat|unconfirmed|pending/i);
  assert.match(issue.action.en,/hold|quarantin|contain/i);assert.match(issue.action.en,/trac/i);
  assert.match(issue.nextStep.en,/replac/i);assert.match(issue.nextStep.en,/assembl/i);
 }else{assert.match(issue.rootCauseAssumption.en,/clearance|gap/i);assert.match(issue.action.en,/scuff|abrasion|scratch/i);assert.match(issue.nextStep.en,/transport|transit|shipping/i);assert.match(issue.nextStep.en,/specification|standard/i);}
});
