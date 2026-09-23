import * as fs from 'node:fs';
import { HttpStatus, Logger } from '@nestjs/common';
import { BusinessException } from '../errors/business.exception';
import { ArchiveEntryStatus } from '../enums/archive-entry-status.enum';
import { ArchiveFormat } from '../enums/archive-format.enum';
import {
  SEVEN_ZIP_EXIT_WARNING,
  SEVEN_ZIP_LISTING_BASE_BYTES,
  SEVEN_ZIP_LISTING_BYTES_PER_ENTRY,
  STREAM_PAYLOAD_SUFFIX,
} from '../../modules/files/constants/archive-formats.constants';
import {
  ARCHIVE_ENCRYPTED_ERROR_CODE,
  ZIP_BOMB_RATIO_ERROR_CODE,
  ZIP_EXPANSION_FAILED_ERROR_CODE,
  ZIP_MAX_ENTRY_BYTES,
  ZIP_TOO_MANY_ENTRIES_ERROR_CODE,
} from '../../modules/files/constants/zip-expansion.constants';
import {
  detectMimeFromName,
  effectiveCapBytes,
  enforceDeclaredSize,
  ensureDirectoryExists,
  planExtraction,
  rejectArchiveBombRatio,
  rejectTooManyEntries,
  resolveSafeOutputPath,
  sizeCapException,
  sumDeclaredBytes,
  toArchivePath,
  validateEntries,
} from './archive-policy.utility';
import { isStreamCodec, readArchiveFormat, streamMemberName } from './archive-format.utility';
import { parseSevenZipListing } from './archive-listing.utility';
import {
  extractSevenZipEntries,
  listSevenZipArchive,
  streamSevenZipPayload,
} from './seven-zip.utility';
import type {
  ArchiveExtractionOptions,
  ContainerArchiveSource,
  SevenZipRunOutcome,
} from '../../modules/files/types/archive-engine.types';
import type {
  ArchiveEntryHeader,
  ArchiveExtractionOutput,
  ZipExtractionContext,
  ZipExtractionResult,
  ZipExtractionThresholds,
} from '../../modules/files/types/zip-expansion.types';

const logger = new Logger('SevenZipExtraction');

// 7z, RAR, tar, and gzip/bzip2/xz, held to the same policy as a ZIP
// (archive-policy.utility.ts). The order of operations is the guarantee:
//
//   list (bounded) → validate every entry → plan → check declared sizes and the
//   whole-archive ratio → extract ONLY the planned names → measure what landed.
//
// Nothing is extracted before the listing has been judged. 7-Zip's decoders
// stop at the unpacked size an entry declares, so a checked declaration bounds
// the write; the post-extraction measurement is the backstop, not the gate.

/** Opens a non-ZIP archive with 7-Zip. The caller has sniffed `format` from the bytes. */
export async function extractWithSevenZip(
  archivePath: string,
  format: ArchiveFormat,
  destDir: string,
  thresholds: ZipExtractionThresholds,
  context: ZipExtractionContext,
  options: ArchiveExtractionOptions,
): Promise<ZipExtractionResult> {
  const compressedBytes = fs.statSync(archivePath).size;
  logger.debug(
    `extractWithSevenZip: format=${format} bytes=${String(compressedBytes)} depth=${String(context.depth)} remainingBytes=${String(context.budget.remainingBytes)}`,
  );
  return isStreamCodec(format)
    ? extractStreamArchive(
        { archivePath, format, compressedBytes },
        destDir,
        thresholds,
        context,
        options,
      )
    : extractContainerArchive(
        { archivePath, format, compressedBytes },
        destDir,
        thresholds,
        context,
        options.password,
      );
}

async function extractContainerArchive(
  source: ContainerArchiveSource,
  destDir: string,
  thresholds: ZipExtractionThresholds,
  context: ZipExtractionContext,
  password: string | undefined,
): Promise<ZipExtractionResult> {
  const entries = await listEntries(source, thresholds, password);
  rejectTooManyEntries(entries.length, thresholds);
  validateEntries(entries, thresholds);

  const plan = planExtraction(entries, thresholds, context);
  enforceDeclaredSize(plan.toExtract, thresholds, context);
  rejectArchiveBombRatio(sumDeclaredBytes(plan.toExtract), source.compressedBytes, thresholds);

  ensureDirectoryExists(destDir);
  if (plan.toExtract.length > 0) {
    const outcome = await extractSevenZipEntries({
      archivePath: source.archivePath,
      format: source.format,
      destDir,
      entryNames: plan.toExtract.map((entry) => entry.name),
      password,
    });
    rejectFailedRun(outcome, 'extract');
  }

  const collected = collectExtractedEntries(plan.toExtract, destDir, thresholds, context);
  return {
    entries: collected.entries,
    skippedEntries: [...plan.skipped, ...collected.skipped],
    totalExtractedBytes: collected.totalBytes,
    fileEntryCount: plan.fileEntryCount,
    encryptedEntryCount: plan.encryptedEntryCount,
  };
}

