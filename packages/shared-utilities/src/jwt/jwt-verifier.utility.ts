import * as jwt from 'jsonwebtoken';
import { Logger } from '@nestjs/common';
import {
  JWT_ALGORITHM,
  USER_JWT_AUDIENCE,
  USER_JWT_ISSUER,
  USER_TOKEN_KIND,
} from '@claw/shared-constants';
import { type UserAccessTokenPayload, UserRole } from '@claw/shared-types';

const logger = new Logger('JwtVerifier');

/**
 * Verifies a JWT access token and returns the decoded payload.
 *
 * Generic over the payload type so each service can supply its own
 * `JwtPayload` shape. Most services pass `JwtPayload` from
 * `@claw/shared-types` or from their own `common/types/`.
 *
 * @example
 * ```ts
 * import { verifyAccessToken } from '@claw/shared-utilities';
 * import type { JwtPayload } from '@claw/shared-types';
 * const payload = verifyAccessToken<JwtPayload>(token, secret);
 * ```
 */
export function verifyAccessToken<TPayload extends object>(
  token: string,
  secret: string,
): TPayload {
  logger.debug('verifyAccessToken: verifying access token');
  try {
    const decoded = jwt.verify(token, secret, { algorithms: [JWT_ALGORITHM] }) as TPayload;
    logger.debug('verifyAccessToken: token verified');
    return decoded;
  } catch (error) {
    logger.error(`verifyAccessToken: failed — ${(error as Error).message}`);
    throw error;
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isUserRole(value: unknown): value is UserRole {
  return (
    value === UserRole.ADMIN ||
    value === UserRole.USER ||
    value === UserRole.OPERATOR ||
    value === UserRole.VIEWER
  );
}

function isUserAccessTokenPayload(value: string | jwt.JwtPayload): value is UserAccessTokenPayload {
  return (
    typeof value !== 'string' &&
    isNonEmptyString(value.sub) &&
    isNonEmptyString(value.email) &&
    isUserRole(value.role) &&
    value.tokenKind === USER_TOKEN_KIND &&
    isNonEmptyString(value.sessionId)
  );
}

export function verifyUserAccessToken(token: string, secret: string): UserAccessTokenPayload {
  const decoded = jwt.verify(token, secret, {
    algorithms: [JWT_ALGORITHM],
    audience: USER_JWT_AUDIENCE,
    issuer: USER_JWT_ISSUER,
  });

  if (!isUserAccessTokenPayload(decoded)) {
    throw new jwt.JsonWebTokenError('Invalid user access token payload');
  }

  return decoded;
}
