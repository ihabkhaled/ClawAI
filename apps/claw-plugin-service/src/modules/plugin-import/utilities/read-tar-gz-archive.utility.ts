import { gunzipSync } from 'node:zlib';

import { ImportErrorCode } from '../../../common/enums/import-error-code.enum';
import {
  RATIO_FLOOR_BYTES,
  TAR_BLANK_CHECKSUM_BYTE,
  TAR_BLOCK,
  TAR_CHECKSUM_AT,
  TAR_CHECKSUM_LENGTH,
  TAR_MAGIC_AT,
  TAR_MAGIC_LENGTH,
  TAR_MAX_EXTENDED_NAME_BYTES,
  TAR_NAME_AT,
  TAR_NAME_LENGTH,
  TAR_OCTAL_PATTERN,
  TAR_PAX_PATH_PATTERN,
  TAR_PREFIX_AT,
  TAR_PREFIX_LENGTH,
  TAR_SIZE_AT,
  TAR_SIZE_LENGTH,
  TAR_TRAILING_NULS,
  TAR_TYPE_AT,
  TAR_TYPE_DIRECTORY,
  TAR_TYPE_FILE,
  TAR_TYPE_GNU_LONG_NAME,
  TAR_TYPE_LINKS,
  TAR_TYPE_PAX,
  TAR_TYPE_PAX_GLOBAL,
} from '../constants/archive-format.constants';
import { IMPORT_LIMITS, LINE_BREAK } from '../constants/plugin-import.constants';
import { PluginImportError } from '../errors/plugin-import.error';
import { type ArchiveReadResult, type KeepPredicate } from '../types/plugin-import.types';
import { ArchiveEntryRegistry } from './archive-entry-registry.utility';

function corrupt(reason: string): never {
  throw new PluginImportError(ImportErrorCode.ARCHIVE_CORRUPT, `tar: ${reason}`);
}

function readText(block: Buffer, at: number, length: number): string {
  const raw = block.subarray(at, at + length);
  const end = raw.indexOf(0);
  const bytes = end === -1 ? raw : raw.subarray(0, end);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new PluginImportError(ImportErrorCode.NON_UTF8, 'an entry name is not valid UTF-8');
  }
}

function readOctal(block: Buffer, at: number, length: number): number {
  const text = block
    .subarray(at, at + length)
    .toString('latin1')
    .replace(TAR_TRAILING_NULS, '')
    .trim();
  if (!TAR_OCTAL_PATTERN.test(text)) corrupt('bad number in header');
  return Number.parseInt(text, 8);
}

function verifyChecksum(block: Buffer): void {
  let sum = 0;
  for (let index = 0; index < TAR_BLOCK; index += 1) {
    const inChecksum = index >= TAR_CHECKSUM_AT && index < TAR_CHECKSUM_AT + TAR_CHECKSUM_LENGTH;
    sum += inChecksum ? TAR_BLANK_CHECKSUM_BYTE : (block.at(index) ?? 0);
  }
  if (sum !== readOctal(block, TAR_CHECKSUM_AT, TAR_CHECKSUM_LENGTH)) {
    corrupt('header checksum mismatch');
  }
}

function paxPath(data: Buffer): string | undefined {
  for (const line of data.toString('utf8').split(LINE_BREAK)) {
    const match = TAR_PAX_PATH_PATTERN.exec(line);
    if (match?.[1] !== undefined) return match[1];
  }
  return undefined;
}

function entryName(header: Buffer, pending: string | undefined): string {
  if (pending !== undefined) return pending;
  const hasPrefix = readText(header, TAR_MAGIC_AT, TAR_MAGIC_LENGTH) === 'ustar';
  const prefix = hasPrefix ? readText(header, TAR_PREFIX_AT, TAR_PREFIX_LENGTH) : '';
  const base = readText(header, TAR_NAME_AT, TAR_NAME_LENGTH);
  return prefix === '' ? base : `${prefix}/${base}`;
}

function inflateTar(buffer: Buffer): Buffer {
  const overhead = TAR_BLOCK * (IMPORT_LIMITS.maxEntries * 2 + 2);
  let tar: Buffer;
  try {
    tar = gunzipSync(buffer, { maxOutputLength: IMPORT_LIMITS.maxUnpackedBytes + overhead });
  } catch {
    throw new PluginImportError(
      ImportErrorCode.ARCHIVE_BOMB,
      'archive is damaged or inflates beyond the allowed size',
    );
  }
  if (
    tar.length > RATIO_FLOOR_BYTES &&
    tar.length > buffer.length * IMPORT_LIMITS.maxCompressionRatio
  ) {
    throw new PluginImportError(ImportErrorCode.ARCHIVE_BOMB, 'compression ratio is too high');
  }
  return tar;
}

/**
 * Reads a .tgz fully in memory. The gunzip output is capped (a bomb stops at the cap, never at memory),
 * the ratio is checked, every header checksum is verified, and links, devices and special files are
 * refused. Names go through the same path rules as zip entries.
 */
export function readTarGzArchive(buffer: Buffer, keep: KeepPredicate): ArchiveReadResult {
  const tar = inflateTar(buffer);
  const registry = new ArchiveEntryRegistry(keep);
  let at = 0;
  let pendingName: string | undefined;
  while (at + TAR_BLOCK <= tar.length) {
    const header = tar.subarray(at, at + TAR_BLOCK);
    if (header.every((byte) => byte === 0)) break;
    verifyChecksum(header);
    const type = String.fromCodePoint(header.at(TAR_TYPE_AT) ?? 0);
    const size = readOctal(header, TAR_SIZE_AT, TAR_SIZE_LENGTH);
    const dataStart = at + TAR_BLOCK;
    const dataEnd = dataStart + size;
    if (dataEnd > tar.length) corrupt('entry runs past the archive');
    const next = dataStart + Math.ceil(size / TAR_BLOCK) * TAR_BLOCK;
    if (type === TAR_TYPE_PAX || type === TAR_TYPE_GNU_LONG_NAME || type === TAR_TYPE_PAX_GLOBAL) {
      if (size > TAR_MAX_EXTENDED_NAME_BYTES) corrupt('oversized extended header');
      const data = tar.subarray(dataStart, dataEnd);
      if (type === TAR_TYPE_PAX) pendingName = paxPath(data) ?? pendingName;
      if (type === TAR_TYPE_GNU_LONG_NAME) {
        pendingName = data.toString('utf8').replace(TAR_TRAILING_NULS, '');
      }
      at = next;
      continue;
    }
    registry.countEntry();
    if (TAR_TYPE_LINKS.has(type)) {
      throw new PluginImportError(ImportErrorCode.SYMLINK_REJECTED, 'a link entry');
    }
    const isFile = TAR_TYPE_FILE.has(type);
    if (!isFile && type !== TAR_TYPE_DIRECTORY) {
      throw new PluginImportError(ImportErrorCode.ARCHIVE_UNSUPPORTED, 'a special file entry');
    }
    const name = entryName(header, pendingName);
    pendingName = undefined;
    if (isFile) {
      const { path, wanted } = registry.registerFile(name, size);
      if (wanted) {
        registry.addKept({ path, content: Buffer.from(tar.subarray(dataStart, dataEnd)) });
      }
    }
    at = next;
  }
  return registry.result();
}
