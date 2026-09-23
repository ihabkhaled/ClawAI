import { MAX_FILE_SIZE } from '../types/files.types';
import type { ZipExtractionThresholds } from '../types/zip-expansion.types';

/**
 * MIME types treated as ZIP archives.
 * Some clients send `application/x-zip-compressed` (older Windows browsers)
 * — both are accepted and dispatched through the archive expansion pipeline.
 */
export const ZIP_MIME_TYPES: readonly string[] = [
  'application/zip',
  'application/x-zip-compressed',
];

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

/** File extension that marks an entry as a nested archive. */
export const NESTED_ARCHIVE_EXTENSION = '.zip';

// Error codes. `ZIP_BOMB_RATIO` doubles as the per-archive size-cap code — that
// is what it has always reported, and consumers match on it.
export const ZIP_SIZE_CAP_ERROR_CODE = 'ZIP_BOMB_RATIO';
export const ZIP_CUMULATIVE_SIZE_EXCEEDED_ERROR_CODE = 'ZIP_CUMULATIVE_SIZE_EXCEEDED';
export const ZIP_EXPANSION_FAILED_ERROR_CODE = 'ZIP_EXPANSION_FAILED';

/**
 * Some or all entries are password-protected. Encrypted entries are skipped and
 * the rest still delivered; only an archive whose EVERY file is encrypted ends
 * FAILED. Password support is a later batch.
 */
export const ARCHIVE_ENCRYPTED_ERROR_CODE = 'ARCHIVE_ENCRYPTED';
