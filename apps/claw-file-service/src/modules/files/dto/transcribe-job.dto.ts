import { z } from 'zod';

/**
 * The fields `TranscriptionManager` actually needs off the bus.
 *
 * Deliberately narrower than `FileTranscribeRequestedPayload`: the filename and
 * mime type on the wire are a convenience for other consumers, while the job
 * itself re-reads them from the row, so a redelivered message cannot make the
 * manager act on a stale description of the file. Not `.strict()`, because the
 * envelope may gain fields without every consumer being redeployed.
 */
export const transcribeJobSchema = z.object({
  fileId: z.string().min(1),
  userId: z.string().min(1),
  // The publisher's ISO time (BaseEventPayload), for the queue-wait metric only.
  timestamp: z.string().max(64).optional(),
});

export type TranscribeJobDto = z.infer<typeof transcribeJobSchema>;
