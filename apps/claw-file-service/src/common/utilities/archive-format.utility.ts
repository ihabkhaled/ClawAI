import * as fs from 'node:fs';
import * as path from 'node:path';
import { ArchiveFormat } from '../enums/archive-format.enum';
import {
  ARCHIVE_MIME_ACCEPTED_FORMATS,
  ARCHIVE_SIGNATURES,
  ARCHIVE_SNIFF_BYTES,
  CANONICAL_ARCHIVE_MIME_BY_FORMAT,
  DETECTED_MIME_TO_ARCHIVE_FORMAT,
  OCTAL_RADIX,
  REROUTABLE_MIME_PREFIXES,
  STREAM_CODEC_FORMATS,
  STREAM_FALLBACK_MEMBER_NAME,
  STREAM_SUFFIX_RULES,
  TAR_BLOCK_BYTES,
  TAR_CHECKSUM_LENGTH,
  TAR_CHECKSUM_OFFSET,
  TAR_CHECKSUM_SPACE,
  TAR_MAGIC,
  TAR_MAGIC_OFFSET,
} from '../../modules/files/constants/archive-formats.constants';
import { MIME_TO_MAGIC_BYTES } from '../../modules/files/constants/file-security.constants';
import { detectMimeTypeFromBytes } from './file-type-detection.utility';

// What an archive IS, decided from its bytes — never from the extension or the
// MIME type an uploader sent. Three callers:
// - validateMagicBytes: a declared archive MIME must match the bytes;
// - the extraction dispatcher: which engine, and which 7-Zip `-t` type;
// - the upload path: an archive labelled octet-stream is re-labelled.

/** The archive format of these leading bytes, or null. */
export function sniffArchiveFormat(head: Uint8Array): ArchiveFormat | null {
  const bytes = Buffer.from(head.buffer, head.byteOffset, head.byteLength);
  const match = ARCHIVE_SIGNATURES.find(
    (signature) =>
      bytes.length >= signature.offset + signature.bytes.length &&
      bytes
        .subarray(signature.offset, signature.offset + signature.bytes.length)
        .equals(signature.bytes),
  );
  if (match !== undefined) {
    return match.format;
  }
  return isTarHeader(bytes) ? ArchiveFormat.TAR : null;
}

/** Sniffs a file on disk from its first block. */
export function readArchiveFormat(filePath: string): ArchiveFormat | null {
  const head = Buffer.alloc(ARCHIVE_SNIFF_BYTES);
  const fd = fs.openSync(filePath, 'r');
  try {
    const bytesRead = fs.readSync(fd, head, 0, ARCHIVE_SNIFF_BYTES, 0);
    return sniffArchiveFormat(head.subarray(0, bytesRead));
  } finally {
    fs.closeSync(fd);
  }
}

/** True for a MIME type that is expanded as an archive. */
export function isArchiveMimeType(mimeType: string): boolean {
  return ARCHIVE_MIME_ACCEPTED_FORMATS.has(mimeType);
}

/** The formats an archive MIME type's bytes may be, or undefined for a non-archive MIME. */
export function acceptedArchiveFormats(mimeType: string): readonly ArchiveFormat[] | undefined {
  return ARCHIVE_MIME_ACCEPTED_FORMATS.get(mimeType);
}

/** True for gzip, bzip2 and xz: one stream, no entry table. */
export function isStreamCodec(format: ArchiveFormat): boolean {
  return STREAM_CODEC_FORMATS.has(format);
}

/**
 * The name of a stream codec's single member: `report.csv.gz` → `report.csv`,
 * `site.tgz` → `site.tar`. A name with no known suffix is kept as it is.
 */
export function streamMemberName(archiveFilename: string): string {
  const base = path.basename(archiveFilename.replaceAll('\\', '/'));
  const lower = base.toLowerCase();
  const rule = STREAM_SUFFIX_RULES.find((candidate) => lower.endsWith(candidate.suffix));
  const member =
    rule === undefined
      ? base
      : `${base.slice(0, base.length - rule.suffix.length)}${rule.replacement}`;
  return member === '' || member === '.' || member === '..' ? STREAM_FALLBACK_MEMBER_NAME : member;
}

/**
 * The MIME type an upload is stored and processed under.
 *
 * Browsers send `application/octet-stream` for any extension the OS has no
 * type for — on Windows that is `.7z`, `.rar` and `.tar.gz` more often than
 * not — and until batch A2 such an archive was decoded as UTF-8 noise. When
 * the declared MIME is one nothing else verifies and the bytes are a PLAIN
 * archive, the archive MIME wins. A declared archive MIME is kept as sent: the
 * magic-byte check decides whether the bytes agree, and rejects them if not.
 */
export async function resolveUploadMimeType(
  declaredMimeType: string,
  buffer: Buffer,
): Promise<string> {
  if (isArchiveMimeType(declaredMimeType) || !isReroutable(declaredMimeType)) {
    return declaredMimeType;
  }
  const detected = await detectMimeTypeFromBytes(buffer);
  const format = detected === null ? undefined : DETECTED_MIME_TO_ARCHIVE_FORMAT.get(detected);
  return format === undefined
    ? declaredMimeType
    : (CANONICAL_ARCHIVE_MIME_BY_FORMAT.get(format) ?? declaredMimeType);
}

// A MIME with its own signature check (PDF, the OOXML family, images, video,
// audio) is never overridden: that check rejects archive bytes under it.
function isReroutable(mimeType: string): boolean {
  return (
    REROUTABLE_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix)) &&
    !Object.hasOwn(MIME_TO_MAGIC_BYTES, mimeType)
  );
}

// A tar has no offset-0 signature. POSIX/GNU headers carry "ustar" at 257; a
// v7 header is accepted only if its stored checksum matches its bytes.
function isTarHeader(bytes: Buffer): boolean {
  if (bytes.length < TAR_BLOCK_BYTES) {
    return false;
  }
  if (bytes.subarray(TAR_MAGIC_OFFSET, TAR_MAGIC_OFFSET + TAR_MAGIC.length).equals(TAR_MAGIC)) {
    return true;
  }
  if (bytes[0] === 0) {
    return false;
  }
  const storedText = bytes
    .toString('latin1', TAR_CHECKSUM_OFFSET, TAR_CHECKSUM_OFFSET + TAR_CHECKSUM_LENGTH)
    .replaceAll('\0', ' ')
    .trim();
  if (!/^[0-7]+$/.test(storedText)) {
    return false;
  }
  let sum = 0;
  for (let index = 0; index < TAR_BLOCK_BYTES; index += 1) {
    const inChecksumField =
      index >= TAR_CHECKSUM_OFFSET && index < TAR_CHECKSUM_OFFSET + TAR_CHECKSUM_LENGTH;
    sum += inChecksumField ? TAR_CHECKSUM_SPACE : (bytes[index] ?? 0);
  }
  return Number.parseInt(storedText, OCTAL_RADIX) === sum;
}
