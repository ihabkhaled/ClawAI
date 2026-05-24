// SCAFFOLD: stream R.2 (03-r2-multimodal-intent-detection)

import { z } from 'zod';

const attachmentMetaSchema = z.object({
  fileId: z.string().min(1).max(200),
  filename: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  sizeBytes: z.number().int().nonnegative().max(5_000_000_000),
});

export const detectModalitySchema = z.object({
  message: z.string().min(0).max(200_000),
  attachments: z.array(attachmentMetaSchema).max(50).default([]),
  clientStreamingExpected: z.boolean().optional(),
});

export type DetectModalityDto = z.infer<typeof detectModalitySchema>;
