import { z } from 'zod';
import { advancedModelSelectionFields } from './advanced-model-selection-fields.dto';
import { researchFields } from './research-fields.dto';

export const decomposeTaskSchema = z.object({
  content: z.string().min(10).max(10_000),
  threadId: z.string().max(255).optional(),
  maxSubTasks: z.number().int().min(2).max(5).default(3),
  ...advancedModelSelectionFields,
  ...researchFields,
});

export type DecomposeTaskDto = z.infer<typeof decomposeTaskSchema>;
