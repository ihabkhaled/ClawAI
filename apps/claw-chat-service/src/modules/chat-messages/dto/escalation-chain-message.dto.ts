import { z } from 'zod';
import { attachmentFields } from './attachment-fields.dto';
import { researchFields } from './research-fields.dto';
import { requireContentOrAttachments } from '../validators/content-or-attachments.validator';

const escalationStepSchema = z.object({
  provider: z.string().min(1).max(50),
  model: z.string().min(1).max(255),
  qualityThreshold: z.number().min(0).max(1).optional(),
  ...researchFields,
});

export const escalationChainMessageSchema = z
  .object({
    threadId: z.string().max(255).optional(),
    // Empty is allowed when files are attached — see requireContentOrAttachments.
    content: z.string().max(100_000),
    chain: z.array(escalationStepSchema).min(2).max(5),
    ...attachmentFields,
  })
  .superRefine((data, ctx) => {
    requireContentOrAttachments()(data, ctx);
    const seen = new Set<string>();
    for (const [idx, step] of data.chain.entries()) {
      const key = `${step.provider}:${step.model}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate step at index ${String(idx)}: ${key}`,
          path: ['chain', idx],
        });
      }
      seen.add(key);
    }
  });

export type EscalationChainMessageDto = z.infer<typeof escalationChainMessageSchema>;
