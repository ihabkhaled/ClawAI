import * as fs from 'node:fs';
import * as path from 'node:path';
import { HttpStatus, Logger } from '@nestjs/common';
import StreamZip from 'node-stream-zip';
import { BusinessException } from '../errors/business.exception';
import {
  DEFAULT_EXTRACTED_MIME_TYPE,
  EXTENSION_TO_MIME,
} from '../../modules/files/constants/zip-expansion.constants';
import type {
  ExtractedEntry,
  ZipExtractionResult,
  ZipExtractionThresholds,
} from '../../modules/files/types/zip-expansion.types';

const logger = new Logger('ZipExtractionUtility');

/**
 * Validates an archive against bomb / traversal / nesting thresholds, then
 * extracts every safe entry to {@link destDir}. Pure async function — no
 * service dependencies — so it can be exercised in isolation by unit tests.
 *
 * Throws {@link BusinessException} on the FIRST policy violation. The caller
 * is responsible for surfacing failures (FILE_FAILED event, etc.).
 */
export async function validateAndExtractZip(
  zipPath: string,
  destDir: string,
  thresholds: ZipExtractionThresholds,
): Promise<ZipExtractionResult> {
  logger.debug(
    `validateAndExtractZip: zipPath=${zipPath} destDir=${destDir} thresholds=${JSON.stringify(thresholds)}`,
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

    ensureDirectoryExists(destDir);

    const extracted = await extractSafeEntries(zip, entries, destDir, thresholds);
    return extracted;
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
 * Pre-extraction validation pass:
 * - rejects any entry whose path contains traversal/null/absolute markers
 * - rejects any entry with suspicious compression ratio (zip-bomb)
 * - rejects nested .zip entries when nesting depth limit is 1 (defensive)
 */
function validateEntries(
  entries: ReadonlyArray<{
    name: string;
    isDirectory: boolean;
    compressedSize: number;
    size: number;
  }>,
  thresholds: ZipExtractionThresholds,
): void {
  for (const entry of entries) {
    rejectUnsafePath(entry.name);
    rejectBombRatio(entry, thresholds);
    rejectExcessiveNesting(entry.name, thresholds);
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

function rejectBombRatio(
  entry: { name: string; isDirectory: boolean; compressedSize: number; size: number },
  thresholds: ZipExtractionThresholds,
): void {
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

function rejectExcessiveNesting(rawName: string, thresholds: ZipExtractionThresholds): void {
  if (!rawName.toLowerCase().endsWith('.zip')) {
    return;
  }
  // Slice C policy: we only expand the OUTER archive. Any inner .zip is
  // counted against the nesting depth — if the limit has been reached
  // (depth=1), we reject. Future work can recurse properly; for now we
  // refuse to onboard a second level so a bomb cannot hide one layer deep.
  if (thresholds.maxNestingDepth <= 1) {
    logger.warn(`rejectExcessiveNesting: nested archive blocked — "${rawName}"`);
    throw new BusinessException(
      `Archive contains a nested archive "${rawName}" beyond depth limit`,
      'ZIP_NESTING_TOO_DEEP',
      HttpStatus.BAD_REQUEST,
    );
  }
}

async function extractSafeEntries(
  zip: StreamZip.StreamZipAsync,
  entries: ReadonlyArray<{ name: string; isDirectory: boolean; size: number }>,
  destDir: string,
  thresholds: ZipExtractionThresholds,
): Promise<ZipExtractionResult> {
  const maxBytes = thresholds.maxExtractedSizeMb * 1024 * 1024;
  const extracted: ExtractedEntry[] = [];
  let totalBytes = 0;

  for (const entry of entries) {
    if (entry.isDirectory) {
      continue;
    }
    const outPath = resolveSafeOutputPath(destDir, entry.name);
    ensureDirectoryExists(path.dirname(outPath));

    const data = await zip.entryData(entry.name);
    totalBytes += data.length;
    if (totalBytes > maxBytes) {
      logger.warn(
        `extractSafeEntries: totalBytes=${String(totalBytes)} exceeds cap ${String(maxBytes)}`,
      );
      throw new BusinessException(
        `Archive expansion exceeds size cap ${String(thresholds.maxExtractedSizeMb)}MB`,
        'ZIP_BOMB_RATIO',
        HttpStatus.BAD_REQUEST,
      );
    }

    fs.writeFileSync(outPath, data);
    extracted.push({
      path: outPath,
      sizeBytes: data.length,
      mimeType: detectMimeFromName(entry.name),
    });
  }

  logger.debug(
    `extractSafeEntries: wrote ${String(extracted.length)} entries totalBytes=${String(totalBytes)}`,
  );
  return { entries: extracted, totalExtractedBytes: totalBytes };
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
