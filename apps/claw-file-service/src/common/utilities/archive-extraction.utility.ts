import { HttpStatus, Logger } from '@nestjs/common';
import { BusinessException } from '../errors/business.exception';
import { ArchiveFormat } from '../enums/archive-format.enum';
import { ARCHIVE_UNSUPPORTED_FORMAT_ERROR_CODE } from '../../modules/files/constants/archive-formats.constants';
import { readArchiveFormat } from './archive-format.utility';
import { extractWithSevenZip } from './seven-zip-extraction.utility';
import { validateAndExtractZip } from './zip-extraction.utility';
import type { ArchiveExtractionOptions } from '../../modules/files/types/archive-engine.types';
import type {
  ZipExtractionContext,
  ZipExtractionResult,
  ZipExtractionThresholds,
} from '../../modules/files/types/zip-expansion.types';

const logger = new Logger('ArchiveExtraction');

/**
 * Opens any supported archive: validates it against the bomb / traversal /
 * size / depth policy and extracts what may be extracted into `destDir`.
 *
 * The engine is chosen from the file's own bytes. ZIP stays on node-stream-zip,
 * the path batch A1 hardened and tested; 7z, RAR, tar, gzip, bzip2 and xz go
 * through 7-Zip (WASM). Both apply the rules in archive-policy.utility.ts and
 * return the same result shape, so ZipExpansionManager does not know which ran.
 *
 * `options.password` is accepted for batch A3 and reaches the 7-Zip engine
 * only; an encrypted ZIP entry is still reported, not decrypted.
 */
export async function validateAndExtractArchive(
  archivePath: string,
  destDir: string,
  thresholds: ZipExtractionThresholds,
  context: ZipExtractionContext,
  options: ArchiveExtractionOptions,
): Promise<ZipExtractionResult> {
  const format = readArchiveFormat(archivePath);
  logger.debug(
    `validateAndExtractArchive: format=${format ?? 'unknown'} depth=${String(context.depth)}`,
  );
  if (format === null) {
    throw new BusinessException(
      'The file is not an archive this service can open (zip, 7z, rar, tar, gz, bz2, xz)',
      ARCHIVE_UNSUPPORTED_FORMAT_ERROR_CODE,
      HttpStatus.BAD_REQUEST,
    );
  }
  return format === ArchiveFormat.ZIP
    ? validateAndExtractZip(archivePath, destDir, thresholds, context)
    : extractWithSevenZip(archivePath, format, destDir, thresholds, context, options);
}
