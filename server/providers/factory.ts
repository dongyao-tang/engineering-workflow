import type {AnalysisProvider} from '../../src/services/providers';
import type {ServerConfig} from '../config';
import {DeepSeekAnalysisProvider} from './deepSeekAnalysisProvider';
import {OpenAIAnalysisProvider} from './openAIAnalysisProvider';
export function createAnalysisProvider(config:ServerConfig,transport?:typeof fetch):AnalysisProvider {
 const selected={getKey:config.getKey,model:config.model};
 return config.provider==='deepseek'?new DeepSeekAnalysisProvider(selected,transport):new OpenAIAnalysisProvider(selected,transport);
}
