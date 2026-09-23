import type { FileIngestionStatus } from '../../../generated/prisma';
import type { ArchiveContentPriority } from '../../../common/enums/archive-content-priority.enum';
import type { ArchiveEntryStatus } from '../../../common/enums/archive-entry-status.enum';

/** The slice of a child row the manifest needs to classify it. */
export type ChildExtractionState = {
  mimeType: string;
  extractedText: string | null;
  extractionError: string | null;
  ingestionStatus: FileIngestionStatus;
};

/**
 * One line of the archive manifest's file tree.
 *
 * Deliberately holds no text: an archive can have thousands of entries, and
 * holding every child's text in memory to pack a 100k-character manifest would
 * cost far more than re-reading the few that fit. `loadText` fetches them.
 */
export type ArchiveManifestRow = {
  archivePath: string;
  sizeBytes: number;
  status: ArchiveEntryStatus;
  childFileId: string | null;
  /** Set only when the entry has text worth packing (`status` INCLUDED). */
  priority: ArchiveContentPriority | null;
  textLength: number;
  /** A short reason shown next to the status, e.g. why extraction failed. */
  detail: string | null;
};

export type ClassifyChildInput = {
  archivePath: string;
  sizeBytes: number;
  childFileId: string;
  state: ChildExtractionState | null;
};

export type ArchiveManifestInput = {
  archiveFilename: string;
  rows: ReadonlyArray<ArchiveManifestRow>;
  fileEntryCount: number;
  encryptedEntryCount: number;
  totalExtractedBytes: number;
  loadText: (childFileId: string) => Promise<string | null>;
};

/** A packed content section and the status it earned. */
export type PackedManifestContent = {
  sections: string[];
  statusByPath: Map<string, ArchiveEntryStatus>;
};

/** One entry's packing outcome: the text to show (if any) and its final status. */
export type PackedManifestSection = {
  body: string | null;
  status: ArchiveEntryStatus;
};
