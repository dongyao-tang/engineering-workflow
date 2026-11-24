import type {WeeklyRequest} from '../domain/weekly';
import {weeklySectionKeys,type LocalizedText,type WeeklySectionKey} from '../types';

export interface WeeklyDraft {sections:Record<WeeklySectionKey,LocalizedText>;warnings:LocalizedText[]}
export interface WeeklyReportProvider {generate(request:WeeklyRequest):Promise<WeeklyDraft>}
export class WeeklyReportError extends Error {constructor(public code:string){super(code);}}

export class LLMWeeklyReportProvider implements WeeklyReportProvider {
 async generate(request:WeeklyRequest):Promise<WeeklyDraft>{
  let response:Response;
  try{response=await fetch('/api/weekly',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(110000)});}catch{throw new WeeklyReportError('weekly_connection');}
  let payload:any;try{payload=await response.json();}catch{throw new WeeklyReportError('weekly_invalid_response');}
  if(!response.ok)throw new WeeklyReportError(typeof payload?.code==='string'?payload.code:'weekly_provider_failed');
  if(!payload?.sections||!weeklySectionKeys.every(key=>typeof payload.sections[key]?.zh==='string'&&typeof payload.sections[key]?.en==='string')||!Array.isArray(payload.warnings))throw new WeeklyReportError('weekly_invalid_response');
  return {sections:payload.sections,warnings:payload.warnings};
 }
}
export const llmWeeklyReportProvider=new LLMWeeklyReportProvider();
