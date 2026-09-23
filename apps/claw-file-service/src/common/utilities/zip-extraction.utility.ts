import * as fs from 'node:fs';
import * as path from 'node:path';
import { HttpStatus, Logger } from '@nestjs/common';
import StreamZip from 'node-stream-zip';
import { BusinessException } from '../errors/business.exception';
import { ArchiveEntryStatus } from '../enums/archive-entry-status.enum';
import {
  BYTES_PER_MEGABYTE,
  DEFAULT_EXTRACTED_MIME_TYPE,
  EXTENSION_TO_MIME,
  NESTED_ARCHIVE_EXTENSION,
  ZIP_CUMULATIVE_SIZE_EXCEEDED_ERROR_CODE,
  ZIP_MAX_ENTRY_BYTES,
  ZIP_SIZE_CAP_ERROR_CODE,
} from '../../modules/files/constants/zip-expansion.constants';
import type {
  ArchiveEntryHeader,
  ArchiveExtractionOutput,
  ArchiveExtractionPlan,
  ZipExtractionContext,
  ZipExtractionResult,
  ZipExtractionThresholds,
} from '../../modules/files/types/zip-expansion.types';

const logger = new Logger('ZipExtractionUtility');

/**
 * Validates an archive against bomb / traversal / size thresholds, then
 * extracts every entry that may be extracted to {@link destDir}. Pure async
 * function — no service dependencies — so it can be exercised in isolation.
 *
 * Throws {@link BusinessException} on a policy violation that makes the WHOLE
 * archive untrustworthy (traversal, ratio bomb, entry count, size cap). Entries
 * that are merely unusable are skipped and reported in `skippedEntries`:
 * - password-protected entries (`ARCHIVE_ENCRYPTED`; password support is a later batch)
 * - nested archives at the `maxNestingDepth` limit
 * - entries larger than a single upload may be
 *
 * The size cap is the smaller of the per-archive cap and what is left of
 * `context.budget`, which every level of a nested expansion shares.
 */
export async function validateAndExtractZip(
  zipPath: string,
  destDir: string,
  thresholds: ZipExtractionThresholds,
  context: ZipExtractionContext,
): Promise<ZipExtractionResult> {
  logger.debug(
    `validateAndExtractZip: zipPath=${zipPath} destDir=${destDir} depth=${String(context.depth)} remainingBytes=${String(context.budget.remainingBytes)} thresholds=${JSON.stringify(thresholds)}`,
  );

  const zip = new StreamZip.async({ file: zipPath, storeEntries: true });
  try {
    const entryCount = await zip.entriesCount;
    if (entryCount > thresholds.maxEntryCount) {
      throw new BusinessException(
        `Archive has ${String(entryCount)} entries (limit ${String(thresholds.maxEntryCount)})`,
        'ZIP_TOO_MANY_ENTRIES',
        HttpStatus.BAD_REQUEST,
      );
    }

    const entriesMap = await zip.entries();
    const entries = Object.values(entriesMap);

    validateEntries(entries, thresholds);

    const plan = planExtraction(entries, thresholds, context);
    enforceDeclaredSize(plan.toExtract, thresholds, context);

    ensureDirectoryExists(destDir);

    const extracted = await extractPlannedEntries(
      zip,
      plan.toExtract,
      destDir,
      thresholds,
      context,
    );
    return {
      entries: extracted.entries,
      skippedEntries: [...plan.skipped, ...extracted.skipped],
      totalExtractedBytes: extracted.totalBytes,
      fileEntryCount: plan.fileEntryCount,
      encryptedEntryCount: plan.encryptedEntryCount,
    };
  } finally {
    try {
      await zip.close();
    } catch (closeError: unknown) {
      logger.warn(
        `validateAndExtractZip: failed to close zip — ${closeError instanceof Error ? closeError.message : 'unknown'}`,
      );
    }
  }
}

/**
 * Creates (if needed) and returns the temporary directory one archive is
 * extracted into. Extracted bytes are copied to persistent storage before this
 * directory is removed, so nothing in it outlives the expansion.
 */
export function prepareExtractionDir(root: string, archiveFileId: string): string {
  const dir = path.join(root, archiveFileId);
  ensureDirectoryExists(dir);
  return dir;
}

/**
 * Removes a temporary extraction directory. Never throws: it runs in a
 * `finally`, and a failed cleanup must not mask the expansion's own outcome.
 */
export function removeExtractionDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    logger.debug(`removeExtractionDir: removed ${dir}`);
  } catch (error: unknown) {
    logger.warn(
      `removeExtractionDir: could not remove ${dir} — ${error instanceof Error ? error.message : 'unknown'}`,
    );
  }
}

/** Forward-slash relative path of an entry, as the archive names it. */
export function toArchivePath(rawName: string): string {
  return rawName.replaceAll('\\', '/');
}

/**
 * Pre-extraction validation pass. Any hit rejects the WHOLE archive:
 * - an entry whose path contains traversal/null/absolute markers
 * - an entry with a suspicious compression ratio (zip-bomb)
 */
