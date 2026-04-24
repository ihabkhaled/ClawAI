import { z } from 'zod';

import { AiActionKind, AiActionPrivacyClass } from '../../../common/enums/ai-action-kind.enum';

export const modelChoiceSchema = z
  .object({
    provider: z.string().min(1).max(50),
    model: z.string().min(1).max(200),
    displayName: z.string().min(1).max(200),
  })
  .strict();

export const resolveAiActionSchema = z
  .object({
    actionKind: z.nativeEnum(AiActionKind),
    privacyClass: z.nativeEnum(AiActionPrivacyClass).default(AiActionPrivacyClass.INTERNAL),
    preferredModel: modelChoiceSchema.optional(),
  })
  .strict();

export type ResolveAiActionDto = z.infer<typeof resolveAiActionSchema>;
