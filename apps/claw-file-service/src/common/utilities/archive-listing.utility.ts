import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../errors/business.exception';
import { ArchiveFormat } from '../enums/archive-format.enum';
import {
  ARCHIVE_LISTING_INVALID_ERROR_CODE,
  ATTRIBUTE_DIRECTORY_FLAG,
  LISTING_FLAG_TRUE,
  LISTING_KEY,
  POSIX_DIRECTORY_TYPE,
  POSIX_LINK_TYPE,
  POSIX_MODE_LENGTH,
  POSIX_SPECIAL_TYPES,
  SEVEN_ZIP_LISTING_KEY_SEPARATOR,
  SEVEN_ZIP_LISTING_SEPARATOR,
  TAR_DIRECTORY_TYPEFLAG,
  TAR_LINK_TYPEFLAGS,
  TAR_SPECIAL_TYPEFLAGS,
} from '../../modules/files/constants/archive-formats.constants';
import type { SevenZipListingBlock } from '../../modules/files/types/archive-engine.types';
import type { ArchiveEntryHeader } from '../../modules/files/types/zip-expansion.types';

// Turns `7z l -slt` text into the entry headers the archive policy decides on.
//
// The listing is the ONLY source of truth about what an archive contains before
// a byte is extracted, so it is parsed strictly. 7-Zip already prints control
// characters in names as "_" (a name cannot forge a new line), but a block with
// a repeated key, a line that is not `Key = Value`, or a file with no declared
// size is still refused outright rather than half-understood.

/** Parses every entry block after the separator line. */
export function parseSevenZipListing(text: string, format: ArchiveFormat): ArchiveEntryHeader[] {
  return splitListingBlocks(text).map((block) => toEntryHeader(block, format));
}

function splitListingBlocks(text: string): SevenZipListingBlock[] {
  const lines = text.split('\n').map((line) => (line.endsWith('\r') ? line.slice(0, -1) : line));
  const start = lines.indexOf(SEVEN_ZIP_LISTING_SEPARATOR);
  if (start < 0) {
    return [];
  }
  const blocks: SevenZipListingBlock[] = [];
  let current: Map<string, string> | null = null;
  for (const line of lines.slice(start + 1)) {
    if (line === '') {
      current = null;
      continue;
    }
    if (current === null && !line.startsWith(`${LISTING_KEY.PATH} =`)) {
      // Anything after the last entry block (warnings, summaries) ends the list.
      break;
    }
    if (current === null) {
      current = new Map();
      blocks.push(current);
    }
    addListingLine(current, line);
  }
  return blocks;
}

function addListingLine(block: Map<string, string>, line: string): void {
  const separator = line.indexOf(SEVEN_ZIP_LISTING_KEY_SEPARATOR);
  if (separator <= 0) {
    throw invalidListing(`unexpected line in entry block: "${line.slice(0, 80)}"`);
  }
  const key = line.slice(0, separator);
  const rest = line.slice(separator + SEVEN_ZIP_LISTING_KEY_SEPARATOR.length);
  if (block.has(key)) {
    throw invalidListing(`entry block repeats "${key}"`);
  }
  block.set(key, rest.startsWith(' ') ? rest.slice(1) : rest);
}

function toEntryHeader(block: SevenZipListingBlock, format: ArchiveFormat): ArchiveEntryHeader {
  const name = block.get(LISTING_KEY.PATH) ?? '';
  const posixType = posixTypeOf(block);
  const tarTypeflag = format === ArchiveFormat.TAR ? tarTypeflagOf(block) : '';
  const isDirectory =
    block.get(LISTING_KEY.FOLDER) === LISTING_FLAG_TRUE ||
    firstToken(block.get(LISTING_KEY.ATTRIBUTES)).includes(ATTRIBUTE_DIRECTORY_FLAG) ||
    posixType === POSIX_DIRECTORY_TYPE ||
    tarTypeflag === TAR_DIRECTORY_TYPEFLAG;
  const sizeText = block.get(LISTING_KEY.SIZE) ?? '';
  if (!isDirectory && sizeText === '') {
    throw invalidListing(`entry "${name}" declares no size`);
  }
  return {
    name,
    isDirectory,
    size: parseListingNumber(sizeText, name),
    compressedSize: parseListingNumber(block.get(LISTING_KEY.PACKED_SIZE) ?? '', name),
    encrypted: block.get(LISTING_KEY.ENCRYPTED) === LISTING_FLAG_TRUE,
    isLink:
      hasValue(block, LISTING_KEY.SYMBOLIC_LINK) ||
      hasValue(block, LISTING_KEY.HARD_LINK) ||
      hasValue(block, LISTING_KEY.LINK) ||
      posixType === POSIX_LINK_TYPE ||
      TAR_LINK_TYPEFLAGS.has(tarTypeflag),
    isSpecialFile: POSIX_SPECIAL_TYPES.has(posixType) || TAR_SPECIAL_TYPEFLAGS.has(tarTypeflag),
  };
}

// The POSIX file type is the first character of a 10-character mode string,
// printed as `Mode = lrwxrwxrwx` (tar) or inside `Attributes = A lrwxrwxrwx`.
function posixTypeOf(block: SevenZipListingBlock): string {
  const candidate = [block.get(LISTING_KEY.MODE), block.get(LISTING_KEY.ATTRIBUTES)]
    .flatMap((value) => (value ?? '').split(' '))
    .find((token) => token.length === POSIX_MODE_LENGTH);
  return candidate?.charAt(0) ?? '';
}

// 7-Zip prints a tar entry's typeflag first in `Characteristics = 2 POSIX ASCII`.
function tarTypeflagOf(block: SevenZipListingBlock): string {
  return firstToken(block.get(LISTING_KEY.CHARACTERISTICS));
}

function firstToken(value: string | undefined): string {
  return (value ?? '').split(' ')[0] ?? '';
}

function hasValue(block: SevenZipListingBlock, key: string): boolean {
  return (block.get(key) ?? '') !== '';
}

function parseListingNumber(text: string, entryName: string): number {
  if (text === '') {
    return 0;
  }
  if (!/^\d+$/.test(text)) {
    throw invalidListing(`entry "${entryName}" has a malformed size "${text.slice(0, 40)}"`);
  }
  const value = Number(text);
  if (!Number.isSafeInteger(value)) {
    throw invalidListing(`entry "${entryName}" declares an impossible size`);
  }
  return value;
}

function invalidListing(reason: string): BusinessException {
  return new BusinessException(
    `Archive listing could not be trusted: ${reason}`,
    ARCHIVE_LISTING_INVALID_ERROR_CODE,
    HttpStatus.BAD_REQUEST,
  );
}
