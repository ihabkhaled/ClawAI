import { z } from 'zod';

/**
 * The fields `VideoProcessingManager` needs off the bus. Narrower than
 * `FileVideoProcessRequestedPayload` on purpose, like `transcribeJobSchema`:
 * the job re-reads the row, so a redelivered message cannot make it act on a
 * stale description of the file.
 */
export const videoProcessJobSchema = z.object({
  fileId: z.string().min(1),
  userId: z.string().min(1),
  // The publisher's ISO time (BaseEventPayload), for the queue-wait metric only.
  timestamp: z.string().max(64).optional(),
});

export type VideoProcessJobDto = z.infer<typeof videoProcessJobSchema>;
