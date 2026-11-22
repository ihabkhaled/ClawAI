import { z } from 'zod';
import {
  TRANSCRIBE_CHUNK_LANGUAGE_PATTERN,
  TRANSCRIBE_CHUNK_MAX_BASE64_LENGTH,
  TRANSCRIBE_CHUNK_MIME_PATTERN,
} from '../constants/transcribe-chunk.constants';

/**
 * ADR-221 — one Live Intelligence audio chunk, transcribed at the platform's
 * cost. The decoded-size ceiling (2 MiB) and the 30 s length cap are enforced
 * by the manager with their own codes; this bounds the wire.
 */
export const transcribeChunkSchema = z
  .object({
    contentBase64: z.string().min(1).max(TRANSCRIBE_CHUNK_MAX_BASE64_LENGTH),
    mimeType: z.string().min(1).max(127).regex(TRANSCRIBE_CHUNK_MIME_PATTERN),
    /** BCP-47-ish hint (`en`, `ar`, `pt-BR`). Logged only; providers auto-detect. */
    languageHint: z.string().regex(TRANSCRIBE_CHUNK_LANGUAGE_PATTERN).optional(),
    /** Caller's idempotency/trace id (`live:<runId>:<chunkIndex>`). */
    requestId: z
      .string()
      .min(1)
      .max(200)
      .regex(/^[A-Za-z0-9:._-]+$/),
  })
  .strict();

export type TranscribeChunkDto = z.infer<typeof transcribeChunkSchema>;
