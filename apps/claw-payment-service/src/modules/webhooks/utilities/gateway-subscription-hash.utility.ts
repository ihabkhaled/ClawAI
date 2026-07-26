import { createHash } from 'node:crypto';

/**
 * Deterministic lookup hash for a gateway subscription id.
 *
 * The id itself is stored encrypted, which makes it unsearchable — AES-GCM uses a
 * random nonce per value, so the same id encrypts differently every time and an
 * equality query can never match. This hash is the blind index that makes the
 * lookup possible without decrypting anything.
 *
 * SHA-256 with no secret is deliberate and sufficient here. A keyed HMAC protects
 * against an attacker who can *guess* candidate values and confirm them by
 * matching hashes; a PayPal subscription id is a high-entropy opaque token, so
 * there is no dictionary to guess from. Adding a key would introduce a rotation
 * problem — rotating it would orphan every existing row's index — for no gain
 * against this input.
 *
 * Must stay byte-identical to whatever wrote the stored hash: change this and
 * every existing subscription becomes unfindable by gateway id.
 */
export function hashGatewaySubscriptionId(gatewaySubscriptionId: string): string {
  return createHash('sha256').update(gatewaySubscriptionId).digest('hex');
}
