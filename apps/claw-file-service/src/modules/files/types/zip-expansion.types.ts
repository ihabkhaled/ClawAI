import type { File, FileIngestionStatus } from '../../../generated/prisma';
import type { ArchiveEntryStatus } from '../../../common/enums/archive-entry-status.enum';

export type ZipExtractionThresholds = {
  maxExtractedSizeMb: number;
  maxEntryCount: number;
  maxNestingDepth: number;
  compressionRatioThreshold: number;
};

export type ExtractedEntry = {
  /** Where the bytes were written in the temporary extraction directory. */
  path: string;
  /** The entry's path INSIDE the archive, forward slashes, e.g. "docs/intro.md". */
  archivePath: string;
  sizeBytes: number;
  mimeType: string;
};

/**
 * The entry-table fields the extractor decides on — a ZIP central directory
 * entry, or one block of a 7-Zip listing. `compressedSize` is 0 when the format
 * does not say (entries after the first in a solid 7z block).
 */
export type ArchiveEntryHeader = {
  name: string;
  isDirectory: boolean;
  compressedSize: number;
  size: number;
  encrypted: boolean;
  /** Symbolic or hard link. node-stream-zip does not report it; absent = no. */
  isLink?: boolean;
  /** Device node, FIFO or socket. Absent = no. */
  isSpecialFile?: boolean;
};

/** An entry the extractor deliberately did not write, and why. */
export type SkippedArchiveEntry = {
  archivePath: string;
  sizeBytes: number;
  status: ArchiveEntryStatus;
};

export type ZipExtractionResult = {
  entries: ExtractedEntry[];
  skippedEntries: SkippedArchiveEntry[];
  totalExtractedBytes: number;
  /** Non-directory entries in the archive, extracted or not. */
  fileEntryCount: number;
  /** Non-directory entries that are password-protected. */
  encryptedEntryCount: number;
};

/** Which entries of one archive will be extracted, and which were set aside. */
export type ArchiveExtractionPlan = {
  toExtract: ArchiveEntryHeader[];
  skipped: SkippedArchiveEntry[];
  fileEntryCount: number;
  encryptedEntryCount: number;
};

/** What the extraction pass wrote, plus entries it skipped once their real size was known. */
export type ArchiveExtractionOutput = {
  entries: ExtractedEntry[];
  skipped: SkippedArchiveEntry[];
  totalBytes: number;
};

/**
 * Bytes still allowed to be extracted across the WHOLE archive tree.
 *
 * Deliberately a mutable object shared by every level of one expansion: a
 * per-archive cap alone lets each nested archive spend the full cap again, so
 * five levels would multiply it by five.
 */
export type ArchiveExtractionBudget = {
  remainingBytes: number;
};

/** Where one archive sits in an expansion: its nesting depth and the shared budget. */
export type ZipExtractionContext = {
  /** 1 for the uploaded archive, 2 for an archive inside it, and so on. */
  depth: number;
  budget: ArchiveExtractionBudget;
};

/** Aggregate outcome stored in the parent's `extractionMetadata` column. */
export type ArchiveExtractionMetadata = {
  childFileCount: number;
  totalExtractedBytes: number;
  expandedAt: string;
  fileEntryCount: number;
  skippedEntryCount: number;
  encryptedEntryCount: number;
  depth: number;
};

// The slice of FileProcessingManager that ZipExpansionManager depends on.
//
// The two managers call each other, which Nest resolves with forwardRef. Under
// ESM that mutual import is only safe while neither module ACCESSES the other's
// binding during evaluation — a forwardRef closure does not, but the
// `design:paramtypes` metadata emitted for a class-typed constructor parameter
// does, and it threw
// `ReferenceError: Cannot access 'FileProcessingManager' before initialization`
// at boot (prod, 2026-09-02). Typing the parameter with this interface makes the
// emitted metadata `Object` instead of the class, so nothing is read from the
// half-initialised module. Do not widen it back to the class type.
export type FileProcessingContract = {
  processFile(file: File): Promise<void>;
  updateIngestionStatus(fileId: string, status: FileIngestionStatus): Promise<void>;
};
