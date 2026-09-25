import { FileIngestionStatus, type Prisma } from '../../../generated/prisma';
import { OWNER_PLACEHOLDER_PROCESSING_CEILING_MS } from '../constants/effective-ingestion.constants';
import { AUDIO_PLACEHOLDER_PREFIX } from '../constants/transcription.constants';
import { VIDEO_PLACEHOLDER_PREFIX } from '../constants/video-processing.constants';

// The owner-facing file list's `?ingestionStatus=` filter, expressed as a
// query-level condition that selects exactly the rows
// `withOwnerFacingIngestionStatus` would SHOW with that status. No migration,
// no bulk update (rule 42 item 10): the stored column is never touched; the
// condition reads the same placeholder prefixes and ceiling the mapping reads.
// Pure — it builds a filter object, it does not query.

/** An audio or video row still carrying its placeholder (stored COMPLETED). */
function placeholderRow(): Prisma.FileWhereInput {
  return {
    OR: [
      {
        mimeType: { startsWith: 'video/' },
        extractedText: { startsWith: VIDEO_PLACEHOLDER_PREFIX },
      },
      {
        mimeType: { startsWith: 'audio/' },
        extractedText: { startsWith: AUDIO_PLACEHOLDER_PREFIX },
      },
    ],
  };
}

/** A placeholder row the owner view reports as PROCESSING: no error, inside the ceiling. */
function placeholderShownProcessing(cutoff: Date): Prisma.FileWhereInput {
  return {
    AND: [
      { ingestionStatus: FileIngestionStatus.COMPLETED },
      placeholderRow(),
      { extractionError: null },
      { updatedAt: { gte: cutoff } },
    ],
  };
}

/** A placeholder row the owner view reports as FAILED: it carries a reason. */
function placeholderShownFailed(): Prisma.FileWhereInput {
  return {
    AND: [
      { ingestionStatus: FileIngestionStatus.COMPLETED },
      placeholderRow(),
      { extractionError: { not: null } },
    ],
  };
}

/**
 * The rows whose OWNER-FACING effective status is `status` at `now`
 * (`resolveEffectiveIngestionStatus` with OWNER_PLACEHOLDER_PROCESSING_CEILING_MS):
 *
 * - PROCESSING: stored PROCESSING, plus placeholder rows stored COMPLETED with no
 *   error whose last write is inside the ceiling.
 * - FAILED: stored FAILED, plus placeholder rows stored COMPLETED with an error.
 * - COMPLETED: stored COMPLETED, minus both of those placeholder cases. A
 *   placeholder past the ceiling is shown COMPLETED, so it stays here.
 * - PENDING: stored PENDING (the mapping never changes it).
 *
 * SQL NULL trap: `NOT (extracted_text LIKE …)` is NULL, not TRUE, for a row
 * with no text, so COMPLETED lists `extractedText: null` explicitly rather than
 * relying on the negation to keep it.
 */
export function effectiveIngestionStatusWhere(
  status: FileIngestionStatus,
  now: number = Date.now(),
): Prisma.FileWhereInput {
  const cutoff = new Date(now - OWNER_PLACEHOLDER_PROCESSING_CEILING_MS);
  switch (status) {
    case FileIngestionStatus.PROCESSING: {
      return {
        OR: [
          { ingestionStatus: FileIngestionStatus.PROCESSING },
          placeholderShownProcessing(cutoff),
        ],
      };
    }
    case FileIngestionStatus.FAILED: {
      return { OR: [{ ingestionStatus: FileIngestionStatus.FAILED }, placeholderShownFailed()] };
    }
    case FileIngestionStatus.COMPLETED: {
      return {
        AND: [
          { ingestionStatus: FileIngestionStatus.COMPLETED },
          {
            OR: [
              { extractedText: null },
              { NOT: placeholderRow() },
              { AND: [placeholderRow(), { extractionError: null }, { updatedAt: { lt: cutoff } }] },
            ],
          },
        ],
      };
    }
    case FileIngestionStatus.PENDING: {
      return { ingestionStatus: FileIngestionStatus.PENDING };
    }
  }
}
