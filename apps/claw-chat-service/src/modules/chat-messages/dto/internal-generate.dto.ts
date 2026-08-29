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
    surface: z.nativeEnum(PaygSurface),
    provider: z.string().min(1).max(100),
    model: z.string().min(1).max(200),
    systemPrompt: z.string().min(1).max(10_000),
    userPrompt: z.string().min(1).max(200_000),
    maxTokens: z.number().int().positive().max(32_768).optional(),
    workflow: z.string().min(1).max(64).optional(),
  })
  .strict();

export type InternalGenerateDto = z.infer<typeof internalGenerateSchema>;
