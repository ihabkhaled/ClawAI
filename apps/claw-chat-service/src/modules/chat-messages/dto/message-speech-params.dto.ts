import { z } from 'zod';

/**
 * `POST /chat-messages/:id/speech` route params ("Read aloud", batch 9).
 * A message id is a cuid; anything outside this shape cannot name a message
 * and is refused before a database read. The id also becomes part of the
 * stored filename and the PAYG requestId, so it must stay filename-safe.
 */
export const messageSpeechParamsSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9_-]+$/),
  })
  .strict();

export type MessageSpeechParamsDto = z.infer<typeof messageSpeechParamsSchema>;
