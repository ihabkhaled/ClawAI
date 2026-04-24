import { z } from 'zod';

import { AiActionKind, AiActionPrivacyClass } from '../../../common/enums/ai-action-kind.enum';

import { modelChoiceSchema } from './resolve-ai-action.dto';

export const runAiActionSchema = z
  .object({
    actionKind: z.nativeEnum(AiActionKind),
    privacyClass: z.nativeEnum(AiActionPrivacyClass).default(AiActionPrivacyClass.INTERNAL),
    context: z.string().min(1, 'context is required').max(200_000),
    preferredModel: modelChoiceSchema.optional(),
  })
  .strict();

export type RunAiActionDto = z.infer<typeof runAiActionSchema>;
