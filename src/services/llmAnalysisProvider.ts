import type {AnalysisProvider} from './providers';
import type {Issue} from '../types';
import {issueSchema} from '../domain/schema';
export class AnalysisError extends Error {constructor(public code:string){super(code);}}
// Browser adapter: no key, upstream URL, SDK, or model selection.
export class LLMAnalysisProvider implements AnalysisProvider {
 async analyze(request:Parameters<AnalysisProvider['analyze']>[0]) {
  let response:Response;
  try{response=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(190000)});}catch{throw new AnalysisError('connection');}
  let payload:unknown;try{payload=await response.json();}catch{throw new AnalysisError('invalid_response');}
  if(!response.ok){const code=(payload as {code?:unknown})?.code;throw new AnalysisError(typeof code==='string'?code:'analysis_failed');}
  const drafts=(payload as {drafts?:unknown})?.drafts;
  if(!Array.isArray(drafts)||!drafts.length||drafts.length>5)throw new AnalysisError('invalid_response');
  const parsed=drafts.map(item=>issueSchema.safeParse(item));if(parsed.some(item=>!item.success))throw new AnalysisError('invalid_response');
  return {drafts:parsed.map(item=>item.data as unknown as Issue)};
 }
}
export const llmAnalysisProvider=new LLMAnalysisProvider();
