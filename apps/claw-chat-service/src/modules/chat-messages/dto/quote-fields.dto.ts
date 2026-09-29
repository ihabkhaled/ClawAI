import { z } from 'zod';
import { QUOTE_MAX_COUNT, QUOTE_MAX_TEXT_LENGTH } from '../constants/message-quotes.constants';

/**
 * Text the user selected in an earlier message and attached to this turn.
 *
 * Structured, not pasted: the source message id travels with the text, so the
 * turn records exactly what it was replying to. The service checks every id
 * belongs to the same thread before anything is stored.
 */
export const messageQuoteSchema = z.object({
  sourceMessageId: z.string().min(1).max(255, 'Quote source id must be at most 255 characters'),
  text: z
    .string()
    .trim()
    .min(1, 'Quote text must not be empty')
    .max(
      QUOTE_MAX_TEXT_LENGTH,
      `Quote text must be at most ${String(QUOTE_MAX_TEXT_LENGTH)} characters`,
    ),
});

export const quoteFields = {
  quotes: z
    .array(messageQuoteSchema)
    .max(QUOTE_MAX_COUNT, `At most ${String(QUOTE_MAX_COUNT)} quotes per message`)
    .optional(),
};

export type MessageQuoteInput = z.infer<typeof messageQuoteSchema>;
