import {ResponsesAnalysisProvider} from './responsesAnalysisProvider';
export class OpenAIAnalysisProvider extends ResponsesAnalysisProvider {
 constructor(config:{getKey:()=>string|undefined;model:string},transport?:typeof fetch){
  super({endpoint:'https://api.openai.com/v1/responses',model:config.model,getKey:config.getKey,strictJsonSchema:true},transport);
 }
}