async function listEntries(
  source: ContainerArchiveSource,
  thresholds: ZipExtractionThresholds,
  password: string | undefined,
): Promise<ArchiveEntryHeader[]> {
  const listing = await listSevenZipArchive({
    archivePath: source.archivePath,
    format: source.format,
    password,
    maxOutputBytes:
      SEVEN_ZIP_LISTING_BASE_BYTES + thresholds.maxEntryCount * SEVEN_ZIP_LISTING_BYTES_PER_ENTRY,
  });
  if (listing.passwordRequired) {
    throw new BusinessException(
      'The archive encrypts its own file list, so nothing in it can be read without the password',
      ARCHIVE_ENCRYPTED_ERROR_CODE,
      HttpStatus.BAD_REQUEST,
    );
  }
  if (listing.outputLimitReached) {
    throw new BusinessException(
      `Archive lists more than ${String(thresholds.maxEntryCount)} entries`,
      ZIP_TOO_MANY_ENTRIES_ERROR_CODE,
      HttpStatus.BAD_REQUEST,
    );
  }
  rejectFailedRun(listing, 'list');
  return parseSevenZipListing(listing.text, source.format);
}

// A warning (exit 1) is not fatal; anything worse, or an engine that threw, is.
// The engine's stderr names the mount path and storage name, so it goes to the
// log and not into the error a user or a model is shown.
function rejectFailedRun(outcome: SevenZipRunOutcome, step: string): void {
  if (outcome.exitCode !== null && outcome.exitCode <= SEVEN_ZIP_EXIT_WARNING) {
    return;
  }
  logger.warn(
    `rejectFailedRun: ${step} failed exit=${String(outcome.exitCode)} stderr=${outcome.stderr.trim().slice(0, 300)}`,
  );
  throw new BusinessException(
    `The archive could not be read (${step} failed${outcome.exitCode === null ? '' : `, 7-Zip exit ${String(outcome.exitCode)}`})`,
    ZIP_EXPANSION_FAILED_ERROR_CODE,
    HttpStatus.BAD_REQUEST,
  );
}

/**
 * Measures what 7-Zip actually wrote for each planned entry and applies the same
 * per-entry and running caps the ZIP extractor applies while writing.
 */
function collectExtractedEntries(
  planned: ReadonlyArray<ArchiveEntryHeader>,
  destDir: string,
  thresholds: ZipExtractionThresholds,
  context: ZipExtractionContext,
): ArchiveExtractionOutput {
  const cap = effectiveCapBytes(thresholds, context);
  const output: ArchiveExtractionOutput = { entries: [], skipped: [], totalBytes: 0 };
  const seen = new Set<string>();
  for (const entry of planned) {
    const outPath = resolveSafeOutputPath(destDir, entry.name);
    if (seen.has(outPath)) {
      // A tar may carry one path twice; the later copy overwrote the earlier.
      continue;
    }
    seen.add(outPath);
    const archivePath = toArchivePath(entry.name);
    const sizeBytes = regularFileSize(outPath);
    const skipStatus = collectedSkipStatus(entry, sizeBytes);
    if (skipStatus !== null) {
      fs.rmSync(outPath, { force: true });
      output.skipped.push({ archivePath, sizeBytes: sizeBytes ?? entry.size, status: skipStatus });
      continue;
    }
    const actualBytes = sizeBytes ?? 0;
    output.totalBytes += actualBytes;
    context.budget.remainingBytes -= actualBytes;
    if (output.totalBytes > cap) {
      throw sizeCapException(thresholds, context, cap);
    }
    output.entries.push({
      path: outPath,
      archivePath,
      sizeBytes: actualBytes,
      mimeType: detectMimeFromName(entry.name),
    });
  }
  return output;
}

