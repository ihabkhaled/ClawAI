import { z } from 'zod';

import { type ContentOrAttachmentsInput } from '../types/attachment-only-turn.types';

/**
 * A send needs words OR files — not necessarily both.
 *
 * Every send schema used to say `content: z.string().min(1)`, so a voice note
 * or a PDF sent on its own was refused with "Validation failed" before it
 * reached a model, and the composer had to invent text to get past it. The
 * owner's requirement is plain: "I can send attachments/files WITHOUT text."
 *
 * Attached files waive the minimum entirely. With no files the trimmed text
 * must reach `minLength` — which is also stricter than before for the
 * no-files case: a whitespace-only prompt used to pass `min(1)`.
 *
 * Returns a `superRefine` callback so a schema that already refines (Compare,
 * Escalation) can call it from inside its own.
 */
export function requireContentOrAttachments(
  minLength = 1,
): (value: ContentOrAttachmentsInput, ctx: z.RefinementCtx) => void {
  return (value, ctx) => {
    if ((value.fileIds?.length ?? 0) > 0) {
      return;
    }
    if ((value.content ?? '').trim().length >= minLength) {
      return;
    }
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['content'],
      message:
        minLength <= 1
          ? 'Content must not be empty unless files are attached'
          : `Content must be at least ${String(minLength)} characters unless files are attached`,
    });
  };
}
