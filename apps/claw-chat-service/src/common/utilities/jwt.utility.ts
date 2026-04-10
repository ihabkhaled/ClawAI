import * as jwt from 'jsonwebtoken';
import { Logger } from '@nestjs/common';
import type { JwtPayload } from '../types';
import { JWT_ALGORITHM } from '../constants';

const logger = new Logger('JwtUtility');

export function verifyAccessToken(token: string, secret: string): JwtPayload {
  logger.debug('verifyAccessToken: verifying access token');
  const decoded = jwt.verify(token, secret, { algorithms: [JWT_ALGORITHM] }) as JwtPayload;
  logger.debug(`verifyAccessToken: token verified for sub=${String(decoded.sub)}`);
  return decoded;
}
