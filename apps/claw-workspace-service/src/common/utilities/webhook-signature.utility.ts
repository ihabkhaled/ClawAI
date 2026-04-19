import { createHmac, timingSafeEqual } from 'node:crypto';
import { SLACK_MAX_TIMESTAMP_SKEW_MS } from '../constants/webhook.constants';

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Generic HMAC signature verification. The `provided` signature is expected
 * as a lowercase hex digest (no prefix). Use the provider-specific helpers
 * below when the provider wraps the signature with a prefix/scheme.
 */
export function verifyHmacSignature(
  body: string,
  providedSignatureHex: string,
  secret: string,
  algorithm: 'sha256' | 'sha1' = 'sha256',
): boolean {
  const expected = createHmac(algorithm, secret).update(body).digest('hex');
  return timingSafeEqualHex(providedSignatureHex, expected);
}

/**
 * GitHub webhook: `X-Hub-Signature-256: sha256=<hex>` over the raw request body.
 */
export function verifyGithubSignature(
  body: string,
  headerValue: string | undefined | null,
  secret: string,
): boolean {
  if (headerValue === undefined || headerValue === null) {
    return false;
  }
  if (!headerValue.startsWith('sha256=')) {
    return false;
  }
  const provided = headerValue.slice('sha256='.length);
  return verifyHmacSignature(body, provided, secret, 'sha256');
}

/**
 * Slack webhook: `X-Slack-Signature: v0=<hex>` where the signed basestring is
 * `v0:<X-Slack-Request-Timestamp>:<raw body>`. Replays older than 5 minutes
 * are rejected.
 */
export function verifySlackSignature(
  body: string,
  timestampHeader: string | undefined | null,
  signatureHeader: string | undefined | null,
  signingSecret: string,
  nowMs: number = Date.now(),
): boolean {
  if (
    timestampHeader === undefined ||
    timestampHeader === null ||
    signatureHeader === undefined ||
    signatureHeader === null
  ) {
    return false;
  }
  const tsSeconds = Number.parseInt(timestampHeader, 10);
  if (!Number.isFinite(tsSeconds)) {
    return false;
  }
  const tsMs = tsSeconds * 1000;
  if (Math.abs(nowMs - tsMs) > SLACK_MAX_TIMESTAMP_SKEW_MS) {
    return false;
  }
  if (!signatureHeader.startsWith('v0=')) {
    return false;
  }
  const provided = signatureHeader.slice('v0='.length);
  const basestring = `v0:${timestampHeader}:${body}`;
  return verifyHmacSignature(basestring, provided, signingSecret, 'sha256');
}
