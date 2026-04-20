import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

import { AES_ALGORITHM, AES_AUTH_TAG_LENGTH, AES_IV_LENGTH } from '../constants/crypto.constants';

function resolveKey(): Buffer {
  const hex = process.env['ENCRYPTION_KEY'];
  if (hex?.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string');
  }
  return Buffer.from(hex, 'hex');
}

export function encryptString(plaintext: string): string {
  const key = resolveKey();
  const iv = randomBytes(AES_IV_LENGTH);
  const cipher = createCipheriv(AES_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decryptString(ciphertext: string): string {
  const key = resolveKey();
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, AES_IV_LENGTH);
  const authTag = buf.subarray(AES_IV_LENGTH, AES_IV_LENGTH + AES_AUTH_TAG_LENGTH);
  const encrypted = buf.subarray(AES_IV_LENGTH + AES_AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(AES_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

export function generateSecureToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('hex');
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
