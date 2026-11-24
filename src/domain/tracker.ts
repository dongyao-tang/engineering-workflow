import type {Issue,Risk,Status} from '../types';
import {isOpen,localDate} from './issue';

export type TrackerFilters={status:Status|'all';risk:Risk|'all'};
export type TrackerSort='risk'|'due_asc'|'due_desc'|'created_newest'|'created_oldest';
export interface DeletedIssue {issue:Issue;index:number;expiresAt:number}
const riskOrder:Record<Risk,number>={high:0,medium:1,low:2,needs_assessment:3};

export function deleteTrackedIssue(issues:Issue[],id:string,now=Date.now(),undoWindowMs=10000):{issues:Issue[];deleted:DeletedIssue}|null{
 const index=issues.findIndex(issue=>issue.id===id);
 if(index<0)return null;
 return {issues:issues.filter(issue=>issue.id!==id),deleted:{issue:issues[index],index,expiresAt:now+undoWindowMs}};
}

export function restoreTrackedIssue(issues:Issue[],deleted:DeletedIssue,now=Date.now()):Issue[]{
 if(now>=deleted.expiresAt||issues.some(issue=>issue.id===deleted.issue.id))return issues;
 const restored=[...issues];
 restored.splice(Math.min(deleted.index,restored.length),0,deleted.issue);
 return restored;
}

export function trackerView(issues:Issue[],filters:TrackerFilters,sort:TrackerSort):Issue[]{
 const visible=issues.filter(issue=>(filters.status==='all'||issue.status===filters.status)&&(filters.risk==='all'||issue.riskLevel===filters.risk));
 const compareDue=(a:Issue,b:Issue,direction:1|-1)=>{
  if(a.dueDate===null)return b.dueDate===null?0:1;
  if(b.dueDate===null)return -1;
  return a.dueDate.localeCompare(b.dueDate)*direction;
 };
 return visible.sort((a,b)=>{
  if(sort==='risk')return riskOrder[a.riskLevel]-riskOrder[b.riskLevel];
  if(sort==='due_asc')return compareDue(a,b,1);
  if(sort==='due_desc')return compareDue(a,b,-1);
  return a.createdAt.localeCompare(b.createdAt)*(sort==='created_newest'?-1:1);
 });
}

export function dashboardCounts(issues:Issue[],now=new Date()){
 const open=issues.filter(isOpen),today=localDate(now),end=new Date(now);
 end.setDate(end.getDate()+7);
 const endDate=localDate(end);
 return {total:issues.length,open:open.length,highRisk:open.filter(issue=>issue.riskLevel==='high').length,
  upcoming:open.filter(issue=>issue.dueDate!==null&&issue.dueDate>=today&&issue.dueDate<=endDate).length,today,endDate};
}
