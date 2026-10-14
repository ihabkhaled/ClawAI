import { crc32, inflateRawSync } from 'node:zlib';

import { ImportErrorCode } from '../../../common/enums/import-error-code.enum';
import {
  RATIO_FLOOR_BYTES,
  ZIP64_MARKER,
  ZIP_CENTRAL_FIXED,
  ZIP_CENTRAL_SIGNATURE,
  ZIP_COUNT_MARKER,
  ZIP_EOCD_MIN,
  ZIP_EOCD_SIGNATURE,
  ZIP_FLAG_ENCRYPTED,
  ZIP_LOCAL_FIXED,
  ZIP_LOCAL_SIGNATURE,
  ZIP_MAX_COMMENT,
  ZIP_METHOD_DEFLATE,
  ZIP_METHOD_STORE,
  ZIP_MODE_DIRECTORY,
  ZIP_MODE_REGULAR,
  ZIP_MODE_SYMLINK,
  ZIP_MODE_TYPE_MASK,
  ZIP_UNIX_HOST,
} from '../constants/archive-format.constants';
import { IMPORT_LIMITS } from '../constants/plugin-import.constants';
import { PluginImportError } from '../errors/plugin-import.error';
import {
  type ArchiveReadResult,
  type KeepPredicate,
  type ZipCentralEntry,
} from '../types/plugin-import.types';
import { ArchiveEntryRegistry } from './archive-entry-registry.utility';

function corrupt(reason: string): never {
  throw new PluginImportError(ImportErrorCode.ARCHIVE_CORRUPT, `zip: ${reason}`);
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const lowest = Math.max(0, buffer.length - ZIP_EOCD_MIN - ZIP_MAX_COMMENT);
  for (let at = buffer.length - ZIP_EOCD_MIN; at >= lowest; at -= 1) {
    if (buffer.readUInt32LE(at) === ZIP_EOCD_SIGNATURE) return at;
  }
  return corrupt('no end-of-central-directory record');
}

function decodeName(bytes: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new PluginImportError(ImportErrorCode.NON_UTF8, 'an entry name is not valid UTF-8');
  }
}

function assertFileType(mode: number): void {
  const type = mode & ZIP_MODE_TYPE_MASK;
  if (type === ZIP_MODE_SYMLINK) {
    throw new PluginImportError(ImportErrorCode.SYMLINK_REJECTED, 'a symbolic link entry');
  }
  if (type !== 0 && type !== ZIP_MODE_REGULAR && type !== ZIP_MODE_DIRECTORY) {
    throw new PluginImportError(ImportErrorCode.ARCHIVE_UNSUPPORTED, 'a special file entry');
  }
}

function readCentralDirectory(buffer: Buffer): ZipCentralEntry[] {
  const eocd = findEndOfCentralDirectory(buffer);
  const total = buffer.readUInt16LE(eocd + 10);
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (
    total === ZIP_COUNT_MARKER ||
    centralSize === ZIP64_MARKER ||
    centralOffset === ZIP64_MARKER
  ) {
    throw new PluginImportError(
      ImportErrorCode.ARCHIVE_UNSUPPORTED,
      'zip64 archives are not supported',
    );
  }
  if (total > IMPORT_LIMITS.maxEntries) {
    throw new PluginImportError(
      ImportErrorCode.ARCHIVE_TOO_MANY_ENTRIES,
      'archive has too many entries',
    );
  }
  if (centralOffset + centralSize > eocd) corrupt('central directory out of range');
  const entries: ZipCentralEntry[] = [];
  let at = centralOffset;
  for (let index = 0; index < total; index += 1) {
    if (at + ZIP_CENTRAL_FIXED > eocd || buffer.readUInt32LE(at) !== ZIP_CENTRAL_SIGNATURE) {
      corrupt('bad central directory entry');
    }
    const versionMadeBy = buffer.readUInt16LE(at + 4);
    const nameLength = buffer.readUInt16LE(at + 28);
    const extraLength = buffer.readUInt16LE(at + 30);
    const commentLength = buffer.readUInt16LE(at + 32);
    const externalAttributes = buffer.readUInt32LE(at + 38);
    const nameEnd = at + ZIP_CENTRAL_FIXED + nameLength;
    if (nameEnd + extraLength + commentLength > eocd) corrupt('entry runs past the directory');
    const name = decodeName(buffer.subarray(at + ZIP_CENTRAL_FIXED, nameEnd));
    const mode = versionMadeBy >> 8 === ZIP_UNIX_HOST ? (externalAttributes >>> 16) & 0xff_ff : 0;
    assertFileType(mode);
    entries.push({
      name,
      flags: buffer.readUInt16LE(at + 8),
      method: buffer.readUInt16LE(at + 10),
      crc: buffer.readUInt32LE(at + 16),
      compressedSize: buffer.readUInt32LE(at + 20),
      size: buffer.readUInt32LE(at + 24),
      localOffset: buffer.readUInt32LE(at + 42),
      isDirectory: name.endsWith('/') || (mode & ZIP_MODE_TYPE_MASK) === ZIP_MODE_DIRECTORY,
    });
    at = nameEnd + extraLength + commentLength;
  }
  return entries;
}

