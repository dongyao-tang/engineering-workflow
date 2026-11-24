import {z} from 'zod';
import {analysisFields,fields} from '../types';
import {validDate} from './issue';
export const localizedSchema=z.object({zh:z.string().trim().min(1).max(6000),en:z.string().trim().min(1).max(6000)}).strict();
export const riskSchema=z.enum(['low','medium','high','needs_assessment']);
export const statusSchema=z.enum(['open','in_progress','blocked','closed']);
export const dueDateSchema=z.string().refine(validDate).nullable();
export const provenanceSchema=z.object({kind:z.enum(['extracted','inferred','missing','human']),evidence:z.array(z.string().min(1).max(12000)).max(20),rationale:localizedSchema}).strict();
export const lifecycleEventSchema=z.object({date:dueDateSchema,status:statusSchema.nullable(),description:localizedSchema,evidence:z.string().max(12000),sourceNote:z.string().max(12000).optional()}).strict();
const textShape=Object.fromEntries(fields.map(f=>[f,localizedSchema]));
const provenanceShape=Object.fromEntries(analysisFields.map(f=>[f,provenanceSchema]));
export const issueSchema=z.object({...textShape,riskLevel:riskSchema,status:statusSchema,dueDate:dueDateSchema,
 sourceNote:z.string().max(12000),sourceLanguage:z.enum(['zh','en','mixed']),provenance:z.object(provenanceShape),warnings:z.array(localizedSchema),
 lifecycleIntent:z.enum(['create','possible_update']).default('create'),referencedIssueId:z.string().nullable().default(null),lifecycleEvents:z.array(lifecycleEventSchema).default([]),history:z.array(lifecycleEventSchema).default([]),
 id:z.string().min(1),provider:z.enum(['llm','mock','legacy']),stale:z.record(z.enum(fields),z.array(z.enum(['zh','en']))),
 createdAt:z.string().datetime(),updatedAt:z.string().datetime(),reviewedAt:z.string().datetime().optional()});
