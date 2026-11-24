import {test} from 'node:test';
import assert from 'node:assert/strict';
import {backupJson,parseBackup,trackerCsv,BACKUP_SCHEMA_VERSION,BackupError} from '../src/domain/backup';
import {dashboardCounts} from '../src/domain/tracker';
import {emptyIssue,pair} from '../src/domain/issue';
import {load,replaceFromBackup,save} from '../src/storage';
import {messages} from '../src/i18n';
import type {Issue,Store} from '../src/types';

function memoryStorage(){
 const values=new Map<string,string>();
 return {values,getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
}
function sampleIssue(id='issue-001'):Issue{
 const issue=emptyIssue('原始中文记录 / original note','llm');
 issue.id=id;issue.reviewedAt='2026-09-20T10:00:00.000Z';issue.createdAt='2026-09-20T09:00:00.000Z';issue.updatedAt='2026-09-21T10:00:00.000Z';
 issue.issue=pair('定位销超差，装配困难','Out-of-tolerance locating pins impede assembly');
 issue.owner=pair('机械团队，赵磊','Mechanical team, Zhao Lei');
 issue.action=pair('隔离库存，检查 "32, 7" 件','Place inventory on hold; inspect "32, 7" parts');
 issue.nextStep=pair('完成装配验证','Complete assembly validation');
 issue.riskLevel='high';issue.status='in_progress';issue.dueDate='2026-09-26';
 issue.history=[{date:'2026-09-20',status:'open',description:pair('发现异常','Issue identified'),evidence:'original note'},{date:'2026-09-21',status:'in_progress',description:pair('已隔离','Contained'),evidence:'inventory hold'}];
 return issue;
}
const workspace=(issues:Issue[]=[sampleIssue()],language:Store['language']='zh'):Store=>({version:2,language,issues});

test('Tracker modification is saved and reloads automatically without a Save action',()=>{
 const adapter=memoryStorage();const original=workspace();save(original,adapter);
 const changed=workspace([{...original.issues[0],status:'closed',updatedAt:'2026-09-22T10:00:00.000Z'}]);save(changed,adapter);
 assert.equal(load(adapter)?.issues[0].status,'closed');
});
test('Reload retains Issue ID, owner, due date, risk and bilingual text',()=>{
 const adapter=memoryStorage(),original=workspace();save(original,adapter);
 const restored=load(adapter)!;
 assert.equal(restored.issues[0].id,original.issues[0].id);
 for(const key of ['owner','dueDate','riskLevel','issue','action','nextStep','createdAt','updatedAt'] as const)assert.deepEqual(restored.issues[0][key],original.issues[0][key]);
});
test('Reload retains complete status history',()=>{
 const adapter=memoryStorage(),original=workspace();save(original,adapter);
 assert.deepEqual(load(adapter)?.issues[0].history,original.issues[0].history);
});
test('JSON backup contains complete Tracker data and explicit schema version',()=>{
 const original=workspace();const backup=JSON.parse(backupJson(original,new Date('2026-09-26T09:00:00.000Z')));
 assert.equal(backup.schemaVersion,BACKUP_SCHEMA_VERSION);assert.equal(backup.workspace.version,2);
 assert.deepEqual(backup.workspace,original);
});
test('Export then Import preserves all data including IDs, history and timestamps',()=>{
 const original=workspace([sampleIssue(),sampleIssue('issue-002')]);
 assert.deepEqual(parseBackup(backupJson(original)),original);
});
test('Invalid JSON does not overwrite current storage',()=>{
 const adapter=memoryStorage(),original=workspace();save(original,adapter);const before=[...adapter.values];
 assert.throws(()=>parseBackup('{not JSON'),(error:unknown)=>error instanceof BackupError&&error.code==='invalid_json');
 assert.deepEqual([...adapter.values],before);
});
test('Incomplete schema and duplicate Issue IDs are rejected without overwriting',()=>{
 const adapter=memoryStorage(),original=workspace();save(original,adapter);const before=[...adapter.values];
 const missing=JSON.parse(backupJson(original));delete missing.workspace.issues[0].history;
 assert.throws(()=>parseBackup(JSON.stringify(missing)),(error:unknown)=>error instanceof BackupError&&error.code==='invalid_schema');
 const duplicate=workspace([sampleIssue(),sampleIssue()]);
 assert.throws(()=>backupJson(duplicate),(error:unknown)=>error instanceof BackupError&&error.code==='duplicate_id');
 assert.deepEqual([...adapter.values],before);
});
test('Unsupported backup version is rejected',()=>{
 const backup=JSON.parse(backupJson(workspace()));backup.schemaVersion=999;
 assert.throws(()=>parseBackup(JSON.stringify(backup)),(error:unknown)=>error instanceof BackupError&&error.code==='unsupported_version');
});
test('Successful restore saves a pre-import snapshot and updates Dashboard counts',()=>{
 const adapter=memoryStorage(),original=workspace();save(original,adapter);
 const incoming=workspace([sampleIssue(),sampleIssue('issue-002')]);incoming.issues[1].status='closed';
 replaceFromBackup(parseBackup(backupJson(incoming)),adapter);
 assert.deepEqual(load(adapter),incoming);
 assert.deepEqual(JSON.parse(adapter.values.get('projectflow-pre-import-backup')!),original);
 const counts=dashboardCounts(load(adapter)!.issues,new Date('2026-09-22T10:00:00.000Z'));
 assert.equal(counts.total,2);assert.equal(counts.open,1);assert.equal(counts.highRisk,1);
});
test('CSV exports Chinese text, quotes, comma and Excel UTF-8 BOM',()=>{
 const csv=trackerCsv(workspace().issues,'zh');
 assert.ok(csv.startsWith('\uFEFF"Issue ID"'));
 assert.match(csv,/定位销超差，装配困难/);assert.match(csv,/机械团队，赵磊/);
 assert.match(csv,/"隔离库存，检查 ""32, 7"" 件"/);
 assert.equal(csv.split('\r\n').length,3);
});
test('CSV represents null due date as TBD in the selected language',()=>{
 const issue=sampleIssue();issue.dueDate=null;
 assert.match(trackerCsv([issue],'zh'),/,"待确认",/);
 assert.match(trackerCsv([issue],'en'),/,"TBD",/);
 assert.match(trackerCsv([issue],'en'),/Mechanical team, Zhao Lei/);
});
test('CSV neutralizes Excel formula-like engineering text',()=>{
 const issue=sampleIssue();issue.issue=pair('=HYPERLINK("x")','+SUM(1,2)');
 assert.match(trackerCsv([issue],'zh'),/"'=HYPERLINK\(""x""\)"/);
 assert.match(trackerCsv([issue],'en'),/"'\+SUM\(1,2\)"/);
});
test('Empty Tracker can be backed up, imported and exported to header-only CSV',()=>{
 const empty=workspace([]);assert.deepEqual(parseBackup(backupJson(empty)),empty);
 const csv=trackerCsv([],'zh');assert.equal(csv.split('\r\n').length,2);
});
test('Empty or corrupted localStorage does not crash or overwrite existing bytes',()=>{
 const adapter=memoryStorage();assert.equal(load(adapter),null);
 adapter.setItem('atlas-engineering-v2','{damaged');
 assert.throws(()=>load(adapter));assert.equal(adapter.getItem('atlas-engineering-v2'),'{damaged');
});
test('Privacy reminder is complete in both UI languages',()=>{
 assert.match(messages.zh.privacyReminder,/NDA/);
 assert.match(messages.en.privacyReminder,/confidential.*NDA-protected/);
});
