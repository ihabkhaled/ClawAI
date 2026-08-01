import * as crypto from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import { Logger } from '@nestjs/common';
import type { SignOptions } from 'jsonwebtoken';
import { JWT_ALGORITHM, USER_JWT_AUDIENCE, USER_JWT_ISSUER } from '@claw/shared-constants';
import { verifyUserAccessToken } from '@claw/shared-utilities';
import type { UserAccessTokenPayload } from '@claw/shared-types';

const logger = new Logger('JwtUtility');

export function signAccessToken(
  payload: UserAccessTokenPayload,
  secret: string,
  expiresIn: SignOptions['expiresIn'],
): string {
  logger.debug(
    `signAccessToken: signing token for sub=${String(payload['sub'] ?? 'unknown')} expiresIn=${String(expiresIn)}`,
  );
  const token = jwt.sign(payload, secret, {
    algorithm: JWT_ALGORITHM,
    audience: USER_JWT_AUDIENCE,
    expiresIn,
    issuer: USER_JWT_ISSUER,
  });
  logger.debug('signAccessToken: token signed successfully');
  return token;
}

/**
 * Service-local typed wrapper around the shared JWT verifier.
 * Auth-service owns token issuance (signAccessToken / signRefreshToken)
 * but delegates verification to `@claw/shared-utilities` so the JWT
 * library is wrapped exactly once across the monorepo.
 */
export function verifyAccessToken(token: string, secret: string): UserAccessTokenPayload {
  return verifyUserAccessToken(token, secret);
}

export function signRefreshToken(): string {
  logger.debug('signRefreshToken: generating random refresh token');
  const token = crypto.randomBytes(48).toString('hex');
  logger.debug('signRefreshToken: refresh token generated');
  return token;
}
