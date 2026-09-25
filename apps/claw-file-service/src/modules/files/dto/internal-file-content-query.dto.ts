import { z } from 'zod';

export const internalFileContentQuerySchema = z
  .object({
    userId: z.string().min(1).max(200),
    /**
     * `false` leaves the base64 bytes out (multimodal batch 8): a caller that
     * only needs the extracted text — chat-service's research digest — must
     * not pull a whole video over the network to read a transcript.
     */
    includeContent: z.enum(['true', 'false']).optional(),
  })
  .strict();

export type InternalFileContentQueryDto = z.infer<typeof internalFileContentQuerySchema>;
