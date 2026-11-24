import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApiServer} from '../server/http';
import {emptyIssue} from '../src/domain/issue';
test('local API validates input, rejects cross-origin calls and reports only key presence',async()=>{
 let calls=0;const server=createApiServer({async analyze({note,referenceDate,timeZone}){calls++;assert.match(referenceDate??'',/^\d{4}-\d{2}-\d{2}$/);assert.ok(timeZone);return {drafts:[emptyIssue(note,'llm')]};}},()=>true);
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const port=(server.address() as {port:number}).port;const url=`http://127.0.0.1:${port}`;
 try{
  const health=await (await fetch(url+'/api/health')).json();assert.deepEqual(health,{configured:true,provider:'deepseek'});
  const options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({note:' 原始 note '})};
  const good=await fetch(url+'/api/analyze',options);assert.equal(good.status,200);assert.equal((await good.json()).drafts[0].sourceNote,' 原始 note ');
  assert.equal((await fetch(url+'/api/analyze',{...options,headers:{...options.headers,Origin:'https://evil.example'}})).status,403);
  assert.equal((await fetch(url+'/api/analyze',{...options,body:JSON.stringify({note:''})})).status,400);
  assert.equal((await fetch(url+'/api/analyze',{...options,body:JSON.stringify({note:'test',referenceDate:'2026-02-30',timeZone:'Asia/Shanghai'})})).status,400);
  assert.equal((await fetch(url+'/api/analyze',{...options,headers:{'Content-Type':'text/plain'}})).status,415);
  assert.equal(calls,1);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
