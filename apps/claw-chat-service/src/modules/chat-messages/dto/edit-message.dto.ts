import { z } from 'zod';

import { stripNulBytes } from '../../../common/utilities/postgres-safe-text.utility';

/**
 * The replacement text for a user message that is being edited and re-run.
 *
 * Same shape and same limits as the create path on purpose: an edited prompt is
 * a prompt, and a message that could be sent must remain editable to anything
 * that could equally have been sent.
 */
export const editMessageSchema = z.object({
  // Stripped BEFORE the length checks, so a payload of nothing but NUL bytes is
  // rejected as empty rather than reaching Postgres.
  content: z
    .string()
    .transform(stripNulBytes)
    .pipe(
      z
        .string()
        .min(1, 'Content must not be empty')
        .max(100000, 'Content must be at most 100000 characters'),
    ),
});

export type EditMessageDto = z.infer<typeof editMessageSchema>;
