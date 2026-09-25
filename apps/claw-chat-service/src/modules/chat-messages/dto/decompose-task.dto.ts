import { z } from 'zod';
import { advancedModelSelectionFields } from './advanced-model-selection-fields.dto';
import { attachmentFields } from './attachment-fields.dto';
import { researchFields } from './research-fields.dto';
import { requireContentOrAttachments } from '../validators/content-or-attachments.validator';

export const decomposeTaskSchema = z
  .object({
    // Empty is allowed when files are attached — see requireContentOrAttachments.
    content: z.string().max(10_000),
    threadId: z.string().max(255).optional(),
    maxSubTasks: z.number().int().min(2).max(5).default(3),
    ...advancedModelSelectionFields,
    ...researchFields,
    ...attachmentFields,
  })
  .superRefine(requireContentOrAttachments(10));

export type DecomposeTaskDto = z.infer<typeof decomposeTaskSchema>;
