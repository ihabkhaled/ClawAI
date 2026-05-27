// Zod schema for the JSON the analyzer model returns. Bracketed with
// .max() limits everywhere so a runaway model can't blow up the
// downstream serializer or the Postgres JSON column.

import { z } from 'zod';

export const semanticIntentAnalysisSchema = z.object({
  primaryIntent: z.string().min(1).max(200),
  secondaryIntents: z.array(z.string().max(200)).max(10).default([]),
  taskType: z.string().min(1).max(80),
  domainTags: z.array(z.string().max(60)).max(15).default([]),
  roleTags: z.array(z.string().max(60)).max(15).default([]),
  majorTags: z.array(z.string().max(60)).max(15).default([]),
  modalityNeeds: z
    .array(z.enum(['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'PDF', 'FILE', 'SPREADSHEET', 'CODE']))
    .max(8)
    .default(['TEXT']),
  expectedOutputType: z.string().min(1).max(80),
  requiresSearch: z.boolean().default(false),
  requiresExtraction: z.boolean().default(false),
  requiresFileAnalysis: z.boolean().default(false),
  requiresImageAnalysis: z.boolean().default(false),
  requiresVideoAnalysis: z.boolean().default(false),
  requiresAudioTranscription: z.boolean().default(false),
  requiresSpreadsheetAnalysis: z.boolean().default(false),
  requiresToolCalling: z.boolean().default(false),
  requiresStreaming: z.boolean().default(false),
  requiresLongContext: z.boolean().default(false),
  requiresStructuredOutput: z.boolean().default(false),
  requiresJudge: z.boolean().default(false),
  requiresCompare: z.boolean().default(false),
  privacyClass: z.enum(['local', 'cloud', 'either', 'unknown']).default('unknown'),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
  confidence: z.number().min(0).max(1).default(0.5),
  reasoningSummary: z.string().max(2000).default(''),
  uncertaintyReasons: z.array(z.string().max(200)).max(10).default([]),
});

export type SemanticIntentAnalysisParsed = z.infer<typeof semanticIntentAnalysisSchema>;
