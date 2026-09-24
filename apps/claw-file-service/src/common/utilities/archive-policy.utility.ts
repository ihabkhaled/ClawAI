import * as fs from 'node:fs';
import * as path from 'node:path';
import { HttpStatus, Logger } from '@nestjs/common';
import { BusinessException } from '../errors/business.exception';
import { ArchiveEntryStatus } from '../enums/archive-entry-status.enum';
import {
  BYTES_PER_MEGABYTE,
  DEFAULT_EXTRACTED_MIME_TYPE,
  EXTENSION_TO_MIME,
  ZIP_BOMB_RATIO_ERROR_CODE,
  ZIP_CUMULATIVE_SIZE_EXCEEDED_ERROR_CODE,
  ZIP_MAX_ENTRY_BYTES,
  ZIP_PATH_TRAVERSAL_ERROR_CODE,
  ZIP_SIZE_CAP_ERROR_CODE,
  ZIP_TOO_MANY_ENTRIES_ERROR_CODE,
} from '../../modules/files/constants/zip-expansion.constants';
import { ARCHIVE_FILE_EXTENSIONS } from '../../modules/files/constants/archive-formats.constants';
import type {
  ArchiveEntryHeader,
  ArchiveExtractionPlan,
  ZipExtractionContext,
  ZipExtractionThresholds,
} from '../../modules/files/types/zip-expansion.types';

const logger = new Logger('ArchivePolicy');

// The rules every archive is held to, whichever engine opens it. They were
// private to the ZIP extractor until batch A2; they moved here unchanged so a
// 7z, RAR or tar is refused for exactly the reasons a ZIP is.

/** Forward-slash relative path of an entry, as the archive names it. */
export function toArchivePath(rawName: string): string {
  return rawName.replaceAll('\\', '/');
}

