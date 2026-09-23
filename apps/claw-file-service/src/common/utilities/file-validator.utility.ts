import { Logger } from '@nestjs/common';
import type { ArchiveFormat } from '../enums/archive-format.enum';
import type { FileValidationResult } from '../../modules/files/types/file-security.types';
import { acceptedArchiveFormats, sniffArchiveFormat } from './archive-format.utility';
import {
  AAC_ADTS_SECOND_BYTES,
  AUDIO_MIME_DETECTION_ALIASES,
  DANGEROUS_EXTENSIONS,
  M4A_MAJOR_BRANDS,
  MAX_FILENAME_LENGTH,
  MIME_TO_MAGIC_BYTES,
  MP3_FRAME_SYNC_SECOND_BYTES,
  MP4_MAJOR_BRANDS,
  VIDEO_MIME_DETECTION_ALIASES,
} from '../../modules/files/constants/file-security.constants';

const logger = new Logger('FileValidator');

export function validateFilename(filename: string): FileValidationResult {
  if (!filename || filename.length === 0) {
    return { valid: false, reason: 'empty_filename' };
  }

  if (filename.length > MAX_FILENAME_LENGTH) {
    return { valid: false, reason: 'filename_too_long' };
  }

  if (/[<>:"|?*]/.test(filename) || hasControlChars(filename)) {
    return { valid: false, reason: 'invalid_characters' };
  }

  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return { valid: false, reason: 'path_traversal_attempt' };
  }

  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    logger.warn(`validateFilename: dangerous extension blocked — "${ext}" in "${filename}"`);
    return { valid: false, reason: `dangerous_extension: ${ext}` };
  }

  return /\.(exe|bat|cmd|com|scr|pif|vbs|vbe|wsf|wsh|msi|dll|sys)\.?/i.test(filename)
    ? { valid: false, reason: 'double_extension_attack' }
    : { valid: true, reason: 'ok' };
}

export function sanitizeFilename(filename: string): string {
  const basename = filename.replace(/^.*[\\/]/, '');
  const cleaned = replaceUnsafeChars(basename);
  const collapsed = cleaned.replaceAll(/_{2,}/g, '_');
  return collapsed.slice(0, MAX_FILENAME_LENGTH);
}

export async function validateMagicBytes(
  buffer: Buffer,
  declaredMimeType: string,
): Promise<FileValidationResult> {
  if (declaredMimeType.startsWith('video/')) {
    return validateDetectedVideoContainer(buffer, declaredMimeType);
  }
  // B6a — without this, "audio/wav" is an unchecked MIME and any bytes at all
  // ride in under that name.
  if (declaredMimeType.startsWith('audio/')) {
    return validateDetectedAudioContainer(buffer, declaredMimeType);
  }
  const expectedSignatures = Object.entries(MIME_TO_MAGIC_BYTES).find(
    ([k]) => k === declaredMimeType,
  )?.[1];
  if (!expectedSignatures) {
    const acceptedFormats = acceptedArchiveFormats(declaredMimeType);
    if (acceptedFormats !== undefined) {
      return validateArchiveSignature(buffer, declaredMimeType, acceptedFormats);
    }
    logger.debug(`validateMagicBytes: no signature check for ${declaredMimeType}`);
    return { valid: true, reason: 'no_signature_check' };
  }

  for (const sig of expectedSignatures) {
    if (buffer.length >= sig.length && buffer.subarray(0, sig.length).equals(sig)) {
      return { valid: true, reason: 'magic_bytes_match' };
    }
  }

  logger.warn(
    `validateMagicBytes: MISMATCH — declared ${declaredMimeType} but magic bytes don't match`,
  );
  return { valid: false, reason: `mime_magic_mismatch: declared ${declaredMimeType}` };
}

// Batch A2 — 7z, RAR, tar, gzip, bzip2, xz. A tar has no offset-0 signature
// and a RAR has two, so these are sniffed rather than looked up; a `.tgz`
// declared `application/x-gtar` may be either a tar or a gzip.
function validateArchiveSignature(
  buffer: Buffer,
  declaredMimeType: string,
  acceptedFormats: readonly ArchiveFormat[],
): FileValidationResult {
  const detected = sniffArchiveFormat(buffer);
  if (detected !== null && acceptedFormats.includes(detected)) {
    return { valid: true, reason: 'magic_bytes_match' };
  }
  logger.warn(
    `validateMagicBytes: MISMATCH — declared ${declaredMimeType} but bytes are ${detected ?? 'not an archive'}`,
  );
  return { valid: false, reason: `mime_magic_mismatch: declared ${declaredMimeType}` };
}

async function validateDetectedVideoContainer(
  buffer: Buffer,
  declaredMimeType: string,
): Promise<FileValidationResult> {
  const acceptedDetectedMimes = Object.entries(VIDEO_MIME_DETECTION_ALIASES).find(
    ([mimeType]) => mimeType === declaredMimeType,
  )?.[1];
  const detectedMime = detectVideoMimeType(buffer);
  if (acceptedDetectedMimes?.includes(detectedMime ?? '') === true) {
    return { valid: true, reason: 'magic_bytes_match' };
  }
  logger.warn(
    `validateMagicBytes: MISMATCH — declared ${declaredMimeType} but magic bytes don't match`,
  );
  return { valid: false, reason: `mime_magic_mismatch: declared ${declaredMimeType}` };
}

