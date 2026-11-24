import type {Issue,Language} from '../types';
import type {AnalysisProvider,TranslationProvider,LegacyWeeklyTemplateProvider} from './providers';
import {emptyIssue,isOpen,localDate,pair} from '../domain/issue';
import {messages,riskLabels,statusLabels} from '../i18n';
export {pair,isOpen,localDate,editExpression} from '../domain/issue';
export class MockAnalysisProvider implements AnalysisProvider {
 async analyze({note}:Parameters<AnalysisProvider['analyze']>[0]){
  const issue=emptyIssue(note,'mock');
  issue.warnings.push(pair('离线 Mock 未执行语义分析或翻译。原始记录已保留，请人工填写所有字段。','Offline Mock performed no semantic analysis or translation. Original note retained; complete all fields manually.'));
  return {drafts:[issue]};
 }
}
export const mockAnalysisProvider=new MockAnalysisProvider();
export const mockTranslationProvider:TranslationProvider={async translate(value,target){return {text:value[target],available:!!value[target]};}};
export const overall=(issues:Issue[],language:Language)=>!issues.length?messages[language].noData:issues.some(i=>isOpen(i)&&(i.riskLevel==='high'||i.riskLevel==='needs_assessment'||i.status==='blocked'))?messages[language].attention:messages[language].onTrack;
// Existing weekly template: only the data contract has changed.
export const mockWeeklyReportProvider:LegacyWeeklyTemplateProvider={async generate(project,issues,language,now=new Date()){
 const m=messages[language],start=new Date(now);start.setDate(start.getDate()-6);
 const from=localDate(start),to=localDate(now),open=issues.filter(isOpen);
 const lines=(xs:string[])=>xs.length?xs.map(x=>'• '+x).join('\n'):m.none;
 const changed=issues.filter(i=>localDate(new Date(i.updatedAt))>=from&&localDate(new Date(i.updatedAt))<=to);
 return [
 project.name+' | '+m.weeklyTitle,m.week+': '+from+' — '+to,'',
 m.overall,overall(issues,language)+' · '+m.openIssues+': '+open.length,'',
 m.progress,changed.length?lines(changed.map(i=>i.issue[language]+' — '+statusLabels[language][i.status])):m.noProgress,'',
 m.openIssues,lines(open.map(i=>i.issue[language])),'',
 m.risks,lines(open.filter(i=>i.riskLevel!=='low').map(i=>i.issue[language]+' — '+riskLabels[language][i.riskLevel]+': '+i.impact[language])),'',
 m.actions,lines(open.map(i=>i.action[language]+' | '+i.owner[language]+' | '+(i.dueDate||m.tbd))),'',
 m.nextWeek,lines(open.map(i=>i.issue[language]+': '+i.nextStep[language])),'',
 m.support,open.some(i=>i.provenance.owner.kind==='missing'||!i.dueDate||i.status==='blocked')?m.supportText:m.supportNone
 ].join('\n');
}};

