import { z } from 'zod';

import { AiActionKind, AiActionPrivacyClass } from '../../../common/enums/ai-action-kind.enum';
import { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';

import { modelChoiceSchema } from './resolve-ai-action.dto';

export const runAiActionSchema = z
  .object({
    actionKind: z.nativeEnum(AiActionKind),
    privacyClass: z.nativeEnum(AiActionPrivacyClass).default(AiActionPrivacyClass.INTERNAL),
    context: z.string().min(1, 'context is required').max(200_000),
    preferredModel: modelChoiceSchema.optional(),
    // Stream 10 — when these are present, /run routes through the approval engine.
    // Backwards-compat: when omitted, the call executes immediately like before.
    connectorId: z.string().min(1).max(64).optional(),
    provider: z.nativeEnum(WorkspaceProvider).optional(),
    sourceObjectId: z.string().min(1).max(128).optional(),
  })
  .strict();

export type RunAiActionDto = z.infer<typeof runAiActionSchema>;

export const runAiActionQuerySchema = z
  .object({
    execute: z.enum(['immediate', 'queue']).default('queue'),
  })
  .strict();

export type RunAiActionQueryDto = z.infer<typeof runAiActionQuerySchema>;
