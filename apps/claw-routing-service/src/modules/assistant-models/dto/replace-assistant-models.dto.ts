import { z } from 'zod';
import { RouterProvider } from '../../../generated/prisma';

/** One candidate in the declarative replace. No `id` and no `order`: array
 * position IS the order, so add, remove and reorder are one request. */
const assistantModelInputSchema = z
  .object({
    provider: z.nativeEnum(RouterProvider),
    modelAlias: z.string().min(1).max(200),
    deploymentId: z.string().min(1).max(64).optional(),
    enabled: z.boolean().default(true),
    timeoutMs: z.number().int().min(100).max(120_000).default(6_000),
    maxTokens: z.number().int().min(8).max(4_096).default(64),
  })
  .strict();

export const replaceAssistantModelsSchema = z
  .object({
    entries: z.array(assistantModelInputSchema).max(10),
  })
  .strict();

export type ReplaceAssistantModelsDto = z.infer<typeof replaceAssistantModelsSchema>;
export type AssistantModelInputDto = z.infer<typeof assistantModelInputSchema>;
