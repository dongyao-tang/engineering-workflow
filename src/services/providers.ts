import type {AnalysisRequest,AnalysisResult,Issue,Language,LocalizedText,Project} from '../types';
export interface AnalysisProvider {analyze(request:AnalysisRequest):Promise<AnalysisResult>}
export interface TranslationProvider {translate(value:LocalizedText,target:Language):Promise<{text:string;available:boolean}>}
export interface LegacyWeeklyTemplateProvider {generate(project:Project,issues:Issue[],language:Language,now?:Date):Promise<string>}