/** Rejects an archive with more entries (directories included) than allowed. */
export function rejectTooManyEntries(
  entryCount: number,
  thresholds: ZipExtractionThresholds,
): void {
  if (entryCount > thresholds.maxEntryCount) {
    throw new BusinessException(
      `Archive has ${String(entryCount)} entries (limit ${String(thresholds.maxEntryCount)})`,
      ZIP_TOO_MANY_ENTRIES_ERROR_CODE,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Pre-extraction validation pass. Any hit rejects the WHOLE archive:
 * - an entry whose path contains traversal/null/absolute markers
 * - an entry with a suspicious compression ratio (zip-bomb)
 * - a file that shares its path with a link, or sits beneath one
 */
export function validateEntries(
  entries: ReadonlyArray<ArchiveEntryHeader>,
  thresholds: ZipExtractionThresholds,
): void {
  for (const entry of entries) {
    rejectUnsafePath(entry.name);
    rejectBombRatio(entry, thresholds);
  }
  rejectLinkShadowing(entries);
}

// Links are never extracted, but 7-Zip extracts by NAME: a tar that carries a
// symlink `x -> /etc/cron.d/job` and then a regular file `x` would have both
// selected by the list file, and the file written through the link. A file
// stored beneath a link (`x/evil` after `x -> /`) is the other classic escape.
// No honest archive needs either shape, so the whole archive is refused.
function rejectLinkShadowing(entries: ReadonlyArray<ArchiveEntryHeader>): void {
  const linkPaths = new Set(
    entries
      .filter((entry) => entry.isLink === true || entry.isSpecialFile === true)
      .map((entry) => normalizedEntryPath(entry.name)),
  );
  if (linkPaths.size === 0) {
    return;
  }
  for (const entry of entries) {
    if (entry.isLink === true || entry.isSpecialFile === true) {
      continue;
    }
    const shadowed = pathAndAncestors(normalizedEntryPath(entry.name)).find((candidate) =>
      linkPaths.has(candidate),
    );
    if (shadowed !== undefined) {
      logger.warn(`rejectLinkShadowing: "${entry.name}" is written through link "${shadowed}"`);
      throw new BusinessException(
        `Archive entry "${entry.name}" would be written through the link "${shadowed}"`,
        ZIP_PATH_TRAVERSAL_ERROR_CODE,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

/** `a/b/c` → `['a/b/c', 'a/b', 'a']`. */
function pathAndAncestors(entryPath: string): string[] {
  const segments = entryPath.split('/');
  return segments.map((_segment, index) => segments.slice(0, segments.length - index).join('/'));
}

function normalizedEntryPath(rawName: string): string {
  return toArchivePath(rawName)
    .replace(/^(\.\/)+/, '')
    .replace(/\/+$/, '');
}

function rejectUnsafePath(rawName: string): void {
  if (!rawName) {
    return;
  }
  if (
    rawName.includes('..') ||
    rawName.includes('\0') ||
    rawName.startsWith('/') ||
    rawName.startsWith('\\') ||
    /^[a-zA-Z]:[/\\]/.test(rawName)
  ) {
    logger.warn(`rejectUnsafePath: traversal/absolute path entry blocked — "${rawName}"`);
    throw new BusinessException(
      `Archive contains unsafe entry path: ${rawName}`,
      ZIP_PATH_TRAVERSAL_ERROR_CODE,
      HttpStatus.BAD_REQUEST,
    );
  }
}

function rejectBombRatio(entry: ArchiveEntryHeader, thresholds: ZipExtractionThresholds): void {
  if (entry.isDirectory || entry.compressedSize <= 0 || entry.size <= 0) {
    return;
  }
  const ratio = entry.size / entry.compressedSize;
  if (ratio > thresholds.compressionRatioThreshold) {
    logger.warn(
      `rejectBombRatio: entry "${entry.name}" ratio=${String(ratio)} exceeds threshold ${String(thresholds.compressionRatioThreshold)}`,
    );
    throw new BusinessException(
      `Archive entry "${entry.name}" has suspicious compression ratio ${String(Math.round(ratio))}:1`,
      ZIP_BOMB_RATIO_ERROR_CODE,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Whole-archive ratio: every byte the archive promises against the bytes it
 * occupies. A solid 7z or RAR reports one packed size for a block of files, so
 * the per-entry ratio undercounts; this catches the bomb the block hides.
 */
export function rejectArchiveBombRatio(
  declaredBytes: number,
  compressedBytes: number,
  thresholds: ZipExtractionThresholds,
): void {
  if (compressedBytes <= 0 || declaredBytes <= 0) {
    return;
  }
  const ratio = declaredBytes / compressedBytes;
  if (ratio > thresholds.compressionRatioThreshold) {
    logger.warn(
      `rejectArchiveBombRatio: declared=${String(declaredBytes)} compressed=${String(compressedBytes)} ratio=${String(ratio)}`,
    );
    throw new BusinessException(
      `Archive inflates at a suspicious ratio of ${String(Math.round(ratio))}:1`,
      ZIP_BOMB_RATIO_ERROR_CODE,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Sorts entries into "extract" and "skip", from the entry table alone.
 *
 * Encrypted entries are detected here, up front, rather than by catching an
 * engine error mid-extraction — that throw used to fail the whole archive with
 * a generic ZIP_EXPANSION_FAILED. A nested archive at the depth limit, a link
 * and a device node are skipped rather than fatal: the rest of the archive is
 * still worth delivering.
 *
 * `passwordProvided` is batch A3: when the caller supplied a password for
 * THIS extraction, an entry the listing marked `encrypted` is no longer
 * skipped up front — it is handed to 7-Zip to attempt, and a wrong password
 * surfaces as a failed extract run (see `rejectFailedRun` in
 * seven-zip-extraction.utility.ts), not a silent skip.
 */
export function planExtraction(
  entries: ReadonlyArray<ArchiveEntryHeader>,
  thresholds: ZipExtractionThresholds,
  context: ZipExtractionContext,
  passwordProvided = false,
): ArchiveExtractionPlan {
  const plan: ArchiveExtractionPlan = {
    toExtract: [],
    skipped: [],
    fileEntryCount: 0,
    encryptedEntryCount: 0,
  };
  for (const entry of entries) {
    if (entry.isDirectory) {
      continue;
    }
    plan.fileEntryCount += 1;
    const status = skipReason(entry, thresholds, context, passwordProvided);
    if (status === null) {
      plan.toExtract.push(entry);
      continue;
    }
    if (status === ArchiveEntryStatus.SKIPPED_ENCRYPTED) {
      plan.encryptedEntryCount += 1;
    }
    logger.warn(`planExtraction: skipping "${entry.name}" status=${status}`);
    plan.skipped.push({ archivePath: toArchivePath(entry.name), sizeBytes: entry.size, status });
  }
  return plan;
}

function skipReason(
  entry: ArchiveEntryHeader,
  thresholds: ZipExtractionThresholds,
  context: ZipExtractionContext,
  passwordProvided: boolean,
): ArchiveEntryStatus | null {
  if (entry.isLink === true) {
    return ArchiveEntryStatus.SKIPPED_LINK;
  }
  if (entry.isSpecialFile === true) {
    return ArchiveEntryStatus.SKIPPED_SPECIAL_FILE;
  }
  // No password for this attempt: reported, never attempted. With one, the
  // entry is handed to 7-Zip — see the doc comment on planExtraction.
  if (entry.encrypted && !passwordProvided) {
    return ArchiveEntryStatus.SKIPPED_ENCRYPTED;
  }
  if (isArchiveFileName(entry.name) && context.depth >= thresholds.maxNestingDepth) {
    return ArchiveEntryStatus.SKIPPED_NESTING_DEPTH;
  }
  return entry.size > ZIP_MAX_ENTRY_BYTES ? ArchiveEntryStatus.SKIPPED_TOO_LARGE : null;
}

/** True when a name ends in an archive extension this service expands. */
export function isArchiveFileName(rawName: string): boolean {
  const lower = rawName.toLowerCase();
  return ARCHIVE_FILE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

/**
 * The size cap for this archive: the per-archive cap, or what is left of the
 * budget shared across nested levels, whichever is smaller.
 */
export function effectiveCapBytes(
  thresholds: ZipExtractionThresholds,
  context: ZipExtractionContext,
): number {
  return Math.min(
    thresholds.maxExtractedSizeMb * BYTES_PER_MEGABYTE,
    context.budget.remainingBytes,
  );
}

export function sizeCapException(
  thresholds: ZipExtractionThresholds,
  context: ZipExtractionContext,
  capBytes: number,
): BusinessException {
  const perArchiveBytes = thresholds.maxExtractedSizeMb * BYTES_PER_MEGABYTE;
  const sharedBudgetBinds = capBytes < perArchiveBytes;
  return new BusinessException(
    sharedBudgetBinds
      ? `Archive expansion at depth ${String(context.depth)} exceeds the ${String(thresholds.maxExtractedSizeMb)}MB cap shared across nested archives`
      : `Archive expansion exceeds size cap ${String(thresholds.maxExtractedSizeMb)}MB`,
    sharedBudgetBinds ? ZIP_CUMULATIVE_SIZE_EXCEEDED_ERROR_CODE : ZIP_SIZE_CAP_ERROR_CODE,
    HttpStatus.BAD_REQUEST,
  );
}

/**
 * Rejects on the DECLARED sizes before a byte is written. Declared sizes can
 * lie, so the running total is checked again during extraction; this pass only
 * spares an honest oversized archive from being half-extracted first.
 */
export function enforceDeclaredSize(
  entries: ReadonlyArray<ArchiveEntryHeader>,
  thresholds: ZipExtractionThresholds,
  context: ZipExtractionContext,
): void {
  const declared = sumDeclaredBytes(entries);
  const cap = effectiveCapBytes(thresholds, context);
  if (declared > cap) {
    logger.warn(
      `enforceDeclaredSize: declared=${String(declared)} exceeds cap=${String(cap)} depth=${String(context.depth)}`,
    );
    throw sizeCapException(thresholds, context, cap);
  }
}

export function sumDeclaredBytes(entries: ReadonlyArray<ArchiveEntryHeader>): number {
  return entries.reduce((sum, entry) => sum + entry.size, 0);
}

/** Resolves an entry's output path, refusing anything outside `destDir`. */
export function resolveSafeOutputPath(destDir: string, rawName: string): string {
  const normalizedRoot = path.resolve(destDir);
  const resolved = path.resolve(normalizedRoot, rawName);
  if (!resolved.startsWith(normalizedRoot + path.sep) && resolved !== normalizedRoot) {
    logger.error(`resolveSafeOutputPath: resolved="${resolved}" outside root="${normalizedRoot}"`);
    throw new BusinessException(
      `Archive entry path "${rawName}" resolves outside destination`,
      ZIP_PATH_TRAVERSAL_ERROR_CODE,
      HttpStatus.BAD_REQUEST,
    );
  }
  return resolved;
}

export function ensureDirectoryExists(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** MIME type of an extracted entry, from its extension. Unknown → octet-stream. */
export function detectMimeFromName(name: string): string {
  const dotIdx = name.lastIndexOf('.');
  if (dotIdx < 0 || dotIdx === name.length - 1) {
    return DEFAULT_EXTRACTED_MIME_TYPE;
  }
  const ext = name.slice(dotIdx + 1).toLowerCase();
  return EXTENSION_TO_MIME[ext] ?? DEFAULT_EXTRACTED_MIME_TYPE;
}
