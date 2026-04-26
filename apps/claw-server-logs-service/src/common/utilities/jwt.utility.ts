import { verifyAccessToken as verifyAccessTokenGeneric } from '@claw/shared-utilities';
import { type JwtPayload } from '../types';

/**
 * Service-local typed wrapper around the shared JWT verifier.
 * Keeps the existing import surface (`@common/utilities`) while delegating
 * the actual verification logic to `@claw/shared-utilities` so the JWT
 * library is wrapped exactly once across the monorepo.
 */
export function verifyAccessToken(token: string, secret: string): JwtPayload {
  return verifyAccessTokenGeneric<JwtPayload>(token, secret);
}
