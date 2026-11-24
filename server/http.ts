import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {z} from 'zod';
import type {AnalysisProvider} from '../src/services/providers';
import {localizedSchema,statusSchema} from '../src/domain/schema';
import {serverDateContext} from './context';
import {ProviderError} from './providerError';
import type {LLMProviderName} from './config';
import {weeklyRequestSchema} from '../src/domain/weekly';
import type {WeeklyReportProvider} from './weeklyReport';
const requestSchema=z.object({note:z.string().max(12000).refine(v=>v.trim().length>0),existingIssues:z.array(z.object({id:z.string().max(100),trackerId:z.string().max(30),issue:localizedSchema,status:statusSchema}).strict()).max(100).optional()}).strict();
function send(res:ServerResponse,status:number,value:unknown){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
async function body(req:IncomingMessage,maxBytes=65536){let size=0,text='';for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>maxBytes)throw new ProviderError('input_too_large',413);text+=chunk;}try{return JSON.parse(text);}catch{throw new ProviderError('invalid_input',400);}}
export function createApiServer(provider:AnalysisProvider,keyPresent:()=>boolean,providerName:LLMProviderName='deepseek',weeklyProvider?:WeeklyReportProvider){
 let busy=false,calls=0;let windowStart=Date.now(),windowCount=0;
 return createServer(async(req,res)=>{
  try{
   // Loopback bind + host/origin checks + JSON-only POST prevent cross-site requests.
   if(!/^(127\.0\.0\.1|localhost):\d+$/.test(req.headers.host||''))return send(res,403,{code:'forbidden'});
   if(req.headers.origin&&!['http://127.0.0.1:5173','http://localhost:5173'].includes(req.headers.origin))return send(res,403,{code:'forbidden'});
   if(req.method==='GET'&&req.url==='/api/health')return send(res,200,{configured:keyPresent(),provider:providerName});
   if(req.url!=='/api/analyze'&&req.url!=='/api/weekly')return send(res,404,{code:'not_found'});
   if(req.method!=='POST')return send(res,405,{code:'method_not_allowed'});
   if(!req.headers['content-type']?.toLowerCase().startsWith('application/json'))return send(res,415,{code:'json_required'});
   const weekly=req.url==='/api/weekly';
   const parsed=weekly?weeklyRequestSchema.safeParse(await body(req,1048576)):requestSchema.safeParse(await body(req));if(!parsed.success)return send(res,400,{code:'invalid_input'});
   if(weekly&&!weeklyProvider)return send(res,503,{code:'weekly_unavailable'});
   if(!keyPresent())return send(res,503,{code:'missing_key'});
   if(busy)return send(res,429,{code:'busy'});
   if(Date.now()-windowStart>60000){windowStart=Date.now();windowCount=0;}
   if(windowCount>=6||calls>=25)return send(res,429,{code:'local_limit'});
   busy=true;calls++;windowCount++;
   try{send(res,200,weekly?await weeklyProvider!.generate(weeklyRequestSchema.parse(parsed.data)):await provider.analyze({...requestSchema.parse(parsed.data),...serverDateContext()}));}finally{busy=false;}
  }catch(error){send(res,error instanceof ProviderError?error.httpStatus:500,{code:error instanceof ProviderError?error.code:'analysis_failed'});}
 });
}
