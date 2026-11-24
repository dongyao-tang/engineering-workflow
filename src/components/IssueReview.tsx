import {analysisFields,fields,type AnalysisField,type Issue,type Language,type Risk,type Status} from '../types';
import {messages,riskLabels,statusLabels} from '../i18n';
import {analysisMessages} from '../i18n/analysis';
import {editExpression,pair} from '../domain/issue';
export function IssueReview({issue,language,onChange,confirmed,onConfirm,onSave,onCancel,editing,saveDisabled=false}: {
 issue:Issue;language:Language;onChange:(i:Issue)=>void;confirmed:boolean;onConfirm:(v:boolean)=>void;onSave:()=>void;onCancel:()=>void;editing:boolean;saveDisabled?:boolean;
}){
 const m=messages[language],a=analysisMessages[language];
 function scalar(field:'riskLevel'|'status'|'dueDate',value:Risk|Status|string|null){onChange({...issue,[field]:value,provenance:{...issue.provenance,[field]:{kind:'human',evidence:[],rationale:pair('经人工修改。','Edited by a human reviewer.')}}});}
 function evidence(field:AnalysisField){const p=issue.provenance[field];return <details className="field-evidence"><summary><span className={`badge provenance-${p.kind}`}>{a[p.kind]}</span> {a.evidence}</summary><p>{p.rationale[language]}</p>{p.evidence.map((quote,index)=><blockquote key={index}>{quote}</blockquote>)}</details>;}
 return <div className="review"><div className="section-heading"><h3>{m.review}</h3><span className="badge">{m.draft} · {issue.provider==='llm'?a.llm:issue.provider==='mock'?a.mock:'v1'}</span></div><p>{m.reviewHelp}</p><p>{a.review}</p>
 {!!issue.warnings.length&&<div className="review-hint" role="status"><strong>{a.warning}</strong><ul>{issue.warnings.map((w,n)=><li key={n}>{w[language]}</li>)}</ul></div>}
 {!!issue.history.length&&<details><summary>{language==='zh'?'历史记录':'Issue history'} ({issue.history.length})</summary><ol>{issue.history.map((event,index)=><li key={index}>{event.date??''} {event.status?statusLabels[language][event.status]:''} · {event.description[language]}</li>)}</ol></details>}
 {!!issue.lifecycleEvents.length&&<details><summary>{language==='zh'?'本次记录的状态变化':'Changes in this note'} ({issue.lifecycleEvents.length})</summary><ol>{issue.lifecycleEvents.map((event,index)=><li key={index}>{event.date??''} {event.status?statusLabels[language][event.status]:''} · {event.description[language]}</li>)}</ol></details>}
 <details><summary>{m.source}</summary><p className="source-note">{issue.sourceNote}</p></details>
 <div className="form-grid">{fields.map(field=><div key={field} className={field==='issue'?'wide':''}><label>{m[field]}<textarea value={issue[field][language]} onChange={e=>onChange(editExpression(issue,field,language,e.target.value))}/></label>{issue.stale[field]?.includes(language)&&<small className="translation-note">{m.stale}</small>}{evidence(field)}</div>)}
 <div><label>{m.risk}<select value={issue.riskLevel} onChange={e=>scalar('riskLevel',e.target.value as Risk)}>{Object.entries(riskLabels[language]).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>{evidence('riskLevel')}</div>
 <div><label>{m.status}<select value={issue.status} onChange={e=>scalar('status',e.target.value as Status)}>{Object.entries(statusLabels[language]).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>{evidence('status')}</div>
 <div><label>{m.dueDate}<input type="date" value={issue.dueDate||''} onChange={e=>scalar('dueDate',e.target.value||null)}/></label>{evidence('dueDate')}</div></div>
 <label className="confirmation"><input type="checkbox" checked={confirmed} onChange={e=>onConfirm(e.target.checked)}/>{m.confirmed}</label>
 <div className="review-footer"><button onClick={()=>onChange({...issue,stale:Object.fromEntries(fields.map(f=>[f,(issue.stale[f]||[]).filter(lang=>lang!==language)]))})}>{m.approveLanguage}</button><button onClick={onCancel}>{m.cancel}</button><button className="primary" disabled={!confirmed||saveDisabled} onClick={onSave}>{editing?m.save:m.add}</button></div></div>;
}
