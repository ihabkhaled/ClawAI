import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Logger } from "@nestjs/common";

import { CRYPTO_ALGORITHM, CRYPTO_AUTH_TAG_LENGTH, CRYPTO_IV_LENGTH } from "../constants";

const logger = new Logger("CryptoUtility");

function getKeyBuffer(hexKey: string): Buffer {
  logger.debug("getKeyBuffer: validating encryption key length");
  const buf = Buffer.from(hexKey, "hex");
  if (buf.length !== 32) {
    logger.error("getKeyBuffer: invalid key length — expected 32 bytes");
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  logger.debug("getKeyBuffer: key validated successfully");
  return buf;
}

export function encrypt(plaintext: string, hexKey: string): string {
  logger.debug(`encrypt: starting encryption of ${String(plaintext.length)} chars`);
  const key = getKeyBuffer(hexKey);
  logger.debug("encrypt: generating random IV");
  const iv = randomBytes(CRYPTO_IV_LENGTH);
  logger.debug("encrypt: creating cipher");
  const cipher = createCipheriv(CRYPTO_ALGORITHM, key, iv, { authTagLength: CRYPTO_AUTH_TAG_LENGTH });

  logger.debug("encrypt: encrypting plaintext");
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  logger.debug("encrypt: combining IV + authTag + encrypted data");
  const combined = Buffer.concat([iv, authTag, encrypted]);
  const result = combined.toString("base64");
  logger.debug(`encrypt: completed — output length=${String(result.length)}`);
  return result;
}

export function decrypt(ciphertext: string, hexKey: string): string {
  logger.debug(`decrypt: starting decryption of ${String(ciphertext.length)} chars`);
  const key = getKeyBuffer(hexKey);
  logger.debug("decrypt: decoding base64 ciphertext");
  const combined = Buffer.from(ciphertext, "base64");

  logger.debug("decrypt: extracting IV, authTag, and encrypted data");
  const iv = combined.subarray(0, CRYPTO_IV_LENGTH);
  const authTag = combined.subarray(CRYPTO_IV_LENGTH, CRYPTO_IV_LENGTH + CRYPTO_AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(CRYPTO_IV_LENGTH + CRYPTO_AUTH_TAG_LENGTH);

  logger.debug("decrypt: creating decipher and setting authTag");
  const decipher = createDecipheriv(CRYPTO_ALGORITHM, key, iv, { authTagLength: CRYPTO_AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  logger.debug("decrypt: decrypting data");
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  const result = decrypted.toString("utf8");
  logger.debug(`decrypt: completed — output length=${String(result.length)}`);
  return result;
}
