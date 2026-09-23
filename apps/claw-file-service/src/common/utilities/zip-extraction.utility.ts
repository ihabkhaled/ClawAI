import * as fs from 'node:fs';
import * as path from 'node:path';
import { Logger } from '@nestjs/common';
import StreamZip from 'node-stream-zip';
import { ArchiveEntryStatus } from '../enums/archive-entry-status.enum';
import {
  POSIX_FILE_TYPE_MASK,
  POSIX_SYMLINK_BITS,
  ZIP_MAX_ENTRY_BYTES,
  ZIP_ORDINARY_FILE_TYPES,
  ZIP_UNIX_MODE_SHIFT,
} from '../../modules/files/constants/zip-expansion.constants';
import {
  detectMimeFromName,
  effectiveCapBytes,
  enforceDeclaredSize,
  ensureDirectoryExists,
  planExtraction,
  rejectTooManyEntries,
  resolveSafeOutputPath,
  sizeCapException,
  toArchivePath,
  validateEntries,
} from './archive-policy.utility';
import type {
  ArchiveEntryHeader,
  ArchiveExtractionOutput,
  ZipExtractionContext,
  ZipExtractionResult,
  ZipExtractionThresholds,
} from '../../modules/files/types/zip-expansion.types';

const logger = new Logger('ZipExtractionUtility');

export { toArchivePath } from './archive-policy.utility';

/**
 * Validates an archive against bomb / traversal / size thresholds, then
 * extracts every entry that may be extracted to {@link destDir}. Pure async
 * function — no service dependencies — so it can be exercised in isolation.
 *
 * Throws {@link BusinessException} on a policy violation that makes the WHOLE
 * archive untrustworthy (traversal, ratio bomb, entry count, size cap). Entries
 * that are merely unusable are skipped and reported in `skippedEntries`:
 * - password-protected entries (`ARCHIVE_ENCRYPTED`; password support is batch A3)
 * - nested archives at the `maxNestingDepth` limit
 * - entries larger than a single upload may be
 *
 * The size cap is the smaller of the per-archive cap and what is left of
 * `context.budget`, which every level of a nested expansion shares. The rules
 * themselves live in `archive-policy.utility.ts`, shared with the 7-Zip engine.
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
    rejectTooManyEntries(await zip.entriesCount, thresholds);

    const entriesMap = await zip.entries();
    const entries = Object.values(entriesMap).map((entry) => toZipEntryHeader(entry));

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
 * The policy's view of one central-directory entry. A ZIP written on Unix keeps
 * the entry's POSIX mode in the high 16 bits of its external attributes; a
 * symlink or device node is marked so the policy skips it like a tar's. A ZIP
 * from Windows carries no mode there (the type bits are 0) and is unaffected.
 */
export function toZipEntryHeader(entry: StreamZip.ZipEntry): ArchiveEntryHeader {
  const fileType = (entry.attr >>> ZIP_UNIX_MODE_SHIFT) & POSIX_FILE_TYPE_MASK;
  const isUnixSpecial =
    !entry.isDirectory && !ZIP_ORDINARY_FILE_TYPES.has(fileType) && fileType !== POSIX_SYMLINK_BITS;
  return {
    name: entry.name,
    isDirectory: entry.isDirectory,
    compressedSize: entry.compressedSize,
    size: entry.size,
    encrypted: entry.encrypted,
    isLink: !entry.isDirectory && fileType === POSIX_SYMLINK_BITS,
    isSpecialFile: isUnixSpecial,
  };
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
