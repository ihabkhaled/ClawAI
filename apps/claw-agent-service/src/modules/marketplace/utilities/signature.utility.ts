import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as nodeSign,
  verify as nodeVerify,
} from 'node:crypto';

import type { JwkKey } from '../types/marketplace.types';

/**
 * Stream 42 — Ed25519 signing primitives for the recipe marketplace.
 *
 * Every published listing carries:
 *   - `signaturePublicKey` (hex-encoded raw 32-byte Ed25519 public key)
 *   - `signature` (hex-encoded 64-byte Ed25519 signature)
 *
 * The signature is computed over the canonical JSON of the recipe DSL:
 * `JSON.stringify` after key-sorting at every depth. This guarantees
 * the same DSL produces the same bytes regardless of object property
 * insertion order on the publisher side.
 *
 * Verification fails closed — any error in key parsing, hex decoding,
 * or signature mismatch returns `false`. Callers should treat false
 * as untrusted-or-tampered and refuse the install.
 *
 * Sandbox runner integration: a verified signature does NOT mean the
 * recipe is safe to run. Sandbox execution still applies (Stream 42 v2).
 */

export function generateEd25519KeyPair(): {
  publicKeyHex: string;
  privateKeyHex: string;
} {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  // Export raw 32-byte keys via JWK (Node returns x/d base64url-encoded)
  const pubJwk = publicKey.export({ format: 'jwk' });
  const privJwk = privateKey.export({ format: 'jwk' });
  return {
    publicKeyHex: base64UrlToHex(pubJwk.x ?? ''),
    privateKeyHex: base64UrlToHex(privJwk.d ?? ''),
  };
}

export function signRecipeDsl(canonicalJson: string, privateKeyHex: string): string {
  const key = createPrivateKey({
    key: privateKeyToJwk(privateKeyHex, derivePublicFromPrivate(privateKeyHex)),
    format: 'jwk',
  });
  const signature = nodeSign(null, Buffer.from(canonicalJson, 'utf8'), key);
  return signature.toString('hex');
}

export function verifyRecipeDslSignature(
  canonicalJson: string,
  signatureHex: string,
  publicKeyHex: string,
): boolean {
  try {
    const key = createPublicKey({
      key: publicKeyToJwk(publicKeyHex),
      format: 'jwk',
    });
    return nodeVerify(
      null,
      Buffer.from(canonicalJson, 'utf8'),
      key,
      Buffer.from(signatureHex, 'hex'),
    );
  } catch {
    return false;
  }
}

/**
 * Canonical JSON: deterministic byte-for-byte encoding regardless of
 * property insertion order. Required for signature stability.
 */
export function canonicaliseDsl(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((v) => sortKeys(v));
  if (value === null || typeof value !== 'object') return value;
  const obj = value as Record<string, unknown>;
  const entries = Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : (a > b ? 1 : 0)));
  return Object.fromEntries(entries.map(([k, v]) => [k, sortKeys(v)]));
}

function publicKeyToJwk(publicKeyHex: string): JwkKey {
  return {
    kty: 'OKP',
    crv: 'Ed25519',
    x: hexToBase64Url(publicKeyHex),
  };
}

function privateKeyToJwk(privateKeyHex: string, publicKeyHex: string): JwkKey {
  return {
    kty: 'OKP',
    crv: 'Ed25519',
    x: hexToBase64Url(publicKeyHex),
    d: hexToBase64Url(privateKeyHex),
  };
}

function hexToBase64Url(hex: string): string {
  return Buffer.from(hex, 'hex').toString('base64url');
}

function base64UrlToHex(b64: string): string {
  return Buffer.from(b64, 'base64url').toString('hex');
}

function derivePublicFromPrivate(privateKeyHex: string): string {
  // Round-trip via Node — given a private hex, build the JWK with only `d`,
  // import, then export to recover `x`. Used only by signRecipeDsl.
  const key = createPrivateKey({
    key: { kty: 'OKP', crv: 'Ed25519', d: hexToBase64Url(privateKeyHex) },
    format: 'jwk',
  });
  const jwk = key.export({ format: 'jwk' });
  return base64UrlToHex(jwk.x ?? '');
}
