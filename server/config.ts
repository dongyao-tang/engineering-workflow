import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const envPath=fileURLToPath(new URL('../.env.local',import.meta.url));
export type LLMProviderName='deepseek'|'openai';
export type ServerConfig={provider:LLMProviderName;getKey:()=>string|undefined;model:string};
function loadWindowsValue(name:'DEEPSEEK_API_KEY'|'OPENAI_API_KEY'|'LLM_PROVIDER'){
 let result:Buffer|undefined;
 try{
  result=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`$k=[Environment]::GetEnvironmentVariable('${name}','User'); if(-not $k){$k=[Environment]::GetEnvironmentVariable('${name}','Machine')}; if($k){[Console]::Write($k)}`],{stdio:['ignore','pipe','ignore'],windowsHide:true,timeout:5000});
  return result.toString('utf8').trim()||undefined;
 }catch{return undefined;}finally{result?.fill(0);}
}
// Only this server module reads secrets. Neither this module nor env values enter Vite.
export function loadServerEnvironment():ServerConfig{
 if(existsSync(envPath))process.loadEnvFile(envPath);
 if(process.platform==='win32'){
  for(const name of ['DEEPSEEK_API_KEY','OPENAI_API_KEY','LLM_PROVIDER'] as const){
   if(!process.env[name]?.trim()){const value=loadWindowsValue(name);if(value)process.env[name]=value;}
  }
 }
 const requested=process.env.LLM_PROVIDER?.trim().toLowerCase();
 const provider:LLMProviderName=requested==='openai'?'openai':'deepseek';
 const keyName=provider==='deepseek'?'DEEPSEEK_API_KEY':'OPENAI_API_KEY';
 const model=provider==='deepseek'?(process.env.DEEPSEEK_MODEL||'deepseek-flash'):(process.env.OPENAI_MODEL||'gpt-4.1-mini');
 return {provider,getKey:()=>process.env[keyName]?.trim()||undefined,model};
}
