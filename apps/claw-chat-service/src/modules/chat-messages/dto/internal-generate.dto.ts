import { PaygSurface } from '@claw/shared-types';
import { z } from 'zod';

/**
 * `userId` and `surface` are REQUIRED, and callers that omit them are refused
 * at the pipe rather than served an unbilled frontier completion.
 *
 * This endpoint had neither field. Workspace-service's AI actions, multi-model
 * review, chain drafting and implementation handoff all spend real provider
 * money through here, and every one of those calls was anonymous and free
 * (audit U1, U8-U10, U12). An optional `userId` would have been omitted by
 * exactly the callers that most need it, so the break is deliberate.
 */
export const internalGenerateSchema = z
  .object({
    userId: z.string().min(1).max(64),
    requestId: z.string().min(1).max(200).optional(),
    threadJobBudgetId: z.string().min(1).max(64).optional(),
    surface: z.nativeEnum(PaygSurface),
    provider: z.string().min(1).max(100),
    model: z.string().min(1).max(200),
    systemPrompt: z.string().min(1).max(10_000),
    userPrompt: z.string().min(1).max(200_000),
    maxTokens: z.number().int().positive().max(32_768).optional(),
    workflow: z.string().min(1).max(64).optional(),
    /**
     * Whether a reasoning model may think before it answers. Absent means no:
     * on Ollama the output budget covers thinking AND the answer, so a model
     * left to think can spend the whole budget reasoning and return an empty
     * answer (kimi, 2026-10-13). Ignored by providers with no such switch.
     */
    thinking: z.boolean().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.surface === PaygSurface.THREADS && (!value.requestId || !value.threadJobBudgetId)) {
      context.addIssue({
        code: 'custom',
        message: 'Threads model calls require an idempotency request and active job budget',
      });
    }
    if (value.surface !== PaygSurface.THREADS && value.threadJobBudgetId) {
      context.addIssue({
        code: 'custom',
        message: 'A Threads job budget can only be used by the Threads surface',
      });
    }
  });

export type InternalGenerateDto = z.infer<typeof internalGenerateSchema>;
