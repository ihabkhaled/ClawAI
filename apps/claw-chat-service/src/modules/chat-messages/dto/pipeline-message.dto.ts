import { z } from 'zod';
import { advancedModelSelectionFields } from './advanced-model-selection-fields.dto';
import { attachmentFields } from './attachment-fields.dto';
import { researchFields } from './research-fields.dto';
import { requireContentOrAttachments } from '../validators/content-or-attachments.validator';

const pipelineStageSchema = z.object({
  name: z.string().min(1).max(100),
  instruction: z.string().min(1).max(2000),
  model: z.string().min(1).max(255),
  ...researchFields,
});

export const pipelineMessageSchema = z
  .object({
    // Empty is allowed when files are attached — see requireContentOrAttachments.
    content: z.string().max(10_000),
    threadId: z.string().max(255).optional(),
    template: z
      .enum(['analyze-reason-format', 'code-debug-review', 'draft-critique-revise', 'custom'])
      .default('analyze-reason-format'),
    customStages: z.array(pipelineStageSchema).max(5).optional(),
    ...advancedModelSelectionFields,
    ...researchFields,
    ...attachmentFields,
  })
  .superRefine(requireContentOrAttachments());

export type PipelineMessageDto = z.infer<typeof pipelineMessageSchema>;
