import { z } from 'zod';
import { advancedModelSelectionFields } from './advanced-model-selection-fields.dto';
import { researchFields } from './research-fields.dto';

export const verifyMessageSchema = z.object({
  content: z.string().min(1).max(10_000),
  threadId: z.string().max(255).optional(),
  maxRevisions: z.number().int().min(0).max(3).default(1),
  ...advancedModelSelectionFields,
  ...researchFields,
});

export type VerifyMessageDto = z.infer<typeof verifyMessageSchema>;
