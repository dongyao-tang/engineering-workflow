import {execFileSync} from 'node:child_process';
import {ProxyAgent} from 'undici';

export function parseProxy(value:string):string|undefined {
 const parts=value.trim().split(';');
 const address=(parts.find(p=>p.startsWith('https='))?.slice(6) || parts.find(p=>p.startsWith('http='))?.slice(5) || (parts.length===1&&!value.includes('=')?value.trim():''));
 if(!address)return undefined;
 try{const url=new URL(address.includes('://')?address:`http://${address}`);return ['http:','https:'].includes(url.protocol)?url.href:undefined;}catch{return undefined;}
}
function configuredProxy(){
 const explicit=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;
 if(explicit)return parseProxy(explicit);
 if(process.platform!=='win32')return undefined;
 try{
  const value=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$p=Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'; if($p.ProxyEnable -eq 1){[Console]::Write($p.ProxyServer)}"],{stdio:['ignore','pipe','ignore'],windowsHide:true,timeout:5000}).toString('utf8');
  return parseProxy(value);
 }catch{return undefined;}
}
let initialized=false;
let dispatcher:ProxyAgent|undefined;
// Scope the proxy to server-side OpenAI requests; retain default TLS verification.
export const serverFetch:typeof fetch=(input,init)=>{
 if(!initialized){const proxy=configuredProxy();if(proxy)dispatcher=new ProxyAgent(proxy);initialized=true;}
 return fetch(input,{...init,...(dispatcher?{dispatcher}:{})} as RequestInit);
};