function detectVideoMimeType(buffer: Buffer): string | undefined {
  if (isIsoBaseMedia(buffer)) {
    return buffer.toString('ascii', 8, 12).toLowerCase() === 'qt  '
      ? 'video/quicktime'
      : 'video/mp4';
  }
  if (isWebm(buffer)) {
    return 'video/webm';
  }
  if (isAvi(buffer)) {
    return 'video/vnd.avi';
  }
  return isMpeg(buffer) ? 'video/mpeg' : undefined;
}

function isIsoBaseMedia(buffer: Buffer): boolean {
  if (buffer.length < 12 || buffer.toString('ascii', 4, 8) !== 'ftyp') {
    return false;
  }
  const majorBrand = buffer.toString('ascii', 8, 12).toLowerCase();
  return majorBrand === 'qt  ' || MP4_MAJOR_BRANDS.has(majorBrand);
}

function isWebm(buffer: Buffer): boolean {
  const hasEbmlHeader =
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3;
  return hasEbmlHeader && buffer.subarray(0, 4096).includes(Buffer.from('webm'));
}

function isAvi(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'AVI '
  );
}

function isMpeg(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x00 &&
    buffer[1] === 0x00 &&
    buffer[2] === 0x01 &&
    (buffer[3] === 0xb3 || buffer[3] === 0xba)
  );
}

async function validateDetectedAudioContainer(
  buffer: Buffer,
  declaredMimeType: string,
): Promise<FileValidationResult> {
  const acceptedDetectedMimes = Object.entries(AUDIO_MIME_DETECTION_ALIASES).find(
    ([mimeType]) => mimeType === declaredMimeType,
  )?.[1];
  const detectedMime = detectAudioMimeType(buffer);
  if (acceptedDetectedMimes?.includes(detectedMime ?? '') === true) {
    return { valid: true, reason: 'magic_bytes_match' };
  }
  logger.warn(
    `validateMagicBytes: MISMATCH — declared ${declaredMimeType} but magic bytes don't match`,
  );
  return { valid: false, reason: `mime_magic_mismatch: declared ${declaredMimeType}` };
}

function detectAudioMimeType(buffer: Buffer): string | undefined {
  if (isRiffWave(buffer)) {
    return 'audio/wav';
  }
  if (isOgg(buffer)) {
    return 'audio/ogg';
  }
  if (isFlac(buffer)) {
    return 'audio/flac';
  }
  if (isM4a(buffer)) {
    return 'audio/mp4';
  }
  if (isWebm(buffer)) {
    return 'audio/webm';
  }
  if (isMp3(buffer)) {
    return 'audio/mpeg';
  }
  return isAacAdts(buffer) ? 'audio/aac' : undefined;
}

// 'RIFF' at 0 and 'WAVE' at 8. The 'WAVE' half is what separates a WAV from a
// WebP or an AVI, which share the RIFF prefix.
function isRiffWave(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WAVE'
  );
}

function isOgg(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'OggS';
}

function isFlac(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'fLaC';
}

// 'ftyp' at offset 4 with an audio-capable brand at offset 8 — the same
// ISO base-media shape isIsoBaseMedia() checks for video.
function isM4a(buffer: Buffer): boolean {
  return buffer.length < 12 || buffer.toString('ascii', 4, 8) !== 'ftyp'
    ? false
    : M4A_MAJOR_BRANDS.has(buffer.toString('ascii', 8, 12).toLowerCase());
}

// Either an ID3 tag at offset 0 or a bare MPEG Layer III frame sync.
function isMp3(buffer: Buffer): boolean {
  return buffer.length >= 3 && buffer.toString('ascii', 0, 3) === 'ID3'
    ? true
    : buffer.length >= 2 && buffer[0] === 0xff && MP3_FRAME_SYNC_SECOND_BYTES.has(buffer[1] ?? 0);
}

function isAacAdts(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === 0xff && AAC_ADTS_SECOND_BYTES.has(buffer[1] ?? 0);
}

export function detectZipBomb(buffer: Buffer): FileValidationResult {
  if (buffer.length < 100) {
    return { valid: true, reason: 'too_small_for_bomb' };
  }

  const isZip =
    buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  if (!isZip) {
    return { valid: true, reason: 'not_archive' };
  }

  if (buffer.length < 1000 && buffer.toString('utf-8').includes('\x00'.repeat(100))) {
    logger.warn('detectZipBomb: suspicious null byte pattern in small archive');
    return { valid: false, reason: 'suspicious_archive_pattern' };
  }

  return { valid: true, reason: 'archive_ok' };
}

function hasControlChars(str: string): boolean {
  for (const ch of str) {
    if ((ch.codePointAt(0) ?? 0) < 0x20) {
      return true;
    }
  }
  return false;
}

function replaceUnsafeChars(str: string): string {
  let result = '';
  for (const ch of str) {
    const code = ch.codePointAt(0) ?? 0;
    result += code < 0x20 || '<>:"|?*'.includes(ch) ? '_' : ch;
  }
  return result;
}
