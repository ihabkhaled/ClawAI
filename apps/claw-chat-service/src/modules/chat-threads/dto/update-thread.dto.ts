import { z } from 'zod';
import { RoutingMode } from '../../../generated/prisma';

export const updateThreadSchema = z
  .object({
    title: z.string().max(255, 'Title must be at most 255 characters').optional(),
    isPinned: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    routingMode: z.nativeEnum(RoutingMode).optional(),
    systemPrompt: z
      .string()
      .max(10000, 'System prompt must be at most 10000 characters')
      .optional()
      .nullable(),
    temperature: z.number().min(0).max(2).optional().nullable(),
    maxTokens: z.number().int().min(1).max(32000).optional().nullable(),
    preferredProvider: z
      .string()
      .max(50, 'Preferred provider must be at most 50 characters')
      .optional()
      .nullable(),
    preferredModel: z
      .string()
      .max(255, 'Preferred model must be at most 255 characters')
      .optional()
      .nullable(),
    contextPackIds: z.array(z.string().max(255)).max(10, 'Maximum 10 context packs').optional(),
    judgeEnabled: z.boolean().optional(),
    judgeModel: z.string().max(255).optional().nullable(),
    criticEnabled: z.boolean().optional(),
    criticModel: z.string().max(255).optional().nullable(),
    qualityThreshold: z.number().min(0).max(1).optional().nullable(),
    maxReRouteAttempts: z.number().int().min(0).max(5).optional().nullable(),
    // Integration V2 — per-thread memory + context toggles
    useMemory: z.boolean().optional(),
    useContext: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    if (value.criticEnabled !== true) {
      return;
    }
    if (value.judgeEnabled !== true) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['criticEnabled'],
        message: 'criticEnabled requires judgeEnabled to be true',
      });
    }
    if ((value.criticModel ?? '').trim().length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['criticModel'],
        message: 'criticModel must be provided when criticEnabled is true',
      });
    }
  });

export type UpdateThreadDto = z.infer<typeof updateThreadSchema>;