function collectedSkipStatus(
  entry: ArchiveEntryHeader,
  sizeBytes: number | null,
): ArchiveEntryStatus | null {
  if (sizeBytes === null) {
    // Listed but not produced: a corrupt member, or a name 7-Zip printed with
    // its control characters replaced, so the list file named nothing real.
    return ArchiveEntryStatus.UNREADABLE;
  }
  if (sizeBytes > entry.size) {
    logger.warn(
      `collectedSkipStatus: "${entry.name}" wrote ${String(sizeBytes)} bytes but declared ${String(entry.size)}`,
    );
    throw new BusinessException(
      `Archive entry "${entry.name}" inflated past its declared size`,
      ZIP_BOMB_RATIO_ERROR_CODE,
      HttpStatus.BAD_REQUEST,
    );
  }
  return sizeBytes > ZIP_MAX_ENTRY_BYTES ? ArchiveEntryStatus.SKIPPED_TOO_LARGE : null;
}

// lstat, not stat: a link 7-Zip created despite the plan is not followed.
function regularFileSize(filePath: string): number | null {
  try {
    const stat = fs.lstatSync(filePath);
    return stat.isFile() ? stat.size : null;
  } catch {
    return null;
  }
}

/**
 * gzip, bzip2, xz: decompress to a sibling payload file, bounded by the size
 * cap AND the compression ratio (neither codec's own size field can be
 * trusted), then treat the payload as a tar if it is one, or as the single
 * member otherwise.
 */
async function extractStreamArchive(
  source: ContainerArchiveSource,
  destDir: string,
  thresholds: ZipExtractionThresholds,
  context: ZipExtractionContext,
  options: ArchiveExtractionOptions,
): Promise<ZipExtractionResult> {
  const cap = effectiveCapBytes(thresholds, context);
  const ratioLimit = source.compressedBytes * thresholds.compressionRatioThreshold;
  const payloadPath = `${destDir}${STREAM_PAYLOAD_SUFFIX}`;
  try {
    const outcome = await streamSevenZipPayload({
      archivePath: source.archivePath,
      format: source.format,
      outPath: payloadPath,
      maxBytes: Math.min(cap, ratioLimit),
      password: options.password,
    });
    if (outcome.limitExceeded) {
      throw ratioLimit < cap
        ? streamRatioException(source.compressedBytes, thresholds)
        : sizeCapException(thresholds, context, cap);
    }
    rejectFailedRun(outcome, 'decompress');
    return readArchiveFormat(payloadPath) === ArchiveFormat.TAR
      ? await extractContainerArchive(
          { ...source, archivePath: payloadPath, format: ArchiveFormat.TAR },
          destDir,
          thresholds,
          context,
          options.password,
        )
      : placeStreamMember(
          source,
          payloadPath,
          outcome.bytesWritten,
          destDir,
          thresholds,
          context,
          options,
        );
  } finally {
    fs.rmSync(payloadPath, { force: true });
  }
}

function placeStreamMember(
  source: ContainerArchiveSource,
  payloadPath: string,
  sizeBytes: number,
  destDir: string,
  thresholds: ZipExtractionThresholds,
  context: ZipExtractionContext,
  options: ArchiveExtractionOptions,
): ZipExtractionResult {
  const name = streamMemberName(options.archiveFilename);
  const header: ArchiveEntryHeader = {
    name,
    isDirectory: false,
    compressedSize: source.compressedBytes,
    size: sizeBytes,
    encrypted: false,
  };
  // The same plan a listed entry gets: too large, or an archive at the depth
  // limit, is skipped and reported rather than delivered.
  const plan = planExtraction([header], thresholds, context);
  const result: ZipExtractionResult = {
    entries: [],
    skippedEntries: plan.skipped,
    totalExtractedBytes: 0,
    fileEntryCount: plan.fileEntryCount,
    encryptedEntryCount: 0,
  };
  if (plan.toExtract.length === 0) {
    return result;
  }
  ensureDirectoryExists(destDir);
  const outPath = resolveSafeOutputPath(destDir, name);
  fs.renameSync(payloadPath, outPath);
  context.budget.remainingBytes -= sizeBytes;
  result.totalExtractedBytes = sizeBytes;
  result.entries.push({
    path: outPath,
    archivePath: toArchivePath(name),
    sizeBytes,
    mimeType: detectMimeFromName(name),
  });
  return result;
}

function streamRatioException(
  compressedBytes: number,
  thresholds: ZipExtractionThresholds,
): BusinessException {
  return new BusinessException(
    `Compressed stream of ${String(compressedBytes)} bytes inflates past the ${String(thresholds.compressionRatioThreshold)}:1 ratio limit`,
    ZIP_BOMB_RATIO_ERROR_CODE,
    HttpStatus.BAD_REQUEST,
  );
}
