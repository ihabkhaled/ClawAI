import {
  ARCHIVE_DISPLAY_STATUS_BY_ENTRY_STATUS,
  ARCHIVE_ERROR_CODE_PATTERN,
  ARCHIVE_REJECTION_BY_CODE,
  ARCHIVE_REJECTION_KEYWORDS,
  ARCHIVE_STATUS_PRESENTATION,
} from '@/constants/archive.constants';
import { FileIngestionStatus } from '@/enums';
import { ArchiveEntryDisplayStatus } from '@/enums/archive-entry-display-status.enum';
import { ArchiveRejectionReason } from '@/enums/archive-rejection-reason.enum';
import type {
  ArchiveEntry,
  ArchiveEntryListing,
  ArchiveRejection,
  ArchiveStatusPresentation,
} from '@/types/archive.types';
import type { UploadedFile } from '@/types/file.types';

/** The display bucket of a backend entry status. Unknown statuses read as Unsupported. */
export function getArchiveDisplayStatus(status: string): ArchiveEntryDisplayStatus {
  return (
    ARCHIVE_DISPLAY_STATUS_BY_ENTRY_STATUS.get(status) ?? ArchiveEntryDisplayStatus.Unsupported
  );
}

export function getArchiveStatusPresentation(status: string): ArchiveStatusPresentation {
  return ARCHIVE_STATUS_PRESENTATION[getArchiveDisplayStatus(status)];
}

/** `ZIP_PATH_TRAVERSAL` out of `ZIP_PATH_TRAVERSAL: ../etc`, or null for any other error. */
export function parseArchiveErrorCode(message: string | null | undefined): string | null {
  if (message === null || message === undefined) {
    return null;
  }
  return ARCHIVE_ERROR_CODE_PATTERN.exec(message)?.[1] ?? null;
}

function reasonForCode(code: string): ArchiveRejectionReason {
  const known = ARCHIVE_REJECTION_BY_CODE.get(code);
  if (known !== undefined) {
    return known;
  }
  const byKeyword = ARCHIVE_REJECTION_KEYWORDS.find(([keyword]) => code.includes(keyword));
  return byKeyword?.[1] ?? ArchiveRejectionReason.Generic;
}

/**
 * Why an archive was refused, or null when it was not. A FAILED row is a
 * rejection; a COMPLETED row that still carries ARCHIVE_ENCRYPTED only had some
 * files skipped, which is a warning, not a failure.
 */
export function getArchiveRejection(
  extractionError: string | null | undefined,
  ingestionStatus: FileIngestionStatus,
): ArchiveRejection | null {
  const code = parseArchiveErrorCode(extractionError);
  if (code === null) {
    return null;
  }
  const reason = reasonForCode(code);
  const isFatal = ingestionStatus === FileIngestionStatus.FAILED;
  if (!isFatal && reason === ArchiveRejectionReason.Encrypted) {
    return { reason: ArchiveRejectionReason.PartlyEncrypted, isFatal, code };
  }
  return { reason, isFatal, code };
}

/**
 * Whether a file-list row is an archive. Decided by the parent/child relation
 * and the archive pipeline's own marks, never by MIME type: an archive uploaded
 * as octet-stream is still an archive, and a `.zip` that was rejected has no
 * children but still needs its reason shown.
 */
export function isArchiveFile(file: UploadedFile): boolean {
  return (
    (file.childCount ?? 0) > 0 ||
    (file.extractionMetadata !== null && file.extractionMetadata !== undefined) ||
    parseArchiveErrorCode(file.extractionError) !== null
  );
}

/** Files in the archive: every entry when expansion recorded it, else the extracted ones. */
export function getArchiveFileCount(file: UploadedFile): number {
  return file.extractionMetadata?.fileEntryCount ?? file.childCount ?? 0;
}

/** Only an entry that became a file can be attached; a skipped one has nothing to send. */
export function isArchiveEntrySelectable(entry: ArchiveEntry): boolean {
  return entry.childFileId !== null;
}

/** Still expanding: keep asking until every entry has an outcome. */
export function isArchiveListingPending(listing: ArchiveEntryListing | undefined): boolean {
  if (listing === undefined) {
    return false;
  }
  return (
    listing.ingestionStatus === FileIngestionStatus.PENDING ||
    listing.ingestionStatus === FileIngestionStatus.PROCESSING ||
    listing.entries.some(
      (entry) => getArchiveDisplayStatus(entry.status) === ArchiveEntryDisplayStatus.Pending,
    )
  );
}

export function getArchiveListingCount(listing: ArchiveEntryListing): number {
  return listing.entries.length + listing.unlistedEntryCount;
}
