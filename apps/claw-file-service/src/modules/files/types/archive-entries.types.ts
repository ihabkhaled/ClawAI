import type { File, FileIngestionStatus } from '../../../generated/prisma';

/** A row of the user's file list, plus how many files were extracted from it. */
export type FileListRow = File & {
  /** Direct children extracted from this row. Above 0 means it is an expanded archive. */
  childCount: number;
};

/** The columns of an archive's own row that the entry listing reads. */
export type ArchiveParentRow = {
  id: string;
  userId: string;
  filename: string;
  extractedText: string | null;
  extractionError: string | null;
  ingestionStatus: FileIngestionStatus;
};

/** The columns of one extracted child the entry listing reads. */
export type ArchiveChildRow = {
  id: string;
  archivePath: string | null;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  ingestionStatus: FileIngestionStatus;
};

/** One line of the manifest's file tree, read back. */
export type ParsedManifestLine = {
  /** As written in the manifest: sanitised, and cut at 300 characters. */
  archivePath: string;
  /** Rounded — the manifest prints "1.5 KB", not the byte count. */
  sizeBytes: number;
  status: string;
  detail: string | null;
};

export type ParsedManifestTree = {
  lines: ParsedManifestLine[];
  /** Entries the manifest counted but left out of its tree to save space. */
  unlistedCount: number;
};

/** One entry of an archive, as the file list UI draws it. */
export type ArchiveEntryView = {
  archivePath: string;
  sizeBytes: number;
  /** An ArchiveEntryStatus value, or ARCHIVE_ENTRY_PENDING_STATUS while extraction runs. */
  status: string;
  detail: string | null;
  /** The file row this entry became, or null when it was skipped. */
  childFileId: string | null;
  mimeType: string | null;
  /** Children of this entry: above 0 for an archive nested inside the archive. */
  childCount: number;
};

export type ArchiveEntryListing = {
  archiveFileId: string;
  filename: string;
  ingestionStatus: FileIngestionStatus;
  extractionError: string | null;
  /** False for an ordinary file: no manifest, no children, no archive error. */
  isArchive: boolean;
  entries: ArchiveEntryView[];
  /** Entries that exist but are not in `entries` (manifest tree limit or listing cap). */
  unlistedEntryCount: number;
};

export type MergeArchiveEntriesInput = {
  tree: ParsedManifestTree;
  children: ReadonlyArray<ArchiveChildRow>;
  totalChildCount: number;
  grandchildCounts: ReadonlyMap<string, number>;
  maxEntries: number;
};

export type MergedArchiveEntries = {
  entries: ArchiveEntryView[];
  unlistedEntryCount: number;
};