function validateEntries(
  entries: ReadonlyArray<ArchiveEntryHeader>,
  thresholds: ZipExtractionThresholds,
): void {
  for (const entry of entries) {
    rejectUnsafePath(entry.name);
    rejectBombRatio(entry, thresholds);
  }
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
      'ZIP_PATH_TRAVERSAL',
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
      'ZIP_BOMB_RATIO',
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Sorts entries into "extract" and "skip", from the central directory alone.
 *
 * Encrypted entries are detected here, up front, rather than by catching
 * node-stream-zip's 'Entry encrypted' mid-extraction — that throw used to fail
 * the whole archive with a generic ZIP_EXPANSION_FAILED. A nested archive at the
 * depth limit is skipped rather than fatal: the rest of the archive is still
 * worth delivering.
 */
function planExtraction(
  entries: ReadonlyArray<ArchiveEntryHeader>,
  thresholds: ZipExtractionThresholds,
  context: ZipExtractionContext,
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
    const status = skipReason(entry, thresholds, context);
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
): ArchiveEntryStatus | null {
  // Password support is a later batch; until then an encrypted entry is
  // reported, never attempted.
  if (entry.encrypted) {
    return ArchiveEntryStatus.SKIPPED_ENCRYPTED;
  }
  if (isNestedArchive(entry.name) && context.depth >= thresholds.maxNestingDepth) {
    return ArchiveEntryStatus.SKIPPED_NESTING_DEPTH;
  }
  return entry.size > ZIP_MAX_ENTRY_BYTES ? ArchiveEntryStatus.SKIPPED_TOO_LARGE : null;
}

function isNestedArchive(rawName: string): boolean {
  return rawName.toLowerCase().endsWith(NESTED_ARCHIVE_EXTENSION);
}

/**
 * The size cap for this archive: the per-archive cap, or what is left of the
 * budget shared across nested levels, whichever is smaller.
 */
function effectiveCapBytes(
  thresholds: ZipExtractionThresholds,
  context: ZipExtractionContext,
): number {
  return Math.min(
    thresholds.maxExtractedSizeMb * BYTES_PER_MEGABYTE,
    context.budget.remainingBytes,
  );
}

function sizeCapException(
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
function enforceDeclaredSize(
  entries: ReadonlyArray<ArchiveEntryHeader>,
  thresholds: ZipExtractionThresholds,
  context: ZipExtractionContext,
): void {
  const declared = entries.reduce((sum, entry) => sum + entry.size, 0);
  const cap = effectiveCapBytes(thresholds, context);
  if (declared > cap) {
    logger.warn(
      `enforceDeclaredSize: declared=${String(declared)} exceeds cap=${String(cap)} depth=${String(context.depth)}`,
    );
    throw sizeCapException(thresholds, context, cap);
  }
}

async function extractPlannedEntries(
  zip: StreamZip.StreamZipAsync,
  entries: ReadonlyArray<ArchiveEntryHeader>,
  destDir: string,
  thresholds: ZipExtractionThresholds,
  context: ZipExtractionContext,
): Promise<ArchiveExtractionOutput> {
  const cap = effectiveCapBytes(thresholds, context);
  const output: ArchiveExtractionOutput = { entries: [], skipped: [], totalBytes: 0 };

  for (const entry of entries) {
    const outPath = resolveSafeOutputPath(destDir, entry.name);
    ensureDirectoryExists(path.dirname(outPath));

    const data = await zip.entryData(entry.name);
    const archivePath = toArchivePath(entry.name);
    // The declared size was within the per-entry cap; the real one may not be.
    if (data.length > ZIP_MAX_ENTRY_BYTES) {
      output.skipped.push({
        archivePath,
        sizeBytes: data.length,
        status: ArchiveEntryStatus.SKIPPED_TOO_LARGE,
      });
      continue;
    }
    output.totalBytes += data.length;
    context.budget.remainingBytes -= data.length;
    if (output.totalBytes > cap) {
      logger.warn(
        `extractPlannedEntries: totalBytes=${String(output.totalBytes)} exceeds cap ${String(cap)}`,
      );
      throw sizeCapException(thresholds, context, cap);
    }

    fs.writeFileSync(outPath, data);
    output.entries.push({
      path: outPath,
      archivePath,
      sizeBytes: data.length,
      mimeType: detectMimeFromName(entry.name),
    });
  }

  logger.debug(
    `extractPlannedEntries: wrote ${String(output.entries.length)} entries totalBytes=${String(output.totalBytes)}`,
  );
  return output;
}

function resolveSafeOutputPath(destDir: string, rawName: string): string {
  const normalizedRoot = path.resolve(destDir);
  const resolved = path.resolve(normalizedRoot, rawName);
  if (!resolved.startsWith(normalizedRoot + path.sep) && resolved !== normalizedRoot) {
    logger.error(`resolveSafeOutputPath: resolved="${resolved}" outside root="${normalizedRoot}"`);
    throw new BusinessException(
      `Archive entry path "${rawName}" resolves outside destination`,
      'ZIP_PATH_TRAVERSAL',
      HttpStatus.BAD_REQUEST,
    );
  }
  return resolved;
}

function ensureDirectoryExists(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function detectMimeFromName(name: string): string {
  const dotIdx = name.lastIndexOf('.');
  if (dotIdx < 0 || dotIdx === name.length - 1) {
    return DEFAULT_EXTRACTED_MIME_TYPE;
  }
  const ext = name.slice(dotIdx + 1).toLowerCase();
  return EXTENSION_TO_MIME[ext] ?? DEFAULT_EXTRACTED_MIME_TYPE;
}
