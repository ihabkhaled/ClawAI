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
