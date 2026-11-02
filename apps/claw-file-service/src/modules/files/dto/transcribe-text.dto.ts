import { z } from 'zod';
import { EXTRACT_TEXT_MAX_BASE64_LENGTH } from '../constants/extract-text.constants';

/**
 * Read audio or video as text, billed to the caller, nothing stored.
 *
 * Same size ceiling as extract-text (about 15 MB of file). Audio is held to the
 * stricter 12 MB transcription cap by the manager, with its own error code.
 */
export const transcribeTextSchema = z
  .object({
    fileName: z.string().min(1).max(255),
    contentBase64: z.string().min(1).max(EXTRACT_TEXT_MAX_BASE64_LENGTH),
    mimeType: z.string().min(1).max(127).optional(),
  })
  .strict();

export type TranscribeTextDto = z.infer<typeof transcribeTextSchema>;
