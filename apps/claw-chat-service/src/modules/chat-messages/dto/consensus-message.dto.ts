import { z } from 'zod';
import { attachmentFields } from './attachment-fields.dto';
import { researchFields } from './research-fields.dto';
import { requireContentOrAttachments } from '../validators/content-or-attachments.validator';

export const consensusMessageSchema = z
  .object({
    threadId: z.string().max(255, 'Thread ID must be at most 255 characters').optional(),
    // Empty is allowed when files are attached — see requireContentOrAttachments.
    content: z.string().max(100_000, 'Content must be at most 100000 characters'),
    models: z
      .array(
        z.object({
          provider: z.string().max(50, 'Provider must be at most 50 characters'),
          model: z.string().max(255, 'Model must be at most 255 characters'),
        }),
      )
      .min(2, 'At least 2 models are required')
      .max(5, 'At most 5 models are allowed'),
    ...attachmentFields,
    ...researchFields,
  })
  .superRefine(requireContentOrAttachments());

export type ConsensusMessageDto = z.infer<typeof consensusMessageSchema>;
