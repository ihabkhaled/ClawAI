import { z } from 'zod';
import {
  SAVE_INTENT_MEMORY_TEXT_MAX_CHARS,
  SAVE_INTENT_PACK_NAME_MAX_CHARS,
  SAVE_PACK_CONTENT_MAX_CHARS,
} from '../constants/save-intent.constants';

const notBlank = (value: string): boolean => value.trim().length > 0;

/**
 * The owner's confirmed (possibly edited) save (ADR-168). Text is kept exactly as
 * sent: the user's edit is what is saved, never trimmed or rewritten. At least one
 * of memory or pack; a pack names an existing pack XOR a new one.
 */
export const contextSaveProposalConfirmSchema = z
  .object({
    memory: z
      .object({
        type: z.enum(['FACT', 'PREFERENCE', 'INSTRUCTION', 'SUMMARY']),
        text: z.string().max(SAVE_INTENT_MEMORY_TEXT_MAX_CHARS).refine(notBlank, 'Text is empty'),
      })
      .nullable()
      .default(null),
    pack: z
      .object({
        packId: z.string().min(1).max(255).nullable(),
        newPackName: z
          .string()
          .max(SAVE_INTENT_PACK_NAME_MAX_CHARS)
          .refine(notBlank, 'Pack name is empty')
          .nullable(),
        content: z.string().max(SAVE_PACK_CONTENT_MAX_CHARS).refine(notBlank, 'Content is empty'),
      })
      .refine((pack) => (pack.packId === null) !== (pack.newPackName === null), {
        message: 'Choose either an existing pack or a new pack name',
        path: ['packId'],
      })
      .nullable()
      .default(null),
  })
  .refine((value) => value.memory !== null || value.pack !== null, {
    message: 'Confirm at least one of memory or context pack',
    path: ['memory'],
  });

export type ContextSaveProposalConfirmDto = z.infer<typeof contextSaveProposalConfirmSchema>;
