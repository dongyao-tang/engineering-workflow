export type Language = 'zh' | 'en';
export type SourceLanguage = Language | 'mixed';
export type Risk = 'low' | 'medium' | 'high' | 'needs_assessment';
export type Status = 'open' | 'in_progress' | 'blocked' | 'closed';
export interface LocalizedText { zh: string; en: string }
export interface LifecycleEvent { date:string|null; status:Status|null; description:LocalizedText; evidence:string; sourceNote?:string }
export interface ExistingIssueSummary { id:string; trackerId:string; issue:LocalizedText; status:Status }
export const fields = ['issue','backgroundObservation','impact','rootCauseAssumption','action','nextStep','owner'] as const;
export type TextField = typeof fields[number];
export const analysisFields = [...fields,'riskLevel','status','dueDate'] as const;
export type AnalysisField = typeof analysisFields[number];
export type Provenance = {kind:'extracted'|'inferred'|'missing'|'human';evidence:string[];rationale:LocalizedText};
export interface IssueDraft {
 issue:LocalizedText; backgroundObservation:LocalizedText; impact:LocalizedText; rootCauseAssumption:LocalizedText;
 action:LocalizedText; nextStep:LocalizedText; owner:LocalizedText; riskLevel:Risk; status:Status; dueDate:string|null;
 sourceNote:string; sourceLanguage:SourceLanguage; provenance:Record<AnalysisField,Provenance>; warnings:LocalizedText[];
 lifecycleIntent:'create'|'possible_update'; referencedIssueId:string|null; lifecycleEvents:LifecycleEvent[];
}
export interface Issue extends IssueDraft {
 id:string; provider:'llm'|'mock'|'legacy'; stale:Partial<Record<TextField,Language[]>>;
 createdAt:string; updatedAt:string; reviewedAt?:string;
 history:LifecycleEvent[];
}
export interface Project {id:string; name:string; phase:LocalizedText}
export const weeklySectionKeys=['overallStatus','keyProgress','criticalIssuesRisks','actionsOwners','decisionsSupport','nextWeekPriorities'] as const;
export type WeeklySectionKey=typeof weeklySectionKeys[number];
export interface WeeklyPeriod {from:string;to:string}
export interface WeeklyReport {
 version:1; period:WeeklyPeriod; sections:Record<WeeklySectionKey,LocalizedText>;
 warnings:LocalizedText[]; trackerSnapshot:string; generatedAt:string; updatedAt:string;
 reviewed:boolean; reviewedAt:string|null;
}
export interface Store {version:2;language:Language;issues:Issue[];weeklyReport?:WeeklyReport|null}
export interface AnalysisRequest {note:string;referenceDate?:string;timeZone?:string;existingIssues?:ExistingIssueSummary[]}
export interface AnalysisResult {drafts:Issue[]}
