import { z } from 'zod';

/**
 * The shape audit-service requires back from file-service before it will treat
 * an attachment as real. This is a peer's payload, not our own request body, so
 * it is validated rather than trusted: file-service answers 200 with an empty
 * body for an id that does not exist, and an unchecked `response.json()` on
 * that turns a bad attachment reference into a 500 instead of a 400.
 */
export const fileMetadataResponseSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
});

export type FileMetadataResponseDto = z.infer<typeof fileMetadataResponseSchema>;
