import { createHash, randomBytes, scrypt } from 'node:crypto';

import {
  RUNTIME_V2_TERMINAL_REASON_CODE_CHARACTERS,
  RUNTIME_V2_TERMINAL_REASON_FINGERPRINT_BYTES,
  RUNTIME_V2_TERMINAL_REASON_MESSAGE_CHARACTERS,
  RUNTIME_V2_TERMINAL_REASON_SALT_DOMAIN,
  RUNTIME_V2_TERMINAL_REASON_SALT_RUN_ID_CHARACTERS,
  RUNTIME_V2_TERMINAL_REASON_SCRYPT_BLOCK_SIZE,
  RUNTIME_V2_TERMINAL_REASON_SCRYPT_COST,
  RUNTIME_V2_TERMINAL_REASON_SCRYPT_KEY_BYTES,
  RUNTIME_V2_TERMINAL_REASON_SCRYPT_MAX_MEMORY_BYTES,
  RUNTIME_V2_TERMINAL_REASON_SCRYPT_PARALLELIZATION,
} from '../constants/runtime-v2-identity.constants';
import type { RuntimeV2TerminalInput } from '../types/runtime-v2-store.types';

export function createRuntimeV2Identity(prefix: string): string {
  return `${prefix}_${randomBytes(16).toString('hex')}`;
}

export function runtimeV2Sha256(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

export async function runtimeV2TerminalFingerprint(input: RuntimeV2TerminalInput): Promise<string> {
  const { reason, ...structuralInput } = input;
  const structuralDigest = runtimeV2Sha256(stableRuntimeV2Json(structuralInput));
  if (input.status === 'completed') {
    return structuralDigest;
  }

  if (
    (reason?.code.length ?? 0) > RUNTIME_V2_TERMINAL_REASON_CODE_CHARACTERS ||
    (reason?.message.length ?? 0) > RUNTIME_V2_TERMINAL_REASON_MESSAGE_CHARACTERS ||
    input.runId.length > RUNTIME_V2_TERMINAL_REASON_SALT_RUN_ID_CHARACTERS
  ) {
    throw new Error('Runtime V2 terminal reason exceeds the fingerprint budget');
  }
  const protectedInput = stableRuntimeV2Json(reason ?? null);
  if (Buffer.byteLength(protectedInput, 'utf8') > RUNTIME_V2_TERMINAL_REASON_FINGERPRINT_BYTES) {
    throw new Error('Runtime V2 terminal reason exceeds the fingerprint budget');
  }
  const salt = createHash('sha256')
    .update(`${RUNTIME_V2_TERMINAL_REASON_SALT_DOMAIN}\u0000${input.runId}`)
    .digest();
  const protectedDigest = await runtimeV2ReasonScrypt(protectedInput, salt);
  return `${structuralDigest}.scrypt:${protectedDigest.toString('hex')}`;
}

function runtimeV2ReasonScrypt(protectedInput: string, salt: Buffer): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      protectedInput,
      salt,
      RUNTIME_V2_TERMINAL_REASON_SCRYPT_KEY_BYTES,
      {
        N: RUNTIME_V2_TERMINAL_REASON_SCRYPT_COST,
        r: RUNTIME_V2_TERMINAL_REASON_SCRYPT_BLOCK_SIZE,
        p: RUNTIME_V2_TERMINAL_REASON_SCRYPT_PARALLELIZATION,
        maxmem: RUNTIME_V2_TERMINAL_REASON_SCRYPT_MAX_MEMORY_BYTES,
      },
      (error, derivedKey) => {
        if (error === null) {
          resolve(derivedKey);
          return;
        }
        reject(error);
      },
    );
  });
}

export function stableRuntimeV2Json(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableRuntimeV2Json).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableRuntimeV2Json(entry)}`)
      .join(',')}}`;
  }
  throw new Error('Runtime V2 value is not JSON compatible');
}
