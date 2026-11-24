import {loadServerEnvironment} from './config';
import {createAnalysisProvider} from './providers/factory';
import {createApiServer} from './http';
import {DeepSeekWeeklyReportProvider} from './weeklyReport';
const config=loadServerEnvironment();
const server=createApiServer(createAnalysisProvider(config),()=>!!config.getKey(),config.provider,config.provider==='deepseek'?new DeepSeekWeeklyReportProvider(config):undefined);
server.requestTimeout=200000;
server.listen(3001,'127.0.0.1',()=>console.log(`Local analysis API: http://127.0.0.1:3001 | provider: ${config.provider} | credential configured: ${!!config.getKey()}`));
server.on('error',()=>{console.error('Local analysis API could not start. Check whether port 3001 is already in use.');process.exitCode=1;});
