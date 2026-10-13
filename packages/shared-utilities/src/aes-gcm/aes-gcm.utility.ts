import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import {
  AES_GCM_ALGORITHM,
  AES_GCM_KEY_HEX_PATTERN,
  AES_GCM_KEY_INVALID_MESSAGE,
  AES_GCM_MALFORMED_MESSAGE,
  AES_GCM_NONCE_BYTES,
  AES_GCM_TAG_BYTES,
  AES_GCM_ZERO_KEY_PATTERN,
} from './aes-gcm.constants';

/** True for a 64-character hex string (a 32-byte key). */
export function isAes256HexKey(hexKey: string): boolean {
  return AES_GCM_KEY_HEX_PATTERN.test(hexKey);
}

/** True for a well-formed key that is not the all-zero placeholder. */
export function isStrongAes256HexKey(hexKey: string): boolean {
  return isAes256HexKey(hexKey) && !AES_GCM_ZERO_KEY_PATTERN.test(hexKey);
}

function keyBuffer(hexKey: string): Buffer {
  if (!isAes256HexKey(hexKey)) throw new Error(AES_GCM_KEY_INVALID_MESSAGE);
  return Buffer.from(hexKey, 'hex');
}

/**
 * Seals `plaintext` under `hexKey`, binding it to `aad` (authenticated, not stored).
 * A fresh random nonce per call. Nothing here logs, and no error message carries the
 * key, the plaintext or the ciphertext.
 */
export function encryptWithAad(plaintext: string, hexKey: string, aad: string): string {
  const key = keyBuffer(hexKey);
  const nonce = randomBytes(AES_GCM_NONCE_BYTES);
  const cipher = createCipheriv(AES_GCM_ALGORITHM, key, nonce, {
    authTagLength: AES_GCM_TAG_BYTES,
  });
  cipher.setAAD(Buffer.from(aad, 'utf8'));
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), encrypted]).toString('base64');
}

/** Opens a value from `encryptWithAad`; a wrong key, AAD or tampered bytes throw. */
export function decryptWithAad(ciphertext: string, hexKey: string, aad: string): string {
  const key = keyBuffer(hexKey);
  const combined = Buffer.from(ciphertext, 'base64');
  if (combined.length < AES_GCM_NONCE_BYTES + AES_GCM_TAG_BYTES) {
    throw new Error(AES_GCM_MALFORMED_MESSAGE);
  }
  const nonce = combined.subarray(0, AES_GCM_NONCE_BYTES);
  const tag = combined.subarray(AES_GCM_NONCE_BYTES, AES_GCM_NONCE_BYTES + AES_GCM_TAG_BYTES);
  const body = combined.subarray(AES_GCM_NONCE_BYTES + AES_GCM_TAG_BYTES);
  const decipher = createDecipheriv(AES_GCM_ALGORITHM, key, nonce, {
    authTagLength: AES_GCM_TAG_BYTES,
  });
  decipher.setAAD(Buffer.from(aad, 'utf8'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
}
