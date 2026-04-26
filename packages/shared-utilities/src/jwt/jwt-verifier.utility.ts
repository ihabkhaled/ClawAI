import * as jwt from 'jsonwebtoken';
import { Logger } from '@nestjs/common';
import { JWT_ALGORITHM } from '@claw/shared-constants';

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
