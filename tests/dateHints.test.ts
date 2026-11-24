import {test} from 'node:test';
import assert from 'node:assert/strict';
import {relativeDateHints} from '../server/dateHints';
import {normalizeAnalysis} from '../server/analysisSchema';
import {fixture} from './fixtures';
import {caseA} from './acceptanceCases';
test('relative dates use server reference date, not machine clock',()=>{
 assert.deepEqual(relativeDateHints('明天 tomorrow，下周三 next Wednesday','2026-09-20'),[
  {phrase:'明天',date:'2026-09-21'},{phrase:'tomorrow',date:'2026-09-21'},
  {phrase:'下周三',date:'2026-09-23'},{phrase:'next Wednesday',date:'2026-09-23'}]);
});
test('wrong relative due date is discarded with a review warning',()=>{
 const raw:any=fixture('A');raw.dueDate='2026-09-26';raw.provenance.dueDate.evidence=['明天'];
 const issue=normalizeAnalysis({drafts:[raw]},`${caseA}\n明天提交报告。`,[],[{phrase:'明天',date:'2026-09-17'}])[0];
 assert.equal(issue.dueDate,null);assert.ok(issue.warnings.some(w=>w.en.includes('server calendar')));
});
