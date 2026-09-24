import { MAX_FILE_SIZE } from '../types/files.types';
import type { ZipExtractionThresholds } from '../types/zip-expansion.types';

// The MIME types routed to archive expansion — ZIP and every other format — are
// ARCHIVE_MIME_ACCEPTED_FORMATS in archive-formats.constants.ts (batch A2).

/**
 * Default ZIP-bomb thresholds, used when AppConfig is unavailable
 * (unit tests, fallback paths). Production values come from AppConfig.
 */
export const DEFAULT_ZIP_THRESHOLDS: ZipExtractionThresholds = {
  maxExtractedSizeMb: 500,
  maxEntryCount: 10000,
  maxNestingDepth: 5,
  compressionRatioThreshold: 1000,
};

/**
 * Common file extension → MIME-type lookup used to label extracted entries.
 * Conservative — unknown extensions fall back to `application/octet-stream`.
 */
export const EXTENSION_TO_MIME: Readonly<Record<string, string>> = {
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  json: 'application/json',
  xml: 'application/xml',
  yml: 'application/x-yaml',
  yaml: 'application/x-yaml',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  ts: 'application/typescript',
  py: 'text/x-python',
  java: 'text/x-java-source',
  c: 'text/x-c',
  cpp: 'text/x-c++',
  go: 'text/x-go',
  rs: 'text/x-rust',
  rb: 'text/x-ruby',
  sh: 'text/x-shellscript',
  sql: 'text/x-sql',
  log: 'text/x-log',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  zip: 'application/zip',
  // Archives other than ZIP (batch A2). A .tgz/.tbz2/.txz is a stream codec whose
  // payload is sniffed as a tar after decompression, so it carries the codec MIME.
  '7z': 'application/x-7z-compressed',
  rar: 'application/vnd.rar',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  tgz: 'application/gzip',
  bz2: 'application/x-bzip2',
  tbz2: 'application/x-bzip2',
  tbz: 'application/x-bzip2',
  xz: 'application/x-xz',
  txz: 'application/x-xz',
};

export const DEFAULT_EXTRACTED_MIME_TYPE = 'application/octet-stream';

export const BYTES_PER_MEGABYTE = 1024 * 1024;

/** Depth of the archive the user uploaded; an archive inside it is depth 2. */
export const ARCHIVE_ROOT_DEPTH = 1;

/**
 * Largest single entry the extractor writes. Matches the upload cap: an archive
 * must not be a way to smuggle in a file no direct upload would accept. Larger
 * entries are skipped (reported `skipped-too-large`), not fatal.
 */
export const ZIP_MAX_ENTRY_BYTES = MAX_FILE_SIZE;

// A ZIP made on Unix stores the entry's POSIX st_mode in the high 16 bits of the
// external attributes. The file-type bits tell a symlink or device node from a
// regular file; the policy skips the first two exactly as it does in a tar.
export const ZIP_UNIX_MODE_SHIFT = 16;
export const POSIX_FILE_TYPE_MASK = 0o170000;
export const POSIX_REGULAR_FILE_BITS = 0o100000;
export const POSIX_DIRECTORY_BITS = 0o040000;
export const POSIX_SYMLINK_BITS = 0o120000;
/**
 * File-type bits that mean an ordinary entry: none recorded (a ZIP from Windows
 * or an old tool), a regular file, or a directory.
 */
export const ZIP_ORDINARY_FILE_TYPES: ReadonlySet<number> = new Set([
  0,
  POSIX_REGULAR_FILE_BITS,
  POSIX_DIRECTORY_BITS,
]);

// Error codes. `ZIP_BOMB_RATIO` doubles as the per-archive size-cap code — that
// is what it has always reported, and consumers match on it.
export const ZIP_SIZE_CAP_ERROR_CODE = 'ZIP_BOMB_RATIO';
export const ZIP_CUMULATIVE_SIZE_EXCEEDED_ERROR_CODE = 'ZIP_CUMULATIVE_SIZE_EXCEEDED';
export const ZIP_EXPANSION_FAILED_ERROR_CODE = 'ZIP_EXPANSION_FAILED';
export const ZIP_TOO_MANY_ENTRIES_ERROR_CODE = 'ZIP_TOO_MANY_ENTRIES';
export const ZIP_PATH_TRAVERSAL_ERROR_CODE = 'ZIP_PATH_TRAVERSAL';
/** One entry, or the whole archive, inflates past ZIP_COMPRESSION_RATIO_THRESHOLD. */
export const ZIP_BOMB_RATIO_ERROR_CODE = 'ZIP_BOMB_RATIO';

/**
 * Some or all entries are password-protected. Encrypted entries are skipped and
 * the rest still delivered; only an archive whose EVERY file is encrypted ends
 * FAILED. Also the code for a 7z or RAR whose entry table is itself encrypted,
 * which cannot even be listed without a password. Password support is batch A3.
 */
export const ARCHIVE_ENCRYPTED_ERROR_CODE = 'ARCHIVE_ENCRYPTED';

/**
 * Batch A3 — the password prompt in chat. Bounded so a wrong password cannot
 * be retried forever: the 4th submission is refused before 7-Zip ever runs.
 * `passwordAttempts` on the archive's own `extractionMetadata` is the counter.
 */
export const ARCHIVE_PASSWORD_MAX_ATTEMPTS = 3;
/** The archive's own extractionError does not carry ARCHIVE_ENCRYPTED — nothing to unlock. */
export const ARCHIVE_NOT_ENCRYPTED_ERROR_CODE = 'ARCHIVE_NOT_ENCRYPTED';
/** The retry cap (ARCHIVE_PASSWORD_MAX_ATTEMPTS) was already spent. */
export const ARCHIVE_PASSWORD_ATTEMPTS_EXCEEDED_ERROR_CODE = 'ARCHIVE_PASSWORD_ATTEMPTS_EXCEEDED';
