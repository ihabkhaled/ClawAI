import { createHash } from 'node:crypto';

/** Short hex digest used as stable ids for search results (dedupe key). */
export function sha1Short(value: string): string {
  return createHash('sha1').update(value).digest('hex').slice(0, 16);
}

/** Full sha256 hex digest (cache keys, content hashes). */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
