import type {AnalysisProvider} from '../../src/services/providers';
import type {AnalysisRequest} from '../../src/types';
import {emptyIssue,pair} from '../../src/domain/issue';
import {normalizeAnalysis,analysisJsonSchema} from '../analysisSchema';
import {analysisInstructions} from '../prompt';
import {ProviderError} from '../providerError';
import {serverFetch} from '../transport';
import {relativeDateHints} from '../dateHints';
import {criticalFactsJsonSchema,extractionInstructions,parseCriticalFacts,validateCriticalFacts,type FactGroup} from '../criticalFacts';

export type ResponsesProviderOptions={
 endpoint:string;
 model:string;
 getKey:()=>string|undefined;
 strictJsonSchema:boolean;
 reasoningEffort?:'none';
};

export class ResponsesAnalysisProvider implements AnalysisProvider {
 constructor(private options:ResponsesProviderOptions,private transport:typeof fetch=serverFetch){}

 async analyze(request:AnalysisRequest){
  const key=this.options.getKey();
  if(!key)throw new ProviderError('missing_key',503);
  const extracted=await this.extractFacts(request,key);
  const dateHints=relativeDateHints(request.note,request.referenceDate??'');
  const format:Record<string,unknown>={type:'json_schema',name:'engineering_issue_draft',schema:analysisJsonSchema};
  if(this.options.strictJsonSchema)format.strict=true;
  let lastFailure='invalid_output';
  for(let attempt=0;attempt<3;attempt++){
   let response:Response;
   try{response=await this.transport(this.options.endpoint,{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
    body:JSON.stringify({
     model:this.options.model,store:false,instructions:attempt===0?analysisInstructions:`${analysisInstructions}\nReturn a complete JSON object conforming to the supplied schema. Do not emit whitespace-only or partial output.`,
     input:JSON.stringify({engineeringNote:request.note,referenceDate:request.referenceDate,timeZone:request.timeZone,relativeDateHints:dateHints,existingIssues:request.existingIssues??[],criticalFactGroups:extracted.groups}),
     max_output_tokens:attempt===0?9000:12000,text:{format},
     ...(this.options.reasoningEffort?{reasoning:{effort:this.options.reasoningEffort}}:{})
    }),
    signal:AbortSignal.timeout(45000)
   });}catch{throw new ProviderError('upstream_unavailable');}
   // Never relay upstream error bodies, headers, credentials or exception objects.
   if(!response.ok){
    const code=response.status===401?'invalid_key':response.status===402?'insufficient_balance':response.status===403?'access_denied':response.status===429?'rate_limit':'upstream_error';
    throw new ProviderError(code,response.status===402?402:response.status===429?429:502);
   }
   let body:any;
   try{body=await response.json();}catch{lastFailure='invalid_output';continue;}
   if(!Array.isArray(body?.output)){lastFailure='invalid_output';continue;}
   const content=body.output.filter((x:any)=>x?.type==='message').flatMap((x:any)=>Array.isArray(x.content)?x.content:[]);
   if(content.some((x:any)=>x?.type==='refusal'))return {drafts:[this.invalid(request.note,'refused')]};
   if(body.status!=='completed'){lastFailure='incomplete';continue;}
   const text=content.filter((x:any)=>x?.type==='output_text'&&typeof x.text==='string').map((x:any)=>x.text).join('');
   let raw:unknown;
   try{raw=JSON.parse(text);}catch{lastFailure='invalid_output';continue;}
   if(!Array.isArray((raw as {drafts?:unknown})?.drafts)||(raw as {drafts:unknown[]}).drafts.length===0){lastFailure='invalid_output';continue;}
   return {drafts:validateCriticalFacts(normalizeAnalysis(raw,request.note,request.existingIssues,dateHints),extracted.groups,request,extracted.warnings)};
  }
  return {drafts:[this.invalid(request.note,lastFailure)]};
 }

 protected async extractFacts(request:AnalysisRequest,key:string):Promise<{groups:FactGroup[];warnings:string[]}>{
  const hints=relativeDateHints(request.note,request.referenceDate??'');
  try{
   const response=await this.transport(this.options.endpoint,{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
    body:JSON.stringify({model:this.options.model,store:false,instructions:extractionInstructions,
     input:JSON.stringify({engineeringNote:request.note,referenceDate:request.referenceDate,timeZone:request.timeZone,relativeDateHints:hints,existingIssues:request.existingIssues??[]}),
     max_output_tokens:4500,text:{format:{type:'json_schema',name:'engineering_critical_facts',schema:criticalFactsJsonSchema,...(this.options.strictJsonSchema?{strict:true}:{})}},
     ...(this.options.reasoningEffort?{reasoning:{effort:this.options.reasoningEffort}}:{})}),signal:AbortSignal.timeout(45000)
   });
   if(!response.ok){const code=response.status===401?'invalid_key':response.status===402?'insufficient_balance':response.status===403?'access_denied':response.status===429?'rate_limit':'upstream_error';throw new ProviderError(code,response.status===402?402:response.status===429?429:502);}
   const body:any=await response.json();
   const content=body?.output?.filter((x:any)=>x?.type==='message').flatMap((x:any)=>Array.isArray(x.content)?x.content:[])??[];
   const output=content.filter((x:any)=>x?.type==='output_text'&&typeof x.text==='string').map((x:any)=>x.text).join('');
   return parseCriticalFacts(JSON.parse(output),request.note);
  }catch(error){if(error instanceof ProviderError)throw error;return {groups:[],warnings:['Critical fact extraction failed; draft requires extra human review.']};}
 }

 private invalid(note:string,code:string){
  const issue=emptyIssue(note,'llm');
  issue.warnings.push(pair(`分析未完成（${code}），字段设为待确认，原文已保留。`,`Analysis did not complete (${code}); fields set to pending and original retained.`));
  return issue;
 }
}
