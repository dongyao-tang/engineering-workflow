import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyIssue,pair} from '../src/domain/issue';
import {dashboardCounts,deleteTrackedIssue,restoreTrackedIssue,trackerView,type TrackerFilters} from '../src/domain/tracker';
import {messages,riskLabels,statusLabels} from '../src/i18n';
import type {Issue,Language} from '../src/types';

const at=Date.parse('2026-09-26T12:00:00Z');
function issue(id:string,status:Issue['status'],riskLevel:Issue['riskLevel'],dueDate:string|null,created:string):Issue{
 const value=emptyIssue(`Source ${id}`,'mock');
 value.id=id;value.issue=pair(`问题 ${id}`,`Issue ${id}`);value.status=status;value.riskLevel=riskLevel;value.dueDate=dueDate;
 value.createdAt=`${created}T10:00:00.000Z`;value.updatedAt=value.createdAt;value.reviewedAt=value.createdAt;
 return value;
}
function sample():Issue[]{return [
 issue('A','open','high','2026-10-01','2026-09-01'),
 issue('B','open','high',null,'2026-09-03'),
 issue('C','closed','low','2026-09-30','2026-09-05'),
 issue('D','blocked','medium','2026-09-28','2026-09-07'),
 issue('E','in_progress','low','2026-10-02','2026-09-09'),
 issue('F','open','needs_assessment',null,'2026-09-11')
];}
const ids=(issues:Issue[])=>issues.map(issue=>issue.id);
const all:TrackerFilters={status:'all',risk:'all'};

test('Delete removes only the selected tracker record',()=>{
 const result=deleteTrackedIssue(sample(),'A',at)!;
 assert.deepEqual(ids(result.issues),['B','C','D','E','F']);assert.equal(result.deleted.issue.id,'A');
});
test('Undo restores the exact Issue ID, original position and object',()=>{
 const original=sample(),result=deleteTrackedIssue(original,'A',at)!;
 const restored=restoreTrackedIssue(result.issues,result.deleted,at+5000);
 assert.deepEqual(ids(restored),ids(original));assert.strictEqual(restored[0],original[0]);
});
test('Undo retains the full status history and timestamps',()=>{
 const original=sample();original[0].history=[{date:'2026-09-20',status:'open',description:pair('已建立','Created'),evidence:'recorded'}];
 original[0].updatedAt='2026-09-21T08:00:00.000Z';
 const deleted=deleteTrackedIssue(original,'A',at)!.deleted;
 const restored=restoreTrackedIssue(original.slice(1),deleted,at+9000)[0];
 assert.deepEqual(restored.history,original[0].history);assert.equal(restored.createdAt,original[0].createdAt);assert.equal(restored.updatedAt,original[0].updatedAt);assert.equal(restored.reviewedAt,original[0].reviewedAt);
});
test('Undo expires after ten seconds and cannot recreate a deleted Issue',()=>{
 const result=deleteTrackedIssue(sample(),'A',at)!;
 assert.deepEqual(ids(restoreTrackedIssue(result.issues,result.deleted,at+10000)),ids(result.issues));
});
test('Dashboard counts recalculate immediately after Delete',()=>{
 const before=dashboardCounts(sample(),new Date(at)),after=dashboardCounts(deleteTrackedIssue(sample(),'A',at)!.issues,new Date(at));
 assert.deepEqual({total:before.total,open:before.open,high:before.highRisk,upcoming:before.upcoming},{total:6,open:5,high:2,upcoming:3});
 assert.deepEqual({total:after.total,open:after.open,high:after.highRisk,upcoming:after.upcoming},{total:5,open:4,high:1,upcoming:2});
});
test('Undo restores Dashboard totals',()=>{
 const original=sample(),deleted=deleteTrackedIssue(original,'A',at)!;
 assert.deepEqual(dashboardCounts(restoreTrackedIssue(deleted.issues,deleted.deleted,at+1000),new Date(at)),dashboardCounts(original,new Date(at)));
});
test('Filter does not mutate original Issue data',()=>{
 const original=sample(),snapshot=structuredClone(original);
 trackerView(original,{status:'open',risk:'high'},'risk');assert.deepEqual(original,snapshot);
});
test('Open + High returns only matching issues',()=>{
 assert.deepEqual(ids(trackerView(sample(),{status:'open',risk:'high'},'created_oldest')),['A','B']);
});
test('Clear Filters restores all issues in the view without changing source data',()=>{
 const original=sample();assert.equal(trackerView(original,{status:'open',risk:'high'},'risk').length,2);
 assert.equal(trackerView(original,{status:'all',risk:'all'},'risk').length,original.length);
});
test('Risk order is High, Medium, Low, Needs Assessment',()=>{
 assert.deepEqual(ids(trackerView(sample(),all,'risk')),['A','B','D','C','E','F']);
});
test('Due date earliest and latest sorts preserve the requested direction',()=>{
 assert.deepEqual(ids(trackerView(sample(),all,'due_asc')),['D','C','A','E','B','F']);
 assert.deepEqual(ids(trackerView(sample(),all,'due_desc')),['E','A','C','D','B','F']);
});
test('Null due dates always sort last without an error',()=>{
 for(const sort of ['due_asc','due_desc'] as const)assert.deepEqual(ids(trackerView(sample(),all,sort).slice(-2)),['B','F']);
});
test('Created time supports newest and oldest first',()=>{
 assert.deepEqual(ids(trackerView(sample(),all,'created_newest')),['F','E','D','C','B','A']);
 assert.deepEqual(ids(trackerView(sample(),all,'created_oldest')),['A','B','C','D','E','F']);
});
test('Sort does not mutate source order or fields',()=>{
 const original=sample(),snapshot=structuredClone(original);
 for(const sort of ['risk','due_asc','due_desc','created_newest','created_oldest'] as const)trackerView(original,all,sort);
 assert.deepEqual(original,snapshot);
});
test('Status and risk filters compose with due-date sort while Dashboard remains global',()=>{
 const original=sample();assert.deepEqual(ids(trackerView(original,{status:'open',risk:'high'},'due_asc')),['A','B']);
 assert.equal(dashboardCounts(original,new Date(at)).open,5);
});
test('New controls and confirmation copy switch coherently between Chinese and English',()=>{
 const labels=(language:Language)=>({delete:messages[language].deleteIssue,undo:messages[language].undo,filter:messages[language].filter,sort:messages[language].sort,clear:messages[language].clearFilters,confirmation:messages[language].deleteConfirm,status:statusLabels[language].open,risk:riskLabels[language].high});
 assert.deepEqual(labels('zh'),{delete:'删除',undo:'撤销',filter:'筛选',sort:'排序',clear:'清除筛选',confirmation:'确定删除该问题吗？删除用于移除错误、重复或不需要保留的记录。已完成的问题应使用“关闭”，而不是“删除”。',status:'待处理',risk:'高'});
 assert.deepEqual(labels('en'),{delete:'Delete',undo:'Undo',filter:'Filter',sort:'Sort',clear:'Clear filters',confirmation:'Delete this issue? Delete should be used for incorrect, duplicate, or unnecessary records. Completed issues should be Closed instead.',status:'Open',risk:'High'});
});
