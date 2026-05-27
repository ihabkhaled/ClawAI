import { z } from 'zod';

// Strict bounds so a runaway model can't bloat the JSON column or blow
// up the downstream serializer. Defaults keep the schema flexible when
// the model omits optional fields.

const fallbackEntry = z.object({
  provider: z.string().min(1).max(60),
  model: z.string().min(1).max(120),
  workflow: z.string().max(60).optional(),
  reason: z.string().min(1).max(400),
});

const rejectionEntry = z.object({
  provider: z.string().min(1).max(60),
  model: z.string().min(1).max(120),
  reason: z.string().min(1).max(400),
});

export const aiRoutePlanSchema = z.object({
  selectedWorkflow: z.string().min(1).max(60),
  selectedProvider: z.string().min(1).max(60),
  selectedModel: z.string().min(1).max(120),
  confidence: z.number().min(0).max(1).default(0.5),
  reasonTags: z.array(z.string().max(60)).max(10).default([]),
  routeReason: z.string().max(2000).default(''),
  fallbackChain: z.array(fallbackEntry).max(5).default([]),
  rejectedCandidates: z.array(rejectionEntry).max(15).default([]),
  requiresJudge: z.boolean().default(false),
  requiresSearch: z.boolean().default(false),
  requiresExtraction: z.boolean().default(false),
  requiresCompare: z.boolean().default(false),
  estimatedCostClass: z.string().max(20).default('UNKNOWN'),
  estimatedLatencyClass: z.string().max(20).default('UNKNOWN'),
  estimatedRiskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
  modalityNeeds: z
    .array(z.enum(['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'PDF', 'FILE', 'SPREADSHEET', 'CODE']))
    .max(8)
    .default(['TEXT']),
});

export type AIRoutePlanParsed = z.infer<typeof aiRoutePlanSchema>;