function inflateEntry(
  buffer: Buffer,
  entry: ZipCentralEntry,
  ranges: Array<[number, number]>,
): Buffer {
  const at = entry.localOffset;
  if (at + ZIP_LOCAL_FIXED > buffer.length || buffer.readUInt32LE(at) !== ZIP_LOCAL_SIGNATURE) {
    corrupt('bad local header');
  }
  const nameLength = buffer.readUInt16LE(at + 26);
  const extraLength = buffer.readUInt16LE(at + 28);
  const localName = decodeName(
    buffer.subarray(at + ZIP_LOCAL_FIXED, at + ZIP_LOCAL_FIXED + nameLength),
  );
  if (localName !== entry.name) corrupt('local and central names differ');
  const start = at + ZIP_LOCAL_FIXED + nameLength + extraLength;
  const end = start + entry.compressedSize;
  if (end > buffer.length) corrupt('entry data runs past the file');
  for (const [from, to] of ranges) if (start < to && end > from) corrupt('overlapping entries');
  ranges.push([start, end]);
  const data = buffer.subarray(start, end);
  let content: Buffer;
  if (entry.method === ZIP_METHOD_STORE) {
    if (entry.compressedSize !== entry.size) corrupt('stored entry size mismatch');
    content = Buffer.from(data);
  } else {
    try {
      content = inflateRawSync(data, { maxOutputLength: Math.max(entry.size, 1) });
    } catch {
      throw new PluginImportError(
        ImportErrorCode.ARCHIVE_BOMB,
        'an entry inflates beyond its declared size or is damaged',
      );
    }
  }
  if (content.length !== entry.size || crc32(content) !== entry.crc) {
    corrupt('entry checksum mismatch');
  }
  return content;
}

function assertEntryAllowed(entry: ZipCentralEntry): void {
  if ((entry.flags & ZIP_FLAG_ENCRYPTED) !== 0) {
    throw new PluginImportError(ImportErrorCode.ARCHIVE_ENCRYPTED, 'an entry is encrypted');
  }
  if (entry.method !== ZIP_METHOD_STORE && entry.method !== ZIP_METHOD_DEFLATE) {
    throw new PluginImportError(
      ImportErrorCode.ARCHIVE_UNSUPPORTED,
      'unsupported compression method',
    );
  }
  if (entry.size === ZIP64_MARKER || entry.compressedSize === ZIP64_MARKER) {
    throw new PluginImportError(ImportErrorCode.ARCHIVE_UNSUPPORTED, 'zip64 entry');
  }
  const ratioTooHigh =
    entry.size > RATIO_FLOOR_BYTES &&
    entry.size > Math.max(entry.compressedSize, 1) * IMPORT_LIMITS.maxCompressionRatio;
  if (ratioTooHigh) {
    throw new PluginImportError(ImportErrorCode.ARCHIVE_BOMB, 'compression ratio is too high');
  }
}

/**
 * Reads a .zip fully in memory. Nothing is written to disk. Refused: encrypted entries, zip64,
 * symlinks and special files, unsafe or duplicate names, non-UTF-8 names, too many entries, an entry
 * or the sum above the unpacked caps, a compression ratio above the cap (per entry and overall), an
 * entry that inflates beyond its declared size, overlapping data ranges and checksum mismatches.
 * Only entries the caller wants are inflated.
 */
export function readZipArchive(buffer: Buffer, keep: KeepPredicate): ArchiveReadResult {
  if (buffer.length < ZIP_EOCD_MIN) corrupt('too short');
  const entries = readCentralDirectory(buffer);
  const registry = new ArchiveEntryRegistry(keep);
  const ranges: Array<[number, number]> = [];
  let declaredTotal = 0;
  for (const entry of entries) {
    registry.countEntry();
    if (entry.isDirectory) continue;
    assertEntryAllowed(entry);
    declaredTotal += entry.size;
    const { path, wanted } = registry.registerFile(entry.name, entry.size);
    if (wanted) registry.addKept({ path, content: inflateEntry(buffer, entry, ranges) });
  }
  if (
    declaredTotal > RATIO_FLOOR_BYTES &&
    declaredTotal > buffer.length * IMPORT_LIMITS.maxCompressionRatio
  ) {
    throw new PluginImportError(
      ImportErrorCode.ARCHIVE_BOMB,
      'overall compression ratio is too high',
    );
  }
  return registry.result();
}
