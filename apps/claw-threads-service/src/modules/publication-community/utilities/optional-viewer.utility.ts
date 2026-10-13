import { verifyUserAccessToken } from '@claw/shared-utilities';

/** The signed-in user id from a Bearer token, or undefined for any missing/invalid token. Never throws. */
export function optionalViewerId(authorization: string | undefined): string | undefined {
  const secret = process.env['JWT_SECRET'];
  if (!authorization || !secret) return undefined;
  const [scheme, token, extra] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token || extra !== undefined) return undefined;
  try {
    return verifyUserAccessToken(token, secret).sub;
  } catch {
    return undefined;
  }
}
