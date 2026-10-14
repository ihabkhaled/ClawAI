import { ImportErrorCode } from '../../../common/enums/import-error-code.enum';
import { GZIP_MAGIC, ZIP_EMPTY_MAGIC, ZIP_MAGIC } from '../constants/archive-format.constants';
import { IMPORT_LIMITS } from '../constants/plugin-import.constants';
import { PluginImportError } from '../errors/plugin-import.error';
import { type ArchiveReadResult, type KeepPredicate } from '../types/plugin-import.types';
import { readTarGzArchive } from './read-tar-gz-archive.utility';
import { readZipArchive } from './read-zip-archive.utility';

function startsWith(buffer: Buffer, magic: readonly number[]): boolean {
  return magic.every((byte, index) => buffer.at(index) === byte);
}

/** Chooses the reader by the file's MAGIC BYTES, never by its name or declared type. */
export function readArchive(buffer: Buffer, keep: KeepPredicate): ArchiveReadResult {
  if (buffer.length === 0) {
    throw new PluginImportError(ImportErrorCode.UPLOAD_MISSING, 'the upload is empty');
  }
  if (buffer.length > IMPORT_LIMITS.maxUploadBytes) {
    throw new PluginImportError(ImportErrorCode.UPLOAD_TOO_LARGE, 'the upload is too large');
  }
  if (startsWith(buffer, ZIP_MAGIC) || startsWith(buffer, ZIP_EMPTY_MAGIC)) {
    return readZipArchive(buffer, keep);
  }
  if (startsWith(buffer, GZIP_MAGIC)) return readTarGzArchive(buffer, keep);
  throw new PluginImportError(
    ImportErrorCode.ARCHIVE_UNSUPPORTED,
    'only .zip and .tgz are accepted',
  );
}
