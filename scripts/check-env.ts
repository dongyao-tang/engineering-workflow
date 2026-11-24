import {loadServerEnvironment} from '../server/config';
const config=loadServerEnvironment();
console.log(JSON.stringify({provider:config.provider,serverCanReadKey:!!config.getKey(),authenticationTested:false}));
if(!config.getKey())process.exitCode=1;
