import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { hostname, userInfo } from 'node:os';
import { getSecretsFile, getConfigDir, APP_DIR_NAME } from '../config/paths.js';
import { mkdirSync } from 'node:fs';

const ALGO = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SALT = 'claw-agent-cli.v1';

function deriveKey() {
  const material = `${hostname()}:${userInfo().username}:${APP_DIR_NAME}`;
  return scryptSync(material, SALT, KEY_LENGTH);
}

function ensureDir() {
  const dir = getConfigDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function hasSecrets() {
  return existsSync(getSecretsFile());
}

export function readSecrets() {
  if (!hasSecrets()) return null;
  try {
    const buffer = readFileSync(getSecretsFile());
    const iv = buffer.subarray(0, IV_LENGTH);
    const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = buffer.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv(ALGO, deriveKey(), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8'));
  } catch {
    return null;
  }
}

export function writeSecrets(payload) {
  ensureDir();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, deriveKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const blob = Buffer.concat([iv, tag, ciphertext]);
  writeFileSync(getSecretsFile(), blob, { mode: 0o600 });
}

export function clearSecrets() {
  if (hasSecrets()) {
    try {
      unlinkSync(getSecretsFile());
    } catch {
      // best-effort
    }
  }
}

export function getStorageBackend() {
  return 'encrypted-file';
}
