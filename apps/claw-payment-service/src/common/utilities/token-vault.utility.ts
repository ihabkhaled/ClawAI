import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import {
  TOKEN_VAULT_ALGORITHM,
  TOKEN_VAULT_AUTH_TAG_BYTES,
  TOKEN_VAULT_BLIND_INDEX_ALGORITHM,
  TOKEN_VAULT_ENVELOPE_SEPARATOR,
  TOKEN_VAULT_ENVELOPE_VERSION,
  TOKEN_VAULT_NONCE_BYTES,
} from '../constants/token-vault.constants';
import { type TokenVaultContext } from '../types/token-vault.types';

/**
 * Application-layer encryption for vaulted GATEWAY TOKENS.
 *
 * ClawAI is never in the card-data path — both gateways use hosted checkout, so a
 * PAN never reaches these servers. What is stored is the gateway's own token: a
 * bearer credential that can charge the customer again. That makes it worth
 * roughly as much as the card to an attacker with database access, and it is
 * encrypted accordingly.
 *
 * AES-256-GCM with:
 *
 * - **A fresh random nonce per value.** Reusing a nonce under the same key in GCM
 *   is catastrophic — it leaks the XOR of plaintexts and allows forgery. Never
 *   derive the nonce from the row id or any other repeating value.
 * - **AAD binding `userId|gateway|paymentMethodId`.** The ciphertext is
 *   cryptographically tied to the row it belongs to, so lifting it into another
 *   user's row fails to decrypt rather than silently authorising a charge against
 *   the wrong person. This is the control that turns a database-write primitive
 *   into a non-exploitable one.
 * - **A key version in the envelope.** Rotation writes new values under the new
 *   version while old rows stay decryptable, so a rotation is not an outage.
 *
 * The envelope is `v<version>.<nonce>.<tag>.<ciphertext>`, all base64url. Version
 * first so a future format change is detectable before anything else is parsed.
 */
export function encryptGatewayToken(
  plaintext: string,
  keyHex: string,
  keyVersion: number,
  context: TokenVaultContext,
): string {
  const nonce = randomBytes(TOKEN_VAULT_NONCE_BYTES);
  const cipher = createCipheriv(TOKEN_VAULT_ALGORITHM, keyFrom(keyHex), nonce, {
    authTagLength: TOKEN_VAULT_AUTH_TAG_BYTES,
  });
  cipher.setAAD(Buffer.from(buildAad(context), 'utf8'));

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [
    `v${String(keyVersion)}`,
    nonce.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(TOKEN_VAULT_ENVELOPE_SEPARATOR);
}

/**
 * Reverses `encryptGatewayToken`, or throws.
 *
 * Throwing rather than returning null is deliberate: a token that will not
 * decrypt means either the key is wrong, the row was tampered with, or the
 * ciphertext belongs to a different row. None of those should degrade into
 * "carry on without a payment method" — they should stop the operation.
 */
export function decryptGatewayToken(
  envelope: string,
  keyHex: string,
  context: TokenVaultContext,
): string {
  const parts = envelope.split(TOKEN_VAULT_ENVELOPE_SEPARATOR);
  if (parts.length !== 4 || !parts[0]?.startsWith('v')) {
    throw new Error('token envelope is malformed');
  }
  const [, nonceB64, tagB64, cipherB64] = parts;

  const decipher = createDecipheriv(
    TOKEN_VAULT_ALGORITHM,
    keyFrom(keyHex),
    Buffer.from(nonceB64 ?? '', 'base64url'),
    { authTagLength: TOKEN_VAULT_AUTH_TAG_BYTES },
  );
  decipher.setAAD(Buffer.from(buildAad(context), 'utf8'));
  decipher.setAuthTag(Buffer.from(tagB64 ?? '', 'base64url'));

  // `final()` is what verifies the tag. Any tampering — to the ciphertext, the
  // tag, or the bound context — surfaces here as a throw.
  return Buffer.concat([
    decipher.update(Buffer.from(cipherB64 ?? '', 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

/** The key version recorded in an envelope, for rotation bookkeeping. */
export function readEnvelopeKeyVersion(envelope: string): number | null {
  const marker = envelope.split(TOKEN_VAULT_ENVELOPE_SEPARATOR)[0];
  if (!marker?.startsWith('v')) {
    return null;
  }
  const parsed = Number.parseInt(marker.slice(1), 10);
  return Number.isInteger(parsed) ? parsed : null;
}

/**
 * Deterministic keyed index over a gateway token, for "is this card already
 * saved?" without ever comparing plaintext.
 *
 * HMAC rather than a bare hash, because a gateway token is not high-entropy
 * enough to assume an attacker with the database cannot enumerate candidates. The
 * key makes the index useless without it.
 *
 * Deliberately NOT derived from the row: the whole point is that the same token
 * produces the same index across rows, which is what makes the
 * `(userId, gateway, tokenBlindIndex)` unique constraint able to reject a
 * duplicate.
 */
export function blindIndexGatewayToken(plaintext: string, keyHex: string): string {
  return createHmac(TOKEN_VAULT_BLIND_INDEX_ALGORITHM, keyFrom(keyHex))
    .update(plaintext)
    .digest('hex');
}

/** Constant-time comparison of two blind indexes. */
export function blindIndexMatches(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  // Length must be compared first — timingSafeEqual throws on a mismatch — but a
  // differing length is not a secret, so leaking it costs nothing.
  return a.length === b.length && timingSafeEqual(a, b);
}

function keyFrom(keyHex: string): Buffer {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('payment token key must be 32 bytes (64 hex characters)');
  }
  return key;
}

/**
 * The additional authenticated data bound into every ciphertext.
 *
 * Order and separator are part of the format: changing either invalidates every
 * stored token, because the AAD would no longer reproduce.
 */
function buildAad(context: TokenVaultContext): string {
  return [
    TOKEN_VAULT_ENVELOPE_VERSION,
    context.userId,
    context.gateway,
    context.paymentMethodId,
  ].join('|');
}
