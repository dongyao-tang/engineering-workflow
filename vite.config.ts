import {defineConfig} from 'vite';
export default defineConfig({
 plugins:[{name:'deny-private-files',configureServer(server){server.middlewares.use((req,res,next)=>{
  let path:string;try{path=decodeURIComponent((req.url||'').split('?')[0]).replaceAll('\\','/');}catch{res.statusCode=400;res.end();return;}
  if(/(^|\/)\.env(?:\.|\/|$)/i.test(path)||/(^|\/)(server|scripts|\.git)(\/|$)/i.test(path)||/\.ps1$/i.test(path)){res.statusCode=403;res.end('Forbidden');return;}
  next();
 });}}],
 envPrefix:'VITE_',
 server:{host:'127.0.0.1',port:5173,strictPort:true,
  proxy:{'/api':{target:'http://127.0.0.1:3001'}},
  fs:{strict:true,deny:['.env','.env.*','**/.env*','**/server/**','**/scripts/**','**/*.ps1','**/.git/**','**/*.{crt,pem}']}
 }
});
