import { createHmac } from 'node:crypto';
// DEFAULT import, never `import * as jwt` — this package is "type": "module"
// and jsonwebtoken is CommonJS, so a namespace import leaves `jwt.sign`
// undefined at runtime. See rule 13 §6.
import jwt from 'jsonwebtoken';

import { JWT_ALGORITHM } from '../constants/jwt.constants';
import type { ScopedTokenAudience, ScopedTokenSignOptions } from '../types/scoped-token.type';

/**
 * A key for ONE purpose, derived from a master secret.
 *
 * A token signed for a narrow purpose (the Grafana cookie) must never verify as
 * a user access token, and an access token must never verify as one of these.
 * An audience claim says that; a different key makes it impossible to get
 * wrong. Deriving the key with HMAC keeps it a function of `JWT_SECRET` — no
 * second secret to generate, rotate or leak — while rotating `JWT_SECRET`
 * still invalidates every derived token.
 */
export function deriveScopedKey(masterSecret: string, context: string): string {
  return createHmac('sha256', masterSecret).update(context).digest('hex');
}

export function signScopedToken(
  claims: Record<string, string>,
  key: string,
  options: ScopedTokenSignOptions,
): string {
  return jwt.sign(claims, key, {
    algorithm: JWT_ALGORITHM,
    audience: options.audience,
    issuer: options.issuer,
    expiresIn: options.expiresInSeconds,
  });
}

/**
 * Verifies signature, algorithm, audience, issuer and expiry, and returns the
 * raw claims. Throws on any failure; the caller decides what a failure means
 * and validates the claim shape itself.
 */
export function verifyScopedToken(
  token: string,
  key: string,
  options: ScopedTokenAudience,
): unknown {
  return jwt.verify(token, key, {
    algorithms: [JWT_ALGORITHM],
    audience: options.audience,
    issuer: options.issuer,
  });
}
