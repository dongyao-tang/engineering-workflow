import {useEffect,useRef,useState} from 'react';
import {fields,type Issue,type Language,type Risk,type Status,type Store,type TextField,type WeeklyPeriod,type WeeklyReport,type WeeklySectionKey} from './types';
import {messages,riskLabels,statusLabels} from './i18n';
import {demoIssues,example,project} from './data/demoProject';
import {analysisMessages,analysisErrors} from './i18n/analysis';
import {llmAnalysisProvider,AnalysisError} from './services/llmAnalysisProvider';
import {IssueReview} from './components/IssueReview';
import {WeeklyUpdate} from './components/WeeklyUpdate';
import {mockAnalysisProvider,overall} from './services/mockProviders';
import {llmWeeklyReportProvider,WeeklyReportError} from './services/weeklyReportProvider';
import * as storage from './storage';
import {createReviewedIssue,updateReviewedIssue} from './domain/lifecycle';
import {dashboardCounts,deleteTrackedIssue,restoreTrackedIssue,trackerView,type DeletedIssue,type TrackerFilters,type TrackerSort} from './domain/tracker';
import {BackupError,backupJson,exportTimestamp,parseBackup,trackerCsv} from './domain/backup';
import {currentWeek,editWeeklySection,formatWeeklyReport,markWeeklyReviewed,toWeeklyFacts,trackerSnapshot,weeklyPeriodSchema} from './domain/weekly';
function initial():{data:Store;error:boolean}{try{return {data:storage.load()??{version:2,language:'zh',issues:[]},error:false};}catch{return {data:{version:2,language:'zh',issues:[]},error:true};}}
function downloadFile(content:string,name:string,type:string){
 const url=URL.createObjectURL(new Blob([content],{type}));
 const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);
 try{link.click();}finally{link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
const boot=initial();
export default function App(){
 const [language,setLanguage]=useState<Language>(boot.data.language),[issues,setIssues]=useState<Issue[]>(boot.data.issues),[note,setNote]=useState(''),[drafts,setDrafts]=useState<Issue[]>([]),[editing,setEditing]=useState(false),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState<keyof typeof messages.zh|null>(boot.error?'invalidStorage':null),[report,setReport]=useState<WeeklyReport|null>(boot.data.weeklyReport??null);
 const [period,setPeriod]=useState<WeeklyPeriod>(boot.data.weeklyReport?.period??currentWeek()),[weeklyBusy,setWeeklyBusy]=useState(false),[weeklyError,setWeeklyError]=useState<string|null>(null);
 const [lifecycleChoice,setLifecycleChoice]=useState<'create'|'update'|null>(null),[targetIssueId,setTargetIssueId]=useState<string|null>(null);
 const [filters,setFilters]=useState<TrackerFilters>({status:'all',risk:'all'}),[sort,setSort]=useState<TrackerSort>('created_newest'),[pendingDeletes,setPendingDeletes]=useState<DeletedIssue[]>([]);
 const [storageLocked,setStorageLocked]=useState(boot.error),[importing,setImporting]=useState(false),importInput=useRef<HTMLInputElement>(null);
 const draft=drafts[0]??null;
 const m=messages[language],a=analysisMessages[language];
 const [mode,setMode]=useState<'llm'|'mock'>('llm'),[analysisError,setAnalysisError]=useState<string|null>(null),[health,setHealth]=useState<'ready'|'missing'|'unavailable'>('unavailable');
 useEffect(()=>{fetch('/api/health').then(r=>r.ok?r.json():Promise.reject()).then(v=>setHealth(v.configured?'ready':'missing')).catch(()=>setHealth('unavailable'));},[]);
 useEffect(()=>{document.documentElement.lang=language==='zh'?'zh-CN':'en';if(storageLocked)return;try{storage.save({version:2,language,issues,weeklyReport:report});}catch{setNotice('storageError');}},[language,issues,report,storageLocked]);
 useEffect(()=>{if(!pendingDeletes.length)return;const nextExpiry=Math.min(...pendingDeletes.map(item=>item.expiresAt));const timer=window.setTimeout(()=>setPendingDeletes(current=>current.filter(item=>item.expiresAt>Date.now())),Math.max(0,nextExpiry-Date.now()));return ()=>window.clearTimeout(timer);},[pendingDeletes]);
 const dashboard=dashboardCounts(issues),visibleIssues=trackerView(issues,filters,sort),ordinalById=new Map(issues.map((issue,index)=>[issue.id,index+1]));
 const filtersActive=filters.status!=='all'||filters.risk!=='all';
 async function analyze(selectedMode=mode){
 setAnalysisError(null);if(note.length>12000){setAnalysisError('input_too_large');return;}setBusy(true);
 try{const result=await (selectedMode==='llm'?llmAnalysisProvider:mockAnalysisProvider).analyze({note,existingIssues:issues.map((i,index)=>({id:i.id,trackerId:`ATL-${String(index+1).padStart(3,'0')}`,issue:i.issue,status:i.status}))});setDrafts(result.drafts);setEditing(false);setConfirmed(false);setLifecycleChoice(result.drafts[0]?.lifecycleIntent==='possible_update'?null:'create');setTargetIssueId(result.drafts[0]?.referencedIssueId??null);}
 catch(error){setAnalysisError(error instanceof AnalysisError?error.code:'analysis_failed');}finally{setBusy(false);}
 }
 function update(next:Issue){setDrafts(current=>[next,...current.slice(1)]);setConfirmed(false);}
 function nextDraft(){const remaining=drafts.slice(1);setDrafts(remaining);setConfirmed(false);setLifecycleChoice(remaining[0]?.lifecycleIntent==='possible_update'?null:'create');setTargetIssueId(remaining[0]?.referencedIssueId??null);}
 function submit(){if(!draft||!confirmed)return;if(!draft.issue[language].trim()||['TBD','待确认'].includes(draft.issue[language].trim())){setNotice('required');return;}if(!editing&&draft.lifecycleIntent==='possible_update'&&!lifecycleChoice)return;if(lifecycleChoice==='update'&&!targetIssueId)return;
  const stamp=new Date().toISOString();setIssues(current=>{
   if(editing)return current.map(i=>i.id===draft.id?{...draft,reviewedAt:stamp,updatedAt:stamp}:i);
   if(lifecycleChoice==='update'){const target=current.find(i=>i.id===targetIssueId);return target?current.map(i=>i.id===target.id?updateReviewedIssue(target,draft,stamp):i):current;}
   return [...current,createReviewedIssue(draft,stamp)];
  });nextDraft();setNotice('saved');}
 function removeIssue(id:string){if(!window.confirm(m.deleteConfirm))return;const result=deleteTrackedIssue(issues,id);if(!result)return;setIssues(result.issues);setPendingDeletes(current=>[...current,result.deleted]);}
 function undoDelete(id:string){const deleted=pendingDeletes.find(item=>item.issue.id===id);if(!deleted)return;setIssues(current=>restoreTrackedIssue(current,deleted));setPendingDeletes(current=>current.filter(item=>item.issue.id!==id));}
 function exportBackup(){try{downloadFile(backupJson({version:2,language,issues,weeklyReport:report}),`projectflow-backup-${exportTimestamp()}.json`,'application/json;charset=utf-8');setNotice('exportSuccess');}catch{setNotice('error');}}
 function exportTracker(){try{downloadFile(trackerCsv(issues,language),`projectflow-tracker-${exportTimestamp()}.csv`,'text/csv;charset=utf-8');setNotice('exportSuccess');}catch{setNotice('error');}}
 async function importBackup(file:File|undefined){
  if(!file)return;
  if(!file.name.toLowerCase().endsWith('.json')){setNotice('invalidFile');return;}
  setImporting(true);
  try{
   const incoming=parseBackup(await file.text());
   if(!window.confirm(m.importConfirm))return;
   const current:Store={version:2,language,issues,weeklyReport:report};
   downloadFile(backupJson(current),`projectflow-before-import-${exportTimestamp()}.json`,'application/json;charset=utf-8');
   storage.replaceFromBackup(incoming);
   setStorageLocked(false);setLanguage(incoming.language);setIssues(incoming.issues);setDrafts([]);setPendingDeletes([]);setReport(incoming.weeklyReport??null);setPeriod(incoming.weeklyReport?.period??currentWeek());setWeeklyError(null);setNotice('importSuccess');
  }catch(error){setNotice(error instanceof BackupError?error.code==='invalid_json'?'invalidJson':error.code==='unsupported_version'?'unsupportedBackup':error.code==='duplicate_id'?'duplicateBackup':'invalidBackup':'importFailed');}
  finally{setImporting(false);}
 }
 async function generateWeekly(){
  if(!weeklyPeriodSchema.safeParse(period).success){setWeeklyError(m.invalidPeriod);return;}
  if(report&&!window.confirm(m.regenerateConfirm))return;
  setWeeklyError(null);setWeeklyBusy(true);
  try{const snapshot=trackerSnapshot(issues),result=await llmWeeklyReportProvider.generate({projectName:project.name,period,issues:toWeeklyFacts(issues)});
   const stamp=new Date().toISOString();setReport({version:1,period,sections:result.sections,warnings:result.warnings,trackerSnapshot:snapshot,generatedAt:stamp,updatedAt:stamp,reviewed:false,reviewedAt:null});
  }catch(error){setWeeklyError(error instanceof WeeklyReportError&&error.code==='weekly_invalid_response'?m.weeklyInvalid:error instanceof WeeklyReportError&&error.code==='weekly_unavailable'?m.weeklyUnavailable:m.weeklyFailed);}
  finally{setWeeklyBusy(false);}
 }
 async function copyWeekly(){if(!report)return;try{await navigator.clipboard.writeText(formatWeeklyReport(report,language,project.name));setNotice('weeklyCopied');}catch{setNotice('copyError');}}
 function value(i:Issue,field:TextField){return <><span>{i[field][language]}</span>{i.stale[field]?.includes(language)&&<small className="translation-note">{m.stale}</small>}</>;}
 return <div className="shell"><aside className="sidebar"><a className="brand" href="#dashboard"><span className="mark">A</span>ATLAS<span className="brand-small">ENGINEERING</span></a><div className="workspace-label">{m.workspace}</div><nav>{(['dashboard','input','tracker','weekly'] as const).map((key,index)=><a key={key} href={`#${key}`}><span>0{index+1}</span>{m[key]}</a>)}</nav><div className="sidebar-footer">NPI / PRODUCT DEVELOPMENT<br/><strong>{language==='zh'?'工程判断，由人负责。':'Engineering judgment stays human.'}</strong></div></aside>
 <main><header><div className="breadcrumb">PROJECT ATLAS <span>/</span> {m.workspace}</div><div className="languages" aria-label={m.languageLabel}>{(['zh','en'] as const).map(lang=><button key={lang} aria-pressed={language===lang} className={language===lang?'selected':''} onClick={()=>setLanguage(lang)}>{lang==='zh'?'中文':'English'}</button>)}</div></header>
 <section id="dashboard" className="dashboard"><div className="section-heading"><div><div className="eyebrow">PROJECT / ATLAS-001</div><h1>{project.name}</h1><p>{m.subtitle}</p></div><div className="phase"><span>{m.phase}</span><strong>{project.phase[language]}</strong></div></div><div className="metrics"><article><span>{m.overall}</span><strong className="overall">{overall(issues,language)}</strong><small>{m.dashboard}</small></article><article><span>{m.openIssues}</span><strong>{dashboard.open.toString().padStart(2,'0')}</strong><small>{m.all}: {dashboard.total}</small></article><article><span>{m.highRisk}</span><strong className="danger-number">{dashboard.highRisk.toString().padStart(2,'0')}</strong><small>{m.risk}</small></article><article><span>{m.upcoming}</span><strong>{dashboard.upcoming.toString().padStart(2,'0')}</strong><small>{dashboard.today} — {dashboard.endDate}</small></article></div></section>
 <div className="mock-banner"><label>{a.mode} <select aria-label={a.mode} value={mode} disabled={busy||!!draft} onChange={e=>{setMode(e.target.value as 'llm'|'mock');setAnalysisError(null);}}><option value="llm">{a.llm}</option><option value="mock">{a.mock}</option></select></label><span>{mode==='llm'?a.help:a.offline}</span></div>
 {mode==='llm'&&<p role="status">{health==='ready'?a.healthReady:health==='missing'?a.healthMissing:a.healthUnavailable}</p>}
 {analysisError&&<div className="review-hint" role="alert">{analysisError==='input_too_large'?a.tooLong:(analysisErrors[analysisError]||analysisErrors.analysis_failed)[language]} <button disabled={busy||!note.trim()||note.length>12000||storageLocked} onClick={()=>{setMode('mock');void analyze('mock');}}>{a.retryOffline}</button></div>}{storageLocked&&<div className="review-hint" role="alert">{m.storageLocked}</div>}{notice&&<div className="notice" role="status">{m[notice]}<button aria-label={m.cancel} onClick={()=>setNotice(null)}>×</button></div>}
 <section id="input" className="panel"><div className="section-heading"><div><div className="eyebrow">01 / {m.capture}</div><h2>{m.input}</h2></div><button className="quiet" disabled={busy} onClick={()=>setNote(example)}>{m.example}</button></div><p>{m.noteHelp}</p><p className="privacy-reminder">{m.privacyReminder}</p><label className="sr-only" htmlFor="note">{m.input}</label><textarea id="note" className="note-input" disabled={busy} value={note} onChange={e=>setNote(e.target.value)} placeholder={language==='zh'?'今天 trial build 发现 assembly interference……':'Trial build identified assembly interference…'}/><div className="input-footer"><span>{language==='zh'?'中文 / English / 混合输入':'Chinese / English / Mixed input'}</span><button className="primary" disabled={!note.trim()||busy||!!draft||storageLocked} onClick={()=>void analyze()}>{busy?a.working:m.analyze} <span>↗</span></button></div>
 {draft&&<>{drafts.length>1&&<p role="status">{language==='zh'?`待审核草稿：${drafts.length} 条（逐条确认）`:`Drafts awaiting review: ${drafts.length} (review each)`}</p>}
 {!editing&&draft.lifecycleIntent==='possible_update'&&<div className="review-hint"><strong>{language==='zh'?'可能是现有问题更新，请确认处理方式。':'Possible existing issue update. Confirm how to handle it.'}</strong><div><label><input type="radio" name="lifecycle" checked={lifecycleChoice==='update'} onChange={()=>setLifecycleChoice('update')}/>{language==='zh'?'更新现有问题':'Update existing issue'}</label><label><input type="radio" name="lifecycle" checked={lifecycleChoice==='create'} onChange={()=>setLifecycleChoice('create')}/>{language==='zh'?'新建问题':'Create new issue'}</label></div>{lifecycleChoice==='update'&&<label>{language==='zh'?'选择现有问题':'Select existing issue'}<select value={targetIssueId??''} onChange={e=>setTargetIssueId(e.target.value||null)}><option value="">{language==='zh'?'请选择':'Select issue'}</option>{issues.map((i,index)=><option key={i.id} value={i.id}>{`ATL-${String(index+1).padStart(3,'0')} · ${i.issue[language]}`}</option>)}</select></label>}</div>}
 <IssueReview issue={draft} language={language} onChange={update} confirmed={confirmed} onConfirm={setConfirmed} onSave={submit} onCancel={nextDraft} editing={editing} saveDisabled={!editing&&((draft.lifecycleIntent==='possible_update'&&!lifecycleChoice)||(lifecycleChoice==='update'&&!targetIssueId))}/></>}

 </section>
 <section id="tracker" className="panel">
  <div className="section-heading"><div><div className="eyebrow">02 / {m.trackAct}</div><h2>{m.tracker} <span className="count">{issues.length}</span></h2></div><div className="workspace-actions"><button className="quiet" onClick={exportBackup}>{m.exportBackup}</button><button className="quiet" disabled={importing||busy||!!draft} onClick={()=>importInput.current?.click()}>{m.importBackup}</button><button className="quiet" onClick={exportTracker}>{m.exportTracker}</button><input ref={importInput} className="sr-only" type="file" accept=".json,application/json" aria-hidden="true" tabIndex={-1} onChange={event=>{const file=event.target.files?.[0];event.target.value='';void importBackup(file);}}/></div></div>
  <div className="tracker-controls">
   <fieldset><legend>{m.filter}</legend><label>{m.filterStatus}<select aria-label={m.filterStatus} value={filters.status} onChange={event=>setFilters(current=>({...current,status:event.target.value as Status|'all'}))}><option value="all">{m.allStatuses}</option>{(['open','in_progress','blocked','closed'] as const).map(status=><option key={status} value={status}>{statusLabels[language][status]}</option>)}</select></label><label>{m.filterRisk}<select aria-label={m.filterRisk} value={filters.risk} onChange={event=>setFilters(current=>({...current,risk:event.target.value as Risk|'all'}))}><option value="all">{m.allRisks}</option>{(['high','medium','low','needs_assessment'] as const).map(risk=><option key={risk} value={risk}>{riskLabels[language][risk]}</option>)}</select></label><button className="quiet" disabled={!filtersActive} onClick={()=>setFilters({status:'all',risk:'all'})}>{m.clearFilters}</button></fieldset>
   <label className="sort-control">{m.sort}<select aria-label={m.sort} value={sort} onChange={event=>setSort(event.target.value as TrackerSort)}><option value="risk">{m.sortRisk}</option><option value="due_asc">{m.dueEarliest}</option><option value="due_desc">{m.dueLatest}</option><option value="created_newest">{m.newest}</option><option value="created_oldest">{m.oldest}</option></select></label>
  </div>
  <p className="filter-summary" role="status">{m.showing} {visibleIssues.length}/{issues.length} · {m.filterStatus}: {filters.status==='all'?m.allStatuses:statusLabels[language][filters.status]} · {m.filterRisk}: {filters.risk==='all'?m.allRisks:riskLabels[language][filters.risk]}</p>
  <div className="table-wrap"><table><thead><tr>{[m.issue,m.risk,m.owner,m.action,m.dueDate,m.status,''].map((x,index)=><th key={index}>{x}</th>)}</tr></thead><tbody>{visibleIssues.map(i=><tr key={i.id}><td><small className="issue-id">ATL-{String(ordinalById.get(i.id)??0).padStart(3,'0')}</small><strong>{value(i,'issue')}</strong></td><td><span className={`badge risk-${i.riskLevel}`}>{riskLabels[language][i.riskLevel]}</span></td><td>{value(i,'owner')}</td><td>{value(i,'action')}</td><td className="date">{i.dueDate||m.tbd}</td><td><span className={`badge status-${i.status}`}>{statusLabels[language][i.status]}</span></td><td><div className="row-actions"><button className="quiet" disabled={!!draft||storageLocked} onClick={()=>{setDrafts([structuredClone(i)]);setEditing(true);setConfirmed(false);setLifecycleChoice('update');setTargetIssueId(i.id);document.getElementById('input')?.scrollIntoView({behavior:'smooth'});}}>{m.edit}</button><button className="quiet delete-button" disabled={!!draft||storageLocked} onClick={()=>removeIssue(i.id)}>{m.deleteIssue}</button></div></td></tr>)}</tbody></table>{!issues.length?<p className="empty">{m.empty}</p>:!visibleIssues.length?<p className="empty">{m.noMatches}</p>:null}</div>
 </section>
 <WeeklyUpdate language={language} period={period} onPeriod={setPeriod} report={report} issues={issues} busy={weeklyBusy||storageLocked} error={weeklyError} onGenerate={()=>void generateWeekly()} onEdit={(key:WeeklySectionKey,text:string)=>setReport(current=>current?editWeeklySection(current,key,language,text):null)} onReview={()=>setReport(current=>current?markWeeklyReviewed(current):null)} onCopy={()=>void copyWeekly()}/>
 <footer><span>{language==='zh'?'本地工作区 · 请定期导出备份':'Local workspace · Export backups regularly'}</span><button className="quiet" disabled={busy||importing||weeklyBusy} onClick={()=>{if(window.confirm(m.resetConfirm)){setStorageLocked(false);setIssues(demoIssues());setDrafts([]);setReport(null);setPeriod(currentWeek());setNote('');setNotice(null);setPendingDeletes([]);}}}>{m.reset}</button></footer></main>
 {pendingDeletes.length>0&&<div className="undo-stack" aria-live="polite">{pendingDeletes.map(item=><div className="undo-toast" key={item.issue.id}><span>{m.issueDeleted}<small>{item.issue.issue[language]}</small></span><button onClick={()=>undoDelete(item.issue.id)}>{m.undo}</button></div>)}</div>}
 </div>;
}

