import { z } from 'zod';
import { MemoryRecordType, SaveContentSource } from '../../../common/enums';
import {
  SAVE_INTENT_MEMORY_TEXT_MAX_CHARS,
  SAVE_INTENT_PACK_NAME_MAX_CHARS,
  SAVE_INTENT_SUMMARY_MAX_CHARS,
} from '../constants/save-intent.constants';

/**
 * The planner's verdict, validated before anything is saved. A reply that does
 * not match is treated as "no answer" — the next planner is tried, and with
 * none left the deterministic keyword path decides (ADR-134).
 */
export const saveIntentVerdictSchema = z.object({
  save: z.boolean(),
  memory: z
    .object({
      type: z.nativeEnum(MemoryRecordType),
      text: z.string().trim().min(1).max(SAVE_INTENT_MEMORY_TEXT_MAX_CHARS),
    })
    .nullable()
    .optional(),
  contextPack: z
    .object({
      source: z.nativeEnum(SaveContentSource),
      summary: z.string().max(SAVE_INTENT_SUMMARY_MAX_CHARS).nullable().optional(),
      packName: z.string().max(SAVE_INTENT_PACK_NAME_MAX_CHARS).nullable().optional(),
      newPackName: z.string().max(SAVE_INTENT_PACK_NAME_MAX_CHARS).nullable().optional(),
    })
    .nullable()
    .optional(),
});

export type SaveIntentVerdict = z.infer<typeof saveIntentVerdictSchema>;
