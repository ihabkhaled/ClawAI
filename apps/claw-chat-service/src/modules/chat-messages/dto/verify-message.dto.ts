import { z } from 'zod';
import { advancedModelSelectionFields } from './advanced-model-selection-fields.dto';
import { attachmentFields } from './attachment-fields.dto';
import { researchFields } from './research-fields.dto';
import { requireContentOrAttachments } from '../validators/content-or-attachments.validator';

export const verifyMessageSchema = z
  .object({
    // Empty is allowed when files are attached — see requireContentOrAttachments.
    content: z.string().max(10_000),
    threadId: z.string().max(255).optional(),
    maxRevisions: z.number().int().min(0).max(3).default(1),
    ...advancedModelSelectionFields,
    ...researchFields,
    ...attachmentFields,
  })
  .superRefine(requireContentOrAttachments());

export type VerifyMessageDto = z.infer<typeof verifyMessageSchema>;
