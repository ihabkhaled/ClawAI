import { createHash, randomBytes } from 'node:crypto';

export function createRuntimeV2Identity(prefix: string): string {
  return `${prefix}_${randomBytes(16).toString('hex')}`;
}

export function runtimeV2Sha256(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
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
