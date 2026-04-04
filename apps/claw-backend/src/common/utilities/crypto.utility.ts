import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { CRYPTO_ALGORITHM, CRYPTO_AUTH_TAG_LENGTH, CRYPTO_IV_LENGTH } from "../constants";

function getKeyBuffer(hexKey: string): Buffer {
  const buf = Buffer.from(hexKey, "hex");
  if (buf.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return buf;
}

export function encrypt(plaintext: string, hexKey: string): string {
  const key = getKeyBuffer(hexKey);
  const iv = randomBytes(CRYPTO_IV_LENGTH);
  const cipher = createCipheriv(CRYPTO_ALGORITHM, key, iv, { authTagLength: CRYPTO_AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64");
}

export function decrypt(ciphertext: string, hexKey: string): string {
  const key = getKeyBuffer(hexKey);
  const combined = Buffer.from(ciphertext, "base64");

  const iv = combined.subarray(0, CRYPTO_IV_LENGTH);
  const authTag = combined.subarray(CRYPTO_IV_LENGTH, CRYPTO_IV_LENGTH + CRYPTO_AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(CRYPTO_IV_LENGTH + CRYPTO_AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(CRYPTO_ALGORITHM, key, iv, { authTagLength: CRYPTO_AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
