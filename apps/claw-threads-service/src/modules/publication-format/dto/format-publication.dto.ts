import { z } from 'zod';

/** One click of "Improve formatting with AI": the key makes a repeated request return the same preview. */
export const formatPublicationSchema = z
  .object({
    idempotencyKey: z.string().min(8).max(160),
    correlationId: z.string().min(1).max(200),
  })
  .strict();

export type FormatPublicationDto = z.infer<typeof formatPublicationSchema>;
