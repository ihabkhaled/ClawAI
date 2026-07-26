import { randomBytes } from 'node:crypto';

import { PUBLIC_SHARE_ID_BYTES } from '../../modules/chat-shares/constants/chat-shares.constants';

/**
 * Generates a public share identifier.
 *
 * base64url of 16 random bytes — 128 bits, URL-safe, no padding. The
 * properties that matter:
 *
 * - **Unguessable.** An unlisted share's only protection is that nobody can
 *   find its URL, so the id space must not be walkable.
 * - **Non-sequential.** A counter would let anyone enumerate every share ever
 *   published and would leak roughly how many exist.
 * - **Opaque.** It encodes nothing: not the thread id, not the user, not a
 *   timestamp. Nothing about it can be decoded back into private state.
 *
 * `randomBytes` is the CSPRNG. `Math.random()` here would be a real
 * vulnerability, not a style preference.
 */
export function generatePublicShareId(): string {
  return randomBytes(PUBLIC_SHARE_ID_BYTES).toString('base64url');
}

/**
 * Rejects anything that is not shaped like one of our identifiers.
 *
 * Checked before the database is touched, so a hostile path segment never
 * reaches a query, and an enumeration sweep is refused at the edge rather than
 * costing a lookup each time.
 */
export function isValidPublicShareId(value: string): boolean {
  // base64url of 16 bytes is always 22 characters with no padding.
  return /^[A-Za-z0-9_-]{22}$/.test(value);
}
