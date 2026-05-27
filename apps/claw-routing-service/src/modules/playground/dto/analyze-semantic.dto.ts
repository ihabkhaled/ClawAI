// Phase 8 UI transparency — Playground "semantic mode" tab DTO.
// Runs the SemanticIntentAnalyzerManager synchronously and returns the
// `SemanticIntentAnalysisRecord`. Admin-only endpoint; bypasses the
// `ROUTING_SEMANTIC_ANALYZER_ENABLED` flag because the whole point of a
// playground is to drive the analyzer regardless of the production flag.

import { z } from 'zod';

import { RoutingMode } from '../../../generated/prisma';

export const analyzeSemanticSchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required')
    .max(20_000, 'Message must be at most 20000 characters'),
  routingMode: z.nativeEnum(RoutingMode).optional(),
  threadId: z.string().max(255).optional(),
  recentMessages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().max(8_000),
      }),
    )
    .max(20)
    .optional(),
  threadSummary: z.string().max(4_000).optional(),
  followUpDetected: z.boolean().optional(),
  followUpSignals: z.array(z.string().max(120)).max(20).optional(),
  keywordSignals: z
    .array(
      z.object({
        category: z.string().min(1).max(120),
        matchedTerms: z.array(z.string().max(80)).max(40).default([]),
        confidenceBoost: z.number().min(0).max(1),
      }),
    )
    .max(20)
    .optional(),
  activePolicyName: z.string().max(120).optional(),
  availableWorkflowKinds: z.array(z.string().max(80)).max(40).optional(),
});

export type AnalyzeSemanticDto = z.infer<typeof analyzeSemanticSchema>;
