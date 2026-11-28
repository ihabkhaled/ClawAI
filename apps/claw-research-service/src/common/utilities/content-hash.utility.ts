import { sha256Hex } from './hash.utility';

/** Lower-case, whitespace-collapsed, trimmed: two copies of one article compare equal. */
export function normaliseForHash(text: string): string {
  return text.toLowerCase().replaceAll(/\s+/gu, ' ').trim();
}

/**
 * sha256 hex of the normalised text (research engine B2). Equal hashes mean a
 * syndicated or mirrored copy of a page already in the run.
 */
export function contentHashOf(text: string): string {
  return sha256Hex(normaliseForHash(text));
}
