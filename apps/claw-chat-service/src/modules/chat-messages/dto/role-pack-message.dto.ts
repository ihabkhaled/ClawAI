import { z } from 'zod';
import { advancedModelSelectionFields } from './advanced-model-selection-fields.dto';
import { researchFields } from './research-fields.dto';

export const rolePackMessageSchema = z.object({
  content: z.string().min(1).max(10_000),
  threadId: z.string().max(255).optional(),
  pack: z
    .enum(['coding-team', 'research-team', 'marketing-team', 'legal-team'])
    .default('coding-team'),
  ...advancedModelSelectionFields,
  ...researchFields,
});

export type RolePackMessageDto = z.infer<typeof rolePackMessageSchema>;
