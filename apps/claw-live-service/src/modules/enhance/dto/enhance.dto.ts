import { z } from 'zod';

export const enhanceBodySchema = z.object({
  /** `provider/model` (split at the first slash), or just the model when `provider` is given. */
  modelId: z.string().trim().min(1).max(200),
  provider: z.string().trim().min(1).max(100).optional(),
  confirm: z.boolean(),
});

export const idempotencyKeySchema = z.string().trim().min(8).max(200).optional();

export type EnhanceBody = z.infer<typeof enhanceBodySchema>;
