import {ResponsesAnalysisProvider} from './responsesAnalysisProvider';
import type {AnalysisRequest} from '../../src/types';
import {analysisInstructions} from '../prompt';
import {analysisJsonSchema,normalizeAnalysis} from '../analysisSchema';
import {relativeDateHints} from '../dateHints';
import {serverFetch} from '../transport';
import {pair} from '../../src/domain/issue';
import {criticalFactsJsonSchema,extractionInstructions,parseCriticalFacts,validateCriticalFacts,distributiveOwnerLabels,type FactGroup} from '../criticalFacts';
export class DeepSeekAnalysisProvider extends ResponsesAnalysisProvider {
 constructor(private config:{getKey:()=>string|undefined;model:string},private chatTransport:typeof fetch=serverFetch){
  super({endpoint:'https://api.deepseek.com/responses',model:config.model,getKey:config.getKey,strictJsonSchema:false,reasoningEffort:'none'},chatTransport);
 }
 protected override async extractFacts(request:AnalysisRequest,key:string):Promise<{groups:FactGroup[];warnings:string[]}>{
  try{
   const call=async(extra?:unknown)=>this.chatTransport('https://api.deepseek.com/chat/completions',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
    body:JSON.stringify({model:this.config.model,stream:false,thinking:{type:'disabled'},max_tokens:5000,
     messages:[{role:'system',content:extractionInstructions},{role:'user',content:JSON.stringify({engineeringNote:request.note,referenceDate:request.referenceDate,timeZone:request.timeZone,relativeDateHints:relativeDateHints(request.note,request.referenceDate??''),existingIssues:request.existingIssues??[],...extra as object})}],
     tools:[{type:'function',function:{name:'submit_critical_facts',description:'Source-grounded critical facts grouped by independent issue.',parameters:criticalFactsJsonSchema}}],
     tool_choice:{type:'function',function:{name:'submit_critical_facts'}}}),signal:AbortSignal.timeout(45000)
   });
   const response=await call();
   if(!response.ok)return super.extractFacts(request,key);
   const body:any=await response.json();
   const raw=body?.choices?.[0]?.message?.tool_calls?.find((call:any)=>call?.function?.name==='submit_critical_facts')?.function?.arguments;
   if(typeof raw!=='string')return super.extractFacts(request,key);
   const initial=parseCriticalFacts(JSON.parse(raw),request.note);
   const owners=initial.groups.map(g=>g.facts.filter(f=>f.kind==='owner').at(-1)?.value.zh).filter(Boolean);
   const allocated=distributiveOwnerLabels(request.note,initial.groups.length);
   const misallocated=allocated.length===initial.groups.length&&allocated.some((label,index)=>owners[index]!==label);
   if(initial.groups.length>1&&((owners.length===initial.groups.length&&new Set(owners).size<owners.length&&/分别|respectively/i.test(request.note))||misallocated)){
    const retry=await call({previousExtraction:initial.groups,correctionRequest:'The source explicitly distributes distinct issue ownership, but the candidate repeated the same owner across independent groups. Re-evaluate the original allocation clause and assign each group its distinct, specific owner with an exact source quote. Keep all other grounded facts.'});
    if(retry.ok){const retryBody:any=await retry.json();const retryRaw=retryBody?.choices?.[0]?.message?.tool_calls?.find((entry:any)=>entry?.function?.name==='submit_critical_facts')?.function?.arguments;
     if(typeof retryRaw==='string'){const corrected=parseCriticalFacts(JSON.parse(retryRaw),request.note);const correctedOwners=corrected.groups.map(g=>g.facts.filter(f=>f.kind==='owner').at(-1)?.value.zh).filter(Boolean);if(correctedOwners.length===corrected.groups.length&&new Set(correctedOwners).size===correctedOwners.length&&(!allocated.length||allocated.every((label,index)=>correctedOwners[index]===label)))return corrected;}
    }
    initial.warnings.push('Distributive ownership could not be resolved consistently; verify team assignment before tracker entry.');
   }
   return initial;
  }catch{return super.extractFacts(request,key);}
 }
 override async analyze(request:AnalysisRequest){
  const primary=await super.analyze(request);
  const warning=primary.drafts[0]?.warnings[0]?.en??'';
  if(primary.drafts.length!==1||primary.drafts[0].issue.en!=='TBD'||!/\((invalid_output|incomplete)\)/.test(warning))return primary;
  // DeepSeek occasionally returns empty JSON content. Use a forced function call once,
  // then pass its arguments through the exact same server-side validation.
  const key=this.config.getKey();if(!key)return primary;
  const hints=relativeDateHints(request.note,request.referenceDate??'');
  for(let attempt=0;attempt<3;attempt++)try{
   const response=await this.chatTransport('https://api.deepseek.com/chat/completions',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
    body:JSON.stringify({model:this.config.model,stream:false,thinking:{type:'disabled'},max_tokens:12000,
     messages:[{role:'system',content:attempt===0?analysisInstructions:`${analysisInstructions}\nReturn a complete function-call argument object with every required field.`},{role:'user',content:JSON.stringify({engineeringNote:request.note,referenceDate:request.referenceDate,timeZone:request.timeZone,relativeDateHints:hints,existingIssues:request.existingIssues??[]})}],
     tools:[{type:'function',function:{name:'submit_engineering_analysis',description:'Return the complete structured bilingual issue analysis.',parameters:analysisJsonSchema}}],
     tool_choice:{type:'function',function:{name:'submit_engineering_analysis'}}}),
    signal:AbortSignal.timeout(45000)
   });
   if(!response.ok)continue;
   const body:any=await response.json();
   const message=body?.choices?.[0]?.message;
   const argumentsText=message?.tool_calls?.find((call:any)=>call?.function?.name==='submit_engineering_analysis')?.function?.arguments;
   if(typeof argumentsText!=='string')continue;
   const parsed=JSON.parse(argumentsText);
   const extracted=await this.extractFacts(request,key);
   const drafts=validateCriticalFacts(normalizeAnalysis(parsed,request.note,request.existingIssues,hints),extracted.groups,request,extracted.warnings);
   if(drafts.length===1&&drafts[0].issue.en==='TBD')continue;
   for(const draft of drafts)draft.warnings.push(pair('DeepSeek Responses 未返回有效结构，本次使用兼容工具调用完成分析；请重点人工复核。','DeepSeek Responses did not return valid output; a compatible function call produced this draft. Review carefully.'));
   return {drafts};
  }catch{continue;}
  return primary;
 }
}
