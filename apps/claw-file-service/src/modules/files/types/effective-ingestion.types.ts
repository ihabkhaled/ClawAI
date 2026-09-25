import { type File } from '../../../generated/prisma';

/** The only columns the effective-status mapping reads. */
export type EffectiveIngestionRow = Pick<
  File,
  'mimeType' | 'ingestionStatus' | 'extractedText' | 'extractionError' | 'updatedAt'
>;

/**
 * `ceilingMs` — owner-facing responses only: a placeholder not written for
 * this long reports its persisted status (see
 * OWNER_PLACEHOLDER_PROCESSING_CEILING_MS). `now` is injectable for tests.
 */
export type EffectiveIngestionOptions = {
  ceilingMs?: number;
  now?: number;
};
