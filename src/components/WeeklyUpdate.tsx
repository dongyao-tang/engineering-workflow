import {weeklySectionKeys,type Language,type WeeklyPeriod,type WeeklyReport,type WeeklySectionKey} from '../types';
import {weeklyLabels,isWeeklyOutdated} from '../domain/weekly';
import type {Issue} from '../types';
import {messages} from '../i18n';

export function WeeklyUpdate({language,period,onPeriod,report,issues,busy,error,onGenerate,onEdit,onReview,onCopy}:{
 language:Language;period:WeeklyPeriod;onPeriod:(period:WeeklyPeriod)=>void;report:WeeklyReport|null;issues:Issue[];busy:boolean;error:string|null;
 onGenerate:()=>void;onEdit:(key:WeeklySectionKey,value:string)=>void;onReview:()=>void;onCopy:()=>void;
}){
 const m=messages[language],outdated=report?isWeeklyOutdated(report,issues):false;
 return <section id="weekly" className="panel weekly-panel">
  <div className="section-heading"><div><div className="eyebrow">03 / {m.communicate}</div><h2>{m.weekly}</h2></div></div>
  <p>{m.weeklyHelp}</p>
  <div className="weekly-controls"><label>{m.periodFrom}<input type="date" value={period.from} onChange={event=>onPeriod({...period,from:event.target.value})}/></label><label>{m.periodTo}<input type="date" value={period.to} onChange={event=>onPeriod({...period,to:event.target.value})}/></label><button className="primary" disabled={busy} onClick={onGenerate}>{busy?m.weeklyWorking:m.generateDraft}</button></div>
  {error&&<div className="review-hint" role="alert">{error}</div>}
  {report?<>
   <div className="weekly-state"><strong className={report.reviewed?'reviewed-tag':'draft-tag'}>{report.reviewed?m.reviewed:m.aiDraftReview}</strong>{outdated&&<strong className="outdated-tag">{m.outdated}</strong>}<span>{m.weeklyPeriod}: {report.period.from} — {report.period.to}</span></div>
   <p className="weekly-edit-help">{m.weeklyEditHelp}</p>
   {outdated&&<div className="review-hint" role="status">{m.weeklyStale}</div>}
   {report.warnings.length>0&&<div className="review-hint" role="alert"><strong>{m.weeklyWarning}</strong><ul>{report.warnings.map((warning,index)=><li key={index}>{warning[language]}</li>)}</ul></div>}
   <div className="weekly-fields">{weeklySectionKeys.map(key=><label key={key}>{weeklyLabels[language][key]}<textarea value={report.sections[key][language]} onChange={event=>onEdit(key,event.target.value)} rows={key==='overallStatus'?4:5}/></label>)}</div>
   <div className="weekly-actions"><button className="primary" onClick={onReview} disabled={report.reviewed}>{m.markReviewed}</button><button onClick={onCopy}>{m.copyReport}</button></div>
  </>:<div className="report-placeholder"><span>≡</span>{m.weeklyEmpty}</div>}
 </section>;
}
