import { Logger } from '@nestjs/common';
import type { FileValidationResult } from '../../modules/files/types/file-security.types';
import {
  DANGEROUS_EXTENSIONS,
  MAX_FILENAME_LENGTH,
  MIME_TO_MAGIC_BYTES,
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

  if (/\.(exe|bat|cmd|com|scr|pif|vbs|vbe|wsf|wsh|msi|dll|sys)\.?/i.test(filename)) {
    return { valid: false, reason: 'double_extension_attack' };
  }

  return { valid: true, reason: 'ok' };
}

export function sanitizeFilename(filename: string): string {
  const basename = filename.replace(/^.*[\\/]/, '');
  const cleaned = replaceUnsafeChars(basename);
  const collapsed = cleaned.replaceAll(/_{2,}/g, '_');
  return collapsed.slice(0, MAX_FILENAME_LENGTH);
}

export function validateMagicBytes(buffer: Buffer, declaredMimeType: string): FileValidationResult {
  const expectedSignatures = MIME_TO_MAGIC_BYTES[declaredMimeType];
  if (!expectedSignatures) {
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
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x20) {
      return true;
    }
  }
  return false;
}

function replaceUnsafeChars(str: string): string {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i] ?? '';
    const code = str.charCodeAt(i);
    result += code < 0x20 || '<>:"|?*'.includes(ch) ? '_' : ch;
  }
  return result;
}
