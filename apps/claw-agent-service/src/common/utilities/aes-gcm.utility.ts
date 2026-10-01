import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import {
  AES_GCM_ALGORITHM,
  AES_GCM_KEY_BYTES,
  AES_GCM_KEY_INVALID_MESSAGE,
  AES_GCM_MALFORMED_MESSAGE,
  AES_GCM_NONCE_BYTES,
  AES_GCM_TAG_BYTES,
} from '../constants/aes-gcm.constants';

/**
 * The service's `ENCRYPTION_KEY` encryption, with additional authenticated data.
 *
 * Same scheme and wire format as the connector, auth and research services
 * (AES-256-GCM, `base64(nonce || tag || ciphertext)`); the only addition is the AAD,
 * which authenticates but is not stored: decrypting with a different AAD fails the
 * tag check, so a ciphertext cannot be replayed under another routine, user or name.
 * A fresh random nonce per call. Nothing here logs, and no error message carries
 * the key, the plaintext or the ciphertext.
 */
function keyBuffer(hexKey: string): Buffer {
  const key = Buffer.from(hexKey, 'hex');
  if (key.length !== AES_GCM_KEY_BYTES || hexKey.length !== AES_GCM_KEY_BYTES * 2) {
    throw new Error(AES_GCM_KEY_INVALID_MESSAGE);
  }
  return key;
}

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
