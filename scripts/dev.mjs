import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const frontendEnv={...process.env};delete frontendEnv.OPENAI_API_KEY;delete frontendEnv.DEEPSEEK_API_KEY;
const children=[spawn(process.execPath,['--import','tsx','server/index.ts'],{cwd:root,stdio:'inherit',windowsHide:true}),spawn(process.execPath,['node_modules/vite/bin/vite.js'],{cwd:root,stdio:'inherit',env:frontendEnv,windowsHide:true})];
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill();process.exitCode=code;}
for(const child of children){child.on('exit',code=>stop(code||0));child.on('error',()=>stop(1));}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
