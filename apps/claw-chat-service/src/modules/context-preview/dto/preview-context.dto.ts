import { z } from 'zod';

export const previewContextSchema = z.object({
  draft: z.string().max(8192).default(''),
  disableMemory: z.boolean().optional(),
  disableContext: z.boolean().optional(),
});

export type PreviewContextDto = z.infer<typeof previewContextSchema>;
